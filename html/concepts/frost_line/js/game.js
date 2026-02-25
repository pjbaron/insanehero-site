/**
 * Frost Line - Draw ice walls to deflect fireballs into fire demons
 * Complete game implementation
 */

import { InputManager } from './input.js';

export const Config = {
    adsEnabled: false,

    // Ink
    inkMax: 100,
    inkRegen: 25,         // per second
    inkCostPerPx: 0.5,
    maxWalls: 15,
    maxWallLen: 120,
    wallMinDraw: 12,      // min drag pixels before placing segment

    // Fireball
    fireballSpeed: 250,
    fireballRadius: 8,
    fireballTrailLen: 8,
    wallDamagePerHit: 0.5,

    // Demons
    demonStartInterval: 3.0,
    demonMinInterval: 0.8,
    demonIntervalDecay: 0.97,  // multiplied each spawn
    demonBaseSpeed: 60,
    demonSpeedRamp: 0.3,       // +px/s per second of game time
    demonRadius: 14,
    demonScoreBase: 100,

    // Snowflakes
    snowInterval: 5.0,
    snowSpeed: 30,
    snowRadius: 10,
    maxLives: 3,
    multiplierStep: 0.5,

    // Fireball split thresholds
    splitScores: [2000, 6000, 15000],

    // Screen shake
    shakeDecay: 8
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
    }

    async init() {
        await Poki.init();
        this._resize();
        await this.loadAssets();
        Poki.gameLoadingFinished();
        this.state = 'menu';
        this.lastTime = performance.now();
        this.menuTime = 0;
        requestAnimationFrame(this._boundLoop);
    }

    async loadAssets() {
        Particles.init();
        DrawInput.init(this.canvas);
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
        DrawInput.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // -------------------------------------------------------
    // State transitions
    // -------------------------------------------------------

    start() {
        this.state = 'playing';
        this.score = 0;
        this.lives = Config.maxLives;
        this.multiplier = 1.0;
        this.gameTime = 0;
        this.ink = Config.inkMax;

        // Entities
        this.fireballs = [];
        this.walls = [];
        this.demons = [];
        this.snowflakes = [];
        this.popups = [];

        // Spawn timers
        this.demonTimer = 2.0; // first demon in 2s
        this.demonInterval = Config.demonStartInterval;
        this.snowTimer = 3.0;  // first snow in 3s
        this.nextSplitIdx = 0;

        // Screen shake
        this.shakeX = 0;
        this.shakeY = 0;

        // High score
        this.highScore = 0;
        try { this.highScore = parseInt(localStorage.getItem('frostline_hi')) || 0; } catch(e) {}

        // Spawn initial fireball
        var cx = this.canvas.width / 2, cy = this.canvas.height / 2;
        this.fireballs.push(Entities.fireball(cx, cy, Config.fireballSpeed));

        Particles.init();

        GameAudio.initContext();
        GameAudio.resume();
        SfxGen.init(GameAudio.ctx);
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        this.gameOverTime = 0;
        SfxGen.play('gameOver', 0.6);

        // Save high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('frostline_hi', String(Math.floor(this.highScore))); } catch(e) {}
        }

        // Big particle burst
        Particles.burst(this.canvas.width / 2, this.canvas.height / 2, 40, 200, 1.5, '#ff4444', 4);

        Poki.gameplayStop();
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
            this.menuTime = (this.menuTime || 0) + dt;
            var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped() || DrawInput.tapped;
            if (confirm) this.start();
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.gameOverTime += dt;
            Particles.update(dt);
            var confirm2 = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped() || DrawInput.tapped;
            if (confirm2 && this.gameOverTime > 0.5) this.restart();
        }
    }

    updatePlaying(dt) {
        this.gameTime += dt;
        var W = this.canvas.width, H = this.canvas.height;

        // --- Ink regeneration ---
        this.ink = Math.min(Config.inkMax, this.ink + Config.inkRegen * dt);

        // --- Draw input: place ice walls ---
        this._handleDrawInput(dt);

        // --- Update fireballs ---
        this._updateFireballs(dt, W, H);

        // --- Spawn & update demons ---
        this._updateDemons(dt, W, H);

        // --- Spawn & update snowflakes ---
        this._updateSnowflakes(dt, W, H);

        // --- Fireball-demon collision ---
        this._checkFireballDemonCollisions();

        // --- Fireball-wall collision ---
        this._checkFireballWallCollisions();

        // --- Demon-snowflake collision ---
        this._checkDemonSnowflakeCollisions();

        // --- Demon-wall blocking ---
        this._blockDemonsOnWalls(dt);

        // --- Update walls (remove dead) ---
        this._updateWalls(dt);

        // --- Fireball splits ---
        this._checkFireballSplits();

        // --- Popups ---
        this._updatePopups(dt);

        // --- Particles ---
        Particles.update(dt);

        // --- Screen shake decay ---
        this.shakeX *= Math.max(0, 1 - Config.shakeDecay * dt);
        this.shakeY *= Math.max(0, 1 - Config.shakeDecay * dt);
        if (Math.abs(this.shakeX) < 0.5) this.shakeX = 0;
        if (Math.abs(this.shakeY) < 0.5) this.shakeY = 0;
    }

    _handleDrawInput(dt) {
        var seg = DrawInput.consumeSegment(Config.wallMinDraw);
        if (seg && this.walls.length < Config.maxWalls) {
            // Clamp wall length
            var len = seg.len;
            if (len > Config.maxWallLen) {
                var ratio = Config.maxWallLen / len;
                seg.bx = seg.ax + (seg.bx - seg.ax) * ratio;
                seg.by = seg.ay + (seg.by - seg.ay) * ratio;
                len = Config.maxWallLen;
            }
            var cost = len * Config.inkCostPerPx;
            if (this.ink >= cost) {
                this.ink -= cost;
                this.walls.push(Entities.iceWall(seg.ax, seg.ay, seg.bx, seg.by));
                SfxGen.play('wallPlace', 0.3);
                // Ice sparkle particles
                var mx = (seg.ax + seg.bx) / 2, my = (seg.ay + seg.by) / 2;
                Particles.burst(mx, my, 4, 40, 0.3, '#aaddff', 2);
            }
        }

        // Short tap = shatter nearest wall
        if (DrawInput.tapped && this.walls.length > 0) {
            var bestIdx = -1, bestDist = 60 * 60; // 60px radius
            for (var i = 0; i < this.walls.length; i++) {
                var w = this.walls[i];
                var d = Collision.pointSegDistSq(DrawInput.tapX, DrawInput.tapY, w.ax, w.ay, w.bx, w.by);
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            if (bestIdx >= 0) {
                var wall = this.walls[bestIdx];
                var mx2 = (wall.ax + wall.bx) / 2, my2 = (wall.ay + wall.by) / 2;
                Particles.burst(mx2, my2, 8, 80, 0.4, '#88ccff', 3);
                SfxGen.play('wallBreak', 0.4);
                this.walls.splice(bestIdx, 1);
                // Refund some ink
                var wLen = Math.sqrt((wall.bx-wall.ax)*(wall.bx-wall.ax) + (wall.by-wall.ay)*(wall.by-wall.ay));
                this.ink = Math.min(Config.inkMax, this.ink + wLen * Config.inkCostPerPx * 0.3);
            }
        }
    }

    _updateFireballs(dt, W, H) {
        for (var i = 0; i < this.fireballs.length; i++) {
            var fb = this.fireballs[i];
            fb.x += fb.vx * dt;
            fb.y += fb.vy * dt;

            // Trail
            fb.trail.push({ x: fb.x, y: fb.y });
            if (fb.trail.length > Config.fireballTrailLen) fb.trail.shift();

            // Bounce off arena edges
            var r = fb.radius;
            var bounced = false;
            if (fb.x < r) { fb.x = r; fb.vx = Math.abs(fb.vx); bounced = true; }
            if (fb.x > W - r) { fb.x = W - r; fb.vx = -Math.abs(fb.vx); bounced = true; }
            if (fb.y < r) { fb.y = r; fb.vy = Math.abs(fb.vy); bounced = true; }
            if (fb.y > H - r) { fb.y = H - r; fb.vy = -Math.abs(fb.vy); bounced = true; }
            if (bounced) {
                SfxGen.play('bounce', 0.2);
                Particles.burst(fb.x, fb.y, 3, 60, 0.2, '#ff6600', 2);
            }

            // Maintain speed
            var spd = Math.sqrt(fb.vx * fb.vx + fb.vy * fb.vy);
            if (spd > 0 && Math.abs(spd - fb.speed) > 1) {
                fb.vx = (fb.vx / spd) * fb.speed;
                fb.vy = (fb.vy / spd) * fb.speed;
            }
        }
    }

    _updateDemons(dt, W, H) {
        this.demonTimer -= dt;
        if (this.demonTimer <= 0) {
            this.demonTimer = this.demonInterval;
            this.demonInterval = Math.max(Config.demonMinInterval, this.demonInterval * Config.demonIntervalDecay);
            this._spawnDemon(W, H);
        }

        var demonSpeed = Config.demonBaseSpeed + this.gameTime * Config.demonSpeedRamp;
        for (var i = this.demons.length - 1; i >= 0; i--) {
            var d = this.demons[i];
            d.flashTimer = Math.max(0, d.flashTimer - dt);

            // Update direction toward center (slow homing)
            var cx = W / 2, cy = H / 2;
            var dx = cx - d.x, dy = cy - d.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            d.vx = (dx / dist) * demonSpeed;
            d.vy = (dy / dist) * demonSpeed;

            d.x += d.vx * dt;
            d.y += d.vy * dt;

            // Remove if somehow past center significantly
            if (d.x > -50 && d.x < W + 50 && d.y > -50 && d.y < H + 50) {
                // still in bounds
            } else {
                this.demons.splice(i, 1);
            }
        }
    }

    _spawnDemon(W, H) {
        // Spawn from random edge
        var side = Math.floor(Math.random() * 4);
        var x, y;
        var margin = 20;
        if (side === 0) { x = -margin; y = Math.random() * H; }       // left
        else if (side === 1) { x = W + margin; y = Math.random() * H; } // right
        else if (side === 2) { x = Math.random() * W; y = -margin; }    // top
        else { x = Math.random() * W; y = H + margin; }                 // bottom

        var speed = Config.demonBaseSpeed + this.gameTime * Config.demonSpeedRamp;
        var demon = Entities.fireDemon(x, y, W / 2, H / 2, speed);
        demon.flashTimer = 0.3;
        this.demons.push(demon);
        SfxGen.play('demonSpawn', 0.25);
    }

    _updateSnowflakes(dt, W, H) {
        this.snowTimer -= dt;
        if (this.snowTimer <= 0) {
            this.snowTimer = Config.snowInterval;
            this._spawnSnowflake(W, H);
        }

        for (var i = this.snowflakes.length - 1; i >= 0; i--) {
            var s = this.snowflakes[i];
            s.wobblePhase += dt * 2;
            s.x += s.vx * dt + Math.sin(s.wobblePhase) * 0.5;
            s.y += s.vy * dt + Math.cos(s.wobblePhase * 0.7) * 0.3;

            // Check if reached exit (opposite edge)
            if (s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) {
                // Safe exit!
                this.multiplier += Config.multiplierStep;
                var bonus = Math.floor(50 * this.multiplier);
                this.score += bonus;
                this.popups.push(Entities.scorePopup(s.x, s.y, '+' + bonus + ' x' + this.multiplier.toFixed(1), '#aaeeff'));
                SfxGen.play('snowSafe', 0.5);
                Particles.burst(
                    Math.max(0, Math.min(W, s.x)),
                    Math.max(0, Math.min(H, s.y)),
                    10, 60, 0.5, '#ffffff', 3
                );
                this.snowflakes.splice(i, 1);
            }
        }
    }

    _spawnSnowflake(W, H) {
        // Enter from one edge, drift to opposite edge
        var side = Math.floor(Math.random() * 4);
        var x, y, tx, ty;
        var margin = 10;
        if (side === 0) { x = -margin; y = H * (0.2 + Math.random() * 0.6); tx = W + margin; ty = H * (0.2 + Math.random() * 0.6); }
        else if (side === 1) { x = W + margin; y = H * (0.2 + Math.random() * 0.6); tx = -margin; ty = H * (0.2 + Math.random() * 0.6); }
        else if (side === 2) { x = W * (0.2 + Math.random() * 0.6); y = -margin; tx = W * (0.2 + Math.random() * 0.6); ty = H + margin; }
        else { x = W * (0.2 + Math.random() * 0.6); y = H + margin; tx = W * (0.2 + Math.random() * 0.6); ty = -margin; }

        this.snowflakes.push(Entities.snowflake(x, y, tx, ty, Config.snowSpeed));
    }

    _checkFireballDemonCollisions() {
        for (var fi = 0; fi < this.fireballs.length; fi++) {
            var fb = this.fireballs[fi];
            for (var di = this.demons.length - 1; di >= 0; di--) {
                var d = this.demons[di];
                if (Collision.circleCircle(fb.x, fb.y, fb.radius, d.x, d.y, d.radius)) {
                    // Demon destroyed!
                    var pts = Math.floor(Config.demonScoreBase * this.multiplier);
                    this.score += pts;
                    this.popups.push(Entities.scorePopup(d.x, d.y - 20, '+' + pts, '#ffaa00'));
                    SfxGen.play('demonHit', 0.5);
                    Particles.burst(d.x, d.y, 15, 120, 0.5, '#ff4400', 4);
                    Particles.burst(d.x, d.y, 8, 80, 0.3, '#ffaa00', 2);
                    this._addShake(4);
                    this.demons.splice(di, 1);
                }
            }
        }
    }

    _checkFireballWallCollisions() {
        for (var fi = 0; fi < this.fireballs.length; fi++) {
            var fb = this.fireballs[fi];
            for (var wi = this.walls.length - 1; wi >= 0; wi--) {
                var w = this.walls[wi];
                var dist = Collision.circleSegDist(fb.x, fb.y, w.ax, w.ay, w.bx, w.by);
                if (dist < fb.radius + 3) {
                    // Reflect fireball
                    var ref = Collision.reflectOffSegment(fb.vx, fb.vy, w.ax, w.ay, w.bx, w.by);
                    fb.vx = ref.vx;
                    fb.vy = ref.vy;
                    // Push out
                    var nx = fb.x - (w.ax + w.bx) / 2;
                    var ny = fb.y - (w.ay + w.by) / 2;
                    var nl = Math.sqrt(nx * nx + ny * ny) || 1;
                    fb.x += (nx / nl) * 3;
                    fb.y += (ny / nl) * 3;

                    // Melt wall
                    w.hp -= Config.wallDamagePerHit;
                    w.melting = true;
                    SfxGen.play('bounce', 0.3);
                    var mx = (w.ax + w.bx) / 2, my = (w.ay + w.by) / 2;
                    Particles.burst(mx, my, 5, 50, 0.3, '#66bbff', 2);

                    if (w.hp <= 0) {
                        Particles.burst(mx, my, 10, 80, 0.4, '#88ccff', 3);
                        SfxGen.play('wallBreak', 0.3);
                        this.walls.splice(wi, 1);
                    }
                    break; // one collision per fireball per frame
                }
            }
        }
    }

    _checkDemonSnowflakeCollisions() {
        for (var di = 0; di < this.demons.length; di++) {
            var d = this.demons[di];
            for (var si = this.snowflakes.length - 1; si >= 0; si--) {
                var s = this.snowflakes[si];
                if (Collision.circleCircle(d.x, d.y, d.radius, s.x, s.y, s.radius)) {
                    // Snowflake destroyed by demon
                    this.lives--;
                    this.multiplier = 1.0; // reset multiplier
                    SfxGen.play('snowDie', 0.6);
                    Particles.burst(s.x, s.y, 12, 60, 0.5, '#ffffff', 3);
                    Particles.burst(s.x, s.y, 6, 40, 0.3, '#ff4444', 2);
                    this._addShake(6);
                    this.popups.push(Entities.scorePopup(s.x, s.y - 20, 'LOST!', '#ff4444'));
                    this.snowflakes.splice(si, 1);

                    if (this.lives <= 0) {
                        this.gameOver();
                        return;
                    }
                }
            }
        }
    }

    _blockDemonsOnWalls(dt) {
        for (var di = 0; di < this.demons.length; di++) {
            var d = this.demons[di];
            for (var wi = 0; wi < this.walls.length; wi++) {
                var w = this.walls[wi];
                var dist = Collision.circleSegDist(d.x, d.y, w.ax, w.ay, w.bx, w.by);
                if (dist < d.radius + 2) {
                    // Push demon back along its approach vector
                    var pushX = d.x - (w.ax + w.bx) / 2;
                    var pushY = d.y - (w.ay + w.by) / 2;
                    var pLen = Math.sqrt(pushX * pushX + pushY * pushY) || 1;
                    d.x += (pushX / pLen) * d.speed * dt * 0.5;
                    d.y += (pushY / pLen) * d.speed * dt * 0.5;

                    // Slowly damage wall from demon contact
                    w.hp -= 0.15 * dt;
                    if (w.hp <= 0) {
                        var mx = (w.ax + w.bx) / 2, my = (w.ay + w.by) / 2;
                        Particles.burst(mx, my, 8, 60, 0.3, '#88ccff', 2);
                        SfxGen.play('wallBreak', 0.25);
                        this.walls.splice(wi, 1);
                        wi--;
                    }
                }
            }
        }
    }

    _updateWalls(dt) {
        for (var i = this.walls.length - 1; i >= 0; i--) {
            var w = this.walls[i];
            w.age += dt;
        }
    }

    _checkFireballSplits() {
        if (this.nextSplitIdx < Config.splitScores.length && this.score >= Config.splitScores[this.nextSplitIdx]) {
            this.nextSplitIdx++;
            // Split: duplicate the first fireball with a rotated velocity
            var src = this.fireballs[0];
            if (src) {
                var angle = Math.PI / 4 + Math.random() * Math.PI / 2;
                var cos = Math.cos(angle), sin = Math.sin(angle);
                var newFb = Entities.fireball(src.x, src.y, src.speed);
                newFb.vx = src.vx * cos - src.vy * sin;
                newFb.vy = src.vx * sin + src.vy * cos;
                this.fireballs.push(newFb);
                SfxGen.play('split', 0.6);
                this._addShake(8);
                Particles.burst(src.x, src.y, 20, 100, 0.6, '#ffff00', 3);
                this.popups.push(Entities.scorePopup(src.x, src.y - 30, 'SPLIT!', '#ffff00'));
            }
        }
    }

    _updatePopups(dt) {
        for (var i = this.popups.length - 1; i >= 0; i--) {
            var p = this.popups[i];
            p.life -= dt;
            p.y -= 40 * dt;
            if (p.life <= 0) this.popups.splice(i, 1);
        }
    }

    _addShake(intensity) {
        this.shakeX += (Math.random() - 0.5) * intensity * 2;
        this.shakeY += (Math.random() - 0.5) * intensity * 2;
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        if (this.state === 'loading') this.renderLoading();
        else if (this.state === 'menu') this.renderMenu();
        else if (this.state === 'playing') this.renderPlaying();
        else if (this.state === 'gameover') this.renderGameOver();
    }

    renderLoading() {
        var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#88bbff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', W / 2, H / 2);
    }

    renderMenu() {
        var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        var t = this.menuTime || 0;

        // Background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, W, H);

        // Animated frost particles in background
        for (var i = 0; i < 30; i++) {
            var px = ((i * 137.5 + t * 20) % W);
            var py = ((i * 97.3 + t * 15 + Math.sin(t + i) * 30) % H);
            var alpha = 0.15 + Math.sin(t * 2 + i) * 0.1;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = '#aaddff';
            ctx.fillRect(px - 1, py - 1, 3, 3);
        }
        ctx.globalAlpha = 1;

        // Title glow
        var glowSize = 3 + Math.sin(t * 3) * 2;
        ctx.shadowColor = '#44aaff';
        ctx.shadowBlur = glowSize * 4;

        ctx.fillStyle = '#ccddff';
        ctx.font = 'bold ' + Math.min(64, W * 0.1) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FROST LINE', W / 2, H * 0.35);

        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = '#88aacc';
        ctx.font = Math.min(20, W * 0.035) + 'px sans-serif';
        ctx.fillText('Draw ice walls. Deflect fireballs. Protect snowflakes.', W / 2, H * 0.35 + 40);

        // Pulsing play prompt
        var pulse = 0.6 + Math.sin(t * 4) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.min(26, W * 0.04) + 'px sans-serif';
        ctx.fillText('TAP TO PLAY', W / 2, H * 0.6);
        ctx.globalAlpha = 1;

        // Draw a mini fireball animation
        var fbx = W / 2 + Math.cos(t * 2) * 60;
        var fby = H * 0.75 + Math.sin(t * 3) * 20;
        this._drawFireballGlow(ctx, fbx, fby, 10);

        // Mini demon
        var dmx = W / 2 - 80 + Math.sin(t * 1.5) * 20;
        var dmy = H * 0.75;
        this._drawDemonSprite(ctx, dmx, dmy, 12, 0);

        // Mini snowflake
        var snx = W / 2 + 80 + Math.sin(t * 1.2) * 15;
        var sny = H * 0.75 + Math.cos(t * 1.8) * 10;
        this._drawSnowflakeSprite(ctx, snx, sny, 8, t);
    }

    renderPlaying() {
        var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;

        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // Background - dark blue arena
        ctx.fillStyle = '#080818';
        ctx.fillRect(-10, -10, W + 20, H + 20);

        // Subtle grid
        ctx.strokeStyle = 'rgba(40, 60, 100, 0.15)';
        ctx.lineWidth = 1;
        var gridSize = 40;
        for (var gx = 0; gx < W; gx += gridSize) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for (var gy = 0; gy < H; gy += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }

        // Arena border glow
        ctx.shadowColor = '#224488';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#1a3366';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, W - 2, H - 2);
        ctx.shadowBlur = 0;

        // --- Render walls ---
        for (var wi = 0; wi < this.walls.length; wi++) {
            this._renderWall(ctx, this.walls[wi]);
        }

        // --- Render current draw preview ---
        if (DrawInput.drawing && DrawInput.dragDist > 5) {
            ctx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(DrawInput.lastX, DrawInput.lastY);
            ctx.lineTo(DrawInput.currentX, DrawInput.currentY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // --- Render snowflakes ---
        for (var si = 0; si < this.snowflakes.length; si++) {
            var s = this.snowflakes[si];
            this._drawSnowflakeSprite(ctx, s.x, s.y, s.radius, s.wobblePhase);
        }

        // --- Render demons ---
        for (var di = 0; di < this.demons.length; di++) {
            var d = this.demons[di];
            this._drawDemonSprite(ctx, d.x, d.y, d.radius, d.flashTimer);
        }

        // --- Render fireballs ---
        for (var fi = 0; fi < this.fireballs.length; fi++) {
            var fb = this.fireballs[fi];
            // Trail
            for (var ti = 0; ti < fb.trail.length; ti++) {
                var alpha = (ti / fb.trail.length) * 0.4;
                var size = fb.radius * (ti / fb.trail.length) * 0.7;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ff6600';
                ctx.beginPath();
                ctx.arc(fb.trail[ti].x, fb.trail[ti].y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            this._drawFireballGlow(ctx, fb.x, fb.y, fb.radius);
        }

        // --- Render particles ---
        Particles.render(ctx);

        // --- Render popups ---
        for (var pi = 0; pi < this.popups.length; pi++) {
            var pop = this.popups[pi];
            var popAlpha = Math.max(0, pop.life / pop.maxLife);
            ctx.globalAlpha = popAlpha;
            ctx.fillStyle = pop.color;
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(pop.text, pop.x, pop.y);
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        // --- HUD (not affected by shake) ---
        this._renderHUD(ctx, W, H);
    }

    _renderWall(ctx, w) {
        var alpha = Math.min(1, w.hp / w.maxHp);
        var glow = w.melting ? '#ff6644' : '#44aaff';

        ctx.shadowColor = glow;
        ctx.shadowBlur = 6 * alpha;

        ctx.strokeStyle = 'rgba(100, 200, 255, ' + (alpha * 0.9) + ')';
        ctx.lineWidth = 4 * alpha + 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w.ax, w.ay);
        ctx.lineTo(w.bx, w.by);
        ctx.stroke();

        // Inner bright line
        ctx.strokeStyle = 'rgba(200, 240, 255, ' + (alpha * 0.6) + ')';
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.moveTo(w.ax, w.ay);
        ctx.lineTo(w.bx, w.by);
        ctx.stroke();

        ctx.shadowBlur = 0;
        w.melting = false;
    }

    _drawFireballGlow(ctx, x, y, r) {
        // Outer glow
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffcc44';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // White hot center
        ctx.fillStyle = '#ffffee';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawDemonSprite(ctx, x, y, r, flash) {
        // Pulsing glow
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 10 + (flash > 0 ? 15 : 0);

        // Body
        ctx.fillStyle = flash > 0 ? '#ffffff' : '#cc2200';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Inner
        ctx.fillStyle = '#ff4422';
        ctx.beginPath();
        ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.18, 0, Math.PI * 2);
        ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y + r * 0.15, r * 0.3, 0, Math.PI);
        ctx.stroke();
    }

    _drawSnowflakeSprite(ctx, x, y, r, phase) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(phase * 0.3);

        ctx.shadowColor = '#88ccff';
        ctx.shadowBlur = 6;

        ctx.strokeStyle = '#ccddff';
        ctx.lineWidth = 1.5;

        // 6 arms
        for (var i = 0; i < 6; i++) {
            var a = (i / 6) * Math.PI * 2;
            var cos = Math.cos(a), sin = Math.sin(a);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(cos * r, sin * r);
            // Branch
            var br = r * 0.5;
            var ba = a + 0.5;
            ctx.moveTo(cos * br, sin * br);
            ctx.lineTo(cos * br + Math.cos(ba) * r * 0.3, sin * br + Math.sin(ba) * r * 0.3);
            ba = a - 0.5;
            ctx.moveTo(cos * br, sin * br);
            ctx.lineTo(cos * br + Math.cos(ba) * r * 0.3, sin * br + Math.sin(ba) * r * 0.3);
            ctx.stroke();
        }

        // Center dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _renderHUD(ctx, W, H) {
        var pad = 12;
        var fontSize = Math.min(20, W * 0.035);

        // Score (top left)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE: ' + Math.floor(this.score), pad, pad + fontSize);

        // High score
        if (this.highScore > 0) {
            ctx.fillStyle = '#667788';
            ctx.font = (fontSize * 0.7) + 'px sans-serif';
            ctx.fillText('BEST: ' + this.highScore, pad, pad + fontSize + fontSize * 0.8);
        }

        // Multiplier (top center)
        if (this.multiplier > 1) {
            ctx.fillStyle = '#aaeeff';
            ctx.font = 'bold ' + fontSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('x' + this.multiplier.toFixed(1), W / 2, pad + fontSize);
        }

        // Lives (top right) - snowflake icons
        ctx.textAlign = 'right';
        for (var i = 0; i < this.lives; i++) {
            this._drawSnowflakeSprite(ctx, W - pad - i * 28 - 12, pad + 12, 8, this.gameTime);
        }

        // Ink bar (bottom)
        var barW = Math.min(200, W * 0.4);
        var barH = 8;
        var barX = (W - barW) / 2;
        var barY = H - pad - barH;

        ctx.fillStyle = 'rgba(30, 50, 80, 0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        var fillW = (this.ink / Config.inkMax) * barW;
        var inkColor = this.ink > 20 ? '#4488cc' : '#cc4444';
        ctx.fillStyle = inkColor;
        ctx.fillRect(barX, barY, fillW, barH);

        // Ink label
        ctx.fillStyle = '#88aacc';
        ctx.font = (fontSize * 0.6) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('INK', W / 2, barY - 4);

        // Fireball count
        if (this.fireballs.length > 1) {
            ctx.fillStyle = '#ff8844';
            ctx.font = (fontSize * 0.7) + 'px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('FIREBALLS: ' + this.fireballs.length, W - pad, H - pad - 20);
        }
    }

    renderGameOver() {
        var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        var t = this.gameOverTime || 0;

        // Dark overlay
        ctx.fillStyle = 'rgba(5, 5, 15, 0.92)';
        ctx.fillRect(0, 0, W, H);

        // Particles still render
        Particles.render(ctx);

        var fontSize = Math.min(56, W * 0.09);

        // Game over text with glow
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 10 + Math.sin(t * 3) * 5;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H * 0.32);
        ctx.shadowBlur = 0;

        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + (fontSize * 0.6) + 'px sans-serif';
        ctx.fillText('SCORE: ' + Math.floor(this.score), W / 2, H * 0.45);

        // High score
        if (this.score >= this.highScore && this.highScore > 0) {
            ctx.fillStyle = '#ffdd44';
            ctx.font = 'bold ' + (fontSize * 0.4) + 'px sans-serif';
            ctx.fillText('NEW BEST!', W / 2, H * 0.52);
        } else if (this.highScore > 0) {
            ctx.fillStyle = '#667788';
            ctx.font = (fontSize * 0.35) + 'px sans-serif';
            ctx.fillText('BEST: ' + this.highScore, W / 2, H * 0.52);
        }

        // Stats
        ctx.fillStyle = '#88aacc';
        ctx.font = (fontSize * 0.3) + 'px sans-serif';
        ctx.fillText('Time: ' + Math.floor(this.gameTime) + 's  |  Multiplier reached: x' + this.multiplier.toFixed(1), W / 2, H * 0.59);

        // Restart prompt
        if (t > 0.5) {
            var pulse = 0.5 + Math.sin(t * 4) * 0.4;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.min(24, W * 0.04) + 'px sans-serif';
            ctx.fillText('TAP TO RETRY', W / 2, H * 0.72);
            ctx.globalAlpha = 1;
        }
    }
}
