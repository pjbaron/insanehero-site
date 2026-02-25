/**
 * Renderer - All drawing code
 * Virtual coordinate system 400x700, scaled to fit any screen
 */

var Renderer = {
    VW: 400,
    VH: 700,
    scale: 1,
    offsetX: 0,
    offsetY: 0,

    /**
     * Calculate scale and offset to fit virtual space in canvas
     */
    calcTransform(canvasW, canvasH) {
        var scaleX = canvasW / this.VW;
        var scaleY = canvasH / this.VH;
        this.scale = Math.min(scaleX, scaleY);
        this.offsetX = (canvasW - this.VW * this.scale) / 2;
        this.offsetY = (canvasH - this.VH * this.scale) / 2;
    },

    /**
     * Convert screen coords to virtual coords
     */
    screenToVirtual(sx, sy) {
        return {
            x: (sx - this.offsetX) / this.scale,
            y: (sy - this.offsetY) / this.scale
        };
    },

    /**
     * Begin frame - set up transform
     */
    beginFrame(ctx, canvasW, canvasH) {
        this.calcTransform(canvasW, canvasH);
        ctx.clearRect(0, 0, canvasW, canvasH);

        // Black letterbox
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvasW, canvasH);

        ctx.save();
        ctx.translate(this.offsetX + Particles.shakeX * this.scale, this.offsetY + Particles.shakeY * this.scale);
        ctx.scale(this.scale, this.scale);

        // Game area background gradient
        var grad = ctx.createLinearGradient(0, 0, 0, this.VH);
        grad.addColorStop(0, '#0d0d2b');
        grad.addColorStop(0.5, '#0a1628');
        grad.addColorStop(1, '#0d0d2b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.VW, this.VH);
    },

    /**
     * End frame - restore transform
     */
    endFrame(ctx) {
        ctx.restore();
    },

    /**
     * Draw side walls
     */
    drawWalls(ctx) {
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(0, 0, 5, this.VH);
        ctx.fillRect(this.VW - 5, 0, 5, this.VH);
    },

    /**
     * Draw the launcher/aiming area at top
     */
    drawLauncher(ctx, launchX, aiming) {
        // Launch zone background
        ctx.fillStyle = 'rgba(20, 30, 60, 0.8)';
        ctx.fillRect(0, 0, this.VW, 60);

        // Launch position indicator
        ctx.beginPath();
        ctx.arc(launchX, 35, 12, 0, Math.PI * 2);
        ctx.fillStyle = aiming ? '#4af' : '#357';
        ctx.fill();
        ctx.strokeStyle = '#6cf';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrow
        ctx.beginPath();
        ctx.moveTo(launchX, 48);
        ctx.lineTo(launchX - 5, 55);
        ctx.lineTo(launchX + 5, 55);
        ctx.closePath();
        ctx.fillStyle = '#4af';
        ctx.fill();
    },

    /**
     * Draw trajectory preview dots
     */
    drawTrajectory(ctx, points) {
        for (var i = 0; i < points.length; i++) {
            var alpha = 1 - i / points.length;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.arc(points[i].x, points[i].y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#4af';
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    /**
     * Draw a peg
     */
    drawPeg(ctx, peg, time) {
        if (peg.hit) {
            if (peg.alpha <= 0) return;
            ctx.globalAlpha = peg.alpha;
        }

        var x = peg.x, y = peg.y, r = peg.r;

        // Glow
        if (peg.glow > 0) {
            ctx.beginPath();
            ctx.arc(x, y, r + 4 + peg.glow * 3, 0, Math.PI * 2);
            ctx.fillStyle = peg.type === 'explosive' ? 'rgba(255,136,68,0.3)' :
                           peg.type === 'magnet' ? 'rgba(200,100,255,0.3)' :
                           'rgba(68,170,255,0.3)';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);

        if (peg.type === 'explosive') {
            ctx.fillStyle = peg.hit ? '#f84' : '#e63';
            ctx.fill();
            ctx.strokeStyle = '#fa5';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Star indicator
            if (!peg.hit) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('*', x, y + 1);
            }
        } else if (peg.type === 'magnet') {
            var pulse = Math.sin(time * 4) * 0.15 + 0.85;
            ctx.fillStyle = peg.hit ? '#d4f' : 'rgb(' + Math.floor(170 * pulse) + ',70,' + Math.floor(220 * pulse) + ')';
            ctx.fill();
            ctx.strokeStyle = '#e8f';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Normal peg
            ctx.fillStyle = peg.hit ? '#68c' : '#2a5a8a';
            ctx.fill();
            ctx.strokeStyle = peg.hit ? '#9cf' : '#4a8abf';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Highlight
        if (!peg.hit) {
            ctx.beginPath();
            ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    },

    /**
     * Draw a bumper
     */
    drawBumper(ctx, bumper) {
        var x = bumper.x, y = bumper.y, r = bumper.r;
        var flash = bumper.flash || 0;

        // Outer ring
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = flash > 0 ? '#fff' : '#f84';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Fill
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        var brightness = Math.floor(100 + flash * 155);
        ctx.fillStyle = flash > 0 ? 'rgb(255,' + brightness + ',60)' : '#c53';
        ctx.fill();

        // Inner circle
        ctx.beginPath();
        ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = flash > 0 ? '#fff' : '#fa6';
        ctx.fill();
    },

    /**
     * Draw a spinning obstacle
     */
    drawSpinner(ctx, spinner) {
        var x = spinner.x, y = spinner.y;
        var len = spinner.length;
        var angle = spinner.angle;

        var x1 = x + Math.cos(angle) * len;
        var y1 = y + Math.sin(angle) * len;
        var x2 = x - Math.cos(angle) * len;
        var y2 = y - Math.sin(angle) * len;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#8cf';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Center pivot
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        // End caps
        ctx.beginPath();
        ctx.arc(x1, y1, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#8cf';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#8cf';
        ctx.fill();

        ctx.lineCap = 'butt';
    },

    /**
     * Draw landing zones at the bottom
     */
    drawZones(ctx, zones, time) {
        for (var i = 0; i < zones.length; i++) {
            var z = zones[i];
            var pulse = Math.sin(time * 2 + i) * 0.05 + 0.95;

            // Zone background
            var hue;
            if (z.multiplier >= 7) hue = 45; // gold
            else if (z.multiplier >= 5) hue = 30; // orange
            else if (z.multiplier >= 3) hue = 200; // blue
            else hue = 220; // dark blue

            var sat = z.multiplier >= 5 ? 80 : 60;
            var light = Math.floor(15 + z.multiplier * 3 * pulse);

            ctx.fillStyle = 'hsl(' + hue + ',' + sat + '%,' + light + '%)';
            ctx.fillRect(z.x + 1, z.y, z.width - 2, z.height);

            // Zone border
            ctx.strokeStyle = 'hsl(' + hue + ',70%,' + (light + 20) + '%)';
            ctx.lineWidth = 1;
            ctx.strokeRect(z.x + 1, z.y, z.width - 2, z.height);

            // Multiplier text
            ctx.fillStyle = z.multiplier >= 5 ? '#fff' : '#aac';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(z.multiplier + 'x', z.x + z.width / 2, z.y + z.height / 2);
        }
    },

    /**
     * Draw the ball
     */
    drawBall(ctx, ball) {
        if (!ball) return;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, Physics.BALL_RADIUS, 0, Math.PI * 2);

        // Gradient fill
        var grad = ctx.createRadialGradient(
            ball.x - 2, ball.y - 2, 1,
            ball.x, ball.y, Physics.BALL_RADIUS
        );
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.4, '#ddf');
        grad.addColorStop(1, '#88b');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#aac';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    /**
     * Draw the HUD
     */
    drawHUD(ctx, score, balls, round, combo, pegsHit) {
        ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
        ctx.fillRect(0, 0, this.VW, 25);

        ctx.font = 'bold 14px sans-serif';
        ctx.textBaseline = 'top';

        // Score
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText('Score: ' + score, 8, 5);

        // Balls remaining
        ctx.textAlign = 'center';
        ctx.fillStyle = balls <= 1 ? '#f44' : '#4f4';
        ctx.fillText('Balls: ' + balls, this.VW / 2, 5);

        // Round
        ctx.textAlign = 'right';
        ctx.fillStyle = '#aaf';
        ctx.fillText('Round ' + round, this.VW - 8, 5);

        // Combo indicator
        if (combo > 1) {
            ctx.textAlign = 'center';
            ctx.font = 'bold 20px sans-serif';
            var comboAlpha = Math.min(1, combo / 5);
            ctx.fillStyle = 'rgba(255,200,50,' + comboAlpha + ')';
            ctx.fillText(combo + 'x COMBO', this.VW / 2, 100);
        }
    },

    /**
     * Draw aiming drag line
     */
    drawAimLine(ctx, fromX, fromY, toX, toY) {
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.strokeStyle = 'rgba(100,170,255,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    /**
     * Draw menu screen
     */
    drawMenu(ctx, time) {
        // Title
        ctx.fillStyle = '#4af';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BOUNCE', this.VW / 2, this.VH / 2 - 80);
        ctx.fillStyle = '#f84';
        ctx.fillText('BACK', this.VW / 2, this.VH / 2 - 30);

        // Subtitle
        ctx.fillStyle = '#888';
        ctx.font = '16px sans-serif';
        ctx.fillText('Aim . Bounce . Score', this.VW / 2, this.VH / 2 + 20);

        // Play button
        var pulse = Math.sin(time * 3) * 0.1 + 0.9;
        ctx.fillStyle = 'rgba(68,170,255,' + (0.15 * pulse) + ')';
        ctx.fillRect(this.VW / 2 - 90, this.VH / 2 + 50, 180, 50);
        ctx.strokeStyle = '#4af';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.VW / 2 - 90, this.VH / 2 + 50, 180, 50);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('TAP TO PLAY', this.VW / 2, this.VH / 2 + 75);

        // Instructions
        ctx.fillStyle = '#667';
        ctx.font = '13px sans-serif';
        ctx.fillText('Drag to aim, release to launch', this.VW / 2, this.VH / 2 + 130);

        // Decorative pegs
        for (var i = 0; i < 5; i++) {
            var px = 80 + i * 60;
            var py = this.VH / 2 + 180 + Math.sin(time * 2 + i) * 10;
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fillStyle = i === 2 ? '#f84' : '#2a5a8a';
            ctx.fill();
            ctx.strokeStyle = i === 2 ? '#fa5' : '#4a8abf';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    },

    /**
     * Draw game over screen
     */
    drawGameOver(ctx, score, round, bestScore, time) {
        // Overlay
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, this.VW, this.VH);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Game over text
        ctx.fillStyle = '#f44';
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText('GAME OVER', this.VW / 2, this.VH / 2 - 100);

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('Score: ' + score, this.VW / 2, this.VH / 2 - 40);

        // Round
        ctx.fillStyle = '#aaf';
        ctx.font = '20px sans-serif';
        ctx.fillText('Round ' + round, this.VW / 2, this.VH / 2);

        // Best score
        if (bestScore > 0) {
            ctx.fillStyle = '#fa4';
            ctx.font = '18px sans-serif';
            ctx.fillText('Best: ' + bestScore, this.VW / 2, this.VH / 2 + 35);
        }

        // Restart button
        var pulse = Math.sin(time * 3) * 0.1 + 0.9;
        ctx.fillStyle = 'rgba(68,170,255,' + (0.15 * pulse) + ')';
        ctx.fillRect(this.VW / 2 - 90, this.VH / 2 + 65, 180, 50);
        ctx.strokeStyle = '#4af';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.VW / 2 - 90, this.VH / 2 + 65, 180, 50);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('PLAY AGAIN', this.VW / 2, this.VH / 2 + 90);
    },

    /**
     * Draw round transition overlay
     */
    drawRoundTransition(ctx, round, timer) {
        var alpha = Math.min(1, timer * 3) * (timer < 0.3 ? 1 : Math.max(0, 1 - (timer - 0.7) * 3));
        ctx.globalAlpha = alpha;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, this.VW, this.VH);

        ctx.fillStyle = '#4af';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ROUND ' + round, this.VW / 2, this.VH / 2);

        ctx.globalAlpha = 1;
    },

    /**
     * Draw extra ball notification
     */
    drawExtraBall(ctx, timer) {
        if (timer <= 0) return;
        var alpha = Math.min(1, timer * 3);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#4f4';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+1 BALL!', this.VW / 2, 80);
        ctx.globalAlpha = 1;
    }
};
