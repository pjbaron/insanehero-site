import { MODULE_DEFS } from './modules.js';
import { economy } from './economy.js';
import { entities } from './entity.js';
import { LooseModule } from './loose_module.js';
import EffectManager from './effects.js';

const REPAIR_ITEM = '__repair__';
const REPAIR_COST = 50;

const CRUSHER_MODULE_TYPES = [
  REPAIR_ITEM,
  'small_engine', 'medium_engine', 'retro_brake',
  'small_gun', 'medium_gun',
  'small_net', 'large_net',
  'micro_reactor', 'power_reactor',
  'fuel_tank', 'hull_plate', 'armor_plate',
  'tether_reinforcer', 'ping_array',
  'hull_frame',
];

const DIR_NAMES = ['top', 'bottom', 'left', 'right'];

const PANEL_W = 600;
const PANEL_H = 560;
const PANEL_PAD = 24;
const ROW_H = 32;
const LIST_TOP_OFFSET = 55;
const FLASH_DURATION = 0.3;
const FEEDBACK_DT = 1 / 60;

function keyStats(def) {
  if (def.expandsGrid) return 'expands grid';
  if (def.thrust) return `thr:${def.thrust}`;
  if (def.brakeForce) return `brk:${def.brakeForce}`;
  if (def.damage) return `dmg:${def.damage} rt:${def.fireRate}`;
  if (def.capacity) return `cap:${def.capacity} r:${def.captureRadius}`;
  if (def.explosive) return 'EXPLOSIVE';
  if (def.hitsAbsorbed) return `abs:${def.hitsAbsorbed}${def.damageReduction ? ` red:${(def.damageReduction * 100).toFixed(0)}%` : ''}`;
  if (def.springBonus) return `spr:+${(def.springBonus * 100).toFixed(0)}%`;
  if (def.powerGen) return `gen:+${def.powerGen}PW`;
  return '';
}

function massPower(def) {
  const parts = [`${def.mass}kg`];
  if (def.powerGen > 0) parts.push(`+${def.powerGen}W`);
  if (def.powerDraw > 0) parts.push(`-${def.powerDraw}W`);
  return parts.join(' ');
}

function gridSizeStr(def) {
  if (def.expandsGrid) return '+row/col';
  return `${def.gridW}x${def.gridH}`;
}

export class ShopUI {
  constructor() {
    this.visible = false;
    this.currentCrusher = null;
    this.items = [...CRUSHER_MODULE_TYPES];
    this._selectedIndex = 0;
    this._feedbackTimer = 0;
    this._feedbackSuccess = false;
    this._flashRowIndex = -1;
    this._goldShakeTimer = 0;
    this._dirPickMode = false;
    this._selectedDir = 0;
    // Set externally from main.js: shopUI._gameState = gameState
    this._gameState = null;
  }

  open(crusher) {
    this.visible = true;
    this.currentCrusher = crusher;
    this._selectedIndex = 0;
    this._feedbackTimer = 0;
    this._flashRowIndex = -1;
    this._goldShakeTimer = 0;
    this._dirPickMode = false;
    this._selectedDir = 0;
    if (this._gameState) this._gameState.paused = true;
  }

  close() {
    this.visible = false;
    this.currentCrusher = null;
    this._dirPickMode = false;
    if (this._gameState) this._gameState.paused = false;
  }

  handleInput(input) {
    if (!this.visible) return;

    if (this._dirPickMode) {
      if (input.consumePress('ArrowLeft') || input.consumePress('ArrowUp')) {
        this._selectedDir = (this._selectedDir - 1 + DIR_NAMES.length) % DIR_NAMES.length;
      }
      if (input.consumePress('ArrowRight') || input.consumePress('ArrowDown')) {
        this._selectedDir = (this._selectedDir + 1) % DIR_NAMES.length;
      }
      if (input.consumePress('Escape')) {
        this._dirPickMode = false;
      }
      if (input.consumePress('Enter')) {
        this._confirmHullFrame();
      }
      return;
    }

    if (input.consumePress('ArrowUp')) {
      this._selectedIndex = (this._selectedIndex - 1 + this.items.length) % this.items.length;
    }
    if (input.consumePress('ArrowDown')) {
      this._selectedIndex = (this._selectedIndex + 1) % this.items.length;
    }
    if (input.consumePress('Escape')) {
      this.close();
      return;
    }
    if (input.consumePress('Enter')) {
      this._tryPurchase();
    }
  }

  _countOwned(type) {
    const ship = this._gameState?.ship;
    if (!ship) return 0;
    return ship.grid.getAllModules().filter(m => m.type === type).length;
  }

  _tryPurchase() {
    const type = this.items[this._selectedIndex];

    if (type === REPAIR_ITEM) {
      this._tryRepair();
      return;
    }

    const def = MODULE_DEFS[type];

    if (type === 'hull_frame') {
      this._dirPickMode = true;
      this._selectedDir = 0;
      return;
    }

    if (!economy.spendGold(def.cost)) {
      this._feedbackTimer = FLASH_DURATION;
      this._feedbackSuccess = false;
      this._flashRowIndex = this._selectedIndex;
      this._goldShakeTimer = FLASH_DURATION;
      return;
    }

    // Spawn loose module drifting outward from crusher
    const crusher = this.currentCrusher;
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = crusher.radius + 20;
    const lm = new LooseModule(
      crusher.x + Math.cos(angle) * spawnDist,
      crusher.y + Math.sin(angle) * spawnDist,
      type,
    );
    lm.vx = Math.cos(angle) * 20;
    lm.vy = Math.sin(angle) * 20;
    entities.add(lm);

    this._feedbackTimer = FLASH_DURATION;
    this._feedbackSuccess = true;
    this._flashRowIndex = this._selectedIndex;
    EffectManager.spawnUpgradeEffect(crusher.x, crusher.y, `+${def.name}`);
  }

  _tryRepair() {
    const ship = this._gameState?.ship;
    if (!ship) return;
    const damaged = ship.grid.getAllModules().filter(m => m.damaged || m.health < m.def.health);
    if (damaged.length === 0) {
      this._feedbackTimer = FLASH_DURATION;
      this._feedbackSuccess = false;
      this._flashRowIndex = this._selectedIndex;
      return;
    }
    if (!economy.spendGold(REPAIR_COST)) {
      this._feedbackTimer = FLASH_DURATION;
      this._feedbackSuccess = false;
      this._flashRowIndex = this._selectedIndex;
      this._goldShakeTimer = FLASH_DURATION;
      return;
    }
    for (const mod of damaged) {
      mod.health = mod.def.health;
      mod.damaged = false;
    }
    ship.recalcStats();
    this._feedbackTimer = FLASH_DURATION;
    this._feedbackSuccess = true;
    this._flashRowIndex = this._selectedIndex;
    if (this.currentCrusher) {
      EffectManager.spawnUpgradeEffect(this.currentCrusher.x, this.currentCrusher.y, 'Repaired!');
    }
  }

  _confirmHullFrame() {
    const def = MODULE_DEFS.hull_frame;
    const ship = this._gameState?.ship;
    if (!ship) return;

    if (!economy.spendGold(def.cost)) {
      this._feedbackTimer = FLASH_DURATION;
      this._feedbackSuccess = false;
      this._goldShakeTimer = FLASH_DURATION;
      this._dirPickMode = false;
      return;
    }

    ship.grid.expand(DIR_NAMES[this._selectedDir]);
    ship.recalcStats();
    this._dirPickMode = false;
    this._feedbackTimer = FLASH_DURATION;
    this._feedbackSuccess = true;
    this._flashRowIndex = this.items.indexOf('hull_frame');
    if (this.currentCrusher) {
      EffectManager.spawnUpgradeEffect(
        this.currentCrusher.x, this.currentCrusher.y,
        `Grid +1 (${DIR_NAMES[this._selectedDir]})`,
      );
    }
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible) return;

    this._feedbackTimer = Math.max(0, this._feedbackTimer - FEEDBACK_DT);
    this._goldShakeTimer = Math.max(0, this._goldShakeTimer - FEEDBACK_DT);

    const px = (canvasWidth - PANEL_W) / 2;
    const py = (canvasHeight - PANEL_H) / 2;

    ctx.save();

    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Panel background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(px, py, PANEL_W, PANEL_H);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, PANEL_W, PANEL_H);

    // Title
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.fillText('CRUSHER SHOP - MODULE CATALOG', px + PANEL_W / 2, py + 30);

    // Gold
    const goldShake = this._goldShakeTimer > 0 ? (Math.random() < 0.5 ? 3 : -3) : 0;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'right';
    ctx.fillText(`Gold: ${economy.getGold()}`, px + PANEL_W - PANEL_PAD + goldShake, py + 30);

    // Column headers
    ctx.font = '10px monospace';
    ctx.fillStyle = '#556677';
    ctx.textAlign = 'left';
    ctx.fillText('MODULE', px + PANEL_PAD + 6, py + 47);
    ctx.textAlign = 'center';
    ctx.fillText('MASS/PW', px + 310, py + 47);
    ctx.textAlign = 'right';
    ctx.fillText('STAT               COST', px + PANEL_W - PANEL_PAD - 6, py + 47);

    // Divider
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + PANEL_PAD, py + LIST_TOP_OFFSET - 4);
    ctx.lineTo(px + PANEL_W - PANEL_PAD, py + LIST_TOP_OFFSET - 4);
    ctx.stroke();

    // Module rows
    const listTop = py + LIST_TOP_OFFSET;
    for (let i = 0; i < this.items.length; i++) {
      this._renderRow(ctx, i, px, listTop + i * ROW_H);
    }

    // Footer
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('UP/DOWN select   ENTER buy   ESC close', px + PANEL_W / 2, py + PANEL_H - 10);

    // Hull frame direction picker overlay
    if (this._dirPickMode) {
      this._renderDirPicker(ctx, px, py);
    }

    ctx.restore();
  }

  _renderRow(ctx, index, panelX, rowY) {
    const type = this.items[index];
    const isRepair = type === REPAIR_ITEM;
    const def = isRepair ? null : MODULE_DEFS[type];
    const cost = isRepair ? REPAIR_COST : def.cost;
    const canAfford = economy.getGold() >= cost;
    const isSelected = index === this._selectedIndex;
    const count = isRepair ? 0 : this._countOwned(type);

    if (isRepair) {
      const ship = this._gameState?.ship;
      const damagedCount = ship ? ship.grid.getAllModules().filter(m => m.damaged || m.health < m.def.health).length : 0;
      const isFlashing = this._feedbackTimer > 0 && index === this._flashRowIndex;
      if (isSelected || isFlashing) {
        let bgColor;
        if (isFlashing) {
          const alpha = 0.4 * (this._feedbackTimer / FLASH_DURATION);
          bgColor = this._feedbackSuccess
            ? `rgba(0,200,80,${alpha.toFixed(2)})`
            : `rgba(220,40,40,${alpha.toFixed(2)})`;
        } else {
          bgColor = canAfford ? 'rgba(80,180,120,0.35)' : 'rgba(80,80,100,0.25)';
        }
        ctx.fillStyle = bgColor;
        ctx.fillRect(panelX + PANEL_PAD, rowY, PANEL_W - PANEL_PAD * 2, ROW_H - 1);
      }
      ctx.font = isSelected ? 'bold 13px monospace' : '13px monospace';
      ctx.fillStyle = canAfford ? '#80ffb0' : '#447755';
      ctx.textAlign = 'left';
      ctx.fillText('Repair All Modules', panelX + PANEL_PAD + 6, rowY + 14);
      ctx.textAlign = 'right';
      ctx.fillStyle = canAfford ? '#ffd700' : '#886644';
      ctx.fillText(`${cost}g`, panelX + PANEL_W - PANEL_PAD - 6, rowY + 14);
      ctx.font = '10px monospace';
      ctx.fillStyle = damagedCount > 0 ? '#ff8888' : '#446655';
      ctx.textAlign = 'left';
      ctx.fillText(damagedCount > 0 ? `${damagedCount} module${damagedCount > 1 ? 's' : ''} damaged` : 'All OK', panelX + PANEL_PAD + 6, rowY + 26);
      return;
    }

    // Row highlight
    const isFlashing = this._feedbackTimer > 0 && index === this._flashRowIndex;
    if (isSelected || isFlashing) {
      let bgColor;
      if (isFlashing) {
        const alpha = 0.4 * (this._feedbackTimer / FLASH_DURATION);
        bgColor = this._feedbackSuccess
          ? `rgba(0,200,80,${alpha.toFixed(2)})`
          : `rgba(220,40,40,${alpha.toFixed(2)})`;
      } else {
        bgColor = canAfford ? 'rgba(80,120,200,0.35)' : 'rgba(80,80,100,0.25)';
      }
      ctx.fillStyle = bgColor;
      ctx.fillRect(panelX + PANEL_PAD, rowY, PANEL_W - PANEL_PAD * 2, ROW_H - 1);
    }

    const nameColor = canAfford ? '#e0e0e0' : '#777';
    const detailColor = canAfford ? '#7799aa' : '#445566';

    // Line 1: name (+ count) left, cost right
    ctx.font = isSelected ? 'bold 13px monospace' : '13px monospace';
    ctx.fillStyle = nameColor;
    ctx.textAlign = 'left';
    const nameStr = count > 0 ? `${def.name} x${count}` : def.name;
    ctx.fillText(nameStr, panelX + PANEL_PAD + 6, rowY + 14);

    ctx.textAlign = 'right';
    ctx.fillStyle = canAfford ? '#ffd700' : '#886644';
    ctx.fillText(`${cost}g`, panelX + PANEL_W - PANEL_PAD - 6, rowY + 14);

    // Line 2: grid size, mass/power, key stat
    ctx.font = '10px monospace';
    ctx.fillStyle = detailColor;
    ctx.textAlign = 'left';
    ctx.fillText(gridSizeStr(def), panelX + PANEL_PAD + 6, rowY + 26);
    ctx.textAlign = 'center';
    ctx.fillText(massPower(def), panelX + 310, rowY + 26);
    ctx.textAlign = 'right';
    ctx.fillText(keyStats(def), panelX + PANEL_W - PANEL_PAD - 6, rowY + 26);
  }

  _renderDirPicker(ctx, panelX, panelY) {
    const pw = 280;
    const ph = 160;
    const ox = panelX + (PANEL_W - pw) / 2;
    const oy = panelY + (PANEL_H - ph) / 2;

    ctx.fillStyle = 'rgba(10,10,30,0.96)';
    ctx.fillRect(ox, oy, pw, ph);
    ctx.strokeStyle = '#88aaff';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, pw, ph);

    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'center';
    ctx.fillText('Expand grid - choose direction:', ox + pw / 2, oy + 22);

    for (let i = 0; i < DIR_NAMES.length; i++) {
      const bw = pw / 2 - 30;
      const bh = 34;
      const bx = ox + 20 + (i % 2) * (pw / 2 - 10);
      const by = oy + 34 + Math.floor(i / 2) * 44;
      const selected = i === this._selectedDir;
      ctx.fillStyle = selected ? 'rgba(80,120,255,0.6)' : 'rgba(40,40,80,0.6)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = selected ? '#88aaff' : '#445566';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.font = selected ? 'bold 12px monospace' : '12px monospace';
      ctx.fillStyle = selected ? '#ffffff' : '#aaaaaa';
      ctx.textAlign = 'center';
      ctx.fillText(DIR_NAMES[i].toUpperCase(), bx + bw / 2, by + 22);
    }

    ctx.font = '10px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText(`Cost: ${MODULE_DEFS.hull_frame.cost}g   ENTER confirm   ESC cancel`, ox + pw / 2, oy + ph - 10);
  }
}
