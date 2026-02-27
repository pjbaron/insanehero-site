'use strict';

import CONFIG, { HEAD_X, HEAD_Y, HEAD_RADIUS, SAPLING_GROW_S, BEAM_WIDTH, DESPERATION_BONUS_PX, DESPERATION_CHARGE_S } from './config.js';
import { getWorldObjects, getBoulders, spawnObject, getSpawnInterval, createStump, createCrater, createTrampleMark } from './entities.js';
import {
    hasUpgrade, addResource, addScore, incrementEnemiesDefeated,
    addTotalResourcesGathered, damageWall, setMerchantsScared,
    getDesperation, setDesperationCharge, getDesperationCharge, getBeamWidthBonus,
} from './resources.js';
import { getLoyalty, adjustLoyalty } from './loyalty.js';
import { spawnFloatingText, spawnActionAnim, spawnParticle } from './particles.js';
import { applyCleave, getScreenShakeRef, setHammerHolding, setHammerHoldTime, registerKill, applyRainOfArrows, applyShieldBash } from './combat.js';
import { isShopOpen } from './upgrades.js';
import { getScrollAngle, normalizeAngle, angularDist, pixelsToRadians, thetaToScreen, isVisible } from './world.js';

// --- Button state ---
let buttonTarget = null;
let buttonFlicker = 0;
let buttonFlickerTargets = [];
let buttonPressed = false;
let buttonPressTimer = 0;

// --- Spawn timers ---
let spawnTimer = 0;
let nextSpawnInterval = CONFIG.INITIAL_SPAWN_INTERVAL;
let overlapForceTimer = 0;

// --- Getters ---
export function getButtonTarget()          { return buttonTarget; }
export function getButtonFlicker()         { return buttonFlicker; }
export function getButtonFlickerTargets()  { return buttonFlickerTargets; }
export function getButtonPressed()         { return buttonPressed; }

// --- Perform action on current target ---
export function performAction(W, H, PAL, gameTime) {
    if (isShopOpen()) return;
    if (!buttonTarget || buttonTarget.acted) return;
    const obj = buttonTarget;
    const cx = obj.x + obj.width / 2;
    const cy = obj.y;
    const screenShakeRef = getScreenShakeRef();
    const _S = CONFIG.ENTITY_SCALE || 1;
    const _fY = cy - obj.height * (_S - 1);  // visual top for floating text

    // Boss: multi-hit
    if (obj.type === 'BOSS') {
        obj.bossHP--;
        obj.bossStagger = CONFIG.BOSS_STAGGER_TIME;
        spawnActionAnim(obj, PAL, screenShakeRef, gameTime);
        screenShakeRef.value = Math.max(screenShakeRef.value, CONFIG.SHAKE_BOSS_HIT);
        if (obj.bossHP <= 0) {
            obj.acted = true;
            addResource('coins', CONFIG.BOSS_COINS);
            incrementEnemiesDefeated();
            registerKill();
            addScore(CONFIG.BOSS_SCORE);
            spawnFloatingText('BOSS SLAIN! +' + CONFIG.BOSS_COINS + ' Coins', cx, _fY - 10, '#ffe040');
            // Big death explosion
            for (let i = 0; i < 16; i++) {
                const color = i % 3 === 0 ? PAL.bossArmor : i % 3 === 1 ? '#ffe080' : PAL.coinGold;
                spawnParticle({
                    x: cx, y: cy + 20,
                    vx: (Math.random() - 0.5) * 300, vy: -50 - Math.random() * 150,
                    life: 1.0, maxLife: 1.0,
                    color: color, size: 4 + Math.random() * 4,
                });
            }
            // Trigger on-kill effects
            applyShieldBash(obj.theta, PAL);
            applyRainOfArrows(cx, cy, W, H);
        } else {
            spawnFloatingText('HIT! (' + obj.bossHP + '/' + obj.bossMaxHP + ')', cx, _fY - 10, '#ff8040');
        }
        buttonPressTimer = CONFIG.BUTTON_PRESS_DURATION;
        buttonPressed = true;
        return;
    }

    // Dragon: tap to deflect for treasure (dragon slayer = instant kill + 2x reward)
    if (obj.type === 'DRAGON') {
        obj.acted = true;
        spawnActionAnim(obj, PAL, screenShakeRef, gameTime);
        const isDragonSlayer = hasUpgrade('dragon_slayer');
        const coinReward = isDragonSlayer ? CONFIG.DRAGON_TREASURE_COINS * 2 : CONFIG.DRAGON_TREASURE_COINS;
        const scoreReward = isDragonSlayer ? CONFIG.DRAGON_TREASURE_SCORE * 2 : CONFIG.DRAGON_TREASURE_SCORE;
        addResource('coins', coinReward);
        addScore(scoreReward);
        incrementEnemiesDefeated();
        registerKill();
        screenShakeRef.value = Math.max(screenShakeRef.value, CONFIG.SHAKE_BOSS_HIT);
        const label = isDragonSlayer
            ? 'Dragon Slain! +' + coinReward + ' Coins'
            : 'Dragon Treasure! +' + coinReward + ' Coins';
        spawnFloatingText(label, cx, _fY - 10, isDragonSlayer ? '#ff4040' : '#ffe040');
        // Treasure explosion
        for (let i = 0; i < 20; i++) {
            spawnParticle({
                x: cx, y: cy,
                vx: (Math.random() - 0.5) * 250, vy: -80 - Math.random() * 200,
                life: 1.2, maxLife: 1.2,
                color: i % 3 === 0 ? PAL.coinGold : i % 3 === 1 ? '#ffe080' : '#ff8020',
                size: 3 + Math.random() * 5,
            });
        }
        // Trigger on-kill effects
        applyShieldBash(obj.theta, PAL);
        applyRainOfArrows(cx, cy, W, H);
        buttonPressTimer = CONFIG.BUTTON_PRESS_DURATION;
        buttonPressed = true;
        return;
    }

    // Catapult deflect
    if (obj.type === 'CATAPULT') {
        obj.acted = true;
        spawnActionAnim(obj, PAL, screenShakeRef, gameTime);
        addResource('stone', 1);
        addScore(CONFIG.CATAPULT_SCORE);
        spawnFloatingText('Deflected! +1 Stone', cx, _fY - 10, '#b0b4b8');
        // Deflect any in-flight boulders
        const boulderList = getBoulders();
        for (const b of boulderList) {
            if (!b.deflected) b.deflected = true;
        }
        buttonPressTimer = CONFIG.BUTTON_PRESS_DURATION;
        buttonPressed = true;
        return;
    }

    // Merchant: taxing scares all future merchants
    if (obj.type === 'MERCHANT') {
        obj.acted = true;
        spawnActionAnim(obj, PAL, screenShakeRef, gameTime);
        addResource('coins', CONFIG.MERCHANT_TAX_COINS);
        adjustLoyalty(-CONFIG.MERCHANT_TAX_LOYALTY_COST);
        setMerchantsScared(true);
        spawnFloatingText('+' + CONFIG.MERCHANT_TAX_COINS + ' Coins (Merchant fled!)', cx, _fY - 10, PAL.coinGold);
        spawnFloatingText('Merchants won\'t return...', cx, _fY - 30, '#ff4040');
        buttonPressTimer = CONFIG.BUTTON_PRESS_DURATION;
        buttonPressed = true;
        return;
    }

    // Villager multi-click tax: don't set acted until shirt taken
    if (obj.type === 'VILLAGER' && !obj.giftCarrier) {
        const S = CONFIG.ENTITY_SCALE || 1;
        const floatY = cy - obj.height * (S - 1);
        if (obj.taxCount < CONFIG.VILLAGER_MAX_COINS) {
            obj.taxCount++;
            addResource('coins', 1);
            addScore(CONFIG.TAX_SCORE);
            const loyaltyCost = CONFIG.VILLAGER_TAX_LOYALTY[obj.taxCount - 1] || 3;
            adjustLoyalty(-loyaltyCost);
            const coinsLeft = CONFIG.VILLAGER_MAX_COINS - obj.taxCount;
            spawnActionAnim(obj, PAL, screenShakeRef, gameTime);
            if (coinsLeft > 0) {
                spawnFloatingText('+1 Coin (' + coinsLeft + ' left)', cx, floatY - 10, PAL.coinGold);
            } else {
                spawnFloatingText('+1 Coin (last one!)', cx, floatY - 10, PAL.coinGold);
            }
            if (getLoyalty() < CONFIG.LOYALTY_UNREST_THRESHOLD) {
                spawnFloatingText('Unrest!', cx, floatY - 30, '#ff4040');
            }
        } else {
            // All coins gone - take their shirt
            obj.shirtTaken = true;
            obj.acted = true;
            adjustLoyalty(-CONFIG.VILLAGER_SHIRT_LOYALTY);
            spawnActionAnim(obj, PAL, screenShakeRef, gameTime);
            spawnFloatingText('Took their shirt!', cx, floatY - 10, '#ff8040');
            spawnFloatingText('"The shirt off my back!"', cx, floatY - 30, '#ff4040');
            spawnFloatingText('(Worthless)', cx, floatY - 50, '#888888');
        }
        buttonPressTimer = CONFIG.BUTTON_PRESS_DURATION;
        buttonPressed = true;
        return;
    }

    // Multi-hit resources: check if more hits are needed before consuming
    if (obj.type === 'TREE' || obj.type === 'ROCK' || obj.type === 'BUSH') {
        let hitPower = 1;
        if (obj.type === 'TREE')      hitPower = hasUpgrade('master_axe')  ? 5 : hasUpgrade('better_axe')  ? 3 : 1;
        else if (obj.type === 'ROCK') hitPower = hasUpgrade('master_pick') ? 5 : hasUpgrade('better_pick') ? 3 : 1;
        const hitsLeft = obj.hitsRemaining ?? 1;
        if (hitsLeft > hitPower) {
            obj.hitsRemaining = hitsLeft - hitPower;
            spawnActionAnim(obj, PAL, screenShakeRef, gameTime, HEAD_X, HEAD_Y);
            const hitColor = obj.type === 'TREE' ? '#c89060' : obj.type === 'ROCK' ? '#b0b4b8' : '#80d040';
            spawnFloatingText(obj.hitsRemaining + ' hits left', cx, _fY - 10, hitColor);
            buttonPressTimer = CONFIG.BUTTON_PRESS_DURATION;
            buttonPressed = true;
            return;
        }
    }

    obj.acted = true;
    spawnActionAnim(obj, PAL, screenShakeRef, gameTime, HEAD_X, HEAD_Y);

    const crownBonus = hasUpgrade('golden_crown') ? CONFIG.GOLDEN_CROWN_BONUS : 0;
    switch (obj.type) {
        case 'TREE': {
            const amount = (obj.resourceYield ?? CONFIG.BASE_WOOD) + crownBonus;
            addResource('wood', amount);
            addTotalResourcesGathered(amount);
            addScore(CONFIG.RESOURCE_SCORE);
            getWorldObjects().push(createStump(obj.theta));
            break;
        }
        case 'ROCK': {
            const amount = (obj.resourceYield ?? CONFIG.BASE_STONE) + crownBonus;
            addResource('stone', amount);
            addTotalResourcesGathered(amount);
            addScore(CONFIG.RESOURCE_SCORE);
            getWorldObjects().push(createCrater(obj.theta));
            break;
        }
        case 'BUSH': {
            const amount = (obj.resourceYield ?? 1) + crownBonus;
            addResource('food', amount);
            addTotalResourcesGathered(amount);
            addScore(CONFIG.RESOURCE_SCORE);
            getWorldObjects().push(createTrampleMark(obj.theta));
            break;
        }
        case 'VILLAGER':
            // Gift carrier villager
            if (obj.giftCarrier) {
                const giftTypes = ['wood', 'stone', 'food', 'coins'];
                const giftRes = giftTypes[Math.floor(Math.random() * giftTypes.length)];
                const giftAmt = CONFIG.GIFT_AMOUNT;
                addResource(giftRes, giftAmt);
                spawnFloatingText('Gift! +' + giftAmt + ' ' + giftRes, cx, floatY - 10, '#40ff40');
            }
            break;
        case 'ENEMY':
        case 'REBEL':
            addResource('coins', 1);
            incrementEnemiesDefeated();
            registerKill();
            addScore(CONFIG.ENEMY_SCORE);
            spawnFloatingText('Defeated!', cx, floatY - 10, '#ff6060');
            if (hasUpgrade('cleave')) {
                applyCleave(obj, PAL);
            }
            applyShieldBash(obj.theta, PAL);
            applyRainOfArrows(cx, cy, W, H);
            break;
    }

    buttonPressTimer = CONFIG.BUTTON_PRESS_DURATION;
    buttonPressed = true;
}

// --- Update entities in the world (movement, zone detection, pass-through effects) ---
export function updateEntities(dt, gameTime, W, H, PAL, stateRef) {
    const worldObjects = getWorldObjects();
    const shopOpen = isShopOpen();
    const screenShakeRef = getScreenShakeRef();
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const scrollAngle = getScrollAngle();
    const zoneHalfAngle = ((CONFIG.ACTION_ZONE_WIDTH + getBeamWidthBonus()) / 2) / R;

    let zoneObjects = [];

    for (let i = worldObjects.length - 1; i >= 0; i--) {
        const obj = worldObjects[i];
        const isHostile = obj.type === 'ENEMY' || obj.type === 'REBEL' || obj.type === 'BOSS' ||
                          obj.type === 'CATAPULT' || obj.type === 'DRAGON';

        // World memory entities: timer countdown and promotion
        if (obj.type === 'stump' || obj.type === 'crater' || obj.type === 'trampled_ground' || obj.type === 'sapling') {
            switch (obj.type) {
                case 'stump': {
                    obj.recoveryTimer -= dt;
                    if (obj.recoveryTimer <= 0) {
                        obj.type      = 'sapling';
                        obj.growTimer = SAPLING_GROW_S;
                        delete obj.recoveryTimer;
                    }
                    break;
                }
                case 'crater': {
                    obj.recoveryTimer -= dt;
                    if (obj.recoveryTimer <= 0) obj.active = false;
                    break;
                }
                case 'trampled_ground': {
                    obj.recoveryTimer -= dt;
                    if (obj.recoveryTimer <= 0) obj.active = false;
                    break;
                }
                case 'sapling': {
                    obj.growTimer -= dt;
                    if (obj.growTimer <= 0) {
                        obj.type = 'tree';
                        delete obj.growTimer;
                    }
                    break;
                }
            }
            if (!obj.active) {
                worldObjects.splice(i, 1);
            } else {
                // Update screen position (world-fixed, rotates with planet)
                const pt = thetaToScreen(obj.theta, W, H);
                obj.x = pt.x - obj.width / 2;
                obj.surfaceAngle = pt.angle;
            }
            continue;
        }

        // Stun timer decay
        if (obj.stunTimer > 0) {
            obj.stunTimer -= dt;
        }
        // Spike pit timer decay
        if (obj.spikePitTimer > 0) {
            obj.spikePitTimer -= dt;
        }
        // Burn timer decay
        if (obj.burnTimer > 0) {
            obj.burnTimer -= dt;
        }

        if (!shopOpen) {
            if (isHostile) {
                // Stunned enemies don't move
                if (obj.stunTimer > 0) {
                    // still compute screen position
                    const pt = thetaToScreen(obj.theta, W, H);
                    obj.x = pt.x - obj.width / 2;
                    obj.surfaceAngle = pt.angle;
                } else {
                    // Hostiles walk toward castle (theta 0) by decreasing theta
                    let walkSpeed = CONFIG.ENEMY_WALK_SPEED;
                    if (hasUpgrade('moat') && (obj.type === 'ENEMY' || obj.type === 'REBEL')) {
                        walkSpeed *= hasUpgrade('moat_upgrade')
                            ? CONFIG.DEEP_MOAT_SLOW_FACTOR
                            : CONFIG.MOAT_SLOW_FACTOR;
                    }
                    obj.theta -= pixelsToRadians(walkSpeed) * dt;
                    if (obj.theta < 0) obj.theta += 2 * Math.PI;
                }

                // Spike pit damage
                if (hasUpgrade('spike_pit') && !obj.acted && (obj.type === 'ENEMY' || obj.type === 'REBEL')) {
                    const spikeDist = angularDist(obj.theta, pixelsToRadians(CONFIG.SPIKE_PIT_RANGE));
                    if (spikeDist < pixelsToRadians(15) && obj.spikePitTimer <= 0) {
                        obj.spikePitTimer = CONFIG.SPIKE_PIT_TICK;
                        obj.spikeHits++;
                        const ecx = obj.x + obj.width / 2;
                        spawnFloatingText('Spike!', ecx, obj.y - 10, '#cc4444');
                        // Kill after enough hits (enemies have 1 HP effectively)
                        obj.acted = true;
                        incrementEnemiesDefeated();
                        registerKill();
                        spawnActionAnim(obj, PAL, screenShakeRef);
                        addResource('coins', 1);
                    }
                }

                // Burning moat damage
                if (hasUpgrade('burning_moat') && !obj.acted && (obj.type === 'ENEMY' || obj.type === 'REBEL')) {
                    const moatCenter = pixelsToRadians(CONFIG.MOAT_X_OFFSET + CONFIG.MOAT_WIDTH / 2);
                    const moatHalf = pixelsToRadians(CONFIG.MOAT_WIDTH / 2);
                    if (angularDist(obj.theta, moatCenter) < moatHalf && obj.burnTimer <= 0) {
                        obj.burnTimer = 0.5;
                        obj.acted = true;
                        incrementEnemiesDefeated();
                        registerKill();
                        spawnActionAnim(obj, PAL, screenShakeRef);
                        const ecx = obj.x + obj.width / 2;
                        spawnFloatingText('Burn!', ecx, obj.y - 10, '#ff6020');
                        addResource('coins', 1);
                    }
                }
            }
            if (!isHostile || obj.stunTimer <= 0) {
                // Compute screen position from theta
                const pt = thetaToScreen(obj.theta, W, H);
                obj.x = pt.x - obj.width / 2;
                obj.surfaceAngle = pt.angle;
            }
        }

        if (obj.type === 'VILLAGER') {
            obj.waveTimer += dt;
        }

        if (obj.type === 'BOSS' && obj.bossStagger > 0) {
            obj.bossStagger -= dt;
        }

        // Zone detection via angular distance from scroll center
        const relAngle = normalizeAngle(obj.theta - scrollAngle);
        const wasInZone = obj.inZone;
        obj.inZone = !obj.acted && Math.abs(relAngle) < zoneHalfAngle;

        // passedZone: entity has moved past the action zone
        if (!wasInZone && !obj.acted) {
            // Entity direction is -1 (moving anti-clockwise), relAngle will go negative past zone
            if (obj.direction === -1 && relAngle < -zoneHalfAngle) {
                obj.passedZone = true;
            } else if (obj.direction === 1 && relAngle > zoneHalfAngle) {
                obj.passedZone = true;
            }
        }

        if (obj.inZone) {
            zoneObjects.push(obj);
            obj.highlight = Math.min(1, obj.highlight + dt * 5);
        } else {
            obj.highlight = Math.max(0, obj.highlight - dt * 5);
        }

        // Enemy/rebel reaches castle: 1 damage, despawn
        const damageAngle = pixelsToRadians(CONFIG.CASTLE_DAMAGE_RANGE);
        if ((obj.type === 'ENEMY' || obj.type === 'REBEL') && !obj.acted) {
            if (angularDist(obj.theta, 0) < damageAngle) {
                obj.acted = true;
                const hp = damageWall(1);
                screenShakeRef.value = Math.max(screenShakeRef.value, CONFIG.SHAKE_ENEMY_HIT);
                const castlePt = thetaToScreen(0, W, H);
                spawnFloatingText('-1 Castle', castlePt.x, obj.y - 10, '#ff2020');
                for (let pi = 0; pi < 6; pi++) {
                    spawnParticle({
                        x: castlePt.x, y: obj.y + obj.height / 2,
                        vx: (Math.random() - 0.5) * 100, vy: -30 - Math.random() * 60,
                        life: 0.5, maxLife: 0.5,
                        color: pi % 2 === 0 ? '#ff4040' : '#ffaa40',
                        size: 2 + Math.random() * 3,
                    });
                }
                if (hp <= 0) {
                    stateRef.value = 'gameover';
                }
            }
        }
        // Boss reaches castle: big castle damage, despawn
        if (obj.type === 'BOSS' && !obj.acted) {
            if (angularDist(obj.theta, 0) < damageAngle) {
                obj.acted = true;
                const hp = damageWall(CONFIG.BOSS_WALL_DAMAGE);
                screenShakeRef.value = Math.max(screenShakeRef.value, CONFIG.SHAKE_BOSS_PASS);
                const castlePt = thetaToScreen(0, W, H);
                spawnFloatingText('-' + CONFIG.BOSS_WALL_DAMAGE + ' Castle!', castlePt.x, obj.y - 10, '#ff2020');
                if (hp <= 0) {
                    stateRef.value = 'gameover';
                }
            }
        }
        // Catapult fires boulder - use cached screen position
        const catapultInRange = obj.x < W * CONFIG.CATAPULT_FIRE_THRESHOLD && obj.x > 0;
        if (obj.type === 'CATAPULT' && !obj.acted && !obj.catapultFired && catapultInRange) {
            obj.catapultFired = true;
            const boulders = getBoulders();
            const castlePt = thetaToScreen(0, W, H);
            boulders.push({
                x: obj.x + 18, y: obj.y - 10,
                startX: obj.x + 18, startY: obj.y - 10,
                targetX: castlePt.x, targetY: H - H * CONFIG.GROUND_RATIO - 20,
                timer: 0, duration: CONFIG.BOULDER_DURATION,
                deflected: false,
            });
        }
        // Catapult passes off-screen
        if (obj.type === 'CATAPULT' && !obj.acted && !isVisible(obj.theta, W) && relAngle < 0) {
            obj.acted = true;
        }
        // Dragon update: flies across top, fires when reaching zone, damages wall if missed
        if (obj.type === 'DRAGON') {
            obj.wingTimer += dt;
            // Despawn after post-fire delay
            if (obj.dragonFired && !obj.acted) {
                obj.dragonDespawnTimer = (obj.dragonDespawnTimer ?? 2.0) - dt;
                if (obj.dragonDespawnTimer <= 0) obj.acted = true;
            }
            if (!obj.acted && obj.passedZone && !obj.dragonFired) {
                obj.dragonFired = true;
                obj.dragonDespawnTimer = 2.0;
                const fireCx = obj.x + obj.width / 2;
                const fireCy = obj.y + obj.height / 2;
                const fireVxSign = obj.direction === -1 ? -1 : 1;
                for (let fi = 0; fi < 15; fi++) {
                    spawnParticle({
                        x: fireCx, y: fireCy,
                        vx: fireVxSign * (100 + Math.random() * 150),
                        vy: 60 + Math.random() * 80,
                        life: 0.8, maxLife: 0.8,
                        color: fi % 3 === 0 ? '#ff6020' : fi % 3 === 1 ? '#ffaa20' : '#ff2020',
                        size: 4 + Math.random() * 6,
                    });
                }
                const hp = damageWall(CONFIG.DRAGON_WALL_DAMAGE);
                screenShakeRef.value = Math.max(screenShakeRef.value, CONFIG.SHAKE_BOSS_PASS);
                const castlePt = thetaToScreen(0, W, H);
                spawnFloatingText('-' + CONFIG.DRAGON_WALL_DAMAGE + ' Wall! (Dragon Fire)', castlePt.x, H - H * CONFIG.GROUND_RATIO - 50, '#ff2020');
                if (hp <= 0) {
                    stateRef.value = 'gameover';
                }
            }
        }

        // Merchant passes untaxed: gifts resources
        if (obj.type === 'MERCHANT' && !obj.acted && obj.passedZone && !obj.merchantGifted) {
            obj.merchantGifted = true;
            const giftTypes = ['wood', 'stone', 'food', 'coins'];
            const giftRes = giftTypes[Math.floor(Math.random() * giftTypes.length)];
            addResource(giftRes, CONFIG.MERCHANT_GIFT_AMOUNT);
            addScore(CONFIG.MERCHANT_GIFT_SCORE);
            const mfY = obj.y - obj.height * ((CONFIG.ENTITY_SCALE || 1) - 1);
            spawnFloatingText('Merchant gift! +' + CONFIG.MERCHANT_GIFT_AMOUNT + ' ' + giftRes, obj.x + obj.width / 2, mfY - 10, '#ffe040');
        }
        // Villager passes untaxed: loyalty boost (no bonus if taxed at all)
        if (obj.type === 'VILLAGER' && !obj.acted && obj.passedZone) {
            if (!obj.loyaltyGiven && !(obj.taxCount > 0)) {
                adjustLoyalty(CONFIG.LOYALTY_PASS_BONUS);
                obj.loyaltyGiven = true;
            }
            if (obj.giftCarrier && !obj.giftDelivered) {
                obj.giftDelivered = true;
                const giftTypes = ['wood', 'stone', 'food', 'coins'];
                const giftRes = giftTypes[Math.floor(Math.random() * giftTypes.length)];
                addResource(giftRes, CONFIG.GIFT_AMOUNT);
                const vfY = obj.y - obj.height * ((CONFIG.ENTITY_SCALE || 1) - 1);
                spawnFloatingText('Gift! +' + CONFIG.GIFT_AMOUNT + ' ' + giftRes, obj.x + obj.width / 2, vfY - 10, '#40ff40');
            }
        }

        // Remove off-screen entities using polar visibility
        if (!isHostile) {
            // Non-hostiles: remove once they've passed behind camera
            if (!isVisible(obj.theta, W) && relAngle < 0) {
                worldObjects.splice(i, 1);
            }
        } else if (obj.acted) {
            // Remove acted hostiles that are no longer visible
            if (!isVisible(obj.theta, W)) {
                worldObjects.splice(i, 1);
            }
        }
    }

    // Update boulders
    const boulderList = getBoulders();
    for (let i = boulderList.length - 1; i >= 0; i--) {
        const b = boulderList[i];
        b.timer += dt;
        const t = Math.min(1, b.timer / b.duration);
        // Parabolic arc
        b.x = b.startX + (b.targetX - b.startX) * t;
        b.y = b.startY + (b.targetY - b.startY) * t - Math.sin(t * Math.PI) * 80;
        if (t >= 1) {
            if (!b.deflected) {
                // Boulder hits wall
                const hp = damageWall(2);
                screenShakeRef.value = Math.max(screenShakeRef.value, CONFIG.SHAKE_CATAPULT);
                const castlePt2 = thetaToScreen(0, W, H);
                spawnFloatingText('-2 Wall!', castlePt2.x, H - H * CONFIG.GROUND_RATIO - 50, '#ff2020');
                // Impact particles
                for (let pi = 0; pi < 8; pi++) {
                    spawnParticle({
                        x: b.targetX, y: b.targetY,
                        vx: (Math.random() - 0.5) * 150, vy: -50 - Math.random() * 100,
                        life: 0.6, maxLife: 0.6,
                        color: pi % 2 === 0 ? '#8a6040' : '#666',
                        size: 3 + Math.random() * 4,
                    });
                }
                if (hp <= 0) {
                    stateRef.value = 'gameover';
                }
            }
            boulderList.splice(i, 1);
        }
    }

    // Determine button target
    if (zoneObjects.length > 0 && !shopOpen) {
        // Priority: resources first, enemies second, taxing third
        function actionPriority(type) {
            if (type === 'TREE' || type === 'ROCK' || type === 'BUSH') return 0;
            if (type === 'ENEMY' || type === 'REBEL' || type === 'BOSS' || type === 'CATAPULT' || type === 'DRAGON') return 1;
            return 2; // VILLAGER, MERCHANT
        }
        zoneObjects.sort((a, b) => {
            const pA = actionPriority(a.type);
            const pB = actionPriority(b.type);
            if (pA !== pB) return pA - pB;
            const aDist = Math.abs(normalizeAngle(a.theta - scrollAngle));
            const bDist = Math.abs(normalizeAngle(b.theta - scrollAngle));
            return aDist - bDist;
        });
        buttonTarget = zoneObjects[0];
        buttonFlickerTargets = zoneObjects.length > 1 ? zoneObjects : [];
        buttonFlicker += dt;
    } else {
        buttonTarget = null;
        buttonFlickerTargets = [];
        buttonFlicker = 0;
    }

    // Button press cooldown
    if (buttonPressed) {
        buttonPressTimer -= dt;
        if (buttonPressTimer <= 0) buttonPressed = false;
    }
}

// --- Tap handler (called from main) ---
export function handleTapDown(x, y, W, H, PAL, gameTime, stateRef) {
    if (stateRef.value === 'title') {
        return 'start';
    }
    if (stateRef.value === 'gameover') {
        return 'reset';
    }
    if (stateRef.value === 'playing') {
        if (isShopOpen()) {
            // Shop clicks handled by hit region system
            return 'shop';
        }

        // War hammer hold check
        if (hasUpgrade('war_hammer')) {
            const worldObjects = getWorldObjects();
            const anyEnemy = worldObjects.some(o =>
                (o.type === 'ENEMY' || o.type === 'REBEL') && !o.acted && isVisible(o.theta, W)
            );
            if (anyEnemy) {
                setHammerHolding(true);
                setHammerHoldTime(0);
            }
        }

        performAction(W, H, PAL, gameTime);
        return 'action';
    }
    return null;
}

export function handleTapUp() {
    setHammerHolding(false);
    setHammerHoldTime(0);
}

// --- Spawn management ---
export function updateSpawns(dt, gameTime, loyalty, merchantsScared, shopOpen, hordeCalmTimer, W, H) {
    if (!shopOpen) {
        if (hordeCalmTimer > 0) {
            spawnTimer += dt * 2; // double spawn rate during calm
        }
        spawnTimer += dt;
        if (spawnTimer >= nextSpawnInterval) {
            spawnTimer = 0;
            nextSpawnInterval = getSpawnInterval(gameTime);
            spawnObject(gameTime, loyalty, merchantsScared, W, H);
        }

        // Force overlap conflicts periodically
        overlapForceTimer += dt;
        if (overlapForceTimer >= CONFIG.OVERLAP_FORCE_INTERVAL) {
            overlapForceTimer = 0;
            const worldObjects = getWorldObjects();
            // Find an object approaching zone from either side
            const scrollA = getScrollAngle();
            const R2 = CONFIG.ARC_VISUAL_RADIUS;
            const approachAngle = (W * 0.2) / R2; // roughly 20-40% from center
            const candidate = worldObjects.find(o => {
                if (o.acted) return false;
                const rel = Math.abs(normalizeAngle(o.theta - scrollA));
                return rel > approachAngle * 0.8 && rel < approachAngle * 1.5;
            });
            if (candidate) {
                spawnObject(gameTime, loyalty, merchantsScared, W, H);
                const newest = worldObjects[worldObjects.length - 1];
                if (newest) {
                    newest.theta = candidate.theta + (Math.random() - 0.5) * pixelsToRadians(20);
                    newest.theta = ((newest.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                    const pt = thetaToScreen(newest.theta, W, H);
                    newest.x = pt.x - newest.width / 2;
                    newest.surfaceAngle = pt.angle;
                }
            }
        }
    }
}

// --- Desperation helpers ---
export function getEffectiveBeamWidth(resources, runtimeConfig) {
    const base      = runtimeConfig?.BEAM_WIDTH ?? BEAM_WIDTH;
    const desperate = (resources?.desperation ?? false) ? DESPERATION_BONUS_PX : 0;
    return base + desperate + getBeamWidthBonus();
}

export function updateDesperation(dt, resources) {
    if (!getDesperation()) return;
    const newCharge = Math.min(1, getDesperationCharge() + dt / DESPERATION_CHARGE_S);
    setDesperationCharge(newCharge);
    if (resources) resources.desperationCharge = newCharge;
}

// --- Reset ---
export function resetAction() {
    buttonTarget = null;
    buttonFlicker = 0;
    buttonFlickerTargets = [];
    buttonPressed = false;
    buttonPressTimer = 0;
    spawnTimer = 0;
    nextSpawnInterval = CONFIG.INITIAL_SPAWN_INTERVAL;
    overlapForceTimer = 0;
}
