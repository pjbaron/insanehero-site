import { CONFIG } from './config.js';
import { tilePRNG } from './utils.js';

const { LAYOUT_SIZE } = CONFIG;
const MID         = Math.floor(LAYOUT_SIZE / 2);  // 4
const ROOM_RADIUS = 3;

// Cell counts for edge values 1, 2, 3.
// Edge 3 is full room width (2*ROOM_RADIUS+1) so rooms can flow together.
const CORR_CELLS = [0, 1, 3, 2 * ROOM_RADIUS + 1];

function corridorRange(w) {
  const cells = CORR_CELLS[w] ?? 1;
  return [MID - Math.floor((cells - 1) / 2), MID + Math.floor(cells / 2)];
}

// ─── Layout builders ──────────────────────────────────────────────────────────

// Full room: 5×5 central space + corridor stubs on each open edge.
export function buildLayout(edges) {
  const [N, E, S, W] = edges;
  const grid = Array.from({ length: LAYOUT_SIZE }, () => new Array(LAYOUT_SIZE).fill(false));

  for (let y = MID - ROOM_RADIUS; y <= MID + ROOM_RADIUS; y++)
    for (let x = MID - ROOM_RADIUS; x <= MID + ROOM_RADIUS; x++)
      grid[y][x] = true;

  if (N > 0) {
    const [lo, hi] = corridorRange(N);
    for (let y = 0; y < MID - ROOM_RADIUS; y++)
      for (let x = lo; x <= hi; x++) grid[y][x] = true;
  }
  if (S > 0) {
    const [lo, hi] = corridorRange(S);
    for (let y = MID + ROOM_RADIUS + 1; y < LAYOUT_SIZE; y++)
      for (let x = lo; x <= hi; x++) grid[y][x] = true;
  }
  if (E > 0) {
    const [lo, hi] = corridorRange(E);
    for (let x = MID + ROOM_RADIUS + 1; x < LAYOUT_SIZE; x++)
      for (let y = lo; y <= hi; y++) grid[y][x] = true;
  }
  if (W > 0) {
    const [lo, hi] = corridorRange(W);
    for (let x = 0; x < MID - ROOM_RADIUS; x++)
      for (let y = lo; y <= hi; y++) grid[y][x] = true;
  }
  return grid;
}

// Connector tile: straight corridor strip(s), no central room.
function buildConnLayout(edges) {
  const [N, E, S, W] = edges;
  const grid = Array.from({ length: LAYOUT_SIZE }, () => new Array(LAYOUT_SIZE).fill(false));

  if (E > 0 || W > 0) {
    const [lo, hi] = corridorRange(Math.max(E, W));
    for (let y = lo; y <= hi; y++)
      for (let x = 0; x < LAYOUT_SIZE; x++) grid[y][x] = true;
  }
  if (N > 0 || S > 0) {
    const [lo, hi] = corridorRange(Math.max(N, S));
    for (let x = lo; x <= hi; x++)
      for (let y = 0; y < LAYOUT_SIZE; y++) grid[y][x] = true;
  }
  return grid;
}

// ─── World generator ──────────────────────────────────────────────────────────

export function createWorldGen(globalSeed) {
  const memo = new Map();

  // Each connector owns its edge value from its own position's rng.
  // This is purely positional — the same value is returned regardless of
  // when or in what order tiles are generated, so no neighbour-lookup
  // ordering dependency can produce an inconsistency.
  function connectorValue(tx, ty) {
    const rng = tilePRNG(globalSeed, tx, ty);
    const r1 = rng(), r2 = rng();
    return r1 < 0.35 ? 0 : (Math.floor(r2 * 3) + 1);
  }

  function getTileEdges(tx, ty) {
    const key = `${tx},${ty}`;
    if (memo.has(key)) return memo.get(key);

    const evenX = (tx % 2 === 0);
    const evenY = (ty % 2 === 0);
    let edges;

    if (evenX && evenY) {
      // ── ROOM ──  All four edges come from the adjacent connector tiles.
      // connectorValue() is deterministic per-position, so rooms always agree
      // with their connectors no matter which was generated first.
      edges = [
        connectorValue(tx,   ty-1),   // N  ← V-CONN above
        connectorValue(tx+1, ty  ),   // E  ← H-CONN right
        connectorValue(tx,   ty+1),   // S  ← V-CONN below
        connectorValue(tx-1, ty  ),   // W  ← H-CONN left
      ];

    } else if (!evenX && evenY) {
      // ── H-CONN ──  E = W = own value; N = S = 0.
      const v = connectorValue(tx, ty);
      edges = [0, v, 0, v];

    } else if (evenX && !evenY) {
      // ── V-CONN ──  N = S = own value; E = W = 0.
      const v = connectorValue(tx, ty);
      edges = [v, 0, v, 0];

    } else {
      // ── CROSS ──  Always solid.
      edges = [0, 0, 0, 0];
    }

    memo.set(key, edges);
    return edges;
  }

  return {
    getTile:   (tx, ty) => getTileEdges(tx, ty),
    getLayout: (tx, ty) => {
      const edges  = getTileEdges(tx, ty);
      const isRoom = (tx % 2 === 0) && (ty % 2 === 0);
      return isRoom ? buildLayout(edges) : buildConnLayout(edges);
    },
    clear:   () => memo.clear(),
    getSeed: () => globalSeed,
  };
}
