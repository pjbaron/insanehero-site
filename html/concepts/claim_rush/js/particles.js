/**
 * Particles - Visual effects: claim bursts, death explosions, trail sparkles, floating text
 */

var Particles = {
    MAX: 200,
    list: [],
    texts: [],

    init() {
        this.list = [];
        this.texts = [];
    },

    update(dt) {
        // Update particles
        for (var i = this.list.length - 1; i >= 0; i--) {
            var p = this.list[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.list.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.alpha = Math.min(1, p.life / p.maxLife);
        }

        // Update floating texts
        for (var i = this.texts.length - 1; i >= 0; i--) {
            var t = this.texts[i];
            t.life -= dt;
            if (t.life <= 0) {
                this.texts.splice(i, 1);
                continue;
            }
            t.y -= 30 * dt; // float upward
            t.alpha = Math.min(1, t.life / t.maxLife);
        }
    },

    _add(x, y, vx, vy, color, size, life) {
        if (this.list.length >= this.MAX) return;
        this.list.push({
            x: x, y: y, vx: vx, vy: vy,
            color: color, size: size,
            life: life, maxLife: life,
            alpha: 1
        });
    },

    claimBurst(gx, gy) {
        var count = 3;
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 20 + Math.random() * 40;
            this._add(
                gx, gy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#88ccff', 0.3 + Math.random() * 0.3,
                0.3 + Math.random() * 0.3
            );
        }
    },

    explosion(gx, gy, color) {
        var count = 25;
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 30 + Math.random() * 80;
            this._add(
                gx, gy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color || '#ff4444',
                0.4 + Math.random() * 0.6,
                0.5 + Math.random() * 0.5
            );
        }
    },

    trailSparkle(gx, gy) {
        if (this.list.length >= this.MAX - 10) return; // leave headroom
        this._add(
            gx + (Math.random() - 0.5) * 0.5,
            gy + (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            '#aaddff',
            0.2 + Math.random() * 0.2,
            0.2 + Math.random() * 0.2
        );
    },

    floatingText(text, gx, gy, color) {
        this.texts.push({
            text: text,
            x: gx, y: gy,
            color: color || '#ffffff',
            life: 1.2, maxLife: 1.2,
            alpha: 1
        });
    },

    render(ctx, cellSize, offsetX, offsetY) {
        // Render particles
        for (var i = 0; i < this.list.length; i++) {
            var p = this.list[i];
            var sx = offsetX + p.x * cellSize;
            var sy = offsetY + p.y * cellSize;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sx, sy, p.size * cellSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Render floating texts
        var fontSize = Math.max(12, Math.floor(cellSize * 1.5));
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        for (var i = 0; i < this.texts.length; i++) {
            var t = this.texts[i];
            var sx = offsetX + t.x * cellSize;
            var sy = offsetY + t.y * cellSize;
            ctx.globalAlpha = t.alpha;
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, sx, sy);
        }

        ctx.globalAlpha = 1;
    }
};
