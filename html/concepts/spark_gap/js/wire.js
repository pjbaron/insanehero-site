/**
 * Wire - Active wire path being drawn by the player
 * Handles path building, backtracking, and validation
 */

import { WIRE_COLORS } from './board.js';

export class Wire {
    constructor() {
        this.path = [];       // Array of {r, c}
        this.colorIdx = 0;
        this.active = false;
        this.sourceR = -1;
        this.sourceC = -1;
        this.targetR = -1;
        this.targetC = -1;
        this.shorted = false;  // Did this wire cross another?
    }

    start(srcR, srcC, tgtR, tgtC, colorIdx) {
        this.path = [{ r: srcR, c: srcC }];
        this.colorIdx = colorIdx;
        this.active = true;
        this.sourceR = srcR;
        this.sourceC = srcC;
        this.targetR = tgtR;
        this.targetC = tgtC;
        this.shorted = false;
    }

    cancel() {
        this.path = [];
        this.active = false;
        this.shorted = false;
    }

    /** Get last cell in path */
    head() {
        if (this.path.length === 0) return null;
        return this.path[this.path.length - 1];
    }

    /** Check if cell is already in path */
    contains(r, c) {
        for (var i = 0; i < this.path.length; i++) {
            if (this.path[i].r === r && this.path[i].c === c) return i;
        }
        return -1;
    }

    /** Try to extend the path to an adjacent cell.
     *  Returns: 'added' | 'backtrack' | 'invalid' | 'target' | 'short'
     */
    tryExtend(r, c, board) {
        if (!this.active) return 'invalid';
        var h = this.head();
        if (!h) return 'invalid';

        // Must be 4-directionally adjacent
        var dr = Math.abs(r - h.r);
        var dc = Math.abs(c - h.c);
        if (dr + dc !== 1) return 'invalid';

        // Backtracking: if the cell is the second-to-last in path, pop the head
        if (this.path.length >= 2) {
            var prev = this.path[this.path.length - 2];
            if (prev.r === r && prev.c === c) {
                this.path.pop();
                return 'backtrack';
            }
        }

        // Already in path (loop) - reject
        if (this.contains(r, c) >= 0) return 'invalid';

        // Check if this is the target
        if (r === this.targetR && c === this.targetC) {
            this.path.push({ r: r, c: c });
            this.active = false;
            return 'target';
        }

        // Check if this crosses a completed wire (short circuit)
        if (board.wouldShort(r, c)) {
            this.path.push({ r: r, c: c });
            this.shorted = true;
            return 'short';
        }

        // Check if cell is walkable
        if (!board.isWalkable(r, c)) return 'invalid';

        // Extend
        this.path.push({ r: r, c: c });
        return 'added';
    }

    /** Get color string */
    color() {
        return WIRE_COLORS[this.colorIdx % WIRE_COLORS.length];
    }

    /** Get path length (number of segments, not cells) */
    length() {
        return Math.max(0, this.path.length - 1);
    }
}
