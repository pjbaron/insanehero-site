// Verification: (A) climb-dwell delay, (B) head-on stop -> unsupported pyramid.

import { Zombie, Horde } from './src/zombie.js';
import { World } from './src/world.js';
import { Player } from './src/player.js';
import * as cfg from './src/config.js';

const dt = cfg.FIXED_DT;
const groundY = cfg.GROUND_Y;
const feetHeight = z => groundY - (z.y + z.h);

// Pin zombies to the base speed so the climb/stack geometry is deterministic
// (per-zombie speed variance is exercised separately, not here).
function fixedSpeed(z) {
  z.speedFrac = cfg.ZOMBIE_SPEED_FRAC;
  z.speed = cfg.PLAYER_SPEED * cfg.ZOMBIE_SPEED_FRAC;
  return z;
}

// --- (A) A zombie behind a wall-stalled zombie waits the delay before climbing ---
{
  const world = new World();
  world.obstacles.length = 0;
  const wall = world.addWall(2200, 90, 220, true);
  const horde = new Horde();
  const player = new Player(wall.x + 500); // pull the column into the wall

  const front = fixedSpeed(new Zombie(wall.x - cfg.ZOMBIE_WIDTH, world));
  const rear = fixedSpeed(new Zombie(front.x - cfg.ZOMBIE_WIDTH + cfg.ZOMBIE_OVERLAP_SKIN, world));
  horde.zombies.push(front, rear);

  const earlyFrames = Math.floor((cfg.ZOMBIE_CLIMB_DELAY * 0.5) / dt); // ~50ms
  for (let i = 0; i < earlyFrames; i++) horde.update(dt, player, world);
  if (feetHeight(rear) > 1) {
    throw new Error('rear climbed before the dwell delay: feet=' + feetHeight(rear).toFixed(1));
  }

  for (let i = 0; i < 60; i++) horde.update(dt, player, world); // ~1s more
  if (feetHeight(rear) <= 1) {
    throw new Error('rear never climbed after the dwell delay');
  }
}

// --- (B) Head-on convergence forms an unsupported pyramid under an elevated player ---
{
  const world = new World();
  world.obstacles.length = 0; // empty arena: any stacking here is unsupported
  const horde = new Horde();
  const cx = 3500;
  const player = new Player(cx);
  player.y = 150; // up on an overhead platform, out of reach

  const step = cfg.ZOMBIE_WIDTH - cfg.ZOMBIE_OVERLAP_SKIN;
  for (let i = 0; i < 6; i++) {
    horde.zombies.push(fixedSpeed(new Zombie(cx - 40 - i * step, world))); // approach from left
    horde.zombies.push(fixedSpeed(new Zombie(cx + 40 + i * step, world))); // approach from right
  }

  let maxFeet = 0, maxPenetration = 0;
  for (let i = 0; i < 60 * 7; i++) {
    horde.update(dt, player, world);
    for (const z of horde.zombies) maxFeet = Math.max(maxFeet, feetHeight(z));
    const live = horde.zombies;
    for (let a = 0; a < live.length; a++) {
      for (let b = a + 1; b < live.length; b++) {
        const za = live[a], zb = live[b];
        const ox = Math.min(za.x + za.w, zb.x + zb.w) - Math.max(za.x, zb.x);
        const oy = Math.min(za.y + za.h, zb.y + zb.h) - Math.max(za.y, zb.y);
        if (ox > 0 && oy > 0) maxPenetration = Math.max(maxPenetration, Math.min(ox, oy));
      }
    }
  }
  if (maxFeet < cfg.ZOMBIE_HEIGHT * 0.9) {
    throw new Error('no unsupported pyramid formed; max feet height ' + maxFeet.toFixed(1));
  }
  if (maxPenetration > 8) {
    throw new Error('zombies overlapped too much: ' + maxPenetration.toFixed(1) + 'px');
  }
  console.log('  pyramid feet height ' + maxFeet.toFixed(0) +
              'px (no wall), max overlap ' + maxPenetration.toFixed(1) + 'px');
}

console.log('behaviors OK');
