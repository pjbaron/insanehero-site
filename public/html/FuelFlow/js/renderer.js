// renderer.js — Canvas rendering (grid, pieces, obstacles, trough, UI)
import {
    LOGICAL_W, LOGICAL_H, GRID_X, GRID_Y, GRID_W, GRID_H,
    GRID_COLS, GRID_ROWS, CELL_SIZE, PIPE_WIDTH, PIPE_COLOR, PIPE_BORDER,
    PIPE_INNER, OBSTACLE_COLOR, OBSTACLE_BORDER, INLET_PIPE_LEN, OUTLET_PIPE_LEN,
    TROUGH_Y, TROUGH_H, TROUGH_PIECE_SIZE, TROUGH_PADDING,
    TOP, RIGHT, BOTTOM, LEFT,
} from './constants.js';
import { PIECE_TYPES } from './pieces.js';

// --- Background ---
export function drawBackground(ctx) {
    // Dark industrial background
    ctx.fillStyle = '#1e2530';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // Subtle grid pattern
    ctx.strokeStyle = '#252d3a';
    ctx.lineWidth = 1;
    for (let x = 0; x < LOGICAL_W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LOGICAL_H);
        ctx.stroke();
    }
    for (let y = 0; y < LOGICAL_H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_W, y);
        ctx.stroke();
    }
}

// --- Grid ---
export function drawGrid(ctx) {
    // Grid background
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(GRID_X, GRID_Y, GRID_W, GRID_H);

    // Grid lines
    ctx.strokeStyle = '#3a4555';
    ctx.lineWidth = 1;
    for (let r = 0; r <= GRID_ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(GRID_X, GRID_Y + r * CELL_SIZE);
        ctx.lineTo(GRID_X + GRID_W, GRID_Y + r * CELL_SIZE);
        ctx.stroke();
    }
    for (let c = 0; c <= GRID_COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(GRID_X + c * CELL_SIZE, GRID_Y);
        ctx.lineTo(GRID_X + c * CELL_SIZE, GRID_Y + GRID_H);
        ctx.stroke();
    }
}

// --- Obstacles ---
export function drawObstacles(ctx, grid) {
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            if (grid.isObstacle(r, c)) {
                drawObstacle(ctx, r, c);
            }
        }
    }
}

function drawObstacle(ctx, r, c) {
    const x = GRID_X + c * CELL_SIZE;
    const y = GRID_Y + r * CELL_SIZE;
    const pad = 8;

    // Machine part look
    ctx.fillStyle = OBSTACLE_COLOR;
    ctx.strokeStyle = OBSTACLE_BORDER;
    ctx.lineWidth = 2;

    // Main block
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, 6);
    ctx.fill();
    ctx.stroke();

    // Bolts
    ctx.fillStyle = '#6a7585';
    const boltR = 5;
    const inset = pad + 10;
    const positions = [
        [x + inset, y + inset],
        [x + CELL_SIZE - inset, y + inset],
        [x + inset, y + CELL_SIZE - inset],
        [x + CELL_SIZE - inset, y + CELL_SIZE - inset],
    ];
    for (const [bx, by] of positions) {
        ctx.beginPath();
        ctx.arc(bx, by, boltR, 0, Math.PI * 2);
        ctx.fill();
    }

    // Cross-hatch detail
    ctx.strokeStyle = '#4a5565';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + pad + 20, y + CELL_SIZE / 2);
    ctx.lineTo(x + CELL_SIZE - pad - 20, y + CELL_SIZE / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE / 2, y + pad + 20);
    ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE - pad - 20);
    ctx.stroke();
}

// --- Pipe Pieces ---
export function drawPieces(ctx, grid) {
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const piece = grid.getPiece(r, c);
            if (piece) {
                const x = GRID_X + c * CELL_SIZE;
                const y = GRID_Y + r * CELL_SIZE;
                drawPiece(ctx, piece, x, y, CELL_SIZE);
            }
        }
    }
}

/**
 * Draw a pipe piece at the given position and size.
 */
export function drawPiece(ctx, pieceType, x, y, size) {
    const def = PIECE_TYPES[pieceType];
    if (!def) return;

    const cx = x + size / 2;
    const cy = y + size / 2;
    const hw = PIPE_WIDTH / 2 * (size / CELL_SIZE);
    const pipeW = PIPE_WIDTH * (size / CELL_SIZE);
    const half = size / 2;

    // Draw pipe segments for each opening
    ctx.lineCap = 'butt';

    // Background fill for pipe segments
    const openings = def.openings;

    // Draw each opening as a segment from center to edge
    const segments = [];
    if (openings[TOP]) segments.push({ dir: TOP, x1: cx, y1: cy, x2: cx, y2: y });
    if (openings[RIGHT]) segments.push({ dir: RIGHT, x1: cx, y1: cy, x2: x + size, y2: cy });
    if (openings[BOTTOM]) segments.push({ dir: BOTTOM, x1: cx, y1: cy, x2: cx, y2: y + size });
    if (openings[LEFT]) segments.push({ dir: LEFT, x1: cx, y1: cy, x2: x, y2: cy });

    // Draw pipe border (outer)
    ctx.strokeStyle = PIPE_BORDER;
    ctx.lineWidth = pipeW + 4 * (size / CELL_SIZE);
    for (const seg of segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
    }

    // Draw pipe body
    ctx.strokeStyle = PIPE_COLOR;
    ctx.lineWidth = pipeW;
    for (const seg of segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
    }

    // Draw pipe inner highlight
    ctx.strokeStyle = PIPE_INNER;
    ctx.lineWidth = pipeW * 0.35;
    for (const seg of segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
    }

    // Center junction circle
    if (segments.length >= 2) {
        ctx.fillStyle = PIPE_COLOR;
        ctx.strokeStyle = PIPE_BORDER;
        ctx.lineWidth = 2 * (size / CELL_SIZE);
        ctx.beginPath();
        ctx.arc(cx, cy, hw + 2 * (size / CELL_SIZE), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = PIPE_INNER;
        ctx.beginPath();
        ctx.arc(cx, cy, hw * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

}

// --- Inlet / Outlet pipes ---
export function drawInletOutlet(ctx, inletRow, outletRow) {
    const pipeW = PIPE_WIDTH;
    const halfW = pipeW / 2;

    // Inlet pipe (left side)
    const inY = GRID_Y + inletRow * CELL_SIZE + CELL_SIZE / 2;
    const inStartX = GRID_X - INLET_PIPE_LEN;
    const inEndX = GRID_X;

    // Pipe body
    ctx.strokeStyle = PIPE_BORDER;
    ctx.lineWidth = pipeW + 4;
    ctx.beginPath();
    ctx.moveTo(inStartX, inY);
    ctx.lineTo(inEndX, inY);
    ctx.stroke();
    ctx.strokeStyle = PIPE_COLOR;
    ctx.lineWidth = pipeW;
    ctx.beginPath();
    ctx.moveTo(inStartX, inY);
    ctx.lineTo(inEndX, inY);
    ctx.stroke();
    ctx.strokeStyle = PIPE_INNER;
    ctx.lineWidth = pipeW * 0.35;
    ctx.beginPath();
    ctx.moveTo(inStartX, inY);
    ctx.lineTo(inEndX, inY);
    ctx.stroke();

    // "IN" label
    ctx.fillStyle = '#aabbcc';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IN', inStartX - 25, inY + 6);

    // Outlet pipe (right side)
    const outY = GRID_Y + outletRow * CELL_SIZE + CELL_SIZE / 2;
    const outStartX = GRID_X + GRID_W;
    const outEndX = outStartX + OUTLET_PIPE_LEN;

    ctx.strokeStyle = PIPE_BORDER;
    ctx.lineWidth = pipeW + 4;
    ctx.beginPath();
    ctx.moveTo(outStartX, outY);
    ctx.lineTo(outEndX, outY);
    ctx.stroke();
    ctx.strokeStyle = PIPE_COLOR;
    ctx.lineWidth = pipeW;
    ctx.beginPath();
    ctx.moveTo(outStartX, outY);
    ctx.lineTo(outEndX, outY);
    ctx.stroke();
    ctx.strokeStyle = PIPE_INNER;
    ctx.lineWidth = pipeW * 0.35;
    ctx.beginPath();
    ctx.moveTo(outStartX, outY);
    ctx.lineTo(outEndX, outY);
    ctx.stroke();

    // "OUT" label
    ctx.fillStyle = '#aabbcc';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OUT', outEndX + 30, outY + 6);
}

// --- Trough ---
export function drawTrough(ctx, troughState) {
    // Background
    ctx.fillStyle = '#252d3a';
    ctx.strokeStyle = '#3a4555';
    ctx.lineWidth = 2;
    ctx.fillRect(0, TROUGH_Y, LOGICAL_W, TROUGH_H);
    ctx.strokeRect(0, TROUGH_Y, LOGICAL_W, TROUGH_H);

    if (!troughState) return;

    const slots = troughState.getSlots();
    for (const slot of slots) {
        const { x, y, type, count } = slot;

        // Slot background
        ctx.fillStyle = count > 0 ? '#333e4e' : '#2a3340';
        ctx.strokeStyle = '#4a5565';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, TROUGH_PIECE_SIZE, TROUGH_PIECE_SIZE, 4);
        ctx.fill();
        ctx.stroke();

        // Draw piece preview
        if (count > 0) {
            drawPiece(ctx, type, x, y, TROUGH_PIECE_SIZE);
        } else {
            // Faded piece
            ctx.globalAlpha = 0.25;
            drawPiece(ctx, type, x, y, TROUGH_PIECE_SIZE);
            ctx.globalAlpha = 1;
        }

        // Count badge
        ctx.fillStyle = count > 0 ? '#e6a817' : '#666';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            count.toString(),
            x + TROUGH_PIECE_SIZE / 2,
            y + TROUGH_PIECE_SIZE + 16
        );
    }
}

// --- Drag piece ---
export function drawDragPiece(ctx, pieceType, x, y) {
    if (!pieceType) return;
    const size = CELL_SIZE;
    ctx.globalAlpha = 0.85;
    drawPiece(ctx, pieceType, x - size / 2, y - size / 2, size);
    ctx.globalAlpha = 1;
}

// --- Text overlays ---
export function drawCenteredText(ctx, text, y, fontSize, color) {
    ctx.fillStyle = color || '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, LOGICAL_W / 2, y);
}

export function drawOverlay(ctx, alpha) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
}
