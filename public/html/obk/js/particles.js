'use strict';

import { hasUpgrade } from './resources.js';
import { VACUUM_DURATION } from './config.js';

// Particle pool and emitters.
// particles are { x, y, vx, vy, life, maxLife, color, size, spin?, gravity? }
// floatingTexts are { text, x, y, vy, life, maxLife, color }
// animations are { type, x, y, timer, duration, ...extra }

const particles = [];
const floatingTexts = [];
const animations = [];

// --- Access ---
export function getParticles()     { return particles; }
export function getFloatingTexts() { return floatingTexts; }
export function getAnimations()    { return animations; }

const MAX_PARTICLES = 200;

// --- Spawn helpers ---
export function spawnParticle(p) {
    if (particles.length >= MAX_PARTICLES) {
        // Remove oldest particle to make room
        particles.shift();
    }
    particles.push(p);
}

export function spawnFloatingText(text, x, y, color) {
    floatingTexts.push({
        text: text, x: x, y: y, vy: -50,
        life: 1.2, maxLife: 1.2,
        color: color || '#ffffff',
    });
}

export function spawnAnimation(anim) {
    animations.push(anim);
}

export function spawnVacuumSpiral(fromX, fromY, toX, toY) {
    const count = 8;
    for (let i = 0; i < count; i++) {
        const angle  = (i / count) * Math.PI * 2;
        const spread = 18;
        particles.push({
            type:     'vacuum_spiral',
            x:        fromX + Math.cos(angle) * spread,
            y:        fromY + Math.sin(angle) * spread,
            targetX:  toX,
            targetY:  toY,
            progress: 0,
            duration: VACUUM_DURATION,
            angle:    angle,
            color:    'rgba(255, 230, 120, 0.85)',
            size:     4,
        });
    }
}

// --- Update ---
export function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.type === 'vacuum_spiral') {
            p.progress += dt * 1000 / p.duration;
            const t   = Math.min(p.progress, 1);
            const ease = t * t * (3 - 2 * t);  // smoothstep
            p.x = p.x + (p.targetX - p.x) * ease * 0.12;
            p.y = p.y + (p.targetY - p.y) * ease * 0.12;
            p.angle += dt * 8;
            p.size   = 4 * (1 - t * 0.7);
            if (p.progress >= 1) p.dead = true;
            if (p.dead) particles.splice(i, 1);
            continue;
        }
        if (p.type === 'resource_suction') {
            // Initial ballistic arc, then suction toward head
            p.progress += dt * 1000 / p.duration;
            const t = Math.min(p.progress, 1);

            if (t < 0.3) {
                // Initial burst outward (ballistic)
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 180 * dt; // gravity
            } else {
                // Suction phase - accelerate toward head
                const suctionT = (t - 0.3) / 0.7;
                const suctionEase = suctionT * suctionT; // accelerating attraction
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const pullStrength = 400 * suctionEase;
                p.vx = dx * pullStrength * dt;
                p.vy = dy * pullStrength * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
            }

            if (p.progress >= 1) particles.splice(i, 1);
            continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt; // gravity
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

export function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

export function updateAnimations(dt) {
    for (let i = animations.length - 1; i >= 0; i--) {
        animations[i].timer += dt;
        if (animations[i].timer >= animations[i].duration) {
            animations.splice(i, 1);
        }
    }
}

// --- Clear all ---
export function clearAll() {
    particles.length = 0;
    floatingTexts.length = 0;
    animations.length = 0;
}

// --- Batch spawn: action animation particles ---
function randRange(a, b) { return a + Math.random() * (b - a); }

function pushParticle(p) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(p);
}

export function spawnActionAnim(obj, PAL, screenShakeRef, gameTime, headX, headY) {
    const type = obj.type;
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;

    switch (type) {
        case 'TREE':
            // Tool animation
            animations.push({ type: 'chop', x: cx, y: cy, timer: 0, duration: 0.8, treeX: obj.x, treeY: obj.y, treeW: obj.width, treeH: obj.height, upgraded: hasUpgrade('better_axe') });
            // Wood logs that get suctioned
            for (let i = 0; i < 12; i++) {
                pushParticle({
                    type: 'resource_suction',
                    x: cx + randRange(-15, 15),
                    y: cy + randRange(-10, 10),
                    vx: randRange(-40, 40),
                    vy: randRange(-60, -20),
                    targetX: headX,
                    targetY: headY,
                    progress: 0,
                    duration: 1500,
                    color: PAL.wood,
                    size: randRange(4, 7),
                    life: 3,
                    maxLife: 3,
                });
            }
            break;
        case 'ROCK':
            // Tool animation
            animations.push({ type: 'mine', x: cx, y: cy, timer: 0, duration: 0.6, upgraded: hasUpgrade('better_pick') });
            // Stone chunks that get suctioned
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                pushParticle({
                    type: 'resource_suction',
                    x: cx + randRange(-12, 12),
                    y: cy + randRange(-12, 12),
                    vx: Math.cos(angle) * randRange(30, 60),
                    vy: randRange(-80, -30),
                    targetX: headX,
                    targetY: headY,
                    progress: 0,
                    duration: 1550,
                    color: i % 2 === 0 ? PAL.stone : PAL.stoneLight,
                    size: randRange(5, 9),
                    life: 3,
                    maxLife: 3,
                });
            }
            break;
        case 'BUSH':
            // Tool animation
            animations.push({ type: 'harvest', x: cx, y: cy, timer: 0, duration: 0.5 });
            // Berries/fruit that get suctioned
            for (let i = 0; i < 8; i++) {
                pushParticle({
                    type: 'resource_suction',
                    x: cx + randRange(-15, 15),
                    y: cy + randRange(-8, 8),
                    vx: randRange(-35, 35),
                    vy: randRange(-55, -25),
                    targetX: headX,
                    targetY: headY,
                    progress: 0,
                    duration: 1450,
                    color: PAL.berry,
                    size: randRange(4, 6),
                    life: 3,
                    maxLife: 3,
                });
            }
            break;
        case 'VILLAGER':
        case 'MERCHANT':
            animations.push({ type: 'tax', x: cx, y: cy, timer: 0, duration: 0.6, targetY: 10 });
            for (let i = 0; i < 5; i++) {
                pushParticle({
                    x: cx, y: obj.y + 10,
                    vx: randRange(-15, 15), vy: randRange(-50, -20),
                    life: 0.8, maxLife: 0.8,
                    color: PAL.coinGold, size: randRange(2, 4),
                });
            }
            break;
        case 'ENEMY':
        case 'REBEL':
            animations.push({ type: 'slash', x: cx, y: cy, timer: 0, duration: 0.5 });
            animations.push({ type: 'enemyFly', x: cx, y: cy, timer: 0, duration: 0.6,
                bodyColor: type === 'REBEL' ? PAL.rebelBody : PAL.enemyBody });
            animations.push({ type: 'coinDrop', x: cx, y: cy - 10, timer: 0, duration: 0.8,
                vx: randRange(-20, 20), vy: -120 });
            for (let i = 0; i < 6; i++) {
                pushParticle({
                    x: cx, y: cy,
                    vx: randRange(-60, 80), vy: randRange(-100, -30),
                    life: 0.5, maxLife: 0.5,
                    color: i < 3 ? PAL.coinGold : '#80ff80', size: randRange(2, 5),
                });
            }
            for (let i = 0; i < 8; i++) {
                pushParticle({
                    x: cx, y: cy,
                    vx: randRange(-120, 120), vy: randRange(-80, -10),
                    life: 0.3, maxLife: 0.3,
                    color: '#ffffff', size: randRange(1, 3),
                });
            }
            screenShakeRef.value = Math.max(screenShakeRef.value, 0.15);
            break;
        case 'BOSS':
            animations.push({ type: 'slash', x: cx, y: cy, timer: 0, duration: 0.5 });
            // Multiple coin drops for boss
            for (let ci = 0; ci < 3; ci++) {
                animations.push({ type: 'coinDrop', x: cx + randRange(-15, 15), y: cy - 10,
                    timer: 0, duration: 0.8 + ci * 0.1,
                    vx: randRange(-40, 40), vy: -100 - ci * 30 });
            }
            for (let i = 0; i < 10; i++) {
                pushParticle({
                    x: cx, y: cy,
                    vx: randRange(-80, 80), vy: randRange(-100, -20),
                    life: 0.6, maxLife: 0.6,
                    color: i < 5 ? PAL.bossArmor : '#ffe080', size: randRange(3, 6),
                });
            }
            screenShakeRef.value = Math.max(screenShakeRef.value, 0.2);
            break;
        case 'CATAPULT':
            animations.push({ type: 'deflect', x: cx, y: cy, timer: 0, duration: 0.4 });
            for (let i = 0; i < 8; i++) {
                pushParticle({
                    x: cx, y: cy,
                    vx: randRange(-100, 100), vy: randRange(-120, -40),
                    life: 0.5, maxLife: 0.5,
                    color: i < 4 ? PAL.stone : PAL.wood, size: randRange(3, 6),
                });
            }
            screenShakeRef.value = Math.max(screenShakeRef.value, 0.2);
            break;
        case 'DRAGON':
            animations.push({ type: 'deflect', x: cx, y: cy, timer: 0, duration: 0.6 });
            // Treasure burst
            for (let i = 0; i < 20; i++) {
                pushParticle({
                    x: cx, y: cy,
                    vx: randRange(-150, 150), vy: randRange(-200, -50),
                    life: 1.0, maxLife: 1.0,
                    color: i % 3 === 0 ? PAL.coinGold : i % 3 === 1 ? '#ffe080' : '#ff8020',
                    size: randRange(3, 6),
                });
            }
            screenShakeRef.value = Math.max(screenShakeRef.value, 0.3);
            break;
    }
}
