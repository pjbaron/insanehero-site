// pieces.js — Pipe piece type definitions and connection model
import { TOP, RIGHT, BOTTOM, LEFT } from './constants.js';

/**
 * Each piece type:
 *   name: display name
 *   openings: [top, right, bottom, left] — boolean, which sides have pipe opening
 *   passages: [[sideA, sideB], ...] — which side pairs allow flow
 */
export const PIECE_TYPES = {
    STRAIGHT_H: {
        name: 'Straight H',
        openings: [false, true, false, true],
        passages: [[LEFT, RIGHT]],
    },
    STRAIGHT_V: {
        name: 'Straight V',
        openings: [true, false, true, false],
        passages: [[TOP, BOTTOM]],
    },
    CORNER_TR: {
        name: 'Corner TR',
        openings: [true, true, false, false],
        passages: [[TOP, RIGHT]],
    },
    CORNER_BR: {
        name: 'Corner BR',
        openings: [false, true, true, false],
        passages: [[RIGHT, BOTTOM]],
    },
    CORNER_BL: {
        name: 'Corner BL',
        openings: [false, false, true, true],
        passages: [[BOTTOM, LEFT]],
    },
    CORNER_TL: {
        name: 'Corner TL',
        openings: [true, false, false, true],
        passages: [[TOP, LEFT]],
    },
    T_UP: {
        name: 'T Up',
        openings: [true, true, false, true],
        passages: [[TOP, RIGHT], [TOP, LEFT], [RIGHT, LEFT]],
    },
    T_RIGHT: {
        name: 'T Right',
        openings: [true, true, true, false],
        passages: [[TOP, RIGHT], [TOP, BOTTOM], [RIGHT, BOTTOM]],
    },
    T_DOWN: {
        name: 'T Down',
        openings: [false, true, true, true],
        passages: [[RIGHT, BOTTOM], [RIGHT, LEFT], [BOTTOM, LEFT]],
    },
    T_LEFT: {
        name: 'T Left',
        openings: [true, false, true, true],
        passages: [[TOP, BOTTOM], [TOP, LEFT], [BOTTOM, LEFT]],
    },
};

/** All piece type keys */
export const PIECE_KEYS = Object.keys(PIECE_TYPES);

/**
 * Check if a piece type has a passage between two directions.
 */
export function hasPassage(pieceType, fromDir, toDir) {
    const def = PIECE_TYPES[pieceType];
    if (!def) return false;
    return def.passages.some(
        ([a, b]) => (a === fromDir && b === toDir) || (a === toDir && b === fromDir)
    );
}

/**
 * Get all exits from a given entry direction through the piece's passages.
 */
export function getExits(pieceType, entryDir) {
    const def = PIECE_TYPES[pieceType];
    if (!def) return [];
    const exits = [];
    for (const [a, b] of def.passages) {
        if (a === entryDir) exits.push(b);
        else if (b === entryDir) exits.push(a);
    }
    return exits;
}

/**
 * Check if a piece has an opening on a given side.
 */
export function hasOpening(pieceType, dir) {
    const def = PIECE_TYPES[pieceType];
    if (!def) return false;
    return def.openings[dir];
}

/**
 * Given entry direction and exit direction on a path, determine the piece type.
 */
export function pieceForDirections(entryDir, exitDir) {
    for (const key of PIECE_KEYS) {
        const def = PIECE_TYPES[key];
        if (def.openings[entryDir] && def.openings[exitDir]) {
            if (def.passages.some(([a, b]) =>
                (a === entryDir && b === exitDir) || (a === exitDir && b === entryDir)
            )) {
                return key;
            }
        }
    }
    return null;
}

/**
 * Given a set of connected directions, determine the piece type.
 * Works for 2-connection (straight/corner) and 3-connection (T-junction) pieces.
 */
export function pieceForOpenings(dirs) {
    const sorted = [...dirs].sort((a, b) => a - b);
    const key = sorted.join(',');
    const map = {
        '1,3': 'STRAIGHT_H',
        '0,2': 'STRAIGHT_V',
        '0,1': 'CORNER_TR',
        '1,2': 'CORNER_BR',
        '2,3': 'CORNER_BL',
        '0,3': 'CORNER_TL',
        '0,1,3': 'T_UP',
        '0,1,2': 'T_RIGHT',
        '1,2,3': 'T_DOWN',
        '0,2,3': 'T_LEFT',
    };
    return map[key] || null;
}
