/**
 * Snip Snap - Cut ropes to crush goblin camps
 * Main game class with state machine and Poki lifecycle
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

        // States: loading, menu, levelselect, playing, watching, result
        this.state = 'loading';
        this.score = 0;
        this.lastTime = 0;
        this.time = 0;

        // Level state
        this.currentLevel = 1;
        this.cuts = 0;

        // Object arrays (populated per level)
        this.boulders = [];
        this.ropes = [];
        this.platforms = [];
        this.camps = [];
        this.breakables = [];
        this.seesaws = [];
        this.walls = [];
        this.cradles = [];

        // Watching state
        this.settleTimer = 0;
        this.SETTLE_DELAY = 1.5;
        this.watchTimer = 0;
        this.MAX_WATCH_TIME = 8;

        // Result state
        this.resultAlpha = 0;
        this.resultStars = 0;
        this.starRevealTimer = 0;

        // Level select
        this.levelSelectPage = 0;

        // Progress (from localStorage)
        this.progress = {
            maxLevel: 1,
            stars: {}
        };
        this._loadProgress();

        // Mouse/touch tracking for UI
        this._clickX = 0;
        this._clickY = 0;
        this._clicked = false;

        // Collision handler ref
        this._collisionHandler = null;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);

        // Track clicks/taps for UI buttons
        this._setupClickTracking();
    }

    _setupClickTracking() {
        var self = this;
        this.canvas.addEventListener('mousedown', function(e) {
            self._clickX = e.clientX;
            self._clickY = e.clientY;
            self._clicked = true;
        });
        this.canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length > 0) {
                self._clickX = e.touches[0].clientX;
                self._clickY = e.touches[0].clientY;
                self._clicked = true;
            }
        }, { passive: true });
    }

    async init() {
        await Poki.init();
        this._resize();

        // Init subsystems
        Physics.init();
        Camera.init(this.canvas.width, this.canvas.height);
        CutSystem.init(this.canvas);
        SFX.init();

        await this.loadAssets();
        Poki.gameLoadingFinished();
        this.state = 'menu';
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);
    }

    async loadAssets() {
        // No file assets - all procedural
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (typeof Camera !== 'undefined') {
            Camera.resize(this.canvas.width, this.canvas.height);
        }
    }

    _loop(now) {
        var dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = now;
        this.time += dt;

        this.update(dt);
        this.render();
        this.input.endFrame();
        this._clicked = false;

        requestAnimationFrame(this._boundLoop);
    }

    // ---- STATE TRANSITIONS ----

    async showAd() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { GameAudio.muteAll(); SFX.mute(); },
                function() { GameAudio.unmuteAll(); SFX.unmute(); }
            );
        }
    }

    goToMenu() {
        this.state = 'menu';
        Poki.gameplayStop();
    }

    goToLevelSelect() {
        this.state = 'levelselect';
        this.levelSelectPage = Math.floor((this.currentLevel - 1) / 10);
        UI.clear();
    }

    startLevel(levelNum) {
        this.currentLevel = levelNum;
        this.cuts = 0;
        this.settleTimer = 0;
        this.watchTimer = 0;
        this.resultAlpha = 0;
        this.resultStars = 0;
        this.starRevealTimer = 0;

        // Clear physics
        Physics.clear();
        Particles.clear();

        // Build level
        var data = Levels.build(levelNum);
        this.boulders = data.boulders;
        this.ropes = data.ropes;
        this.platforms = data.platforms;
        this.camps = data.camps;
        this.breakables = data.breakables;
        this.seesaws = data.seesaws;
        this.walls = data.walls;
        this.cradles = data.cradles || [];

        // Setup camera
        Camera.frameLevelInstant();

        // Setup collision handling
        this._setupCollisions();

        this.state = 'playing';
        UI.clear();

        GameAudio.initContext();
        GameAudio.resume();
        Poki.gameplayStart();
    }

    _setupCollisions() {
        var self = this;
        if (this._collisionHandler) {
            Physics.offCollision(this._collisionHandler);
        }
        this._collisionHandler = function(event) {
            var pairs = event.pairs;
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i];
                var a = pair.bodyA;
                var b = pair.bodyB;

                // Identify boulder and other body
                var boulder = null;
                var other = null;
                if (a.gameType === 'boulder') { boulder = a; other = b; }
                else if (b.gameType === 'boulder') { boulder = b; other = a; }

                if (boulder) {
                    var speed = boulder.speed;

                    // Impact particles and sound
                    if (speed > 2) {
                        var intensity = Math.min(speed / 8, 2);
                        Particles.impact(boulder.position.x, boulder.position.y, intensity);
                        SFX.boulderImpact(intensity);
                        Camera.shake(intensity * 3, 0.15);
                    }

                    // Boulder hits goblin camp
                    if (other.gameType === 'goblin_camp' && !other.destroyed && speed > 1) {
                        self._destroyCamp(other);
                    }

                    // Boulder hits breakable
                    if (other.gameType === 'breakable' && !other.broken && speed > 2) {
                        self._breakPlatform(other);
                    }

                    // Explosive boulder detonation
                    if (boulder.boulderType === 'explosive' && !boulder.hasExploded && speed > 3) {
                        self._explodeBoulder(boulder);
                    }

                    // Splitting boulder
                    if (boulder.boulderType === 'splitting' && !boulder.hasSplit && speed > 3) {
                        self._splitBoulder(boulder);
                    }
                }
            }
        };
        Physics.onCollision(this._collisionHandler);
    }

    _destroyCamp(camp) {
        camp.destroyed = true;
        camp.destroyAnim = 0;
        Particles.campDestroyed(camp.position.x, camp.position.y);
        SFX.campDestroyed();
        Camera.shake(5, 0.2);
    }

    _breakPlatform(platform) {
        platform.broken = true;
        Particles.platformBreak(platform.position.x, platform.position.y, platform.w);
        SFX.platformBreak();
        Physics.removeBody(platform);
    }

    _explodeBoulder(boulder) {
        boulder.hasExploded = true;
        var x = boulder.position.x;
        var y = boulder.position.y;

        Particles.explosion(x, y);
        SFX.explosion();
        Camera.shake(8, 0.3);

        // Apply explosion force to nearby dynamic bodies
        var bodies = Physics.getAllBodies();
        for (var i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            if (b === boulder || b.isStatic) continue;
            var dx = b.position.x - x;
            var dy = b.position.y - y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 0) {
                var force = 0.08 * (1 - dist / 150);
                Matter.Body.applyForce(b, b.position, {
                    x: (dx / dist) * force,
                    y: (dy / dist) * force - force * 0.5
                });
            }
        }

        // Destroy nearby camps
        for (var i = 0; i < this.camps.length; i++) {
            var camp = this.camps[i];
            if (camp.destroyed) continue;
            var dx = camp.position.x - x;
            var dy = camp.position.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 120) {
                this._destroyCamp(camp);
            }
        }

        // Break nearby breakables
        for (var i = 0; i < this.breakables.length; i++) {
            var bp = this.breakables[i];
            if (bp.broken) continue;
            var dx = bp.position.x - x;
            var dy = bp.position.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 120) {
                this._breakPlatform(bp);
            }
        }

        // Remove the boulder
        Physics.removeBody(boulder);
        var idx = this.boulders.indexOf(boulder);
        if (idx >= 0) this.boulders.splice(idx, 1);
    }

    _splitBoulder(boulder) {
        boulder.hasSplit = true;
        var x = boulder.position.x;
        var y = boulder.position.y;
        var r = boulder.radius * 0.7;
        var vy = boulder.velocity.y;
        var vx = boulder.velocity.x;

        Particles.splitEffect(x, y);
        SFX.split();

        // Create two smaller boulders going left and right
        var b1 = GameObjects.createBoulder(x - r, y, r, 'normal');
        Matter.Body.setVelocity(b1, { x: vx - 3, y: vy });
        this.boulders.push(b1);

        var b2 = GameObjects.createBoulder(x + r, y, r, 'normal');
        Matter.Body.setVelocity(b2, { x: vx + 3, y: vy });
        this.boulders.push(b2);

        // Remove original
        Physics.removeBody(boulder);
        var idx = this.boulders.indexOf(boulder);
        if (idx >= 0) this.boulders.splice(idx, 1);
    }

    _checkLevelComplete() {
        for (var i = 0; i < this.camps.length; i++) {
            if (!this.camps[i].destroyed) return false;
        }
        return true;
    }

    _completeLevelResult() {
        this.state = 'result';
        this.resultAlpha = 0;
        this.resultStars = Levels.getStars(this.currentLevel, this.cuts);
        this.starRevealTimer = 0;

        // Save progress
        var prev = this.progress.stars[this.currentLevel] || 0;
        if (this.resultStars > prev) {
            this.progress.stars[this.currentLevel] = this.resultStars;
        }
        if (this.currentLevel >= this.progress.maxLevel && this.currentLevel < 40) {
            this.progress.maxLevel = this.currentLevel + 1;
        }
        this._saveProgress();

        SFX.levelComplete();
        Particles.starBurst(Physics.WORLD_W / 2, Physics.WORLD_H / 2, 30);

        Poki.gameplayStop();
    }

    // ---- PROGRESS PERSISTENCE ----
    _loadProgress() {
        try {
            var saved = localStorage.getItem('snipsnap_progress');
            if (saved) {
                var data = JSON.parse(saved);
                this.progress.maxLevel = data.maxLevel || 1;
                this.progress.stars = data.stars || {};
            }
        } catch (e) {}
    }

    _saveProgress() {
        try {
            localStorage.setItem('snipsnap_progress', JSON.stringify(this.progress));
        } catch (e) {}
    }

    // ---- UPDATE ----
    update(dt) {
        if (this.state === 'menu') {
            // Menu is static, just wait for clicks
        } else if (this.state === 'levelselect') {
            // Level select waits for clicks
        } else if (this.state === 'playing') {
            this._updatePlaying(dt);
        } else if (this.state === 'watching') {
            this._updateWatching(dt);
        } else if (this.state === 'result') {
            this._updateResult(dt);
        }
    }

    _updatePlaying(dt) {
        Physics.step(dt);
        Camera.update(dt);
        Particles.update(dt);
        CutSystem.update(dt);

        // Check for rope cuts
        var cutRope = CutSystem.checkCut(this.ropes);
        if (cutRope) {
            this._cutRope(cutRope);
        }

        // Update camp destroy animations
        for (var i = 0; i < this.camps.length; i++) {
            if (this.camps[i].destroyed) {
                this.camps[i].destroyAnim += dt * 0.5;
            }
        }
    }

    _cutRope(rope) {
        rope.cut = true;
        this.cuts++;

        // Particles at cut point
        var midX = (rope.anchorX + rope.body.position.x + rope.attachPoint.x) / 2;
        var midY = (rope.anchorY + rope.body.position.y + rope.attachPoint.y) / 2;
        Particles.ropeCut(midX, midY);
        SFX.ropeSnap();

        // Remove constraint from physics
        Physics.removeConstraint(rope.constraint);

        // Wake up the attached body
        Matter.Sleeping.set(rope.body, false);

        // Switch to watching state
        this.state = 'watching';
        this.settleTimer = 0;
        this.watchTimer = 0;
    }

    _updateWatching(dt) {
        Physics.step(dt);
        Camera.update(dt);
        Particles.update(dt);
        CutSystem.update(dt);

        this.watchTimer += dt;

        // Update camp destroy animations
        for (var i = 0; i < this.camps.length; i++) {
            if (this.camps[i].destroyed) {
                this.camps[i].destroyAnim += dt * 0.5;
            }
        }

        // Check if all camps are destroyed
        if (this._checkLevelComplete()) {
            this.settleTimer += dt;
            if (this.settleTimer > 0.8) {
                this._completeLevelResult();
                return;
            }
        }

        // Check if physics has settled
        if (Physics.isSettled()) {
            this.settleTimer += dt;
            if (this.settleTimer > this.SETTLE_DELAY) {
                if (this._checkLevelComplete()) {
                    this._completeLevelResult();
                } else {
                    this.state = 'playing';
                }
                return;
            }
        } else {
            // Only reset if camps aren't all destroyed yet
            if (!this._checkLevelComplete()) {
                this.settleTimer = 0;
            }
        }

        // Auto-advance if watching too long
        if (this.watchTimer > this.MAX_WATCH_TIME) {
            if (this._checkLevelComplete()) {
                this._completeLevelResult();
            } else {
                this.state = 'playing';
            }
        }
    }

    _updateResult(dt) {
        Particles.update(dt);
        Camera.update(dt);

        // Fade in
        this.resultAlpha = Math.min(1, this.resultAlpha + dt * 3);
        this.starRevealTimer += dt;

        // Star sounds
        for (var i = 0; i < 3; i++) {
            var threshold = 0.3 + i * 0.3;
            if (this.starRevealTimer > threshold && this.starRevealTimer - dt <= threshold) {
                if (i < this.resultStars) {
                    SFX.starEarned();
                    Particles.starBurst(
                        this.canvas.width / 2 + (i - 1) * 67,
                        this.canvas.height / 2 - 45,
                        8
                    );
                }
            }
        }
    }

    // ---- RENDER ----
    render() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        if (this.state === 'loading') {
            this._renderLoading(ctx, w, h);
        } else if (this.state === 'menu') {
            this._renderMenu(ctx, w, h);
        } else if (this.state === 'levelselect') {
            this._renderLevelSelect(ctx, w, h);
        } else if (this.state === 'playing' || this.state === 'watching') {
            this._renderLevel(ctx, w, h);
        } else if (this.state === 'result') {
            this._renderLevel(ctx, w, h);
            this._renderResult(ctx, w, h);
        }

        // Handle UI clicks after render (buttons are now registered)
        this._handleUIClicks();
    }

    _renderLoading(ctx, w, h) {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', w / 2, h / 2);
    }

    _renderMenu(ctx, w, h) {
        UI.clear();
        UI.renderTitle(ctx, w, h, this.time);
    }

    _renderLevelSelect(ctx, w, h) {
        UI.clear();
        UI.renderLevelSelect(ctx, w, h, this.progress, this.levelSelectPage);
    }

    _renderLevel(ctx, w, h) {
        // Background
        var theme = Levels.getTheme(this.currentLevel);

        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, theme.bg1);
        grad.addColorStop(0.6, theme.bg2);
        grad.addColorStop(1, theme.ground);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        this._renderBackground(ctx, w, h, theme);

        // Render game objects through camera
        for (var i = 0; i < this.walls.length; i++) {
            GameObjects.renderWall(ctx, this.walls[i], Camera);
        }
        for (var i = 0; i < this.platforms.length; i++) {
            GameObjects.renderPlatform(ctx, this.platforms[i], Camera);
        }
        for (var i = 0; i < this.breakables.length; i++) {
            GameObjects.renderBreakable(ctx, this.breakables[i], Camera);
        }
        for (var i = 0; i < this.seesaws.length; i++) {
            GameObjects.renderSeesaw(ctx, this.seesaws[i], Camera);
        }
        for (var i = 0; i < this.cradles.length; i++) {
            GameObjects.renderCradle(ctx, this.cradles[i], Camera);
        }
        for (var i = 0; i < this.camps.length; i++) {
            GameObjects.renderGoblinCamp(ctx, this.camps[i], Camera);
        }
        for (var i = 0; i < this.ropes.length; i++) {
            GameObjects.renderRope(ctx, this.ropes[i], Camera);
        }
        for (var i = 0; i < this.boulders.length; i++) {
            GameObjects.renderBoulder(ctx, this.boulders[i], Camera);
        }

        // Particles
        Particles.render(ctx, Camera);

        // Cut trail (screen space)
        CutSystem.render(ctx);

        // HUD
        UI.buttons = [];
        var campsLeft = 0;
        for (var i = 0; i < this.camps.length; i++) {
            if (!this.camps[i].destroyed) campsLeft++;
        }
        UI.renderHUD(ctx, w, h, this.currentLevel, this.cuts,
            Levels.getStarThresholds(this.currentLevel), campsLeft, this.camps.length);

        if (this.state === 'watching') {
            UI.renderWatching(ctx, w, h);
        }
    }

    _renderBackground(ctx, w, h, theme) {
        var worldIdx = Levels.getWorld(this.currentLevel);

        if (worldIdx === 0) {
            // Grasslands - rolling hills
            ctx.fillStyle = '#2a5a2a';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.85);
            for (var x = 0; x <= w; x += 40) {
                ctx.lineTo(x, h * 0.85 - Math.sin(x * 0.01 + 1) * 20 - Math.sin(x * 0.025) * 10);
            }
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.fill();

            // Trees
            ctx.fillStyle = '#1a4a1a';
            var treePositions = [0.1, 0.25, 0.55, 0.7, 0.9];
            for (var i = 0; i < treePositions.length; i++) {
                var tx = w * treePositions[i];
                var ty = h * 0.82;
                ctx.fillStyle = '#4a3020';
                ctx.fillRect(tx - 3, ty - 5, 6, 20);
                ctx.fillStyle = '#1a4a1a';
                ctx.beginPath();
                ctx.moveTo(tx, ty - 30);
                ctx.lineTo(tx - 15, ty);
                ctx.lineTo(tx + 15, ty);
                ctx.fill();
            }
        } else if (worldIdx === 1) {
            // Caves - stalactites
            ctx.fillStyle = '#3a3a4a';
            for (var i = 0; i < 8; i++) {
                var sx = w * (i / 8) + w * 0.05;
                var sl = 20 + Math.sin(i * 2.7) * 30;
                ctx.beginPath();
                ctx.moveTo(sx - 8, 0);
                ctx.lineTo(sx, sl);
                ctx.lineTo(sx + 8, 0);
                ctx.fill();
            }
        } else if (worldIdx === 2) {
            // Mountains - snow peaks
            ctx.fillStyle = '#7a8a9a';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.8);
            ctx.lineTo(w * 0.2, h * 0.5);
            ctx.lineTo(w * 0.35, h * 0.7);
            ctx.lineTo(w * 0.5, h * 0.45);
            ctx.lineTo(w * 0.65, h * 0.65);
            ctx.lineTo(w * 0.8, h * 0.5);
            ctx.lineTo(w, h * 0.75);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.fill();
            ctx.fillStyle = '#dde';
            ctx.beginPath();
            ctx.moveTo(w * 0.5 - 15, h * 0.47);
            ctx.lineTo(w * 0.5, h * 0.45);
            ctx.lineTo(w * 0.5 + 15, h * 0.47);
            ctx.fill();
        } else {
            // Volcano
            ctx.fillStyle = '#4a1a0a';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.85);
            ctx.lineTo(w * 0.35, h * 0.55);
            ctx.lineTo(w * 0.5, h * 0.45);
            ctx.lineTo(w * 0.65, h * 0.55);
            ctx.lineTo(w, h * 0.85);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.fill();

            var lavaGrad = ctx.createLinearGradient(0, h * 0.9, 0, h);
            lavaGrad.addColorStop(0, 'rgba(200, 60, 0, 0)');
            lavaGrad.addColorStop(1, 'rgba(200, 60, 0, 0.3)');
            ctx.fillStyle = lavaGrad;
            ctx.fillRect(0, h * 0.9, w, h * 0.1);
        }
    }

    _renderResult(ctx, w, h) {
        UI.buttons = [];
        var isLast = this.currentLevel >= 40;
        UI.renderResult(ctx, w, h, this.currentLevel, this.cuts, this.resultStars, isLast, this.resultAlpha);
    }

    // ---- UI CLICK HANDLING ----
    _handleUIClicks() {
        if (!this._clicked) return;

        var hit = UI.hitTest(this._clickX, this._clickY);
        if (!hit) return;

        SFX.click();

        if (hit === 'play') {
            GameAudio.initContext();
            GameAudio.resume();
            this.goToLevelSelect();
        } else if (hit === 'back_to_menu') {
            this.goToMenu();
        } else if (hit === 'back_to_select') {
            this.goToLevelSelect();
            Poki.gameplayStop();
        } else if (hit === 'prev_page') {
            if (this.levelSelectPage > 0) this.levelSelectPage--;
        } else if (hit === 'next_page') {
            if (this.levelSelectPage < 3) this.levelSelectPage++;
        } else if (hit === 'reset_level') {
            this.startLevel(this.currentLevel);
        } else if (hit === 'retry_level') {
            var self = this;
            this.showAd().then(function() {});
            this.startLevel(this.currentLevel);
        } else if (hit === 'next_level') {
            var next = this.currentLevel + 1;
            if (next <= 40) {
                this.showAd().then(function() {});
                this.startLevel(next);
            } else {
                this.goToLevelSelect();
            }
        } else if (hit.indexOf('level_') === 0) {
            var levelNum = parseInt(hit.replace('level_', ''));
            if (levelNum >= 1 && levelNum <= 40 && levelNum <= this.progress.maxLevel) {
                this.startLevel(levelNum);
            }
        }
    }
}
