import { EchoHuntGame } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new EchoHuntGame(document.getElementById('game-canvas'));
    game.init();
});
