import { Entity } from './entity.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';

export const SIZE_DATA = {
  huge:   { radius: 80, hp: 8, mass: 50 },
  large:  { radius: 55, hp: 5, mass: 30 },
  medium: { radius: 35, hp: 3, mass: 15 },
  small:  { radius: 20, hp: 1, mass: 5  },
};

export const MATERIAL_DATA = {
  iron:     { value: 1,  color: '#8a8a8a', abundance: 0.5 },
  gold:     { value: 5,  color: '#ffd700', abundance: 0.2 },
  platinum: { value: 10, color: '#e5e4e2', abundance: 0.1 },
  ice:      { value: 2,  color: '#aaddff', abundance: 0.2 },
};

const CHILD_SIZES = {
  huge:   'large',
  large:  'medium',
  medium: 'small',
};

export class Asteroid extends Entity {
  constructor(x, y, size, materialType) {
    super(x, y, 'asteroid');
    this.size = size;
    this.materialType = materialType;

    const sd = SIZE_DATA[size];
    this.radius = sd.radius;
    this.hp = sd.hp;
    this.mass = sd.mass;

    this.seed = Math.random() * 10000;
    this.hitFlash = 0;

    // Random initial velocity 20-60 px/s
    const speed = 20 + Math.random() * 40;
    const dir = Math.random() * Math.PI * 2;
    this.vx = Math.cos(dir) * speed;
    this.vy = Math.sin(dir) * speed;

    // Slow random spin
    this.spinRate = (Math.random() - 0.5) * 0.5;
  }

  hit(power) {
    this.hp -= power;
    if (this.hp <= 0) return this.breakApart();
    this.hitFlash = 0.1;
    return null;
  }

  breakApart() {
    const children = [];
    const childSize = CHILD_SIZES[this.size];

    if (childSize) {
      const count = (this.size === 'medium') ? (2 + Math.floor(Math.random() * 3)) : (2 + Math.floor(Math.random() * 2));
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const spread = 30 + Math.random() * 50;
        const offset = SIZE_DATA[childSize].radius * 1.5;
        const child = new Asteroid(
          this.x + Math.cos(angle) * offset,
          this.y + Math.sin(angle) * offset,
          childSize,
          this.materialType
        );
        child.vx = this.vx + Math.cos(angle) * spread;
        child.vy = this.vy + Math.sin(angle) * spread;
        children.push(child);
      }
    } else {
      // small -> debris (plain data objects; spawner creates Debris instances to avoid circular import)
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const spread = 40 + Math.random() * 60;
        const offset = this.radius * 1.2;
        children.push({
          _debrisSpec: true,
          x: this.x + Math.cos(angle) * offset,
          y: this.y + Math.sin(angle) * offset,
          vx: this.vx + Math.cos(angle) * spread,
          vy: this.vy + Math.sin(angle) * spread,
          materialType: this.materialType,
        });
      }
    }

    this.alive = false;
    return children;
  }

  update(dt) {
    super.update(dt);

    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    // Very slow drag
    const drag = 1 - 0.001 * dt;
    this.vx *= drag;
    this.vy *= drag;

    // Spin
    this.angle += this.spinRate * dt;

    // Bounce off world bounds
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
}
