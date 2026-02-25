/**
 * Paper - Fold logic engine with undo stack
 * Manages the grid state and fold operations
 */

var Paper = {
    grid: null,       // 2D array [row][col] of color indices or null
    rows: 0,
    cols: 0,
    undoStack: [],    // stack of deep-copied grids
    foldCount: 0,

    /**
     * Initialize paper from a level definition
     * @param {Array} gridDef - 2D array from level data
     */
    init: function(gridDef) {
        this.rows = gridDef.length;
        this.cols = gridDef[0].length;
        this.grid = this.deepCopy(gridDef);
        this.undoStack = [];
        this.foldCount = 0;
    },

    /**
     * Deep copy a 2D grid
     */
    deepCopy: function(grid) {
        var copy = [];
        for (var r = 0; r < grid.length; r++) {
            copy.push(grid[r].slice());
        }
        return copy;
    },

    /**
     * Execute a fold operation
     * @param {string} axis - 'h' for horizontal fold line, 'v' for vertical fold line
     * @param {number} line - the grid line to fold along (0-based, between cells)
     *   For 'h': line=1 means fold along the line between row 0 and row 1
     *   For 'v': line=1 means fold along the line between col 0 and col 1
     * @param {string} side - 'before' folds the side before the line onto the side after,
     *                        'after' folds the side after the line onto the side before
     * @returns {object|null} Fold info for animation, or null if invalid
     */
    fold: function(axis, line, side) {
        if (axis === 'h') {
            return this.foldHorizontal(line, side);
        } else {
            return this.foldVertical(line, side);
        }
    },

    /**
     * Fold along a horizontal line (folding rows)
     * line: row index where fold happens (between row line-1 and row line)
     * side='before': rows 0..line-1 fold down onto rows line..end
     * side='after': rows line..end fold up onto rows 0..line-1
     */
    foldHorizontal: function(line, side) {
        if (line < 1 || line >= this.rows) return null;

        // Check that the folding side has at least one non-null cell
        var hasCells = false;
        if (side === 'before') {
            for (var r = 0; r < line && !hasCells; r++)
                for (var c = 0; c < this.cols && !hasCells; c++)
                    if (this.grid[r][c] !== null) hasCells = true;
        } else {
            for (var r = line; r < this.rows && !hasCells; r++)
                for (var c = 0; c < this.cols && !hasCells; c++)
                    if (this.grid[r][c] !== null) hasCells = true;
        }
        if (!hasCells) return null;

        // Save state for undo
        this.undoStack.push(this.deepCopy(this.grid));

        var foldInfo = {
            axis: 'h', line: line, side: side,
            movedCells: [] // [{fromR, fromC, toR, toC, color}]
        };

        if (side === 'before') {
            // Fold rows 0..line-1 down, mirroring across the line
            for (var r = 0; r < line; r++) {
                var targetR = line + (line - 1 - r);
                for (var c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] !== null) {
                        if (targetR < this.rows) {
                            foldInfo.movedCells.push({
                                fromR: r, fromC: c,
                                toR: targetR, toC: c,
                                color: this.grid[r][c]
                            });
                            this.grid[targetR][c] = this.grid[r][c];
                        }
                        // Cell folded away or off-grid
                        this.grid[r][c] = null;
                    }
                }
            }
        } else {
            // Fold rows line..end up, mirroring across the line
            for (var r = line; r < this.rows; r++) {
                var targetR = line - 1 - (r - line);
                for (var c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] !== null) {
                        if (targetR >= 0) {
                            foldInfo.movedCells.push({
                                fromR: r, fromC: c,
                                toR: targetR, toC: c,
                                color: this.grid[r][c]
                            });
                            this.grid[targetR][c] = this.grid[r][c];
                        }
                        this.grid[r][c] = null;
                    }
                }
            }
        }

        this.foldCount++;
        return foldInfo;
    },

    /**
     * Fold along a vertical line (folding columns)
     * line: col index where fold happens
     * side='before': cols 0..line-1 fold right onto cols line..end
     * side='after': cols line..end fold left onto cols 0..line-1
     */
    foldVertical: function(line, side) {
        if (line < 1 || line >= this.cols) return null;

        var hasCells = false;
        if (side === 'before') {
            for (var r = 0; r < this.rows && !hasCells; r++)
                for (var c = 0; c < line && !hasCells; c++)
                    if (this.grid[r][c] !== null) hasCells = true;
        } else {
            for (var r = 0; r < this.rows && !hasCells; r++)
                for (var c = line; c < this.cols && !hasCells; c++)
                    if (this.grid[r][c] !== null) hasCells = true;
        }
        if (!hasCells) return null;

        this.undoStack.push(this.deepCopy(this.grid));

        var foldInfo = {
            axis: 'v', line: line, side: side,
            movedCells: []
        };

        if (side === 'before') {
            // Fold cols 0..line-1 right
            for (var r = 0; r < this.rows; r++) {
                for (var c = 0; c < line; c++) {
                    var targetC = line + (line - 1 - c);
                    if (this.grid[r][c] !== null) {
                        if (targetC < this.cols) {
                            foldInfo.movedCells.push({
                                fromR: r, fromC: c,
                                toR: r, toC: targetC,
                                color: this.grid[r][c]
                            });
                            this.grid[r][targetC] = this.grid[r][c];
                        }
                        this.grid[r][c] = null;
                    }
                }
            }
        } else {
            // Fold cols line..end left
            for (var r = 0; r < this.rows; r++) {
                for (var c = line; c < this.cols; c++) {
                    var targetC = line - 1 - (c - line);
                    if (this.grid[r][c] !== null) {
                        if (targetC >= 0) {
                            foldInfo.movedCells.push({
                                fromR: r, fromC: c,
                                toR: r, toC: targetC,
                                color: this.grid[r][c]
                            });
                            this.grid[r][targetC] = this.grid[r][c];
                        }
                        this.grid[r][c] = null;
                    }
                }
            }
        }

        this.foldCount++;
        return foldInfo;
    },

    /**
     * Undo the last fold
     * @returns {boolean} true if undo was performed
     */
    undo: function() {
        if (this.undoStack.length === 0) return false;
        this.grid = this.undoStack.pop();
        this.foldCount--;
        return true;
    },

    /**
     * Check if current grid matches the target
     * @param {Array} target - 2D array target pattern
     * @returns {boolean}
     */
    matchesTarget: function(target) {
        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== target[r][c]) return false;
            }
        }
        return true;
    },

    /**
     * Calculate star rating
     * @param {number} par - target fold count for 3 stars
     * @returns {number} 1-3 stars
     */
    getStars: function(par) {
        if (this.foldCount <= par) return 3;
        if (this.foldCount <= par + 1) return 2;
        return 1;
    },

    /**
     * Check if grid has any non-null cells
     */
    hasAnyCells: function() {
        for (var r = 0; r < this.rows; r++)
            for (var c = 0; c < this.cols; c++)
                if (this.grid[r][c] !== null) return true;
        return false;
    }
};
