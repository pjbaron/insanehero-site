/**
 * Hex Clash - Territory capture hex game
 * State machine, game loop, Poki lifecycle
 */

import { InputManager } from './input.js';

/** Config */
export const Config = {
    adsEnabled: false,
    BOARD_RADIUS: 4,
    MATCH_TIME: 60,
    SHRINK_INTERVAL: 15,  // seconds between shrinks
    AI_TURN_DELAY: 0.5,   // seconds AI "thinks"
    AI_PLACE_DELAY: 0.3,  // delay after AI places before player's turn
};

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading'; // loading -> menu -> playing -> gameover
        this.score = 0;
        this.lastTime = 0;
        this.gameTime = 0; // total elapsed for animations

        // Board state
        this.cells = {};
        this.activeRadius = Config.BOARD_RADIUS;

        // Turn state
        this.isPlayerTurn = true;
        this.turnNumber = 0;
        this.playerOffer = [];
        this.selectedPieceIndex = -1;
        this.pieceRotation = 0;
        this.validPlacements = [];

        // AI state
        this.aiThinkTimer = 0;
        this.aiPlaceTimer = 0;
        this.aiMove = null;
        this.aiOffer = [];

        // Timer
        this.matchTimeLeft = Config.MATCH_TIME;
        this.shrinkTimer = Config.SHRINK_INTERVAL;
        this.nextShrinkRadius = Config.BOARD_RADIUS - 1;

        // Scores
        this.playerScore = 0;
        this.aiScore = 0;

        // Hover state
        this.hoverQ = null;
        this.hoverR = null;

        // Capture animation queue
        this.captureQueue = [];
        this.captureTimer = 0;
        this.processingCaptures = false;

        // League
        this.rivalName = 'AI';
        this.rivalDifficulty = 1;
        this.rivalStyle = 'aggressive';

        // Win state
        this.isWin = false;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);
    }

    async init() {
        await Poki.init();
        this._resize();
        await this.loadAssets();
        League.load();
        Poki.gameLoadingFinished();
        this.state = 'menu';
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);
    }

    async loadAssets() {
        // No external assets needed - all procedural
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _loop(now) {
        var dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = now;
        this.gameTime += dt;

        this.update(dt);
        this.render();
        this.input.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // -------------------------------------------------------
    // State transitions
    // -------------------------------------------------------

    start() {
        this.state = 'playing';
        GameAudio.initContext();
        GameAudio.resume();
        Poki.gameplayStart();

        this.initBoard();
    }

    initBoard() {
        this.cells = HexGrid.generateBoard(Config.BOARD_RADIUS);
        this.activeRadius = Config.BOARD_RADIUS;
        this.isPlayerTurn = true;
        this.turnNumber = 0;
        this.matchTimeLeft = Config.MATCH_TIME;
        this.shrinkTimer = Config.SHRINK_INTERVAL;
        this.nextShrinkRadius = Config.BOARD_RADIUS - 1;
        this.playerScore = 0;
        this.aiScore = 0;
        this.selectedPieceIndex = -1;
        this.pieceRotation = 0;
        this.validPlacements = [];
        this.hoverQ = null;
        this.hoverR = null;
        this.captureQueue = [];
        this.captureTimer = 0;
        this.processingCaptures = false;
        this.aiThinkTimer = 0;
        this.aiPlaceTimer = 0;
        this.aiMove = null;

        // Load rival info
        var info = League.getInfo();
        this.rivalName = info.rivalName;
        this.rivalDifficulty = info.rivalDifficulty;
        this.rivalStyle = info.rivalStyle;

        Effects.clear();

        // Generate first offer for player
        this.playerOffer = HexPieces.generateOffer(this.turnNumber);
        this.autoSelectPiece();

        HexRenderer.calculateLayout(this.canvas.width, this.canvas.height, this.activeRadius);
    }

    gameOver() {
        this.state = 'gameover';
        Poki.gameplayStop();

        // Calculate final scores
        var counts = HexGrid.countCells(this.cells, this.activeRadius);
        this.playerScore = counts[1];
        this.aiScore = counts[2];
        this.isWin = this.playerScore > this.aiScore;

        if (this.isWin) {
            League.recordWin();
            Effects.screenFlash('#00d2ff');
            Effects.addShake(8, 0.4);
            SFX.win();
        } else if (this.playerScore < this.aiScore) {
            League.recordLoss();
            Effects.screenFlash('#ff6b6b');
            SFX.lose();
        }
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                () => GameAudio.muteAll(),
                () => GameAudio.unmuteAll()
            );
        }
        this.state = 'playing';
        Poki.gameplayStart();
        this.initBoard();
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    update(dt) {
        Effects.update(dt);

        if (this.state === 'menu') {
            this.updateMenu(dt);
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.updateGameOver(dt);
        }
    }

    updateMenu(dt) {
        if (this.input.wasTapped() || this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
            this.start();
        }
    }

    updateGameOver(dt) {
        if (this.input.wasTapped() || this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
            this.restart();
        }
    }

    updatePlaying(dt) {
        // Recalculate layout on resize
        HexRenderer.calculateLayout(this.canvas.width, this.canvas.height, this.activeRadius);

        // Timer countdown
        this.matchTimeLeft -= dt;
        this.shrinkTimer -= dt;

        // Board shrink
        if (this.shrinkTimer <= 0 && this.activeRadius > 1) {
            this.shrinkBoard();
            this.shrinkTimer = Config.SHRINK_INTERVAL;
        }

        // Time's up
        if (this.matchTimeLeft <= 0) {
            this.gameOver();
            return;
        }

        // Process capture animations
        if (this.processingCaptures) {
            this.captureTimer -= dt;
            if (this.captureTimer <= 0) {
                this.processNextCapture();
            }
            return; // Don't allow input during capture animations
        }

        // Update scores
        var counts = HexGrid.countCells(this.cells, this.activeRadius);
        this.playerScore = counts[1];
        this.aiScore = counts[2];

        if (this.isPlayerTurn) {
            this.updatePlayerTurn(dt);
        } else {
            this.updateAITurn(dt);
        }
    }

    updatePlayerTurn(dt) {
        // Update hover position from mouse
        var hex = HexRenderer.screenToHex(this.input.mouseX, this.input.mouseY);
        if (hex && HexGrid.distFromCenter(hex.q, hex.r) <= this.activeRadius) {
            this.hoverQ = hex.q;
            this.hoverR = hex.r;
        } else {
            this.hoverQ = null;
            this.hoverR = null;
        }

        if (!this.input.wasTapped()) return;

        var tapX = this.input.tapX;
        var tapY = this.input.tapY;

        // Check if tapped in offer tray
        var trayBounds = HexRenderer.getOfferTrayBounds(this.canvas.width, this.canvas.height, this.playerOffer.length);
        var tappedTray = false;
        for (var i = 0; i < trayBounds.length; i++) {
            var b = trayBounds[i];
            if (tapX >= b.x && tapX <= b.x + b.w && tapY >= b.y && tapY <= b.y + b.h) {
                if (this.selectedPieceIndex === i) {
                    // Tapped same piece = rotate
                    this.pieceRotation = (this.pieceRotation + 1) % 6;
                    SFX.rotate();
                } else {
                    // Select new piece
                    this.selectedPieceIndex = i;
                    this.pieceRotation = 0;
                    SFX.select();
                }
                this.updateValidPlacements();
                tappedTray = true;
                break;
            }
        }

        if (tappedTray) return;

        // Check if tapped on board
        var tapHex = HexRenderer.screenToHex(tapX, tapY);
        if (!tapHex) return;
        if (HexGrid.distFromCenter(tapHex.q, tapHex.r) > this.activeRadius) return;

        // Try to place selected piece
        if (this.selectedPieceIndex < 0 || this.selectedPieceIndex >= this.playerOffer.length) return;

        var piece = this.playerOffer[this.selectedPieceIndex];
        var offsets = HexPieces.rotatePiece(piece.offsets, this.pieceRotation);

        if (!HexPieces.canPlace(offsets, tapHex.q, tapHex.r, this.cells, this.activeRadius)) return;

        // Place the piece!
        SFX.place();
        var placed = HexPieces.placePiece(offsets, tapHex.q, tapHex.r, this.cells, 1);

        // Spawn placement particles
        for (var i = 0; i < placed.length; i++) {
            var pos = HexRenderer.getHexPixelPos(placed[i].q, placed[i].r);
            Effects.spawnParticles(pos.x, pos.y, HexRenderer.COLORS.player, 6, 60, 3);
            Effects.addPulse(pos.x, pos.y, HexRenderer.COLORS.player, HexRenderer.hexSize() * 1.5);
        }

        // Check captures
        var captures = HexGrid.findCaptures(this.cells, this.activeRadius, 1);
        if (captures.length > 0) {
            this.startCaptureAnimation(captures, 1);
        } else {
            this.endPlayerTurn();
        }
    }

    endPlayerTurn() {
        this.turnNumber++;
        this.isPlayerTurn = false;
        this.selectedPieceIndex = -1;
        this.pieceRotation = 0;
        this.validPlacements = [];
        this.hoverQ = null;
        this.hoverR = null;

        // Generate AI offer
        this.aiOffer = HexPieces.generateOffer(this.turnNumber);
        this.aiThinkTimer = Config.AI_TURN_DELAY;
        this.aiMove = null;

        // Check if AI can make any move
        var hasMove = false;
        for (var i = 0; i < this.aiOffer.length; i++) {
            for (var rot = 0; rot < 6; rot++) {
                var offsets = HexPieces.rotatePiece(this.aiOffer[i].offsets, rot);
                var placements = HexPieces.getValidPlacements(offsets, this.cells, this.activeRadius);
                if (placements.length > 0) {
                    hasMove = true;
                    break;
                }
            }
            if (hasMove) break;
        }

        if (!hasMove) {
            // AI can't move - check if board is full
            var empty = HexGrid.getEmptyCells(this.cells, this.activeRadius);
            if (empty.length === 0) {
                this.gameOver();
            } else {
                this.startPlayerTurn();
            }
        }
    }

    updateAITurn(dt) {
        this.aiThinkTimer -= dt;

        if (this.aiThinkTimer <= 0 && !this.aiMove) {
            // AI decides
            this.aiMove = HexAI.chooseMove(
                this.cells,
                this.activeRadius,
                this.aiOffer,
                this.rivalDifficulty,
                this.rivalStyle
            );

            if (!this.aiMove) {
                // No valid move, skip
                this.startPlayerTurn();
                return;
            }

            this.aiPlaceTimer = Config.AI_PLACE_DELAY;
        }

        if (this.aiMove && this.aiPlaceTimer > 0) {
            this.aiPlaceTimer -= dt;
            if (this.aiPlaceTimer <= 0) {
                this.executeAIMove();
            }
        }
    }

    executeAIMove() {
        var move = this.aiMove;
        SFX.aiPlace();
        var placed = HexPieces.placePiece(move.offsets, move.q, move.r, this.cells, 2);

        // Spawn placement particles
        for (var i = 0; i < placed.length; i++) {
            var pos = HexRenderer.getHexPixelPos(placed[i].q, placed[i].r);
            Effects.spawnParticles(pos.x, pos.y, HexRenderer.COLORS.ai, 6, 60, 3);
            Effects.addPulse(pos.x, pos.y, HexRenderer.COLORS.ai, HexRenderer.hexSize() * 1.5);
        }

        // Check captures
        var captures = HexGrid.findCaptures(this.cells, this.activeRadius, 2);
        if (captures.length > 0) {
            this.startCaptureAnimation(captures, 2);
        } else {
            this.startPlayerTurn();
        }
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.turnNumber++;

        // Generate new offer
        this.playerOffer = HexPieces.generateOffer(this.turnNumber);
        this.pieceRotation = 0;
        this.autoSelectPiece();

        // Check if player can make any move (try all rotations of all pieces)
        if (this.validPlacements.length === 0) {
            var found = false;
            for (var i = 0; i < this.playerOffer.length; i++) {
                for (var rot = 0; rot < 6; rot++) {
                    var offsets = HexPieces.rotatePiece(this.playerOffer[i].offsets, rot);
                    var placements = HexPieces.getValidPlacements(offsets, this.cells, this.activeRadius);
                    if (placements.length > 0) {
                        this.selectedPieceIndex = i;
                        this.pieceRotation = rot;
                        this.validPlacements = placements;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            if (!found) {
                // Board is full or no valid moves - end game
                this.gameOver();
            }
        }
    }

    autoSelectPiece() {
        // Auto-select first piece that has valid placements
        this.selectedPieceIndex = -1;
        for (var i = 0; i < this.playerOffer.length; i++) {
            var offsets = this.playerOffer[i].offsets;
            var placements = HexPieces.getValidPlacements(offsets, this.cells, this.activeRadius);
            if (placements.length > 0) {
                this.selectedPieceIndex = i;
                this.validPlacements = placements;
                return;
            }
        }
        // No piece has valid placements
        this.validPlacements = [];
    }

    updateValidPlacements() {
        if (this.selectedPieceIndex < 0 || this.selectedPieceIndex >= this.playerOffer.length) {
            this.validPlacements = [];
            return;
        }
        var piece = this.playerOffer[this.selectedPieceIndex];
        var offsets = HexPieces.rotatePiece(piece.offsets, this.pieceRotation);
        this.validPlacements = HexPieces.getValidPlacements(offsets, this.cells, this.activeRadius);
    }

    // -------------------------------------------------------
    // Capture Animations
    // -------------------------------------------------------

    startCaptureAnimation(captures, placer) {
        this.captureQueue = [];
        var cascadeLevel = 0;

        // Initial captures
        for (var i = 0; i < captures.length; i++) {
            this.captureQueue.push({
                capture: captures[i],
                placer: placer,
                cascadeLevel: cascadeLevel
            });
        }

        this.processingCaptures = true;
        this.captureTimer = 0.05; // small delay before first
    }

    processNextCapture() {
        if (this.captureQueue.length === 0) {
            // Check for chain captures
            var lastPlacer = this.lastCapturePlacer;
            var chainCaptures = HexGrid.findCaptures(this.cells, this.activeRadius, lastPlacer);
            if (chainCaptures.length > 0) {
                this.cascadeLevel = (this.cascadeLevel || 0) + 1;
                for (var i = 0; i < chainCaptures.length; i++) {
                    this.captureQueue.push({
                        capture: chainCaptures[i],
                        placer: lastPlacer,
                        cascadeLevel: this.cascadeLevel
                    });
                }
                this.captureTimer = 0.3;
                return;
            }

            // Done with captures
            this.processingCaptures = false;
            this.cascadeLevel = 0;

            if (this.isPlayerTurn) {
                this.endPlayerTurn();
            } else {
                this.startPlayerTurn();
            }
            return;
        }

        var item = this.captureQueue.shift();
        this.lastCapturePlacer = item.placer;
        this.cascadeLevel = item.cascadeLevel;

        var capturedKeys = Object.keys(item.capture.group);
        var placerColor = item.placer === 1 ? HexRenderer.COLORS.player : HexRenderer.COLORS.ai;
        var fromColor = item.placer === 1 ? HexRenderer.COLORS.ai : HexRenderer.COLORS.player;

        // Execute the capture
        var flipped = 0;
        for (var i = 0; i < capturedKeys.length; i++) {
            this.cells[capturedKeys[i]].owner = item.placer;
            flipped++;

            var pos = HexGrid.parseKey(capturedKeys[i]);
            var pixelPos = HexRenderer.getHexPixelPos(pos.q, pos.r);

            // Flip animation with staggered delay
            Effects.addFlipAnimation(pixelPos.x, pixelPos.y, fromColor, placerColor, i * 0.05);

            // Capture particles
            Effects.spawnCaptureEffect(pixelPos.x, pixelPos.y, placerColor, item.cascadeLevel);
        }

        // Sound + screen shake based on capture size and cascade
        SFX.capture(item.cascadeLevel);
        var shakeAmount = Math.min(3 + flipped * 1.5 + item.cascadeLevel * 3, 20);
        Effects.addShake(shakeAmount, 0.3 + item.cascadeLevel * 0.1);

        // Score popup
        if (flipped > 0) {
            var centerQ = 0, centerR = 0;
            for (var i = 0; i < capturedKeys.length; i++) {
                var p = HexGrid.parseKey(capturedKeys[i]);
                centerQ += p.q;
                centerR += p.r;
            }
            centerQ = Math.round(centerQ / capturedKeys.length);
            centerR = Math.round(centerR / capturedKeys.length);
            var centerPos = HexRenderer.getHexPixelPos(centerQ, centerR);

            var popupText = '+' + flipped;
            if (item.cascadeLevel > 0) {
                popupText += ' CHAIN!';
            }
            Effects.addPopup(centerPos.x, centerPos.y, popupText, placerColor);

            // Color flash on big captures
            if (flipped >= 3 || item.cascadeLevel > 0) {
                Effects.screenFlash(placerColor);
            }
        }

        // Wait for animation to play out
        this.captureTimer = 0.3 + capturedKeys.length * 0.05;
    }

    // -------------------------------------------------------
    // Board Shrink
    // -------------------------------------------------------

    shrinkBoard() {
        if (this.activeRadius <= 1) return;

        var oldRadius = this.activeRadius;
        this.activeRadius--;
        this.nextShrinkRadius = this.activeRadius - 1;

        // Clear cells outside new radius
        var allKeys = Object.keys(this.cells);
        for (var i = 0; i < allKeys.length; i++) {
            var cell = this.cells[allKeys[i]];
            if (HexGrid.distFromCenter(cell.q, cell.r) > this.activeRadius) {
                if (cell.owner !== 0) {
                    // Spawn particles for disappearing cells
                    var pos = HexRenderer.getHexPixelPos(cell.q, cell.r);
                    var color = cell.owner === 1 ? HexRenderer.COLORS.player : HexRenderer.COLORS.ai;
                    Effects.spawnParticles(pos.x, pos.y, color, 4, 40, 2);
                }
                cell.owner = 0;
            }
        }

        SFX.shrink();
        Effects.addShake(6, 0.4);
        Effects.screenFlash('#ff4444');

        // Update valid placements
        if (this.isPlayerTurn) {
            this.updateValidPlacements();
        }
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        if (this.state === 'loading') {
            this.renderLoading();
        } else if (this.state === 'menu') {
            HexRenderer.renderMenu(ctx, w, h, this.gameTime, League.getInfo());
        } else if (this.state === 'playing') {
            this.renderPlaying();
        } else if (this.state === 'gameover') {
            this.renderPlayingBoard(); // Show board behind
            HexRenderer.renderGameOver(ctx, w, h, this.playerScore, this.aiScore, this.isWin, this.rivalName, this.gameTime);
            Effects.renderPopups(ctx);
        }
    }

    renderLoading() {
        var ctx = this.ctx;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
    }

    renderPlaying() {
        var ctx = this.ctx;
        var shake = Effects.getShakeOffset();

        ctx.save();
        ctx.translate(shake.x, shake.y);

        this.renderPlayingBoard();

        ctx.restore();

        // UI elements not affected by shake
        Effects.renderFlash(ctx, this.canvas.width, this.canvas.height);
    }

    renderPlayingBoard() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Background
        ctx.fillStyle = HexRenderer.COLORS.bg;
        ctx.fillRect(0, 0, w, h);

        // Get selected piece offsets for preview
        var selectedOffsets = null;
        if (this.isPlayerTurn && this.selectedPieceIndex >= 0 && this.selectedPieceIndex < this.playerOffer.length) {
            selectedOffsets = HexPieces.rotatePiece(this.playerOffer[this.selectedPieceIndex].offsets, this.pieceRotation);
        }

        // Draw board
        HexRenderer.renderBoard(
            ctx, this.cells, this.activeRadius,
            this.isPlayerTurn ? this.validPlacements : [],
            this.hoverQ, this.hoverR,
            selectedOffsets, 1,
            this.gameTime
        );

        // Pulse effects
        Effects.renderPulses(ctx);

        // Particles
        Effects.renderParticles(ctx);

        // Popups
        Effects.renderPopups(ctx);

        // Timer
        HexRenderer.renderTimer(ctx, this.matchTimeLeft, Config.MATCH_TIME, w, h);

        // Scores
        HexRenderer.renderScores(ctx, this.playerScore, this.aiScore, w, this.rivalName);

        // Turn indicator
        HexRenderer.renderTurnIndicator(ctx, w, this.isPlayerTurn, this.gameTime);

        // Shrink warning
        if (this.activeRadius > 1) {
            HexRenderer.renderShrinkWarning(ctx, w, h, this.shrinkTimer, this.gameTime);
        }

        // Offer tray (only during player turn)
        if (this.isPlayerTurn && !this.processingCaptures) {
            HexRenderer.renderOfferTray(ctx, this.playerOffer, this.selectedPieceIndex, w, h, this.pieceRotation);
        }
    }
}
