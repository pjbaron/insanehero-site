const MODULE_RADIUS = 8;
const CELL_SIZE = 16;

export function calculateOrbitRadius(shipGrid) {
  const maxDim = Math.max(shipGrid.cols, shipGrid.rows);
  return (maxDim * CELL_SIZE / 2) + 40 + MODULE_RADIUS;
}

export function calculateAngularSpeed(shipGrid) {
  const maxDim = Math.max(shipGrid.cols, shipGrid.rows);
  // Linear interpolation: 3->1.5 rad/s, 7->0.6 rad/s
  const t = Math.min(Math.max((maxDim - 3) / (7 - 3), 0), 1);
  return 1.5 + t * (0.6 - 1.5);
}

export class OrbitingModule {
  constructor(type, shipGrid) {
    this.type = type;
    this.angle = 0;
    this.orbitRadius = calculateOrbitRadius(shipGrid);
    this.angularSpeed = calculateAngularSpeed(shipGrid);
    this.x = 0;
    this.y = 0;
    // Slide-in animation: module travels from grid position to orbit over 0.2s
    this._slideAge = 0;
    this._slideFromX = null;
    this._slideFromY = null;
    this._slideDuration = 0.2;
  }

  update(dt, shipX, shipY, shipAngle) {
    this.angle += this.angularSpeed * dt;
    const orbitX = shipX + Math.cos(this.angle) * this.orbitRadius;
    const orbitY = shipY + Math.sin(this.angle) * this.orbitRadius;

    if (this._slideAge < this._slideDuration && this._slideFromX !== null) {
      this._slideAge += dt;
      const t = Math.min(1, this._slideAge / this._slideDuration);
      // Smoothstep ease-out
      const ease = t * t * (3 - 2 * t);
      this.x = this._slideFromX + (orbitX - this._slideFromX) * ease;
      this.y = this._slideFromY + (orbitY - this._slideFromY) * ease;
    } else {
      this.x = orbitX;
      this.y = orbitY;
    }
  }
}

export class ModuleOrbitManager {
  constructor() {
    this._modules = [];
  }

  addModule(type, shipGrid) {
    const mod = new OrbitingModule(type, shipGrid);
    this._modules.push(mod);
    return mod;
  }

  removeModule(orbitingModule) {
    const idx = this._modules.indexOf(orbitingModule);
    if (idx !== -1) this._modules.splice(idx, 1);
  }

  update(dt, shipX, shipY, shipAngle) {
    for (const mod of this._modules) {
      mod.update(dt, shipX, shipY, shipAngle);
    }
  }

  getAll() {
    return this._modules;
  }

  hasModules() {
    return this._modules.length > 0;
  }
}
