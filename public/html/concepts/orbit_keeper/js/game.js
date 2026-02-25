/**
 * Orbit Keeper - Launch moons into orbit around planets
 * Tap and drag to aim, release to launch. Build a spinning solar system!
 */

import { InputManager } from './input.js';

export const Config = {
    adsEnabled: false,
};

// Constants
var LAUNCH_SPEED = 500;
var LAUNCH_COOLDOWN = 0.3;
var MOON_FLY_TIMEOUT = 3.0;
var CAPTURE_DURATION = 0.2;
var MAX_PLANETS = 8;
var MAX_PARTICLES = 200;
var MAX_CHAIN = 20;
var DRAG_THRESHOLD = 30;
var BG_COLOR = '#0B0E17';
var STAR_COUNT = 100;

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
        this.bestScore = 0;
        this.totalLaunched = 0;
        this.planets = [];
        this.moons = [];
        this.particles = [];
        this.scorePopups = [];
        this.flashRings = [];
        this.stars = [];
        this.planetSpawnTimer = 0;
        this.planetSpawnInterval = 5.0;
        this.planetsSpawned = 0;
        this.launchCooldown = 0;
        this.gameTime = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.shakeAmount = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.scoreDisplayScale = 1.0;
        this.hasAnchored = false;
        this.hintTimer = 0;
        this.menuTime = 0;

        // Milestones
        this.lastMilestone = 0;

        // Drag state
        this.drag = {
            active: false,
            originX: 0, originY: 0,
            currentX: 0, currentY: 0,
            targetPlanet: null
        };

        // Demo planet for menu
        this.demoPlanet = null;
        this.demoMoons = [];

        // Register pointer events for drag
        this._setupDragEvents();
    }

    _setupDragEvents() {
        var self = this;
        var getPos = function(e) {
            var rect = self.canvas.getBoundingClientRect();
            var x, y;
            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX - rect.left;
                y = e.touches[0].clientY - rect.top;
            } else {
                x = e.clientX - rect.left;
                y = e.clientY - rect.top;
            }
            // Scale for CSS vs canvas size
            x *= self.canvas.width / rect.width;
            y *= self.canvas.height / rect.height;
            return { x: x, y: y };
        };

        this._onPointerDown = function(e) {
            if (self.state === 'menu') {
                self._menuTapPending = true;
                return;
            }
            if (self.state === 'gameover') {
                self._gameoverTapPending = true;
                return;
            }
            if (self.state !== 'playing') return;
            var p = getPos(e);
            self.drag.active = true;
            self.drag.originX = p.x;
            self.drag.originY = p.y;
            self.drag.currentX = p.x;
            self.drag.currentY = p.y;
            self.drag.targetPlanet = null;
        };

        this._onPointerMove = function(e) {
            if (!self.drag.active) return;
            var p = getPos(e);
            self.drag.currentX = p.x;
            self.drag.currentY = p.y;
        };

        this._onPointerUp = function(e) {
            if (self.state === 'menu' && self._menuTapPending) {
                self._menuTapPending = false;
                self.start();
                return;
            }
            if (self.state === 'gameover' && self._gameoverTapPending) {
                self._gameoverTapPending = false;
                self.restart();
                return;
            }
            if (!self.drag.active) return;
            self.drag.active = false;

            var dx = self.drag.currentX - self.drag.originX;
            var dy = self.drag.currentY - self.drag.originY;
            var dragDist = Math.sqrt(dx * dx + dy * dy);

            if (dragDist >= DRAG_THRESHOLD && self.launchCooldown <= 0) {
                var dir = normalize(dx, dy);
                self._launchMoon(self.drag.originX, self.drag.originY, dir.x, dir.y);
            }
        };

        // Touch events (with preventDefault on move to block scrolling)
        this._onTouchMove = function(e) {
            if (self.drag.active) e.preventDefault();
            self._onPointerMove(e);
        };

        this.canvas.addEventListener('pointerdown', this._onPointerDown);
        this.canvas.addEventListener('pointermove', this._onPointerMove);
        this.canvas.addEventListener('pointerup', this._onPointerUp);
        this.canvas.addEventListener('pointercancel', function() { self.drag.active = false; });

        // Touch fallback
        this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
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
        // Generate starfield
        this.stars = [];
        for (var i = 0; i < STAR_COUNT; i++) {
            this.stars.push(new Star());
        }

        // Load best score
        try {
            var saved = localStorage.getItem('orbitkeeper_best');
            if (saved) this.bestScore = parseInt(saved, 10) || 0;
        } catch (e) {}

        // Setup demo planet for menu
        this._setupDemo();
    }

    _setupDemo() {
        this.demoPlanet = {
            x: 0, y: 0, radius: 40,
            color: PALETTE[0], pulseTimer: 0
        };
        this.demoMoons = [];
        var radii = [72, 100, 128];
        var speeds = [2.0, 1.5, 1.1];
        for (var i = 0; i < 3; i++) {
            this.demoMoons.push({
                angle: (Math.PI * 2 / 3) * i,
                orbitRadius: radii[i],
                angularSpeed: speeds[i],
                direction: (i % 2 === 0) ? 1 : -1,
                radius: 6
            });
        }
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

    // --- Screen scale ---
    _screenScale() {
        var s = Math.min(this.canvas.width, this.canvas.height) / 800;
        return clamp(s, 0.5, 1.5);
    }

    // --- State transitions ---

    start() {
        this.state = 'playing';
        this.score = 0;
        this.totalLaunched = 0;
        this.planets = [];
        this.moons = [];
        this.particles = [];
        this.scorePopups = [];
        this.flashRings = [];
        this.planetSpawnTimer = 0.5; // first planet comes fast
        this.planetSpawnInterval = 5.0;
        this.planetsSpawned = 0;
        this.launchCooldown = 0;
        this.gameTime = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.shakeAmount = 0;
        this.hasAnchored = false;
        this.hintTimer = 0;
        this.lastMilestone = 0;
        this.scoreDisplayScale = 1.0;

        GameAudio.initContext();
        GameAudio.resume();
        if (typeof SynthAudio !== 'undefined') {
            SynthAudio.init(GameAudio.ctx);
        }
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            try { localStorage.setItem('orbitkeeper_best', String(this.bestScore)); } catch (e) {}
        }
        SynthAudio.playGameOver();
        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { GameAudio.muteAll(); SynthAudio.muteAll(); },
                function() { GameAudio.unmuteAll(); SynthAudio.unmuteAll(); }
            );
        }
        this.start();
    }

    // --- Update ---

    update(dt) {
        if (this.state === 'menu') {
            this.menuTime += dt;
            this._updateDemo(dt);
            // Menu input handled by pointer events
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.menuTime += dt;
            // Gameover input handled by pointer events
        }
    }

    _updateDemo(dt) {
        if (this.demoPlanet) {
            this.demoPlanet.pulseTimer += dt * 1.5;
        }
        for (var i = 0; i < this.demoMoons.length; i++) {
            var dm = this.demoMoons[i];
            dm.angle += dm.angularSpeed * dm.direction * dt;
        }
    }

    updatePlaying(dt) {
        var self = this;
        this.gameTime += dt;

        // --- Planet spawning ---
        this.planetSpawnTimer -= dt;
        if (this.planetSpawnTimer <= 0 && this.planets.length < MAX_PLANETS) {
            this._spawnPlanet();
            this._updateDifficulty();
            this.planetSpawnTimer = this.planetSpawnInterval;
        }
        // Emergency: no planets and spawn timer > 0.5
        if (this.planets.length === 0 && this.planetSpawnTimer > 0.5) {
            this.planetSpawnTimer = 0.5;
        }

        // --- Launch cooldown ---
        if (this.launchCooldown > 0) this.launchCooldown -= dt;

        // --- Update drag aim ---
        if (this.drag.active) {
            this.drag.targetPlanet = this._findTargetPlanet(
                this.drag.originX, this.drag.originY,
                this.drag.currentX - this.drag.originX,
                this.drag.currentY - this.drag.originY
            );
        }

        // --- Update planets ---
        for (var pi = this.planets.length - 1; pi >= 0; pi--) {
            var p = this.planets[pi];
            p.pulseTimer += dt * 1.5;

            if (!p.anchored) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;

                // Drift off-screen check
                if (p.x < -100 || p.x > this.canvas.width + 100 ||
                    p.y < -100 || p.y > this.canvas.height + 100) {
                    // Shatter any orbiting moons
                    for (var mi = p.moons.length - 1; mi >= 0; mi--) {
                        this._shatterMoon(p.moons[mi], 1);
                    }
                    this.planets.splice(pi, 1);
                    this.shakeAmount = Math.max(this.shakeAmount, 8);
                    continue;
                }
            }
        }

        // --- Hint for first planet ---
        if (!this.hasAnchored && this.planets.length > 0) {
            this.hintTimer += dt;
        }

        // --- Update flying moons ---
        for (var fi = this.moons.length - 1; fi >= 0; fi--) {
            var m = this.moons[fi];
            if (m.state !== 'flying') continue;

            m.x += m.vx * dt;
            m.y += m.vy * dt;
            m.flyTime += dt;
            m.launchGrace -= dt;

            // Timeout
            if (m.flyTime > MOON_FLY_TIMEOUT) {
                this._spawnParticles(m.x, m.y, 4, '#888888', 40);
                this.moons.splice(fi, 1);
                this._resetCombo();
                continue;
            }

            // Off-screen
            if (m.x < -50 || m.x > this.canvas.width + 50 ||
                m.y < -50 || m.y > this.canvas.height + 50) {
                this.moons.splice(fi, 1);
                this._resetCombo();
                continue;
            }

            // Check against planets for capture / collision
            var captured = false;
            for (var pj = 0; pj < this.planets.length; pj++) {
                var planet = this.planets[pj];
                var d = dist(m.x, m.y, planet.x, planet.y);

                // Hit planet surface
                if (d < planet.radius + m.radius) {
                    this._spawnParticles(m.x, m.y, 8, planet.color, 80);
                    this.moons.splice(fi, 1);
                    this.shakeAmount = Math.max(this.shakeAmount, 4);
                    SynthAudio.playShatter(1);
                    this._resetCombo();
                    captured = true;
                    break;
                }

                // Gravity capture zone check
                var lastSlotIdx = planet.firstAvailableSlot();
                if (lastSlotIdx === -1) continue; // planet full

                var outerBound = planet.orbitSlots[3] + 15;
                var innerBound = planet.radius + 5;

                if (d < outerBound && d > innerBound) {
                    var slotIdx = planet.closestAvailableSlot(d);
                    if (slotIdx === -1) continue;

                    // Check if velocity is somewhat tangential (not plowing straight in)
                    var radX = (m.x - planet.x) / d;
                    var radY = (m.y - planet.y) / d;
                    var speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
                    var dotProd = Math.abs(m.vx * radX + m.vy * radY) / (speed || 1);

                    if (dotProd < 0.92) {
                        // Begin capture!
                        m.state = 'capturing';
                        m.planet = planet;
                        m.orbitIndex = slotIdx;
                        m.captureTargetRadius = planet.orbitSlots[slotIdx];
                        m.captureStartDist = d;
                        m.captureStartAngle = Math.atan2(m.y - planet.y, m.x - planet.x);
                        m.captureTimer = CAPTURE_DURATION;
                        planet.slotOccupied[slotIdx] = true;
                        captured = true;
                        break;
                    }
                }
            }
            if (captured) continue;
        }

        // --- Update capturing moons ---
        for (var ci = this.moons.length - 1; ci >= 0; ci--) {
            var cm = this.moons[ci];
            if (cm.state !== 'capturing') continue;

            cm.captureTimer -= dt;
            var t = 1.0 - (cm.captureTimer / CAPTURE_DURATION);
            t = clamp(t, 0, 1);
            // Ease out
            t = 1 - (1 - t) * (1 - t);

            var currentRadius = lerp(cm.captureStartDist, cm.captureTargetRadius, t);
            cm.x = cm.planet.x + Math.cos(cm.captureStartAngle) * currentRadius;
            cm.y = cm.planet.y + Math.sin(cm.captureStartAngle) * currentRadius;

            if (cm.captureTimer <= 0) {
                // Lock into orbit
                cm.state = 'orbiting';
                cm.orbitRadius = cm.captureTargetRadius;
                cm.angle = cm.captureStartAngle;
                // Inner orbits faster, outer slower
                var baseSpeed = 2.5 - (cm.orbitIndex * 0.4);
                var speedMult = this._speedMultiplier();
                cm.angularSpeed = baseSpeed * speedMult;
                cm.direction = (cm.orbitIndex % 2 === 0) ? 1 : -1;
                cm.planet.moons.push(cm);

                // Anchor planet if first moon
                if (!cm.planet.anchored) {
                    cm.planet.anchored = true;
                    cm.planet.vx = 0;
                    cm.planet.vy = 0;
                    this.hasAnchored = true;
                }

                this.score++;
                this._bumpScoreDisplay();

                // Perfect check
                var perfectDist = Math.abs(cm.captureStartDist - cm.captureTargetRadius);
                if (perfectDist < 5) {
                    this.scorePopups.push(new ScorePopup(cm.x, cm.y - 20, 'PERFECT!', '#FFD700'));
                    SynthAudio.playPerfect();
                    this.flashRings.push(new FlashRing(cm.x, cm.y, 30, 0.15, '#FFD700'));
                } else {
                    this.scorePopups.push(new ScorePopup(cm.x, cm.y - 20, '+1', '#FFFFFF'));
                    SynthAudio.playCapture(this.comboCount);
                }

                // Capture flash
                this.flashRings.push(new FlashRing(cm.x, cm.y, 25, 0.15, '#FFFFFF'));
                this._spawnParticles(cm.x, cm.y, 6, '#FFFFFF', 60);

                // Combo
                this.comboCount++;
                this.comboTimer = 3.0;

                // Milestones
                this._checkMilestones();

                // Update best
                if (this.score > this.bestScore) {
                    this.bestScore = this.score;
                    try { localStorage.setItem('orbitkeeper_best', String(this.bestScore)); } catch (e) {}
                }
            }
        }

        // --- Update orbiting moons ---
        for (var oi = 0; oi < this.moons.length; oi++) {
            var om = this.moons[oi];
            if (om.state !== 'orbiting') continue;

            om.angle += om.angularSpeed * om.direction * dt;
            om.x = om.planet.x + Math.cos(om.angle) * om.orbitRadius;
            om.y = om.planet.y + Math.sin(om.angle) * om.orbitRadius;

            // Trail
            om.trail.push({ x: om.x, y: om.y });
            if (om.trail.length > 12) om.trail.shift();
        }

        // --- Moon-moon collisions ---
        this._checkCollisions();

        // --- Process shatter queue ---
        var chainCount = 0;
        for (var pass = 0; pass < MAX_CHAIN; pass++) {
            var anyShattered = false;
            for (var si = this.moons.length - 1; si >= 0; si--) {
                if (this.moons[si].markedForShatter) {
                    var sm = this.moons[si];
                    anyShattered = true;
                    chainCount++;

                    // Mark neighbors for chain
                    for (var ni = 0; ni < this.moons.length; ni++) {
                        var nm = this.moons[ni];
                        if (nm === sm || nm.markedForShatter || nm.state === 'shattering') continue;
                        if ((nm.state === 'orbiting' || nm.state === 'flying') &&
                            dist(sm.x, sm.y, nm.x, nm.y) < 40) {
                            nm.markedForShatter = true;
                        }
                    }

                    this._doShatter(sm, chainCount);
                }
            }
            if (!anyShattered) break;
        }

        // --- Update particles ---
        for (var pai = this.particles.length - 1; pai >= 0; pai--) {
            var par = this.particles[pai];
            par.life -= par.decay * dt;
            par.x += par.vx * dt;
            par.y += par.vy * dt;
            par.vx *= 0.98;
            par.vy *= 0.98;
            if (par.life <= 0) this.particles.splice(pai, 1);
        }

        // Cap particles
        while (this.particles.length > MAX_PARTICLES) {
            this.particles.shift();
        }

        // --- Update flash rings ---
        for (var fri = this.flashRings.length - 1; fri >= 0; fri--) {
            var fr = this.flashRings[fri];
            fr.timer += dt;
            if (fr.timer >= fr.duration) this.flashRings.splice(fri, 1);
        }

        // --- Update score popups ---
        for (var spi = this.scorePopups.length - 1; spi >= 0; spi--) {
            var sp = this.scorePopups[spi];
            sp.life -= dt / 0.8;
            sp.y -= 40 * dt;
            if (sp.life <= 0) this.scorePopups.splice(spi, 1);
        }

        // --- Screen shake ---
        if (this.shakeAmount > 0.1) {
            this.shakeAmount *= Math.max(0, 1 - 12 * dt);
            this.shakeX = (Math.random() - 0.5) * this.shakeAmount;
            this.shakeY = (Math.random() - 0.5) * this.shakeAmount;
        } else {
            this.shakeAmount = 0;
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // --- Score display scale ---
        if (this.scoreDisplayScale > 1.0) {
            this.scoreDisplayScale = Math.max(1.0, this.scoreDisplayScale - dt * 2.0);
        }

        // --- Combo timer ---
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
            }
        }

        // --- Game over check ---
        if (this.hasAnchored && this.score <= 0 && this._countOrbitingMoons() === 0) {
            // Check if any moons are still capturing
            var anyCapturing = false;
            for (var gc = 0; gc < this.moons.length; gc++) {
                if (this.moons[gc].state === 'capturing') { anyCapturing = true; break; }
            }
            if (!anyCapturing) {
                this.gameOver();
                return;
            }
        }

        // No planets at all and some have been spawned
        if (this.planets.length === 0 && this.planetsSpawned > 0 &&
            this._countOrbitingMoons() === 0 && this.moons.length === 0) {
            // Only game over if we've actually played
            if (this.hasAnchored) {
                this.gameOver();
                return;
            }
        }
    }

    // --- Helpers ---

    _countOrbitingMoons() {
        var count = 0;
        for (var i = 0; i < this.moons.length; i++) {
            if (this.moons[i].state === 'orbiting') count++;
        }
        return count;
    }

    _speedMultiplier() {
        var level = Math.min(10, Math.floor(this.planetsSpawned / 2));
        if (level <= 2) return 1.0;
        if (level <= 5) return 1.1;
        if (level <= 9) return 1.2 + (level - 6) * 0.05;
        return 1.5;
    }

    _updateDifficulty() {
        var level = Math.min(10, Math.floor(this.planetsSpawned / 2));
        this.planetSpawnInterval = Math.max(2.0, 5.0 - level * 0.3);
    }

    _bumpScoreDisplay() {
        this.scoreDisplayScale = 1.3;
    }

    _resetCombo() {
        this.comboCount = 0;
        this.comboTimer = 0;
    }

    _checkMilestones() {
        var thresholds = [5, 10, 15];
        var labels = ['NICE!', 'AMAZING!', 'INCREDIBLE!'];

        for (var i = 0; i < thresholds.length; i++) {
            if (this.score >= thresholds[i] && this.lastMilestone < thresholds[i]) {
                this.lastMilestone = thresholds[i];
                this.scorePopups.push(new ScorePopup(
                    this.canvas.width / 2,
                    this.canvas.height / 2 - 60,
                    labels[i],
                    '#FFD700'
                ));
                SynthAudio.playMilestone();
                if (i === 1) {
                    // Brief screen flash for AMAZING
                    this.flashRings.push(new FlashRing(this.canvas.width / 2, this.canvas.height / 2, this.canvas.width, 0.3, '#FFFFFF'));
                }
                break;
            }
        }

        // LEGENDARY every 5 after 20
        if (this.score >= 20 && this.score % 5 === 0 && this.lastMilestone < this.score) {
            this.lastMilestone = this.score;
            this.scorePopups.push(new ScorePopup(
                this.canvas.width / 2,
                this.canvas.height / 2 - 60,
                'LEGENDARY!',
                '#FFD700'
            ));
            SynthAudio.playMilestone();
        }
    }

    // --- Planet spawning ---

    _spawnPlanet() {
        var w = this.canvas.width;
        var h = this.canvas.height;
        var scale = this._screenScale();
        var radius = (28 + Math.random() * 22) * scale;

        var edge = Math.floor(Math.random() * 4);
        var x, y, vx, vy;
        var speed = 25 + Math.random() * 15;

        // Target: somewhere in the inner 60% of the screen
        var tx = w * (0.2 + Math.random() * 0.6);
        var ty = h * (0.2 + Math.random() * 0.6);

        switch (edge) {
            case 0: // top
                x = randRange(radius, w - radius);
                y = -radius;
                break;
            case 1: // bottom
                x = randRange(radius, w - radius);
                y = h + radius;
                break;
            case 2: // left
                x = -radius;
                y = randRange(radius, h - radius);
                break;
            case 3: // right
                x = w + radius;
                y = randRange(radius, h - radius);
                break;
        }

        // Velocity toward target with some randomness
        var dir = normalize(tx - x, ty - y);
        vx = dir.x * speed;
        vy = dir.y * speed;

        var planet = new Planet(x, y, vx, vy, radius, this.planetsSpawned);
        planet.spawnTime = this.gameTime;
        this.planets.push(planet);
        this.planetsSpawned++;
        SynthAudio.playPlanetArrive();
    }

    // --- Moon launching ---

    _launchMoon(ox, oy, dx, dy) {
        var scale = this._screenScale();
        var moon = new Moon(ox, oy, dx * LAUNCH_SPEED, dy * LAUNCH_SPEED, 7 * scale);
        this.moons.push(moon);
        this.totalLaunched++;
        this.launchCooldown = LAUNCH_COOLDOWN;
        SynthAudio.playLaunch();
    }

    // --- Find target planet for aim line ---

    _findTargetPlanet(ox, oy, dx, dy) {
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return null;
        var ndx = dx / len;
        var ndy = dy / len;

        var best = null;
        var bestDist = Infinity;

        for (var i = 0; i < this.planets.length; i++) {
            var p = this.planets[i];
            // Project planet center onto ray
            var toPX = p.x - ox;
            var toPY = p.y - oy;
            var dot = toPX * ndx + toPY * ndy;
            if (dot < 0) continue; // behind origin

            // Perpendicular distance from ray
            var projX = ox + ndx * dot;
            var projY = oy + ndy * dot;
            var perpDist = dist(projX, projY, p.x, p.y);

            if (perpDist < 200 && dot < bestDist) {
                bestDist = dot;
                best = p;
            }
        }
        return best;
    }

    // --- Shatter ---

    _shatterMoon(moon, chainSize) {
        moon.markedForShatter = true;
    }

    _doShatter(moon, chainSize) {
        // Remove from planet
        if (moon.planet) {
            var idx = moon.planet.moons.indexOf(moon);
            if (idx >= 0) moon.planet.moons.splice(idx, 1);
            if (moon.orbitIndex >= 0) {
                moon.planet.slotOccupied[moon.orbitIndex] = false;
            }
        }

        // Decrement score if was orbiting
        if (moon.state === 'orbiting') {
            this.score = Math.max(0, this.score - 1);
        }

        // Particles
        var count = 10 + Math.floor(Math.random() * 4);
        this._spawnParticles(moon.x, moon.y, count, moon.color, 100);

        // Flash ring for chain reactions
        if (chainSize > 1) {
            this.flashRings.push(new FlashRing(moon.x, moon.y, 60, 0.3, '#FFFFFF'));
        }

        // Shake
        this.shakeAmount = Math.max(this.shakeAmount, chainSize >= 3 ? 10 : 5);

        SynthAudio.playShatter(chainSize);

        // Remove moon
        var mi = this.moons.indexOf(moon);
        if (mi >= 0) this.moons.splice(mi, 1);
    }

    // --- Collisions ---

    _checkCollisions() {
        for (var i = 0; i < this.moons.length; i++) {
            var a = this.moons[i];
            if (a.markedForShatter) continue;
            if (a.state !== 'orbiting' && a.state !== 'flying') continue;

            for (var j = i + 1; j < this.moons.length; j++) {
                var b = this.moons[j];
                if (b.markedForShatter) continue;
                if (b.state !== 'orbiting' && b.state !== 'flying') continue;

                // Skip grace period collisions between two newly launched moons
                if (a.state === 'flying' && a.launchGrace > 0) continue;
                if (b.state === 'flying' && b.launchGrace > 0) continue;

                var d = dist(a.x, a.y, b.x, b.y);
                if (d < a.radius + b.radius) {
                    a.markedForShatter = true;
                    b.markedForShatter = true;
                }
            }
        }
    }

    // --- Particles ---

    _spawnParticles(x, y, count, color, speed) {
        for (var i = 0; i < count; i++) {
            var angle = randAngle();
            var spd = speed * (0.3 + Math.random() * 0.7);
            var r = 2 + Math.random() * 3;
            var p = new Particle(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                r, color,
                1.0,
                1.5 + Math.random() * 1.5
            );
            this.particles.push(p);
        }
    }

    // ==========================================================
    // RENDERING
    // ==========================================================

    render() {
        if (this.state === 'loading') this.renderLoading();
        else if (this.state === 'menu') this.renderMenu();
        else if (this.state === 'playing') this.renderPlaying();
        else if (this.state === 'gameover') this.renderGameOver();
    }

    renderLoading() {
        var ctx = this.ctx;
        var w = this.canvas.width, h = this.canvas.height;
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading...', w / 2, h / 2);
    }

    // --- Stars ---

    _renderStars(ctx, w, h, time) {
        for (var i = 0; i < this.stars.length; i++) {
            var s = this.stars[i];
            var sx = s.x * w;
            var sy = s.y * h;
            // Subtle parallax drift
            sx += Math.sin(time * 0.1 + s.twinkleOffset) * s.depth * 2;
            sy += time * s.depth * 0.5;
            // Wrap
            sy = ((sy % h) + h) % h;
            sx = ((sx % w) + w) % w;

            var alpha = s.brightness * (0.7 + 0.3 * Math.sin(time * 2 + s.twinkleOffset));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    // --- Menu ---

    renderMenu() {
        var ctx = this.ctx;
        var w = this.canvas.width, h = this.canvas.height;
        var scale = this._screenScale();
        var t = this.menuTime;

        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);

        this._renderStars(ctx, w, h, t);

        // Demo planet + moons
        var demoX = w * 0.65;
        var demoY = h * 0.45;
        var demoR = 40 * scale;

        // Orbit rings
        ctx.setLineDash([4, 6]);
        for (var i = 0; i < this.demoMoons.length; i++) {
            ctx.strokeStyle = 'rgba(74,144,217,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(demoX, demoY, this.demoMoons[i].orbitRadius * scale, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Planet
        ctx.beginPath();
        ctx.arc(demoX, demoY, demoR, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE[0];
        ctx.fill();
        // Highlight
        var grad = ctx.createRadialGradient(demoX - demoR * 0.3, demoY - demoR * 0.3, 0, demoX, demoY, demoR);
        grad.addColorStop(0, 'rgba(255,255,255,0.25)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Demo moons
        for (var j = 0; j < this.demoMoons.length; j++) {
            var dm = this.demoMoons[j];
            var mx = demoX + Math.cos(dm.angle) * dm.orbitRadius * scale;
            var my = demoY + Math.sin(dm.angle) * dm.orbitRadius * scale;
            ctx.beginPath();
            ctx.arc(mx, my, dm.radius * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
        }

        // Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold ' + Math.round(44 * scale) + 'px sans-serif';
        ctx.fillText('ORBIT KEEPER', w / 2, h * 0.35 - 60 * scale);

        // Subtitle
        ctx.fillStyle = '#AAAAAA';
        ctx.font = Math.round(18 * scale) + 'px sans-serif';
        ctx.fillText('Tap and drag to launch moons', w / 2, h * 0.35 - 20 * scale);

        // Best score
        if (this.bestScore > 0) {
            ctx.fillStyle = '#888888';
            ctx.font = Math.round(16 * scale) + 'px sans-serif';
            ctx.fillText('Best: ' + this.bestScore + ' moons', w / 2, h * 0.35 + 10 * scale);
        }

        // Tap to start
        var pulseAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3));
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold ' + Math.round(22 * scale) + 'px sans-serif';
        ctx.fillText('Tap to Start', w / 2, h * 0.35 + 50 * scale);
        ctx.globalAlpha = 1.0;
    }

    // --- Playing ---

    renderPlaying() {
        var ctx = this.ctx;
        var w = this.canvas.width, h = this.canvas.height;
        var scale = this._screenScale();

        // Apply screen shake
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // Background
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(-10, -10, w + 20, h + 20);

        // Stars
        this._renderStars(ctx, w, h, this.gameTime);

        // Orbit ring guides
        for (var pi = 0; pi < this.planets.length; pi++) {
            var p = this.planets[pi];
            if (!p.anchored) continue;

            ctx.setLineDash([4, 8]);
            for (var si = 0; si < 4; si++) {
                var alpha = p.slotOccupied[si] ? 0.25 : 0.12;
                ctx.strokeStyle = p.ringColor;
                ctx.globalAlpha = alpha;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.orbitSlots[si], 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
        }

        // Moon trails
        for (var ti = 0; ti < this.moons.length; ti++) {
            var tm = this.moons[ti];
            if (tm.state !== 'orbiting' || tm.trail.length < 2) continue;
            for (var tr = 0; tr < tm.trail.length; tr++) {
                var trailT = tr / tm.trail.length;
                var trailAlpha = trailT * 0.35;
                var trailR = lerp(1, tm.radius * 0.5, trailT);
                ctx.globalAlpha = trailAlpha;
                ctx.fillStyle = tm.planet ? tm.planet.color : '#FFFFFF';
                ctx.beginPath();
                ctx.arc(tm.trail[tr].x, tm.trail[tr].y, trailR, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;

        // Planets
        for (var pj = 0; pj < this.planets.length; pj++) {
            var planet = this.planets[pj];

            // Breathing glow
            var glowAlpha = 0.1 + 0.05 * Math.sin(planet.pulseTimer);
            var glowRadius = planet.radius + 3 + 3 * Math.sin(planet.pulseTimer);

            // Hint pulse for first unanChored planet
            if (!planet.anchored && this.hintTimer > 5 && !this.hasAnchored) {
                glowAlpha += 0.15 * (0.5 + 0.5 * Math.sin(this.gameTime * 4));
            }

            ctx.beginPath();
            ctx.arc(planet.x, planet.y, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.globalAlpha = glowAlpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Planet body
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
            ctx.fillStyle = planet.color;
            ctx.fill();

            // Highlight gradient
            var pg = ctx.createRadialGradient(
                planet.x - planet.radius * 0.3,
                planet.y - planet.radius * 0.3,
                0,
                planet.x, planet.y, planet.radius
            );
            pg.addColorStop(0, 'rgba(255,255,255,0.2)');
            pg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = pg;
            ctx.fill();
        }

        // Moons
        for (var mi = 0; mi < this.moons.length; mi++) {
            var m = this.moons[mi];
            if (m.state === 'shattering') continue;

            if (m.state === 'flying') {
                // Motion blur ghosts
                var speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
                if (speed > 1) {
                    var ndx = m.vx / speed;
                    var ndy = m.vy / speed;
                    for (var g = 1; g <= 3; g++) {
                        ctx.globalAlpha = 0.15 - g * 0.04;
                        ctx.fillStyle = '#FFFFFF';
                        ctx.beginPath();
                        ctx.arc(m.x - ndx * g * 8, m.y - ndy * g * 8, m.radius * 0.8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (m.state === 'capturing') {
                // Bright expanding ring
                var capT = 1.0 - (m.captureTimer / CAPTURE_DURATION);
                ctx.globalAlpha = 0.3 * (1 - capT);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(m.x, m.y, lerp(0, m.captureTargetRadius * 0.5, capT), 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1.0;

                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (m.state === 'orbiting') {
                // Slight tint from planet
                ctx.fillStyle = m.planet ? lightenColor(m.planet.color, 120) : '#FFFFFF';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
                ctx.fill();
                // White core
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Flash rings
        for (var fri = 0; fri < this.flashRings.length; fri++) {
            var fr = this.flashRings[fri];
            var frT = fr.timer / fr.duration;
            var frR = lerp(0, fr.maxRadius, frT);
            var frAlpha = 1.0 - frT;
            ctx.globalAlpha = frAlpha * 0.4;
            ctx.strokeStyle = fr.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(fr.x, fr.y, frR, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Particles
        for (var pai = 0; pai < this.particles.length; pai++) {
            var par = this.particles[pai];
            ctx.globalAlpha = par.life;
            ctx.fillStyle = par.color;
            ctx.beginPath();
            ctx.arc(par.x, par.y, par.radius * par.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // Aim line
        if (this.drag.active) {
            var dx = this.drag.currentX - this.drag.originX;
            var dy = this.drag.currentY - this.drag.originY;
            var dragLen = Math.sqrt(dx * dx + dy * dy);

            if (dragLen >= DRAG_THRESHOLD) {
                var aimDirX = dx / dragLen;
                var aimDirY = dy / dragLen;

                // Dotted aim line
                ctx.setLineDash([6, 10]);
                ctx.lineDashOffset = -this.gameTime * 40; // animated flow
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.drag.originX, this.drag.originY);
                ctx.lineTo(
                    this.drag.originX + aimDirX * 300,
                    this.drag.originY + aimDirY * 300
                );
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;

                // Moon preview at origin
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(this.drag.originX, this.drag.originY, 7 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                // Target planet highlight
                if (this.drag.targetPlanet) {
                    var tp = this.drag.targetPlanet;
                    var tpAlpha = 0.1 + 0.2 * (0.5 + 0.5 * Math.sin(this.gameTime * 6));
                    ctx.globalAlpha = tpAlpha;
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(tp.x, tp.y, tp.radius + 8, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
            }
        }

        // Score popups
        for (var spi = 0; spi < this.scorePopups.length; spi++) {
            var sp = this.scorePopups[spi];
            ctx.globalAlpha = sp.life;
            ctx.fillStyle = sp.color;
            ctx.font = 'bold ' + Math.round(20 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sp.text, sp.x, sp.y);
        }
        ctx.globalAlpha = 1.0;

        ctx.restore(); // end screen shake

        // HUD (not affected by shake)
        this._renderHUD(ctx, w, h, scale);
    }

    _renderHUD(ctx, w, h, scale) {
        var pad = 20 * scale;
        var fontSize = Math.round(32 * scale);
        var smallFont = Math.round(14 * scale);

        // Score - top left
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.save();
        var sScale = this.scoreDisplayScale;
        ctx.translate(pad, pad);
        ctx.scale(sScale, sScale);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.9;
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.fillText(String(this.score), 0, 0);
        ctx.fillStyle = '#AAAAAA';
        ctx.font = smallFont + 'px sans-serif';
        ctx.fillText('MOONS', 0, fontSize + 2);
        ctx.restore();

        // Best - top right
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#888888';
        ctx.font = smallFont + 'px sans-serif';
        ctx.fillText('BEST', w - pad, pad);
        ctx.font = 'bold ' + Math.round(20 * scale) + 'px sans-serif';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText(String(this.bestScore), w - pad, pad + smallFont + 2);
        ctx.globalAlpha = 1.0;

        // Combo indicator
        if (this.comboCount >= 2) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#FFD700';
            ctx.globalAlpha = 0.8;
            ctx.font = 'bold ' + Math.round(16 * scale) + 'px sans-serif';
            ctx.fillText('x' + this.comboCount + ' COMBO', w / 2, pad);
            ctx.globalAlpha = 1.0;
        }
    }

    // --- Game Over ---

    renderGameOver() {
        var ctx = this.ctx;
        var w = this.canvas.width, h = this.canvas.height;
        var scale = this._screenScale();

        // Render the frozen playing field behind
        this._renderFrozenField(ctx, w, h, scale);

        // Dim overlay
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // GAME OVER
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold ' + Math.round(44 * scale) + 'px sans-serif';
        ctx.fillText('GAME OVER', w / 2, h / 2 - 50 * scale);

        // Score
        ctx.fillStyle = '#FFFFFF';
        ctx.font = Math.round(28 * scale) + 'px sans-serif';
        ctx.fillText('Moons: ' + this.score, w / 2, h / 2 + 5 * scale);

        // Best
        ctx.fillStyle = '#AAAAAA';
        ctx.font = Math.round(20 * scale) + 'px sans-serif';
        ctx.fillText('Best: ' + this.bestScore, w / 2, h / 2 + 40 * scale);

        // Tap to retry
        var pulseAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.menuTime * 3));
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold ' + Math.round(22 * scale) + 'px sans-serif';
        ctx.fillText('Tap to Retry', w / 2, h / 2 + 85 * scale);
        ctx.globalAlpha = 1.0;
    }

    _renderFrozenField(ctx, w, h, scale) {
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);
        this._renderStars(ctx, w, h, this.gameTime);

        // Planets
        for (var i = 0; i < this.planets.length; i++) {
            var p = this.planets[i];
            // Orbit rings
            if (p.anchored) {
                ctx.setLineDash([4, 8]);
                for (var si = 0; si < 4; si++) {
                    ctx.strokeStyle = p.ringColor;
                    ctx.globalAlpha = p.slotOccupied[si] ? 0.2 : 0.08;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.orbitSlots[si], 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
                ctx.globalAlpha = 1.0;
            }
            // Body
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.5;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}
