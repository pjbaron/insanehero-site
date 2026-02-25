/**
 * Splice Sprint - Constants & Configuration
 * All tunable values in one place
 */

var C = {
    // Camera / projection
    CAM_HEIGHT: 80,
    CAM_DIST: 200,       // camera Z offset behind player
    FOV: 120,            // field of view factor
    DRAW_DIST: 600,      // how far ahead to render
    CULL_BEHIND: 50,     // cull segments behind player

    // Road
    ROAD_WIDTH: 220,     // base road width in world units
    LANE_COUNT: 3,       // for visual lane markings
    SEGMENT_LENGTH: 20,  // Z length of each segment

    // Colors
    SKY_TOP: '#0a0a2e',
    SKY_BOT: '#1a1a4e',
    ROAD_DARK: '#333344',
    ROAD_LIGHT: '#3a3a50',
    ROAD_EDGE: '#ff6600',
    ROAD_LINE: '#666688',
    GRASS_DARK: '#1a3a1a',
    GRASS_LIGHT: '#1e421e',

    // Segment type colors
    BOOST_COLOR: '#00ffaa',
    BOOST_GLOW: '#00ff88',
    MUD_COLOR: '#8B6914',
    MUD_DARK: '#6B4F10',
    BRIDGE_COLOR: '#886644',
    BRIDGE_RAIL: '#aa8866',
    DEAD_END_COLOR: '#ff2200',
    RAMP_COLOR: '#ffaa00',
    COIN_COLOR: '#FFD700',
    COIN_GLOW: '#FFA500',

    // Player
    PLAYER_WIDTH: 30,
    PLAYER_HEIGHT: 40,
    PLAYER_COLOR: '#00aaff',
    PLAYER_ACCENT: '#0088dd',

    // Speed
    SPEED_MIN: 200,
    SPEED_MAX: 800,
    SPEED_ACCEL: 0.03,   // speed = min(SPEED_MIN + dist * SPEED_ACCEL, SPEED_MAX)
    BOOST_MULT: 1.8,
    BOOST_DURATION: 1.5,
    MUD_MULT: 0.4,
    MUD_DURATION: 1.0,

    // Fork generation
    FORK_MIN_DIST: 120,  // minimum Z between forks at start
    FORK_MAX_DIST: 200,
    FORK_DIST_SHRINK: 0.97,  // multiply fork distance as speed increases
    FORK_MIN_FLOOR: 60,      // minimum fork distance even at max speed
    BRANCH_ANGLE: 0.3,       // radians of fork splay
    GENERATE_AHEAD: 600,

    // Fork branch probabilities (weights)
    // These shift with difficulty
    BRANCH_WEIGHTS_EASY: {
        normal: 40,
        boost: 30,
        coins: 20,
        mud: 8,
        bridge: 2,
        deadEnd: 0,
        ramp: 0
    },
    BRANCH_WEIGHTS_HARD: {
        normal: 15,
        boost: 15,
        coins: 10,
        mud: 20,
        bridge: 15,
        deadEnd: 15,
        ramp: 10
    },

    // Branch segment counts
    BRANCH_SEG_MIN: 6,
    BRANCH_SEG_MAX: 15,

    // Coins
    COIN_RADIUS: 8,
    COIN_SPACING: 30,    // Z spacing between coins in a trail
    COIN_VALUE: 10,

    // Scoring
    SCORE_PER_METER: 1,
    SCORE_BOOST_BONUS: 50,
    SCORE_RAMP_BONUS: 100,
    SCORE_COIN_BONUS: 10,

    // Particles
    PARTICLE_MAX: 200,

    // Screen shake
    SHAKE_DEAD_END: 15,
    SHAKE_BOOST: 3,
    SHAKE_RAMP: 8,

    // Dead-end
    DEAD_END_SLOW: 0.1,      // speed multiplier during crumble
    DEAD_END_DURATION: 1.2,   // seconds before game over

    // Bridge
    BRIDGE_WOBBLE: 0.03,      // sway amplitude
    BRIDGE_NARROW: 0.5,       // road width multiplier

    // Ramp
    RAMP_AIRTIME: 1.0,        // seconds of jump
    RAMP_HEIGHT: 120,          // max Y offset during jump

    // UI
    FONT: 'sans-serif',
    TITLE_SIZE: 52,
    HUD_SIZE: 22,
    HUD_COLOR: '#ffffff',
    HUD_SHADOW: '#000000',

    // Arrow indicators
    ARROW_SIZE: 40,
    ARROW_COLOR: '#ffffff',
    ARROW_GLOW: '#00ff88',
    ARROW_PULSE_SPEED: 6,

    // Ghost / post-run
    GHOST_MAP_WIDTH: 0.6,    // fraction of screen width
    GHOST_MAP_HEIGHT: 0.5,

    // Difficulty curve - how many forks to reach "hard" weights
    DIFFICULTY_RAMP_FORKS: 20,

    // First forks are easy (2-way, obvious)
    EASY_FORKS: 3
};
