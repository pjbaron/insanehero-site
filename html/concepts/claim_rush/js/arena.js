/**
 * Arena - Grid state, territory claiming via flood fill
 * Cell values: 0=neutral, 1=player, 2+=rival territories
 * Negative values = trail (-1=player trail, -2-=rival trail)
 */

const CELL_NEUTRAL = 0;
const CELL_PLAYER = 1;
// Rival cells: 2, 3, 4, 5, 6...

const Arena = {
    W: 80,
    H: 80,
    grid: null,
    trailGrid: null, // separate grid for active trails
    totalCells: 0,
    playerCells: 0,

    init(w, h) {
        this.W = w || 80;
        this.H = h || 80;
        this.totalCells = this.W * this.H;
        this.grid = new Int8Array(this.totalCells);
        this.trailGrid = new Int8Array(this.totalCells);
        this.playerCells = 0;
    },

    idx(x, y) {
        return y * this.W + x;
    },

    get(x, y) {
        if (x < 0 || x >= this.W || y < 0 || y >= this.H) return -99;
        return this.grid[y * this.W + x];
    },

    set(x, y, val) {
        if (x < 0 || x >= this.W || y < 0 || y >= this.H) return;
        this.grid[y * this.W + x] = val;
    },

    getTrail(x, y) {
        if (x < 0 || x >= this.W || y < 0 || y >= this.H) return 0;
        return this.trailGrid[y * this.W + x];
    },

    setTrail(x, y, val) {
        if (x < 0 || x >= this.W || y < 0 || y >= this.H) return;
        this.trailGrid[y * this.W + x] = val;
    },

    clearTrail(owner) {
        for (var i = 0; i < this.totalCells; i++) {
            if (this.trailGrid[i] === owner) this.trailGrid[i] = 0;
        }
    },

    /** Set up initial player territory - a small square at bottom center */
    setupPlayerStart() {
        var cx = Math.floor(this.W / 2);
        var cy = this.H - 5;
        var size = 3;
        for (var dy = -size; dy <= size; dy++) {
            for (var dx = -size; dx <= size; dx++) {
                var gx = cx + dx;
                var gy = cy + dy;
                if (gx >= 0 && gx < this.W && gy >= 0 && gy < this.H) {
                    this.set(gx, gy, CELL_PLAYER);
                }
            }
        }
        this.recountPlayer();
        return { x: cx, y: cy };
    },

    recountPlayer() {
        var count = 0;
        for (var i = 0; i < this.totalCells; i++) {
            if (this.grid[i] === CELL_PLAYER) count++;
        }
        this.playerCells = count;
        return count;
    },

    getPlayerPercent() {
        return (this.playerCells / this.totalCells) * 100;
    },

    /**
     * Claim territory when player closes a loop.
     * trail = array of {x,y} positions the player walked.
     * rivals = array of {gx,gy} rival grid positions.
     *
     * Algorithm:
     * 1. Convert trail to player territory
     * 2. BFS flood from each rival position on the non-player side
     * 3. Everything NOT reached by rival flood AND not already claimed = player territory
     */
    claimTerritory(trail, rivals) {
        var W = this.W, H = this.H;
        var claimed = [];

        // Step 1: Mark trail cells as player territory
        for (var i = 0; i < trail.length; i++) {
            var tx = trail[i].x, ty = trail[i].y;
            if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
                if (this.grid[ty * W + tx] !== CELL_PLAYER) {
                    this.grid[ty * W + tx] = CELL_PLAYER;
                    claimed.push({ x: tx, y: ty });
                }
            }
        }

        // Step 2: BFS flood fill from rival positions to find "outside" cells
        // Cells reachable from any rival (that aren't player territory) are "outside"
        var visited = new Uint8Array(this.totalCells);

        // Also flood from edges for safety (areas connected to the border stay unclaimed)
        var queue = [];

        // Seed from all rivals
        for (var r = 0; r < rivals.length; r++) {
            var rx = rivals[r].gx, ry = rivals[r].gy;
            if (rx >= 0 && rx < W && ry >= 0 && ry < H) {
                var ri = ry * W + rx;
                if (this.grid[ri] !== CELL_PLAYER && !visited[ri]) {
                    visited[ri] = 1;
                    queue.push(rx, ry);
                }
            }
        }

        // Seed from all 4 edges
        for (var x = 0; x < W; x++) {
            if (this.grid[x] !== CELL_PLAYER && !visited[x]) { visited[x] = 1; queue.push(x, 0); }
            var bi = (H - 1) * W + x;
            if (this.grid[bi] !== CELL_PLAYER && !visited[bi]) { visited[bi] = 1; queue.push(x, H - 1); }
        }
        for (var y = 1; y < H - 1; y++) {
            var li = y * W;
            if (this.grid[li] !== CELL_PLAYER && !visited[li]) { visited[li] = 1; queue.push(0, y); }
            var rri = y * W + W - 1;
            if (this.grid[rri] !== CELL_PLAYER && !visited[rri]) { visited[rri] = 1; queue.push(W - 1, y); }
        }

        // BFS
        var head = 0;
        var dx4 = [1, -1, 0, 0];
        var dy4 = [0, 0, 1, -1];
        while (head < queue.length) {
            var qx = queue[head++];
            var qy = queue[head++];
            for (var d = 0; d < 4; d++) {
                var nx = qx + dx4[d];
                var ny = qy + dy4[d];
                if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                var ni = ny * W + nx;
                if (visited[ni]) continue;
                if (this.grid[ni] === CELL_PLAYER) continue;
                visited[ni] = 1;
                queue.push(nx, ny);
            }
        }

        // Step 3: Everything not visited and not already player = new claim
        for (var y = 0; y < H; y++) {
            for (var x = 0; x < W; x++) {
                var ci = y * W + x;
                if (!visited[ci] && this.grid[ci] !== CELL_PLAYER) {
                    this.grid[ci] = CELL_PLAYER;
                    claimed.push({ x: x, y: y });
                }
            }
        }

        this.recountPlayer();
        return claimed;
    },

    /** Check if position is on player territory */
    isPlayerTerritory(x, y) {
        return this.get(x, y) === CELL_PLAYER;
    },

    /** Check if position is on any active trail */
    isTrail(x, y, owner) {
        if (owner !== undefined) return this.getTrail(x, y) === owner;
        return this.getTrail(x, y) !== 0;
    },

    /** Find a safe spawn position for a rival (not on player territory) */
    findRivalSpawn() {
        var attempts = 200;
        while (attempts-- > 0) {
            var x = Math.floor(Math.random() * (this.W - 10)) + 5;
            var y = Math.floor(Math.random() * (this.H - 10)) + 5;
            if (this.get(x, y) !== CELL_PLAYER && this.getTrail(x, y) === 0) {
                return { x: x, y: y };
            }
        }
        // Fallback: top-left area
        return { x: 5, y: 5 };
    }
};
