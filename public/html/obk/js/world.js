'use strict';

import CONFIG, { DAY_DURATIONS, WORLD_CIRCUMFERENCE_RADIANS, BRAKE_MIN_SPEED, BRAKE_DECEL_RATE, HORN_THRESHOLD_RADIANS } from './config.js';
import { onCastleApproach } from './audio.js';
import {
    getDayProgress, setDayProgress,
    getDayTargetRadians, setDayTargetRadians,
    getCurrentDay, setCurrentDay,
    setDayJustIncremented,
} from './resources.js';
import input from './input.js';

// --- World state: clouds, hills, scroll, day/night, weather, seasons ---

let scrollSpeed = CONFIG.BASE_SCROLL_SPEED;
let scrollOffset = 0;
let scrollSpeedMult = 1.0;  // 1.0 = full speed, BRAKE_MIN_SPEED = minimum

// Circular world progress
let playerProgress = 0;    // 0-1, wraps at circumference
let revolutionCount = 0;
let prevProgress = 0;       // for wrap-around detection
let shopTriggeredThisRev = false; // edge-trigger shop once per revolution

// Castle approach state: true when castle theta is within HORN_THRESHOLD_RADIANS of beam
let castleApproaching = false;

// Clouds
const clouds = [];
function initClouds() {
    clouds.length = 0;
    for (let i = 0; i < CONFIG.CLOUD_COUNT; i++) {
        clouds.push({
            x: Math.random() * 2000 - 500,
            y: CONFIG.CLOUD_Y_MIN + Math.random() * CONFIG.CLOUD_Y_RANGE,
            w: CONFIG.CLOUD_W_MIN + Math.random() * CONFIG.CLOUD_W_RANGE,
            h: CONFIG.CLOUD_H_MIN + Math.random() * CONFIG.CLOUD_H_RANGE,
            speed: CONFIG.CLOUD_SPEED_MIN + Math.random() * CONFIG.CLOUD_SPEED_RANGE,
            shape: Math.floor(Math.random() * CONFIG.CLOUD_SHAPE_COUNT),
        });
    }
}
initClouds();

// Hills
const hillsFar = [];
const hillsMid = [];

function generateHills(arr, count, minH, maxH) {
    arr.length = 0;
    for (let i = 0; i < count; i++) {
        arr.push({
            x: i * (2400 / count) - 200 + Math.random() * 100,
            w: 150 + Math.random() * 200,
            h: minH + Math.random() * (maxH - minH),
            shade: Math.random() * 0.15 - 0.075,  // -0.075 to +0.075 brightness offset
        });
    }
}
generateHills(hillsFar, CONFIG.HILLS_FAR_COUNT, CONFIG.HILLS_FAR_MIN_H, CONFIG.HILLS_FAR_MAX_H);
generateHills(hillsMid, CONFIG.HILLS_MID_COUNT, CONFIG.HILLS_MID_MIN_H, CONFIG.HILLS_MID_MAX_H);

// Day/night
let dayTimer = 0;

// Weather
let weatherType = 'clear';
let weatherTimer = 0;
const raindrops = [];

// Seasons
// Day-gated season assignment
// Summer: days 1-5, Autumn: days 6-11, Winter: days 12-17, Spring: days 18-24
function dayToSeason(day) {
    if (day <= 5)  return 'summer';
    if (day <= 11) return 'autumn';
    if (day <= 17) return 'winter';
    return 'spring';
}

let currentSeason = 'summer'; // 'summer' | 'autumn' | 'winter' | 'spring'

// Background evolution (farm, buildings)
const bgBuildings = [];
const bgBanners = [];

// --- Getters ---
export function getScrollSpeed()  { return scrollSpeed; }
export function getScrollOffset() { return scrollOffset; }
export function getClouds()       { return clouds; }
export function getHillsFar()     { return hillsFar; }
export function getHillsMid()     { return hillsMid; }
export function getDayTimer()     { return dayTimer; }
export function getWeatherType()  { return weatherType; }
export function getRaindrops()    { return raindrops; }
export function getCurrentSeason(){ return currentSeason; }
export function getPlayerProgress()   { return playerProgress; }
export function getRevolutionCount()  { return revolutionCount; }
export function isNearBase() {
    return playerProgress < CONFIG.BASE_SHOP_PROXIMITY ||
           playerProgress > (1 - CONFIG.BASE_SHOP_PROXIMITY);
}
export function getShopTriggeredThisRev() { return shopTriggeredThisRev; }
export function setShopTriggeredThisRev(v) { shopTriggeredThisRev = v; }
export function getCastleApproaching()    { return castleApproaching; }

// --- Polar coordinate utilities ---
// theta=0 is castle (12 o'clock), theta=PI is enemy castle (6 o'clock)

export function getScrollAngle() {
    return (scrollOffset / CONFIG.WORLD_CIRCUMFERENCE) * 2 * Math.PI;
}

export function normalizeAngle(a) {
    // Normalize to [-PI, PI]
    a = a % (2 * Math.PI);
    if (a > Math.PI) a -= 2 * Math.PI;
    if (a < -Math.PI) a += 2 * Math.PI;
    return a;
}

export function angularDist(a, b) {
    return Math.abs(normalizeAngle(a - b));
}

export function pixelsToRadians(px) {
    return (px / CONFIG.WORLD_CIRCUMFERENCE) * 2 * Math.PI;
}

export function thetaToScreen(theta, W, H) {
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const groundY = H - H * CONFIG.GROUND_RATIO;
    const cx = W / 2;
    const cy = groundY + R;
    const rel = normalizeAngle(theta - getScrollAngle());
    return {
        x: cx + R * Math.sin(rel),
        y: cy - R * Math.cos(rel),
        angle: rel,  // surface angle for rotation
    };
}

export function isVisible(theta, W) {
    const R = CONFIG.ARC_VISUAL_RADIUS;
    const halfArc = (W / 2) / R + 0.15; // slight margin beyond screen edge
    const rel = Math.abs(normalizeAngle(theta - getScrollAngle()));
    return rel < halfArc;
}

// --- Update ---
export function updateWorld(dt, gameTime, shopOpen, W, state) {
    if (state && state.worldPaused) return;
    if (!shopOpen) {
        scrollSpeed = Math.min(CONFIG.MAX_SCROLL_SPEED, CONFIG.BASE_SCROLL_SPEED + gameTime * CONFIG.SCROLL_ACCELERATION);

        // Braking speed modulation
        const isBraking = input.braking === true;
        if (isBraking) {
            scrollSpeedMult = Math.max(BRAKE_MIN_SPEED, scrollSpeedMult - BRAKE_DECEL_RATE * dt);
        } else {
            scrollSpeedMult = Math.min(1.0, scrollSpeedMult + BRAKE_DECEL_RATE * dt);
        }

        const effectiveScrollDelta = scrollSpeed * scrollSpeedMult * dt;
        scrollOffset += effectiveScrollDelta;

        // Day progress accumulation
        const scrollDeltaRadians = (effectiveScrollDelta / CONFIG.WORLD_CIRCUMFERENCE) * WORLD_CIRCUMFERENCE_RADIANS;
        let dayProgress = getDayProgress() + scrollDeltaRadians;
        let dayTargetRadians = getDayTargetRadians();
        if (dayTargetRadians > 0 && dayProgress >= dayTargetRadians) {
            dayProgress -= dayTargetRadians;
            const nextDay = Math.min(getCurrentDay() + 1, 24);
            setCurrentDay(nextDay);
            setDayJustIncremented(true);
            // Compute next day's target radians based on duration ratio relative to day 1
            const nextDuration = DAY_DURATIONS[nextDay] ?? DAY_DURATIONS[24];
            dayTargetRadians = WORLD_CIRCUMFERENCE_RADIANS * (nextDuration / DAY_DURATIONS[1]);
            setDayTargetRadians(dayTargetRadians);
        }
        setDayProgress(dayProgress);

        // Track circular world progress
        prevProgress = playerProgress;
        playerProgress = (scrollOffset % CONFIG.WORLD_CIRCUMFERENCE) / CONFIG.WORLD_CIRCUMFERENCE;
        // Detect revolution wrap-around (progress went from near 1 back to near 0)
        if (prevProgress > 0.9 && playerProgress < 0.1) {
            revolutionCount++;
            shopTriggeredThisRev = false;
        }

        // Castle approach detection: castle is at theta=0; beam is at getScrollAngle()
        // angularDist gives the shortest arc between the two angles
        const distToBeam = angularDist(0, getScrollAngle());
        const wasApproaching = castleApproaching;
        castleApproaching = distToBeam <= HORN_THRESHOLD_RADIANS && distToBeam > 0.02;
        if (castleApproaching && !wasApproaching) {
            onCastleApproach();
        }
    }

    if (!shopOpen) {
        // Clouds
        for (const c of clouds) {
            c.x -= (c.speed + scrollSpeed * CONFIG.CLOUD_SCROLL_FACTOR) * dt;
            if (c.x + c.w < -100) {
                c.x = W + 100 + Math.random() * 100;
                c.y = CONFIG.CLOUD_Y_MIN + Math.random() * CONFIG.CLOUD_Y_RANGE;
                c.shape = Math.floor(Math.random() * CONFIG.CLOUD_SHAPE_COUNT);
            }
        }
        dayTimer += dt;
        currentSeason = dayToSeason(getCurrentDay());
    }

    // Weather cycling: alternate clear/rain every 60-90 seconds
    if (!shopOpen) weatherTimer += dt;
    if (weatherType === 'clear' && weatherTimer > 60 + Math.sin(gameTime * 0.01) * 30) {
        weatherType = 'rain';
        weatherTimer = 0;
    } else if (weatherType === 'rain' && weatherTimer > 20 + Math.sin(gameTime * 0.02) * 10) {
        weatherType = 'clear';
        weatherTimer = 0;
        raindrops.length = 0;
    }

    // Spawn/update rain particles
    if (weatherType === 'rain') {
        // Spawn new raindrops
        for (let i = 0; i < 3; i++) {
            if (raindrops.length < 80) {
                raindrops.push({
                    x: (W / 3) * i + Math.random() * (W / 3) - 20,
                    y: -10 - Math.random() * 20,
                    speed: 300 + Math.random() * 200,
                    length: 8 + Math.random() * 8,
                });
            }
        }
        // Update positions
        const H = W; // approximate - renderer will clip anyway
        for (let i = raindrops.length - 1; i >= 0; i--) {
            const r = raindrops[i];
            r.y += r.speed * dt;
            r.x -= 30 * dt; // slight wind
            if (r.y > 2000) { // will be off any screen
                raindrops.splice(i, 1);
            }
        }
    }
}

// Title-only cloud update (no scroll)
export function updateTitleClouds(dt, W) {
    for (const c of clouds) {
        c.x -= c.speed * dt;
        if (c.x + c.w < -100) c.x = W + 100;
    }
}

// --- Reset ---
export function resetWorld() {
    scrollSpeed = CONFIG.BASE_SCROLL_SPEED;
    scrollOffset = 0;
    scrollSpeedMult = 1.0;
    playerProgress = 0;
    revolutionCount = 0;
    prevProgress = 0;
    shopTriggeredThisRev = false;
    dayTimer = 0;
    weatherType = 'clear';
    weatherTimer = 0;
    raindrops.length = 0;
    currentSeason = 'summer';
    bgBuildings.length = 0;
    bgBanners.length = 0;
    // Initialise day 1 target: one full revolution
    setDayTargetRadians(WORLD_CIRCUMFERENCE_RADIANS * (DAY_DURATIONS[1] / DAY_DURATIONS[1]));
    initClouds();
    generateHills(hillsFar, CONFIG.HILLS_FAR_COUNT, CONFIG.HILLS_FAR_MIN_H, CONFIG.HILLS_FAR_MAX_H);
    generateHills(hillsMid, CONFIG.HILLS_MID_COUNT, CONFIG.HILLS_MID_MIN_H, CONFIG.HILLS_MID_MAX_H);
}
