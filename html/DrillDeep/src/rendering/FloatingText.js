// FloatingText.js - Floating text popups for feedback

export class FloatingText {
  constructor() {
    this.texts = [];
  }

  add(x, y, text, color = '#FFD700', size = 16) {
    this.texts.push({
      x,
      y,
      text,
      color,
      size,
      life: 60,  // frames
      maxLife: 60,
      vy: -2
    });
  }

  addValue(x, y, value) {
    this.add(x, y, `+$${value}`, '#4CAF50', 18);
  }

  addDamage(x, y, damage) {
    this.add(x, y, `-${damage}`, '#FF4444', 16);
  }

  addMessage(x, y, message, color = '#fff') {
    this.add(x, y, message, color, 14);
  }

  update(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y += t.vy;
      t.vy *= 0.95;  // Slow down
      t.life--;

      if (t.life <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const t of this.texts) {
      const alpha = Math.min(1, t.life / 20);  // Fade out in last 20 frames
      const scale = 1 + (1 - t.life / t.maxLife) * 0.3;  // Grow slightly

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.floor(t.size * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Shadow
      ctx.fillStyle = '#000';
      ctx.fillText(t.text, t.x + 1, t.y + 1);

      // Main text
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);

      ctx.restore();
    }
  }
}
