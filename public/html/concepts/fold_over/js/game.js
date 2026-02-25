/**
 * Game - Fold Over: Paper folding puzzle game
 * State machine, rAF loop, Poki lifecycle
 */

import { InputManager } from './input.js';

/** Config */
export const Config = {
    adsEnabled: false,
};

// Procedural SFX via Web Audio
var SFX = {
    ctx: null,

    init: function() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {}
    },

    resume: function() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    _tone: function(freq, dur, type, vol, ramp) {
        if (!this.ctx) return;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol || 0.15, this.ctx.currentTime);
        if (ramp !== false) gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    },

    fold: function() {
        this._tone(400, 0.12, 'triangle', 0.12);
        var self = this;
        setTimeout(function() { self._tone(520, 0.1, 'triangle', 0.08); }, 50);
    },

    undo: function() {
        this._tone(350, 0.15, 'sine', 0.1);
        var self = this;
        setTimeout(function() { self._tone(280, 0.12, 'sine', 0.08); }, 60);
    },

    complete: function() {
        var self = this;
        this._tone(523, 0.15, 'sine', 0.15);
        setTimeout(function() { self._tone(659, 0.15, 'sine', 0.15); }, 100);
        setTimeout(function() { self._tone(784, 0.2, 'sine', 0.18); }, 200);
        setTimeout(function() { self._tone(1047, 0.3, 'sine', 0.2); }, 320);
    },

    star: function(index) {
        var freqs = [880, 1100, 1320];
        this._tone(freqs[index] || 880, 0.2, 'sine', 0.12);
    },

    click: function() {
        this._tone(600, 0.05, 'square', 0.06);
    },

    error: function() {
        this._tone(200, 0.2, 'sawtooth', 0.08);
    }
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading'; // loading -> menu -> playing -> gameover -> levelcomplete
        this.score = 0;
        this.lastTime = 0;

        // Game state
        this.currentLevel = 0;
        this.levelStars = {};  // { levelIndex: stars }
        this.completed = false;
        this.stars = 0;
        this.levelsCompleted = 0; // for ad pacing

        // Drag state for fold gesture
        this.dragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragX = 0;
        this.dragY = 0;
        this.dragAxis = null;   // 'h' or 'v'
        this.dragLine = 0;      // grid line index
        this.dragSide = null;   // 'before' or 'after'
        this.dragValid = false;
        this.DEAD_ZONE = 15;

        // Menu scroll
        this.menuScrollY = 0;
        this.menuDragging = false;
        this.menuDragStartY = 0;
        this.menuDragStartScroll = 0;

        // Star animation
        this.starAnimTime = 0;
        this.starsShown = 0;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);

        // Touch/mouse event handlers for drag
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);

        canvas.addEventListener('mousedown', this._onPointerDown);
        canvas.addEventListener('mousemove', this._onPointerMove);
        canvas.addEventListener('mouseup', this._onPointerUp);
        canvas.addEventListener('mouseleave', this._onPointerUp);
        canvas.addEventListener('touchstart', this._onPointerDown, { passive: false });
        canvas.addEventListener('touchmove', this._onPointerMove, { passive: false });
        canvas.addEventListener('touchend', this._onPointerUp, { passive: false });
        canvas.addEventListener('touchcancel', this._onPointerUp, { passive: false });

        // Load saved progress
        this._loadProgress();
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

        this.update(dt);
        this.render();
        this.input.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // ---- Pointer handling ----

    _getPointerPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    _onPointerDown(e) {
        var pos = this._getPointerPos(e);
        if (e.type === 'touchstart') e.preventDefault();

        if (this.state === 'menu') {
            this.menuDragging = true;
            this.menuDragStartY = pos.y;
            this.menuDragStartScroll = this.menuScrollY;
            return;
        }

        if (this.state !== 'playing' || this.completed || Renderer.foldAnim) return;

        // Check if click is on the grid
        var gx = Renderer.gridX;
        var gy = Renderer.gridY;
        var gw = Paper.cols * Renderer.cellSize;
        var gh = Paper.rows * Renderer.cellSize;

        if (pos.x >= gx && pos.x <= gx + gw && pos.y >= gy && pos.y <= gy + gh) {
            this.dragging = true;
            this.dragStartX = pos.x;
            this.dragStartY = pos.y;
            this.dragX = pos.x;
            this.dragY = pos.y;
            this.dragAxis = null;
            this.dragValid = false;
        }
    }

    _onPointerMove(e) {
        var pos = this._getPointerPos(e);
        if (e.type === 'touchmove') e.preventDefault();

        if (this.state === 'menu' && this.menuDragging) {
            this.menuScrollY = this.menuDragStartScroll + (this.menuDragStartY - pos.y);
            if (this.menuScrollY < 0) this.menuScrollY = 0;
            return;
        }

        if (!this.dragging) return;
        this.dragX = pos.x;
        this.dragY = pos.y;

        var dx = this.dragX - this.dragStartX;
        var dy = this.dragY - this.dragStartY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.DEAD_ZONE && !this.dragAxis) {
            // Determine axis and line
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal drag = vertical fold line
                this.dragAxis = 'v';
                var relX = this.dragStartX - Renderer.gridX;
                this.dragLine = Math.round(relX / Renderer.cellSize);
                if (this.dragLine < 1) this.dragLine = 1;
                if (this.dragLine >= Paper.cols) this.dragLine = Paper.cols - 1;
            } else {
                // Vertical drag = horizontal fold line
                this.dragAxis = 'h';
                var relY = this.dragStartY - Renderer.gridY;
                this.dragLine = Math.round(relY / Renderer.cellSize);
                if (this.dragLine < 1) this.dragLine = 1;
                if (this.dragLine >= Paper.rows) this.dragLine = Paper.rows - 1;
            }
        }

        if (this.dragAxis) {
            // Determine which side to fold based on drag direction
            if (this.dragAxis === 'v') {
                // Dragging right = fold left side over to right
                // Dragging left = fold right side over to left
                this.dragSide = dx > 0 ? 'before' : 'after';
            } else {
                this.dragSide = dy > 0 ? 'before' : 'after';
            }
            this.dragValid = true;
        }
    }

    _onPointerUp(e) {
        if (e.type === 'touchend' || e.type === 'touchcancel') e.preventDefault();

        if (this.state === 'menu') {
            if (this.menuDragging) {
                var pos;
                if (e.changedTouches && e.changedTouches.length > 0) {
                    pos = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
                } else {
                    pos = { x: e.clientX, y: e.clientY };
                }
                var dragDist = Math.abs(pos.y - this.menuDragStartY);

                // If it was a tap (not a scroll), check for level button hit
                if (dragDist < 10) {
                    this._handleMenuTap(pos);
                }
                this.menuDragging = false;
            }
            return;
        }

        if (this.dragging && this.dragValid && this.dragAxis) {
            this._executeFold(this.dragAxis, this.dragLine, this.dragSide);
        }
        this.dragging = false;
        this.dragAxis = null;
        this.dragValid = false;
    }

    // ---- Menu ----

    _handleMenuTap(pos) {
        if (!Renderer._levelBtns) return;
        for (var i = 0; i < Renderer._levelBtns.length; i++) {
            var btn = Renderer._levelBtns[i];
            // Adjust for scroll
            var by = btn.y - this.menuScrollY;
            if (pos.x >= btn.x && pos.x <= btn.x + btn.w &&
                pos.y >= by && pos.y <= by + btn.h) {
                var lvl = btn.level;
                var unlocked = (lvl === 0 || (this.levelStars[lvl - 1] !== undefined && this.levelStars[lvl - 1] > 0));
                if (unlocked) {
                    SFX.init();
                    SFX.resume();
                    SFX.click();
                    this.currentLevel = lvl;
                    this.startLevel();
                }
                return;
            }
        }
    }

    // ---- State transitions ----

    startLevel() {
        this.state = 'playing';
        this.completed = false;
        this.stars = 0;
        this.starsShown = 0;
        this.starAnimTime = 0;
        var level = LEVELS[this.currentLevel];
        Paper.init(level.grid);
        Renderer.computeLayout(this.canvas.width, this.canvas.height, Paper.rows, Paper.cols);
        Renderer.foldAnim = null;
        Particles.clear();
        GameAudio.initContext();
        GameAudio.resume();
        Poki.gameplayStart();
    }

    start() {
        this.state = 'menu';
        this.menuScrollY = 0;
    }

    gameOver() {
        this.state = 'menu';
        Poki.gameplayStop();
    }

    async restart() {
        this.startLevel();
    }

    async showAd() {
        if (Config.adsEnabled) {
            Poki.gameplayStop();
            await Poki.commercialBreak(
                function() { GameAudio.muteAll(); },
                function() { GameAudio.unmuteAll(); }
            );
            Poki.gameplayStart();
        }
    }

    // ---- Core logic ----

    _executeFold(axis, line, side) {
        if (this.completed || Renderer.foldAnim) return;

        var foldInfo = Paper.fold(axis, line, side);
        if (!foldInfo) {
            SFX.error();
            Particles.shake(3);
            return;
        }

        SFX.fold();
        Particles.shake(4);

        // Spawn fold line particles
        if (axis === 'h') {
            var ly = Renderer.gridY + line * Renderer.cellSize;
            Particles.foldLine(
                Renderer.gridX, ly,
                Renderer.gridX + Paper.cols * Renderer.cellSize, ly,
                12
            );
        } else {
            var lx = Renderer.gridX + line * Renderer.cellSize;
            Particles.foldLine(
                lx, Renderer.gridY,
                lx, Renderer.gridY + Paper.rows * Renderer.cellSize,
                12
            );
        }

        // Start fold animation
        Renderer.startFoldAnim(foldInfo);

        // Check win after animation
        var self = this;
        setTimeout(function() {
            self._checkWin();
        }, 360);
    }

    _checkWin() {
        var level = LEVELS[this.currentLevel];
        if (Paper.matchesTarget(level.target)) {
            this.completed = true;
            this.stars = Paper.getStars(level.par);
            this.starAnimTime = 0;
            this.starsShown = 0;
            this.levelsCompleted++;

            // Save progress
            var prev = this.levelStars[this.currentLevel] || 0;
            if (this.stars > prev) {
                this.levelStars[this.currentLevel] = this.stars;
                this._saveProgress();
            }

            SFX.complete();
            Particles.shake(8);

            // Big celebration burst
            var cx = this.canvas.width / 2;
            var cy = this.canvas.height / 2;
            Particles.starBurst(cx, cy);
            Particles.burst(cx - 50, cy - 30, 15, ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F']);
            Particles.burst(cx + 50, cy + 30, 15, ['#9B59B6', '#E67E22', '#1ABC9C']);
        }
    }

    _handleUndo() {
        if (this.completed || Renderer.foldAnim) return;
        if (Paper.undo()) {
            SFX.undo();
            Particles.shake(2);
        }
    }

    _handleReset() {
        if (this.completed || Renderer.foldAnim) return;
        if (Paper.foldCount > 0) {
            var level = LEVELS[this.currentLevel];
            Paper.init(level.grid);
            SFX.undo();
            Particles.shake(3);
        }
    }

    async _handleNextLevel() {
        SFX.click();
        Poki.gameplayStop();

        // Show ad every 3 levels
        if (this.levelsCompleted % 3 === 0) {
            await this.showAd();
        }

        if (this.currentLevel < LEVELS.length - 1) {
            this.currentLevel++;
            this.startLevel();
        } else {
            // All levels done - go back to menu
            this.state = 'menu';
            this.menuScrollY = 0;
        }
    }

    _handleBackToMenu() {
        SFX.click();
        Poki.gameplayStop();
        this.state = 'menu';
        this.menuScrollY = 0;
    }

    // ---- Update ----

    update(dt) {
        Particles.update(dt);

        if (this.state === 'menu') {
            this.updateMenu(dt);
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        }
    }

    updateMenu(dt) {
        // Keyboard: Enter to start first unlocked level
        if (this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
            SFX.init();
            SFX.resume();
            SFX.click();
            // Find first incomplete level
            for (var i = 0; i < LEVELS.length; i++) {
                var unlocked = (i === 0 || (this.levelStars[i - 1] !== undefined && this.levelStars[i - 1] > 0));
                if (unlocked && !this.levelStars[i]) {
                    this.currentLevel = i;
                    this.startLevel();
                    return;
                }
            }
            // All done, start level 0
            this.currentLevel = 0;
            this.startLevel();
        }

        // Clamp scroll
        if (this.menuScrollY < 0) this.menuScrollY = 0;
    }

    updatePlaying(dt) {
        // Fold animation
        Renderer.updateFoldAnim(dt);

        // Star reveal animation
        if (this.completed) {
            this.starAnimTime += dt;
            var newStars = Math.floor(this.starAnimTime / 0.3);
            if (newStars > this.starsShown && this.starsShown < this.stars) {
                this.starsShown++;
                SFX.star(this.starsShown - 1);

                // Per-star particle burst
                var cw = this.canvas.width;
                var panelW = Math.min(320, cw * 0.85);
                var px = (cw - panelW) / 2;
                var starSize = 32;
                var starGap = 12;
                var totalStarsW = starSize * 3 + starGap * 2;
                var sx = (cw - totalStarsW) / 2;
                var panelH = 220;
                var py = (this.canvas.height - panelH) / 2 - 20;
                var sy = py + 60;
                var starX = sx + (this.starsShown - 1) * (starSize + starGap) + starSize / 2;
                var starY = sy + starSize / 2;
                Particles.starBurst(starX, starY);
            }
        }

        // Handle tap on buttons (using wasTapped or checking pointer up on buttons)
        if (this.input.wasTapped()) {
            var mx = this.input.mouseX;
            var my = this.input.mouseY;

            if (this.completed) {
                // Check next button
                var nb = Renderer.nextBtn;
                if (mx >= nb.x && mx <= nb.x + nb.w && my >= nb.y && my <= nb.y + nb.h) {
                    this._handleNextLevel();
                    return;
                }
            } else if (!Renderer.foldAnim) {
                // Check undo button
                var ub = Renderer.undoBtn;
                if (mx >= ub.x && mx <= ub.x + ub.w && my >= ub.y && my <= ub.y + ub.h) {
                    this._handleUndo();
                    return;
                }
                // Check reset button
                var rb = Renderer.resetBtn;
                if (mx >= rb.x && mx <= rb.x + rb.w && my >= rb.y && my <= rb.y + rb.h) {
                    this._handleReset();
                    return;
                }
            }

            // Check back button
            var mb = Renderer.menuBtn;
            if (mx >= mb.x && mx <= mb.x + mb.w && my >= mb.y && my <= mb.y + mb.h) {
                this._handleBackToMenu();
                return;
            }
        }

        // Keyboard shortcuts
        if (this.input.wasPressed('KeyZ') || this.input.wasPressed('KeyU')) {
            this._handleUndo();
        }
        if (this.input.wasPressed('KeyR')) {
            this._handleReset();
        }
        if (this.input.wasPressed('Escape')) {
            this._handleBackToMenu();
        }
        if (this.completed && this.input.wasPressed('Enter')) {
            this._handleNextLevel();
        }
    }

    // ---- Render ----

    render() {
        var ctx = this.ctx;
        var cw = this.canvas.width;
        var ch = this.canvas.height;

        ctx.save();
        ctx.translate(Particles.shakeX, Particles.shakeY);

        if (this.state === 'loading') {
            this.renderLoading();
        } else if (this.state === 'menu') {
            this.renderMenu();
        } else if (this.state === 'playing') {
            this.renderPlaying();
        }

        Particles.render(ctx);
        ctx.restore();
    }

    renderLoading() {
        var ctx = this.ctx;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
    }

    renderMenu() {
        Renderer.renderMenu(this.ctx, this.canvas.width, this.canvas.height,
            this.levelStars, LEVELS.length, this.menuScrollY);
    }

    renderPlaying() {
        var level = LEVELS[this.currentLevel];
        Renderer.computeLayout(this.canvas.width, this.canvas.height, Paper.rows, Paper.cols);

        Renderer.renderGame(
            this.ctx, this.canvas.width, this.canvas.height,
            level, this.currentLevel,
            Paper.foldCount, level.par,
            this.completed, this.starsShown
        );

        // Draw fold preview during drag
        if (this.dragging && this.dragValid && this.dragAxis && !this.completed) {
            Renderer.renderFoldPreview(
                this.ctx, this.dragAxis, this.dragLine, this.dragSide,
                Paper.rows, Paper.cols
            );
        }
    }

    renderGameOver() {
        // Not used in puzzle game - levels just complete
    }

    // ---- Persistence ----

    _saveProgress() {
        try {
            localStorage.setItem('foldover_stars', JSON.stringify(this.levelStars));
        } catch(e) {}
    }

    _loadProgress() {
        try {
            var saved = localStorage.getItem('foldover_stars');
            if (saved) {
                this.levelStars = JSON.parse(saved);
            }
        } catch(e) {
            this.levelStars = {};
        }
    }
}
