'use strict';

// Stub audio module. All other modules can call these without errors.
// Replace with real implementations when audio assets are ready.

export function playSound(name) { /* no-op */ }
export function playMusic(name) { /* no-op */ }
export function stopMusic()     { /* no-op */ }
export function setVolume(v)    { /* no-op */ }

export function onCastleApproach() {
    // TODO: play horn sound
    console.log('[audio] castle approaching beam');
}

export function onVacuum() {
    // TODO: play vacuum sound
}

export function onDayIncrement() {
    // TODO: play day chime
}
