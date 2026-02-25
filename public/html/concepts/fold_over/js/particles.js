/**
 * Particles - Celebration effects and visual feedback
 */

var Particles = {
    particles: [],
    screenShake: 0,
    shakeX: 0,
    shakeY: 0,

    /**
     * Spawn celebration particles at a position
     */
    burst: function(x, y, count, colors) {
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
            var speed = 100 + Math.random() * 200;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 0.6 + Math.random() * 0.4,
                size: 3 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 200 + Math.random() * 100,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 10,
                type: Math.random() > 0.5 ? 'square' : 'circle'
            });
        }
    },

    /**
     * Spawn star rating particles
     */
    starBurst: function(x, y) {
        this.burst(x, y, 30, ['#F1C40F', '#F39C12', '#E67E22', '#FFD700', '#FFF8DC']);
    },

    /**
     * Spawn fold feedback particles along a line
     */
    foldLine: function(x1, y1, x2, y2, count) {
        for (var i = 0; i < count; i++) {
            var t = i / count;
            var px = x1 + (x2 - x1) * t;
            var py = y1 + (y2 - y1) * t;
            this.particles.push({
                x: px + (Math.random() - 0.5) * 10,
                y: py + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 60,
                vy: (Math.random() - 0.5) * 60 - 30,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.3 + Math.random() * 0.3,
                size: 2 + Math.random() * 3,
                color: '#ffffff',
                gravity: 0,
                rotation: 0,
                rotSpeed: 0,
                type: 'circle'
            });
        }
    },

    /**
     * Trigger screen shake
     */
    shake: function(intensity) {
        this.screenShake = Math.max(this.screenShake, intensity);
    },

    /**
     * Update all particles
     */
    update: function(dt) {
        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake *= Math.pow(0.05, dt);
            if (this.screenShake < 0.5) this.screenShake = 0;
            this.shakeX = (Math.random() - 0.5) * this.screenShake * 2;
            this.shakeY = (Math.random() - 0.5) * this.screenShake * 2;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // Update particles
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.rotation += p.rotSpeed * dt;
            p.vx *= Math.pow(0.95, dt * 60);
        }
    },

    /**
     * Render all particles
     */
    render: function(ctx) {
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var alpha = Math.min(1, p.life / p.maxLife * 2);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            if (p.type === 'square') {
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    },

    /**
     * Clear all particles
     */
    clear: function() {
        this.particles = [];
        this.screenShake = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    }
};
