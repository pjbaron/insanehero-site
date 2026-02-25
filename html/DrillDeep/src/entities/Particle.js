// Particle.js - Pooled particle system for visual effects

export class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 4;
    this.color = '#fff';
    this.gravity = 0.3;
    this.friction = 0.98;
  }

  init(x, y, vx, vy, life, size, color, gravity = 0.3) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.gravity = gravity;
  }

  update(dt) {
    if (!this.active) return;

    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= dt / 16.67;  // Normalize to ~60fps

    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

export class ParticleSystem {
  constructor(poolSize = 200) {
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Particle());
    }
  }

  getParticle() {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    // Pool exhausted, reuse oldest
    return this.pool[0];
  }

  emit(x, y, count, config) {
    const {
      speed = 5,
      spread = Math.PI,
      angle = -Math.PI / 2,  // Default: upward
      life = 30,
      size = 4,
      color = '#fff',
      gravity = 0.3,
      sizeVariance = 0.5,
      speedVariance = 0.5
    } = config;

    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (1 + (Math.random() - 0.5) * speedVariance);
      const sz = size * (1 + (Math.random() - 0.5) * sizeVariance);

      p.init(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        Math.cos(a) * s,
        Math.sin(a) * s,
        life * (0.8 + Math.random() * 0.4),
        sz,
        color,
        gravity
      );
    }
  }

  // Preset effects
  digDebris(x, y, terrainColor) {
    this.emit(x, y, 8, {
      speed: 4,
      spread: Math.PI * 0.8,
      angle: -Math.PI / 2,
      life: 25,
      size: 3,
      color: terrainColor,
      gravity: 0.4
    });
  }

  collectSparkle(x, y, color) {
    this.emit(x, y, 12, {
      speed: 6,
      spread: Math.PI * 2,
      angle: 0,
      life: 40,
      size: 5,
      color: color,
      gravity: -0.1  // Float upward
    });
  }

  hazardSparks(x, y) {
    this.emit(x, y, 20, {
      speed: 8,
      spread: Math.PI * 2,
      angle: 0,
      life: 35,
      size: 4,
      color: '#FF4444',
      gravity: 0.2
    });
  }

  update(dt) {
    for (const p of this.pool) {
      p.update(dt);
    }
  }

  draw(ctx) {
    for (const p of this.pool) {
      p.draw(ctx);
    }
  }

  getActiveCount() {
    return this.pool.filter(p => p.active).length;
  }
}
