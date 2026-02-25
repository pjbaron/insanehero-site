/**
 * Game - State machine, rAF loop, Poki lifecycle
 * Override render/update methods for your actual game
 */

import { InputManager } from './input.js';

/** Config – tweak per game */
export const Config = {
    adsEnabled: false,  // set true when ready for Poki ads
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading'; // loading -> menu -> playing -> gameover
        this.score = 0;
        this.lastTime = 0;

        // Demo: bouncing dot
        this._dotX = 0;
        this._dotY = 0;
        this._dotVX = 200;
        this._dotVY = 150;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);
    }

    async init() {
        await Poki.init();
        this._resize();
        await this.loadAssets();
        Poki.gameLoadingFinished();
        this.state = 'menu';
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);
    }

    /** Override to load your game assets */
    async loadAssets() {
        // Example: GameAudio.sfxFiles = { jump: 'assets/audio/jump.mp3' };
        // await GameAudio.loadSFX();
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _loop(now) {
        var dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; // Clamp to avoid spiral of death
        this.lastTime = now;

        this.update(dt);
        this.render();
        this.input.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // -------------------------------------------------------
    // State transitions with Poki lifecycle
    // -------------------------------------------------------

    start() {
        this.state = 'playing';
        this.score = 0;
        this._dotX = this.canvas.width / 2;
        this._dotY = this.canvas.height / 2;
        GameAudio.initContext();
        GameAudio.resume();
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        Poki.gameplayStop();
    }

    async restart() {
        this.state = 'playing';
        this.score = 0;
        this._dotX = this.canvas.width / 2;
        this._dotY = this.canvas.height / 2;
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                () => GameAudio.muteAll(),
                () => GameAudio.unmuteAll()
            );
        }
        Poki.gameplayStart();
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    update(dt) {
        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();

        if (this.state === 'menu') {
            if (confirm) this.start();
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            if (confirm) this.restart();
        }
    }

    /** Override for actual gameplay logic */
    updatePlaying(dt) {
        // Demo: bounce a dot
        this._dotX += this._dotVX * dt;
        this._dotY += this._dotVY * dt;
        if (this._dotX < 10) { this._dotVX = Math.abs(this._dotVX); this._dotX = 10; }
        if (this._dotX > this.canvas.width - 10) { this._dotVX = -Math.abs(this._dotVX); this._dotX = this.canvas.width - 10; }
        if (this._dotY < 10) { this._dotVY = Math.abs(this._dotVY); this._dotY = 10; }
        if (this._dotY > this.canvas.height - 10) { this._dotVY = -Math.abs(this._dotVY); this._dotY = this.canvas.height - 10; }
        this.score += dt * 10;

        // Demo: gameover after 10 seconds
        if (this.score >= 100) this.gameOver();
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        if (this.state === 'loading') this.renderLoading();
        else if (this.state === 'menu') this.renderMenu();
        else if (this.state === 'playing') this.renderPlaying();
        else if (this.state === 'gameover') this.renderGameOver();
    }

    renderLoading() {
        var ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
    }

    renderMenu() {
        var ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME TITLE', this.canvas.width / 2, this.canvas.height / 2 - 40);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Press Enter or Tap to Start', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    renderPlaying() {
        var ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Bouncing dot
        ctx.beginPath();
        ctx.arc(this._dotX, this._dotY, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#0f0';
        ctx.fill();

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + Math.floor(this.score), 20, 40);
    }

    renderGameOver() {
        var ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#f00';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.fillText('Score: ' + Math.floor(this.score), this.canvas.width / 2, this.canvas.height / 2 + 10);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Press Enter or Tap to Restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
}
