// Verification: zombies do NOT climb walls alone, they DO stack on each other,
// and they never overlap each other by more than a few pixels.

import { Zombie, Horde } from './src/zombie.js';
import { World } from './src/world.js';
import { Player } from './src/player.js';
import * as cfg from './src/config.js';

const dt = cfg.FIXED_DT;
const wall2 = 2200; // tall test wall position (added explicitly below)
const groundY = cfg.GROUND_Y;

// A clean world with a single tall wall, isolated from level-design changes.
function cleanWorldWithTallWall() {
  const world = new World();
  world.obstacles.length = 0;
  world.addWall(wall2, 90, 220, true);
  return world;
}

function feetHeight(z) { return groundY - (z.y + z.h); } // 0 == on the ground

// Pin every zombie to the base speed so these geometry tests are deterministic
// (per-zombie speed variance is exercised separately, not here).
function fixedSpeed(z) {
  z.speedFrac = cfg.ZOMBIE_SPEED_FRAC;
  z.speed = cfg.PLAYER_SPEED * cfg.ZOMBIE_SPEED_FRAC;
  return z;
}

// --- A lone zombie clawing a wall must NOT climb it ---
{
  const world = cleanWorldWithTallWall();
  const horde = new Horde();
  const wall = world.obstacles.find(o => o.x === wall2);
  const wallHp0 = wall.hp;
  const z = fixedSpeed(new Zombie(wall.x - cfg.ZOMBIE_WIDTH - 5, world));
  horde.zombies.push(z);
  const player = new Player(wall.x + 400); // pull it right, into the wall
  for (let i = 0; i < 60 * 4; i++) horde.update(dt, player, world); // 4s
  if (feetHeight(z) > 1) throw new Error('lone zombie climbed the wall: feet=' + feetHeight(z));
  if (wall.hp >= wallHp0) throw new Error('lone zombie did no hand damage to wall');
  if (wallHp0 - wall.hp > wallHp0 * 0.5) throw new Error('hand damage is not small');
}

// --- A packed column stacks: at least one zombie ends up a full body up ---
{
  const world = cleanWorldWithTallWall();
  const horde = new Horde();
  const wall = world.obstacles.find(o => o.x === wall2);
  const player = new Player(wall.x + 600);
  // Seed a tight column just left of the wall.
  for (let i = 0; i < 10; i++) {
    const z = fixedSpeed(new Zombie(wall.x - (i + 1) * (cfg.ZOMBIE_WIDTH - cfg.ZOMBIE_OVERLAP_SKIN), world));
    horde.zombies.push(z);
  }
  let maxFeet = 0;
  let maxPenetration = 0;
  for (let i = 0; i < 60 * 8; i++) { // 8s
    horde.update(dt, player, world);
    const live = horde.zombies;
    for (const z of live) maxFeet = Math.max(maxFeet, feetHeight(z));
    // Pairwise penetration check.
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
    throw new Error('column did not stack; max feet height ' + maxFeet.toFixed(1));
  }
  if (maxPenetration > 8) {
    throw new Error('zombies overlapped too much: ' + maxPenetration.toFixed(1) + 'px');
  }
  console.log('  stack reached feet height ' + maxFeet.toFixed(0) +
              'px, max overlap ' + maxPenetration.toFixed(1) + 'px');
}

console.log('stacking OK');
