/**
 * Game - State machine, rAF loop, Poki lifecycle
 * + EchoHuntGame - Full implementation
 */

import { InputManager } from './input.js';

/** Config */
export const Config = {
    adsEnabled: false,
};

// ===================================================================
// BASE GAME CLASS
// ===================================================================

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

    async loadAssets() {}

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

    start() {
        this.state = 'playing';
        this.score = 0;
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        Poki.gameplayStop();
    }

    async restart() {
        this.state = 'playing';
        this.score = 0;
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                () => Synth.muteAll(),
                () => Synth.unmuteAll()
            );
        }
        Poki.gameplayStart();
    }

    update(dt) {}
    render() {}
}

// ===================================================================
// ECHO HUNT GAME
// ===================================================================

export class EchoHuntGame extends Game {
    constructor(canvas) {
        super(canvas);

        // Pointer tracking (custom, bypasses InputManager for coordinates)
        this.pointerX = 0;
        this.pointerY = 0;
        this.pointerDown = false;
        this.pointerJustDown = false;
        this.pointerJustUp = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isDragging = false;
        this.dragThreshold = 15;

        // Track taps for gameplay (not consumed by menu transition)
        this.tapQueue = [];

        this._setupPointerEvents();

        // Game state
        this.sub = { x: 0, y: 0 };
        this.pings = [];
        this.creatures = [];
        this.predators = [];
        this.particles = [];
        this.popups = [];
        this.screenShake = 0;

        this.hp = 3;
        this.maxHp = 3;
        this.depth = 0;
        this.caught = 0;
        this.quota = 8;
        this.combo = 0;
        this.comboTimer = 0;
        this.pingCooldown = 0;
        this.iFrames = 0; // invincibility frames after hit
        this.totalCaught = 0;
        this.bestiary = {};
        this.bestScore = 0;

        // Level transition
        this.levelTransition = 0;
        this.levelTransitionText = '';

        // Menu animation
        this.menuTime = 0;
        this.menuPings = [];

        // Game over
        this.gameOverTimer = 0;

        try {
            var saved = localStorage.getItem('echoHuntBest');
            if (saved) this.bestScore = parseInt(saved) || 0;
            var savedBestiary = localStorage.getItem('echoHuntBestiary');
            if (savedBestiary) this.bestiary = JSON.parse(savedBestiary) || {};
        } catch (e) {}
    }

    _setupPointerEvents() {
        var self = this;
        var canvas = this.canvas;

        var getPos = function(e) {
            if (e.touches && e.touches.length > 0) {
                return { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
            return { x: e.clientX, y: e.clientY };
        };

        var onDown = function(e) {
            var pos = getPos(e);
            self.pointerX = pos.x;
            self.pointerY = pos.y;
            self.pointerDown = true;
            self.pointerJustDown = true;
            self.dragStartX = pos.x;
            self.dragStartY = pos.y;
            self.isDragging = false;
        };

        var onMove = function(e) {
            var pos = getPos(e);
            self.pointerX = pos.x;
            self.pointerY = pos.y;

            if (self.pointerDown) {
                var dx = pos.x - self.dragStartX;
                var dy = pos.y - self.dragStartY;
                if (Math.sqrt(dx * dx + dy * dy) > self.dragThreshold) {
                    self.isDragging = true;
                }
            }
        };

        var onUp = function(e) {
            if (self.pointerDown && !self.isDragging) {
                // This was a tap, not a drag
                self.tapQueue.push({ x: self.pointerX, y: self.pointerY });
            }
            self.pointerDown = false;
            self.pointerJustUp = true;
            self.isDragging = false;
        };

        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onUp);
        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            onDown(e);
        }, { passive: false });
        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            onMove(e);
        }, { passive: false });
        canvas.addEventListener('touchend', function(e) {
            onUp(e);
        }, { passive: true });
    }

    // -------------------------------------------------------
    // State transitions
    // -------------------------------------------------------

    start() {
        this.state = 'playing';
        this.score = 0;
        this.hp = 3;
        this.maxHp = 3;
        this.depth = 0;
        this.caught = 0;
        this.quota = QUOTAS[0];
        this.combo = 0;
        this.comboTimer = 0;
        this.pingCooldown = 0;
        this.iFrames = 0;
        this.totalCaught = 0;
        this.pings = [];
        this.creatures = [];
        this.predators = [];
        this.particles = [];
        this.popups = [];
        this.screenShake = 0;
        this.levelTransition = 0;
        this.gameOverTimer = 0;

        this.sub.x = this.canvas.width / 2;
        this.sub.y = this.canvas.height / 2;

        Synth.init();
        Synth.resume();
        Poki.gameplayStart();

        this._spawnLevel();
    }

    gameOver() {
        this.state = 'gameover';
        this.gameOverTimer = 0;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            try { localStorage.setItem('echoHuntBest', String(this.bestScore)); } catch (e) {}
        }
        try { localStorage.setItem('echoHuntBestiary', JSON.stringify(this.bestiary)); } catch (e) {}
        Synth.gameOver();
        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { Synth.muteAll(); },
                function() { Synth.unmuteAll(); }
            );
        }
        this.start();
    }

    // -------------------------------------------------------
    // Level management
    // -------------------------------------------------------

    _spawnLevel() {
        this.creatures = [];
        this.predators = [];
        this.pings = [];

        // Spawn creatures for current depth + some from previous zones
        var numCreatures = 12 + this.depth * 3;
        var availableSpecies = [];
        for (var i = 0; i < SPECIES.length; i++) {
            if (SPECIES[i].zone <= this.depth) availableSpecies.push(i);
        }

        for (var i = 0; i < numCreatures; i++) {
            var idx = availableSpecies[Math.floor(Math.random() * availableSpecies.length)];
            this.creatures.push(spawnCreature(idx, this.canvas.width, this.canvas.height, 50));
        }

        // Spawn predators
        var numPredators = 1 + this.depth;
        var availablePredators = [];
        for (var i = 0; i < PREDATORS.length; i++) {
            if (PREDATORS[i].zone <= this.depth) availablePredators.push(i);
        }
        if (availablePredators.length === 0) availablePredators.push(0);

        for (var i = 0; i < numPredators; i++) {
            var idx = availablePredators[Math.floor(Math.random() * availablePredators.length)];
            this.predators.push(spawnPredator(idx, this.canvas.width, this.canvas.height));
        }

        this.quota = QUOTAS[Math.min(this.depth, QUOTAS.length - 1)];
        this.caught = 0;
    }

    _advanceLevel() {
        this.depth++;
        if (this.depth >= ZONES.length) {
            // Won the game - loop with harder settings
            this.depth = ZONES.length - 1;
        }
        this.levelTransition = 3.0;
        this.levelTransitionText = ZONES[this.depth].name;
        Synth.levelUp();
        this._spawnLevel();
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    update(dt) {
        if (this.state === 'menu') {
            this.menuTime += dt;
            this._updateMenuAnim(dt);
            // Check for tap or key to start
            if (this.tapQueue.length > 0 || this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
                this.tapQueue = [];
                this.start();
            }
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.gameOverTimer += dt;
            this._updateParticles(dt);
            if (this.gameOverTimer > 0.8 && (this.tapQueue.length > 0 || this.input.wasPressed('Enter') || this.input.wasPressed('Space'))) {
                this.tapQueue = [];
                this.restart();
            }
        }
        // Clear pointer edge state
        this.pointerJustDown = false;
        this.pointerJustUp = false;
    }

    _updateMenuAnim(dt) {
        // Decorative pings on menu
        if (Math.random() < dt * 0.8) {
            this.menuPings.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: 0,
                maxRadius: 150 + Math.random() * 100,
                alpha: 0.4,
            });
        }
        for (var i = this.menuPings.length - 1; i >= 0; i--) {
            var p = this.menuPings[i];
            p.radius += 200 * dt;
            p.alpha = 0.4 * (1 - p.radius / p.maxRadius);
            if (p.radius >= p.maxRadius) this.menuPings.splice(i, 1);
        }
    }

    updatePlaying(dt) {
        // Level transition overlay
        if (this.levelTransition > 0) {
            this.levelTransition -= dt;
            if (this.levelTransition < 0) this.levelTransition = 0;
        }

        // Cooldowns
        if (this.pingCooldown > 0) this.pingCooldown -= dt;
        if (this.iFrames > 0) this.iFrames -= dt;
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }
        if (this.screenShake > 0) this.screenShake -= dt;

        // Sub movement via drag
        if (this.isDragging && this.pointerDown) {
            var targetX = this.pointerX;
            var targetY = this.pointerY;
            var dx = targetX - this.sub.x;
            var dy = targetY - this.sub.y;
            this.sub.x += dx * 5 * dt;
            this.sub.y += dy * 5 * dt;
        }

        // Keyboard sub movement
        var moveSpeed = 250;
        if (this.input.isLeft()) this.sub.x -= moveSpeed * dt;
        if (this.input.isRight()) this.sub.x += moveSpeed * dt;
        if (this.input.isUp()) this.sub.y -= moveSpeed * dt;
        if (this.input.isDownKey()) this.sub.y += moveSpeed * dt;

        // Clamp sub to screen
        this.sub.x = Math.max(20, Math.min(this.canvas.width - 20, this.sub.x));
        this.sub.y = Math.max(20, Math.min(this.canvas.height - 20, this.sub.y));

        // Process taps
        var taps = this.tapQueue.slice();
        this.tapQueue = [];

        // Keyboard ping
        if (this.input.wasPressed('Space')) {
            taps.push({ x: this.sub.x, y: this.sub.y });
        }

        for (var t = 0; t < taps.length; t++) {
            var tap = taps[t];
            var tappedCreature = false;

            // Check if tapping a revealed creature
            for (var i = 0; i < this.creatures.length; i++) {
                var c = this.creatures[i];
                if (!c.revealed || c.caught) continue;
                var dx = tap.x - c.x;
                var dy = tap.y - c.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < c.size * 2.0) {
                    // Caught!
                    this._catchCreature(c, i);
                    tappedCreature = true;
                    break;
                }
            }

            // If not tapping a creature, emit a ping
            if (!tappedCreature && this.pingCooldown <= 0 && this.pings.length < 3) {
                this._emitPing(tap.x, tap.y);
            }
        }

        // Update pings
        this._updatePings(dt);

        // Update creatures
        this._updateCreatures(dt);

        // Update predators
        this._updatePredators(dt);

        // Update particles
        this._updateParticles(dt);

        // Update popups
        this._updatePopups(dt);

        // Check quota
        if (this.caught >= this.quota) {
            this._advanceLevel();
        }
    }

    _emitPing(x, y) {
        this.pings.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: Math.max(this.canvas.width, this.canvas.height) * 0.8,
            speed: 400,
            band: 40,
        });
        this.pingCooldown = 0.4;
        Synth.ping(this.depth);

        // Small burst of particles at ping origin
        for (var i = 0; i < 6; i++) {
            var angle = (i / 6) * Math.PI * 2;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * 60,
                vy: Math.sin(angle) * 60,
                life: 0.5,
                maxLife: 0.5,
                size: 3,
                color: '#4FC3F7',
            });
        }

        // Agitate all predators toward this ping
        for (var i = 0; i < this.predators.length; i++) {
            var p = this.predators[i];
            p.agitated = true;
            p.agitateTimer = 5;
            p.targetX = x;
            p.targetY = y;
        }
    }

    _catchCreature(c, idx) {
        c.caught = true;
        c.catchAnim = 0.4;

        this.combo++;
        this.comboTimer = 2.0;
        var multiplier = Math.min(this.combo, 5);
        var points = c.species.points * multiplier;
        this.score += points;
        this.caught++;
        this.totalCaught++;

        // Bestiary
        this.bestiary[c.species.name] = true;

        Synth.catch(this.combo);
        if (this.combo >= 3) Synth.combo(this.combo);

        // Score popup
        this.popups.push({
            x: c.x, y: c.y - 10,
            text: '+' + points + (multiplier > 1 ? ' x' + multiplier : ''),
            life: 1.0,
            maxLife: 1.0,
            color: c.species.glow,
        });

        // Catch particles
        for (var i = 0; i < 10; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 50 + Math.random() * 100;
            this.particles.push({
                x: c.x, y: c.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6 + Math.random() * 0.3,
                maxLife: 0.8,
                size: 2 + Math.random() * 3,
                color: c.species.glow,
            });
        }

        // Remove creature, spawn replacement after short delay
        var self = this;
        setTimeout(function() {
            if (self.state !== 'playing') return;
            var availableSpecies = [];
            for (var i = 0; i < SPECIES.length; i++) {
                if (SPECIES[i].zone <= self.depth) availableSpecies.push(i);
            }
            var sIdx = availableSpecies[Math.floor(Math.random() * availableSpecies.length)];
            self.creatures.push(spawnCreature(sIdx, self.canvas.width, self.canvas.height, 50));
        }, 2000);
    }

    _updatePings(dt) {
        for (var i = this.pings.length - 1; i >= 0; i--) {
            var p = this.pings[i];
            p.radius += p.speed * dt;

            // Check creatures in detection band
            for (var j = 0; j < this.creatures.length; j++) {
                var c = this.creatures[j];
                if (c.caught) continue;
                var dx = c.x - p.x;
                var dy = c.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > p.radius - p.band && dist < p.radius + p.band) {
                    if (!c.revealed) Synth.reveal();
                    c.revealed = true;
                    c.revealTimer = 2.0;
                }
            }

            // Check predators in detection band
            for (var j = 0; j < this.predators.length; j++) {
                var pr = this.predators[j];
                var dx = pr.x - p.x;
                var dy = pr.y - p.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > p.radius - p.band && dist < p.radius + p.band) {
                    pr.revealed = true;
                    pr.revealTimer = 3.0;
                }
            }

            if (p.radius >= p.maxRadius) {
                this.pings.splice(i, 1);
            }
        }
    }

    _updateCreatures(dt) {
        for (var i = this.creatures.length - 1; i >= 0; i--) {
            var c = this.creatures[i];

            if (c.caught) {
                c.catchAnim -= dt;
                if (c.catchAnim <= 0) {
                    this.creatures.splice(i, 1);
                }
                continue;
            }

            // Movement - gentle wandering
            c.wobble += dt * 3;
            c.x += c.vx * dt;
            c.y += c.vy * dt;

            // Bounce off edges
            if (c.x < c.size) { c.vx = Math.abs(c.vx); c.x = c.size; }
            if (c.x > this.canvas.width - c.size) { c.vx = -Math.abs(c.vx); c.x = this.canvas.width - c.size; }
            if (c.y < c.size) { c.vy = Math.abs(c.vy); c.y = c.size; }
            if (c.y > this.canvas.height - c.size) { c.vy = -Math.abs(c.vy); c.y = this.canvas.height - c.size; }

            // Random direction changes
            if (Math.random() < dt * 0.5) {
                c.vx += (Math.random() - 0.5) * c.species.speed * 0.5;
                c.vy += (Math.random() - 0.5) * c.species.speed * 0.5;
                var maxSpeed = c.species.speed;
                var spd = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
                if (spd > maxSpeed) { c.vx *= maxSpeed / spd; c.vy *= maxSpeed / spd; }
            }

            // Face movement direction
            if (Math.abs(c.vx) > 1 || Math.abs(c.vy) > 1) {
                var targetAngle = Math.atan2(c.vy, c.vx);
                var diff = targetAngle - c.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                c.angle += diff * 3 * dt;
            }

            // Reveal timer
            if (c.revealed) {
                c.revealTimer -= dt;
                if (c.revealTimer <= 0) {
                    c.revealed = false;
                }
            }
        }
    }

    _updatePredators(dt) {
        for (var i = 0; i < this.predators.length; i++) {
            var p = this.predators[i];
            p.wobble = (p.wobble || 0) + dt * 2.5;

            // Reveal timer
            if (p.revealed) {
                p.revealTimer -= dt;
                if (p.revealTimer <= 0) p.revealed = false;
            }

            // Agitation timer
            if (p.agitated) {
                p.agitateTimer -= dt;
                if (p.agitateTimer <= 0) {
                    p.agitated = false;
                }

                // Chase toward target (last ping location or sub)
                var tx = p.targetX;
                var ty = p.targetY;
                // After reaching ping location, chase the sub
                var dtx = tx - p.x;
                var dty = ty - p.y;
                var distToTarget = Math.sqrt(dtx * dtx + dty * dty);

                if (distToTarget < 30) {
                    // Near ping location, now chase sub
                    tx = this.sub.x;
                    ty = this.sub.y;
                    dtx = tx - p.x;
                    dty = ty - p.y;
                    distToTarget = Math.sqrt(dtx * dtx + dty * dty);
                }

                if (distToTarget > 1) {
                    var speed = p.predator.speed;
                    p.vx += (dtx / distToTarget) * speed * dt * 3;
                    p.vy += (dty / distToTarget) * speed * dt * 3;
                    // Limit speed
                    var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                    if (spd > speed) {
                        p.vx *= speed / spd;
                        p.vy *= speed / spd;
                    }
                }
            } else {
                // Slow wander when not agitated
                if (Math.random() < dt * 0.3) {
                    p.vx += (Math.random() - 0.5) * 30;
                    p.vy += (Math.random() - 0.5) * 30;
                }
                // Dampen
                p.vx *= 0.98;
                p.vy *= 0.98;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Wrap around screen edges with margin
            var margin = p.size * 2;
            if (p.x < -margin) p.x = this.canvas.width + margin;
            if (p.x > this.canvas.width + margin) p.x = -margin;
            if (p.y < -margin) p.y = this.canvas.height + margin;
            if (p.y > this.canvas.height + margin) p.y = -margin;

            // Face movement direction
            if (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1) {
                var targetAngle = Math.atan2(p.vy, p.vx);
                var diff = targetAngle - p.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                p.angle += diff * 4 * dt;
            }

            // Collision with sub
            if (this.iFrames <= 0) {
                var dx = p.x - this.sub.x;
                var dy = p.y - this.sub.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < p.size + 20) {
                    this._hitBySub(p);
                }
            }
        }
    }

    _hitBySub(predator) {
        this.hp--;
        this.iFrames = 1.5;
        this.screenShake = 0.3;
        this.combo = 0;
        this.comboTimer = 0;
        Synth.hit();

        // Knockback predator
        var dx = predator.x - this.sub.x;
        var dy = predator.y - this.sub.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        predator.vx = (dx / dist) * 200;
        predator.vy = (dy / dist) * 200;
        predator.agitated = false;

        // Hit particles
        for (var i = 0; i < 15; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 80 + Math.random() * 120;
            this.particles.push({
                x: this.sub.x, y: this.sub.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                size: 2 + Math.random() * 4,
                color: '#FF1744',
            });
        }

        // Damage popup
        this.popups.push({
            x: this.sub.x, y: this.sub.y - 20,
            text: 'HIT!',
            life: 1.0,
            maxLife: 1.0,
            color: '#FF1744',
        });

        if (this.hp <= 0) {
            this.gameOver();
        }
    }

    _updateParticles(dt) {
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    _updatePopups(dt) {
        for (var i = this.popups.length - 1; i >= 0; i--) {
            var p = this.popups[i];
            p.y -= 40 * dt;
            p.life -= dt;
            if (p.life <= 0) this.popups.splice(i, 1);
        }
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.save();

        // Screen shake
        if (this.screenShake > 0) {
            var intensity = this.screenShake * 15;
            ctx.translate(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity
            );
        }

        if (this.state === 'loading') {
            this._renderLoading(ctx, w, h);
        } else if (this.state === 'menu') {
            this._renderMenu(ctx, w, h);
        } else if (this.state === 'playing') {
            this._renderPlaying(ctx, w, h);
        } else if (this.state === 'gameover') {
            this._renderGameOver(ctx, w, h);
        }

        ctx.restore();
    }

    _renderLoading(ctx, w, h) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#4FC3F7';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', w / 2, h / 2);
    }

    _renderMenu(ctx, w, h) {
        // Dark ocean background
        ctx.fillStyle = '#020810';
        ctx.fillRect(0, 0, w, h);

        // Decorative pings
        for (var i = 0; i < this.menuPings.length; i++) {
            var p = this.menuPings[i];
            ctx.strokeStyle = 'rgba(79, 195, 247, ' + p.alpha + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Title
        var titleY = h * 0.32;
        ctx.textAlign = 'center';

        // Title glow
        ctx.shadowColor = '#4FC3F7';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#4FC3F7';
        ctx.font = 'bold ' + Math.min(64, w * 0.1) + 'px sans-serif';
        ctx.fillText('ECHO HUNT', w / 2, titleY);
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = '#80DEEA';
        ctx.font = Math.min(20, w * 0.035) + 'px sans-serif';
        ctx.fillText('Sonar the deep. Catch the glow.', w / 2, titleY + 40);

        // Instructions
        var instrY = h * 0.55;
        ctx.fillStyle = '#546E7A';
        ctx.font = Math.min(16, w * 0.03) + 'px sans-serif';
        ctx.fillText('TAP to send sonar pings', w / 2, instrY);
        ctx.fillText('TAP glowing creatures to catch them', w / 2, instrY + 28);
        ctx.fillText('DRAG to move your submarine', w / 2, instrY + 56);
        ctx.fillText('Avoid the predators!', w / 2, instrY + 84);

        // Start prompt (pulsing)
        var pulse = 0.5 + 0.5 * Math.sin(this.menuTime * 3);
        ctx.fillStyle = 'rgba(79, 195, 247, ' + (0.5 + pulse * 0.5) + ')';
        ctx.font = 'bold ' + Math.min(24, w * 0.04) + 'px sans-serif';
        ctx.fillText('TAP TO START', w / 2, h * 0.78);

        // Best score
        if (this.bestScore > 0) {
            ctx.fillStyle = '#37474F';
            ctx.font = Math.min(16, w * 0.03) + 'px sans-serif';
            ctx.fillText('Best: ' + this.bestScore, w / 2, h * 0.88);
        }

        // Bestiary count
        var bCount = Object.keys(this.bestiary).length;
        if (bCount > 0) {
            ctx.fillStyle = '#37474F';
            ctx.font = Math.min(14, w * 0.025) + 'px sans-serif';
            ctx.fillText('Species discovered: ' + bCount + '/' + SPECIES.length, w / 2, h * 0.92);
        }
    }

    _renderPlaying(ctx, w, h) {
        var zone = ZONES[Math.min(this.depth, ZONES.length - 1)];

        // Background
        ctx.fillStyle = zone.bg;
        ctx.fillRect(0, 0, w, h);

        // Subtle depth particles (ambient)
        var time = performance.now() / 1000;
        ctx.fillStyle = 'rgba(79, 195, 247, 0.03)';
        for (var i = 0; i < 20; i++) {
            var px = (Math.sin(time * 0.3 + i * 7.3) * 0.5 + 0.5) * w;
            var py = (Math.cos(time * 0.2 + i * 4.1) * 0.5 + 0.5) * h;
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ping rings
        for (var i = 0; i < this.pings.length; i++) {
            var p = this.pings[i];
            var fade = 1 - p.radius / p.maxRadius;
            ctx.strokeStyle = 'rgba(79, 195, 247, ' + (fade * 0.6) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner bright band
            ctx.strokeStyle = 'rgba(129, 212, 250, ' + (fade * 0.3) + ')';
            ctx.lineWidth = p.band;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Creatures
        for (var i = 0; i < this.creatures.length; i++) {
            var c = this.creatures[i];
            if (c.caught) {
                // Catch animation - bright flash shrinking
                var t = c.catchAnim / 0.4;
                ctx.globalAlpha = t;
                ctx.shadowColor = c.species.glow;
                ctx.shadowBlur = 30 * t;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.size * t * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
                continue;
            }

            if (c.revealed) {
                var revealAlpha = Math.min(1, c.revealTimer / 0.5);
                drawCreatureShape(ctx, c, revealAlpha * 0.9);
            }
        }

        // Predators
        for (var i = 0; i < this.predators.length; i++) {
            var p = this.predators[i];
            if (p.revealed) {
                var alpha = Math.min(1, p.revealTimer / 0.5);
                // Pass as creature-like object for drawing
                var drawObj = {
                    x: p.x, y: p.y,
                    size: p.size,
                    species: null,
                    predator: p.predator,
                    angle: p.angle,
                    wobble: p.wobble || 0,
                };
                drawCreatureShape(ctx, drawObj, alpha * 0.9);

                // Warning indicator when agitated
                if (p.agitated) {
                    var blink = Math.sin(time * 10) > 0;
                    if (blink) {
                        ctx.fillStyle = 'rgba(255, 23, 68, 0.3)';
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else if (p.agitated) {
                // Show a faint red dot for agitated but unrevealed predators
                ctx.fillStyle = 'rgba(255, 23, 68, 0.15)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Particles
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Submarine
        this._renderSub(ctx);

        // Popups
        for (var i = 0; i < this.popups.length; i++) {
            var p = this.popups[i];
            var alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fillText(p.text, p.x, p.y);
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;

        // HUD
        this._renderHUD(ctx, w, h);

        // Level transition overlay
        if (this.levelTransition > 0) {
            var t = this.levelTransition / 3.0;
            var alpha = t > 0.7 ? (t - 0.7) / 0.3 : (t < 0.3 ? t / 0.3 : 1);
            alpha = Math.min(1, alpha) * 0.7;
            ctx.fillStyle = 'rgba(0, 0, 0, ' + alpha + ')';
            ctx.fillRect(0, 0, w, h);

            if (t > 0.3 && t < 0.8) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#4FC3F7';
                ctx.font = 'bold ' + Math.min(40, w * 0.07) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#4FC3F7';
                ctx.shadowBlur = 20;
                ctx.fillText('Depth ' + (this.depth + 1), w / 2, h / 2 - 20);
                ctx.font = Math.min(22, w * 0.04) + 'px sans-serif';
                ctx.fillStyle = '#80DEEA';
                ctx.fillText(this.levelTransitionText, w / 2, h / 2 + 20);
                ctx.shadowBlur = 0;
            }
        }
    }

    _renderSub(ctx) {
        var x = this.sub.x;
        var y = this.sub.y;
        var flash = this.iFrames > 0 && Math.sin(this.iFrames * 20) > 0;

        ctx.save();
        ctx.translate(x, y);

        // Sonar range indicator
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sub body
        var subColor = flash ? '#FF5252' : '#4FC3F7';
        ctx.fillStyle = subColor;
        ctx.shadowColor = subColor;
        ctx.shadowBlur = 15;

        // Hull
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Conning tower
        ctx.fillRect(-5, -14, 10, 8);

        // Periscope
        ctx.strokeStyle = subColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(0, -20);
        ctx.lineTo(4, -20);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Porthole
        ctx.fillStyle = flash ? '#FF8A80' : '#E1F5FE';
        ctx.beginPath();
        ctx.arc(5, -1, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _renderHUD(ctx, w, h) {
        var margin = 15;
        var hudTop = margin;

        ctx.textAlign = 'left';

        // HP hearts
        for (var i = 0; i < this.maxHp; i++) {
            var hx = margin + i * 28;
            var hy = hudTop + 10;
            ctx.fillStyle = i < this.hp ? '#FF1744' : '#37474F';
            ctx.font = '20px sans-serif';
            // Draw a simple heart shape with arcs
            ctx.beginPath();
            var s = 8;
            ctx.moveTo(hx, hy + s * 0.3);
            ctx.bezierCurveTo(hx, hy - s * 0.3, hx - s, hy - s * 0.3, hx - s, hy + s * 0.1);
            ctx.bezierCurveTo(hx - s, hy + s * 0.6, hx, hy + s, hx, hy + s * 1.1);
            ctx.bezierCurveTo(hx, hy + s, hx + s, hy + s * 0.6, hx + s, hy + s * 0.1);
            ctx.bezierCurveTo(hx + s, hy - s * 0.3, hx, hy - s * 0.3, hx, hy + s * 0.3);
            ctx.fill();
        }

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.min(22, w * 0.04) + 'px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('' + Math.floor(this.score), w - margin, hudTop + 22);

        // Depth indicator
        ctx.fillStyle = '#546E7A';
        ctx.font = Math.min(14, w * 0.025) + 'px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Depth ' + (this.depth + 1), w - margin, hudTop + 40);

        // Quota progress bar
        var barW = Math.min(200, w * 0.3);
        var barH = 8;
        var barX = (w - barW) / 2;
        var barY = hudTop + 5;
        var progress = Math.min(1, this.caught / this.quota);

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(barX, barY, barW, barH);

        ctx.fillStyle = '#4FC3F7';
        ctx.fillRect(barX, barY, barW * progress, barH);

        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.fillStyle = '#80DEEA';
        ctx.font = Math.min(12, w * 0.02) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.caught + '/' + this.quota, w / 2, barY + barH + 14);

        // Combo indicator
        if (this.combo >= 2) {
            var comboAlpha = Math.min(1, this.comboTimer / 0.5);
            ctx.globalAlpha = comboAlpha;
            ctx.fillStyle = '#FFD54F';
            ctx.font = 'bold ' + Math.min(18, w * 0.03) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('COMBO x' + Math.min(this.combo, 5), w / 2, barY + barH + 32);
            ctx.globalAlpha = 1;
        }
    }

    _renderGameOver(ctx, w, h) {
        // Fade in from game state
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, w, h);

        var cy = h * 0.35;
        ctx.textAlign = 'center';

        // Game Over text with red glow
        ctx.shadowColor = '#FF1744';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#FF1744';
        ctx.font = 'bold ' + Math.min(56, w * 0.09) + 'px sans-serif';
        ctx.fillText('GAME OVER', w / 2, cy);
        ctx.shadowBlur = 0;

        // Depth reached
        ctx.fillStyle = '#4FC3F7';
        ctx.font = Math.min(22, w * 0.04) + 'px sans-serif';
        ctx.fillText('Depth ' + (this.depth + 1) + ' - ' + ZONES[Math.min(this.depth, ZONES.length - 1)].name, w / 2, cy + 45);

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.min(36, w * 0.06) + 'px sans-serif';
        ctx.fillText('' + Math.floor(this.score), w / 2, cy + 95);

        ctx.fillStyle = '#546E7A';
        ctx.font = Math.min(16, w * 0.03) + 'px sans-serif';
        ctx.fillText('Creatures caught: ' + this.totalCaught, w / 2, cy + 125);

        // Best
        if (this.score >= this.bestScore && this.bestScore > 0) {
            ctx.fillStyle = '#FFD54F';
            ctx.font = 'bold ' + Math.min(20, w * 0.035) + 'px sans-serif';
            ctx.fillText('NEW BEST!', w / 2, cy + 155);
        } else if (this.bestScore > 0) {
            ctx.fillStyle = '#37474F';
            ctx.font = Math.min(16, w * 0.03) + 'px sans-serif';
            ctx.fillText('Best: ' + this.bestScore, w / 2, cy + 155);
        }

        // Species discovered
        var bCount = Object.keys(this.bestiary).length;
        ctx.fillStyle = '#37474F';
        ctx.font = Math.min(14, w * 0.025) + 'px sans-serif';
        ctx.fillText('Species discovered: ' + bCount + '/' + SPECIES.length, w / 2, cy + 185);

        // Restart prompt
        if (this.gameOverTimer > 0.8) {
            var pulse = 0.5 + 0.5 * Math.sin(this.gameOverTimer * 3);
            ctx.fillStyle = 'rgba(79, 195, 247, ' + (0.5 + pulse * 0.5) + ')';
            ctx.font = 'bold ' + Math.min(22, w * 0.04) + 'px sans-serif';
            ctx.fillText('TAP TO RETRY', w / 2, h * 0.82);
        }

        // Particles still render
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
