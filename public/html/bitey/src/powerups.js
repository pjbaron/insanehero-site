// Power-ups and air-dropped supplies.
//
// Crates: timed drops at offsets RELATIVE to the player, so they are always
// reachable and never buried deep in enemy ground. New crates appear on schedule
// regardless of whether earlier ones were taken, and each self-despawns after
// POWERUP_LIFETIME. Variety: a finite grenade launcher, three timed main-weapon
// buffs (rapid / triple / heavy), and a NAPALM strike (auto-fired small grenades).
//
// Supplies: a health pack that drifts down under a parachute on a slower clock;
// catch it mid-air (jump / cliff-dive) or off the ground for 50% health.

import * as cfg from './config.js';
import { aabbOverlap } from './world.js';

// type -> presentation + spawn weight. Visuals live here so the renderer and the
// pickup popups agree on colour/letter.
export const PU_META = {
  grenades: { label: 'GRENADES',    letter: 'G', color: '#e0a838', weight: 3 },
  rapid:    { label: 'RAPID FIRE',  letter: 'R', color: '#46c0e0', weight: 2 },
  triple:   { label: 'TRIPLE SHOT', letter: 'T', color: '#8a6fe0', weight: 2 },
  heavy:    { label: 'HEAVY ROUNDS',letter: 'H', color: '#e06f6f', weight: 2 },
  napalm:   { label: 'NAPALM!',     letter: 'N', color: '#ff7a2a', weight: 2 },
};
const PU_TYPES = Object.keys(PU_META);

export function applyPowerup(type, weapons) {
  switch (type) {
    case 'grenades': weapons.giveGrenadeLauncher(); break;
    case 'rapid':    weapons.addBuff('rapid'); break;
    case 'triple':   weapons.addBuff('triple'); break;
    case 'heavy':    weapons.addBuff('heavy'); break;
    case 'napalm':   weapons.addBuff('napalm'); break;
    default: throw new Error('unknown power-up type: ' + type);
  }
}

export class PowerUp {
  constructor(x, type, world, now) {
    this.type = type;
    this.w = cfg.CACHE_WIDTH;
    this.h = cfg.CACHE_HEIGHT;
    this.x = x;
    this.y = (world ? world.groundY : cfg.GROUND_Y) - this.h;
    this.bornAt = now;
    this.expireAt = now + cfg.POWERUP_LIFETIME;
    this.taken = false;
  }
}

// A health pack drifting down under a parachute.
export class Supply {
  constructor(x, world, now) {
    this.w = cfg.PARACHUTE_W;
    this.h = cfg.PARACHUTE_H;
    this.x = x;
    this.y = -60;                 // starts just above the top of the view
    this.world = world;
    this.landed = false;
    this.restOn = null;           // the ledge it rests on (null = ground)
    this.landAt = 0;
    this.taken = false;
    this.sway = Math.random() * Math.PI * 2;
  }
}

export class PowerUpManager {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.supplies = [];
    this.nextAt = cfg.POWERUP_FIRST_TIME;
    this.nextSupplyAt = cfg.PARACHUTE_FIRST_TIME;
    this.offsetIndex = 0;
    this.spawned = 0;
  }

  secondsUntilNext(elapsed) { return Math.max(0, this.nextAt - elapsed); }
  secondsUntilSupply(elapsed) { return Math.max(0, this.nextSupplyAt - elapsed); }

  _pickType() {
    let total = 0;
    for (const t of PU_TYPES) total += PU_META[t].weight;
    let r = Math.random() * total;
    for (const t of PU_TYPES) { r -= PU_META[t].weight; if (r <= 0) return t; }
    return PU_TYPES[0];
  }

  _clampX(x, w) {
    return Math.max(40, Math.min(cfg.WORLD_WIDTH - w - 40, x));
  }

  // Nudge a ground crate off any wall it would spawn inside, to the nearest clear
  // x. Crates are also kept out of the leftmost half-screen (the zombie-entry zone
  // at the map's left edge), where they would be unobtainable.
  _avoidWalls(x) {
    const w = cfg.CACHE_WIDTH, h = cfg.CACHE_HEIGHT;
    const gy = this.world ? this.world.groundY : cfg.GROUND_Y;
    const lo = cfg.POWERUP_LEFT_LIMIT, hi = cfg.WORLD_WIDTH - w - 40;
    x = Math.max(lo, Math.min(hi, x));
    const clear = (xx) => {
      if (xx < lo || xx > hi) return false;
      const box = { x: xx, y: gy - h, w, h };
      for (const o of this.world.obstacles) {
        if (o.isPlatform) continue;          // platforms are above a ground crate
        if (aabbOverlap(box, o)) return false;
      }
      return true;
    };
    if (clear(x)) return x;
    for (let d = 20; d <= 1200; d += 20) {
      if (clear(x + d)) return x + d;
      if (clear(x - d)) return x - d;
    }
    return x; // already clamped into [lo, hi]
  }

  // The surface a supply at x would rest on: the highest platform/grounded wall
  // its span overlaps and sits above, else the ground. Returns {y, obstacle}.
  _surfaceUnder(s) {
    const gy = this.world ? this.world.groundY : cfg.GROUND_Y;
    let surfaceY = gy, surf = null;
    for (const o of this.world.obstacles) {
      if (!(o.isPlatform || o.grounded)) continue; // solid tops only
      if (s.x < o.x + o.w && s.x + s.w > o.x && o.y < surfaceY && o.y >= s.y) {
        surfaceY = o.y; surf = o;
      }
    }
    return { y: surfaceY, obstacle: surf };
  }

  update(elapsed, dt, playerX) {
    // Crates: drop relative to the player, cycling through the offset pattern,
    // nudged clear of any wall.
    while (elapsed >= this.nextAt) {
      const off = cfg.POWERUP_OFFSETS[this.offsetIndex % cfg.POWERUP_OFFSETS.length];
      this.offsetIndex += 1;
      const x = this._avoidWalls(playerX + off * cfg.SCREEN_REF);
      this.list.push(new PowerUp(x, this._pickType(), this.world, this.nextAt));
      this.spawned += 1;
      this.nextAt += cfg.POWERUP_INTERVAL;
    }
    if (this.list.length) {
      this.list = this.list.filter(p => !p.taken && elapsed < p.expireAt);
    }

    // Supplies: parachute health drops on a slower clock, slightly ahead of the
    // player so there is room to leap up and catch them.
    while (elapsed >= this.nextSupplyAt) {
      const x = this._clampX(playerX + 0.45 * cfg.SCREEN_REF, cfg.PARACHUTE_W);
      this.supplies.push(new Supply(x, this.world, this.nextSupplyAt));
      this.nextSupplyAt += cfg.PARACHUTE_INTERVAL;
    }
    for (const s of this.supplies) {
      if (s.taken) continue;
      // If the ledge it landed on falls or is destroyed, resume the descent.
      if (s.landed) {
        if (s.restOn && (s.restOn.falling || this.world.obstacles.indexOf(s.restOn) === -1)) {
          s.landed = false; s.restOn = null;
        } else continue;
      }
      s.y += cfg.PARACHUTE_FALL_SPEED * dt;
      s.sway += dt * 1.5;
      const surface = this._surfaceUnder(s);
      if (s.y + s.h >= surface.y) {
        s.y = surface.y - s.h;
        s.landed = true;
        s.restOn = surface.obstacle; // null => the ground
        s.landAt = elapsed;
      }
    }
    if (this.supplies.length) {
      this.supplies = this.supplies.filter(s =>
        !s.taken && (!s.landed || elapsed - s.landAt < cfg.PARACHUTE_GROUND_TIME));
    }
  }

  // Collect the first crate the player is touching (already applied). Caller does FX.
  tryPickup(player, weapons) {
    for (const p of this.list) {
      if (p.taken) continue;
      if (aabbOverlap(p, player)) { applyPowerup(p.type, weapons); p.taken = true; return p; }
    }
    return null;
  }

  // Collect a parachute supply the player overlaps (in the air or on the ground).
  tryPickupSupply(player) {
    for (const s of this.supplies) {
      if (s.taken) continue;
      if (aabbOverlap(s, player)) { s.taken = true; return s; }
    }
    return null;
  }
}
