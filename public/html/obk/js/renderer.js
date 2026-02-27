'use strict';

import CONFIG, { HEAD_X, HEAD_Y, HEAD_RADIUS, RIVAL_HEAD_X_FRACTION, RIVAL_HEAD_Y_FRACTION, BEAM_WIDTH } from './config.js';
import { getResources, getWallHP, getMaxWallHP, getWallTier, hasUpgrade, getOwnedUpgrades, canAfford, getEnemiesDefeated, getResourcePulse, getWallDamagePulse, getTotalResourcesGathered, getHordesSurvived, getScore, getCurrentDay, getDayPulse } from './resources.js';
import { getLoyalty, getLoyaltyTransition, getLoyaltyFlash, getLoyaltyPulse } from './loyalty.js';
import { getClouds, getHillsFar, getHillsMid, getScrollOffset, getDayTimer, getWeatherType, getRaindrops, getCurrentSeason, getPlayerProgress, getRevolutionCount, getScrollAngle, normalizeAngle, pixelsToRadians, isVisible } from './world.js';
import { getWorldObjects, getBoulders } from './entities.js';
import { getParticles, getFloatingTexts, getAnimations } from './particles.js';
import {
    getButtonTarget, getButtonFlicker, getButtonFlickerTargets, getButtonPressed,
} from './action.js';
import * as head from './head.js';
import {
    getHordeWarning, getHordeWarningTimer, getHordeNumber, getHordeActive,
    getHammerActive, getHammerAnimTimer, getHammerHolding,
    getHammerHoldTime, getScreenShake, getArcherArrows,
    getKillStreakDisplay, getKillStreakPeak, getHordeCelebrationTimer,
    getBattleCryActive,
} from './combat.js';
import {
    isShopOpen, getShopSelectedIndex, setShopSelectedIndex,
    getShopBuyFlash, getShopIconPop, getShopIconPopKey,
    getTabletState, getUpgradeItems, buyUpgrade, closeShopTablets,
} from './upgrades.js';
import { loadAnnals, getTitleExpression, getDailyModifier, getPrestigeTier, getOvernightEntry } from './annals.js';
import { registerHitRegion } from './hitRegions.js';

const PAL = CONFIG.PAL;

let ctx = null;

// Wizard state for castle character
const wizardState = {
    ducking: false,
    duckTimer: 0,
    duckDuration: 0.3,    // seconds to duck down
    peekDelay: 0.5,       // seconds to peek back up
    yOffset: 0,           // current vertical offset (0 = standing, 8 = ducked)
};

export function initRenderer(context) {
    ctx = context;
}

// --- Utility drawing ---
function lerp(a, b, t) { return a + (b - a) * t; }
function randRange(a, b) { return a + Math.random() * (b - a); }

function drawThickRect(x, y, w, h, fill, outline, lineW) {
    ctx.fillStyle = outline || PAL.outline;
    ctx.fillRect(x - lineW, y - lineW, w + lineW * 2, h + lineW * 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
}

function drawThickCircle(cx, cy, r, fill, outline, lineW) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + lineW, 0, Math.PI * 2);
    ctx.fillStyle = outline || PAL.outline;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
}

function drawText(text, x, y, size, color, align, shadow) {
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    if (shadow !== false) {
        ctx.fillStyle = PAL.uiShadow;
        ctx.fillText(text, x + 2, y + 2);
    }
    ctx.fillStyle = color || PAL.uiText;
    ctx.fillText(text, x, y);
}

function drawStar(cx, cy, size) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.4;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

// --- Word wrap utility ---
// Returns array of strings fitting within maxWidth at the given font size
function wrapText(text, maxWidth, fontSize, bold) {
    ctx.font = (bold ? 'bold ' : '') + fontSize + 'px monospace';
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width <= maxWidth) {
            current = test;
        } else {
            if (current) lines.push(current);
            current = word;
        }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [text];
}

// --- Arc transform utilities ---
// Maps a flat screen X position to a curved arc position
// Returns { x, y, angle } on the arc
function flatToArc(screenX, groundY, W) {
    const R = CONFIG.ARC_VISUAL_RADIUS;
    // Circle center is at (W/2, groundY + R) — only the top of the circle is visible
    const cx = W / 2;
    const cy = groundY + R;
    // Map screenX to an angle on the circle
    // screenX=0 maps to left edge, screenX=W maps to right edge
    // Arc length = W corresponds to angle span = W/R radians
    const angleSpan = W / R;
    const startAngle = -Math.PI / 2 - angleSpan / 2;
    const angle = startAngle + (screenX / W) * angleSpan;
    return {
        x: cx + Math.cos(angle) * R,
        y: cy + Math.sin(angle) * R,
        angle: angle + Math.PI / 2,  // surface normal angle (perpendicular to radius)
    };
}

// Gets the arc surface Y at a given screenX
function arcGroundY(screenX, groundY, W) {
    const pt = flatToArc(screenX, groundY, W);
    return pt.y;
}

// Apply arc transform to ctx for drawing an entity at screenX, groundY
function applyArcTransform(screenX, groundY, W) {
    const pt = flatToArc(screenX, groundY, W);
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.angle);
}

// --- Polar positioning for world-fixed objects ---
// All world-fixed objects (castle, buildings, moat, etc.) use polar coordinates.
// worldOffset: pixel offset from castle (0 = castle). Converted to theta internally.
// Returns null if off-screen.
function baseToScreenX(worldOffset, W) {
    const theta = pixelsToRadians(worldOffset);
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const scrollAngle = getScrollAngle();
    const rel = normalizeAngle(theta - scrollAngle);
    const halfArc = (W / 2) / R + 0.6; // generous margin for buildings
    if (Math.abs(rel) > halfArc) return null;
    return W / 2 + R * Math.sin(rel);
}

// Apply polar arc transform for a world-fixed object at pixel offset from castle.
// Uses the SAME math as entity rendering (thetaToScreen).
function applyPolarTransform(worldOffset, groundY, W) {
    const theta = pixelsToRadians(worldOffset);
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const cx = W / 2;
    const cy = groundY + R;
    const scrollAngle = getScrollAngle();
    const rel = normalizeAngle(theta - scrollAngle);
    ctx.translate(cx + R * Math.sin(rel), cy - R * Math.cos(rel));
    ctx.rotate(rel);
}

// --- Sky (day/night cycle) ---
function lerpColor(a, b, t) {
    const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

function getDayPhase() {
    // Returns 0-1 where 0=noon, 0.25=sunset, 0.5=midnight, 0.75=sunrise
    const dayTimer = getDayTimer();
    return (dayTimer % CONFIG.DAY_CYCLE_LENGTH) / CONFIG.DAY_CYCLE_LENGTH;
}

function drawSky(W, H, gameTime) {
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const phase = getDayPhase();

    // Sky color stops: noon -> sunset -> night -> sunrise -> noon
    let topColor, botColor;
    if (phase < 0.2) {
        // Noon to early sunset
        topColor = PAL.sky1; botColor = PAL.sky2;
    } else if (phase < 0.3) {
        // Sunset transition
        const t = (phase - 0.2) / 0.1;
        topColor = lerpColor(PAL.sky1, '#ff8844', t);
        botColor = lerpColor(PAL.sky2, '#cc5522', t);
    } else if (phase < 0.4) {
        // Sunset to night
        const t = (phase - 0.3) / 0.1;
        topColor = lerpColor('#ff8844', PAL.nightSky1, t);
        botColor = lerpColor('#cc5522', PAL.nightSky2, t);
    } else if (phase < 0.6) {
        // Night
        topColor = PAL.nightSky1; botColor = PAL.nightSky2;
    } else if (phase < 0.7) {
        // Sunrise transition
        const t = (phase - 0.6) / 0.1;
        topColor = lerpColor(PAL.nightSky1, '#ff9966', t);
        botColor = lerpColor(PAL.nightSky2, '#cc6633', t);
    } else if (phase < 0.8) {
        // Sunrise to day
        const t = (phase - 0.7) / 0.1;
        topColor = lerpColor('#ff9966', PAL.sky1, t);
        botColor = lerpColor('#cc6633', PAL.sky2, t);
    } else {
        topColor = PAL.sky1; botColor = PAL.sky2;
    }

    const grad = ctx.createLinearGradient(0, 0, 0, groundY);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, botColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H); // fill full height; ground arc will paint over

    // Stars at night
    if (phase > 0.35 && phase < 0.65) {
        const nightAlpha = phase < 0.4 ? (phase - 0.35) / 0.05 : phase > 0.6 ? (0.65 - phase) / 0.05 : 1;
        ctx.fillStyle = `rgba(255,255,255,${nightAlpha * 0.7})`;
        for (let i = 0; i < 20; i++) {
            // Distribute stars in a grid with jitter
            const cols = 5;
            const rows = 4;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const sx = (col + 0.5) * (W / cols) + Math.sin(i * 7.13) * (W / cols * 0.3);
            const sy = (row + 0.5) * (groundY * 0.6 / rows) + Math.cos(i * 4.37) * (groundY * 0.6 / rows * 0.3);
            const twinkle = Math.sin(gameTime * 2 + i * 1.7) * 0.3 + 0.7;
            ctx.globalAlpha = nightAlpha * twinkle * 0.7;
            ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
        }
        ctx.globalAlpha = 1;
    }
}

// --- Clouds (4 distinct shapes) ---
function drawCloudShape(c) {
    const cx = c.x, cy = c.y, w = c.w, h = c.h;
    switch (c.shape) {
        case 0: // wide flat cloud
            ctx.beginPath();
            ctx.ellipse(cx + w / 2, cy + h * 0.6, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.35, cy + h * 0.3, w * 0.3, h * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.65, cy + h * 0.35, w * 0.25, h * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 1: // tall puffy cloud
            ctx.beginPath();
            ctx.ellipse(cx + w / 2, cy + h * 0.65, w * 0.45, h * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.5, cy + h * 0.2, w * 0.3, h * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.3, cy + h * 0.45, w * 0.22, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.7, cy + h * 0.45, w * 0.22, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 2: // small wispy cloud
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.3, cy + h * 0.5, w * 0.28, h * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.65, cy + h * 0.55, w * 0.32, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 3: // chunky multi-lobe cloud
            ctx.beginPath();
            ctx.ellipse(cx + w / 2, cy + h * 0.6, w / 2, h * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.25, cy + h * 0.35, w * 0.2, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.5, cy + h * 0.2, w * 0.25, h * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + w * 0.75, cy + h * 0.35, w * 0.2, h * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
    }
}

function drawClouds(W, H) {
    const clouds = getClouds();
    const groundY = H - H * CONFIG.GROUND_RATIO;
    for (const c of clouds) {
        ctx.save();
        // Place cloud on arc above the surface
        applyArcTransform(c.x + c.w / 2, groundY, W);
        ctx.translate(0, -(c.y + 130)); // lift above surface, above entity heads
        // Offset so drawCloudShape works with its expected coordinates
        ctx.translate(-(c.x + c.w / 2), -c.y);
        // Shadow
        ctx.fillStyle = PAL.cloudShadow;
        ctx.save();
        ctx.translate(0, 3);
        drawCloudShape(c);
        ctx.restore();
        // Main body
        ctx.fillStyle = PAL.cloud;
        drawCloudShape(c);
        ctx.restore();
    }
}

// --- Color utility ---
function shadeColor(hex, amount) {
    // amount: -1 to +1, darkens or lightens
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    if (amount > 0) {
        r = Math.min(255, Math.round(r + (255 - r) * amount));
        g = Math.min(255, Math.round(g + (255 - g) * amount));
        b = Math.min(255, Math.round(b + (255 - b) * amount));
    } else {
        const f = 1 + amount;
        r = Math.round(r * f);
        g = Math.round(g * f);
        b = Math.round(b * f);
    }
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// --- Hills (arc-following) ---
function drawHills(hills, color, parallaxFactor, W, H) {
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const scrollOffset = getScrollOffset();
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const cx = W / 2;
    const cy = groundY + R;
    const angleSpan = W / R;
    const startAngle = -Math.PI / 2 - angleSpan / 2;

    for (const h of hills) {
        const hx = ((h.x - scrollOffset * parallaxFactor) % (W + 600)) - 200;
        ctx.fillStyle = shadeColor(color, h.shade || 0);

        // Draw hill as arc-following shape with multiple points
        const hillSteps = 12;
        ctx.beginPath();
        for (let i = 0; i <= hillSteps; i++) {
            const t = i / hillSteps;
            const sx = hx - h.w / 2 + t * h.w;
            // Quadratic hill shape: peaks at center
            const hillHeight = h.h * 4 * t * (1 - t); // 0 at edges, h at center
            const pt = flatToArc(sx, groundY, W);
            // Offset outward (away from center) by hill height
            const angle = startAngle + (sx / W) * angleSpan;
            const px = cx + Math.cos(angle) * (R + hillHeight);
            const py = cy + Math.sin(angle) * (R + hillHeight);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        // Close along the ground arc
        for (let i = hillSteps; i >= 0; i--) {
            const t = i / hillSteps;
            const sx = hx - h.w / 2 + t * h.w;
            const pt = flatToArc(sx, groundY, W);
            ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

// --- Ground (arc-shaped) ---
function drawGround(W, H) {
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const groundH = H * CONFIG.GROUND_RATIO;
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const cx = W / 2;
    const cy = groundY + R;
    const scrollAngle = getScrollAngle();

    // Draw concentric full-circle layers for grass, dark grass, dirt
    const surfaceDepth = Math.min(50, groundH);
    const layers = [
        { color: PAL.grass1, rOuter: R, rInner: R - 8 },
        { color: PAL.grass2, rOuter: R - 8, rInner: R - surfaceDepth * 0.4 },
        { color: PAL.grassDark, rOuter: R - surfaceDepth * 0.4, rInner: R - surfaceDepth * 0.7 },
        { color: PAL.dirt, rOuter: R - surfaceDepth * 0.7, rInner: R - surfaceDepth },
    ];

    for (const layer of layers) {
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.arc(cx, cy, layer.rOuter, 0, Math.PI * 2);
        ctx.arc(cx, cy, layer.rInner, Math.PI * 2, 0, true);
        ctx.closePath();
        ctx.fill();
    }

    // Fill planet interior
    ctx.fillStyle = '#3a2818';
    ctx.beginPath();
    ctx.arc(cx, cy, R - surfaceDepth, 0, Math.PI * 2);
    ctx.fill();

    // Ground details: fixed theta positions around the planet, rendered via thetaToScreen
    const TWO_PI = 2 * Math.PI;
    const halfArc = (W / 2) / R + 0.15; // visible arc half-angle with margin

    // Grass tufts - varied spacing, height and density (seeded by index)
    const numTufts = 140;
    for (let i = 0; i < numTufts; i++) {
        const s1 = Math.abs(Math.sin(i * 137.508 + 3.7)) ; // 0..1 per-tuft seed
        const s2 = Math.abs(Math.sin(i * 73.1   + 1.2)) ;
        // Vary angular spacing with jitter so tufts aren't evenly spaced
        const theta = (i / numTufts) * TWO_PI + (s1 - 0.5) * (TWO_PI / numTufts) * 1.6;
        const rel = normalizeAngle(theta - scrollAngle);
        if (Math.abs(rel) > halfArc) continue;
        const sx = cx + R * Math.sin(rel);
        const sy = cy - R * Math.cos(rel);
        const h1 = 4 + Math.floor(s1 * 7);   // 4-10px tall
        const h2 = 3 + Math.floor(s2 * 5);   // 3-7px tall
        const w1 = s1 > 0.55 ? 3 : 2;
        const side = 3 + Math.floor(s2 * 4); // side-tuft offset
        ctx.fillStyle = s1 > 0.65 ? PAL.grass2 : PAL.grass1;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rel);
        ctx.fillRect(-w1, -h1, w1 * 2, h1);
        if (s2 > 0.25) {
            ctx.fillStyle = s1 > 0.45 ? PAL.grass1 : PAL.grassDark;
            ctx.fillRect(side, -h2, 2, h2);
        }
        if (s1 > 0.72) {
            ctx.fillStyle = PAL.grass2;
            ctx.fillRect(-side - 2, -(h1 - 1), 2, h1 - 1);
        }
        ctx.restore();
    }

    // Dirt patches - 24 around the planet
    ctx.fillStyle = 'rgba(100,70,40,0.15)';
    for (let i = 0; i < 24; i++) {
        const theta = (i / 24) * TWO_PI;
        const rel = normalizeAngle(theta - scrollAngle);
        if (Math.abs(rel) > halfArc) continue;
        const dRadius = R - surfaceDepth * 0.5 - (i % 3) * 8;
        const sx = cx + dRadius * Math.sin(rel);
        const sy = cy - dRadius * Math.cos(rel);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rel);
        ctx.fillRect(-9, -3, 18 + (i % 4) * 6, 6 + (i % 2) * 4);
        ctx.restore();
    }

    // Small pebbles - 30 around the planet
    ctx.fillStyle = 'rgba(160,150,140,0.25)';
    for (let i = 0; i < 30; i++) {
        const theta = (i / 30) * TWO_PI;
        const rel = normalizeAngle(theta - scrollAngle);
        if (Math.abs(rel) > halfArc) continue;
        const pRadius = R - surfaceDepth * 0.6 - (i % 5) * 5;
        const sx = cx + pRadius * Math.sin(rel);
        const sy = cy - pRadius * Math.cos(rel);
        ctx.fillRect(sx, sy, 3 + (i % 3), 2 + (i % 2));
    }
}

// --- Rain ---
function drawRain(W, H) {
    if (getWeatherType() !== 'rain') return;
    const drops = getRaindrops();
    ctx.strokeStyle = 'rgba(180,200,255,0.35)';
    ctx.lineWidth = 1;
    for (const r of drops) {
        if (r.y > H) continue;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2, r.y + r.length);
        ctx.stroke();
    }
    // Puddle shimmer on ground arc
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const cxArc = W / 2;
    const cyArc = groundY + R;
    const angleSpan = W / R;
    const startAngle = -Math.PI / 2 - angleSpan / 2;
    ctx.strokeStyle = 'rgba(100,140,200,0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cxArc, cyArc, R, startAngle, startAngle + angleSpan);
    ctx.stroke();
}

// Update wizard duck/peek behavior based on head proximity to rival castle
function updateWizard(dt) {
    // Find the rival castle entity
    const worldObjects = getWorldObjects();
    const rivalCastle = worldObjects.find(obj => obj.type === 'rival_castle');
    if (!rivalCastle) return;

    const rivalCastleX = rivalCastle.x + rivalCastle.width / 2;

    // Check if head is passing over castle (within ~100px)
    const headOverCastle = Math.abs(HEAD_X - rivalCastleX) < 100;

    if (headOverCastle && !wizardState.ducking) {
        // Start ducking
        wizardState.ducking = true;
        wizardState.duckTimer = 0;
    }

    if (wizardState.ducking) {
        wizardState.duckTimer += dt;

        if (wizardState.duckTimer < wizardState.duckDuration) {
            // Ducking down
            const t = wizardState.duckTimer / wizardState.duckDuration;
            wizardState.yOffset = t * 8;
        } else if (!headOverCastle && wizardState.duckTimer >= wizardState.duckDuration + wizardState.peekDelay) {
            // Peeking back up
            const peekT = (wizardState.duckTimer - wizardState.duckDuration - wizardState.peekDelay) / wizardState.duckDuration;
            if (peekT >= 1) {
                // Done peeking
                wizardState.ducking = false;
                wizardState.yOffset = 0;
            } else {
                wizardState.yOffset = 8 * (1 - peekT);
            }
        } else {
            // Holding ducked position
            wizardState.yOffset = 8;
        }
    }
}

// --- Crowd of peasants for title screen ---
function drawCrowd(W, H, gameTime) {
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const ES = CONFIG.ENTITY_SCALE || 1;

    // Peasant positions around the castle (world offsets in pixels)
    const peasantOffsets = [
        { offset: -180, color: '#6a4a2a', hat: 0, waving: false },
        { offset: -130, color: '#4a5a4a', hat: 1, waving: true },
        { offset: -85, color: '#5a4a6a', hat: 2, waving: false },
        { offset: -40, color: '#6a5a3a', hat: 0, waving: true },
        { offset: 40, color: '#4a6a5a', hat: 1, waving: false },
        { offset: 85, color: '#5a4a4a', hat: 2, waving: true },
        { offset: 130, color: '#6a4a5a', hat: 0, waving: false },
        { offset: 180, color: '#4a5a6a', hat: 1, waving: true },
        { offset: -160, color: '#5a6a4a', hat: 2, waving: false },
        { offset: 160, color: '#6a5a5a', hat: 0, waving: true }
    ];

    for (const peasant of peasantOffsets) {
        const screenX = baseToScreenX(peasant.offset, W);
        if (screenX === null) continue;

        ctx.save();
        applyPolarTransform(peasant.offset, groundY, W);
        ctx.scale(ES, ES);

        // Simple peasant figure centered at origin
        const pw = 20, ph = 30;
        const px = -pw / 2, py = -ph;
        const ol = 2;

        // Body/shirt
        drawThickRect(px + 4, py + 14, 12, 16, peasant.color, PAL.outline, ol);

        // Head
        drawThickCircle(px + 10, py + 8, 7, PAL.skin, PAL.outline, ol);

        // Hat
        ctx.fillStyle = peasant.color;
        if (peasant.hat === 1) {
            // Flat hat
            ctx.fillRect(px + 4, py - 1, 12, 4);
            ctx.fillStyle = PAL.outline;
            ctx.fillRect(px + 3, py + 2, 14, 2);
        } else if (peasant.hat === 2) {
            // Round hat
            ctx.beginPath();
            ctx.arc(px + 10, py + 6, 9, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = PAL.outline;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Face - simple eyes and mouth
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(px + 7, py + 6, 2, 2);   // left eye
        ctx.fillRect(px + 11, py + 6, 2, 2);  // right eye

        if (peasant.waving) {
            // Happy mouth
            ctx.beginPath();
            ctx.arc(px + 10, py + 10, 3, 0, Math.PI);
            ctx.strokeStyle = PAL.outline;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Waving arm - animated
            const waveAngle = Math.sin(gameTime * 4 + peasant.offset * 0.01) * 0.3;
            ctx.save();
            ctx.translate(px + 16, py + 18);
            ctx.rotate(waveAngle);
            drawThickRect(0, 0, 6, 3, PAL.skin, PAL.outline, 1);
            ctx.restore();
        } else {
            // Neutral mouth
            ctx.fillRect(px + 8, py + 11, 4, 1);
        }

        // Legs
        drawThickRect(px + 6, py + 26, 4, 6, '#3a2a1a', PAL.outline, 1);
        drawThickRect(px + 10, py + 26, 4, 6, '#3a2a1a', PAL.outline, 1);

        ctx.restore();
    }
}

// --- Wall ---
function drawCastle(W, H, gameTime) {
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const castleX = baseToScreenX(0, W);
    if (castleX === null) return;

    const wallTier = getWallTier();
    const hasArcher = hasUpgrade('archer_tower');

    // Castle dimensions grow with tier
    const cw = CONFIG.CASTLE_BASE_W + wallTier * CONFIG.CASTLE_GROW_W;
    const ch = CONFIG.CASTLE_BASE_H + wallTier * CONFIG.CASTLE_GROW_H;

    // Material colors
    let wallColor, wallDark, wallLight;
    if (wallTier >= 3) {
        wallColor = PAL.iron; wallDark = PAL.ironDark; wallLight = '#a0b0c0';
    } else if (wallTier >= 2) {
        wallColor = PAL.stone; wallDark = PAL.stoneDark; wallLight = PAL.stoneLight;
    } else if (wallTier >= 1) {
        wallColor = PAL.wood; wallDark = PAL.woodDark; wallLight = '#b07040';
    } else {
        wallColor = '#806050'; wallDark = '#604030'; wallLight = '#907060';
    }

    ctx.save();
    applyPolarTransform(0, groundY, W);
    const ES = CONFIG.ENTITY_SCALE || 1;
    ctx.scale(ES, ES);

    // --- Main wall body ---
    const wx = -cw / 2;
    const wy = -ch;
    drawThickRect(wx, wy, cw, ch, wallColor, PAL.outline, 2);

    // --- Tier-specific wall textures ---
    if (wallTier >= 3) {
        // Iron: riveted plates
        const rows = Math.floor(ch / 14);
        for (let row = 0; row < rows; row++) {
            const ry = wy + 3 + row * 14;
            ctx.fillStyle = wallDark;
            ctx.fillRect(wx + 2, ry, cw - 4, 12);
            ctx.fillStyle = wallLight;
            ctx.fillRect(wx + 3, ry + 1, cw - 6, 2);
            // Rivets at edges
            ctx.fillStyle = '#505860';
            ctx.fillRect(wx + 3, ry + 5, 3, 3);
            ctx.fillRect(wx + cw - 6, ry + 5, 3, 3);
            if (cw > 50) ctx.fillRect(wx + cw / 2 - 1, ry + 5, 3, 3);
        }
    } else if (wallTier >= 2) {
        // Stone: block pattern with mortar
        const rows = Math.floor(ch / 12);
        for (let row = 0; row < rows; row++) {
            const ry = wy + 2 + row * 12;
            const offset = (row % 2) * 8;
            ctx.fillStyle = wallDark;
            ctx.fillRect(wx + 2, ry + 10, cw - 4, 2);
            // Vertical mortar lines
            for (let bx = 0; bx < cw - 4; bx += 16) {
                ctx.fillRect(wx + 2 + bx + offset, ry, 2, 12);
            }
            ctx.fillStyle = wallLight;
            ctx.fillRect(wx + 4 + offset, ry + 2, 8, 3);
        }
    } else if (wallTier >= 1) {
        // Wood: horizontal planks
        const rows = Math.floor(ch / 10);
        for (let row = 0; row < rows; row++) {
            ctx.fillStyle = wallDark;
            ctx.fillRect(wx + 2, wy + 3 + row * 10, cw - 4, 2);
            ctx.fillStyle = 'rgba(60,30,15,0.3)';
            ctx.fillRect(wx + 4, wy + 5 + row * 10, cw - 8, 1);
        }
        // Knots
        ctx.fillStyle = wallDark;
        ctx.fillRect(wx + 8, wy + 14, 4, 4);
        if (cw > 40) ctx.fillRect(wx + cw - 14, wy + 30, 3, 3);
    } else {
        // Tier 0: rough wooden stakes/palisade look
        ctx.fillStyle = wallDark;
        const stakes = Math.floor(cw / 8);
        for (let i = 0; i < stakes; i++) {
            const sx = wx + 2 + i * 8;
            ctx.fillRect(sx + 3, wy, 2, ch);
            // Pointed tops
            ctx.fillStyle = wallLight;
            ctx.fillRect(sx + 2, wy - 4, 4, 6);
            ctx.fillStyle = wallDark;
        }
    }

    // --- King on top of the castle (drawn before battlements so he appears behind them) ---
    ctx.save();
    const kingX = 0;
    const kingY = wy - 4; // standing on top of wall
    // Legs
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(kingX - 5, kingY, 4, 6);
    ctx.fillRect(kingX + 1, kingY, 4, 6);
    ctx.fillStyle = '#4a2060';
    ctx.fillRect(kingX - 4, kingY + 1, 3, 4);
    ctx.fillRect(kingX + 1, kingY + 1, 3, 4);
    // Royal robe (body) - sized like a peasant
    drawThickRect(kingX - 6, kingY - 16, 12, 16, '#8020a0', PAL.outline, 2);
    // Robe gold trim
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(kingX - 6, kingY - 16, 12, 2);
    ctx.fillRect(kingX - 6, kingY - 2, 12, 2);
    ctx.fillRect(kingX - 1, kingY - 14, 2, 12);
    // Head
    drawThickCircle(kingX, kingY - 22, 7, PAL.skin, PAL.outline, 2);
    // Eyes
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(kingX - 4, kingY - 24, 2, 3);
    ctx.fillRect(kingX + 2, kingY - 24, 2, 3);
    // Smile
    ctx.fillRect(kingX - 2, kingY - 19, 4, 1);
    // Crown
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(kingX - 6, kingY - 30, 12, 4);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(kingX - 7, kingY - 30, 14, 1);
    // Crown points
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(kingX - 6, kingY - 34, 3, 4);
    ctx.fillRect(kingX - 1, kingY - 36, 3, 6);
    ctx.fillRect(kingX + 4, kingY - 34, 3, 4);
    // Crown jewels
    ctx.fillStyle = '#ff2020';
    ctx.fillRect(kingX - 5, kingY - 29, 2, 2);
    ctx.fillStyle = '#2020ff';
    ctx.fillRect(kingX + 3, kingY - 29, 2, 2);
    ctx.fillStyle = '#20ff20';
    ctx.fillRect(kingX - 1, kingY - 29, 2, 2);
    // Scepter (right hand)
    ctx.fillStyle = PAL.skin;
    ctx.fillRect(kingX + 6, kingY - 14, 3, 5);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(kingX + 7, kingY - 26, 2, 14);
    // Scepter gem
    ctx.fillStyle = '#ff2020';
    ctx.fillRect(kingX + 6, kingY - 28, 4, 3);
    // Left arm waving
    ctx.fillStyle = PAL.skin;
    ctx.fillRect(kingX - 9, kingY - 14, 3, 5);
    ctx.restore();

    // --- Battlements (crenellations along the top) ---
    const merlonW = 6;
    const merlonH = 8;
    const merlonGap = 4;
    const merlonStep = merlonW + merlonGap;
    const merlonCount = Math.floor((cw + merlonGap) / merlonStep);
    const merlonStart = wx + (cw - merlonCount * merlonStep + merlonGap) / 2;
    for (let i = 0; i < merlonCount; i++) {
        drawThickRect(merlonStart + i * merlonStep, wy - merlonH, merlonW, merlonH + 2, wallColor, PAL.outline, 1);
    }

    // --- Gate (small dark archway at base) ---
    const gateW = Math.min(12, cw * 0.3);
    const gateH = Math.min(16, ch * 0.35);
    ctx.fillStyle = PAL.outline;
    ctx.beginPath();
    ctx.rect(-gateW / 2, -gateH, gateW, gateH);
    ctx.fill();
    // Arch top
    ctx.beginPath();
    ctx.arc(0, -gateH, gateW / 2, Math.PI, 0);
    ctx.fill();
    // Portcullis lines
    ctx.fillStyle = '#404040';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(-gateW / 2 + 2 + i * (gateW / 3), -gateH, 1, gateH);
    }

    // --- Banner on wall ---
    if (wallTier >= 1) {
        const bannerX = wx + cw - 14;
        const bannerY = wy + 8;
        // Pole
        ctx.fillStyle = wallDark;
        ctx.fillRect(bannerX + 3, bannerY, 2, 20);
        // Flag
        ctx.fillStyle = '#cc2020';
        ctx.beginPath();
        ctx.moveTo(bannerX + 5, bannerY + 2);
        ctx.lineTo(bannerX + 14, bannerY + 5 + Math.sin(gameTime * 3) * 1.5);
        ctx.lineTo(bannerX + 5, bannerY + 10);
        ctx.closePath();
        ctx.fill();
    }

    // --- Castle wear overlays ---
    {
        const resources = getResources();
        const scorch  = resources.castleScorchCount ?? 0;
        const repairs = resources.castleRepairCount ?? 0;

        // Scorch marks (dark patches)
        for (let s = 0; s < Math.min(scorch, 6); s++) {
            const sx2 = Math.cos(s * 1.1) * 12;
            const sy2 = -10 + Math.sin(s * 1.1) * 8;
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.ellipse(sx2, sy2, 8, 5, s * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#1a0a00';
            ctx.fill();
            ctx.restore();
        }

        // Repair patches (brighter stone)
        for (let r = 0; r < Math.min(repairs, 6); r++) {
            const rx2 = Math.cos(r * 1.4 + 0.6) * 10;
            const ry2 = -14 + Math.sin(r * 1.4) * 7;
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.rect(rx2 - 5, ry2 - 4, 10, 8);
            ctx.fillStyle = '#d0c8a0';
            ctx.fill();
            ctx.restore();
        }
    }

    ctx.restore();

    // --- Archer Tower (drawn as separate structure on the castle) ---
    if (hasArcher) {
        const towerWorldOffset = cw / 2 - 4; // pixel offset from castle
        ctx.save();
        applyPolarTransform(towerWorldOffset, groundY, W);
        const ESt = CONFIG.ENTITY_SCALE || 1;
        ctx.scale(ESt, ESt);

        const tw = CONFIG.CASTLE_TOWER_W;
        const towerH = ch + CONFIG.CASTLE_TOWER_H;
        const tx = -tw / 2;
        const ty = -towerH;

        // Tower body
        drawThickRect(tx, ty, tw, towerH, wallColor, PAL.outline, 2);

        // Tower texture matches wall
        if (wallTier >= 2) {
            const rows = Math.floor(towerH / 12);
            for (let row = 0; row < rows; row++) {
                ctx.fillStyle = wallDark;
                ctx.fillRect(tx + 2, ty + 2 + row * 12 + 10, tw - 4, 2);
            }
        }

        // Pointed roof
        ctx.fillStyle = wallTier >= 2 ? '#606878' : PAL.woodDark;
        ctx.beginPath();
        ctx.moveTo(tx - 3, ty);
        ctx.lineTo(0, ty - 14);
        ctx.lineTo(tx + tw + 3, ty);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PAL.outline;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Window slit
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(tx + tw / 2 - 2, ty + 10, 4, 8);

        // Tower battlements
        for (let i = 0; i < 2; i++) {
            drawThickRect(tx - 2 + i * (tw - 2), ty - 2, 5, 6, wallColor, PAL.outline, 1);
        }

        // Archer figure (small person on top)
        const archerY = ty + 4;
        // Body - tier-based color
        const archerTier = hasUpgrade('archer_tower_3') ? 3 : hasUpgrade('archer_tower_2') ? 2 : 1;
        ctx.fillStyle = archerTier >= 3 ? '#884422' : archerTier >= 2 ? '#3355aa' : '#446688';
        ctx.fillRect(-2, archerY, 4, 6);
        // Head
        ctx.fillStyle = PAL.skin;
        ctx.fillRect(-1, archerY - 3, 3, 3);
        // Bow
        ctx.strokeStyle = archerTier >= 3 ? '#ff6020' : PAL.wood;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(3, archerY + 2, 5, -0.8, 0.8);
        ctx.stroke();

        // Fire glow for sniper tower
        if (archerTier >= 3) {
            ctx.shadowColor = '#ff6020';
            ctx.shadowBlur = 6 + Math.sin(gameTime * 4) * 3;
            ctx.fillStyle = '#ff6020';
            ctx.fillRect(5, archerY, 3, 3);
            ctx.shadowBlur = 0;
        }
        // Blue highlight for marksman tower
        if (archerTier >= 2) {
            ctx.fillStyle = archerTier >= 3 ? 'rgba(255,96,32,0.15)' : 'rgba(50,80,200,0.15)';
            ctx.fillRect(tx, ty, tw, towerH);
        }

        ctx.restore();
    }

    // --- Arrows (physics-based, drawn in screen space) ---
    const arrows = getArcherArrows();
    for (const a of arrows) {
        ctx.save();
        // Arrow angle from velocity
        const angle = Math.atan2(a.vy, a.vx);
        ctx.translate(a.x, a.y);
        ctx.rotate(angle);
        // Shaft
        ctx.fillStyle = PAL.wood;
        ctx.fillRect(-10, -1, 18, 2);
        // Arrowhead
        ctx.fillStyle = PAL.stone;
        ctx.beginPath();
        ctx.moveTo(8, -3);
        ctx.lineTo(12, 0);
        ctx.lineTo(8, 3);
        ctx.closePath();
        ctx.fill();
        // Fletching
        ctx.fillStyle = '#cc3030';
        ctx.beginPath();
        ctx.moveTo(-10, -3);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-10, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function drawWizard(wx, wy, gameTime)
{
    // --- Evil Wizard (drawn before battlements so he appears behind them) ---
    const wizardX = 0;
    const wizardBaseY = wy - 5;
    const wizardY = wizardBaseY + wizardState.yOffset;

    const blinkNow = wizardState.ducking ? (gameTime*1000)%500 < 80 : (gameTime*1000)%4000 < 130;

    // Legs
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(wizardX - 4, wizardY, 3, 5);
    ctx.fillRect(wizardX + 1, wizardY, 3, 5);
    ctx.fillStyle = '#2a1a4a';
    ctx.fillRect(wizardX - 3, wizardY + 1, 2, 3);
    ctx.fillRect(wizardX + 1, wizardY + 1, 2, 3);

    // Robe (body)
    drawThickRect(wizardX - 5, wizardY - 14, 10, 14, '#4a2a6a', PAL.outline, 2);

    // Stars on robe
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(wizardX - 2, wizardY - 10, 1, 1);
    ctx.fillRect(wizardX + 1, wizardY - 7, 1, 1);
    ctx.fillRect(wizardX - 3, wizardY - 5, 1, 1);

    // Head
    drawThickCircle(wizardX, wizardY - 20, 6, PAL.skin, PAL.outline, 2);
    // Eyes (peeking)
    ctx.fillStyle = PAL.outline;
    if (blinkNow)
    {
        ctx.fillRect(wizardX - 3, wizardY - 22, 2, 1);
        ctx.fillRect(wizardX + 1, wizardY - 22, 2, 1);
    }
    else
    {
        ctx.fillRect(wizardX - 3, wizardY - 22, 2, 2);
        ctx.fillRect(wizardX + 1, wizardY - 22, 2, 2);
    }

    // Beard
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(wizardX - 4, wizardY - 17, 8, 4);
    ctx.fillRect(wizardX - 3, wizardY - 13, 6, 2);

    // Wizard hat (pointy)
    ctx.fillStyle = '#4a2a6a';
    ctx.beginPath();
    ctx.moveTo(wizardX - 6, wizardY - 26);
    ctx.lineTo(wizardX, wizardY - 36);
    ctx.lineTo(wizardX + 6, wizardY - 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hat brim
    ctx.fillStyle = '#4a2a6a';
    ctx.fillRect(wizardX - 7, wizardY - 27, 14, 2);
    ctx.strokeStyle = PAL.outline;
    ctx.strokeRect(wizardX - 7, wizardY - 27, 14, 2);
    // Moon on hat
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(wizardX + 2, wizardY - 31, 2, 0, Math.PI * 2);
    ctx.fill();
}

// Helper function to draw enemy castle visuals (centered at origin, bottom at y=0)
function drawEnemyCastleBody(wx, wy, ecw, ech, gameTime) {

    drawWizard(0, wy, gameTime);

    // Dark stone body
    drawThickRect(wx, wy, ecw, ech, '#404048', PAL.outline, 2);

    // Stone block texture
    const rows = Math.floor(ech / 12);
    for (let row = 0; row < rows; row++) {
        const ry = wy + 2 + row * 12;
        const offset = (row % 2) * 8;
        ctx.fillStyle = '#303038';
        ctx.fillRect(wx + 2, ry + 10, ecw - 4, 2);
        for (let bx = 0; bx < ecw - 4; bx += 16) {
            ctx.fillRect(wx + 2 + bx + offset, ry, 2, 12);
        }
        ctx.fillStyle = '#505058';
        ctx.fillRect(wx + 4 + offset, ry + 2, 8, 3);
    }

    // Battlements (jagged, menacing)
    const merlonW = 6;
    const merlonH = 10;
    const merlonStep = 10;
    const merlonCount = Math.floor(ecw / merlonStep);
    for (let i = 0; i < merlonCount; i++) {
        const mx = wx + 2 + i * merlonStep;
        drawThickRect(mx, wy - merlonH, merlonW, merlonH + 2, '#404048', PAL.outline, 1);
        // Pointed tops for menacing look
        ctx.fillStyle = '#404048';
        ctx.beginPath();
        ctx.moveTo(mx, wy - merlonH);
        ctx.lineTo(mx + merlonW / 2, wy - merlonH - 4);
        ctx.lineTo(mx + merlonW, wy - merlonH);
        ctx.closePath();
        ctx.fill();
    }

    // Gate (dark archway with skull)
    const gateW = 12;
    const gateH = 16;
    ctx.fillStyle = '#1a0a0a';
    ctx.beginPath();
    ctx.rect(-gateW / 2, -gateH, gateW, gateH);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -gateH, gateW / 2, Math.PI, 0);
    ctx.fill();
    // Portcullis lines
    ctx.fillStyle = '#602020';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(-gateW / 2 + 2 + i * (gateW / 3), -gateH, 1, gateH);
    }

    // Skull above gate
    ctx.fillStyle = '#d0c8b8';
    ctx.beginPath();
    ctx.arc(0, -gateH - 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(-3, -gateH - 8, 2, 2);
    ctx.fillRect(1, -gateH - 8, 2, 2);
    ctx.fillRect(-2, -gateH - 4, 4, 1);

    // Enemy banner (red/black)
    const bannerX = wx + ecw - 12;
    const bannerY = wy + 6;
    ctx.fillStyle = '#303038';
    ctx.fillRect(bannerX + 3, bannerY, 2, 20);
    ctx.fillStyle = '#cc2020';
    ctx.beginPath();
    ctx.moveTo(bannerX + 5, bannerY + 2);
    ctx.lineTo(bannerX + 14, bannerY + 5 + Math.sin(gameTime * 3) * 1.5);
    ctx.lineTo(bannerX + 5, bannerY + 10);
    ctx.closePath();
    ctx.fill();
    // Skull on banner
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bannerX + 8, bannerY + 4, 3, 3);

    // Left tower
    const towerW = 14;
    const towerH = ech + 20;
    drawThickRect(wx - towerW / 2 - 2, -towerH, towerW, towerH, '#383840', PAL.outline, 2);
    // Tower pointed cap
    ctx.fillStyle = '#282830';
    ctx.beginPath();
    ctx.moveTo(wx - towerW / 2 - 4, -towerH);
    ctx.lineTo(wx + 2, -towerH - 12);
    ctx.lineTo(wx + towerW / 2, -towerH);
    ctx.closePath();
    ctx.fill();

    // Right tower
    drawThickRect(wx + ecw - towerW / 2 + 2, -towerH, towerW, towerH, '#383840', PAL.outline, 2);
    ctx.fillStyle = '#282830';
    ctx.beginPath();
    ctx.moveTo(wx + ecw - towerW / 2, -towerH);
    ctx.lineTo(wx + ecw + 2, -towerH - 12);
    ctx.lineTo(wx + ecw + towerW / 2 + 4, -towerH);
    ctx.closePath();
    ctx.fill();

    // Glowing red windows on towers
    const blink = Math.sin(gameTime * 2) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,40,40,${blink})`;
    ctx.fillRect(wx - 2, -towerH + 10, 3, 5);
    ctx.fillRect(wx + ecw - 1, -towerH + 10, 3, 5);
}

// --- Enemy Castle (at theta = PI, opposite side of world) ---
function drawEnemyCastle(W, H, gameTime, theta = Math.PI) {
    const groundY = H - H * CONFIG.GROUND_RATIO;
    // Convert theta angle to world offset
    const enemyOffset = (theta / (2 * Math.PI)) * CONFIG.WORLD_CIRCUMFERENCE;
    const screenX = baseToScreenX(enemyOffset, W);
    if (screenX === null) return;

    ctx.save();
    applyPolarTransform(enemyOffset, groundY, W);

    const ES = CONFIG.ENTITY_SCALE || 1;
    ctx.scale(ES, ES);

    const ecw = 50;
    const ech = 60;
    const wx = -ecw / 2;
    const wy = -ech;

    drawEnemyCastleBody(wx, wy, ecw, ech, gameTime);

    ctx.restore();
}

// --- Moat ---
function drawMoat(W, H, gameTime) {
    if (!hasUpgrade('moat')) return;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const moatOffset = CONFIG.MOAT_X_OFFSET + CONFIG.MOAT_WIDTH / 2;
    if (baseToScreenX(moatOffset, W) === null) return;

    ctx.save();
    applyPolarTransform(moatOffset, groundY, W);
    const ESm = CONFIG.ENTITY_SCALE || 1;
    ctx.scale(ESm, ESm);

    const mw = CONFIG.MOAT_WIDTH;
    // Water strip (local coords, centered)
    ctx.fillStyle = '#2060a0';
    ctx.fillRect(-mw / 2, -4, mw, 12);
    ctx.fillStyle = '#3080c0';
    ctx.fillRect(-mw / 2 + 2, -2, mw - 4, 8);

    // Animated wave ripples
    ctx.fillStyle = 'rgba(100,180,255,0.4)';
    for (let i = 0; i < 4; i++) {
        const wx = -mw / 2 + 4 + i * 8 + Math.sin(gameTime * 3 + i * 1.5) * 3;
        ctx.fillRect(wx, -1, 5, 2);
    }
    ctx.fillStyle = 'rgba(150,220,255,0.3)';
    for (let i = 0; i < 3; i++) {
        const wx = -mw / 2 + 2 + i * 10 + Math.sin(gameTime * 2.5 + i * 2) * 4;
        ctx.fillRect(wx, 3, 6, 1);
    }

    // Burning moat flame overlay
    if (hasUpgrade('burning_moat')) {
        ctx.globalAlpha = 0.6 + Math.sin(gameTime * 8) * 0.2;
        for (let i = 0; i < 5; i++) {
            const fx = -mw / 2 + 3 + i * (mw / 5);
            const flicker = Math.sin(gameTime * 12 + i * 2) * 3;
            ctx.fillStyle = '#ff4020';
            ctx.beginPath();
            ctx.moveTo(fx, 0);
            ctx.lineTo(fx + 3, -8 - flicker);
            ctx.lineTo(fx + 6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffaa20';
            ctx.beginPath();
            ctx.moveTo(fx + 1, 0);
            ctx.lineTo(fx + 3, -4 - flicker * 0.5);
            ctx.lineTo(fx + 5, 0);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

// --- Farm background ---
function drawFarmBackground(W, H, gameTime) {
    if (!hasUpgrade('farm')) return;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    if (baseToScreenX(-100, W) === null) return;

    ctx.save();
    applyPolarTransform(-100, groundY, W);
    const ESf = CONFIG.ENTITY_SCALE || 1;
    ctx.scale(ESf, ESf);
    const fx = -12;
    const fy = -20;

    // Barn building (fy=-20, height=20, base at y=0 = ground surface)
    drawThickRect(fx, fy, 24, 20, '#aa6633', PAL.outline, 1);
    ctx.fillStyle = '#cc3030';
    ctx.beginPath();
    ctx.moveTo(fx - 2, fy + 2);
    ctx.lineTo(fx + 12, fy - 10);
    ctx.lineTo(fx + 26, fy + 2);
    ctx.closePath();
    ctx.fill();
    // Barn door
    ctx.fillStyle = '#663311';
    ctx.fillRect(fx + 8, fy + 8, 8, 12);

    // Animated swaying crop field
    const gt = gameTime || 0;
    for (let i = 0; i < 6; i++) {
        const cropX = fx + 28 + i * 6;
        const sway = Math.sin(gt * 2.5 + i * 0.8) * 2;
        ctx.fillStyle = '#6abe30';
        ctx.save();
        ctx.translate(cropX + 2, fy + 20);
        ctx.rotate(sway * 0.05);
        ctx.fillRect(-2, -14, 4, 14);
        ctx.fillStyle = '#ccaa20';
        ctx.fillRect(-3, -18, 6, 5);
        ctx.restore();
    }

    ctx.restore();
}

// --- Bakery background ---
function drawBakeryBackground(W, H, gameTime) {
    if (!hasUpgrade('bakery')) return;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    if (baseToScreenX(-160, W) === null) return;

    ctx.save();
    applyPolarTransform(-160, groundY, W);
    const ESb = CONFIG.ENTITY_SCALE || 1;
    ctx.scale(ESb, ESb);
    const bx = -11;
    const by = -18;

    // Building (by=-18, height=18, base at y=0 = ground surface)
    drawThickRect(bx, by, 22, 18, '#c09060', PAL.outline, 1);
    ctx.fillStyle = '#884422';
    ctx.beginPath();
    ctx.moveTo(bx - 2, by + 2);
    ctx.lineTo(bx + 11, by - 8);
    ctx.lineTo(bx + 24, by + 2);
    ctx.closePath();
    ctx.fill();
    // Door
    ctx.fillStyle = '#663311';
    ctx.fillRect(bx + 8, by + 8, 6, 10);
    // Window
    ctx.fillStyle = '#ffe880';
    ctx.fillRect(bx + 3, by + 4, 4, 4);

    // Chimney with animated smoke
    ctx.fillStyle = '#804020';
    ctx.fillRect(bx + 16, by - 12, 5, 10);
    const gt = gameTime || 0;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 4; i++) {
        const sy = by - 14 - i * 8 - Math.sin(gt * 1.5 + i) * 3;
        const sx = bx + 18 + Math.sin(gt * 2 + i * 1.2) * 4;
        const sr = 3 + i * 1.5;
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // end bakery arc transform
}

// --- Background evolution (kingdom growth) ---
function drawBackgroundEvolution(W, H, gameTime) {
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const owned = Object.keys(getOwnedUpgrades());
    const upgradeCount = owned.length;
    const loyalty = getLoyalty();
    const wallTier = getWallTier();

    // World-fixed offsets for village buildings (relative to castle at 0)
    const hutOffset = -60;     // left of castle
    const tavernOffset = 80;   // right of castle
    const towerOffset = -40;   // between hut and castle

    const ES = CONFIG.ENTITY_SCALE || 1;

    // Small hut always visible (starting village)
    const hutVisible = baseToScreenX(hutOffset, W) !== null;
    if (hutVisible) {
        ctx.save();
        applyPolarTransform(hutOffset, groundY, W);
        ctx.scale(ES, ES);
        const hutX = -9;
        const hutY = -22;
        ctx.fillStyle = '#8a6040';
        ctx.fillRect(hutX, hutY, 18, 16);
        ctx.fillStyle = '#aa5533';
        ctx.beginPath();
        ctx.moveTo(hutX - 2, hutY + 2);
        ctx.lineTo(hutX + 9, hutY - 8);
        ctx.lineTo(hutX + 20, hutY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#553322';
        ctx.fillRect(hutX + 6, hutY + 6, 6, 10);
        ctx.restore();
    }

    // After 3+ upgrades: second building (tavern)
    const tavernVisible = baseToScreenX(tavernOffset, W) !== null;
    if (upgradeCount >= 3 && tavernVisible) {
        ctx.save();
        applyPolarTransform(tavernOffset, groundY, W);
        ctx.scale(ES, ES);
        const tx = -11;
        const ty = -26;
        ctx.fillStyle = '#907050';
        ctx.fillRect(tx, ty, 22, 20);
        ctx.fillStyle = '#884422';
        ctx.beginPath();
        ctx.moveTo(tx - 2, ty + 2);
        ctx.lineTo(tx + 11, ty - 10);
        ctx.lineTo(tx + 24, ty + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffe880';
        ctx.fillRect(tx + 4, ty + 4, 4, 4);
        ctx.fillRect(tx + 14, ty + 4, 4, 4);
        ctx.fillStyle = '#553322';
        ctx.fillRect(tx + 8, ty + 10, 6, 10);
        // Chimney smoke
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#c0c0c0';
        for (let i = 0; i < 3; i++) {
            const sy = ty - 12 - i * 7 - Math.sin(gameTime * 1.5 + i) * 2;
            const sx = tx + 18 + Math.sin(gameTime * 2 + i * 1.1) * 3;
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5 + i, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // After 5+ upgrades: watchtower
    if (upgradeCount >= 5 && baseToScreenX(towerOffset, W) !== null) {
        ctx.save();
        applyPolarTransform(towerOffset, groundY, W);
        ctx.scale(ES, ES);
        const tx = -7;
        const ty = -44;
        ctx.fillStyle = wallTier >= 2 ? PAL.stone : '#8a7060';
        ctx.fillRect(tx, ty, 14, 38);
        // Battlements
        for (let i = 0; i < 2; i++) {
            ctx.fillRect(tx + i * 8 - 1, ty - 6, 6, 8);
        }
        // Window
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(tx + 5, ty + 10, 4, 5);
        ctx.fillRect(tx + 5, ty + 22, 4, 5);
        ctx.restore();
    }

    // High loyalty: banners on buildings
    if (loyalty >= CONFIG.LOYALTY_HIGH_THRESHOLD) {
        const bannerColors = ['#cc3030', '#3030cc', '#30cc30'];
        const bannerOffsets = [hutOffset, tavernOffset];
        const bannerYs = [-32, -36];
        for (let i = 0; i < Math.min(bannerOffsets.length, upgradeCount >= 3 ? 2 : 1); i++) {
            if (baseToScreenX(bannerOffsets[i], W) === null) continue;
            ctx.save();
            applyPolarTransform(bannerOffsets[i], groundY, W);
            ctx.scale(ES, ES);
            const bx = 0;
            const by = bannerYs[i];
            ctx.fillStyle = '#553322';
            ctx.fillRect(bx, by, 2, 10);
            const wave = Math.sin(gameTime * 3 + i * 1.5) * 2;
            ctx.fillStyle = bannerColors[i % bannerColors.length];
            ctx.beginPath();
            ctx.moveTo(bx + 2, by);
            ctx.lineTo(bx + 10, by + 2 + wave);
            ctx.lineTo(bx + 2, by + 8);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        // Flowers on ground near base
        for (let i = 0; i < 5; i++) {
            const flowerOffset = -80 + i * 40;
            if (baseToScreenX(flowerOffset, W) === null) continue;
            ctx.save();
            applyPolarTransform(flowerOffset, groundY, W);
            ctx.scale(ES, ES);
            ctx.fillStyle = '#ff80c0';
            ctx.fillRect(-1, -4, 3, 3);
            ctx.fillStyle = '#ffcc40';
            ctx.fillRect(0, -3, 1, 1);
            ctx.restore();
        }
    }

    // Low loyalty: boarded windows, dark mood
    if (loyalty < CONFIG.LOYALTY_LOW_THRESHOLD && loyalty >= CONFIG.LOYALTY_REBELLION_THRESHOLD) {
        if (hutVisible) {
            ctx.save();
            applyPolarTransform(hutOffset, groundY, W);
            ctx.scale(ES, ES);
            ctx.strokeStyle = '#553322';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-5, -18);
            ctx.lineTo(5, -10);
            ctx.moveTo(5, -18);
            ctx.lineTo(-5, -10);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Rebellion: fires on buildings
    if (loyalty < CONFIG.LOYALTY_REBELLION_THRESHOLD) {
        const fireOffsets = [hutOffset];
        const fireYs = [-28];
        if (upgradeCount >= 3) { fireOffsets.push(tavernOffset); fireYs.push(-30); }
        for (let i = 0; i < fireOffsets.length; i++) {
            if (baseToScreenX(fireOffsets[i], W) === null) continue;
            ctx.save();
            applyPolarTransform(fireOffsets[i], groundY, W);
            ctx.scale(ES, ES);
            const fy = fireYs[i];
            const flicker = Math.sin(gameTime * 12) * 3;
            ctx.fillStyle = '#ff4020';
            ctx.beginPath();
            ctx.moveTo(-4, fy);
            ctx.lineTo(0, fy - 10 - flicker);
            ctx.lineTo(4, fy);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ffaa20';
            ctx.beginPath();
            ctx.moveTo(-2, fy);
            ctx.lineTo(0, fy - 6 - flicker * 0.5);
            ctx.lineTo(2, fy);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
}

// --- Entity drawing ---
function drawTree(obj) {
    const x = obj.x, y = obj.y;
    const ol = 2;
    const v = obj.variant || 0;
    drawThickRect(x + 13, y + 30, 10, 26, PAL.wood, PAL.outline, ol);
    switch (v) {
        case 0: // round canopy (default)
            drawThickCircle(x + 18, y + 18, 16, PAL.leafDark, PAL.outline, ol);
            drawThickCircle(x + 14, y + 14, 13, PAL.leaf, PAL.outline, ol);
            drawThickCircle(x + 22, y + 12, 11, PAL.leaf, PAL.outline, ol);
            break;
        case 1: // tall narrow canopy (pine-like)
            ctx.fillStyle = PAL.outline;
            ctx.beginPath();
            ctx.moveTo(x + 18, y - 2); ctx.lineTo(x + 30, y + 28); ctx.lineTo(x + 6, y + 28);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.leafDark;
            ctx.beginPath();
            ctx.moveTo(x + 18, y); ctx.lineTo(x + 28, y + 26); ctx.lineTo(x + 8, y + 26);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = PAL.leaf;
            ctx.beginPath();
            ctx.moveTo(x + 18, y + 4); ctx.lineTo(x + 26, y + 18); ctx.lineTo(x + 10, y + 18);
            ctx.closePath(); ctx.fill();
            break;
        case 2: // wide bushy canopy
            drawThickCircle(x + 18, y + 20, 14, PAL.leafDark, PAL.outline, ol);
            drawThickCircle(x + 10, y + 16, 11, PAL.leaf, PAL.outline, ol);
            drawThickCircle(x + 26, y + 16, 11, PAL.leaf, PAL.outline, ol);
            drawThickCircle(x + 18, y + 10, 10, PAL.leaf, PAL.outline, ol);
            break;
    }
}

function drawRock(obj) {
    const x = obj.x, y = obj.y;
    const ol = 2;
    const v = obj.variant || 0;
    if (v === 0) {
        // Large angular rock
        ctx.fillStyle = PAL.outline;
        ctx.beginPath();
        ctx.moveTo(x - ol, y + 28 + ol);
        ctx.lineTo(x + 5 - ol, y - ol);
        ctx.lineTo(x + 28 + ol, y - ol);
        ctx.lineTo(x + 34 + ol, y + 28 + ol);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PAL.stone;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 28);
        ctx.lineTo(x + 7, y + 2);
        ctx.lineTo(x + 27, y + 2);
        ctx.lineTo(x + 32, y + 28);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PAL.stoneLight;
        ctx.fillRect(x + 8, y + 5, 8, 4);
        ctx.fillStyle = PAL.stoneDark;
        ctx.fillRect(x + 15, y + 10, 2, 12);
    } else {
        // Smaller rounded boulder cluster
        drawThickCircle(x + 12, y + 18, 11, PAL.stone, PAL.outline, ol);
        drawThickCircle(x + 24, y + 20, 8, PAL.stoneDark, PAL.outline, ol);
        ctx.fillStyle = PAL.stoneLight;
        ctx.fillRect(x + 8, y + 14, 6, 3);
        ctx.fillStyle = PAL.stoneDark;
        ctx.fillRect(x + 16, y + 16, 2, 6);
    }
}

function drawBush(obj) {
    const x = obj.x, y = obj.y;
    const ol = 2;
    drawThickCircle(x + 15, y + 14, 13, PAL.leaf, PAL.outline, ol);
    drawThickCircle(x + 8, y + 16, 9, PAL.leafDark, PAL.outline, ol);
    drawThickCircle(x + 22, y + 16, 9, PAL.leafDark, PAL.outline, ol);
    drawThickCircle(x + 6, y + 10, 3, PAL.berry, PAL.outline, 1);
    drawThickCircle(x + 18, y + 8, 3, PAL.berry, PAL.outline, 1);
    drawThickCircle(x + 24, y + 14, 3, PAL.berry, PAL.outline, 1);
}

function drawVillager(obj) {
    const x = obj.x, y = obj.y;
    const ol = 2;
    const waving = !obj.acted && obj.passedZone && !obj.shirtTaken;
    const taxCount = obj.taxCount || 0;
    const shirtTaken = obj.shirtTaken || false;

    // --- Body / shirt ---
    if (shirtTaken) {
        // Bare chest - skin colored torso
        drawThickRect(x + 4, y + 14, 12, 16, PAL.skin, PAL.outline, ol);
        // Chest detail (slight darker line for definition)
        ctx.fillStyle = PAL.skinDark;
        ctx.fillRect(x + 9, y + 16, 2, 10);
        // Crossed arms over bare chest
        drawThickRect(x + 1, y + 18, 18, 3, PAL.skin, PAL.outline, 1);
        drawThickRect(x + 2, y + 22, 16, 3, PAL.skin, PAL.outline, 1);
    } else {
        drawThickRect(x + 4, y + 14, 12, 16, obj.villagerClothColor, PAL.outline, ol);
    }

    // --- Head ---
    let headColor = PAL.skin;
    if (shirtTaken) headColor = '#ff9070';       // bright red - furious + embarrassed
    else if (taxCount >= 3) headColor = '#ffaa80'; // flushed red - very mad
    else if (taxCount >= 2) headColor = '#ffd0a0'; // slightly pink - annoyed
    drawThickCircle(x + 10, y + 8, 7, headColor, PAL.outline, ol);

    // --- Hat (lost when shirt taken) ---
    if (!shirtTaken) {
        const hat = obj.hatType || 0;
        if (hat === 1) {
            ctx.fillStyle = obj.villagerClothColor;
            ctx.fillRect(x + 4, y - 1, 12, 4);
            ctx.fillStyle = PAL.outline;
            ctx.fillRect(x + 3, y + 2, 14, 2);
        } else if (hat === 2) {
            ctx.fillStyle = obj.villagerClothColor;
            ctx.beginPath();
            ctx.arc(x + 10, y + 6, 9, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = PAL.outline;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // --- Face expressions based on tax state ---
    ctx.fillStyle = PAL.outline;
    if (shirtTaken) {
        // Furious + embarrassed: X-eyes, gritted teeth, blush marks
        // X-shaped angry eyes
        ctx.fillRect(x + 6, y + 6, 1, 1); ctx.fillRect(x + 8, y + 8, 1, 1);
        ctx.fillRect(x + 8, y + 6, 1, 1); ctx.fillRect(x + 6, y + 8, 1, 1);
        ctx.fillRect(x + 12, y + 6, 1, 1); ctx.fillRect(x + 14, y + 8, 1, 1);
        ctx.fillRect(x + 14, y + 6, 1, 1); ctx.fillRect(x + 12, y + 8, 1, 1);
        // Gritted teeth
        ctx.fillRect(x + 7, y + 11, 6, 2);
        ctx.fillStyle = PAL.uiText;
        ctx.fillRect(x + 8, y + 11, 1, 2);
        ctx.fillRect(x + 10, y + 11, 1, 2);
        ctx.fillRect(x + 12, y + 11, 1, 2);
        // Blush marks
        ctx.fillStyle = '#ff6060';
        ctx.fillRect(x + 4, y + 9, 2, 2);
        ctx.fillRect(x + 15, y + 9, 2, 2);
    } else if (taxCount >= 3) {
        // Very mad: angry V-brows, wide scowl, red cheeks
        ctx.fillRect(x + 5, y + 4, 5, 2);
        ctx.fillRect(x + 11, y + 4, 5, 2);
        ctx.fillRect(x + 7, y + 7, 2, 2);
        ctx.fillRect(x + 12, y + 7, 2, 2);
        ctx.fillRect(x + 6, y + 12, 8, 1);
        ctx.fillRect(x + 7, y + 11, 6, 1);
        ctx.fillStyle = '#ff6060';
        ctx.fillRect(x + 4, y + 9, 2, 2);
        ctx.fillRect(x + 15, y + 9, 2, 2);
    } else if (taxCount >= 2) {
        // More annoyed: furrowed brow, clear frown
        ctx.fillRect(x + 6, y + 5, 4, 1);
        ctx.fillRect(x + 11, y + 5, 4, 1);
        ctx.fillRect(x + 7, y + 7, 2, 2);
        ctx.fillRect(x + 12, y + 7, 2, 2);
        ctx.fillRect(x + 7, y + 12, 6, 1);
        ctx.fillRect(x + 8, y + 11, 4, 1);
    } else if (taxCount >= 1) {
        // A little annoyed: slight frown, normal eyes
        ctx.fillRect(x + 7, y + 6, 2, 3);
        ctx.fillRect(x + 12, y + 6, 2, 3);
        ctx.fillRect(x + 8, y + 12, 4, 1);
        ctx.fillRect(x + 7, y + 12, 1, 1);
        ctx.fillRect(x + 12, y + 12, 1, 1);
    } else {
        // Normal happy face
        ctx.fillRect(x + 7, y + 6, 2, 3);
        ctx.fillRect(x + 12, y + 6, 2, 3);
        ctx.fillRect(x + 8, y + 11, 4, 1);
    }

    // --- Legs ---
    drawThickRect(x + 5, y + 30, 4, 6, PAL.skinDark, PAL.outline, 1);
    drawThickRect(x + 12, y + 30, 4, 6, PAL.skinDark, PAL.outline, 1);

    // --- Waving arm (only if untaxed and passing) ---
    if (waving) {
        const wave = Math.sin(obj.waveTimer * 8) * 4;
        drawThickRect(x + 16, y + 10 + wave, 6, 3, PAL.skin, PAL.outline, 1);
    }

    // --- Remaining coins indicator above head ---
    if (taxCount > 0 && !shirtTaken) {
        const coinsLeft = 3 - taxCount;
        for (let i = 0; i < coinsLeft; i++) {
            ctx.fillStyle = PAL.coinGold;
            ctx.beginPath();
            ctx.arc(x + 5 + i * 6, y - 5, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PAL.outline;
            ctx.beginPath();
            ctx.arc(x + 5 + i * 6, y - 5, 2, 0, Math.PI * 2);
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    // --- Gift carrier icon ---
    if (obj.giftCarrier && !obj.acted) {
        ctx.fillStyle = PAL.coinGold;
        ctx.fillRect(x + 6, y - 8, 8, 6);
        ctx.fillStyle = '#cc3030';
        ctx.fillRect(x + 9, y - 8, 2, 6);
        ctx.fillRect(x + 6, y - 6, 8, 2);
    }

    // --- Militia icon ---
    if (obj.isMilitia && !obj.acted) {
        ctx.fillStyle = '#4466aa';
        ctx.fillRect(x - 2, y + 16, 6, 8);
        ctx.fillStyle = PAL.uiText;
        ctx.fillRect(x, y + 18, 2, 4);
    }

    // --- Mood bubble: shown when villager is in beam ---
    if (obj.inBeam) {
        const loyaltyVal = getLoyalty();
        const costText = '-' + (obj.loyaltyCost ?? 5);
        const bubbleColor = loyaltyVal < 30 ? '#e04020' : (loyaltyVal >= 80 ? '#40c020' : '#e0c040');
        const bx = x + obj.width / 2;
        const by = y;

        ctx.save();
        ctx.fillStyle   = 'rgba(240,220,180,0.9)';
        ctx.beginPath();
        ctx.roundRect(bx - 20, by - 46, 40, 22, 4);
        ctx.fill();
        ctx.fillStyle   = bubbleColor;
        ctx.font        = 'bold 11px sans-serif';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(costText, bx, by - 35);
        ctx.restore();
    }
}

function drawEnemy(obj) {
    const x = obj.x, y = obj.y;
    const ol = 2;
    drawThickRect(x + 5, y + 14, 14, 18, PAL.enemyBody, PAL.outline, ol);
    drawThickCircle(x + 12, y + 8, 7, PAL.enemyDark, PAL.outline, ol);
    ctx.fillStyle = '#ff4040';
    ctx.fillRect(x + 8, y + 6, 3, 3);
    ctx.fillRect(x + 13, y + 6, 3, 3);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 7, y + 4, 4, 2);
    ctx.fillRect(x + 13, y + 4, 4, 2);
    drawThickRect(x + 19, y + 6, 3, 18, PAL.swordBlade, PAL.outline, 1);
    drawThickRect(x + 16, y + 14, 9, 3, PAL.swordHilt, PAL.outline, 1);
    drawThickRect(x + 6, y + 32, 5, 6, PAL.enemyDark, PAL.outline, 1);
    drawThickRect(x + 14, y + 32, 5, 6, PAL.enemyDark, PAL.outline, 1);
}

function drawRebel(obj) {
    const x = obj.x, y = obj.y;
    const ol = 2;
    drawThickRect(x + 4, y + 14, 14, 18, PAL.rebelBody, PAL.outline, ol);
    drawThickCircle(x + 11, y + 8, 7, '#ff8888', PAL.outline, ol);
    ctx.fillStyle = '#880000';
    ctx.fillRect(x + 7, y + 6, 3, 3);
    ctx.fillRect(x + 13, y + 6, 3, 3);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 6, y + 4, 4, 2);
    ctx.fillRect(x + 13, y + 4, 4, 2);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x + 18, y + 2, 2, 20);
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(x + 15, y, 2, 8);
    ctx.fillRect(x + 18, y, 2, 8);
    ctx.fillRect(x + 21, y, 2, 8);
    drawThickRect(x + 5, y + 32, 5, 6, PAL.rebelDark, PAL.outline, 1);
    drawThickRect(x + 13, y + 32, 5, 6, PAL.rebelDark, PAL.outline, 1);
}

function drawBoss(obj, gameTime) {
    const x = obj.x, y = obj.y;
    const ol = 2;
    drawThickRect(x + 6, y + 16, 24, 26, PAL.bossArmor, PAL.outline, ol);
    ctx.fillStyle = PAL.bossArmorLight;
    ctx.fillRect(x + 10, y + 18, 16, 4);
    ctx.fillRect(x + 12, y + 28, 12, 3);
    drawThickRect(x + 8, y + 2, 20, 16, PAL.bossArmor, PAL.outline, ol);
    ctx.fillStyle = PAL.bossArmorLight;
    ctx.fillRect(x + 10, y + 4, 16, 3);
    ctx.fillStyle = '#ff2020';
    ctx.fillRect(x + 12, y + 10, 4, 3);
    ctx.fillRect(x + 20, y + 10, 4, 3);
    drawThickRect(x + 2, y + 16, 8, 10, PAL.bossArmorLight, PAL.outline, ol);
    drawThickRect(x + 26, y + 16, 8, 10, PAL.bossArmorLight, PAL.outline, ol);
    ctx.fillStyle = PAL.swordBlade;
    ctx.fillRect(x + 30, y + 4, 5, 24);
    ctx.fillStyle = PAL.swordHilt;
    ctx.fillRect(x + 27, y + 18, 11, 4);
    drawThickRect(x + 10, y + 42, 6, 10, PAL.bossArmor, PAL.outline, 1);
    drawThickRect(x + 20, y + 42, 6, 10, PAL.bossArmor, PAL.outline, 1);
    const dmg = obj.bossMaxHP - obj.bossHP;
    if (dmg >= 1) {
        ctx.strokeStyle = PAL.bossArmorCrack;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 20);
        ctx.lineTo(x + 20, y + 30);
        ctx.lineTo(x + 16, y + 36);
        ctx.stroke();
    }
    if (dmg >= 2) {
        ctx.strokeStyle = PAL.bossArmorCrack;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 24, y + 18);
        ctx.lineTo(x + 28, y + 28);
        ctx.stroke();
        ctx.fillStyle = '#ffe080';
        ctx.fillRect(x + 19 + Math.sin(gameTime * 10) * 2, y + 29, 3, 3);
    }
    const pipW = 8;
    const pipGap = 2;
    const totalPipW = obj.bossMaxHP * (pipW + pipGap) - pipGap;
    const pipX = x + obj.width / 2 - totalPipW / 2;
    for (let i = 0; i < obj.bossMaxHP; i++) {
        ctx.fillStyle = i < obj.bossHP ? '#ff2020' : '#402020';
        ctx.fillRect(pipX + i * (pipW + pipGap), y - 8, pipW, 5);
        ctx.strokeStyle = PAL.outline;
        ctx.lineWidth = 1;
        ctx.strokeRect(pipX + i * (pipW + pipGap), y - 8, pipW, 5);
    }
    if (obj.bossStagger > 0) {
        ctx.globalAlpha = 0.4 + Math.sin(gameTime * 20) * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6, y + 16, 24, 26);
        ctx.globalAlpha = 1;
    }
}

function drawCatapult(obj) {
    const x = obj.x, y = obj.y;
    const ol = 2;
    drawThickCircle(x + 8, y + 28, 6, PAL.woodDark, PAL.outline, ol);
    drawThickCircle(x + 32, y + 28, 6, PAL.woodDark, PAL.outline, ol);
    drawThickRect(x + 4, y + 18, 32, 8, PAL.wood, PAL.outline, ol);
    ctx.save();
    const armAngle = obj.catapultFired ? -0.3 : 0.6;
    ctx.translate(x + 18, y + 16);
    ctx.rotate(armAngle);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(-3, -28, 6, 30);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(-2, -26, 4, 26);
    if (!obj.catapultFired) {
        ctx.fillStyle = PAL.stone;
        ctx.beginPath();
        ctx.arc(0, -28, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#cc2020';
    ctx.fillRect(x + 34, y + 6, 2, 14);
    ctx.fillRect(x + 36, y + 6, 8, 6);
}

function drawMerchant(obj, gameTime) {
    const x = obj.x, y = obj.y;
    const ol = 2;

    // Golden aura glow
    ctx.shadowColor = PAL.coinGold;
    ctx.shadowBlur = 8 + Math.sin(gameTime * 3) * 4;

    drawThickRect(x + 3, y + 14, 16, 18, PAL.merchantRobe, PAL.outline, ol);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PAL.merchantRobeDark;
    ctx.fillRect(x + 5, y + 22, 12, 2);
    ctx.fillRect(x + 7, y + 28, 8, 4);
    drawThickCircle(x + 11, y + 8, 7, PAL.skin, PAL.outline, ol);
    ctx.fillStyle = '#e0e0f0';
    ctx.beginPath();
    ctx.ellipse(x + 11, y + 4, 8, 5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2040';
    ctx.fillRect(x + 9, y + 1, 4, 3);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 7, y + 7, 2, 2);
    ctx.fillRect(x + 13, y + 7, 2, 2);
    ctx.fillRect(x + 8, y + 11, 6, 1);
    ctx.fillRect(x + 7, y + 10, 2, 2);
    ctx.fillRect(x + 13, y + 10, 2, 2);
    drawThickRect(x + 5, y + 32, 4, 6, PAL.merchantRobeDark, PAL.outline, 1);
    drawThickRect(x + 13, y + 32, 4, 6, PAL.merchantRobeDark, PAL.outline, 1);

    // Sparkle particles around merchant (multiple, staggered)
    const sparkles = [
        { phase: 0, dx: -4, dy: 2 },
        { phase: 1.2, dx: 20, dy: 6 },
        { phase: 2.4, dx: 8, dy: -6 },
        { phase: 3.6, dx: -2, dy: 16 },
    ];
    for (const sp of sparkles) {
        const sparkle = Math.sin(gameTime * 4 + sp.phase);
        if (sparkle > 0.3) {
            const sz = 2 + (sparkle - 0.3) * 3;
            ctx.fillStyle = PAL.coinGold;
            ctx.fillRect(x + sp.dx, y + sp.dy, sz, sz);
        }
    }
}

function drawDragon(obj, gameTime) {
    const x = obj.x, y = obj.y;
    const wt = obj.wingTimer || 0;
    const wingAngle = Math.sin(wt * 6) * 0.5;

    // Shadow on ground (relative to entity position in arc-transformed space)
    // In arc space, ground is at entity's bottom, so shadow is drawn relative
    const H = ctx.canvas.height;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const shadowRelY = groundY - y; // how far below the dragon the ground is
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 30, y + shadowRelY, 25 + Math.sin(wt * 6) * 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = PAL.dragonBody;
    ctx.beginPath();
    ctx.ellipse(x + 30, y + 22, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head
    ctx.fillStyle = PAL.dragonBody;
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 16, 10, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#ff4020';
    ctx.fillRect(x + 4, y + 13, 4, 3);
    // Nostril
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 1, y + 17, 2, 2);

    // Wings (animated)
    ctx.save();
    ctx.translate(x + 25, y + 14);
    ctx.rotate(-0.3 + wingAngle);
    ctx.fillStyle = PAL.dragonWing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, -22);
    ctx.lineTo(15, -16);
    ctx.lineTo(20, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(x + 38, y + 14);
    ctx.rotate(-0.2 - wingAngle * 0.7);
    ctx.fillStyle = PAL.dragonWing;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-5, -18);
    ctx.lineTo(12, -12);
    ctx.lineTo(16, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Tail
    ctx.strokeStyle = PAL.dragonBody;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 50, y + 22);
    ctx.quadraticCurveTo(x + 58, y + 18 + Math.sin(wt * 4) * 3, x + 60, y + 26);
    ctx.stroke();

    // Fire breath if dragon has fired
    if (obj.dragonFired) {
        const fireAlpha = 0.5 + Math.sin(gameTime * 15) * 0.3;
        ctx.save();
        ctx.globalAlpha = fireAlpha;
        ctx.fillStyle = PAL.dragonFire;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 16);
        ctx.lineTo(x - 20, y + 8);
        ctx.lineTo(x - 15, y + 24);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffaa20';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 16);
        ctx.lineTo(x - 12, y + 12);
        ctx.lineTo(x - 10, y + 20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function drawBoulders(gameTime, W, H) {
    const boulderList = getBoulders();
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const cy = groundY + R;
    for (const b of boulderList) {
        if (b.deflected) continue;

        // Boulder in flat screen space (it arcs through the air)
        ctx.fillStyle = PAL.stoneDark;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PAL.outline;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Highlight
        ctx.fillStyle = PAL.stoneLight;
        ctx.fillRect(b.x - 3, b.y - 4, 3, 3);

        // Shadow on arc ground (screen-space X converted to arc via polar math)
        const t = b.timer / b.duration;
        const shadowScreenX = b.startX + (b.targetX - b.startX) * t;
        const shadowRel = (shadowScreenX - W / 2) / R;
        ctx.save();
        ctx.translate(W / 2 + R * Math.sin(shadowRel), cy - R * Math.cos(shadowRel));
        ctx.rotate(shadowRel);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, -1, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawWorldObject(obj, gameTime, W, H) {
    const groundY = H - H * CONFIG.GROUND_RATIO;
    ctx.save();

    // Polar transform: place entity on curved surface using pre-computed surfaceAngle
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const cx = W / 2;
    const cy = groundY + R;
    const rel = obj.surfaceAngle;  // pre-computed in updateEntities
    const arcX = cx + R * Math.sin(rel);
    const arcY = cy - R * Math.cos(rel);

    ctx.translate(arcX, arcY);
    ctx.rotate(rel);

    if (obj.type === 'DRAGON') {
        const flyOffset = groundY - obj.y - obj.height / 2;
        ctx.translate(0, -flyOffset);
    }

    // Flip horizontally when direction === 1 (enemies from left face right)
    if (obj.direction === 1) {
        ctx.scale(-1, 1);
    }

    // Scale entities up for visibility, then translate for draw functions
    const entityScreenX = obj.x + obj.width / 2;
    const ES = CONFIG.ENTITY_SCALE || 1;
    // Resource size visual scale: small=0.7x, medium=1.0x, large=1.35x
    let sizeScale = 1;
    if ((obj.type === 'TREE' || obj.type === 'ROCK' || obj.type === 'BUSH') && obj.resourceSize !== undefined) {
        sizeScale = [0.7, 1.0, 1.35][obj.resourceSize] ?? 1.0;
    }
    ctx.scale(ES * sizeScale, ES * sizeScale);
    ctx.translate(-entityScreenX, -(obj.y + obj.height));

    if (obj.inZone && !obj.acted) {
        ctx.shadowColor = '#ffe860';
        ctx.shadowBlur = 10 + Math.sin(gameTime * 6) * 4;
    }
    if (obj.type === 'BOSS' && obj.bossStagger > 0) {
        ctx.translate(Math.sin(gameTime * 30) * 3, 0);
    }
    switch (obj.type) {
        case 'TREE': drawTree(obj); break;
        case 'ROCK': drawRock(obj); break;
        case 'BUSH': drawBush(obj); break;
        case 'VILLAGER': drawVillager(obj); break;
        case 'ENEMY': drawEnemy(obj); break;
        case 'REBEL': drawRebel(obj); break;
        case 'BOSS': drawBoss(obj, gameTime); break;
        case 'CATAPULT': drawCatapult(obj); break;
        case 'MERCHANT': drawMerchant(obj, gameTime); break;
        case 'DRAGON': drawDragon(obj, gameTime); break;
        case 'enemy_hut': drawEnemyHut(obj); break;
        case 'bandit_hut': drawBanditHut(obj); break;
        case 'rival_castle': {
            const ecw = 50, ech = 60;
            const wx = obj.x - ecw / 2 + obj.width / 2;
            const wy = obj.y - ech + obj.height;
            drawEnemyCastleBody(wx, wy, ecw, ech, gameTime);
            break;
        }
        case 'scorch_mark': drawScorchMark(obj); break;
        case 'stump': drawStump(obj); break;
        case 'crater': drawCrater(obj); break;
        case 'trampled_ground': drawTrampledGround(obj); break;
        case 'sapling': drawSapling(obj); break;
    }
    ctx.restore();
}

function drawEnemyHut(obj) {
    const x = obj.x, y = obj.y;
    // Body
    ctx.fillStyle = '#5a3020';
    ctx.fillRect(x, y + 14, 28, 20);
    // Roof triangle
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 14);
    ctx.lineTo(x + 14, y);
    ctx.lineTo(x + 30, y + 14);
    ctx.closePath();
    ctx.fillStyle = '#3a1a0a';
    ctx.fill();
    // HP bar above hut
    const barW = 30;
    const barH = 4;
    ctx.fillStyle = '#300';
    ctx.fillRect(x - 1, y - 8, barW, barH);
    ctx.fillStyle = '#c00';
    ctx.fillRect(x - 1, y - 8, barW * (obj.hp / obj.maxHp), barH);
}

function drawBanditHut(obj) {
    const x = obj.x, y = obj.y;
    // Body
    ctx.fillStyle = '#2a4a30';
    ctx.fillRect(x, y + 14, 28, 20);
    // Roof triangle
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 14);
    ctx.lineTo(x + 14, y);
    ctx.lineTo(x + 30, y + 14);
    ctx.closePath();
    ctx.fillStyle = '#1a3020';
    ctx.fill();
    // HP bar above hut
    const bW = 30;
    const bH = 4;
    ctx.fillStyle = '#300';
    ctx.fillRect(x - 1, y - 8, bW, bH);
    ctx.fillStyle = '#080';
    ctx.fillRect(x - 1, y - 8, bW * (obj.hp / obj.maxHp), bH);
}

function drawScorchMark(obj) {
    const x = obj.x + obj.width / 2, y = obj.y + obj.height / 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 10, 0, 0.7)';
    ctx.fill();
}

function drawStump(obj) {
    const sx = obj.x + obj.width / 2, sy = obj.y + obj.height;
    ctx.save(); ctx.translate(sx, sy);
    ctx.beginPath(); ctx.arc(0, 4, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#5a3a1a'; ctx.fill();
    ctx.beginPath(); ctx.rect(-3, -8, 6, 12);
    ctx.fillStyle = '#4a2a0a'; ctx.fill();
    ctx.restore();
}

function drawCrater(obj) {
    const sx = obj.x + obj.width / 2, sy = obj.y + obj.height;
    ctx.save(); ctx.translate(sx, sy);
    ctx.beginPath(); ctx.ellipse(0, 4, 14, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,10,0,0.6)'; ctx.fill();
    ctx.restore();
}

function drawTrampledGround(obj) {
    const sx = obj.x + obj.width / 2, sy = obj.y + obj.height;
    ctx.save(); ctx.translate(sx, sy);
    ctx.beginPath(); ctx.ellipse(0, 4, 16, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60,35,10,0.5)'; ctx.fill();
    ctx.restore();
}

function drawSapling(obj) {
    const sx = obj.x + obj.width / 2, sy = obj.y + obj.height;
    ctx.save(); ctx.translate(sx, sy);
    ctx.beginPath();
    ctx.moveTo(0, 4); ctx.lineTo(0, -8);
    ctx.strokeStyle = '#3a6020'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -12, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#508030'; ctx.fill();
    ctx.restore();
}

// --- Loyalty face (large, expressive) ---
function drawLoyaltyFace(rightEdge, gameTime, overrideY, sizeOverride) {
    const loyalty = getLoyalty();
    const s = sizeOverride ?? CONFIG.LOYALTY_FACE_SIZE;
    const fx = rightEdge - s - CONFIG.LOYALTY_FACE_MARGIN;
    const fy = overrideY !== undefined ? overrideY : CONFIG.LOYALTY_FACE_MARGIN;
    const cx = fx + s / 2;
    const cy = fy + s / 2;
    const r = s / 2;

    let faceColor, mouthType;
    if (loyalty >= 70) { faceColor = '#40c040'; mouthType = 'happy'; }
    else if (loyalty >= 40) { faceColor = '#c0c040'; mouthType = 'neutral'; }
    else if (loyalty >= 10) { faceColor = '#d04040'; mouthType = 'angry'; }
    else { faceColor = '#802020'; mouthType = 'skull'; }

    // Loyalty change pulse effect
    const pulse = getLoyaltyPulse();
    let pulseScale = 1;
    if (pulse.timer > 0) {
        const pulseProgress = 1 - (pulse.timer / 0.5);
        pulseScale = 1 + Math.sin(pulse.timer * 20) * 0.08 * (1 - pulseProgress);
        ctx.shadowColor = pulse.direction > 0 ? '#40ff40' : '#ff4040';
        ctx.shadowBlur = 15 * (1 - pulseProgress);
    } else {
        // Pulsing glow for extreme states
        if (mouthType === 'happy') {
            ctx.shadowColor = '#40ff40';
            ctx.shadowBlur = 6 + Math.sin(gameTime * 3) * 3;
        } else if (mouthType === 'skull') {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 8 + Math.sin(gameTime * 6) * 4;
        }
    }

    // Apply pulse scale
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulseScale, pulseScale);
    ctx.translate(-cx, -cy);

    drawThickCircle(cx, cy, r, faceColor, PAL.outline, 3);

    ctx.restore();
    ctx.shadowBlur = 0;

    // Loyalty number below face (25% larger)
    drawText(Math.floor(loyalty) + '', cx, fy + s + 12, 14, faceColor, 'center');

    const eyeW = Math.round(s * 0.15);
    const eyeH = Math.round(s * 0.18);
    const eyeY = cy - r * 0.15;
    const eyeLX = cx - r * 0.28;
    const eyeRX = cx + r * 0.28;

    if (mouthType === 'skull') {
        // Skull: hollow dark eye sockets + jagged teeth
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(eyeLX - eyeW / 2, eyeY - eyeH / 2, eyeW + 2, eyeH + 2);
        ctx.fillRect(eyeRX - eyeW / 2, eyeY - eyeH / 2, eyeW + 2, eyeH + 2);
        // Flickering red pupils
        if (Math.sin(gameTime * 8) > -0.3) {
            ctx.fillStyle = '#ff2020';
            ctx.fillRect(eyeLX, eyeY, 2, 2);
            ctx.fillRect(eyeRX, eyeY, 2, 2);
        }
        // Jagged teeth
        const teethY = cy + r * 0.25;
        const teethW = r * 0.6;
        for (let i = 0; i < 4; i++) {
            const tx = cx - teethW / 2 + i * (teethW / 3);
            ctx.fillStyle = PAL.outline;
            ctx.fillRect(tx, teethY, Math.round(teethW / 4), 3);
            ctx.fillRect(tx + 1, teethY + 3, Math.round(teethW / 4) - 2, 2);
        }
    } else {
        // Eyes
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(eyeLX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH);
        ctx.fillRect(eyeRX - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH);

        // Eyebrows for angry face
        if (mouthType === 'angry') {
            ctx.strokeStyle = PAL.outline;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(eyeLX - eyeW, eyeY - eyeH);
            ctx.lineTo(eyeLX + eyeW, eyeY - eyeH * 0.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(eyeRX + eyeW, eyeY - eyeH);
            ctx.lineTo(eyeRX - eyeW, eyeY - eyeH * 0.5);
            ctx.stroke();
        }

        // Happy: curved smile. Neutral: flat line. Angry: frown
        const mouthY = cy + r * 0.3;
        const mouthW = r * 0.5;
        ctx.strokeStyle = PAL.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (mouthType === 'happy') {
            ctx.arc(cx, mouthY - 2, mouthW, 0.1 * Math.PI, 0.9 * Math.PI);
            // Rosy cheeks
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,120,120,0.4)';
            ctx.beginPath();
            ctx.arc(cx - r * 0.45, cy + r * 0.1, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + r * 0.45, cy + r * 0.1, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (mouthType === 'neutral') {
            ctx.moveTo(cx - mouthW, mouthY);
            ctx.lineTo(cx + mouthW, mouthY);
            ctx.stroke();
        } else { // angry
            ctx.arc(cx, mouthY + 6, mouthW, 1.1 * Math.PI, 1.9 * Math.PI);
            ctx.stroke();
        }
    }
}

// --- Resource icons ---
function drawWoodIcon(x, y, s) {
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x + 4, y + 4, s - 8, s - 8);
}
function drawStoneIcon(x, y, s) {
    ctx.fillStyle = PAL.stoneDark;
    ctx.fillRect(x + 1, y + 4, s - 2, s - 6);
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(x + 3, y + 6, s - 6, s - 10);
}
function drawFoodIcon(x, y, s) {
    ctx.fillStyle = PAL.leaf;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.berry;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 4, 0, Math.PI * 2);
    ctx.fill();
}
function drawCoinIcon(x, y, s) {
    ctx.fillStyle = PAL.coinDark;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.coinGold;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
}

// --- Active upgrades strip (positioned above button) ---
function drawActiveUpgrades(baseY, overrideStartX) {
    const owned = Object.keys(getOwnedUpgrades());
    if (owned.length === 0) return;
    const iconS = 14;
    const spacing = 4;
    const startX = overrideStartX !== undefined ? overrideStartX : 12;
    const maxW = ctx.canvas.width - startX * 2 - 8; // Leave margin on both sides
    const iconsPerRow = Math.floor(maxW / (iconS + spacing));
    const rows = Math.ceil(owned.length / iconsPerRow);

    const rowW = Math.min(owned.length, iconsPerRow) * (iconS + spacing) + 8;
    const rowH = iconS + 6;
    const totalH = rows * rowH;

    // Background for all rows
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(startX - 4, baseY - 2, rowW, totalH);

    for (let i = 0; i < owned.length; i++) {
        const key = owned[i];
        const row = Math.floor(i / iconsPerRow);
        const col = i % iconsPerRow;
        const ix = startX + col * (iconS + spacing);
        const iy = baseY + row * rowH;

        const upg = CONFIG.UPGRADES[key];
        if (!upg) continue;
        let color;
        if (upg.cat === 'wall') color = PAL.stone;
        else if (upg.cat === 'weapon') color = PAL.swordBlade;
        else color = PAL.leaf;
        ctx.fillStyle = color;
        ctx.fillRect(ix, iy, iconS, iconS);
        ctx.strokeStyle = PAL.outline;
        ctx.lineWidth = 1;
        ctx.strokeRect(ix, iy, iconS, iconS);
        ctx.fillStyle = PAL.outline;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(upg.name[0], ix + iconS / 2, iy + iconS / 2);
    }
}

// --- HUD (positioned above the action button on the planet) ---
function drawHUD(W, H, gameTime) {
    const resources = getResources();
    const pulse = getResourcePulse();

    // Position HUD above the button
    const btnH = W < 600 ? Math.max(100, CONFIG.BUTTON_H) : CONFIG.BUTTON_H;
    const btnBottom = H - CONFIG.BUTTON_Y_OFFSET;
    const hudBottom = btnBottom - btnH - 10;
    const hudHeight = 90;
    const hudTop = hudBottom - hudHeight;

    // Compute planet chord width at HUD's Y position to fit HUD inside arc
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const planetCenterY = groundY + R;
    const dy = planetCenterY - hudTop;
    const chordHalf = dy > 0 && dy < R ? Math.sqrt(R * R - dy * dy) : W / 2;
    const hudW = Math.min(W, Math.floor(chordHalf * 2) - 20);
    const hudLeft = Math.floor((W - hudW) / 2);

    // HUD background - clipped to chord
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(W / 2, planetCenterY, R - 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillRect(hudLeft, hudTop, hudW, hudHeight);
    ctx.restore();

    // Resources column (left side, vertical)
    const iconSize = W > 600 ? 28 : 20;  // Larger on desktop
    const verticalSpacing = iconSize + 16;
    const resStartX = 12;
    const resStartY = H * 0.25;  // Start 25% down the screen

    const items = [
        { key: 'wood',  value: resources.wood,  color: '#c89060', icon: drawWoodIcon },
        { key: 'stone', value: resources.stone, color: '#b0b4b8', icon: drawStoneIcon },
        { key: 'food',  value: resources.food,  color: '#80d040', icon: drawFoodIcon },
        { key: 'coins', value: resources.coins, color: PAL.coinGold, icon: drawCoinIcon },
    ];

    for (let i = 0; i < items.length; i++) {
        const iy = resStartY + i * verticalSpacing;
        const item = items[i];
        const p = pulse[item.key] || 0;
        const pNorm = p / CONFIG.HUD_PULSE_DURATION;

        ctx.save();
        if (pNorm > 0) {
            const scale = 1 + pNorm * 0.3;
            ctx.translate(resStartX + iconSize / 2, iy + iconSize / 2);
            ctx.scale(scale, scale);
            ctx.translate(-(resStartX + iconSize / 2), -(iy + iconSize / 2));
        }
        item.icon(resStartX, iy, iconSize);
        const fontSize = (W > 600 ? 20 : 16) + (pNorm > 0 ? Math.round(pNorm * 4) : 0);
        drawText(String(item.value), resStartX + iconSize + 4, iy + iconSize / 2, fontSize, item.color, 'left');
        if (pNorm > 0.3) {
            ctx.fillStyle = `rgba(255,255,255,${(pNorm - 0.3) * 0.6})`;
            ctx.fillRect(resStartX - 2, iy - 2, iconSize + 60, iconSize + 4);
        }
        ctx.restore();
    }

    // Wall HP bar with icon (bottom HUD area)
    const wallHP = getWallHP();
    const maxWallHP = getMaxWallHP();
    const wallDmgPulse = getWallDamagePulse();
    const barHudX = hudLeft + 10;
    const barY = hudTop + 6;
    const barX = barHudX + 18;
    const barW = Math.min(160, hudW * 0.35);
    const barH = 16;

    // Wall icon (small shield/castle)
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(barHudX, barY + 1, 14, 12);
    ctx.fillStyle = PAL.stoneDark;
    ctx.fillRect(barHudX + 2, barY + 3, 3, 4);
    ctx.fillRect(barHudX + 9, barY + 3, 3, 4);
    ctx.fillRect(barHudX + 5, barY + 7, 4, 6);

    ctx.save();
    if (wallDmgPulse > 0) {
        const shakeAmt = (wallDmgPulse / CONFIG.WALL_SHAKE_DURATION) * 4;
        ctx.translate(
            (Math.random() - 0.5) * shakeAmt * 2,
            (Math.random() - 0.5) * shakeAmt * 2
        );
    }
    ctx.fillStyle = PAL.wallBg;
    ctx.fillRect(barX, barY, barW, barH);
    const hpRatio = Math.max(0, wallHP / maxWallHP);
    const lowHP = wallHP <= CONFIG.LOW_HP_THRESHOLD;
    let hpColor;
    if (lowHP) {
        const urgency = 0.6 + Math.sin(gameTime * 10) * 0.4;
        hpColor = `rgb(${Math.round(200 + urgency * 55)},${Math.round(30 * (1 - urgency))},${Math.round(30 * (1 - urgency))})`;
    } else {
        hpColor = hpRatio > 0.5 ? '#40c040' : hpRatio > 0.25 ? '#c0c040' : '#d03030';
    }
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    if (wallDmgPulse > CONFIG.WALL_SHAKE_DURATION * 0.5) {
        ctx.fillStyle = `rgba(255,100,100,${(wallDmgPulse / CONFIG.WALL_SHAKE_DURATION) * 0.4})`;
        ctx.fillRect(barX, barY, barW, barH);
    }
    ctx.strokeStyle = lowHP ? hpColor : PAL.outline;
    ctx.lineWidth = lowHP ? 3 : 2;
    ctx.strokeRect(barX, barY, barW, barH);
    // HP number inside bar
    drawText(wallHP + '/' + maxWallHP, barX + barW / 2, barY, 12, PAL.uiText, 'center', false);
    ctx.restore();

    // Star icon + Score next to wall bar
    const score = getScore();
    const starX = barX + barW + 10;
    // Star icon
    ctx.fillStyle = PAL.coinGold;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI / 5);
        const ox = starX + 7 + Math.cos(a) * 6;
        const oy = barY + 8 + Math.sin(a) * 6;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        const ia = a + Math.PI / 5;
        ctx.lineTo(starX + 7 + Math.cos(ia) * 3, barY + 8 + Math.sin(ia) * 3);
    }
    ctx.closePath();
    ctx.fill();
    drawText(String(Math.floor(score)), starX + 16, barY, 12, PAL.coinGold, 'left');

    // Loyalty face: centered horizontally, embedded just below ground surface
    const loyGroundY = H - H * CONFIG.GROUND_RATIO;
    const loyS = CONFIG.LOYALTY_FACE_SIZE * 1.25;
    // cx = W/2: rightEdge = W/2 + loyS/2 + LOYALTY_FACE_MARGIN
    const loyRightEdge = W / 2 + loyS / 2 + CONFIG.LOYALTY_FACE_MARGIN;
    // face top at groundY + 56: face sits further below the ground surface
    drawLoyaltyFace(loyRightEdge, gameTime, loyGroundY + 56, loyS);

    // Active upgrades strip below wall bar
    drawActiveUpgrades(barY + barH + 4, hudLeft + 10);

    // Loyalty transition text (dramatic state change announcements)
    const loyaltyTrans = getLoyaltyTransition();
    if (loyaltyTrans) {
        const t = loyaltyTrans.timer / loyaltyTrans.duration;
        const alpha = t < 0.1 ? t / 0.1 : t > 0.7 ? (1 - t) / 0.3 : 1;
        ctx.save();
        ctx.globalAlpha = alpha;
        const scl = loyaltyTrans.flash ? (1.2 + Math.sin(loyaltyTrans.timer * 8) * 0.1) : 1;
        const fontSize = loyaltyTrans.flash ? 28 : 18;
        ctx.translate(W / 2, hudTop - 30);
        ctx.scale(scl, scl);
        drawText(loyaltyTrans.text, 0, 0, fontSize, loyaltyTrans.color, 'center');
        ctx.restore();
    }

    // Loyalty flash (rebellion screen flash)
    const loyaltyFlash = getLoyaltyFlash();
    if (loyaltyFlash > 0) {
        ctx.fillStyle = `rgba(255,0,0,${loyaltyFlash * 0.5})`;
        ctx.fillRect(0, 0, W, H);
    }

    // Persistent warning text for ongoing states
    const loyalty = getLoyalty();
    if (loyalty < CONFIG.LOYALTY_REBELLION_THRESHOLD) {
        const blink = Math.sin(gameTime * 8) > 0;
        if (blink) {
            drawText('REBELLION!', W / 2, hudTop - 20, 16, '#ff2020', 'center');
        }
    } else if (loyalty < CONFIG.LOYALTY_UNREST_THRESHOLD) {
        drawText('Your people grow restless...', W / 2, hudTop - 20, 12, '#ff8040', 'center');
    }
}

// --- Button icon ---
function drawButtonIcon(type, x, y, s) {
    switch (type) {
        case 'TREE':
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(x + 2, y - 2, 3, s);
            ctx.fillStyle = PAL.stone;
            ctx.fillRect(x + 5, y, 10, 6);
            break;
        case 'ROCK':
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(x + 8, y, 3, s);
            ctx.fillStyle = PAL.stone;
            ctx.fillRect(x + 2, y, 14, 4);
            break;
        case 'BUSH':
            ctx.fillStyle = PAL.stone;
            ctx.beginPath();
            ctx.arc(x + 10, y + 6, 7, Math.PI, Math.PI * 1.8);
            ctx.lineWidth = 3;
            ctx.strokeStyle = PAL.stone;
            ctx.stroke();
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(x + 8, y + 6, 3, 10);
            break;
        case 'VILLAGER':
            ctx.fillStyle = PAL.coinGold;
            ctx.beginPath();
            ctx.arc(x + 8, y + 6, 6, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'ENEMY':
        case 'REBEL':
        case 'BOSS':
            ctx.fillStyle = PAL.swordBlade;
            ctx.fillRect(x + 7, y - 2, 4, 14);
            ctx.fillStyle = PAL.swordHilt;
            ctx.fillRect(x + 3, y + 10, 12, 3);
            break;
        case 'CATAPULT':
        case 'DRAGON':
            // Shield icon
            ctx.fillStyle = PAL.stone;
            ctx.beginPath();
            ctx.moveTo(x + 2, y);
            ctx.lineTo(x + 16, y);
            ctx.lineTo(x + 14, y + 14);
            ctx.lineTo(x + 9, y + 16);
            ctx.lineTo(x + 4, y + 14);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = PAL.coinGold;
            ctx.fillRect(x + 7, y + 3, 4, 8);
            ctx.fillRect(x + 5, y + 5, 8, 4);
            break;
        case 'MERCHANT':
            ctx.fillStyle = PAL.coinGold;
            ctx.beginPath();
            ctx.arc(x + 8, y + 6, 6, 0, Math.PI * 2);
            ctx.fill();
            break;
    }
}

// --- Action button ---
function drawButton(W, H, gameTime) {
    if (isShopOpen()) return;

    // Responsive button: at least 100px tall on small screens
    const btnW = Math.max(CONFIG.BUTTON_W, W * 0.3);
    const btnH = W < 600 ? Math.max(100, CONFIG.BUTTON_H) : CONFIG.BUTTON_H;
    const btnX = W / 2 - btnW / 2;
    const btnY = H - CONFIG.BUTTON_Y_OFFSET - (btnH - CONFIG.BUTTON_H);
    const buttonTarget = getButtonTarget();
    const active = buttonTarget && !buttonTarget.acted;
    const buttonFlickerTargets = getButtonFlickerTargets();
    const hasConflict = buttonFlickerTargets.length > 1;
    const pressed = getButtonPressed();

    // War hammer hold indicator - visible charge bar
    if (getHammerHolding() && hasUpgrade('war_hammer')) {
        const holdPct = Math.min(1, getHammerHoldTime() / CONFIG.HAMMER_HOLD_THRESHOLD);
        const chargeBarW = btnW + 20;
        const chargeBarH = 12;
        const chargeBarX = btnX - 10;
        const chargeBarY = btnY - chargeBarH - 8;

        // Dark background bar
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(chargeBarX, chargeBarY, chargeBarW, chargeBarH);
        // Yellow-to-orange gradient fill
        const grad = ctx.createLinearGradient(chargeBarX, 0, chargeBarX + chargeBarW * holdPct, 0);
        grad.addColorStop(0, '#ffe040');
        grad.addColorStop(1, '#ff6020');
        ctx.fillStyle = grad;
        ctx.fillRect(chargeBarX, chargeBarY, chargeBarW * holdPct, chargeBarH);
        // Border
        ctx.strokeStyle = '#ffe040';
        ctx.lineWidth = 2;
        ctx.strokeRect(chargeBarX, chargeBarY, chargeBarW, chargeBarH);
        // Flash white when full
        if (holdPct >= 1.0) {
            const flash = Math.sin(gameTime * 15) * 0.4 + 0.6;
            ctx.fillStyle = `rgba(255,255,255,${flash})`;
            ctx.fillRect(chargeBarX, chargeBarY, chargeBarW, chargeBarH);
            drawText('RELEASE!', W / 2, chargeBarY - 18, 16, '#ffffff', 'center');
        } else {
            drawText('HOLD...', W / 2, chargeBarY - 18, 14, '#ffe040', 'center');
        }
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(btnX + 3, btnY + 3, btnW, btnH);

    const bColor = active
        ? (pressed ? '#c8a830' : PAL.buttonFace)
        : PAL.buttonDim;
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(btnX - 3, btnY - 3, btnW + 6, btnH + 6);
    ctx.fillStyle = bColor;
    ctx.fillRect(btnX, btnY + (pressed ? 2 : 0), btnW, btnH);

    if (active && !pressed) {
        ctx.shadowColor = PAL.buttonGlow;
        ctx.shadowBlur = 12 + Math.sin(gameTime * 6) * 4;
        ctx.fillStyle = bColor;
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.shadowBlur = 0;
    }

    if (active) {
        let displayTarget = buttonTarget;
        if (hasConflict) {
            const buttonFlicker = getButtonFlicker();
            const flickerIdx = Math.floor(buttonFlicker * 6) % buttonFlickerTargets.length;
            displayTarget = buttonFlickerTargets[flickerIdx];
        }
        const action = displayTarget.info.action;
        drawText(action, W / 2, btnY + (pressed ? 10 : 8), 20, PAL.outline, 'center', false);
        drawButtonIcon(displayTarget.type, W / 2 - 10, btnY + (pressed ? 32 : 30), 18);
    } else {
        drawText('---', W / 2, btnY + 14, 18, '#808080', 'center', false);
    }
}

// --- Upgrade chain depth: count self + all transitive successors ---
const _chainDepthCache = {};
function getChainDepth(key) {
    if (_chainDepthCache[key] !== undefined) return _chainDepthCache[key];
    let depth = 1;
    for (const [k, u] of Object.entries(CONFIG.UPGRADES)) {
        if (u.requires === key) depth += getChainDepth(k);
    }
    return (_chainDepthCache[key] = depth);
}

// --- Stone tablet shop rendering ---
function drawShopTablets(W, H) {
    const ts = getTabletState();
    if (!ts.visible) return;

    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    const resources   = getResources();
    const items       = getUpgradeItems(resources.currentDay ?? 1);
    const selectedIdx = getShopSelectedIndex();
    const ease        = ts.progress * ts.progress * (3 - 2 * ts.progress);
    const baseY       = H - 40;
    const tabW        = 80;
    const tabH        = 110;
    const gap         = 10;
    const total       = items.length;

    // Calculate how many tablets fit per row
    const maxRowWidth = W - 40; // Leave margin on sides
    const tabsPerRow = Math.max(1, Math.floor(maxRowWidth / (tabW + gap)));
    const rows = Math.ceil(total / tabsPerRow);
    const riseAmt = 260 + (rows - 1) * (tabH + gap); // Adjust rise for multiple rows

    items.forEach((item, i) => {
        const row = Math.floor(i / tabsPerRow);
        const col = i % tabsPerRow;
        const tabsInRow = Math.min(tabsPerRow, total - row * tabsPerRow);
        const rowStartX = W / 2 - (tabsInRow * (tabW + gap)) / 2 + tabW / 2;
        const tx = rowStartX + col * (tabW + gap);
        const ty = baseY - tabH / 2 - riseAmt * ease + row * (tabH + gap);
        const canAffordItem = canAfford(item.cost);
        const isSelected   = selectedIdx === i;

        ctx.save();
        ctx.globalAlpha = canAffordItem ? 1.0 : 0.55;

        // Deck stacking: shadow cards proportional to upgrade chain length
        const shadowCount = Math.min(Math.max(0, getChainDepth(item.key) - 1), 4);
        for (let s = shadowCount; s >= 1; s--) {
            const off = s * 3;
            ctx.fillStyle = s === shadowCount ? '#5a4a30' : '#6a5a40';
            ctx.strokeStyle = '#3a2a10';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(tx - tabW / 2 + off, ty - tabH / 2 + off, tabW, tabH, 4);
            } else {
                ctx.rect(tx - tabW / 2 + off, ty - tabH / 2 + off, tabW, tabH);
            }
            ctx.fill();
            ctx.stroke();
        }

        // Selection glow
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(tx, ty, tabW * 0.65, 0, Math.PI * 2);
            ctx.fillStyle = canAffordItem ? 'rgba(255,220,60,0.3)' : 'rgba(200,60,60,0.3)';
            ctx.fill();
        }

        // Tablet body
        ctx.fillStyle   = '#8a7a60';
        ctx.strokeStyle = isSelected ? (canAffordItem ? '#ffe040' : '#ff4040') : '#4a3a20';
        ctx.lineWidth   = isSelected ? 3 : 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(tx - tabW / 2, ty - tabH / 2, tabW, tabH, 4);
        } else {
            ctx.rect(tx - tabW / 2, ty - tabH / 2, tabW, tabH);
        }
        ctx.fill();
        ctx.stroke();

        // Category colour strip at top
        let catColor = PAL.leaf;
        if (item.cat === 'wall')        catColor = PAL.stone;
        else if (item.cat === 'weapon') catColor = PAL.swordBlade;
        else if (item.cat === 'head')   catColor = '#c0a0ff';
        ctx.fillStyle = catColor;
        ctx.fillRect(tx - tabW / 2 + 4, ty - tabH / 2 + 4, tabW - 8, 5);

        // Item name (moved up closer to category bar)
        ctx.globalAlpha  = 1.0;
        ctx.font         = 'bold 11px serif';
        ctx.fillStyle    = canAffordItem ? '#f0e0a0' : '#806040';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.name ?? ('Item ' + i), tx, ty - 28);

        // Description (moved up, wrapped to fit tablet width)
        ctx.fillStyle = '#ffffff';
        const descLines = wrapText(item.desc ?? '', tabW - 12, 9, false);
        for (let li = 0; li < descLines.length; li++) {
            ctx.fillText(descLines[li], tx, ty - 12 + li * 10);
        }

        // Cost: icon + number for each resource
        {
            const iconFuncs = { wood: drawWoodIcon, stone: drawStoneIcon, food: drawFoodIcon, coins: drawCoinIcon };
            const costEntries = typeof item.cost === 'object' ? Object.entries(item.cost) : [];
            const iconSize = 12;
            let costY = ty - 12 + descLines.length * 10 + 8;
            for (const [res, amt] of costEntries) {
                const have = resources[res] ?? 0;
                const canAffordRes = have >= amt;
                const iconFunc = iconFuncs[res];
                if (iconFunc) {
                    iconFunc(tx - 20, costY, iconSize);
                }
                ctx.font = 'bold 11px serif';
                ctx.fillStyle = canAffordRes ? '#f0f0f0' : '#ff6060';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(amt, tx - 5, costY + iconSize / 2);
                costY += iconSize + 4;
            }
        }

        // Selection prompt (properly centered)
        if (isSelected) {
            ctx.font      = 'bold 10px serif';
            ctx.fillStyle = canAffordItem ? '#ffe040' : '#ff6060';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(canAffordItem ? 'TAP TO BUY' : 'CANT AFFORD', tx, ty + tabH / 2 - 10);
        }

        ctx.restore();

        // Register hit region for this tablet
        registerHitRegion(tx - tabW / 2, ty - tabH / 2, tabW, tabH, () => {
            if (selectedIdx === i) {
                buyUpgrade(item.key, W, H);
            } else {
                setShopSelectedIndex(i);
            }
        }, 10); // High zIndex for shop UI
    });

    // Close button below tablets (offset to avoid accidental taps)
    const closeBtnH = 50;
    const closeBtnW = 160;
    const closeBtnX = W / 2 - closeBtnW / 2;
    const closeBtnY = H - closeBtnH - 80; // Moved up to avoid bottom tap area
    ctx.fillStyle = '#882222';
    ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    ctx.strokeStyle = '#cc4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    drawText('CLOSE SHOP', W / 2, closeBtnY + closeBtnH / 2 - 10, 18, '#ffcccc', 'center', false);

    // Register hit region for close button
    registerHitRegion(closeBtnX, closeBtnY, closeBtnW, closeBtnH, () => {
        closeShopTablets();
    }, 10);
}

// --- Shop buy flash overlay ---
function drawShopBuyFlash(W, H) {
    const flash = getShopBuyFlash();
    if (flash <= 0) return;
    const t = flash / CONFIG.SHOP_BUY_FLASH_DURATION;
    ctx.fillStyle = `rgba(255,255,200,${t * 0.4})`;
    ctx.fillRect(0, 0, W, H);
}

// --- Active upgrade icon pop animation ---
function drawActiveUpgradeIconPop(gameTime, W, H) {
    const pop = getShopIconPop();
    if (pop <= 0) return;
    const key = getShopIconPopKey();
    if (!key) return;
    const owned = Object.keys(getOwnedUpgrades());
    const idx = owned.indexOf(key);
    if (idx < 0) return;

    const iconS = 14;
    // Match active upgrades Y position (computed same as in drawHUD)
    const btnH = W < 600 ? Math.max(100, CONFIG.BUTTON_H) : CONFIG.BUTTON_H;
    const btnBottom = H - CONFIG.BUTTON_Y_OFFSET;
    const hudBottom = btnBottom - btnH - 10;
    const hudTop = hudBottom - 90;
    // Compute HUD chord
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const planetCenterY = groundY + R;
    const dy = planetCenterY - hudTop;
    const chordHalf = dy > 0 && dy < R ? Math.sqrt(R * R - dy * dy) : W / 2;
    const hudW = Math.min(W, Math.floor(chordHalf * 2) - 20);
    const hudLeft = Math.floor((W - hudW) / 2);
    const startX = hudLeft + 10;
    const resY = hudTop + 6;
    const barY = resY + 20 + 6;
    const y = barY + 16 + 4;
    const ix = startX + idx * (iconS + 4);

    const t = pop / CONFIG.SHOP_ICON_POP_DURATION;
    const scale = 1 + t * 1.5; // starts big, shrinks to normal
    const upg = CONFIG.UPGRADES[key];
    if (!upg) return;

    let color;
    if (upg.cat === 'wall') color = PAL.stone;
    else if (upg.cat === 'weapon') color = PAL.swordBlade;
    else color = PAL.leaf;

    ctx.save();
    ctx.translate(ix + iconS / 2, y + iconS / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.min(1, t * 2);
    // Glow ring
    ctx.strokeStyle = '#ffe040';
    ctx.lineWidth = 2;
    ctx.strokeRect(-iconS / 2 - 3, -iconS / 2 - 3, iconS + 6, iconS + 6);
    ctx.fillStyle = color;
    ctx.fillRect(-iconS / 2, -iconS / 2, iconS, iconS);
    ctx.fillStyle = PAL.outline;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(upg.name[0], 0, 0);
    ctx.restore();
}

// --- Horde warning (dramatic) ---
function drawHordeWarning(W, H, gameTime) {
    if (isShopOpen()) return;
    const warningActive = getHordeWarning();
    const hordeActive = getHordeActive();
    const celebrationTimer = getHordeCelebrationTimer();

    // Kill streak display during combat
    const streakDisplay = getKillStreakDisplay();
    if (streakDisplay > 0) {
        const streakPeak = getKillStreakPeak();
        const alpha = Math.min(1, streakDisplay / 0.5);
        const scale = 1 + (1 - streakDisplay / CONFIG.KILL_STREAK_DISPLAY_DURATION) * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(W * 0.75, H * 0.35);
        ctx.scale(scale, scale);
        drawText('x' + streakPeak + '!', 0, 0, 24, '#ffe040', 'center');
        ctx.restore();
    }

    // Horde celebration banner
    if (celebrationTimer > 0) {
        const t = celebrationTimer / CONFIG.HORDE_CELEBRATION_DURATION;
        const alpha = t > 0.7 ? 1 : t / 0.7;
        const scale = 1 + (1 - t) * 0.05;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(W / 2, H * 0.2);
        ctx.scale(scale, scale);
        // Banner background
        ctx.fillStyle = 'rgba(40,30,0,0.6)';
        ctx.fillRect(-120, -18, 240, 36);
        ctx.strokeStyle = '#ffe040';
        ctx.lineWidth = 2;
        ctx.strokeRect(-120, -18, 240, 36);
        drawText('HORDE SURVIVED!', 0, 0, 22, '#ffe040', 'center');
        ctx.restore();
    }

    if (!warningActive) return;

    const warningTimer = getHordeWarningTimer();
    const progress = 1 - warningTimer / CONFIG.HORDE_WARNING_DURATION;
    const pulse = Math.sin(gameTime * 12) * 0.5 + 0.5;

    // Red vignette edges - intensifying as warning progresses
    const edgeW = 30 + progress * 30;
    const vigAlpha = (0.2 + progress * 0.4) * (0.6 + pulse * 0.4);
    const grad1 = ctx.createLinearGradient(0, 0, edgeW * 2, 0);
    grad1.addColorStop(0, `rgba(200,0,0,${vigAlpha})`);
    grad1.addColorStop(1, 'rgba(200,0,0,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, edgeW * 2, H);
    const grad2 = ctx.createLinearGradient(W, 0, W - edgeW * 2, 0);
    grad2.addColorStop(0, `rgba(200,0,0,${vigAlpha})`);
    grad2.addColorStop(1, 'rgba(200,0,0,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(W - edgeW * 2, 0, edgeW * 2, H);
    // Top and bottom
    ctx.fillStyle = `rgba(200,0,0,${vigAlpha * 0.5})`;
    ctx.fillRect(0, 0, W, edgeW);
    ctx.fillRect(0, H - edgeW, W, edgeW);

    // "INCOMING!" text slams onto screen (scales down from large to final size)
    const textScale = progress < 0.3 ? 2.0 - (progress / 0.3) : 1.0 + pulse * 0.08;
    ctx.save();
    ctx.translate(W / 2, H * 0.3);
    ctx.scale(textScale, textScale);
    drawText('INCOMING!', 0, 0, 32, '#ff2020', 'center');
    ctx.restore();

    // War drums text with trembling
    const tremble = Math.sin(gameTime * 20) * 3 * progress;
    drawText('*war drums*', W / 2, H * 0.38 + tremble, 14, '#cc6040', 'center');

    // Enemy silhouettes massing at right edge during warning
    const silCount = Math.floor(progress * 8);
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const silR = CONFIG.ARC_VISUAL_RADIUS;
    const silCy = groundY + silR;
    for (let i = 0; i < silCount; i++) {
        const ex = W - 15 - i * 8 + Math.sin(gameTime * 4 + i) * 3;
        const silRel = (ex - W / 2) / silR;
        ctx.save();
        ctx.translate(W / 2 + silR * Math.sin(silRel), silCy - silR * Math.cos(silRel));
        ctx.rotate(silRel);
        ctx.fillStyle = `rgba(80,0,0,${0.3 + progress * 0.4})`;
        ctx.fillRect(-7, -CONFIG.ENEMY_H + 14, 14, 18);
        ctx.beginPath();
        ctx.arc(0, -CONFIG.ENEMY_H + 8, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- War hammer effect (THE MONEY SHOT) ---
function drawHammerEffect(W, H, gameTime) {
    if (!getHammerActive()) return;

    const hammerAnimTimer = getHammerAnimTimer();
    const totalDur = CONFIG.HAMMER_ANIM_DURATION;
    const t = 1 - (hammerAnimTimer / totalDur);
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const hx = W / 2;

    // Phase boundaries
    const windupEnd = CONFIG.HAMMER_WINDUP_PHASE;         // 0.30
    const impactEnd = windupEnd + CONFIG.HAMMER_IMPACT_PHASE; // 0.45
    const shockEnd = impactEnd + CONFIG.HAMMER_SHOCKWAVE_PHASE; // 0.70

    if (t < windupEnd) {
        // PHASE 1: Wind-up - screen darkens, comically large hammer descends
        const p = t / windupEnd;

        // Screen darken
        ctx.fillStyle = `rgba(0,0,0,${p * 0.6})`;
        ctx.fillRect(0, 0, W, H);

        // Comically large hammer (1/3 to 1/2 screen height)
        const hammerH = H * 0.45;
        const hammerW = hammerH * 0.5;
        const headH = hammerH * 0.35;
        const headW = hammerW * 1.2;

        // Hammer descends from above with a slight wind-up wobble
        const wobble = Math.sin(p * Math.PI * 4) * (1 - p) * 8;
        const hy = lerp(-hammerH, groundY - hammerH * 0.3, p * p); // accelerating drop

        ctx.save();
        ctx.translate(hx + wobble, hy);

        // Handle
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(-5, headH, 10, hammerH - headH + 4);
        ctx.fillStyle = '#8a5830';
        ctx.fillRect(-3, headH + 2, 6, hammerH - headH);
        // Grip wrapping
        ctx.fillStyle = '#604020';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-4, headH + 10 + i * 20, 8, 4);
        }

        // Hammer head (massive)
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(-headW / 2 - 3, -3, headW + 6, headH + 6);
        ctx.fillStyle = '#606878';
        ctx.fillRect(-headW / 2, 0, headW, headH);
        // Metallic highlights
        ctx.fillStyle = '#8890a0';
        ctx.fillRect(-headW / 2 + 4, 4, headW - 8, 6);
        ctx.fillStyle = '#a0a8b8';
        ctx.fillRect(-headW / 2 + 6, 6, headW * 0.4, 3);
        // Edge detail
        ctx.fillStyle = PAL.ironDark;
        ctx.fillRect(-headW / 2, headH - 6, headW, 6);

        ctx.restore();

    } else if (t < impactEnd) {
        // PHASE 2: IMPACT - white screen flash, everything shakes
        const p = (t - windupEnd) / CONFIG.HAMMER_IMPACT_PHASE;

        // White flash (bright at start, fading)
        const flashAlpha = (1 - p) * 0.9;
        ctx.fillStyle = `rgba(255,255,240,${flashAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Impact lines radiating from center
        if (p < 0.6) {
            const lineAlpha = (1 - p / 0.6) * 0.8;
            ctx.strokeStyle = `rgba(255,255,200,${lineAlpha})`;
            ctx.lineWidth = 4;
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const innerR = 20 + p * 60;
                const outerR = 60 + p * 200;
                ctx.beginPath();
                ctx.moveTo(hx + Math.cos(angle) * innerR, groundY - 20 + Math.sin(angle) * innerR * 0.4);
                ctx.lineTo(hx + Math.cos(angle) * outerR, groundY - 20 + Math.sin(angle) * outerR * 0.4);
                ctx.stroke();
            }
        }

        // Impact crater on ground (appears immediately)
        const craterW = 80 + p * 40;
        ctx.fillStyle = `rgba(60,40,20,${0.8 * (1 - p * 0.3)})`;
        ctx.beginPath();
        ctx.ellipse(hx, groundY, craterW / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(40,25,10,${0.6})`;
        ctx.beginPath();
        ctx.ellipse(hx, groundY, craterW / 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();

    } else if (t < shockEnd) {
        // PHASE 3: Shockwave expansion - circular wave on ground
        const p = (t - impactEnd) / CONFIG.HAMMER_SHOCKWAVE_PHASE;
        const maxRadius = W * 0.9;
        const radius = p * maxRadius;
        const fadeAlpha = (1 - p);

        // Outer shockwave ring
        ctx.strokeStyle = `rgba(255,200,40,${fadeAlpha * 0.8})`;
        ctx.lineWidth = 8 * fadeAlpha;
        ctx.beginPath();
        ctx.ellipse(hx, groundY - 10, radius, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner shockwave
        ctx.strokeStyle = `rgba(255,128,32,${fadeAlpha * 0.6})`;
        ctx.lineWidth = 5 * fadeAlpha;
        ctx.beginPath();
        ctx.ellipse(hx, groundY - 10, radius * 0.65, radius * 0.65 * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Ground crack lines
        ctx.strokeStyle = `rgba(80,50,20,${fadeAlpha * 0.5})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const len = radius * 0.4;
            ctx.beginPath();
            ctx.moveTo(hx, groundY);
            ctx.lineTo(hx + Math.cos(angle) * len, groundY + Math.sin(angle) * len * 0.2);
            ctx.stroke();
        }

        // Dust cloud at ground level
        ctx.globalAlpha = fadeAlpha * 0.4;
        ctx.fillStyle = '#c0a080';
        for (let i = 0; i < 10; i++) {
            const dx = (i - 5) * radius * 0.15;
            const dy = Math.sin(i * 1.3) * 10 - p * 30;
            const ds = 15 + p * 20;
            ctx.beginPath();
            ctx.arc(hx + dx, groundY + dy, ds, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Fading crater
        const craterW = 120 * (1 - p * 0.3);
        ctx.fillStyle = `rgba(60,40,20,${0.5 * fadeAlpha})`;
        ctx.beginPath();
        ctx.ellipse(hx, groundY, craterW / 2, 8, 0, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // PHASE 4: Aftermath - crater fading, dust settling
        const p = (t - shockEnd) / (1 - shockEnd);
        const fadeAlpha = 1 - p;

        // Fading crater
        const craterW = 100 * (1 - p * 0.5);
        ctx.fillStyle = `rgba(60,40,20,${0.4 * fadeAlpha})`;
        ctx.beginPath();
        ctx.ellipse(hx, groundY, craterW / 2, 6 * fadeAlpha, 0, 0, Math.PI * 2);
        ctx.fill();

        // Settling dust
        if (p < 0.5) {
            ctx.globalAlpha = (0.5 - p) * 0.3;
            ctx.fillStyle = '#c0a080';
            for (let i = 0; i < 6; i++) {
                const dx = Math.sin(i * 2.1 + gameTime) * 40;
                const dy = -20 - p * 50;
                ctx.beginPath();
                ctx.arc(hx + dx, groundY + dy, 10 + i * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }
}

// --- Floating texts ---
function drawFloatingTexts() {
    const texts = getFloatingTexts();
    for (const ft of texts) {
        const alpha = Math.min(1, ft.life / (ft.maxLife * 0.3));
        ctx.globalAlpha = alpha;
        drawText(ft.text, ft.x, ft.y, 14, ft.color, 'center');
        ctx.globalAlpha = 1;
    }
}

// --- Particles ---
function drawParticles() {
    const parts = getParticles();
    for (const p of parts) {
        if (p.type === 'vacuum_spiral') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.85 * (1 - p.progress * 0.6);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
            continue;
        }
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

// --- Animations ---
function drawAnimations(gameTime, W) {
    const anims = getAnimations();
    for (const a of anims) {
        const t = a.timer / a.duration;
        switch (a.type) {
            case 'chop': {
                const swingT = Math.min(1, t * 2);
                ctx.globalAlpha = 1 - t * 0.5;
                ctx.save();
                ctx.translate(a.x + 15, a.y - 10);
                const swingAngle = -Math.PI * 0.7 + swingT * Math.PI * 0.9;
                ctx.rotate(swingAngle);
                // Upgraded axe glow
                if (a.upgraded) {
                    ctx.shadowColor = '#ffe040';
                    ctx.shadowBlur = 12;
                }
                ctx.fillStyle = PAL.wood;
                ctx.fillRect(-2, -28, 4, 28);
                ctx.fillStyle = a.upgraded ? '#d0a040' : PAL.stone; // golden blade when upgraded
                ctx.fillRect(-8, -32, 14, 8);
                ctx.fillStyle = a.upgraded ? '#ffe880' : PAL.stoneLight;
                ctx.fillRect(-6, -30, 10, 4);
                ctx.shadowBlur = 0;
                ctx.restore();
                if (swingT < 0.8) {
                    ctx.save();
                    ctx.translate(a.x + 15, a.y - 10);
                    ctx.strokeStyle = `rgba(200,200,200,${0.4 * (1 - swingT)})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, 30, -Math.PI * 0.7, swingAngle);
                    ctx.stroke();
                    ctx.restore();
                }
                if (t > 0.3) {
                    const fallT = (t - 0.3) / 0.7;
                    ctx.save();
                    ctx.globalAlpha = 1 - fallT;
                    ctx.translate(a.treeX + a.treeW / 2, a.treeY + a.treeH);
                    ctx.rotate(fallT * Math.PI * 0.4);
                    ctx.translate(-(a.treeX + a.treeW / 2), -(a.treeY + a.treeH));
                    drawTree({ x: a.treeX, y: a.treeY });
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'mine': {
                const strikeT = Math.min(1, t * 2.5);
                ctx.globalAlpha = 1 - t;
                ctx.save();
                ctx.translate(a.x, a.y);
                const pickAngle = Math.PI * 0.4 * (1 - strikeT);
                ctx.rotate(pickAngle);
                // Upgraded pickaxe glow
                if (a.upgraded) {
                    ctx.shadowColor = '#80c0ff';
                    ctx.shadowBlur = 10;
                }
                ctx.fillStyle = PAL.wood;
                ctx.fillRect(-2, -22, 3, 22);
                ctx.fillStyle = a.upgraded ? '#90b0d0' : PAL.stone; // blued steel when upgraded
                ctx.fillRect(-10, -24, 16, 4);
                ctx.fillStyle = a.upgraded ? '#c0e0ff' : PAL.stoneLight;
                ctx.fillRect(-8, -22, 12, 2);
                ctx.shadowBlur = 0;
                ctx.restore();
                ctx.globalAlpha = 1;
                break;
            }
            case 'spark': {
                ctx.globalAlpha = 1 - t;
                const sparkR = 8 + t * 20;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + t * 2;
                    const sx = a.x + Math.cos(angle) * sparkR;
                    const sy = a.y + Math.sin(angle) * sparkR;
                    ctx.fillStyle = '#ffe080';
                    ctx.fillRect(sx - 2, sy - 2, 4, 4);
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'harvest': {
                ctx.globalAlpha = 1 - t;
                const reachT = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
                ctx.fillStyle = PAL.skin;
                ctx.fillRect(a.x - 6 + reachT * 4, a.y - 6 + (1 - reachT) * 8, 12, 8);
                ctx.fillRect(a.x - 4 + reachT * 4, a.y - 8 + (1 - reachT) * 8, 3, 4);
                ctx.fillRect(a.x + 1 + reachT * 4, a.y - 8 + (1 - reachT) * 8, 3, 4);
                ctx.fillRect(a.x + 6 + reachT * 4, a.y - 8 + (1 - reachT) * 8, 3, 4);
                ctx.globalAlpha = 1;
                break;
            }
            case 'tax': {
                ctx.globalAlpha = 1;
                const arcT = t;
                // Apply velocity offsets for varied trajectories
                const vx = a.vx || 0;
                const vy = a.vy || 0;
                const offsetX = vx * arcT * (1 - arcT) * 2; // parabolic offset
                const offsetY = vy * arcT * (1 - arcT) * 2;
                const arcHeight = a.arcHeight || 40;
                const coinX = lerp(a.x, HEAD_X, arcT) + offsetX;
                const coinY = lerp(a.y, HEAD_Y, arcT) - Math.sin(arcT * Math.PI) * arcHeight + offsetY;
                const coinSize = lerp(6, 3, arcT);
                const coinAlpha = arcT > 0.7 ? 1 - (arcT - 0.7) / 0.3 : 1;
                ctx.globalAlpha = coinAlpha;
                ctx.fillStyle = PAL.coinDark;
                ctx.beginPath();
                ctx.arc(coinX, coinY, coinSize + 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = PAL.coinGold;
                ctx.beginPath();
                ctx.arc(coinX, coinY, coinSize, 0, Math.PI * 2);
                ctx.fill();
                if (t > 0.1 && t < 0.5) {
                    ctx.globalAlpha = 0.5 * (1 - t * 2);
                    ctx.fillStyle = PAL.coinGold;
                    ctx.fillRect(coinX - 1 + randRange(-3, 3), coinY + randRange(-3, 3), 2, 2);
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'slash': {
                ctx.globalAlpha = 1 - t * 0.7;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - t)})`;
                ctx.lineWidth = 5 * (1 - t);
                ctx.beginPath();
                ctx.arc(0, 0, 22 + t * 12, -Math.PI * 0.9, -Math.PI * 0.9 + t * Math.PI * 1.5);
                ctx.stroke();
                ctx.strokeStyle = `rgba(255,255,200,${0.6 * (1 - t)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 20 + t * 10, -Math.PI * 0.8, -Math.PI * 0.8 + t * Math.PI * 1.3);
                ctx.stroke();
                ctx.restore();
                ctx.globalAlpha = 1;
                break;
            }
            case 'enemyFly': {
                ctx.globalAlpha = 1 - t;
                const flyX = a.x + t * 120;
                const flyY = a.y - Math.sin(t * Math.PI) * 50;
                const spin = t * Math.PI * 3;
                ctx.save();
                ctx.translate(flyX, flyY);
                ctx.rotate(spin);
                ctx.fillStyle = a.bodyColor;
                ctx.fillRect(-8, -10, 16, 20);
                ctx.fillStyle = PAL.outline;
                ctx.beginPath();
                ctx.arc(0, -14, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.globalAlpha = 1;
                break;
            }
            case 'hammerFly': {
                // Enemy launched upward by hammer - ragdoll spin off screen
                ctx.globalAlpha = 1 - t;
                const flyX = a.x + a.vx * t * a.duration;
                const flyY = a.y + a.vy * t * a.duration + 400 * t * t; // gravity arc up then away
                const spin = t * Math.PI * 6; // fast spin
                ctx.save();
                ctx.translate(flyX, flyY);
                ctx.rotate(spin);
                ctx.fillStyle = a.bodyColor;
                ctx.fillRect(-8, -10, 16, 20);
                ctx.fillStyle = PAL.outline;
                ctx.beginPath();
                ctx.arc(0, -14, 6, 0, Math.PI * 2);
                ctx.fill();
                // Limbs flailing
                ctx.fillStyle = a.bodyColor;
                const flail = Math.sin(t * 30) * 6;
                ctx.fillRect(-12, -4 + flail, 6, 3);
                ctx.fillRect(6, -4 - flail, 6, 3);
                ctx.fillRect(-4, 10 + flail, 4, 6);
                ctx.fillRect(2, 10 - flail, 4, 6);
                ctx.restore();
                ctx.globalAlpha = 1;
                break;
            }
            case 'cleaveArc': {
                // Extended slash arc past the first enemy for cleave
                ctx.globalAlpha = (1 - t) * 0.8;
                ctx.save();
                ctx.translate(a.x, a.y);
                // Wide sweeping arc extending right
                const arcExtent = t * CONFIG.CLEAVE_RANGE * 1.2;
                ctx.strokeStyle = `rgba(255,160,60,${0.9 * (1 - t)})`;
                ctx.lineWidth = 6 * (1 - t);
                ctx.beginPath();
                ctx.arc(0, 0, 25 + arcExtent * 0.3, -Math.PI * 0.6, -Math.PI * 0.6 + t * Math.PI * 1.2);
                ctx.stroke();
                // Second wider arc
                ctx.strokeStyle = `rgba(255,200,100,${0.5 * (1 - t)})`;
                ctx.lineWidth = 3 * (1 - t);
                ctx.beginPath();
                ctx.arc(arcExtent * 0.5, 0, 20 + arcExtent * 0.4, -Math.PI * 0.5, -Math.PI * 0.5 + t * Math.PI);
                ctx.stroke();
                // Slash trail particles
                if (t < 0.5) {
                    ctx.fillStyle = `rgba(255,200,100,${0.6 * (1 - t * 2)})`;
                    for (let i = 0; i < 4; i++) {
                        const px = arcExtent * (i / 4);
                        const py = Math.sin(i + t * 8) * 8;
                        ctx.fillRect(px - 2, py - 2, 4, 4);
                    }
                }
                ctx.restore();
                ctx.globalAlpha = 1;
                break;
            }
            case 'resourceArc': {
                // Whoosh arc from action point up to HUD area
                const arcT = t;
                const targetX = 30; // HUD top-left area
                const targetY = 10;
                const arcX = lerp(a.x, targetX, arcT);
                const arcY = lerp(a.y, targetY, arcT) - Math.sin(arcT * Math.PI) * 80;
                const arcSize = lerp(10, 4, arcT);
                ctx.globalAlpha = arcT < 0.8 ? 1 : 1 - (arcT - 0.8) / 0.2;
                ctx.save();
                ctx.translate(arcX, arcY);
                const arcScale = 1 + Math.sin(arcT * Math.PI) * 0.3;
                ctx.scale(arcScale, arcScale);
                if (a.icon === 'wood') { drawWoodIcon(-arcSize / 2, -arcSize / 2, arcSize); }
                else if (a.icon === 'stone') { drawStoneIcon(-arcSize / 2, -arcSize / 2, arcSize); }
                else if (a.icon === 'food') { drawFoodIcon(-arcSize / 2, -arcSize / 2, arcSize); }
                ctx.restore();
                // Trail sparkle
                if (arcT > 0.1 && arcT < 0.9) {
                    ctx.fillStyle = a.color || '#ffffff';
                    ctx.globalAlpha = 0.4 * (1 - arcT);
                    ctx.fillRect(arcX - 1 + randRange(-4, 4), arcY + randRange(-4, 4), 3, 3);
                    ctx.fillRect(arcX - 1 + randRange(-6, 6), arcY + randRange(-6, 6), 2, 2);
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'coinDrop': {
                // Gold coin flies to head mouth with two-phase movement
                const coinT = a.timer;
                const progress = coinT / a.duration;

                // Initialize position tracking on first frame
                if (!a.currentX) {
                    a.currentX = a.x;
                    a.currentY = a.y;
                    a.currentVX = a.vx || 0;
                    a.currentVY = a.vy || 0;
                }

                // Two-phase movement: ballistic burst, then suction to mouth
                if (progress < 0.3) {
                    // Ballistic phase with gravity
                    const dt = 1/60; // approximate frame time
                    a.currentX += a.currentVX * dt;
                    a.currentY += a.currentVY * dt;
                    a.currentVY += 180 * dt; // gravity
                } else {
                    // Suction phase - accelerate toward head mouth
                    const suctionT = (progress - 0.3) / 0.7;
                    const suctionEase = suctionT * suctionT;
                    const dx = HEAD_X - a.currentX;
                    const dy = HEAD_Y - a.currentY;
                    const dt = 1/60;
                    const pullStrength = 400 * suctionEase;
                    a.currentVX = dx * pullStrength * dt;
                    a.currentVY = dy * pullStrength * dt;
                    a.currentX += a.currentVX * dt;
                    a.currentY += a.currentVY * dt;
                }

                const coinX = a.currentX;
                const coinY = a.currentY;
                const spin = coinT * 8; // spinning coin
                const coinAlpha = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1;
                ctx.globalAlpha = coinAlpha;
                ctx.save();
                ctx.translate(coinX, coinY);
                // Coin: squash horizontally for spin effect
                const scaleX = Math.abs(Math.cos(spin));
                ctx.scale(Math.max(0.2, scaleX), 1);
                // Gold circle
                ctx.fillStyle = PAL.outline;
                ctx.beginPath();
                ctx.arc(0, 0, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = PAL.coinGold;
                ctx.beginPath();
                ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
                ctx.fill();
                // $ mark
                if (scaleX > 0.4) {
                    ctx.fillStyle = PAL.coinDark;
                    ctx.font = 'bold 8px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('$', 0, 0.5);
                }
                ctx.restore();
                // Sparkle trail
                if (t < 0.5) {
                    ctx.fillStyle = '#ffe860';
                    ctx.fillRect(coinX + randRange(-3, 3), coinY + randRange(-3, 3), 2, 2);
                }
                ctx.globalAlpha = 1;
                break;
            }
            case 'deflect': {
                ctx.globalAlpha = 1 - t;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.fillStyle = `rgba(200,200,255,${0.6 * (1 - t)})`;
                ctx.beginPath();
                ctx.arc(0, 0, 15 + t * 25, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.globalAlpha = 1;
                break;
            }
            case 'feastCheer': {
                // Background villager silhouettes cheering
                ctx.globalAlpha = (1 - t) * 0.5;
                const cheerW = W * 0.6;
                const cheerY = a.y;
                for (let i = 0; i < 6; i++) {
                    const vx = a.x - cheerW / 2 + i * (cheerW / 5);
                    const bounce = Math.abs(Math.sin(t * 8 + i * 1.2)) * 8;
                    // Body
                    ctx.fillStyle = '#445566';
                    ctx.fillRect(vx - 5, cheerY - bounce, 10, 16);
                    // Head
                    ctx.beginPath();
                    ctx.arc(vx, cheerY - 10 - bounce, 6, 0, Math.PI * 2);
                    ctx.fill();
                    // Waving arms
                    const armAngle = Math.sin(t * 10 + i) * 0.6;
                    ctx.save();
                    ctx.translate(vx, cheerY - 4 - bounce);
                    ctx.rotate(armAngle - 0.8);
                    ctx.fillRect(0, -2, 10, 3);
                    ctx.restore();
                    ctx.save();
                    ctx.translate(vx, cheerY - 4 - bounce);
                    ctx.rotate(-armAngle + 0.8);
                    ctx.fillRect(-10, -2, 10, 3);
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
                break;
            }
        }
    }
}

// --- Title screen ---
function drawTitle(W, H, titlePulse, gameTime) {
    drawSky(W, H, 0);
    drawClouds(W, H);
    drawHills(getHillsFar(), PAL.hillFar, CONFIG.HILLS_FAR_PARALLAX_TITLE, W, H);
    drawHills(getHillsMid(), PAL.hillMid, CONFIG.HILLS_MID_PARALLAX_TITLE, W, H);
    drawGround(W, H);

    // Evil wizard's castle
    //wizardState.yOffset = 8; // Test: make wizard duck
    //wizardState.ducking = true;
    //drawEnemyCastle(W, H, Date.now() / 1000.0, 0);

    drawCastle(W, H, Date.now() / 1000.0);

    drawCrowd(W, H, Date.now() / 1000.0);

    // tint overlay
    ctx.fillStyle = 'rgba(0,0,20,0.15)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H * 0.35;
    // ctx.fillStyle = '#1a1a2e';
    // ctx.fillRect(cx - 30, cy - 80, 60, 120);
    // ctx.fillRect(cx - 45, cy - 40, 90, 80);
    // ctx.fillRect(cx - 70, cy - 50, 30, 90);
    // ctx.fillRect(cx + 40, cy - 50, 30, 90);
    // for (let i = 0; i < 5; i++) {
    //     ctx.fillRect(cx - 50 + i * 25, cy - 55, 10, 12);
    // }
    // ctx.fillStyle = '#cc3030';
    // ctx.fillRect(cx - 5, cy - 110, 2, 35);
    // const flagWave = Math.sin(titlePulse * 3) * 3;
    // ctx.beginPath();
    // ctx.moveTo(cx - 3, cy - 110);
    // ctx.lineTo(cx + 18, cy - 105 + flagWave);
    // ctx.lineTo(cx - 3, cy - 95);
    // ctx.closePath();
    // ctx.fill();

    var pulse = 1 + Math.sin(titlePulse * 2) * 0.1;
    ctx.save();
    ctx.translate(cx, H * 0.55);
    ctx.scale(pulse, pulse);
    drawText('ONE BUTTON', 0, -30, 50, PAL.coinGold, 'center');
    pulse = 1 + Math.sin(titlePulse * 2 + .1) * 0.1;
    ctx.scale(pulse, pulse);
    drawText('KINGDOM', 0, 15, 56, PAL.uiText, 'center');
    ctx.restore();

    const tapAlpha = 0.5 + Math.sin(titlePulse * 3) * 0.5;
    ctx.globalAlpha = tapAlpha;
    drawText('TAP TO RULE', cx, H * 0.75, 32, PAL.buttonFace, 'center');
    ctx.globalAlpha = 1;

    drawText('Tap / Spacebar', cx, H * 0.80, 14, '#aaaaaa', 'center');

    // Session gap expression
    ctx.textAlign     = 'center';
    ctx.font          = 'italic 12px serif';
    ctx.fillStyle     = '#9a8a50';
    ctx.fillText("The story so far...", W / 2, HEAD_Y + HEAD_RADIUS - 5);

    const annalsData  = loadAnnals();
    const titleExpr   = getTitleExpression(annalsData.lastPlayed);
    ctx.fillStyle     = '#f0e0a0';
    ctx.font          = 'bold 22px serif';
    ctx.fillText(titleExpr.text, W / 2, HEAD_Y + HEAD_RADIUS + 20);

    // Daily modifier
    const mod     = getDailyModifier();
    ctx.font      = 'italic 13px serif';
    ctx.fillStyle = '#9a8a50';
    ctx.fillText('Almanac: ' + mod.name, W / 2, HEAD_Y + HEAD_RADIUS + 50);

    // Prestige display - always show to inform players
    const prestigeTier = getPrestigeTier();
    const prestigeY = H - 70;
    const prestigeGlow = 0.5 + Math.sin(titlePulse * 4) * 0.5;

    if (prestigeTier > 0) {
        // Unlocked prestige - full decorative display
        ctx.fillStyle = 'rgba(40, 20, 10, 0.6)';
        ctx.fillRect(W / 2 - 160, prestigeY - 25, 320, 42);
        ctx.strokeStyle = '#d08020';
        ctx.lineWidth = 2;
        ctx.strokeRect(W / 2 - 160, prestigeY - 25, 320, 42);

        ctx.strokeStyle = `rgba(255, 200, 100, ${prestigeGlow * 0.4})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(W / 2 - 158, prestigeY - 23, 316, 38);

        const starY = prestigeY - 4;
        for (let i = 0; i < 3; i++) {
            const starX = W / 2 - 130 + i * 10;
            const starSize = 3 + Math.sin(titlePulse * 5 + i) * 1;
            ctx.fillStyle = '#ffcc40';
            drawStar(starX, starY, starSize);
        }
        for (let i = 0; i < 3; i++) {
            const starX = W / 2 + 110 + i * 10;
            const starSize = 3 + Math.sin(titlePulse * 5 + i + Math.PI) * 1;
            ctx.fillStyle = '#ffcc40';
            drawStar(starX, starY, starSize);
        }

        ctx.save();
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 15 * prestigeGlow;
        ctx.font = 'bold 18px serif';
        ctx.fillStyle = '#ffaa20';
        ctx.fillText('PRESTIGE MODE', W / 2, prestigeY - 10);
        ctx.restore();

        ctx.font = 'italic 12px serif';
        ctx.fillStyle = '#d0b070';
        ctx.fillText('Begin anew with greater challenges', W / 2, prestigeY + 6);
    } else {
        // Locked prestige - subtle teaser
        ctx.fillStyle = 'rgba(20, 20, 25, 0.5)';
        ctx.fillRect(W / 2 - 140, prestigeY - 22, 280, 36);
        ctx.strokeStyle = '#505050';
        ctx.lineWidth = 1;
        ctx.strokeRect(W / 2 - 140, prestigeY - 22, 280, 36);

        ctx.font = 'bold 16px serif';
        ctx.fillStyle = '#a0a0a0';
        ctx.fillText('PRESTIGE MODE', W / 2, prestigeY - 14);

        ctx.font = 'italic 11px serif';
        ctx.fillStyle = '#909090';
        ctx.fillText('Win a run to unlock greater challenges', W / 2, prestigeY + 2);
    }
}

// --- Game over screen ---
let gameOverStartTime = -1;

function drawGameOver(W, H, gameTime) {
    if (gameOverStartTime < 0) gameOverStartTime = gameTime;
    const elapsed = gameTime - gameOverStartTime;

    // Wall crumble phase (first 2 seconds)
    const crumbleDur = CONFIG.GAMEOVER_WALL_CRUMBLE_DURATION;
    if (elapsed < crumbleDur) {
        const t = elapsed / crumbleDur;
        // Darkening overlay
        ctx.fillStyle = `rgba(0,0,0,${t * 0.7})`;
        ctx.fillRect(0, 0, W, H);
        // Screen shake during crumble
        if (t < 0.8) {
            const shakeAmt = (1 - t) * 8;
            ctx.save();
            ctx.translate(
                (Math.random() - 0.5) * shakeAmt,
                (Math.random() - 0.5) * shakeAmt
            );
        }
        // Falling wall debris
        const groundY = H - H * CONFIG.GROUND_RATIO;
        const debrisCount = Math.floor(t * 12);
        for (let i = 0; i < debrisCount; i++) {
            const seed = i * 31.37;
            const dx = 10 + (seed % 30);
            const dy = groundY - 60 + (i * 7) + t * 80 * ((i % 3) + 1);
            const sz = 4 + (i % 5) * 2;
            const wallTier = getWallTier();
            ctx.fillStyle = wallTier >= 3 ? PAL.iron : wallTier >= 2 ? PAL.stone : wallTier >= 1 ? PAL.wood : '#aa6640';
            ctx.save();
            ctx.translate(dx, Math.min(dy, groundY - sz));
            ctx.rotate(t * (i % 2 === 0 ? 1 : -1) * 2);
            ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
            ctx.restore();
        }
        if (t < 0.8) ctx.restore();
        return;
    }

    // Stats screen
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H * 0.15;
    const loyalty = getLoyalty();
    const resources = getResources();
    const enemiesDefeated = getEnemiesDefeated();
    const statElapsed = elapsed - crumbleDur;
    const revealInterval = CONFIG.GAMEOVER_STAT_REVEAL_INTERVAL;

    const wasRebellion = loyalty < CONFIG.LOYALTY_REBELLION_THRESHOLD;
    const title = wasRebellion ? 'OVERTHROWN!' : 'KINGDOM FALLEN';
    const subtitle = wasRebellion ? 'Your people turned against you...' : 'Your wall has crumbled...';

    // Title always visible
    const titleScale = statElapsed < 0.3 ? 1.5 - (statElapsed / 0.3) * 0.5 : 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(titleScale, titleScale);
    drawText(title, 0, 0, 32, '#d03030', 'center');
    ctx.restore();
    drawText(subtitle, cx, cy + 40, 16, '#cccccc', 'center');

    // Stats reveal one by one
    const statsY = cy + 76;
    const stats = [
        { text: 'Score: ' + Math.floor(getScore()), color: PAL.coinGold, size: 22 },
        { text: 'Time Survived: ' + Math.floor(gameTime) + 's', color: PAL.uiText, size: 18 },
        { text: 'Enemies Defeated: ' + enemiesDefeated, color: '#ff6060', size: 16 },
        { text: 'Hordes Survived: ' + getHordeNumber(), color: '#ff8040', size: 16 },
        { text: 'Upgrades: ' + Object.keys(getOwnedUpgrades()).length, color: '#ffe040', size: 16 },
        { text: 'Resources: W:' + resources.wood + ' S:' + resources.stone + ' F:' + resources.food + ' C:' + resources.coins, color: '#b0b4b8', size: 14 },
    ];

    for (let i = 0; i < stats.length; i++) {
        const statTime = statElapsed - 0.5 - i * revealInterval;
        if (statTime < 0) break;
        const alpha = Math.min(1, statTime / 0.3);
        const slideX = statTime < 0.2 ? (1 - statTime / 0.2) * 30 : 0;
        ctx.save();
        ctx.globalAlpha = alpha;
        drawText(stats[i].text, cx + slideX, statsY + i * 26, stats[i].size, stats[i].color, 'center');
        ctx.restore();
    }

    // RULE AGAIN prompt (appears after all stats)
    const promptTime = statElapsed - 0.5 - stats.length * revealInterval - 0.5;
    if (promptTime > 0) {
        const tapAlpha = 0.5 + Math.sin(gameTime * 3) * 0.5;
        ctx.globalAlpha = tapAlpha;
        drawText('RULE AGAIN', cx, statsY + stats.length * 26 + 30, 22, PAL.buttonFace, 'center');
        ctx.globalAlpha = 1;
    }
}

// --- Danger vignette (low HP, low loyalty, horde active) ---
function drawDangerVignette(W, H, gameTime) {
    const wallHP = getWallHP();
    const maxWallHP = getMaxWallHP();
    const loyalty = getLoyalty();
    const hordeActive = getHordeActive();

    let vignetteAlpha = 0;
    let vignetteColor = '200,0,0';

    // Low wall HP
    if (wallHP <= CONFIG.LOW_HP_THRESHOLD) {
        const intensity = 1 - (wallHP / CONFIG.LOW_HP_THRESHOLD);
        vignetteAlpha = Math.max(vignetteAlpha, 0.15 + intensity * 0.2 + Math.sin(gameTime * 4) * 0.05);
    }

    // Low loyalty
    if (loyalty < CONFIG.LOYALTY_LOW_THRESHOLD) {
        const intensity = 1 - (loyalty / CONFIG.LOYALTY_LOW_THRESHOLD);
        const loyaltyVig = 0.1 + intensity * 0.15;
        if (loyaltyVig > vignetteAlpha) {
            vignetteAlpha = loyaltyVig;
            vignetteColor = '180,0,40';
        }
    }

    // Horde active
    if (hordeActive) {
        const hordeVig = 0.12 + Math.sin(gameTime * 3) * 0.04;
        if (hordeVig > vignetteAlpha) {
            vignetteAlpha = hordeVig;
            vignetteColor = '150,0,0';
        }
    }

    if (vignetteAlpha <= 0) return;

    // Draw 4-edge vignette
    const edgeW = 40;
    const gL = ctx.createLinearGradient(0, 0, edgeW * 2, 0);
    gL.addColorStop(0, `rgba(${vignetteColor},${vignetteAlpha})`);
    gL.addColorStop(1, `rgba(${vignetteColor},0)`);
    ctx.fillStyle = gL;
    ctx.fillRect(0, 0, edgeW * 2, H);

    const gR = ctx.createLinearGradient(W, 0, W - edgeW * 2, 0);
    gR.addColorStop(0, `rgba(${vignetteColor},${vignetteAlpha})`);
    gR.addColorStop(1, `rgba(${vignetteColor},0)`);
    ctx.fillStyle = gR;
    ctx.fillRect(W - edgeW * 2, 0, edgeW * 2, H);

    const gT = ctx.createLinearGradient(0, 0, 0, edgeW);
    gT.addColorStop(0, `rgba(${vignetteColor},${vignetteAlpha * 0.6})`);
    gT.addColorStop(1, `rgba(${vignetteColor},0)`);
    ctx.fillStyle = gT;
    ctx.fillRect(0, 0, W, edgeW);

    const gB = ctx.createLinearGradient(0, H, 0, H - edgeW);
    gB.addColorStop(0, `rgba(${vignetteColor},${vignetteAlpha * 0.6})`);
    gB.addColorStop(1, `rgba(${vignetteColor},0)`);
    ctx.fillStyle = gB;
    ctx.fillRect(0, H - edgeW, W, edgeW);
}

// --- Horde active combat indicator ---
function drawHordeActiveIndicator(W, H, gameTime) {
    if (!getHordeActive()) return;
    if (isShopOpen()) return;
    const hordeNum = getHordeNumber();

    // Pulsing red border at top
    const pulse = Math.sin(gameTime * 4) * 0.15 + 0.3;
    ctx.fillStyle = `rgba(200,0,0,${pulse})`;
    ctx.fillRect(0, 0, W, 3);

    // Horde counter text
    drawText('HORDE #' + hordeNum, W / 2, H * 0.08, 14, '#ff4040', 'center');
}

// --- Progress Ring HUD ---
function drawProgressRing(W, H, gameTime) {
    const progress = getPlayerProgress();
    const revCount = getRevolutionCount();
    // Position: bottom-right corner, above button area
    const ringR = 28;
    const ringCX = W - ringR - 14;
    const ringCY = H - CONFIG.BUTTON_Y_OFFSET - 60;

    // Background circle
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(ringCX, ringCY, ringR + 4, 0, Math.PI * 2);
    ctx.fill();

    // Track ring
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ringCX, ringCY, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Progress arc (fills clockwise from top)
    ctx.strokeStyle = PAL.coinGold;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ringCX, ringCY, ringR, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    // Base marker at top (small diamond)
    ctx.fillStyle = '#40c040';
    ctx.save();
    ctx.translate(ringCX, ringCY - ringR);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();

    // Player dot moving around the ring
    const playerAngle = -Math.PI / 2 + progress * Math.PI * 2;
    const dotX = ringCX + Math.cos(playerAngle) * ringR;
    const dotY = ringCY + Math.sin(playerAngle) * ringR;
    ctx.fillStyle = PAL.uiText;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Revolution count text
    if (revCount > 0) {
        drawText('x' + revCount, ringCX, ringCY + ringR + 8, 10, PAL.coinGold, 'center');
    }
}

// --- Spike Pit ---
function drawSpikePit(W, H, gameTime) {
    if (!hasUpgrade('spike_pit')) return;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const spikeOffset = CONFIG.SPIKE_PIT_RANGE;
    if (baseToScreenX(spikeOffset, W) === null) return;

    ctx.save();
    applyPolarTransform(spikeOffset, groundY, W);
    const ESs = CONFIG.ENTITY_SCALE || 1;
    ctx.scale(ESs, ESs);

    // Row of metal spikes
    const spikeCount = 5;
    const spikeSpacing = 8;
    const totalW = spikeCount * spikeSpacing;
    for (let i = 0; i < spikeCount; i++) {
        const sx = -totalW / 2 + i * spikeSpacing;
        // Spike shaft
        ctx.fillStyle = PAL.stoneDark;
        ctx.fillRect(sx + 1, -12, 4, 10);
        // Spike point
        ctx.fillStyle = PAL.stoneLight;
        ctx.beginPath();
        ctx.moveTo(sx, -10);
        ctx.lineTo(sx + 3, -18);
        ctx.lineTo(sx + 6, -10);
        ctx.closePath();
        ctx.fill();
    }
    // Base plate
    ctx.fillStyle = PAL.ironDark;
    ctx.fillRect(-totalW / 2 - 2, -4, totalW + 4, 6);

    ctx.restore();
}

// --- Battle Cry Aura ---
function drawBattleCryAura(W, H, gameTime) {
    if (!getBattleCryActive()) return;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const castleX = baseToScreenX(0, W);
    if (castleX === null) return;

    const R = CONFIG.ARC_VISUAL_RADIUS;
    const cy = groundY + R;
    const scrollAngle = getScrollAngle();
    const rel = normalizeAngle(0 - scrollAngle);
    const ax = W / 2 + R * Math.sin(rel);
    const ay = cy - R * Math.cos(rel);

    const pulseR = 50 + Math.sin(gameTime * 4) * 10;
    const grad = ctx.createRadialGradient(ax, ay - 40, 5, ax, ay - 40, pulseR);
    grad.addColorStop(0, 'rgba(255,224,64,0.35)');
    grad.addColorStop(0.5, 'rgba(255,180,40,0.15)');
    grad.addColorStop(1, 'rgba(255,160,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ax, ay - 40, pulseR, 0, Math.PI * 2);
    ctx.fill();
}

// =============================================================
// MAIN DRAW ENTRY POINT
// =============================================================
export function draw(W, H, state, gameTime, titlePulse, gameState, dt) {
    ctx.clearRect(0, 0, W, H);

    // Update wizard duck/peek animation
    if (dt) updateWizard(dt);

    if (state === 'title') {
        gameOverStartTime = -1;
        drawTitle(W, H, titlePulse, gameTime);
        return;
    }

    if (gameState && gameState.state === 'annals') {
        ctx.fillStyle = '#1a1008';
        ctx.fillRect(0, 0, W, H);

        // Parchment background
        ctx.fillStyle = 'rgba(180,150,90,0.15)';
        ctx.fillRect(40, 30, W - 80, H - 60);

        ctx.font        = 'bold 24px serif';
        ctx.fillStyle   = '#f0e0a0';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('KINGDOM ANNALS', W / 2, 50);

        const run = gameState.lastRun ?? {};
        ctx.font      = '14px serif';
        ctx.fillStyle = '#d0c090';
        ctx.fillText((run.win ? 'VICTORY' : 'DEFEAT') + ' -- DAY ' + (run.days ?? '?'), W / 2, 90);
        ctx.fillText('Chronicle: ' + (run.chronicle ?? 'none'), W / 2, 114);

        // Overnight entry
        const overnight = typeof getOvernightEntry === 'function' ? getOvernightEntry() : '';
        ctx.font      = 'italic 12px serif';
        ctx.fillStyle = '#a09060';
        ctx.fillText(overnight, W / 2, 142);

        // Feat unlocks this run
        const newFeats = gameState.newFeats ?? [];
        if (newFeats.length > 0) {
            ctx.font      = 'bold 13px serif';
            ctx.fillStyle = '#e0c060';
            ctx.fillText('FEATS EARNED:', W / 2, 172);
            newFeats.forEach((f, i) => {
                ctx.font      = '12px serif';
                ctx.fillStyle = '#c0a840';
                ctx.fillText(f.label + ' -- ' + f.bonus, W / 2, 196 + i * 20);
            });
        }

        ctx.font      = '12px serif';
        ctx.fillStyle = '#706040';
        ctx.fillText('PRESS ANY KEY TO RETURN', W / 2, H - 50);
        return;  // Skip all other rendering when showing annals
    }

    // Screen shake
    const screenShake = getScreenShake();
    if (screenShake > 0) {
        ctx.save();
        const sx = (Math.random() - 0.5) * screenShake * CONFIG.SHAKE_MAGNITUDE;
        const sy = (Math.random() - 0.5) * screenShake * CONFIG.SHAKE_MAGNITUDE;
        ctx.translate(sx, sy);
    }

    drawSky(W, H, gameTime);

    // Day counter -- draws 'DAY N.' at centre-top of screen, scale-pulses on new day
    {
        const dayPulseT = getDayPulse();
        const dayScale = dayPulseT > 0 ? 1 + 0.5 * Math.sin(dayPulseT * Math.PI * 4) * (dayPulseT / 1.5) : 1;
        ctx.save();
        ctx.translate(W / 2, 12 + 16);
        ctx.scale(dayScale, dayScale);
        ctx.font = 'bold 32px serif';
        ctx.fillStyle = 'rgba(255, 245, 200, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DAY ' + getCurrentDay() + '.', 0, 0);
        ctx.restore();
    }

    drawClouds(W, H);
    drawHills(getHillsFar(), PAL.hillFar, CONFIG.HILLS_FAR_PARALLAX_PLAY, W, H);
    drawHills(getHillsMid(), PAL.hillMid, CONFIG.HILLS_MID_PARALLAX_PLAY, W, H);
    drawBackgroundEvolution(W, H, gameTime);
    drawGround(W, H);
    drawRain(W, H);
    drawMoat(W, H, gameTime);
    drawSpikePit(W, H, gameTime);
    drawEnemyCastle(W, H, gameTime);
    // Head behind king during shop animation
    const _headSt = head.getState();
    if (_headSt.isDescending || _headSt.isAscending || _headSt.shopDescended) {
        head.draw(ctx);
    }
    drawCastle(W, H, gameTime);
    drawFarmBackground(W, H, gameTime);
    drawBakeryBackground(W, H, gameTime);
    drawBattleCryAura(W, H, gameTime);

    const worldObjects = getWorldObjects();
    const sorted = [...worldObjects].sort((a, b) => a.y - b.y);
    for (const obj of sorted) {
        if (!obj.acted) {
            drawWorldObject(obj, gameTime, W, H);
        }
    }

    drawBoulders(gameTime, W, H);
    drawAnimations(gameTime, W);
    drawHammerEffect(W, H, gameTime);
    drawParticles();
    drawFloatingTexts();

    // Head floats above world when not in shop animation
    if (!_headSt.isDescending && !_headSt.isAscending && !_headSt.shopDescended) {
        head.draw(ctx);
    }

    // Rival head (Day 14+)
    if (getCurrentDay() >= 14) {
        const rival = gameState && gameState.entities && gameState.entities.find(e => e.type === 'rival_castle');
        const rivalHpFraction = rival ? rival.hp / rival.maxHp : 1;

        const rhx = W  * RIVAL_HEAD_X_FRACTION;
        const rhy = H * RIVAL_HEAD_Y_FRACTION;
        const rhr = HEAD_RADIUS * 0.7;  // slightly smaller

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-W, 0);
        // Mirror x: draw at (W - rhx)
        const mirrorX = W - rhx;

        // Face
        ctx.beginPath();
        ctx.ellipse(mirrorX, rhy, rhr * 0.85, rhr, 0, 0, Math.PI * 2);
        // Crumbling colour based on rival HP
        const crumble = 1 - rivalHpFraction;
        ctx.fillStyle = 'rgb(' + Math.round(90 + crumble * 60) + ',70,60)';
        ctx.fill();
        ctx.strokeStyle = '#5a1a0a';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Eyes (red glow)
        const eyeY2  = rhy - rhr * 0.15;
        const eyeSep = rhr * 0.38;
        for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(mirrorX + s * eyeSep, eyeY2, rhr * 0.14, 0, Math.PI * 2);
            ctx.fillStyle = '#cc1010'; ctx.fill();
        }

        // Red beam downward
        const bTop    = rhy + rhr * 0.45;
        const bBottom = H + 20;
        const halfBW  = (BEAM_WIDTH * 0.7) / 2;
        ctx.beginPath();
        ctx.rect(mirrorX - halfBW, bTop, halfBW * 2, bBottom - bTop);
        ctx.fillStyle = 'rgba(200, 30, 20, 0.3)'; ctx.fill();

        // Cracks if damaged
        if (crumble > 0.3) {
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth   = 2;
            ctx.beginPath();
            ctx.moveTo(mirrorX - rhr*0.3, rhy - rhr*0.5);
            ctx.lineTo(mirrorX + rhr*0.2, rhy + rhr*0.3);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Story beat card
    if (gameState && gameState.activeBeat) {
        const beat     = gameState.activeBeat;
        const progress = beat.elapsed / beat.duration;
        const alpha    = progress < 0.15 ? progress / 0.15 : (progress > 0.75 ? 1 - (progress - 0.75) / 0.25 : 1);
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle   = '#0a0806';
        ctx.fillRect(0, H / 2 - 36, W, 72);
        ctx.globalAlpha = alpha;
        ctx.font        = 'bold 28px serif';
        ctx.fillStyle   = '#f5e8c0';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(beat.text, W / 2, H / 2);
        ctx.restore();
    }

    if (screenShake > 0) {
        ctx.restore();
    }

    // Danger vignette (drawn over world but under HUD)
    drawDangerVignette(W, H, gameTime);

    if (state === 'playing') {
        drawHUD(W, H, gameTime);
        drawButton(W, H, gameTime);
        drawHordeWarning(W, H, gameTime);
        drawHordeActiveIndicator(W, H, gameTime);
        drawShopTablets(W, H);
        drawShopBuyFlash(W, H);
        drawActiveUpgradeIconPop(gameTime, W, H);
    }

    // Branch choice (drawn on top of everything including shop)
    if (gameState && gameState.activeBranchChoice) {
        const bc      = gameState.activeBranchChoice;
        const timeout = bc.autoTimeout;
        const elapsed = bc.elapsed;
        const progress = elapsed / timeout;

        // Darken background
        ctx.save();
        ctx.fillStyle   = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, W, H);

        // Card
        const cw = 360; const ch = 180;
        const cx2 = W / 2; const cy2 = H / 2;
        ctx.fillStyle   = '#2a1a0a';
        ctx.strokeStyle = '#8a6a30';
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.roundRect(cx2 - cw/2, cy2 - ch/2, cw, ch, 8);
        ctx.fill(); ctx.stroke();

        // Prompt text
        ctx.font        = 'bold 16px serif';
        ctx.fillStyle   = '#f0e0a0';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bc.text, cx2, cy2 - 56);

        // Options (two buttons)
        bc.options.forEach((opt, i) => {
            const bx = cx2 + (i === 0 ? -90 : 90);
            const by = cy2 + 16;
            ctx.fillStyle   = '#5a3a10';
            ctx.strokeStyle = '#c0902a';
            ctx.beginPath();
            ctx.roundRect(bx - 70, by - 20, 140, 40, 4);
            ctx.fill(); ctx.stroke();
            ctx.font      = 'bold 13px serif';
            ctx.fillStyle = '#f5e0b0';
            ctx.fillText(opt.label, bx, by);
        });

        // Timeout bar (hidden when timeout is Infinity)
        if (timeout !== Infinity) {
            ctx.fillStyle = 'rgba(200,150,50,0.35)';
            ctx.fillRect(cx2 - 140, cy2 + 60, 280, 6);
            ctx.fillStyle = 'rgba(200,150,50,0.85)';
            ctx.fillRect(cx2 - 140, cy2 + 60, 280 * (1 - progress), 6);
        }

        ctx.restore();
    }

    if (state === 'gameover') {
        drawHUD(W, H, gameTime);
        drawGameOver(W, H, gameTime);
    }

    // Shockwave ring (when resources.shockwaveActive)
    const resources = getResources();
    if (resources.shockwaveActive) {
        resources.shockwaveRadius = (resources.shockwaveRadius ?? 0) + 400 * (dt ?? (1 / 60));  // expand quickly
        const alpha = Math.max(0, 1 - resources.shockwaveRadius / resources.shockwaveMaxRadius);
        ctx.save();
        ctx.beginPath();
        ctx.arc(HEAD_X, HEAD_Y + HEAD_RADIUS, resources.shockwaveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 100, 40, ' + alpha + ')';
        ctx.lineWidth   = 6 * alpha;
        ctx.stroke();
        ctx.restore();
        if (resources.shockwaveRadius >= resources.shockwaveMaxRadius) {
            resources.shockwaveActive = false;
        }
    }
}
