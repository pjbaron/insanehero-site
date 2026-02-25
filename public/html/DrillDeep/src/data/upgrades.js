// upgrades.js - Upgrade definitions

export const Upgrades = {
  power: {
    name: 'Drill Power',
    description: 'Dig through harder materials',
    icon: 'ui_power',
    maxLevel: 20,
    baseValue: 5,
    perLevel: 3,
    baseCost: 100,
    costMultiplier: 1.5,
    getValue(level) {
      return this.baseValue + this.perLevel * level;
    },
    getCost(level) {
      return Math.floor(this.baseCost * Math.pow(this.costMultiplier, level));
    }
  },

  fuel: {
    name: 'Fuel Tank',
    description: 'Dig deeper before running empty',
    icon: 'ui_fuel',
    maxLevel: 20,
    baseValue: 30,
    perLevel: 10,
    baseCost: 80,
    costMultiplier: 1.4,
    getValue(level) {
      return this.baseValue + this.perLevel * level;
    },
    getCost(level) {
      return Math.floor(this.baseCost * Math.pow(this.costMultiplier, level));
    }
  },

  armor: {
    name: 'Armor Plating',
    description: 'Survive hazards',
    icon: 'ui_armor',
    maxLevel: 15,
    baseValue: 10,
    perLevel: 8,
    baseCost: 150,
    costMultiplier: 1.6,
    getValue(level) {
      return this.baseValue + this.perLevel * level;
    },
    getCost(level) {
      return Math.floor(this.baseCost * Math.pow(this.costMultiplier, level));
    }
  },

  cargo: {
    name: 'Cargo Hold',
    description: 'Carry more valuables per run',
    icon: 'ui_cargo',
    maxLevel: 10,
    baseValue: 5,
    perLevel: 2,
    baseCost: 200,
    costMultiplier: 1.8,
    getValue(level) {
      return this.baseValue + this.perLevel * level;
    },
    getCost(level) {
      return Math.floor(this.baseCost * Math.pow(this.costMultiplier, level));
    }
  },

  scanner: {
    name: 'Scanner',
    description: 'See valuables in adjacent columns',
    icon: 'ui_scanner',
    maxLevel: 5,
    baseValue: 0,
    perLevel: 1, // columns visible each side
    baseCost: 500,
    costMultiplier: 2.0,
    getValue(level) {
      return this.baseValue + this.perLevel * level;
    },
    getCost(level) {
      return Math.floor(this.baseCost * Math.pow(this.costMultiplier, level));
    }
  }
};

export function calculateMaxDepth(fuelLevel) {
  const fuel = Upgrades.fuel.getValue(fuelLevel);
  // Rough estimate: fuel units / average hardness
  return Math.floor(fuel * 3.5);
}
