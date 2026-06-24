// Verification: spawn curve shape, cap enforcement, and slow pursuit.

import { spawnRate, Spawner } from './src/spawner.js';
import { Zombie, Horde } from './src/zombie.js';
import { World } from './src/world.js';
import { Player } from './src/player.js';
import * as cfg from './src/config.js';

// --- Spawn curve ---
// Starts at a non-zero floor (SPAWN_BASE_FRAC of peak) so pressure arrives early.
const floor = cfg.SPAWN_PEAK_RATE * cfg.SPAWN_BASE_FRAC;
if (Math.abs(spawnRate(0) - floor) > 1e-9) {
  throw new Error('spawnRate(0) not at the floor: ' + spawnRate(0) + ' expected ' + floor);
}
if (floor <= 0) throw new Error('spawn floor should be positive for early pressure');
// The ramp component has reached the peak by SPAWN_RAMP_SECONDS...
const atRamp = spawnRate(cfg.SPAWN_RAMP_SECONDS);
if (atRamp < cfg.SPAWN_PEAK_RATE - 1e-9) {
  throw new Error('ramp did not reach peak by ramp end: ' + atRamp);
}
// ...and the rate KEEPS creeping up afterwards (never plateaus) so you get overrun.
if (spawnRate(cfg.SPAWN_RAMP_SECONDS * 10) <= atRamp + 1e-9) {
  throw new Error('spawn rate plateaued; it should keep rising');
}
let prev = -1;
for (let t = 0; t <= cfg.SPAWN_RAMP_SECONDS * 2; t += 1) {
  const r = spawnRate(t);
  if (r < prev - 1e-9) throw new Error('spawn curve decreased at t=' + t);
  prev = r;
}

// --- Cap enforcement ---
const world = new World();
const spawner = new Spawner();
const zombies = [];
const dt = cfg.FIXED_DT;
for (let i = 0; i < 60 * 200; i++) { // simulate ~200s
  spawner.update(dt, zombies, world);
  if (zombies.length > cfg.MAX_ZOMBIES) {
    throw new Error('exceeded MAX_ZOMBIES: ' + zombies.length);
  }
}
if (zombies.length === 0) throw new Error('no zombies spawned');

// --- Slow pursuit toward the player ---
const player = new Player(800);
const horde = new Horde();
const z = new Zombie(200, world);
horde.zombies.push(z);
const startX = z.x;
for (let i = 0; i < 60; i++) horde.update(dt, player, world); // 1s
const moved = z.x - startX;
if (moved <= 0) throw new Error('zombie did not move toward player');
const playerWouldMove = cfg.PLAYER_SPEED * 1.0;
if (moved >= playerWouldMove) throw new Error('zombie not slower than player');

console.log('horde OK');
