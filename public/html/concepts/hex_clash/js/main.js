import { Game } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game(document.getElementById('game-canvas'));
    game.init();
});
