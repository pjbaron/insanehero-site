import { input } from './input.js';

const BASE_RANGE = 200;   // px per tractor_beam module
const BASE_SPEED = 100;   // px/s per tractor_beam module
const CAPTURE_RANGE = 40; // px -- triggers auto-capture
const WAVE_SPEED = 5;     // radians/s for beam animation
const WAVE_AMP = 5;       // px perpendicular displacement
const WAVE_CYCLES = 3;    // oscillations along beam length

export class TractorBeam {
  constructor() {
    this.enabled = false;
    this._waveT = 0;
    // Beam segments drawn last update; consumed by draw().
    this._beams = []; // [{x1,y1,x2,y2}]
  }

  update(dt, ship, entities, orbitManager) {
    this._waveT += dt * WAVE_SPEED;
    this._beams = [];

    if (input.consumePress('t')) {
      this.enabled = !this.enabled;
    }

    const tractorMods = ship.grid.getAllModules().filter(
      m => m.isAlive() && m.type === 'tractor_beam',
    );

    // Mark each tractor module so renderer can dim them when off.
    for (const m of tractorMods) {
      m.tractorActive = this.enabled;
    }

    if (!this.enabled || tractorMods.length === 0) return;

    const count = tractorMods.length;
    const totalRange = BASE_RANGE * count;
    const isBrownout = !ship.grid.isPowerSufficient();
    const pullSpeed = BASE_SPEED * count * (isBrownout ? 0.5 : 1);
    const maxTargets = count;

    // Net capacity from alive net modules (for debris targeting).
    const netMods = ship.grid.getAllModules().filter(m => m.isAlive() && m.def.capacity);
    const netCapacity = netMods.reduce((s, m) => s + m.def.capacity, 0);

    // Gather targets: loose_modules first (highest priority), then untethered debris.
    const loose = entities.getByType('loose_module').filter(lm => {
      const dx = lm.x - ship.x;
      const dy = lm.y - ship.y;
      return dx * dx + dy * dy <= totalRange * totalRange;
    });

    const netHasRoom = ship.net.tetheredDebris.length < netCapacity;
    const debris = netHasRoom
      ? entities.getByType('debris').filter(d => {
          if (d.tethered) return false;
          const dx = d.x - ship.x;
          const dy = d.y - ship.y;
          return dx * dx + dy * dy <= totalRange * totalRange;
        })
      : [];

    const targets = [...loose, ...debris].slice(0, maxTargets);

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const dx = ship.x - target.x;
      const dy = ship.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      // Apply pull velocity.
      target.vx += (dx / dist) * pullSpeed * dt;
      target.vy += (dy / dist) * pullSpeed * dt;

      // Determine source module world position (cycle across modules).
      const srcMod = tractorMods[i % tractorMods.length];
      const offset = ship.getModuleWorldOffset(srcMod);
      const x1 = ship.x + offset.x;
      const y1 = ship.y + offset.y;

      this._beams.push({ x1, y1, x2: target.x, y2: target.y });

      // Auto-capture when close enough (existing systems handle the actual logic;
      // this just triggers early for loose modules to jump into orbit).
      if (dist <= CAPTURE_RANGE && target.type === 'loose_module') {
        orbitManager.addModule(target.moduleType, ship.grid);
        target.alive = false;
      }
    }
  }

  draw(ctx, ship) {
    if (!this.enabled || this._beams.length === 0) return;

    ctx.save();

    for (const { x1, y1, x2, y2 } of this._beams) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 2) continue;

      // Perpendicular unit vector for wave offset.
      const perpX = -(y2 - y1) / len;
      const perpY =  (x2 - x1) / len;

      ctx.beginPath();
      ctx.moveTo(x1, y1);

      // Draw wavy line as short segments.
      const steps = 16;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const bx = x1 + (x2 - x1) * t;
        const by = y1 + (y2 - y1) * t;
        const wave = Math.sin(t * Math.PI * 2 * WAVE_CYCLES + this._waveT) * WAVE_AMP;
        ctx.lineTo(bx + perpX * wave, by + perpY * wave);
      }

      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
