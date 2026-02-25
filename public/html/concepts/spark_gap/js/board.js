/**
 * Board - Circuit board grid with terminals, obstacles, and cell management
 */

// Cell types
export const CELL_EMPTY = 0;
export const CELL_OBSTACLE = 1;   // Capacitor, resistor, chip - blocks pathing
export const CELL_WIRE = 2;       // Completed wire segment
export const CELL_TERMINAL = 3;   // Source or target terminal

// Obstacle subtypes for visual variety
export const OBS_CAPACITOR = 0;
export const OBS_RESISTOR = 1;
export const OBS_CHIP = 2;
export const OBS_DIODE = 3;

// Wire colors for pairs
export const WIRE_COLORS = [
    '#00e5ff', // cyan
    '#ffea00', // yellow
    '#ff3d00', // orange-red
    '#76ff03', // green
    '#e040fb', // magenta
    '#ff6d00', // amber
];

export class Board {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.cells = [];       // 2D array [row][col] of cell type
        this.obsType = [];     // 2D array of obstacle subtype for rendering
        this.wireColor = [];   // 2D array of wire color index (-1 = none)
        this.powered = [];     // 2D array of boolean - cell is "powered up"
        this.terminalPairs = []; // Array of {src:{r,c}, tgt:{r,c}, colorIdx, active, completed}
        this.completedWires = []; // Array of {path:[], colorIdx}
        this.clear();
    }

    clear() {
        this.cells = [];
        this.obsType = [];
        this.wireColor = [];
        this.powered = [];
        for (var r = 0; r < this.rows; r++) {
            this.cells[r] = [];
            this.obsType[r] = [];
            this.wireColor[r] = [];
            this.powered[r] = [];
            for (var c = 0; c < this.cols; c++) {
                this.cells[r][c] = CELL_EMPTY;
                this.obsType[r][c] = 0;
                this.wireColor[r][c] = -1;
                this.powered[r][c] = false;
            }
        }
        this.terminalPairs = [];
        this.completedWires = [];
    }

    resize(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.clear();
    }

    inBounds(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    isWalkable(r, c) {
        if (!this.inBounds(r, c)) return false;
        return this.cells[r][c] === CELL_EMPTY;
    }

    /** Check if stepping onto (r,c) would cross an existing completed wire */
    wouldShort(r, c) {
        if (!this.inBounds(r, c)) return false;
        return this.cells[r][c] === CELL_WIRE;
    }

    placeObstacle(r, c, subtype) {
        if (!this.inBounds(r, c)) return;
        this.cells[r][c] = CELL_OBSTACLE;
        this.obsType[r][c] = subtype !== undefined ? subtype : Math.floor(Math.random() * 4);
    }

    placeTerminal(r, c) {
        if (!this.inBounds(r, c)) return;
        this.cells[r][c] = CELL_TERMINAL;
    }

    /** Commit a wire path to the board */
    commitWire(path, colorIdx) {
        for (var i = 0; i < path.length; i++) {
            var p = path[i];
            this.cells[p.r][p.c] = CELL_WIRE;
            this.wireColor[p.r][p.c] = colorIdx;
        }
        this.completedWires.push({ path: path.slice(), colorIdx: colorIdx });
    }

    /** Power up cells around a completed wire */
    powerArea(path, radius) {
        for (var i = 0; i < path.length; i++) {
            var p = path[i];
            for (var dr = -radius; dr <= radius; dr++) {
                for (var dc = -radius; dc <= radius; dc++) {
                    var nr = p.r + dr;
                    var nc = p.c + dc;
                    if (this.inBounds(nr, nc)) {
                        this.powered[nr][nc] = true;
                    }
                }
            }
        }
    }

    /** Generate obstacles for a level */
    generateObstacles(count) {
        var placed = 0;
        var attempts = 0;
        while (placed < count && attempts < count * 10) {
            attempts++;
            var r = Math.floor(Math.random() * this.rows);
            var c = Math.floor(Math.random() * this.cols);
            if (this.cells[r][c] === CELL_EMPTY) {
                this.placeObstacle(r, c);
                placed++;
            }
        }
    }

    /** Place a terminal pair ensuring path exists between them */
    addTerminalPair(colorIdx) {
        var tries = 0;
        while (tries < 200) {
            tries++;
            // Pick source on left half, target on right half (for horizontal boards)
            // Or top/bottom for vertical - use random edges
            var src, tgt;
            var side = Math.random();
            if (side < 0.25) {
                // src top edge, tgt bottom edge
                src = { r: 0, c: Math.floor(Math.random() * this.cols) };
                tgt = { r: this.rows - 1, c: Math.floor(Math.random() * this.cols) };
            } else if (side < 0.5) {
                // src left, tgt right
                src = { r: Math.floor(Math.random() * this.rows), c: 0 };
                tgt = { r: Math.floor(Math.random() * this.rows), c: this.cols - 1 };
            } else if (side < 0.75) {
                // src bottom, tgt top
                src = { r: this.rows - 1, c: Math.floor(Math.random() * this.cols) };
                tgt = { r: 0, c: Math.floor(Math.random() * this.cols) };
            } else {
                // Random placement with minimum distance
                src = { r: Math.floor(Math.random() * this.rows), c: Math.floor(Math.random() * this.cols) };
                tgt = { r: Math.floor(Math.random() * this.rows), c: Math.floor(Math.random() * this.cols) };
            }

            // Check minimum distance
            var dist = Math.abs(src.r - tgt.r) + Math.abs(src.c - tgt.c);
            if (dist < 3) continue;

            // Check cells are empty
            if (this.cells[src.r][src.c] !== CELL_EMPTY) continue;
            if (this.cells[tgt.r][tgt.c] !== CELL_EMPTY) continue;

            // Check path exists (BFS)
            if (!this._pathExists(src, tgt)) continue;

            this.placeTerminal(src.r, src.c);
            this.placeTerminal(tgt.r, tgt.c);
            var pair = {
                src: src,
                tgt: tgt,
                colorIdx: colorIdx % WIRE_COLORS.length,
                active: false,
                completed: false
            };
            this.terminalPairs.push(pair);
            return pair;
        }
        return null;
    }

    /** BFS to check if a path exists between two points */
    _pathExists(src, tgt) {
        var visited = [];
        for (var r = 0; r < this.rows; r++) {
            visited[r] = [];
            for (var c = 0; c < this.cols; c++) {
                visited[r][c] = false;
            }
        }
        var queue = [src];
        visited[src.r][src.c] = true;
        var dirs = [[-1,0],[1,0],[0,-1],[0,1]];

        while (queue.length > 0) {
            var cur = queue.shift();
            if (cur.r === tgt.r && cur.c === tgt.c) return true;

            for (var d = 0; d < dirs.length; d++) {
                var nr = cur.r + dirs[d][0];
                var nc = cur.c + dirs[d][1];
                if (!this.inBounds(nr, nc)) continue;
                if (visited[nr][nc]) continue;
                if (this.cells[nr][nc] !== CELL_EMPTY && !(nr === tgt.r && nc === tgt.c)) continue;
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
            }
        }
        return false;
    }

    /** Get 4-directional neighbors that are walkable or are the target */
    getNeighbors(r, c, targetR, targetC) {
        var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        var result = [];
        for (var d = 0; d < dirs.length; d++) {
            var nr = r + dirs[d][0];
            var nc = c + dirs[d][1];
            if (!this.inBounds(nr, nc)) continue;
            if (nr === targetR && nc === targetC) {
                result.push({ r: nr, c: nc });
                continue;
            }
            if (this.cells[nr][nc] === CELL_EMPTY || this.cells[nr][nc] === CELL_WIRE) {
                result.push({ r: nr, c: nc });
            }
        }
        return result;
    }
}
