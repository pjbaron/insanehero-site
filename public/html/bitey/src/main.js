// Entry point: responsive canvas, follow-camera with screen-shake, characterful
// rendering, juice, HUD, mobile on-screen controls, and title / game-over flow.

import * as cfg from './config.js';
import { InputManager } from './input.js';
import { Game } from './game.js';
import { Audio } from './audio.js';
import { PU_META } from './powerups.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new InputManager(window);
const audio = new Audio();
const game = new Game();

let accumulator = 0;
let lastTime = performance.now();

// --- Reactive viewport ---------------------------------------------------
// The design height is locked (so the ground/sky framing is consistent), but the
// design WIDTH flexes to the window's aspect ratio and the canvas is filled
// exactly - no letterbox bars, and nothing renders outside the play area.
// W and H are the current design-space dimensions; everything draws against them.
const S = cfg.BTN_SIZE, M = cfg.BTN_MARGIN;
const DESIGN_H = cfg.CANVAS_HEIGHT;
let W = cfg.CANVAS_WIDTH;   // dynamic design width (set in resize)
let H = DESIGN_H;           // design height (locked)
let view = { scale: 1, dpr: 1 };

let cameraX = game.player.centerX - W * 0.5;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const cssW = window.innerWidth, cssH = window.innerHeight;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  // Lock height, fill width: the visible slice of world widens with the window.
  const scale = cssH / DESIGN_H;
  W = cssW / scale;
  H = DESIGN_H;
  view = { scale, dpr };
  layoutButtons();
}

// Map a client (screen) point into design-space coordinates.
function toDesign(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (clientX - r.left) / view.scale,
    y: (clientY - r.top) / view.scale,
  };
}

// ---------------------------------------------------------------------------
// On-screen buttons. Anchored to the screen corners; positions are recomputed on
// every resize so they track the dynamic width. Touch-friendly circular zones.
// ---------------------------------------------------------------------------
const buttons = {
  left:    { action: 'left',    cx: 0, cy: 0, r: S * 0.5,  label: '<' },
  right:   { action: 'right',   cx: 0, cy: 0, r: S * 0.5,  label: '>' },
  jump:    { action: 'jump',    cx: 0, cy: 0, r: S * 0.62, label: 'JUMP' },
  special: { action: 'special', cx: 0, cy: 0, r: S * 0.5,  label: 'BOOM' },
};
function layoutButtons() {
  buttons.left.cx = M + S * 0.5;            buttons.left.cy = H - M - S * 0.5;
  buttons.right.cx = M * 2 + S * 1.5;       buttons.right.cy = H - M - S * 0.5;
  buttons.jump.cx = W - M - S * 0.5;        buttons.jump.cy = H - M - S * 0.5;
  buttons.special.cx = W - M * 2 - S * 1.7; buttons.special.cy = H - M - S * 0.45;
}
const HOLD = { left: true, right: true, jump: false, special: false }; // hold vs tap

window.addEventListener('resize', resize);
resize();

const activePointers = new Map(); // pointerId -> button key

function buttonAt(dx, dy) {
  for (const key in buttons) {
    if (key === 'special' && game.weapons.charges <= 0) continue;
    const b = buttons[key];
    if ((dx - b.cx) ** 2 + (dy - b.cy) ** 2 <= b.r * b.r) return key;
  }
  return null;
}

function firstGesture() {
  audio.unlock();
  if (!game.started) game.started = true;
}

function onPointerDown(e) {
  e.preventDefault();
  firstGesture();
  if (game.gameOver) { input.pressVirtual('restart'); return; }
  const d = toDesign(e.clientX, e.clientY);
  const key = buttonAt(d.x, d.y);
  if (!key) return;
  activePointers.set(e.pointerId, key);
  if (HOLD[key]) input.setVirtual(buttons[key].action, true);
  else input.pressVirtual(buttons[key].action);
}
function onPointerUp(e) {
  const key = activePointers.get(e.pointerId);
  if (key && HOLD[key]) input.setVirtual(buttons[key].action, false);
  activePointers.delete(e.pointerId);
}
function onPointerMove(e) {
  if (!activePointers.has(e.pointerId)) return;
  const prev = activePointers.get(e.pointerId);
  if (!HOLD[prev]) return; // taps don't slide
  const d = toDesign(e.clientX, e.clientY);
  const key = buttonAt(d.x, d.y);
  if (key === prev) return;
  input.setVirtual(buttons[prev].action, false); // slid off
  if (key && HOLD[key]) { input.setVirtual(buttons[key].action, true); activePointers.set(e.pointerId, key); }
  else activePointers.delete(e.pointerId);
}
canvas.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('keydown', firstGesture, { once: false });

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function clampCamera() {
  const maxX = Math.max(0, cfg.WORLD_WIDTH - W);
  if (cameraX < 0) cameraX = 0;
  if (cameraX > maxX) cameraX = maxX;
}

function update(dt) {
  if (!game.started) return;
  game.update(dt, input, audio);
  const targetX = game.player.centerX - W * 0.5;
  cameraX += (targetX - cameraX) * Math.min(1, cfg.CAMERA_LERP * dt);
  clampCamera();
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground() {
  // Sky gradient.
  const g = ctx.createLinearGradient(0, 0, 0, cfg.GROUND_Y);
  g.addColorStop(0, '#1a1530');
  g.addColorStop(1, '#3a2545');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, cfg.GROUND_Y);

  // Moon.
  ctx.fillStyle = '#d8d0e8';
  ctx.beginPath();
  ctx.arc(W - 180, 120, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2545';
  ctx.beginPath();
  ctx.arc(W - 160, 108, 40, 0, Math.PI * 2);
  ctx.fill();

  // Parallax hills (slow). Loop counts derive from W so they cover any width.
  const px = -cameraX * 0.25;
  ctx.fillStyle = '#241a38';
  const hills = Math.ceil(W / 600) + 2;
  for (let i = -1; i < hills; i++) {
    const bx = px % 600 + i * 600;
    ctx.beginPath();
    ctx.moveTo(bx, cfg.GROUND_Y);
    ctx.quadraticCurveTo(bx + 300, cfg.GROUND_Y - 220, bx + 600, cfg.GROUND_Y);
    ctx.fill();
  }
  // Parallax buildings (mid).
  const bx0 = -cameraX * 0.5;
  ctx.fillStyle = '#1d1730';
  const bld = Math.ceil(W / 360) + 2;
  for (let i = -1; i < bld; i++) {
    const x = (bx0 % 360) + i * 360;
    const hgt = 120 + ((i * 53) % 140);
    ctx.fillRect(x, cfg.GROUND_Y - hgt, 200, hgt);
  }
}

function drawGround() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  ctx.fillStyle = '#171a17';
  ctx.fillRect(0, cfg.GROUND_Y, cfg.WORLD_WIDTH, H - cfg.GROUND_Y + 40);
  ctx.strokeStyle = '#46603e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, cfg.GROUND_Y);
  ctx.lineTo(cfg.WORLD_WIDTH, cfg.GROUND_Y);
  ctx.stroke();
  // Texture ticks.
  ctx.strokeStyle = 'rgba(70,96,62,0.35)';
  ctx.lineWidth = 2;
  for (let x = 0; x < cfg.WORLD_WIDTH; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, cfg.GROUND_Y + 6);
    ctx.lineTo(x + 22, cfg.GROUND_Y + 22);
    ctx.stroke();
  }
  // World end wall (right) - the out-of-world death.
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(cfg.WORLD_WIDTH, 0, 200, H);
  ctx.restore();
}

function drawObstacles() {
  for (const o of game.world.obstacles) {
    const t = Math.max(0, o.hp / o.maxHp);
    // Platform = warm timber slab; support pillar = blue-grey; plain wall = red-grey.
    let base = o.isPlatform ? [150, 110, 70]
             : o.isSupport ? [96, 104, 140]
             : [130, 96, 96];
    if (o.hitFlash > 0) base = [255, 255, 255];
    // Anything that has lost its support flashes a warning red as it drops.
    if (o.falling) base = [210, 90, 70];
    const shade = o.isPlatform ? 1 : 0.4 + 0.6 * t;
    ctx.fillStyle = `rgb(${base[0] * shade | 0},${base[1] * shade | 0},${base[2] * shade | 0})`;
    roundRect(o.x, o.y, o.w, o.h, 4);
    ctx.fill();
    if (o.isPlatform) {
      // Plank lines on top for readability.
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      for (let px = o.x + 14; px < o.x + o.w; px += 28) {
        ctx.beginPath(); ctx.moveTo(px, o.y); ctx.lineTo(px, o.y + o.h); ctx.stroke();
      }
    } else if (t < 0.66) {
      // Cracks as a wall/pillar gets chewed down.
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x + o.w * 0.3, o.y);
      ctx.lineTo(o.x + o.w * 0.5, o.y + o.h * 0.5);
      ctx.lineTo(o.x + o.w * 0.35, o.y + o.h);
      ctx.stroke();
    }
  }
}

function drawPowerups() {
  const now = performance.now();
  for (const p of game.powerups.list) {
    if (p.taken) continue;
    const meta = PU_META[p.type];
    const secsLeft = p.expireAt - game.survivalSeconds;
    // Blink in the last 8s before it despawns.
    if (secsLeft < 8 && Math.floor(now / 150) % 2 === 0) continue;
    const bob = Math.sin(now / 250 + p.x) * 6;
    const x = p.x, y = p.y + bob;
    // Glow.
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(x + p.w / 2, y + p.h / 2, 32 + Math.sin(now / 200) * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = meta.color;
    roundRect(x, y, p.w, p.h, 5); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    roundRect(x, y, p.w, p.h, 5); ctx.stroke();
    ctx.fillStyle = '#1a1226';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(meta.letter, x + p.w / 2, y + p.h / 2 + 8);
    // Down-arrow beacon above.
    ctx.fillStyle = meta.color;
    const ay = y - 26 + Math.sin(now / 200) * 4;
    ctx.beginPath();
    ctx.moveTo(x + p.w / 2 - 8, ay);
    ctx.lineTo(x + p.w / 2 + 8, ay);
    ctx.lineTo(x + p.w / 2, ay + 12);
    ctx.fill();
  }
  ctx.textAlign = 'left';
}

// Body colour ramps with speed: slow shamblers are dull green, fast runners go
// a sickly hot yellow-orange, so the wave front reads at a glance.
function zombieColor(z, lighten) {
  const lo = cfg.ZOMBIE_SPEED_FRAC * cfg.ZOMBIE_SPEED_VAR_MIN;
  const hi = cfg.ZOMBIE_SPEED_MAX_FRAC;
  const t = Math.max(0, Math.min(1, (z.speedFrac - lo) / (hi - lo)));
  const r = Math.round((90 + t * 150) + lighten);
  const g = Math.round((150 - t * 20) + lighten);
  const b = Math.round((75 - t * 35) + lighten);
  return `rgb(${r},${g},${b})`;
}

function drawZombie(z) {
  const cx = z.x + z.w / 2;
  const fast = z.speedFrac > cfg.ZOMBIE_SPEED_FRAC; // above base = a "runner"
  const lean = Math.sin(z.wobble + performance.now() / (fast ? 110 : 220)) * 2;
  ctx.save();
  ctx.translate(cx, z.y + z.h);
  ctx.rotate(lean * 0.01);
  const bodyTop = -z.h;
  // Body.
  ctx.fillStyle = z.hitFlash > 0 ? '#ffffff' : zombieColor(z, 0);
  roundRect(-z.w / 2, bodyTop + 14, z.w, z.h - 14, 5); ctx.fill();
  // Head.
  ctx.fillStyle = z.hitFlash > 0 ? '#ffffff' : zombieColor(z, 14);
  ctx.beginPath();
  ctx.arc(0, bodyTop + 12, 11, 0, Math.PI * 2);
  ctx.fill();
  // Eyes (face the player => left, since tide chases right).
  ctx.fillStyle = '#b22';
  const ex = game.player.centerX >= z.x ? 3 : -3;
  ctx.fillRect(ex - 5, bodyTop + 8, 3, 4);
  ctx.fillRect(ex + 1, bodyTop + 8, 3, 4);
  // Arms reaching forward.
  ctx.strokeStyle = z.hitFlash > 0 ? '#ffffff' : zombieColor(z, 0);
  ctx.lineWidth = 5;
  const reach = game.player.centerX >= z.x ? 12 : -12;
  ctx.beginPath();
  ctx.moveTo(0, bodyTop + 24);
  ctx.lineTo(reach, bodyTop + 20);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const p = game.player;
  const flash = p.hitFlash > 0 && Math.floor(performance.now() / 50) % 2 === 0;
  const cx = p.x + p.w / 2;
  ctx.save();
  ctx.translate(cx, p.y + p.h);
  // Legs shuffle.
  const ph = Math.sin(p.walkPhase);
  ctx.strokeStyle = flash ? '#ffffff' : '#2e6da8';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(-5 + ph * 6, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(5 - ph * 6, 0); ctx.stroke();
  // Body.
  ctx.fillStyle = flash ? '#ffffff' : '#5fa8e0';
  roundRect(-p.w / 2, -p.h, p.w, p.h - 12, 6); ctx.fill();
  // Head.
  ctx.fillStyle = flash ? '#ffffff' : '#7fc0f0';
  ctx.beginPath(); ctx.arc(0, -p.h + 6, 12, 0, Math.PI * 2); ctx.fill();
  // Eye facing aim.
  ctx.fillStyle = '#0a2030';
  ctx.fillRect(p.facing * 3 - 2, -p.h + 2, 4, 4);
  // Gun barrel rotated to point along the aim vector.
  ctx.save();
  ctx.translate(0, -p.h * 0.5);
  ctx.rotate(p.aimAngle || 0);
  ctx.fillStyle = '#cfd6dc';
  ctx.fillRect(0, -3.5, 26, 7);
  ctx.restore();
  ctx.restore();
}

function drawProjectiles() {
  // Bullet tracers, drawn along the travel vector.
  for (const b of game.weapons.bullets) {
    const len = Math.hypot(b.vx, b.vy) || 1;
    const ux = b.vx / len, uy = b.vy / len;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    ctx.strokeStyle = '#fff2a0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - ux * 18, cy - uy * 18);
    ctx.stroke();
  }
  // Grenades (napalm rounds glow orange with a flame trail).
  for (const g of game.weapons.grenades) {
    if (g.small) {
      ctx.fillStyle = 'rgba(255,120,40,0.5)';
      ctx.beginPath(); ctx.arc(g.x + g.w / 2, g.y + g.h / 2, g.w, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(g.x + g.w / 2, g.y + g.h / 2);
    ctx.rotate(g.spin);
    ctx.fillStyle = g.small ? '#ff7a2a' : '#2a2a2a';
    roundRect(-g.w / 2, -g.h / 2, g.w, g.h, 3); ctx.fill();
    if (!g.small) { ctx.fillStyle = '#ff6020'; ctx.fillRect(-2, -g.h / 2 - 3, 4, 3); }
    ctx.restore();
  }
  // Explosions (radius is per-blast, so napalm fireballs are smaller).
  for (const e of game.weapons.explosions) {
    ctx.fillStyle = `rgba(255,160,60,${Math.max(0, e.life * 2.5)})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.maxRadius * (0.6 + (0.25 - e.life)), 0, Math.PI * 2);
    ctx.fill();
  }
}

// Parachute health supplies drifting down (or sitting on the ground).
function drawSupplies() {
  for (const s of game.powerups.supplies) {
    if (s.taken) continue;
    const sway = s.landed ? 0 : Math.sin(s.sway) * 10;
    const x = s.x + sway, y = s.y;
    if (!s.landed) {
      // Canopy.
      ctx.fillStyle = '#cfe8d0';
      ctx.beginPath();
      ctx.arc(x + s.w / 2, y - 18, s.w * 0.9, Math.PI, 0);
      ctx.fill();
      // Rigging.
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 2, y); ctx.lineTo(x + s.w / 2, y - 18);
      ctx.moveTo(x + s.w - 2, y); ctx.lineTo(x + s.w / 2, y - 18);
      ctx.stroke();
    }
    // Crate with a red cross.
    ctx.fillStyle = '#3a5a3a';
    roundRect(x, y, s.w, s.h, 4); ctx.fill();
    ctx.strokeStyle = '#9fe0a0'; ctx.lineWidth = 2;
    roundRect(x, y, s.w, s.h, 4); ctx.stroke();
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(x + s.w / 2 - 3, y + 6, 6, s.h - 12);
    ctx.fillRect(x + 6, y + s.h / 2 - 3, s.w - 12, 6);
  }
}

function drawFX() {
  for (const p of game.fx.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const r of game.fx.rings) {
    ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFloatingText() {
  ctx.textAlign = 'center';
  for (const t of game.fx.texts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life / t.maxLife));
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px monospace`;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------------
// HUD + screens (drawn in design space, no camera)
// ---------------------------------------------------------------------------
function drawHud() {
  // Score - big, centred top.
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px monospace';
  ctx.fillText(String(game.score), W / 2, 50);

  // Combo meter.
  if (game.combo > 0 && game.multiplier > 1) {
    const frac = Math.max(0, game.comboTimer / cfg.COMBO_WINDOW);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = game.multiplier >= 6 ? '#ff5050' : '#ffd24a';
    ctx.fillText('x' + game.multiplier + '  COMBO ' + game.combo, W / 2, 88);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(W / 2 - 120, 98, 240, 7);
    ctx.fillStyle = game.multiplier >= 6 ? '#ff5050' : '#ffd24a';
    ctx.fillRect(W / 2 - 120, 98, 240 * frac, 7);
  }

  // HP bar (top-left). Flashes red/white when bitten; pulses green on a heal.
  ctx.textAlign = 'left';
  const hpFrac = Math.max(0, Math.min(1, game.player.hp / cfg.PLAYER_MAX_HP));
  const hurt = game.player.hitFlash > 0;
  const heal = game.player.healFlash > 0;
  const now = performance.now();
  // Heal pulse: a green glow that swells and fades behind the bar.
  if (heal) {
    const k = game.player.healFlash / cfg.PLAYER_HEAL_FLASH_TIME; // 1 -> 0
    const grow = (1 - k) * 10;
    ctx.fillStyle = `rgba(95,208,106,${0.45 * k})`;
    ctx.fillRect(16 - grow, 16 - grow, 220 + grow * 2, 20 + grow * 2);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(16, 16, 220, 20);
  let fill = hpFrac > 0.3 ? '#5fd06a' : '#ff5050';
  if (heal && Math.floor(now / 80) % 2 === 0) fill = '#b6ffbe'; // bright pulse
  ctx.fillStyle = fill;
  ctx.fillRect(16, 16, 220 * hpFrac, 20);
  // Damage flash: a red wash over the whole bar, strongest right after the bite.
  if (hurt) {
    ctx.fillStyle = `rgba(255,60,60,${0.7 * (game.player.hitFlash / cfg.PLAYER_HIT_FLASH_TIME)})`;
    ctx.fillRect(16, 16, 220, 20);
  }
  ctx.strokeStyle = heal ? '#b6ffbe' : (hurt ? '#ff8080' : '#ffffff');
  ctx.lineWidth = (heal || hurt) ? 2.5 : 1.5;
  ctx.strokeRect(16, 16, 220, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px monospace';
  ctx.fillText('HP', 20, 31);

  // Stats (top-right).
  ctx.textAlign = 'right';
  ctx.font = '16px monospace';
  ctx.fillStyle = '#cfcfcf';
  ctx.fillText('TIME ' + game.survivalSeconds.toFixed(0) + 's', W - 16, 28);
  ctx.fillText('KILLS ' + game.kills, W - 16, 50);

  // Next-drop countdown (crates are scattered; an arrow on the HUD points the way).
  ctx.textAlign = 'center';
  ctx.font = '15px monospace';
  const live = game.powerups.list.filter(p => !p.taken).length;
  ctx.fillStyle = '#9a8';
  const left = game.powerups.secondsUntilNext(game.survivalSeconds);
  ctx.fillText((live > 0 ? live + ' CRATE' + (live > 1 ? 'S' : '') + ' OUT  -  ' : '') +
    'NEXT DROP IN ' + left.toFixed(0) + 's', W / 2, 124);

  // Supply inbound notice when a parachute is in the air.
  if (game.powerups.supplies.some(s => !s.taken && !s.landed)) {
    ctx.fillStyle = '#5fd06a';
    ctx.fillText('SUPPLY INBOUND - catch it!', W / 2, 168);
  } else {
    const sLeft = game.powerups.secondsUntilSupply(game.survivalSeconds);
    ctx.fillStyle = '#5a7a5a';
    ctx.fillText('NEXT SUPPLY IN ' + sLeft.toFixed(0) + 's', W / 2, 168);
  }

  // Active main-weapon buff chips.
  const chips = [];
  if (game.weapons.buffs.rapid > 0) chips.push(['RAPID', game.weapons.buffs.rapid, '#46c0e0']);
  if (game.weapons.buffs.triple > 0) chips.push(['TRIPLE', game.weapons.buffs.triple, '#8a6fe0']);
  if (game.weapons.buffs.heavy > 0) chips.push(['HEAVY', game.weapons.buffs.heavy, '#e06f6f']);
  if (game.weapons.buffs.napalm > 0) chips.push(['NAPALM', game.weapons.buffs.napalm, '#ff7a2a']);
  if (game.weapons.charges > 0) chips.push(['GRENADE x' + game.weapons.charges, null, '#e0a838']);
  let chipX = W / 2 - (chips.length * 130) / 2;
  ctx.font = 'bold 14px monospace';
  for (const [label, time, color] of chips) {
    const txt = time !== null ? label + ' ' + time.toFixed(0) + 's' : label;
    ctx.fillStyle = color;
    ctx.fillText(txt, chipX + 65, 148);
    chipX += 130;
  }

  ctx.textAlign = 'left';
}

// Edge arrows pointing to off-screen crates and supplies. Arrows on the same side
// are stacked vertically so their distance labels never overlap.
function drawCrateArrows() {
  let leftY = 180, rightY = 180;
  const ROW = 26;
  const draw = (worldX, color, letter) => {
    const sx = worldX - cameraX;
    if (sx >= 30 && sx <= W - 30) return;
    ctx.fillStyle = color;
    ctx.font = 'bold 14px monospace';
    if (sx < 30) {
      const y = leftY; leftY += ROW;
      const m = Math.round((cameraX - worldX) / 100);
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(40, y - 11); ctx.lineTo(40, y + 11); ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillText(letter + ' ' + m + 'm', 46, y + 5);
    } else {
      const y = rightY; rightY += ROW;
      const m = Math.round((worldX - cameraX - W) / 100);
      ctx.beginPath(); ctx.moveTo(W - 20, y); ctx.lineTo(W - 40, y - 11); ctx.lineTo(W - 40, y + 11); ctx.fill();
      ctx.textAlign = 'right';
      ctx.fillText(m + 'm ' + letter, W - 46, y + 5);
    }
  };
  for (const p of game.powerups.list) {
    if (!p.taken) draw(p.x + p.w / 2, PU_META[p.type].color, PU_META[p.type].letter);
  }
  for (const s of game.powerups.supplies) {
    if (!s.taken) draw(s.x + s.w / 2, '#5fd06a', '+');
  }
  ctx.textAlign = 'left';
}

function drawButtons() {
  ctx.textAlign = 'center';
  for (const key in buttons) {
    const b = buttons[key];
    const disabled = key === 'special' && game.weapons.charges <= 0;
    if (disabled) continue;
    const pressed = HOLD[key] && input.has(b.action);
    ctx.globalAlpha = pressed ? 0.55 : 0.32;
    ctx.fillStyle = key === 'special' ? '#ff8030' : '#ffffff';
    ctx.beginPath(); ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#101014';
    ctx.font = 'bold ' + (b.label.length > 1 ? 18 : 30) + 'px monospace';
    ctx.fillText(b.label, b.cx, b.cy + 7);
    if (key === 'special') {
      ctx.fillStyle = '#101014';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('x' + game.weapons.charges, b.cx, b.cy + b.r - 4);
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawTitle() {
  ctx.fillStyle = 'rgba(10,8,18,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7cbf6a';
  ctx.font = 'bold 84px monospace';
  ctx.fillText('A BIT BITEY', W / 2, H / 2 - 60);
  ctx.fillStyle = '#cfcfcf';
  ctx.font = '24px monospace';
  ctx.fillText('The dead rise from the left. Hold the line, chase the combo.', W / 2, H / 2 + 0);
  ctx.font = '18px monospace';
  ctx.fillStyle = '#9aa';
  ctx.fillText('MOVE: on-screen buttons or A / D     JUMP: Space     BOOM: K', W / 2, H / 2 + 40);
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 30px monospace';
  const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 300);
  ctx.globalAlpha = pulse;
  ctx.fillText('TAP / PRESS ANY KEY TO START', W / 2, H / 2 + 110);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(10,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5050';
  ctx.font = 'bold 72px monospace';
  ctx.fillText('OVERWHELMED', W / 2, H / 2 - 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px monospace';
  ctx.fillText('SCORE ' + game.score, W / 2, H / 2 - 10);
  ctx.font = '22px monospace';
  ctx.fillStyle = '#cfcfcf';
  ctx.fillText('Survived ' + game.survivalSeconds.toFixed(0) + 's  -  ' + game.kills +
    ' kills  -  best combo x' + (1 + Math.min(Math.floor(game.bestCombo / cfg.COMBO_PER_TIER), cfg.COMBO_MAX_MULT - 1)), W / 2, H / 2 + 28);
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 26px monospace';
  const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 300);
  ctx.globalAlpha = pulse;
  ctx.fillText('TAP / PRESS R TO PLAY AGAIN', W / 2, H / 2 + 80);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------
function render() {
  // Map design space (W x H) to fill the whole canvas exactly: no letterbox
  // bars, and the design rect covers the canvas so nothing draws outside it.
  const s = view.dpr * view.scale;
  ctx.setTransform(s, 0, 0, s, 0, 0);

  drawBackground();

  // World layer: ground + entities under camera translate + screen-shake.
  const sh = game.fx.shakeOffset();
  ctx.save();
  ctx.translate(sh.x, sh.y);
  drawGround();
  ctx.translate(-cameraX, 0);
  drawObstacles();
  drawPowerups();
  drawSupplies();
  for (const z of game.horde.zombies) if (!z.dead) drawZombie(z);
  drawPlayer();
  drawProjectiles();
  drawFX();
  drawFloatingText();
  ctx.restore();

  // HUD + controls (no camera).
  drawHud();
  if (game.started && !game.gameOver) { drawCrateArrows(); drawButtons(); }
  if (!game.started) drawTitle();
  if (game.gameOver) drawGameOver();
}

function frame(now) {
  let frameDt = (now - lastTime) / 1000;
  lastTime = now;
  if (frameDt > cfg.MAX_FRAME_DT) frameDt = cfg.MAX_FRAME_DT;

  accumulator += frameDt;
  let didStep = false;
  while (accumulator >= cfg.FIXED_DT) {
    update(cfg.FIXED_DT);
    accumulator -= cfg.FIXED_DT;
    didStep = true;
  }

  render();
  // Only clear edge-triggered presses once a sim step has had a chance to read
  // them. On frames where no fixed step ran (timing jitter, high-refresh
  // screens) the press is kept so jump/boom are never silently dropped.
  if (didStep) input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Debug hook: lets a harness/devtools step the sim deterministically and force a
// render (used for headless screenshots, since virtual-time doesn't drive raf).
if (typeof window !== 'undefined') {
  window.__bitey = {
    game,
    stepSim(n) { game.started = true; for (let i = 0; i < n; i++) update(cfg.FIXED_DT); },
    render,
  };
}
