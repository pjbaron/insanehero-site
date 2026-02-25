// UI.js - HUD and Shop interface

import { Upgrades } from '../data/upgrades.js';
import { MachineState } from '../entities/Machine.js';

export class UI {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    // Shop state
    this.selectedUpgrade = 0;
    this.upgradeKeys = Object.keys(Upgrades);
  }

  drawHUD(machine, economy, showRecordFlash = false) {
    const ctx = this.ctx;

    // Money display
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`$${economy.money}`, this.width - 10, 25);

    // Fuel bar
    const fuelWidth = 100;
    const fuelHeight = 12;
    const fuelX = 10;
    const fuelY = 10;

    ctx.fillStyle = '#333';
    ctx.fillRect(fuelX, fuelY, fuelWidth, fuelHeight);

    const fuelPercent = machine.fuel / machine.maxFuel;
    ctx.fillStyle = fuelPercent > 0.3 ? '#4CAF50' : '#FF5722';
    ctx.fillRect(fuelX + 1, fuelY + 1, (fuelWidth - 2) * fuelPercent, fuelHeight - 2);

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', fuelX, fuelY + fuelHeight + 12);

    // Armor bar
    const armorY = fuelY + 30;
    ctx.fillStyle = '#333';
    ctx.fillRect(fuelX, armorY, fuelWidth, fuelHeight);

    const armorPercent = machine.armor / machine.maxArmor;
    ctx.fillStyle = armorPercent > 0.3 ? '#2196F3' : '#FF5722';
    ctx.fillRect(fuelX + 1, armorY + 1, (fuelWidth - 2) * armorPercent, fuelHeight - 2);

    ctx.fillText('ARMOR', fuelX, armorY + fuelHeight + 12);

    // Depth display
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Depth: ${machine.depth}m`, 10, this.height - 40);

    // New record flash
    if (showRecordFlash) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('NEW RECORD!', 10, this.height - 55);
    }

    // Cargo display
    ctx.fillText(`Cargo: ${machine.cargo.length}/${machine.cargoCapacity}`, 10, this.height - 20);

    // State-specific messages
    ctx.textAlign = 'center';
    if (machine.state === MachineState.READY) {
      ctx.fillText('← → Move   SPACE Drop', this.width / 2, this.height - 10);
    } else if (machine.state === MachineState.DIGGING) {
      const cargoValue = machine.getCargoValue();
      if (cargoValue > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Cargo Value: $${cargoValue}`, this.width / 2, 70);
      }
    }
  }

  drawShop(economy, input) {
    const ctx = this.ctx;
    const centerX = this.width / 2;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(40, 80, this.width - 80, this.height - 160);

    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 80, this.width - 80, this.height - 160);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHOP', centerX, 115);

    // Money
    ctx.font = '16px monospace';
    ctx.fillText(`$ ${economy.money}`, centerX, 145);

    // Upgrade list
    const startY = 180;
    const lineHeight = 50;

    ctx.font = '14px monospace';
    this.upgradeKeys.forEach((key, index) => {
      const upgrade = Upgrades[key];
      const level = economy.getUpgradeLevel(key);
      const cost = economy.getUpgradeCost(key);
      const value = economy.getUpgradeValue(key);
      const y = startY + index * lineHeight;

      const isSelected = index === this.selectedUpgrade;
      const canAfford = economy.canUpgrade(key);
      const isMaxed = level >= upgrade.maxLevel;

      // Selection highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.fillRect(50, y - 15, this.width - 100, lineHeight - 5);
      }

      // Name and level
      ctx.fillStyle = isSelected ? '#FFD700' : '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(`${upgrade.name}`, 60, y);
      ctx.fillText(`Lv.${level}`, 60, y + 18);

      // Value
      ctx.fillStyle = '#888';
      ctx.fillText(`(${value})`, 120, y + 18);

      // Cost or MAX
      ctx.textAlign = 'right';
      if (isMaxed) {
        ctx.fillStyle = '#888';
        ctx.fillText('MAX', this.width - 60, y + 8);
      } else {
        ctx.fillStyle = canAfford ? '#4CAF50' : '#FF5722';
        ctx.fillText(`$${cost}`, this.width - 60, y + 8);
      }
    });

    // Stats summary
    const stats = economy.getMachineStats();
    const statsY = this.height - 120;
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Power: ${stats.power} | Fuel: ${stats.fuel} | Armor: ${stats.armor}`, centerX, statsY);
    ctx.fillText(`Est. Max Depth: ~${economy.getEstimatedMaxDepth()}m`, centerX, statsY + 18);

    // Instructions
    ctx.fillStyle = '#fff';
    ctx.fillText('↑↓ Select   SPACE Buy   ENTER Dig', centerX, this.height - 60);
  }

  drawRunSummary(machine, economy, isNewRecord) {
    const ctx = this.ctx;
    const centerX = this.width / 2;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RUN COMPLETE', centerX, 120);

    // Stop reason
    const reasonText = {
      'no_fuel': 'Out of Fuel',
      'too_hard': 'Terrain Too Hard',
      'destroyed': 'Machine Destroyed!',
      'bottom': 'Reached the Bottom!',
      'no_tile': 'Lost in the Void'
    }[machine.stopReason] || 'Run Ended';

    ctx.font = '16px monospace';
    ctx.fillStyle = machine.stopReason === 'destroyed' ? '#FF4444' : '#888';
    ctx.fillText(reasonText, centerX, 160);

    // Depth
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText(`Depth: ${machine.maxDepthReached}m`, centerX, 220);

    // New record indicator
    if (isNewRecord) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('NEW RECORD!', centerX, 250);
    }

    // Cargo value
    const value = machine.getCargoValue();
    ctx.fillStyle = value > 0 ? '#4CAF50' : '#888';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(value > 0 ? `+$${value}` : '$0', centerX, 320);

    // Cargo breakdown
    if (machine.cargo.length > 0) {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#aaa';

      const itemCounts = {};
      machine.cargo.forEach(item => {
        itemCounts[item] = (itemCounts[item] || 0) + 1;
      });

      let y = 360;
      for (const [item, count] of Object.entries(itemCounts)) {
        ctx.fillText(`${count}x ${item}`, centerX, y);
        y += 18;
      }
    } else {
      ctx.font = '14px monospace';
      ctx.fillStyle = '#666';
      ctx.fillText('No valuables collected', centerX, 360);
    }

    // Stats bar
    ctx.fillStyle = '#444';
    ctx.fillRect(60, 440, this.width - 120, 1);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(`Total Earned: $${economy.totalEarned}  |  Best Depth: ${economy.maxDepthEver}m`, centerX, 470);

    // Continue prompt
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('Press SPACE to continue', centerX, 540);
  }

  handleShopInput(input, economy) {
    // Navigate upgrades
    if (input.isKeyJustPressed('arrowup') || input.isKeyJustPressed('w')) {
      this.selectedUpgrade = Math.max(0, this.selectedUpgrade - 1);
    }
    if (input.isKeyJustPressed('arrowdown') || input.isKeyJustPressed('s')) {
      this.selectedUpgrade = Math.min(this.upgradeKeys.length - 1, this.selectedUpgrade + 1);
    }

    // Purchase
    if (input.isKeyJustPressed(' ')) {
      const key = this.upgradeKeys[this.selectedUpgrade];
      economy.purchaseUpgrade(key);
    }

    // Exit shop
    if (input.isKeyJustPressed('enter')) {
      return true; // Signal to exit shop
    }

    return false;
  }
}
