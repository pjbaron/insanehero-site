// Weapons: unlimited baseline gun (piercing, so it reads crowd density) + a
// finite-charge grenade launcher whose AoE is intentional collateral (damages
// your own walls too) and whose knockback sculpts the pile.
//
// update() returns an EVENTS object instead of a bare kill count, so the game
// loop can drive juice (blood at hit points, gibs at deaths, multi-kill popups)
// and combo scoring. Events are pure data; FX never feeds back into the sim.

import * as cfg from './config.js';

export const WEAPON_BASELINE = 'baseline';
export const WEAPON_POWER = 'power';

export class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.w = 10;
    this.h = 4;
    this.vx = vx;
    this.vy = vy;
    this.dir = vx >= 0 ? 1 : -1; // horizontal sign, for knockback direction
    this.traveled = 0;
    this.damage = cfg.BULLET_DAMAGE;
    this.knockback = cfg.BULLET_KNOCKBACK; // overridden by HEAVY buff at fire time
    this.pierced = 0;            // bodies passed through so far
    this.hitSet = null;         // zombies already hit (avoid double-hit per body)
    this.dead = false;
  }
}

export class Grenade {
  // opts let a napalm grenade be smaller/weaker/faster than a manual one.
  constructor(x, y, dir, opts) {
    opts = opts || {};
    this.x = x;
    this.y = y;
    this.w = opts.small ? 7 : 10;
    this.h = this.w;
    this.dir = dir;
    this.vx = dir * (opts.speed != null ? opts.speed : cfg.GRENADE_SPEED);
    this.vy = -(opts.lob != null ? opts.lob : cfg.GRENADE_LOB_VELOCITY);
    this.spin = 0;
    this.dead = false;
    this.small = !!opts.small;
    this.radius = opts.radius != null ? opts.radius : cfg.GRENADE_RADIUS;
    this.damage = opts.damage != null ? opts.damage : cfg.GRENADE_DAMAGE;
    this.knock = opts.knock != null ? opts.knock : cfg.GRENADE_KNOCKBACK;
  }
}

export class Explosion {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius != null ? radius : cfg.GRENADE_RADIUS;
    this.maxRadius = this.radius;
    this.life = 0.25;
  }
}

function pointToAabbDistance(px, py, box) {
  const cx = Math.max(box.x, Math.min(px, box.x + box.w));
  const cy = Math.max(box.y, Math.min(py, box.y + box.h));
  return Math.hypot(px - cx, py - cy);
}

function newEvents() {
  return { kills: 0, hits: [], deaths: [], detonations: [] };
}

// Apply damage + knockback + hit flash. Pushes a death event if it kills.
function hitZombie(z, amount, dir, knock, events) {
  if (z.dead) return false;
  z.hp -= amount;
  z.hitFlash = cfg.ZOMBIE_HIT_FLASH_TIME;
  if (knock) z.knockVx += dir * knock;
  events.hits.push({ x: z.centerX, y: z.centerY, dir });
  if (z.hp <= 0) {
    z.dead = true;
    events.kills += 1;
    events.deaths.push({ x: z.centerX, y: z.centerY, dir });
    return true;
  }
  return false;
}

export class WeaponSystem {
  constructor() {
    this.current = WEAPON_BASELINE;
    this.charges = 0;
    this.cooldown = 0;
    this.bullets = [];
    this.grenades = [];
    this.explosions = [];
    this.hasPower = false;
    this.firedThisStep = false; // for audio/muzzle flash
    this.napalmCooldown = 0;
    // Timed main-weapon buffs (seconds remaining). Each is granted by a crate.
    this.buffs = { rapid: 0, triple: 0, heavy: 0, napalm: 0 };
  }

  get currentCharges() {
    return this.current === WEAPON_POWER ? this.charges : Infinity;
  }

  giveGrenadeLauncher() {
    this.hasPower = true;
    this.charges = cfg.GRENADE_CHARGES;
  }

  addBuff(name) {
    if (this.buffs[name] === undefined) throw new Error('unknown buff: ' + name);
    this.buffs[name] = name === 'napalm' ? cfg.NAPALM_TIME : cfg.BUFF_TIME;
  }

  // Auto-fire the baseline gun along the vector to (targetX,targetY). Active
  // buffs raise the fire rate (RAPID), fan out three barrels (TRIPLE), and boost
  // damage + knockback (HEAVY). Returns true if a shot fired.
  autoFire(originX, originY, targetX, targetY) {
    if (this.cooldown > 0) return false;
    const base = Math.atan2(targetY - originY, targetX - originX);
    const sp = cfg.BULLET_SPEED;
    const heavy = this.buffs.heavy > 0;
    const dmg = cfg.BULLET_DAMAGE * (heavy ? cfg.HEAVY_DAMAGE_MULT : 1);
    const knock = cfg.BULLET_KNOCKBACK * (heavy ? cfg.HEAVY_KNOCK_MULT : 1);
    const angles = this.buffs.triple > 0
      ? [base - cfg.TRIPLE_SPREAD, base, base + cfg.TRIPLE_SPREAD]
      : [base];
    for (const a of angles) {
      const b = new Bullet(originX, originY, Math.cos(a) * sp, Math.sin(a) * sp);
      b.damage = dmg;
      b.knockback = knock;
      this.bullets.push(b);
    }
    const rate = cfg.BASELINE_FIRE_RATE * (this.buffs.rapid > 0 ? cfg.RAPID_FIRE_MULT : 1);
    this.cooldown = 1 / rate;
    this.firedThisStep = true;
    return true;
  }

  // Lob a grenade on demand (the SPECIAL button). Costs a charge.
  fireSpecial(originX, originY, dir) {
    if (this.charges <= 0) return false;
    this.grenades.push(new Grenade(originX, originY - 6, dir));
    this.charges -= 1;
    return true;
  }

  // NAPALM buff: auto-lob small grenades fast, with per-shot speed variance so
  // they land staggered - a rolling wall of flame. Self rate-limited.
  autoNapalm(originX, originY, dir) {
    if (this.napalmCooldown > 0) return false;
    const v = 1 + (Math.random() * 2 - 1) * cfg.NAPALM_SPEED_VAR;
    this.grenades.push(new Grenade(originX, originY - 6, dir, {
      small: true,
      speed: cfg.NAPALM_SPEED * Math.max(0.4, v),
      lob: cfg.NAPALM_LOB * (0.85 + Math.random() * 0.3),
      radius: cfg.NAPALM_RADIUS,
      damage: cfg.NAPALM_DAMAGE,
      knock: cfg.NAPALM_KNOCK,
    }));
    this.napalmCooldown = 1 / cfg.NAPALM_FIRE_RATE;
    return true;
  }

  _detonate(g, horde, world, events) {
    const gx = g.x + g.w * 0.5, gy = g.y + g.h * 0.5;
    const radius = g.radius, damage = g.damage, knock = g.knock;
    this.explosions.push(new Explosion(gx, gy, radius));
    const det = { x: gx, y: gy, killCount: 0, small: g.small };

    for (const z of horde.zombies) {
      if (z.dead) continue;
      const dx = z.centerX - gx, dy = z.centerY - gy;
      const d = Math.hypot(dx, dy);
      if (d <= radius) {
        // Radial knockback away from blast centre (mostly horizontal).
        const dir = dx >= 0 ? 1 : -1;
        const falloff = 1 - d / radius;
        if (hitZombie(z, damage, dir, knock * falloff, events)) {
          det.killCount += 1;
        }
        z.knockVy = -260 * falloff; // pop them into the air a touch
      }
    }

    for (const o of world.obstacles.slice()) {
      if (pointToAabbDistance(gx, gy, o) <= radius) {
        o.hitFlash = cfg.ZOMBIE_HIT_FLASH_TIME;
        world.damage(o, damage);
      }
    }

    events.detonations.push(det);
    return det.killCount;
  }

  update(dt, horde, world) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.napalmCooldown > 0) this.napalmCooldown -= dt;
    for (const k in this.buffs) {
      if (this.buffs[k] > 0) { this.buffs[k] -= dt; if (this.buffs[k] < 0) this.buffs[k] = 0; }
    }
    this.firedThisStep = false;
    const events = newEvents();

    // Piercing bullets: a single round passes through up to BULLET_PIERCE bodies,
    // losing damage each time, so dense rows collapse together.
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.traveled += Math.hypot(b.vx, b.vy) * dt;
      if (b.traveled > cfg.BULLET_RANGE) { b.dead = true; continue; }
      // Walls stop bullets (cover) but take NO damage from them - only grenades
      // (a deliberate, costed control) break walls, so the player never erases
      // their own fortification by auto-firing. The tide chews walls on its own.
      let blocked = false;
      for (const o of world.obstacles) {
        if (b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y) {
          blocked = true; break;
        }
      }
      if (blocked) { b.dead = true; continue; }
      for (const z of horde.zombies) {
        if (z.dead) continue;
        if (b.hitSet && b.hitSet.has(z)) continue;
        if (b.x < z.x + z.w && b.x + b.w > z.x && b.y < z.y + z.h && b.y + b.h > z.y) {
          const dmg = b.damage * Math.pow(cfg.BULLET_PIERCE_FALLOFF, b.pierced);
          hitZombie(z, dmg, b.dir, b.knockback, events);
          if (!b.hitSet) b.hitSet = new Set();
          b.hitSet.add(z);
          b.pierced += 1;
          if (b.pierced > cfg.BULLET_PIERCE) { b.dead = true; break; }
        }
      }
    }
    if (this.bullets.some(b => b.dead)) this.bullets = this.bullets.filter(b => !b.dead);

    // Grenades arc and detonate on ground or wall contact.
    for (const g of this.grenades) {
      if (g.dead) continue;
      g.vy += cfg.GRAVITY * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.spin += dt * 12;
      let detonate = false;
      if (g.y + g.h >= world.groundY) { g.y = world.groundY - g.h; detonate = true; }
      if (!detonate) {
        for (const o of world.obstacles) {
          if (g.x < o.x + o.w && g.x + g.w > o.x && g.y < o.y + o.h && g.y + g.h > o.y) {
            detonate = true; break;
          }
        }
      }
      if (detonate) {
        this._detonate(g, horde, world, events);
        g.dead = true;
      }
    }
    if (this.grenades.some(g => g.dead)) this.grenades = this.grenades.filter(g => !g.dead);

    for (const e of this.explosions) e.life -= dt;
    if (this.explosions.some(e => e.life <= 0)) this.explosions = this.explosions.filter(e => e.life > 0);

    return events;
  }
}
