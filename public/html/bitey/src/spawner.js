// Spawner: log-shaped rising tide from the single LEFT origin.

import * as cfg from './config.js';
import { Zombie } from './zombie.js';

// PURE: zombies/sec at a given elapsed time. Starts at SPAWN_BASE_FRAC of the
// peak (immediate pressure), ramps toward SPAWN_PEAK_RATE, then keeps creeping up
// forever at SPAWN_CREEP_PER_SEC so the tide never plateaus and eventually wins.
export function spawnRate(elapsedSeconds) {
  const e = Math.max(0, elapsedSeconds);
  const ramp = Math.log(1 + e) / Math.log(1 + cfg.SPAWN_RAMP_SECONDS);
  const frac = cfg.SPAWN_BASE_FRAC + (1 - cfg.SPAWN_BASE_FRAC) * Math.min(1, ramp);
  return cfg.SPAWN_PEAK_RATE * Math.min(1, frac) + cfg.SPAWN_CREEP_PER_SEC * e;
}

export class Spawner {
  constructor() {
    this.elapsed = 0;
    this.accum = 0; // fractional spawns carried between frames
  }

  // Step the tide. Pushes new Zombie instances into the provided array,
  // never exceeding MAX_ZOMBIES.
  update(dt, zombies, world) {
    this.elapsed += dt;
    this.accum += spawnRate(this.elapsed) * dt;
    // Avoid runaway backlog while at the perf cap.
    if (this.accum > 2) this.accum = 2;

    while (this.accum >= 1 && zombies.length < cfg.MAX_ZOMBIES) {
      const z = new Zombie(cfg.ZOMBIE_SPAWN_X, world);
      // If the entry is already occupied, spawn ON TOP of the pile there instead
      // of inside another body - the newcomer rises out above them.
      let topY = Infinity;
      for (const o of zombies) {
        if (o.dead) continue;
        if (o.x < cfg.ZOMBIE_SPAWN_X + z.w && o.x + o.w > cfg.ZOMBIE_SPAWN_X) {
          if (o.y < topY) topY = o.y;
        }
      }
      if (topY !== Infinity) { z.y = topY - z.h; z.onGround = false; }
      zombies.push(z);
      this.accum -= 1;
    }
    return zombies;
  }
}
