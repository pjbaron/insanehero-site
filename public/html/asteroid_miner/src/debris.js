import { Entity } from './entity.js';
import { MATERIAL_DATA } from './asteroid.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';

const TETHER_LENGTH = 80;
const SPRING_CONSTANT = 10;  // pull force on debris toward ship (intentionally stronger than ship reaction in net.js)

export class Debris extends Entity {
  constructor(x, y, materialType, radius = 5 + Math.random() * 7) {
    super(x, y, 'debris');
    this.radius = radius;
    this.mass = radius * 0.5;
    this.materialType = materialType;
    const matValue = MATERIAL_DATA[materialType]?.value ?? 1;
    this.value = Math.max(1, Math.round(matValue * this.radius / 8));
    this.tethered = false;
    this.tetheredTo = null;
    this.collectPulse = 0;
    this.seed = Math.random() * 10000;
  }

  update(dt) {
    if (this.collectPulse > 0) this.collectPulse = Math.max(0, this.collectPulse - dt);

    if (!this.tethered) {
      super.update(dt);
      const drag = 1 - 0.002 * dt;
      this.vx *= drag;
      this.vy *= drag;
    } else {
      const ship = this.tetheredTo;
      const dx = ship.x - this.x;
      const dy = ship.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > TETHER_LENGTH) {
        const force = (dist - TETHER_LENGTH) * SPRING_CONSTANT;
        const ax = (dx / dist) * force / this.mass;
        const ay = (dy / dist) * force / this.mass;
        this.vx += ax * dt;
        this.vy += ay * dt;
      }

      super.update(dt);
      const drag = 1 - 0.25 * dt;
      this.vx *= drag;
      this.vy *= drag;
    }

    // Clamp to world bounds
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.radius > WORLD_WIDTH) {
      this.x = WORLD_WIDTH - this.radius;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
    } else if (this.y + this.radius > WORLD_HEIGHT) {
      this.y = WORLD_HEIGHT - this.radius;
      this.vy = -Math.abs(this.vy);
    }
  }

  tether(ship) {
    this.tethered = true;
    this.tetheredTo = ship;
    this.collectPulse = 0.4;
  }

  release() {
    this.tethered = false;
    this.tetheredTo = null;
  }
}
