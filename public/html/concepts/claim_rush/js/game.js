/**
 * Claim Rush - Territory capture game
 * State machine, rAF loop, Poki lifecycle, rendering, game logic
 */

import { InputManager } from './input.js';

export const Config = {
    adsEnabled: false,
};

// Level definitions: { rivals, rivalSpeed, aggression, targetPercent }
var LEVELS = [
    { rivals: 1, rivalSpeed: 5,   aggression: 0.2, target: 80 },
    { rivals: 2, rivalSpeed: 5.5, aggression: 0.3, target: 80 },
    { rivals: 2, rivalSpeed: 6,   aggression: 0.4, target: 80 },
    { rivals: 3, rivalSpeed: 6.5, aggression: 0.45, target: 80 },
    { rivals: 3, rivalSpeed: 7,   aggression: 0.5, target: 80 },
    { rivals: 4, rivalSpeed: 7.5, aggression: 0.55, target: 80 },
    { rivals: 4, rivalSpeed: 8,   aggression: 0.6, target: 80 },
    { rivals: 5, rivalSpeed: 8.5, aggression: 0.7, target: 80 },
];

// Global reference for cross-file access
var ClaimRush = null;

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading';
        this.score = 0;
        this.lastTime = 0;

        // Game state
        this.level = 0;
        this.respawnTimer = 0;
        this.levelCompleteTimer = 0;
        this.gameOverTimer = 0;
        this.paused = false;

        // Screen shake
        this.shakeAmount = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;

        // Color flash
        this.flashColor = null;
        this.flashTimer = 0;

        // HUD animation
        this.percentDisplay = 0;
        this.percentBounce = 0;

        // Swipe input (touch)
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchActive = false;
        this.lastSwipeDir = null;

        // Menu animation
        this.menuTime = 0;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);

        // Touch handlers for swipe
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
        canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
        canvas.addEventListener('touchend', this._onTouchEnd, { passive: true });

        // Mouse direction for desktop
        this._onMouseMove = this._onMouseMove.bind(this);
        canvas.addEventListener('mousemove', this._onMouseMove);
        this.mouseDir = { dx: 0, dy: -1 };
        this._mouseMovedRecently = false;

        // Visibility handler for pause
        this._onVisChange = this._onVisChange.bind(this);
        document.addEventListener('visibilitychange', this._onVisChange);

        // Make accessible globally for cross-file references
        ClaimRush = this;
        window.ClaimRush = this;
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
        // No assets to load - everything is procedural
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _loop(now) {
        var dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = now;

        if (!this.paused) {
            this.update(dt);
        }
        this.render();
        this.input.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // ---- Touch / Swipe input ----

    _onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.touchActive = true;
        }
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (!this.touchActive || e.touches.length === 0) return;

        var tx = e.touches[0].clientX;
        var ty = e.touches[0].clientY;
        var ddx = tx - this.touchStartX;
        var ddy = ty - this.touchStartY;
        var dist = Math.sqrt(ddx * ddx + ddy * ddy);

        if (dist > 15) { // minimum swipe distance
            if (Math.abs(ddx) > Math.abs(ddy)) {
                this.lastSwipeDir = { dx: ddx > 0 ? 1 : -1, dy: 0 };
            } else {
                this.lastSwipeDir = { dx: 0, dy: ddy > 0 ? 1 : -1 };
            }
            // Reset start point for continuous swipe steering
            this.touchStartX = tx;
            this.touchStartY = ty;
        }
    }

    _onTouchEnd(e) {
        this.touchActive = false;
    }

    _onMouseMove(e) {
        if (this.state !== 'playing') return;
        // Calculate direction from player to mouse
        var layout = this._getLayout();
        if (!layout) return;
        var playerScreenX = layout.ox + Player.fx * layout.cell;
        var playerScreenY = layout.oy + Player.fy * layout.cell;
        var mdx = e.clientX - playerScreenX;
        var mdy = e.clientY - playerScreenY;

        if (Math.abs(mdx) > Math.abs(mdy)) {
            this.mouseDir = { dx: mdx > 0 ? 1 : -1, dy: 0 };
        } else {
            this.mouseDir = { dx: 0, dy: mdy > 0 ? 1 : -1 };
        }
        this._mouseMovedRecently = true;
    }

    _onVisChange() {
        if (document.hidden && this.state === 'playing') {
            this.paused = true;
        } else if (!document.hidden && this.paused) {
            this.paused = false;
            this.lastTime = performance.now();
        }
    }

    // ---- Layout calculation ----

    _getLayout() {
        var cw = this.canvas.width;
        var ch = this.canvas.height;
        var hudHeight = 50;
        var arenaW = Arena.W;
        var arenaH = Arena.H;
        var cellW = (cw - 4) / arenaW;
        var cellH = (ch - hudHeight - 4) / arenaH;
        var cell = Math.min(cellW, cellH);
        var totalW = cell * arenaW;
        var totalH = cell * arenaH;
        var ox = (cw - totalW) / 2;
        var oy = hudHeight + (ch - hudHeight - totalH) / 2;
        return { cell: cell, ox: ox, oy: oy, totalW: totalW, totalH: totalH, hudHeight: hudHeight };
    }

    // ---- State transitions ----

    start() {
        this.state = 'playing';
        this.score = 0;
        this.level = 0;
        Player.lives = 3;
        GameAudio.initContext();
        GameAudio.resume();
        Synth.init();
        this.startLevel();
        Poki.gameplayStart();
    }

    startLevel() {
        var lvl = LEVELS[Math.min(this.level, LEVELS.length - 1)];

        Arena.init(80, 80);
        var startPos = Arena.setupPlayerStart();
        Player.init(startPos, 8);
        RivalManager.init();
        Particles.init();
        RivalManager.spawnRivals(lvl.rivals, lvl.rivalSpeed, lvl.aggression);
        this.percentDisplay = Arena.getPlayerPercent();
        this.respawnTimer = 0;
        this.levelCompleteTimer = 0;
        this.flashColor = null;
        this.flashTimer = 0;
        this.shakeAmount = 0;
    }

    gameOver() {
        this.state = 'gameover';
        this.gameOverTimer = 0;
        Synth.gameOverJingle();
        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { GameAudio.muteAll(); },
                function() { GameAudio.unmuteAll(); }
            );
        }
        this.state = 'playing';
        this.score = 0;
        this.level = 0;
        Player.lives = 3;
        this.startLevel();
        Poki.gameplayStart();
    }

    async nextLevel() {
        this.level++;
        if (Config.adsEnabled) {
            Poki.gameplayStop();
            await Poki.commercialBreak(
                function() { GameAudio.muteAll(); },
                function() { GameAudio.unmuteAll(); }
            );
            Poki.gameplayStart();
        }
        this.startLevel();
    }

    addScore(points) {
        this.score += points;
    }

    screenShake(amount, duration) {
        this.shakeAmount = amount;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    colorFlash(color, duration) {
        this.flashColor = color;
        this.flashTimer = duration || 0.1;
    }

    // ---- Update ----

    update(dt) {
        this.menuTime += dt;

        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();

        if (this.state === 'menu') {
            if (confirm) {
                Synth.menuSelect();
                this.start();
            }
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.gameOverTimer += dt;
            if (confirm && this.gameOverTimer > 0.5) this.restart();
        }
    }

    updatePlaying(dt) {
        // Update shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }

        // Flash
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }

        // HUD percent animation
        var targetPercent = Arena.getPlayerPercent();
        this.percentDisplay += (targetPercent - this.percentDisplay) * 5 * dt;
        if (Math.abs(targetPercent - this.percentDisplay) > 0.5) {
            this.percentBounce = 1;
        }
        if (this.percentBounce > 0) this.percentBounce -= dt * 4;

        // Level complete check
        if (this.levelCompleteTimer > 0) {
            this.levelCompleteTimer -= dt;
            if (this.levelCompleteTimer <= 0) {
                this.nextLevel();
            }
            Particles.update(dt);
            return;
        }

        // Respawn timer
        if (this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                if (Player.lives <= 0) {
                    this.gameOver();
                    return;
                }
                Player.respawn();
            }
            Particles.update(dt);
            return;
        }

        // Handle input
        this.handleInput();

        // Update player
        Player.update(dt);

        // Update rivals
        RivalManager.update(dt);

        // Check collisions
        if (Player.alive) {
            if (RivalManager.checkTrailCollision() || RivalManager.checkPlayerCollision()) {
                Player.die();
            }
        }

        // Player died this frame
        if (!Player.alive && this.respawnTimer <= 0) {
            this.respawnTimer = 1.5;
        }

        // Check level complete
        if (targetPercent >= LEVELS[Math.min(this.level, LEVELS.length - 1)].target) {
            this.levelCompleteTimer = 2.0;
            var bonus = (this.level + 1) * 500;
            this.score += bonus;
            Particles.floatingText('LEVEL ' + (this.level + 1) + ' CLEAR!', Arena.W / 2, Arena.H / 2 - 5, '#ffff00');
            Particles.floatingText('+' + bonus + ' BONUS', Arena.W / 2, Arena.H / 2 + 3, '#00ff88');
            Synth.levelComplete();
            this.colorFlash('#ffffff', 0.2);
            this.screenShake(8, 0.2);
        }

        // Trail sparkles
        if (Player.isOutside && Player.trail.length > 0 && Math.random() < 0.3) {
            var tl = Player.trail[Player.trail.length - 1];
            Particles.trailSparkle(tl.x, tl.y);
        }

        // Update particles
        Particles.update(dt);
    }

    handleInput() {
        if (!Player.alive) return;

        // Keyboard
        Player.handleInput(this.input, this.canvas);

        // Swipe
        if (this.lastSwipeDir) {
            Player.queueDirection(this.lastSwipeDir.dx, this.lastSwipeDir.dy);
            this.lastSwipeDir = null;
        }

        // Mouse steering (only if no keyboard/touch active and mouse was moved)
        if (!this.input.isUp() && !this.input.isDownKey() &&
            !this.input.isLeft() && !this.input.isRight() &&
            !this.touchActive && this.mouseDir && this._mouseMovedRecently) {
            Player.queueDirection(this.mouseDir.dx, this.mouseDir.dy);
            this._mouseMovedRecently = false;
        }
    }

    // ---- Render ----

    render() {
        var ctx = this.ctx;
        var cw = this.canvas.width;
        var ch = this.canvas.height;

        // Clear
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, cw, ch);

        if (this.state === 'loading') {
            this.renderLoading();
        } else if (this.state === 'menu') {
            this.renderMenu();
        } else if (this.state === 'playing') {
            this.renderPlaying();
        } else if (this.state === 'gameover') {
            this.renderGameOver();
        }
    }

    renderLoading() {
        var ctx = this.ctx;
        var cw = this.canvas.width, ch = this.canvas.height;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', cw / 2, ch / 2);
    }

    renderMenu() {
        var ctx = this.ctx;
        var cw = this.canvas.width, ch = this.canvas.height;
        var t = this.menuTime;

        // Background grid effect
        var gridSize = 40;
        ctx.strokeStyle = 'rgba(68, 136, 255, 0.1)';
        ctx.lineWidth = 1;
        for (var x = 0; x < cw; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ch);
            ctx.stroke();
        }
        for (var y = 0; y < ch; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(cw, y);
            ctx.stroke();
        }

        // Animated territory fill demo
        var demoSize = 8;
        var demoCellW = Math.min(cw, ch) * 0.04;
        var demoOx = cw / 2 - (demoSize * demoCellW) / 2;
        var demoOy = ch / 2 - 100;
        var fillCount = Math.floor((t * 3) % (demoSize * demoSize));
        for (var i = 0; i < demoSize * demoSize; i++) {
            var gx = i % demoSize;
            var gy = Math.floor(i / demoSize);
            ctx.fillStyle = i < fillCount ? 'rgba(68, 136, 255, 0.4)' : 'rgba(255,255,255, 0.05)';
            ctx.fillRect(demoOx + gx * demoCellW + 1, demoOy + gy * demoCellW + 1, demoCellW - 2, demoCellW - 2);
        }

        // Title
        var titleY = ch / 2 - 40;
        ctx.fillStyle = '#4488ff';
        ctx.font = 'bold ' + Math.min(60, cw * 0.1) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLAIM RUSH', cw / 2, titleY);

        // Subtitle
        ctx.fillStyle = '#88aacc';
        ctx.font = Math.min(18, cw * 0.035) + 'px sans-serif';
        ctx.fillText('Capture territory. Avoid rivals. Claim 80%!', cw / 2, titleY + 35);

        // Tap to start (pulsing)
        var pulse = 0.5 + 0.5 * Math.sin(t * 3);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.4 + pulse * 0.6) + ')';
        ctx.font = 'bold ' + Math.min(24, cw * 0.045) + 'px sans-serif';
        ctx.fillText('TAP TO START', cw / 2, ch / 2 + 80);

        // Controls hint
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = Math.min(14, cw * 0.028) + 'px sans-serif';
        ctx.fillText('Swipe or Arrow Keys to steer', cw / 2, ch / 2 + 115);
    }

    renderPlaying() {
        var ctx = this.ctx;
        var cw = this.canvas.width, ch = this.canvas.height;
        var layout = this._getLayout();
        var cell = layout.cell;
        var ox = layout.ox;
        var oy = layout.oy;

        // Apply screen shake
        var shakeX = 0, shakeY = 0;
        if (this.shakeTimer > 0) {
            var intensity = this.shakeAmount * (this.shakeTimer / this.shakeDuration);
            shakeX = (Math.random() - 0.5) * 2 * intensity;
            shakeY = (Math.random() - 0.5) * 2 * intensity;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Render arena grid
        this.renderArena(ctx, cell, ox, oy);

        // Render trails
        this.renderTrails(ctx, cell, ox, oy);

        // Render rivals
        this.renderRivals(ctx, cell, ox, oy);

        // Render player
        this.renderPlayer(ctx, cell, ox, oy);

        // Render particles
        Particles.render(ctx, cell, ox, oy);

        ctx.restore();

        // Color flash overlay
        if (this.flashTimer > 0 && this.flashColor) {
            ctx.fillStyle = this.flashColor;
            ctx.globalAlpha = this.flashTimer * 3;
            ctx.fillRect(0, 0, cw, ch);
            ctx.globalAlpha = 1;
        }

        // HUD
        this.renderHUD(ctx, cw, ch, layout);

        // Pause overlay
        if (this.paused) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, cw, ch);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', cw / 2, ch / 2);
        }

        // Level complete overlay
        if (this.levelCompleteTimer > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, cw, ch);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold ' + Math.min(48, cw * 0.08) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL ' + (this.level + 1) + ' CLEAR!', cw / 2, ch / 2 - 20);
            ctx.font = Math.min(24, cw * 0.04) + 'px sans-serif';
            ctx.fillStyle = '#88ff88';
            ctx.fillText('Get ready for level ' + (this.level + 2) + '...', cw / 2, ch / 2 + 20);
        }

        // Respawn countdown
        if (this.respawnTimer > 0 && Player.lives > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(0, 0, cw, ch);
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold ' + Math.min(48, cw * 0.08) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Trail cut!', cw / 2, ch / 2 - 10);
            ctx.font = Math.min(20, cw * 0.035) + 'px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Lives: ' + Player.lives, cw / 2, ch / 2 + 25);
        }
    }

    renderArena(ctx, cell, ox, oy) {
        var W = Arena.W, H = Arena.H;

        // Draw arena background (neutral area)
        ctx.fillStyle = '#111122';
        ctx.fillRect(ox, oy, W * cell, H * cell);

        // Draw claimed player territory
        // Batch render for performance - draw rectangles row by row
        ctx.fillStyle = 'rgba(40, 80, 180, 0.5)';
        for (var y = 0; y < H; y++) {
            var rowStart = -1;
            for (var x = 0; x <= W; x++) {
                var isPlayer = x < W && Arena.grid[y * W + x] === 1;
                if (isPlayer && rowStart < 0) {
                    rowStart = x;
                } else if (!isPlayer && rowStart >= 0) {
                    ctx.fillRect(
                        ox + rowStart * cell,
                        oy + y * cell,
                        (x - rowStart) * cell,
                        cell
                    );
                    rowStart = -1;
                }
            }
        }

        // Grid lines (subtle)
        if (cell >= 4) {
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 0.5;
            // Only draw every Nth line for performance
            var step = cell < 6 ? 5 : (cell < 10 ? 2 : 1);
            ctx.beginPath();
            for (var x = 0; x <= W; x += step) {
                ctx.moveTo(ox + x * cell, oy);
                ctx.lineTo(ox + x * cell, oy + H * cell);
            }
            for (var y = 0; y <= H; y += step) {
                ctx.moveTo(ox, oy + y * cell);
                ctx.lineTo(ox + W * cell, oy + y * cell);
            }
            ctx.stroke();
        }

        // Arena border
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox - 1, oy - 1, W * cell + 2, H * cell + 2);
    }

    renderTrails(ctx, cell, ox, oy) {
        // Player trail
        if (Player.trail.length > 0) {
            ctx.fillStyle = 'rgba(100, 160, 255, 0.8)';
            for (var i = 0; i < Player.trail.length; i++) {
                var t = Player.trail[i];
                ctx.fillRect(ox + t.x * cell, oy + t.y * cell, cell, cell);
            }

            // Trail glow effect - draw line connecting trail points
            if (cell >= 3 && Player.trail.length > 1) {
                ctx.strokeStyle = 'rgba(100, 180, 255, 0.4)';
                ctx.lineWidth = cell * 0.6;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(
                    ox + Player.trail[0].x * cell + cell / 2,
                    oy + Player.trail[0].y * cell + cell / 2
                );
                for (var i = 1; i < Player.trail.length; i++) {
                    ctx.lineTo(
                        ox + Player.trail[i].x * cell + cell / 2,
                        oy + Player.trail[i].y * cell + cell / 2
                    );
                }
                ctx.stroke();
            }
        }
    }

    renderPlayer(ctx, cell, ox, oy) {
        if (!Player.alive) return;

        var px = ox + Player.fx * cell;
        var py = oy + Player.fy * cell;
        var size = cell * 1.3;

        // Invincibility blink
        if (Player.invincibleTimer > 0 && Math.sin(Player.invincibleTimer * 20) > 0) {
            return; // Skip render for blink effect
        }

        // Glow
        ctx.fillStyle = 'rgba(68, 136, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(px + cell / 2, py + cell / 2, size, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = Player.color;
        ctx.fillRect(px + (cell - size * 0.7) / 2, py + (cell - size * 0.7) / 2, size * 0.7, size * 0.7);

        // Direction indicator
        ctx.fillStyle = '#ffffff';
        var ix = px + cell / 2 + Player.dx * cell * 0.25;
        var iy = py + cell / 2 + Player.dy * cell * 0.25;
        ctx.beginPath();
        ctx.arc(ix, iy, cell * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }

    renderRivals(ctx, cell, ox, oy) {
        for (var i = 0; i < RivalManager.rivals.length; i++) {
            var r = RivalManager.rivals[i];
            if (!r.alive) continue;

            var rx = ox + r.fx * cell;
            var ry = oy + r.fy * cell;
            var size = cell * 1.2;

            // Glow
            ctx.fillStyle = r.color + '44';
            ctx.beginPath();
            ctx.arc(rx + cell / 2, ry + cell / 2, size, 0, Math.PI * 2);
            ctx.fill();

            // Body - diamond shape
            ctx.fillStyle = r.color;
            ctx.beginPath();
            ctx.moveTo(rx + cell / 2, ry + (cell - size * 0.7) / 2);
            ctx.lineTo(rx + cell / 2 + size * 0.35, ry + cell / 2);
            ctx.lineTo(rx + cell / 2, ry + cell / 2 + size * 0.35);
            ctx.lineTo(rx + cell / 2 - size * 0.35, ry + cell / 2);
            ctx.closePath();
            ctx.fill();

            // Eyes (direction)
            ctx.fillStyle = '#ffffff';
            var ex = rx + cell / 2 + r.dx * cell * 0.15;
            var ey = ry + cell / 2 + r.dy * cell * 0.15;
            ctx.beginPath();
            ctx.arc(ex - cell * 0.08, ey, cell * 0.08, 0, Math.PI * 2);
            ctx.arc(ex + cell * 0.08, ey, cell * 0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderHUD(ctx, cw, ch, layout) {
        var hudY = 5;
        var fontSize = Math.min(22, cw * 0.04);

        // Percentage claimed
        var pct = this.percentDisplay;
        var bounceScale = 1 + this.percentBounce * 0.2;
        ctx.save();
        ctx.translate(cw / 2, hudY + fontSize * 0.6);
        ctx.scale(bounceScale, bounceScale);
        ctx.fillStyle = pct >= 60 ? '#44ff88' : (pct >= 30 ? '#ffff44' : '#ffffff');
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(pct) + '%', 0, 0);
        ctx.restore();

        // Target
        var target = LEVELS[Math.min(this.level, LEVELS.length - 1)].target;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = Math.min(13, cw * 0.025) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('/ ' + target + '%', cw / 2 + fontSize * 1.5, hudY + fontSize * 0.6);

        // Progress bar
        var barW = Math.min(200, cw * 0.25);
        var barH = 6;
        var barX = cw / 2 - barW / 2;
        var barY = hudY + fontSize + 5;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(barX, barY, barW, barH);
        var fillW = (pct / target) * barW;
        ctx.fillStyle = pct >= target * 0.75 ? '#44ff88' : '#4488ff';
        ctx.fillRect(barX, barY, Math.min(fillW, barW), barH);

        // Score - left
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + Math.min(18, cw * 0.033) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + this.score, 10, hudY + fontSize * 0.6);

        // Lives - right
        ctx.textAlign = 'right';
        var livesStr = '';
        for (var i = 0; i < Player.lives; i++) livesStr += '* ';
        ctx.fillStyle = '#ff6666';
        ctx.fillText(livesStr, cw - 10, hudY + fontSize * 0.6);

        // Level
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = Math.min(13, cw * 0.025) + 'px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Lv.' + (this.level + 1), cw - 10, hudY + fontSize + 10);
    }

    renderGameOver() {
        var ctx = this.ctx;
        var cw = this.canvas.width, ch = this.canvas.height;

        // Dim background with grid
        ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
        ctx.fillRect(0, 0, cw, ch);

        // Game over text
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold ' + Math.min(56, cw * 0.09) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', cw / 2, ch / 2 - 60);

        // Stats
        ctx.fillStyle = '#ffffff';
        ctx.font = Math.min(24, cw * 0.04) + 'px sans-serif';
        ctx.fillText('Score: ' + this.score, cw / 2, ch / 2 - 10);

        ctx.fillStyle = '#88aacc';
        ctx.font = Math.min(20, cw * 0.035) + 'px sans-serif';
        ctx.fillText('Reached Level ' + (this.level + 1), cw / 2, ch / 2 + 25);

        // Restart prompt
        if (this.gameOverTimer > 0.5) {
            var pulse = 0.5 + 0.5 * Math.sin(this.menuTime * 3);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.4 + pulse * 0.6) + ')';
            ctx.font = 'bold ' + Math.min(22, cw * 0.04) + 'px sans-serif';
            ctx.fillText('TAP TO PLAY AGAIN', cw / 2, ch / 2 + 80);
        }
    }
}
