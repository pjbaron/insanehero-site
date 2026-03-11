import { Entity } from './entity.js';
import { MODULE_DEFS } from './modules.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';

const DRAG = 0.05;
const COLLECT_RANGE = 40;
const PULSE_SPEED = 3;

const MODULE_COLORS = {
  small_engine: '#ff8800', medium_engine: '#ff6600',
  retro_brake: '#ffaa00', small_gun: '#ff4444',
  medium_gun: '#ff2222', small_net: '#44ff88',
  large_net: '#22ee66', micro_reactor: '#44aaff',
  power_reactor: '#2266ff', fuel_tank: '#ffdd44',
  hull_plate: '#aaaaaa', armor_plate: '#888888',
  tether_reinforcer: '#88ccff', ping_array: '#ccffaa',
  hull_frame: '#ffccaa',
};

export class LooseModule extends Entity {
  constructor(x, y, moduleType) {
    super(x, y, 'loose_module');
    this.moduleType = moduleType;
    this.radius = 12;
    this.mass = 1;
    this._pulseT = Math.random() * Math.PI * 2;
  }

  update(dt) {
    super.update(dt);
    this.vx *= (1 - DRAG * dt);
    this.vy *= (1 - DRAG * dt);
    if (this.x < this.radius) { this.x = this.radius; this.vx = Math.abs(this.vx); }
    else if (this.x > WORLD_WIDTH - this.radius) { this.x = WORLD_WIDTH - this.radius; this.vx = -Math.abs(this.vx); }
    if (this.y < this.radius) { this.y = this.radius; this.vy = Math.abs(this.vy); }
    else if (this.y > WORLD_HEIGHT - this.radius) { this.y = WORLD_HEIGHT - this.radius; this.vy = -Math.abs(this.vy); }
    this._pulseT += dt * PULSE_SPEED;
  }

  // Returns true and marks this dead if captured into orbit.
  tryCapture(ship, orbitManager) {
    const dx = ship.x - this.x;
    const dy = ship.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hasTractor = ship.grid.getAllModules().some(m => m.isAlive() && m.type === 'tractor_beam');
    const captureRange = hasTractor ? 200 : COLLECT_RANGE;
    if (dist <= captureRange + ship.radius) {
      orbitManager.addModule(this.moduleType, ship.grid);
      this.alive = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    const def = MODULE_DEFS[this.moduleType];
    if (!def) return;
    const pulse = 0.5 + 0.5 * Math.sin(this._pulseT);
    const size = this.radius * 1.6;
    const hw = size / 2;

    ctx.save();

    // Pulsing highlight ring
    ctx.globalAlpha = 0.25 + 0.5 * pulse;
    ctx.strokeStyle = '#80ffcc';
    ctx.lineWidth = 1.5 + pulse * 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 4 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();

    // Module icon: colored square + first letter
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = MODULE_COLORS[this.moduleType] || '#cccccc';
    ctx.fillRect(this.x - hw, this.y - hw, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - hw, this.y - hw, size, size);
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${Math.max(8, Math.floor(size * 0.45))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.name[0], this.x, this.y);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    ctx.restore();
  }
}
