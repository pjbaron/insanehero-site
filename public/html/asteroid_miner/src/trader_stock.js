import { MODULE_DEFS } from './modules.js';

// Build pool at module load time from all trader-category modules
export const TRADER_POOL = Object.keys(MODULE_DEFS).filter(id => MODULE_DEFS[id].category === 'trader');

export const TRADER_SHORT_LABELS = {
  tractor_beam: 'TRCTR',
  asteroid_glue: 'GLUE',
  black_hole_projector: 'BHOLE',
  finer_mesh: 'MESH',
  drone_bay: 'DRONES',
  ramming_pads: 'RAMS',
  momentum_multiplier: 'MMULT',
  magnetic_bore: 'MBORE',
  tether_reel: 'REEL',
  ricochet_emitter: 'RICO',
  split_shot_emitter: 'SPLIT',
  damper_field: 'DAMP',
  field_amp_range: 'F.RNG',
  field_amp_strength: 'F.STR',
  slag_harvester: 'SLAG',
};

class TraderStock {
  constructor() {
    this.fixedSlots = 2;
    this.rotatingSlots = 4;
    this.currentStock = [];
  }

  // shipGrid: ship.grid (ShipGrid instance). Non-stackable modules already
  // on the grid are excluded. Stackable modules always appear.
  generateStock(shipGrid) {
    const available = TRADER_POOL.filter(id => {
      const def = MODULE_DEFS[id];
      if (def.stackable) return true;
      if (!shipGrid) return true;
      return shipGrid.getModulesByType(id).length === 0;
    });

    if (available.length <= this.fixedSlots) {
      this.currentStock = [...available];
      return;
    }

    const sorted = [...available].sort();
    const fixed = sorted.slice(0, this.fixedSlots);
    const remainder = sorted.slice(this.fixedSlots);

    const rotating = [];
    const pool = [...remainder];
    const count = Math.min(this.rotatingSlots, pool.length);
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      rotating.push(pool.splice(idx, 1)[0]);
    }

    this.currentStock = [...fixed, ...rotating];
  }

  getCurrentStock() {
    return this.currentStock;
  }

  getStockDetails() {
    return this.currentStock.map(id => {
      const def = MODULE_DEFS[id];
      return {
        id,
        name: def.name,
        description: def.description,
        cost: def.cost,
        gridW: def.gridW,
        gridH: def.gridH,
        mass: def.mass,
        powerDraw: def.powerDraw,
        stackable: def.stackable,
        global: def.global,
      };
    });
  }
}

export const traderStock = new TraderStock();
