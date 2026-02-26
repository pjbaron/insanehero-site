'use strict';

import CONFIG from './config.js';

// --- Resource state ---
const resources = { wood: 0, stone: 0, food: 0, coins: 0 };

// --- HUD pulse timers (countdown from HUD_PULSE_DURATION on change) ---
const resourcePulse = { wood: 0, stone: 0, food: 0, coins: 0 };
let wallDamagePulse = 0;

let wallHP = CONFIG.STARTING_WALL_HP;
let maxWallHP = CONFIG.STARTING_MAX_WALL_HP;
let wallTier = 0;

// --- Owned upgrades ---
const ownedUpgrades = {};

// --- Score / stats ---
let score = 0;
let scoreMultiplier = 1.0;
let enemiesDefeated = 0;
let totalResourcesGathered = 0;
let hordesSurvived = 0;
let peakLoyalty = CONFIG.STARTING_LOYALTY;
let lowestLoyalty = CONFIG.STARTING_LOYALTY;
let loyaltyStreakTimer = 0;
const milestones = {};
let bestTimeSurvived = 0;

// --- Merchant state ---
let merchantsScared = false;

// --- Desperation state ---
let desperation       = false;  // true when wallHP < 5
let desperationCharge = 0;      // 0..1, fills while desperation active

// --- Beam upgrades ---
let beamWidthBonus = 0;

// --- Castle visual wear tracking ---
let castleScorchCount = 0;  // increments on catapult/enemy hit
let castleRepairCount = 0;  // increments on wall upgrade purchase

// --- Day pulse (visual highlight when head ascends after shop) ---
let dayPulse = 0;

// --- Day system ---
let currentDay = 1;
let dayProgress = 0;        // radians scrolled this day
let dayTargetRadians = 0;   // set each day from DAY_DURATIONS; computed in world.js
let dayJustIncremented = false;  // flag: set true for one tick when day advances, then cleared

// --- Getters ---
export function getResources() { return resources; }
export function getResourcePulse() { return resourcePulse; }
export function getWallDamagePulse() { return wallDamagePulse; }
export function getWallHP() { return wallHP; }
export function getMaxWallHP() { return maxWallHP; }
export function getWallTier() { return wallTier; }
export function getScore() { return score; }
export function getScoreMultiplier() { return scoreMultiplier; }
export function getEnemiesDefeated() { return enemiesDefeated; }
export function getTotalResourcesGathered() { return totalResourcesGathered; }
export function getHordesSurvived() { return hordesSurvived; }
export function getMerchantsScared() { return merchantsScared; }
export function getCastleScorchCount() { return castleScorchCount; }
export function getCastleRepairCount() { return castleRepairCount; }
export function getDesperation()       { return desperation; }
export function getDesperationCharge() { return desperationCharge; }
export function setDesperationCharge(v) { desperationCharge = v; }
export function getBeamWidthBonus()    { return beamWidthBonus; }
export function addBeamWidthBonus(px)  { beamWidthBonus += px; }
export function getOwnedUpgrades() { return ownedUpgrades; }
export function getCurrentDay() { return currentDay; }
export function getDayProgress() { return dayProgress; }
export function getDayTargetRadians() { return dayTargetRadians; }
export function getDayJustIncremented() { return dayJustIncremented; }
export function setCurrentDay(v) { currentDay = v; }
export function getDayPulse()     { return dayPulse; }
export function triggerDayPulse() { dayPulse = 1.5; }
export function setDayProgress(v) { dayProgress = v; }
export function setDayTargetRadians(v) { dayTargetRadians = v; }
export function setDayJustIncremented(v) { dayJustIncremented = v; }

// --- Setters / mutators ---
export function addResource(type, amount) {
    resources[type] += amount;
    if (resourcePulse[type] !== undefined) {
        resourcePulse[type] = CONFIG.HUD_PULSE_DURATION;
    }
}

function updateDesperationState() {
    desperation = wallHP < 5;
    if (!desperation) desperationCharge = 0;
}

export function setWallHP(v) { wallHP = v; updateDesperationState(); }
export function setMaxWallHP(v) { maxWallHP = v; }
export function setWallTier(v) { wallTier = v; }
export function setMerchantsScared(v) { merchantsScared = v; }
export function incrementCastleRepairCount() { castleRepairCount++; }

export function damageWall(amount) {
    wallHP -= amount;
    wallDamagePulse = CONFIG.WALL_SHAKE_DURATION;
    castleScorchCount++;
    updateDesperationState();
    return wallHP;
}

export function healWall(amount) {
    wallHP = Math.min(maxWallHP, wallHP + amount);
    updateDesperationState();
}

export function addScore(pts) {
    score += pts * scoreMultiplier;
}

export function incrementEnemiesDefeated() {
    enemiesDefeated++;
}

export function addTotalResourcesGathered(n) {
    totalResourcesGathered += n;
}

export function incrementHordesSurvived() {
    hordesSurvived++;
}

// --- Upgrade helpers ---
export function hasUpgrade(key) {
    return !!ownedUpgrades[key];
}

export function setUpgrade(key) {
    ownedUpgrades[key] = true;
}

export function canAfford(cost) {
    for (const [res, amount] of Object.entries(cost)) {
        if ((resources[res] || 0) < amount) return false;
    }
    return true;
}

export function spendResources(cost) {
    for (const [res, amount] of Object.entries(cost)) {
        resources[res] -= amount;
    }
}

// --- Update pulse timers ---
export function updateResourcePulses(dt) {
    for (const key of Object.keys(resourcePulse)) {
        if (resourcePulse[key] > 0) resourcePulse[key] = Math.max(0, resourcePulse[key] - dt);
    }
    if (wallDamagePulse > 0) wallDamagePulse = Math.max(0, wallDamagePulse - dt);
    if (dayPulse > 0) dayPulse = Math.max(0, dayPulse - dt);
}

// --- Reset for new game ---
export function resetResources() {
    resources.wood = 0;
    resources.stone = 0;
    resources.food = 0;
    resources.coins = 0;
    wallHP = CONFIG.STARTING_WALL_HP;
    maxWallHP = CONFIG.STARTING_MAX_WALL_HP;
    wallTier = 0;
    score = 0;
    scoreMultiplier = 1.0;
    enemiesDefeated = 0;
    totalResourcesGathered = 0;
    hordesSurvived = 0;
    peakLoyalty = CONFIG.STARTING_LOYALTY;
    lowestLoyalty = CONFIG.STARTING_LOYALTY;
    loyaltyStreakTimer = 0;
    bestTimeSurvived = 0;
    merchantsScared = false;
    desperation = false;
    desperationCharge = 0;
    beamWidthBonus = 0;
    castleScorchCount = 0;
    castleRepairCount = 0;
    resourcePulse.wood = 0;
    resourcePulse.stone = 0;
    resourcePulse.food = 0;
    resourcePulse.coins = 0;
    wallDamagePulse = 0;
    dayPulse = 0;
    // Clear owned upgrades
    for (const k of Object.keys(ownedUpgrades)) {
        delete ownedUpgrades[k];
    }
    // Day system
    currentDay = 1;
    dayProgress = 0;
    dayTargetRadians = 0;
    dayJustIncremented = false;
}

export function resetDayProgress() {
    dayProgress = 0;
    dayJustIncremented = false;
}
