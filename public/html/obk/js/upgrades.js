'use strict';

import CONFIG, { TABLET_RISE_DURATION, TABLET_SINK_DURATION } from './config.js';
import {
    canAfford, spendResources, hasUpgrade, setUpgrade,
    getResources, getMaxWallHP, setMaxWallHP,
    healWall, setWallTier, getOwnedUpgrades,
    incrementCastleRepairCount, addBeamWidthBonus,
} from './resources.js';
import { adjustLoyalty } from './loyalty.js';
import { spawnFloatingText, spawnParticle, spawnAnimation } from './particles.js';
import { getRevolutionCount } from './world.js';

// --- Shop state ---
let shopOpen = false;
let shopDuration = CONFIG.SHOP_DURATION;
let shopCountdown = 0;
let lastRevCount = 0;   // track revolution count for shop trigger
let shopSlide = 0;
let shopOptions = [];
let shopSelectedIndex = -1;
let shopBuyFlash = 0;         // countdown for buy confirmation flash
let shopBuyFlashKey = '';     // which upgrade was just bought
let shopIconPop = 0;          // countdown for icon pop animation
let shopIconPopKey = '';      // which upgrade icon is popping
let shopNoneAffordable = false; // true if no options affordable

// --- Getters ---
export function isShopOpen()          { return shopOpen; }
export function getShopSlide()        { return shopSlide; }
export function getShopCountdown()    { return shopCountdown; }
export function getShopOptions()      { return shopOptions; }
export function getShopSelectedIndex(){ return shopSelectedIndex; }
export function getShopBuyFlash()     { return shopBuyFlash; }
export function getShopBuyFlashKey()  { return shopBuyFlashKey; }
export function getShopIconPop()      { return shopIconPop; }
export function getShopIconPopKey()   { return shopIconPopKey; }
export function getShopNoneAffordable(){ return shopNoneAffordable; }

// --- Tablet animation state ---
const tabletState = {
    visible:   false,
    progress:  0,
    direction: 'none',
};
export function getTabletState()       { return tabletState; }
export function openShopTablets() {
    tabletState.visible   = true;
    tabletState.direction = 'rising';
}
export function closeShopTablets() {
    tabletState.direction = 'sinking';
}
export function updateTablets(dt) {
    if (tabletState.direction === 'rising') {
        tabletState.progress = Math.min(1, tabletState.progress + dt * 1000 / TABLET_RISE_DURATION);
        if (tabletState.progress >= 1) tabletState.direction = 'none';
    } else if (tabletState.direction === 'sinking') {
        tabletState.progress = Math.max(0, tabletState.progress - dt * 1000 / TABLET_SINK_DURATION);
        if (tabletState.progress <= 0) tabletState.visible = false;
    }
}

// --- Upgrade item list: available from day, not yet owned, prerequisites met ---
export function getUpgradeItems(currentDay) {
    const owned = getOwnedUpgrades();
    return Object.entries(CONFIG.UPGRADES)
        .map(([key, upg]) => ({ key, ...upg }))
        .filter(u => (u.availableFromDay ?? 1) <= currentDay)
        .filter(u => !owned[u.key] || u.key === 'feast')
        .filter(u => !u.requires || owned[u.requires]);
}

// --- Generate shop options ---
function generateShopOptions() {
    const ownedUpgrades = getOwnedUpgrades();
    const available = [];
    for (const [key, upg] of Object.entries(CONFIG.UPGRADES)) {
        if (ownedUpgrades[key]) continue;
        if (upg.requires && !ownedUpgrades[upg.requires]) continue;
        available.push(key);
    }
    // Feast is repeatable
    if (!available.includes('feast') && ownedUpgrades['feast']) {
        available.push('feast');
    }
    // Shuffle
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, Math.min(CONFIG.SHOP_MAX_OPTIONS, Math.max(CONFIG.SHOP_MIN_OPTIONS, available.length)));
}

// --- Open / close ---
export function openShop() {
    shopOpen = true;
    shopCountdown = shopDuration;
    shopOptions = generateShopOptions();
    shopSelectedIndex = -1;
    shopSlide = 0;
    // Check if player can afford any option
    shopNoneAffordable = shopOptions.length > 0 &&
        shopOptions.every(key => !canAfford(CONFIG.UPGRADES[key].cost));
    openShopTablets();
}

export function closeShop() {
    shopOpen = false;
    shopSlide = 0;
    shopSelectedIndex = -1;
    closeShopTablets();
}

// --- Buy ---
export function buyUpgrade(key, W, H) {
    const upg = CONFIG.UPGRADES[key];
    if (!canAfford(upg.cost)) return false;

    // Trigger resource counter pulse by spending
    spendResources(upg.cost);

    switch (key) {
        case 'wooden_wall':
        case 'stone_wall':
        case 'iron_wall':
            setMaxWallHP(getMaxWallHP() + CONFIG.WALL_UPGRADE_HP);
            healWall(CONFIG.WALL_UPGRADE_HEAL);
            setWallTier(upg.tier);
            incrementCastleRepairCount();
            break;
        case 'fortified_wall':
            setMaxWallHP(getMaxWallHP() + CONFIG.FORTIFIED_WALL_HP);
            healWall(CONFIG.FORTIFIED_WALL_HEAL);
            setWallTier(upg.tier);
            incrementCastleRepairCount();
            break;
        case 'wider_beam':
        case 'massive_beam':
            addBeamWidthBonus(40);
            break;
        case 'feast':
            adjustLoyalty(CONFIG.FEAST_LOYALTY);
            spawnFloatingText('+' + CONFIG.FEAST_LOYALTY + ' Loyalty!', W / 2, H * 0.4, '#40ff40');
            // Feast celebration: confetti burst and cheer
            for (let i = 0; i < 30; i++) {
                const colors = ['#ff4040', '#40ff40', '#4040ff', '#ffff40', '#ff40ff', '#40ffff'];
                spawnParticle({
                    x: W / 2 + (Math.random() - 0.5) * W * 0.6,
                    y: H * 0.3 + Math.random() * H * 0.2,
                    vx: (Math.random() - 0.5) * 200,
                    vy: -50 - Math.random() * 120,
                    life: 2.0, maxLife: 2.0,
                    color: colors[i % colors.length],
                    size: 3 + Math.random() * 4,
                });
            }
            spawnFloatingText('FEAST!', W / 2, H * 0.25, '#ffe040');
            // Spawn cheer animation
            spawnAnimation({
                type: 'feastCheer', x: W / 2, y: H * 0.5,
                timer: 0, duration: CONFIG.FEAST_CHEER_DURATION,
            });
            break;
    }

    setUpgrade(key);

    // Buy confirmation effects
    shopBuyFlash = CONFIG.SHOP_BUY_FLASH_DURATION;
    shopBuyFlashKey = key;
    shopIconPop = CONFIG.SHOP_ICON_POP_DURATION;
    shopIconPopKey = key;

    spawnFloatingText('Upgrade: ' + upg.name, W / 2, H * 0.3, '#ffe040');

    // Spawn floating cost deductions
    for (const [res, amt] of Object.entries(upg.cost)) {
        spawnFloatingText('-' + amt + ' ' + res, W / 2, H * 0.35, '#ff8080');
    }

    closeShop();
    return true;
}

// --- Shop tap handler (tablet UI) ---
export function handleShopTap(x, y, W, H) {
    const resources = getResources();
    const items  = getUpgradeItems(resources.currentDay ?? 1);
    const ts     = getTabletState();
    const ease   = ts.progress * ts.progress * (3 - 2 * ts.progress);
    const tabW   = 80;
    const tabH   = 110;
    const gap    = 10;
    const baseY  = H - 40;
    const riseAmt = 260;  // must match renderer.js drawShopTablets
    const startX = W / 2 - (items.length * (tabW + gap)) / 2 + tabW / 2;

    // Close button below tablets (must match renderer.js drawShopTablets dimensions)
    const closeBtnH = 64;
    const closeBtnW = 200;
    const closeBtnX = W / 2 - closeBtnW / 2;
    const closeBtnY = H - closeBtnH - 6;
    if (x >= closeBtnX && x <= closeBtnX + closeBtnW &&
        y >= closeBtnY && y <= closeBtnY + closeBtnH) {
        closeShop();
        return;
    }

    for (let i = 0; i < items.length; i++) {
        const tx = startX + i * (tabW + gap);
        const ty = baseY - tabH / 2 - riseAmt * ease;
        if (x >= tx - tabW / 2 && x <= tx + tabW / 2 &&
            y >= ty - tabH / 2 && y <= ty + tabH / 2) {
            if (shopSelectedIndex === i) {
                buyUpgrade(items[i].key, W, H);
            } else {
                shopSelectedIndex = i;
            }
            return;
        }
    }
}

// --- Update ---
export function updateShop(dt) {
    // Revolution-based shop trigger: open when player completes a revolution
    // (castle crosses screen center = progress wraps around)
    const revCount = getRevolutionCount();
    if (!shopOpen && revCount > lastRevCount) {
        lastRevCount = revCount;
        openShop();
    }

    if (shopOpen) {
        shopSlide = Math.min(1, shopSlide + dt * CONFIG.SHOP_SLIDE_SPEED);
    }

    // Buy flash decay
    if (shopBuyFlash > 0) {
        shopBuyFlash = Math.max(0, shopBuyFlash - dt);
    }
    // Icon pop decay
    if (shopIconPop > 0) {
        shopIconPop = Math.max(0, shopIconPop - dt);
    }
}

// --- Reset ---
export function resetShop() {
    shopOpen = false;
    lastRevCount = 0;
    shopSlide = 0;
    shopOptions = [];
    shopSelectedIndex = -1;
    shopCountdown = 0;
    shopBuyFlash = 0;
    shopBuyFlashKey = '';
    shopIconPop = 0;
    shopIconPopKey = '';
    shopNoneAffordable = false;
}
