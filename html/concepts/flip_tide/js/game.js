/**
 * Flip Tide - Main Game Logic
 * Gravity-flip endless runner through an underwater cave
 */

import { InputManager } from './input.js';

export const Config = {
    adsEnabled: false,

    // Virtual coordinate system
    VIRTUAL_W: 800,

    // Surfer
    SURFER_X_FRAC: 0.2,    // Fixed X position as fraction of virtual width

    // Lanes: fraction of virtual height (from top)
    SURFACE_FRAC: 0.35,
    CEILING_FRAC: 0.65,

    // Cave walls
    CAVE_TOP_FRAC: 0.10,
    CAVE_BOTTOM_FRAC: 0.90,

    // Difficulty ramp (distance 0 -> 20000)
    MAX_DISTANCE: 20000,
    SPEED_MIN: 200,
    SPEED_MAX: 440,
    GAP_SHRINK: 0.40,     // Gaps shrink by 40%
    CAVE_NARROW_MIN: 0.30, // Cave height fraction at start
    CAVE_NARROW_MAX: 0.14, // Cave height fraction at max difficulty

    // Obstacles
    FIRST_OBSTACLE_DIST: 200,
    CEILING_OBSTACLE_DIST: 500,
    OBSTACLE_SPACING_MIN: 180,
    OBSTACLE_SPACING_MAX: 350,
    OBSTACLE_WIDTH_MIN: 30,
    OBSTACLE_WIDTH_MAX: 55,

    // Riptide
    RIPTIDE_START_DIST: 5000,
    RIPTIDE_ZONE_WIDTH: 400,
    RIPTIDE_SPEED_MULT: -0.6, // Reverse at 60% speed

    // Scoring
    NEAR_MISS_DIST: 10,
    NEAR_MISS_BONUS: 5,
    SHELL_VALUE: 1,

    // Screen shake
    SHAKE_DEATH: 12,
    SHAKE_NEAR_MISS: 3,
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading';
        this.score = 0;
        this.lastTime = 0;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);

        // Game state
        this.distance = 0;
        this.scrollX = 0;
        this.speed = Config.SPEED_MIN;
        this.shells = 0;
        this.runShells = 0;
        this.bestDistance = 0;
        this.totalShells = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.isNewBest = false;

        // Scale
        this.scale = 1;
        this.vw = Config.VIRTUAL_W;
        this.vh = 450;

        // Cave dimensions (virtual coords)
        this.caveTop = 0;
        this.caveBottom = 0;
        this.surfaceY = 0;
        this.ceilingY = 0;

        // Surfer
        this.surfer = new Surfer();

        // World objects
        this.obstacles = [];
        this.shellItems = [];
        this.riptideZones = [];
        this.popups = [];

        // Spawning
        this.nextObstacleDist = Config.FIRST_OBSTACLE_DIST;
        this.nextShellDist = 100;
        this.nextRiptideDist = Config.RIPTIDE_START_DIST;
        this.lastObstacleLane = -1;

        // State flags
        this.inRiptide = false;
        this.riptideWarningTimer = 0;
        this.deathTimer = 0;

        // Screen shake
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;

        // Unlocked skins
        this.unlockedSkins = [true, false, false, false, false, false, false];
        this.selectedSkin = 0;

        // Load saved data
        this._loadSave();
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
        ParticlePool.init();
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Calculate scale to fit virtual width
        this.scale = this.canvas.width / Config.VIRTUAL_W;
        this.vh = this.canvas.height / this.scale;
        this._updateCaveDimensions();
    }

    _updateCaveDimensions() {
        var diff = this._difficulty();
        // Cave narrows with difficulty
        var caveFrac = Config.CAVE_NARROW_MIN + (Config.CAVE_NARROW_MAX - Config.CAVE_NARROW_MIN) * diff;
        var caveHeight = this.vh * caveFrac;
        var caveCenter = this.vh * 0.5;

        this.caveTop = caveCenter - this.vh * 0.4;
        this.caveBottom = caveCenter + this.vh * 0.4;

        // Surface and ceiling within the cave - narrow with difficulty
        var laneGap = caveHeight;
        this.surfaceY = caveCenter - laneGap / 2;
        this.ceilingY = caveCenter + laneGap / 2;
    }

    _difficulty() {
        return Math.min(this.distance / Config.MAX_DISTANCE, 1);
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

    // ---- State Transitions ----

    start() {
        this.state = 'playing';
        this.distance = 0;
        this.scrollX = 0;
        this.speed = Config.SPEED_MIN;
        this.runShells = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.isNewBest = false;
        this.inRiptide = false;
        this.riptideWarningTimer = 0;
        this.deathTimer = 0;
        this.shakeIntensity = 0;

        // Clear world
        this.obstacles = [];
        this.shellItems = [];
        this.riptideZones = [];
        this.popups = [];
        ParticlePool.clear();

        // Spawning
        this.nextObstacleDist = Config.FIRST_OBSTACLE_DIST;
        this.nextShellDist = 100;
        this.nextRiptideDist = Config.RIPTIDE_START_DIST;
        this.lastObstacleLane = -1;

        // Reset cave
        this._updateCaveDimensions();

        // Reset surfer
        this.surfer = new Surfer();
        this.surfer.x = Config.VIRTUAL_W * Config.SURFER_X_FRAC;
        this.surfer.y = this.surfaceY;
        this.surfer.targetY = this.surfaceY;
        this.surfer.lane = 0;
        this.surfer.skin = this.selectedSkin;

        GameAudio.initContext();
        GameAudio.resume();
        SFX.init();
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        this.surfer.dead = true;
        this.deathTimer = 0;

        // Check best
        if (this.distance > this.bestDistance) {
            this.bestDistance = this.distance;
            this.isNewBest = true;
        }

        // Add run shells to total
        this.totalShells += this.runShells;
        this._updateUnlocks();
        this._saveSave();

        // Death effects
        SFX.death();
        this.shakeIntensity = Config.SHAKE_DEATH;
        this._spawnDeathParticles();

        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                () => GameAudio.muteAll(),
                () => GameAudio.unmuteAll()
            );
        }
        this.start();
    }

    // ---- Update ----

    update(dt) {
        Renderer.update(dt);

        if (this.state === 'menu') {
            var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();
            if (confirm) this.start();
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.deathTimer += dt;
            ParticlePool.update(dt);
            this._updateShake(dt);
            this._updatePopups(dt);
            if (this.deathTimer > 0.8) {
                var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();
                if (confirm) this.restart();
            }
        }
    }

    updatePlaying(dt) {
        var diff = this._difficulty();

        // Update speed
        this.speed = Config.SPEED_MIN + (Config.SPEED_MAX - Config.SPEED_MIN) * diff;

        // Check riptide
        var effectiveSpeed = this.speed;
        var wasInRiptide = this.inRiptide;
        this.inRiptide = false;
        var surferWorldX = this.scrollX + this.surfer.x;
        for (var i = 0; i < this.riptideZones.length; i++) {
            var rz = this.riptideZones[i];
            if (rz.active && rz.containsX(surferWorldX)) {
                this.inRiptide = true;
                effectiveSpeed = this.speed * Config.RIPTIDE_SPEED_MULT;
                break;
            }
        }

        // Riptide enter/exit sounds + reset passed flags
        if (this.inRiptide && !wasInRiptide) {
            SFX.riptideEnter();
            // Reset passed flags so obstacles can collide again when revisited
            for (var i = 0; i < this.obstacles.length; i++) {
                this.obstacles[i].passed = false;
                this.obstacles[i].nearMissed = false;
            }
        }
        if (!this.inRiptide && wasInRiptide) SFX.riptideExit();

        // Scroll
        this.scrollX += effectiveSpeed * dt;
        this.distance += Math.abs(effectiveSpeed * dt);

        // Update cave dimensions (narrows over time)
        this._updateCaveDimensions();

        // Input - flip
        var tapped = this.input.wasPressed('Space') || this.input.wasPressed('Enter') || this.input.wasTapped();
        var holding = this.input.isDown('Space') || this.input.isDown('Enter') || this._isTouching();

        if (tapped) {
            this.surfer.startFlip(this.surfaceY, this.ceilingY);
            if (this.surfer.lane === 1) SFX.flip();
            else SFX.flipDown();
            this._spawnFlipParticles();
        }

        // Update surfer
        this.surfer.update(dt, this.surfaceY, this.ceilingY, holding);

        // Spawn obstacles
        this._spawnObstacles();

        // Spawn shells
        this._spawnShells();

        // Spawn riptide zones
        this._spawnRiptides();

        // Update riptide zones
        for (var i = 0; i < this.riptideZones.length; i++) {
            this.riptideZones[i].update(dt);
        }

        // Update shell items
        for (var i = 0; i < this.shellItems.length; i++) {
            this.shellItems[i].update(dt);
        }

        // Collision detection
        this._checkCollisions();

        // Cleanup offscreen objects
        this._cleanup();

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        // Particles
        ParticlePool.update(dt);

        // Spray particles from surfer
        this._spawnSprayParticles(dt);

        // Screen shake
        this._updateShake(dt);

        // Popups
        this._updatePopups(dt);

        // Riptide warning
        if (this.riptideWarningTimer > 0) {
            this.riptideWarningTimer -= dt;
        }

        // Milestone check
        this._checkMilestones();
    }

    _isTouching() {
        return this.input.isTouching();
    }

    // ---- Spawning ----

    _spawnObstacles() {
        var worldRight = this.scrollX + Config.VIRTUAL_W + 100;
        while (this.nextObstacleDist < worldRight) {
            var diff = this._difficulty();
            // Determine lane
            var lane;
            if (this.nextObstacleDist < Config.CEILING_OBSTACLE_DIST) {
                lane = 0; // Only surface obstacles early on
            } else {
                // Alternate with some randomness
                if (this.lastObstacleLane === -1) {
                    lane = Math.random() < 0.5 ? 0 : 1;
                } else {
                    // Higher chance to alternate
                    lane = Math.random() < 0.7 ? (1 - this.lastObstacleLane) : this.lastObstacleLane;
                }
            }
            this.lastObstacleLane = lane;

            // Obstacle width grows with difficulty
            var width = Config.OBSTACLE_WIDTH_MIN + (Config.OBSTACLE_WIDTH_MAX - Config.OBSTACLE_WIDTH_MIN) * diff;
            width += (Math.random() - 0.5) * 10;

            var obs = new Obstacle(this.nextObstacleDist, lane, 0, 0);
            obs.width = width;
            this.obstacles.push(obs);

            // Next obstacle spacing - decreases with difficulty
            var spacing = Config.OBSTACLE_SPACING_MAX - (Config.OBSTACLE_SPACING_MAX - Config.OBSTACLE_SPACING_MIN) * diff;
            spacing += (Math.random() - 0.5) * 60;
            this.nextObstacleDist += Math.max(spacing, Config.OBSTACLE_SPACING_MIN);
        }
    }

    _spawnShells() {
        var worldRight = this.scrollX + Config.VIRTUAL_W + 100;
        while (this.nextShellDist < worldRight) {
            // Place shells in risky positions (between lanes or near obstacles)
            var y;
            var lane = Math.random() < 0.5 ? 0 : 1;
            if (lane === 0) {
                y = this.surfaceY + (Math.random() - 0.5) * 20;
            } else {
                y = this.ceilingY + (Math.random() - 0.5) * 20;
            }
            // Sometimes in the middle (very risky)
            if (Math.random() < 0.2) {
                y = (this.surfaceY + this.ceilingY) / 2 + (Math.random() - 0.5) * 30;
            }

            var shell = new Shell(this.nextShellDist, y);
            this.shellItems.push(shell);

            this.nextShellDist += 200 + Math.random() * 300;
        }
    }

    _spawnRiptides() {
        if (this.distance < Config.RIPTIDE_START_DIST) return;
        var worldRight = this.scrollX + Config.VIRTUAL_W + 200;
        while (this.nextRiptideDist < worldRight) {
            var rz = new RiptideZone(this.nextRiptideDist, Config.RIPTIDE_ZONE_WIDTH);
            this.riptideZones.push(rz);

            // Warn player
            this.riptideWarningTimer = 1.5;

            this.nextRiptideDist += 2000 + Math.random() * 3000;
        }
    }

    // ---- Collisions ----

    _checkCollisions() {
        // Surfer hitbox in world coordinates
        var surferWorldX = this.scrollX + this.surfer.x;
        var hb = {
            x: surferWorldX - this.surfer.width * 0.4,
            y: this.surfer.y - this.surfer.height * 0.4,
            w: this.surfer.width * 0.8,
            h: this.surfer.height * 0.8
        };

        // Obstacles
        for (var i = 0; i < this.obstacles.length; i++) {
            var obs = this.obstacles[i];
            if (!obs.active || obs.passed) continue;

            var boxes = obs.getHitboxes(this.surfaceY, this.ceilingY, this.caveTop, this.caveBottom);
            for (var j = 0; j < boxes.length; j++) {
                var b = boxes[j];
                if (this._aabbOverlap(hb, b)) {
                    this.gameOver();
                    return;
                }
            }

            // Near miss: only when surfer is flipping or just finished flipping
            if (!obs.nearMissed && !obs.passed && this.surfer.flipping) {
                var obsDist = Math.abs(surferWorldX - obs.x);
                if (obsDist < obs.width / 2 + Config.NEAR_MISS_DIST) {
                    obs.nearMissed = true;
                    this._nearMiss(obs);
                }
            }

            // Mark as passed
            if (obs.x < surferWorldX - obs.width) {
                obs.passed = true;
            }
        }

        // Shell collection
        for (var i = 0; i < this.shellItems.length; i++) {
            var shell = this.shellItems[i];
            if (shell.collected || !shell.active) continue;

            var shellBox = {
                x: shell.x - shell.size,
                y: shell.y - shell.size,
                w: shell.size * 2,
                h: shell.size * 2
            };

            if (this._aabbOverlap(hb, shellBox)) {
                shell.collected = true;
                this.runShells += Config.SHELL_VALUE;
                this.combo++;
                this.comboTimer = 2;
                SFX.collect();
                this._spawnCollectParticles(shell.x - this.scrollX, shell.y);
                this._addPopup(shell.x - this.scrollX, shell.y - 15, '+' + (Config.SHELL_VALUE * this.combo), '#FFD700');
            }
        }

        // Cave wall collision
        if (this.surfer.y - this.surfer.height / 2 < this.caveTop + 5 ||
            this.surfer.y + this.surfer.height / 2 > this.caveBottom - 5) {
            this.gameOver();
            return;
        }
    }

    _aabbOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    }

    _nearMiss(obs) {
        this.distance += Config.NEAR_MISS_BONUS;
        this.surfer.nearMissTimer = 0.5;
        SFX.nearMiss();
        this.shakeIntensity = Math.max(this.shakeIntensity, Config.SHAKE_NEAR_MISS);
        this._addPopup(this.surfer.x, this.surfer.y - 25, 'CLOSE!', 'rgba(255, 255, 100, 1)');
    }

    // ---- Cleanup ----

    _cleanup() {
        var cutoff = this.scrollX - 100;
        this.obstacles = this.obstacles.filter(function(o) { return o.x > cutoff; });
        this.shellItems = this.shellItems.filter(function(s) { return s.x > cutoff && !s.collected; });
        this.riptideZones = this.riptideZones.filter(function(r) { return r.x + r.width > cutoff; });
    }

    // ---- Particles ----

    _spawnFlipParticles() {
        for (var i = 0; i < 8; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 30 + Math.random() * 60;
            ParticlePool.spawn(
                this.surfer.x, this.surfer.y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                0.3 + Math.random() * 0.3,
                100, 200, 255, 3
            );
        }
    }

    _spawnDeathParticles() {
        for (var i = 0; i < 30; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 50 + Math.random() * 150;
            ParticlePool.spawn(
                this.surfer.x, this.surfer.y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                0.5 + Math.random() * 0.5,
                255, 80 + Math.random() * 100, 50,
                2 + Math.random() * 4, 'square'
            );
        }
    }

    _spawnCollectParticles(x, y) {
        for (var i = 0; i < 10; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 40 + Math.random() * 80;
            ParticlePool.spawn(
                x, y,
                Math.cos(angle) * speed, Math.sin(angle) * speed,
                0.4 + Math.random() * 0.3,
                255, 215, 0, 2 + Math.random() * 3
            );
        }
    }

    _spawnSprayParticles(dt) {
        if (this.surfer.dead) return;
        // Spray behind surfer
        if (Math.random() < dt * 30) {
            var dir = this.surfer.lane === 0 ? -1 : 1;
            ParticlePool.spawn(
                this.surfer.x - 15 + Math.random() * 5,
                this.surfer.y + dir * 6,
                -20 - Math.random() * 30, dir * (10 + Math.random() * 20),
                0.2 + Math.random() * 0.2,
                150, 220, 255, 2
            );
        }
    }

    // ---- Popups ----

    _addPopup(x, y, text, color) {
        this.popups.push({
            x: x, y: y, text: text, color: color || '#fff',
            life: 1, size: 16, alpha: 1, vy: -40
        });
    }

    _updatePopups(dt) {
        for (var i = this.popups.length - 1; i >= 0; i--) {
            var p = this.popups[i];
            p.life -= dt;
            p.y += p.vy * dt;
            p.alpha = Math.max(0, p.life);
            if (p.life <= 0) {
                this.popups.splice(i, 1);
            }
        }
    }

    // ---- Screen Shake ----

    _updateShake(dt) {
        if (this.shakeIntensity > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeIntensity *= Math.pow(0.05, dt); // Decay
            if (this.shakeIntensity < 0.5) {
                this.shakeIntensity = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            }
        }
    }

    // ---- Milestones ----

    _checkMilestones() {
        var milestones = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000];
        for (var i = 0; i < milestones.length; i++) {
            var m = milestones[i];
            if (this.distance >= m && this.distance - this.speed * 0.02 < m) {
                SFX.milestone();
                this._addPopup(Config.VIRTUAL_W / 2, this.vh * 0.2, m + 'm!', '#00BFFF');
                // Burst of particles
                for (var j = 0; j < 15; j++) {
                    var angle = Math.random() * Math.PI * 2;
                    var speed = 60 + Math.random() * 100;
                    ParticlePool.spawn(
                        Config.VIRTUAL_W / 2, this.vh * 0.2,
                        Math.cos(angle) * speed, Math.sin(angle) * speed,
                        0.5 + Math.random() * 0.3,
                        0, 191, 255, 3
                    );
                }
                break;
            }
        }
    }

    // ---- Render ----

    render() {
        var ctx = this.ctx;
        var cw = this.canvas.width;
        var ch = this.canvas.height;

        // Clear
        ctx.clearRect(0, 0, cw, ch);

        ctx.save();

        // Apply scale and shake
        ctx.translate(this.shakeX * this.scale, this.shakeY * this.scale);
        ctx.scale(this.scale, this.scale);

        if (this.state === 'loading') {
            this._renderLoading(ctx);
        } else if (this.state === 'menu') {
            Renderer.drawMenu(ctx, this.vw, this.vh);
        } else if (this.state === 'playing') {
            this._renderPlaying(ctx);
        } else if (this.state === 'gameover') {
            this._renderPlaying(ctx); // Keep game visible
            Renderer.drawGameOver(ctx, this.vw, this.vh,
                this.distance, this.bestDistance, this.runShells, this.totalShells, this.isNewBest);
        }

        ctx.restore();
    }

    _renderLoading(ctx) {
        ctx.fillStyle = '#0a1628';
        ctx.fillRect(0, 0, this.vw, this.vh);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', this.vw / 2, this.vh / 2);
    }

    _renderPlaying(ctx) {
        // Background
        Renderer.drawBackground(ctx, this.vw, this.vh,
            this.caveTop, this.caveBottom, this.surfaceY, this.ceilingY,
            this.scrollX, this.riptideZones, this.inRiptide);

        // Obstacles
        for (var i = 0; i < this.obstacles.length; i++) {
            Renderer.drawObstacle(ctx, this.obstacles[i], this.scrollX,
                this.surfaceY, this.ceilingY, this.caveTop, this.caveBottom);
        }

        // Shells
        for (var i = 0; i < this.shellItems.length; i++) {
            Renderer.drawShell(ctx, this.shellItems[i], this.scrollX);
        }

        // Particles
        Renderer.drawParticles(ctx, ParticlePool.active);

        // Surfer
        var skin = SKINS[this.surfer.skin] || SKINS[0];
        Renderer.drawSurfer(ctx, this.surfer, skin);

        // Popups
        Renderer.drawPopups(ctx, this.popups);

        // Riptide warning
        if (this.riptideWarningTimer > 0) {
            Renderer.drawRiptideWarning(ctx, this.vw, this.vh, this.caveTop, this.caveBottom);
        }

        // HUD (always on top)
        Renderer.drawHUD(ctx, this.vw, this.vh,
            this.distance, this.runShells, this.bestDistance, this.combo, this.surfer);
    }

    // ---- Save/Load ----

    _saveSave() {
        try {
            var data = {
                bestDistance: this.bestDistance,
                totalShells: this.totalShells,
                unlockedSkins: this.unlockedSkins,
                selectedSkin: this.selectedSkin
            };
            localStorage.setItem('fliptide_save', JSON.stringify(data));
        } catch (e) {}
    }

    _loadSave() {
        try {
            var raw = localStorage.getItem('fliptide_save');
            if (raw) {
                var data = JSON.parse(raw);
                this.bestDistance = data.bestDistance || 0;
                this.totalShells = data.totalShells || 0;
                this.unlockedSkins = data.unlockedSkins || [true, false, false, false, false, false, false];
                this.selectedSkin = data.selectedSkin || 0;
            }
        } catch (e) {}
    }

    _updateUnlocks() {
        for (var i = 0; i < SKINS.length; i++) {
            if (this.totalShells >= SKINS[i].cost) {
                this.unlockedSkins[i] = true;
            }
        }
        // Auto-select newest unlock
        for (var i = SKINS.length - 1; i >= 0; i--) {
            if (this.unlockedSkins[i]) {
                this.selectedSkin = i;
                break;
            }
        }
    }
}
