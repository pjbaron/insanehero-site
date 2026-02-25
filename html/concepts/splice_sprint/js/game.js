/**
 * Splice Sprint - Main Game
 * State machine, rAF loop, Poki lifecycle
 * Orchestrates Track, Player, Renderer, Particles, SFX
 */

import { InputManager } from './input.js';

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

        // Fork choice state
        this._pendingChoice = 0;   // -1 left, 1 right, 0 none
        this._lastSegType = '';
        this._segTypeApplied = false;
        this._deathTriggered = false;
        this._wasAirborne = false;
        this._menuPulse = 0;
        this._gameOverTimer = 0;
        this._titleBounce = 0;

        // Swipe detection
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._touchStartTime = 0;
        this._swipeHandled = false;
        this._setupSwipe();

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);
    }

    _setupSwipe() {
        var self = this;
        this.canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length > 0) {
                self._touchStartX = e.touches[0].clientX;
                self._touchStartY = e.touches[0].clientY;
                self._touchStartTime = performance.now();
                self._swipeHandled = false;
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', function(e) {
            if (self._swipeHandled) return;
            var touch = e.changedTouches[0];
            if (!touch) return;
            var dx = touch.clientX - self._touchStartX;
            var dy = touch.clientY - self._touchStartY;
            var dt = performance.now() - self._touchStartTime;

            // Swipe detection: min 30px horizontal, < 500ms, more horizontal than vertical
            if (Math.abs(dx) > 30 && dt < 500 && Math.abs(dx) > Math.abs(dy)) {
                self._pendingChoice = dx > 0 ? 1 : -1;
                self._swipeHandled = true;
            } else if (dt < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
                // Short tap - use left/right half for direction
                var tapX = touch.clientX / window.innerWidth;
                if (self.state === 'playing') {
                    self._pendingChoice = tapX < 0.5 ? -1 : 1;
                }
            }
        }, { passive: true });
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
        // No external assets - all procedural
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
        this.score = 0;
        this._deathTriggered = false;
        this._wasAirborne = false;
        this._lastSegType = '';
        this._segTypeApplied = false;
        this._pendingChoice = 0;

        Track.reset();
        Player.reset();
        Particles.reset();
        Renderer.shakeAmount = 0;
        Renderer.flashAlpha = 0;

        GameAudio.initContext();
        GameAudio.resume();
        SFX.init();

        Track.update(0);

        Poki.gameplayStart();
        SFX.select();
    }

    gameOver() {
        this.state = 'gameover';
        this._gameOverTimer = 0;
        Player.saveHighScore();
        this.score = Player.score;
        Poki.gameplayStop();
        SFX.gameOver();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { GameAudio.muteAll(); },
                function() { GameAudio.unmuteAll(); }
            );
        }
        this.start();
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    update(dt) {
        if (this.state === 'menu') {
            this._menuPulse += dt;
            this._titleBounce += dt;
            Renderer.update(dt);
            var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();
            if (confirm) this.start();
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this._gameOverTimer += dt;
            Renderer.update(dt);
            Particles.update(dt);
            if (this._gameOverTimer > 0.5) {
                var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();
                if (confirm) this.restart();
            }
        }
    }

    updatePlaying(dt) {
        // Handle input for fork choices
        this._handleForkInput();

        // Process fork choices
        this._processForkChoice();

        // Update player
        Player.update(dt);

        // Update track generation
        Track.update(Player.z);

        // Get segment player is on
        var seg = Track.getSegmentAtZ(Player.z);
        if (seg && !Player.dying) {
            // Track bridge state
            Player.onBridge = (seg.type === 'bridge');

            this._handleSegmentEffects(seg);

            // Bridge fall-off check
            if (Player.onBridge && !Player.airborne) {
                var bridgeHalfW = seg.width * 0.5;
                var playerOffsetFromRoad = Math.abs(Player.x - seg.x);
                if (playerOffsetFromRoad > bridgeHalfW) {
                    Player.startDeath('bridge');
                    SFX.deadEnd();
                    Renderer.shake(C.SHAKE_DEAD_END);
                    Particles.deathDebris(this.canvas.width / 2, this.canvas.height * 0.75);
                    this._deathTriggered = true;
                }
            }
        } else {
            Player.onBridge = false;
        }

        // Collect coins
        if (!Player.dying && !Player.airborne) {
            var collected = Track.collectCoins(Player.z, Player.x, 40);
            for (var i = 0; i < collected; i++) {
                Player.collectCoin();
                SFX.coin();
                var screenCenter = this.canvas.width / 2;
                Particles.coinGlitter(screenCenter, this.canvas.height * 0.65);
            }
        }

        // Detect ramp landing
        if (this._wasAirborne && !Player.airborne) {
            SFX.land();
            Renderer.shake(C.SHAKE_BOOST);
            Particles.mudSplash(this.canvas.width / 2, this.canvas.height * 0.76);
        }
        this._wasAirborne = Player.airborne;

        // Follow road curves
        if (!Player.dying) {
            var roadX = Track.getRoadXAtZ(Player.z);
            Player.targetX = roadX;
        }

        // Boost particles
        if (Player.boosted && Math.random() < 0.5) {
            Particles.boostSparks(
                this.canvas.width / 2 + (Math.random() - 0.5) * 20,
                this.canvas.height * 0.75
            );
        }

        // Speed trail
        if (Player.speed > C.SPEED_MIN * 1.3 && Math.random() < 0.3) {
            Particles.speedTrail(
                this.canvas.width / 2 + (Math.random() - 0.5) * 30,
                this.canvas.height * 0.78
            );
        }

        // Death check
        if (Player.isDead()) {
            this.gameOver();
        }

        // Update systems
        Renderer.update(dt);
        Particles.update(dt);

        this.score = Player.score;
    }

    _handleForkInput() {
        // Keyboard
        if (this.input.wasPressed('ArrowLeft') || this.input.wasPressed('KeyA')) {
            this._pendingChoice = -1;
        }
        if (this.input.wasPressed('ArrowRight') || this.input.wasPressed('KeyD')) {
            this._pendingChoice = 1;
        }
        if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('KeyW')) {
            this._pendingChoice = 2; // center/straight for 3-way forks
        }
        // Swipe/tap handled in event listeners above
    }

    _processForkChoice() {
        if (this._pendingChoice === 0) return;

        var fork = Track.getNextFork();
        if (!fork) {
            this._pendingChoice = 0;
            return;
        }

        // Map direction to branch index
        var branches = fork.branches;
        var chosenIdx = -1;

        if (branches.length === 2) {
            chosenIdx = this._pendingChoice < 0 ? 0 : 1;
        } else if (branches.length === 3) {
            if (this._pendingChoice < 0) chosenIdx = 0;
            else if (this._pendingChoice === 2) chosenIdx = 1; // center/up
            else chosenIdx = 2; // right
        }

        if (chosenIdx >= 0 && chosenIdx < branches.length) {
            Track.chooseBranch(fork, chosenIdx);
            SFX.forkChoose();
            this._segTypeApplied = false;
            this._lastSegType = '';
        }

        this._pendingChoice = 0;
    }

    _handleSegmentEffects(seg) {
        var type = seg.type;

        // Only trigger once per new segment type encounter
        if (type !== this._lastSegType) {
            this._segTypeApplied = false;
            this._lastSegType = type;
        }

        if (this._segTypeApplied) return;

        switch (type) {
            case 'boost':
                Player.applyBoost();
                SFX.boost();
                Renderer.flash('#00ffaa');
                Renderer.shake(C.SHAKE_BOOST);
                Particles.boostSparks(this.canvas.width / 2, this.canvas.height * 0.7);
                this._segTypeApplied = true;
                break;

            case 'mud':
                Player.applyMud();
                SFX.mud();
                Renderer.shake(C.SHAKE_BOOST);
                Particles.mudSplash(this.canvas.width / 2, this.canvas.height * 0.75);
                this._segTypeApplied = true;
                break;

            case 'ramp':
                Player.applyRamp();
                SFX.ramp();
                Renderer.shake(C.SHAKE_RAMP);
                Renderer.flash('#ffaa00');
                Particles.rampSparks(this.canvas.width / 2, this.canvas.height * 0.7);
                this._segTypeApplied = true;
                break;

            case 'bridge':
                Player.onBridge = true;
                SFX.bridge();
                this._segTypeApplied = true;
                break;

            case 'deadEnd':
                if (seg.crumbling && !this._deathTriggered) {
                    Player.startDeath('deadEnd');
                    SFX.deadEnd();
                    Renderer.shake(C.SHAKE_DEAD_END);
                    Renderer.flash('#ff2200');
                    Particles.deathDebris(this.canvas.width / 2, this.canvas.height * 0.7);
                    this._deathTriggered = true;
                }
                this._segTypeApplied = true;
                break;
        }
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        if (this.state === 'loading') {
            this.renderLoading();
        } else if (this.state === 'menu') {
            this.renderMenu();
        } else if (this.state === 'playing') {
            this.renderPlaying();
        } else if (this.state === 'gameover') {
            this.renderGameOver();
        }
    }

    renderLoading() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '24px ' + C.FONT;
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', w / 2, h / 2);
    }

    renderMenu() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Animated background - scrolling road preview
        Renderer.renderSky(ctx, w, h);
        Renderer.renderGround(ctx, w, h, this._menuPulse * 200);

        // Title
        var bounce = Math.sin(this._titleBounce * 2) * 8;
        ctx.save();

        // Title shadow
        ctx.font = 'bold ' + C.TITLE_SIZE + 'px ' + C.FONT;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText('SPLICE SPRINT', w / 2 + 3, h * 0.3 + bounce + 3);

        // Title gradient
        var grad = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.35);
        grad.addColorStop(0, '#00ffaa');
        grad.addColorStop(0.5, '#00aaff');
        grad.addColorStop(1, '#ff6600');
        ctx.fillStyle = grad;
        ctx.fillText('SPLICE SPRINT', w / 2, h * 0.3 + bounce);

        // Subtitle
        ctx.font = '18px ' + C.FONT;
        ctx.fillStyle = '#aaa';
        ctx.fillText('Choose your path!', w / 2, h * 0.38 + bounce);

        // Play prompt
        var promptAlpha = Math.sin(this._menuPulse * 3) * 0.3 + 0.7;
        ctx.globalAlpha = promptAlpha;
        ctx.font = 'bold 22px ' + C.FONT;
        ctx.fillStyle = '#fff';
        ctx.fillText('TAP TO PLAY', w / 2, h * 0.6);
        ctx.globalAlpha = 1;

        // Controls hint
        ctx.font = '14px ' + C.FONT;
        ctx.fillStyle = '#666';
        ctx.fillText('Swipe or Arrow Keys to choose your path', w / 2, h * 0.68);

        // High score
        try {
            var hs = localStorage.getItem('splice_sprint_high');
            if (hs && parseInt(hs) > 0) {
                ctx.font = '16px ' + C.FONT;
                ctx.fillStyle = '#888';
                ctx.fillText('BEST: ' + hs, w / 2, h * 0.78);
            }
        } catch (e) {}

        // Decorative road fork icon
        this._drawForkIcon(ctx, w / 2, h * 0.48, 40, this._menuPulse);

        ctx.restore();
    }

    _drawForkIcon(ctx, x, y, size, time) {
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // Center stem
        ctx.beginPath();
        ctx.moveTo(x, y + size);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Left branch
        var pulseL = Math.sin(time * 4) * 0.2 + 0.8;
        ctx.globalAlpha = pulseL;
        ctx.strokeStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - size * 0.6, y - size * 0.7);
        ctx.stroke();

        // Right branch
        var pulseR = Math.sin(time * 4 + Math.PI) * 0.2 + 0.8;
        ctx.globalAlpha = pulseR;
        ctx.strokeStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size * 0.6, y - size * 0.7);
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    renderPlaying() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.save();
        ctx.translate(Renderer.shakeX, Renderer.shakeY);

        // Sky and ground
        Renderer.renderSky(ctx, w, h);
        Renderer.renderGround(ctx, w, h, Player.z);

        // Track
        var visibleSegs = Track.getVisibleSegments(Player.z, C.DRAW_DIST);
        Renderer.renderTrack(ctx, w, h, visibleSegs, Player.z, Player.x, Player.y);

        // Player
        Renderer.renderPlayer(ctx, w, h, Player);

        ctx.restore();

        // Fork indicators (not shaken)
        var nextFork = Track.getNextFork();
        Renderer.renderForkIndicators(ctx, w, h, nextFork, Player.z);

        // Particles (screen space)
        Particles.render(ctx);

        // HUD
        Renderer.renderHUD(ctx, w, h, Player, Track);

        // Flash overlay
        Renderer.renderFlash(ctx, w, h);

        // Death overlay
        Renderer.renderDeathOverlay(ctx, w, h, Player);
    }

    renderGameOver() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Dark background
        ctx.fillStyle = '#0a0a1e';
        ctx.fillRect(0, 0, w, h);

        // Particles still going
        Particles.render(ctx);

        // Game Over text
        ctx.save();
        ctx.font = 'bold 42px ' + C.FONT;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff4444';
        ctx.fillText('GAME OVER', w / 2, h * 0.1 + 10);

        // Score
        ctx.font = 'bold 28px ' + C.FONT;
        ctx.fillStyle = '#fff';
        ctx.fillText(Math.floor(Player.score), w / 2, h * 0.16 + 10);

        // Stats
        ctx.font = '16px ' + C.FONT;
        ctx.fillStyle = '#aaa';
        var statsY = h * 0.2;
        ctx.fillText('Distance: ' + Math.floor(Player.distance / 10) + 'm', w / 2, statsY);
        ctx.fillText('Coins: ' + Player.coins, w / 2, statsY + 24);
        ctx.fillText('Forks: ' + Track.forksDone + '  |  Accuracy: ' + Track.getAccuracy() + '%', w / 2, statsY + 48);

        // New high score
        if (Player.score >= Player.highScore && Player.highScore > 0) {
            ctx.font = 'bold 18px ' + C.FONT;
            ctx.fillStyle = C.COIN_COLOR;
            ctx.fillText('NEW BEST!', w / 2, statsY + 76);
        }

        // Ghost map
        Renderer.renderGhostMap(ctx, w, h, Track.forkHistory);

        // Restart prompt
        if (this._gameOverTimer > 0.5) {
            var alpha = Math.sin(this._gameOverTimer * 3) * 0.3 + 0.7;
            ctx.globalAlpha = alpha;
            ctx.font = 'bold 20px ' + C.FONT;
            ctx.fillStyle = '#fff';
            ctx.fillText('TAP TO PLAY AGAIN', w / 2, h * 0.92);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }
}
