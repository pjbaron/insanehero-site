// renderer.js - Drawing helpers for Asteroid Miner
// All functions accept world coordinates; camera transform applied externally.
import { MODULE_DEFS } from './modules.js';

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

let _stars = null;

function generateStars(canvasW, canvasH) {
  const rng = seededRandom(7337);
  _stars = [];
  const depths = [0.2, 0.5, 0.8];
  for (let i = 0; i < 200; i++) {
    const depth = depths[Math.floor(rng() * 3)];
    _stars.push({
      x: rng() * canvasW,
      y: rng() * canvasH,
      depth,
      brightness: 0.3 + rng() * 0.7,
      size: 0.5 + rng() * (depth > 0.6 ? 1.0 : 0.5),
      blue: rng() > 0.7,
    });
  }
}

export function drawStarfield(ctx, camera) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  if (!_stars) generateStars(W, H);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (const star of _stars) {
    const sx = ((star.x - camera.x * star.depth) % W + W) % W;
    const sy = ((star.y - camera.y * star.depth) % H + H) % H;
    ctx.globalAlpha = star.brightness;
    ctx.fillStyle = star.blue ? '#aabbff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function clearScreen(ctx) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

export function drawWorldBounds(ctx, camera) {
  const { worldWidth, worldHeight } = camera;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 15]);
  ctx.strokeRect(0, 0, worldWidth, worldHeight);
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawShipShape(ctx, x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const tip = size;
  const base = size * 0.6;
  const rear = -size * 0.7;

  ctx.beginPath();
  ctx.moveTo(tip, 0);
  ctx.lineTo(rear, -base);
  ctx.lineTo(rear * 0.55, 0);
  ctx.lineTo(rear, base);
  ctx.closePath();

  ctx.strokeStyle = '#a0f0f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawBullet(ctx, x, y) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe000';
  ctx.fill();
  ctx.restore();
}

export function drawAsteroid(ctx, x, y, radius, seed, hitFlash = 0) {
  const rng = seededRandom(seed);
  const vertexCount = 8 + Math.floor(rng() * 5); // 8-12
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2;
    const jitter = 0.65 + rng() * 0.7; // 0.65-1.35 of radius
    const r = radius * jitter;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(hitFlash / 0.1) * 0.45})`;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
  } else {
    ctx.strokeStyle = '#9e8870';
  }
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawDebris(ctx, x, y, radius, seed, collectPulse = 0) {
  const rng = seededRandom(seed);
  const vertexCount = 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2;
    const jitter = 0.6 + rng() * 0.8;
    const r = radius * jitter;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = '#70d090';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (collectPulse > 0) {
    const alpha = collectPulse / 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (1 + alpha * 0.6), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,255,120,${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCrusher(ctx, x, y, radius, animAngle = 0, consumePulse = 0) {
  const teeth = 10;
  const scale = 1 + consumePulse * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(animAngle);
  if (scale !== 1) ctx.scale(scale, scale);

  // Outer gear-tooth ring
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? radius : radius * 0.82;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = '#e05010';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Middle concentric ring
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
  ctx.strokeStyle = '#c03a08';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner hub
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
  ctx.strokeStyle = '#ff6030';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

export function drawTether(ctx, x1, y1, x2, y2) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(160,220,255,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawTrader(ctx, x, y, angle, animPhase) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Engine trails: two parallel lines flickering behind the ship
  const trailLen = 10 + Math.sin(animPhase * 8) * 6;
  const flicker1 = 0.4 + Math.sin(animPhase * 11) * 0.3;
  const flicker2 = 0.4 + Math.cos(animPhase * 13) * 0.3;
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(200,100,255,${flicker1})`;
  ctx.beginPath();
  ctx.moveTo(-10, -5);
  ctx.lineTo(-10 - trailLen, -5);
  ctx.stroke();
  ctx.strokeStyle = `rgba(200,100,255,${flicker2})`;
  ctx.beginPath();
  ctx.moveTo(-10, 5);
  ctx.lineTo(-10 - trailLen, 5);
  ctx.stroke();

  // Hexagonal ship body
  const r = 14;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = '#dd44ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner diamond accent
  const d = 7;
  ctx.beginPath();
  ctx.moveTo(d, 0);
  ctx.lineTo(0, d);
  ctx.lineTo(-d, 0);
  ctx.lineTo(0, -d);
  ctx.closePath();
  ctx.strokeStyle = '#ff88ff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

export function drawTraderPing(ctx, canvasWidth, canvasHeight, traderScreenX, traderScreenY, traderWorldX, traderWorldY, shipWorldX, shipWorldY) {
  const onScreen =
    traderScreenX >= 0 &&
    traderScreenX <= canvasWidth &&
    traderScreenY >= 0 &&
    traderScreenY <= canvasHeight;

  const dx = traderWorldX - shipWorldX;
  const dy = traderWorldY - shipWorldY;
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
  const distText = dist + 'm';

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (onScreen) {
    // Subtle diamond indicator above the trader
    const ix = traderScreenX;
    const iy = traderScreenY - 28;
    const d = 7;
    ctx.beginPath();
    ctx.moveTo(ix, iy - d);
    ctx.lineTo(ix + d, iy);
    ctx.lineTo(ix, iy + d);
    ctx.lineTo(ix - d, iy);
    ctx.closePath();
    ctx.strokeStyle = '#dd44ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#dd44ff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(distText, ix, iy - d - 5);
  } else {
    // Pulsing arrow at screen edge pointing toward trader
    const margin = 24;
    const angle = Math.atan2(dy, dx);
    let ax = canvasWidth / 2 + Math.cos(angle) * (canvasWidth / 2 - margin);
    let ay = canvasHeight / 2 + Math.sin(angle) * (canvasHeight / 2 - margin);

    // Clamp to screen edge
    const scaleX = (canvasWidth / 2 - margin) / Math.abs(canvasWidth / 2 + Math.cos(angle) * canvasWidth / 2 - canvasWidth / 2 || 1);
    const edgeX = Math.max(margin, Math.min(canvasWidth - margin, ax));
    const edgeY = Math.max(margin, Math.min(canvasHeight - margin, ay));

    // Recompute properly: clamp the ray to canvas bounds
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const tx = Math.cos(angle);
    const ty = Math.sin(angle);
    const tRight  = tx > 0 ? (canvasWidth  - margin - cx) / tx : Infinity;
    const tLeft   = tx < 0 ? (margin - cx) / tx : Infinity;
    const tBottom = ty > 0 ? (canvasHeight - margin - cy) / ty : Infinity;
    const tTop    = ty < 0 ? (margin - cy) / ty : Infinity;
    const t = Math.min(tRight, tLeft, tBottom, tTop);
    const arrowX = cx + tx * t;
    const arrowY = cy + ty * t;

    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);
    ctx.strokeStyle = '#dd44ff';
    ctx.fillStyle = '#dd44ff';
    ctx.lineWidth = 2;
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-4, -7);
    ctx.lineTo(-4, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#dd44ff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(distText, arrowX, arrowY - 14);
  }

  ctx.restore();
}

// ---- Grid ship rendering ----
// Coordinate convention: grid -Y is ship forward.
// After ctx.rotate(ship.angle), canvas +X aligns with ship forward.
// Grid displacement (dx, dy) from CoM → canvas offset via: cx = -dy, cy = dx.

const _CELL = 16; // must match CELL_SIZE in ship_grid.js

// Convert grid-local pixel displacement (from CoM) to rotated canvas offset.
function _gc(dx, dy) { return [-dy, dx]; }

// Canvas direction vector (unit) for an exhaust discharge direction.
// Derived from grid-to-canvas transform: grid (gx, gy) → canvas (-gy, gx).
function _exDir(exhaustDir) {
  switch (exhaustDir) {
    case 'down':  return [-1,  0]; // grid +Y → canvas -X (rearward)
    case 'up':    return [ 1,  0]; // grid -Y → canvas +X (forward / retro)
    case 'left':  return [ 0, -1]; // grid -X → canvas -Y
    case 'right': return [ 0,  1]; // grid +X → canvas +Y
    default:      return [ 0,  0];
  }
}

// Draw a single module cell centred at (0,0) in the caller's transform.
// cw/ch: canvas-space extents (X and Y respectively).
function _drawModuleCell(ctx, mod, cw, ch) {
  const hw = cw / 2, hh = ch / 2;
  const t = mod.type;
  ctx.save();

  switch (t) {
    case 'cockpit':
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw, -hh, cw, ch);
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;

    case 'small_engine':
    case 'medium_engine':
    case 'retro_brake': {
      const ed = _exDir(mod.def.exhaustDir);
      if (mod.firing) {
        const gl = 18 + Math.random() * 8;
        const g = ctx.createLinearGradient(0, 0, ed[0] * gl, ed[1] * gl);
        g.addColorStop(0, 'rgba(80,220,255,0.55)');
        g.addColorStop(1, 'rgba(0,80,200,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-hw, -hh, cw, ch);
      }
      ctx.strokeStyle = '#00e8ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw, -hh, cw, ch);
      // Arrow in thrust direction (opposite of exhaust)
      const ax = -ed[0], ay = -ed[1];
      const aLen = 4;
      const px = -ay, py = ax; // perpendicular
      ctx.strokeStyle = '#00e8ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-ax * aLen, -ay * aLen);
      ctx.lineTo( ax * aLen,  ay * aLen);
      ctx.moveTo(ax * aLen, ay * aLen);
      ctx.lineTo(ax * aLen - ax * 2 + px * 2, ay * aLen - ay * 2 + py * 2);
      ctx.moveTo(ax * aLen, ay * aLen);
      ctx.lineTo(ax * aLen - ax * 2 - px * 2, ay * aLen - ay * 2 - py * 2);
      ctx.stroke();
      break;
    }

    case 'small_gun':
    case 'medium_gun':
      ctx.strokeStyle = '#ff3030';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw, -hh, cw, ch);
      // Barrel pointing forward (canvas +X)
      ctx.strokeStyle = '#ff5050';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.1, 0);
      ctx.lineTo(hw * 0.85, 0);
      ctx.stroke();
      break;

    case 'small_net':
    case 'large_net':
      ctx.strokeStyle = '#00cc44';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw, -hh, cw, ch);
      ctx.strokeStyle = 'rgba(0,180,60,0.45)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(i * hw * 0.55, -hh * 0.85);
        ctx.lineTo(i * hw * 0.55,  hh * 0.85);
        ctx.moveTo(-hw * 0.85, i * hh * 0.55);
        ctx.lineTo( hw * 0.85, i * hh * 0.55);
      }
      ctx.stroke();
      break;

    case 'micro_reactor':
    case 'power_reactor':
      ctx.strokeStyle = '#ffe000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw, -hh, cw, ch);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(hw, hh) * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffe000';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;

    case 'fuel_tank':
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw, -hh, cw, ch);
      ctx.fillStyle = '#ff8800';
      ctx.font = `bold ${Math.min(cw, ch) * 0.65}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, 0);
      break;

    case 'hull_plate':
      ctx.fillStyle = '#383848';
      ctx.fillRect(-hw, -hh, cw, ch);
      ctx.strokeStyle = '#7a7a8a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-hw, -hh, cw, ch);
      break;

    case 'armor_plate':
      ctx.fillStyle = '#484858';
      ctx.fillRect(-hw, -hh, cw, ch);
      ctx.strokeStyle = '#b8b8cc';
      ctx.lineWidth = 2;
      ctx.strokeRect(-hw, -hh, cw, ch);
      break;

    case 'tractor_beam': {
      const active = mod.tractorActive !== false;
      ctx.strokeStyle = active ? '#00ffee' : '#006655';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw, -hh, cw, ch);
      // Inward-pointing arrows to symbolise pull.
      ctx.strokeStyle = active ? '#00ffee' : '#006655';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const ar = Math.min(hw, hh) * 0.55;
      // Four cardinal inward arrows.
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        ctx.moveTo(dx * ar, dy * ar);
        ctx.lineTo(dx * ar * 0.3, dy * ar * 0.3);
      }
      ctx.stroke();
      break;
    }

    default: {
      // Trader/misc modules: magenta outline + first letter of name
      ctx.strokeStyle = '#dd44ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-hw, -hh, cw, ch);
      ctx.fillStyle = '#dd44ff';
      ctx.font = `bold ${Math.min(cw, ch) * 0.5}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((mod.def.name || t).charAt(0).toUpperCase(), 0, 0);
      break;
    }
  }

  // Damaged overlay: red tint + cracked lines
  if (mod.damaged) {
    ctx.fillStyle = 'rgba(255,0,0,0.28)';
    ctx.fillRect(-hw, -hh, cw, ch);
    ctx.strokeStyle = 'rgba(255,80,80,0.65)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.5, -hh * 0.6);
    ctx.lineTo( hw * 0.3,  hh * 0.5);
    ctx.moveTo( hw * 0.1, -hh * 0.55);
    ctx.lineTo(-hw * 0.15, hh * 0.65);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw the grid-based ship centred on ship.x, ship.y (world CoM).
// ship must have: x, y, angle, grid (ShipGrid).
// Modules with mod.firing === true show exhaust glow and trails.
// debugCoM = true draws a crosshair at the CoM (default false).
export function drawGridShip(ctx, ship, debugCoM = false) {
  if (!ship.grid) return;
  const grid = ship.grid;
  const com = grid.calculateCoM();
  const brownout = !grid.isPowerSufficient();
  const now = Date.now();

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  // Pass 1: empty cells (very dim dotted outline to show grid structure)
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.cells[r][c]) continue;
      const [cx, cy] = _gc(
        (c + 0.5) * _CELL - com.x,
        (r + 0.5) * _CELL - com.y
      );
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.strokeRect(-_CELL / 2, -_CELL / 2, _CELL, _CELL);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Pass 2: occupied modules + record firing exhaust ports for trail pass
  const exhaustPorts = [];
  const seen = new Set();
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const mod = grid.cells[r][c];
      if (!mod || seen.has(mod)) continue;
      seen.add(mod);

      const w = mod.def.gridW || 1;
      const h = mod.def.gridH || 1;
      const [cx, cy] = _gc(
        (mod.gridX + w / 2) * _CELL - com.x,
        (mod.gridY + h / 2) * _CELL - com.y
      );

      // After grid→canvas rotation: grid-X extent → canvas-Y, grid-Y extent → canvas-X
      const canvW = h * _CELL;
      const canvH = w * _CELL;

      ctx.save();
      ctx.translate(cx, cy);
      if (mod.type === 'tractor_beam' && mod.tractorActive === false) {
        ctx.globalAlpha = 0.35;
      } else if (brownout) {
        // Flicker each module with a unique phase so they don't all pulse together
        const phase = mod.gridX * 1.37 + mod.gridY * 2.11;
        ctx.globalAlpha = 0.38 + 0.52 * Math.abs(Math.sin(now * 0.022 + phase));
      }
      _drawModuleCell(ctx, mod, canvW, canvH);
      ctx.restore();

      if (mod.firing && mod.def.hasExhaust) {
        const ed = _exDir(mod.def.exhaustDir);
        exhaustPorts.push({
          x: cx + ed[0] * canvW / 2,
          y: cy + ed[1] * canvH / 2,
          dx: ed[0],
          dy: ed[1],
        });
      }
    }
  }

  // Pass 3: exhaust particle trails (3 fading dots behind each firing engine)
  // During brownout, trails become intermittent (sputtery).
  const exhaustVisible = !brownout || Math.sin(now * 0.014) > 0.08;
  for (const p of exhaustPorts) {
    if (!exhaustVisible) continue;
    for (let i = 1; i <= 3; i++) {
      const dist = i * 7;
      const radius = Math.max(0.5, 2.5 - i * 0.5);
      const alpha = ((4 - i) / 4 * 0.65).toFixed(2);
      ctx.beginPath();
      ctx.arc(p.x + p.dx * dist, p.y + p.dy * dist, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,200,255,${alpha})`;
      ctx.fill();
    }
  }

  // Brownout: dim outline rings the ship silhouette
  if (brownout) {
    const outlineAlpha = 0.12 + 0.08 * Math.sin(now * 0.007);
    ctx.globalAlpha = outlineAlpha;
    ctx.strokeStyle = 'rgba(80,120,160,1)';
    ctx.lineWidth = 1.5;
    const maxDim = Math.max(grid.rows, grid.cols);
    ctx.beginPath();
    ctx.arc(0, 0, (maxDim * _CELL) / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Optional CoM debug crosshair at world CoM (origin in this transform)
  if (debugCoM) {
    ctx.strokeStyle = 'rgba(255,255,80,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
    ctx.moveTo(0, -6); ctx.lineTo(0, 6);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw an orbiting module at its world position with tether line and orbit trail.
// orbitingModule must have: x, y, angle, orbitRadius, type.
// shipX/shipY is the ship's world CoM (orbit centre).
// lineTargetX/Y is where the tether line is drawn from (defaults to CoM; pass cockpit position for clarity).
// queuePos is the 0-based dock queue position (0 = next to dock, shown with bright ring + label).
export function drawOrbitingModule(ctx, orbitingModule, shipX, shipY, lineTargetX = shipX, lineTargetY = shipY, queuePos = 0) {
  const def = MODULE_DEFS[orbitingModule.type];
  if (!def) return;

  const r = orbitingModule.orbitRadius;
  const now = Date.now();

  // Full faint dotted orbit circle
  ctx.save();
  ctx.translate(shipX, shipY);
  ctx.setLineDash([4, 8]);
  ctx.strokeStyle = 'rgba(100,180,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Faint orbit trail: short arc behind the module centred at ship position
  ctx.save();
  ctx.translate(shipX, shipY);
  ctx.beginPath();
  ctx.arc(0, 0, r, orbitingModule.angle - 1.2, orbitingModule.angle);
  ctx.strokeStyle = 'rgba(100,200,255,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Solid tether from command centre to module
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(lineTargetX, lineTargetY);
  ctx.lineTo(orbitingModule.x, orbitingModule.y);
  ctx.strokeStyle = 'rgba(160,220,255,0.65)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Pulsing glow ring around module (sized to exactly one grid cell)
  const iconW = (def.gridW || 1) * _CELL;
  const iconH = (def.gridH || 1) * _CELL;
  const glowR = Math.max(iconW, iconH) * 0.62 + 3;
  const isNext = queuePos === 0;
  const glowPulse = isNext
    ? 0.55 + 0.45 * Math.sin(now * 0.006)  // brighter pulse for next
    : 0.2 + 0.15 * Math.sin(now * 0.004);
  ctx.save();
  ctx.translate(orbitingModule.x, orbitingModule.y);
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.strokeStyle = isNext
    ? `rgba(80,255,140,${glowPulse.toFixed(3)})`
    : `rgba(80,210,255,${glowPulse.toFixed(3)})`;
  ctx.lineWidth = isNext ? 2.5 : 1.5;
  ctx.stroke();

  // Queue number label
  const labelText = isNext ? 'F:DOCK' : `#${queuePos + 1}`;
  ctx.font = isNext ? 'bold 10px monospace' : '9px monospace';
  ctx.fillStyle = isNext ? '#80ff90' : 'rgba(160,220,255,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText(labelText, 0, -glowR - 4);
  ctx.restore();

  // Module icon at true grid-cell size
  const fakeMod = { type: orbitingModule.type, def, firing: false, damaged: false };
  ctx.save();
  ctx.translate(orbitingModule.x, orbitingModule.y);
  _drawModuleCell(ctx, fakeMod, iconW, iconH);
  ctx.restore();
}

// Draw ghost preview cells on the ship grid showing where a module would dock.
// Color: green (valid), yellow (valid but exhaust warning), red (invalid).
// shipGrid is required to compute the grid CoM for coordinate mapping.
export function drawDockPreview(ctx, preview, shipX, shipY, shipAngle, shipGrid) {
  if (!preview || !preview.cells || preview.cells.length === 0) return;

  const com = shipGrid.calculateCoM();

  let fillColor, strokeR, strokeG, strokeB;
  if (!preview.valid) {
    fillColor = 'rgba(255,50,50,0.3)';
    [strokeR, strokeG, strokeB] = [255, 80, 80];
  } else if (preview.warning === 'exhaust') {
    fillColor = 'rgba(255,220,0,0.3)';
    [strokeR, strokeG, strokeB] = [255, 220, 0];
  } else {
    fillColor = 'rgba(50,220,50,0.3)';
    [strokeR, strokeG, strokeB] = [80, 255, 80];
  }
  // Smoothly pulse the stroke alpha so the preview cell isn't jarring
  const pulseA = (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(Date.now() * 0.007))).toFixed(3);
  const strokeColor = `rgba(${strokeR},${strokeG},${strokeB},${pulseA})`;

  ctx.save();
  ctx.translate(shipX, shipY);
  ctx.rotate(shipAngle);

  for (const cell of preview.cells) {
    const [cx, cy] = _gc(
      (cell.gridX + 0.5) * _CELL - com.x,
      (cell.gridY + 0.5) * _CELL - com.y,
    );
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = fillColor;
    ctx.fillRect(-_CELL / 2, -_CELL / 2, _CELL, _CELL);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-_CELL / 2, -_CELL / 2, _CELL, _CELL);
    ctx.restore();
  }

  // Small warning indicator above the first cell when in exhaust zone
  if (preview.warning === 'exhaust' && preview.cells.length > 0) {
    const fc = preview.cells[0];
    const [cx, cy] = _gc(
      (fc.gridX + 0.5) * _CELL - com.x,
      (fc.gridY + 0.5) * _CELL - com.y,
    );
    ctx.save();
    ctx.translate(cx, cy - _CELL);
    ctx.fillStyle = 'rgba(255,220,0,0.9)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// Dock flash: white cell pulse + ship outline highlight + optional CoM shift arrow.
// effect = { timer, maxTimer, cells: [{gridX, gridY}], comDx, comDy }
// Rendered in world space at the ship's position/angle.
export function drawDockFlash(ctx, effect, ship) {
  if (!effect || effect.timer <= 0) return;
  const alpha = effect.timer / effect.maxTimer;
  const com = ship.grid.calculateCoM();

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  // White flash on the newly docked cells
  ctx.globalAlpha = alpha * 0.82;
  ctx.fillStyle = '#ffffff';
  for (const cell of effect.cells) {
    const [cx, cy] = _gc(
      (cell.gridX + 0.5) * _CELL - com.x,
      (cell.gridY + 0.5) * _CELL - com.y,
    );
    ctx.fillRect(cx - _CELL / 2, cy - _CELL / 2, _CELL, _CELL);
  }

  // Ship silhouette outline highlight
  const maxDim = Math.max(ship.grid.cols, ship.grid.rows);
  const radius = (maxDim * _CELL) / 2;
  ctx.globalAlpha = alpha * 0.42;
  ctx.strokeStyle = '#d0f0ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // CoM shift arrow (only when shift is noticeable)
  const shiftDist = Math.sqrt(effect.comDx ** 2 + effect.comDy ** 2);
  if (shiftDist > 1.5) {
    // Grid-pixel vector (comDx, comDy) → canvas via _gc: canvas_x = -comDy, canvas_y = comDx
    const canvDx = -effect.comDy;
    const canvDy = effect.comDx;
    const arrLen = Math.min(shiftDist * 1.6, 22);
    const scale = arrLen / shiftDist;
    const ex = canvDx * scale;
    const ey = canvDy * scale;
    const nl = Math.sqrt(ex * ex + ey * ey) || 1;
    const nx = ex / nl, ny = ey / nl;
    const px = -ny, py = nx; // perpendicular unit
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = '#ffdd20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Arrowhead
    const headLen = 5;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - nx * headLen + px * 3, ey - ny * headLen + py * 3);
    ctx.lineTo(ex - nx * headLen - px * 3, ey - ny * headLen - py * 3);
    ctx.closePath();
    ctx.fillStyle = '#ffdd20';
    ctx.fill();
  }

  ctx.restore();
}

export function drawTraderDeparting(ctx, canvasWidth, canvasHeight, timeRemaining) {
  if (timeRemaining <= 0 || timeRemaining > 15) return;

  // Flash rate increases as time runs out: at 15s -> 1Hz, at 0s -> 4Hz
  const flashRate = 1 + (1 - timeRemaining / 15) * 3;
  const visible = Math.sin(Date.now() * 0.001 * Math.PI * 2 * flashRate) > 0;
  if (!visible) return;

  const secs = Math.ceil(timeRemaining);
  const text = 'TRADER DEPARTING: ' + secs + 's';

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const bannerH = 32;
  const bannerY = 12;
  ctx.fillStyle = 'rgba(80,0,80,0.7)';
  ctx.fillRect(0, bannerY, canvasWidth, bannerH);

  ctx.fillStyle = '#ff44ff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasWidth / 2, bannerY + bannerH / 2);

  ctx.restore();
}
