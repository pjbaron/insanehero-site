'use strict';

import CONFIG, { HEAD_X, HEAD_Y } from './config.js';
import { getWorldObjects, spawnHordeEnemy, getBoulders } from './entities.js';
import { hasUpgrade, addResource, incrementEnemiesDefeated, incrementHordesSurvived } from './resources.js';
import { getScrollSpeed, angularDist, pixelsToRadians, isVisible, thetaToScreen, getScrollAngle, normalizeAngle } from './world.js';
import { spawnFloatingText, spawnActionAnim, spawnParticle, spawnAnimation } from './particles.js';

function randRange(a, b) { return a + Math.random() * (b - a); }
function lerp(a, b, t) { return a + (b - a) * t; }

// --- Horde state ---
let hordeTimer = 0;
let hordeInterval = CONFIG.HORDE_FIRST_INTERVAL;
let hordeActive = false;
let hordeWarning = false;
let hordeWarningTimer = 0;
let hordeSpawnCount = 0;
let hordeSpawnTarget = 0;
let hordeSpawnTimer = 0;
let hordeNumber = 0;
let hordeCalmTimer = 0;

// --- Horde celebration ---
let hordeCelebrationTimer = 0;

// --- Archer tower state ---
let archerTimer = 0;
const archerArrows = [];

// --- War Hammer state ---
let hammerHolding = false;
let hammerHoldTime = 0;
let hammerAnimTimer = 0;
let hammerActive = false;

// --- Kill streak ---
let killStreak = 0;
let killStreakTimer = 0;
let killStreakDisplay = 0;  // display timer for last streak number
let killStreakPeak = 0;     // peak streak to display

// --- Battle Cry state ---
let battleCryTimer = 0;
let battleCryActive = false;

// --- Screen shake (shared mutable ref so particles can write to it) ---
const screenShakeRef = { value: 0 };

// --- Getters ---
export function getHordeActive()       { return hordeActive; }
export function getHordeWarning()      { return hordeWarning; }
export function getHordeWarningTimer() { return hordeWarningTimer; }
export function getHordeNumber()       { return hordeNumber; }
export function getHordeCalmTimer()    { return hordeCalmTimer; }
export function getHordeCelebrationTimer() { return hordeCelebrationTimer; }
export function getArcherArrows()      { return archerArrows; }
export function getHammerHolding()     { return hammerHolding; }
export function getHammerHoldTime()    { return hammerHoldTime; }
export function getHammerActive()      { return hammerActive; }
export function getHammerAnimTimer()   { return hammerAnimTimer; }
export function getScreenShake()       { return screenShakeRef.value; }
export function getScreenShakeRef()    { return screenShakeRef; }
export function getKillStreak()        { return killStreak; }
export function getKillStreakDisplay()  { return killStreakDisplay; }
export function getKillStreakPeak()     { return killStreakPeak; }
export function getBattleCryActive()   { return battleCryActive; }
export function getBattleCryTimer()    { return battleCryTimer; }

export function setScreenShake(v)      { screenShakeRef.value = v; }
export function setHammerHolding(v)    { hammerHolding = v; }
export function setHammerHoldTime(v)   { hammerHoldTime = v; }

// --- Kill streak tracking ---
export function registerKill() {
    killStreak++;
    killStreakTimer = CONFIG.KILL_STREAK_TIMEOUT;
    if (killStreak >= 3) {
        killStreakPeak = killStreak;
        killStreakDisplay = CONFIG.KILL_STREAK_DISPLAY_DURATION;
    }
    // Battle cry activation
    if (hasUpgrade('battle_cry') && killStreak >= CONFIG.BATTLE_CRY_KILL_THRESHOLD) {
        battleCryActive = true;
        battleCryTimer = CONFIG.BATTLE_CRY_DURATION;
    }
}

function updateKillStreak(dt) {
    if (killStreakTimer > 0) {
        killStreakTimer -= dt;
        if (killStreakTimer <= 0) {
            killStreak = 0;
        }
    }
    if (killStreakDisplay > 0) {
        killStreakDisplay -= dt;
    }
    // Battle cry decay
    if (battleCryTimer > 0) {
        battleCryTimer -= dt;
        if (battleCryTimer <= 0) {
            battleCryActive = false;
        }
    }
}

// --- Horde update ---
export function updateHorde(dt, gameTime, W, H) {
    // Kill streak decay
    updateKillStreak(dt);

    // Horde celebration timer
    if (hordeCelebrationTimer > 0) {
        hordeCelebrationTimer -= dt;
    }

    if (!hordeActive && !hordeWarning) {
        hordeTimer += dt;
        if (hordeTimer >= hordeInterval) {
            hordeTimer = 0;
            hordeWarning = true;
            hordeWarningTimer = CONFIG.HORDE_WARNING_DURATION;
            // Spawn enemy silhouettes at right edge during warning
            screenShakeRef.value = Math.max(screenShakeRef.value, 0.08);
        }
    }

    if (hordeWarning) {
        hordeWarningTimer -= dt;
        // Rumble during warning
        screenShakeRef.value = Math.max(screenShakeRef.value, 0.05 + (1 - hordeWarningTimer / CONFIG.HORDE_WARNING_DURATION) * 0.1);
        if (hordeWarningTimer <= 0) {
            hordeWarning = false;
            hordeActive = true;
            hordeNumber++;
            hordeSpawnTarget = CONFIG.HORDE_BASE_COUNT + hordeNumber * CONFIG.HORDE_ESCALATION;
            if (hordeSpawnTarget > CONFIG.HORDE_MAX_COUNT) hordeSpawnTarget = CONFIG.HORDE_MAX_COUNT;
            hordeSpawnCount = 0;
            hordeSpawnTimer = 0;
        }
    }

    if (hordeActive) {
        hordeSpawnTimer += dt;
        if (hordeSpawnTimer >= CONFIG.HORDE_SPAWN_INTERVAL && hordeSpawnCount < hordeSpawnTarget) {
            hordeSpawnTimer = 0;
            spawnHordeEnemy(W, H);
            hordeSpawnCount++;
        }
        if (hordeSpawnCount >= hordeSpawnTarget) {
            const worldObjects = getWorldObjects();
            const hordeEnemies = worldObjects.filter(o => o.isHorde && !o.acted);
            if (hordeEnemies.length === 0) {
                hordeActive = false;
                hordeInterval = CONFIG.HORDE_NEXT_INTERVAL_MIN + Math.random() * CONFIG.HORDE_NEXT_INTERVAL_RANGE;
                hordeCalmTimer = CONFIG.HORDE_CALM_DURATION;
                incrementHordesSurvived();

                // Celebration!
                hordeCelebrationTimer = CONFIG.HORDE_CELEBRATION_DURATION;
                spawnFloatingText('HORDE SURVIVED!', W / 2, H * 0.25, '#ffe040');

                // Confetti burst
                for (let i = 0; i < CONFIG.HORDE_CONFETTI_COUNT; i++) {
                    const colors = ['#ff4040', '#40ff40', '#4040ff', '#ffff40', '#ff40ff', '#40ffff', '#ffe040'];
                    spawnParticle({
                        x: W / 2 + randRange(-W * 0.3, W * 0.3),
                        y: H * 0.2 + randRange(-20, 20),
                        vx: randRange(-200, 200),
                        vy: randRange(-300, -100),
                        life: 2.0, maxLife: 2.0,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        size: randRange(3, 7),
                        spin: randRange(-8, 8),
                    });
                }

                // Bonus resources rain
                const groundY = H - H * CONFIG.GROUND_RATIO;
                for (let i = 0; i < CONFIG.HORDE_RESOURCE_RAIN_COUNT; i++) {
                    const res = ['wood', 'stone', 'food', 'coins'][Math.floor(Math.random() * 4)];
                    addResource(res, 1);
                    const rx = W * 0.2 + Math.random() * W * 0.6;
                    spawnFloatingText('+1 ' + res, rx, groundY - 40 - Math.random() * 30, '#ffe040');
                }
            }
        }
    }

    if (hordeCalmTimer > 0) {
        hordeCalmTimer -= dt;
    }
}

// --- Militia auto-fight ---
export function updateMilitia(dt, PAL) {
    const worldObjects = getWorldObjects();
    const militiaRange = pixelsToRadians(60);
    for (const obj of worldObjects) {
        if (obj.type === 'VILLAGER' && obj.isMilitia && !obj.acted) {
            for (const enemy of worldObjects) {
                if ((enemy.type === 'ENEMY' || enemy.type === 'REBEL') && !enemy.acted) {
                    if (angularDist(obj.theta, enemy.theta) < militiaRange) {
                        enemy.acted = true;
                        obj.acted = true;
                        incrementEnemiesDefeated();
                        registerKill();
                        spawnActionAnim(enemy, PAL, screenShakeRef, 0, HEAD_X, HEAD_Y);
                        const ecx = enemy.x + enemy.width / 2;
                        spawnFloatingText('Militia!', ecx, enemy.y - enemy.height * ((CONFIG.ENTITY_SCALE || 1) - 1) - 10, '#4488cc');
                        addResource('coins', 1);
                        break;
                    }
                }
            }
        }
    }
}

// --- Archer tower ---
export function updateArcher(dt, W, H, PAL) {
    if (!hasUpgrade('archer_tower')) return;

    const worldObjects = getWorldObjects();
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const R = CONFIG.ARC_VISUAL_RADIUS;

    // Tower is at castle (theta=0) with small offset
    const towerTheta = pixelsToRadians(10);
    if (!isVisible(towerTheta, W)) return;
    const towerPt = thetaToScreen(towerTheta, W, H);
    const towerX = towerPt.x;
    const towerTopY = groundY - CONFIG.CASTLE_BASE_H - CONFIG.CASTLE_TOWER_H;

    const fireInterval = hasUpgrade('archer_tower_2')
        ? CONFIG.ARCHER_FIRE_INTERVAL_T2
        : CONFIG.ARCHER_FIRE_INTERVAL;
    archerTimer += dt;
    if (archerTimer >= fireInterval) {
        archerTimer = 0;
        // Find nearest enemy by angular distance (not limited to visible)
        let bestObj = null;
        let bestDist = Infinity;
        for (const obj of worldObjects) {
            if ((obj.type === 'ENEMY' || obj.type === 'REBEL' || obj.type === 'BOSS') && !obj.acted) {
                const dist = angularDist(obj.theta, towerTheta);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestObj = obj;
                }
            }
        }
        if (bestObj) {
            const g = CONFIG.ARCHER_ARROW_GRAVITY;
            const speed = CONFIG.ARCHER_ARROW_SPEED;

            // Compute enemy walk speed in rad/sec
            let walkSpeed = CONFIG.ENEMY_WALK_SPEED;
            if (hasUpgrade('moat') && (bestObj.type === 'ENEMY' || bestObj.type === 'REBEL')) {
                walkSpeed *= CONFIG.MOAT_SLOW_FACTOR;
            }
            const walkSpeedRad = pixelsToRadians(walkSpeed);
            const scrollSpeedRad = pixelsToRadians(getScrollSpeed());
            const scrollAngle = getScrollAngle();

            // Enemy's relative angle changes at: d(rel)/dt = -walkSpeedRad - scrollSpeedRad
            const relDot = -walkSpeedRad - scrollSpeedRad;
            const currentRel = normalizeAngle(bestObj.theta - scrollAngle);

            // Iterate to refine flight time and predicted position
            let futureScreenX = W / 2 + R * Math.sin(currentRel); // current enemy screen X
            let flightTime = Math.abs(futureScreenX - towerX) / speed;
            // Second pass with predicted position
            const futureRel = currentRel + relDot * flightTime;
            futureScreenX = W / 2 + R * Math.sin(futureRel);
            flightTime = Math.max(0.05, Math.abs(futureScreenX - towerX) / speed);
            // Final prediction
            const finalRel = currentRel + relDot * flightTime;
            const targetX = W / 2 + R * Math.sin(finalRel);
            const targetY = bestObj.y + bestObj.height / 2;

            const dx = targetX - towerX;
            const dy = targetY - towerTopY;
            const vx = dx / flightTime;
            const vy = (dy - 0.5 * g * flightTime * flightTime) / flightTime;
            archerArrows.push({
                x: towerX, y: towerTopY,
                vx: vx, vy: vy,
                timer: 0,
                target: bestObj,
            });
        }
    }

    // Update arrows with gravity physics
    for (let i = archerArrows.length - 1; i >= 0; i--) {
        const a = archerArrows[i];
        a.timer += dt;
        a.vy += CONFIG.ARCHER_ARROW_GRAVITY * dt;
        a.x += a.vx * dt;
        a.y += a.vy * dt;

        // Check hit: arrow reached target's bounding box or ground
        let hit = false;
        const isFireArrow = hasUpgrade('archer_tower_3');
        if (a.target && !a.target.acted) {
            const t = a.target;
            if (a.x >= t.x && a.x <= t.x + t.width &&
                a.y >= t.y && a.y <= t.y + t.height) {
                hit = true;
                // Fire arrow boss bonus: deal extra damage instead of instant kill
                if (t.type === 'BOSS' && isFireArrow) {
                    t.bossHP -= CONFIG.ARCHER_FIRE_ARROW_BONUS;
                    t.bossStagger = CONFIG.BOSS_STAGGER_TIME;
                    const ecx = t.x + t.width / 2;
                    if (t.bossHP <= 0) {
                        t.acted = true;
                        incrementEnemiesDefeated();
                        registerKill();
                        addResource('coins', CONFIG.BOSS_COINS);
                        spawnFloatingText('FIRE ARROW! Boss slain!', ecx, t.y - t.height * ((CONFIG.ENTITY_SCALE || 1) - 1) - 10, '#ff6020');
                    } else {
                        spawnFloatingText('Fire Arrow! (' + t.bossHP + '/' + t.bossMaxHP + ')', ecx, t.y - t.height * ((CONFIG.ENTITY_SCALE || 1) - 1) - 10, '#ff6020');
                    }
                } else {
                    t.acted = true;
                    incrementEnemiesDefeated();
                    registerKill();
                    spawnActionAnim(t, PAL, screenShakeRef, 0, HEAD_X, HEAD_Y);
                    const ecx = t.x + t.width / 2;
                    const label = isFireArrow ? 'Fire Arrow!' : 'Arrow!';
                    spawnFloatingText(label, ecx, t.y - t.height * ((CONFIG.ENTITY_SCALE || 1) - 1) - 10, isFireArrow ? '#ff6020' : '#cc8844');
                    addResource('coins', 1);
                }
            }
        }
        // Rain arrows can also hit any enemy in path (not just original target)
        if (!hit && a.isRainArrow) {
            for (const obj of worldObjects) {
                if ((obj.type === 'ENEMY' || obj.type === 'REBEL') && !obj.acted) {
                    if (a.x >= obj.x && a.x <= obj.x + obj.width &&
                        a.y >= obj.y && a.y <= obj.y + obj.height) {
                        hit = true;
                        obj.acted = true;
                        incrementEnemiesDefeated();
                        registerKill();
                        spawnActionAnim(obj, PAL, screenShakeRef, 0, HEAD_X, HEAD_Y);
                        const ecx = obj.x + obj.width / 2;
                        spawnFloatingText('Rain!', ecx, obj.y - obj.height * ((CONFIG.ENTITY_SCALE || 1) - 1) - 10, '#cc8844');
                        addResource('coins', 1);
                        break;
                    }
                }
            }
        }

        // Remove if hit, expired, below ground, or off-screen
        if (hit || a.timer > CONFIG.ARCHER_ARROW_MAX_TIME || a.y > groundY || a.x < -200 || a.x > W + 200) {
            archerArrows.splice(i, 1);
        }
    }
}

// --- War hammer ---
export function updateWarHammer(dt, W, H, PAL) {
    if (hammerActive) {
        hammerAnimTimer -= dt;
        if (hammerAnimTimer <= 0) {
            hammerActive = false;
        }
    }

    if (hammerHolding && hasUpgrade('war_hammer')) {
        hammerHoldTime += dt;
        if (hammerHoldTime >= CONFIG.HAMMER_HOLD_THRESHOLD) {
            const worldObjects = getWorldObjects();
            const anyEnemy = worldObjects.some(o =>
                (o.type === 'ENEMY' || o.type === 'REBEL') && !o.acted && isVisible(o.theta, W)
            );
            if (anyEnemy) {
                activateWarHammer(W, H, PAL);
                hammerHolding = false;
                hammerHoldTime = 0;
            }
        }
    }
}

function activateWarHammer(W, H, PAL) {
    hammerActive = true;
    hammerAnimTimer = CONFIG.HAMMER_ANIM_DURATION;
    screenShakeRef.value = CONFIG.SHAKE_HAMMER;

    const worldObjects = getWorldObjects();
    let killCount = 0;
    for (const obj of worldObjects) {
        if ((obj.type === 'ENEMY' || obj.type === 'REBEL') && !obj.acted && isVisible(obj.theta, W)) {
            obj.acted = true;
            killCount++;
            const cx = obj.x + obj.width / 2;
            const cy = obj.y + obj.height / 2;

            // Launch enemy upward with ragdoll spin (the spectacle)
            const launchVX = randRange(-100, 100);
            const launchVY = randRange(-600, -350); // strongly upward
            spawnAnimation({
                type: 'hammerFly', x: cx, y: cy,
                vx: launchVX, vy: launchVY,
                timer: 0, duration: 1.2,
                bodyColor: obj.type === 'REBEL' ? PAL.rebelBody : PAL.enemyBody,
            });

            // Impact debris per enemy
            for (let i = 0; i < 10; i++) {
                spawnParticle({
                    x: cx, y: cy,
                    vx: randRange(-200, 200), vy: randRange(-500, -200),
                    life: 1.5, maxLife: 1.5,
                    color: obj.type === 'REBEL' ? PAL.rebelBody : PAL.enemyBody,
                    size: randRange(4, 8),
                });
            }
            incrementEnemiesDefeated();
            registerKill();
        }
    }

    if (killCount > 0) {
        spawnFloatingText('HAMMER SMASH! x' + killCount, W / 2, H * 0.25, '#ffe040');
        spawnFloatingText('+' + killCount + ' Coins', W / 2, H * 0.30, PAL.coinGold);
        addResource('coins', killCount);
    }

    // Massive shockwave particles
    const groundY = H - H * CONFIG.GROUND_RATIO;
    for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        spawnParticle({
            x: W / 2, y: groundY - 20,
            vx: Math.cos(angle) * 400, vy: Math.sin(angle) * 250 - 150,
            life: 1.2, maxLife: 1.2,
            color: i % 3 === 0 ? '#ffe040' : i % 3 === 1 ? '#ff8020' : '#ffffff',
            size: randRange(4, 10),
        });
    }
    // Ground debris
    for (let i = 0; i < 20; i++) {
        spawnParticle({
            x: W / 2 + randRange(-60, 60), y: groundY,
            vx: randRange(-180, 180), vy: randRange(-250, -80),
            life: 1.0, maxLife: 1.0,
            color: i % 2 === 0 ? '#8a6040' : '#6a4828',
            size: randRange(3, 7),
        });
    }
}

// --- Cleave ---
export function applyCleave(obj, PAL) {
    // Cleave extends behind the killed enemy in their approach direction
    const dir = obj.direction || -1;
    const cx = dir === -1 ? obj.x + obj.width : obj.x;
    const cy = obj.y + obj.height / 2;
    const worldObjects = getWorldObjects();
    const cleaveAngle = pixelsToRadians(CONFIG.CLEAVE_RANGE);

    // Spawn visible cleave arc animation
    spawnAnimation({
        type: 'cleaveArc', x: cx, y: cy,
        timer: 0, duration: CONFIG.CLEAVE_ARC_DURATION,
        direction: dir,
    });

    const hasForward = hasUpgrade('forward_cleave');
    for (const other of worldObjects) {
        if (other === obj) continue;
        if ((other.type === 'ENEMY' || other.type === 'REBEL') && !other.acted) {
            const angleDiff = other.theta - obj.theta;
            // For dir -1 (moving anti-clockwise toward 0), "behind" is positive theta (higher angle)
            const behind = dir === -1 ? angleDiff > 0 && angleDiff < cleaveAngle
                                      : angleDiff < 0 && angleDiff > -cleaveAngle;
            // Forward cleave: also hit enemies in front
            const inFront = hasForward && (dir === -1
                ? angleDiff < 0 && angleDiff > -cleaveAngle
                : angleDiff > 0 && angleDiff < cleaveAngle);
            if (behind || inFront) {
                other.acted = true;
                incrementEnemiesDefeated();
                registerKill();
                spawnActionAnim(other, PAL, screenShakeRef, 0, HEAD_X, HEAD_Y);
                const ocx = other.x + other.width / 2;
                const label = inFront ? 'Sweep!' : 'Cleave!';
                spawnFloatingText(label, ocx, other.y - other.height * ((CONFIG.ENTITY_SCALE || 1) - 1) - 10, '#ff8040');
                addResource('coins', 1);
            }
        }
    }
}

// --- Rain of Arrows ---
export function applyRainOfArrows(targetX, targetY, W, H) {
    if (!hasUpgrade('rain_of_arrows')) return;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const count = CONFIG.RAIN_ARROWS_COUNT;
    for (let i = 0; i < count; i++) {
        const rx = targetX + (Math.random() - 0.5) * 120;
        archerArrows.push({
            x: rx, y: -20 - Math.random() * 40,
            vx: (Math.random() - 0.5) * 30,
            vy: 250 + Math.random() * 100,
            timer: 0,
            target: null,
            isRainArrow: true,
        });
    }
}

// --- Shield Bash ---
export function applyShieldBash(targetTheta, PAL) {
    if (!hasUpgrade('shield_bash')) return;
    const worldObjects = getWorldObjects();
    const bashRange = pixelsToRadians(CONFIG.SHIELD_BASH_RANGE);
    for (const other of worldObjects) {
        if ((other.type === 'ENEMY' || other.type === 'REBEL') && !other.acted) {
            if (angularDist(other.theta, targetTheta) < bashRange) {
                other.stunTimer = CONFIG.SHIELD_BASH_STUN_DURATION;
                const ocx = other.x + other.width / 2;
                spawnFloatingText('Stunned!', ocx, other.y - other.height * ((CONFIG.ENTITY_SCALE || 1) - 1) - 10, '#88aaff');
            }
        }
    }
}

// --- Screen shake update ---
export function updateScreenShake(dt) {
    if (screenShakeRef.value > 0) {
        screenShakeRef.value = Math.max(0, screenShakeRef.value - dt * CONFIG.SHAKE_DECAY_RATE);
    }
}

// --- Reset ---
export function resetCombat() {
    hordeTimer = 0;
    hordeInterval = CONFIG.HORDE_FIRST_INTERVAL;
    hordeActive = false;
    hordeWarning = false;
    hordeWarningTimer = 0;
    hordeSpawnCount = 0;
    hordeSpawnTarget = 0;
    hordeSpawnTimer = 0;
    hordeNumber = 0;
    hordeCalmTimer = 0;
    hordeCelebrationTimer = 0;
    archerTimer = 0;
    archerArrows.length = 0;
    hammerHolding = false;
    hammerHoldTime = 0;
    hammerAnimTimer = 0;
    hammerActive = false;
    killStreak = 0;
    killStreakTimer = 0;
    killStreakDisplay = 0;
    killStreakPeak = 0;
    battleCryTimer = 0;
    battleCryActive = false;
    screenShakeRef.value = 0;
}
