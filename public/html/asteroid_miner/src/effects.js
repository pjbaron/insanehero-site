const effects = [];

function spawnTraderPurchaseEffect(x, y, itemName) {
  effects.push({
    type: 'text',
    x, y,
    vx: 0,
    vy: -30,
    text: itemName,
    lifetime: 0,
    maxLifetime: 1.4,
    alpha: 1,
    size: 14,
    color: '#ff44ff',
  });
}

function spawnUpgradeEffect(x, y, text) {
  effects.push({
    type: 'text',
    x, y,
    vx: 0,
    vy: -25,
    text,
    lifetime: 0,
    maxLifetime: 1.8,
    alpha: 1,
    size: 13,
    color: '#00e8ff',
  });
}

function spawnCrushEffect(x, y, value) {
  // Floating text effect
  effects.push({
    type: 'text',
    x, y,
    vx: 0,
    vy: -30,
    text: `+${value} gold`,
    lifetime: 0,
    maxLifetime: 1.5,
    alpha: 1,
    size: 14,
  });

  // Particle burst
  const count = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 40 + Math.random() * 60;
    effects.push({
      type: 'particle',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime: 0,
      maxLifetime: 0.8 + Math.random() * 0.4,
      alpha: 1,
      size: 3 + Math.random() * 2,
    });
  }
}

// Fuel tank / exhaust explosion: central flash + expanding ring + debris particles.
function spawnExplosionEffect(x, y) {
  // Central flash
  effects.push({
    type: 'flash',
    x, y,
    vx: 0, vy: 0,
    lifetime: 0,
    maxLifetime: 0.18,
    alpha: 1,
    flashRadius: 28,
  });

  // Expanding ring
  effects.push({
    type: 'ring',
    x, y,
    vx: 0, vy: 0,
    lifetime: 0,
    maxLifetime: 0.36,
    alpha: 1,
  });

  // Debris particles flying outward
  const count = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 85;
    effects.push({
      type: 'particle',
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime: 0,
      maxLifetime: 0.4 + Math.random() * 0.3,
      alpha: 1,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.45 ? '#ff7020' : '#ffdd30',
    });
  }
}

// Small orange sparks for exhaust damage / damaged module ambience.
function spawnExhaustSpark(x, y) {
  for (let i = 0; i < 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 18 + Math.random() * 30;
    effects.push({
      type: 'particle',
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime: 0,
      maxLifetime: 0.15 + Math.random() * 0.12,
      alpha: 1,
      size: 1.2 + Math.random() * 1.4,
      color: '#ff8800',
    });
  }
}

function update(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.lifetime += dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.alpha = 1 - e.lifetime / e.maxLifetime;
    if (e.type === 'particle') {
      e.size *= 1 - dt * 1.5;
    }
    if (e.lifetime >= e.maxLifetime) {
      effects.splice(i, 1);
    }
  }
}

function render(ctx) {
  for (const e of effects) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, e.alpha);
    if (e.type === 'text') {
      ctx.fillStyle = e.color || '#ffd700';
      ctx.font = `bold ${e.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(e.text, e.x, e.y);
    } else if (e.type === 'flash') {
      const t = e.lifetime / e.maxLifetime;
      const r = e.flashRadius * (1 + t * 0.5);
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      g.addColorStop(0, `rgba(255,255,210,${e.alpha.toFixed(3)})`);
      g.addColorStop(0.35, `rgba(255,130,20,${(e.alpha * 0.75).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'ring') {
      const t = e.lifetime / e.maxLifetime;
      const r = 6 + t * 48;
      ctx.strokeStyle = `rgba(255,150,20,${e.alpha.toFixed(3)})`;
      ctx.lineWidth = Math.max(0.5, 3 - t * 2.5);
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = e.color || '#ff8c00';
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.max(0.1, e.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

const EffectManager = {
  spawnCrushEffect,
  spawnUpgradeEffect,
  spawnTraderPurchaseEffect,
  spawnExplosionEffect,
  spawnExhaustSpark,
  update,
  render,
};
export default EffectManager;
export { EffectManager };
