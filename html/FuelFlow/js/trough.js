// trough.js — Trough state: inventory, piece counts, layout
import {
    LOGICAL_W, TROUGH_Y, TROUGH_H, TROUGH_PIECE_SIZE, TROUGH_PADDING,
} from './constants.js';
import { PIECE_KEYS } from './pieces.js';

export class Trough {
    constructor() {
        this.counts = {};       // pieceType -> count
        this.types = [];        // ordered list of types present
        this.slotCache = null;  // computed slot positions
    }

    /**
     * Initialize from a pieceCounts map.
     */
    init(pieceCounts) {
        this.counts = {};
        this.types = [];

        // Preserve a consistent order based on PIECE_KEYS
        for (const key of PIECE_KEYS) {
            if (pieceCounts[key] && pieceCounts[key] > 0) {
                this.counts[key] = pieceCounts[key];
                this.types.push(key);
            }
        }

        this.slotCache = null;
    }

    getCount(type) {
        return this.counts[type] || 0;
    }

    decrement(type) {
        if (this.counts[type] > 0) {
            this.counts[type]--;
            this.slotCache = null;
            return true;
        }
        return false;
    }

    increment(type) {
        if (this.counts[type] !== undefined) {
            this.counts[type]++;
        } else {
            this.counts[type] = 1;
            if (!this.types.includes(type)) {
                this.types.push(type);
            }
        }
        this.slotCache = null;
    }

    /** Restore all pieces from a counts map (for restart) */
    restoreAll(pieceCounts) {
        this.init(pieceCounts);
    }

    /**
     * Get slot layout positions for rendering and hit testing.
     * Returns array of { x, y, type, count }
     */
    getSlots() {
        if (this.slotCache) return this.slotCache;

        const slotW = TROUGH_PIECE_SIZE + TROUGH_PADDING;
        const slotH = TROUGH_PIECE_SIZE + 24; // room for count text
        const maxPerRow = Math.floor((LOGICAL_W - TROUGH_PADDING * 2) / slotW);
        const rows = Math.ceil(this.types.length / maxPerRow);
        const totalH = rows * slotH;
        const startY = TROUGH_Y + (TROUGH_H - totalH) / 2;

        const slots = [];
        for (let i = 0; i < this.types.length; i++) {
            const row = Math.floor(i / maxPerRow);
            const col = i % maxPerRow;
            const itemsInRow = Math.min(maxPerRow, this.types.length - row * maxPerRow);
            const rowW = itemsInRow * slotW;
            const rowStartX = (LOGICAL_W - rowW) / 2;

            slots.push({
                x: rowStartX + col * slotW + TROUGH_PADDING / 2,
                y: startY + row * slotH,
                type: this.types[i],
                count: this.counts[this.types[i]] || 0,
            });
        }

        this.slotCache = slots;
        return slots;
    }

    /**
     * Hit test: find which piece type (if any) is at the given logical coords.
     * Returns pieceType string or null.
     */
    hitTest(lx, ly) {
        const slots = this.getSlots();
        for (const slot of slots) {
            if (slot.count <= 0) continue;
            if (lx >= slot.x && lx <= slot.x + TROUGH_PIECE_SIZE &&
                ly >= slot.y && ly <= slot.y + TROUGH_PIECE_SIZE) {
                return slot.type;
            }
        }
        return null;
    }

    /**
     * Check if a point is within the trough area at all.
     */
    isInTrough(ly) {
        return ly >= TROUGH_Y;
    }
}
