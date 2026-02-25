// fuel.js — Fuel flow simulation, leak detection, animation
import {
    GRID_X, GRID_Y, GRID_ROWS, GRID_COLS, CELL_SIZE,
    TOP, RIGHT, BOTTOM, LEFT, OPPOSITE, DIR_DELTA,
    FUEL_COLOR, FUEL_FILL_SPEED, LEAK_TIMEOUT,
    PIPE_WIDTH, INLET_PIPE_LEN, OUTLET_PIPE_LEN, GRID_W,
    LOGICAL_W, LOGICAL_H,
} from './constants.js';
import { PIECE_TYPES, hasOpening, getExits } from './pieces.js';

export class FuelFlow {
    constructor() {
        this.active = false;
        this.cellStates = {};     // "r,c" -> { fillFractions: {dir: frac}, filled: bool }
        this.flowFront = [];      // queue of { r, c, entryDir, progress }
        this.leaks = [];          // { r, c, dir, timer }
        this.leakFailed = false;
        this.leakTimer = 0;
        this.reachedOutlet = false;
        this.deadEnd = false;
        this.inletRow = 0;
        this.outletRow = 0;
        this.inletFill = 0;
        this.outletFill = 0;
        this.time = 0;
    }

    reset() {
        this.active = false;
        this.cellStates = {};
        this.flowFront = [];
        this.leaks = [];
        this.leakFailed = false;
        this.leakTimer = 0;
        this.reachedOutlet = false;
        this.inletFill = 0;
        this.outletFill = 0;
        this.time = 0;
    }

    /**
     * Start fuel flow from the inlet.
     */
    start(grid, inletRow, outletRow) {
        this.reset();
        this.active = true;
        this.inletRow = inletRow;
        this.outletRow = outletRow;

        // Start filling inlet pipe, then enter grid
        this.flowFront.push({
            r: inletRow,
            c: -1, // inlet pipe (before grid)
            entryDir: LEFT,
            progress: 0,
            phase: 'inlet',
        });
    }

    update(dt, grid) {
        if (!this.active) return null;

        this.time += dt;

        // Process flow front
        const newFront = [];
        const toExpand = [];

        for (const front of this.flowFront) {
            front.progress += FUEL_FILL_SPEED * dt;

            if (front.phase === 'inlet') {
                // Filling the inlet pipe
                this.inletFill = Math.min(front.progress, 1);
                if (front.progress >= 1) {
                    // Enter the grid
                    toExpand.push({
                        r: this.inletRow,
                        c: 0,
                        entryDir: LEFT,
                        progress: 0,
                        phase: 'grid',
                    });
                } else {
                    newFront.push(front);
                }
            } else if (front.phase === 'outlet') {
                this.outletFill = Math.min(front.progress, 1);
                if (front.progress >= 1) {
                    this.reachedOutlet = true;
                } else {
                    newFront.push(front);
                }
            } else {
                // Grid cell
                const key = `${front.r},${front.c}`;
                let state = this.cellStates[key];
                if (!state) {
                    state = { fillFractions: {}, filled: false };
                    this.cellStates[key] = state;
                }

                // Fill entry direction
                state.fillFractions[front.entryDir] = Math.min(front.progress, 1);

                if (front.progress >= 1 && !state.filled) {
                    state.filled = true;

                    const piece = grid.getPiece(front.r, front.c);
                    if (!piece) {
                        // Leak: fuel entered empty cell — shouldn't happen if we check connections
                        continue;
                    }

                    // Find exits through this piece
                    const exits = getExits(piece, front.entryDir);

                    // Fill exit directions immediately (fuel flows center→edge on source cell)
                    for (const exitDir of exits) {
                        state.fillFractions[exitDir] = 1;
                    }

                    // For each exit, check what's connected
                    for (const exitDir of exits) {
                        const nr = front.r + DIR_DELTA[exitDir][0];
                        const nc = front.c + DIR_DELTA[exitDir][1];
                        const neighborDir = OPPOSITE[exitDir];

                        // Check if exit goes to outlet
                        if (exitDir === RIGHT && front.c === GRID_COLS - 1 && front.r === this.outletRow) {
                            toExpand.push({
                                r: front.r, c: front.c,
                                exitDir: exitDir,
                                progress: 0,
                                phase: 'outlet_fill',
                                sourceKey: key,
                            });
                            continue;
                        }

                        // Check if neighbor is in bounds and has a matching opening
                        if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                            const neighborPiece = grid.getPiece(nr, nc);
                            if (neighborPiece && hasOpening(neighborPiece, neighborDir)) {
                                const nKey = `${nr},${nc}`;
                                if (!this.cellStates[nKey] || !this.cellStates[nKey].filled) {
                                    toExpand.push({
                                        r: nr, c: nc,
                                        entryDir: neighborDir,
                                        progress: 0,
                                        phase: 'grid',
                                    });
                                }
                            } else {
                                // Leak: opening faces empty cell or non-matching piece
                                this.addLeak(front.r, front.c, exitDir);
                            }
                        } else {
                            // Edge of grid with no outlet - leak
                            if (!(exitDir === RIGHT && front.c === GRID_COLS - 1 && front.r === this.outletRow)) {
                                this.addLeak(front.r, front.c, exitDir);
                            }
                        }
                    }

                } else if (front.progress < 1) {
                    newFront.push(front);
                }
            }
        }

        // Process outlet fills (animate exit direction on the source cell)
        for (const item of toExpand) {
            if (item.phase === 'outlet_fill') {
                const state = this.cellStates[item.sourceKey];
                if (state) state.fillFractions[item.exitDir] = 1;
                newFront.push({
                    r: this.outletRow, c: GRID_COLS,
                    entryDir: LEFT,
                    progress: 0,
                    phase: 'outlet',
                });
            } else {
                // Check not already processing this cell
                const key = `${item.r},${item.c}`;
                const existing = this.cellStates[key];
                if (existing && existing.filled) continue;
                // Check not already in front
                const alreadyInFront = newFront.some(f =>
                    f.r === item.r && f.c === item.c && f.phase === 'grid'
                );
                if (!alreadyInFront) {
                    newFront.push(item);
                }
            }
        }

        // Fill exit directions on active cells
        for (const front of newFront) {
            if (front.phase === 'grid') {
                const key = `${front.r},${front.c}`;
                const state = this.cellStates[key];
                if (state) {
                    state.fillFractions[front.entryDir] = Math.min(front.progress, 1);
                }
            }
        }

        this.flowFront = newFront;

        // Update leak timer
        if (this.leaks.length > 0 && !this.leakFailed) {
            this.leakTimer += dt;
            if (this.leakTimer >= LEAK_TIMEOUT) {
                this.leakFailed = true;
                return 'leak_fail';
            }
        }

        // Check success
        if (this.reachedOutlet && this.leaks.length === 0) {
            return 'success';
        }

        // Still flowing
        if (this.flowFront.length === 0 && !this.reachedOutlet) {
            // Flow stopped and didn't reach outlet
            if (this.leaks.length === 0) {
                // Dead end, all capped but fuel can't reach outlet — treat as fail
                this.leakFailed = true;
                this.deadEnd = true;
                return 'leak_fail';
            }
        }

        return null;
    }

    addLeak(r, c, dir) {
        // Check not already registered
        const exists = this.leaks.some(l => l.r === r && l.c === c && l.dir === dir);
        if (!exists) {
            this.leaks.push({ r, c, dir, timer: 0 });
        }
    }

    render(ctx, grid) {
        if (!this.active) return;

        // Draw fuel in inlet pipe
        if (this.inletFill > 0) {
            const inY = GRID_Y + this.inletRow * CELL_SIZE + CELL_SIZE / 2;
            const inStartX = GRID_X - INLET_PIPE_LEN;
            const fillLen = INLET_PIPE_LEN * this.inletFill;

            ctx.strokeStyle = FUEL_COLOR;
            ctx.lineWidth = PIPE_WIDTH * 0.6;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(inStartX, inY);
            ctx.lineTo(inStartX + fillLen, inY);
            ctx.stroke();
        }

        // Draw fuel in grid cells
        for (const [key, state] of Object.entries(this.cellStates)) {
            const [r, c] = key.split(',').map(Number);
            const x = GRID_X + c * CELL_SIZE;
            const y = GRID_Y + r * CELL_SIZE;
            const piece = grid.getPiece(r, c);
            if (!piece) continue;

            this.drawCellFuel(ctx, x, y, CELL_SIZE, piece, state.fillFractions);
        }

        // Draw fuel in outlet pipe
        if (this.outletFill > 0) {
            const outY = GRID_Y + this.outletRow * CELL_SIZE + CELL_SIZE / 2;
            const outStartX = GRID_X + GRID_W;
            const fillLen = OUTLET_PIPE_LEN * this.outletFill;

            ctx.strokeStyle = FUEL_COLOR;
            ctx.lineWidth = PIPE_WIDTH * 0.6;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(outStartX, outY);
            ctx.lineTo(outStartX + fillLen, outY);
            ctx.stroke();
        }

        // Draw leaks
        for (const leak of this.leaks) {
            this.drawLeak(ctx, leak);
        }

        // Draw fire hazard warning
        if (this.leaks.length > 0 && !this.leakFailed) {
            const warningAlpha = 0.5 + 0.5 * Math.sin(this.time * 6);
            ctx.fillStyle = `rgba(255, 60, 20, ${warningAlpha * 0.15})`;
            ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

            // Timer display
            const remaining = Math.max(0, LEAK_TIMEOUT - this.leakTimer);
            ctx.fillStyle = '#ff4422';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`LEAK DETECTED — ${remaining.toFixed(1)}s`, LOGICAL_W / 2, GRID_Y + GRID_ROWS * CELL_SIZE + 50);
        }
    }

    drawCellFuel(ctx, x, y, size, pieceType, fillFractions) {
        const def = PIECE_TYPES[pieceType];
        if (!def) return;

        const cx = x + size / 2;
        const cy = y + size / 2;
        const pipeW = PIPE_WIDTH * (size / CELL_SIZE);
        const half = size / 2;

        ctx.lineCap = 'butt';

        // Draw fuel from edge toward center for each filled direction
        for (const [dirStr, frac] of Object.entries(fillFractions)) {
            if (frac <= 0) continue;
            const dir = parseInt(dirStr);

            let x1, y1, x2, y2;
            // Fuel fills from the edge toward center
            if (dir === TOP) {
                x1 = cx; y1 = y;
                x2 = cx; y2 = y + half * frac;
            } else if (dir === BOTTOM) {
                x1 = cx; y1 = y + size;
                x2 = cx; y2 = y + size - half * frac;
            } else if (dir === LEFT) {
                x1 = x; y1 = cy;
                x2 = x + half * frac; y2 = cy;
            } else if (dir === RIGHT) {
                x1 = x + size; y1 = cy;
                x2 = x + size - half * frac; y2 = cy;
            }

            // Animated shimmer
            const shimmer = 0.85 + 0.15 * Math.sin(this.time * 4 + dir * 1.5);
            ctx.strokeStyle = FUEL_COLOR;
            ctx.globalAlpha = shimmer;
            ctx.lineWidth = pipeW * 0.55;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Center glow when filled
        const maxFrac = Math.max(0, ...Object.values(fillFractions));
        if (maxFrac > 0.5) {
            ctx.fillStyle = FUEL_COLOR;
            ctx.globalAlpha = (maxFrac - 0.5) * 2 * 0.8;
            ctx.beginPath();
            ctx.arc(cx, cy, pipeW * 0.28, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    drawLeak(ctx, leak) {
        const x = GRID_X + leak.c * CELL_SIZE + CELL_SIZE / 2;
        const y = GRID_Y + leak.r * CELL_SIZE + CELL_SIZE / 2;
        const half = CELL_SIZE / 2;

        // Leak position at edge
        let lx = x, ly = y;
        if (leak.dir === TOP) ly = y - half;
        else if (leak.dir === BOTTOM) ly = y + half;
        else if (leak.dir === LEFT) lx = x - half;
        else if (leak.dir === RIGHT) lx = x + half;

        // Dripping/spraying particles
        const t = this.time;
        for (let i = 0; i < 5; i++) {
            const spread = Math.sin(t * 3 + i * 1.3) * 12;
            const drip = ((t * 40 + i * 15) % 30);
            let px = lx, py = ly;

            if (leak.dir === TOP || leak.dir === BOTTOM) {
                px += spread;
                py += (leak.dir === BOTTOM ? 1 : -1) * drip;
            } else {
                py += spread;
                px += (leak.dir === RIGHT ? 1 : -1) * drip;
            }

            const alpha = 1 - drip / 30;
            ctx.fillStyle = FUEL_COLOR;
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Leak warning icon
        ctx.fillStyle = '#ff4422';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', lx, ly - 15);
    }
}
