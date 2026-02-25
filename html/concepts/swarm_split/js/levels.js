/**
 * Levels - Hand-crafted level data + procedural generation
 * Virtual coordinate system: 800x600
 *
 * Each level defines:
 *   critters: starting count for player
 *   timeLimit: seconds
 *   bases: [{x,y,garrison,spawnRate,radius}]
 *   hazards: [{x,y,w,h}] optional danger zones
 *   playerStart: {x,y}
 */

var Levels = [
    // Level 1: Tutorial - single weak base
    {
        critters: 15,
        timeLimit: 60,
        bases: [
            { x: 600, y: 300, garrison: 8, spawnRate: 0, radius: 40 }
        ],
        hazards: [],
        playerStart: { x: 150, y: 300 }
    },
    // Level 2: Two bases, still easy
    {
        critters: 20,
        timeLimit: 60,
        bases: [
            { x: 600, y: 150, garrison: 8, spawnRate: 0, radius: 40 },
            { x: 600, y: 450, garrison: 8, spawnRate: 0, radius: 40 }
        ],
        hazards: [],
        playerStart: { x: 150, y: 300 }
    },
    // Level 3: Spread out bases, need to split
    {
        critters: 25,
        timeLimit: 60,
        bases: [
            { x: 200, y: 100, garrison: 10, spawnRate: 0, radius: 40 },
            { x: 650, y: 300, garrison: 10, spawnRate: 0, radius: 40 },
            { x: 200, y: 500, garrison: 8, spawnRate: 0, radius: 40 }
        ],
        hazards: [],
        playerStart: { x: 400, y: 300 }
    },
    // Level 4: Bases that spawn reinforcements
    {
        critters: 25,
        timeLimit: 60,
        bases: [
            { x: 600, y: 200, garrison: 12, spawnRate: 0.5, radius: 40 },
            { x: 600, y: 400, garrison: 12, spawnRate: 0.5, radius: 40 }
        ],
        hazards: [],
        playerStart: { x: 150, y: 300 }
    },
    // Level 5: First hazard zone
    {
        critters: 30,
        timeLimit: 60,
        bases: [
            { x: 150, y: 150, garrison: 10, spawnRate: 0.3, radius: 40 },
            { x: 650, y: 150, garrison: 10, spawnRate: 0.3, radius: 40 },
            { x: 400, y: 480, garrison: 12, spawnRate: 0.5, radius: 40 }
        ],
        hazards: [
            { x: 340, y: 230, w: 120, h: 140 }
        ],
        playerStart: { x: 400, y: 100 }
    },
    // Level 6: Tight corridors between hazards
    {
        critters: 30,
        timeLimit: 60,
        bases: [
            { x: 130, y: 130, garrison: 12, spawnRate: 0.4, radius: 38 },
            { x: 670, y: 130, garrison: 12, spawnRate: 0.4, radius: 38 },
            { x: 400, y: 500, garrison: 15, spawnRate: 0.6, radius: 42 }
        ],
        hazards: [
            { x: 250, y: 200, w: 80, h: 200 },
            { x: 470, y: 200, w: 80, h: 200 }
        ],
        playerStart: { x: 400, y: 130 }
    },
    // Level 7: Four bases, must prioritize
    {
        critters: 35,
        timeLimit: 60,
        bases: [
            { x: 130, y: 130, garrison: 10, spawnRate: 0.3, radius: 36 },
            { x: 670, y: 130, garrison: 10, spawnRate: 0.3, radius: 36 },
            { x: 130, y: 470, garrison: 12, spawnRate: 0.5, radius: 36 },
            { x: 670, y: 470, garrison: 14, spawnRate: 0.6, radius: 40 }
        ],
        hazards: [
            { x: 360, y: 260, w: 80, h: 80 }
        ],
        playerStart: { x: 400, y: 300 }
    },
    // Level 8: Heavy garrison, need captured base reinforcements
    {
        critters: 35,
        timeLimit: 75,
        bases: [
            { x: 200, y: 150, garrison: 8, spawnRate: 0.8, radius: 36 },
            { x: 600, y: 150, garrison: 15, spawnRate: 0.5, radius: 38 },
            { x: 200, y: 450, garrison: 15, spawnRate: 0.5, radius: 38 },
            { x: 600, y: 450, garrison: 20, spawnRate: 0.7, radius: 42 }
        ],
        hazards: [
            { x: 350, y: 50, w: 100, h: 120 },
            { x: 350, y: 430, w: 100, h: 120 }
        ],
        playerStart: { x: 400, y: 300 }
    },
    // Level 9: Five bases, hazard maze
    {
        critters: 40,
        timeLimit: 75,
        bases: [
            { x: 120, y: 100, garrison: 12, spawnRate: 0.4, radius: 36 },
            { x: 680, y: 100, garrison: 12, spawnRate: 0.4, radius: 36 },
            { x: 400, y: 300, garrison: 18, spawnRate: 0.6, radius: 42 },
            { x: 120, y: 500, garrison: 14, spawnRate: 0.5, radius: 36 },
            { x: 680, y: 500, garrison: 14, spawnRate: 0.5, radius: 36 }
        ],
        hazards: [
            { x: 240, y: 180, w: 60, h: 240 },
            { x: 500, y: 180, w: 60, h: 240 }
        ],
        playerStart: { x: 400, y: 550 }
    },
    // Level 10: Final challenge
    {
        critters: 50,
        timeLimit: 90,
        bases: [
            { x: 100, y: 100, garrison: 15, spawnRate: 0.5, radius: 38 },
            { x: 700, y: 100, garrison: 15, spawnRate: 0.5, radius: 38 },
            { x: 400, y: 300, garrison: 25, spawnRate: 0.8, radius: 46 },
            { x: 100, y: 500, garrison: 18, spawnRate: 0.6, radius: 38 },
            { x: 700, y: 500, garrison: 18, spawnRate: 0.6, radius: 38 }
        ],
        hazards: [
            { x: 230, y: 160, w: 70, h: 120 },
            { x: 500, y: 160, w: 70, h: 120 },
            { x: 230, y: 340, w: 70, h: 120 },
            { x: 500, y: 340, w: 70, h: 120 }
        ],
        playerStart: { x: 400, y: 560 }
    }
];

/** Generate a procedural level for levels beyond 10 */
function generateLevel(index) {
    var numBases = Math.min(3 + Math.floor(index / 2), 7);
    var numHazards = Math.min(Math.floor(index / 3), 5);
    var critters = Math.min(30 + index * 3, 80);
    var timeLimit = Math.min(60 + index * 3, 120);
    var bases = [];
    var hazards = [];

    // Place bases in a spread pattern
    for (var i = 0; i < numBases; i++) {
        var angle = (i / numBases) * Math.PI * 2;
        var dist = 180 + Math.random() * 80;
        var bx = 400 + Math.cos(angle) * dist;
        var by = 300 + Math.sin(angle) * dist;
        bx = Math.max(80, Math.min(720, bx));
        by = Math.max(80, Math.min(520, by));
        var garrison = 10 + Math.floor(index * 1.5) + Math.floor(Math.random() * 5);
        var spawnRate = 0.3 + Math.random() * 0.5 + index * 0.02;
        bases.push({
            x: bx, y: by,
            garrison: garrison,
            spawnRate: Math.min(spawnRate, 1.5),
            radius: 34 + Math.floor(Math.random() * 12)
        });
    }

    // Place hazards avoiding bases
    for (var h = 0; h < numHazards; h++) {
        var hx, hy, hw, hh, valid;
        for (var attempt = 0; attempt < 20; attempt++) {
            hw = 60 + Math.floor(Math.random() * 80);
            hh = 60 + Math.floor(Math.random() * 80);
            hx = 100 + Math.floor(Math.random() * (600 - hw));
            hy = 100 + Math.floor(Math.random() * (400 - hh));
            valid = true;
            for (var b = 0; b < bases.length; b++) {
                var bx2 = bases[b].x;
                var by2 = bases[b].y;
                if (bx2 > hx - 60 && bx2 < hx + hw + 60 && by2 > hy - 60 && by2 < hy + hh + 60) {
                    valid = false;
                    break;
                }
            }
            if (valid) break;
        }
        if (valid) {
            hazards.push({ x: hx, y: hy, w: hw, h: hh });
        }
    }

    return {
        critters: critters,
        timeLimit: timeLimit,
        bases: bases,
        hazards: hazards,
        playerStart: { x: 400, y: 550 }
    };
}

function getLevel(index) {
    if (index < Levels.length) return Levels[index];
    return generateLevel(index);
}
