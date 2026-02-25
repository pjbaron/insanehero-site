/**
 * Effects - Particles, screen shake, capture animations, score popups
 */

var Effects = (function() {

    var particles = [];
    var shakeX = 0;
    var shakeY = 0;
    var shakeIntensity = 0;
    var shakeDuration = 0;
    var shakeTimer = 0;
    var popups = [];
    var flipAnimations = [];
    var pulseAnimations = [];
    var flashAlpha = 0;
    var flashColor = '#fff';

    function update(dt) {
        // Update particles
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            p.size *= (1 - dt * p.shrink);
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }

        // Update screen shake
        if (shakeTimer > 0) {
            shakeTimer -= dt;
            var t = shakeTimer / shakeDuration;
            var intensity = shakeIntensity * t;
            shakeX = (Math.random() - 0.5) * 2 * intensity;
            shakeY = (Math.random() - 0.5) * 2 * intensity;
            if (shakeTimer <= 0) {
                shakeX = 0;
                shakeY = 0;
            }
        }

        // Update popups
        for (var i = popups.length - 1; i >= 0; i--) {
            var pop = popups[i];
            pop.y -= 40 * dt;
            pop.life -= dt;
            pop.alpha = Math.max(0, pop.life / pop.maxLife);
            pop.scale = 1 + (1 - pop.alpha) * 0.3;
            if (pop.life <= 0) {
                popups.splice(i, 1);
            }
        }

        // Update flip animations
        for (var i = flipAnimations.length - 1; i >= 0; i--) {
            var f = flipAnimations[i];
            f.timer += dt;
            f.progress = Math.min(1, f.timer / f.duration);
            if (f.progress >= 1) {
                flipAnimations.splice(i, 1);
            }
        }

        // Update pulse animations
        for (var i = pulseAnimations.length - 1; i >= 0; i--) {
            var pa = pulseAnimations[i];
            pa.timer += dt;
            pa.progress = Math.min(1, pa.timer / pa.duration);
            if (pa.progress >= 1) {
                pulseAnimations.splice(i, 1);
            }
        }

        // Update flash
        if (flashAlpha > 0) {
            flashAlpha -= dt * 3;
            if (flashAlpha < 0) flashAlpha = 0;
        }
    }

    function spawnParticles(x, y, color, count, speed, size) {
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var spd = speed * (0.3 + Math.random() * 0.7);
            particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                gravity: 50 + Math.random() * 50,
                size: size * (0.5 + Math.random() * 0.5),
                color: color,
                life: 0.4 + Math.random() * 0.6,
                maxLife: 0.8,
                alpha: 1,
                shrink: 0.5
            });
        }
    }

    function spawnCaptureEffect(x, y, color, cascadeLevel) {
        var count = 8 + cascadeLevel * 4;
        var speed = 80 + cascadeLevel * 30;
        spawnParticles(x, y, color, count, speed, 4 + cascadeLevel);
    }

    function addShake(intensity, duration) {
        shakeIntensity = Math.max(shakeIntensity, intensity);
        shakeDuration = duration;
        shakeTimer = duration;
    }

    function addPopup(x, y, text, color) {
        popups.push({
            x: x,
            y: y,
            text: text,
            color: color || '#fff',
            life: 1.2,
            maxLife: 1.2,
            alpha: 1,
            scale: 1
        });
    }

    function addFlipAnimation(x, y, fromColor, toColor, delay) {
        flipAnimations.push({
            x: x,
            y: y,
            fromColor: fromColor,
            toColor: toColor,
            timer: -delay,
            duration: 0.35,
            progress: 0
        });
    }

    function addPulse(x, y, color, maxRadius) {
        pulseAnimations.push({
            x: x,
            y: y,
            color: color,
            maxRadius: maxRadius || 40,
            timer: 0,
            duration: 0.5,
            progress: 0
        });
    }

    function screenFlash(color) {
        flashColor = color;
        flashAlpha = 0.4;
    }

    function renderParticles(ctx) {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function renderPopups(ctx) {
        for (var i = 0; i < popups.length; i++) {
            var pop = popups[i];
            ctx.globalAlpha = pop.alpha;
            ctx.fillStyle = pop.color;
            ctx.font = 'bold ' + Math.floor(20 * pop.scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Outline
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(pop.text, pop.x, pop.y);
            ctx.fillText(pop.text, pop.x, pop.y);
        }
        ctx.globalAlpha = 1;
    }

    function renderPulses(ctx) {
        for (var i = 0; i < pulseAnimations.length; i++) {
            var pa = pulseAnimations[i];
            if (pa.progress < 0) continue;
            var r = pa.maxRadius * pa.progress;
            ctx.globalAlpha = (1 - pa.progress) * 0.4;
            ctx.strokeStyle = pa.color;
            ctx.lineWidth = 3 * (1 - pa.progress);
            ctx.beginPath();
            ctx.arc(pa.x, pa.y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function renderFlash(ctx, w, h) {
        if (flashAlpha > 0) {
            ctx.globalAlpha = flashAlpha;
            ctx.fillStyle = flashColor;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }
    }

    function getShakeOffset() {
        return { x: shakeX, y: shakeY };
    }

    function getFlipAnimations() {
        return flipAnimations;
    }

    function clear() {
        particles.length = 0;
        popups.length = 0;
        flipAnimations.length = 0;
        pulseAnimations.length = 0;
        shakeX = 0;
        shakeY = 0;
        shakeTimer = 0;
        flashAlpha = 0;
    }

    return {
        update: update,
        spawnParticles: spawnParticles,
        spawnCaptureEffect: spawnCaptureEffect,
        addShake: addShake,
        addPopup: addPopup,
        addFlipAnimation: addFlipAnimation,
        addPulse: addPulse,
        screenFlash: screenFlash,
        renderParticles: renderParticles,
        renderPopups: renderPopups,
        renderPulses: renderPulses,
        renderFlash: renderFlash,
        getShakeOffset: getShakeOffset,
        getFlipAnimations: getFlipAnimations,
        clear: clear
    };
})();
