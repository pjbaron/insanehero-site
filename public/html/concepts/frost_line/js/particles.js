/**
 * Pooled particle system (global, non-module)
 * Max 200 particles, reuses dead slots for zero GC
 */
var Particles = {
    MAX: 200,
    pool: [],
    count: 0,

    init: function() {
        this.pool = [];
        this.count = 0;
        for (var i = 0; i < this.MAX; i++) {
            this.pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, color: '#fff', size: 2 });
        }
    },

    spawn: function(x, y, vx, vy, life, color, size) {
        for (var i = 0; i < this.MAX; i++) {
            var p = this.pool[i];
            if (!p.alive) {
                p.alive = true;
                p.x = x; p.y = y;
                p.vx = vx; p.vy = vy;
                p.life = life; p.maxLife = life;
                p.color = color || '#fff';
                p.size = size || 2;
                this.count++;
                return p;
            }
        }
        return null;
    },

    /** Radial burst of n particles */
    burst: function(x, y, n, speed, life, color, size) {
        for (var i = 0; i < n; i++) {
            var angle = Math.random() * Math.PI * 2;
            var spd = speed * (0.4 + Math.random() * 0.6);
            this.spawn(x, y, Math.cos(angle) * spd, Math.sin(angle) * spd, life * (0.5 + Math.random() * 0.5), color, size);
        }
    },

    update: function(dt) {
        for (var i = 0; i < this.MAX; i++) {
            var p = this.pool[i];
            if (!p.alive) continue;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= dt;
            if (p.life <= 0) {
                p.alive = false;
                this.count--;
            }
        }
    },

    render: function(ctx) {
        for (var i = 0; i < this.MAX; i++) {
            var p = this.pool[i];
            if (!p.alive) continue;
            var alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }
};
