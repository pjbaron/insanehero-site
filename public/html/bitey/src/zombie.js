// Zombie tide: ground pursuit at 0.8x player speed. Zombies are solid AABB
// bodies that collide with the world AND with each other. They cannot climb a
// wall directly - they only claw at it for small damage. The only way over a
// wall is to physically pile up: a zombie blocked by another zombie in front
// climbs onto it, so a packed column builds a staircase over time.

import * as cfg from './config.js';
import { aabbOverlap } from './world.js';

const STATE_PURSUE = 'pursue';
const STATE_ATTACK = 'attack';   // clawing a wall
const STATE_CLIMB = 'climb';     // mounting the zombie in front

// Per-zombie ground speed: the base frac times a random multiplier, capped
// strictly below the player. The spread is what turns the queue into a churning
// wave - faster bodies stall behind slower ones and climb over them.
function rollSpeed() {
  const span = cfg.ZOMBIE_SPEED_VAR_MAX - cfg.ZOMBIE_SPEED_VAR_MIN;
  const frac = cfg.ZOMBIE_SPEED_FRAC * (cfg.ZOMBIE_SPEED_VAR_MIN + Math.random() * span);
  return Math.min(frac, cfg.ZOMBIE_SPEED_MAX_FRAC);
}

export class Zombie {
  constructor(x, world) {
    this.w = cfg.ZOMBIE_WIDTH;
    this.h = cfg.ZOMBIE_HEIGHT;
    this.speedFrac = rollSpeed();                 // fraction of player speed (for tint)
    this.speed = cfg.PLAYER_SPEED * this.speedFrac;
    this.x = x;
    this.y = (world ? world.groundY : cfg.GROUND_Y) - this.h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.hp = cfg.ZOMBIE_MAX_HP;
    this.dead = false;
    this.state = STATE_PURSUE;
    this.prevX = this.x;      // start-of-frame x, for measuring forward progress
    this.climbTimer = 0;      // time spent blocked behind a stalled zombie
    this.knockVx = 0;         // transient shove from bullets/grenades (decays)
    this.knockVy = 0;         // transient vertical pop from a blast
    this.hitFlash = 0;        // >0 = render white this many seconds
    this.wobble = Math.random() * Math.PI * 2; // per-zombie shamble phase
  }

  get centerX() { return this.x + this.w * 0.5; }
  get centerY() { return this.y + this.h * 0.5; }
}

export class Horde {
  constructor() {
    this.zombies = [];
  }

  get count() { return this.zombies.length; }

  // Clamp a body to the world bounds and push it out of any wall it overlaps.
  _resolveStatics(z, world) {
    if (z.x < 0) z.x = 0;
    if (z.x + z.w > world.width) z.x = world.width - z.w;
    for (const o of world.obstacles) {
      if (!aabbOverlap(z, o)) continue;
      // Push out along the axis of least penetration.
      const ox = Math.min(z.x + z.w, o.x + o.w) - Math.max(z.x, o.x);
      const oy = Math.min(z.y + z.h, o.y + o.h) - Math.max(z.y, o.y);
      if (ox < oy) {
        z.x += (z.centerX < o.centerX) ? -ox : ox;
      } else {
        if (z.centerY < o.centerY) { z.y -= oy; z.vy = Math.min(z.vy, 0); z.onGround = true; }
        else { z.y += oy; z.vy = Math.max(z.vy, 0); }
      }
    }
    if (z.y + z.h >= world.groundY) { z.y = world.groundY - z.h; z.vy = 0; z.onGround = true; }
  }

  update(dt, player, world) {
    const list = this.zombies;
    this.contactThisFrame = false;

    for (const z of list) {
      if (z.dead) continue;

      if (z.hitFlash > 0) z.hitFlash -= dt;

      const dir = player.centerX >= z.centerX ? 1 : -1;
      z.vx = dir * z.speed + z.knockVx;
      z.vy += cfg.GRAVITY * dt;
      if (z.knockVy) { z.vy += z.knockVy; z.knockVy = 0; }
      // Knockback bleeds off fast (~85%/frame at 60fps).
      z.knockVx *= Math.pow(0.0005, dt);
      if (Math.abs(z.knockVx) < 1) z.knockVx = 0;

      // Net forward progress over the last full frame (post-separation).
      const signedProgress = (z.x - z.prevX) * dir;
      z.prevX = z.x;
      const movedFreely = signedProgress > Math.abs(z.vx) * dt * 0.5;

      // Probe just ahead for a frontal zombie at this level. Classify it as a
      // climb candidate (heading the same way) or a head-on blocker (heading
      // toward us). A head-on pair stops dead, forming an unsupported base.
      const reach = Math.abs(z.vx) * dt + cfg.ZOMBIE_OVERLAP_SKIN;
      const probe = { x: z.x + dir * reach, y: z.y, w: z.w, h: z.h };
      let climbAhead = false;
      let headOn = false;
      for (const o of list) {
        if (o === z || o.dead) continue;
        if (!aabbOverlap(probe, o)) continue;
        if (o.y + o.h <= z.y + cfg.ZOMBIE_OVERLAP_SKIN) continue; // o is above, not frontal
        const oDir = player.centerX >= o.centerX ? 1 : -1;
        if (oDir === -dir) headOn = true;
        // Only climb onto a zombie that is itself SUPPORTED. In the separation
        // solver, onGround is set on a body only when it is resting vertically on
        // something (the ground, a wall, or another body) - never on one merely
        // shoved sideways. So requiring o.onGround means the rear only mounts a
        // body that has support beneath it, which stops the "flying" diagonal
        // line (each link resting on an unsupported climber) while still building
        // the real pyramid bottom-up.
        else if (o.onGround) climbAhead = true;
      }

      // --- Horizontal move + wall resolution ---
      z.x += z.vx * dt;
      let blockedByWall = null;
      for (const o of world.obstacles) {
        if (aabbOverlap(z, o)) {
          if (z.vx > 0) z.x = o.x - z.w;
          else if (z.vx < 0) z.x = o.x + o.w;
          blockedByWall = o;
        }
      }
      if (z.x < 0) z.x = 0;
      if (z.x + z.w > world.width) z.x = world.width - z.w;

      // --- Decide behaviour ---
      if (blockedByWall) {
        // Claw the wall for small damage; never climb the wall itself.
        world.damage(blockedByWall, cfg.ZOMBIE_HAND_DPS * dt);
        z.state = STATE_ATTACK;
        z.climbTimer = 0;
      } else if (headOn) {
        // Both stop and hold their ground; no climbing into an oncoming zombie.
        z.vx = 0;
        z.state = STATE_ATTACK;
        z.climbTimer = 0;
      } else if (climbAhead) {
        // Only climb once the zombie in front has stalled (we have stopped
        // making forward progress) for the dwell delay; a moving chase resets
        // the timer so a tight pursuing cluster does not climb each other.
        if (movedFreely) z.climbTimer = 0;
        else z.climbTimer += dt;
        if (z.climbTimer >= cfg.ZOMBIE_CLIMB_DELAY) {
          z.vy = -cfg.ZOMBIE_CLIMB_SPEED; // relaxation lands it on top
          z.state = STATE_CLIMB;
        } else {
          z.state = STATE_PURSUE;
        }
      } else {
        z.climbTimer = 0;
        z.state = STATE_PURSUE;
      }

      // --- Vertical move + wall/ground resolution ---
      z.y += z.vy * dt;
      z.onGround = false;
      for (const o of world.obstacles) {
        if (aabbOverlap(z, o)) {
          if (z.vy > 0) { z.y = o.y - z.h; z.vy = 0; z.onGround = true; }
          else if (z.vy < 0) { z.y = o.y + o.h; z.vy = 0; }
        }
      }
      if (z.y + z.h >= world.groundY) { z.y = world.groundY - z.h; z.vy = 0; z.onGround = true; }

      if (aabbOverlap(z, player)) {
        player.hp -= cfg.ZOMBIE_CONTACT_DPS * dt;
        // Bitten: shove the player away (to the right, off the tide) + flash.
        const pushDir = player.centerX >= z.centerX ? 1 : -1;
        player.knockVx += pushDir * cfg.PLAYER_CONTACT_KNOCKBACK * dt * 6;
        player.hitFlash = cfg.PLAYER_HIT_FLASH_TIME;
        this.contactThisFrame = true;
      }
    }

    this._separate(world);

    // Remove the dead (O(n)).
    if (list.some(z => z.dead)) {
      this.zombies = list.filter(z => !z.dead);
    }
  }

  // Positional relaxation: push overlapping zombies apart along the axis of
  // least penetration so bodies never overlap by more than the skin, while
  // letting stacks rest stably (a body on top is lifted, the lower one holds).
  _separate(world) {
    const list = this.zombies;
    const skin = cfg.ZOMBIE_OVERLAP_SKIN;
    for (let iter = 0; iter < cfg.ZOMBIE_SOLVER_ITERATIONS; iter++) {
      for (let a = 0; a < list.length; a++) {
        const za = list[a];
        if (za.dead) continue;
        for (let b = a + 1; b < list.length; b++) {
          const zb = list[b];
          if (zb.dead) continue;
          const ox = Math.min(za.x + za.w, zb.x + zb.w) - Math.max(za.x, zb.x);
          const oy = Math.min(za.y + za.h, zb.y + zb.h) - Math.max(za.y, zb.y);
          if (ox <= skin || oy <= skin) continue;

          if (ox < oy) {
            // Separate horizontally. Push the body that is driving INTO the
            // other (the rear of the column) back fully, so a packed chain
            // relaxes front-to-back; split only in a head-on press.
            const total = ox - skin;
            const left = za.centerX < zb.centerX ? za : zb;
            const right = left === za ? zb : za;
            const leftDrivesIn = left.vx > 0;
            const rightDrivesIn = right.vx < 0;
            if (leftDrivesIn && !rightDrivesIn) left.x -= total;
            else if (rightDrivesIn && !leftDrivesIn) right.x += total;
            else { left.x -= total * 0.5; right.x += total * 0.5; }
          } else {
            // Separate vertically: lift the upper body onto the lower one.
            const push = oy - skin;
            if (za.centerY < zb.centerY) { za.y -= push; za.vy = Math.min(za.vy, 0); za.onGround = true; }
            else { zb.y -= push; zb.vy = Math.min(zb.vy, 0); zb.onGround = true; }
          }
        }
      }
      // Keep bodies inside the world and out of walls after each pass.
      for (const z of list) {
        if (!z.dead) this._resolveStatics(z, world);
      }
    }
  }
}
