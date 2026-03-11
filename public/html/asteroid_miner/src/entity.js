export class Entity {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.radius = 1;
    this.alive = true;
    this.mass = 1;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  distanceTo(other) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  overlaps(other) {
    return this.distanceTo(other) < this.radius + other.radius;
  }
}

class EntityManager {
  constructor() {
    this._entities = [];
  }

  add(entity) {
    this._entities.push(entity);
  }

  remove(entity) {
    entity.alive = false;
  }

  getByType(type) {
    return this._entities.filter(e => e.alive && e.type === type);
  }

  update(dt) {
    for (const e of this._entities) {
      if (e.alive) e.update(dt);
    }
    this._entities = this._entities.filter(e => e.alive);
  }

  getAll() {
    return this._entities.filter(e => e.alive);
  }

  clear() {
    this._entities = [];
  }
}

export const entities = new EntityManager();
