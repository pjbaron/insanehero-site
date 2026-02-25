/**
 * Levels - Hand-tuned levels + procedural generation
 * All positions are percentages [0-1] of screen width/height
 * Global object (non-module), loaded before game modules
 */

var Levels = {
    /**
     * Each level definition:
     * - anchors: [{x, y}] percentage positions for anchor points
     * - platforms: [{x1,y1, x2,y2}] solid platforms survivors can't fall through
     * - rescueZone: {x, y, w, h} percentage-based rescue zone
     * - spawns: [{type, delay, x, vx}] survivor spawn sequence
     *   type: 'normal', 'heavy', 'floaty', 'twin'
     *   delay: seconds from level start
     *   x: horizontal position [0-1], vx: horizontal velocity factor
     * - maxLives: how many splats before game over
     * - par: target rope count for star rating
     */
    data: [
        // Level 1: Introduction - simple straight down drops, plenty of anchors
        {
            anchors: [
                {x: 0.1, y: 0.3}, {x: 0.9, y: 0.3},
                {x: 0.05, y: 0.5}, {x: 0.95, y: 0.5},
                {x: 0.1, y: 0.7}, {x: 0.9, y: 0.7},
                {x: 0.3, y: 0.4}, {x: 0.7, y: 0.4},
            ],
            platforms: [],
            rescueZone: {x: 0.25, y: 0.88, w: 0.5, h: 0.08},
            spawns: [
                {type: 'normal', delay: 1.0, x: 0.5, vx: 0},
                {type: 'normal', delay: 3.5, x: 0.35, vx: 0.1},
                {type: 'normal', delay: 6.0, x: 0.65, vx: -0.1},
                {type: 'normal', delay: 8.5, x: 0.5, vx: 0},
                {type: 'normal', delay: 10.0, x: 0.4, vx: 0.15},
            ],
            maxLives: 3,
            par: 4
        },
        // Level 2: Offset anchors, need to bounce sideways
        {
            anchors: [
                {x: 0.05, y: 0.25}, {x: 0.5, y: 0.25},
                {x: 0.5, y: 0.45}, {x: 0.95, y: 0.45},
                {x: 0.05, y: 0.6}, {x: 0.5, y: 0.6},
                {x: 0.3, y: 0.75}, {x: 0.7, y: 0.75},
            ],
            platforms: [
                {x1: 0.55, y1: 0.32, x2: 0.85, y2: 0.32}
            ],
            rescueZone: {x: 0.3, y: 0.88, w: 0.4, h: 0.08},
            spawns: [
                {type: 'normal', delay: 1.0, x: 0.25, vx: 0.1},
                {type: 'normal', delay: 3.0, x: 0.75, vx: -0.1},
                {type: 'normal', delay: 5.0, x: 0.5, vx: 0.2},
                {type: 'normal', delay: 7.0, x: 0.3, vx: 0},
                {type: 'normal', delay: 8.5, x: 0.7, vx: -0.15},
                {type: 'normal', delay: 10.0, x: 0.5, vx: 0},
            ],
            maxLives: 3,
            par: 5
        },
        // Level 3: Introduce heavy survivors - they snap ropes in 2 bounces
        {
            anchors: [
                {x: 0.05, y: 0.3}, {x: 0.45, y: 0.3},
                {x: 0.55, y: 0.3}, {x: 0.95, y: 0.3},
                {x: 0.2, y: 0.5}, {x: 0.8, y: 0.5},
                {x: 0.05, y: 0.65}, {x: 0.95, y: 0.65},
                {x: 0.35, y: 0.75}, {x: 0.65, y: 0.75},
            ],
            platforms: [],
            rescueZone: {x: 0.2, y: 0.88, w: 0.6, h: 0.08},
            spawns: [
                {type: 'normal', delay: 1.0, x: 0.3, vx: 0},
                {type: 'heavy', delay: 3.0, x: 0.5, vx: 0},
                {type: 'normal', delay: 5.0, x: 0.7, vx: -0.1},
                {type: 'heavy', delay: 7.0, x: 0.4, vx: 0.1},
                {type: 'normal', delay: 9.0, x: 0.6, vx: 0},
                {type: 'normal', delay: 10.5, x: 0.3, vx: 0.2},
                {type: 'heavy', delay: 12.0, x: 0.5, vx: 0},
            ],
            maxLives: 3,
            par: 6
        },
        // Level 4: Floaty survivors - slow fall, drift sideways
        {
            anchors: [
                {x: 0.05, y: 0.2}, {x: 0.4, y: 0.2},
                {x: 0.6, y: 0.2}, {x: 0.95, y: 0.2},
                {x: 0.15, y: 0.45}, {x: 0.85, y: 0.45},
                {x: 0.05, y: 0.6}, {x: 0.5, y: 0.6},
                {x: 0.5, y: 0.75}, {x: 0.95, y: 0.75},
            ],
            platforms: [
                {x1: 0.3, y1: 0.35, x2: 0.7, y2: 0.35}
            ],
            rescueZone: {x: 0.3, y: 0.88, w: 0.4, h: 0.08},
            spawns: [
                {type: 'floaty', delay: 1.0, x: 0.3, vx: 0.3},
                {type: 'normal', delay: 3.0, x: 0.5, vx: 0},
                {type: 'floaty', delay: 4.5, x: 0.7, vx: -0.25},
                {type: 'normal', delay: 6.5, x: 0.4, vx: 0.1},
                {type: 'floaty', delay: 8.0, x: 0.2, vx: 0.4},
                {type: 'heavy', delay: 10.0, x: 0.5, vx: 0},
                {type: 'floaty', delay: 11.5, x: 0.8, vx: -0.3},
            ],
            maxLives: 2,
            par: 6
        },
        // Level 5: Twins + everything - splitting survivors
        {
            anchors: [
                {x: 0.05, y: 0.2}, {x: 0.35, y: 0.15},
                {x: 0.65, y: 0.15}, {x: 0.95, y: 0.2},
                {x: 0.1, y: 0.4}, {x: 0.5, y: 0.35},
                {x: 0.9, y: 0.4},
                {x: 0.05, y: 0.6}, {x: 0.5, y: 0.55},
                {x: 0.95, y: 0.6},
                {x: 0.2, y: 0.75}, {x: 0.8, y: 0.75},
            ],
            platforms: [
                {x1: 0.2, y1: 0.3, x2: 0.45, y2: 0.3},
                {x1: 0.55, y1: 0.48, x2: 0.8, y2: 0.48}
            ],
            rescueZone: {x: 0.25, y: 0.88, w: 0.5, h: 0.08},
            spawns: [
                {type: 'normal', delay: 1.0, x: 0.5, vx: 0},
                {type: 'twin', delay: 3.0, x: 0.4, vx: 0.1},
                {type: 'heavy', delay: 5.0, x: 0.6, vx: 0},
                {type: 'twin', delay: 7.0, x: 0.5, vx: -0.1},
                {type: 'floaty', delay: 8.5, x: 0.3, vx: 0.2},
                {type: 'normal', delay: 10.0, x: 0.7, vx: -0.15},
                {type: 'twin', delay: 11.5, x: 0.5, vx: 0},
                {type: 'heavy', delay: 13.0, x: 0.4, vx: 0.1},
            ],
            maxLives: 2,
            par: 8
        }
    ],

    /**
     * Generate a procedural level for levels beyond the hand-tuned 5
     * Difficulty scales with level number
     */
    generate(levelNum) {
        var diff = Math.min((levelNum - 5) / 10, 1); // 0 to 1 over 10 levels
        var rng = this._seededRandom(levelNum * 137);

        // Anchor count: 8-14
        var anchorCount = 8 + Math.floor(diff * 6);
        var anchors = [];

        // Wall anchors on left and right edges
        var rows = 3 + Math.floor(diff * 2);
        for (var row = 0; row < rows; row++) {
            var rowY = 0.15 + (row / (rows)) * 0.55;
            anchors.push({x: 0.05, y: rowY + (rng() - 0.5) * 0.05});
            anchors.push({x: 0.95, y: rowY + (rng() - 0.5) * 0.05});
        }

        // Interior anchors
        var interiorCount = anchorCount - rows * 2;
        for (var i = 0; i < interiorCount; i++) {
            anchors.push({
                x: 0.15 + rng() * 0.7,
                y: 0.2 + rng() * 0.5
            });
        }

        // Platforms: 0-3 based on difficulty
        var platforms = [];
        var platCount = Math.floor(diff * 3);
        for (var i = 0; i < platCount; i++) {
            var px = 0.15 + rng() * 0.4;
            var py = 0.25 + rng() * 0.35;
            var pw = 0.15 + rng() * 0.15;
            platforms.push({x1: px, y1: py, x2: px + pw, y2: py});
        }

        // Rescue zone narrows with difficulty
        var zoneW = Math.max(0.2, 0.5 - diff * 0.25);
        var zoneX = 0.5 - zoneW / 2;

        // Spawns: more, faster, mixed types
        var spawns = [];
        var survivorCount = 6 + Math.floor(diff * 6);
        var spawnInterval = Math.max(1.2, 2.5 - diff * 1.2);
        var types = ['normal', 'normal', 'heavy', 'floaty'];
        if (diff > 0.3) types.push('twin');
        if (diff > 0.5) types.push('heavy', 'twin');

        for (var i = 0; i < survivorCount; i++) {
            spawns.push({
                type: types[Math.floor(rng() * types.length)],
                delay: 1.0 + i * spawnInterval + rng() * 0.5,
                x: 0.15 + rng() * 0.7,
                vx: (rng() - 0.5) * (0.2 + diff * 0.3)
            });
        }

        return {
            anchors: anchors,
            platforms: platforms,
            rescueZone: {x: zoneX, y: 0.88, w: zoneW, h: 0.08},
            spawns: spawns,
            maxLives: Math.max(1, 3 - Math.floor(diff * 2)),
            par: survivorCount + Math.floor(diff * 3)
        };
    },

    /**
     * Get level data (hand-tuned or procedural)
     */
    get(levelNum) {
        if (levelNum < this.data.length) {
            return this.data[levelNum];
        }
        return this.generate(levelNum);
    },

    /** Simple seeded PRNG for reproducible procedural levels */
    _seededRandom(seed) {
        var s = seed;
        return function() {
            s = (s * 1664525 + 1013904223) & 0x7fffffff;
            return s / 0x7fffffff;
        };
    }
};
