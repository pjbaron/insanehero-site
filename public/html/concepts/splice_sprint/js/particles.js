/**
 * Splice Sprint - Particle System
 * Speed trails, boost sparks, mud splashes, coin glitters, death debris
 */

var Particles = {
    particles: [],

    reset: function() {
        this.particles = [];
    },

    emit: function(type, x, y, count, color, options) {
        var opts = options || {};
        for (var i = 0; i < count; i++) {
            if (this.particles.length >= C.PARTICLE_MAX) break;
            var angle = opts.angle !== undefined ? opts.angle + (Math.random() - 0.5) * (opts.spread || 1) : Math.random() * Math.PI * 2;
            var spd = (opts.speed || 100) * (0.5 + Math.random() * 0.5);
            this.particles.push({
                x: x + (Math.random() - 0.5) * (opts.radius || 10),
                y: y + (Math.random() - 0.5) * (opts.radius || 10),
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd + (opts.gravity ? -spd * 0.5 : 0),
                life: (opts.life || 0.5) * (0.7 + Math.random() * 0.3),
                maxLife: opts.life || 0.5,
                size: (opts.size || 4) * (0.5 + Math.random() * 0.5),
                color: color,
                type: type,
                gravity: opts.gravity || 0,
                alpha: 1
            });
        }
    },

    // Emit at screen-space position with world-z for depth scaling
    emitAtScreen: function(type, sx, sy, count, color, options) {
        this.emit(type, sx, sy, count, color, options);
    },

    update: function(dt) {
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    },

    render: function(ctx) {
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            ctx.globalAlpha = p.alpha;

            if (p.type === 'spark') {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size * 0.3);
            } else if (p.type === 'debris') {
                ctx.fillStyle = p.color;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.life * 10);
                ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
                ctx.restore();
            } else if (p.type === 'glow') {
                var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                grad.addColorStop(0, p.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    },

    // Preset emitters
    boostSparks: function(sx, sy) {
        this.emit('spark', sx, sy, 8, C.BOOST_COLOR, {
            angle: -Math.PI / 2, spread: 1.5, speed: 200,
            life: 0.4, size: 5
        });
    },

    mudSplash: function(sx, sy) {
        this.emit('circle', sx, sy, 12, C.MUD_COLOR, {
            angle: -Math.PI / 2, spread: 2, speed: 150,
            life: 0.5, size: 6, gravity: 400
        });
    },

    coinGlitter: function(sx, sy) {
        this.emit('glow', sx, sy, 5, C.COIN_COLOR, {
            speed: 60, life: 0.3, size: 8
        });
    },

    deathDebris: function(sx, sy) {
        this.emit('debris', sx, sy, 20, '#aa4422', {
            speed: 250, life: 1.0, size: 8, gravity: 500, spread: Math.PI * 2
        });
        this.emit('debris', sx, sy, 10, '#664422', {
            speed: 180, life: 0.8, size: 6, gravity: 400, spread: Math.PI * 2
        });
    },

    speedTrail: function(sx, sy) {
        this.emit('spark', sx, sy, 2, '#ffffff', {
            angle: Math.PI / 2, spread: 0.3, speed: 50,
            life: 0.2, size: 3
        });
    },

    rampSparks: function(sx, sy) {
        this.emit('glow', sx, sy, 10, C.RAMP_COLOR, {
            angle: -Math.PI / 2, spread: 1, speed: 180,
            life: 0.6, size: 10, gravity: 200
        });
    }
};
