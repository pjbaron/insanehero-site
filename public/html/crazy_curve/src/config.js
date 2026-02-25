// Table dimensions
export const TABLE_WIDTH = 32;
export const TABLE_LENGTH = 64;

// Pocket dimensions
export const POCKET_SIZE = 2.0;  // Size of pocket opening for pot detection
export const POCKET_PLATFORM_Y = -1.5;  // Y position of pocket catch platforms
export const POCKET_PLATFORM_SIZE = 4;  // Size of pocket platforms

// Ball properties
export const BALL_RADIUS = 1.0;
export const BALL_DIAMETER = 2 * BALL_RADIUS;

// Physics timestep
export const FIXED_TIMESTEP = 1 / 60;

// Physics materials
export const BALL_BALL_RESTITUTION = 0.95;
export const BALL_BALL_FRICTION = 0.1;
export const BALL_TABLE_RESTITUTION = 0.4;
export const BALL_TABLE_FRICTION = 0.1;
export const BALL_CUSHION_RESTITUTION = 0.95;
export const BALL_CUSHION_FRICTION = 0;
export const POCKET_BACK_RESTITUTION = 0.02;
export const POCKET_BACK_FRICTION = 0.7;

// AI simulation parameters
export const SIM_SHOT_COUNT = 50;  // Number of shots to simulate per turn
export const SIM_BATCH_SIZE = 1;   // Shots per batch
export const SIM_MAX_STEPS = 6000;  // Safety-valve max steps (100s at 60Hz)

// Scoring weights
export const SCORE_OWN_POT = 200;
export const SCORE_OPPONENT_POT = -100;
export const SCORE_BLACK_POT = 500;
export const SCORE_BLACK_EARLY = -10000;
export const SCORE_FOUL = -200;
export const SCORE_MISS = -50;
export const SCORE_BREAK_BONUS = 200;
export const SCORE_NEAR_POCKET_OWN = 10;
export const SCORE_NEAR_POCKET_OPPONENT = -10;

// Human player controls
export const ROTATION_SENSITIVITY = 0.003;  // Radians per pixel of mouse movement
export const CUE_PULL_SENSITIVITY = 0.1;    // Units per pixel of mouse movement
export const POWER_SCALE = 0.08;            // Multiplier from mouse velocity to force
export const CUE_LENGTH = 40;               // Visual cue length
export const CAMERA_DISTANCE = 25;          // Distance behind ball for aiming view
export const CAMERA_HEIGHT = 10;            // Height above table for aiming view
export const CUE_BUTT_RAISE = 7;            // Height of cue butt above the cue tip (~10 degrees)
export const MAX_CUE_PULLBACK = 12;         // Maximum cue pullback distance
export const MIN_STRIKE_VELOCITY = 5;       // Minimum velocity threshold for strike
export const MAX_SHOT_POWER = 72;           // Maximum shot power cap
export const MIN_SHOT_POWER = 3;            // Minimum shot power
export const STRIKE_ANIM_SPEED = 150;       // Units per second for cue strike animation

// Camera defaults
export const CAMERA_ALPHA = 0;
export const CAMERA_BETA = 0.8;
export const CAMERA_RADIUS = 90;
export const CAMERA_LOWER_BETA_LIMIT = 0.1;
export const CAMERA_UPPER_BETA_LIMIT = (Math.PI / 2) * 0.9;
export const CAMERA_LOWER_RADIUS_LIMIT = 30;
export const CAMERA_UPPER_RADIUS_LIMIT = 150;

// Table construction constants
export const POCKET_Z = 2.2;
export const POCKET_X = 2.2;
export const POCKET_M = 3.0;
export const CURVE_X = 1.0;
export const CURVE_Z = 1.0;
export const CUSHION_DEPTH = 1.2;
export const CUSHION_HEIGHT = 1.0;
export const WOOD_EDGE_HEIGHT = 3.0;

// White ball spawn position
export const WHITE_BALL_SPAWN_X = 0;
export const WHITE_BALL_SPAWN_Y = 1;
export const WHITE_BALL_SPAWN_Z = -19;

// Triangle apex position
export const TRIANGLE_APEX_Z = 9.5;

// Pocket positions for detection
export const POCKET_POSITIONS = [
    { x: -TABLE_WIDTH / 2, z: TABLE_LENGTH / 2 },   // top left
    { x: TABLE_WIDTH / 2, z: TABLE_LENGTH / 2 },    // top right
    { x: -TABLE_WIDTH / 2, z: -TABLE_LENGTH / 2 },  // bottom left
    { x: TABLE_WIDTH / 2, z: -TABLE_LENGTH / 2 },   // bottom right
    { x: -TABLE_WIDTH / 2, z: 0 },                  // middle left
    { x: TABLE_WIDTH / 2, z: 0 }                    // middle right
];

// Ball colors mapping
export const BALL_COLORS = {
    ball10: 'blue',
    ball11: 'red',
    ball8: 'black'
};

// Triangle layout - ball positions relative to apex
export const TRIANGLE_LAYOUT = [
    { x: 0, row: 0 },
    { x: -1, row: 1 }, { x: 1, row: 1 },
    { x: -2, row: 2 }, { x: 0, row: 2 }, { x: 2, row: 2 },
    { x: -3, row: 3 }, { x: -1, row: 3 }, { x: 1, row: 3 }, { x: 3, row: 3 },
    { x: -4, row: 4 }, { x: -2, row: 4 }, { x: 0, row: 4 }, { x: 2, row: 4 }, { x: 4, row: 4 }
];

// Ball textures for triangle (index corresponds to TRIANGLE_LAYOUT)
export const TRIANGLE_TEXTURES = [
    'ball10',
    'ball10', 'ball11',
    'ball11', 'ball8', 'ball10',
    'ball10', 'ball11', 'ball10', 'ball11',
    'ball11', 'ball11', 'ball10', 'ball11', 'ball10'
];
