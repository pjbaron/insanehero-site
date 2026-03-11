import { Entity } from './entity.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';
import { CRUSHER_POSITIONS } from './economy.js';

const EDGE_MARGIN = 200;

export class Trader extends Entity {
  constructor(x, y) {
    super(x, y, 'trader');
    this.radius = 25;
    this.mass = Infinity;
    this.speed = 50;

    this.state = 'offscreen';
    this.patrolTimer = 0;
    this.patrolDuration = 45;
    this.visitCooldown = 120;
    this.cooldownTimer = 60;
    this.waypoints = [];
    this.currentWaypoint = 0;
    this.pingRadius = 600;
    this.shopRadius = 80;
  }

  _pickEntryPoint() {
    const edge = Math.floor(Math.random() * 4); // 0=top,1=bottom,2=left,3=right
    switch (edge) {
      case 0: return { x: Math.random() * WORLD_WIDTH, y: -50, edge };
      case 1: return { x: Math.random() * WORLD_WIDTH, y: WORLD_HEIGHT + 50, edge };
      case 2: return { x: -50, y: Math.random() * WORLD_HEIGHT, edge };
      case 3: return { x: WORLD_WIDTH + 50, y: Math.random() * WORLD_HEIGHT, edge };
    }
  }

  _generateWaypoints() {
    const count = 3 + Math.floor(Math.random() * 3); // 3-5
    const pts = [];
    const minX = EDGE_MARGIN;
    const maxX = WORLD_WIDTH - EDGE_MARGIN;
    const minY = EDGE_MARGIN;
    const maxY = WORLD_HEIGHT - EDGE_MARGIN;

    // Always route near a random crusher so the trader visits player hotspots
    const cp = CRUSHER_POSITIONS[Math.floor(Math.random() * CRUSHER_POSITIONS.length)];
    pts.push({
      x: Math.max(minX, Math.min(maxX, cp.x + (Math.random() - 0.5) * 400)),
      y: Math.max(minY, Math.min(maxY, cp.y + (Math.random() - 0.5) * 400)),
    });

    for (let i = 1; i < count; i++) {
      pts.push({
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
      });
    }
    return pts;
  }

  _spawn() {
    const entry = this._pickEntryPoint();
    this.x = entry.x;
    this.y = entry.y;
    this.waypoints = this._generateWaypoints();
    this.currentWaypoint = 0;
    this.state = 'entering';
  }

  _exitTarget() {
    // Pick the nearest world edge and go 200px beyond it
    const distLeft = this.x;
    const distRight = WORLD_WIDTH - this.x;
    const distTop = this.y;
    const distBottom = WORLD_HEIGHT - this.y;
    const min = Math.min(distLeft, distRight, distTop, distBottom);
    if (min === distLeft)   return { x: -EDGE_MARGIN, y: this.y };
    if (min === distRight)  return { x: WORLD_WIDTH + EDGE_MARGIN, y: this.y };
    if (min === distTop)    return { x: this.x, y: -EDGE_MARGIN };
    return { x: this.x, y: WORLD_HEIGHT + EDGE_MARGIN };
  }

  _moveToward(target, dt) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) {
      this.vx = 0;
      this.vy = 0;
      return dist;
    }
    this.angle = Math.atan2(dy, dx);
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
    return dist;
  }

  _isOutsideWorld() {
    return this.x < -100 || this.x > WORLD_WIDTH + 100 ||
           this.y < -100 || this.y > WORLD_HEIGHT + 100;
  }

  update(dt) {
    if (this.state === 'offscreen') {
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0) {
        this._spawn();
      }
      return;
    }

    if (this.state === 'entering') {
      const target = this.waypoints[0];
      const dist = this._moveToward(target, dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (dist < 30) {
        this.currentWaypoint = 0;
        this.state = 'patrolling';
      }
      return;
    }

    if (this.state === 'patrolling') {
      this.patrolTimer += dt;
      const target = this.waypoints[this.currentWaypoint];
      const dist = this._moveToward(target, dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (dist < 30) {
        this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
      }
      if (this.patrolTimer >= this.patrolDuration) {
        this.state = 'leaving';
        this._exitPoint = this._exitTarget();
      }
      return;
    }

    if (this.state === 'leaving') {
      if (!this._exitPoint) this._exitPoint = this._exitTarget();
      this._moveToward(this._exitPoint, dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this._isOutsideWorld()) {
        this.state = 'offscreen';
        this.cooldownTimer = this.visitCooldown;
        this.patrolTimer = 0;
        this._exitPoint = null;
        this.vx = 0;
        this.vy = 0;
      }
    }
  }

  isInRange(ship) {
    return this.distanceTo(ship) < this.shopRadius;
  }

  isInPingRange(ship) {
    return this.distanceTo(ship) < this.pingRadius;
  }

  isActive() {
    return this.state !== 'offscreen';
  }
}
