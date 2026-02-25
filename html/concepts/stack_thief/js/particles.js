/**
 * Particle System for Stack Thief
 * Handles dust, sparks, stars, and rubble effects
 */

var ParticleSystem = {
    particles: [],
    MAX_PARTICLES: 200,

    spawn(type, x, y, count, color) {
        // Throttle if at cap
        if (this.particles.length >= this.MAX_PARTICLES) {
            count = Math.ceil(count / 2);
        }
        for (var i = 0; i < count; i++) {
            if (this.particles.length >= this.MAX_PARTICLES) break;
            var p = this._createParticle(type, x, y, color);
            if (p) this.particles.push(p);
        }
    },

    _createParticle(type, x, y, color) {
        var angle, speed, life, size;
        switch (type) {
            case 'dust':
                angle = Math.random() * Math.PI * 2;
                speed = 30 + Math.random() * 60;
                life = 0.3 + Math.random() * 0.15;
                size = 2 + Math.random() * 3;
                return {
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 20,
                    life: life, maxLife: life,
                    size: size, color: color || '#a08060',
                    type: 'dust', gravity: 150
                };
            case 'land_dust':
                angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
                speed = 20 + Math.random() * 40;
                life = 0.2 + Math.random() * 0.15;
                size = 2 + Math.random() * 2;
                return {
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: life, maxLife: life,
                    size: size, color: '#888',
                    type: 'dust', gravity: 100
                };
            case 'rubble':
                angle = Math.random() * Math.PI * 2;
                speed = 50 + Math.random() * 120;
                life = 0.8 + Math.random() * 0.4;
                size = 3 + Math.random() * 5;
                return {
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 60,
                    life: life, maxLife: life,
                    size: size, color: color || '#888',
                    type: 'rubble', gravity: 250,
                    angle: Math.random() * Math.PI * 2,
                    angularVel: (Math.random() - 0.5) * 8
                };
            case 'star':
                angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
                speed = 40 + Math.random() * 50;
                life = 0.5 + Math.random() * 0.2;
                size = 3 + Math.random() * 3;
                return {
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: life, maxLife: life,
                    size: size, color: '#ffd700',
                    type: 'star', gravity: -30
                };
            case 'danger_spark':
                life = 0.15 + Math.random() * 0.1;
                return {
                    x: x, y: y,
                    vx: (Math.random() - 0.5) * 40,
                    vy: (Math.random() - 0.5) * 40,
                    life: life, maxLife: life,
                    size: 2 + Math.random() * 2,
                    color: '#ff3333',
                    type: 'spark', gravity: 0
                };
            default:
                return null;
        }
    },

    update(dt) {
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.vy += (p.gravity || 0) * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.angularVel) {
                p.angle += p.angularVel * dt;
            }
        }
    },

    render(ctx, scale, cameraY) {
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var alpha = Math.max(0, p.life / p.maxLife);
            var sx = p.x * scale;
            var sy = (p.y + cameraY) * scale;
            ctx.globalAlpha = alpha;

            if (p.type === 'star') {
                // Draw 4-pointed cross
                ctx.fillStyle = p.color;
                var s = p.size * scale;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.3, -s * 0.3);
                ctx.lineTo(s, 0);
                ctx.lineTo(s * 0.3, s * 0.3);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.3, s * 0.3);
                ctx.lineTo(-s, 0);
                ctx.lineTo(-s * 0.3, -s * 0.3);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'rubble') {
                ctx.fillStyle = p.color;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(p.angle || 0);
                var hw = p.size * scale * 0.7;
                var hh = p.size * scale * 0.4;
                ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
                ctx.restore();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(sx, sy, p.size * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    },

    clear() {
        this.particles.length = 0;
    }
};
