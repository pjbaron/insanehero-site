// Must mirror debris.js spring constants for accurate Newton's-3rd reaction force

const TETHER_LENGTH = 80;
const BASE_SPRING = 0.5;          // spring constant with no tether_reinforcer modules
const SPRING_PER_REINFORCER = 0.3; // each alive tether_reinforcer adds this

export class Net {
  constructor() {
    this.captureRadius = 60;
    this.tetheredDebris = [];
    this.ship = null;
  }

  // Derived from installed net modules; ship._netCapacity is updated by ship.recalcStats().
  get capacity() {
    return this.ship?._netCapacity ?? 0;
  }

  // LEGACY: ship.js uses _autoTether() instead. Kept for API compatibility.
  tryCollect(ship, entityManager) {
    this.ship = ship;
    const cap = this.ship?._netCapacity ?? 0;
    if (this.tetheredDebris.length >= cap) return null;

    const candidates = entityManager.getByType('debris').filter(d =>
      !d.tethered &&
      ship.distanceTo(d) <= this.captureRadius
    );

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => ship.distanceTo(a) - ship.distanceTo(b));
    const target = candidates[0];
    target.tether(ship);
    this.tetheredDebris.push(target);
    return target;
  }

  releaseAll() {
    for (const d of this.tetheredDebris) d.release();
    this.tetheredDebris = [];
  }

  releaseOne() {
    const d = this.tetheredDebris.pop();
    if (d) d.release();
  }

  update(dt) {
    // Prune dead debris
    this.tetheredDebris = this.tetheredDebris.filter(d => d.alive);

    if (!this.ship) return;

    // Apply Newton's 3rd law: each tethered debris pulls on the ship with
    // the opposite of the spring force acting on the debris.
    const reinforcers = this.ship?.grid?.getModulesByType('tether_reinforcer')?.filter(m => m.isAlive()) ?? [];
    const springConstant = BASE_SPRING + reinforcers.length * SPRING_PER_REINFORCER;
    for (const d of this.tetheredDebris) {
      const dx = this.ship.x - d.x;
      const dy = this.ship.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > TETHER_LENGTH) {
        const springForce = (dist - TETHER_LENGTH) * springConstant;
        // Debris is pulled toward ship (+dx direction); ship is pulled toward debris (-dx direction)
        this.ship.vx -= (dx / dist) * springForce / this.ship.mass * dt;
        this.ship.vy -= (dy / dist) * springForce / this.ship.mass * dt;
      }
    }
  }

  getTotalCargoMass() {
    return this.tetheredDebris.reduce((sum, d) => sum + d.mass, 0);
  }

  getCargoValue() {
    return this.tetheredDebris.reduce((sum, d) => sum + d.value, 0);
  }
}
