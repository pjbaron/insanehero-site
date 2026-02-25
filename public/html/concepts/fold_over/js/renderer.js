/**
 * Renderer - All drawing logic for Fold Over
 */

var Renderer = {
    // Layout computed each frame
    gridX: 0,        // top-left of main grid
    gridY: 0,
    cellSize: 0,
    targetX: 0,      // top-left of target display
    targetY: 0,
    targetCellSize: 0,

    // UI button rects
    undoBtn: { x: 0, y: 0, w: 0, h: 0 },
    resetBtn: { x: 0, y: 0, w: 0, h: 0 },
    nextBtn: { x: 0, y: 0, w: 0, h: 0 },
    menuBtn: { x: 0, y: 0, w: 0, h: 0 },

    // Animation
    foldAnim: null,   // { info, progress, duration }

    /**
     * Compute layout based on canvas size and grid dimensions
     */
    computeLayout: function(cw, ch, rows, cols) {
        var padding = Math.min(cw, ch) * 0.04;
        var topBar = 60; // space for level info

        // Determine available space
        var availW = cw - padding * 2;
        var availH = ch - topBar - padding * 3;

        // Target preview takes up some space
        var targetFraction = 0.22; // target uses ~22% of height
        var gridAvailH = availH * (1 - targetFraction) - padding;
        var targetAvailH = availH * targetFraction;

        // Grid cell size
        var maxCellW = availW / cols;
        var maxCellH = gridAvailH / rows;
        this.cellSize = Math.min(maxCellW, maxCellH, 100);

        var gridW = this.cellSize * cols;
        var gridH = this.cellSize * rows;
        this.gridX = (cw - gridW) / 2;
        this.gridY = topBar + padding;

        // Target cell size (smaller)
        var tMaxCellW = (availW * 0.4) / cols;
        var tMaxCellH = targetAvailH / rows;
        this.targetCellSize = Math.min(tMaxCellW, tMaxCellH, this.cellSize * 0.45);

        var tW = this.targetCellSize * cols;
        var tH = this.targetCellSize * rows;

        // Position target to the right of center
        this.targetX = cw / 2 + gridW * 0.1;
        this.targetY = this.gridY + gridH + padding * 1.5;

        // Undo button - left side below grid
        var btnSize = Math.max(44, this.cellSize * 0.6);
        this.undoBtn = {
            x: cw / 2 - gridW * 0.3 - btnSize,
            y: this.targetY + (tH - btnSize) / 2,
            w: btnSize, h: btnSize
        };

        // Reset button - next to undo
        this.resetBtn = {
            x: this.undoBtn.x - btnSize - padding,
            y: this.undoBtn.y,
            w: btnSize, h: btnSize
        };

        // Next level button (only shown on completion)
        this.nextBtn = {
            x: cw / 2 - 80, y: ch - 80,
            w: 160, h: 50
        };

        // Menu/back button
        this.menuBtn = {
            x: padding, y: padding / 2,
            w: 44, h: 44
        };
    },

    /**
     * Start a fold animation
     */
    startFoldAnim: function(foldInfo) {
        this.foldAnim = {
            info: foldInfo,
            progress: 0,
            duration: 0.35
        };
    },

    /**
     * Update fold animation
     * @returns {boolean} true if animation is still playing
     */
    updateFoldAnim: function(dt) {
        if (!this.foldAnim) return false;
        this.foldAnim.progress += dt / this.foldAnim.duration;
        if (this.foldAnim.progress >= 1) {
            this.foldAnim = null;
            return false;
        }
        return true;
    },

    /**
     * Render the complete game screen
     */
    renderGame: function(ctx, cw, ch, level, levelIdx, foldCount, par, completed, stars) {
        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, cw, ch);

        // Subtle grid pattern background
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 1;
        for (var x = 0; x < cw; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
        }
        for (var y = 0; y < ch; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
        }

        // Top bar - level info
        this.renderTopBar(ctx, cw, levelIdx, foldCount, par);

        // Main grid
        this.renderGrid(ctx, Paper.grid, Paper.rows, Paper.cols,
            this.gridX, this.gridY, this.cellSize, true);

        // Fold animation overlay
        if (this.foldAnim) {
            this.renderFoldAnim(ctx);
        }

        // Target label
        ctx.fillStyle = '#8899aa';
        ctx.font = 'bold ' + Math.max(12, this.targetCellSize * 0.5) + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('TARGET', this.targetX, this.targetY - 6);

        // Target grid
        this.renderGrid(ctx, level.target, Paper.rows, Paper.cols,
            this.targetX, this.targetY, this.targetCellSize, false);

        // Undo & Reset buttons
        if (!completed) {
            this.renderIconButton(ctx, this.undoBtn, 'undo', Paper.undoStack.length > 0);
            this.renderIconButton(ctx, this.resetBtn, 'reset', foldCount > 0);
        }

        // Back button
        this.renderBackButton(ctx);

        // Completion overlay
        if (completed) {
            this.renderCompletion(ctx, cw, ch, stars, foldCount, par);
        }
    },

    renderTopBar: function(ctx, cw, levelIdx, foldCount, par) {
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Level ' + (levelIdx + 1), cw / 2, 30);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#8899aa';
        ctx.textAlign = 'center';
        ctx.fillText('Folds: ' + foldCount + '  |  Par: ' + par, cw / 2, 52);
    },

    /**
     * Render a grid (main or target)
     */
    renderGrid: function(ctx, grid, rows, cols, x, y, cellSize, isMain) {
        var gap = Math.max(1, cellSize * 0.04);
        var radius = cellSize * 0.12;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var cx = x + c * cellSize;
                var cy = y + r * cellSize;
                var inner = cellSize - gap;

                if (grid[r][c] !== null) {
                    var color = COLORS[grid[r][c]];

                    // Shadow
                    if (isMain) {
                        ctx.fillStyle = 'rgba(0,0,0,0.2)';
                        this.roundRect(ctx, cx + 2, cy + 2, inner, inner, radius);
                        ctx.fill();
                    }

                    // Main cell
                    ctx.fillStyle = color;
                    this.roundRect(ctx, cx, cy, inner, inner, radius);
                    ctx.fill();

                    // Highlight
                    if (isMain) {
                        ctx.fillStyle = 'rgba(255,255,255,0.15)';
                        this.roundRect(ctx, cx, cy, inner, inner * 0.45, radius);
                        ctx.fill();
                    }
                } else {
                    // Empty cell placeholder
                    ctx.fillStyle = isMain ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)';
                    this.roundRect(ctx, cx, cy, inner, inner, radius);
                    ctx.fill();

                    if (!isMain) {
                        // Dashed border for target empty cells
                        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([3, 3]);
                        this.roundRect(ctx, cx, cy, inner, inner, radius);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                }
            }
        }

        // Grid border
        if (isMain) {
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 2;
            this.roundRect(ctx, x - 2, y - 2, cols * cellSize + 4, rows * cellSize + 4, radius + 2);
            ctx.stroke();
        }
    },

    /**
     * Render fold animation
     */
    renderFoldAnim: function(ctx) {
        var anim = this.foldAnim;
        var t = this.easeInOutCubic(anim.progress);
        var info = anim.info;

        for (var i = 0; i < info.movedCells.length; i++) {
            var cell = info.movedCells[i];
            var fromX = this.gridX + cell.fromC * this.cellSize;
            var fromY = this.gridY + cell.fromR * this.cellSize;
            var toX = this.gridX + cell.toC * this.cellSize;
            var toY = this.gridY + cell.toR * this.cellSize;

            var cx = fromX + (toX - fromX) * t;
            var cy = fromY + (toY - fromY) * t;
            var gap = Math.max(1, this.cellSize * 0.04);
            var inner = this.cellSize - gap;
            var radius = this.cellSize * 0.12;

            // Animated cell with slight scale bounce
            var scale = 1 + Math.sin(t * Math.PI) * 0.1;
            ctx.save();
            ctx.translate(cx + inner / 2, cy + inner / 2);
            ctx.scale(scale, scale);
            ctx.globalAlpha = 0.8;

            ctx.fillStyle = COLORS[cell.color];
            this.roundRect(ctx, -inner / 2, -inner / 2, inner, inner, radius);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            this.roundRect(ctx, -inner / 2, -inner / 2, inner, inner * 0.45, radius);
            ctx.fill();

            ctx.restore();
        }
    },

    /**
     * Render an icon button
     */
    renderIconButton: function(ctx, btn, type, enabled) {
        var alpha = enabled ? 1 : 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Button background
        ctx.fillStyle = '#2a2a4a';
        this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
        ctx.stroke();

        // Icon
        var cx = btn.x + btn.w / 2;
        var cy = btn.y + btn.h / 2;
        var s = btn.w * 0.3;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (type === 'undo') {
            // Curved arrow
            ctx.beginPath();
            ctx.arc(cx + 2, cy, s * 0.7, Math.PI * 1.3, Math.PI * 0.3, true);
            ctx.stroke();
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.5, cy - s * 0.6);
            ctx.lineTo(cx - s * 0.8, cy - s * 0.1);
            ctx.lineTo(cx - s * 0.2, cy - s * 0.1);
            ctx.stroke();
        } else if (type === 'reset') {
            // Two curved arrows (refresh)
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.6, Math.PI * 0.5, Math.PI * 1.5);
            ctx.stroke();
            // Arrowheads
            ctx.beginPath();
            ctx.moveTo(cx + s * 0.2, cy + s * 0.6);
            ctx.lineTo(cx + s * 0.6, cy + s * 0.6);
            ctx.lineTo(cx + s * 0.4, cy + s * 0.3);
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * Render back/menu button
     */
    renderBackButton: function(ctx) {
        var btn = this.menuBtn;
        ctx.save();
        ctx.strokeStyle = '#8899aa';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        var cx = btn.x + btn.w / 2;
        var cy = btn.y + btn.h / 2;
        var s = 10;

        // Left arrow
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.4, cy - s);
        ctx.lineTo(cx - s * 0.6, cy);
        ctx.lineTo(cx + s * 0.4, cy + s);
        ctx.stroke();
        ctx.restore();
    },

    /**
     * Render completion overlay with stars
     */
    renderCompletion: function(ctx, cw, ch, stars, foldCount, par) {
        // Dim overlay
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, cw, ch);

        // Panel
        var panelW = Math.min(320, cw * 0.85);
        var panelH = 220;
        var px = (cw - panelW) / 2;
        var py = (ch - panelH) / 2 - 20;

        ctx.fillStyle = '#1e1e3a';
        this.roundRect(ctx, px, py, panelW, panelH, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, px, py, panelW, panelH, 16);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#F1C40F';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('COMPLETE!', cw / 2, py + 42);

        // Stars
        var starSize = 32;
        var starGap = 12;
        var totalStarsW = starSize * 3 + starGap * 2;
        var sx = (cw - totalStarsW) / 2;
        var sy = py + 60;

        for (var i = 0; i < 3; i++) {
            this.renderStar(ctx,
                sx + i * (starSize + starGap) + starSize / 2,
                sy + starSize / 2,
                starSize / 2,
                i < stars
            );
        }

        // Fold count
        ctx.fillStyle = '#bbbbcc';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Folds: ' + foldCount + ' / Par: ' + par, cw / 2, sy + starSize + 30);

        // Next button
        var nbtn = this.nextBtn;
        nbtn.x = (cw - 160) / 2;
        nbtn.y = py + panelH - 60;

        ctx.fillStyle = '#2ECC71';
        this.roundRect(ctx, nbtn.x, nbtn.y, nbtn.w, nbtn.h, 10);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NEXT LEVEL', cw / 2, nbtn.y + 32);
    },

    /**
     * Draw a 5-pointed star
     */
    renderStar: function(ctx, x, y, r, filled) {
        ctx.save();
        ctx.beginPath();
        for (var i = 0; i < 10; i++) {
            var angle = Math.PI * 2 * i / 10 - Math.PI / 2;
            var radius = i % 2 === 0 ? r : r * 0.45;
            if (i === 0) ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
            else ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
        }
        ctx.closePath();

        if (filled) {
            ctx.fillStyle = '#F1C40F';
            ctx.fill();
            ctx.strokeStyle = '#F39C12';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        ctx.restore();
    },

    /**
     * Render the level select / menu screen
     */
    renderMenu: function(ctx, cw, ch, levelStars, totalLevels, scrollY) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, cw, ch);

        // Title
        ctx.fillStyle = '#e0e0e0';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FOLD OVER', cw / 2, 50 - scrollY);

        ctx.fillStyle = '#8899aa';
        ctx.font = '15px sans-serif';
        ctx.fillText('Fold the paper to match the target!', cw / 2, 78 - scrollY);

        // Level grid
        var cols = Math.min(5, Math.floor((cw - 40) / 72));
        if (cols < 2) cols = 2;
        var btnSize = Math.min(60, (cw - 40 - (cols - 1) * 12) / cols);
        var gap = 12;
        var gridW = cols * btnSize + (cols - 1) * gap;
        var startX = (cw - gridW) / 2;
        var startY = 105 - scrollY;

        var tierLabels = { 'tutorial': 'TUTORIAL', 'easy': 'EASY', 'medium': 'MEDIUM', 'hard': 'HARD' };
        var lastTier = '';
        var row = 0;
        var col = 0;

        // Store button rects for hit testing
        this._levelBtns = [];

        for (var i = 0; i < totalLevels; i++) {
            var tier = LEVELS[i].tier;
            if (tier !== lastTier) {
                if (col > 0) { row++; col = 0; }

                var labelY = startY + row * (btnSize + gap) + btnSize / 2;
                ctx.fillStyle = '#667788';
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(tierLabels[tier] || tier.toUpperCase(), cw / 2, labelY);
                row++;
                lastTier = tier;
            }

            var bx = startX + col * (btnSize + gap);
            var by = startY + row * (btnSize + gap);

            this._levelBtns.push({ x: bx, y: by + scrollY, w: btnSize, h: btnSize, level: i });

            // Unlocked check (level 0 always unlocked, or previous has stars)
            var unlocked = (i === 0 || (levelStars[i - 1] !== undefined && levelStars[i - 1] > 0));
            var stars = levelStars[i] || 0;

            if (unlocked) {
                ctx.fillStyle = stars > 0 ? '#2a2a5a' : '#2a2a4a';
                this.roundRect(ctx, bx, by, btnSize, btnSize, 8);
                ctx.fill();
                ctx.strokeStyle = stars > 0 ? 'rgba(241,196,15,0.4)' : 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1.5;
                this.roundRect(ctx, bx, by, btnSize, btnSize, 8);
                ctx.stroke();

                ctx.fillStyle = '#e0e0e0';
                ctx.font = 'bold ' + (btnSize * 0.35) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('' + (i + 1), bx + btnSize / 2, by + btnSize * 0.48);

                // Mini stars
                if (stars > 0) {
                    var miniS = btnSize * 0.12;
                    var miniGap = btnSize * 0.06;
                    var totalMiniW = miniS * 6 + miniGap * 2;
                    var miniX = bx + (btnSize - totalMiniW) / 2 + miniS;
                    var miniY = by + btnSize * 0.72;
                    for (var s = 0; s < 3; s++) {
                        this.renderStar(ctx,
                            miniX + s * (miniS * 2 + miniGap),
                            miniY,
                            miniS,
                            s < stars
                        );
                    }
                }
            } else {
                // Locked
                ctx.fillStyle = '#1e1e2e';
                this.roundRect(ctx, bx, by, btnSize, btnSize, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 1;
                this.roundRect(ctx, bx, by, btnSize, btnSize, 8);
                ctx.stroke();

                // Lock icon
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.font = (btnSize * 0.3) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('?', bx + btnSize / 2, by + btnSize * 0.55);
            }

            col++;
            if (col >= cols) { col = 0; row++; }
        }

        // Scroll hint at bottom if content overflows
        var totalH = (row + 1) * (btnSize + gap) + startY + scrollY;
        if (totalH > ch) {
            var gradH = 40;
            var grad = ctx.createLinearGradient(0, ch - gradH, 0, ch);
            grad.addColorStop(0, 'rgba(26,26,46,0)');
            grad.addColorStop(1, 'rgba(26,26,46,0.9)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, ch - gradH, cw, gradH);
        }
    },

    /**
     * Render the fold line preview while dragging
     */
    renderFoldPreview: function(ctx, axis, line, side, rows, cols) {
        var lineWidth = 3;
        ctx.save();

        if (axis === 'h') {
            var ly = this.gridY + line * this.cellSize;
            // Dashed fold line
            ctx.strokeStyle = '#F1C40F';
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(this.gridX - 5, ly);
            ctx.lineTo(this.gridX + cols * this.cellSize + 5, ly);
            ctx.stroke();
            ctx.setLineDash([]);

            // Arrow showing fold direction
            var arrowY = side === 'before' ? ly - this.cellSize * 0.5 : ly + this.cellSize * 0.5;
            var arrowDir = side === 'before' ? 1 : -1;
            var arrowX = this.gridX + cols * this.cellSize / 2;

            ctx.fillStyle = 'rgba(241,196,15,0.5)';
            ctx.beginPath();
            ctx.moveTo(arrowX - 12, arrowY);
            ctx.lineTo(arrowX + 12, arrowY);
            ctx.lineTo(arrowX, arrowY + arrowDir * 18);
            ctx.closePath();
            ctx.fill();

            // Highlight side being folded
            var hlY = side === 'before' ? this.gridY : ly;
            var hlH = side === 'before' ? line * this.cellSize : (rows - line) * this.cellSize;
            ctx.fillStyle = 'rgba(241,196,15,0.08)';
            ctx.fillRect(this.gridX, hlY, cols * this.cellSize, hlH);
        } else {
            var lx = this.gridX + line * this.cellSize;
            ctx.strokeStyle = '#F1C40F';
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            ctx.moveTo(lx, this.gridY - 5);
            ctx.lineTo(lx, this.gridY + rows * this.cellSize + 5);
            ctx.stroke();
            ctx.setLineDash([]);

            var arrowX = side === 'before' ? lx - this.cellSize * 0.5 : lx + this.cellSize * 0.5;
            var arrowDir = side === 'before' ? 1 : -1;
            var arrowY = this.gridY + rows * this.cellSize / 2;

            ctx.fillStyle = 'rgba(241,196,15,0.5)';
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY - 12);
            ctx.lineTo(arrowX, arrowY + 12);
            ctx.lineTo(arrowX + arrowDir * 18, arrowY);
            ctx.closePath();
            ctx.fill();

            var hlX = side === 'before' ? this.gridX : lx;
            var hlW = side === 'before' ? line * this.cellSize : (cols - line) * this.cellSize;
            ctx.fillStyle = 'rgba(241,196,15,0.08)';
            ctx.fillRect(hlX, this.gridY, hlW, rows * this.cellSize);
        }

        ctx.restore();
    },

    /**
     * Helper: rounded rectangle path
     */
    roundRect: function(ctx, x, y, w, h, r) {
        if (r > w / 2) r = w / 2;
        if (r > h / 2) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    },

    /**
     * Easing function
     */
    easeInOutCubic: function(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
};
