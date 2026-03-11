import { MODULE_DEFS } from './modules.js';

const CELL_SIZE = 16;
const MAX_GRID = 9;

export class InstalledModule {
  constructor(type, gridX, gridY, def) {
    this.type = type;
    this.gridX = gridX;
    this.gridY = gridY;
    this.def = def;
    this.health = def.health;
    this.damaged = false;
  }

  isAlive() {
    return this.health > 0;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.damaged = true;
    }
  }
}

export class ShipGrid {
  constructor(cols = 3, rows = 3) {
    this.cols = cols;
    this.rows = rows;
    this._initCells();
  }

  _initCells() {
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = new Array(this.cols).fill(null);
    }
  }

  canPlace(type, gridX, gridY) {
    const def = MODULE_DEFS[type];
    if (!def) return false;
    const w = def.gridW || 1;
    const h = def.gridH || 1;
    for (let r = gridY; r < gridY + h; r++) {
      for (let c = gridX; c < gridX + w; c++) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
        if (this.cells[r][c] !== null) return false;
      }
    }
    return true;
  }

  place(type, gridX, gridY) {
    if (!this.canPlace(type, gridX, gridY)) return null;
    const def = MODULE_DEFS[type];
    const mod = new InstalledModule(type, gridX, gridY, def);
    const w = def.gridW || 1;
    const h = def.gridH || 1;
    for (let r = gridY; r < gridY + h; r++) {
      for (let c = gridX; c < gridX + w; c++) {
        this.cells[r][c] = mod;
      }
    }
    return mod;
  }

  remove(gridX, gridY) {
    const mod = this.cells[gridY]?.[gridX];
    if (!mod) return null;
    const w = mod.def.gridW || 1;
    const h = mod.def.gridH || 1;
    for (let r = mod.gridY; r < mod.gridY + h; r++) {
      for (let c = mod.gridX; c < mod.gridX + w; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.cells[r][c] = null;
        }
      }
    }
    return mod.type;
  }

  getModuleAt(gridX, gridY) {
    if (gridY < 0 || gridY >= this.rows || gridX < 0 || gridX >= this.cols) return null;
    return this.cells[gridY][gridX];
  }

  getAllModules() {
    const seen = new Set();
    const result = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const mod = this.cells[r][c];
        if (mod && !seen.has(mod)) {
          seen.add(mod);
          result.push(mod);
        }
      }
    }
    return result;
  }

  getModulesByType(type) {
    return this.getAllModules().filter(m => m.type === type);
  }

  expand(direction) {
    if (direction === 'top' || direction === 'bottom') {
      if (this.rows >= MAX_GRID) return;
      if (direction === 'top') {
        // shift all modules down by 1
        this.getAllModules().forEach(m => m.gridY++);
        this.cells.unshift(new Array(this.cols).fill(null));
      } else {
        this.cells.push(new Array(this.cols).fill(null));
      }
      this.rows++;
    } else if (direction === 'left' || direction === 'right') {
      if (this.cols >= MAX_GRID) return;
      if (direction === 'left') {
        // shift all modules right by 1
        this.getAllModules().forEach(m => m.gridX++);
        for (let r = 0; r < this.rows; r++) {
          this.cells[r].unshift(null);
        }
      } else {
        for (let r = 0; r < this.rows; r++) {
          this.cells[r].push(null);
        }
      }
      this.cols++;
    }
  }

  getGridSize() {
    return { cols: this.cols, rows: this.rows };
  }

  getTotalMass() {
    return this.getAllModules().reduce((sum, m) => sum + (m.def.mass || 0), 0);
  }

  calculateCoM() {
    const modules = this.getAllModules();
    let totalMass = 0;
    let wx = 0, wy = 0;
    for (const m of modules) {
      const mass = m.def.mass || 0;
      if (mass === 0) continue;
      const w = m.def.gridW || 1;
      const h = m.def.gridH || 1;
      const cx = (m.gridX + w / 2) * CELL_SIZE;
      const cy = (m.gridY + h / 2) * CELL_SIZE;
      wx += mass * cx;
      wy += mass * cy;
      totalMass += mass;
    }
    if (totalMass === 0) return { x: 0, y: 0 };
    return { x: wx / totalMass, y: wy / totalMass };
  }

  getPowerGeneration() {
    return this.getAllModules().filter(m => m.isAlive()).reduce((sum, m) => sum + (m.def.powerGen || 0), 0);
  }

  getPowerDraw() {
    return this.getAllModules().filter(m => m.isAlive()).reduce((sum, m) => sum + (m.def.powerDraw || 0), 0);
  }

  isPowerSufficient() {
    return this.getPowerGeneration() >= this.getPowerDraw();
  }

  getPowerRatio() {
    const draw = this.getPowerDraw();
    if (draw === 0) return Infinity;
    return this.getPowerGeneration() / draw;
  }

  // Returns array of {gridX, gridY} cells in the exhaust path of a module.
  // Exhaust extends 2 cells deep in exhaustDir, full module width/height.
  // Cells outside grid bounds are omitted (exhaust vents to space).
  getExhaustZone(module) {
    const def = module.def;
    if (!def.hasExhaust) return [];
    const w = def.gridW || 1;
    const h = def.gridH || 1;
    const dir = def.exhaustDir;
    const cells = [];

    if (dir === 'down') {
      for (let depth = 1; depth <= 2; depth++) {
        for (let c = module.gridX; c < module.gridX + w; c++) {
          const r = module.gridY + h - 1 + depth;
          if (r < this.rows && c >= 0 && c < this.cols) cells.push({ gridX: c, gridY: r });
        }
      }
    } else if (dir === 'up') {
      for (let depth = 1; depth <= 2; depth++) {
        for (let c = module.gridX; c < module.gridX + w; c++) {
          const r = module.gridY - depth;
          if (r >= 0 && c >= 0 && c < this.cols) cells.push({ gridX: c, gridY: r });
        }
      }
    } else if (dir === 'left') {
      for (let depth = 1; depth <= 2; depth++) {
        for (let r = module.gridY; r < module.gridY + h; r++) {
          const c = module.gridX - depth;
          if (r >= 0 && r < this.rows && c >= 0) cells.push({ gridX: c, gridY: r });
        }
      }
    } else if (dir === 'right') {
      for (let depth = 1; depth <= 2; depth++) {
        for (let r = module.gridY; r < module.gridY + h; r++) {
          const c = module.gridX + w - 1 + depth;
          if (r >= 0 && r < this.rows && c < this.cols) cells.push({ gridX: c, gridY: r });
        }
      }
    }

    return cells;
  }

  // Call each frame while engines are running. module.firing must be set externally.
  // Returns [{type:'exhaust_damage', gridX, gridY, severity}, ...] for visual feedback.
  checkExhaustDamage(dt) {
    const events = [];
    const engines = this.getAllModules().filter(m => m.isAlive() && m.def.hasExhaust && m.firing);

    for (const engine of engines) {
      const zone = this.getExhaustZone(engine);
      const seen = new Set();
      for (const { gridX, gridY } of zone) {
        const mod = this.getModuleAt(gridX, gridY);
        if (!mod || !mod.isAlive() || seen.has(mod)) continue;
        seen.add(mod);

        if (mod.type === 'fuel_tank') {
          const expEvent = this.explodeFuelTank(mod);
          events.push({ type: 'exhaust_damage', gridX, gridY, severity: 'explosion', ...expEvent });
        } else if (mod.type === 'hull_plate' || mod.type === 'armor_plate') {
          mod.takeDamage(1 * dt);
          events.push({ type: 'exhaust_damage', gridX, gridY, severity: 'heat' });
        } else {
          mod.takeDamage(5 * dt);
          events.push({ type: 'exhaust_damage', gridX, gridY, severity: 'burn' });
        }
      }
    }

    return events;
  }

  // Destroys a fuel tank and damages 8-connected neighbors (50 dmg each).
  // Chains to adjacent alive fuel tanks. Returns explosion event.
  explodeFuelTank(tankModule) {
    tankModule.health = 0;
    tankModule.damaged = true;

    const { gridX, gridY } = tankModule;
    const offsets = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    const seen = new Set();

    for (const [dc, dr] of offsets) {
      const neighbor = this.getModuleAt(gridX + dc, gridY + dr);
      if (!neighbor || neighbor === tankModule || seen.has(neighbor)) continue;
      seen.add(neighbor);

      if (neighbor.type === 'fuel_tank' && neighbor.isAlive()) {
        this.explodeFuelTank(neighbor);
      } else {
        neighbor.takeDamage(50);
      }
    }

    return { type: 'explosion', gridX, gridY };
  }

  // Returns true if any alive, firing engine's exhaust covers this cell.
  isExhaustZone(gridX, gridY) {
    const engines = this.getAllModules().filter(m => m.isAlive() && m.def.hasExhaust && m.firing);
    for (const engine of engines) {
      if (this.getExhaustZone(engine).some(c => c.gridX === gridX && c.gridY === gridY)) return true;
    }
    return false;
  }
}
