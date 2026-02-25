/**
 * Particles - Visual particle system for juice
 * Handles dust, sparks, explosions, star bursts, rope snapping
 */

var Particles = {
    particles: [],
    maxParticles: 500,

    clear: function() {
        this.particles.length = 0;
    },

    update: function(dt) {
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += (p.gravity || 200) * dt;
            p.vx *= (1 - (p.drag || 0.02));
            if (p.rotSpeed) p.rot += p.rotSpeed * dt;
            p.alpha = Math.min(1, p.life / (p.maxLife * 0.3));
        }
    },

    render: function(ctx, cam) {
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var pos = cam.worldToScreen(p.x, p.y);
            var s = p.size * cam.scale;

            ctx.globalAlpha = p.alpha;

            if (p.type === 'circle') {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, s, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            } else if (p.type === 'square') {
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(p.rot || 0);
                ctx.fillStyle = p.color;
                ctx.fillRect(-s, -s, s * 2, s * 2);
                ctx.restore();
            } else if (p.type === 'star') {
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(p.rot || 0);
                this._drawStar(ctx, 0, 0, 5, s, s * 0.5);
                ctx.fillStyle = p.color;
                ctx.fill();
                ctx.restore();
            } else if (p.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(pos.x + p.vx * 0.02 * cam.scale, pos.y + p.vy * 0.02 * cam.scale);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = s;
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    },

    _drawStar: function(ctx, cx, cy, spikes, outerR, innerR) {
        var rot = Math.PI / 2 * 3;
        var step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerR);
        for (var i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
    },

    _add: function(p) {
        if (this.particles.length >= this.maxParticles) return;
        p.maxLife = p.life;
        p.rot = p.rot || 0;
        p.alpha = 1;
        this.particles.push(p);
    },

    // ---- EFFECT PRESETS ----

    // Rope cut - fibers flying
    ropeCut: function(x, y) {
        for (var i = 0; i < 12; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 40 + Math.random() * 80;
            this._add({
                type: 'line',
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                size: 2,
                color: '#a87832',
                life: 0.4 + Math.random() * 0.3,
                gravity: 150,
                drag: 0.05
            });
        }
        // Snap sparks
        for (var i = 0; i < 6; i++) {
            this._add({
                type: 'circle',
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 100,
                vy: -Math.random() * 60,
                size: 1 + Math.random() * 2,
                color: '#ffe080',
                life: 0.2 + Math.random() * 0.2,
                gravity: 100,
                drag: 0.02
            });
        }
    },

    // Boulder impact - dust cloud
    impact: function(x, y, intensity) {
        intensity = intensity || 1;
        var count = Math.floor(8 * intensity);
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 30 + Math.random() * 60 * intensity;
            this._add({
                type: 'circle',
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20,
                size: 3 + Math.random() * 5 * intensity,
                color: '#8a7a6a',
                life: 0.3 + Math.random() * 0.4,
                gravity: 50,
                drag: 0.08
            });
        }
        // Ground dust
        for (var i = 0; i < count; i++) {
            this._add({
                type: 'circle',
                x: x + (Math.random() - 0.5) * 30,
                y: y,
                vx: (Math.random() - 0.5) * 80,
                vy: -Math.random() * 40,
                size: 2 + Math.random() * 3,
                color: '#9a8a7a',
                life: 0.5 + Math.random() * 0.5,
                gravity: 30,
                drag: 0.1
            });
        }
    },

    // Explosion effect (for explosive boulders)
    explosion: function(x, y) {
        // Fire particles
        for (var i = 0; i < 20; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 80 + Math.random() * 150;
            this._add({
                type: 'circle',
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 6,
                color: ['#ff4400', '#ff8800', '#ffcc00', '#ff6600'][Math.floor(Math.random() * 4)],
                life: 0.3 + Math.random() * 0.4,
                gravity: -50,
                drag: 0.06
            });
        }
        // Smoke
        for (var i = 0; i < 10; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 20 + Math.random() * 60;
            this._add({
                type: 'circle',
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                size: 6 + Math.random() * 8,
                color: '#444',
                life: 0.5 + Math.random() * 0.5,
                gravity: -20,
                drag: 0.1
            });
        }
        // Debris
        for (var i = 0; i < 8; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 60 + Math.random() * 120;
            this._add({
                type: 'square',
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                size: 2 + Math.random() * 3,
                color: '#666',
                life: 0.4 + Math.random() * 0.4,
                gravity: 300,
                drag: 0.02,
                rotSpeed: (Math.random() - 0.5) * 10
            });
        }
    },

    // Camp destroyed
    campDestroyed: function(x, y) {
        // Wood splinters
        for (var i = 0; i < 15; i++) {
            var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            var speed = 60 + Math.random() * 100;
            this._add({
                type: 'square',
                x: x + (Math.random() - 0.5) * 30,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: ['#5a4030', '#7a6050', '#4a3020', '#2a7a2a'][Math.floor(Math.random() * 4)],
                life: 0.5 + Math.random() * 0.5,
                gravity: 250,
                drag: 0.03,
                rotSpeed: (Math.random() - 0.5) * 12
            });
        }
        // Green poof from tent
        for (var i = 0; i < 8; i++) {
            this._add({
                type: 'circle',
                x: x + (Math.random() - 0.5) * 20,
                y: y - 10,
                vx: (Math.random() - 0.5) * 40,
                vy: -20 - Math.random() * 40,
                size: 4 + Math.random() * 6,
                color: '#3a8a3a',
                life: 0.4 + Math.random() * 0.3,
                gravity: 20,
                drag: 0.1
            });
        }
    },

    // Breakable platform shatters
    platformBreak: function(x, y, w) {
        var hw = w / 2;
        for (var i = 0; i < 10; i++) {
            this._add({
                type: 'square',
                x: x + (Math.random() - 0.5) * w,
                y: y + (Math.random() - 0.5) * 6,
                vx: (Math.random() - 0.5) * 60,
                vy: -10 - Math.random() * 40,
                size: 3 + Math.random() * 4,
                color: '#7a6040',
                life: 0.4 + Math.random() * 0.4,
                gravity: 300,
                drag: 0.02,
                rotSpeed: (Math.random() - 0.5) * 8
            });
        }
    },

    // Star burst for level complete
    starBurst: function(x, y, count) {
        for (var i = 0; i < (count || 20); i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 40 + Math.random() * 80;
            this._add({
                type: 'star',
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                size: 4 + Math.random() * 5,
                color: ['#ffd700', '#ffaa00', '#fff'][Math.floor(Math.random() * 3)],
                life: 0.6 + Math.random() * 0.5,
                gravity: 60,
                drag: 0.04,
                rotSpeed: (Math.random() - 0.5) * 6
            });
        }
    },

    // Boulder split effect
    splitEffect: function(x, y) {
        for (var i = 0; i < 10; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 50 + Math.random() * 80;
            this._add({
                type: 'circle',
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: ['#8cf', '#adf', '#68a'][Math.floor(Math.random() * 3)],
                life: 0.3 + Math.random() * 0.3,
                gravity: 100,
                drag: 0.05
            });
        }
    }
};
