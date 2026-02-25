/**
 * Swarm Split - Complete Game Implementation
 * State machine, virtual coordinate system, swarm physics,
 * base combat, split mechanic, particles, screen shake
 */

import { InputManager } from './input.js';

export const Config = {
    adsEnabled: false,
    // Virtual coordinate system
    VW: 800,
    VH: 600,
    // Swarm
    CRITTER_RADIUS: 5,
    SWARM_SPEED: 220,
    SEPARATION_DIST: 14,
    WANDER_SPEED: 40,
    COHESION_STRENGTH: 60,
    ATTACK_SPEED: 180,
    // Combat
    COMBAT_RANGE: 50,
    KILL_RATE: 3.0,       // kills per second when fighting
    GARRISON_KILL_RATE: 2.0,
    // Split
    MIN_SPLIT: 3,
    RECALL_RANGE: 60,
    // Spawning
    SPAWN_INTERVAL: 2.0,  // seconds between reinforcement spawns from captured bases
    // Stars
    STAR_THRESHOLDS: [2/3, 1/3, 0],  // fraction of time remaining for 3/2/1 stars
};

// ============================================================
// Particle System
// ============================================================
var particles = [];

function spawnParticles(x, y, count, color, speed, life) {
    for (var i = 0; i < count; i++) {
        var angle = Math.random() * Math.PI * 2;
        var spd = (speed || 80) * (0.5 + Math.random() * 0.5);
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: (life || 0.5) * (0.7 + Math.random() * 0.3),
            maxLife: life || 0.5,
            color: color || '#fff',
            size: 2 + Math.random() * 3
        });
    }
}

function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= dt;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function renderParticles(ctx, ox, oy, scale) {
    for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        var sz = p.size * alpha;
        ctx.fillRect(ox + p.x * scale - sz/2, oy + p.y * scale - sz/2, sz * scale, sz * scale);
    }
    ctx.globalAlpha = 1;
}

// ============================================================
// Floating text (score popups)
// ============================================================
var floatingTexts = [];

function spawnText(x, y, text, color, size) {
    floatingTexts.push({
        x: x, y: y, text: text,
        color: color || '#fff',
        size: size || 18,
        life: 1.0,
        vy: -40
    });
}

function updateFloatingTexts(dt) {
    for (var i = floatingTexts.length - 1; i >= 0; i--) {
        var ft = floatingTexts[i];
        ft.y += ft.vy * dt;
        ft.life -= dt;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

function renderFloatingTexts(ctx, ox, oy, scale) {
    for (var i = 0; i < floatingTexts.length; i++) {
        var ft = floatingTexts[i];
        var alpha = Math.max(0, ft.life);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold ' + Math.round(ft.size * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ox + ft.x * scale, oy + ft.y * scale);
    }
    ctx.globalAlpha = 1;
}

// ============================================================
// Game Class
// ============================================================
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading';
        this.lastTime = 0;

        // Screen shake
        this.shakeAmount = 0;
        this.shakeDecay = 8;

        // Virtual -> screen transform
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Game state
        this.level = 0;
        this.maxLevelReached = 0;
        this.critters = [];     // {x, y, vx, vy, group: 'player'|'attack'|'idle', targetBase: null, hp: 1}
        this.bases = [];        // {x, y, garrison, maxGarrison, spawnRate, radius, owner: 'enemy'|'player', spawnAccum}
        this.hazards = [];
        this.timeLeft = 60;
        this.playerX = 400;
        this.playerY = 300;
        this.combatAccum = {};  // baseIndex -> fractional kill accumulator

        // Level results
        this.levelWon = false;
        this.levelLost = false;
        this.stars = 0;
        this.showingResult = false;
        this.resultTimer = 0;
        this.perfectSplitTimer = 0;

        // Swipe trail visual
        this.swipeTrailTimer = 0;
        this.lastSwipeLine = null;

        // Menu animation
        this.menuTime = 0;
        this.menuCritters = [];

        // Transition
        this.transState = 'none'; // 'none', 'fadein', 'fadeout'
        this.transAlpha = 0;
        this.transCallback = null;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);
    }

    async init() {
        await Poki.init();
        this._resize();
        SwipeTracker.init(this.canvas);
        Synth.init();
        await this.loadAssets();
        Poki.gameLoadingFinished();

        // Load saved progress
        try {
            var saved = localStorage.getItem('swarmSplit_level');
            if (saved) this.maxLevelReached = parseInt(saved) || 0;
        } catch(e) {}

        this.state = 'menu';
        this._initMenuCritters();
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);
    }

    async loadAssets() {
        // All audio is procedural via Synth - nothing to load
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Calculate virtual->screen transform (fit 800x600 with letterboxing)
        var scaleX = this.canvas.width / Config.VW;
        var scaleY = this.canvas.height / Config.VH;
        this.scale = Math.min(scaleX, scaleY);
        this.offsetX = (this.canvas.width - Config.VW * this.scale) / 2;
        this.offsetY = (this.canvas.height - Config.VH * this.scale) / 2;
    }

    _loop(now) {
        var dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = now;

        this.update(dt);
        this.render();
        this.input.endFrame();
        SwipeTracker.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // --- Coordinate conversion ---
    screenToVirtual(sx, sy) {
        return {
            x: (sx - this.offsetX) / this.scale,
            y: (sy - this.offsetY) / this.scale
        };
    }

    // --- Screen shake ---
    shake(amount) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    }

    // ================================================================
    // State transitions
    // ================================================================
    start() {
        this.level = 0;
        Synth.init();
        Synth.resume();
        GameAudio.initContext();
        GameAudio.resume();
        Poki.gameplayStart();
        this._startLevel(this.level);
    }

    startLevel(lvl) {
        this.level = lvl;
        Synth.init();
        Synth.resume();
        GameAudio.initContext();
        GameAudio.resume();
        Poki.gameplayStart();
        this._startLevel(lvl);
    }

    _startLevel(lvlIndex) {
        var lvl = getLevel(lvlIndex);
        this.state = 'playing';
        this.levelWon = false;
        this.levelLost = false;
        this.showingResult = false;
        this.resultTimer = 0;
        this.perfectSplitTimer = 0;
        this.timeLeft = lvl.timeLimit;
        this.playerX = lvl.playerStart.x;
        this.playerY = lvl.playerStart.y;
        this.combatAccum = {};
        particles = [];
        floatingTexts = [];

        // Create critters
        this.critters = [];
        for (var i = 0; i < lvl.critters; i++) {
            this.critters.push({
                x: this.playerX + (Math.random() - 0.5) * 40,
                y: this.playerY + (Math.random() - 0.5) * 40,
                vx: 0, vy: 0,
                group: 'player',
                targetBase: null,
                hp: 1
            });
        }

        // Create bases
        this.bases = [];
        for (var b = 0; b < lvl.bases.length; b++) {
            var bd = lvl.bases[b];
            this.bases.push({
                x: bd.x, y: bd.y,
                garrison: bd.garrison,
                maxGarrison: bd.garrison,
                spawnRate: bd.spawnRate,
                radius: bd.radius,
                owner: 'enemy',
                spawnAccum: 0,
                pulseTimer: 0,
                captureFlash: 0
            });
        }

        // Copy hazards
        this.hazards = lvl.hazards ? lvl.hazards.slice() : [];
    }

    gameOver() {
        this.state = 'gameover';
        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { Synth.mute(); GameAudio.muteAll(); },
                function() { Synth.unmute(); GameAudio.unmuteAll(); }
            );
        }
        Poki.gameplayStart();
        this._startLevel(this.level);
    }

    async nextLevel() {
        this.level++;
        if (this.level > this.maxLevelReached) {
            this.maxLevelReached = this.level;
            try { localStorage.setItem('swarmSplit_level', this.maxLevelReached.toString()); } catch(e) {}
        }
        if (Config.adsEnabled && this.level % 3 === 0) {
            await Poki.commercialBreak(
                function() { Synth.mute(); GameAudio.muteAll(); },
                function() { Synth.unmute(); GameAudio.unmuteAll(); }
            );
        }
        this._startLevel(this.level);
    }

    // ================================================================
    // Transitions
    // ================================================================
    fadeToBlack(callback) {
        this.transState = 'fadeout';
        this.transAlpha = 0;
        this.transCallback = callback;
    }

    fadeIn() {
        this.transState = 'fadein';
        this.transAlpha = 1;
    }

    updateTransition(dt) {
        if (this.transState === 'fadeout') {
            this.transAlpha = Math.min(1, this.transAlpha + dt * 3);
            if (this.transAlpha >= 1) {
                this.transState = 'none';
                if (this.transCallback) {
                    this.transCallback();
                    this.transCallback = null;
                    this.fadeIn();
                }
            }
        } else if (this.transState === 'fadein') {
            this.transAlpha = Math.max(0, this.transAlpha - dt * 3);
            if (this.transAlpha <= 0) {
                this.transState = 'none';
            }
        }
    }

    // ================================================================
    // Menu
    // ================================================================
    _initMenuCritters() {
        this.menuCritters = [];
        for (var i = 0; i < 60; i++) {
            this.menuCritters.push({
                x: Math.random() * Config.VW,
                y: Math.random() * Config.VH,
                vx: (Math.random() - 0.5) * 60,
                vy: (Math.random() - 0.5) * 60,
                hue: Math.floor(Math.random() * 360)
            });
        }
    }

    // ================================================================
    // UPDATE
    // ================================================================
    update(dt) {
        SwipeTracker.update(dt);
        this.updateTransition(dt);

        if (this.state === 'menu') {
            this.updateMenu(dt);
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.updateGameOver(dt);
        } else if (this.state === 'levelselect') {
            this.updateLevelSelect(dt);
        }
    }

    updateMenu(dt) {
        this.menuTime += dt;

        // Animate menu critters in a swirling pattern
        var cx = Config.VW / 2;
        var cy = Config.VH / 2 - 50;
        for (var i = 0; i < this.menuCritters.length; i++) {
            var c = this.menuCritters[i];
            var angle = Math.atan2(c.y - cy, c.x - cx);
            var dist = Math.sqrt((c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy));
            var targetDist = 60 + (i % 3) * 25 + Math.sin(this.menuTime * 2 + i) * 15;
            var tangent = angle + Math.PI / 2;
            c.vx += Math.cos(tangent) * 80 * dt;
            c.vy += Math.sin(tangent) * 80 * dt;
            c.vx += (cx + Math.cos(angle) * targetDist - c.x) * 1.5 * dt;
            c.vy += (cy + Math.sin(angle) * targetDist - c.y) * 1.5 * dt;
            c.vx *= 0.95;
            c.vy *= 0.95;
            c.x += c.vx * dt;
            c.y += c.vy * dt;
        }

        // Keyboard start
        if (this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
            Synth.tap();
            this.start();
            return;
        }

        // Tap: check specific buttons
        if (SwipeTracker.wasTap()) {
            var vp = this.screenToVirtual(SwipeTracker.x, SwipeTracker.y);
            // Play button area (virtual coords centered at 400, y~320)
            if (vp.x > 280 && vp.x < 520 && vp.y > 290 && vp.y < 350) {
                Synth.tap();
                this.start();
                return;
            }
            // Level select button (if progress exists)
            if (this.maxLevelReached > 0 && vp.x > 280 && vp.x < 520 && vp.y > 370 && vp.y < 430) {
                Synth.tap();
                this.state = 'levelselect';
                return;
            }
            // Generic tap anywhere else also starts
            Synth.tap();
            this.start();
        }
    }

    updateLevelSelect(dt) {
        this.menuTime += dt;
        var tap = SwipeTracker.wasTap();
        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space');

        if (tap) {
            var vp = this.screenToVirtual(SwipeTracker.x, SwipeTracker.y);
            // Check level buttons
            var cols = 5;
            var startX = 150;
            var startY = 200;
            var gap = 100;
            for (var i = 0; i <= this.maxLevelReached && i < 20; i++) {
                var col = i % cols;
                var row = Math.floor(i / cols);
                var bx = startX + col * gap;
                var by = startY + row * gap;
                if (vp.x > bx - 30 && vp.x < bx + 30 && vp.y > by - 30 && vp.y < by + 30) {
                    Synth.tap();
                    this.startLevel(i);
                    return;
                }
            }
            // Back button
            if (vp.y > 520 && vp.y < 570) {
                Synth.tap();
                this.state = 'menu';
                return;
            }
        }
        if (confirm) {
            Synth.tap();
            this.state = 'menu';
        }
    }

    updateGameOver(dt) {
        updateParticles(dt);
        updateFloatingTexts(dt);
        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || SwipeTracker.wasTap();
        if (confirm) {
            Synth.tap();
            this.restart();
        }
    }

    // ================================================================
    // MAIN GAMEPLAY UPDATE
    // ================================================================
    updatePlaying(dt) {
        // Result display
        if (this.showingResult) {
            this.resultTimer += dt;
            updateParticles(dt);
            updateFloatingTexts(dt);
            var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || SwipeTracker.wasTap();
            if (this.resultTimer > 1.0 && confirm) {
                if (this.levelWon) {
                    this.nextLevel();
                } else {
                    this.restart();
                }
            }
            return;
        }

        // Timer
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this._levelFail();
            return;
        }

        // Swipe trail visual decay
        if (this.swipeTrailTimer > 0) this.swipeTrailTimer -= dt;

        // Perfect split visual
        if (this.perfectSplitTimer > 0) this.perfectSplitTimer -= dt;

        // ---- Pointer tracking (move player target) ----
        if (SwipeTracker.isDown) {
            var vp = this.screenToVirtual(SwipeTracker.x, SwipeTracker.y);
            this.playerX = Math.max(10, Math.min(Config.VW - 10, vp.x));
            this.playerY = Math.max(10, Math.min(Config.VH - 10, vp.y));
        }

        // ---- Swipe split detection ----
        if (SwipeTracker.wasSwipe()) {
            var line = SwipeTracker.getSwipeLine();
            if (line) {
                var vStart = this.screenToVirtual(line.x1, line.y1);
                var vEnd = this.screenToVirtual(line.x2, line.y2);
                this._handleSplit(vStart, vEnd);
            }
        }

        // ---- Tap to recall ----
        if (SwipeTracker.wasTap() && !SwipeTracker.isDown) {
            var vTap = this.screenToVirtual(SwipeTracker.x, SwipeTracker.y);
            this._handleRecall(vTap);
        }

        // ---- Update critters ----
        this._updateCritters(dt);

        // ---- Update bases ----
        this._updateBases(dt);

        // ---- Combat ----
        this._updateCombat(dt);

        // ---- Hazard zones ----
        this._updateHazards(dt);

        // ---- Check win condition ----
        this._checkWin();

        // ---- Particles & text ----
        updateParticles(dt);
        updateFloatingTexts(dt);

        // ---- Screen shake decay ----
        if (this.shakeAmount > 0) {
            this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeDecay * dt);
        }
    }

    // ================================================================
    // Split mechanic
    // ================================================================
    _handleSplit(vStart, vEnd) {
        // Get direction perpendicular to swipe (cross product classification)
        var dx = vEnd.x - vStart.x;
        var dy = vEnd.y - vStart.y;
        var swipeLen = Math.sqrt(dx * dx + dy * dy);
        if (swipeLen < 1) return;

        // Check that the swipe line passes near the swarm centroid
        // (prevents accidental splits from just moving around)
        var swarmCX = 0, swarmCY = 0, swarmCount = 0;
        for (var i = 0; i < this.critters.length; i++) {
            if (this.critters[i].group === 'player') {
                swarmCX += this.critters[i].x;
                swarmCY += this.critters[i].y;
                swarmCount++;
            }
        }
        if (swarmCount < Config.MIN_SPLIT * 2) return;
        swarmCX /= swarmCount;
        swarmCY /= swarmCount;

        // Distance from swarm centroid to the swipe line segment
        var t = Math.max(0, Math.min(1, ((swarmCX - vStart.x) * dx + (swarmCY - vStart.y) * dy) / (swipeLen * swipeLen)));
        var closestX = vStart.x + t * dx;
        var closestY = vStart.y + t * dy;
        var distToSwarm = Math.sqrt((swarmCX - closestX) * (swarmCX - closestX) + (swarmCY - closestY) * (swarmCY - closestY));

        // Only split if swipe passes within reasonable range of the swarm
        var swarmRadius = Math.sqrt(swarmCount) * Config.SEPARATION_DIST * 0.8;
        if (distToSwarm > swarmRadius + 40) return;

        // Classify all player critters: which side of the swipe line?
        var groupA = [];
        var groupB = [];
        for (var i = 0; i < this.critters.length; i++) {
            var c = this.critters[i];
            if (c.group !== 'player') continue;
            // Cross product: (end-start) x (critter-start)
            var cross = dx * (c.y - vStart.y) - dy * (c.x - vStart.x);
            if (cross >= 0) groupA.push(c);
            else groupB.push(c);
        }

        // Need minimum on both sides
        if (groupA.length < Config.MIN_SPLIT || groupB.length < Config.MIN_SPLIT) return;

        // The smaller group becomes an attack group, targets nearest enemy base
        var attackGroup, keepGroup;
        if (groupA.length <= groupB.length) {
            attackGroup = groupA;
            keepGroup = groupB;
        } else {
            attackGroup = groupB;
            keepGroup = groupA;
        }

        // Find nearest uncaptured base to the attack group centroid
        var cx = 0, cy = 0;
        for (var i = 0; i < attackGroup.length; i++) {
            cx += attackGroup[i].x;
            cy += attackGroup[i].y;
        }
        cx /= attackGroup.length;
        cy /= attackGroup.length;

        var nearestBase = -1;
        var nearestDist = Infinity;
        for (var b = 0; b < this.bases.length; b++) {
            if (this.bases[b].owner === 'player') continue;
            var bdx = this.bases[b].x - cx;
            var bdy = this.bases[b].y - cy;
            var d = bdx * bdx + bdy * bdy;
            if (d < nearestDist) {
                nearestDist = d;
                nearestBase = b;
            }
        }

        if (nearestBase < 0) return; // All bases captured

        // Check for perfect split: attack group barely outnumbers garrison
        var garrison = this.bases[nearestBase].garrison;
        var ratio = attackGroup.length / Math.max(1, garrison);
        if (ratio >= 0.9 && ratio <= 1.3) {
            this.perfectSplitTimer = 1.5;
            spawnText(cx, cy - 20, 'PERFECT SPLIT!', '#ffdd00', 22);
            Synth.perfectSplit();
            // Bonus: attack critters get slight damage boost via flag
            for (var i = 0; i < attackGroup.length; i++) {
                attackGroup[i]._perfectBonus = true;
            }
        }

        // Assign attack group
        for (var i = 0; i < attackGroup.length; i++) {
            attackGroup[i].group = 'attack';
            attackGroup[i].targetBase = nearestBase;
        }

        // Swipe visual
        this.lastSwipeLine = { x1: vStart.x, y1: vStart.y, x2: vEnd.x, y2: vEnd.y };
        this.swipeTrailTimer = 0.3;

        // Particles along the swipe line
        var steps = 8;
        for (var s = 0; s <= steps; s++) {
            var t = s / steps;
            var px = vStart.x + dx * t;
            var py = vStart.y + dy * t;
            spawnParticles(px, py, 2, '#88ccff', 50, 0.3);
        }

        Synth.split();
        this.shake(3);
    }

    // ================================================================
    // Recall mechanic
    // ================================================================
    _handleRecall(vTap) {
        // Find idle or attack critters near tap
        var recallRange = Config.RECALL_RANGE;
        var recalled = 0;
        for (var i = 0; i < this.critters.length; i++) {
            var c = this.critters[i];
            if (c.group === 'player') continue;
            var dx = c.x - vTap.x;
            var dy = c.y - vTap.y;
            if (dx * dx + dy * dy < recallRange * recallRange) {
                c.group = 'player';
                c.targetBase = null;
                recalled++;
            }
        }
        // Also recall entire attack groups if tap is near their centroid
        if (recalled === 0) {
            // Group attack critters by target
            var groups = {};
            for (var i = 0; i < this.critters.length; i++) {
                var c = this.critters[i];
                if (c.group !== 'attack' && c.group !== 'idle') continue;
                var key = c.group + '_' + (c.targetBase || 'none');
                if (!groups[key]) groups[key] = [];
                groups[key].push(c);
            }
            for (var key in groups) {
                var grp = groups[key];
                var gx = 0, gy = 0;
                for (var j = 0; j < grp.length; j++) { gx += grp[j].x; gy += grp[j].y; }
                gx /= grp.length;
                gy /= grp.length;
                var dx = gx - vTap.x;
                var dy = gy - vTap.y;
                if (dx * dx + dy * dy < recallRange * recallRange * 2) {
                    for (var j = 0; j < grp.length; j++) {
                        grp[j].group = 'player';
                        grp[j].targetBase = null;
                    }
                    recalled += grp.length;
                }
            }
        }
        if (recalled > 0) {
            Synth.recall();
            spawnText(vTap.x, vTap.y - 10, 'RECALL', '#88ff88', 16);
        }
    }

    // ================================================================
    // Critter movement
    // ================================================================
    _updateCritters(dt) {
        var critters = this.critters;
        var n = critters.length;

        for (var i = 0; i < n; i++) {
            var c = critters[i];
            var tx, ty, speed;

            if (c.group === 'player') {
                tx = this.playerX;
                ty = this.playerY;
                speed = Config.SWARM_SPEED;
            } else if (c.group === 'attack' && c.targetBase !== null && c.targetBase < this.bases.length) {
                var base = this.bases[c.targetBase];
                if (base.owner === 'player') {
                    // Base already captured, become idle
                    c.group = 'idle';
                    continue;
                }
                tx = base.x;
                ty = base.y;
                speed = Config.ATTACK_SPEED;
            } else {
                // Idle: wander slowly, drift toward player
                tx = this.playerX + (Math.sin(i * 3.7 + this.timeLeft) * 60);
                ty = this.playerY + (Math.cos(i * 2.3 + this.timeLeft) * 60);
                speed = Config.WANDER_SPEED;
            }

            var dx = tx - c.x;
            var dy = ty - c.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2) {
                var moveSpeed = speed;
                // Slow down when close to target (player group only)
                if (c.group === 'player' && dist < 40) {
                    moveSpeed *= dist / 40;
                }
                c.vx += (dx / dist) * moveSpeed * dt * 5;
                c.vy += (dy / dist) * moveSpeed * dt * 5;
            }

            // Damping
            c.vx *= 0.9;
            c.vy *= 0.9;

            // Clamp velocity
            var vel = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
            if (vel > speed) {
                c.vx = (c.vx / vel) * speed;
                c.vy = (c.vy / vel) * speed;
            }

            c.x += c.vx * dt;
            c.y += c.vy * dt;

            // Keep in bounds
            c.x = Math.max(5, Math.min(Config.VW - 5, c.x));
            c.y = Math.max(5, Math.min(Config.VH - 5, c.y));
        }

        // Separation (simple pairwise for small counts, grid for large)
        this._separateCritters(dt);
    }

    _separateCritters(dt) {
        var critters = this.critters;
        var n = critters.length;
        var sepDist = Config.SEPARATION_DIST;
        var sepDist2 = sepDist * sepDist;
        var strength = 200 * dt;

        // Simple pairwise for small counts
        if (n < 100) {
            for (var i = 0; i < n; i++) {
                for (var j = i + 1; j < n; j++) {
                    var dx = critters[j].x - critters[i].x;
                    var dy = critters[j].y - critters[i].y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < sepDist2 && d2 > 0.1) {
                        var d = Math.sqrt(d2);
                        var push = (sepDist - d) * strength / d;
                        critters[i].x -= dx * push;
                        critters[i].y -= dy * push;
                        critters[j].x += dx * push;
                        critters[j].y += dy * push;
                    }
                }
            }
        } else {
            // Spatial grid approach
            var cellSize = sepDist * 2;
            var grid = {};
            for (var i = 0; i < n; i++) {
                var gx = Math.floor(critters[i].x / cellSize);
                var gy = Math.floor(critters[i].y / cellSize);
                var key = gx + ',' + gy;
                if (!grid[key]) grid[key] = [];
                grid[key].push(i);
            }
            for (var key in grid) {
                var cell = grid[key];
                var parts = key.split(',');
                var gx = parseInt(parts[0]);
                var gy = parseInt(parts[1]);
                // Check this cell and neighbors
                for (var ox = -1; ox <= 1; ox++) {
                    for (var oy = -1; oy <= 1; oy++) {
                        var nkey = (gx + ox) + ',' + (gy + oy);
                        var ncell = grid[nkey];
                        if (!ncell) continue;
                        for (var a = 0; a < cell.length; a++) {
                            var ci = cell[a];
                            var startB = (nkey === key) ? a + 1 : 0;
                            for (var b = startB; b < ncell.length; b++) {
                                var cj = ncell[b];
                                var dx = critters[cj].x - critters[ci].x;
                                var dy = critters[cj].y - critters[ci].y;
                                var d2 = dx * dx + dy * dy;
                                if (d2 < sepDist2 && d2 > 0.1) {
                                    var d = Math.sqrt(d2);
                                    var push = (sepDist - d) * strength / d;
                                    critters[ci].x -= dx * push;
                                    critters[ci].y -= dy * push;
                                    critters[cj].x += dx * push;
                                    critters[cj].y += dy * push;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ================================================================
    // Base updates (spawning reinforcements)
    // ================================================================
    _updateBases(dt) {
        for (var b = 0; b < this.bases.length; b++) {
            var base = this.bases[b];
            base.pulseTimer += dt;
            if (base.captureFlash > 0) base.captureFlash -= dt;

            if (base.owner === 'enemy' && base.spawnRate > 0) {
                // Enemy bases slowly regenerate garrison
                base.spawnAccum += base.spawnRate * dt;
                if (base.spawnAccum >= 1 && base.garrison < base.maxGarrison * 1.5) {
                    base.garrison++;
                    base.spawnAccum -= 1;
                }
            } else if (base.owner === 'player') {
                // Player bases spawn reinforcements
                base.spawnAccum += dt;
                if (base.spawnAccum >= Config.SPAWN_INTERVAL) {
                    base.spawnAccum -= Config.SPAWN_INTERVAL;
                    // Spawn a critter near the base
                    var angle = Math.random() * Math.PI * 2;
                    this.critters.push({
                        x: base.x + Math.cos(angle) * (base.radius + 10),
                        y: base.y + Math.sin(angle) * (base.radius + 10),
                        vx: 0, vy: 0,
                        group: 'idle',
                        targetBase: null,
                        hp: 1
                    });
                    Synth.spawn();
                    spawnParticles(base.x, base.y, 3, '#88ff88', 30, 0.3);
                }
            }
        }
    }

    // ================================================================
    // Combat
    // ================================================================
    _updateCombat(dt) {
        for (var b = 0; b < this.bases.length; b++) {
            var base = this.bases[b];
            if (base.owner === 'player') continue;

            // Count attacking critters in range
            var attackers = [];
            for (var i = 0; i < this.critters.length; i++) {
                var c = this.critters[i];
                if (c.group !== 'attack' || c.targetBase !== b) continue;
                var dx = c.x - base.x;
                var dy = c.y - base.y;
                if (dx * dx + dy * dy < (base.radius + Config.COMBAT_RANGE) * (base.radius + Config.COMBAT_RANGE)) {
                    attackers.push(i);
                }
            }

            if (attackers.length === 0) continue;

            // Combat! Attackers damage garrison, garrison damages attackers
            if (!this.combatAccum[b]) this.combatAccum[b] = { atk: 0, def: 0 };
            var accum = this.combatAccum[b];

            // Attacker damage to garrison
            var atkDps = attackers.length * Config.KILL_RATE;
            accum.atk += atkDps * dt;

            // Garrison damage to attackers
            var defDps = base.garrison * Config.GARRISON_KILL_RATE;
            accum.def += defDps * dt;

            // Apply garrison kills
            var hitPlayed = false;
            while (accum.atk >= 1 && base.garrison > 0) {
                accum.atk -= 1;
                base.garrison--;
                if (!hitPlayed) { Synth.hit(); hitPlayed = true; }
                spawnParticles(base.x + (Math.random() - 0.5) * base.radius,
                              base.y + (Math.random() - 0.5) * base.radius,
                              3, '#ff6644', 60, 0.3);
            }

            // Apply attacker kills
            var diePlayed = false;
            while (accum.def >= 1 && attackers.length > 0) {
                accum.def -= 1;
                var killIdx = attackers.pop();
                var killed = this.critters[killIdx];
                spawnParticles(killed.x, killed.y, 4, '#ff4444', 50, 0.3);
                if (!diePlayed) { Synth.critterDie(); diePlayed = true; }
                this.critters.splice(killIdx, 1);
                // Reindex attackers
                for (var a = 0; a < attackers.length; a++) {
                    if (attackers[a] > killIdx) attackers[a]--;
                }
            }

            // Check capture
            if (base.garrison <= 0) {
                base.garrison = 0;
                base.owner = 'player';
                base.spawnAccum = 0;
                base.captureFlash = 0.5;
                // Convert remaining attackers to idle
                for (var i = 0; i < this.critters.length; i++) {
                    if (this.critters[i].targetBase === b) {
                        this.critters[i].group = 'idle';
                        this.critters[i].targetBase = null;
                    }
                }
                Synth.capture();
                this.shake(6);
                spawnParticles(base.x, base.y, 20, '#44ff44', 100, 0.6);
                spawnText(base.x, base.y - base.radius - 10, 'CAPTURED!', '#44ff44', 24);
            }
        }
    }

    // ================================================================
    // Hazard zones
    // ================================================================
    _updateHazards(dt) {
        var zapPlayed = false;
        for (var h = 0; h < this.hazards.length; h++) {
            var hz = this.hazards[h];
            for (var i = this.critters.length - 1; i >= 0; i--) {
                var c = this.critters[i];
                if (c.x > hz.x && c.x < hz.x + hz.w && c.y > hz.y && c.y < hz.y + hz.h) {
                    spawnParticles(c.x, c.y, 5, '#ff0000', 60, 0.4);
                    if (!zapPlayed) { Synth.hazardKill(); zapPlayed = true; }
                    this.critters.splice(i, 1);
                }
            }
        }
    }

    // ================================================================
    // Win/lose checks
    // ================================================================
    _checkWin() {
        var allCaptured = true;
        for (var b = 0; b < this.bases.length; b++) {
            if (this.bases[b].owner !== 'player') {
                allCaptured = false;
                break;
            }
        }
        if (allCaptured) {
            this._levelWin();
        }

        // Lose if no critters left and enemy bases remain
        if (this.critters.length === 0 && !allCaptured) {
            this._levelFail();
        }
    }

    _levelWin() {
        this.levelWon = true;
        this.showingResult = true;
        this.resultTimer = 0;

        // Calculate stars based on time remaining
        var level = getLevel(this.level);
        var fraction = this.timeLeft / level.timeLimit;
        if (fraction >= Config.STAR_THRESHOLDS[0]) this.stars = 3;
        else if (fraction >= Config.STAR_THRESHOLDS[1]) this.stars = 2;
        else this.stars = 1;

        Synth.levelWin();
        this.shake(8);
        spawnParticles(Config.VW / 2, Config.VH / 2, 40, '#ffdd00', 150, 1.0);
        spawnParticles(Config.VW / 2, Config.VH / 2, 30, '#ff8800', 120, 0.8);
    }

    _levelFail() {
        this.levelLost = true;
        this.showingResult = true;
        this.resultTimer = 0;
        this.stars = 0;
        Synth.levelLose();
        this.shake(5);
    }

    // ================================================================
    // RENDER
    // ================================================================
    render() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        if (this.state === 'loading') { this.renderLoading(); return; }
        if (this.state === 'menu') { this.renderMenu(); return; }
        if (this.state === 'levelselect') { this.renderLevelSelect(); return; }

        // Apply screen shake
        var shx = 0, shy = 0;
        if (this.shakeAmount > 0) {
            shx = (Math.random() - 0.5) * this.shakeAmount * 2 * this.scale;
            shy = (Math.random() - 0.5) * this.shakeAmount * 2 * this.scale;
        }

        ctx.save();
        ctx.translate(this.offsetX + shx, this.offsetY + shy);

        if (this.state === 'playing' || this.state === 'gameover') {
            this.renderPlaying();
        }

        ctx.restore();

        // HUD overlay (not affected by shake)
        if (this.state === 'playing') {
            this.renderHUD();
        }

        // Result overlay
        if (this.showingResult) {
            this.renderResult();
        }

        // Transition overlay
        if (this.transState !== 'none') {
            ctx.fillStyle = 'rgba(0,0,0,' + this.transAlpha + ')';
            ctx.fillRect(0, 0, w, h);
        }
    }

    renderLoading() {
        var ctx = this.ctx;
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
    }

    renderMenu() {
        var ctx = this.ctx;
        var s = this.scale;
        var ox = this.offsetX;
        var oy = this.offsetY;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Animated critters
        for (var i = 0; i < this.menuCritters.length; i++) {
            var c = this.menuCritters[i];
            var hue = (c.hue + this.menuTime * 30) % 360;
            ctx.fillStyle = 'hsl(' + hue + ', 70%, 60%)';
            ctx.beginPath();
            ctx.arc(ox + c.x * s, oy + c.y * s, 5 * s, 0, Math.PI * 2);
            ctx.fill();
        }

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(52 * s) + 'px sans-serif';
        ctx.textAlign = 'center';
        var titleY = oy + 180 * s;
        ctx.fillText('SWARM SPLIT', ox + 400 * s, titleY);

        // Subtitle
        ctx.font = Math.round(18 * s) + 'px sans-serif';
        ctx.fillStyle = '#88aacc';
        ctx.fillText('Drag to move. Swipe to split. Tap to recall.', ox + 400 * s, titleY + 40 * s);

        // Play button
        var btnY = 320;
        var pulse = Math.sin(this.menuTime * 3) * 3;
        ctx.fillStyle = '#44cc44';
        this._roundRect(ctx, ox + (300 + pulse) * s, oy + (btnY - 25 + pulse) * s,
                         (200 - pulse * 2) * s, (50 - pulse * 2) * s, 10 * s);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(24 * s) + 'px sans-serif';
        ctx.fillText('PLAY', ox + 400 * s, oy + (btnY + 8) * s);

        // Level select button (if progress exists)
        if (this.maxLevelReached > 0) {
            var lsY = 400;
            ctx.fillStyle = '#3366aa';
            this._roundRect(ctx, ox + 300 * s, oy + (lsY - 25) * s, 200 * s, 50 * s, 10 * s);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.round(20 * s) + 'px sans-serif';
            ctx.fillText('LEVELS', ox + 400 * s, oy + (lsY + 7) * s);
        }

    }

    renderLevelSelect() {
        var ctx = this.ctx;
        var s = this.scale;
        var ox = this.offsetX;
        var oy = this.offsetY;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(36 * s) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT LEVEL', ox + 400 * s, oy + 120 * s);

        var cols = 5;
        var startX = 150;
        var startY = 200;
        var gap = 100;

        for (var i = 0; i <= this.maxLevelReached && i < 20; i++) {
            var col = i % cols;
            var row = Math.floor(i / cols);
            var bx = startX + col * gap;
            var by = startY + row * gap;

            ctx.fillStyle = (i <= this.maxLevelReached) ? '#3366aa' : '#333';
            this._roundRect(ctx, ox + (bx - 28) * s, oy + (by - 28) * s, 56 * s, 56 * s, 8 * s);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.round(22 * s) + 'px sans-serif';
            ctx.fillText('' + (i + 1), ox + bx * s, oy + (by + 8) * s);
        }

        // Back
        ctx.fillStyle = '#666';
        this._roundRect(ctx, ox + 300 * s, oy + 520 * s, 200 * s, 45 * s, 8 * s);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(20 * s) + 'px sans-serif';
        ctx.fillText('BACK', ox + 400 * s, oy + 548 * s);
    }

    renderPlaying() {
        var ctx = this.ctx;
        var s = this.scale;

        // Draw play area background
        ctx.fillStyle = '#16213e';
        ctx.fillRect(0, 0, Config.VW * s, Config.VH * s);

        // Grid lines for depth
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (var gx = 0; gx < Config.VW; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(gx * s, 0);
            ctx.lineTo(gx * s, Config.VH * s);
            ctx.stroke();
        }
        for (var gy = 0; gy < Config.VH; gy += 40) {
            ctx.beginPath();
            ctx.moveTo(0, gy * s);
            ctx.lineTo(Config.VW * s, gy * s);
            ctx.stroke();
        }

        // Hazard zones
        for (var h = 0; h < this.hazards.length; h++) {
            var hz = this.hazards[h];
            // Animated danger pattern
            ctx.fillStyle = 'rgba(255, 30, 30, 0.15)';
            ctx.fillRect(hz.x * s, hz.y * s, hz.w * s, hz.h * s);
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
            ctx.lineWidth = 2 * s;
            ctx.setLineDash([6 * s, 4 * s]);
            ctx.strokeRect(hz.x * s, hz.y * s, hz.w * s, hz.h * s);
            ctx.setLineDash([]);
            // Skull / warning symbol
            ctx.fillStyle = 'rgba(255, 80, 80, 0.4)';
            ctx.font = Math.round(20 * s) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('DANGER', (hz.x + hz.w / 2) * s, (hz.y + hz.h / 2 + 7) * s);
        }

        // Bases
        for (var b = 0; b < this.bases.length; b++) {
            this._renderBase(ctx, this.bases[b], s);
        }

        // Swipe trail
        if (this.swipeTrailTimer > 0 && this.lastSwipeLine) {
            var alpha = this.swipeTrailTimer / 0.3;
            ctx.strokeStyle = 'rgba(100, 200, 255, ' + alpha + ')';
            ctx.lineWidth = 3 * s;
            ctx.beginPath();
            ctx.moveTo(this.lastSwipeLine.x1 * s, this.lastSwipeLine.y1 * s);
            ctx.lineTo(this.lastSwipeLine.x2 * s, this.lastSwipeLine.y2 * s);
            ctx.stroke();
        }

        // Active swipe trail (while dragging)
        if (SwipeTracker.isDown && SwipeTracker.trail.length > 1) {
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
            ctx.lineWidth = 2 * s;
            ctx.beginPath();
            var t0 = this.screenToVirtual(SwipeTracker.trail[0].x, SwipeTracker.trail[0].y);
            ctx.moveTo(t0.x * s, t0.y * s);
            for (var t = 1; t < SwipeTracker.trail.length; t++) {
                var tp = this.screenToVirtual(SwipeTracker.trail[t].x, SwipeTracker.trail[t].y);
                ctx.lineTo(tp.x * s, tp.y * s);
            }
            ctx.stroke();
        }

        // Critters
        this._renderCritters(ctx, s);

        // Player cursor indicator
        if (this.state === 'playing' && !this.showingResult) {
            ctx.strokeStyle = 'rgba(100, 255, 100, 0.3)';
            ctx.lineWidth = 1.5 * s;
            ctx.beginPath();
            ctx.arc(this.playerX * s, this.playerY * s, 25 * s, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Particles & floating text
        renderParticles(ctx, 0, 0, s);
        renderFloatingTexts(ctx, 0, 0, s);
    }

    _renderBase(ctx, base, s) {
        var pulse = Math.sin(base.pulseTimer * 3) * 0.1 + 1;
        var r = base.radius * pulse;

        // Glow
        var glowColor = base.owner === 'player' ? 'rgba(68, 255, 68, 0.15)' : 'rgba(255, 68, 68, 0.15)';
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(base.x * s, base.y * s, (r + 15) * s, 0, Math.PI * 2);
        ctx.fill();

        // Base circle
        var baseColor = base.owner === 'player' ? '#226622' : '#662222';
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(base.x * s, base.y * s, r * s, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = base.owner === 'player' ? '#44cc44' : '#cc4444';
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        ctx.arc(base.x * s, base.y * s, r * s, 0, Math.PI * 2);
        ctx.stroke();

        // Capture flash
        if (base.captureFlash > 0) {
            ctx.fillStyle = 'rgba(255,255,255,' + (base.captureFlash * 0.6) + ')';
            ctx.beginPath();
            ctx.arc(base.x * s, base.y * s, (r + 10) * s, 0, Math.PI * 2);
            ctx.fill();
        }

        // Garrison count
        if (base.owner === 'enemy' && base.garrison > 0) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + Math.round(16 * s) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(Math.ceil(base.garrison).toString(), base.x * s, (base.y + 6) * s);
        }

        // Player base icon
        if (base.owner === 'player') {
            ctx.fillStyle = '#44cc44';
            ctx.font = 'bold ' + Math.round(14 * s) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('YOURS', base.x * s, (base.y + 5) * s);
        }
    }

    _renderCritters(ctx, s) {
        for (var i = 0; i < this.critters.length; i++) {
            var c = this.critters[i];
            var color;
            if (c.group === 'player') {
                color = '#44cc44';
            } else if (c.group === 'attack') {
                color = '#ffaa22';
            } else {
                color = '#88cc88';
            }

            // Body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(c.x * s, c.y * s, Config.CRITTER_RADIUS * s, 0, Math.PI * 2);
            ctx.fill();

            // Eye dot (gives character)
            var eyeAngle = Math.atan2(c.vy, c.vx);
            var eyeDist = Config.CRITTER_RADIUS * 0.4;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc((c.x + Math.cos(eyeAngle) * eyeDist) * s,
                    (c.y + Math.sin(eyeAngle) * eyeDist) * s,
                    1.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderHUD() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var s = this.scale;

        // Timer bar at top
        var level = getLevel(this.level);
        var timeFrac = Math.max(0, this.timeLeft / level.timeLimit);
        var barW = w * 0.6;
        var barH = 16 * s;
        var barX = (w - barW) / 2;
        var barY = 8 * s;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        var barColor = timeFrac > 0.5 ? '#44cc44' : (timeFrac > 0.25 ? '#ccaa22' : '#cc4444');
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barW * timeFrac, barH);

        // Time text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(14 * s) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(this.timeLeft) + 's', w / 2, barY + barH - 2 * s);

        // Level indicator
        ctx.textAlign = 'left';
        ctx.font = 'bold ' + Math.round(16 * s) + 'px sans-serif';
        ctx.fillText('Level ' + (this.level + 1), 10 * s, barY + barH - 1 * s);

        // Critter count
        var playerCount = 0;
        for (var i = 0; i < this.critters.length; i++) {
            if (this.critters[i].group === 'player') playerCount++;
        }
        ctx.textAlign = 'right';
        ctx.fillText('Swarm: ' + playerCount + ' / ' + this.critters.length, w - 10 * s, barY + barH - 1 * s);

        // Bases status
        var captured = 0;
        for (var b = 0; b < this.bases.length; b++) {
            if (this.bases[b].owner === 'player') captured++;
        }
        ctx.textAlign = 'center';
        ctx.font = Math.round(13 * s) + 'px sans-serif';
        ctx.fillStyle = '#aaccff';
        ctx.fillText('Bases: ' + captured + '/' + this.bases.length, w / 2, barY + barH + 18 * s);

        // Perfect split banner
        if (this.perfectSplitTimer > 0) {
            var alpha = Math.min(1, this.perfectSplitTimer);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffdd00';
            ctx.font = 'bold ' + Math.round(28 * s) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PERFECT SPLIT!', w / 2, this.canvas.height / 2 - 50 * s);
            ctx.globalAlpha = 1;
        }
    }

    renderResult() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        var s = this.scale;

        // Dimming overlay
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = 'center';

        if (this.levelWon) {
            // Victory
            ctx.fillStyle = '#ffdd00';
            ctx.font = 'bold ' + Math.round(48 * s) + 'px sans-serif';
            ctx.fillText('LEVEL COMPLETE!', w / 2, h / 2 - 60 * s);

            // Stars
            var starStr = '';
            for (var i = 0; i < 3; i++) {
                starStr += (i < this.stars) ? '* ' : '- ';
            }
            ctx.font = 'bold ' + Math.round(36 * s) + 'px sans-serif';
            ctx.fillStyle = this.stars === 3 ? '#ffdd00' : (this.stars === 2 ? '#ccaa44' : '#888');
            ctx.fillText(starStr, w / 2, h / 2 - 10 * s);

            // Time remaining
            ctx.font = Math.round(20 * s) + 'px sans-serif';
            ctx.fillStyle = '#aaccff';
            ctx.fillText('Time: ' + Math.ceil(this.timeLeft) + 's remaining', w / 2, h / 2 + 30 * s);

            // Continue prompt
            if (this.resultTimer > 1.0) {
                var blink = Math.sin(this.resultTimer * 4) > 0;
                if (blink) {
                    ctx.fillStyle = '#88ff88';
                    ctx.font = Math.round(22 * s) + 'px sans-serif';
                    ctx.fillText('Tap to continue', w / 2, h / 2 + 80 * s);
                }
            }
        } else {
            // Defeat
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold ' + Math.round(48 * s) + 'px sans-serif';
            ctx.fillText('DEFEATED', w / 2, h / 2 - 40 * s);

            ctx.font = Math.round(20 * s) + 'px sans-serif';
            ctx.fillStyle = '#aaa';
            if (this.timeLeft <= 0) {
                ctx.fillText('Time ran out!', w / 2, h / 2 + 10 * s);
            } else {
                ctx.fillText('All critters lost!', w / 2, h / 2 + 10 * s);
            }

            if (this.resultTimer > 1.0) {
                var blink = Math.sin(this.resultTimer * 4) > 0;
                if (blink) {
                    ctx.fillStyle = '#ff8888';
                    ctx.font = Math.round(22 * s) + 'px sans-serif';
                    ctx.fillText('Tap to retry', w / 2, h / 2 + 60 * s);
                }
            }
        }
    }

    renderGameOver() {
        // Not used - gameover is handled by result overlay
    }

    // ================================================================
    // Helpers
    // ================================================================
    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }
}
