'use strict';

import CONFIG from './config.js';
import { getResources, hasUpgrade } from './resources.js';
import { spawnFloatingText, spawnParticle } from './particles.js';

// --- Loyalty state ---
let loyalty = CONFIG.STARTING_LOYALTY;
let foodDrainTimer = 0;
let farmTimer = 0;
let bakeryTimer = 0;

// Track state transitions
let prevLoyaltyState = 'neutral'; // 'happy', 'neutral', 'angry', 'skull'
let loyaltyTransitionText = null;  // { text, color, timer, duration, flash }
let loyaltyTransitionFlash = 0;    // screen flash timer for rebellion

// --- Getters ---
export function getLoyalty() { return loyalty; }
export function getLoyaltyTransition() { return loyaltyTransitionText; }
export function getLoyaltyFlash() { return loyaltyTransitionFlash; }

function getLoyaltyState(val) {
    if (val >= CONFIG.LOYALTY_HIGH_THRESHOLD) return 'happy';
    if (val >= CONFIG.LOYALTY_LOW_THRESHOLD) return 'neutral';
    if (val >= CONFIG.LOYALTY_REBELLION_THRESHOLD) return 'angry';
    return 'skull';
}

// --- Setters ---
export function setLoyalty(v) {
    loyalty = Math.max(0, Math.min(CONFIG.LOYALTY_MAX, v));
}

export function adjustLoyalty(delta) {
    const oldVal = loyalty;
    loyalty = Math.max(0, Math.min(CONFIG.LOYALTY_MAX, loyalty + delta));
    checkLoyaltyTransition(oldVal, loyalty);
}

function checkLoyaltyTransition(oldVal, newVal) {
    const oldState = getLoyaltyState(oldVal);
    const newState = getLoyaltyState(newVal);
    if (oldState === newState) return;

    // Transitioning to worse state
    if (newState === 'angry' && oldState === 'neutral') {
        loyaltyTransitionText = {
            text: 'Your people grow restless...',
            color: '#ff8040', timer: 0, duration: 3.0, flash: false,
        };
    } else if (newState === 'skull') {
        loyaltyTransitionText = {
            text: 'REBELLION!',
            color: '#ff2020', timer: 0, duration: 4.0, flash: true,
        };
        loyaltyTransitionFlash = 0.6;
    }
    // Transitioning to better state
    else if (newState === 'happy' && oldState !== 'happy') {
        loyaltyTransitionText = {
            text: 'Your people love you!',
            color: '#40ff40', timer: 0, duration: 2.5, flash: false,
        };
    } else if (newState === 'neutral' && oldState === 'angry') {
        loyaltyTransitionText = {
            text: 'Tensions are easing...',
            color: '#c0c040', timer: 0, duration: 2.5, flash: false,
        };
    }

    prevLoyaltyState = newState;
}

// --- Update loyalty-related timers ---
export function updateLoyalty(dt, W, H) {
    const resources = getResources();

    // Update transition text timer
    if (loyaltyTransitionText) {
        loyaltyTransitionText.timer += dt;
        if (loyaltyTransitionText.timer >= loyaltyTransitionText.duration) {
            loyaltyTransitionText = null;
        }
    }
    // Update flash timer
    if (loyaltyTransitionFlash > 0) {
        loyaltyTransitionFlash = Math.max(0, loyaltyTransitionFlash - dt);
    }

    // Food drain: -1 food every 30s
    foodDrainTimer += dt;
    if (foodDrainTimer >= CONFIG.FOOD_DRAIN_INTERVAL) {
        foodDrainTimer = 0;
        if (resources.food > 0) {
            resources.food--;
        } else {
            adjustLoyalty(-CONFIG.FOOD_DRAIN_LOYALTY_COST);
            spawnFloatingText('Starving! -' + CONFIG.FOOD_DRAIN_LOYALTY_COST + ' Loyalty', W / 2, 70, '#ff4040');
        }
        if (resources.food > CONFIG.FOOD_ABUNDANCE_THRESHOLD) {
            adjustLoyalty(CONFIG.FOOD_ABUNDANCE_LOYALTY_BONUS);
        }
    }

    // Farm passive food
    if (hasUpgrade('farm')) {
        farmTimer += dt;
        if (farmTimer >= CONFIG.FARM_INTERVAL) {
            farmTimer = 0;
            resources.food++;
            spawnFloatingText('+1 Food (Farm)', W * 0.8, H - H * CONFIG.GROUND_RATIO - 40, '#80d040');
        }
    }

    // Bakery passive loyalty
    if (hasUpgrade('bakery')) {
        bakeryTimer += dt;
        if (bakeryTimer >= CONFIG.BAKERY_INTERVAL) {
            bakeryTimer = 0;
            adjustLoyalty(CONFIG.BAKERY_LOYALTY_BONUS);
            spawnFloatingText('+' + CONFIG.BAKERY_LOYALTY_BONUS + ' Loyalty (Bakery)', W * 0.8, H - H * CONFIG.GROUND_RATIO - 60, '#40c040');
        }
    }
}

// --- Loyalty band effects ---
// Call each tick: applyLoyaltyEffects(dt, resources, entities)
export function applyLoyaltyEffects(dt, resources, entities) {
    const loyaltyVal = loyalty;

    // Band 80+: villagers gift coins periodically
    if (loyaltyVal >= 80) {
        resources._loyaltyGiftTimer = (resources._loyaltyGiftTimer ?? 0) - dt;
        if (resources._loyaltyGiftTimer <= 0) {
            resources._loyaltyGiftTimer = 8.0;  // gift every 8 seconds
            resources.coins = (resources.coins ?? 0) + 1;
        }
    }

    // Band 30-49: villagers drop coins before reaching beam (handled in entity update)
    // Band 10-29: villagers flee (flee flag on entity)
    // Band < 10: rebellion (already exists -- do not change existing rebellion code)

    // Set flee flag on villagers, or transform to rebels at rebellion threshold
    if (entities) {
        for (const e of entities) {
            if (e.type === 'VILLAGER') {
                if (loyaltyVal < CONFIG.LOYALTY_REBELLION_THRESHOLD) {
                    // Instantly transform into an enemy rebel
                    e.type = 'REBEL';
                    e.direction = -1;
                    e.isMilitia = false;
                    e.fleeActive = false;
                    e.width  = CONFIG.REBEL_W;
                    e.height = CONFIG.REBEL_H;
                } else {
                    e.fleeActive = loyaltyVal < 30;
                }
            }
        }
    }
}

// --- Reset ---
export function resetLoyalty() {
    loyalty = CONFIG.STARTING_LOYALTY;
    foodDrainTimer = 0;
    farmTimer = 0;
    bakeryTimer = 0;
    prevLoyaltyState = 'neutral';
    loyaltyTransitionText = null;
    loyaltyTransitionFlash = 0;
}
