/**
 * Renderer for Stack Thief
 * All canvas drawing logic in one place
 */

var Renderer = {
    stars: [],

    initStars(count) {
        this.stars = [];
        for (var i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * 400,
                y: Math.random() * 300,
                size: 0.5 + Math.random() * 1.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    },

    drawBackground(ctx, w, h, time) {
        // Gradient sky
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Stars
        for (var i = 0; i < this.stars.length; i++) {
            var s = this.stars[i];
            var alpha = 0.3 + 0.4 * Math.sin(time * 0.8 + s.twinkle);
            ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
            ctx.beginPath();
            // Stars are in 400-unit virtual space, scale them
            var sx = s.x * (w / 400);
            var sy = s.y * (h / 600);
            ctx.arc(sx, sy, s.size * (w / 400), 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawGround(ctx, w, h, groundY, scale, cameraY) {
        var gy = (groundY + cameraY) * scale;
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, gy, w, h - gy + 200);
        // Highlight line
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
    },

    drawTower(ctx, tower, scale, cameraY) {
        if (tower.isCollapsed) {
            this._drawCollapsedTower(ctx, tower, scale, cameraY);
            return;
        }

        var positions = TowerFactory.getBlockWorldPositions(tower);

        // Tower base footing
        var baseX = tower.x * scale;
        var baseY = (tower.baseY + cameraY) * scale;
        ctx.fillStyle = tower.isPlayer ? '#556677' : '#555';
        ctx.beginPath();
        ctx.moveTo(baseX - 20 * scale, baseY);
        ctx.lineTo(baseX + 20 * scale, baseY);
        ctx.lineTo(baseX + 12 * scale, baseY - 8 * scale);
        ctx.lineTo(baseX - 12 * scale, baseY - 8 * scale);
        ctx.closePath();
        ctx.fill();

        // Highlight glow when block stolen from this tower
        if (tower.highlightTimer > 0) {
            ctx.save();
            ctx.globalAlpha = tower.highlightTimer / 0.3 * 0.3;
            ctx.fillStyle = '#ff8800';
            for (var j = 0; j < positions.length; j++) {
                var hp = positions[j];
                var hx = hp.x * scale;
                var hy = (hp.y + cameraY) * scale;
                ctx.save();
                ctx.translate(hx, hy);
                ctx.rotate(hp.angle);
                var hw = (hp.block.width / 2 + 4) * scale;
                var hh = (BLOCK_HEIGHT / 2 + 4) * scale;
                ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
                ctx.restore();
            }
            ctx.restore();
        }

        // Draw blocks
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            this.drawBlock(ctx, pos.block, pos.x, pos.y, pos.angle, scale, cameraY, tower.isPlayer);
        }

        // Player tower flag
        if (tower.isPlayer && positions.length > 0) {
            var top = positions[positions.length - 1];
            var tx = top.x * scale;
            var ty = (top.y + cameraY) * scale - BLOCK_HEIGHT * scale * 0.6;
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold ' + Math.round(12 * scale) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('YOU', tx, ty);
        }
    },

    drawBlock(ctx, block, wx, wy, angle, scale, cameraY, isPlayer) {
        var sx = wx * scale;
        var sy = (wy + cameraY) * scale;
        var hw = (block.width / 2) * scale;
        var hh = (BLOCK_HEIGHT / 2) * scale;
        var r = 4 * scale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.globalAlpha = block.opacity;

        // Block body
        ctx.fillStyle = block.color;
        this._roundRect(ctx, -hw, -hh, hw * 2, hh * 2, r);
        ctx.fill();

        // Top edge highlight
        ctx.fillStyle = block.topColor;
        this._roundRect(ctx, -hw, -hh, hw * 2, hh * 0.5, r);
        ctx.fill();

        // Border
        ctx.strokeStyle = block.outlineColor;
        ctx.lineWidth = 2 * scale;
        this._roundRect(ctx, -hw, -hh, hw * 2, hh * 2, r);
        ctx.stroke();

        // Player tower golden border
        if (isPlayer) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.lineWidth = 1 * scale;
            this._roundRect(ctx, -hw + 2 * scale, -hh + 2 * scale, hw * 2 - 4 * scale, hh * 2 - 4 * scale, r);
            ctx.stroke();
        }

        // Flash on steal land
        if (block.flashTimer > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (block.flashTimer / 0.15 * 0.6) + ')';
            this._roundRect(ctx, -hw, -hh, hw * 2, hh * 2, r);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    _drawCollapsedTower(ctx, tower, scale, cameraY) {
        for (var i = 0; i < tower.blocks.length; i++) {
            var block = tower.blocks[i];
            if (block.opacity <= 0) continue;
            this.drawBlock(ctx, block, block.x, block.y, block.angle, scale, cameraY, false);
        }
    },

    drawFlyingBlock(ctx, block, scale, cameraY, time) {
        // Apply easeOutBack to the progress for smooth arc
        var raw = block.flyProgress;
        var c1 = 1.70158;
        var c3 = c1 + 1;
        var t = 1 + c3 * Math.pow(raw - 1, 3) + c1 * Math.pow(raw - 1, 2);
        t = Math.max(0, Math.min(1, t));
        for (var trail = 2; trail >= 0; trail--) {
            var tt = Math.max(0, t - trail * 0.06);
            var tx = this._bezierPoint(block.startX, block.flyControlX, block.targetX, tt);
            var ty = this._bezierPoint(block.startY, block.flyControlY, block.targetY, tt);
            var alpha = (1 - trail * 0.3) * 0.4;
            ctx.save();
            ctx.globalAlpha = alpha;
            var sx = tx * scale;
            var sy = (ty + cameraY) * scale;
            var hw = (block.width / 2) * scale;
            var hh = (BLOCK_HEIGHT / 2) * scale;
            ctx.translate(sx, sy);
            ctx.rotate(tt * Math.PI * 2);
            ctx.fillStyle = block.color;
            this._roundRect(ctx, -hw, -hh, hw * 2, hh * 2, 4 * scale);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // Main block
        var bx = this._bezierPoint(block.startX, block.flyControlX, block.targetX, t);
        var by = this._bezierPoint(block.startY, block.flyControlY, block.targetY, t);
        var angle = t * Math.PI * 2;
        this.drawBlock(ctx, block, bx, by, angle, scale, cameraY, false);
    },

    _bezierPoint(p0, p1, p2, t) {
        var mt = 1 - t;
        return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
    },

    drawGhostLine(ctx, y, w, timer, scale, cameraY) {
        var sy = (y + cameraY) * scale;
        var alpha = 0.2 + 0.15 * Math.sin(timer * Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, ' + alpha + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(w, sy);
        ctx.stroke();
        ctx.setLineDash([]);

        // "BEST" label
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (alpha + 0.1) + ')';
        ctx.font = 'bold ' + Math.round(11 * scale) + 'px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('BEST', w - 8, sy - 4);
    },

    drawUI(ctx, w, h, state) {
        // Score - top left
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('' + Math.floor(state.score), 20, 38);
        ctx.shadowBlur = 0;

        // Round
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Round ' + state.round, 20, 58);

        // Timer - top center
        var timeLeft = Math.max(0, Math.ceil(state.roundTimer));
        var timerPulse = 1.0;
        if (state.roundTimer < 10) {
            timerPulse = 1.0 + 0.15 * Math.sin(state.time * Math.PI * 4);
            ctx.fillStyle = '#ff4444';
        } else {
            ctx.fillStyle = '#fff';
        }
        ctx.font = 'bold ' + Math.round(36 * timerPulse) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText('' + timeLeft, w / 2, 44);
        ctx.shadowBlur = 0;

        // Combo
        if (state.comboCount >= 2) {
            this.drawComboText(ctx, state.comboCount, state.comboDisplayTimer, w / 2, h * 0.35);
        }

        // Danger indicator
        if (state.dangerActive) {
            var dAlpha = 0.1 + 0.08 * Math.sin(state.time * Math.PI * 6);
            ctx.fillStyle = 'rgba(255, 0, 0, ' + dAlpha + ')';
            // Vignette edges
            ctx.fillRect(0, 0, 15, h);
            ctx.fillRect(w - 15, 0, 15, h);
            ctx.fillRect(0, 0, w, 15);
            ctx.fillRect(0, h - 15, w, 15);

            // DANGER text
            ctx.fillStyle = 'rgba(255, 50, 50, ' + (0.5 + 0.5 * Math.sin(state.time * 8)) + ')';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!! DANGER !!', w / 2, h * 0.15);
        }

        // Earthquake vignette
        if (state.earthquakeIntensity > 0.3) {
            var vAlpha = (state.earthquakeIntensity - 0.3) * 0.15;
            ctx.fillStyle = 'rgba(0, 0, 0, ' + vAlpha + ')';
            ctx.fillRect(0, 0, 30, h);
            ctx.fillRect(w - 30, 0, 30, h);
        }
    },

    drawBraceIndicator(ctx, cooldown, maxCooldown, x, y, scale, isReady, braceActive) {
        var r = 14 * scale;
        var cx = x * scale;
        var cy = y * scale;

        // Background circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill();

        // Fill arc
        var progress = 1 - (cooldown / maxCooldown);
        if (isReady) progress = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = isReady ? 'rgba(60, 140, 255, 0.8)' : 'rgba(100, 100, 100, 0.6)';
        ctx.fill();

        // Brace active glow
        if (braceActive) {
            ctx.beginPath();
            ctx.arc(cx, cy, r + 4 * scale, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(60, 180, 255, 0.7)';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
        }

        // Shield icon
        ctx.fillStyle = isReady ? '#fff' : '#888';
        ctx.font = 'bold ' + Math.round(12 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('B', cx, cy + 1);
        ctx.textBaseline = 'alphabetic';
    },

    drawComboText(ctx, combo, timer, cx, cy) {
        if (timer <= 0) return;
        var scale, alpha;
        if (timer > 0.8) {
            // Scale up phase
            var t = 1 - (timer - 0.8) / 0.2;
            scale = 0.5 + t * 0.7;
        } else if (timer > 0.3) {
            scale = 1.2;
        } else {
            // Fade out
            scale = 1.2;
            alpha = timer / 0.3;
        }
        alpha = alpha !== undefined ? alpha : 1;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText('x' + combo + ' COMBO!', 0, 0);
        ctx.fillText('x' + combo + ' COMBO!', 0, 0);
        ctx.restore();
    },

    drawBraceShield(ctx, tower, scale, cameraY, alpha) {
        if (!tower.isPlayer || tower.isCollapsed) return;
        var positions = TowerFactory.getBlockWorldPositions(tower);
        if (positions.length === 0) return;

        ctx.save();
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = '#44aaff';
        ctx.lineWidth = 3 * scale;

        var topP = positions[positions.length - 1];
        var botP = positions[0];
        var topY = (topP.y - BLOCK_HEIGHT / 2 + cameraY) * scale;
        var botY = (botP.y + BLOCK_HEIGHT / 2 + cameraY) * scale;
        var cx = tower.x * scale;
        var hw = 50 * scale;

        ctx.beginPath();
        ctx.ellipse(cx, (topY + botY) / 2, hw, (botY - topY) / 2 + 10 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    },

    drawRoundStart(ctx, w, h, round, timer) {
        if (timer <= 0) return;
        var alpha = timer > 1.0 ? 1 : timer;
        var scale = 1;
        if (timer > 1.3) {
            scale = 0.5 + ((1.5 - timer) / 0.2) * 0.5;
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(w / 2, h * 0.4);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText('ROUND ' + round, 0, 0);
        ctx.fillText('ROUND ' + round, 0, 0);
        ctx.restore();
    },

    drawScorePopup(ctx, popup, scale, cameraY) {
        if (!popup || popup.timer <= 0) return;
        var alpha = Math.min(1, popup.timer / 0.3);
        var sy = (popup.y + cameraY - (1 - popup.timer / popup.maxTimer) * 30) * scale;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = popup.color || '#ffd700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.font = 'bold ' + Math.round(18 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(popup.text, popup.x * scale, sy);
        ctx.fillText(popup.text, popup.x * scale, sy);
        ctx.restore();
    },

    _roundRect(ctx, x, y, w, h, r) {
        if (r > h / 2) r = h / 2;
        if (r > w / 2) r = w / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
};
