'use strict';

import CONFIG, { HEAD_Y, HEAD_RADIUS, setHeadPosition } from './config.js';
import { initInput, updateHold } from './input.js';
import { initRenderer, draw } from './renderer.js';
import { updateWorld, updateTitleClouds, resetWorld } from './world.js';
import { resetEntities, prePopulate, spawnForDay, getWorldObjects, createScorchMark } from './entities.js';
import { resetResources, getMerchantsScared, updateResourcePulses, getResources, getWallHP, triggerDayPulse, getDayJustIncremented, setDayJustIncremented, getCurrentDay } from './resources.js';
import * as story from './story.js';
import { hasBranchChoice, triggerBranchChoice, resolveBranchChoice, updateBranchChoice } from './story.js';
import * as annals from './annals.js';
import { updateLoyalty, resetLoyalty, getLoyalty, applyLoyaltyEffects } from './loyalty.js';
import {
    updateHorde, updateMilitia, updateArcher, updateWarHammer,
    updateScreenShake, resetCombat, getHordeCalmTimer, setScreenShake,
} from './combat.js';
import * as head from './head.js';
import { updateShop, isShopOpen, resetShop, updateTablets, openShopTablets, closeShopTablets } from './upgrades.js';
import {
    handleTapDown, handleTapUp, updateEntities, updateSpawns, resetAction, updateDesperation,
} from './action.js';
import {
    updateParticles, updateFloatingTexts, updateAnimations, clearAll as clearParticles,
    spawnParticle, spawnFloatingText,
} from './particles.js';
import { clearHitRegions, checkHitRegions } from './hitRegions.js';

// --- Runtime config: overrides applied here shadow config.js defaults ---
export const runtimeConfig = {};

// --- Canvas setup ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
    // Maintain 9:16 portrait ratio, full height, pillarbox sides
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    H = winH;
    W = Math.floor(H * 9 / 16);
    if (W > winW) {
        W = winW;
        H = Math.floor(W * 16 / 9);
    }
    canvas.width  = W;
    canvas.height = H;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    setHeadPosition(W / 2, HEAD_Y);
}
resize();
window.addEventListener('resize', resize);

// --- Init renderer ---
initRenderer(ctx);

// --- Game state ---
const stateRef = { value: 'title' };
let gameTime = 0;
let titlePulse = 0;
let crashShakeFired = false;
let prevShopOpen = false;

const PAL = CONFIG.PAL;

// --- Story / win state ---
const gameState = {
    activeBeat: null,
    win: false,
    state: null,  // mirrors stateRef.value for story/win checks
    activeBranchChoice: null,
    activeBranchEffect: null,
    worldPaused: false,
    dailyModifier: null,
    harvestMode: false,
    aggressBonus: false,
    earnedFeats: [],
    prestige: 0,
};

// --- Start / Reset ---
function startGame() {
    stateRef.value = 'playing';
    gameTime = 0;
    crashShakeFired = false;
    gameState.activeBeat = null;
    gameState.win = false;
    gameState.state = 'playing';
    gameState.activeBranchChoice = null;
    gameState.activeBranchEffect = null;
    gameState.worldPaused = false;
    gameState.harvestMode = false;
    gameState.aggressBonus = false;
    gameState.earnedFeats = [];
    gameState.annalsSaved = false;
    gameState.nextState = null;

    // Apply Daily Chronicle modifier
    const modifier = annals.getDailyModifier();
    gameState.dailyModifier = modifier;
    if (modifier.config_override.BEAM_WIDTH !== undefined)
        runtimeConfig.BEAM_WIDTH = modifier.config_override.BEAM_WIDTH;
    if (modifier.config_override.DAY_DURATIONS_MULT !== undefined)
        runtimeConfig.DAY_DURATIONS_MULT = modifier.config_override.DAY_DURATIONS_MULT;
    if (modifier.config_override.RESOURCE_YIELD_MULT !== undefined)
        runtimeConfig.RESOURCE_YIELD_MULT = modifier.config_override.RESOURCE_YIELD_MULT;
    if (modifier.config_override.ENEMY_HUT_HP !== undefined)
        runtimeConfig.ENEMY_HUT_HP = modifier.config_override.ENEMY_HUT_HP;
    if (modifier.config_override.VACUUM_DURATION !== undefined)
        runtimeConfig.VACUUM_DURATION = modifier.config_override.VACUUM_DURATION;
    if (modifier.config_override.BRAKE_MIN_SPEED !== undefined)
        runtimeConfig.BRAKE_MIN_SPEED = modifier.config_override.BRAKE_MIN_SPEED;
    if (modifier.config_override.STUMP_RECOVERY_S !== undefined)
        runtimeConfig.STUMP_RECOVERY_S = modifier.config_override.STUMP_RECOVERY_S;

    prevShopOpen = false;
    resetResources();
    resetEntities();
    resetAction();
    resetCombat();
    resetLoyalty();
    resetShop();
    resetWorld();
    head.resetHead();
    clearParticles();
    prePopulate(W, H);
}

function resetToTitle() {
    gameTime = 0;
    titlePulse = 0;
    stateRef.value = 'title';
}

// --- Input handlers ---
function onTapDown(x, y) {
    // Annals screen: any tap returns to title
    if (stateRef.value === 'annals') {
        resetToTitle();
        return;
    }
    // Branch choice: check if clicking on option buttons
    if (gameState.activeBranchChoice) {
        const bc = gameState.activeBranchChoice;
        const cx2 = W / 2;
        const cy2 = H / 2;
        bc.options.forEach((opt, i) => {
            const bx = cx2 + (i === 0 ? -90 : 90);
            const by = cy2 + 16;
            if (x >= bx - 70 && x <= bx + 70 && y >= by - 20 && y <= by + 20) {
                resolveBranchChoice(gameState, i);
            }
        });
        return;
    }
    // Check hit regions first (UI elements registered during rendering)
    if (checkHitRegions(x, y)) {
        return;
    }
    const result = handleTapDown(x, y, W, H, PAL, gameTime, stateRef);
    if (result === 'start') {
        startGame();
    } else if (result === 'reset') {
        resetToTitle();
    }
}

function onTapUp() {
    handleTapUp();
}

initInput(canvas, onTapDown, onTapUp);

// --- Update ---
function update(dt) {
    if (stateRef.value === 'title') {
        titlePulse += dt;
        updateTitleClouds(dt, W);
        return;
    }
    if (stateRef.value === 'gameover') {
        // If we reached gameover without win being set, it is a loss -- save once
        if (!gameState.win && !gameState.annalsSaved) {
            gameState.annalsSaved = true;
            annals.saveRun({
                win:       false,
                days:      getCurrentDay(),
                feats:     gameState.earnedFeats ?? [],
                chronicle: gameState.dailyModifier?.name ?? '',
                prestige:  gameState.prestige ?? 0,
            });
            gameState.nextState = 'annals';
        }
        return;
    }
    if (stateRef.value === 'annals') {
        // Annals screen: any input transitions back to title (handled in onTapDown)
        return;
    }

    gameTime += dt;

    updateHold(dt);

    // Screen shake decay
    updateScreenShake(dt);

    // Shop timer + auto-open
    updateShop(dt, gameState);
    updateTablets(dt);

    const shopOpen = isShopOpen();
    const resources = getResources();

    // Head shop animation triggers
    if (shopOpen && !prevShopOpen) {
        const groundY = H - H * CONFIG.GROUND_RATIO;
        // Align head center with king's center: castle height + king feet offset + half king height, all in entity-scale space
        const ES = CONFIG.ENTITY_SCALE || 1;
        const shopTargetY = groundY - (CONFIG.CASTLE_BASE_H + 22) * ES;
        head.triggerShopDescend(shopTargetY);
    }
    if (!shopOpen && prevShopOpen) {
        head.triggerShopAscend();
    }
    prevShopOpen = shopOpen;

    // Pause world during head creation
    const isCreating = head.getState().isCreating;

    // World scrolling + clouds (handles shopOpen internally, paused during creation)
    if (!isCreating) {
        updateWorld(dt, gameTime, shopOpen, W, gameState);
    }

    if (!shopOpen && !isCreating) {
        // War hammer animation + hold detection
        updateWarHammer(dt, W, H, PAL);

        // Loyalty (food drain, farm, bakery)
        updateLoyalty(dt, W, H);

        // Loyalty band effects (gifts, flee flags)
        applyLoyaltyEffects(dt, resources, getWorldObjects());

        // Horde system
        updateHorde(dt, gameTime, W, H);

        // Spawning
        const loyalty = getLoyalty();
        const merchantsScared = getMerchantsScared();
        const hordeCalmTimer = getHordeCalmTimer();
        updateSpawns(dt, gameTime, loyalty, merchantsScared, false, hordeCalmTimer, W, H);

        // Entity movement, zone detection, pass-through effects
        updateEntities(dt, gameTime, W, H, PAL, stateRef);

        // Militia auto-fight
        updateMilitia(dt, PAL);

        // Archer tower
        updateArcher(dt, W, H, PAL);

        // Desperation mode update
        updateDesperation(dt, resources);

        // Shockwave damage: when a new shockwave fires, damage all visible enemies once
        if (resources.shockwaveActive && !gameState._shockwaveProcessed) {
            gameState._shockwaveProcessed = true;
            const enemies = ['enemy_hut', 'enemy_soldier', 'rival_castle', 'bandit_hut'];
            for (const e of (gameState.entities ?? [])) {
                if (enemies.includes(e.type) && e.active) {
                    e.hp = (e.hp ?? 1) - 2;
                    if (e.hp <= 0) {
                        e.active = false;
                        if (e.type === 'enemy_hut') gameState.entities.push(createScorchMark(e.theta));
                    }
                }
            }
        }
        if (!resources.shockwaveActive) gameState._shockwaveProcessed = false;
    }

    // HUD pulse timers
    updateResourcePulses(dt);

    // Particles, floating texts, animations
    updateParticles(dt);
    updateFloatingTexts(dt);
    updateAnimations(dt);

    head.update(dt, { resources, wallHp: getWallHP() });

    if (head.getAscendJustCompleted()) {
        triggerDayPulse();
    }

    // Day 1 creation - magical appearance
    const currentDay = getCurrentDay();
    if (currentDay === 1 && !head.getState().creationPlayed && !head.getState().isCreating) {
        head.triggerCreation();
    }

    // Magical particles during creation
    if (head.getState().isCreating && Math.random() < 0.3) {
        const hx = W / 2;
        const hy = 160;
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 40;
        spawnParticle({
            x: hx + Math.cos(angle) * dist,
            y: hy + Math.sin(angle) * dist,
            vx: -Math.cos(angle) * 50,
            vy: -Math.sin(angle) * 50,
            life: 0.8, maxLife: 0.8,
            color: ['#9060ff', '#b080ff', '#7040dd', '#c090ff'][Math.floor(Math.random() * 4)],
            size: 2 + Math.random() * 4,
        });
    }

    // Screen shake + story beat + magical burst when creation completes
    if (head.getAndClearCreationJustCompleted()) {
        crashShakeFired = true;
        setScreenShake(0.6);
        story.triggerBeat(1, gameState);  // "THE HEAD HAS RETURNED."
        // Magical particle burst radiating outward
        const hx = W / 2;
        const hy = 160;
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            const speed = 150 + Math.random() * 100;
            spawnParticle({
                x: hx,
                y: hy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.2, maxLife: 1.2,
                color: i % 4 === 0 ? '#9060ff' : i % 4 === 1 ? '#b080ff' : i % 4 === 2 ? '#fff0ff' : '#7040dd',
                size: 3 + Math.random() * 5,
            });
        }
        spawnFloatingText('THE HEAD IS SUMMONED!', W / 2, H * 0.28, '#b080ff');
    }
    // Fallback: also fire screen shake via old flag
    if (!crashShakeFired && head.getState().creationPlayed) {
        crashShakeFired = true;
    }

    // Sync stateRef into gameState for story/win checks
    gameState.state = stateRef.value;

    // Branch choice update + world pause
    updateBranchChoice(dt, gameState);
    if (gameState.activeBranchChoice || head.getState().isCreating) {
        gameState.worldPaused = true;
    } else {
        gameState.worldPaused = false;
    }

    // Apply branch effect when resolved
    if (gameState.activeBranchEffect) {
        const effect = gameState.activeBranchEffect;
        gameState.activeBranchEffect = null;
        switch (effect) {
            case 'combat_focus':  gameState.harvestMode = false; break;
            case 'harvest_focus': gameState.harvestMode = true;  break;
            case 'fortify':       resources.wallHp += 3;          break;
            case 'aggress':       gameState.aggressBonus = true;  break;
            case 'endure':        resources.wallHp *= 2;          break;
            case 'devour':        runtimeConfig.BEAM_WIDTH = (runtimeConfig.BEAM_WIDTH ?? 60) * 2; break;
        }
    }

    // Day increment handling
    if (getDayJustIncremented()) {
        setDayJustIncremented(false);
        const day = getCurrentDay();
        spawnForDay(day);
        story.triggerBeat(day, gameState);
        if (hasBranchChoice(day)) {
            triggerBranchChoice(day, gameState);
        }
        console.log('Day ' + day + ' began');
    }

    // Story beat tick
    story.updateBeat(dt, gameState);

    // Win condition: rival castle destroyed
    const rivalCastle = getWorldObjects().find(e => e.type === 'rival_castle');
    if (rivalCastle && rivalCastle.hp <= 0 && stateRef.value !== 'gameover') {
        gameState.win = true;
        gameState.state = 'gameover';
        stateRef.value = 'gameover';
        story.triggerBeat(24, gameState);
        // Override beat text for win
        if (gameState.activeBeat) gameState.activeBeat.text = 'THE HEAD IS SATISFIED. FOR NOW.';
        gameState.annalsSaved = true;
        annals.saveRun({
            win:       gameState.win,
            days:      getCurrentDay(),
            feats:     gameState.earnedFeats ?? [],
            chronicle: gameState.dailyModifier?.name ?? '',
            prestige:  gameState.prestige ?? 0,
        });
        gameState.nextState = 'annals';
    }
}

// --- Game loop ---
let lastTime = 0;
function gameLoop(timestamp) {
    const dt = Math.min(CONFIG.MAX_DT, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    update(dt);
    clearHitRegions(); // Clear before drawing to rebuild hit regions
    draw(W, H, stateRef.value, gameTime, titlePulse, gameState, dt);

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame((ts) => {
    lastTime = ts;
    requestAnimationFrame(gameLoop);
});
