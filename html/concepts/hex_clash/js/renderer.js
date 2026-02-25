/**
 * Renderer - All drawing: hex board, pieces, UI, offer tray, timer, scores
 */

var HexRenderer = (function() {

    // Colors
    var COLORS = {
        bg: '#1a1a2e',
        boardBg: '#16213e',
        emptyHex: '#0f3460',
        emptyHexStroke: '#1a4a7a',
        player: '#00d2ff',
        playerLight: '#66e5ff',
        playerDark: '#0099cc',
        ai: '#ff6b6b',
        aiLight: '#ff9999',
        aiDark: '#cc3333',
        validGlow: '#44ff88',
        invalidGlow: '#ff4444',
        shrinkZone: '#331111',
        text: '#ffffff',
        textDim: '#888899',
        timerBar: '#00d2ff',
        timerBarLow: '#ff6b6b',
        offerBg: '#0a0a1a',
        offerSelected: '#ffffff',
        hoverHex: '#ffffff'
    };

    var boardCenterX = 0;
    var boardCenterY = 0;
    var hexSize = 30;

    function calculateLayout(canvasW, canvasH, activeRadius) {
        // Board takes upper 75% of screen, offer tray takes bottom 25%
        var boardAreaH = canvasH * 0.72;
        var boardAreaW = canvasW;

        boardCenterX = boardAreaW / 2;
        boardCenterY = boardAreaH / 2 + 10;

        // Calculate hex size to fit board in available area
        var maxBoardWidth = boardAreaW - 40;
        var maxBoardHeight = boardAreaH - 40;

        // For flat-top hexes, board width ~ 3 * size * (2*radius+1) / 2
        // Board height ~ sqrt(3) * size * (2*radius+1)
        var sizeByWidth = maxBoardWidth / (3 * (2 * 4 + 1) / 2 + 0.5);
        var sizeByHeight = maxBoardHeight / (Math.sqrt(3) * (2 * 4 + 1));

        hexSize = Math.min(sizeByWidth, sizeByHeight, 38);
        hexSize = Math.max(hexSize, 18); // minimum size for touch

        return { centerX: boardCenterX, centerY: boardCenterY, hexSize: hexSize };
    }

    function getHexPixelPos(q, r) {
        var pos = HexGrid.axialToPixel(q, r, hexSize);
        return { x: boardCenterX + pos.x, y: boardCenterY + pos.y };
    }

    function drawHex(ctx, cx, cy, size, fillColor, strokeColor, lineWidth) {
        var corners = HexGrid.hexCorners(cx, cy, size);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (var i = 1; i < 6; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth || 1;
            ctx.stroke();
        }
    }

    function getOwnerColor(owner) {
        if (owner === 1) return COLORS.player;
        if (owner === 2) return COLORS.ai;
        return COLORS.emptyHex;
    }

    function getOwnerLightColor(owner) {
        if (owner === 1) return COLORS.playerLight;
        if (owner === 2) return COLORS.aiLight;
        return '#1a5a8a';
    }

    function renderBoard(ctx, cells, activeRadius, validPlacements, hoverQ, hoverR, selectedPieceOffsets, placerOwner, gameTime) {
        var allKeys = Object.keys(cells);
        var validSet = {};
        if (validPlacements) {
            for (var i = 0; i < validPlacements.length; i++) {
                validSet[HexGrid.key(validPlacements[i].q, validPlacements[i].r)] = true;
            }
        }

        // Determine which cells the piece would occupy if placed at hover position
        var previewCells = {};
        if (hoverQ !== null && hoverR !== null && selectedPieceOffsets) {
            for (var i = 0; i < selectedPieceOffsets.length; i++) {
                var pk = HexGrid.key(hoverQ + selectedPieceOffsets[i].q, hoverR + selectedPieceOffsets[i].r);
                previewCells[pk] = true;
            }
        }

        var isValidHover = hoverQ !== null && validSet[HexGrid.key(hoverQ, hoverR)];

        // Draw all hexes
        for (var i = 0; i < allKeys.length; i++) {
            var cell = cells[allKeys[i]];
            var dist = HexGrid.distFromCenter(cell.q, cell.r);

            // Skip cells outside active radius
            if (dist > 4) continue;

            var pos = getHexPixelPos(cell.q, cell.r);
            var isOutsideActive = dist > activeRadius;

            // Check for flip animation
            var flipAnim = null;
            var flips = Effects.getFlipAnimations();
            for (var f = 0; f < flips.length; f++) {
                if (Math.abs(flips[f].x - pos.x) < 2 && Math.abs(flips[f].y - pos.y) < 2) {
                    flipAnim = flips[f];
                    break;
                }
            }

            var fillColor;
            var strokeColor = COLORS.emptyHexStroke;
            var size = hexSize - 1;

            if (isOutsideActive) {
                fillColor = COLORS.shrinkZone;
                strokeColor = '#221111';
            } else if (flipAnim && flipAnim.progress >= 0) {
                // Flip animation: scale to 0 and back
                var p = flipAnim.progress;
                if (p < 0.5) {
                    fillColor = flipAnim.fromColor;
                    size = hexSize * (1 - p * 2);
                } else {
                    fillColor = flipAnim.toColor;
                    size = hexSize * ((p - 0.5) * 2);
                }
                size = Math.max(size, 1) - 1;
            } else if (previewCells[allKeys[i]] && isValidHover) {
                // Preview placement
                fillColor = getOwnerColor(placerOwner);
                ctx.globalAlpha = 0.5;
                drawHex(ctx, pos.x, pos.y, size, fillColor, COLORS.hoverHex, 2);
                ctx.globalAlpha = 1;
                continue;
            } else if (previewCells[allKeys[i]] && !isValidHover && hoverQ !== null) {
                // Invalid preview
                fillColor = cell.owner === 0 ? COLORS.emptyHex : getOwnerColor(cell.owner);
                drawHex(ctx, pos.x, pos.y, size, fillColor, COLORS.invalidGlow, 2);
                continue;
            } else if (cell.owner === 0) {
                fillColor = COLORS.emptyHex;
                // Glow valid placement cells
                if (validSet[allKeys[i]]) {
                    var glow = 0.15 + Math.sin(gameTime * 4) * 0.1;
                    ctx.globalAlpha = glow;
                    drawHex(ctx, pos.x, pos.y, size + 3, COLORS.validGlow, null, 0);
                    ctx.globalAlpha = 1;
                }
            } else {
                fillColor = getOwnerColor(cell.owner);
                strokeColor = getOwnerLightColor(cell.owner);
            }

            drawHex(ctx, pos.x, pos.y, size, fillColor, strokeColor, 1);

            // Inner highlight for owned cells
            if (cell.owner !== 0 && !isOutsideActive) {
                ctx.globalAlpha = 0.15;
                drawHex(ctx, pos.x - 1, pos.y - 1, size * 0.6, getOwnerLightColor(cell.owner), null, 0);
                ctx.globalAlpha = 1;
            }
        }
    }

    function renderOfferTray(ctx, offer, selectedIndex, canvasW, canvasH, rotation) {
        var trayH = canvasH * 0.2;
        var trayY = canvasH - trayH;
        var trayMidY = trayY + trayH / 2;

        // Tray background
        ctx.fillStyle = COLORS.offerBg;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(0, trayY - 5, canvasW, trayH + 10);
        ctx.globalAlpha = 1;

        // Divider line
        ctx.strokeStyle = '#333355';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, trayY);
        ctx.lineTo(canvasW - 20, trayY);
        ctx.stroke();

        if (!offer || offer.length === 0) return;

        var slotWidth = Math.min(canvasW / offer.length, 160);
        var startX = canvasW / 2 - (offer.length * slotWidth) / 2;

        var miniSize = Math.min(hexSize * 0.7, 22);

        for (var i = 0; i < offer.length; i++) {
            var slotCX = startX + slotWidth * (i + 0.5);
            var slotCY = trayMidY;

            // Selection highlight
            if (i === selectedIndex) {
                ctx.strokeStyle = COLORS.offerSelected;
                ctx.lineWidth = 3;
                var boxW = slotWidth - 16;
                var boxH = trayH - 20;
                ctx.strokeRect(slotCX - boxW / 2, slotCY - boxH / 2, boxW, boxH);
            }

            // Draw piece preview
            var offsets = offer[i].offsets;
            if (i === selectedIndex && rotation > 0) {
                offsets = HexPieces.rotatePiece(offsets, rotation);
            }

            for (var j = 0; j < offsets.length; j++) {
                var pp = HexGrid.axialToPixel(offsets[j].q, offsets[j].r, miniSize);
                var px = slotCX + pp.x;
                var py = slotCY + pp.y;
                drawHex(ctx, px, py, miniSize - 1, COLORS.player, COLORS.playerLight, 1);
            }
        }

        // Rotation hint for selected piece
        if (selectedIndex >= 0 && offer[selectedIndex].offsets.length > 1) {
            ctx.fillStyle = COLORS.textDim;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('tap piece to rotate', canvasW / 2, trayY - 10);
        }
    }

    function renderTimer(ctx, timeLeft, maxTime, canvasW, canvasH) {
        var barW = Math.min(canvasW - 40, 400);
        var barH = 8;
        var barX = canvasW / 2 - barW / 2;
        var barY = 8;

        var ratio = Math.max(0, timeLeft / maxTime);

        // Background
        ctx.fillStyle = '#111122';
        ctx.fillRect(barX, barY, barW, barH);

        // Fill
        var barColor = ratio > 0.3 ? COLORS.timerBar : COLORS.timerBarLow;
        if (ratio <= 0.15) {
            // Pulse when low
            var pulse = Math.sin(performance.now() / 150) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
        }
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barW * ratio, barH);
        ctx.globalAlpha = 1;

        // Time text
        var seconds = Math.ceil(timeLeft);
        ctx.fillStyle = ratio <= 0.3 ? COLORS.timerBarLow : COLORS.text;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(seconds + 's', canvasW / 2, barY + barH + 18);
    }

    function renderScores(ctx, playerScore, aiScore, canvasW, rivalName) {
        var y = 42;

        // Player score (left)
        ctx.fillStyle = COLORS.player;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('YOU: ' + playerScore, 15, y);

        // AI score (right)
        ctx.fillStyle = COLORS.ai;
        ctx.textAlign = 'right';
        ctx.fillText((rivalName || 'AI') + ': ' + aiScore, canvasW - 15, y);
    }

    function renderMenu(ctx, canvasW, canvasH, gameTime, leagueInfo) {
        // Background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Animated hex pattern background
        renderMenuBackground(ctx, canvasW, canvasH, gameTime);

        // Title
        var titleY = canvasH * 0.25;
        ctx.fillStyle = COLORS.player;
        ctx.font = 'bold ' + Math.min(canvasW / 8, 64) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HEX CLASH', canvasW / 2, titleY);

        // Subtitle
        ctx.fillStyle = COLORS.textDim;
        ctx.font = Math.min(canvasW / 20, 18) + 'px sans-serif';
        ctx.fillText('Capture the board!', canvasW / 2, titleY + 40);

        // League info
        if (leagueInfo) {
            var infoY = canvasH * 0.45;
            ctx.fillStyle = COLORS.text;
            ctx.font = 'bold ' + Math.min(canvasW / 16, 22) + 'px sans-serif';
            ctx.fillText(leagueInfo.leagueName, canvasW / 2, infoY);

            ctx.fillStyle = COLORS.ai;
            ctx.font = Math.min(canvasW / 18, 18) + 'px sans-serif';
            ctx.fillText('Next: ' + leagueInfo.rivalName, canvasW / 2, infoY + 30);

            ctx.fillStyle = COLORS.textDim;
            ctx.font = Math.min(canvasW / 22, 14) + 'px sans-serif';
            ctx.fillText(leagueInfo.rivalStyle + ' style', canvasW / 2, infoY + 52);

            // W/L record
            ctx.fillStyle = COLORS.text;
            ctx.font = Math.min(canvasW / 20, 16) + 'px sans-serif';
            ctx.fillText('Wins: ' + leagueInfo.wins + ' / Losses: ' + leagueInfo.losses, canvasW / 2, infoY + 80);
        }

        // Play button
        var btnY = canvasH * 0.7;
        var btnW = Math.min(canvasW * 0.5, 220);
        var btnH = 56;
        var pulse = Math.sin(gameTime * 3) * 4;

        ctx.fillStyle = COLORS.player;
        ctx.globalAlpha = 0.9;
        roundRect(ctx, canvasW / 2 - btnW / 2, btnY - btnH / 2 + pulse, btnW, btnH, 12);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#000';
        ctx.font = 'bold ' + Math.min(canvasW / 14, 28) + 'px sans-serif';
        ctx.fillText('PLAY', canvasW / 2, btnY + pulse + 2);

        ctx.textBaseline = 'alphabetic';
    }

    function renderMenuBackground(ctx, w, h, t) {
        ctx.globalAlpha = 0.08;
        var spacing = 50;
        var miniSize = 20;
        for (var x = -miniSize; x < w + spacing; x += spacing) {
            for (var y = -miniSize; y < h + spacing; y += spacing * 0.87) {
                var offsetX = ((y / spacing) % 2) * spacing / 2;
                var px = x + offsetX + Math.sin(t + x * 0.01) * 5;
                var py = y + Math.cos(t + y * 0.01) * 5;
                drawHex(ctx, px, py, miniSize, null, COLORS.player, 1);
            }
        }
        ctx.globalAlpha = 1;
    }

    function renderGameOver(ctx, canvasW, canvasH, playerScore, aiScore, isWin, rivalName, gameTime) {
        // Dim background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvasW, canvasH);

        var centerY = canvasH * 0.35;

        // Result text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isWin) {
            ctx.fillStyle = COLORS.player;
            ctx.font = 'bold ' + Math.min(canvasW / 7, 56) + 'px sans-serif';
            ctx.fillText('VICTORY!', canvasW / 2, centerY);
        } else if (playerScore === aiScore) {
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold ' + Math.min(canvasW / 7, 56) + 'px sans-serif';
            ctx.fillText('DRAW!', canvasW / 2, centerY);
        } else {
            ctx.fillStyle = COLORS.ai;
            ctx.font = 'bold ' + Math.min(canvasW / 7, 56) + 'px sans-serif';
            ctx.fillText('DEFEAT', canvasW / 2, centerY);
        }

        // Scores
        var scoreY = centerY + 60;
        ctx.font = 'bold ' + Math.min(canvasW / 12, 32) + 'px sans-serif';

        ctx.fillStyle = COLORS.player;
        ctx.fillText('YOU: ' + playerScore, canvasW / 2 - 80, scoreY);

        ctx.fillStyle = COLORS.ai;
        ctx.fillText((rivalName || 'AI') + ': ' + aiScore, canvasW / 2 + 80, scoreY);

        // Play again button
        var btnY = canvasH * 0.65;
        var btnW = Math.min(canvasW * 0.5, 220);
        var btnH = 50;
        var pulse = Math.sin(gameTime * 3) * 3;

        ctx.fillStyle = COLORS.player;
        ctx.globalAlpha = 0.9;
        roundRect(ctx, canvasW / 2 - btnW / 2, btnY - btnH / 2 + pulse, btnW, btnH, 12);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#000';
        ctx.font = 'bold ' + Math.min(canvasW / 14, 24) + 'px sans-serif';
        ctx.fillText('PLAY AGAIN', canvasW / 2, btnY + pulse + 2);

        ctx.textBaseline = 'alphabetic';
    }

    function renderTurnIndicator(ctx, canvasW, isPlayerTurn, gameTime) {
        var text = isPlayerTurn ? 'YOUR TURN' : 'AI THINKING...';
        var color = isPlayerTurn ? COLORS.player : COLORS.ai;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 + Math.sin(gameTime * 5) * 0.3;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvasW / 2, 64);
        ctx.globalAlpha = 1;
    }

    function renderShrinkWarning(ctx, canvasW, canvasH, timeToShrink, gameTime) {
        if (timeToShrink > 5) return;

        var alpha = 0.5 + Math.sin(gameTime * 8) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BOARD SHRINKING IN ' + Math.ceil(timeToShrink), canvasW / 2, canvasH * 0.72 + 20);
        ctx.globalAlpha = 1;
    }

    function roundRect(ctx, x, y, w, h, r) {
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

    // Returns hex under screen position, or null
    function screenToHex(screenX, screenY) {
        var localX = screenX - boardCenterX;
        var localY = screenY - boardCenterY;
        return HexGrid.pixelToAxial(localX, localY, hexSize);
    }

    function getOfferTrayBounds(canvasW, canvasH, offerCount) {
        var trayH = canvasH * 0.2;
        var trayY = canvasH - trayH;
        var slotWidth = Math.min(canvasW / offerCount, 160);
        var startX = canvasW / 2 - (offerCount * slotWidth) / 2;

        var bounds = [];
        for (var i = 0; i < offerCount; i++) {
            bounds.push({
                x: startX + slotWidth * i,
                y: trayY,
                w: slotWidth,
                h: trayH,
                index: i
            });
        }
        return bounds;
    }

    return {
        COLORS: COLORS,
        calculateLayout: calculateLayout,
        getHexPixelPos: getHexPixelPos,
        drawHex: drawHex,
        renderBoard: renderBoard,
        renderOfferTray: renderOfferTray,
        renderTimer: renderTimer,
        renderScores: renderScores,
        renderMenu: renderMenu,
        renderGameOver: renderGameOver,
        renderTurnIndicator: renderTurnIndicator,
        renderShrinkWarning: renderShrinkWarning,
        screenToHex: screenToHex,
        getOfferTrayBounds: getOfferTrayBounds,
        hexSize: function() { return hexSize; },
        boardCenterX: function() { return boardCenterX; },
        boardCenterY: function() { return boardCenterY; }
    };
})();
