/**
 * UI - HUD, menus, level select, result screen
 * All canvas-rendered, no DOM elements
 */

var UI = {
    // Button hit areas for click detection
    buttons: [],

    // Animations
    titleBounce: 0,
    starAnims: [0, 0, 0],
    resultAlpha: 0,
    levelSelectScroll: 0,
    levelSelectPage: 0,

    clear: function() {
        this.buttons = [];
    },

    // Register a clickable button
    addButton: function(id, x, y, w, h) {
        this.buttons.push({ id: id, x: x, y: y, w: w, h: h });
    },

    // Check if a screen position hits any button
    hitTest: function(sx, sy) {
        for (var i = 0; i < this.buttons.length; i++) {
            var b = this.buttons[i];
            if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
                return b.id;
            }
        }
        return null;
    },

    // ---- TITLE SCREEN ----
    renderTitle: function(ctx, w, h, time) {
        // Sky gradient background
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a2a4a');
        grad.addColorStop(0.5, '#2a4a6a');
        grad.addColorStop(1, '#3a6a3a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Mountains silhouette
        ctx.fillStyle = '#1a3a2a';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.7);
        ctx.lineTo(w * 0.15, h * 0.45);
        ctx.lineTo(w * 0.3, h * 0.55);
        ctx.lineTo(w * 0.45, h * 0.35);
        ctx.lineTo(w * 0.6, h * 0.5);
        ctx.lineTo(w * 0.75, h * 0.4);
        ctx.lineTo(w * 0.9, h * 0.55);
        ctx.lineTo(w, h * 0.65);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();

        // Title
        var titleY = h * 0.28 + Math.sin(time * 2) * 8;
        var fontSize = Math.min(w * 0.12, 80);

        // Title shadow
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000';
        ctx.fillText('SNIP SNAP', w / 2 + 3, titleY + 3);

        // Title main
        var titleGrad = ctx.createLinearGradient(w / 2 - 150, titleY - 40, w / 2 + 150, titleY + 10);
        titleGrad.addColorStop(0, '#ffd700');
        titleGrad.addColorStop(0.5, '#ffaa00');
        titleGrad.addColorStop(1, '#ff6600');
        ctx.fillStyle = titleGrad;
        ctx.fillText('SNIP SNAP', w / 2, titleY);

        // Subtitle
        ctx.font = Math.floor(fontSize * 0.3) + 'px sans-serif';
        ctx.fillStyle = '#cda050';
        ctx.fillText('Cut the ropes. Crush the goblins.', w / 2, titleY + fontSize * 0.45);

        // Scissors icon
        var sx = w / 2;
        var sy = titleY - fontSize * 0.7;
        var iconSize = fontSize * 0.3;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        // Simple scissors shape
        ctx.beginPath();
        ctx.arc(sx - iconSize * 0.4, sy + iconSize * 0.3, iconSize * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx + iconSize * 0.4, sy + iconSize * 0.3, iconSize * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - iconSize * 0.2, sy + iconSize * 0.15);
        ctx.lineTo(sx + iconSize * 0.1, sy - iconSize * 0.4);
        ctx.moveTo(sx + iconSize * 0.2, sy + iconSize * 0.15);
        ctx.lineTo(sx - iconSize * 0.1, sy - iconSize * 0.4);
        ctx.stroke();

        // Play button
        var btnW = Math.min(w * 0.4, 220);
        var btnH = 55;
        var btnX = w / 2 - btnW / 2;
        var btnY = h * 0.55;

        this._drawButton(ctx, btnX, btnY, btnW, btnH, 'PLAY', '#2a8a2a', '#1a6a1a');
        this.addButton('play', btnX, btnY, btnW, btnH);

        // Tap hint
        var hintAlpha = 0.5 + Math.sin(time * 3) * 0.3;
        ctx.globalAlpha = hintAlpha;
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Tap or click to start', w / 2, h * 0.75);
        ctx.globalAlpha = 1;

        // Version
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'right';
        ctx.fillText('v1.0', w - 10, h - 10);
        ctx.textAlign = 'center';
    },

    // ---- LEVEL SELECT ----
    renderLevelSelect: function(ctx, w, h, progress, page) {
        // Background
        var theme = Levels.themes[page] || Levels.themes[0];
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, theme.bg1);
        grad.addColorStop(1, theme.bg2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        this.buttons = [];

        // World title
        var worldName = theme.name;
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('World ' + (page + 1) + ': ' + worldName, w / 2, 50);

        // Level grid: 2 rows x 5 cols
        var cols = 5;
        var rows = 2;
        var cellW = Math.min(90, (w - 60) / cols);
        var cellH = cellW;
        var gridW = cols * cellW + (cols - 1) * 10;
        var gridH = rows * cellH + (rows - 1) * 10;
        var startX = (w - gridW) / 2;
        var startY = (h - gridH) / 2 - 10;

        var startLevel = page * 10 + 1;

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var levelNum = startLevel + r * cols + c;
                var x = startX + c * (cellW + 10);
                var y = startY + r * (cellH + 10);

                var unlocked = levelNum <= (progress.maxLevel || 1);
                var stars = progress.stars[levelNum] || 0;

                this._drawLevelCell(ctx, x, y, cellW, cellH, levelNum, unlocked, stars);
                if (unlocked) {
                    this.addButton('level_' + levelNum, x, y, cellW, cellH);
                }
            }
        }

        // Navigation arrows
        if (page > 0) {
            var arrowSize = 40;
            var arrowX = 20;
            var arrowY = h / 2 - arrowSize / 2;
            this._drawArrow(ctx, arrowX, arrowY, arrowSize, 'left');
            this.addButton('prev_page', arrowX, arrowY, arrowSize, arrowSize);
        }
        if (page < 3) {
            var arrowSize = 40;
            var arrowX = w - 60;
            var arrowY = h / 2 - arrowSize / 2;
            this._drawArrow(ctx, arrowX, arrowY, arrowSize, 'right');
            this.addButton('next_page', arrowX, arrowY, arrowSize, arrowSize);
        }

        // Back button
        var backW = 80;
        var backH = 36;
        var backX = 10;
        var backY = 10;
        this._drawButton(ctx, backX, backY, backW, backH, 'BACK', '#666', '#444', 16);
        this.addButton('back_to_menu', backX, backY, backW, backH);

        // Total stars
        var totalStars = 0;
        var maxStars = 0;
        for (var i = 1; i <= 40; i++) {
            maxStars += 3;
            totalStars += (progress.stars[i] || 0);
        }
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(totalStars + '/' + maxStars + ' *', w - 15, 30);
        ctx.textAlign = 'center';
    },

    _drawLevelCell: function(ctx, x, y, w, h, num, unlocked, stars) {
        // Background
        ctx.fillStyle = unlocked ? '#3a5a7a' : '#2a2a3a';
        ctx.strokeStyle = unlocked ? '#5a8aaa' : '#3a3a4a';
        ctx.lineWidth = 2;

        // Rounded rect
        var r = 8;
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
        ctx.fill();
        ctx.stroke();

        if (!unlocked) {
            // Lock icon
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#555';
            ctx.fillText('?', x + w / 2, y + h / 2 + 4);
            return;
        }

        // Level number
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('' + num, x + w / 2, y + h / 2 - 2);

        // Stars
        var starSize = 8;
        var starY = y + h - 16;
        for (var i = 0; i < 3; i++) {
            var starX = x + w / 2 + (i - 1) * (starSize * 2.2);
            ctx.fillStyle = i < stars ? '#ffd700' : '#3a4a5a';
            this._drawStarShape(ctx, starX, starY, starSize);
        }
    },

    _drawStarShape: function(ctx, cx, cy, size) {
        ctx.beginPath();
        for (var i = 0; i < 5; i++) {
            var outerAngle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            var innerAngle = outerAngle + Math.PI / 5;
            if (i === 0) {
                ctx.moveTo(cx + Math.cos(outerAngle) * size, cy + Math.sin(outerAngle) * size);
            } else {
                ctx.lineTo(cx + Math.cos(outerAngle) * size, cy + Math.sin(outerAngle) * size);
            }
            ctx.lineTo(cx + Math.cos(innerAngle) * size * 0.45, cy + Math.sin(innerAngle) * size * 0.45);
        }
        ctx.closePath();
        ctx.fill();
    },

    _drawArrow: function(ctx, x, y, size, dir) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        if (dir === 'left') {
            ctx.moveTo(x + size, y);
            ctx.lineTo(x, y + size / 2);
            ctx.lineTo(x + size, y + size);
        } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x + size, y + size / 2);
            ctx.lineTo(x, y + size);
        }
        ctx.closePath();
        ctx.fill();
    },

    // ---- HUD (during gameplay) ----
    renderHUD: function(ctx, w, h, levelNum, cuts, starThresholds, campsLeft, totalCamps) {
        // Level number - top left
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText('Level ' + levelNum, 15, 30);

        // Cuts counter - top center
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('Cuts: ' + cuts, w / 2, 30);

        // Star preview (how many cuts = how many stars)
        var s3 = starThresholds[0];
        var s2 = starThresholds[1];
        var previewY = 50;
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText(s3 + ' cuts = 3*  |  ' + s2 + ' cuts = 2*', w / 2, previewY);

        // Camps remaining - top right
        ctx.textAlign = 'right';
        ctx.font = '18px sans-serif';
        ctx.fillStyle = campsLeft === 0 ? '#4f4' : '#f88';
        ctx.fillText('Camps: ' + campsLeft + '/' + totalCamps, w - 15, 30);

        // Reset button - bottom left
        var resetW = 70;
        var resetH = 32;
        var resetX = 10;
        var resetY = h - 45;
        this._drawButton(ctx, resetX, resetY, resetW, resetH, 'RESET', '#8a3a3a', '#6a2a2a', 14);
        this.addButton('reset_level', resetX, resetY, resetW, resetH);

        // Menu button - bottom right
        var menuW = 70;
        var menuH = 32;
        var menuX = w - menuW - 10;
        var menuY = h - 45;
        this._drawButton(ctx, menuX, menuY, menuW, menuH, 'MENU', '#3a5a8a', '#2a4a6a', 14);
        this.addButton('back_to_select', menuX, menuY, menuW, menuH);

        ctx.textAlign = 'center';
    },

    // ---- RESULT SCREEN (overlay) ----
    renderResult: function(ctx, w, h, levelNum, cuts, stars, isLastLevel, alpha) {
        // Dimming overlay
        ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.6 * alpha) + ')';
        ctx.fillRect(0, 0, w, h);

        if (alpha < 0.1) return;

        ctx.globalAlpha = alpha;

        // Panel
        var panelW = Math.min(w * 0.8, 350);
        var panelH = 280;
        var panelX = (w - panelW) / 2;
        var panelY = (h - panelH) / 2 - 20;

        // Panel bg
        ctx.fillStyle = '#2a3a4a';
        ctx.strokeStyle = '#5a8aaa';
        ctx.lineWidth = 3;
        this._roundRect(ctx, panelX, panelY, panelW, panelH, 12);
        ctx.fill();
        ctx.stroke();

        // Title
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4f4';
        ctx.fillText('LEVEL COMPLETE!', w / 2, panelY + 45);

        // Stars
        var starSize = 24;
        var starY = panelY + 90;
        for (var i = 0; i < 3; i++) {
            var starX = w / 2 + (i - 1) * (starSize * 2.8);
            ctx.fillStyle = i < stars ? '#ffd700' : '#3a4a5a';
            this._drawStarShape(ctx, starX, starY, starSize);
        }

        // Stats
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#ccc';
        ctx.fillText('Cuts used: ' + cuts, w / 2, panelY + 140);

        var thresholds = Levels.getStarThresholds(levelNum);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText('3 stars: ' + thresholds[0] + ' cuts  |  2 stars: ' + thresholds[1] + ' cuts', w / 2, panelY + 165);

        // Buttons
        var btnW = 130;
        var btnH = 40;
        var btnGap = 15;

        if (!isLastLevel) {
            // Next button
            var nextX = w / 2 + btnGap / 2;
            var nextY = panelY + panelH - 60;
            this._drawButton(ctx, nextX, nextY, btnW, btnH, 'NEXT', '#2a8a2a', '#1a6a1a', 18);
            this.addButton('next_level', nextX, nextY, btnW, btnH);

            // Retry button
            var retryX = w / 2 - btnW - btnGap / 2;
            this._drawButton(ctx, retryX, nextY, btnW, btnH, 'RETRY', '#8a6a2a', '#6a4a1a', 18);
            this.addButton('retry_level', retryX, nextY, btnW, btnH);
        } else {
            // Just retry for last level
            var retryX = w / 2 - btnW / 2;
            var retryY = panelY + panelH - 60;
            this._drawButton(ctx, retryX, retryY, btnW, btnH, 'RETRY', '#8a6a2a', '#6a4a1a', 18);
            this.addButton('retry_level', retryX, retryY, btnW, btnH);
        }

        // Menu button (small)
        var menuW2 = 80;
        var menuH2 = 30;
        var menuX2 = w / 2 - menuW2 / 2;
        var menuY2 = panelY + panelH - 15;
        this._drawButton(ctx, menuX2, menuY2, menuW2, menuH2, 'MENU', '#555', '#333', 14);
        this.addButton('back_to_select', menuX2, menuY2, menuW2, menuH2);

        ctx.globalAlpha = 1;
    },

    // ---- WATCHING STATE INDICATOR ----
    renderWatching: function(ctx, w, h) {
        var alpha = 0.5 + Math.sin(performance.now() / 300) * 0.2;
        ctx.globalAlpha = alpha;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff8';
        ctx.fillText('... watching cascade ...', w / 2, h - 20);
        ctx.globalAlpha = 1;
    },

    // ---- HELPERS ----
    _drawButton: function(ctx, x, y, w, h, text, color1, color2, fontSize) {
        fontSize = fontSize || 20;
        var r = 6;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this._roundRect(ctx, x + 2, y + 2, w, h, r);
        ctx.fill();

        // Button gradient
        var grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
        ctx.fillStyle = grad;
        this._roundRect(ctx, x, y, w, h, r);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x + w / 2, y + h / 2 + fontSize * 0.35);
    },

    _roundRect: function(ctx, x, y, w, h, r) {
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
