/**
 * Particles - Object-pooled particle system for visual juice
 * Global object (non-module), loaded before game modules
 */

var Particles = {
    pool: [],
    active: [],
    MAX_PARTICLES: 300,

    init() {
        this.pool = [];
        this.active = [];
        for (var i = 0; i < this.MAX_PARTICLES; i++) {
            this.pool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 0,
                r: 255, g: 255, b: 255, a: 1,
                size: 3, gravity: 0, drag: 0,
                type: 'circle' // circle, spark, text
            });
        }
    },

    _get() {
        if (this.pool.length > 0) {
            var p = this.pool.pop();
            this.active.push(p);
            return p;
        }
        // Steal oldest active particle
        if (this.active.length > 0) {
            return this.active[0];
        }
        return null;
    },

    /**
     * Emit particles
     * @param {number} x - center x
     * @param {number} y - center y
     * @param {object} opts - { count, color, speed, life, size, gravity, drag, spread, type }
     */
    emit(x, y, opts) {
        var o = opts || {};
        var count = o.count || 8;
        var speed = o.speed || 150;
        var life = o.life || 0.5;
        var size = o.size || 3;
        var grav = o.gravity !== undefined ? o.gravity : 200;
        var drag = o.drag || 0.98;
        var spread = o.spread || Math.PI * 2;
        var baseAngle = o.angle !== undefined ? o.angle : 0;
        var r = o.r !== undefined ? o.r : 255;
        var g = o.g !== undefined ? o.g : 255;
        var b = o.b !== undefined ? o.b : 255;
        var type = o.type || 'circle';

        for (var i = 0; i < count; i++) {
            var p = this._get();
            if (!p) break;
            var angle = baseAngle + (Math.random() - 0.5) * spread;
            var spd = speed * (0.5 + Math.random() * 0.5);
            p.x = x + (Math.random() - 0.5) * 4;
            p.y = y + (Math.random() - 0.5) * 4;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = life * (0.7 + Math.random() * 0.3);
            p.maxLife = p.life;
            p.r = r;
            p.g = g;
            p.b = b;
            p.a = 1;
            p.size = size * (0.7 + Math.random() * 0.6);
            p.gravity = grav;
            p.drag = drag;
            p.type = type;
        }
    },

    /**
     * Special: floating text particle (score popup, combo text)
     */
    textPopup(x, y, text, r, g, b, scale) {
        var p = this._get();
        if (!p) return;
        p.x = x;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 30;
        p.vy = -120 - Math.random() * 40;
        p.life = 1.0;
        p.maxLife = 1.0;
        p.r = r || 255;
        p.g = g || 255;
        p.b = b || 255;
        p.a = 1;
        p.size = scale || 1;
        p.gravity = -30;
        p.drag = 0.97;
        p.type = 'text';
        p.text = text;
    },

    update(dt) {
        for (var i = this.active.length - 1; i >= 0; i--) {
            var p = this.active[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.active.splice(i, 1);
                this.pool.push(p);
                continue;
            }
            p.vy += p.gravity * dt;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.a = Math.max(0, p.life / p.maxLife);
        }
    },

    render(ctx) {
        for (var i = 0; i < this.active.length; i++) {
            var p = this.active[i];
            var alpha = p.a;
            if (p.type === 'text') {
                ctx.save();
                ctx.globalAlpha = alpha;
                var fontSize = Math.floor(18 * p.size);
                ctx.font = 'bold ' + fontSize + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // Outline
                ctx.strokeStyle = 'rgba(0,0,0,' + (alpha * 0.7) + ')';
                ctx.lineWidth = 3;
                ctx.strokeText(p.text, p.x, p.y);
                ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha + ')';
                ctx.fillText(p.text, p.x, p.y);
                ctx.restore();
            } else if (p.type === 'spark') {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha + ')';
                ctx.lineWidth = Math.max(1, p.size * 0.5);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.5, p.size * alpha), 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + alpha + ')';
                ctx.fill();
            }
        }
    },

    clear() {
        while (this.active.length > 0) {
            this.pool.push(this.active.pop());
        }
    }
};
