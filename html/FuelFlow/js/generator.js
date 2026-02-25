// generator.js — Puzzle generation algorithm
import { GRID_ROWS, GRID_COLS, TOP, RIGHT, BOTTOM, LEFT, OPPOSITE, DIR_DELTA, LEVEL_CONFIG, DISTRACTOR_RATIO } from './constants.js';
import { Grid } from './grid.js';
import { pieceForDirections, pieceForOpenings } from './pieces.js';
import { randInt, shuffle } from './utils.js';

/**
 * Generate a puzzle for a given level.
 * @param {number} level — 0, 1, or 2
 * @param {number|null} inletRow — forced inlet row (null = random)
 * @param {number|null} outletRow — forced outlet row (null = random)
 */
export function generatePuzzle(level, inletRow = null, outletRow = null) {
    const config = LEVEL_CONFIG[level];
    const maxAttempts = 200;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = tryGenerate(config, level, inletRow, outletRow);
        if (result) return result;
    }

    // Fallback: relax constraints
    for (let attempt = 0; attempt < 100; attempt++) {
        const result = tryGenerate(config, level, inletRow, outletRow, true);
        if (result) return result;
    }

    // Last resort — minimal path
    return generateMinimal(inletRow, outletRow);
}

// --- Main generation attempt ---

function tryGenerate(config, level, forcedInlet, forcedOutlet, relaxed = false) {
    const iRow = forcedInlet !== null ? forcedInlet : randInt(0, GRID_ROWS - 1);
    const oRow = forcedOutlet !== null ? forcedOutlet : randInt(0, GRID_ROWS - 1);
    const minPath = relaxed ? Math.floor(config.minPath * 0.7) : config.minPath;

    const path = generatePath(iRow, oRow, minPath);
    if (!path) return null;

    const grid = new Grid();
    const pathSet = new Set(path.map(p => `${p.r},${p.c}`));

    const obstacleCount = randInt(config.obstaclesMin, config.obstaclesMax);
    placeObstacles(grid, pathSet, obstacleCount);

    if (config.checkTrivial && !relaxed) {
        const shortestLen = findShortestPath(grid, iRow, oRow);
        if (shortestLen > 0 && shortestLen < path.length * 0.6) {
            return null;
        }
    }

    // Build connection map from main path
    const connections = buildConnections(path);
    const usedCells = new Set(connections.keys());

    // Add branch loops for L2 (1 loop) and L3 (2 loops)
    const numLoops = level === 0 ? 0 : level === 1 ? 1 : 2;
    if (numLoops > 0) {
        if (!addBranchLoops(connections, grid, usedCells, numLoops)) {
            if (!relaxed) return null;
        }
    }

    // Extract pieces from the full network
    const pieceCounts = extractPiecesFromNetwork(connections);
    if (!pieceCounts) return null;

    addDistractors(pieceCounts, connections.size, level);

    return { grid, inletRow: iRow, outletRow: oRow, pieceCounts, path };
}

// --- Connection map ---

function buildConnections(path) {
    const connections = new Map();

    for (let i = 0; i < path.length; i++) {
        const key = `${path[i].r},${path[i].c}`;
        if (!connections.has(key)) connections.set(key, new Set());

        if (i === 0) {
            connections.get(key).add(LEFT); // inlet
        } else {
            const dir = getDirection(path[i - 1], path[i]);
            connections.get(key).add(OPPOSITE[dir]);
        }

        if (i === path.length - 1) {
            connections.get(key).add(RIGHT); // outlet
        } else {
            const dir = getDirection(path[i], path[i + 1]);
            connections.get(key).add(dir);
        }
    }

    return connections;
}

function extractPiecesFromNetwork(connections) {
    const counts = {};

    for (const [, dirs] of connections) {
        const piece = pieceForOpenings(dirs);
        if (!piece) return null;
        counts[piece] = (counts[piece] || 0) + 1;
    }

    return counts;
}

// --- Branch loops (T-junction post-processing) ---

function addBranchLoops(connections, grid, usedCells, numLoops) {
    for (let loop = 0; loop < numLoops; loop++) {
        if (!addOneBranchLoop(connections, grid, usedCells)) {
            return false;
        }
    }
    return true;
}

function addOneBranchLoop(connections, grid, usedCells) {
    // Find cells on the network that have a free side pointing to an empty cell
    const candidates = [];

    for (const [key, dirs] of connections) {
        if (dirs.size >= 3) continue; // already a T-junction, skip
        const [r, c] = key.split(',').map(Number);

        for (let d = 0; d < 4; d++) {
            if (dirs.has(d)) continue; // already connected this side
            const nr = r + DIR_DELTA[d][0];
            const nc = c + DIR_DELTA[d][1];
            if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
            if (grid.isObstacle(nr, nc)) continue;
            if (usedCells.has(`${nr},${nc}`)) continue;

            candidates.push({ r, c, dir: d, nr, nc });
        }
    }

    // Try pairs — shuffle for variety
    shuffle(candidates);

    for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
            const a = candidates[i];
            const b = candidates[j];

            // Don't branch from the same cell twice
            if (a.r === b.r && a.c === b.c) continue;

            // Route a path from a's neighbor to b's neighbor through empty cells
            const branchPath = findBranchPath(
                a.nr, a.nc, b.nr, b.nc, grid, usedCells
            );

            if (branchPath && branchPath.length <= 7) {
                // Add branch direction to the two junction cells
                connections.get(`${a.r},${a.c}`).add(a.dir);
                connections.get(`${b.r},${b.c}`).add(b.dir);

                // Build full chain: junctionA → branchCells → junctionB
                const chain = [
                    { r: a.r, c: a.c },
                    ...branchPath,
                    { r: b.r, c: b.c },
                ];

                // Add connections for each branch cell
                for (let k = 1; k < chain.length - 1; k++) {
                    const prev = chain[k - 1];
                    const curr = chain[k];
                    const next = chain[k + 1];

                    const cKey = `${curr.r},${curr.c}`;
                    const dirSet = new Set();

                    const d1 = getDirection(prev, curr);
                    dirSet.add(OPPOSITE[d1]); // side we enter from

                    const d2 = getDirection(curr, next);
                    dirSet.add(d2); // side we exit through

                    connections.set(cKey, dirSet);
                    usedCells.add(cKey);
                }

                return true;
            }
        }
    }

    return false;
}

function findBranchPath(startR, startC, endR, endC, grid, usedCells) {
    // BFS from start to end through empty non-obstacle cells
    const startKey = `${startR},${startC}`;
    const endKey = `${endR},${endC}`;

    // Single-cell branch: both junctions point to the same empty cell
    if (startKey === endKey) {
        return [{ r: startR, c: startC }];
    }

    const queue = [{ r: startR, c: startC, path: [{ r: startR, c: startC }] }];
    const visited = new Set();
    visited.add(startKey);

    while (queue.length > 0) {
        const curr = queue.shift();

        if (curr.r === endR && curr.c === endC) {
            return curr.path;
        }

        if (curr.path.length >= 7) continue; // cap branch length

        for (let d = 0; d < 4; d++) {
            const nr = curr.r + DIR_DELTA[d][0];
            const nc = curr.c + DIR_DELTA[d][1];
            const nKey = `${nr},${nc}`;

            if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue;
            if (visited.has(nKey)) continue;
            if (grid.isObstacle(nr, nc)) continue;
            // Allow the destination cell, block all other used cells
            if (nKey !== endKey && usedCells.has(nKey)) continue;

            visited.add(nKey);
            queue.push({ r: nr, c: nc, path: [...curr.path, { r: nr, c: nc }] });
        }
    }

    return null;
}

// --- Path generation ---

function generatePath(inletRow, outletRow, minLength) {
    const maxTries = 50;

    for (let t = 0; t < maxTries; t++) {
        const path = attemptPath(inletRow, outletRow, minLength);
        if (path && path.length >= minLength) return path;
    }
    return null;
}

function attemptPath(inletRow, outletRow, minLength) {
    const visited = new Set();
    const path = [{ r: inletRow, c: 0 }];
    visited.add(`${inletRow},0`);

    const target = { r: outletRow, c: GRID_COLS - 1 };

    while (path.length < minLength * 2) {
        const cur = path[path.length - 1];

        if (cur.r === target.r && cur.c === target.c && path.length >= minLength) {
            return path;
        }

        const neighbors = getNeighbors(cur.r, cur.c, visited);

        if (neighbors.length === 0) {
            if (path.length <= 1) return null;
            path.pop();
            continue;
        }

        const prevDir = path.length > 1
            ? getDirection(path[path.length - 2], cur)
            : RIGHT;

        const weighted = weightNeighbors(neighbors, prevDir, cur, target, path.length, minLength);
        const next = pickWeighted(weighted);

        path.push(next);
        visited.add(`${next.r},${next.c}`);
    }

    return null;
}

function getNeighbors(r, c, visited) {
    const result = [];
    for (let d = 0; d < 4; d++) {
        const nr = r + DIR_DELTA[d][0];
        const nc = c + DIR_DELTA[d][1];
        if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
            if (!visited.has(`${nr},${nc}`)) {
                result.push({ r: nr, c: nc, dir: d });
            }
        }
    }
    return result;
}

function getDirection(from, to) {
    const dr = to.r - from.r;
    const dc = to.c - from.c;
    if (dr === -1) return TOP;
    if (dr === 1) return BOTTOM;
    if (dc === 1) return RIGHT;
    if (dc === -1) return LEFT;
    return RIGHT;
}

function weightNeighbors(neighbors, prevDir, cur, target, pathLen, minLen) {
    const weighted = [];
    const needMore = pathLen < minLen * 0.7;

    for (const n of neighbors) {
        let w = 1;
        const isTurn = n.dir !== prevDir;
        const isTowardTarget = (
            (n.dir === RIGHT && cur.c < target.c) ||
            (n.dir === LEFT && cur.c > target.c) ||
            (n.dir === BOTTOM && cur.r < target.r) ||
            (n.dir === TOP && cur.r > target.r)
        );

        if (isTurn) w *= 2.5;
        if (needMore && !isTowardTarget) w *= 2;
        if (!needMore && isTowardTarget) w *= 3;

        if (n.r === 0 || n.r === GRID_ROWS - 1 || n.c === 0 || n.c === GRID_COLS - 1) {
            w *= 0.6;
        }

        if (n.dir === OPPOSITE[prevDir]) w *= 0.3;

        weighted.push({ ...n, weight: w });
    }

    return weighted;
}

function pickWeighted(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item;
    }
    return items[items.length - 1];
}

// --- Obstacles ---

function placeObstacles(grid, pathSet, count) {
    const adjacent = new Set();
    const other = [];

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            if (pathSet.has(`${r},${c}`)) continue;
            let isAdj = false;
            for (let d = 0; d < 4; d++) {
                const nr = r + DIR_DELTA[d][0];
                const nc = c + DIR_DELTA[d][1];
                if (pathSet.has(`${nr},${nc}`)) {
                    isAdj = true;
                    break;
                }
            }
            if (isAdj) adjacent.add(`${r},${c}`);
            else other.push({ r, c });
        }
    }

    const adjList = Array.from(adjacent).map(s => {
        const [r, c] = s.split(',').map(Number);
        return { r, c };
    });
    shuffle(adjList);
    shuffle(other);

    const candidates = [...adjList, ...other];
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
        grid.setObstacle(candidates[i].r, candidates[i].c);
    }
}

// --- Trivial check ---

function findShortestPath(grid, inletRow, outletRow) {
    const queue = [{ r: inletRow, c: 0, dist: 1 }];
    const visited = new Set();
    visited.add(`${inletRow},0`);

    while (queue.length > 0) {
        const cur = queue.shift();

        if (cur.r === outletRow && cur.c === GRID_COLS - 1) {
            return cur.dist;
        }

        for (let d = 0; d < 4; d++) {
            const nr = cur.r + DIR_DELTA[d][0];
            const nc = cur.c + DIR_DELTA[d][1];
            const key = `${nr},${nc}`;
            if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS
                && !visited.has(key) && !grid.isObstacle(nr, nc)) {
                visited.add(key);
                queue.push({ r: nr, c: nc, dist: cur.dist + 1 });
            }
        }
    }

    return -1;
}

// --- Piece extraction (old style, for fallback only) ---

function extractPieces(path) {
    const counts = {};

    for (let i = 0; i < path.length; i++) {
        let entryDir, exitDir;

        if (i === 0) {
            entryDir = LEFT;
        } else {
            entryDir = OPPOSITE[getDirection(path[i - 1], path[i])];
        }

        if (i === path.length - 1) {
            exitDir = RIGHT;
        } else {
            exitDir = getDirection(path[i], path[i + 1]);
        }

        const piece = pieceForDirections(entryDir, exitDir);
        if (!piece) return null;

        counts[piece] = (counts[piece] || 0) + 1;
    }

    return counts;
}

// --- Distractors ---

function addDistractors(counts, cellCount, level) {
    let numDistractors;
    if (level === 2) {
        numDistractors = 2;
    } else if (level === 1) {
        numDistractors = Math.max(1, Math.ceil(cellCount * 0.05));
    } else {
        numDistractors = Math.max(1, Math.ceil(cellCount * DISTRACTOR_RATIO));
    }

    const usedTypes = Object.keys(counts);
    if (usedTypes.length === 0) return;

    for (let i = 0; i < numDistractors; i++) {
        const type = usedTypes[randInt(0, usedTypes.length - 1)];
        counts[type] = (counts[type] || 0) + 1;
    }
}

// --- Fallback minimal generator ---

function generateMinimal(inletRow, outletRow) {
    const grid = new Grid();
    const iRow = inletRow !== null ? inletRow : 3;
    const oRow = outletRow !== null ? outletRow : 3;

    const path = [];
    if (iRow === oRow) {
        for (let c = 0; c < GRID_COLS; c++) {
            path.push({ r: iRow, c });
        }
    } else {
        const midC = Math.floor(GRID_COLS / 2);
        for (let c = 0; c <= midC; c++) {
            path.push({ r: iRow, c });
        }
        const step = oRow > iRow ? 1 : -1;
        for (let r = iRow + step; r !== oRow; r += step) {
            path.push({ r, c: midC });
        }
        path.push({ r: oRow, c: midC });
        for (let c = midC + 1; c < GRID_COLS; c++) {
            path.push({ r: oRow, c });
        }
    }

    const pieceCounts = extractPieces(path);
    if (!pieceCounts) {
        const fallbackPath = [];
        for (let c = 0; c < GRID_COLS; c++) fallbackPath.push({ r: 3, c });
        const fbCounts = extractPieces(fallbackPath) || { STRAIGHT_H: 7 };
        return { grid, inletRow: 3, outletRow: 3, pieceCounts: fbCounts, path: fallbackPath };
    }
    addDistractors(pieceCounts, path.length, 0);

    return { grid, inletRow: iRow, outletRow: oRow, pieceCounts, path };
}

// --- Generate all 3 levels ---

/**
 * Level N's outlet row = Level N+1's inlet row.
 */
export function generateAllLevels() {
    const levels = [];

    let nextInlet = null;
    for (let i = 0; i < 3; i++) {
        const puzzle = generatePuzzle(i, nextInlet, null);
        levels.push(puzzle);
        nextInlet = puzzle.outletRow;
    }

    return levels;
}
