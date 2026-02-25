/**
 * Shrink Ray - Core game logic
 * State machine, spawning, collisions, scoring, input handling
 */

import { InputManager } from './input.js';

/** Config */
export const Config = {
    adsEnabled: false,
};

// Difficulty tiers: [minTime, spawnInterval, obstacleSpeedMult, maxRicochets]
var TIERS = [
    [0,    1.8,  1.0,  8 ],
    [20,   1.5,  1.05, 10],
    [40,   1.3,  1.1,  12],
    [60,   1.1,  1.15, 15],
    [80,   1.0,  1.2,  18],
    [100,  0.9,  1.25, 20],
    [130,  0.8,  1.3,  24],
    [160,  0.7,  1.35, 28],
    [200,  0.6,  1.4,  32],
    [250,  0.55, 1.45, 36],
    [300,  0.5,  1.5,  40]
];

var COMBO_WINDOW = 1.5; // seconds to maintain combo
var COMBO_MAX = 5;
var GRAZE_DISTANCE = 30; // pixels for near-miss detection
var GRAZE_COOLDOWN = 0.5;
var PICKUP_INTERVAL_MIN = 18; // seconds between pickup spawns
var PICKUP_INTERVAL_MAX = 30;
var REVERSE_RAY_DURATION = 8; // seconds

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading';
        this.score = 0;
        this.highScore = 0;
        this.lastTime = 0;
        this.totalTime = 0; // total time for menu animations

        // Touch/pointer state
        this.pointerX = 0;
        this.pointerY = 0;
        this.pointerDown = false;
        this.pointerMoved = false;
        this.pointerStartX = 0;
        this.pointerStartY = 0;
        this.isTouchDevice = false;
        this.lastTapX = 0;
        this.lastTapY = 0;
        this.hasTap = false;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);

        this._setupPointerInput();
    }

    _setupPointerInput() {
        var self = this;
        var canvas = this.canvas;

        // Detect touch
        canvas.addEventListener('touchstart', function(e) {
            self.isTouchDevice = true;
            if (e.touches.length > 0) {
                var t = e.touches[0];
                self.pointerX = t.clientX;
                self.pointerY = t.clientY;
                self.pointerDown = true;
                self.pointerMoved = false;
                self.pointerStartX = t.clientX;
                self.pointerStartY = t.clientY;
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', function(e) {
            if (e.touches.length > 0) {
                var t = e.touches[0];
                self.pointerX = t.clientX;
                self.pointerY = t.clientY;
                var dx = t.clientX - self.pointerStartX;
                var dy = t.clientY - self.pointerStartY;
                if (dx * dx + dy * dy > 100) { // 10px threshold
                    self.pointerMoved = true;
                }
            }
        }, { passive: true });

        canvas.addEventListener('touchend', function(e) {
            self.pointerDown = false;
            // If didn't move much, it's a tap
            if (!self.pointerMoved) {
                self.lastTapX = self.pointerX;
                self.lastTapY = self.pointerY;
                self.hasTap = true;
            }
        }, { passive: true });

        // Mouse
        canvas.addEventListener('mousemove', function(e) {
            if (!self.isTouchDevice) {
                self.pointerX = e.clientX;
                self.pointerY = e.clientY;
            }
        });

        canvas.addEventListener('mousedown', function(e) {
            if (!self.isTouchDevice) {
                self.pointerDown = true;
                self.pointerStartX = e.clientX;
                self.pointerStartY = e.clientY;
                self.pointerMoved = false;
                self.lastTapX = e.clientX;
                self.lastTapY = e.clientY;
                self.hasTap = true;
            }
        });

        canvas.addEventListener('mouseup', function(e) {
            if (!self.isTouchDevice) {
                self.pointerDown = false;
            }
        });
    }

    async init() {
        // Load high score
        try {
            var saved = localStorage.getItem('shrinkray_best');
            if (saved) this.highScore = parseInt(saved, 10) || 0;
        } catch (e) {}

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
        this.totalTime += dt;

        this.update(dt);
        this.render();
        this.input.endFrame();
        this.hasTap = false;

        requestAnimationFrame(this._boundLoop);
    }

    // ---- State transitions ----

    start() {
        this.state = 'playing';
        this.score = 0;
        this.playTime = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.isNewBest = false;

        // Entity arrays
        this.obstacles = [];
        this.ricochets = [];
        this.beams = [];
        this.pickups = [];
        this.particles = [];
        this.floatingTexts = [];

        // Player
        this.player = new Player(this.canvas.width, this.canvas.height);
        this.player.invulnTimer = 1.0; // 1 second invuln at start

        // Spawning
        this.spawnTimer = 1.5; // first obstacle after 1.5s
        this.pickupTimer = PICKUP_INTERVAL_MIN + Math.random() * (PICKUP_INTERVAL_MAX - PICKUP_INTERVAL_MIN);
        this.currentTier = 0;

        // Graze
        this.grazeCooldown = 0;

        // Death
        this.deathTimer = 0;
        this.deathX = 0;
        this.deathY = 0;

        Synth.init();
        Synth.resume();
        GameAudio.initContext();
        GameAudio.resume();
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        this.deathTimer = 0;

        // Screen shake
        Renderer.shake(12, 0.4);
        Synth.death();

        // Death particles
        for (var i = 0; i < 30; i++) {
            this.particles.push(new Particle(
                this.player.x, this.player.y,
                i % 2 === 0 ? '#00e5ff' : '#fff',
                { speed: 100 + Math.random() * 200, life: 0.5 + Math.random() * 0.5, gravity: 200 }
            ));
        }

        // Check high score
        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            this.isNewBest = true;
            try { localStorage.setItem('shrinkray_best', String(this.highScore)); } catch (e) {}
        }

        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { Synth.mute(); GameAudio.muteAll(); },
                function() { Synth.unmute(); GameAudio.unmuteAll(); }
            );
        }
        this.start();
    }

    // ---- Update ----

    update(dt) {
        if (this.state === 'menu') {
            if (this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.hasTap || this.input.wasTapped()) {
                Synth.init();
                Synth.click();
                this.start();
            }
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.deathTimer += dt;
            this.updateEffects(dt);
            // Delay restart input by 0.8s to prevent accidental restart
            if (this.deathTimer > 0.8) {
                if (this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.hasTap || this.input.wasTapped()) {
                    Synth.click();
                    this.restart();
                }
            }
        }
    }

    updatePlaying(dt) {
        var w = this.canvas.width;
        var h = this.canvas.height;
        this.playTime += dt;

        // Update difficulty tier
        for (var t = TIERS.length - 1; t >= 0; t--) {
            if (this.playTime >= TIERS[t][0]) {
                this.currentTier = t;
                break;
            }
        }
        var tier = TIERS[this.currentTier];

        // ---- Input: player movement ----
        var useKeyboard = this.input.isUp() || this.input.isDownKey();
        if (this.isTouchDevice && this.pointerDown && this.pointerMoved) {
            // Touch drag - move to pointer Y
            this.player.update(dt, h, this.pointerY, false, false, false);
        } else if (useKeyboard) {
            this.player.update(dt, h, this.player.y, true, this.input.isUp(), this.input.isDownKey());
        } else if (!this.isTouchDevice) {
            // Desktop mouse follow
            this.player.update(dt, h, this.pointerY, false, false, false);
        } else {
            this.player.update(dt, h, this.player.y, false, false, false);
        }

        // ---- Input: shrink / reverse ray tap ----
        // hasTap covers both touch (via touchend) and mouse (via mousedown)
        // We use hasTap exclusively during gameplay so we have coordinates
        if (this.hasTap) {
            var tapX = this.lastTapX;
            var tapY = this.lastTapY;
            var expand = this.isTouchDevice ? 15 : 0;

            this._handleTap(tapX, tapY, expand);
        }

        // ---- Spawn obstacles ----
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = tier[1] * (0.8 + Math.random() * 0.4);
            this.obstacles.push(new Obstacle(w, h, this.currentTier, this.isTouchDevice, tier[2]));
        }

        // ---- Spawn pickups ----
        this.pickupTimer -= dt;
        if (this.pickupTimer <= 0) {
            this.pickupTimer = PICKUP_INTERVAL_MIN + Math.random() * (PICKUP_INTERVAL_MAX - PICKUP_INTERVAL_MIN);
            this.pickups.push(new Pickup(w, h));
        }

        // ---- Update obstacles ----
        for (var i = this.obstacles.length - 1; i >= 0; i--) {
            var obs = this.obstacles[i];
            obs.update(dt);
            if (!obs.alive || obs.isOffScreen(w)) {
                // If obstacle went off left edge without being shrunk, no penalty - just remove
                this.obstacles.splice(i, 1);
                continue;
            }
            // Collision with player
            if (this.player.invulnTimer <= 0 && obs.collidePlayer(this.player)) {
                this.deathX = this.player.x;
                this.deathY = this.player.y;
                this.gameOver();
                return;
            }
        }

        // ---- Update ricochets ----
        for (var i = this.ricochets.length - 1; i >= 0; i--) {
            var ric = this.ricochets[i];
            ric.update(dt, w, h);
            if (!ric.alive) {
                this.ricochets.splice(i, 1);
                continue;
            }
            // Collision with player
            if (this.player.invulnTimer <= 0 && !ric.growing && ric.collidePlayer(this.player)) {
                this.deathX = this.player.x;
                this.deathY = this.player.y;
                this.gameOver();
                return;
            }
        }

        // ---- Graze detection (near-miss scoring) ----
        this.grazeCooldown -= dt;
        if (this.grazeCooldown < 0) this.grazeCooldown = 0;
        if (this.grazeCooldown <= 0) {
            var grazed = false;
            // Check ricochets for graze
            for (var i = 0; i < this.ricochets.length; i++) {
                var ric = this.ricochets[i];
                if (ric.growing) continue;
                var dx = this.player.x - ric.x;
                var dy = this.player.y - ric.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < GRAZE_DISTANCE + ric.r && !ric.collidePlayer(this.player)) {
                    grazed = true;
                    break;
                }
            }
            if (grazed) {
                this.score += 5;
                this.grazeCooldown = GRAZE_COOLDOWN;
                this.floatingTexts.push(new FloatingText(
                    this.player.x, this.player.y - 30, 'GRAZE +5', '#00e5ff', 14
                ));
                Synth.graze();
            }
        }

        // ---- Update pickups ----
        for (var i = this.pickups.length - 1; i >= 0; i--) {
            var pk = this.pickups[i];
            pk.update(dt);
            if (!pk.alive) {
                this.pickups.splice(i, 1);
                continue;
            }
            if (pk.collidePlayer(this.player)) {
                this.player.hasReverseRay = true;
                this.player.reverseRayTimer = REVERSE_RAY_DURATION;
                this.pickups.splice(i, 1);
                Synth.pickup();
                this.floatingTexts.push(new FloatingText(
                    pk.x, pk.y, 'REVERSE RAY!', '#2ecc71', 22
                ));
                // Particles
                for (var j = 0; j < 12; j++) {
                    this.particles.push(new Particle(pk.x, pk.y, '#2ecc71', { speed: 80 + Math.random() * 60 }));
                }
            }
        }

        // ---- Combo timer ----
        if (this.combo > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
                this.comboTimer = 0;
            }
        }

        // ---- Cap ricochets ----
        while (this.ricochets.length > tier[3]) {
            // Remove oldest
            this.ricochets.shift();
        }

        // ---- Update effects ----
        this.updateEffects(dt);

        // ---- Update screen shake ----
        Renderer.updateShake(dt);
    }

    updateEffects(dt) {
        // Beams
        for (var i = this.beams.length - 1; i >= 0; i--) {
            this.beams[i].update(dt);
            if (!this.beams[i].alive) this.beams.splice(i, 1);
        }
        // Particles
        for (var i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (!this.particles[i].alive) this.particles.splice(i, 1);
        }
        // Floating texts
        for (var i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update(dt);
            if (!this.floatingTexts[i].alive) this.floatingTexts.splice(i, 1);
        }
        Renderer.updateShake(dt);
    }

    _handleTap(tapX, tapY, expand) {
        // First check: if we have reverse ray, check ricochets first
        if (this.player.hasReverseRay) {
            for (var i = this.ricochets.length - 1; i >= 0; i--) {
                var ric = this.ricochets[i];
                if (ric.growing) continue;
                if (ric.hitTest(tapX, tapY, expand + 15)) {
                    // Reverse ray - re-grow this ricochet
                    ric.growing = true;
                    ric.growTimer = 0;
                    this.player.hasReverseRay = false;
                    this.player.reverseRayTimer = 0;

                    // Beam
                    this.beams.push(new Beam(this.player.x + this.player.w / 2, this.player.y, ric.x, ric.y));

                    Synth.reverseRay();
                    Renderer.shake(4, 0.15);
                    this.floatingTexts.push(new FloatingText(ric.x, ric.y - 15, 'REVERSED!', '#2ecc71', 18));

                    // Particles
                    for (var j = 0; j < 8; j++) {
                        this.particles.push(new Particle(ric.x, ric.y, '#2ecc71'));
                    }
                    return;
                }
            }
        }

        // Check obstacles for shrink
        for (var i = this.obstacles.length - 1; i >= 0; i--) {
            var obs = this.obstacles[i];
            if (obs.shrinking) continue;
            if (obs.hitTest(tapX, tapY, expand)) {
                this._shrinkObstacle(obs, i);
                return;
            }
        }
    }

    _shrinkObstacle(obs, idx) {
        // Start shrink animation
        obs.shrinking = true;
        obs.shrinkTimer = 0;

        // Beam effect
        this.beams.push(new Beam(
            this.player.x + this.player.w / 2, this.player.y,
            obs.x, obs.y
        ));

        // Scoring: area-based points with combo multiplier
        var area = obs.r * obs.r;
        var basePoints = Math.floor(area / 40) + obs.points;
        this.combo++;
        if (this.combo > COMBO_MAX) this.combo = COMBO_MAX;
        this.comboTimer = COMBO_WINDOW;
        var multiplier = this.combo;
        var points = basePoints * multiplier;
        this.score += points;

        // Floating text
        var txt = '+' + points;
        if (multiplier > 1) txt += ' x' + multiplier;
        var textColor = multiplier >= 5 ? '#f1c40f' : multiplier >= 3 ? '#e67e22' : '#fff';
        this.floatingTexts.push(new FloatingText(obs.x, obs.y - obs.r - 10, txt, textColor, 16 + multiplier * 2));

        // Spawn ricochet
        var ric = new Ricochet(obs, this.canvas.width, this.canvas.height);
        this.ricochets.push(ric);

        // Particles (shrink burst)
        for (var j = 0; j < 10; j++) {
            this.particles.push(new Particle(obs.x, obs.y, obs.color, {
                speed: 50 + Math.random() * 100
            }));
        }

        // Shake proportional to size
        Renderer.shake(2 + obs.r / 15, 0.1);

        // Sound
        Synth.shrink();
        if (this.combo > 1) {
            Synth.combo(this.combo);
        }
    }

    // ---- Render ----

    render() {
        if (this.state === 'loading') this.renderLoading();
        else if (this.state === 'menu') this.renderMenu();
        else if (this.state === 'playing') this.renderPlaying();
        else if (this.state === 'gameover') this.renderGameOverState();
    }

    renderLoading() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#00e5ff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', w / 2, h / 2);
    }

    renderMenu() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        Renderer.drawMenu(ctx, w, h, this.totalTime, this.highScore);
    }

    renderPlaying() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.save();
        Renderer.applyShake(ctx);

        // Background
        Renderer.drawBackground(ctx, w, h, this.totalTime);

        // Beams (behind everything)
        for (var i = 0; i < this.beams.length; i++) {
            Renderer.drawBeam(ctx, this.beams[i]);
        }

        // Pickups
        for (var i = 0; i < this.pickups.length; i++) {
            Renderer.drawPickup(ctx, this.pickups[i]);
        }

        // Obstacles
        for (var i = 0; i < this.obstacles.length; i++) {
            Renderer.drawObstacle(ctx, this.obstacles[i]);
        }

        // Ricochets
        for (var i = 0; i < this.ricochets.length; i++) {
            Renderer.drawRicochet(ctx, this.ricochets[i]);
        }

        // Player
        Renderer.drawPlayer(ctx, this.player);

        // Particles
        for (var i = 0; i < this.particles.length; i++) {
            Renderer.drawParticle(ctx, this.particles[i]);
        }

        // Floating texts
        for (var i = 0; i < this.floatingTexts.length; i++) {
            Renderer.drawFloatingText(ctx, this.floatingTexts[i]);
        }

        ctx.restore();

        // HUD (not affected by shake)
        Renderer.drawHUD(ctx, w, h, this.score, this.combo, this.comboTimer, COMBO_WINDOW,
            this.highScore, this.ricochets.length,
            this.player.hasReverseRay, this.player.reverseRayTimer, this.playTime);

        // Crosshair (desktop only)
        if (!this.isTouchDevice) {
            Renderer.drawCrosshair(ctx, this.pointerX, this.pointerY);
        }
    }

    renderGameOverState() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.save();
        Renderer.applyShake(ctx);

        // Draw frozen game state behind overlay
        Renderer.drawBackground(ctx, w, h, this.totalTime);

        // Still-alive ricochets continue bouncing visually
        for (var i = 0; i < this.ricochets.length; i++) {
            Renderer.drawRicochet(ctx, this.ricochets[i]);
        }
        for (var i = 0; i < this.obstacles.length; i++) {
            Renderer.drawObstacle(ctx, this.obstacles[i]);
        }

        // Particles
        for (var i = 0; i < this.particles.length; i++) {
            Renderer.drawParticle(ctx, this.particles[i]);
        }
        for (var i = 0; i < this.floatingTexts.length; i++) {
            Renderer.drawFloatingText(ctx, this.floatingTexts[i]);
        }

        ctx.restore();

        // Game over overlay
        Renderer.drawGameOver(ctx, w, h, this.score, this.highScore, this.isNewBest, this.totalTime);
    }
}
