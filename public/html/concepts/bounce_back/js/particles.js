/**
 * Particles - Visual effects system
 * Handles particles, score popups, and screen shake
 */

var Particles = {
    list: [],
    popups: [],
    shakeX: 0,
    shakeY: 0,
    shakeMag: 0,
    shakeDecay: 0.9,

    /**
     * Spawn particles at a position
     */
    emit(x, y, count, color, speed, life) {
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var spd = (speed || 100) * (0.3 + Math.random() * 0.7);
            this.list.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: (life || 0.5) * (0.5 + Math.random() * 0.5),
                maxLife: life || 0.5,
                size: 2 + Math.random() * 3,
                color: color || '#fff'
            });
        }
    },

    /**
     * Emit a burst for peg hit
     */
    pegBurst(x, y, type) {
        var color = '#4af';
        var count = 6;
        if (type === 'explosive') {
            color = '#f84';
            count = 20;
        } else if (type === 'magnet') {
            color = '#d4f';
            count = 10;
        }
        this.emit(x, y, count, color, 120, 0.4);
    },

    /**
     * Emit bumper hit effect
     */
    bumperBurst(x, y) {
        this.emit(x, y, 10, '#ff4', 150, 0.3);
    },

    /**
     * Emit explosion for explosive peg
     */
    explosion(x, y) {
        this.emit(x, y, 30, '#f84', 200, 0.6);
        this.emit(x, y, 15, '#ff4', 150, 0.5);
        this.emit(x, y, 10, '#fff', 100, 0.3);
    },

    /**
     * Add a floating score popup
     */
    addPopup(x, y, text, color) {
        this.popups.push({
            x: x,
            y: y,
            text: text,
            color: color || '#fff',
            life: 1.2,
            maxLife: 1.2
        });
    },

    /**
     * Trigger screen shake
     */
    shake(magnitude) {
        this.shakeMag = Math.max(this.shakeMag, magnitude);
    },

    /**
     * Update all particles and effects
     */
    update(dt) {
        // Particles
        for (var i = this.list.length - 1; i >= 0; i--) {
            var p = this.list[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // particle gravity
            p.life -= dt;
            if (p.life <= 0) {
                this.list.splice(i, 1);
            }
        }

        // Popups
        for (var j = this.popups.length - 1; j >= 0; j--) {
            var pop = this.popups[j];
            pop.y -= 40 * dt;
            pop.life -= dt;
            if (pop.life <= 0) {
                this.popups.splice(j, 1);
            }
        }

        // Screen shake
        if (this.shakeMag > 0.5) {
            this.shakeX = (Math.random() - 0.5) * this.shakeMag * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeMag * 2;
            this.shakeMag *= this.shakeDecay;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeMag = 0;
        }
    },

    /**
     * Draw all particles - called by renderer with virtual-space context
     */
    draw(ctx) {
        // Particles
        for (var i = 0; i < this.list.length; i++) {
            var p = this.list[i];
            var alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;

        // Popups
        for (var j = 0; j < this.popups.length; j++) {
            var pop = this.popups[j];
            var a = Math.max(0, pop.life / pop.maxLife);
            ctx.globalAlpha = a;
            ctx.fillStyle = pop.color;
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(pop.text, pop.x, pop.y);
        }
        ctx.globalAlpha = 1;
    },

    /**
     * Clear all effects
     */
    clear() {
        this.list = [];
        this.popups = [];
        this.shakeMag = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    }
};
