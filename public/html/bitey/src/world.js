// World: ground, finite bounds, breakable obstacles (walls, support pillars and
// platforms), and AABB collision. Plain kinematics only - no physics library.
//
// Terrain vocabulary:
//   - wall:     a jumpable ground obstacle; a speed bump that bunches the tide.
//   - pillar:   a support wall flagged isSupport; holds up a platform.
//   - platform: an elevated slab the player can stand on. It references the
//               supports holding it; destroy them all and the platform falls,
//               crushing whatever is underneath when it lands.

import * as cfg from './config.js';

// Axis-aligned bounding box overlap test. Boxes are {x,y,w,h} (top-left origin).
export function aabbOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// Does the segment (x0,y0)->(x1,y1) cross the AABB b? Slab method. Used for
// line-of-sight: a wall/platform between the gun and a zombie blocks the shot.
export function segmentIntersectsAabb(x0, y0, x1, y1, b) {
  const dx = x1 - x0, dy = y1 - y0;
  let tmin = 0, tmax = 1;
  if (dx !== 0) {
    const t1 = (b.x - x0) / dx, t2 = (b.x + b.w - x0) / dx;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (x0 < b.x || x0 > b.x + b.w) return false;
  if (dy !== 0) {
    const t1 = (b.y - y0) / dy, t2 = (b.y + b.h - y0) / dy;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  } else if (y0 < b.y || y0 > b.y + b.h) return false;
  return tmax >= tmin;
}

export class World {
  constructor(opts) {
    this.groundY = cfg.GROUND_Y;
    this.width = cfg.WORLD_WIDTH;
    this.obstacles = [];
    this.fallenThisStep = []; // platforms that hit the ground this update
    if (!opts || opts.seed !== false) this._seedWorld();
  }

  // Add a wall / pillar. Stands on the ground by default; pass `restsOn` (a
  // platform) to stand it on top of that platform instead - then it is NOT
  // grounded and falls if the platform beneath it is lost (structures can stack).
  addWall(x, w, h, isSupport, restsOn) {
    const top = restsOn ? restsOn.y : this.groundY;
    const obstacle = {
      x, y: top - h, w, h,
      hp: cfg.WALL_HP, maxHp: cfg.WALL_HP,
      isSupport: !!isSupport, isPlatform: false,
      grounded: !restsOn,
      supports: restsOn ? [restsOn] : null,
      falling: false, vy: 0, hitFlash: 0,
    };
    this.obstacles.push(obstacle);
    return obstacle;
  }

  // Add an elevated platform held up by `supports` (an array of pillars, which
  // may themselves rest on lower platforms). Lose them all and the platform falls.
  addPlatform(x, y, w, h, supports) {
    const platform = {
      x, y, w, h,
      hp: cfg.WALL_HP * 4, maxHp: cfg.WALL_HP * 4, // tough; meant to fall, not be shot down
      isSupport: false, isPlatform: true,
      grounded: false,
      supports: supports ? supports.slice() : [],
      falling: false, vy: 0, hitFlash: 0,
    };
    this.obstacles.push(platform);
    return platform;
  }

  _seedWorld() {
    const g = this.groundY;
    // A few plain speed-bump walls spaced down the long world.
    this.addWall(1250, 80, 95, false);
    this.addWall(5600, 80, 105, false);
    this.addWall(7300, 80, 110, false);

    // Structure 1: a single-support platform you can hop onto from the ground,
    // plus a neighbour to hop ACROSS to - a little aerial route. Each pillar is
    // destructible, so a clawing horde can drop the floor out from under you.
    const p1 = this.addWall(1900, 44, 130, true);
    this.addPlatform(1780, g - 146, 300, 16, [p1]);
    const p2 = this.addWall(2360, 44, 130, true);
    this.addPlatform(2240, g - 146, 300, 16, [p2]);

    // Structure 2: a sturdier two-pillar span. Its deck sits high, so a low
    // STEP wall just before it lets you bound up (ground -> step -> deck).
    this.addWall(3870, 70, 92, false); // step
    const s1 = this.addWall(4060, 44, 150, true);
    const s2 = this.addWall(4480, 44, 150, true);
    this.addPlatform(4020, g - 166, 520, 18, [s1, s2]);

    // Structure 3: a TWO-TIER tower - a pillar standing on the lower deck holds
    // an upper deck. Knock out the ground pillar and the whole stack comes down.
    const t1 = this.addWall(5360, 46, 130, true);          // ground pillar
    const lower = this.addPlatform(5240, g - 146, 320, 16, [t1]);
    const t2 = this.addWall(5380, 40, 110, true, lower);   // pillar ON the lower deck
    this.addPlatform(5300, lower.y - 110 - 16, 240, 16, [t2]); // upper deck

    // Structure 4: a committing single-support perch deep in the world.
    const p4 = this.addWall(6750, 46, 138, true);
    this.addPlatform(6620, g - 154, 300, 16, [p4]);
  }

  // When a support is lost (destroyed or now falling), detach it from everything
  // it held up; anything left with no supports (and not ground-standing) begins
  // to fall too - cascading up a stacked structure.
  _collapseFrom(lost) {
    for (const o of this.obstacles) {
      if (o.grounded || !o.supports || o.falling) continue;
      const i = o.supports.indexOf(lost);
      if (i === -1) continue;
      o.supports.splice(i, 1);
      if (o.supports.length === 0) {
        o.falling = true;
        this._collapseFrom(o); // cascade upward
      }
    }
  }

  // Apply damage; remove the obstacle when its hp is depleted, collapsing
  // anything it was holding up.
  damage(obstacle, amount) {
    obstacle.hp -= amount;
    if (obstacle.hp <= 0) {
      const idx = this.obstacles.indexOf(obstacle);
      if (idx !== -1) this.obstacles.splice(idx, 1);
      this._collapseFrom(obstacle);
      return true; // destroyed
    }
    return false;
  }

  // Advance any falling obstacle. Records those that hit the ground this step in
  // fallenThisStep so the game can crush zombies caught underneath.
  update(dt) {
    this.fallenThisStep.length = 0;
    for (const o of this.obstacles) {
      if (o.hitFlash > 0) o.hitFlash -= dt;
      if (!o.falling) continue;
      o.vy += cfg.GRAVITY * dt;
      o.y += o.vy * dt;
      if (o.y + o.h >= this.groundY) {
        o.y = this.groundY - o.h;
        o.falling = false;
        o.vy = 0;
        o.landed = true;
        this.fallenThisStep.push(o);
      }
    }
  }

  // Resolve a moving body {x,y,w,h,vx,vy,onGround} for one step.
  // Separates axes: horizontal first, then vertical, then ground + bounds.
  // Returns the obstacle that blocked horizontal motion this step, or null.
  resolveBody(body, dt) {
    body.onGround = false;
    let blockingObstacle = null;

    // --- Horizontal ---
    body.x += body.vx * dt;
    for (const o of this.obstacles) {
      if (aabbOverlap(body, o)) {
        if (body.vx > 0) { body.x = o.x - body.w; blockingObstacle = o; }
        else if (body.vx < 0) { body.x = o.x + o.w; blockingObstacle = o; }
      }
    }
    if (body.x < 0) body.x = 0;
    if (body.x + body.w > this.width) body.x = this.width - body.w;

    // --- Vertical ---
    body.y += body.vy * dt;
    for (const o of this.obstacles) {
      if (aabbOverlap(body, o)) {
        if (body.vy > 0) { body.y = o.y - body.h; body.vy = 0; body.onGround = true; }
        else if (body.vy < 0) { body.y = o.y + o.h; body.vy = 0; }
      }
    }

    // Ground plane.
    if (body.y + body.h >= this.groundY) {
      body.y = this.groundY - body.h;
      body.vy = 0;
      body.onGround = true;
    }

    return blockingObstacle;
  }
}
