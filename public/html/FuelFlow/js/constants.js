// constants.js — All game constants and configuration

// Logical resolution (16:9)
export const LOGICAL_W = 1920;
export const LOGICAL_H = 1080;

// Grid
export const GRID_COLS = 7;
export const GRID_ROWS = 7;
export const CELL_SIZE = 110;
export const GRID_W = GRID_COLS * CELL_SIZE;
export const GRID_H = GRID_ROWS * CELL_SIZE;
export const GRID_X = (LOGICAL_W - GRID_W) / 2;
export const GRID_Y = 40;

// Pipe rendering
export const PIPE_WIDTH = 36;
export const PIPE_COLOR = '#8899aa';
export const PIPE_BORDER = '#667788';
export const PIPE_INNER = '#aabbcc';

// Trough
export const TROUGH_H = 200;
export const TROUGH_Y = LOGICAL_H - TROUGH_H;
export const TROUGH_PIECE_SIZE = 80;
export const TROUGH_PADDING = 16;

// Inlet / Outlet pipes
export const INLET_PIPE_LEN = 160;
export const OUTLET_PIPE_LEN = 160;

// Directions
export const TOP = 0;
export const RIGHT = 1;
export const BOTTOM = 2;
export const LEFT = 3;

export const OPPOSITE = [BOTTOM, LEFT, TOP, RIGHT];

// Direction deltas: [row, col]
export const DIR_DELTA = [
    [-1, 0], // TOP
    [0, 1],  // RIGHT
    [1, 0],  // BOTTOM
    [0, -1], // LEFT
];

// Snap thresholds
export const SNAP_DIST = CELL_SIZE * 0.4;
export const SNAP_VEL = 3; // logical pixels per frame

// Fuel flow
export const FUEL_COLOR = '#e6a817';
export const FUEL_COLOR_DARK = '#cc8800';
export const FUEL_FILL_SPEED = 0.8; // fill fraction per second
export const LEAK_TIMEOUT = 3.0; // seconds before fire hazard

// Obstacle rendering
export const OBSTACLE_COLOR = '#556070';
export const OBSTACLE_BORDER = '#3a4555';

// Panel / Screws
export const SCREW_RADIUS = 28;
export const PANEL_COLOR = '#707a88';
export const PANEL_BORDER = '#555f6c';
export const SCREW_COLOR = '#99a5b4';

// Level difficulty
export const LEVEL_CONFIG = [
    { minPath: 12, obstaclesMin: 3, obstaclesMax: 6, checkTrivial: false },
    { minPath: 16, obstaclesMin: 7, obstaclesMax: 10, checkTrivial: true },
    { minPath: 20, obstaclesMin: 11, obstaclesMax: 15, checkTrivial: true },
];

// Distractor percentage
export const DISTRACTOR_RATIO = 0.10;

// Game states
export const STATE = {
    INIT: 'INIT',
    PANEL_VIEW: 'PANEL_VIEW',
    PANEL_SCREWS: 'PANEL_SCREWS',
    PANEL_FALL: 'PANEL_FALL',
    PUZZLE: 'PUZZLE',
    FUEL_FLOWING: 'FUEL_FLOWING',
    LEAK_FAIL: 'LEAK_FAIL',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE',
    WIN: 'WIN',
};

// Valve
export const VALVE_RADIUS = 40;
export const VALVE_X = GRID_X - INLET_PIPE_LEN - 30;
export const VALVE_Y = 0; // set per level based on inlet row

// Animation durations (seconds)
export const PANEL_FALL_DURATION = 0.8;
export const SCROLL_DURATION = 1.0;
