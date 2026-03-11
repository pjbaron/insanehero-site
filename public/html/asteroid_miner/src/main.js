import { CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT } from './config.js';
import { entities } from './entity.js';
import { Ship } from './ship.js';
import { camera } from './camera.js';
import { input } from './input.js';
import {
  clearScreen, drawStarfield, drawWorldBounds, drawGridShip, drawBullet, drawAsteroid, drawDebris, drawTether, drawCrusher, drawTrader, drawTraderPing, drawTraderDeparting,
  drawOrbitingModule, drawDockPreview, drawDockFlash,
} from './renderer.js';
import { ModuleOrbitManager } from './module_orbit.js';
import { calculateDockPreview, commitDock, popModule } from './docking.js';
import { Trader } from './trader.js';
import { traderStock, TRADER_POOL, TRADER_SHORT_LABELS } from './trader_stock.js';
import { spawnInitialAsteroids, checkBulletAsteroidCollisions, maintainAsteroidCount } from './spawner.js';
import { economy, spawnCrushers, processCrushers } from './economy.js';
import EffectManager from './effects.js';
import { MATERIAL_DATA } from './asteroid.js';
import { MODULE_DEFS } from './modules.js';
import { ShopUI } from './shop_ui.js';
import { TraderShopUI } from './trader_shop_ui.js';
import { TractorBeam } from './tractor.js';

const CELL_SIZE = 16;

// Convert a world-space point to grid (col, row) in the ship's grid.
// Convention matches renderer.js _gc: canvas_x = -grid_dy, canvas_y = grid_dx.
function worldToGridCell(ship, wx, wy) {
  const dx = wx - ship.x;
  const dy = wy - ship.y;
  const cos = Math.cos(ship.angle);
  const sin = Math.sin(ship.angle);
  const cxLocal = dx * cos + dy * sin;
  const cyLocal = -dx * sin + dy * cos;
  const com = ship.grid.calculateCoM();
  const gpx = cyLocal + com.x;
  const gpy = -cxLocal + com.y;
  return { col: Math.floor(gpx / CELL_SIZE), row: Math.floor(gpy / CELL_SIZE) };
}

const shopUI = new ShopUI();
const traderShopUI = new TraderShopUI();
const orbitManager = new ModuleOrbitManager();
const tractorBeam = new TractorBeam();
let traderDepartedFlash = 0;
let traderIncomingFlash = 0;

export const gameState = {
  ship: null,
  trader: null,
  paused: false,
  gameOver: false,
};

let maintainTimer = 0;
let pingCooldown = 0;

// Dock flash: brief white pulse on newly-docked cells + ship outline highlight
let dockFlashEffect = null;

// Screen shake: driven down to 0 over time (seconds)
let screenShake = 0;

// Convert a grid cell (col, row) to world position using ship CoM and angle.
function gridCellToWorld(ship, gridCol, gridRow) {
  const com = ship.grid.calculateCoM();
  const gx = (gridCol + 0.5) * CELL_SIZE - com.x;
  const gy = (gridRow + 0.5) * CELL_SIZE - com.y;
  const s = Math.sin(ship.angle);
  const c = Math.cos(ship.angle);
  return {
    x: ship.x - gx * s - gy * c,
    y: ship.y + gx * c - gy * s,
  };
}

// Exhaust damage visual feedback: track module health changes each frame.
// Populated in update(), consumed in render() for sparks/smoke.
const exhaustDamageEvents = [];
const _moduleHealthSnapshot = new Map();

// Cash-in session: accumulates gold/pieces during delivery, shows summary when cargo clears
const crushSession = {
  pendingGold: 0,
  pendingPieces: 0,
  summaryGold: 0,
  summaryPieces: 0,
  summaryTimer: 0,
  summaryX: 0,
  summaryY: 0,
};

function checkShipAsteroidCollisions(ship) {
  for (const a of entities.getByType('asteroid')) {
    // Broad phase: bounding radius derived from grid size
    const dx = ship.x - a.x;
    const dy = ship.y - a.y;
    const distSq = dx * dx + dy * dy;
    const minDist = ship.radius + a.radius;
    if (distSq >= minDist * minDist) continue;

    const dist = Math.sqrt(distSq) || 0.001;
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate ship from asteroid
    const overlap = minDist - dist;
    ship.x += nx * overlap;
    ship.y += ny * overlap;

    // Capture pre-bounce relative speed for damage calculation
    const preDot = ship.vx * nx + ship.vy * ny - (a.vx * nx + a.vy * ny);
    const preImpactSpeed = Math.abs(Math.min(preDot, 0));

    // Reflect ship velocity along collision normal, then add extra push
    const dot = ship.vx * nx + ship.vy * ny;
    if (dot < 0) {
      ship.vx -= 2 * dot * nx * 0.6;
      ship.vy -= 2 * dot * ny * 0.6;
    }
    // Extra ejection push so ship always escapes the asteroid
    ship.vx += nx * 60;
    ship.vy += ny * 60;

    // Impact damage based on pre-bounce speed; gated by cooldown to prevent multi-frame death
    const rawDamage = preImpactSpeed * 0.05;
    if (rawDamage <= 0.5) continue;

    // Narrow phase: find the specific module hit at the impact point.
    // Sample a point 60% inward from the ship bounding circle toward the asteroid.
    const hitX = ship.x - nx * ship.radius * 0.6;
    const hitY = ship.y - ny * ship.radius * 0.6;
    const { col, row } = worldToGridCell(ship, hitX, hitY);
    const mod = ship.grid.getModuleAt(col, row);

    let damage = rawDamage;
    if (mod && mod.isAlive()) {
      // Hull/armor plates absorb most of the impact
      const isArmor = mod.type === 'hull_plate' || mod.type === 'armor_plate';
      damage = isArmor ? rawDamage * 0.25 : rawDamage;
      const wasAlive = mod.isAlive();
      mod.takeDamage(damage);
      if (wasAlive && !mod.isAlive()) {
        ship.recalcStats();
      }
    }

    ship.applyImpactDamage(damage);
  }
}

function processPing(ship, dt) {
  pingCooldown = Math.max(0, pingCooldown - dt);

  // Decay ping timers on asteroids
  for (const a of entities.getByType('asteroid')) {
    if (a.pingTimer > 0) a.pingTimer = Math.max(0, a.pingTimer - dt);
  }

  if (input.consumePress('Tab')) {
    const pingMods = ship.grid.getModulesByType('ping_array').filter(m => m.isAlive());
    const tier = Math.min(pingMods.length, 4);
    if (tier > 0 && pingCooldown <= 0) {
      pingCooldown = 5;
      const showMaterial = tier >= 4;
      for (const a of entities.getByType('asteroid')) {
        const eligible =
          (tier >= 1 && a.size === 'small') ||
          (tier >= 2 && a.size === 'medium') ||
          (tier >= 3 && (a.size === 'large' || a.size === 'huge'));
        if (!eligible) continue;
        const ddx = a.x - ship.x;
        const ddy = a.y - ship.y;
        if (ddx * ddx + ddy * ddy <= 400 * 400) {
          a.pingTimer = 3;
          a.pingShowMaterial = showMaterial;
        }
      }
    }
  }
}

function init() {
  gameState.ship = new Ship();
  // Give camera the world dimensions needed by drawWorldBounds
  camera.worldWidth = WORLD_WIDTH;
  camera.worldHeight = WORLD_HEIGHT;
  spawnCrushers(entities);
  spawnInitialAsteroids(entities, 8);
  shopUI._gameState = gameState;
  traderShopUI._gameState = gameState;
  const trader = new Trader(0, 0);
  entities.add(trader);
  gameState.trader = trader;
}

function update(dt) {
  const ship = gameState.ship;
  const trader = gameState.trader;
  const prevTraderState = trader.state;
  const bullet = ship.update(dt, entities);
  if (bullet) entities.add(bullet);

  // Exhaust damage: ship.update() already applied damage via checkExhaustDamage(dt).
  // Detect newly damaged modules by comparing health snapshots for visual feedback.
  exhaustDamageEvents.length = 0;
  if (ship.thrustActive) {
    for (const mod of ship.grid.getAllModules()) {
      const prev = _moduleHealthSnapshot.get(mod);
      if (prev !== undefined && mod.health < prev) {
        const severity = mod.health <= 0 ? 'explosion' : 'burn';
        exhaustDamageEvents.push({ gridX: mod.gridX, gridY: mod.gridY, severity });
        // Spawn world-space visual effects for this damage event
        const wp = gridCellToWorld(ship, mod.gridX, mod.gridY);
        if (severity === 'explosion') {
          EffectManager.spawnExplosionEffect(wp.x, wp.y);
          screenShake = Math.max(screenShake, 0.22);
        } else {
          EffectManager.spawnExhaustSpark(wp.x, wp.y);
        }
      }
      _moduleHealthSnapshot.set(mod, mod.health);
    }
  } else {
    // Keep snapshot current even when not thrusting
    for (const mod of ship.grid.getAllModules()) {
      _moduleHealthSnapshot.set(mod, mod.health);
    }
  }

  // Occasional ambient sparks from already-damaged modules
  for (const mod of ship.grid.getAllModules()) {
    if (mod.damaged && Math.random() < 0.04) {
      const wp = gridCellToWorld(ship, mod.gridX, mod.gridY);
      EffectManager.spawnExhaustSpark(wp.x, wp.y);
    }
  }

  // Decay polish timers
  if (dockFlashEffect && dockFlashEffect.timer > 0) {
    dockFlashEffect.timer = Math.max(0, dockFlashEffect.timer - dt);
  }
  if (screenShake > 0) {
    screenShake = Math.max(0, screenShake - dt * 1.8);
  }

  entities.update(dt); // also calls trader.update(dt)
  if (prevTraderState === 'offscreen' && trader.state === 'entering') {
    traderStock.generateStock(ship.grid);
    traderIncomingFlash = 3;
  }
  checkBulletAsteroidCollisions(entities);
  checkShipAsteroidCollisions(ship);
  tractorBeam.update(dt, ship, entities, orbitManager);
  for (const lm of entities.getByType('loose_module')) {
    lm.tryCapture(ship, orbitManager);
  }
  processPing(ship, dt);
  if (ship.health <= 0 && !gameState.gameOver) {
    gameState.gameOver = true;
    console.log('GAME OVER');
  }
  camera.follow(ship.x, ship.y);

  maintainTimer += dt;
  if (maintainTimer >= 2) {
    maintainTimer = 0;
    maintainAsteroidCount(entities, 8);
  }

  const crushEvent = processCrushers(entities, ship);
  // Prune consumed/dead debris immediately so length checks below are accurate
  if (ship.net && ship.net.tetheredDebris) {
    ship.net.tetheredDebris = ship.net.tetheredDebris.filter(d => d.alive);
  }

  if (crushEvent) {
    EffectManager.spawnCrushEffect(crushEvent.x, crushEvent.y, crushEvent.value);
    crushSession.pendingGold += crushEvent.value;
    crushSession.pendingPieces += crushEvent.count;
    crushSession.summaryX = crushEvent.x;
    crushSession.summaryY = crushEvent.y;
    if (ship.net.tetheredDebris.length === 0) {
      // Last cargo consumed - start summary panel
      crushSession.summaryGold = crushSession.pendingGold;
      crushSession.summaryPieces = crushSession.pendingPieces;
      crushSession.summaryTimer = 2;
      crushSession.pendingGold = 0;
      crushSession.pendingPieces = 0;
    }
  }

  // Tick summary timer; dismiss if ship has left the crusher's shop range
  if (crushSession.summaryTimer > 0) {
    crushSession.summaryTimer = Math.max(0, crushSession.summaryTimer - dt);
    const cdx = ship.x - crushSession.summaryX;
    const cdy = ship.y - crushSession.summaryY;
    if (cdx * cdx + cdy * cdy > 6400) {
      crushSession.summaryTimer = 0;
    }
  }

  // Trader shop trigger: within shopRadius, patrolling, press F or Enter
  if (!traderShopUI.visible && !shopUI.visible && trader.state === 'patrolling' && trader.isInRange(ship)) {
    if (input.consumePress('f') || input.consumePress('Enter')) {
      trader._savedSpeed = trader.speed;
      trader.speed = 0;
      traderShopUI.open(trader);
    }
  }

  // Shop trigger: within 80px of a crusher, no tethered cargo, press F or Enter
  // Also available while summary panel is showing (seamless deliver->shop transition)
  if (!shopUI.visible && !traderShopUI.visible && ship.net.tetheredDebris.length === 0) {
    for (const c of entities.getByType('crusher')) {
      const sdx = ship.x - c.x;
      const sdy = ship.y - c.y;
      if (sdx * sdx + sdy * sdy <= 6400) { // 80^2
        if (input.consumePress('f') || input.consumePress('Enter')) {
          crushSession.summaryTimer = 0; // dismiss summary on shop open
          shopUI.open(c);
          break;
        }
      }
    }
  }

  // Orbiting module update and docking input
  orbitManager.update(dt, ship.x, ship.y, ship.angle);
  if (orbitManager.hasModules() && !shopUI.visible && !traderShopUI.visible) {
    if (input.consumePress('f')) {
      const first = orbitManager.getAll()[0];
      const preview = calculateDockPreview(first, ship.grid, ship.x, ship.y, ship.angle);
      const oldCoM = ship.grid.calculateCoM();
      if (commitDock(first, preview, ship.grid, orbitManager)) {
        ship.recalcStats();
        const newCoM = ship.grid.calculateCoM();
        dockFlashEffect = {
          timer: 0.3,
          maxTimer: 0.3,
          cells: preview.cells,
          comDx: newCoM.x - oldCoM.x,
          comDy: newCoM.y - oldCoM.y,
        };
      }
    }
    if (input.consumePress('g')) {
      const mods = ship.grid.getAllModules().filter(m => m.type !== 'cockpit' && m.isAlive());
      if (mods.length > 0) {
        const last = mods[mods.length - 1];
        // Capture world position before the module is removed so the slide animation starts from there
        const wo = ship.getModuleWorldOffset(last);
        const slideFromX = ship.x + wo.x;
        const slideFromY = ship.y + wo.y;
        if (popModule(last.gridX, last.gridY, ship.grid, orbitManager)) {
          // Set the slide start position on the newly added orbiting module
          const allOrbit = orbitManager.getAll();
          const newMod = allOrbit[allOrbit.length - 1];
          if (newMod) {
            newMod._slideFromX = slideFromX;
            newMod._slideFromY = slideFromY;
            newMod._slideAge = 0;
          }
          ship.recalcStats();
        }
      }
    }
  }
}


function render(ctx) {
  clearScreen(ctx);
  drawStarfield(ctx, camera);
  camera.applyTransform(ctx);
  // Apply screen shake as an additional translate inside the camera transform
  if (screenShake > 0) {
    const s = screenShake * 4;
    ctx.translate(
      (Math.random() - 0.5) * s,
      (Math.random() - 0.5) * s,
    );
  }
  drawWorldBounds(ctx, camera);

  const ship = gameState.ship;
  drawGridShip(ctx, ship);
  if (dockFlashEffect && dockFlashEffect.timer > 0) {
    drawDockFlash(ctx, dockFlashEffect, ship);
  }

  // Exhaust damage visual feedback: sparks/smoke on damaged cells in exhaust zones
  if (exhaustDamageEvents.length > 0) {
    const grid = ship.grid;
    const com = grid.calculateCoM();
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    for (const ev of exhaustDamageEvents) {
      // Cell center in canvas space: canvas_x = com.y - (row+0.5)*CELL_SIZE, canvas_y = (col+0.5)*CELL_SIZE - com.x
      const cx = com.y - (ev.gridY + 0.5) * CELL_SIZE;
      const cy = (ev.gridX + 0.5) * CELL_SIZE - com.x;
      const count = ev.severity === 'explosion' ? 6 : 2;
      for (let i = 0; i < count; i++) {
        ctx.globalAlpha = 0.4 + Math.random() * 0.5;
        ctx.fillStyle = ev.severity === 'explosion' ? '#ff4000' : '#ffcc00';
        ctx.beginPath();
        ctx.arc(
          cx + (Math.random() - 0.5) * CELL_SIZE,
          cy + (Math.random() - 0.5) * CELL_SIZE,
          1 + Math.random() * 2, 0, Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Damage flash overlay
  if (ship.damageFlash > 0) {
    ctx.save();
    ctx.globalAlpha = ship.damageFlash * 0.55;
    ctx.fillStyle = '#ff2020';
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.radius + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Orbiting modules and dock previews (world space)
  // Find cockpit world position so the tether line anchors to the command centre
  const cockpitMod = ship.grid.getModulesByType('cockpit')[0];
  let cockpitWX = ship.x, cockpitWY = ship.y;
  if (cockpitMod) {
    const cwo = ship.getModuleWorldOffset(cockpitMod);
    cockpitWX = ship.x + cwo.x;
    cockpitWY = ship.y + cwo.y;
  }
  const orbitMods = orbitManager.getAll();
  for (let oi = 0; oi < orbitMods.length; oi++) {
    const om = orbitMods[oi];
    // Only show dock preview for the next-to-dock module (index 0)
    if (oi === 0) {
      const preview = calculateDockPreview(om, ship.grid, ship.x, ship.y, ship.angle);
      drawDockPreview(ctx, preview, ship.x, ship.y, ship.angle, ship.grid);
    }
    drawOrbitingModule(ctx, om, ship.x, ship.y, cockpitWX, cockpitWY, oi);
  }

  for (const b of entities.getByType('bullet')) {
    drawBullet(ctx, b.x, b.y);
  }

  for (const a of entities.getByType('asteroid')) {
    drawAsteroid(ctx, a.x, a.y, a.radius, a.seed, a.hitFlash);
  }

  // Prospector ping rings
  for (const a of entities.getByType('asteroid')) {
    if (!a.pingTimer || a.pingTimer <= 0) continue;
    const alpha = Math.min(1, a.pingTimer) * 0.85;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = a.pingShowMaterial ? MATERIAL_DATA[a.materialType].color : '#00e8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const d of entities.getByType('debris')) {
    drawDebris(ctx, d.x, d.y, d.radius, d.seed, d.collectPulse);
  }

  for (const lm of entities.getByType('loose_module')) {
    lm.draw(ctx);
  }

  tractorBeam.draw(ctx, ship);

  for (const c of entities.getByType('crusher')) {
    drawCrusher(ctx, c.x, c.y, c.radius, c.animationPhase, c.consumePulse);
  }

  // Cash-in summary panel (world space, above crusher, shown when last cargo consumed)
  if (crushSession.summaryTimer > 0) {
    const panelAlpha = Math.min(1, crushSession.summaryTimer * 2); // fade out last 0.5s
    const text = `Cashed in: +${crushSession.summaryGold} gold (${crushSession.summaryPieces} piece${crushSession.summaryPieces !== 1 ? 's' : ''})`;
    ctx.save();
    ctx.font = 'bold 13px monospace';
    const tw = ctx.measureText(text).width;
    const pw = tw + 20;
    const ph = 28;
    const px = crushSession.summaryX;
    const py = crushSession.summaryY - 80;
    ctx.globalAlpha = panelAlpha;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText(text, px, py + 5);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Shop proximity hint (world space) - suppressed while cargo present or summary panel is visible
  if (!shopUI.visible && ship.net.tetheredDebris.length === 0 && crushSession.summaryTimer <= 0) {
    const hintAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    for (const c of entities.getByType('crusher')) {
      const hdx = c.x - ship.x;
      const hdy = c.y - ship.y;
      if (hdx * hdx + hdy * hdy <= 6400) {
        ctx.globalAlpha = hintAlpha;
        ctx.fillStyle = '#ffdd80';
        ctx.fillText('Press F to shop', c.x, c.y - c.radius - 14);
      }
    }
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  const trader = gameState.trader;
  if (trader.isActive()) {
    drawTrader(ctx, trader.x, trader.y, trader.angle, trader.patrolTimer);
  }

  // 'Press F to trade' hint (world space)
  if (trader.state === 'patrolling' && !shopUI.visible && !traderShopUI.visible && trader.isInRange(ship)) {
    const hintAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
    ctx.save();
    ctx.globalAlpha = hintAlpha;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff88ff';
    ctx.fillText('Press F to trade', trader.x, trader.y - trader.radius - 14);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  for (const d of ship.net.tetheredDebris) {
    drawTether(ctx, ship.x, ship.y, d.x, d.y);
  }

  EffectManager.render(ctx);

  camera.restore(ctx);

  // Trader ping/indicator and departing warning (screen space)
  if (trader.isActive()) {
    const tsc = camera.worldToScreen(trader.x, trader.y);
    drawTraderPing(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, tsc.x, tsc.y, trader.x, trader.y, ship.x, ship.y);
  }
  if (trader.state === 'patrolling' && !traderShopUI.visible) {
    drawTraderDeparting(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, trader.patrolDuration - trader.patrolTimer);
  }

  // Shop overlay (screen space, on top of game)
  shopUI.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  traderShopUI.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

  // TRADER INCOMING flash (3s banner at top, flashing)
  if (traderIncomingFlash > 0) {
    const flashVisible = Math.sin(Date.now() * 0.008) > 0;
    if (flashVisible) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Math.min(1, traderIncomingFlash * 0.85 + 0.15);
      const bannerH = 36;
      const bannerY = 8;
      ctx.fillStyle = 'rgba(80,0,80,0.85)';
      ctx.fillRect(0, bannerY, CANVAS_WIDTH, bannerH);
      ctx.fillStyle = '#ff44ff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TRADER INCOMING', CANVAS_WIDTH / 2, bannerY + bannerH / 2);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  // TRADER DEPARTED flash
  if (traderDepartedFlash > 0) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.min(1, traderDepartedFlash);
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#ff44ff';
    ctx.textAlign = 'center';
    ctx.fillText('TRADER DEPARTED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#cc88cc';
    ctx.fillText('Returns in ~2 min', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 22);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Crusher proximity directional indicator (screen space)
  if (ship.net.tetheredDebris.length > 0) {
    const crushers = entities.getByType('crusher');
    let nearestCrusher = null;
    let nearestDist = Infinity;
    for (const c of crushers) {
      const cdx = c.x - ship.x;
      const cdy = c.y - ship.y;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cdist < nearestDist) { nearestDist = cdist; nearestCrusher = c; }
    }
    if (nearestCrusher && nearestDist <= 300) {
      const shipSc = camera.worldToScreen(ship.x, ship.y);
      const cAngle = Math.atan2(nearestCrusher.y - ship.y, nearestCrusher.x - ship.x);
      const cPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
      ctx.save();
      ctx.translate(shipSc.x, shipSc.y);
      ctx.rotate(cAngle);
      ctx.globalAlpha = 0.4 + 0.5 * cPulse;
      ctx.strokeStyle = '#ff6030';
      ctx.fillStyle = '#ff6030';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(36, 0);
      ctx.lineTo(48, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(54, 0);
      ctx.lineTo(44, -5);
      ctx.lineTo(44, 5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // HUD (screen space)
  const net = ship.net;
  const allMods = ship.grid.getAllModules();
  const aliveMods = allMods.filter(m => m.isAlive()).length;
  const damagedMods = allMods.filter(m => !m.isAlive()).length;
  const totalMods = allMods.length;
  const pwGen = ship.grid.getPowerGeneration();
  const pwDraw = ship.grid.getPowerDraw();
  const isBrownout = !ship.grid.isPowerSufficient();
  const gridSize = ship.grid.getGridSize();
  const totalMass = ship.grid.getTotalMass();
  const thrustEngines = allMods.filter(m => m.isAlive() && m.def.thrust);
  const totalThrust = thrustEngines.reduce((s, m) => s + m.def.thrust, 0);
  const thrustDirSet = new Set(thrustEngines.map(m => m.def.exhaustDir));
  const isAsymmetric = thrustDirSet.size > 1;
  const cargoFlash = ship.netFullFlashTimer > 0 && Math.sin(ship.netFullFlashTimer * Math.PI * 10) > 0;

  // Gold display (top-right)
  const gold = economy.getGold();
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText(`Gold: ${gold}`, CANVAS_WIDTH - 12, 32);
  ctx.textAlign = 'left';

  // Minimap (bottom-right, 200x150)
  const MM_W = 200;
  const MM_H = 150;
  const MM_X = CANVAS_WIDTH - MM_W - 10;
  const MM_Y = CANVAS_HEIGHT - MM_H - 10;
  const scaleX = MM_W / WORLD_WIDTH;
  const scaleY = MM_H / WORLD_HEIGHT;

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#000';
  ctx.fillRect(MM_X, MM_Y, MM_W, MM_H);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#444';
  ctx.strokeRect(MM_X, MM_Y, MM_W, MM_H);

  // Asteroids (grey)
  ctx.fillStyle = '#888';
  for (const a of entities.getByType('asteroid')) {
    ctx.fillRect(MM_X + a.x * scaleX - 1, MM_Y + a.y * scaleY - 1, 2, 2);
  }

  // Debris (green)
  ctx.fillStyle = '#0f0';
  for (const d of entities.getByType('debris')) {
    ctx.fillRect(MM_X + d.x * scaleX - 1, MM_Y + d.y * scaleY - 1, 2, 2);
  }

  // Crushers (orange)
  ctx.fillStyle = '#ff8c00';
  for (const c of entities.getByType('crusher')) {
    ctx.fillRect(MM_X + c.x * scaleX - 2, MM_Y + c.y * scaleY - 2, 4, 4);
  }

  // Trader (magenta) - pulse when player can afford at least one item
  if (trader.isActive()) {
    const canAffordTrader = traderStock.getStockDetails().some(
      item => economy.getGold() >= item.cost,
    );
    ctx.fillStyle = '#ff00ff';
    if (canAffordTrader) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
      ctx.globalAlpha = 0.4 + 0.6 * pulse;
      const dotR = 2 + 2 * pulse;
      ctx.fillRect(MM_X + trader.x * scaleX - dotR / 2, MM_Y + trader.y * scaleY - dotR / 2, dotR, dotR);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillRect(MM_X + trader.x * scaleX - 2, MM_Y + trader.y * scaleY - 2, 4, 4);
    }
  }

  // Minimap sonar pulse during arrival announcement
  if (trader.isActive() && traderIncomingFlash > 0) {
    const pulseT = (Date.now() % 1200) / 1200;
    ctx.beginPath();
    ctx.arc(MM_X + trader.x * scaleX, MM_Y + trader.y * scaleY, 3 + pulseT * 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff44ff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = (1 - pulseT) * 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Ship: rotated grid shape (inner save/restore; outer minimap save/restore wraps the block)
  {
    const mmShipX = MM_X + ship.x * scaleX;
    const mmShipY = MM_Y + ship.y * scaleY;
    const mmCom = ship.grid.calculateCoM();
    const cellMM = Math.max(1, CELL_SIZE * scaleX);
    ctx.save();
    ctx.translate(mmShipX, mmShipY);
    ctx.rotate(ship.angle);
    for (let r = 0; r < ship.grid.rows; r++) {
      for (let c = 0; c < ship.grid.cols; c++) {
        const mmMod = ship.grid.cells[r][c];
        if (!mmMod) continue;
        // _gc convention from renderer: canvas_x = -gyOff, canvas_y = gxOff
        const gxOff = (c + 0.5) * CELL_SIZE - mmCom.x;
        const gyOff = (r + 0.5) * CELL_SIZE - mmCom.y;
        ctx.fillStyle = mmMod.isAlive() ? '#fff' : '#f84';
        ctx.fillRect(-gyOff * scaleX - cellMM / 2, gxOff * scaleX - cellMM / 2, cellMM, cellMM);
      }
    }
    ctx.restore();
  }

  ctx.restore(); // end outer minimap save

  // === Bottom-left HUD ===
  ctx.textAlign = 'left';
  let hudBottomY = CANVAS_HEIGHT - 8;

  // Special module strip: trader equipment abbreviations, magenta, bottom edge
  const ownedEquipment = TRADER_POOL.filter(id => ship.grid.getModulesByType(id).some(m => m.isAlive()));
  if (ownedEquipment.length > 0) {
    ctx.font = '12px monospace';
    ctx.fillStyle = '#cc44cc';
    ctx.fillText(ownedEquipment.map(id => TRADER_SHORT_LABELS[id]).join(' | '), 12, hudBottomY);
    hudBottomY -= 18;
  }

  // Module orbit indicator: pulsing prompt with module type name
  if (orbitManager.hasModules() && !shopUI.visible) {
    const orbitMod = orbitManager.getAll()[0];
    const modName = MODULE_DEFS[orbitMod.type]?.name ?? orbitMod.type;
    const orbitPulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.008);
    ctx.globalAlpha = orbitPulse;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#80ffcc';
    ctx.fillText(`MODULE READY [${modName}]  F:dock  G:eject`, 12, hudBottomY);
    ctx.globalAlpha = 1;
    hudBottomY -= 20;
  }

  // Ship status panel (compact box, bottom-left)
  const SP_X = 10;
  const SP_W = 220;
  const SP_LH = 16;
  const SP_PAD = 7;
  const SP_H = 6 * SP_LH + SP_PAD * 2;
  const SP_Y = hudBottomY - SP_H - 4;

  ctx.globalAlpha = 0.78;
  ctx.fillStyle = '#000';
  ctx.fillRect(SP_X, SP_Y, SP_W, SP_H);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#445566';
  ctx.lineWidth = 1;
  ctx.strokeRect(SP_X, SP_Y, SP_W, SP_H);

  ctx.font = '13px monospace';
  let sp = SP_Y + SP_PAD + 12;

  // Row 1: grid size + mass
  ctx.fillStyle = '#8ab4ff';
  ctx.fillText(`${gridSize.cols}x${gridSize.rows} GRID`, SP_X + 8, sp);
  ctx.fillStyle = '#ccc';
  ctx.fillText(`Mass: ${totalMass.toFixed(1)}`, SP_X + 110, sp);
  sp += SP_LH;

  // Row 2: power (PWR draw/generation, green if OK, red if brownout)
  const pwFlash = isBrownout && Math.sin(Date.now() * 0.012) > 0;
  ctx.fillStyle = isBrownout ? (pwFlash ? '#ff2200' : '#ff6600') : '#00cc88';
  ctx.fillText(`PWR ${pwDraw.toFixed(0)}/${pwGen.toFixed(0)}`, SP_X + 8, sp);
  if (isBrownout) {
    ctx.fillStyle = pwFlash ? '#ff4400' : '#ff7700';
    ctx.fillText('BROWNOUT', SP_X + 130, sp);
  }
  sp += SP_LH;

  // Row 3: thrust
  ctx.fillStyle = '#ccc';
  ctx.fillText(`Thrust: ${totalThrust}${isAsymmetric ? ' (asym)' : ''}`, SP_X + 8, sp);
  sp += SP_LH;

  // Row 4: modules + flashing damaged alert
  ctx.fillStyle = '#ccc';
  ctx.fillText(`Mods: ${aliveMods} alive / ${totalMods}`, SP_X + 8, sp);
  if (damagedMods > 0 && Math.sin(Date.now() * 0.01) > 0) {
    ctx.fillStyle = '#ff8800';
    ctx.fillText(
      `  [!] ${damagedMods} DAMAGED`,
      SP_X + 8 + ctx.measureText(`Mods: ${aliveMods} alive / ${totalMods}`).width,
      sp,
    );
  }
  sp += SP_LH;

  // Row 5: hull integrity bar
  const hullPct = ship.health / ship.maxHealth;
  const barW = SP_W - 16;
  const barH = 7;
  ctx.fillStyle = '#222';
  ctx.fillRect(SP_X + 8, sp - 9, barW, barH);
  const hullColor = hullPct > 0.6 ? '#44ff88' : hullPct > 0.3 ? '#ffcc00' : '#ff3030';
  ctx.fillStyle = hullColor;
  ctx.fillRect(SP_X + 8, sp - 9, barW * hullPct, barH);
  ctx.strokeStyle = '#556677';
  ctx.lineWidth = 1;
  ctx.strokeRect(SP_X + 8, sp - 9, barW, barH);
  ctx.fillStyle = '#ccc';
  ctx.fillText(`Hull ${Math.ceil(ship.health)}/${ship.maxHealth}`, SP_X + 8, sp + 4);
  sp += SP_LH;

  // Row 6: cargo
  ctx.fillStyle = cargoFlash ? '#ff4040' : '#ccc';
  ctx.fillText(`Cargo ${net.tetheredDebris.length}/${net.capacity}`, SP_X + 8, sp);
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let lastTime = null;

function renderGameOver(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#ff2020';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.font = '20px monospace';
  ctx.fillStyle = '#ccc';
  ctx.fillText('Refresh to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 44);
  ctx.textAlign = 'left';
}

function loop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (gameState.gameOver) {
    render(ctx);
    renderGameOver(ctx);
    return; // stop the loop
  }

  // Trader shop departure auto-close: real-time countdown hit zero
  if (traderShopUI.visible) {
    const elapsed = (Date.now() - traderShopUI._openRealTime) / 1000;
    if (elapsed >= traderShopUI._remainingAtOpen) {
      const t = gameState.trader;
      t.speed = t._savedSpeed ?? 50;
      delete t._savedSpeed;
      t.state = 'leaving';
      t._exitPoint = null;
      traderShopUI.close();
      traderDepartedFlash = 3;
    }
  }

  // Route input to shops when open (each checks its own visibility internally)
  shopUI.handleInput(input);
  const wasTraderShopVisible = traderShopUI.visible;
  const traderShopOpenTime = traderShopUI._openRealTime;
  traderShopUI.handleInput(input);
  // ESC pressed in trader shop: restore trader speed and sync patrolTimer to real-time elapsed
  if (wasTraderShopVisible && !traderShopUI.visible) {
    const t = gameState.trader;
    t.speed = t._savedSpeed ?? 50;
    delete t._savedSpeed;
    const elapsed = (Date.now() - traderShopOpenTime) / 1000;
    t.patrolTimer = Math.min(t.patrolDuration, t.patrolTimer + elapsed);
  }

  if (!gameState.paused) {
    update(dt);
  }
  if (traderDepartedFlash > 0) traderDepartedFlash = Math.max(0, traderDepartedFlash - dt);
  if (traderIncomingFlash > 0) traderIncomingFlash = Math.max(0, traderIncomingFlash - dt);
  EffectManager.update(dt);
  render(ctx);

  requestAnimationFrame(loop);
}

init();
console.log('Asteroid Miner running');
requestAnimationFrame(loop);
