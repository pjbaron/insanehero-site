import { traderStock } from './trader_stock.js';
import { MODULE_DEFS } from './modules.js';
import { economy } from './economy.js';
import { entities } from './entity.js';
import { LooseModule } from './loose_module.js';
import EffectManager from './effects.js';

const FLASH_DURATION = 0.3;
const FEEDBACK_DT = 1 / 60;

const PANEL_W = 650;
const PANEL_H = 520;
const PANEL_PAD = 24;
const ROW_H = 52;
const LIST_TOP_OFFSET = 80;

// For global modules, note which system they affect
const GLOBAL_SCOPE = {
  finer_mesh: 'nets',
  magnetic_bore: 'guns',
  tether_reel: 'tethers',
  ricochet_emitter: 'guns',
  split_shot_emitter: 'guns',
  field_amp_range: 'fields',
  field_amp_strength: 'fields',
};

function massPower(item) {
  const parts = [`${item.mass}kg`];
  if (item.powerDraw > 0) parts.push(`-${item.powerDraw}W`);
  return parts.join(' ');
}

export class TraderShopUI {
  constructor() {
    this.visible = false;
    this.currentTrader = null;
    this.selectedIndex = 0;
    this._stock = [];
    this._openRealTime = 0;
    this._remainingAtOpen = 0;
    this._flashRowIndex = -1;
    this._feedbackTimer = 0;
    this._feedbackSuccess = false;
    this._goldShakeTimer = 0;
    // Inject externally: traderShopUI._gameState = gameState
    this._gameState = null;
  }

  open(trader) {
    this.visible = true;
    this.currentTrader = trader;
    this.selectedIndex = 0;
    const shipGrid = this._gameState?.ship?.grid ?? null;
    traderStock.generateStock(shipGrid);
    this._stock = traderStock.getStockDetails();
    this._openRealTime = Date.now();
    this._remainingAtOpen = trader.patrolDuration - trader.patrolTimer;
    this._flashRowIndex = -1;
    this._feedbackTimer = 0;
    this._feedbackSuccess = false;
    this._goldShakeTimer = 0;
    if (this._gameState) this._gameState.paused = true;
  }

  close() {
    this.visible = false;
    this.currentTrader = null;
    if (this._gameState) this._gameState.paused = false;
  }

  // Non-stackable modules are "owned" if they exist on the ship grid.
  // Stackable modules are never treated as owned (can always buy more).
  _isOwned(id) {
    const def = MODULE_DEFS[id];
    if (!def || def.stackable) return false;
    const ship = this._gameState?.ship;
    if (!ship) return false;
    return ship.grid.getModulesByType(id).length > 0;
  }

  _ensureValidSelection() {
    const n = this._stock.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.selectedIndex + i) % n;
      if (!this._isOwned(this._stock[idx].id)) {
        this.selectedIndex = idx;
        return;
      }
    }
  }

  _moveSelection(dir) {
    const n = this._stock.length;
    if (n === 0) return;
    let idx = (this.selectedIndex + dir + n) % n;
    for (let i = 0; i < n; i++) {
      if (!this._isOwned(this._stock[idx].id)) {
        this.selectedIndex = idx;
        return;
      }
      idx = (idx + dir + n) % n;
    }
  }

  _tryPurchase() {
    if (this._stock.length === 0) return;
    const item = this._stock[this.selectedIndex];
    if (!item) return;
    const { id, cost, name } = item;
    if (this._isOwned(id)) return;
    if (!economy.spendGold(cost)) {
      this._feedbackTimer = FLASH_DURATION;
      this._feedbackSuccess = false;
      this._flashRowIndex = this.selectedIndex;
      this._goldShakeTimer = FLASH_DURATION;
      return;
    }

    // Spawn as LooseModule drifting outward from the trader
    const trader = this.currentTrader;
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = (trader.radius ?? 20) + 24;
    const lm = new LooseModule(
      trader.x + Math.cos(angle) * spawnDist,
      trader.y + Math.sin(angle) * spawnDist,
      id,
    );
    lm.vx = Math.cos(angle) * 30;
    lm.vy = Math.sin(angle) * 30;
    entities.add(lm);

    this._feedbackTimer = FLASH_DURATION;
    this._feedbackSuccess = true;
    this._flashRowIndex = this.selectedIndex;
    if (trader) {
      EffectManager.spawnTraderPurchaseEffect(trader.x, trader.y, name);
    }
    if (!item.stackable) {
      // Remove from stock so it can't be bought again this session
      this._stock.splice(this.selectedIndex, 1);
      if (this.selectedIndex >= this._stock.length) this.selectedIndex = Math.max(0, this._stock.length - 1);
    } else {
      this._moveSelection(1);
    }
  }

  handleInput(input) {
    if (!this.visible) return;

    if (input.consumePress('ArrowUp')) {
      this._moveSelection(-1);
    }
    if (input.consumePress('ArrowDown')) {
      this._moveSelection(1);
    }
    if (input.consumePress('Escape')) {
      this.close();
      return;
    }
    if (input.consumePress('Enter')) {
      this._tryPurchase();
    }
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible) return;

    this._feedbackTimer = Math.max(0, this._feedbackTimer - FEEDBACK_DT);
    this._goldShakeTimer = Math.max(0, this._goldShakeTimer - FEEDBACK_DT);

    const elapsed = (Date.now() - this._openRealTime) / 1000;
    const remaining = Math.max(0, this._remainingAtOpen - elapsed);

    const px = (canvasWidth - PANEL_W) / 2;
    const py = (canvasHeight - PANEL_H) / 2;

    ctx.save();

    // Overlay with magenta tint (distinct from crusher shop's neutral overlay)
    ctx.fillStyle = 'rgba(40,0,40,0.65)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Panel background with magenta border
    ctx.fillStyle = '#1a0a1e';
    ctx.fillRect(px, py, PANEL_W, PANEL_H);
    ctx.strokeStyle = '#cc44cc';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, PANEL_W, PANEL_H);

    // Title
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#cc44cc';
    ctx.textAlign = 'center';
    ctx.fillText('MOBILE TRADER', px + PANEL_W / 2, py + 36);

    // Subtitle
    ctx.font = '13px monospace';
    ctx.fillStyle = '#aa88aa';
    ctx.textAlign = 'center';
    ctx.fillText('Rare Equipment - modules spawn loose, must be docked', px + PANEL_W / 2, py + 56);

    // Gold (top-right of panel)
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'right';
    const goldShake = this._goldShakeTimer > 0 ? (Math.random() < 0.5 ? 3 : -3) : 0;
    ctx.fillText(`Gold: ${economy.getGold()}`, px + PANEL_W - PANEL_PAD + goldShake, py + 36);

    // Departure timer (below gold, red when urgent)
    ctx.font = '13px monospace';
    ctx.fillStyle = remaining < 10 ? '#ff4444' : '#ff88ff';
    ctx.textAlign = 'right';
    ctx.fillText(`Departs in: ${Math.ceil(remaining)}s`, px + PANEL_W - PANEL_PAD, py + 56);

    // Divider
    ctx.strokeStyle = '#552255';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + PANEL_PAD, py + 66);
    ctx.lineTo(px + PANEL_W - PANEL_PAD, py + 66);
    ctx.stroke();

    // Stock rows
    const listTop = py + LIST_TOP_OFFSET;
    for (let i = 0; i < this._stock.length; i++) {
      this._renderRow(ctx, i, px, listTop + i * ROW_H);
    }

    if (this._stock.length === 0) {
      ctx.font = '14px monospace';
      ctx.fillStyle = '#665566';
      ctx.textAlign = 'center';
      ctx.fillText('No modules available', px + PANEL_W / 2, listTop + 24);
    }

    // Footer hint
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('UP/DOWN select   ENTER buy   ESC close', px + PANEL_W / 2, py + PANEL_H - 14);

    ctx.restore();
  }

  _renderRow(ctx, index, panelX, rowY) {
    const item = this._stock[index];
    const { id, name, description, cost, gridW, gridH, mass, powerDraw, stackable, global: isGlobal } = item;
    const owned = this._isOwned(id);
    const canAfford = !owned && economy.getGold() >= cost;
    const isSelected = index === this.selectedIndex && !owned;

    // Row flash feedback
    const isFlashing = this._feedbackTimer > 0 && index === this._flashRowIndex;
    if (isFlashing) {
      const alpha = 0.5 * (this._feedbackTimer / FLASH_DURATION);
      ctx.fillStyle = this._feedbackSuccess
        ? `rgba(180,0,180,${alpha.toFixed(2)})`
        : `rgba(220,40,40,${alpha.toFixed(2)})`;
      ctx.fillRect(panelX + PANEL_PAD, rowY + 2, PANEL_W - PANEL_PAD * 2, ROW_H - 4);
    } else if (isSelected) {
      ctx.fillStyle = 'rgba(180,0,180,0.12)';
      ctx.fillRect(panelX + PANEL_PAD, rowY + 2, PANEL_W - PANEL_PAD * 2, ROW_H - 4);
      ctx.strokeStyle = '#cc44cc';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(panelX + PANEL_PAD, rowY + 2, PANEL_W - PANEL_PAD * 2, ROW_H - 4);
    }

    const nameX = panelX + PANEL_PAD + 8;
    const costX = panelX + PANEL_W - PANEL_PAD - 8;
    const nameColor = owned ? '#555' : canAfford ? '#e0e0e0' : '#888';

    // Line 1: name [+ Stackable tag], cost on right
    ctx.font = isSelected ? 'bold 14px monospace' : '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = nameColor;
    let displayName = name;
    if (stackable) displayName += ' [S]';
    ctx.fillText(displayName, nameX, rowY + 16);

    // Cost or OWNED badge (right side, line 1)
    ctx.textAlign = 'right';
    if (owned) {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#44cc44';
      ctx.fillText('OWNED', costX, rowY + 16);
    } else {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = canAfford ? '#ffd700' : '#cc4444';
      ctx.fillText(`${cost}g`, costX, rowY + 16);
    }

    // Line 2: grid size, mass/power
    ctx.font = '10px monospace';
    ctx.fillStyle = owned ? '#444' : '#7799aa';
    ctx.textAlign = 'left';
    ctx.fillText(`${gridW}x${gridH}  ${massPower(item)}`, nameX, rowY + 30);

    // Line 3: description (with global scope note prepended)
    let desc = isGlobal
      ? `Affects all ${GLOBAL_SCOPE[id] ?? 'modules'}. ${description}`
      : description;
    ctx.font = '10px monospace';
    ctx.fillStyle = owned ? '#444' : '#665577';
    ctx.textAlign = 'left';
    const maxDescWidth = PANEL_W - PANEL_PAD * 2 - 16;
    while (desc.length > 0 && ctx.measureText(desc + '...').width > maxDescWidth) {
      desc = desc.slice(0, -1);
    }
    if (desc.length < (isGlobal ? `Affects all ${GLOBAL_SCOPE[id] ?? 'modules'}. ${description}` : description).length) {
      desc += '...';
    }
    ctx.fillText(desc, nameX, rowY + 44);
  }
}
