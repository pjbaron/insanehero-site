/**
 * Levels - 40 level definitions across 4 worlds
 * Each level returns objects to place: boulders, ropes, platforms, camps, etc.
 *
 * World 1 (1-10): Grasslands - basics: single ropes, simple drops
 * World 2 (11-20): Caves - explosive boulders, breakables, seesaws
 * World 3 (21-30): Mountains - heavy boulders, multi-rope, wind?
 * World 4 (31-40): Volcano - splitting boulders, lava, complex chains
 *
 * Star ratings: 1 star = any clear, 2 star = par cuts, 3 star = minimum cuts
 */

var Levels = {
    count: 40,

    // World theme colors
    themes: [
        { // World 1: Grasslands
            bg1: '#87ceeb', bg2: '#4a8f4a', ground: '#3a6a2a',
            name: 'Grasslands'
        },
        { // World 2: Caves
            bg1: '#2a2a3a', bg2: '#3a3a4a', ground: '#4a4a5a',
            name: 'Caverns'
        },
        { // World 3: Mountains
            bg1: '#6a8aaa', bg2: '#8a9aaa', ground: '#5a5a6a',
            name: 'Mountains'
        },
        { // World 4: Volcano
            bg1: '#3a1a0a', bg2: '#5a2a0a', ground: '#2a1a0a',
            name: 'Volcano'
        }
    ],

    getWorld: function(levelNum) {
        return Math.floor((levelNum - 1) / 10);
    },

    getTheme: function(levelNum) {
        return this.themes[this.getWorld(levelNum)];
    },

    getWorldName: function(levelNum) {
        return this.themes[this.getWorld(levelNum)].name;
    },

    // Star thresholds: [3-star max cuts, 2-star max cuts]
    // 1 star = just complete it
    getStarThresholds: function(levelNum) {
        var data = this.levelData[levelNum - 1];
        return data ? data.stars : [1, 2];
    },

    getStars: function(levelNum, cuts) {
        var t = this.getStarThresholds(levelNum);
        if (cuts <= t[0]) return 3;
        if (cuts <= t[1]) return 2;
        return 1;
    },

    // Build a level - returns { boulders, ropes, platforms, camps, breakables, seesaws, walls, cradles }
    build: function(levelNum) {
        var data = this.levelData[levelNum - 1];
        if (!data) return this.buildDefault(levelNum);
        return data.build();
    },

    buildDefault: function(levelNum) {
        // Fallback procedural level for undefined levels
        var w = Physics.WORLD_W;
        var h = Physics.WORLD_H;
        var boulders = [];
        var ropes = [];
        var platforms = [];
        var camps = [];
        var breakables = [];
        var seesaws = [];
        var walls = [];
        var cradles = [];

        // Ground
        walls.push(GameObjects.createWall(w / 2, h - 5, w, 10));
        // Side walls
        walls.push(GameObjects.createWall(-5, h / 2, 10, h));
        walls.push(GameObjects.createWall(w + 5, h / 2, 10, h));

        // Random camp at bottom
        var campX = 200 + Math.random() * 400;
        camps.push(GameObjects.createGoblinCamp(campX, h - 35, 50, 30));

        // Boulder on rope
        var bx = campX + (Math.random() - 0.5) * 100;
        var boulder = GameObjects.createBoulder(bx, 100, 20);
        boulders.push(boulder);
        ropes.push(GameObjects.createRope(bx, 30, boulder, { x: 0, y: 0 }, 70, 'rope_1'));

        // Platform to guide
        platforms.push(GameObjects.createPlatform(campX - 60, h - 100, 120, 12, 0.2));

        return {
            boulders: boulders, ropes: ropes, platforms: platforms,
            camps: camps, breakables: breakables, seesaws: seesaws,
            walls: walls, cradles: cradles,
            stars: [1, 2]
        };
    },

    // ---- LEVEL DEFINITIONS ----
    levelData: [
        // ===== WORLD 1: GRASSLANDS (Levels 1-10) =====

        // Level 1: "First Cut" - single rope, single camp, direct drop
        {
            stars: [1, 1],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                var camp = GameObjects.createGoblinCamp(400, h - 35, 60, 30);
                result.camps.push(camp);

                var boulder = GameObjects.createBoulder(400, 120, 22);
                result.boulders.push(boulder);
                result.ropes.push(GameObjects.createRope(400, 40, boulder, { x: 0, y: 0 }, 80, 'rope_1'));

                return result;
            }
        },

        // Level 2: "Angle Drop" - boulder offset from camp, needs to roll
        {
            stars: [1, 1],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                var camp = GameObjects.createGoblinCamp(500, h - 35, 60, 30);
                result.camps.push(camp);

                var boulder = GameObjects.createBoulder(300, 130, 22);
                result.boulders.push(boulder);
                result.ropes.push(GameObjects.createRope(300, 40, boulder, { x: 0, y: 0 }, 90, 'rope_1'));

                // Ramp to guide boulder to camp
                result.platforms.push(GameObjects.createPlatform(400, h - 120, 200, 12, 0.25));

                return result;
            }
        },

        // Level 3: "Two Targets" - one boulder, two camps, need the ramp
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(250, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(550, h - 35, 50, 30));

                var b1 = GameObjects.createBoulder(250, 100, 20);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(250, 30, b1, { x: 0, y: 0 }, 70, 'rope_1'));

                var b2 = GameObjects.createBoulder(550, 100, 20);
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(550, 30, b2, { x: 0, y: 0 }, 70, 'rope_2'));

                return result;
            }
        },

        // Level 4: "Chain Reaction" - cut one rope, boulder hits seesaw, launches second boulder
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));

                // Heavy boulder on rope (left side)
                var b1 = GameObjects.createBoulder(200, 100, 25, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 30, b1, { x: 0, y: 0 }, 70, 'rope_1'));

                // Seesaw in middle
                result.seesaws.push(GameObjects.createSeesaw(350, h - 80, 160, 10));

                // Small boulder sitting on right end of seesaw
                var b2 = GameObjects.createBoulder(410, h - 110, 18);
                result.boulders.push(b2);

                // Ramp to guide b1 to seesaw left end
                result.platforms.push(GameObjects.createPlatform(250, h - 160, 120, 10, 0.3));

                return result;
            }
        },

        // Level 5: "Double Drop" - two ropes holding one boulder, cut both
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 60, 30));

                var boulder = GameObjects.createBoulder(400, 150, 24);
                result.boulders.push(boulder);
                result.ropes.push(GameObjects.createRope(340, 40, boulder, { x: -15, y: 0 }, 100, 'rope_1'));
                result.ropes.push(GameObjects.createRope(460, 40, boulder, { x: 15, y: 0 }, 100, 'rope_2'));

                return result;
            }
        },

        // Level 6: "The Bridge" - boulder on a breakable platform over camp
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));

                // Breakable bridge
                result.breakables.push(GameObjects.createBreakable(400, 250, 120, 10));

                // Boulder on rope above the bridge
                var boulder = GameObjects.createBoulder(400, 100, 22);
                result.boulders.push(boulder);
                result.ropes.push(GameObjects.createRope(400, 30, boulder, { x: 0, y: 0 }, 70, 'rope_1'));

                // Side platforms supporting nothing - just visual context
                result.platforms.push(GameObjects.createPlatform(250, 250, 80, 12, 0));
                result.platforms.push(GameObjects.createPlatform(550, 250, 80, 12, 0));

                return result;
            }
        },

        // Level 7: "Zigzag" - boulder bounces off angled platforms
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(550, h - 35, 50, 30));

                var boulder = GameObjects.createBoulder(200, 80, 20);
                result.boulders.push(boulder);
                result.ropes.push(GameObjects.createRope(200, 25, boulder, { x: 0, y: 0 }, 55, 'rope_1'));

                // Zigzag ramps
                result.platforms.push(GameObjects.createPlatform(300, 220, 140, 10, 0.3));
                result.platforms.push(GameObjects.createPlatform(500, 340, 140, 10, -0.3));
                result.platforms.push(GameObjects.createPlatform(400, 460, 140, 10, 0.2));

                return result;
            }
        },

        // Level 8: "Timing" - two boulders, two camps, order matters
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));

                // Left boulder - direct drop
                var b1 = GameObjects.createBoulder(200, 80, 20);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 25, b1, { x: 0, y: 0 }, 55, 'rope_1'));

                // Right boulder - needs to roll via ramp
                var b2 = GameObjects.createBoulder(450, 80, 20);
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(450, 25, b2, { x: 0, y: 0 }, 55, 'rope_2'));

                // Ramp for right boulder
                result.platforms.push(GameObjects.createPlatform(530, 250, 160, 10, 0.35));

                // Platform that right boulder passes - creates timing element
                result.platforms.push(GameObjects.createPlatform(350, 180, 80, 10, 0));

                return result;
            }
        },

        // Level 9: "Domino" - chain of boulders on cradles
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(650, h - 35, 50, 30));

                // Boulder on rope (leftmost)
                var b1 = GameObjects.createBoulder(150, 100, 20);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(150, 30, b1, { x: 0, y: 0 }, 70, 'rope_1'));

                // Cascading platforms - staircase down to the right
                result.platforms.push(GameObjects.createPlatform(250, 250, 100, 10, 0.15));
                result.platforms.push(GameObjects.createPlatform(400, 350, 100, 10, 0.15));
                result.platforms.push(GameObjects.createPlatform(550, 450, 100, 10, 0.15));

                // Boulders sitting on platforms - will get knocked off
                var b2 = GameObjects.createBoulder(220, 230, 16);
                result.boulders.push(b2);
                var b3 = GameObjects.createBoulder(370, 330, 16);
                result.boulders.push(b3);

                return result;
            }
        },

        // Level 10: "Boss Puzzle" - 3 camps, 2 boulders, seesaw + breakable
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(150, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(650, h - 35, 50, 30));

                // Left boulder on rope
                var b1 = GameObjects.createBoulder(150, 80, 22);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(150, 25, b1, { x: 0, y: 0 }, 55, 'rope_1'));

                // Right boulder on rope (higher)
                var b2 = GameObjects.createBoulder(650, 60, 22);
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(650, 20, b2, { x: 0, y: 0 }, 40, 'rope_2'));

                // Seesaw in center
                result.seesaws.push(GameObjects.createSeesaw(400, h - 100, 180, 10));

                // Breakable over middle camp
                result.breakables.push(GameObjects.createBreakable(400, 300, 100, 10));

                // Boulder on the breakable
                var b3 = GameObjects.createBoulder(400, 280, 18);
                result.boulders.push(b3);

                // Ramp from left to seesaw
                result.platforms.push(GameObjects.createPlatform(250, h - 180, 140, 10, 0.25));

                return result;
            }
        },

        // ===== WORLD 2: CAVERNS (Levels 11-20) =====
        // Introduces explosive boulders

        // Level 11: "Kaboom" - first explosive boulder
        {
            stars: [1, 1],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(300, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(500, h - 35, 50, 30));

                // Explosive boulder
                var b1 = GameObjects.createBoulder(400, 100, 22, 'explosive');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(400, 30, b1, { x: 0, y: 0 }, 70, 'rope_1'));

                // Platform between the two camps
                result.platforms.push(GameObjects.createPlatform(400, h - 80, 60, 10, 0));

                return result;
            }
        },

        // Level 12: "Cave In"
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));

                var b1 = GameObjects.createBoulder(200, 80, 20);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 25, b1, { x: 0, y: 0 }, 55, 'rope_1'));

                // Breakable ceiling that holds second boulder
                result.breakables.push(GameObjects.createBreakable(400, 200, 80, 10));
                var b2 = GameObjects.createBoulder(400, 180, 20, 'explosive');
                result.boulders.push(b2);

                // Ramp from left to breakable
                result.platforms.push(GameObjects.createPlatform(300, 150, 100, 10, 0.2));

                return result;
            }
        },

        // Level 13: "Deep Drop"
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 60, 30));

                var b1 = GameObjects.createBoulder(200, 60, 24);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 20, b1, { x: 0, y: 0 }, 40, 'rope_1'));

                // Vertical shaft with alternating ledges
                result.platforms.push(GameObjects.createPlatform(300, 180, 100, 10, 0.3));
                result.platforms.push(GameObjects.createPlatform(500, 300, 100, 10, -0.3));
                result.platforms.push(GameObjects.createPlatform(400, 420, 120, 10, 0.2));

                return result;
            }
        },

        // Level 14: "Seesaw Slam"
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));

                // Heavy boulder to slam seesaw
                var b1 = GameObjects.createBoulder(350, 60, 26, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(350, 20, b1, { x: 0, y: 0 }, 40, 'rope_1'));

                // Seesaw
                result.seesaws.push(GameObjects.createSeesaw(400, h - 90, 200, 10));

                // Boulder on right end of seesaw
                var b2 = GameObjects.createBoulder(480, h - 120, 18, 'explosive');
                result.boulders.push(b2);

                // Ramp for explosive to reach far camp
                result.platforms.push(GameObjects.createPlatform(550, h - 200, 120, 10, 0.1));

                // Platform on left to guide heavy boulder back
                result.platforms.push(GameObjects.createPlatform(250, 300, 120, 10, -0.2));

                return result;
            }
        },

        // Level 15: "Crystal Cavern"
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));

                var b1 = GameObjects.createBoulder(400, 60, 20);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(350, 20, b1, { x: -10, y: 0 }, 40, 'rope_1'));
                result.ropes.push(GameObjects.createRope(450, 20, b1, { x: 10, y: 0 }, 40, 'rope_2'));

                // Breakable in middle
                result.breakables.push(GameObjects.createBreakable(400, 200, 60, 10));

                // Boulder under breakable
                var b2 = GameObjects.createBoulder(400, 250, 18, 'explosive');
                result.boulders.push(b2);

                // V-shape ramps going to both camps
                result.platforms.push(GameObjects.createPlatform(300, 350, 120, 10, -0.35));
                result.platforms.push(GameObjects.createPlatform(500, 350, 120, 10, 0.35));

                return result;
            }
        },

        // Level 16-20: More cave levels with increasing complexity
        // Level 16
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(150, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(650, h - 35, 50, 30));

                var b1 = GameObjects.createBoulder(400, 80, 22, 'explosive');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(400, 20, b1, { x: 0, y: 0 }, 60, 'rope_1'));

                result.seesaws.push(GameObjects.createSeesaw(300, h - 120, 160, 10));
                result.seesaws.push(GameObjects.createSeesaw(500, h - 120, 160, 10));

                var b2 = GameObjects.createBoulder(240, h - 150, 16);
                result.boulders.push(b2);
                var b3 = GameObjects.createBoulder(560, h - 150, 16);
                result.boulders.push(b3);

                result.platforms.push(GameObjects.createPlatform(400, 250, 100, 10, 0));

                return result;
            }
        },

        // Level 17
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(500, h - 35, 60, 30));

                var b1 = GameObjects.createBoulder(150, 80, 24, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(150, 20, b1, { x: 0, y: 0 }, 60, 'rope_1'));

                // Series of breakables
                result.breakables.push(GameObjects.createBreakable(300, 200, 80, 10));
                result.breakables.push(GameObjects.createBreakable(450, 320, 80, 10));

                var b2 = GameObjects.createBoulder(300, 180, 18);
                result.boulders.push(b2);
                var b3 = GameObjects.createBoulder(450, 300, 18);
                result.boulders.push(b3);

                result.platforms.push(GameObjects.createPlatform(220, 150, 100, 10, 0.2));

                return result;
            }
        },

        // Level 18
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));

                var b1 = GameObjects.createBoulder(400, 60, 24, 'explosive');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(400, 15, b1, { x: 0, y: 0 }, 45, 'rope_1'));

                result.platforms.push(GameObjects.createPlatform(400, 200, 60, 10, 0));
                result.breakables.push(GameObjects.createBreakable(300, 320, 80, 10));
                result.breakables.push(GameObjects.createBreakable(500, 320, 80, 10));

                var b2 = GameObjects.createBoulder(300, 300, 16);
                result.boulders.push(b2);
                var b3 = GameObjects.createBoulder(500, 300, 16);
                result.boulders.push(b3);

                return result;
            }
        },

        // Level 19
        {
            stars: [2, 4],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(300, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));

                var b1 = GameObjects.createBoulder(200, 60, 20);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 20, b1, { x: 0, y: 0 }, 40, 'rope_1'));

                var b2 = GameObjects.createBoulder(600, 60, 20);
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(550, 20, b2, { x: -10, y: 0 }, 40, 'rope_2'));
                result.ropes.push(GameObjects.createRope(650, 20, b2, { x: 10, y: 0 }, 40, 'rope_3'));

                result.seesaws.push(GameObjects.createSeesaw(400, h - 150, 180, 10));
                result.platforms.push(GameObjects.createPlatform(250, 250, 100, 10, 0.3));

                return result;
            }
        },

        // Level 20: Cave boss
        {
            stars: [3, 4],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);

                result.camps.push(GameObjects.createGoblinCamp(150, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(650, h - 35, 50, 30));

                var b1 = GameObjects.createBoulder(300, 50, 22, 'explosive');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(300, 15, b1, { x: 0, y: 0 }, 35, 'rope_1'));

                var b2 = GameObjects.createBoulder(550, 50, 22, 'heavy');
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(550, 15, b2, { x: 0, y: 0 }, 35, 'rope_2'));

                result.seesaws.push(GameObjects.createSeesaw(250, h - 100, 160, 10));
                result.seesaws.push(GameObjects.createSeesaw(550, h - 100, 160, 10));

                result.breakables.push(GameObjects.createBreakable(400, 250, 100, 10));
                var b3 = GameObjects.createBoulder(400, 230, 18);
                result.boulders.push(b3);

                result.platforms.push(GameObjects.createPlatform(350, 150, 80, 10, -0.2));
                result.platforms.push(GameObjects.createPlatform(500, 150, 80, 10, 0.2));

                return result;
            }
        },

        // ===== WORLD 3: MOUNTAINS (Levels 21-30) =====
        // Heavy boulders, multi-rope setups, more complex chains

        // Levels 21-30
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 60, 30));
                var b1 = GameObjects.createBoulder(400, 60, 26, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(350, 20, b1, { x: -12, y: 0 }, 40, 'rope_1'));
                result.ropes.push(GameObjects.createRope(450, 20, b1, { x: 12, y: 0 }, 40, 'rope_2'));
                result.platforms.push(GameObjects.createPlatform(400, 300, 80, 10, 0));
                return result;
            }
        },
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(400, 80, 24, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(400, 20, b1, { x: 0, y: 0 }, 60, 'rope_1'));
                result.breakables.push(GameObjects.createBreakable(400, 250, 60, 10));
                result.platforms.push(GameObjects.createPlatform(280, 400, 120, 10, -0.3));
                result.platforms.push(GameObjects.createPlatform(520, 400, 120, 10, 0.3));
                return result;
            }
        },
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(300, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(150, 60, 22);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(150, 20, b1, { x: 0, y: 0 }, 40, 'rope_1'));
                var b2 = GameObjects.createBoulder(500, 60, 22, 'heavy');
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(500, 20, b2, { x: 0, y: 0 }, 40, 'rope_2'));
                result.seesaws.push(GameObjects.createSeesaw(350, h - 120, 180, 10));
                result.platforms.push(GameObjects.createPlatform(200, 200, 100, 10, 0.25));
                return result;
            }
        },
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 60, 30));
                var b1 = GameObjects.createBoulder(200, 60, 20);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 20, b1, { x: 0, y: 0 }, 40, 'rope_1'));
                var b2 = GameObjects.createBoulder(600, 60, 20);
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(600, 20, b2, { x: 0, y: 0 }, 40, 'rope_2'));
                result.seesaws.push(GameObjects.createSeesaw(400, 250, 200, 10));
                result.breakables.push(GameObjects.createBreakable(400, 400, 80, 10));
                var b3 = GameObjects.createBoulder(400, 380, 18, 'explosive');
                result.boulders.push(b3);
                return result;
            }
        },
        {
            stars: [2, 4],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(150, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(650, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(400, 50, 24, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(360, 15, b1, { x: -10, y: 0 }, 35, 'rope_1'));
                result.ropes.push(GameObjects.createRope(440, 15, b1, { x: 10, y: 0 }, 35, 'rope_2'));
                result.platforms.push(GameObjects.createPlatform(400, 200, 80, 10, 0));
                result.seesaws.push(GameObjects.createSeesaw(250, h - 120, 160, 10));
                result.seesaws.push(GameObjects.createSeesaw(550, h - 120, 160, 10));
                var b2 = GameObjects.createBoulder(190, h - 150, 16);
                result.boulders.push(b2);
                var b3 = GameObjects.createBoulder(610, h - 150, 16);
                result.boulders.push(b3);
                return result;
            }
        },
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(500, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(150, 60, 20, 'explosive');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(150, 20, b1, { x: 0, y: 0 }, 40, 'rope_1'));
                result.platforms.push(GameObjects.createPlatform(250, 180, 100, 10, 0.3));
                result.breakables.push(GameObjects.createBreakable(400, 300, 100, 10));
                result.platforms.push(GameObjects.createPlatform(500, 420, 100, 10, 0.1));
                var b2 = GameObjects.createBoulder(400, 280, 20, 'heavy');
                result.boulders.push(b2);
                return result;
            }
        },
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(500, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(350, 50, 22);
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(350, 15, b1, { x: 0, y: 0 }, 35, 'rope_1'));
                var b2 = GameObjects.createBoulder(600, 50, 22, 'explosive');
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(600, 15, b2, { x: 0, y: 0 }, 35, 'rope_2'));
                result.platforms.push(GameObjects.createPlatform(300, 200, 120, 10, -0.2));
                result.platforms.push(GameObjects.createPlatform(550, 250, 120, 10, 0.2));
                result.seesaws.push(GameObjects.createSeesaw(400, h - 150, 160, 10));
                return result;
            }
        },
        {
            stars: [3, 4],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(200, 50, 22, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 15, b1, { x: 0, y: 0 }, 35, 'rope_1'));
                var b2 = GameObjects.createBoulder(600, 50, 22, 'explosive');
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(600, 15, b2, { x: 0, y: 0 }, 35, 'rope_2'));
                result.breakables.push(GameObjects.createBreakable(400, 200, 80, 10));
                var b3 = GameObjects.createBoulder(400, 180, 20);
                result.boulders.push(b3);
                result.platforms.push(GameObjects.createPlatform(250, 180, 80, 10, 0.2));
                result.platforms.push(GameObjects.createPlatform(550, 180, 80, 10, -0.2));
                result.seesaws.push(GameObjects.createSeesaw(400, h - 100, 200, 10));
                return result;
            }
        },
        {
            stars: [3, 5],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(100, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(300, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(500, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(700, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(400, 40, 26, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(370, 10, b1, { x: -10, y: 0 }, 30, 'rope_1'));
                result.ropes.push(GameObjects.createRope(430, 10, b1, { x: 10, y: 0 }, 30, 'rope_2'));
                result.breakables.push(GameObjects.createBreakable(400, 180, 80, 10));
                var b2 = GameObjects.createBoulder(400, 160, 20, 'explosive');
                result.boulders.push(b2);
                result.seesaws.push(GameObjects.createSeesaw(250, h - 120, 160, 10));
                result.seesaws.push(GameObjects.createSeesaw(550, h - 120, 160, 10));
                var b3 = GameObjects.createBoulder(190, h - 150, 16);
                result.boulders.push(b3);
                var b4 = GameObjects.createBoulder(610, h - 150, 16);
                result.boulders.push(b4);
                result.platforms.push(GameObjects.createPlatform(350, 300, 80, 10, -0.3));
                result.platforms.push(GameObjects.createPlatform(450, 300, 80, 10, 0.3));
                return result;
            }
        },

        // ===== WORLD 4: VOLCANO (Levels 31-40) =====
        // Splitting boulders, lava themes, maximum complexity

        // Level 31: Introduces splitting boulders
        {
            stars: [1, 2],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(250, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(550, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(400, 80, 24, 'splitting');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(400, 20, b1, { x: 0, y: 0 }, 60, 'rope_1'));
                result.platforms.push(GameObjects.createPlatform(400, 300, 60, 10, 0));
                return result;
            }
        },
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(400, 60, 22, 'splitting');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(400, 15, b1, { x: 0, y: 0 }, 45, 'rope_1'));
                result.breakables.push(GameObjects.createBreakable(400, 250, 80, 10));
                var b2 = GameObjects.createBoulder(400, 230, 18, 'explosive');
                result.boulders.push(b2);
                result.platforms.push(GameObjects.createPlatform(280, 400, 120, 10, -0.3));
                result.platforms.push(GameObjects.createPlatform(520, 400, 120, 10, 0.3));
                return result;
            }
        },
        {
            stars: [2, 3],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(150, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(650, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(400, 50, 24, 'splitting');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(370, 15, b1, { x: -10, y: 0 }, 35, 'rope_1'));
                result.ropes.push(GameObjects.createRope(430, 15, b1, { x: 10, y: 0 }, 35, 'rope_2'));
                result.seesaws.push(GameObjects.createSeesaw(400, h - 130, 200, 10));
                return result;
            }
        },
        {
            stars: [2, 4],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(300, 50, 22, 'splitting');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(300, 15, b1, { x: 0, y: 0 }, 35, 'rope_1'));
                var b2 = GameObjects.createBoulder(500, 50, 22, 'explosive');
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(500, 15, b2, { x: 0, y: 0 }, 35, 'rope_2'));
                result.breakables.push(GameObjects.createBreakable(400, 250, 100, 10));
                result.platforms.push(GameObjects.createPlatform(250, 180, 80, 10, 0.2));
                result.platforms.push(GameObjects.createPlatform(550, 180, 80, 10, -0.2));
                return result;
            }
        },
        {
            stars: [3, 4],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(150, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(350, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(550, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(350, 40, 26, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(350, 10, b1, { x: 0, y: 0 }, 30, 'rope_1'));
                result.seesaws.push(GameObjects.createSeesaw(250, h - 100, 160, 10));
                result.seesaws.push(GameObjects.createSeesaw(450, h - 100, 160, 10));
                var b2 = GameObjects.createBoulder(190, h - 130, 16, 'splitting');
                result.boulders.push(b2);
                var b3 = GameObjects.createBoulder(510, h - 130, 16, 'explosive');
                result.boulders.push(b3);
                result.platforms.push(GameObjects.createPlatform(350, 200, 80, 10, 0));
                result.breakables.push(GameObjects.createBreakable(350, 350, 80, 10));
                return result;
            }
        },
        {
            stars: [3, 4],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(200, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(600, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(400, 50, 24, 'splitting');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(360, 10, b1, { x: -10, y: 0 }, 40, 'rope_1'));
                result.ropes.push(GameObjects.createRope(440, 10, b1, { x: 10, y: 0 }, 40, 'rope_2'));
                result.breakables.push(GameObjects.createBreakable(300, 200, 80, 10));
                result.breakables.push(GameObjects.createBreakable(500, 200, 80, 10));
                var b2 = GameObjects.createBoulder(300, 180, 18, 'explosive');
                result.boulders.push(b2);
                var b3 = GameObjects.createBoulder(500, 180, 18, 'explosive');
                result.boulders.push(b3);
                result.platforms.push(GameObjects.createPlatform(250, 350, 100, 10, -0.25));
                result.platforms.push(GameObjects.createPlatform(550, 350, 100, 10, 0.25));
                return result;
            }
        },
        {
            stars: [3, 5],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(150, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(350, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(550, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(700, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(250, 40, 22, 'splitting');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(250, 10, b1, { x: 0, y: 0 }, 30, 'rope_1'));
                var b2 = GameObjects.createBoulder(550, 40, 22, 'explosive');
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(550, 10, b2, { x: 0, y: 0 }, 30, 'rope_2'));
                result.seesaws.push(GameObjects.createSeesaw(400, h - 150, 200, 10));
                result.breakables.push(GameObjects.createBreakable(250, 200, 80, 10));
                result.breakables.push(GameObjects.createBreakable(550, 200, 80, 10));
                result.platforms.push(GameObjects.createPlatform(400, 300, 60, 10, 0));
                return result;
            }
        },
        {
            stars: [3, 5],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(100, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(300, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(500, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(700, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(400, 35, 28, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(360, 8, b1, { x: -12, y: 0 }, 27, 'rope_1'));
                result.ropes.push(GameObjects.createRope(440, 8, b1, { x: 12, y: 0 }, 27, 'rope_2'));
                result.breakables.push(GameObjects.createBreakable(400, 180, 100, 10));
                var b2 = GameObjects.createBoulder(350, 160, 18, 'splitting');
                result.boulders.push(b2);
                var b3 = GameObjects.createBoulder(450, 160, 18, 'explosive');
                result.boulders.push(b3);
                result.seesaws.push(GameObjects.createSeesaw(200, h - 120, 160, 10));
                result.seesaws.push(GameObjects.createSeesaw(600, h - 120, 160, 10));
                result.platforms.push(GameObjects.createPlatform(300, 320, 80, 10, -0.3));
                result.platforms.push(GameObjects.createPlatform(500, 320, 80, 10, 0.3));
                return result;
            }
        },
        {
            stars: [4, 5],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(100, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(250, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(550, h - 35, 50, 30));
                result.camps.push(GameObjects.createGoblinCamp(700, h - 35, 50, 30));
                var b1 = GameObjects.createBoulder(200, 40, 22, 'splitting');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 10, b1, { x: 0, y: 0 }, 30, 'rope_1'));
                var b2 = GameObjects.createBoulder(600, 40, 22, 'splitting');
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(600, 10, b2, { x: 0, y: 0 }, 30, 'rope_2'));
                result.breakables.push(GameObjects.createBreakable(400, 180, 80, 10));
                var b3 = GameObjects.createBoulder(400, 160, 22, 'explosive');
                result.boulders.push(b3);
                result.seesaws.push(GameObjects.createSeesaw(300, h - 120, 160, 10));
                result.seesaws.push(GameObjects.createSeesaw(500, h - 120, 160, 10));
                result.platforms.push(GameObjects.createPlatform(250, 250, 80, 10, -0.2));
                result.platforms.push(GameObjects.createPlatform(550, 250, 80, 10, 0.2));
                result.platforms.push(GameObjects.createPlatform(400, 350, 60, 10, 0));
                return result;
            }
        },

        // Level 40: FINAL BOSS - ultimate puzzle
        {
            stars: [4, 6],
            build: function() {
                var w = 800, h = 600;
                var result = Levels.emptyLevel(w, h);
                result.camps.push(GameObjects.createGoblinCamp(100, h - 35, 45, 30));
                result.camps.push(GameObjects.createGoblinCamp(250, h - 35, 45, 30));
                result.camps.push(GameObjects.createGoblinCamp(400, h - 35, 45, 30));
                result.camps.push(GameObjects.createGoblinCamp(550, h - 35, 45, 30));
                result.camps.push(GameObjects.createGoblinCamp(700, h - 35, 45, 30));
                // Three boulders on ropes
                var b1 = GameObjects.createBoulder(200, 35, 22, 'heavy');
                result.boulders.push(b1);
                result.ropes.push(GameObjects.createRope(200, 8, b1, { x: 0, y: 0 }, 27, 'rope_1'));
                var b2 = GameObjects.createBoulder(400, 35, 22, 'splitting');
                result.boulders.push(b2);
                result.ropes.push(GameObjects.createRope(370, 8, b2, { x: -8, y: 0 }, 27, 'rope_2'));
                result.ropes.push(GameObjects.createRope(430, 8, b2, { x: 8, y: 0 }, 27, 'rope_3'));
                var b3 = GameObjects.createBoulder(600, 35, 22, 'explosive');
                result.boulders.push(b3);
                result.ropes.push(GameObjects.createRope(600, 8, b3, { x: 0, y: 0 }, 27, 'rope_4'));
                // Complex obstacle setup
                result.breakables.push(GameObjects.createBreakable(300, 200, 80, 10));
                result.breakables.push(GameObjects.createBreakable(500, 200, 80, 10));
                result.seesaws.push(GameObjects.createSeesaw(200, h - 120, 150, 10));
                result.seesaws.push(GameObjects.createSeesaw(400, h - 120, 150, 10));
                result.seesaws.push(GameObjects.createSeesaw(600, h - 120, 150, 10));
                var b4 = GameObjects.createBoulder(150, h - 150, 14);
                result.boulders.push(b4);
                var b5 = GameObjects.createBoulder(450, h - 150, 14);
                result.boulders.push(b5);
                var b6 = GameObjects.createBoulder(650, h - 150, 14);
                result.boulders.push(b6);
                result.platforms.push(GameObjects.createPlatform(250, 130, 60, 10, 0.2));
                result.platforms.push(GameObjects.createPlatform(550, 130, 60, 10, -0.2));
                result.platforms.push(GameObjects.createPlatform(350, 350, 80, 10, -0.25));
                result.platforms.push(GameObjects.createPlatform(450, 350, 80, 10, 0.25));
                return result;
            }
        }
    ],

    // Helper: empty level with walls
    emptyLevel: function(w, h) {
        var walls = [];
        // Ground
        walls.push(GameObjects.createWall(w / 2, h - 5, w + 100, 10));
        // Side walls
        walls.push(GameObjects.createWall(-5, h / 2, 10, h + 100));
        walls.push(GameObjects.createWall(w + 5, h / 2, 10, h + 100));

        return {
            boulders: [], ropes: [], platforms: [],
            camps: [], breakables: [], seesaws: [],
            walls: walls, cradles: []
        };
    }
};
