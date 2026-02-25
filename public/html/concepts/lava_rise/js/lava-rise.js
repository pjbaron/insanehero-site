/**
 * Lava Rise - Complete game logic
 * Wall-jump between narrowing walls to outrun rising lava
 */

var LavaRise = (function() {
    'use strict';

    // -------------------------------------------------------
    // Constants
    // -------------------------------------------------------
    var VIRTUAL_W = 400;
    var PLAYER_W = 18;
    var PLAYER_H = 24;
    var GRAVITY = 1400;
    var JUMP_VY = -520;
    var JUMP_VX_BASE = 400;
    var WALL_THICKNESS = 40;
    var COIN_RADIUS = 10;
    var SPIKE_W = 20;
    var SPIKE_H = 16;
    var PLATFORM_W = 50;
    var PLATFORM_H = 10;
    var PARTICLE_POOL_SIZE = 200;
    var SLOW_MO_DURATION = 0.3;
    var SLOW_MO_FACTOR = 0.4;
    var SAFE_TIME = 5.0;
    var GAME_OVER_LOCKOUT = 0.8;
    var DIFFICULTY_RAMP_TIME = 120; // 2 minutes to max
    var LAVA_SPEED_MIN = 60;
    var LAVA_SPEED_MAX = 150;
    var WALL_GAP_MAX = 400;
    var WALL_GAP_MIN = 220;
    var CAMERA_LEAD = 0.3;
    var CAMERA_SMOOTH = 4.0;

    // Colors
    var COL_BG_TOP = '#1a0a2e';
    var COL_BG_BOT = '#0d0015';
    var COL_WALL_LEFT = '#3a2a5c';
    var COL_WALL_RIGHT = '#3a2a5c';
    var COL_WALL_EDGE = '#6a4a9a';
    var COL_PLAYER = '#00e5ff';
    var COL_PLAYER_EYE = '#ffffff';
    var COL_COIN = '#ffd700';
    var COL_COIN_GLOW = 'rgba(255,215,0,0.3)';
    var COL_SPIKE = '#ff3366';
    var COL_LAVA_TOP = '#ff4400';
    var COL_LAVA_MID = '#ff2200';
    var COL_LAVA_BOT = '#cc1100';
    var COL_LAVA_GLOW = 'rgba(255,68,0,0.4)';
    var COL_PLATFORM = '#8866bb';
    var COL_PLATFORM_CRUMBLE = '#aa8844';
    var COL_SCORE = '#ffffff';
    var COL_HEIGHT = '#aaaaaa';

    // -------------------------------------------------------
    // Procedural Audio
    // -------------------------------------------------------
    var SFX = {
        _ctx: null,

        init: function() {
            if (GameAudio.ctx) {
                this._ctx = GameAudio.ctx;
            }
        },

        _ensureCtx: function() {
            if (!this._ctx && GameAudio.ctx) this._ctx = GameAudio.ctx;
            return this._ctx;
        },

        jump: function() {
            var ctx = this._ensureCtx();
            if (!ctx) return;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15 * GameAudio.masterVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        },

        wallHit: function() {
            var ctx = this._ensureCtx();
            if (!ctx) return;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);
            gain.gain.setValueAtTime(0.12 * GameAudio.masterVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.08);
        },

        coin: function(streak) {
            var ctx = this._ensureCtx();
            if (!ctx) return;
            var baseFreq = 800 + Math.min(streak, 10) * 80;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.18 * GameAudio.masterVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
            // Harmonic
            var osc2 = ctx.createOscillator();
            var gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime + 0.05);
            gain2.gain.setValueAtTime(0.08 * GameAudio.masterVolume, ctx.currentTime + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.05);
            osc2.stop(ctx.currentTime + 0.2);
        },

        die: function() {
            var ctx = this._ensureCtx();
            if (!ctx) return;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.2 * GameAudio.masterVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
            // Noise burst
            var bufSize = ctx.sampleRate * 0.3;
            var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
            var noise = ctx.createBufferSource();
            noise.buffer = buf;
            var ng = ctx.createGain();
            ng.gain.setValueAtTime(0.15 * GameAudio.masterVolume, ctx.currentTime);
            ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            noise.connect(ng);
            ng.connect(ctx.destination);
            noise.start(ctx.currentTime);
            noise.stop(ctx.currentTime + 0.3);
        },

        lavaWarn: function() {
            var ctx = this._ensureCtx();
            if (!ctx) return;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(100, ctx.currentTime);
            osc.frequency.setValueAtTime(120, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(100, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.08 * GameAudio.masterVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    };

    // -------------------------------------------------------
    // Particle Pool
    // -------------------------------------------------------
    function ParticlePool(size) {
        this.pool = [];
        for (var i = 0; i < size; i++) {
            this.pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, g: 0, b: 0, size: 2 });
        }
    }

    ParticlePool.prototype.spawn = function(x, y, vx, vy, life, r, g, b, size) {
        for (var i = 0; i < this.pool.length; i++) {
            var p = this.pool[i];
            if (!p.alive) {
                p.alive = true;
                p.x = x; p.y = y;
                p.vx = vx; p.vy = vy;
                p.life = life; p.maxLife = life;
                p.r = r; p.g = g; p.b = b;
                p.size = size || 2;
                return p;
            }
        }
        return null;
    };

    ParticlePool.prototype.update = function(dt) {
        for (var i = 0; i < this.pool.length; i++) {
            var p = this.pool[i];
            if (!p.alive) continue;
            p.life -= dt;
            if (p.life <= 0) { p.alive = false; continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // light gravity on particles
        }
    };

    ParticlePool.prototype.render = function(ctx, camY, scale, offsetX) {
        for (var i = 0; i < this.pool.length; i++) {
            var p = this.pool[i];
            if (!p.alive) continue;
            var alpha = p.life / p.maxLife;
            var sx = p.x * scale + offsetX;
            var sy = (p.y - camY) * scale;
            var sz = p.size * scale * alpha;
            if (sy < -20 || sy > ctx.canvas.height + 20) continue;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgb(' + p.r + ',' + p.g + ',' + p.b + ')';
            ctx.fillRect(sx - sz * 0.5, sy - sz * 0.5, sz, sz);
        }
        ctx.globalAlpha = 1.0;
    };

    ParticlePool.prototype.clear = function() {
        for (var i = 0; i < this.pool.length; i++) this.pool[i].alive = false;
    };

    // -------------------------------------------------------
    // Score Popup Pool
    // -------------------------------------------------------
    function PopupPool() {
        this.popups = [];
    }

    PopupPool.prototype.spawn = function(x, y, text, color) {
        this.popups.push({ x: x, y: y, text: text, color: color, life: 0.8, maxLife: 0.8 });
    };

    PopupPool.prototype.update = function(dt) {
        for (var i = this.popups.length - 1; i >= 0; i--) {
            var p = this.popups[i];
            p.life -= dt;
            p.y -= 60 * dt;
            if (p.life <= 0) this.popups.splice(i, 1);
        }
    };

    PopupPool.prototype.render = function(ctx, camY, scale, offsetX) {
        for (var i = 0; i < this.popups.length; i++) {
            var p = this.popups[i];
            var alpha = p.life / p.maxLife;
            var sx = p.x * scale + offsetX;
            var sy = (p.y - camY) * scale;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.font = 'bold ' + Math.floor(16 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, sx, sy);
        }
        ctx.globalAlpha = 1.0;
    };

    // -------------------------------------------------------
    // Main Game State
    // -------------------------------------------------------
    function State() {
        this.reset();
        this.particles = new ParticlePool(PARTICLE_POOL_SIZE);
        this.popups = new PopupPool();
        this.highScore = 0;
        this.totalCoins = 0;
        try {
            var hs = localStorage.getItem('lavarise_hs');
            if (hs) this.highScore = parseInt(hs, 10) || 0;
            var tc = localStorage.getItem('lavarise_coins');
            if (tc) this.totalCoins = parseInt(tc, 10) || 0;
        } catch(e) {}
    }

    State.prototype.reset = function() {
        this.playTime = 0;
        this.difficultyLevel = 0;
        this.score = 0;
        this.heightScore = 0;
        this.coinScore = 0;
        this.coinStreak = 0;
        this.coinStreakTimer = 0;

        // Player
        this.px = VIRTUAL_W * 0.25;
        this.py = 0;
        this.pvx = 0;
        this.pvy = 0;
        this.pOnWall = 'left'; // 'left', 'right', 'air'
        this.pFacing = 1; // 1=right, -1=left
        this.pAlive = true;
        this.pInvincible = 0;
        this.pSquash = 1.0; // squash-stretch factor

        // Camera
        this.camY = 0;
        this.camTargetY = 0;

        // Lava
        this.lavaY = 300; // world Y of lava surface (lower = higher on screen since Y goes down initially but we climb up)
        this.lavaSpeed = LAVA_SPEED_MIN;
        this.lavaWarnTimer = 0;

        // Walls
        this.wallGap = WALL_GAP_MAX;
        this.wallLeft = (VIRTUAL_W - WALL_GAP_MAX) / 2;
        this.wallRight = (VIRTUAL_W + WALL_GAP_MAX) / 2;

        // Obstacles and coins
        this.obstacles = [];
        this.coins = [];
        this.lastSpawnY = 0;
        this.spawnInterval = 120;

        // Effects
        this.slowMoTimer = 0;
        this.shakeAmount = 0;
        this.shakeTimer = 0;
        this.gameOverTimer = 0;
        this.flashAlpha = 0;

        if (this.particles) this.particles.clear();
        if (this.popups) this.popups = new PopupPool();
    };

    // -------------------------------------------------------
    // Game Logic
    // -------------------------------------------------------

    State.prototype.initGame = function() {
        this.reset();
        // Player starts on left wall, slightly above where lava will begin
        this.py = -50;
        this.px = this.wallLeft + WALL_THICKNESS + PLAYER_W / 2;
        this.pOnWall = 'left';
        this.pFacing = 1;
        this.pInvincible = SAFE_TIME;
        this.camY = this.py - 200;
        this.camTargetY = this.camY;
        this.lavaY = 200; // starts below player

        // Seed some coins in the safe zone
        this._spawnCoin(-100);
        this._spawnCoin(-220);
        this._spawnCoin(-350);

        SFX.init();
    };

    State.prototype._getWallGap = function() {
        return WALL_GAP_MAX - (WALL_GAP_MAX - WALL_GAP_MIN) * this.difficultyLevel;
    };

    State.prototype._getWallLeft = function() {
        return (VIRTUAL_W - this._getWallGap()) / 2;
    };

    State.prototype._getWallRight = function() {
        return (VIRTUAL_W + this._getWallGap()) / 2;
    };

    State.prototype._spawnCoin = function(y) {
        var gap = this._getWallGap();
        var wl = this._getWallLeft();
        var cx = wl + WALL_THICKNESS + Math.random() * (gap - WALL_THICKNESS * 2);
        this.coins.push({
            x: cx, y: y, collected: false, bobPhase: Math.random() * Math.PI * 2
        });
    };

    State.prototype._spawnObstacle = function(y) {
        var type = Math.random();
        var wl = this._getWallLeft();
        var wr = this._getWallRight();

        if (type < 0.4) {
            // Spike on wall
            var side = Math.random() < 0.5 ? 'left' : 'right';
            var sx = side === 'left' ? wl + WALL_THICKNESS : wr - WALL_THICKNESS - SPIKE_W;
            this.obstacles.push({
                type: 'spike', x: sx, y: y, w: SPIKE_W, h: SPIKE_H, side: side
            });
        } else if (type < 0.7) {
            // Moving platform
            var px = wl + WALL_THICKNESS + 20 + Math.random() * (wr - wl - WALL_THICKNESS * 2 - PLATFORM_W - 40);
            var speed = 40 + Math.random() * 60;
            this.obstacles.push({
                type: 'platform', x: px, y: y, w: PLATFORM_W, h: PLATFORM_H,
                origX: px, speed: speed, dir: Math.random() < 0.5 ? 1 : -1,
                minX: wl + WALL_THICKNESS + 5, maxX: wr - WALL_THICKNESS - PLATFORM_W - 5
            });
        } else {
            // Crumbling ledge
            var side2 = Math.random() < 0.5 ? 'left' : 'right';
            var lx = side2 === 'left' ? wl + WALL_THICKNESS : wr - WALL_THICKNESS - 40;
            this.obstacles.push({
                type: 'crumble', x: lx, y: y, w: 40, h: PLATFORM_H,
                side: side2, timer: 0, crumbling: false, fallen: false
            });
        }
    };

    State.prototype.update = function(dt, tapped) {
        if (!this.pAlive) return;

        // Slow-mo
        var effectiveDt = dt;
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            effectiveDt = dt * SLOW_MO_FACTOR;
        }

        this.playTime += effectiveDt;
        this.difficultyLevel = Math.min(1, this.playTime / DIFFICULTY_RAMP_TIME);

        // Invincibility
        if (this.pInvincible > 0) this.pInvincible -= effectiveDt;

        // Coin streak timeout
        if (this.coinStreakTimer > 0) {
            this.coinStreakTimer -= effectiveDt;
            if (this.coinStreakTimer <= 0) this.coinStreak = 0;
        }

        // Wall narrowing
        this.wallGap = this._getWallGap();
        this.wallLeft = this._getWallLeft();
        this.wallRight = this._getWallRight();

        // Lava rise
        this.lavaSpeed = LAVA_SPEED_MIN + (LAVA_SPEED_MAX - LAVA_SPEED_MIN) * this.difficultyLevel;
        this.lavaY -= this.lavaSpeed * effectiveDt; // moving upward in world coords (negative Y is up)

        // Lava warning (lavaY > py means lava is below player; smaller gap = more danger)
        var lavaDistance = this.lavaY - this.py;
        if (lavaDistance < 150 && lavaDistance > 0) {
            this.lavaWarnTimer -= effectiveDt;
            if (this.lavaWarnTimer <= 0) {
                SFX.lavaWarn();
                this.lavaWarnTimer = 0.5;
            }
        }

        // Jump input
        if (tapped && this.pOnWall !== 'air') {
            this._jump();
        }

        // Physics
        if (this.pOnWall === 'air') {
            this.pvy += GRAVITY * effectiveDt;
            this.px += this.pvx * effectiveDt;
            this.py += this.pvy * effectiveDt;

            // Wall collision
            var leftEdge = this.wallLeft + WALL_THICKNESS + PLAYER_W / 2;
            var rightEdge = this.wallRight - WALL_THICKNESS - PLAYER_W / 2;

            if (this.px <= leftEdge) {
                this.px = leftEdge;
                this.pOnWall = 'left';
                this.pFacing = 1;
                this.pvx = 0;
                this.pvy = 0;
                this.pSquash = 0.6;
                SFX.wallHit();
                this._spawnWallParticles('left');
            } else if (this.px >= rightEdge) {
                this.px = rightEdge;
                this.pOnWall = 'right';
                this.pFacing = -1;
                this.pvx = 0;
                this.pvy = 0;
                this.pSquash = 0.6;
                SFX.wallHit();
                this._spawnWallParticles('right');
            }

            // Sliding on wall (gravity pulls down while on wall, but only slowly)
        } else {
            // On wall - slide down slowly
            this.pvy = 30; // gentle slide
            this.py += this.pvy * effectiveDt;

            // Keep within wall bounds
            var le = this.wallLeft + WALL_THICKNESS + PLAYER_W / 2;
            var re = this.wallRight - WALL_THICKNESS - PLAYER_W / 2;
            if (this.pOnWall === 'left') this.px = le;
            else this.px = re;
        }

        // Squash recovery
        this.pSquash += (1.0 - this.pSquash) * 8 * effectiveDt;

        // Obstacle updates
        this._updateObstacles(effectiveDt);

        // Coin collection
        this._updateCoins(effectiveDt);

        // Collision with obstacles
        if (this.pInvincible <= 0) {
            this._checkObstacleCollisions();
        }

        // Lava death
        if (this.py > this.lavaY - PLAYER_H / 2) {
            this._die('lava');
            return;
        }

        // Spawn new content ahead
        this._spawnContent();

        // Height score (negative Y = higher)
        var currentHeight = Math.floor(Math.max(0, -this.py / 10));
        if (currentHeight > this.heightScore) this.heightScore = currentHeight;
        this.score = this.heightScore + this.coinScore;

        // Camera
        this.camTargetY = this.py - 200 + this.pvy * CAMERA_LEAD;
        this.camY += (this.camTargetY - this.camY) * CAMERA_SMOOTH * effectiveDt;

        // Cleanup off-screen objects
        this._cleanup();

        // Effects
        this.shakeTimer -= effectiveDt;
        if (this.shakeTimer < 0) this.shakeTimer = 0;
        this.shakeAmount *= Math.max(0, 1 - 8 * effectiveDt);

        this.flashAlpha -= effectiveDt * 3;
        if (this.flashAlpha < 0) this.flashAlpha = 0;

        // Particles
        this.particles.update(effectiveDt);
        this.popups.update(effectiveDt);

        // Lava particles
        this._spawnLavaParticles(effectiveDt);
    };

    State.prototype._jump = function() {
        var dir = this.pOnWall === 'left' ? 1 : -1;
        this.pvx = JUMP_VX_BASE * dir;
        this.pvy = JUMP_VY;
        this.pOnWall = 'air';
        this.pFacing = dir;
        this.pSquash = 1.4; // stretch on jump
        SFX.jump();

        // Jump particles
        for (var i = 0; i < 5; i++) {
            var angle = Math.random() * Math.PI - Math.PI / 2;
            var speed = 50 + Math.random() * 80;
            this.particles.spawn(
                this.px, this.py,
                -dir * speed * Math.cos(angle), speed * Math.sin(angle) - 30,
                0.3 + Math.random() * 0.2,
                0, 229, 255, 3
            );
        }
    };

    State.prototype._spawnWallParticles = function(side) {
        for (var i = 0; i < 6; i++) {
            var dir = side === 'left' ? 1 : -1;
            this.particles.spawn(
                this.px, this.py + (Math.random() - 0.5) * PLAYER_H,
                dir * (30 + Math.random() * 60), (Math.random() - 0.5) * 100,
                0.2 + Math.random() * 0.2,
                100, 80, 160, 3
            );
        }
    };

    State.prototype._updateObstacles = function(dt) {
        for (var i = 0; i < this.obstacles.length; i++) {
            var obs = this.obstacles[i];
            if (obs.type === 'platform') {
                obs.x += obs.speed * obs.dir * dt;
                if (obs.x <= obs.minX) { obs.x = obs.minX; obs.dir = 1; }
                if (obs.x >= obs.maxX) { obs.x = obs.maxX; obs.dir = -1; }
            }
            if (obs.type === 'crumble' && obs.crumbling) {
                obs.timer += dt;
                if (obs.timer > 0.5) obs.fallen = true;
            }
        }
    };

    State.prototype._updateCoins = function(dt) {
        var px = this.px, py = this.py;
        for (var i = 0; i < this.coins.length; i++) {
            var c = this.coins[i];
            if (c.collected) continue;
            c.bobPhase += dt * 3;

            var dx = px - c.x;
            var dy = py - (c.y + Math.sin(c.bobPhase) * 4);
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < COIN_RADIUS + PLAYER_W * 0.6) {
                c.collected = true;
                this.coinStreak++;
                this.coinStreakTimer = 2.0;
                var points = 10 * Math.min(this.coinStreak, 10);
                this.coinScore += points;
                this.totalCoins++;
                try { localStorage.setItem('lavarise_coins', '' + this.totalCoins); } catch(e) {}

                // Slow-mo
                this.slowMoTimer = SLOW_MO_DURATION;

                // Effects
                this.flashAlpha = 0.3;
                SFX.coin(this.coinStreak);
                this.popups.spawn(c.x, c.y - 15, '+' + points, COL_COIN);

                // Coin burst particles
                for (var j = 0; j < 8; j++) {
                    var angle = (j / 8) * Math.PI * 2;
                    this.particles.spawn(
                        c.x, c.y,
                        Math.cos(angle) * 80, Math.sin(angle) * 80,
                        0.4, 255, 215, 0, 3
                    );
                }
            }
        }
    };

    State.prototype._checkObstacleCollisions = function() {
        var px = this.px, py = this.py;
        var pw = PLAYER_W * 0.7, ph = PLAYER_H * 0.7; // slightly forgiving hitbox
        var pl = px - pw / 2, pr = px + pw / 2, pt = py - ph / 2, pb = py + ph / 2;

        for (var i = 0; i < this.obstacles.length; i++) {
            var obs = this.obstacles[i];
            if (obs.type === 'crumble' && obs.fallen) continue;

            if (obs.type === 'spike') {
                // AABB
                if (pl < obs.x + obs.w && pr > obs.x && pt < obs.y + obs.h && pb > obs.y) {
                    this._die('spike');
                    return;
                }
            }

            if (obs.type === 'platform' || (obs.type === 'crumble' && !obs.fallen)) {
                // Land on top
                if (this.pvy > 0 && this.pOnWall === 'air') {
                    if (pl < obs.x + obs.w && pr > obs.x &&
                        pb > obs.y && pb < obs.y + obs.h + 10 &&
                        py - ph / 2 < obs.y) {
                        // Landing on platform
                        // For crumbling, start crumble timer
                        if (obs.type === 'crumble' && !obs.crumbling) {
                            obs.crumbling = true;
                            obs.timer = 0;
                        }
                    }
                }
                // Side collision with platform acts like a small wall
                if (pl < obs.x + obs.w && pr > obs.x && pt < obs.y + obs.h && pb > obs.y) {
                    // Push player out horizontally if mostly horizontal collision
                    var overlapL = pr - obs.x;
                    var overlapR = obs.x + obs.w - pl;
                    var overlapT = pb - obs.y;
                    var overlapB = obs.y + obs.h - pt;
                    var minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);
                    if (minOverlap === overlapT && this.pvy > 0) {
                        // Land on top
                        this.py = obs.y - ph / 2;
                        if (obs.type === 'crumble' && !obs.crumbling) {
                            obs.crumbling = true;
                            obs.timer = 0;
                        }
                    }
                }
            }
        }
    };

    State.prototype._die = function(cause) {
        if (!this.pAlive) return;
        this.pAlive = false;
        SFX.die();
        this.shakeAmount = 8;
        this.shakeTimer = 0.4;
        this.flashAlpha = 0.5;
        this.gameOverTimer = 0;

        // Death particles
        for (var i = 0; i < 20; i++) {
            var angle = (i / 20) * Math.PI * 2;
            var speed = 80 + Math.random() * 120;
            var r = cause === 'lava' ? 255 : 255;
            var g = cause === 'lava' ? 68 : 51;
            var b = cause === 'lava' ? 0 : 102;
            this.particles.spawn(
                this.px, this.py,
                Math.cos(angle) * speed, Math.sin(angle) * speed - 50,
                0.5 + Math.random() * 0.3,
                r, g, b, 4
            );
        }

        // Save high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('lavarise_hs', '' + this.highScore); } catch(e) {}
        }
    };

    State.prototype._spawnContent = function() {
        // Spawn ahead of camera (negative Y is up)
        var spawnAhead = this.camY - 500;
        while (this.lastSpawnY > spawnAhead) {
            this.lastSpawnY -= this.spawnInterval;

            // Don't spawn obstacles during safe time
            if (this.playTime > SAFE_TIME) {
                var obstacleChance = 0.3 + 0.3 * this.difficultyLevel;
                if (Math.random() < obstacleChance) {
                    this._spawnObstacle(this.lastSpawnY);
                }
            }

            // Always spawn coins (good density)
            if (Math.random() < 0.5) {
                this._spawnCoin(this.lastSpawnY + Math.random() * 60 - 30);
            }

            // Decrease spawn interval with difficulty
            this.spawnInterval = 120 - 40 * this.difficultyLevel;
        }
    };

    State.prototype._spawnLavaParticles = function(dt) {
        if (!this._lavaParticleTimer) this._lavaParticleTimer = 0;
        this._lavaParticleTimer += dt;
        if (this._lavaParticleTimer < 0.05) return;
        this._lavaParticleTimer = 0;

        // Spawn bubbles along lava surface
        var x = this.wallLeft + Math.random() * (this.wallRight - this.wallLeft);
        this.particles.spawn(
            x, this.lavaY,
            (Math.random() - 0.5) * 30, -(20 + Math.random() * 40),
            0.5 + Math.random() * 0.5,
            255, Math.floor(40 + Math.random() * 60), 0, 4
        );
    };

    State.prototype._cleanup = function() {
        var below = this.lavaY + 100;
        // Remove coins below lava
        for (var i = this.coins.length - 1; i >= 0; i--) {
            if (this.coins[i].y > below || this.coins[i].collected) {
                this.coins.splice(i, 1);
            }
        }
        // Remove obstacles below lava
        for (var j = this.obstacles.length - 1; j >= 0; j--) {
            if (this.obstacles[j].y > below) {
                this.obstacles.splice(j, 1);
            }
        }
    };

    // -------------------------------------------------------
    // Rendering
    // -------------------------------------------------------

    function Renderer() {}

    Renderer.prototype.render = function(ctx, canvas, state) {
        var cw = canvas.width;
        var ch = canvas.height;

        // Virtual coordinate mapping
        var scale = cw / VIRTUAL_W;
        var virtualH = ch / scale;
        var offsetX = 0;

        // Screen shake
        var shakeX = 0, shakeY = 0;
        if (state.shakeTimer > 0) {
            shakeX = (Math.random() - 0.5) * state.shakeAmount * scale;
            shakeY = (Math.random() - 0.5) * state.shakeAmount * scale;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Background gradient
        var bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
        bgGrad.addColorStop(0, COL_BG_TOP);
        bgGrad.addColorStop(1, COL_BG_BOT);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(-10, -10, cw + 20, ch + 20);

        // Background stars (parallax)
        this._renderStars(ctx, cw, ch, state.camY);

        // Walls
        this._renderWalls(ctx, state, scale, offsetX, ch);

        // Obstacles
        this._renderObstacles(ctx, state, scale, offsetX);

        // Coins
        this._renderCoins(ctx, state, scale, offsetX);

        // Player
        if (state.pAlive) {
            this._renderPlayer(ctx, state, scale, offsetX);
        }

        // Particles
        state.particles.render(ctx, state.camY, scale, offsetX);

        // Lava
        this._renderLava(ctx, state, scale, offsetX, cw, ch);

        // Popups
        state.popups.render(ctx, state.camY, scale, offsetX);

        ctx.restore();

        // Flash overlay
        if (state.flashAlpha > 0) {
            ctx.globalAlpha = state.flashAlpha;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, cw, ch);
            ctx.globalAlpha = 1;
        }

        // HUD (not affected by shake)
        this._renderHUD(ctx, cw, ch, state);
    };

    Renderer.prototype._renderStars = function(ctx, cw, ch, camY) {
        // Simple deterministic stars
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        var seed = 42;
        for (var i = 0; i < 40; i++) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            var sx = (seed % cw);
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            var sy = (seed % (ch * 3));
            var parallax = 0.05;
            var screenY = (sy - camY * parallax) % (ch * 3);
            if (screenY < 0) screenY += ch * 3;
            if (screenY < ch) {
                var size = 1 + (i % 3);
                ctx.fillRect(sx, screenY, size, size);
            }
        }
    };

    Renderer.prototype._renderWalls = function(ctx, state, scale, offsetX, ch) {
        var camY = state.camY;
        var topY = 0;
        var botY = ch;

        // Left wall
        var lwScreen = state.wallLeft * scale + offsetX;
        var lwWidth = (WALL_THICKNESS) * scale;
        ctx.fillStyle = COL_WALL_LEFT;
        ctx.fillRect(lwScreen, topY, lwWidth, botY - topY);
        // Edge highlight
        ctx.fillStyle = COL_WALL_EDGE;
        ctx.fillRect(lwScreen + lwWidth - 2 * scale, topY, 2 * scale, botY - topY);

        // Right wall
        var rwScreen = (state.wallRight - WALL_THICKNESS) * scale + offsetX;
        ctx.fillStyle = COL_WALL_RIGHT;
        ctx.fillRect(rwScreen, topY, lwWidth, botY - topY);
        // Edge highlight
        ctx.fillStyle = COL_WALL_EDGE;
        ctx.fillRect(rwScreen, topY, 2 * scale, botY - topY);

        // Wall bricks pattern
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        var brickH = 20 * scale;
        var startBrickY = Math.floor(camY / 20) * 20;
        for (var by = startBrickY; by < camY + ch / scale + 20; by += 20) {
            var sy = (by - camY) * scale;
            var offset = ((by / 20) % 2) * 10 * scale;
            // Left wall bricks
            for (var bx = lwScreen; bx < lwScreen + lwWidth; bx += 20 * scale) {
                ctx.fillRect(bx + offset, sy, 1, brickH);
            }
            ctx.fillRect(lwScreen, sy, lwWidth, 1);
            // Right wall bricks
            for (var bx2 = rwScreen; bx2 < rwScreen + lwWidth; bx2 += 20 * scale) {
                ctx.fillRect(bx2 + offset, sy, 1, brickH);
            }
            ctx.fillRect(rwScreen, sy, lwWidth, 1);
        }
    };

    Renderer.prototype._renderObstacles = function(ctx, state, scale, offsetX) {
        var camY = state.camY;
        for (var i = 0; i < state.obstacles.length; i++) {
            var obs = state.obstacles[i];
            var sx = obs.x * scale + offsetX;
            var sy = (obs.y - camY) * scale;
            var sw = obs.w * scale;
            var sh = obs.h * scale;

            if (sy < -50 || sy > ctx.canvas.height + 50) continue;

            if (obs.type === 'spike') {
                ctx.fillStyle = COL_SPIKE;
                ctx.beginPath();
                if (obs.side === 'left') {
                    ctx.moveTo(sx, sy + sh);
                    ctx.lineTo(sx + sw, sy + sh);
                    ctx.lineTo(sx + sw / 2, sy);
                } else {
                    ctx.moveTo(sx, sy + sh);
                    ctx.lineTo(sx + sw, sy + sh);
                    ctx.lineTo(sx + sw / 2, sy);
                }
                ctx.closePath();
                ctx.fill();
                // Glow
                ctx.shadowColor = COL_SPIKE;
                ctx.shadowBlur = 6 * scale;
                ctx.fill();
                ctx.shadowBlur = 0;
            } else if (obs.type === 'platform') {
                ctx.fillStyle = COL_PLATFORM;
                ctx.fillRect(sx, sy, sw, sh);
                // Top highlight
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(sx, sy, sw, 2 * scale);
            } else if (obs.type === 'crumble') {
                if (obs.fallen) continue;
                var alpha = obs.crumbling ? Math.max(0, 1 - obs.timer * 2) : 1;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = COL_PLATFORM_CRUMBLE;
                // Shake if crumbling
                var crumbleShake = obs.crumbling ? (Math.random() - 0.5) * 4 * scale : 0;
                ctx.fillRect(sx + crumbleShake, sy, sw, sh);
                ctx.globalAlpha = 1;
            }
        }
    };

    Renderer.prototype._renderCoins = function(ctx, state, scale, offsetX) {
        var camY = state.camY;
        for (var i = 0; i < state.coins.length; i++) {
            var c = state.coins[i];
            if (c.collected) continue;
            var sx = c.x * scale + offsetX;
            var sy = (c.y + Math.sin(c.bobPhase) * 4 - camY) * scale;
            var sr = COIN_RADIUS * scale;

            if (sy < -30 || sy > ctx.canvas.height + 30) continue;

            // Glow
            ctx.beginPath();
            ctx.arc(sx, sy, sr * 2, 0, Math.PI * 2);
            ctx.fillStyle = COL_COIN_GLOW;
            ctx.fill();

            // Coin body
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fillStyle = COL_COIN;
            ctx.fill();

            // Shine
            ctx.beginPath();
            ctx.arc(sx - sr * 0.25, sy - sr * 0.25, sr * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fill();
        }
    };

    Renderer.prototype._renderPlayer = function(ctx, state, scale, offsetX) {
        var sx = state.px * scale + offsetX;
        var sy = (state.py - state.camY) * scale;
        var sw = PLAYER_W * scale;
        var sh = PLAYER_H * scale;

        // Invincibility blink
        if (state.pInvincible > 0 && Math.floor(state.pInvincible * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Squash-stretch
        var squashX = 1 / state.pSquash;
        var squashY = state.pSquash;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(squashX, squashY);

        // Body
        ctx.fillStyle = COL_PLAYER;
        ctx.shadowColor = COL_PLAYER;
        ctx.shadowBlur = 8 * scale;
        var bodyW = sw;
        var bodyH = sh;
        // Rounded rectangle body
        var r = 4 * scale;
        ctx.beginPath();
        ctx.moveTo(-bodyW / 2 + r, -bodyH / 2);
        ctx.lineTo(bodyW / 2 - r, -bodyH / 2);
        ctx.quadraticCurveTo(bodyW / 2, -bodyH / 2, bodyW / 2, -bodyH / 2 + r);
        ctx.lineTo(bodyW / 2, bodyH / 2 - r);
        ctx.quadraticCurveTo(bodyW / 2, bodyH / 2, bodyW / 2 - r, bodyH / 2);
        ctx.lineTo(-bodyW / 2 + r, bodyH / 2);
        ctx.quadraticCurveTo(-bodyW / 2, bodyH / 2, -bodyW / 2, bodyH / 2 - r);
        ctx.lineTo(-bodyW / 2, -bodyH / 2 + r);
        ctx.quadraticCurveTo(-bodyW / 2, -bodyH / 2, -bodyW / 2 + r, -bodyH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes
        var eyeOffX = state.pFacing * 3 * scale;
        var eyeY = -3 * scale;
        ctx.fillStyle = COL_PLAYER_EYE;
        ctx.beginPath();
        ctx.arc(eyeOffX - 2.5 * scale, eyeY, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeOffX + 2.5 * scale, eyeY, 2.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Pupils (look in movement direction)
        ctx.fillStyle = '#222';
        var pupilOff = state.pFacing * 1 * scale;
        ctx.beginPath();
        ctx.arc(eyeOffX - 2.5 * scale + pupilOff, eyeY, 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeOffX + 2.5 * scale + pupilOff, eyeY, 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.globalAlpha = 1;
    };

    Renderer.prototype._renderLava = function(ctx, state, scale, offsetX, cw, ch) {
        var lavaScreenY = (state.lavaY - state.camY) * scale;
        if (lavaScreenY > ch + 50) return;

        var topY = Math.max(0, lavaScreenY - 10 * scale);

        // Lava glow above surface
        var glowGrad = ctx.createLinearGradient(0, topY - 60 * scale, 0, topY);
        glowGrad.addColorStop(0, 'rgba(255,68,0,0)');
        glowGrad.addColorStop(1, COL_LAVA_GLOW);
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, topY - 60 * scale, cw, 60 * scale);

        // Lava surface wave
        ctx.beginPath();
        ctx.moveTo(0, ch);
        ctx.lineTo(0, lavaScreenY);
        var waveTime = state.playTime * 2;
        for (var x = 0; x <= cw; x += 4) {
            var waveY = lavaScreenY + Math.sin(x * 0.02 + waveTime) * 4 * scale +
                                      Math.sin(x * 0.04 + waveTime * 1.3) * 2 * scale;
            ctx.lineTo(x, waveY);
        }
        ctx.lineTo(cw, ch);
        ctx.closePath();

        var lavaGrad = ctx.createLinearGradient(0, lavaScreenY, 0, ch);
        lavaGrad.addColorStop(0, COL_LAVA_TOP);
        lavaGrad.addColorStop(0.3, COL_LAVA_MID);
        lavaGrad.addColorStop(1, COL_LAVA_BOT);
        ctx.fillStyle = lavaGrad;
        ctx.fill();

        // Surface highlight
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        for (var x2 = 0; x2 <= cw; x2 += 4) {
            var waveY2 = lavaScreenY + Math.sin(x2 * 0.02 + waveTime) * 4 * scale +
                                       Math.sin(x2 * 0.04 + waveTime * 1.3) * 2 * scale;
            if (x2 === 0) ctx.moveTo(x2, waveY2);
            else ctx.lineTo(x2, waveY2);
        }
        ctx.stroke();
    };

    Renderer.prototype._renderHUD = function(ctx, cw, ch, state) {
        var pad = Math.max(12, cw * 0.03);
        var fontSize = Math.max(16, Math.min(28, cw * 0.05));

        // Score
        ctx.fillStyle = COL_SCORE;
        ctx.font = 'bold ' + Math.floor(fontSize) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('' + Math.floor(state.score), pad, pad + fontSize);

        // Height indicator
        ctx.fillStyle = COL_HEIGHT;
        ctx.font = Math.floor(fontSize * 0.6) + 'px sans-serif';
        ctx.fillText(state.heightScore + 'm', pad, pad + fontSize + fontSize * 0.7);

        // Coin streak
        if (state.coinStreak > 1 && state.coinStreakTimer > 0) {
            ctx.fillStyle = COL_COIN;
            ctx.font = 'bold ' + Math.floor(fontSize * 0.8) + 'px sans-serif';
            ctx.textAlign = 'right';
            ctx.globalAlpha = Math.min(1, state.coinStreakTimer);
            ctx.fillText('x' + state.coinStreak, cw - pad, pad + fontSize);
            ctx.globalAlpha = 1;
        }

        // High score (small, top right)
        if (state.highScore > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = Math.floor(fontSize * 0.5) + 'px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('BEST: ' + state.highScore, cw - pad, pad + fontSize * 0.5);
        }

        // Lava proximity warning
        var lavaDist = state.lavaY - state.py;
        if (lavaDist < 150 && lavaDist > 0 && state.pAlive) {
            var warnAlpha = (1 - lavaDist / 150) * 0.3;
            ctx.fillStyle = 'rgba(255,68,0,' + warnAlpha + ')';
            ctx.fillRect(0, ch - ch * 0.15, cw, ch * 0.15);
        }
    };

    // -------------------------------------------------------
    // Menu / Game Over rendering
    // -------------------------------------------------------

    Renderer.prototype.renderMenu = function(ctx, cw, ch, state, time) {
        // Background
        var bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
        bgGrad.addColorStop(0, COL_BG_TOP);
        bgGrad.addColorStop(1, '#1a0505');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, cw, ch);

        // Decorative lava at bottom
        var lavaH = ch * 0.25;
        var lavaTop = ch - lavaH;
        ctx.beginPath();
        ctx.moveTo(0, ch);
        for (var x = 0; x <= cw; x += 4) {
            var wy = lavaTop + Math.sin(x * 0.015 + time * 2) * 8 + Math.sin(x * 0.03 + time * 1.5) * 4;
            ctx.lineTo(x, wy);
        }
        ctx.lineTo(cw, ch);
        ctx.closePath();
        var lavaGrad = ctx.createLinearGradient(0, lavaTop, 0, ch);
        lavaGrad.addColorStop(0, COL_LAVA_TOP);
        lavaGrad.addColorStop(0.5, COL_LAVA_MID);
        lavaGrad.addColorStop(1, COL_LAVA_BOT);
        ctx.fillStyle = lavaGrad;
        ctx.fill();

        // Glow
        var glowGrad = ctx.createLinearGradient(0, lavaTop - ch * 0.1, 0, lavaTop);
        glowGrad.addColorStop(0, 'rgba(255,68,0,0)');
        glowGrad.addColorStop(1, 'rgba(255,68,0,0.3)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, lavaTop - ch * 0.1, cw, ch * 0.1);

        // Title
        var titleSize = Math.max(32, Math.min(64, cw * 0.12));
        var centerY = ch * 0.32;
        ctx.fillStyle = COL_LAVA_TOP;
        ctx.font = 'bold ' + Math.floor(titleSize) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 20;
        ctx.fillText('LAVA RISE', cw / 2, centerY);
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = COL_PLAYER;
        ctx.font = Math.floor(titleSize * 0.35) + 'px sans-serif';
        ctx.fillText('Wall-jump to survive!', cw / 2, centerY + titleSize * 0.55);

        // Tap prompt (pulsing)
        var pulseAlpha = 0.5 + Math.sin(time * 3) * 0.3;
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.floor(titleSize * 0.4) + 'px sans-serif';
        ctx.fillText('TAP TO START', cw / 2, ch * 0.55);
        ctx.globalAlpha = 1;

        // High score
        if (state.highScore > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = Math.floor(titleSize * 0.3) + 'px sans-serif';
            ctx.fillText('BEST: ' + state.highScore, cw / 2, ch * 0.65);
        }

        // Small player character preview (bouncing)
        var previewY = ch * 0.44 + Math.sin(time * 2) * 8;
        var ps = Math.max(1, cw / VIRTUAL_W);
        ctx.fillStyle = COL_PLAYER;
        ctx.shadowColor = COL_PLAYER;
        ctx.shadowBlur = 10;
        var pw = PLAYER_W * ps;
        var ph = PLAYER_H * ps;
        ctx.fillRect(cw / 2 - pw / 2, previewY - ph / 2, pw, ph);
        ctx.shadowBlur = 0;
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cw / 2 - 2 * ps, previewY - 2 * ps, 2.5 * ps, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cw / 2 + 3 * ps, previewY - 2 * ps, 2.5 * ps, 0, Math.PI * 2);
        ctx.fill();
    };

    Renderer.prototype.renderGameOver = function(ctx, cw, ch, state, time, canRestart) {
        // Darken
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, cw, ch);

        var titleSize = Math.max(28, Math.min(56, cw * 0.1));
        var centerY = ch * 0.3;

        // Game over text
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold ' + Math.floor(titleSize) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', cw / 2, centerY);

        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.floor(titleSize * 0.7) + 'px sans-serif';
        ctx.fillText('' + Math.floor(state.score), cw / 2, centerY + titleSize * 0.9);

        // Height and coins
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = Math.floor(titleSize * 0.35) + 'px sans-serif';
        ctx.fillText(state.heightScore + 'm  |  ' + state.coinScore + ' coins', cw / 2, centerY + titleSize * 1.4);

        // New high score?
        if (state.score >= state.highScore && state.score > 0) {
            ctx.fillStyle = COL_COIN;
            ctx.font = 'bold ' + Math.floor(titleSize * 0.4) + 'px sans-serif';
            ctx.fillText('NEW BEST!', cw / 2, centerY + titleSize * 1.9);
        }

        // Restart prompt
        if (canRestart) {
            var pulseAlpha = 0.5 + Math.sin(time * 3) * 0.3;
            ctx.globalAlpha = pulseAlpha;
            ctx.fillStyle = '#ffffff';
            ctx.font = Math.floor(titleSize * 0.4) + 'px sans-serif';
            ctx.fillText('TAP TO RETRY', cw / 2, ch * 0.65);
            ctx.globalAlpha = 1;
        }
    };

    // -------------------------------------------------------
    // Public API
    // -------------------------------------------------------
    return {
        State: State,
        Renderer: Renderer,
        SFX: SFX,
        GAME_OVER_LOCKOUT: GAME_OVER_LOCKOUT
    };

})();
