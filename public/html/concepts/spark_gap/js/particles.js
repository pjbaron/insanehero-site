/**
 * Particles - Electric sparks, connection bursts, and ambient effects
 */

export class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.decay = 1;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.screenShake = 0;
        this.shakeX = 0;
        this.shakeY = 0;
    }

    update(dt) {
        // Update screen shake
        if (this.screenShake > 0) {
            this.screenShake -= dt * 12;
            if (this.screenShake < 0) this.screenShake = 0;
            this.shakeX = (Math.random() - 0.5) * this.screenShake * 8;
            this.shakeY = (Math.random() - 0.5) * this.screenShake * 8;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // Update particles
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 80 * dt; // Slight gravity
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var alpha = Math.max(0, p.life / p.maxLife);
            var s = p.size * (0.5 + 0.5 * alpha);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
        }
        ctx.globalAlpha = 1;
    }

    /** Spark burst at a point (connection, terminal) */
    sparkBurst(x, y, color, count) {
        count = count || 15;
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 60 + Math.random() * 180;
            var vx = Math.cos(angle) * speed;
            var vy = Math.sin(angle) * speed - 40;
            var life = 0.3 + Math.random() * 0.5;
            var size = 2 + Math.random() * 4;
            this.particles.push(new Particle(x, y, vx, vy, life, color, size));
        }
    }

    /** Electric arc along a wire path */
    wireTrail(path, cellSize, offsetX, offsetY, color) {
        for (var i = 0; i < path.length; i++) {
            var cx = offsetX + path[i].c * cellSize + cellSize / 2;
            var cy = offsetY + path[i].r * cellSize + cellSize / 2;
            if (Math.random() < 0.4) {
                var vx = (Math.random() - 0.5) * 60;
                var vy = (Math.random() - 0.5) * 60 - 20;
                var life = 0.2 + Math.random() * 0.3;
                this.particles.push(new Particle(cx, cy, vx, vy, life, color, 2 + Math.random() * 2));
            }
        }
    }

    /** Short circuit explosion */
    shortCircuit(x, y) {
        this.screenShake = 1.5;
        for (var i = 0; i < 30; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 80 + Math.random() * 250;
            var vx = Math.cos(angle) * speed;
            var vy = Math.sin(angle) * speed;
            var color = Math.random() < 0.5 ? '#ff3d00' : '#ffea00';
            var life = 0.3 + Math.random() * 0.6;
            this.particles.push(new Particle(x, y, vx, vy, life, color, 3 + Math.random() * 5));
        }
    }

    /** Fuse blow effect */
    fuseBlow(x, y) {
        this.screenShake = 2.5;
        for (var i = 0; i < 40; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 50 + Math.random() * 300;
            var vx = Math.cos(angle) * speed;
            var vy = Math.sin(angle) * speed - 60;
            var color = ['#ff3d00', '#ff6d00', '#ffea00', '#fff'][Math.floor(Math.random() * 4)];
            var life = 0.4 + Math.random() * 0.8;
            this.particles.push(new Particle(x, y, vx, vy, life, color, 3 + Math.random() * 6));
        }
    }

    /** Ambient sparks from a terminal */
    terminalSpark(x, y, color) {
        if (Math.random() > 0.3) return;
        var angle = Math.random() * Math.PI * 2;
        var speed = 20 + Math.random() * 50;
        var vx = Math.cos(angle) * speed;
        var vy = Math.sin(angle) * speed - 10;
        var life = 0.2 + Math.random() * 0.3;
        this.particles.push(new Particle(x, y, vx, vy, life, color, 1 + Math.random() * 2));
    }

    /** Power up spreading glow */
    powerUpBurst(x, y, color) {
        for (var i = 0; i < 25; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 30 + Math.random() * 120;
            var vx = Math.cos(angle) * speed;
            var vy = Math.sin(angle) * speed;
            var life = 0.5 + Math.random() * 0.7;
            this.particles.push(new Particle(x, y, vx, vy, life, color, 2 + Math.random() * 3));
        }
    }

    /** Score popup floating text */
    addFloatingText(x, y, text, color) {
        // We store text particles separately - they have a text field
        var p = new Particle(x, y, 0, -60, 1.2, color, 0);
        p.text = text;
        this.particles.push(p);
    }

    /** Render text particles (separate pass) */
    renderText(ctx) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px monospace';
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            if (!p.text) continue;
            var alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.x, p.y);
        }
        ctx.globalAlpha = 1;
    }

    shake(amount) {
        this.screenShake = Math.max(this.screenShake, amount);
    }
}
