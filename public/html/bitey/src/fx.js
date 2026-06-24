// FX: the juice layer. Particles (blood, gibs, sparks), floating score text,
// shockwave rings, and screen shake. Pure presentation - it reads game events
// but never feeds back into the simulation, so it can never desync the sim.

import * as cfg from './config.js';

const GRAVITY = cfg.GRAVITY;

export class FX {
  constructor() {
    this.particles = [];   // {x,y,vx,vy,life,maxLife,size,color,gravity}
    this.texts = [];       // {x,y,vy,life,maxLife,text,color,size}
    this.rings = [];       // {x,y,r,maxR,life,maxLife,color}
    this.shake = 0;        // current shake magnitude (px), decays each frame
  }

  addShake(mag) {
    if (mag > this.shake) this.shake = mag;
  }

  // A spray of blood at a hit point, biased in the knockback direction.
  blood(x, y, dir, amount) {
    if (this.particles.length > 520) return; // hard cap = perf guard
    const n = amount || 8;
    for (let i = 0; i < n; i++) {
      const a = (Math.random() - 0.5) * Math.PI;
      const sp = 60 + Math.random() * 260;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp * 0.4 + dir * (40 + Math.random() * 120),
        vy: Math.sin(a) * sp - 60,
        life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
        size: 2 + Math.random() * 3,
        color: Math.random() < 0.25 ? '#b5e06a' : '#9e2b2b',
        gravity: 1,
      });
    }
  }

  // Chunky gibs when a zombie dies - bigger, fewer, longer-lived than blood.
  gibs(x, y, dir) {
    if (this.particles.length > 540) return;
    for (let i = 0; i < 6; i++) {
      const sp = 120 + Math.random() * 320;
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.2;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp + dir * 80,
        vy: Math.sin(a) * sp,
        life: 0.7 + Math.random() * 0.6, maxLife: 1.3,
        size: 4 + Math.random() * 5,
        color: Math.random() < 0.5 ? '#5f8f4a' : '#7a3030',
        gravity: 1,
      });
    }
  }

  // Bright sparks for a grenade detonation.
  sparks(x, y, n) {
    for (let i = 0; i < (n || 24); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 520;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.5, maxLife: 0.8,
        size: 2 + Math.random() * 4,
        color: Math.random() < 0.5 ? '#ffd24a' : '#ff7a2a',
        gravity: 0.3,
      });
    }
  }

  // A wide, juicy goo spray for a platform squashing a pack of zombies. The
  // count scales the spectacle so a big crush reads instantly.
  squelch(x, y, n) {
    if (this.particles.length > 500) return;
    const count = Math.min(10 + n * 5, 64);
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.5; // up-and-out, wide
      const sp = 50 + Math.random() * 360;
      const r = Math.random();
      this.particles.push({
        x: x + (Math.random() - 0.5) * 70, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.8 - 40,
        life: 0.5 + Math.random() * 0.7, maxLife: 1.2,
        size: 3 + Math.random() * 7,
        color: r < 0.45 ? '#9e2b2b' : r < 0.75 ? '#7a3030' : '#5f8f4a',
        gravity: 1,
      });
    }
  }

  ring(x, y, maxR, color) {
    this.rings.push({ x, y, r: 8, maxR, life: 0.35, maxLife: 0.35, color: color || '#ffd24a' });
  }

  text(x, y, str, color, size) {
    this.texts.push({
      x, y, vy: -70, life: 0.9, maxLife: 0.9,
      text: str, color: color || '#ffffff', size: size || 22,
    });
  }

  update(dt) {
    for (const p of this.particles) {
      if (p.gravity) p.vy += GRAVITY * p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Settle on the ground and stop.
      if (p.y > cfg.GROUND_Y) { p.y = cfg.GROUND_Y; p.vy = 0; p.vx *= 0.6; }
      p.life -= dt;
    }
    if (this.particles.length) this.particles = this.particles.filter(p => p.life > 0);

    for (const t of this.texts) { t.y += t.vy * dt; t.vy *= 0.92; t.life -= dt; }
    if (this.texts.length) this.texts = this.texts.filter(t => t.life > 0);

    for (const r of this.rings) {
      const k = 1 - r.life / r.maxLife;
      r.r = 8 + (r.maxR - 8) * k;
      r.life -= dt;
    }
    if (this.rings.length) this.rings = this.rings.filter(r => r.life > 0);

    // Shake decays exponentially.
    this.shake *= Math.pow(0.001, dt); // ~ -60% per frame at 60fps
    if (this.shake < 0.3) this.shake = 0;
  }

  shakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * 2 * this.shake,
      y: (Math.random() - 0.5) * 2 * this.shake,
    };
  }
}
