'use strict';

// Centralized hit region management for UI elements
// Eliminates duplicate position calculations between rendering and click detection

const hitRegions = [];

export function clearHitRegions() {
    hitRegions.length = 0;
}

export function registerHitRegion(x, y, width, height, callback, zIndex = 0) {
    hitRegions.push({ x, y, width, height, callback, zIndex });
}

export function checkHitRegions(clickX, clickY) {
    // Check from highest zIndex to lowest (UI on top checked first)
    const sorted = hitRegions.slice().sort((a, b) => b.zIndex - a.zIndex);
    for (const region of sorted) {
        if (clickX >= region.x && clickX <= region.x + region.width &&
            clickY >= region.y && clickY <= region.y + region.height) {
            region.callback();
            return true; // Hit handled
        }
    }
    return false; // No hit
}
