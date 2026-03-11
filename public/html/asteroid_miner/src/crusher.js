import { Entity } from './entity.js';

export class Crusher extends Entity {
  constructor(x, y) {
    super(x, y, 'crusher');
    this.radius = 40;
    this.mass = Infinity;
    this.vx = 0;
    this.vy = 0;
    this.animationPhase = 0;
    this.consumePulse = 0;
  }

  update(dt) {
    const rotSpeed = this.consumePulse > 0 ? 2.5 : 0.5;
    this.animationPhase += dt * rotSpeed;
    if (this.consumePulse > 0) this.consumePulse = Math.max(0, this.consumePulse - dt);
    // Do not call super.update - crusher is stationary
  }

  checkCollection(ship) {
    if (!ship.net || !ship.net.tetheredDebris) return { value: 0, count: 0 };

    let totalValue = 0;
    let count = 0;
    const toRemove = [];

    for (const debris of ship.net.tetheredDebris) {
      const dx = debris.x - this.x;
      const dy = debris.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.radius + debris.radius) {
        toRemove.push(debris);
        totalValue += debris.value;
        count++;
      }
    }

    for (const debris of toRemove) {
      debris.alive = false;
    }

    if (totalValue > 0) this.consumePulse = 0.6;
    return { value: totalValue, count };
  }
}
