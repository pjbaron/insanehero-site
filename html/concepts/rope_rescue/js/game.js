/**
 * Rope Rescue - Fling ropes between anchors to catch falling survivors
 * State machine, rAF loop, Poki lifecycle
 */

import { InputManager } from './input.js';

/** Config */
export const Config = {
    adsEnabled: true,
    adFrequency: 3, // show ad every N levels
};

// Survivor type definitions
var SurvivorTypes = {
    normal:  { radius: 14, gravity: 1.0, elasticity: 0.65, color: '#4fc3f7', bounceLimit: 3, mass: 1.0, label: '' },
    heavy:   { radius: 18, gravity: 1.4, elasticity: 0.45, color: '#ff7043', bounceLimit: 2, mass: 1.8, label: 'H' },
    floaty:  { radius: 12, gravity: 0.5, elasticity: 0.8,  color: '#ce93d8', bounceLimit: 3, mass: 0.6, label: 'F' },
    twin:    { radius: 12, gravity: 0.9, elasticity: 0.7,  color: '#ffd54f', bounceLimit: 3, mass: 0.9, label: 'T' },
};

// Rope color degradation: fresh -> worn -> about to snap
var RopeColors = [
    ['#66bb6a', '#43a047'], // 3 bounces left - green
    ['#ffa726', '#f57c00'], // 2 bounces left - orange
    ['#ef5350', '#c62828'], // 1 bounce left - red
];

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading';
        this.score = 0;
        this.lastTime = 0;

        // Screen shake
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Slow-mo
        this.timeScale = 1;
        this.slowMoTimer = 0;

        // Game state
        this.level = 0;
        this.lives = 3;
        this.combo = 0;
        this.maxCombo = 0;
        this.ropesUsed = 0;
        this.rescued = 0;
        this.splatted = 0;
        this.totalRescued = 0;
        this.totalSplatted = 0;

        // Level objects
        this.anchors = [];      // {x, y, radius, hover}
        this.ropes = [];        // {x1,y1, x2,y2, bouncesLeft, maxBounces, flash}
        this.survivors = [];    // {x,y, vx,vy, type, radius, gravity, elasticity, alive, rescued, bounceCount}
        this.platforms = [];    // {x1,y1, x2,y2}
        this.rescueZone = null; // {x,y,w,h}
        this.spawnQueue = [];   // remaining spawns for current level
        this.levelTime = 0;
        this.levelComplete = false;
        this.levelCompleteTimer = 0;

        // Drag state
        this.dragAnchor = null;  // anchor being dragged from
        this.nearAnchor = null;  // anchor being hovered near

        // Combo timer - combo resets if no bounce within this time
        this.comboTimer = 0;
        this.comboDecayTime = 3.0; // seconds

        // Combo text
        this.comboTexts = []; // {text, x, y, timer, scale}

        // Level transition
        this.transitionTimer = 0;
        this.transitionText = '';

        // Stars
        this.stars = 0;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);
    }

    async init() {
        await Poki.init();
        this._resize();
        Particles.init();
        await this.loadAssets();
        Poki.gameLoadingFinished();
        this.state = 'menu';
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);
    }

    async loadAssets() {
        // No assets to load - we use procedural audio and canvas rendering
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
        this.level = 0;
        this.totalRescued = 0;
        this.totalSplatted = 0;
        GameAudio.initContext();
        GameAudio.resume();
        Synth.init();
        Synth.click();
        Poki.gameplayStart();
        this._loadLevel(0);
        // Consume any drag events from the tap that started the game
        this.input._dragStarted = false;
        this.input._dragEnded = false;
        this.dragAnchor = null;
    }

    gameOver() {
        this.state = 'gameover';
        Synth.gameOverSound();
        Poki.gameplayStop();
        // Splat particles for drama
        this.shake(12, 0.4);
    }

    async restart() {
        this.state = 'playing';
        this.score = 0;
        this.level = 0;
        this.totalRescued = 0;
        this.totalSplatted = 0;
        if (Config.adsEnabled) {
            Poki.gameplayStop();
            await Poki.commercialBreak(
                () => { GameAudio.muteAll(); Synth.mute(); },
                () => { GameAudio.unmuteAll(); Synth.unmute(); }
            );
        }
        Poki.gameplayStart();
        Particles.clear();
        this._loadLevel(0);
        // Consume any drag events from the tap that restarted
        this.input._dragStarted = false;
        this.input._dragEnded = false;
        this.dragAnchor = null;
    }

    // -------------------------------------------------------
    // Level management
    // -------------------------------------------------------

    _loadLevel(num) {
        this.level = num;
        var data = Levels.get(num);

        var w = this.canvas.width;
        var h = this.canvas.height;

        // Convert percentage positions to pixels
        this.anchors = data.anchors.map(function(a) {
            return {
                x: a.x * w,
                y: a.y * h,
                radius: Math.max(16, Math.min(24, w * 0.025)),
                hover: false
            };
        });

        this.platforms = data.platforms.map(function(p) {
            return { x1: p.x1 * w, y1: p.y1 * h, x2: p.x2 * w, y2: p.y2 * h };
        });

        var rz = data.rescueZone;
        this.rescueZone = { x: rz.x * w, y: rz.y * h, w: rz.w * w, h: rz.h * h };

        this.ropes = [];
        this.survivors = [];
        this.combo = 0;
        this.comboTimer = 0;
        this.maxCombo = 0;
        this.ropesUsed = 0;
        this.rescued = 0;
        this.splatted = 0;
        this.lives = data.maxLives;
        this.levelTime = 0;
        this.levelComplete = false;
        this.levelCompleteTimer = 0;
        this.dragAnchor = null;
        this.nearAnchor = null;

        // Copy spawn queue
        this.spawnQueue = data.spawns.map(function(s) {
            return {
                type: s.type,
                delay: s.delay,
                x: s.x * w,
                vx: s.vx * w * 0.3,
                spawned: false
            };
        });

        this.par = data.par;

        // Show level transition
        this.transitionTimer = 1.5;
        this.transitionText = 'Level ' + (num + 1);

        Particles.clear();
    }

    _checkLevelComplete() {
        if (this.levelComplete) return;

        // All spawned and no survivors left alive
        var allSpawned = true;
        for (var i = 0; i < this.spawnQueue.length; i++) {
            if (!this.spawnQueue[i].spawned) { allSpawned = false; break; }
        }
        if (!allSpawned) return;

        var anyAlive = false;
        for (var i = 0; i < this.survivors.length; i++) {
            if (this.survivors[i].alive && !this.survivors[i].rescued) {
                anyAlive = true;
                break;
            }
        }
        if (anyAlive) return;

        this.levelComplete = true;
        this.levelCompleteTimer = 2.5;

        // Calculate stars
        this.stars = 1; // completed
        if (this.splatted === 0) this.stars = 2; // no splats
        if (this.splatted === 0 && this.ropesUsed <= this.par) this.stars = 3; // under par

        Synth.levelComplete();
        this.shake(6, 0.3);

        // Score bonus
        var bonus = 500 * this.stars + this.maxCombo * 100;
        this.score += bonus;
        Particles.textPopup(
            this.canvas.width / 2, this.canvas.height / 2 - 60,
            '+' + bonus, 255, 215, 0, 2.0
        );
    }

    async _nextLevel() {
        var nextLevel = this.level + 1;

        // Show ad every N levels
        if (Config.adsEnabled && nextLevel % Config.adFrequency === 0) {
            Poki.gameplayStop();
            await Poki.commercialBreak(
                () => { GameAudio.muteAll(); Synth.mute(); },
                () => { GameAudio.unmuteAll(); Synth.unmute(); }
            );
            Poki.gameplayStart();
        }

        this._loadLevel(nextLevel);
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    update(dt) {
        // Update shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            var shakeFade = Math.max(0, this.shakeTimer) / 0.3;
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * shakeFade * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * shakeFade * 2;
            if (this.shakeTimer <= 0) this.shakeIntensity = 0;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // Update slow-mo
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            this.timeScale = 0.3;
        } else {
            this.timeScale = 1;
        }

        Particles.update(dt);

        // Combo text decay
        for (var i = this.comboTexts.length - 1; i >= 0; i--) {
            this.comboTexts[i].timer -= dt;
            if (this.comboTexts[i].timer <= 0) this.comboTexts.splice(i, 1);
        }

        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();

        if (this.state === 'menu') {
            if (confirm) this.start();
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            if (confirm) this.restart();
        }
    }

    updatePlaying(dt) {
        var gameDt = dt * this.timeScale;

        // Level transition overlay
        if (this.transitionTimer > 0) {
            this.transitionTimer -= dt;
            if (this.transitionTimer > 1.0) return; // Freeze during first part
        }

        // Level complete timer
        if (this.levelComplete) {
            this.levelCompleteTimer -= dt;
            if (this.levelCompleteTimer <= 0) {
                this._nextLevel();
            }
            return;
        }

        this.levelTime += gameDt;

        // Combo decay
        if (this.combo > 0) {
            this.comboTimer -= gameDt;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // Spawn survivors
        this._updateSpawns();

        // Handle drag input
        this._updateDragInput();

        // Update survivors
        this._updateSurvivors(gameDt);

        // Check level complete
        this._checkLevelComplete();
    }

    _updateSpawns() {
        for (var i = 0; i < this.spawnQueue.length; i++) {
            var sp = this.spawnQueue[i];
            if (!sp.spawned && this.levelTime >= sp.delay) {
                sp.spawned = true;
                this._spawnSurvivor(sp.type, sp.x, sp.vx);
            }
        }
    }

    _spawnSurvivor(type, x, vx) {
        var def = SurvivorTypes[type];
        var s = {
            x: x,
            y: -def.radius * 2,
            vx: vx || 0,
            vy: 30 + Math.random() * 20,
            type: type,
            radius: def.radius,
            gravityMul: def.gravity,
            elasticity: def.elasticity,
            mass: def.mass,
            color: def.color,
            label: def.label,
            bounceLimit: def.bounceLimit,
            alive: true,
            rescued: false,
            bounceCount: 0,
            trail: [], // for visual trail
            invuln: 0.1, // brief invulnerability after bounce
            splitDone: false
        };
        this.survivors.push(s);
    }

    _updateDragInput() {
        var input = this.input;
        var anchorGrabRadius = Math.max(35, this.canvas.width * 0.04);

        // Find nearest anchor to pointer
        this.nearAnchor = null;
        if (!this.levelComplete) {
            var bestDist = anchorGrabRadius;
            for (var i = 0; i < this.anchors.length; i++) {
                var a = this.anchors[i];
                a.hover = false;
                var d = Physics.dist(input.mouseX, input.mouseY, a.x, a.y);
                if (d < bestDist) {
                    bestDist = d;
                    this.nearAnchor = a;
                }
            }
            if (this.nearAnchor) this.nearAnchor.hover = true;
        }

        // Start drag
        if (input.dragStarted()) {
            if (this.nearAnchor) {
                this.dragAnchor = this.nearAnchor;
            } else {
                // Check if tapped near a rope to cut it
                this._tryCutRope(input.mouseX, input.mouseY);
            }
        }

        // End drag - create rope if dragged to different anchor
        if (input.dragEnded()) {
            if (this.dragAnchor) {
                var end = input.getDragEnd();
                // Find anchor near end point
                var endAnchor = null;
                var bestDist2 = anchorGrabRadius;
                for (var i = 0; i < this.anchors.length; i++) {
                    var a = this.anchors[i];
                    if (a === this.dragAnchor) continue;
                    var d = Physics.dist(end.x, end.y, a.x, a.y);
                    if (d < bestDist2) {
                        bestDist2 = d;
                        endAnchor = a;
                    }
                }
                if (endAnchor) {
                    this._createRope(this.dragAnchor, endAnchor);
                }
            } else {
                // Quick tap - try to cut rope
                this._tryCutRope(input.mouseX, input.mouseY);
            }
            this.dragAnchor = null;
        }
    }

    _createRope(anchor1, anchor2) {
        // Check for duplicate ropes
        for (var i = 0; i < this.ropes.length; i++) {
            var r = this.ropes[i];
            if ((r.x1 === anchor1.x && r.y1 === anchor1.y && r.x2 === anchor2.x && r.y2 === anchor2.y) ||
                (r.x1 === anchor2.x && r.y1 === anchor2.y && r.x2 === anchor1.x && r.y2 === anchor1.y)) {
                return; // Duplicate
            }
        }

        this.ropes.push({
            x1: anchor1.x, y1: anchor1.y,
            x2: anchor2.x, y2: anchor2.y,
            bouncesLeft: 3,
            maxBounces: 3,
            flash: 0.15, // visual flash on create
            age: 0
        });
        this.ropesUsed++;
        Synth.ropePlace();
    }

    _tryCutRope(px, py) {
        var cutDist = Math.max(25, this.canvas.width * 0.03);
        for (var i = this.ropes.length - 1; i >= 0; i--) {
            var r = this.ropes[i];
            var d = Physics.pointToSegmentDist(px, py, r.x1, r.y1, r.x2, r.y2);
            if (d < cutDist) {
                // Cut particles
                var mx = (r.x1 + r.x2) / 2;
                var my = (r.y1 + r.y2) / 2;
                Particles.emit(mx, my, {
                    count: 6, r: 200, g: 200, b: 200,
                    speed: 100, life: 0.3, size: 2, type: 'spark'
                });
                Synth.ropeCut();
                this.ropes.splice(i, 1);
                return;
            }
        }
    }

    _updateSurvivors(dt) {
        var w = this.canvas.width;
        var h = this.canvas.height;
        var groundY = h - 10;

        for (var i = this.survivors.length - 1; i >= 0; i--) {
            var s = this.survivors[i];
            if (!s.alive) continue;
            if (s.rescued) continue;

            // Invulnerability cooldown
            if (s.invuln > 0) s.invuln -= dt;

            // Gravity
            s.vy += Physics.GRAVITY * s.gravityMul * dt;

            // Apply velocity
            s.x += s.vx * dt;
            s.y += s.vy * dt;

            // Wall bounce
            if (s.x < s.radius) { s.x = s.radius; s.vx = Math.abs(s.vx) * 0.8; }
            if (s.x > w - s.radius) { s.x = w - s.radius; s.vx = -Math.abs(s.vx) * 0.8; }

            // Platform collision
            for (var pi = 0; pi < this.platforms.length; pi++) {
                var plat = this.platforms[pi];
                this._collideSurvivorSegment(s, plat.x1, plat.y1, plat.x2, plat.y2, null, dt);
            }

            // Rope collision
            if (s.invuln <= 0) {
                for (var ri = this.ropes.length - 1; ri >= 0; ri--) {
                    var rope = this.ropes[ri];
                    var bounced = this._collideSurvivorSegment(s, rope.x1, rope.y1, rope.x2, rope.y2, rope, dt);
                    if (bounced) {
                        s.invuln = 0.15;
                        rope.bouncesLeft--;
                        rope.flash = 0.1;

                        // Combo
                        this.combo++;
                        this.comboTimer = this.comboDecayTime;
                        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                        this.score += 10 * this.combo;

                        // Effects
                        Synth.bounce(this.combo);
                        this.shake(3 + this.combo, 0.15);

                        // Bounce particles
                        Particles.emit(s.x, s.y, {
                            count: 5 + this.combo * 2,
                            r: parseInt(s.color.substr(1,2), 16),
                            g: parseInt(s.color.substr(3,2), 16),
                            b: parseInt(s.color.substr(5,2), 16),
                            speed: 120, life: 0.4, size: 3
                        });

                        // Combo text
                        if (this.combo > 1) {
                            Synth.comboUp(this.combo);
                            Particles.textPopup(s.x, s.y - 30,
                                'x' + this.combo, 255, 255, 100, 1.2 + this.combo * 0.15);
                            if (this.combo >= 4) {
                                this.slowMoTimer = 0.3;
                            }
                        }

                        Particles.textPopup(s.x + 20, s.y - 10,
                            '+' + (10 * this.combo), 255, 255, 255, 0.9);

                        // Rope snaps
                        if (rope.bouncesLeft <= 0) {
                            var mx = (rope.x1 + rope.x2) / 2;
                            var my = (rope.y1 + rope.y2) / 2;
                            Particles.emit(mx, my, {
                                count: 10, r: 239, g: 83, b: 80,
                                speed: 150, life: 0.4, size: 2, type: 'spark'
                            });
                            Synth.ropeSnap();
                            this.ropes.splice(ri, 1);
                        }

                        // Twin split on first bounce
                        if (s.type === 'twin' && !s.splitDone) {
                            s.splitDone = true;
                            this._spawnSurvivor('normal', s.x + 15, s.vx + 60);
                            var twin = this.survivors[this.survivors.length - 1];
                            twin.y = s.y - 5;
                            twin.vy = s.vy * 0.7;
                            twin.color = '#fff176';
                        }

                        break; // Only one rope collision per frame
                    }
                }
            }

            // Check rescue zone
            var rz = this.rescueZone;
            if (s.y + s.radius > rz.y && s.y - s.radius < rz.y + rz.h &&
                s.x > rz.x && s.x < rz.x + rz.w) {
                s.rescued = true;
                s.alive = false;
                this.rescued++;
                this.totalRescued++;
                this.score += 100 + this.combo * 50;

                Synth.rescue(this.combo);
                this.shake(5, 0.2);

                // Rescue celebration particles
                Particles.emit(s.x, rz.y, {
                    count: 15, r: 100, g: 255, b: 100,
                    speed: 200, life: 0.6, size: 4,
                    angle: -Math.PI / 2, spread: Math.PI * 0.8
                });
                Particles.textPopup(s.x, rz.y - 20,
                    'SAVED!', 100, 255, 100, 1.5);
                continue;
            }

            // Hit ground = splat
            if (s.y + s.radius > groundY) {
                s.alive = false;
                this.splatted++;
                this.totalSplatted++;
                this.lives--;
                this.combo = 0; // Reset combo on splat

                Synth.splat();
                this.shake(10, 0.3);

                // Splat particles
                Particles.emit(s.x, groundY, {
                    count: 20, r: 255, g: 80, b: 60,
                    speed: 250, life: 0.5, size: 4,
                    angle: -Math.PI / 2, spread: Math.PI
                });
                Particles.textPopup(s.x, groundY - 40,
                    'SPLAT!', 255, 60, 60, 1.8);

                if (this.lives <= 0) {
                    this.gameOver();
                    return;
                }
                continue;
            }

            // Trail
            if (s.trail.length === 0 || Physics.dist(s.x, s.y, s.trail[s.trail.length-1].x, s.trail[s.trail.length-1].y) > 8) {
                s.trail.push({x: s.x, y: s.y});
                if (s.trail.length > 12) s.trail.shift();
            }
        }

        // Update rope ages and flash timers
        for (var i = 0; i < this.ropes.length; i++) {
            var r = this.ropes[i];
            r.age += dt;
            if (r.flash > 0) r.flash -= dt;
        }
    }

    _collideSurvivorSegment(s, x1, y1, x2, y2, rope, dt) {
        var hit = Physics.circleSegment(s.x, s.y, s.radius, x1, y1, x2, y2);
        if (!hit.hit) return false;

        // Push out of segment
        s.x += hit.nx * hit.penetration * 1.1;
        s.y += hit.ny * hit.penetration * 1.1;

        // Reflect velocity
        var ref = Physics.reflect(s.vx, s.vy, hit.nx, hit.ny, s.elasticity);
        if (ref.bounced) {
            s.vx = ref.vx;
            s.vy = ref.vy;

            // Add a bit of sag effect - bounce slightly sideways
            if (rope) {
                var dx = x2 - x1;
                var len = Math.sqrt(dx * dx + (y2 - y1) * (y2 - y1));
                if (len > 0) {
                    // Slight horizontal nudge along rope direction
                    s.vx += (dx / len) * 15 * (Math.random() - 0.5);
                }
            }
            return true;
        }
        return false;
    }

    // -------------------------------------------------------
    // Screen shake
    // -------------------------------------------------------

    shake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeTimer = Math.max(this.shakeTimer, duration || 0.2);
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        if (this.state === 'loading') this.renderLoading();
        else if (this.state === 'menu') this.renderMenu();
        else if (this.state === 'playing') this.renderPlaying();
        else if (this.state === 'gameover') this.renderGameOver();

        ctx.restore();
    }

    renderLoading() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(-10, -10, w + 20, h + 20);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', w / 2, h / 2);
    }

    renderMenu() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        var t = performance.now() / 1000;

        // Background
        this._renderBackground(ctx, w, h);

        // Animated ropes in background
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (var i = 0; i < 5; i++) {
            var y = h * 0.2 + i * h * 0.15;
            var sway = Math.sin(t * 1.5 + i * 1.3) * 20;
            ctx.strokeStyle = RopeColors[i % 3][0];
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(w * 0.1, y);
            ctx.quadraticCurveTo(w * 0.5, y + 30 + sway, w * 0.9, y);
            ctx.stroke();
        }
        ctx.restore();

        // Title
        var titleSize = Math.min(w * 0.1, 64);
        ctx.font = 'bold ' + titleSize + 'px sans-serif';
        ctx.textAlign = 'center';

        // Title shadow
        ctx.fillStyle = '#000';
        ctx.fillText('ROPE RESCUE', w / 2 + 3, h * 0.32 + 3);

        // Title gradient
        var grad = ctx.createLinearGradient(w * 0.3, h * 0.25, w * 0.7, h * 0.35);
        grad.addColorStop(0, '#66bb6a');
        grad.addColorStop(0.5, '#ffa726');
        grad.addColorStop(1, '#ef5350');
        ctx.fillStyle = grad;
        ctx.fillText('ROPE RESCUE', w / 2, h * 0.32);

        // Subtitle
        ctx.font = Math.min(w * 0.035, 20) + 'px sans-serif';
        ctx.fillStyle = '#b0bec5';
        ctx.fillText('Drag between anchors to stretch ropes', w / 2, h * 0.40);
        ctx.fillText('Bounce survivors to the rescue zone!', w / 2, h * 0.44);

        // Animated play button
        var btnPulse = 1 + Math.sin(t * 3) * 0.05;
        var btnW = Math.min(w * 0.5, 260) * btnPulse;
        var btnH = Math.min(h * 0.08, 56) * btnPulse;
        var btnX = w / 2 - btnW / 2;
        var btnY = h * 0.55;

        ctx.fillStyle = '#43a047';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.min(w * 0.045, 26) + 'px sans-serif';
        ctx.fillText('TAP TO PLAY', w / 2, btnY + btnH / 2 + Math.min(w * 0.015, 9));

        // Demo falling survivor
        var demoY = h * 0.7 + Math.sin(t * 2) * 15;
        ctx.beginPath();
        ctx.arc(w / 2, demoY, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#4fc3f7';
        ctx.fill();
        ctx.strokeStyle = '#29b6f6';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Face on demo survivor
        this._drawFace(ctx, w / 2, demoY, 14, true);
    }

    renderPlaying() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Background
        this._renderBackground(ctx, w, h);

        // Rescue zone
        this._renderRescueZone(ctx);

        // Platforms
        this._renderPlatforms(ctx);

        // Ropes
        this._renderRopes(ctx);

        // Drag preview
        if (this.dragAnchor && this.input.dragging) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(this.dragAnchor.x, this.dragAnchor.y);
            ctx.lineTo(this.input.mouseX, this.input.mouseY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Anchors
        this._renderAnchors(ctx);

        // Survivors
        this._renderSurvivors(ctx);

        // Particles
        Particles.render(ctx);

        // HUD
        this._renderHUD(ctx, w, h);

        // Level transition overlay
        if (this.transitionTimer > 0) {
            var alpha = Math.min(1, this.transitionTimer / 0.5);
            if (this.transitionTimer > 1.0) alpha = 1;
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.min(w * 0.08, 48) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.transitionText, w / 2, h / 2);
            ctx.font = Math.min(w * 0.035, 20) + 'px sans-serif';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Lives: ' + this.lives + '  |  Par: ' + this.par + ' ropes', w / 2, h / 2 + 40);
            ctx.restore();
        }

        // Level complete overlay
        if (this.levelComplete) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#66bb6a';
            ctx.font = 'bold ' + Math.min(w * 0.08, 48) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL COMPLETE!', w / 2, h / 2 - 40);

            // Stars
            var starSize = Math.min(w * 0.06, 36);
            var starY = h / 2 + 10;
            for (var i = 0; i < 3; i++) {
                var sx = w / 2 + (i - 1) * (starSize * 1.5);
                ctx.font = starSize + 'px sans-serif';
                ctx.fillStyle = i < this.stars ? '#ffd54f' : '#555';
                ctx.fillText(i < this.stars ? '*' : '.', sx, starY);
            }

            ctx.font = Math.min(w * 0.035, 20) + 'px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText('Ropes: ' + this.ropesUsed + ' / ' + this.par + ' par', w / 2, h / 2 + 50);
            ctx.fillText('Score: ' + Math.floor(this.score), w / 2, h / 2 + 80);
            ctx.restore();
        }
    }

    _renderBackground(ctx, w, h) {
        // Gradient sky
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a1628');
        grad.addColorStop(0.5, '#1a2a4a');
        grad.addColorStop(1, '#0d1520');
        ctx.fillStyle = grad;
        ctx.fillRect(-20, -20, w + 40, h + 40);

        // Subtle grid
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        var gridSize = 40;
        for (var x = 0; x < w; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (var y = 0; y < h; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
        ctx.restore();

        // Ground line
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, h - 10, w, 10);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h - 10);
        ctx.lineTo(w, h - 10);
        ctx.stroke();
    }

    _renderRescueZone(ctx) {
        var rz = this.rescueZone;
        if (!rz) return;

        var t = performance.now() / 1000;
        var pulse = 0.3 + Math.sin(t * 3) * 0.1;

        // Glow
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#43a047';
        ctx.fillRect(rz.x, rz.y, rz.w, rz.h);
        ctx.restore();

        // Border
        ctx.strokeStyle = '#66bb6a';
        ctx.lineWidth = 2;
        ctx.strokeRect(rz.x, rz.y, rz.w, rz.h);

        // Label
        ctx.fillStyle = '#a5d6a7';
        ctx.font = 'bold ' + Math.min(this.canvas.width * 0.025, 16) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RESCUE ZONE', rz.x + rz.w / 2, rz.y + rz.h / 2 + 5);

        // Arrow indicators
        ctx.fillStyle = '#66bb6a';
        var arrowSize = 8;
        var arrowY = rz.y - 5 - Math.sin(t * 4) * 3;
        for (var ax = rz.x + rz.w * 0.2; ax < rz.x + rz.w * 0.9; ax += rz.w * 0.3) {
            ctx.beginPath();
            ctx.moveTo(ax, arrowY);
            ctx.lineTo(ax - arrowSize, arrowY - arrowSize);
            ctx.lineTo(ax + arrowSize, arrowY - arrowSize);
            ctx.fill();
        }
    }

    _renderPlatforms(ctx) {
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (var i = 0; i < this.platforms.length; i++) {
            var p = this.platforms[i];
            ctx.beginPath();
            ctx.moveTo(p.x1, p.y1);
            ctx.lineTo(p.x2, p.y2);
            ctx.stroke();

            // Platform surface highlight
            ctx.strokeStyle = '#90a4ae';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x1, p.y1 - 2);
            ctx.lineTo(p.x2, p.y2 - 2);
            ctx.stroke();
            ctx.strokeStyle = '#78909c';
            ctx.lineWidth = 4;
        }
    }

    _renderRopes(ctx) {
        for (var i = 0; i < this.ropes.length; i++) {
            var r = this.ropes[i];
            var colorIdx = Math.max(0, 3 - r.bouncesLeft);
            if (colorIdx > 2) colorIdx = 2;
            var colors = RopeColors[colorIdx];

            // Flash white when just created or just bounced
            if (r.flash > 0) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 5;
            } else {
                ctx.strokeStyle = colors[0];
                ctx.lineWidth = 3;
            }

            // Draw rope with sag
            var mx = (r.x1 + r.x2) / 2;
            var my = (r.y1 + r.y2) / 2;
            var sagAmount = 8 + r.age * 2; // Sag increases with age
            var perpX = -(r.y2 - r.y1);
            var perpY = r.x2 - r.x1;
            var perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
            if (perpLen > 0) {
                perpX /= perpLen;
                perpY /= perpLen;
            }
            // Sag downward
            var sagDir = perpY > 0 ? 1 : -1;
            if (Math.abs(perpY) < 0.1) sagDir = 1;

            ctx.beginPath();
            ctx.moveTo(r.x1, r.y1);
            ctx.quadraticCurveTo(
                mx + perpX * sagAmount * sagDir * 0.5,
                my + Math.abs(sagAmount) * 0.7,
                r.x2, r.y2
            );
            ctx.stroke();

            // Inner highlight
            ctx.strokeStyle = colors[1];
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(r.x1, r.y1);
            ctx.quadraticCurveTo(
                mx + perpX * sagAmount * sagDir * 0.5,
                my + Math.abs(sagAmount) * 0.7,
                r.x2, r.y2
            );
            ctx.stroke();

            // Bounce pips - small dots showing remaining bounces
            var pipSize = 4;
            for (var b = 0; b < r.bouncesLeft; b++) {
                var pt = (b + 1) / (r.maxBounces + 1);
                var px = r.x1 + (r.x2 - r.x1) * pt;
                var py = r.y1 + (r.y2 - r.y1) * pt + Physics.ropeSag(pt, sagAmount * 0.7);
                ctx.beginPath();
                ctx.arc(px, py, pipSize, 0, Math.PI * 2);
                ctx.fillStyle = colors[0];
                ctx.fill();
            }
        }
    }

    _renderAnchors(ctx) {
        for (var i = 0; i < this.anchors.length; i++) {
            var a = this.anchors[i];
            var r = a.radius;

            // Glow when hovering
            if (a.hover || a === this.dragAnchor) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.arc(a.x, a.y, r * 1.8, 0, Math.PI * 2);
                ctx.fillStyle = '#4fc3f7';
                ctx.fill();
                ctx.restore();
            }

            // Outer ring
            ctx.beginPath();
            ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
            ctx.fillStyle = a.hover ? '#4fc3f7' : '#37474f';
            ctx.fill();
            ctx.strokeStyle = a.hover ? '#81d4fa' : '#546e7a';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Inner dot
            ctx.beginPath();
            ctx.arc(a.x, a.y, r * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = a.hover ? '#fff' : '#78909c';
            ctx.fill();
        }
    }

    _renderSurvivors(ctx) {
        for (var i = 0; i < this.survivors.length; i++) {
            var s = this.survivors[i];
            if (!s.alive && !s.rescued) continue;
            if (s.rescued) continue;

            // Trail
            if (s.trail.length > 1) {
                ctx.save();
                for (var ti = 0; ti < s.trail.length - 1; ti++) {
                    var alpha = (ti / s.trail.length) * 0.3;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(s.trail[ti].x, s.trail[ti].y, s.radius * 0.5 * (ti / s.trail.length), 0, Math.PI * 2);
                    ctx.fillStyle = s.color;
                    ctx.fill();
                }
                ctx.restore();
            }

            // Body
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.fill();

            // Outline
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Face
            this._drawFace(ctx, s.x, s.y, s.radius, s.vy < 0);

            // Type label
            if (s.label) {
                ctx.font = 'bold ' + Math.floor(s.radius * 0.8) + 'px sans-serif';
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(s.label, s.x, s.y + s.radius + 10);
            }
        }
    }

    _drawFace(ctx, x, y, radius, happy) {
        var eyeOffset = radius * 0.25;
        var eyeY = y - radius * 0.15;
        var eyeSize = radius * 0.15;

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(x - eyeOffset, eyeY + 1, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset, eyeY + 1, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (happy) {
            ctx.arc(x, y + radius * 0.15, radius * 0.2, 0, Math.PI);
        } else {
            ctx.arc(x, y + radius * 0.35, radius * 0.15, Math.PI, 0);
        }
        ctx.stroke();
    }

    _renderHUD(ctx, w, h) {
        var fontSize = Math.min(w * 0.04, 22);
        var padding = 15;

        // Score - top left
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#fff';
        ctx.fillText('Score: ' + Math.floor(this.score), padding, padding);

        // Level - top center
        ctx.textAlign = 'center';
        ctx.fillText('Level ' + (this.level + 1), w / 2, padding);

        // Lives - top right
        ctx.textAlign = 'right';
        ctx.fillStyle = this.lives <= 1 ? '#ef5350' : '#fff';
        var livesText = 'Lives: ';
        for (var i = 0; i < this.lives; i++) livesText += 'O ';
        ctx.fillText(livesText.trim(), w - padding, padding);

        // Combo - below score
        if (this.combo > 0) {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffd54f';
            ctx.font = 'bold ' + Math.floor(fontSize * 0.8) + 'px sans-serif';
            ctx.fillText('Combo: x' + this.combo, padding, padding + fontSize + 5);
        }

        // Ropes used - bottom left
        ctx.textAlign = 'left';
        ctx.fillStyle = '#90a4ae';
        ctx.font = Math.floor(fontSize * 0.7) + 'px sans-serif';
        ctx.fillText('Ropes: ' + this.ropesUsed, padding, h - padding - 10);
    }

    renderGameOver() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        this._renderBackground(ctx, w, h);

        Particles.render(ctx);

        // Overlay
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        var titleSize = Math.min(w * 0.09, 52);
        ctx.font = 'bold ' + titleSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef5350';
        ctx.fillText('GAME OVER', w / 2, h * 0.3);

        var infoSize = Math.min(w * 0.04, 24);
        ctx.font = infoSize + 'px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('Score: ' + Math.floor(this.score), w / 2, h * 0.42);
        ctx.fillText('Rescued: ' + this.totalRescued, w / 2, h * 0.48);
        ctx.fillText('Level reached: ' + (this.level + 1), w / 2, h * 0.54);
        ctx.fillText('Best combo: x' + this.maxCombo, w / 2, h * 0.60);

        // Play again button
        var t = performance.now() / 1000;
        var btnPulse = 1 + Math.sin(t * 3) * 0.03;
        var btnW = Math.min(w * 0.5, 260) * btnPulse;
        var btnH = Math.min(h * 0.07, 50) * btnPulse;
        var btnX = w / 2 - btnW / 2;
        var btnY = h * 0.68;

        ctx.fillStyle = '#43a047';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 12);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.min(w * 0.04, 22) + 'px sans-serif';
        ctx.fillText('TAP TO RETRY', w / 2, btnY + btnH / 2 + Math.min(w * 0.012, 7));
    }

    // -------------------------------------------------------
    // Utility
    // -------------------------------------------------------

    async showAd() {
        if (!Config.adsEnabled) return;
        Poki.gameplayStop();
        await Poki.commercialBreak(
            () => { GameAudio.muteAll(); Synth.mute(); },
            () => { GameAudio.unmuteAll(); Synth.unmute(); }
        );
        Poki.gameplayStart();
    }
}
