// Economy.js - Currency and upgrade management

import { Upgrades } from '../data/upgrades.js';

export class Economy {
  constructor() {
    this.money = 0;
    this.totalEarned = 0;
    this.maxDepthEver = 0;

    // Upgrade levels
    this.upgrades = {
      power: 0,
      fuel: 0,
      armor: 0,
      cargo: 0,
      scanner: 0
    };
  }

  addMoney(amount) {
    this.money += amount;
    this.totalEarned += amount;
  }

  spendMoney(amount) {
    if (this.money >= amount) {
      this.money -= amount;
      return true;
    }
    return false;
  }

  canAfford(amount) {
    return this.money >= amount;
  }

  getUpgradeLevel(upgradeKey) {
    return this.upgrades[upgradeKey] || 0;
  }

  getUpgradeValue(upgradeKey) {
    const upgrade = Upgrades[upgradeKey];
    if (!upgrade) return 0;
    return upgrade.getValue(this.upgrades[upgradeKey] || 0);
  }

  getUpgradeCost(upgradeKey) {
    const upgrade = Upgrades[upgradeKey];
    if (!upgrade) return Infinity;
    const level = this.upgrades[upgradeKey] || 0;
    if (level >= upgrade.maxLevel) return Infinity;
    return upgrade.getCost(level);
  }

  canUpgrade(upgradeKey) {
    const cost = this.getUpgradeCost(upgradeKey);
    return cost !== Infinity && this.canAfford(cost);
  }

  purchaseUpgrade(upgradeKey) {
    const upgrade = Upgrades[upgradeKey];
    if (!upgrade) return false;

    const level = this.upgrades[upgradeKey] || 0;
    if (level >= upgrade.maxLevel) return false;

    const cost = upgrade.getCost(level);
    if (this.spendMoney(cost)) {
      this.upgrades[upgradeKey] = level + 1;
      console.log(`Upgraded ${upgradeKey} to level ${level + 1}`);
      return true;
    }
    return false;
  }

  getMachineStats() {
    return {
      power: this.getUpgradeValue('power'),
      fuel: this.getUpgradeValue('fuel'),
      armor: this.getUpgradeValue('armor'),
      cargo: this.getUpgradeValue('cargo'),
      scanner: this.getUpgradeValue('scanner')
    };
  }

  updateMaxDepth(depth) {
    if (depth > this.maxDepthEver) {
      this.maxDepthEver = depth;
      return true; // New record
    }
    return false;
  }

  getEstimatedMaxDepth() {
    const fuel = this.getUpgradeValue('fuel');
    // Rough estimate based on fuel and average terrain
    return Math.floor(fuel * 3.5);
  }

  // Save/load for persistence
  toJSON() {
    return {
      money: this.money,
      totalEarned: this.totalEarned,
      maxDepthEver: this.maxDepthEver,
      upgrades: { ...this.upgrades }
    };
  }

  fromJSON(data) {
    this.money = data.money || 0;
    this.totalEarned = data.totalEarned || 0;
    this.maxDepthEver = data.maxDepthEver || 0;
    this.upgrades = { ...data.upgrades };
  }
}
