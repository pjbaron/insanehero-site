// Verification: player jumps, falls under gravity, lands, and stays in bounds.

import { World } from './src/world.js';
import { Player } from './src/player.js';
import * as cfg from './src/config.js';

const world = new World();
const player = new Player(cfg.CANVAS_WIDTH * 0.5);

// Fake input: hold jump on the first frame, then move right.
let frame = 0;
const input = {
  has(action) {
    if (action === 'right') return frame > 5;
    return false;
  },
  consumePressed(action) {
    if (action === 'jump' && frame === 0) return true;
    return false;
  },
};

let leftGround = false;
const dt = cfg.FIXED_DT;
for (frame = 0; frame < 120; frame++) {
  player.update(dt, input, world);
  if (!player.onGround) leftGround = true;
  if (player.x < 0 || player.x + player.w > cfg.WORLD_WIDTH) {
    throw new Error('player left world bounds: x=' + player.x);
  }
  if (player.y + player.h > cfg.GROUND_Y + 0.01) {
    throw new Error('player fell through ground: y=' + player.y);
  }
}

if (!leftGround) throw new Error('player never jumped');
if (!player.onGround) throw new Error('player did not return to ground');

console.log('player OK');
