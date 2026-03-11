// DEPRECATED: This file is no longer used by active gameplay.
// Ship capabilities now come entirely from installed modules on ship.grid.
// See modules.js (MODULE_DEFS) for the live module definitions.
// Do NOT delete yet - verify all call sites are gone before removing.

export const UPGRADES = {
  // Crusher shop upgrades
  net_capacity: {
    id: 'net_capacity',
    name: 'Net Capacity',
    description: 'Maximum number of debris items the tether net can hold',
    maxTier: 4,
    category: 'crusher',
    tiers: [
      { tier: 1, cost: 0,    effects: { value: 5  } },
      { tier: 2, cost: 75,   effects: { value: 7  } },
      { tier: 3, cost: 250,  effects: { value: 10 } },
      { tier: 4, cost: 1000, effects: { value: 14 } },
    ],
  },
  net_size: {
    id: 'net_size',
    name: 'Net Size',
    description: 'Minimum debris radius the net can capture',
    maxTier: 4,
    category: 'crusher',
    tiers: [
      { tier: 1, cost: 0,   effects: { value: 12 } },
      { tier: 2, cost: 60,  effects: { value: 16 } },
      { tier: 3, cost: 200, effects: { value: 20 } },
      { tier: 4, cost: 800, effects: { value: 25 } },
    ],
  },
  thrust_power: {
    id: 'thrust_power',
    name: 'Thrust Power',
    description: 'Ship engine thrust output',
    maxTier: 4,
    category: 'crusher',
    tiers: [
      { tier: 1, cost: 0,    effects: { value: 120 } },
      { tier: 2, cost: 80,   effects: { value: 160 } },
      { tier: 3, cost: 300,  effects: { value: 210 } },
      { tier: 4, cost: 1200, effects: { value: 270 } },
    ],
  },
  gun_power: {
    id: 'gun_power',
    name: 'Gun Power',
    description: 'Number of shots fired per burst',
    maxTier: 4,
    category: 'crusher',
    tiers: [
      { tier: 1, cost: 0,    effects: { value: 1 } },
      { tier: 2, cost: 100,  effects: { value: 2 } },
      { tier: 3, cost: 350,  effects: { value: 3 } },
      { tier: 4, cost: 1500, effects: { value: 5 } },
    ],
  },
  retro_brake: {
    id: 'retro_brake',
    name: 'Retro Brake',
    description: 'Brake deceleration multiplier',
    maxTier: 4,
    category: 'crusher',
    tiers: [
      { tier: 1, cost: 0,   effects: { value: 0   } },
      { tier: 2, cost: 50,  effects: { value: 0.3 } },
      { tier: 3, cost: 150, effects: { value: 0.6 } },
      { tier: 4, cost: 600, effects: { value: 1.0 } },
    ],
  },
  prospector_ping: {
    id: 'prospector_ping',
    name: 'Prospector Ping',
    description: 'Asteroid scan depth level',
    maxTier: 4,
    category: 'crusher',
    tiers: [
      { tier: 1, cost: 0,   effects: { value: 1 } },
      { tier: 2, cost: 40,  effects: { value: 2 } },
      { tier: 3, cost: 120, effects: { value: 3 } },
      { tier: 4, cost: 500, effects: { value: 4 } },
    ],
  },
  hull_armor: {
    id: 'hull_armor',
    name: 'Hull Armor',
    description: 'Damage reduction fraction',
    maxTier: 4,
    category: 'crusher',
    tiers: [
      { tier: 1, cost: 0,   effects: { value: 0    } },
      { tier: 2, cost: 60,  effects: { value: 0.25 } },
      { tier: 3, cost: 200, effects: { value: 0.5  } },
      { tier: 4, cost: 800, effects: { value: 0.75 } },
    ],
  },
  tether_strength: {
    id: 'tether_strength',
    name: 'Tether Strength',
    description: 'Spring constant for debris tethers',
    maxTier: 4,
    category: 'crusher',
    tiers: [
      { tier: 1, cost: 0,   effects: { value: 0.5 } },
      { tier: 2, cost: 70,  effects: { value: 0.8 } },
      { tier: 3, cost: 250, effects: { value: 1.2 } },
      { tier: 4, cost: 900, effects: { value: 1.8 } },
    ],
  },

  // Trader upgrades (single purchase)
  asteroid_glue: {
    id: 'asteroid_glue',
    name: 'Asteroid Glue',
    description: 'Binds asteroid fragments together on impact',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 3000, effects: {} },
    ],
  },
  micro_black_hole: {
    id: 'micro_black_hole',
    name: 'Micro Black Hole',
    description: 'Pulls nearby debris toward the ship',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 3500, effects: {} },
    ],
  },
  finer_mesh: {
    id: 'finer_mesh',
    name: 'Finer Mesh',
    description: 'Captures smaller debris fragments',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 2500, effects: {} },
    ],
  },
  drones: {
    id: 'drones',
    name: 'Drones',
    description: 'Autonomous collection drones',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 2000, effects: {} },
    ],
  },
  ramming_pads: {
    id: 'ramming_pads',
    name: 'Ramming Pads',
    description: 'Reinforced hull for asteroid ramming',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 4000, effects: {} },
    ],
  },
  momentum_multiplier: {
    id: 'momentum_multiplier',
    name: 'Momentum Multiplier',
    description: 'Amplifies collision momentum transfer',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 2500, effects: {} },
    ],
  },
  magnetic_bore: {
    id: 'magnetic_bore',
    name: 'Magnetic Bore',
    description: 'Magnetically guided drill shots',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 3000, effects: {} },
    ],
  },
  tether_reel: {
    id: 'tether_reel',
    name: 'Tether Reel',
    description: 'Motorized tether retraction',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 3500, effects: {} },
    ],
  },
  ricochet_shots: {
    id: 'ricochet_shots',
    name: 'Ricochet Shots',
    description: 'Shots bounce off asteroids',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 3000, effects: {} },
    ],
  },
  split_shots: {
    id: 'split_shots',
    name: 'Split Shots',
    description: 'Shots split on impact',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 2500, effects: {} },
    ],
  },
  damper_field: {
    id: 'damper_field',
    name: 'Damper Field',
    description: 'Energy field that slows nearby debris',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 2000, effects: {} },
    ],
  },
  field_effect_range: {
    id: 'field_effect_range',
    name: 'Field Effect Range',
    description: 'Increases field effect radius',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 4000, effects: {} },
    ],
  },
  field_effect_strength: {
    id: 'field_effect_strength',
    name: 'Field Effect Strength',
    description: 'Increases field effect intensity',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 4000, effects: {} },
    ],
  },
  slag_dump: {
    id: 'slag_dump',
    name: 'Slag Dump',
    description: 'Eject worthless debris for thrust',
    maxTier: 1,
    category: 'trader',
    tiers: [
      { tier: 1, cost: 3500, effects: {} },
    ],
  },
};

export class PlayerUpgrades {
  constructor() {
    this._tiers = {};
    for (const [id, def] of Object.entries(UPGRADES)) {
      this._tiers[id] = def.category === 'crusher' ? 1 : 0;
    }
  }

  getTier(id) {
    return this._tiers[id] ?? 0;
  }

  getEffect(id) {
    const def = UPGRADES[id];
    if (!def) throw new Error(`Unknown upgrade: ${id}`);
    const tier = this._tiers[id];
    if (tier === 0) return null;
    const tierDef = def.tiers.find(t => t.tier === tier);
    if (!tierDef) throw new Error(`No tier ${tier} for upgrade ${id}`);
    return tierDef.effects.value !== undefined ? tierDef.effects.value : true;
  }

  canUpgrade(id) {
    const def = UPGRADES[id];
    if (!def) throw new Error(`Unknown upgrade: ${id}`);
    return this._tiers[id] < def.maxTier;
  }

  getUpgradeCost(id) {
    const def = UPGRADES[id];
    if (!def) throw new Error(`Unknown upgrade: ${id}`);
    const currentTier = this._tiers[id];
    if (currentTier >= def.maxTier) return null;
    const nextTierDef = def.tiers.find(t => t.tier === currentTier + 1);
    return nextTierDef ? nextTierDef.cost : null;
  }

  upgrade(id) {
    if (!this.canUpgrade(id)) return false;
    this._tiers[id]++;
    return true;
  }

  has(id) {
    return this._tiers[id] >= 1;
  }
}

export const playerUpgrades = new PlayerUpgrades();
