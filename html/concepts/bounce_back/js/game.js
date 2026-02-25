/**
 * Bounce Back - Peggle-style ball launcher
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
        this.time = 0;

        // Game state
        this.balls = 5;
        this.round = 1;
        this.combo = 0;
        this.pegsHitThisShot = 0;
        this.bestScore = 0;

        // Ball
        this.ball = null;
        this.ballActive = false;

        // Aiming
        this.aiming = false;
        this.aimStartX = 0;
        this.aimStartY = 0;
        this.launchX = 200;
        this.launchY = 35;
        this.trajectoryPoints = [];

        // Level
        this.pegs = [];
        this.bumpers = [];
        this.spinners = [];
        this.zones = [];

        // Drag tracking (pointer events for smooth drag)
        this.pointerDown = false;
        this.pointerX = 0;
        this.pointerY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragDist = 0;

        // Round transition
        this.roundTransitionTimer = 0;
        this.extraBallTimer = 0;

        // Magnet pegs active
        this.activeMagnets = [];

        // Ad tracking
        this.roundsSinceAd = 0;

        // Load best score
        try {
            var saved = localStorage.getItem('bb_best');
            if (saved) this.bestScore = parseInt(saved, 10) || 0;
        } catch (e) {}

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);

        // Pointer events for drag-to-aim
        this._setupPointerEvents();
    }

    _setupPointerEvents() {
        var self = this;
        var c = this.canvas;

        var onDown = function (e) {
            e.preventDefault();
            var pos = self._getEventPos(e);
            self.pointerDown = true;
            self.pointerX = pos.x;
            self.pointerY = pos.y;
            self.dragStartX = pos.x;
            self.dragStartY = pos.y;
            self.dragDist = 0;
        };

        var onMove = function (e) {
            e.preventDefault();
            var pos = self._getEventPos(e);
            self.pointerX = pos.x;
            self.pointerY = pos.y;
            if (self.pointerDown) {
                var dx = pos.x - self.dragStartX;
                var dy = pos.y - self.dragStartY;
                self.dragDist = Math.sqrt(dx * dx + dy * dy);
            }
        };

        var onUp = function (e) {
            e.preventDefault();
            if (self.pointerDown) {
                self.pointerDown = false;
                self._onDragRelease();
            }
        };

        c.addEventListener('pointerdown', onDown);
        c.addEventListener('pointermove', onMove);
        c.addEventListener('pointerup', onUp);
        c.addEventListener('pointercancel', onUp);
        c.style.touchAction = 'none';
    }

    _getEventPos(e) {
        var rect = this.canvas.getBoundingClientRect();
        var x = (e.clientX !== undefined) ? e.clientX : (e.touches ? e.touches[0].clientX : 0);
        var y = (e.clientY !== undefined) ? e.clientY : (e.touches ? e.touches[0].clientY : 0);
        // Convert to virtual coords
        return Renderer.screenToVirtual(x - rect.left, y - rect.top);
    }

    _onDragRelease() {
        if (this.state === 'menu') {
            this.start();
            return;
        }
        if (this.state === 'gameover') {
            this.restart();
            return;
        }
        if (this.state !== 'playing') return;
        if (this.ballActive) return;
        if (this.roundTransitionTimer > 0) return;

        // Need minimum drag distance (20 virtual pixels) to prevent accidental launches
        if (this.dragDist < 20) return;

        // Slingshot: launch direction is opposite to drag direction
        var dx = this.dragStartX - this.pointerX;
        var dy = this.dragStartY - this.pointerY;

        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) return;

        // Normalize and apply launch speed
        var speed = Math.min(dist * 4, 800);
        var nx = dx / dist;
        var ny = dy / dist;

        // Ensure we always launch downward (or at least not straight up)
        if (ny < 0.1) {
            ny = 0.1;
            var renorm = Math.sqrt(nx * nx + ny * ny);
            nx /= renorm;
            ny /= renorm;
        }

        this._launchBall(nx * speed, ny * speed);
    }

    _launchBall(vx, vy) {
        if (this.balls <= 0) return;

        this.ball = {
            x: this.launchX,
            y: this.launchY,
            vx: vx,
            vy: vy
        };
        this.ballActive = true;
        this.balls--;
        this.combo = 0;
        this.pegsHitThisShot = 0;
        this.activeMagnets = [];

        Synth.launch();
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
        // All audio is procedural, no assets to load
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _loop(now) {
        var dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = now;
        this.time += dt;

        this.update(dt);
        this.render();
        this.input.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // ------- State transitions -------

    start() {
        this.state = 'playing';
        this.score = 0;
        this.balls = 5;
        this.round = 1;
        this.combo = 0;
        this.pegsHitThisShot = 0;
        this.ball = null;
        this.ballActive = false;
        this.roundTransitionTimer = 1.2;
        this.extraBallTimer = 0;
        this.roundsSinceAd = 0;
        this.activeMagnets = [];

        GameAudio.initContext();
        GameAudio.resume();
        Synth.init();

        this._generateRound();
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        // Save best
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            try { localStorage.setItem('bb_best', String(this.bestScore)); } catch (e) {}
        }
        Synth.gameOverSound();
        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            Poki.gameplayStop();
            await Poki.commercialBreak(
                function () { GameAudio.muteAll(); },
                function () { GameAudio.unmuteAll(); }
            );
        }
        this.start();
    }

    _generateRound() {
        var layout = Pegs.generate(this.round);
        this.pegs = layout.pegs;
        this.bumpers = layout.bumpers;
        this.spinners = layout.spinners;
        this.zones = layout.zones;
    }

    _advanceRound() {
        this.round++;
        this.roundsSinceAd++;
        this.roundTransitionTimer = 1.5;
        this.activeMagnets = [];

        Synth.roundComplete();
        Particles.clear();

        this._generateRound();

        // Commercial break every 3 rounds
        if (Config.adsEnabled && this.roundsSinceAd >= 3) {
            this.roundsSinceAd = 0;
            var self = this;
            Poki.gameplayStop();
            Poki.commercialBreak(
                function () { GameAudio.muteAll(); },
                function () { GameAudio.unmuteAll(); }
            ).then(function () {
                Poki.gameplayStart();
            });
        }
    }

    // ------- Update -------

    update(dt) {
        if (this.state === 'menu') {
            this._updateMenu(dt);
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this._updateGameOver(dt);
        }
    }

    _updateMenu(dt) {
        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space');
        if (confirm) this.start();
    }

    _updateGameOver(dt) {
        Particles.update(dt);
        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space');
        if (confirm) this.restart();
    }

    updatePlaying(dt) {
        // Transition timer
        if (this.roundTransitionTimer > 0) {
            this.roundTransitionTimer -= dt;
            return;
        }

        // Extra ball notification timer
        if (this.extraBallTimer > 0) {
            this.extraBallTimer -= dt;
        }

        // Update spinners
        for (var s = 0; s < this.spinners.length; s++) {
            this.spinners[s].angle += this.spinners[s].speed * dt;
        }

        // Update bumper flash
        for (var b = 0; b < this.bumpers.length; b++) {
            if (this.bumpers[b].flash > 0) {
                this.bumpers[b].flash -= dt * 4;
            }
        }

        // Update peg animations (fading hit pegs)
        for (var p = 0; p < this.pegs.length; p++) {
            var peg = this.pegs[p];
            if (peg.hit && peg.alpha > 0) {
                peg.alpha -= dt * 2;
            }
            if (peg.glow > 0) {
                peg.glow -= dt * 3;
            }
        }

        // Aiming - update trajectory preview when dragging
        if (this.pointerDown && !this.ballActive) {
            var dx = this.dragStartX - this.pointerX;
            var dy = this.dragStartY - this.pointerY;
            var dist = Math.sqrt(dx * dx + dy * dy);

            // Set launch position to horizontal position of drag start, clamped to play area
            this.launchX = Math.max(20, Math.min(380, this.dragStartX));

            if (dist >= 20) {
                this.aiming = true;
                var speed = Math.min(dist * 4, 800);
                var nx = dx / dist;
                var ny = dy / dist;
                if (ny < 0.1) {
                    ny = 0.1;
                    var renorm = Math.sqrt(nx * nx + ny * ny);
                    nx /= renorm;
                    ny /= renorm;
                }
                this.trajectoryPoints = Physics.simulateTrajectory(
                    this.launchX, this.launchY,
                    nx * speed, ny * speed,
                    40, 0.02
                );
            } else {
                this.aiming = false;
                this.trajectoryPoints = [];
            }
        } else {
            this.aiming = false;
            this.trajectoryPoints = [];
        }

        // Ball physics
        if (this.ballActive && this.ball) {
            this._updateBall(dt);
        }

        // Particles
        Particles.update(dt);

        // Zone sliding (subtle movement)
        this._updateZones(dt);
    }

    _updateBall(dt) {
        var ball = this.ball;

        // Magnet effect
        for (var m = 0; m < this.activeMagnets.length; m++) {
            var mag = this.activeMagnets[m];
            var mdx = mag.x - ball.x;
            var mdy = mag.y - ball.y;
            var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist < 100 && mdist > 5) {
                var force = 15000 / (mdist * mdist);
                ball.vx += (mdx / mdist) * force * dt;
                ball.vy += (mdy / mdist) * force * dt;
            }
        }

        // Sub-step physics for better collision at high speed
        var subSteps = 3;
        var subDt = dt / subSteps;

        for (var step = 0; step < subSteps; step++) {
            Physics.integrate(ball, subDt);

            // Wall bounce
            if (Physics.wallBounce(ball, 5, 395)) {
                Synth.wallHit();
            }

            // Peg collisions
            for (var i = 0; i < this.pegs.length; i++) {
                var peg = this.pegs[i];
                if (peg.hit && peg.alpha <= 0) continue;

                if (Physics.bounceBallOffCircle(ball, peg.x, peg.y, peg.r)) {
                    if (!peg.hit) {
                        peg.hit = true;
                        peg.glow = 1;
                        this.combo++;
                        this.pegsHitThisShot++;

                        // Score: base 10 * combo multiplier
                        var points = 10 * this.combo;
                        this.score += points;

                        Synth.pegHit(this.combo);
                        Particles.pegBurst(peg.x, peg.y, peg.type);
                        Particles.addPopup(peg.x, peg.y - 15, '+' + points, '#4af');

                        // Small shake
                        Particles.shake(2);

                        // Power-up handling
                        if (peg.type === 'explosive') {
                            this._explodePeg(peg);
                        } else if (peg.type === 'magnet') {
                            this.activeMagnets.push({ x: peg.x, y: peg.y });
                            Synth.magnet();
                        }
                    }
                }
            }

            // Bumper collisions
            for (var j = 0; j < this.bumpers.length; j++) {
                var bumper = this.bumpers[j];
                if (Physics.bounceBallOffBumper(ball, bumper.x, bumper.y, bumper.r)) {
                    bumper.flash = 1;
                    this.score += 5;
                    Synth.bumperHit();
                    Particles.bumperBurst(bumper.x, bumper.y);
                    Particles.shake(3);
                }
            }

            // Spinner collisions
            for (var k = 0; k < this.spinners.length; k++) {
                var sp = this.spinners[k];
                var x1 = sp.x + Math.cos(sp.angle) * sp.length;
                var y1 = sp.y + Math.sin(sp.angle) * sp.length;
                var x2 = sp.x - Math.cos(sp.angle) * sp.length;
                var y2 = sp.y - Math.sin(sp.angle) * sp.length;
                if (Physics.bounceBallOffLine(ball, x1, y1, x2, y2)) {
                    Synth.wallHit();
                    Particles.shake(1);
                }
            }
        }

        // Check if ball reached bottom (landing zone)
        if (ball.y >= 640) {
            this._ballLanded();
        }

        // Safety: ball fell way off screen
        if (ball.y > 750) {
            this._ballLanded();
        }
    }

    _explodePeg(sourcePeg) {
        var radius = 60;
        Synth.explode();
        Particles.explosion(sourcePeg.x, sourcePeg.y);
        Particles.shake(8);

        for (var i = 0; i < this.pegs.length; i++) {
            var peg = this.pegs[i];
            if (peg.hit) continue;
            var dx = peg.x - sourcePeg.x;
            var dy = peg.y - sourcePeg.y;
            if (Math.sqrt(dx * dx + dy * dy) < radius) {
                peg.hit = true;
                peg.glow = 1;
                this.combo++;
                this.pegsHitThisShot++;
                var points = 10 * this.combo;
                this.score += points;
                Particles.pegBurst(peg.x, peg.y, peg.type);
                Particles.addPopup(peg.x, peg.y - 15, '+' + points, '#f84');
            }
        }
    }

    _ballLanded() {
        this.ballActive = false;

        // Determine which zone the ball landed in
        var zone = null;
        if (this.ball) {
            for (var i = 0; i < this.zones.length; i++) {
                var z = this.zones[i];
                if (this.ball.x >= z.x && this.ball.x < z.x + z.width) {
                    zone = z;
                    break;
                }
            }
        }

        // Apply multiplier
        var multiplier = zone ? zone.multiplier : 1;
        var landingBonus = this.pegsHitThisShot * 10 * multiplier;
        this.score += landingBonus;

        if (zone) {
            Synth.landing(multiplier);
            Particles.addPopup(
                zone.x + zone.width / 2, zone.y - 10,
                multiplier + 'x! +' + landingBonus,
                multiplier >= 5 ? '#fa4' : '#4af'
            );
            if (multiplier >= 5) {
                Particles.shake(5);
                Particles.emit(zone.x + zone.width / 2, zone.y, 15, '#fa4', 100, 0.5);
            }
        }

        // Extra ball mechanic: hit 10+ pegs = +1 ball
        if (this.pegsHitThisShot >= 10) {
            this.balls++;
            this.extraBallTimer = 1.5;
            Synth.extraBall();
            Particles.addPopup(200, 60, '+1 BALL!', '#4f4');
        }

        this.ball = null;

        // Check round completion
        var remaining = Pegs.countRemaining(this.pegs);
        if (remaining <= 0) {
            // Round complete - bonus for clearing all pegs
            var clearBonus = 100 * this.round;
            this.score += clearBonus;
            Particles.addPopup(200, 300, 'CLEAR! +' + clearBonus, '#fa4');
            this._advanceRound();
            return;
        }

        // Check game over
        if (this.balls <= 0) {
            // Short delay before game over
            var self = this;
            setTimeout(function () {
                self.gameOver();
            }, 500);
        }
    }

    _updateZones(dt) {
        // Subtle sliding of zones
        var slideSpeed = 15 + this.round * 2;
        var slideAmount = Math.sin(this.time * 0.5) * slideSpeed * dt;
        // Zones don't actually move - the multiplier labels already have a pulse effect
        // This keeps it simple and readable
    }

    // ------- Render -------

    render() {
        var ctx = this.ctx;

        if (this.state === 'loading') {
            this.renderLoading();
            return;
        }

        Renderer.beginFrame(ctx, this.canvas.width, this.canvas.height);

        if (this.state === 'menu') {
            Renderer.drawMenu(ctx, this.time);
        } else if (this.state === 'playing') {
            this.renderPlaying();
        } else if (this.state === 'gameover') {
            this.renderGameOverScene();
        }

        Renderer.endFrame(ctx);
    }

    renderLoading() {
        var ctx = this.ctx;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#4af';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
    }

    renderPlaying() {
        var ctx = this.ctx;

        // Walls
        Renderer.drawWalls(ctx);

        // Landing zones
        Renderer.drawZones(ctx, this.zones, this.time);

        // Pegs
        for (var i = 0; i < this.pegs.length; i++) {
            Renderer.drawPeg(ctx, this.pegs[i], this.time);
        }

        // Bumpers
        for (var j = 0; j < this.bumpers.length; j++) {
            Renderer.drawBumper(ctx, this.bumpers[j]);
        }

        // Spinners
        for (var k = 0; k < this.spinners.length; k++) {
            Renderer.drawSpinner(ctx, this.spinners[k]);
        }

        // Trajectory preview
        if (this.aiming && this.trajectoryPoints.length > 0) {
            Renderer.drawTrajectory(ctx, this.trajectoryPoints);
        }

        // Ball
        if (this.ballActive && this.ball) {
            Renderer.drawBall(ctx, this.ball);
        }

        // Launcher
        Renderer.drawLauncher(ctx, this.launchX, this.aiming);

        // Aim line
        if (this.aiming && this.pointerDown) {
            Renderer.drawAimLine(ctx, this.dragStartX, this.dragStartY, this.pointerX, this.pointerY);
        }

        // Particles & popups
        Particles.draw(ctx);

        // HUD
        Renderer.drawHUD(ctx, this.score, this.balls, this.round, this.combo, this.pegsHitThisShot);

        // Extra ball notification
        Renderer.drawExtraBall(ctx, this.extraBallTimer);

        // Round transition overlay
        if (this.roundTransitionTimer > 0) {
            Renderer.drawRoundTransition(ctx, this.round, this.roundTransitionTimer);
        }
    }

    renderGameOverScene() {
        var ctx = this.ctx;

        // Draw the level behind the overlay
        Renderer.drawWalls(ctx);
        Renderer.drawZones(ctx, this.zones, this.time);
        for (var i = 0; i < this.pegs.length; i++) {
            Renderer.drawPeg(ctx, this.pegs[i], this.time);
        }

        Particles.draw(ctx);

        // Game over overlay
        Renderer.drawGameOver(ctx, this.score, this.round, this.bestScore, this.time);
    }
}
