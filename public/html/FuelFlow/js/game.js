// game.js — Game state machine, coordinates all systems
import {
    STATE, LOGICAL_W, LOGICAL_H, GRID_X, GRID_Y, GRID_W, GRID_H,
    CELL_SIZE, GRID_COLS, GRID_ROWS, SCROLL_DURATION,
} from './constants.js';
import { Grid } from './grid.js';
import { generateAllLevels } from './generator.js';
import {
    drawBackground, drawGrid, drawObstacles, drawPieces,
    drawInletOutlet, drawTrough, drawDragPiece,
    drawCenteredText, drawOverlay,
} from './renderer.js';
import { Trough } from './trough.js';
import { Panel } from './panel.js';
import { Input } from './input.js';
import { Valve } from './valve.js';
import { FuelFlow } from './fuel.js';
import { easeOutCubic } from './utils.js';

export class Game {
    constructor() {
        this.state = STATE.INIT;
        this.levels = [];
        this.currentLevel = 0;
        this.grid = new Grid();
        this.trough = new Trough();
        this.panel = new Panel();
        this.input = new Input(this);
        this.valve = new Valve();
        this.fuel = new FuelFlow();

        this.inletRow = 0;
        this.outletRow = 0;

        // Scroll animation
        this.scrolling = false;
        this.scrollProgress = 0;
        this.scrollFrom = 0;
        this.scrollTo = 0;

        // Level complete delay
        this.levelCompleteTimer = 0;

        // Leak fail overlay
        this.leakFailTimer = 0;
    }

    init() {
        this.levels = generateAllLevels();
        this.currentLevel = 0;
        this.state = STATE.PANEL_SCREWS;
        this.setupLevel(0);
    }

    setupLevel(idx) {
        const level = this.levels[idx];
        this.grid = level.grid;
        this.inletRow = level.inletRow;
        this.outletRow = level.outletRow;

        // Store original piece counts for restart
        this.originalPieceCounts = { ...level.pieceCounts };
        this.trough.init({ ...level.pieceCounts });

        this.panel.reset();
        this.valve.reset(this.inletRow);
        this.fuel.reset();
    }

    // --- State transitions ---
    setState(newState) {
        this.state = newState;
    }

    // --- Pointer events (called from main.js) ---
    onPointerDown(x, y) {
        switch (this.state) {
            case STATE.PANEL_SCREWS:
                this.panel.onTap(x, y);
                break;

            case STATE.PUZZLE:
                // Check valve first
                if (this.valve.onPointerDown(x, y)) return;
                // Then drag/drop
                this.input.onPointerDown(x, y);
                break;

            case STATE.FUEL_FLOWING:
                // No interaction during flow
                break;

            case STATE.LEAK_FAIL:
                this.restartLevel();
                break;

            case STATE.LEVEL_COMPLETE:
                // Wait for auto-scroll
                break;

            case STATE.WIN:
                this.newGame();
                break;
        }
    }

    onPointerMove(x, y) {
        switch (this.state) {
            case STATE.PUZZLE:
                if (this.valve.turning) {
                    this.valve.onPointerMove(x, y);
                    if (this.valve.completed) {
                        this.startFuelFlow();
                    }
                    return;
                }
                this.input.onPointerMove(x, y);
                break;
        }
    }

    onPointerUp(x, y) {
        switch (this.state) {
            case STATE.PUZZLE:
                if (this.valve.turning) {
                    this.valve.onPointerUp();
                    return;
                }
                this.input.onPointerUp(x, y);
                break;
        }
    }

    // --- Actions ---
    startFuelFlow() {
        this.setState(STATE.FUEL_FLOWING);
        this.valve.locked = true;
        this.fuel.start(this.grid, this.inletRow, this.outletRow);
    }

    restartLevel() {
        // Same puzzle, return all pieces to trough
        this.grid.clearPieces();
        this.trough.restoreAll({ ...this.originalPieceCounts });
        this.valve.reset(this.inletRow);
        this.fuel.reset();
        this.leakFailTimer = 0;
        this.setState(STATE.PUZZLE);
    }

    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel >= 3) {
            this.setState(STATE.WIN);
        } else {
            this.setupLevel(this.currentLevel);
            this.setState(STATE.PANEL_SCREWS);
        }
    }

    newGame() {
        this.levels = generateAllLevels();
        this.currentLevel = 0;
        this.setupLevel(0);
        this.setState(STATE.PANEL_SCREWS);
    }

    // --- Update ---
    update(dt) {
        switch (this.state) {
            case STATE.PANEL_SCREWS: {
                const result = this.panel.update(dt);
                if (result === 'panel_fallen') {
                    this.setState(STATE.PUZZLE);
                }
                break;
            }

            case STATE.PANEL_FALL: {
                const result = this.panel.update(dt);
                if (result === 'panel_fallen') {
                    this.setState(STATE.PUZZLE);
                }
                break;
            }

            case STATE.PUZZLE:
                this.valve.update(dt);
                break;

            case STATE.FUEL_FLOWING: {
                const result = this.fuel.update(dt, this.grid);
                if (result === 'leak_fail') {
                    this.setState(STATE.LEAK_FAIL);
                    this.leakFailTimer = 0;
                } else if (result === 'success') {
                    this.setState(STATE.LEVEL_COMPLETE);
                    this.levelCompleteTimer = 0;
                }
                break;
            }

            case STATE.LEAK_FAIL:
                this.leakFailTimer += dt;
                this.fuel.time += dt; // keep leak animation going
                break;

            case STATE.LEVEL_COMPLETE:
                this.levelCompleteTimer += dt;
                if (this.levelCompleteTimer > 2.0) {
                    this.nextLevel();
                }
                break;

            case STATE.INIT:
                break;
        }

        // Scroll animation
        if (this.scrolling) {
            this.scrollProgress += dt / SCROLL_DURATION;
            if (this.scrollProgress >= 1) {
                this.scrollProgress = 1;
                this.scrolling = false;
            }
        }
    }

    // --- Render ---
    render(ctx) {
        // Clear
        ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
        drawBackground(ctx);

        switch (this.state) {
            case STATE.PANEL_SCREWS:
            case STATE.PANEL_FALL:
                this.renderPanelState(ctx);
                break;

            case STATE.PUZZLE:
            case STATE.FUEL_FLOWING:
            case STATE.LEAK_FAIL:
                this.renderPuzzleState(ctx);
                break;

            case STATE.LEVEL_COMPLETE:
                this.renderPuzzleState(ctx);
                this.renderLevelComplete(ctx);
                break;

            case STATE.WIN:
                this.renderWin(ctx);
                break;
        }
    }

    renderPanelState(ctx) {
        // Show the grid behind the panel (partially visible as panel falls)
        drawGrid(ctx);
        drawObstacles(ctx, this.grid);
        drawInletOutlet(ctx, this.inletRow, this.outletRow);

        // Panel on top
        this.panel.render(ctx);
    }

    renderPuzzleState(ctx) {
        // Grid
        drawGrid(ctx);
        drawObstacles(ctx, this.grid);
        drawPieces(ctx, this.grid);
        drawInletOutlet(ctx, this.inletRow, this.outletRow);

        // Valve
        this.valve.render(ctx);

        // Fuel
        if (this.state === STATE.FUEL_FLOWING || this.state === STATE.LEAK_FAIL) {
            this.fuel.render(ctx, this.grid);
        }

        // Trough
        drawTrough(ctx, this.trough);

        // Drag piece
        const dragState = this.input.getDragState();
        if (dragState) {
            // Snap highlight
            if (dragState.snapped) {
                const sx = GRID_X + this.input.snapCol * CELL_SIZE;
                const sy = GRID_Y + this.input.snapRow * CELL_SIZE;
                ctx.strokeStyle = '#e6a817';
                ctx.lineWidth = 3;
                ctx.strokeRect(sx, sy, CELL_SIZE, CELL_SIZE);
            }
            drawDragPiece(ctx, dragState.piece, dragState.x, dragState.y);
        }

        // Valve hint
        if (this.state === STATE.PUZZLE && !this.valve.locked && !this.valve.completed) {
            ctx.fillStyle = '#8899aa';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Turn valve to start fuel flow',
                this.valve.x, this.valve.y + CELL_SIZE);
        }

        // Leak fail overlay
        if (this.state === STATE.LEAK_FAIL) {
            drawOverlay(ctx, 0.4);

            const pulse = 0.8 + 0.2 * Math.sin(this.leakFailTimer * 5);
            const title = this.fuel.deadEnd ? 'FUEL BLOCKED' : 'FIRE HAZARD';
            const color = this.fuel.deadEnd ? 'rgba(255, 160, 20,' : 'rgba(255, 50, 20,';
            ctx.fillStyle = `${color}${pulse})`;
            ctx.font = 'bold 64px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, LOGICAL_W / 2, LOGICAL_H / 2 - 30);

            ctx.fillStyle = '#ffffff';
            ctx.font = '28px sans-serif';
            ctx.fillText('Tap to retry', LOGICAL_W / 2, LOGICAL_H / 2 + 30);
        }
    }

    renderLevelComplete(ctx) {
        drawOverlay(ctx, 0.3);
        const bounce = Math.min(this.levelCompleteTimer * 3, 1);
        const scale = 0.5 + 0.5 * easeOutCubic(bounce);

        ctx.save();
        ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#44cc44';
        ctx.font = 'bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL COMPLETE!', 0, 0);

        ctx.restore();
    }

    renderWin(ctx) {
        drawOverlay(ctx, 0.6);

        ctx.fillStyle = '#e6a817';
        ctx.font = 'bold 72px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FUEL SYSTEM REPAIRED', LOGICAL_W / 2, LOGICAL_H / 2 - 40);

        ctx.fillStyle = '#ccddee';
        ctx.font = '28px sans-serif';
        ctx.fillText('Tap to play again', LOGICAL_W / 2, LOGICAL_H / 2 + 30);
    }
}
