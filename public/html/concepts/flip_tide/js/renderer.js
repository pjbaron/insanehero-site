/**
 * Renderer - Procedural canvas drawing for Flip Tide
 * All drawing in virtual coordinates, caller handles scale transform
 */

var Renderer = {
    time: 0,

    update(dt) {
        this.time += dt;
    },

    // ---- Background ----
    drawBackground(ctx, w, h, caveTop, caveBottom, surfaceY, ceilingY, scrollX, riptideZones, inRiptide) {
        // Sky / above cave
        var skyGrad = ctx.createLinearGradient(0, 0, 0, caveTop);
        skyGrad.addColorStop(0, '#0a1628');
        skyGrad.addColorStop(1, '#0d2137');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, caveTop);

        // Cave interior
        var caveGrad = ctx.createLinearGradient(0, caveTop, 0, caveBottom);
        if (inRiptide) {
            caveGrad.addColorStop(0, '#1a0a2e');
            caveGrad.addColorStop(0.5, '#0d1b3e');
            caveGrad.addColorStop(1, '#1a0a2e');
        } else {
            caveGrad.addColorStop(0, '#0a2a4a');
            caveGrad.addColorStop(0.5, '#0d3b5c');
            caveGrad.addColorStop(1, '#0a2a4a');
        }
        ctx.fillStyle = caveGrad;
        ctx.fillRect(0, caveTop, w, caveBottom - caveTop);

        // Below cave
        ctx.fillStyle = '#050d18';
        ctx.fillRect(0, caveBottom, w, h - caveBottom);

        // Water surface line
        this._drawWaterSurface(ctx, w, surfaceY, scrollX, caveTop);

        // Ceiling rock line
        this._drawCeilingLine(ctx, w, ceilingY, scrollX, caveBottom);

        // Riptide zone overlays
        for (var i = 0; i < riptideZones.length; i++) {
            var rz = riptideZones[i];
            if (!rz.active) continue;
            var rzScreenX = rz.x - scrollX;
            var rzEnd = rzScreenX + rz.width;
            if (rzEnd < 0 || rzScreenX > w) continue;
            var drawX = Math.max(0, rzScreenX);
            var drawW = Math.min(w, rzEnd) - drawX;
            ctx.fillStyle = 'rgba(138, 43, 226, 0.08)';
            ctx.fillRect(drawX, caveTop, drawW, caveBottom - caveTop);
            // Animated streaks
            ctx.strokeStyle = 'rgba(138, 43, 226, 0.15)';
            ctx.lineWidth = 1;
            for (var s = 0; s < 8; s++) {
                var sy = caveTop + (caveBottom - caveTop) * (s / 8) + Math.sin(this.time * 3 + s) * 10;
                var sx = drawX + (this.time * 80 + s * 47) % drawW;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - 30, sy);
                ctx.stroke();
            }
        }

        // Ambient bubbles
        this._drawBubbles(ctx, w, caveTop, caveBottom, scrollX);
    },

    _drawWaterSurface(ctx, w, surfaceY, scrollX, caveTop) {
        ctx.beginPath();
        ctx.moveTo(0, caveTop);
        for (var x = 0; x <= w; x += 8) {
            var wave = Math.sin((x + scrollX * 0.3) * 0.02 + this.time * 2) * 4
                     + Math.sin((x + scrollX * 0.5) * 0.035 + this.time * 1.3) * 2;
            ctx.lineTo(x, surfaceY + wave - 20);
        }
        ctx.lineTo(w, caveTop);
        ctx.closePath();
        var waterGrad = ctx.createLinearGradient(0, surfaceY - 30, 0, surfaceY);
        waterGrad.addColorStop(0, 'rgba(0, 100, 200, 0.3)');
        waterGrad.addColorStop(1, 'rgba(0, 150, 255, 0.5)');
        ctx.fillStyle = waterGrad;
        ctx.fill();

        // Surface highlight
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var x = 0; x <= w; x += 4) {
            var wave = Math.sin((x + scrollX * 0.3) * 0.02 + this.time * 2) * 4
                     + Math.sin((x + scrollX * 0.5) * 0.035 + this.time * 1.3) * 2;
            if (x === 0) ctx.moveTo(x, surfaceY + wave - 20);
            else ctx.lineTo(x, surfaceY + wave - 20);
        }
        ctx.stroke();
    },

    _drawCeilingLine(ctx, w, ceilingY, scrollX, caveBottom) {
        ctx.beginPath();
        ctx.moveTo(0, caveBottom);
        for (var x = 0; x <= w; x += 8) {
            var jagged = Math.sin((x + scrollX * 0.2) * 0.04) * 6
                       + Math.sin((x + scrollX * 0.4) * 0.08) * 3;
            ctx.lineTo(x, ceilingY + jagged + 20);
        }
        ctx.lineTo(w, caveBottom);
        ctx.closePath();
        var rockGrad = ctx.createLinearGradient(0, ceilingY, 0, ceilingY + 30);
        rockGrad.addColorStop(0, 'rgba(80, 50, 30, 0.6)');
        rockGrad.addColorStop(1, 'rgba(40, 25, 15, 0.3)');
        ctx.fillStyle = rockGrad;
        ctx.fill();

        // Rock edge
        ctx.strokeStyle = 'rgba(120, 80, 40, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var x = 0; x <= w; x += 4) {
            var jagged = Math.sin((x + scrollX * 0.2) * 0.04) * 6
                       + Math.sin((x + scrollX * 0.4) * 0.08) * 3;
            if (x === 0) ctx.moveTo(x, ceilingY + jagged + 20);
            else ctx.lineTo(x, ceilingY + jagged + 20);
        }
        ctx.stroke();
    },

    _drawBubbles(ctx, w, caveTop, caveBottom, scrollX) {
        ctx.fillStyle = 'rgba(150, 220, 255, 0.15)';
        for (var i = 0; i < 15; i++) {
            var bx = ((i * 137 + scrollX * 0.1) % w);
            var by = caveTop + ((i * 89 + this.time * 20) % (caveBottom - caveTop));
            var br = 1.5 + Math.sin(i + this.time) * 1;
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // ---- Surfer ----
    drawSurfer(ctx, surfer, skin) {
        if (surfer.dead) return;
        ctx.save();
        ctx.translate(surfer.x, surfer.y);
        ctx.rotate(surfer.angle);

        var s = skin || SKINS[0];

        // Trail
        if (surfer.trail.length > 1) {
            for (var i = 1; i < surfer.trail.length; i++) {
                var t = surfer.trail[i];
                var alpha = (1 - i / surfer.trail.length) * 0.4;
                var size = (1 - i / surfer.trail.length) * 4;
                ctx.fillStyle = 'rgba(' + s.trailColor[0] + ',' + s.trailColor[1] + ',' + s.trailColor[2] + ',' + alpha + ')';
                ctx.beginPath();
                ctx.arc(t.x - surfer.x, t.y - surfer.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Board
        ctx.fillStyle = s.boardColor;
        ctx.beginPath();
        ctx.ellipse(0, surfer.lane === 0 ? 4 : -4, surfer.width / 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = s.bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = s.bodyColor;
        ctx.beginPath();
        var headDir = surfer.lane === 0 ? -1 : 1;
        ctx.arc(3, headDir * 8, 5, 0, Math.PI * 2);
        ctx.fill();

        // Near miss glow
        if (surfer.nearMissTimer > 0) {
            var glowAlpha = surfer.nearMissTimer * 2;
            ctx.shadowColor = 'rgba(255, 255, 100, ' + glowAlpha + ')';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = 'rgba(255, 255, 100, ' + glowAlpha + ')';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, surfer.width / 2 + 4, surfer.height + 2, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    },

    // ---- Obstacle ----
    drawObstacle(ctx, obs, scrollX, surfaceY, ceilingY, caveTop, caveBottom) {
        if (!obs.active) return;
        var screenX = obs.x - scrollX;
        if (screenX < -60 || screenX > 860) return;

        ctx.save();
        if (obs.lane === 0) {
            // Surface wave - blocks the surface lane
            var baseY = surfaceY + 8;  // Extend slightly past surface
            var topY = caveTop;
            ctx.fillStyle = 'rgba(0, 120, 200, 0.7)';

            // Wavy obstacle shape
            ctx.beginPath();
            ctx.moveTo(screenX - obs.width / 2, baseY);
            for (var i = 0; i <= obs.spikes; i++) {
                var frac = i / obs.spikes;
                var px = screenX - obs.width / 2 + frac * obs.width;
                var peakH = (baseY - topY) * (0.6 + 0.4 * Math.sin(obs.seed + frac * 5));
                var py = baseY - peakH;
                ctx.lineTo(px, py);
            }
            ctx.lineTo(screenX + obs.width / 2, baseY);
            ctx.closePath();
            ctx.fill();

            // Foam edge
            ctx.strokeStyle = 'rgba(200, 230, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Ceiling coral - blocks the ceiling lane
            var topY = ceilingY - 8;  // Extend slightly past ceiling
            var bottomY = caveBottom;
            // Coral colors
            var colors = ['rgba(255, 100, 80, 0.7)', 'rgba(200, 60, 100, 0.7)', 'rgba(255, 140, 60, 0.7)'];
            ctx.fillStyle = colors[Math.floor(obs.seed) % 3];

            ctx.beginPath();
            ctx.moveTo(screenX - obs.width / 2, topY);
            for (var i = 0; i <= obs.spikes; i++) {
                var frac = i / obs.spikes;
                var px = screenX - obs.width / 2 + frac * obs.width;
                var peakH = (bottomY - topY) * (0.5 + 0.5 * Math.sin(obs.seed + frac * 4));
                var py = topY + peakH;
                ctx.lineTo(px, py);
            }
            ctx.lineTo(screenX + obs.width / 2, topY);
            ctx.closePath();
            ctx.fill();

            // Coral detail
            ctx.strokeStyle = 'rgba(255, 200, 180, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    },

    // ---- Shell ----
    drawShell(ctx, shell, scrollX) {
        if (shell.collected || !shell.active) return;
        var screenX = shell.x - scrollX;
        if (screenX < -20 || screenX > 820) return;

        var bob = Math.sin(shell.bobPhase) * 4;
        var sy = shell.y + bob;

        ctx.save();
        ctx.translate(screenX, sy);

        // Glow
        ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
        ctx.shadowBlur = 10;

        // Shell body
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(0, -shell.size);
        for (var i = 0; i < 7; i++) {
            var a = (i / 7) * Math.PI * 2 - Math.PI / 2;
            var r = shell.size * (i % 2 === 0 ? 1 : 0.6);
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();

        // Sparkle
        var sparkleAlpha = 0.3 + Math.sin(shell.sparkle) * 0.3;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + sparkleAlpha + ')';
        ctx.beginPath();
        ctx.arc(3, -3, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
    },

    // ---- Particles ----
    drawParticles(ctx, particles) {
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + p.a + ')';
            if (p.type === 'square') {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.a, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },

    // ---- UI / HUD ----
    drawHUD(ctx, w, h, distance, shells, bestDistance, combo, surfer) {
        ctx.save();
        // Distance
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(Math.floor(distance) + 'm', 15, 30);

        // Best
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('BEST: ' + Math.floor(bestDistance) + 'm', 15, 48);

        // Shells
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(shells + ' shells', w - 15, 30);

        // Combo
        if (combo > 1) {
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 100, 0.9)';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('x' + combo + ' COMBO', w / 2, 30);
        }
        ctx.restore();
    },

    drawMenu(ctx, w, h) {
        // Background
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a1628');
        grad.addColorStop(0.5, '#0d3b5c');
        grad.addColorStop(1, '#0a2a4a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Animated waves
        for (var layer = 0; layer < 3; layer++) {
            ctx.fillStyle = 'rgba(0, 100, 200, ' + (0.1 + layer * 0.05) + ')';
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (var x = 0; x <= w; x += 5) {
                var yy = h * 0.6 + layer * 20 + Math.sin(x * 0.01 + this.time * (1 + layer * 0.3) + layer) * 15;
                ctx.lineTo(x, yy);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();
        }

        // Title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title glow
        ctx.shadowColor = '#00BFFF';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 52px sans-serif';
        ctx.fillText('FLIP TIDE', w / 2, h * 0.3);
        ctx.shadowBlur = 0;

        // Subtitle
        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.font = '18px sans-serif';
        ctx.fillText('Tap to flip between surface and ceiling', w / 2, h * 0.3 + 40);

        // Tap prompt with pulse
        var pulse = 0.5 + Math.sin(this.time * 3) * 0.3;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + pulse + ')';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('TAP TO START', w / 2, h * 0.65);

        // Surfer preview
        ctx.fillStyle = '#FFD700';
        var previewY = h * 0.48 + Math.sin(this.time * 2) * 8;
        ctx.beginPath();
        ctx.ellipse(w / 2, previewY, 12, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.ellipse(w / 2, previewY + 6, 20, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    drawGameOver(ctx, w, h, distance, bestDistance, shells, totalShells, isNewBest) {
        // Dim overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Game Over
        ctx.fillStyle = '#FF4757';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText('WIPEOUT!', w / 2, h * 0.25);

        // Distance
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(Math.floor(distance) + 'm', w / 2, h * 0.38);

        if (isNewBest) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 18px sans-serif';
            ctx.fillText('NEW BEST!', w / 2, h * 0.44);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '16px sans-serif';
            ctx.fillText('Best: ' + Math.floor(bestDistance) + 'm', w / 2, h * 0.44);
        }

        // Shells collected
        ctx.fillStyle = '#FFD700';
        ctx.font = '20px sans-serif';
        ctx.fillText('Shells: +' + shells + ' (Total: ' + totalShells + ')', w / 2, h * 0.54);

        // Restart prompt
        var pulse = 0.5 + Math.sin(this.time * 3) * 0.3;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + pulse + ')';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('TAP TO RETRY', w / 2, h * 0.72);

        ctx.restore();
    },

    // ---- Riptide warning ----
    drawRiptideWarning(ctx, w, h, caveTop, caveBottom) {
        var flash = Math.sin(this.time * 8) > 0;
        if (!flash) return;
        ctx.fillStyle = 'rgba(138, 43, 226, 0.15)';
        ctx.fillRect(0, caveTop, w, caveBottom - caveTop);
        ctx.fillStyle = 'rgba(138, 43, 226, 0.8)';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RIPTIDE!', w / 2, (caveTop + caveBottom) / 2);
    },

    // ---- Score popup ----
    drawPopups(ctx, popups) {
        for (var i = 0; i < popups.length; i++) {
            var p = popups[i];
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color || '#FFD700';
            ctx.font = 'bold ' + p.size + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }
    }
};
