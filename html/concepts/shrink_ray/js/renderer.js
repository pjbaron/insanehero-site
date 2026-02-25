/**
 * Renderer - Drawing helpers for Shrink Ray
 * Non-module global. Provides rendering for all entity types, HUD, and effects.
 */

var Renderer = {
    shakeX: 0,
    shakeY: 0,
    shakeTimer: 0,
    shakeIntensity: 0,

    shake: function(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    },

    updateShake: function(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            var t = this.shakeTimer > 0 ? this.shakeIntensity * (this.shakeTimer / 0.3) : 0;
            this.shakeX = (Math.random() - 0.5) * t * 2;
            this.shakeY = (Math.random() - 0.5) * t * 2;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    },

    applyShake: function(ctx) {
        if (this.shakeX !== 0 || this.shakeY !== 0) {
            ctx.translate(this.shakeX, this.shakeY);
        }
    },

    // ---- Background ----
    drawBackground: function(ctx, w, h, time) {
        // Deep space gradient
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a0a1a');
        grad.addColorStop(0.5, '#0d0d2b');
        grad.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Subtle grid lines scrolling left
        ctx.strokeStyle = 'rgba(40, 40, 80, 0.3)';
        ctx.lineWidth = 1;
        var gridSize = 60;
        var offset = (time * 30) % gridSize;
        for (var x = -offset; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (var y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    },

    // ---- Player ----
    drawPlayer: function(ctx, player) {
        var x = player.x;
        var y = player.y;
        var w = player.w;
        var h = player.h;

        // Trail
        ctx.globalAlpha = 0.15;
        for (var i = 0; i < player.trail.length - 1; i++) {
            var t = player.trail[i];
            var alpha = (i / player.trail.length) * 0.15;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(t.x - w / 2, t.y - h / 2, w, h);
        }
        ctx.globalAlpha = 1;

        // Body
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.shadowBlur = 0;

        // Eye / aiming indicator
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + w / 2 - 6, y - 4, 8, 8);
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(x + w / 2 - 3, y - 2, 4, 4);

        // Reverse ray indicator
        if (player.hasReverseRay) {
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 8;
            ctx.strokeRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
            ctx.shadowBlur = 0;
        }

        // Invulnerability flash
        if (player.invulnTimer > 0 && Math.floor(player.invulnTimer * 10) % 2) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - w / 2, y - h / 2, w, h);
            ctx.globalAlpha = 1;
        }
    },

    // ---- Obstacle ----
    drawObstacle: function(ctx, obs) {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.rotation);

        // Shrink flash
        if (obs.shrinking) {
            ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = obs.color;
        if (obs.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, obs.r, 0, Math.PI * 2);
            ctx.fill();
            // Accent ring
            ctx.strokeStyle = obs.accent;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (obs.shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(0, -obs.r);
            ctx.lineTo(obs.r, 0);
            ctx.lineTo(0, obs.r);
            ctx.lineTo(-obs.r, 0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = obs.accent;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // rect
            ctx.fillRect(-obs.r, -obs.r, obs.r * 2, obs.r * 2);
            ctx.strokeStyle = obs.accent;
            ctx.lineWidth = 2;
            ctx.strokeRect(-obs.r, -obs.r, obs.r * 2, obs.r * 2);
            // Cross detail
            ctx.strokeStyle = obs.accent;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-obs.r, -obs.r);
            ctx.lineTo(obs.r, obs.r);
            ctx.moveTo(obs.r, -obs.r);
            ctx.lineTo(-obs.r, obs.r);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ---- Ricochet ----
    drawRicochet: function(ctx, ric) {
        ctx.save();
        ctx.translate(ric.x, ric.y);
        ctx.rotate(ric.rotation);

        // Growing flash
        if (ric.growing) {
            ctx.globalAlpha = 1 - ric.growTimer / 0.3;
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 20;
        } else if (ric.flash > 0) {
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 8;
        }

        // Warning glow when old
        if (ric.age > ric.maxAge - 3) {
            var blink = Math.sin(ric.age * 10) > 0 ? 0.5 : 1;
            ctx.globalAlpha = blink;
        }

        ctx.fillStyle = ric.flash > 0 ? '#fff' : ric.color;

        if (ric.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, ric.r, 0, Math.PI * 2);
            ctx.fill();
        } else if (ric.shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(0, -ric.r);
            ctx.lineTo(ric.r, 0);
            ctx.lineTo(0, ric.r);
            ctx.lineTo(-ric.r, 0);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(-ric.r, -ric.r, ric.r * 2, ric.r * 2);
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ---- Beam ----
    drawBeam: function(ctx, beam) {
        var alpha = beam.life / beam.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Main beam
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3 * alpha + 1;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(beam.sx, beam.sy);
        ctx.lineTo(beam.ex, beam.ey);
        ctx.stroke();

        // Outer glow
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 8 * alpha;
        ctx.beginPath();
        ctx.moveTo(beam.sx, beam.sy);
        ctx.lineTo(beam.ex, beam.ey);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    },

    // ---- Pickup ----
    drawPickup: function(ctx, pk) {
        var dy = Math.sin(pk.bobPhase) * 5;
        var px = pk.x;
        var py = pk.y + dy;
        var pulse = 1 + Math.sin(pk.age * 5) * 0.15;
        var r = pk.r * pulse;

        // Glow
        ctx.shadowColor = '#2ecc71';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Arrow icon (reverse)
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.floor(r * 1.2) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('R', px, py + 1);
    },

    // ---- Particle ----
    drawParticle: function(ctx, p) {
        var alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    },

    // ---- Floating Text ----
    drawFloatingText: function(ctx, ft) {
        var alpha = ft.life / ft.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold ' + ft.size + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
    },

    // ---- HUD ----
    drawHUD: function(ctx, w, h, score, combo, comboTimer, comboWindow, highScore, ricCount, hasReverse, reverseTimer, playTime) {
        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(Math.floor(score), 20, 15);

        // High score
        if (highScore > 0) {
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText('BEST: ' + Math.floor(highScore), 20, 48);
        }

        // Combo
        if (combo > 1) {
            var comboAlpha = Math.min(1, comboTimer / (comboWindow * 0.3));
            ctx.globalAlpha = comboAlpha;
            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = combo >= 5 ? '#f1c40f' : combo >= 3 ? '#e67e22' : '#e74c3c';
            ctx.textAlign = 'left';
            ctx.fillText('x' + combo, 20, 68);

            // Combo timer bar
            var barW = 60;
            var barH = 4;
            var barX = 20;
            var barY = 92;
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = combo >= 5 ? '#f1c40f' : combo >= 3 ? '#e67e22' : '#e74c3c';
            ctx.fillRect(barX, barY, barW * (comboTimer / comboWindow), barH);
            ctx.globalAlpha = 1;
        }

        // Ricochet count (top right)
        ctx.textAlign = 'right';
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('RICOCHETS: ' + ricCount, w - 20, 15);

        // Reverse ray indicator
        if (hasReverse) {
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#2ecc71';
            ctx.textAlign = 'right';
            ctx.fillText('REVERSE RAY [' + Math.ceil(reverseTimer) + 's]', w - 20, 35);
        }
    },

    // ---- Crosshair (desktop only) ----
    drawCrosshair: function(ctx, x, y) {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
        ctx.lineWidth = 1;
        var s = 12;
        ctx.beginPath();
        ctx.moveTo(x - s, y); ctx.lineTo(x - s / 3, y);
        ctx.moveTo(x + s / 3, y); ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s); ctx.lineTo(x, y - s / 3);
        ctx.moveTo(x, y + s / 3); ctx.lineTo(x, y + s);
        ctx.stroke();
    },

    // ---- Menu ----
    drawMenu: function(ctx, w, h, time, highScore) {
        this.drawBackground(ctx, w, h, time);

        // Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title glow
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold ' + Math.min(60, w * 0.1) + 'px sans-serif';
        ctx.fillText('SHRINK RAY', w / 2, h * 0.32);
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = '#aaa';
        ctx.font = Math.min(18, w * 0.035) + 'px sans-serif';
        ctx.fillText('Zap to shrink. Dodge the chaos.', w / 2, h * 0.42);

        // Pulsing start prompt
        var pulse = 0.6 + Math.sin(time * 3) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.min(22, w * 0.04) + 'px sans-serif';
        ctx.fillText('TAP TO START', w / 2, h * 0.58);
        ctx.globalAlpha = 1;

        // Controls hint
        ctx.fillStyle = '#666';
        ctx.font = Math.min(14, w * 0.025) + 'px sans-serif';
        ctx.fillText('Tap objects to shrink | Drag to dodge', w / 2, h * 0.68);

        // High score
        if (highScore > 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.font = 'bold ' + Math.min(18, w * 0.03) + 'px sans-serif';
            ctx.fillText('BEST: ' + Math.floor(highScore), w / 2, h * 0.78);
        }
    },

    // ---- Game Over ----
    drawGameOver: function(ctx, w, h, score, highScore, isNewBest, time) {
        // Dim overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Game over text
        ctx.fillStyle = '#e74c3c';
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 15;
        ctx.font = 'bold ' + Math.min(52, w * 0.09) + 'px sans-serif';
        ctx.fillText('GAME OVER', w / 2, h * 0.3);
        ctx.shadowBlur = 0;

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.min(36, w * 0.06) + 'px sans-serif';
        ctx.fillText(Math.floor(score), w / 2, h * 0.45);

        // New best
        if (isNewBest) {
            var flash = Math.sin(time * 5) > 0 ? '#f1c40f' : '#e67e22';
            ctx.fillStyle = flash;
            ctx.font = 'bold ' + Math.min(20, w * 0.035) + 'px sans-serif';
            ctx.fillText('NEW BEST!', w / 2, h * 0.53);
        } else if (highScore > 0) {
            ctx.fillStyle = '#888';
            ctx.font = Math.min(16, w * 0.03) + 'px sans-serif';
            ctx.fillText('BEST: ' + Math.floor(highScore), w / 2, h * 0.53);
        }

        // Restart prompt
        var pulse = 0.5 + Math.sin(time * 3) * 0.5;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.min(20, w * 0.035) + 'px sans-serif';
        ctx.fillText('TAP TO RETRY', w / 2, h * 0.68);
        ctx.globalAlpha = 1;
    }
};
