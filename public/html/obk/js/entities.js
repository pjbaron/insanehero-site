'use strict';

import CONFIG from './config.js';
import { getCurrentDay } from './resources.js';
import { ENEMY_HUT_HP, ENEMY_HUT_SPAWN_DAY, ENEMY_HUT_SPAWN_THETA, RIVAL_CASTLE_HP, RIVAL_CASTLE_SPAWN_DAY, RIVAL_CASTLE_SPAWN_THETA, RIVAL_CASTLE_ATTACK_DAY, STUMP_RECOVERY_S, CRATER_RECOVERY_S, TRAMPLED_RECOVERY_S, SAPLING_GROW_S } from './config.js';
import { getScrollAngle, normalizeAngle, angularDist, pixelsToRadians, thetaToScreen } from './world.js';

// --- Entity list ---
const worldObjects = [];

// --- Boulders (from catapults) ---
const boulders = [];

// --- Utility ---
function randRange(a, b) { return a + Math.random() * (b - a); }

function weightedRandom(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, e) => s + e[1], 0);
    let r = Math.random() * total;
    for (const [key, w] of entries) {
        r -= w;
        if (r <= 0) return key;
    }
    return entries[entries.length - 1][0];
}

function randomResourceSize() {
    const day = getCurrentDay();
    if (day < 4) return 0;                      // days 1-3: small only (1-hit)
    if (day < 10) return Math.random() < 0.5 ? 0 : 1;  // days 4-9: small or medium
    // day 10+: full range
    const r = Math.random();
    const p = CONFIG.RESOURCE_SIZE_PROBS;
    if (r < p[0]) return 0;
    if (r < p[0] + p[1]) return 1;
    return 2;
}

// --- Getters ---
export function getWorldObjects() { return worldObjects; }
export function getBoulders()     { return boulders; }

// --- Spawn weights ---
export function getSpawnWeights(elapsed, loyalty, merchantsScared) {
    const t = Math.min(elapsed / CONFIG.SPAWN_RAMP_TIME, 1);
    let weights = {
        TREE:     CONFIG.SPAWN_WEIGHT_TREE_BASE + t * CONFIG.SPAWN_WEIGHT_TREE_RAMP,
        ROCK:     CONFIG.SPAWN_WEIGHT_ROCK_BASE + t * CONFIG.SPAWN_WEIGHT_ROCK_RAMP,
        BUSH:     CONFIG.SPAWN_WEIGHT_BUSH,
        VILLAGER: CONFIG.SPAWN_WEIGHT_VILLAGER_BASE + t * CONFIG.SPAWN_WEIGHT_VILLAGER_RAMP,
        ENEMY:    CONFIG.SPAWN_WEIGHT_ENEMY_BASE + t * CONFIG.SPAWN_WEIGHT_ENEMY_RAMP,
    };
    if (loyalty < CONFIG.LOYALTY_LOW_THRESHOLD) {
        weights.VILLAGER *= CONFIG.SPAWN_WEIGHT_LOW_LOYALTY_FACTOR;
    }
    if (loyalty < CONFIG.LOYALTY_REBELLION_THRESHOLD) {
        weights.REBEL = weights.VILLAGER;
        weights.VILLAGER = 0;
    }
    // No enemies until day 2 to let the player get oriented
    if (getCurrentDay() < 2) {
        weights.ENEMY = 0;
    }

    if (elapsed >= CONFIG.BOSS_SPAWN_START) {
        weights.BOSS = CONFIG.BOSS_WEIGHT_BASE + Math.min(CONFIG.BOSS_WEIGHT_MAX, (elapsed - CONFIG.BOSS_SPAWN_START) / CONFIG.BOSS_WEIGHT_RAMP * CONFIG.BOSS_WEIGHT_MAX);
    }
    if (elapsed >= CONFIG.CATAPULT_SPAWN_START) {
        weights.CATAPULT = CONFIG.CATAPULT_WEIGHT_BASE + Math.min(CONFIG.CATAPULT_WEIGHT_MAX, (elapsed - CONFIG.CATAPULT_SPAWN_START) / CONFIG.CATAPULT_WEIGHT_RAMP * CONFIG.CATAPULT_WEIGHT_MAX);
    }
    if (elapsed >= CONFIG.MERCHANT_SPAWN_START && !merchantsScared) {
        weights.MERCHANT = CONFIG.MERCHANT_WEIGHT;
    }
    if (elapsed >= CONFIG.DRAGON_SPAWN_START) {
        weights.DRAGON = CONFIG.DRAGON_WEIGHT_BASE + Math.min(CONFIG.DRAGON_WEIGHT_MAX, (elapsed - CONFIG.DRAGON_SPAWN_START) / CONFIG.DRAGON_WEIGHT_RAMP * CONFIG.DRAGON_WEIGHT_MAX);
    }
    return weights;
}

// --- Create entity ---
export function createWorldObject(type, W, H, loyalty) {
    const info = CONFIG.OBJECT_TYPES[type];
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const direction = -1; // all entities face left (anti-clockwise)

    const isHostile = type === 'ENEMY' || type === 'REBEL' || type === 'BOSS' ||
                      type === 'CATAPULT' || type === 'DRAGON';

    let theta;
    if (isHostile) {
        // Spawn at enemy castle (theta = PI) with jitter
        theta = Math.PI + (Math.random() - 0.5) * pixelsToRadians(100);
        theta = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    } else {
        // Non-hostiles spawn at right edge of visible arc
        const R = CONFIG.ARC_VISUAL_RADIUS;
        const halfArc = (W / 2) / R + 0.1; // just past right edge
        theta = normalizeAngle(getScrollAngle() + halfArc + Math.random() * 0.1);
        if (theta < 0) theta += 2 * Math.PI;
    }

    // Compute initial screen position from theta
    const pt = thetaToScreen(theta, W, H);

    let obj = {
        type: type,
        info: info,
        x: pt.x - 0, // will be set properly below after width is known
        y: groundY,
        theta: theta,
        surfaceAngle: pt.angle,
        width: 0,
        height: 0,
        alive: true,
        acted: false,
        inZone: false,
        highlight: 0,
        passedZone: false,
        villagerClothColor: null,
        isHorde: false,
        giftCarrier: false,
        isMilitia: false,
        variant: 0,          // visual variant index (trees 0-2, rocks 0-1)
        hatType: 0,           // villager hat variant
        direction: direction, // -1=from right, +1=from left
        stunTimer: 0,         // shield bash stun
        spikePitTimer: 0,     // spike pit damage cooldown
        spikeHits: 0,         // times hit by spike pit
        burnTimer: 0,         // burning moat damage cooldown
    };

    switch (type) {
        case 'TREE': {
            const sz = randomResourceSize();
            obj.width = CONFIG.TREE_W;
            obj.height = CONFIG.TREE_H;
            obj.y = groundY - CONFIG.TREE_H;
            obj.variant = Math.floor(Math.random() * 3); // 0-2 canopy shapes
            obj.resourceSize = sz;
            obj.hitsRemaining = CONFIG.RESOURCE_HITS[sz];
            obj.resourceYield = CONFIG.RESOURCE_YIELDS[sz];
            break;
        }
        case 'ROCK': {
            const sz = randomResourceSize();
            obj.width = CONFIG.ROCK_W;
            obj.height = CONFIG.ROCK_H;
            obj.y = groundY - CONFIG.ROCK_H;
            obj.variant = Math.floor(Math.random() * 2); // 0-1 size variants
            obj.resourceSize = sz;
            obj.hitsRemaining = CONFIG.RESOURCE_HITS[sz];
            obj.resourceYield = CONFIG.RESOURCE_YIELDS[sz];
            break;
        }
        case 'BUSH': {
            const sz = randomResourceSize();
            obj.width = CONFIG.BUSH_W;
            obj.height = CONFIG.BUSH_H;
            obj.y = groundY - CONFIG.BUSH_H;
            obj.resourceSize = sz;
            obj.hitsRemaining = CONFIG.RESOURCE_HITS[sz];
            obj.resourceYield = CONFIG.RESOURCE_YIELDS[sz];
            break;
        }
        case 'VILLAGER':
            obj.width = CONFIG.VILLAGER_W;
            obj.height = CONFIG.VILLAGER_H;
            obj.y = groundY - CONFIG.VILLAGER_H;
            obj.villagerClothColor = CONFIG.VILLAGER_CLOTH_COLORS[
                Math.floor(Math.random() * CONFIG.VILLAGER_CLOTH_COLORS.length)
            ];
            obj.hatType = Math.floor(Math.random() * 3); // 0=none, 1=cap, 2=hood
            obj.waveTimer = 0;
            obj.taxCount = 0;
            obj.shirtTaken = false;
            if (loyalty >= CONFIG.LOYALTY_HIGH_THRESHOLD) {
                if (Math.random() < CONFIG.GIFT_CHANCE) {
                    obj.giftCarrier = true;
                } else if (Math.random() < CONFIG.MILITIA_CHANCE) {
                    obj.isMilitia = true;
                    obj.villagerClothColor = CONFIG.MILITIA_CLOTH_COLOR;
                }
            }
            break;
        case 'ENEMY':
            obj.width = CONFIG.ENEMY_W;
            obj.height = CONFIG.ENEMY_H;
            obj.y = groundY - CONFIG.ENEMY_H;
            break;
        case 'REBEL':
            obj.width = CONFIG.REBEL_W;
            obj.height = CONFIG.REBEL_H;
            obj.y = groundY - CONFIG.REBEL_H;
            break;
        case 'BOSS':
            obj.width = CONFIG.BOSS_W;
            obj.height = CONFIG.BOSS_H;
            obj.y = groundY - CONFIG.BOSS_H;
            obj.bossHP = CONFIG.BOSS_HP;
            obj.bossMaxHP = CONFIG.BOSS_HP;
            obj.bossStagger = 0;
            break;
        case 'CATAPULT':
            obj.width = CONFIG.CATAPULT_W;
            obj.height = CONFIG.CATAPULT_H;
            obj.y = groundY - CONFIG.CATAPULT_H;
            obj.catapultFired = false;
            break;
        case 'MERCHANT':
            obj.width = CONFIG.MERCHANT_W;
            obj.height = CONFIG.MERCHANT_H;
            obj.y = groundY - CONFIG.MERCHANT_H;
            obj.merchantGifted = false;
            break;
        case 'DRAGON':
            obj.width = CONFIG.DRAGON_W;
            obj.height = CONFIG.DRAGON_H;
            obj.y = H * CONFIG.DRAGON_FLY_Y_FRACTION;
            obj.dragonFired = false;
            obj.wingTimer = 0;
            break;
    }
    // Set cached screen X from polar position
    obj.x = pt.x - obj.width / 2;
    return obj;
}

// --- Spawn ---
export function spawnObject(gameTime, loyalty, merchantsScared, W, H) {
    const weights = getSpawnWeights(gameTime, loyalty, merchantsScared);
    const type = weightedRandom(weights);
    // Limit dragons to 1 at a time
    if (type === 'DRAGON' && worldObjects.some(o => o.type === 'DRAGON' && !o.acted)) return;
    const obj = createWorldObject(type, W, H, loyalty);

    const tooCloseAngle = pixelsToRadians(CONFIG.SPAWN_TOO_CLOSE);
    const tooClose = worldObjects.some(o => !o.acted && angularDist(o.theta, obj.theta) < tooCloseAngle);
    if (tooClose) {
        const offsetAngle = pixelsToRadians(CONFIG.SPAWN_TOO_CLOSE_OFFSET_MIN + Math.random() * CONFIG.SPAWN_TOO_CLOSE_OFFSET_MAX);
        // Push further away from camera
        const scrollA = getScrollAngle();
        const rel = normalizeAngle(obj.theta - scrollA);
        obj.theta += rel > 0 ? offsetAngle : -offsetAngle;
        obj.theta = ((obj.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const pt = thetaToScreen(obj.theta, W, H);
        obj.x = pt.x - obj.width / 2;
        obj.surfaceAngle = pt.angle;
    }

    worldObjects.push(obj);
}

export function spawnHordeEnemy(W, H) {
    const obj = createWorldObject('ENEMY', W, H);
    obj.isHorde = true;
    // Horde enemies spawn at enemy castle (theta = PI)
    obj.theta = Math.PI + (Math.random() - 0.5) * pixelsToRadians(60);
    if (obj.theta < 0) obj.theta += 2 * Math.PI;
    const pt = thetaToScreen(obj.theta, W, H);
    obj.x = pt.x - obj.width / 2;
    obj.surfaceAngle = pt.angle;
    worldObjects.push(obj);
}

export function getSpawnInterval(gameTime) {
    const t = Math.min(gameTime / CONFIG.SPAWN_RAMP_TIME, 1);
    return (CONFIG.SPAWN_INTERVAL_START + (CONFIG.SPAWN_INTERVAL_END - CONFIG.SPAWN_INTERVAL_START) * t)
           + randRange(-CONFIG.SPAWN_JITTER, CONFIG.SPAWN_JITTER);
}

// --- Pre-populate the world by distributing resources around the circumference ---
export function prePopulate(W, H) {
    const circ = CONFIG.WORLD_CIRCUMFERENCE;
    const speed = CONFIG.BASE_SCROLL_SPEED;
    const interval = CONFIG.SPAWN_INTERVAL_START;
    const numObjects = Math.floor(circ / (speed * interval));
    const resourceTypes = ['TREE', 'TREE', 'ROCK', 'BUSH', 'BUSH'];
    const thetaSpacing = (2 * Math.PI) / numObjects;

    for (let i = 0; i < numObjects; i++) {
        const type = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        const obj = createWorldObject(type, W, H, CONFIG.STARTING_LOYALTY);
        // Distribute evenly with jitter, skip near castle (theta=0) and enemy castle (theta=PI)
        let t = thetaSpacing * i + (Math.random() - 0.5) * thetaSpacing * 0.8;
        t = ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        obj.theta = t;
        const pt = thetaToScreen(obj.theta, W, H);
        obj.x = pt.x - obj.width / 2;
        obj.surfaceAngle = pt.angle;
        worldObjects.push(obj);
    }
}

// --- Reset ---
export function resetEntities() {
    worldObjects.length = 0;
    boulders.length = 0;
}

// --- Story arc entities ---

export function createEnemyHut(theta) {
    return {
        type:    'enemy_hut',
        info:    { name: 'enemy hut', icon: 'sword', resource: 'coins', action: 'ATTACK' },
        theta:   theta ?? ENEMY_HUT_SPAWN_THETA,
        hp:      ENEMY_HUT_HP,
        maxHp:   ENEMY_HUT_HP,
        active:  true,
        alive:   true,
        acted:   false,
        label:   'Enemy Hut',
        width:   28,
        height:  34,
        x:       0,
        y:       0,
        surfaceAngle: 0,
        direction: -1,
    };
}

export function createRivalCastle(theta) {
    return {
        type:       'rival_castle',
        theta:      theta ?? RIVAL_CASTLE_SPAWN_THETA,
        hp:         RIVAL_CASTLE_HP,
        maxHp:      RIVAL_CASTLE_HP,
        attackable: false,
        active:     true,
        alive:      true,
        acted:      false,
        label:      'Rival Castle',
        width:      36,
        height:     38,
        x:          0,
        y:          0,
        surfaceAngle: 0,
        direction: -1,
    };
}

export function createScorchMark(theta) {
    return { type: 'scorch_mark', theta, active: true, alive: true, acted: true, width: 28, height: 6, x: 0, y: 0, surfaceAngle: 0, direction: -1 };
}

export function createStump(theta) {
  return { type: 'stump', theta, active: true, recoveryTimer: STUMP_RECOVERY_S, alive: true, acted: true, width: 14, height: 16, x: 0, y: 0, surfaceAngle: 0, direction: -1 };
}
export function createCrater(theta) {
  return { type: 'crater', theta, active: true, recoveryTimer: CRATER_RECOVERY_S, alive: true, acted: true, width: 28, height: 12, x: 0, y: 0, surfaceAngle: 0, direction: -1 };
}
export function createTrampleMark(theta) {
  return { type: 'trampled_ground', theta, active: true, recoveryTimer: TRAMPLED_RECOVERY_S, alive: true, acted: true, width: 32, height: 10, x: 0, y: 0, surfaceAngle: 0, direction: -1 };
}
export function createSapling(theta) {
  return { type: 'sapling', theta, active: true, growTimer: SAPLING_GROW_S, alive: true, acted: true, width: 10, height: 20, x: 0, y: 0, surfaceAngle: 0, direction: -1 };
}

export function createBanditHut(theta) {
  return {
    type:    'bandit_hut',
    info:    { name: 'bandit hut', icon: 'sword', resource: 'coins', action: 'ATTACK' },
    theta:   theta ?? Math.PI * 1.5,
    hp:      4,
    maxHp:   4,
    active:  true,
    alive:   true,
    acted:   false,
    label:   'Bandit Hut',
    width:   28,
    height:  34,
    x:       0,
    y:       0,
    surfaceAngle: 0,
    direction: -1,
  };
}

export function spawnForDay(day, state) {
    // Called by main.js on each day increment.
    if (day === ENEMY_HUT_SPAWN_DAY) {
        worldObjects.push(createEnemyHut());
    }
    if (day === RIVAL_CASTLE_SPAWN_DAY) {
        worldObjects.push(createRivalCastle());
    }
    // Update rival castle attackable flag
    if (day >= RIVAL_CASTLE_ATTACK_DAY) {
        const rival = worldObjects.find(e => e.type === 'rival_castle');
        if (rival) rival.attackable = true;
    }
    // Prestige mode: bandit hut spawns on Day 5 if prestige >= 1
    if (day === 5 && (state?.prestige ?? 0) >= 1) {
        worldObjects.push(createBanditHut());
    }
}
