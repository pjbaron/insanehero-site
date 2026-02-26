'use strict';

// Input handling: pointerdown/up, spacebar, touch.
// Exports an input state object and an init function that wires up listeners.

import { SHOCKWAVE_HOLD_S, SHOCKWAVE_RADIUS } from './config.js';

const input = {
    tapDown: false,
    tapUp: false,
    tapX: 0,
    tapY: 0,
    spaceHeld: false,
    holding: false,     // for war hammer hold detection
    braking: false,     // hold-to-brake scroll control
};

let onTapDown = null;
let onTapUp = null;
let onVacuum = null;

// --- Hold tracking state ---
let holdStartTime  = 0;
let holdActive     = false;
const state        = { shockwaveFired: false };

export function setVacuumCallback(cb) {
    onVacuum = cb;
}

export function initInput(canvas, tapDownCb, tapUpCb) {
    onTapDown = tapDownCb;
    onTapUp = tapUpCb;

    canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        input.tapDown = true;
        input.tapX = cx;
        input.tapY = cy;

        holdStartTime  = performance.now() / 1000;
        holdActive     = true;
        input.braking  = true;

        if (onTapDown) onTapDown(cx, cy);
    });

    canvas.addEventListener('pointerup', (e) => {
        e.preventDefault();
        input.tapUp = true;
        input.holding = false;

        holdActive = false;
        state.shockwaveFired = false;
        input.braking = false;

        if (onTapUp) onTapUp();
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            if (!input.spaceHeld) {
                input.spaceHeld = true;
                input.tapDown = true;
                input.tapX = canvas.width / 2;
                input.tapY = canvas.height / 2;

                holdStartTime  = performance.now() / 1000;
                holdActive     = true;
                input.braking  = true;

                if (onTapDown) onTapDown(canvas.width / 2, canvas.height / 2);
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            input.spaceHeld = false;
            input.holding = false;

            holdActive = false;
            state.shockwaveFired = false;
            input.braking = false;

            if (onTapUp) onTapUp();
        }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function updateHold(dt, resources) {
    if (!holdActive) return;
    const elapsed = performance.now() / 1000 - holdStartTime;

    // Shockwave: hold > SHOCKWAVE_HOLD_S + charge available
    if (elapsed >= SHOCKWAVE_HOLD_S && resources?.desperationCharge >= 1) {
        if (!state.shockwaveFired) {
            state.shockwaveFired = true;
            triggerShockwave(resources);
        }
    }
}

function triggerShockwave(resources) {
    resources.desperationCharge  = 0;
    resources.shockwaveActive    = true;
    resources.shockwaveRadius    = 0;
    resources.shockwaveMaxRadius = SHOCKWAVE_RADIUS;
}

export function clearInputFrame() {
    input.tapDown = false;
    input.tapUp = false;
}

export default input;
