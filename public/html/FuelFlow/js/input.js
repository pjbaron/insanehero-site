// input.js — Unified touch/mouse input, drag & drop with snap
import {
    GRID_X, GRID_Y, GRID_COLS, GRID_ROWS, CELL_SIZE,
    SNAP_DIST, SNAP_VEL,
} from './constants.js';

export class Input {
    constructor(game) {
        this.game = game;
        this.dragging = false;
        this.dragPiece = null;  // piece type being dragged
        this.dragX = 0;
        this.dragY = 0;
        this.prevX = 0;
        this.prevY = 0;
        this.velocity = 0;      // speed in logical px/frame
        this.snapped = false;
        this.snapRow = -1;
        this.snapCol = -1;
        this.dragSource = null; // 'trough' or { r, c } if picked from grid
    }

    onPointerDown(x, y) {
        const game = this.game;
        if (this.dragging) return;

        // Try picking up from grid first
        const gc = this.pixelToGrid(x, y);
        if (gc && game.grid.getPiece(gc.r, gc.c)) {
            const pieceType = game.grid.removePiece(gc.r, gc.c);
            this.startDrag(pieceType, x, y, { r: gc.r, c: gc.c });
            return true;
        }

        // Try picking up from trough
        const troughPiece = game.trough.hitTest(x, y);
        if (troughPiece) {
            game.trough.decrement(troughPiece);
            this.startDrag(troughPiece, x, y, 'trough');
            return true;
        }

        return false;
    }

    startDrag(pieceType, x, y, source) {
        this.dragging = true;
        this.dragPiece = pieceType;
        this.dragX = x;
        this.dragY = y;
        this.prevX = x;
        this.prevY = y;
        this.velocity = 0;
        this.snapped = false;
        this.snapRow = -1;
        this.snapCol = -1;
        this.dragSource = source;
    }

    onPointerMove(x, y) {
        if (!this.dragging) return false;

        // Calculate velocity
        const dx = x - this.prevX;
        const dy = y - this.prevY;
        this.velocity = Math.sqrt(dx * dx + dy * dy);
        this.prevX = x;
        this.prevY = y;

        // Update drag position
        this.dragX = x;
        this.dragY = y;

        // Check snap to grid
        const gc = this.pixelToGrid(x, y);
        if (gc && this.game.grid.canPlace(gc.r, gc.c)) {
            const cellCX = GRID_X + gc.c * CELL_SIZE + CELL_SIZE / 2;
            const cellCY = GRID_Y + gc.r * CELL_SIZE + CELL_SIZE / 2;
            const dist = Math.sqrt((x - cellCX) ** 2 + (y - cellCY) ** 2);

            if (dist < SNAP_DIST && this.velocity < SNAP_VEL) {
                this.snapped = true;
                this.snapRow = gc.r;
                this.snapCol = gc.c;
                this.dragX = cellCX;
                this.dragY = cellCY;
            } else {
                this.snapped = false;
            }
        } else {
            this.snapped = false;
        }

        return true;
    }

    onPointerUp(x, y) {
        if (!this.dragging) return false;

        if (this.snapped) {
            // Place piece on grid
            this.game.grid.placePiece(this.snapRow, this.snapCol, this.dragPiece);
        } else {
            // Return to trough
            this.game.trough.increment(this.dragPiece);
            this.game.trough.slotCache = null;
        }

        this.dragging = false;
        this.dragPiece = null;
        this.snapped = false;
        return true;
    }

    /**
     * Convert logical pixel coords to grid row/col, or null if outside grid.
     */
    pixelToGrid(x, y) {
        const c = Math.floor((x - GRID_X) / CELL_SIZE);
        const r = Math.floor((y - GRID_Y) / CELL_SIZE);
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
            return { r, c };
        }
        return null;
    }

    getDragState() {
        if (!this.dragging) return null;
        return {
            piece: this.dragPiece,
            x: this.dragX,
            y: this.dragY,
            snapped: this.snapped,
        };
    }
}
