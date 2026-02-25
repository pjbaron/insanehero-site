/**
 * Spark Gap - Draw wire paths to connect sparking terminals
 * State machine, rAF loop, Poki lifecycle
 */

import { InputManager } from './input.js';
import { Board, CELL_EMPTY, CELL_OBSTACLE, CELL_WIRE, CELL_TERMINAL, WIRE_COLORS,
         OBS_CAPACITOR, OBS_RESISTOR, OBS_CHIP, OBS_DIODE } from './board.js';
import { Wire } from './wire.js';
import { ParticleSystem } from './particles.js';

export const Config = {
    adsEnabled: false,
};

// --- Constants ---
var MIN_CELL = 32;
var START_COLS = 8;
var START_ROWS = 10;
var MAX_COLS = 14;
var MAX_ROWS = 16;
var START_FUSES = 3;
var START_ENERGY = 10;
var MIN_ENERGY = 4;
var ENERGY_SHRINK = 0.3;
var SURGE_EVERY = 5;
var SURGE_PAIRS = 3;
var COMBO_THRESHOLD = 3;
var MAX_COMBO = 5;
var BG_COLOR = '#0a0e14';
var BOARD_BG = '#0d1117';
var GRID_COLOR = '#1a2332';
var POWERED_COLOR = '#0d2818';
var HUD_HEIGHT = 60;

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading';
        this.score = 0;
        this.highScore = 0;
        this.lastTime = 0;

        // Game state
        this.board = new Board(START_COLS, START_ROWS);
        this.wire = new Wire();
        this.particles = new ParticleSystem();
        this.fuses = START_FUSES;
        this.energy = START_ENERGY;
        this.maxEnergy = START_ENERGY;
        this.energyDraining = false;
        this.level = 1;
        this.connections = 0;
        this.totalConnections = 0;
        this.combo = 1;
        this.cleanStreak = 0;
        this.isSurge = false;
        this.surgeTimer = 0;
        this.surgeMaxTime = 0;
        this.surgePairsLeft = 0;
        this.colorIdx = 0;
        this.activePair = null;
        this.flashTimer = 0;
        this.flashColor = '';
        this.gameTime = 0;
        this.drainWarningTimer = 0;
        this.menuPulse = 0;
        this.menuBoardTime = 0;
        this.titleGlow = 0;
        this._gameOverPending = false;

        // Layout
        this.cellSize = 0;
        this.boardOffsetX = 0;
        this.boardOffsetY = 0;

        // Dragging state
        this.dragging = false;
        this.lastDragR = -1;
        this.lastDragC = -1;

        // Touch/mouse tracking
        this._pointerDown = false;
        this._pointerX = 0;
        this._pointerY = 0;
        this._setupPointerEvents();

        // Ambient hum timer
        this._humTimer = 0;

        // Load high score
        try { var hs = localStorage.getItem('sparkgap_hi'); if (hs) this.highScore = parseInt(hs) || 0; } catch(e) {}

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);
    }

    _setupPointerEvents() {
        var self = this;
        var canvas = this.canvas;

        canvas.addEventListener('mousedown', function(e) {
            self._pointerDown = true;
            self._pointerX = e.clientX;
            self._pointerY = e.clientY;
            self._onPointerDown(e.clientX, e.clientY);
        });
        canvas.addEventListener('mousemove', function(e) {
            self._pointerX = e.clientX;
            self._pointerY = e.clientY;
            if (self._pointerDown) self._onPointerMove(e.clientX, e.clientY);
        });
        canvas.addEventListener('mouseup', function() {
            self._pointerDown = false;
            self._onPointerUp();
        });
        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            var t = e.touches[0];
            self._pointerDown = true;
            self._pointerX = t.clientX;
            self._pointerY = t.clientY;
            self._onPointerDown(t.clientX, t.clientY);
        }, { passive: false });
        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            var t = e.touches[0];
            self._pointerX = t.clientX;
            self._pointerY = t.clientY;
            if (self._pointerDown) self._onPointerMove(t.clientX, t.clientY);
        }, { passive: false });
        canvas.addEventListener('touchend', function() {
            self._pointerDown = false;
            self._onPointerUp();
        });
        canvas.addEventListener('touchcancel', function() {
            self._pointerDown = false;
            self._onPointerUp();
        });
    }

    _screenToGrid(px, py) {
        var c = Math.floor((px - this.boardOffsetX) / this.cellSize);
        var r = Math.floor((py - this.boardOffsetY) / this.cellSize);
        return { r: r, c: c };
    }

    _onPointerDown(px, py) {
        if (this.state === 'menu') {
            Synth.init();
            Synth.resume();
            Synth.menuClick();
            GameAudio.initContext();
            GameAudio.resume();
            this.start();
            return;
        }
        if (this.state === 'gameover') {
            Synth.menuClick();
            this.restart();
            return;
        }
        if (this.state !== 'playing') return;
        if (!this.activePair || this._gameOverPending) return;

        var g = this._screenToGrid(px, py);
        var pair = this.activePair;

        // Check if tapping on the source terminal to start drawing
        if (g.r === pair.src.r && g.c === pair.src.c) {
            this.wire.start(pair.src.r, pair.src.c, pair.tgt.r, pair.tgt.c, pair.colorIdx);
            this.dragging = true;
            this.lastDragR = g.r;
            this.lastDragC = g.c;
            Synth.wireStep(0);
            return;
        }

        // If wire is currently being drawn, tapping elsewhere cancels it
        if (this.wire.active) {
            Synth.wireErase();
            this.wire.cancel();
            this.dragging = false;
        }
    }

    _onPointerMove(px, py) {
        if (this.state !== 'playing') return;
        if (!this.dragging || !this.wire.active) return;

        var g = this._screenToGrid(px, py);
        if (g.r === this.lastDragR && g.c === this.lastDragC) return;

        var h = this.wire.head();
        if (!h) return;

        // Try to extend to the cell the pointer is in
        var result = this.wire.tryExtend(g.r, g.c, this.board);

        if (result === 'added') {
            Synth.wireStep(this.wire.length());
            this.lastDragR = g.r;
            this.lastDragC = g.c;
        } else if (result === 'backtrack') {
            Synth.wireErase();
            this.lastDragR = g.r;
            this.lastDragC = g.c;
        } else if (result === 'target') {
            this.lastDragR = g.r;
            this.lastDragC = g.c;
            this.dragging = false;
            this._onConnectionComplete();
        } else if (result === 'short') {
            this.lastDragR = g.r;
            this.lastDragC = g.c;
            this._onShortCircuit();
        }
    }

    _onPointerUp() {
        if (this.dragging) {
            this.dragging = false;
            if (this.wire.active) {
                this.wire.cancel();
            }
        }
    }

    _onConnectionComplete() {
        var pair = this.activePair;
        var pathLen = this.wire.length();

        // Commit wire to board
        this.board.commitWire(this.wire.path, pair.colorIdx);
        this.board.powerArea(this.wire.path, 1);

        // Score
        var surgeBonus = this.isSurge ? 2 : 1;
        var points = pathLen * 10 * this.combo * surgeBonus;
        this.score += points;

        // Visual feedback
        var cx = this.boardOffsetX + pair.tgt.c * this.cellSize + this.cellSize / 2;
        var cy = this.boardOffsetY + pair.tgt.r * this.cellSize + this.cellSize / 2;
        this.particles.sparkBurst(cx, cy, WIRE_COLORS[pair.colorIdx], 20);
        this.particles.wireTrail(this.wire.path, this.cellSize, this.boardOffsetX, this.boardOffsetY, WIRE_COLORS[pair.colorIdx]);
        this.particles.addFloatingText(cx, cy - 10, '+' + points, WIRE_COLORS[pair.colorIdx]);
        this.flashTimer = 0.15;
        this.flashColor = WIRE_COLORS[pair.colorIdx];
        Synth.connect(pathLen);

        // Combo tracking
        this.cleanStreak++;
        if (this.cleanStreak >= COMBO_THRESHOLD && this.combo < MAX_COMBO) {
            this.combo++;
            this.cleanStreak = 0;
            Synth.comboUp(this.combo);
            this.particles.addFloatingText(this.canvas.width / 2, this.canvas.height / 2 - 40, this.combo + 'x COMBO!', '#ffea00');
        }

        pair.completed = true;
        this.connections++;
        this.totalConnections++;
        this.energyDraining = false;

        // Handle surge
        if (this.isSurge) {
            this.surgePairsLeft--;
            if (this.surgePairsLeft <= 0) {
                this.isSurge = false;
                Synth.powerUp();
                this.particles.addFloatingText(this.canvas.width / 2, this.canvas.height / 2, 'SURGE CLEARED!', '#76ff03');
                this._nextPair();
                return;
            }
            this._activateNextSurgePair();
            return;
        }

        // Check if time for surge round
        if (this.connections >= SURGE_EVERY) {
            this.connections = 0;
            this._startSurge();
            return;
        }

        this._nextPair();
    }

    _onShortCircuit() {
        var h = this.wire.head();
        var cx = this.boardOffsetX + h.c * this.cellSize + this.cellSize / 2;
        var cy = this.boardOffsetY + h.r * this.cellSize + this.cellSize / 2;
        this.particles.shortCircuit(cx, cy);
        Synth.short();

        this.fuses--;
        this.cleanStreak = 0;
        if (this.combo > 1) this.combo = Math.max(1, this.combo - 1);
        this.wire.cancel();
        this.dragging = false;

        if (this.fuses <= 0) {
            Synth.fuseBlow();
            this.particles.fuseBlow(cx, cy);
            this._doGameOver();
        } else {
            Synth.fuseBlow();
            this.flashTimer = 0.3;
            this.flashColor = '#ff3d00';
        }
    }

    _nextPair() {
        this.activePair = null;
        this.colorIdx++;

        // Level progression
        if (this.totalConnections > 0 && this.totalConnections % 8 === 0) {
            this.level++;
            this._adjustDifficulty();
        }

        var pair = this.board.addTerminalPair(this.colorIdx);
        if (!pair) {
            this._resetBoard();
            pair = this.board.addTerminalPair(this.colorIdx);
        }
        if (pair) {
            pair.active = true;
            this.activePair = pair;
            this.energy = this.maxEnergy;
            this.energyDraining = true;
            this.drainWarningTimer = 0;
        }
    }

    _startSurge() {
        this.isSurge = true;
        this.surgePairsLeft = Math.min(SURGE_PAIRS, SURGE_PAIRS + Math.floor(this.level / 3));
        this.surgeMaxTime = this.maxEnergy * 1.5;
        this.surgeTimer = this.surgeMaxTime;
        this.energy = this.surgeMaxTime;
        this.maxEnergy = this.surgeMaxTime;
        Synth.surgeStart();
        this.particles.addFloatingText(this.canvas.width / 2, this.canvas.height / 2 - 60, 'SURGE ROUND!', '#ff3d00');
        this.flashTimer = 0.4;
        this.flashColor = '#ff3d00';

        for (var i = 0; i < this.surgePairsLeft; i++) {
            this.colorIdx++;
            this.board.addTerminalPair(this.colorIdx);
        }
        this._activateNextSurgePair();
    }

    _activateNextSurgePair() {
        this.activePair = null;
        for (var i = 0; i < this.board.terminalPairs.length; i++) {
            var p = this.board.terminalPairs[i];
            if (!p.completed && !p.active) {
                p.active = true;
                this.activePair = p;
                this.energyDraining = true;
                return;
            }
        }
        for (var i = 0; i < this.board.terminalPairs.length; i++) {
            var p = this.board.terminalPairs[i];
            if (!p.completed) {
                this.activePair = p;
                this.energyDraining = true;
                return;
            }
        }
    }

    _adjustDifficulty() {
        var newCols = Math.min(MAX_COLS, START_COLS + Math.floor(this.level / 2));
        var newRows = Math.min(MAX_ROWS, START_ROWS + Math.floor(this.level / 3));
        var fitted = this._fitGrid(newCols, newRows);
        newCols = fitted.cols;
        newRows = fitted.rows;
        this.maxEnergy = Math.max(MIN_ENERGY, START_ENERGY - this.level * ENERGY_SHRINK);
        this.board.resize(newCols, newRows);
        this._computeLayout();
        var obsCount = Math.floor(newCols * newRows * (0.08 + this.level * 0.02));
        obsCount = Math.min(obsCount, Math.floor(newCols * newRows * 0.3));
        this.board.generateObstacles(obsCount);
    }

    _resetBoard() {
        var obsCount = Math.floor(this.board.cols * this.board.rows * (0.08 + this.level * 0.02));
        obsCount = Math.min(obsCount, Math.floor(this.board.cols * this.board.rows * 0.3));
        this.board.clear();
        this.board.generateObstacles(obsCount);
    }

    _fitGrid(cols, rows) {
        var availW = this.canvas.width - 20;
        var availH = this.canvas.height - HUD_HEIGHT - 20;
        var maxCols = Math.floor(availW / MIN_CELL);
        var maxRows = Math.floor(availH / MIN_CELL);
        return { cols: Math.min(cols, maxCols), rows: Math.min(rows, maxRows) };
    }

    _computeLayout() {
        var availW = this.canvas.width - 20;
        var availH = this.canvas.height - HUD_HEIGHT - 20;
        var cellW = availW / this.board.cols;
        var cellH = availH / this.board.rows;
        this.cellSize = Math.floor(Math.min(cellW, cellH));
        if (this.cellSize < MIN_CELL) this.cellSize = MIN_CELL;
        var boardW = this.board.cols * this.cellSize;
        var boardH = this.board.rows * this.cellSize;
        this.boardOffsetX = Math.floor((this.canvas.width - boardW) / 2);
        this.boardOffsetY = Math.floor(HUD_HEIGHT + (this.canvas.height - HUD_HEIGHT - boardH) / 2);
    }

    _doGameOver() {
        this.energyDraining = false;
        this.wire.cancel();
        this.dragging = false;
        this._gameOverPending = true;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem('sparkgap_hi', String(this.highScore)); } catch(e) {}
        }
        Synth.gameOverSound();
        this.particles.shake(3);
        var self = this;
        setTimeout(function() {
            self._gameOverPending = false;
            self.gameOver();
        }, 600);
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    async init() {
        await Poki.init();
        this._resize();
        await this.loadAssets();
        Poki.gameLoadingFinished();
        this.state = 'menu';
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);
    }

    async loadAssets() { }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.board) this._computeLayout();
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
        this.fuses = START_FUSES;
        this.level = 1;
        this.connections = 0;
        this.totalConnections = 0;
        this.combo = 1;
        this.cleanStreak = 0;
        this.isSurge = false;
        this.colorIdx = 0;
        this.gameTime = 0;
        this.maxEnergy = START_ENERGY;
        this.dragging = false;
        this._gameOverPending = false;
        this.wire.cancel();

        var fitted = this._fitGrid(START_COLS, START_ROWS);
        this.board.resize(fitted.cols, fitted.rows);
        this._computeLayout();

        var obsCount = Math.floor(this.board.cols * this.board.rows * 0.06);
        this.board.generateObstacles(obsCount);
        this._nextPair();

        Synth.init();
        Synth.resume();
        GameAudio.initContext();
        GameAudio.resume();
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { GameAudio.muteAll(); Synth.mute(); },
                function() { GameAudio.unmuteAll(); Synth.unmute(); }
            );
        }
        this.start();
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    update(dt) {
        this.particles.update(dt);
        this.menuPulse += dt;

        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space');

        if (this.state === 'menu') {
            this.menuBoardTime += dt;
            this.titleGlow += dt;
            if (confirm) {
                Synth.init();
                Synth.resume();
                Synth.menuClick();
                GameAudio.initContext();
                GameAudio.resume();
                this.start();
            }
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            if (confirm) {
                Synth.menuClick();
                this.restart();
            }
        }
    }

    updatePlaying(dt) {
        this.gameTime += dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Ambient hum
        this._humTimer -= dt;
        if (this._humTimer <= 0) {
            Synth.ambientHum();
            this._humTimer = 2 + Math.random() * 3;
        }

        // Energy drain
        if (this.energyDraining && this.activePair && !this._gameOverPending) {
            this.energy -= dt;

            if (this.energy < 3 && this.energy > 0) {
                this.drainWarningTimer -= dt;
                if (this.drainWarningTimer <= 0) {
                    Synth.drainWarning();
                    this.drainWarningTimer = 0.4;
                }
            }

            if (this.energy <= 0) {
                this.energy = 0;
                this.energyDraining = false;
                Synth.energyDead();
                this.wire.cancel();
                this.dragging = false;

                this.fuses--;
                this.cleanStreak = 0;
                this.flashTimer = 0.3;
                this.flashColor = '#ff3d00';
                this.particles.shake(this.isSurge ? 2 : 1.5);

                if (this.isSurge) this.isSurge = false;

                if (this.fuses <= 0) {
                    this._doGameOver();
                    return;
                }
                this._nextPair();
            }
        }

        // Spark ambient particles on active terminals
        if (this.activePair && !this.activePair.completed) {
            var pair = this.activePair;
            var sx = this.boardOffsetX + pair.src.c * this.cellSize + this.cellSize / 2;
            var sy = this.boardOffsetY + pair.src.r * this.cellSize + this.cellSize / 2;
            var tx = this.boardOffsetX + pair.tgt.c * this.cellSize + this.cellSize / 2;
            var ty = this.boardOffsetY + pair.tgt.r * this.cellSize + this.cellSize / 2;
            var col = WIRE_COLORS[pair.colorIdx];
            this.particles.terminalSpark(sx, sy, col);
            this.particles.terminalSpark(tx, ty, col);
        }
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        var ctx = this.ctx;
        ctx.save();
        if (this.particles.screenShake > 0) {
            ctx.translate(this.particles.shakeX, this.particles.shakeY);
        }

        if (this.state === 'loading') this.renderLoading();
        else if (this.state === 'menu') this.renderMenu();
        else if (this.state === 'playing') this.renderPlaying();
        else if (this.state === 'gameover') this.renderGameOver();

        ctx.restore();
    }

    renderLoading() {
        var ctx = this.ctx;
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#00e5ff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CHARGING...', this.canvas.width / 2, this.canvas.height / 2);
    }

    renderMenu() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);
        this._renderMenuTraces(ctx, w, h);

        // Title with glow
        ctx.save();
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 20 + 10 * Math.sin(this.titleGlow * 4);
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold ' + Math.min(64, w * 0.12) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SPARK GAP', w / 2, h * 0.35);
        ctx.restore();

        ctx.fillStyle = '#4a6a7a';
        ctx.font = Math.min(16, w * 0.035) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ROUTE THE CURRENT. AVOID THE SHORTS.', w / 2, h * 0.42);

        var pulseAlpha = 0.5 + 0.5 * Math.sin(this.menuPulse * 4);
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold ' + Math.min(22, w * 0.04) + 'px monospace';
        ctx.fillText('TAP TO START', w / 2, h * 0.58);
        ctx.globalAlpha = 1;

        if (this.highScore > 0) {
            ctx.fillStyle = '#4a6a7a';
            ctx.font = Math.min(14, w * 0.03) + 'px monospace';
            ctx.fillText('BEST: ' + this.highScore, w / 2, h * 0.66);
        }
    }

    _renderMenuTraces(ctx, w, h) {
        ctx.strokeStyle = '#0d2030';
        ctx.lineWidth = 2;
        var t = this.menuBoardTime;

        for (var i = 0; i < 12; i++) {
            var y = (h * 0.1) + (h * 0.8 / 12) * i;
            var x1 = Math.sin(t * 0.3 + i) * w * 0.1;
            var x2 = w - Math.cos(t * 0.2 + i * 0.5) * w * 0.1;
            ctx.beginPath();
            ctx.moveTo(x1, y);
            var midX = w * 0.3 + Math.sin(t * 0.5 + i * 0.7) * w * 0.1;
            ctx.lineTo(midX, y);
            ctx.lineTo(midX + 10, y + 10);
            ctx.lineTo(x2, y + 10);
            ctx.stroke();
        }

        for (var i = 0; i < 8; i++) {
            var nx = w * 0.15 + (w * 0.7) * Math.sin(t * 0.1 + i * 1.2) * 0.5 + w * 0.35;
            var ny = h * 0.15 + (h * 0.7) * Math.cos(t * 0.15 + i * 0.9) * 0.5 + h * 0.35;
            var glow = 0.1 + 0.1 * Math.sin(t * 2 + i);
            ctx.beginPath();
            ctx.arc(nx, ny, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 229, 255, ' + glow + ')';
            ctx.fill();
        }
    }

    renderPlaying() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);

        // Flash overlay
        if (this.flashTimer > 0) {
            ctx.globalAlpha = this.flashTimer * 0.3;
            ctx.fillStyle = this.flashColor;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }

        // Board background
        var bw = this.board.cols * this.cellSize;
        var bh = this.board.rows * this.cellSize;
        ctx.fillStyle = BOARD_BG;
        ctx.fillRect(this.boardOffsetX, this.boardOffsetY, bw, bh);

        this._renderGrid(ctx);
        this._renderPowered(ctx);
        this._renderObstacles(ctx);
        this._renderCompletedWires(ctx);

        if (this.wire.active || this.wire.path.length > 0) {
            this._renderActiveWire(ctx);
        }

        this._renderTerminals(ctx);
        this.particles.render(ctx);
        this.particles.renderText(ctx);
        this._renderHUD(ctx, w);
    }

    _renderGrid(ctx) {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        var ox = this.boardOffsetX;
        var oy = this.boardOffsetY;
        var cs = this.cellSize;

        for (var r = 0; r <= this.board.rows; r++) {
            ctx.beginPath();
            ctx.moveTo(ox, oy + r * cs);
            ctx.lineTo(ox + this.board.cols * cs, oy + r * cs);
            ctx.stroke();
        }
        for (var c = 0; c <= this.board.cols; c++) {
            ctx.beginPath();
            ctx.moveTo(ox + c * cs, oy);
            ctx.lineTo(ox + c * cs, oy + this.board.rows * cs);
            ctx.stroke();
        }
    }

    _renderPowered(ctx) {
        var ox = this.boardOffsetX;
        var oy = this.boardOffsetY;
        var cs = this.cellSize;
        for (var r = 0; r < this.board.rows; r++) {
            for (var c = 0; c < this.board.cols; c++) {
                if (this.board.powered[r][c]) {
                    ctx.fillStyle = POWERED_COLOR;
                    ctx.fillRect(ox + c * cs + 1, oy + r * cs + 1, cs - 2, cs - 2);
                }
            }
        }
    }

    _renderObstacles(ctx) {
        var ox = this.boardOffsetX;
        var oy = this.boardOffsetY;
        var cs = this.cellSize;
        var pad = cs * 0.15;

        for (var r = 0; r < this.board.rows; r++) {
            for (var c = 0; c < this.board.cols; c++) {
                if (this.board.cells[r][c] !== CELL_OBSTACLE) continue;
                var x = ox + c * cs + pad;
                var y = oy + r * cs + pad;
                var s = cs - pad * 2;
                var sub = this.board.obsType[r][c];

                if (sub === OBS_CAPACITOR) {
                    ctx.fillStyle = '#2a3a4a';
                    ctx.fillRect(x, y, s, s);
                    ctx.fillStyle = '#4a6a8a';
                    ctx.fillRect(x + s * 0.25, y + s * 0.1, s * 0.15, s * 0.8);
                    ctx.fillRect(x + s * 0.6, y + s * 0.1, s * 0.15, s * 0.8);
                } else if (sub === OBS_RESISTOR) {
                    ctx.fillStyle = '#3a2a1a';
                    ctx.fillRect(x, y + s * 0.25, s, s * 0.5);
                    ctx.fillStyle = '#6a4a2a';
                    ctx.fillRect(x + s * 0.2, y + s * 0.25, s * 0.15, s * 0.5);
                    ctx.fillStyle = '#8a6a3a';
                    ctx.fillRect(x + s * 0.5, y + s * 0.25, s * 0.15, s * 0.5);
                    ctx.fillStyle = '#aa8a5a';
                    ctx.fillRect(x + s * 0.75, y + s * 0.25, s * 0.1, s * 0.5);
                } else if (sub === OBS_CHIP) {
                    ctx.fillStyle = '#1a1a2a';
                    ctx.fillRect(x, y, s, s);
                    ctx.fillStyle = '#3a3a5a';
                    for (var p = 0; p < 3; p++) {
                        var py = y + s * 0.2 + p * s * 0.25;
                        ctx.fillRect(x - 2, py, 4, s * 0.1);
                        ctx.fillRect(x + s - 2, py, 4, s * 0.1);
                    }
                    ctx.beginPath();
                    ctx.arc(x + s * 0.25, y + s * 0.25, 2, 0, Math.PI * 2);
                    ctx.fillStyle = '#5a5a8a';
                    ctx.fill();
                } else {
                    ctx.fillStyle = '#2a2a3a';
                    ctx.fillRect(x, y, s, s);
                    ctx.fillStyle = '#5a3a5a';
                    ctx.beginPath();
                    ctx.moveTo(x + s * 0.2, y + s * 0.2);
                    ctx.lineTo(x + s * 0.8, y + s * 0.5);
                    ctx.lineTo(x + s * 0.2, y + s * 0.8);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillRect(x + s * 0.75, y + s * 0.2, s * 0.08, s * 0.6);
                }
            }
        }
    }

    _renderCompletedWires(ctx) {
        var ox = this.boardOffsetX;
        var oy = this.boardOffsetY;
        var cs = this.cellSize;

        for (var w = 0; w < this.board.completedWires.length; w++) {
            var wire = this.board.completedWires[w];
            var color = WIRE_COLORS[wire.colorIdx];
            var path = wire.path;
            if (path.length < 2) continue;

            ctx.strokeStyle = color;
            ctx.lineWidth = cs * 0.3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(ox + path[0].c * cs + cs / 2, oy + path[0].r * cs + cs / 2);
            for (var i = 1; i < path.length; i++) {
                ctx.lineTo(ox + path[i].c * cs + cs / 2, oy + path[i].r * cs + cs / 2);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.fillStyle = color;
            for (var i = 0; i < path.length; i++) {
                ctx.beginPath();
                ctx.arc(ox + path[i].c * cs + cs / 2, oy + path[i].r * cs + cs / 2, cs * 0.1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _renderActiveWire(ctx) {
        var ox = this.boardOffsetX;
        var oy = this.boardOffsetY;
        var cs = this.cellSize;
        var path = this.wire.path;
        var color = this.wire.color();
        if (path.length < 1) return;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = cs * 0.35;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(ox + path[0].c * cs + cs / 2, oy + path[0].r * cs + cs / 2);
        for (var i = 1; i < path.length; i++) {
            ctx.lineTo(ox + path[i].c * cs + cs / 2, oy + path[i].r * cs + cs / 2);
        }
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#fff';
        for (var i = 0; i < path.length; i++) {
            ctx.beginPath();
            ctx.arc(ox + path[i].c * cs + cs / 2, oy + path[i].r * cs + cs / 2, cs * 0.12, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _renderTerminals(ctx) {
        var ox = this.boardOffsetX;
        var oy = this.boardOffsetY;
        var cs = this.cellSize;
        var t = this.gameTime;

        for (var i = 0; i < this.board.terminalPairs.length; i++) {
            var pair = this.board.terminalPairs[i];
            if (pair.completed) continue;
            var color = WIRE_COLORS[pair.colorIdx];
            var isActive = pair === this.activePair;

            this._renderTerminalDot(ctx, ox, oy, cs, pair.src.r, pair.src.c, color, isActive, true, t);
            this._renderTerminalDot(ctx, ox, oy, cs, pair.tgt.r, pair.tgt.c, color, isActive, false, t);
        }
    }

    _renderTerminalDot(ctx, ox, oy, cs, r, c, color, isActive, isSource, t) {
        var cx = ox + c * cs + cs / 2;
        var cy = oy + r * cs + cs / 2;
        var baseR = cs * 0.32;

        if (isActive) {
            var pulse = 0.5 + 0.5 * Math.sin(t * 6);
            var glowR = baseR + pulse * cs * 0.15;
            ctx.beginPath();
            ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.15 + pulse * 0.1;
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.beginPath();
            ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = isActive ? 1 : 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Source: + symbol, Target: ring
        if (isSource) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - baseR * 0.35, cy);
            ctx.lineTo(cx + baseR * 0.35, cy);
            ctx.moveTo(cx, cy - baseR * 0.35);
            ctx.lineTo(cx, cy + baseR * 0.35);
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, baseR * 0.35, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Pulsing hint on source when not drawing
        if (isActive && isSource && !this.wire.active && !this.dragging) {
            var arrowPulse = 0.5 + 0.5 * Math.sin(t * 5);
            ctx.globalAlpha = 0.3 + arrowPulse * 0.4;
            ctx.fillStyle = color;
            ctx.font = 'bold ' + Math.floor(cs * 0.4) + 'px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('DRAG', cx, cy - cs * 0.8);
            ctx.globalAlpha = 1;
        }
    }

    _renderHUD(ctx, w) {
        var hudY = 5;

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(String(Math.floor(this.score)), 10, hudY);

        // Level
        ctx.fillStyle = '#4a6a7a';
        ctx.font = '12px monospace';
        ctx.fillText('LVL ' + this.level, 10, hudY + 22);

        // Fuses (right side)
        ctx.textAlign = 'right';
        for (var i = 0; i < START_FUSES; i++) {
            var on = i < this.fuses;
            ctx.fillStyle = on ? '#ff3d00' : '#2a1a1a';
            ctx.font = 'bold 18px monospace';
            var fx = w - 10 - i * 22;
            ctx.fillText('F', fx, hudY);
            if (on) {
                ctx.save();
                ctx.shadowColor = '#ff3d00';
                ctx.shadowBlur = 6;
                ctx.fillText('F', fx, hudY);
                ctx.restore();
            }
        }

        // Combo (center)
        if (this.combo > 1) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffea00';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(this.combo + 'x', w / 2, hudY);
        }

        // Surge indicator
        if (this.isSurge) {
            ctx.textAlign = 'center';
            var surgeFlash = Math.sin(this.gameTime * 8) > 0;
            ctx.fillStyle = surgeFlash ? '#ff3d00' : '#ff6d00';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('SURGE', w / 2, hudY + 20);
        }

        // Energy bar
        if (this.energyDraining && this.activePair) {
            var barW = Math.min(200, w * 0.4);
            var barH = 8;
            var barX = (w - barW) / 2;
            var barY = hudY + 38;
            var fill = Math.max(0, this.energy / this.maxEnergy);

            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(barX, barY, barW, barH);

            var barColor;
            if (fill > 0.5) barColor = '#00e5ff';
            else if (fill > 0.25) barColor = '#ffea00';
            else barColor = '#ff3d00';

            ctx.fillStyle = barColor;
            ctx.fillRect(barX, barY, barW * fill, barH);

            ctx.strokeStyle = '#3a4a5a';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);

            if (fill < 0.25) {
                ctx.save();
                ctx.shadowColor = '#ff3d00';
                ctx.shadowBlur = 8;
                ctx.fillStyle = barColor;
                ctx.fillRect(barX, barY, barW * fill, barH);
                ctx.restore();
            }
        }

        ctx.textBaseline = 'alphabetic';
    }

    renderGameOver() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);

        // Dimmed board state
        ctx.globalAlpha = 0.2;
        this._renderBoardState(ctx);
        ctx.globalAlpha = 1;

        this.particles.render(ctx);
        this.particles.renderText(ctx);

        ctx.save();
        ctx.shadowColor = '#ff3d00';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff3d00';
        ctx.font = 'bold ' + Math.min(52, w * 0.1) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', w / 2, h * 0.35);
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.min(28, w * 0.06) + 'px monospace';
        ctx.fillText(String(Math.floor(this.score)), w / 2, h * 0.47);

        ctx.fillStyle = '#4a6a7a';
        ctx.font = Math.min(16, w * 0.035) + 'px monospace';
        ctx.fillText('BEST: ' + this.highScore, w / 2, h * 0.54);

        ctx.fillStyle = '#3a5a6a';
        ctx.font = Math.min(13, w * 0.03) + 'px monospace';
        ctx.fillText('CONNECTIONS: ' + this.totalConnections + '  |  LEVEL: ' + this.level, w / 2, h * 0.60);

        var pulseAlpha = 0.5 + 0.5 * Math.sin(this.menuPulse * 4);
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold ' + Math.min(20, w * 0.04) + 'px monospace';
        ctx.fillText('TAP TO RETRY', w / 2, h * 0.72);
        ctx.globalAlpha = 1;
    }

    _renderBoardState(ctx) {
        var ox = this.boardOffsetX;
        var oy = this.boardOffsetY;
        var cs = this.cellSize;
        var bw = this.board.cols * cs;
        var bh = this.board.rows * cs;

        ctx.fillStyle = BOARD_BG;
        ctx.fillRect(ox, oy, bw, bh);

        for (var r = 0; r < this.board.rows; r++) {
            for (var c = 0; c < this.board.cols; c++) {
                if (this.board.powered[r][c]) {
                    ctx.fillStyle = POWERED_COLOR;
                    ctx.fillRect(ox + c * cs + 1, oy + r * cs + 1, cs - 2, cs - 2);
                }
            }
        }

        for (var w = 0; w < this.board.completedWires.length; w++) {
            var wire = this.board.completedWires[w];
            var color = WIRE_COLORS[wire.colorIdx];
            var path = wire.path;
            if (path.length < 2) continue;
            ctx.strokeStyle = color;
            ctx.lineWidth = cs * 0.3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(ox + path[0].c * cs + cs / 2, oy + path[0].r * cs + cs / 2);
            for (var i = 1; i < path.length; i++) {
                ctx.lineTo(ox + path[i].c * cs + cs / 2, oy + path[i].r * cs + cs / 2);
            }
            ctx.stroke();
        }
    }
}
