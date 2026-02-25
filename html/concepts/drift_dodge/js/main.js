import { DriftDodge } from './drift_dodge.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new DriftDodge(document.getElementById('game-canvas'));
    game.init();
});
