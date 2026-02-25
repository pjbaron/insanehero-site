/**
 * Game - Lava Rise integration
 * State machine, rAF loop, Poki lifecycle
 */

import { InputManager } from './input.js';

/** Config */
export const Config = {
    adsEnabled: false,
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading';
        this.score = 0;
        this.lastTime = 0;
        this.menuTime = 0;
        this.gameOverTime = 0;

        // Lava Rise systems
        this.gs = new LavaRise.State();
        this.renderer = new LavaRise.Renderer();

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

    async loadAssets() {
        // No assets to load - all procedural
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _loop(now) {
        var dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = now;

        this.update(dt);
        this.render();
        this.input.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // -------------------------------------------------------
    // State transitions
    // -------------------------------------------------------

    start() {
        this.state = 'playing';
        this.gs.initGame();
        GameAudio.initContext();
        GameAudio.resume();
        LavaRise.SFX.init();
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        this.score = this.gs.score;
        this.gameOverTime = 0;
        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                () => GameAudio.muteAll(),
                () => GameAudio.unmuteAll()
            );
        }
        this.state = 'playing';
        this.gs.initGame();
        Poki.gameplayStart();
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    update(dt) {
        var tapped = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();

        if (this.state === 'menu') {
            this.menuTime += dt;
            if (tapped) this.start();
        } else if (this.state === 'playing') {
            this.updatePlaying(dt, tapped);
        } else if (this.state === 'gameover') {
            this.gameOverTime += dt;
            // Update particles/effects even after death
            this.gs.particles.update(dt);
            this.gs.popups.update(dt);
            this.gs.shakeTimer -= dt;
            if (this.gs.shakeTimer < 0) this.gs.shakeTimer = 0;
            this.gs.shakeAmount *= Math.max(0, 1 - 8 * dt);
            this.gs.flashAlpha -= dt * 3;
            if (this.gs.flashAlpha < 0) this.gs.flashAlpha = 0;

            if (tapped && this.gameOverTime >= LavaRise.GAME_OVER_LOCKOUT) {
                this.restart();
            }
        }
    }

    updatePlaying(dt, tapped) {
        this.gs.update(dt, tapped);
        this.score = this.gs.score;

        if (!this.gs.pAlive) {
            this.gameOver();
        }
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        var ctx = this.ctx;
        var cw = this.canvas.width;
        var ch = this.canvas.height;

        if (this.state === 'loading') {
            this.renderLoading();
        } else if (this.state === 'menu') {
            this.renderer.renderMenu(ctx, cw, ch, this.gs, this.menuTime);
        } else if (this.state === 'playing') {
            this.renderer.render(ctx, this.canvas, this.gs);
        } else if (this.state === 'gameover') {
            // Render the game state frozen in background
            this.renderer.render(ctx, this.canvas, this.gs);
            // Overlay game over screen
            var canRestart = this.gameOverTime >= LavaRise.GAME_OVER_LOCKOUT;
            this.renderer.renderGameOver(ctx, cw, ch, this.gs, this.gameOverTime, canRestart);
        }
    }

    renderLoading() {
        var ctx = this.ctx;
        ctx.fillStyle = '#1a0a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#ff4400';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LAVA RISE', this.canvas.width / 2, this.canvas.height / 2);
    }
}
