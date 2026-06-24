// Player: the only entity that can jump. Footwork is the mobility edge.

import * as cfg from './config.js';

export class Player {
  constructor(x) {
    this.w = cfg.PLAYER_WIDTH;
    this.h = cfg.PLAYER_HEIGHT;
    this.x = (x === undefined ? cfg.CANVAS_WIDTH * 0.5 : x);
    this.y = cfg.GROUND_Y - this.h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.hp = cfg.PLAYER_MAX_HP;
    this.facing = -1; // 1 = right, -1 = left (faces the tide by default)
    this.knockVx = 0;    // transient shove from being bitten (decays)
    this.hitFlash = 0;   // >0 = render hurt-flash this many seconds
    this.healFlash = 0;  // >0 = HP bar pulses (just collected health)
    this.walkPhase = 0;  // for a little leg-shuffle animation
    this.jumpBuffer = 0; // remembers a jump pressed slightly before landing
    this.aimAngle = Math.PI; // gun-barrel angle (default: pointing left at the tide)
  }

  get centerX() { return this.x + this.w * 0.5; }
  get centerY() { return this.y + this.h * 0.5; }

  update(dt, input, world) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.healFlash > 0) this.healFlash -= dt;

    // Horizontal intent + transient knockback from bites.
    let dir = 0;
    if (input.has('left')) dir -= 1;
    if (input.has('right')) dir += 1;
    this.vx = dir * cfg.PLAYER_SPEED + this.knockVx;
    this.knockVx *= Math.pow(0.002, dt);
    if (Math.abs(this.knockVx) < 1) this.knockVx = 0;

    if (dir !== 0 && this.onGround) this.walkPhase += dt * 14;

    // Jump only from the ground - the single mobility advantage over zombies.
    // A short buffer lets a press land even if it arrives a hair before touchdown.
    const wantsJump = input.consumePressed ? input.consumePressed('jump') : input.has('jump');
    if (wantsJump) this.jumpBuffer = cfg.JUMP_BUFFER;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.jumpBuffer > 0 && this.onGround) {
      this.vy = -cfg.PLAYER_JUMP_VELOCITY;
      this.onGround = false;
      this.jumpBuffer = 0;
    }

    // Gravity.
    this.vy += cfg.GRAVITY * dt;

    // Collision + bounds resolution.
    world.resolveBody(this, dt);
  }
}
