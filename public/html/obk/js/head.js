// head.js -- Stone head rendering and expression state
import CONFIG, {
  HEAD_X, HEAD_Y, HEAD_RADIUS,
  BOB_FREQ, BOB_AMP,
  BEAM_WIDTH, BEAM_COLOR, BEAM_EDGE_COLOR,
  HEAD_EXPR_IDLE, HEAD_EXPR_READY, HEAD_EXPR_WARN, HEAD_EXPR_GRIN, HEAD_EXPR_DESPERATE,
} from './config.js';
import { getBeamWidthBonus } from './resources.js';
import { getButtonTarget } from './action.js';

const state = {
  expression: HEAD_EXPR_IDLE,
  bobOffset: 0,
  mouthOpenFraction: 0,  // 0 = closed, 1 = fully open
  time: 0,
  crashPlayed: false,
  crashProgress: 0,      // 0..1 during crash animation
  crashDuration: 700,    // ms - brief and punchy
  crashStartY: -HEAD_RADIUS * 2,
  crashJustCompleted: false,
  isCrashing: false,
  currentY: HEAD_Y,
  // Shop animation
  isDescending: false,
  isAscending: false,
  shopAnimProgress: 0,
  shopTargetY: HEAD_Y,
  shopDescended: false,
  ascendJustCompleted: false,
  // Creation animation
  isCreating: false,
  creationProgress: 0,
  creationDuration: 1200,  // ms - magical appearance
  creationPlayed: false,
  creationJustCompleted: false,
  creationScale: 0,
};

export function getState() { return state; }

export function triggerShopDescend(targetY) {
  if (state.isDescending || state.shopDescended) return;
  state.isDescending = true;
  state.isAscending = false;
  state.shopAnimProgress = 0;
  state.shopTargetY = targetY;
  state.shopDescended = false;
}

export function triggerShopAscend() {
  if (!state.shopDescended) return;
  state.isAscending = true;
  state.isDescending = false;
  state.shopAnimProgress = 0;
  state.shopDescended = false;
}

export function getAscendJustCompleted() {
  const v = state.ascendJustCompleted;
  state.ascendJustCompleted = false;
  return v;
}

export function update(dt, gameState) {
  state.time += dt;
  state.bobOffset = Math.sin(state.time * BOB_FREQ) * BOB_AMP;

  // Creation animation - magical scaling appearance
  if (state.isCreating) {
    state.creationProgress = Math.min(1, state.creationProgress + dt * 1000 / state.creationDuration);
    // Ease out: start fast, slow down (1 - (1-t)^3)
    const t = state.creationProgress;
    const eased = 1 - Math.pow(1 - t, 3);
    state.creationScale = eased;
    if (state.creationProgress >= 1) {
      state.isCreating = false;
      state.creationPlayed = true;
      state.creationJustCompleted = true;
      state.creationScale = 1;
    }
    return;
  }

  // Crash animation
  if (state.isCrashing) {
    state.crashProgress = Math.min(1, state.crashProgress + dt * 1000 / state.crashDuration);
    // Ease in: accelerate like falling (t^2)
    const t = state.crashProgress * state.crashProgress;
    state.currentY = state.crashStartY + (HEAD_Y - state.crashStartY) * t;
    if (state.crashProgress >= 1) {
      state.isCrashing = false;
      state.currentY = HEAD_Y;
      state.crashPlayed = true;
      state.crashJustCompleted = true;
    }
    return;
  }

  // Shop descent animation
  if (state.isDescending) {
    state.shopAnimProgress = Math.min(1, state.shopAnimProgress + dt / CONFIG.HEAD_DESCEND_DURATION);
    const t = state.shopAnimProgress * state.shopAnimProgress;
    state.currentY = HEAD_Y + (state.shopTargetY - HEAD_Y) * t;
    state.bobOffset = 0;
    if (state.shopAnimProgress >= 1) {
      state.isDescending = false;
      state.shopDescended = true;
      state.currentY = state.shopTargetY;
    }
    return;
  }

  // Shop ascent animation
  if (state.isAscending) {
    state.shopAnimProgress = Math.min(1, state.shopAnimProgress + dt / CONFIG.HEAD_ASCEND_DURATION);
    const t = 1 - (1 - state.shopAnimProgress) * (1 - state.shopAnimProgress);
    state.currentY = state.shopTargetY + (HEAD_Y - state.shopTargetY) * t;
    state.bobOffset = 0;
    if (state.shopAnimProgress >= 1) {
      state.isAscending = false;
      state.ascendJustCompleted = true;
      state.currentY = HEAD_Y;
    }
    return;
  }

  // Shop descended: hold position, suppress bob
  if (state.shopDescended) {
    state.currentY = state.shopTargetY;
    state.bobOffset = 0;
    return;
  }

  state.currentY = HEAD_Y;

  // Expression selection
  const loyalty = gameState?.resources?.loyalty ?? 50;
  const wallHp  = gameState?.wallHp ?? 10;
  const entityInBeam = !!getButtonTarget();

  if (wallHp < 5) {
    state.expression = HEAD_EXPR_DESPERATE;
    state.mouthOpenFraction = 0.8 + Math.sin(state.time * 8) * 0.15;
  } else if (loyalty >= 80) {
    state.expression = HEAD_EXPR_GRIN;
    state.mouthOpenFraction = 0.9;
  } else if (loyalty < 30) {
    state.expression = HEAD_EXPR_WARN;
    state.mouthOpenFraction = 0.3 + Math.abs(Math.sin(state.time * 4)) * 0.2;
  } else if (entityInBeam) {
    state.expression = HEAD_EXPR_READY;
    state.mouthOpenFraction = 0.7;
  } else {
    state.expression = HEAD_EXPR_IDLE;
    state.mouthOpenFraction = 0.2;
  }
}

export function resetHead() {
  state.expression = HEAD_EXPR_IDLE;
  state.bobOffset = 0;
  state.mouthOpenFraction = 0;
  state.time = 0;
  state.crashPlayed = false;
  state.crashProgress = 0;
  state.crashStartY = -HEAD_RADIUS * 2;
  state.crashJustCompleted = false;
  state.isCrashing = false;
  state.currentY = HEAD_Y;
  state.isDescending = false;
  state.isAscending = false;
  state.shopAnimProgress = 0;
  state.shopTargetY = HEAD_Y;
  state.shopDescended = false;
  state.ascendJustCompleted = false;
  state.isCreating = false;
  state.creationProgress = 0;
  state.creationPlayed = false;
  state.creationJustCompleted = false;
  state.creationScale = 0;
}

export function triggerCrash(startY) {
  if (!state.crashPlayed) {
    state.isCrashing = true;
    state.crashProgress = 0;
    state.crashStartY = startY ?? -HEAD_RADIUS * 2;
    state.currentY = state.crashStartY;
    state.crashJustCompleted = false;
  }
}

export function getAndClearCrashJustCompleted() {
  const v = state.crashJustCompleted;
  state.crashJustCompleted = false;
  return v;
}

export function triggerCreation() {
  if (!state.creationPlayed) {
    state.isCreating = true;
    state.creationProgress = 0;
    state.creationScale = 0;
    state.creationJustCompleted = false;
  }
}

export function getAndClearCreationJustCompleted() {
  const v = state.creationJustCompleted;
  state.creationJustCompleted = false;
  return v;
}


export function draw(ctx) {
  const cx = HEAD_X;
  const cy = state.currentY + state.bobOffset;
  const r  = HEAD_RADIUS;

  ctx.save();

  // Apply scaling during creation animation
  if (state.isCreating) {
    ctx.translate(cx, cy);
    ctx.scale(state.creationScale, state.creationScale);
    ctx.translate(-cx, -cy);
    // Add magical glow during creation
    ctx.shadowColor = 'rgba(150, 100, 255, 0.8)';
    ctx.shadowBlur = 30 * state.creationProgress;
  }

  // Face body (stone ellipse)
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.85, r, 0, 0, Math.PI * 2);
  const faceColor = state.expression === HEAD_EXPR_DESPERATE ? '#6a3a2a' : '#7a7060';
  ctx.fillStyle = faceColor;
  ctx.fill();
  ctx.strokeStyle = '#3a3020';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Eyes
  _drawEyes(ctx, cx, cy, r);

  // Mouth
  _drawMouth(ctx, cx, cy, r);

  if (state.expression === HEAD_EXPR_DESPERATE) {
    _drawCracks(ctx, cx, cy, r);
  }

  // Beam below head (suppressed during shop and creation animations)
  if (!state.isDescending && !state.isAscending && !state.shopDescended && !state.isCreating) {
    _drawBeam(ctx, cx, cy, r, state.expression === HEAD_EXPR_DESPERATE ? 'rgba(200,40,20,0.35)' : null);
  }

  ctx.restore();
}

function _drawEyes(ctx, cx, cy, r) {
  const eyeY   = cy - r * 0.15;
  const eyeSep = r * 0.38;
  const eyeR   = r * 0.14;

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeSep;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeR, eyeR * 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1008';
    ctx.fill();
    // Glow for READY/GRIN
    if (state.expression === HEAD_EXPR_READY || state.expression === HEAD_EXPR_GRIN) {
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR * 1.4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 220, 80, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Wide/alarmed for WARN
    if (state.expression === HEAD_EXPR_WARN) {
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, eyeR * 1.3, eyeR * 1.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 80, 40, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function _drawMouth(ctx, cx, cy, r) {
  // Mouth keeps fixed size regardless of head radius (it anchors the beam)
  const mouthY  = cy + 23;
  const mouthW  = 33;
  const openH   = 17 * state.mouthOpenFraction;

  // Outer lip arc
  ctx.beginPath();
  ctx.ellipse(cx, mouthY, mouthW, Math.max(openH, r * 0.04), 0, 0, Math.PI);
  ctx.fillStyle = '#0a0806';
  ctx.fill();
  ctx.strokeStyle = '#3a3020';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Light beam source glow inside open mouth
  if (openH > r * 0.06) {
    const grad = ctx.createRadialGradient(cx, mouthY + openH * 0.3, 0, cx, mouthY + openH * 0.3, openH * 1.5);
    grad.addColorStop(0, 'rgba(255, 240, 160, 0.6)');
    grad.addColorStop(1, 'rgba(255, 200, 60, 0)');
    ctx.beginPath();
    ctx.ellipse(cx, mouthY, mouthW * 0.85, openH, 0, 0, Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function _drawCracks(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(cx - r*0.3, cy - r*0.6); ctx.lineTo(cx + r*0.1, cy + r*0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + r*0.4, cy - r*0.5); ctx.lineTo(cx + r*0.1, cy + r*0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r*0.2, cy + r*0.1); ctx.lineTo(cx - r*0.5, cy + r*0.5); ctx.stroke();
  ctx.restore();
}

function _drawBeam(ctx, cx, cy, r, colorOverride) {
  const fillColor   = colorOverride ?? BEAM_COLOR;
  const strokeColor = colorOverride ? 'rgba(200,30,20,0.9)' : BEAM_EDGE_COLOR;
  const beamTop    = cy + 27;  // fixed anchor at mouth, independent of head radius
  const beamBottom = ctx.canvas.height * (1 - CONFIG.GROUND_RATIO) + 15;
  const halfW      = (BEAM_WIDTH + getBeamWidthBonus()) / 2;

  // Soft fill
  ctx.beginPath();
  ctx.rect(cx - halfW, beamTop, halfW * 2, beamBottom - beamTop);
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Edge lines
  ctx.beginPath();
  ctx.moveTo(cx - halfW, beamTop);
  ctx.lineTo(cx - halfW, beamBottom);
  ctx.moveTo(cx + halfW, beamTop);
  ctx.lineTo(cx + halfW, beamBottom);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();
}
