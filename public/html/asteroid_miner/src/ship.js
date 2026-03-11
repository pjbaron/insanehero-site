import { Entity } from './entity.js';
import { input, THRUST, LEFT, RIGHT, FIRE, RELEASE } from './input.js';
import { Net } from './net.js';
import { createStarterShip } from './ship_config.js';
import {
  WORLD_WIDTH, WORLD_HEIGHT,
  SHIP_ROTATION_SPEED, SHIP_DRAG, SHIP_MAX_SPEED,
  BULLET_SPEED, BULLET_LIFETIME,
} from './config.js';

const BULLET_MARGIN = 20;
const BRAKE_KEYS = ['Shift', 'ArrowDown'];
const CELL_SIZE = 16;
const ANGULAR_DRAG = 0.5;    // per second, damps physics-torque spin

function isAnyDown(keys) {
  return keys.some(k => input.isDown(k));
}

function consumeAnyPress(keys) {
  for (const k of keys) {
    if (input.consumePress(k)) return true;
  }
  return false;
}

// Transform a vector from grid space to world space at the given ship angle.
// Convention: grid -Y is ship forward, which maps to world (cos angle, sin angle).
function gridVecToWorld(gx, gy, angle) {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return {
    x: -gx * s - gy * c,
    y:  gx * c - gy * s,
  };
}

// Returns the unit thrust direction in grid space for an engine exhaust direction.
// Thrust is opposite to exhaust.
function exhaustDirToGridVec(exhaustDir) {
  switch (exhaustDir) {
    case 'down':  return { x: 0, y: -1 };
    case 'up':    return { x: 0, y:  1 };
    case 'left':  return { x:  1, y: 0 };
    case 'right': return { x: -1, y: 0 };
    default:      return { x: 0, y:  0 };
  }
}

export class Bullet extends Entity {
  constructor(x, y, vx, vy, power) {
    super(x, y, 'bullet');
    this.vx = vx;
    this.vy = vy;
    this.radius = 3;
    this.mass = 0.1;
    this.lifetime = BULLET_LIFETIME;
    this.power = power;
  }

  update(dt) {
    super.update(dt);
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.alive = false;
    if (this.x < -BULLET_MARGIN || this.x > WORLD_WIDTH + BULLET_MARGIN ||
        this.y < -BULLET_MARGIN || this.y > WORLD_HEIGHT + BULLET_MARGIN) {
      this.alive = false;
    }
  }
}

export class Ship extends Entity {
  constructor() {
    super(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'ship');
    this.grid = createStarterShip();
    this.angularVelocity = 0;
    this.thrustActive = false;
    this.fireCooldown = 0;
    this.net = new Net();
    this.netFullFlashTimer = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.damageFlash = 0;
    this.impactCooldown = 0;
    this.recalcStats();
  }

  // Call after any module is added, removed, or destroyed.
  recalcStats() {
    this.mass = this.grid.getTotalMass() || 1;

    const com = this.grid.calculateCoM();
    const gridCenterX = (this.grid.cols / 2) * CELL_SIZE;
    const gridCenterY = (this.grid.rows / 2) * CELL_SIZE;
    this.comOffsetX = com.x - gridCenterX;
    this.comOffsetY = com.y - gridCenterY;
    this._comInGridX = com.x;
    this._comInGridY = com.y;

    // Bounding circle: half the largest grid dimension in pixels
    this.radius = (Math.max(this.grid.cols, this.grid.rows) * CELL_SIZE) / 2;

    // Moment of inertia: sum of m_i * r_i^2 around CoM
    let I = 0;
    for (const m of this.grid.getAllModules()) {
      const mass = m.def.mass || 0;
      if (mass === 0) continue;
      const w = m.def.gridW || 1;
      const h = m.def.gridH || 1;
      const cx = (m.gridX + w / 2) * CELL_SIZE;
      const cy = (m.gridY + h / 2) * CELL_SIZE;
      const dx = cx - com.x;
      const dy = cy - com.y;
      I += mass * (dx * dx + dy * dy);
    }
    this.momentOfInertia = Math.max(I, 100);

    // Net capacity from alive net modules
    this._netCapacity = this.grid.getAllModules()
      .filter(m => m.isAlive() && m.def.capacity)
      .reduce((s, m) => s + m.def.capacity, 0);

    console.debug(
      '[Ship.recalcStats] mass=%d radius=%d CoMoffset=(%s,%s) I=%s netCap=%d',
      this.mass, this.radius,
      this.comOffsetX.toFixed(2), this.comOffsetY.toFixed(2),
      this.momentOfInertia.toFixed(1), this._netCapacity,
    );
  }

  // Returns the world-space offset from ship CoM to the center of a module.
  getModuleWorldOffset(module) {
    const w = module.def.gridW || 1;
    const h = module.def.gridH || 1;
    const cx = (module.gridX + w / 2) * CELL_SIZE;
    const cy = (module.gridY + h / 2) * CELL_SIZE;
    return gridVecToWorld(cx - this._comInGridX, cy - this._comInGridY, this.angle);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.damageFlash = 0.3;
  }

  applyImpactDamage(amount) {
    if (this.impactCooldown > 0) return;
    this.takeDamage(amount);
    this.impactCooldown = 0.5;
  }

  update(dt, entityManager) {
    // Keyboard rotation (direct, no inertia -- feel stays snappy)
    if (isAnyDown(LEFT))  this.angle -= SHIP_ROTATION_SPEED * dt;
    if (isAnyDown(RIGHT)) this.angle += SHIP_ROTATION_SPEED * dt;

    // Reset all exhaust module firing flags before deciding which are active
    const exhaustModules = this.grid.getAllModules().filter(m => m.isAlive() && m.def.hasExhaust);
    for (const m of exhaustModules) m.firing = false;

    this.thrustActive = false;

    // Brownout: insufficient power cuts thrust to 30% and disables guns
    const hasPower = this.grid.isPowerSufficient();
    const thrustFactor = hasPower ? 1.0 : 0.3;

    if (isAnyDown(THRUST)) {
      // Fire all forward thrust engines (modules with def.thrust)
      for (const eng of exhaustModules) {
        if (!eng.def.thrust) continue;
        eng.firing = true;
        this.thrustActive = true;
        const tVec = exhaustDirToGridVec(eng.def.exhaustDir);
        const worldForce = gridVecToWorld(
          tVec.x * eng.def.thrust * thrustFactor,
          tVec.y * eng.def.thrust * thrustFactor,
          this.angle,
        );
        this.vx += worldForce.x / this.mass * dt;
        this.vy += worldForce.y / this.mass * dt;
        const rWorld = this.getModuleWorldOffset(eng);
        const torque = rWorld.x * worldForce.y - rWorld.y * worldForce.x;
        this.angularVelocity += torque / this.momentOfInertia * dt;
      }
    } else if (isAnyDown(BRAKE_KEYS)) {
      // Fire retro brakes (modules with def.brakeForce), only when not thrusting
      for (const eng of exhaustModules) {
        if (!eng.def.brakeForce) continue;
        eng.firing = true;
        const tVec = exhaustDirToGridVec(eng.def.exhaustDir);
        const worldForce = gridVecToWorld(
          tVec.x * eng.def.brakeForce,
          tVec.y * eng.def.brakeForce,
          this.angle,
        );
        this.vx += worldForce.x / this.mass * dt;
        this.vy += worldForce.y / this.mass * dt;
        const rWorld = this.getModuleWorldOffset(eng);
        const torque = rWorld.x * worldForce.y - rWorld.y * worldForce.x;
        this.angularVelocity += torque / this.momentOfInertia * dt;
      }
    }

    // Exhaust damage (fuel tank explosions, heat damage to adjacent modules)
    this.grid.checkExhaustDamage(dt);

    // Angular physics
    this.angularVelocity *= (1 - ANGULAR_DRAG * dt);
    this.angle += this.angularVelocity * dt;

    // Linear drag (frame-rate independent: per-second coefficient)
    this.vx *= (1 - SHIP_DRAG * dt);
    this.vy *= (1 - SHIP_DRAG * dt);

    // Speed clamp
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > SHIP_MAX_SPEED) {
      const scale = SHIP_MAX_SPEED / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    // Position integration
    super.update(dt);

    // World boundary bounce
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx) * 0.3;
    } else if (this.x > WORLD_WIDTH - this.radius) {
      this.x = WORLD_WIDTH - this.radius;
      this.vx = -Math.abs(this.vx) * 0.3;
    }
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy) * 0.3;
    } else if (this.y > WORLD_HEIGHT - this.radius) {
      this.y = WORLD_HEIGHT - this.radius;
      this.vy = -Math.abs(this.vy) * 0.3;
    }

    // Damage flash decay
    if (this.damageFlash > 0)       this.damageFlash       = Math.max(0, this.damageFlash - dt);
    if (this.netFullFlashTimer > 0) this.netFullFlashTimer  = Math.max(0, this.netFullFlashTimer - dt);
    if (this.impactCooldown > 0)    this.impactCooldown     = Math.max(0, this.impactCooldown - dt);

    // Slow hull repair: 3 HP/s
    if (this.health > 0 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + 3 * dt);
    }

    // Auto-tether: replaces E-key collection; checked every frame
    if (entityManager) this._autoTether(entityManager);

    // Release key still works
    if (consumeAnyPress(RELEASE)) this.net.releaseOne();

    // Net linear reaction force (Newton's 3rd, anchored at ship CoM)
    this.net.ship = this;
    this.net.update(dt);

    // Firing (disabled during brownout)
    this.fireCooldown -= dt;
    if (hasPower && consumeAnyPress(FIRE) && this.fireCooldown <= 0) {
      const bullets = this._spawnBulletsFromGuns();
      if (bullets.length > 0) {
        const gunMods = this.grid.getAllModules().filter(m => m.isAlive() && m.def.fireRate);
        const bestRate = gunMods.reduce((best, m) => Math.max(best, m.def.fireRate || 0), 5);
        this.fireCooldown = 1 / bestRate;
        // First bullet returned to caller; extras added directly
        for (let i = 1; i < bullets.length; i++) {
          if (entityManager) entityManager.add(bullets[i]);
        }
        return bullets[0];
      }
    }

    return null;
  }

  // Auto-tether: for each alive net module, capture nearest eligible debris in range.
  _autoTether(entityManager) {
    const netMods = this.grid.getAllModules().filter(m => m.isAlive() && m.def.capacity);
    if (netMods.length === 0) return;
    const totalCapacity = netMods.reduce((s, m) => s + m.def.capacity, 0);

    for (const nm of netMods) {
      if (this.net.tetheredDebris.length >= totalCapacity) break;
      const wo = this.getModuleWorldOffset(nm);
      const netX = this.x + wo.x;
      const netY = this.y + wo.y;
      const captureR = nm.def.captureRadius || 60;
      const maxSize  = nm.def.maxDebrisSize  || Infinity;

      const candidates = entityManager.getByType('debris').filter(d =>
        !d.tethered &&
        d.radius <= maxSize &&
        Math.hypot(netX - d.x, netY - d.y) <= captureR,
      );
      if (candidates.length === 0) continue;

      candidates.sort((a, b) =>
        Math.hypot(netX - a.x, netY - a.y) - Math.hypot(netX - b.x, netY - b.y),
      );
      const target = candidates[0];
      target.tether(this);
      this.net.tetheredDebris.push(target);
      console.debug(
        '[Ship._autoTether] tethered debris r=%.1f dist=%.1f total=%d',
        target.radius,
        Math.hypot(netX - target.x, netY - target.y),
        this.net.tetheredDebris.length,
      );
    }
  }

  // Spawn one bullet per alive gun module, each from the module's world position.
  _spawnBulletsFromGuns() {
    const bullets = [];
    const gunMods = this.grid.getAllModules().filter(m => m.isAlive() && m.def.damage);
    for (const gun of gunMods) {
      const wo = this.getModuleWorldOffset(gun);
      const bx = this.x + wo.x;
      const by = this.y + wo.y;
      // Guns face grid -Y (ship nose direction)
      const dir = gridVecToWorld(0, -1, this.angle);
      const bvx = this.vx + dir.x * BULLET_SPEED;
      const bvy = this.vy + dir.y * BULLET_SPEED;
      bullets.push(new Bullet(bx, by, bvx, bvy, gun.def.damage));
    }
    return bullets;
  }
}
