// grid.js — Grid data model (7x7 cells, place/remove pieces)
import { GRID_ROWS, GRID_COLS } from './constants.js';

/**
 * Grid cell:
 *   { piece: string|null (PIECE_TYPE key), obstacle: boolean }
 */
export class Grid {
    constructor() {
        this.rows = GRID_ROWS;
        this.cols = GRID_COLS;
        this.cells = [];
        this.clear();
    }

    clear() {
        this.cells = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({ piece: null, obstacle: false });
            }
            this.cells.push(row);
        }
    }

    inBounds(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    getCell(r, c) {
        if (!this.inBounds(r, c)) return null;
        return this.cells[r][c];
    }

    setObstacle(r, c) {
        if (this.inBounds(r, c)) {
            this.cells[r][c].obstacle = true;
        }
    }

    isObstacle(r, c) {
        const cell = this.getCell(r, c);
        return cell ? cell.obstacle : false;
    }

    isEmpty(r, c) {
        const cell = this.getCell(r, c);
        if (!cell) return false;
        return !cell.obstacle && cell.piece === null;
    }

    canPlace(r, c) {
        return this.inBounds(r, c) && this.isEmpty(r, c);
    }

    placePiece(r, c, pieceType) {
        if (!this.canPlace(r, c)) return false;
        this.cells[r][c].piece = pieceType;
        return true;
    }

    removePiece(r, c) {
        if (!this.inBounds(r, c)) return null;
        const piece = this.cells[r][c].piece;
        this.cells[r][c].piece = null;
        return piece;
    }

    getPiece(r, c) {
        const cell = this.getCell(r, c);
        return cell ? cell.piece : null;
    }

    /** Remove all placed pieces (keep obstacles) */
    clearPieces() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.cells[r][c].piece = null;
            }
        }
    }
}
