/**
 * Stack Thief - Main Game Logic
 * Swipe to steal blocks from wobbling towers and stack them onto yours
 */

import { InputManager } from './input.js';

export const Config = {
    adsEnabled: false,
};

// Easing functions
function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutBounce(t) {
    if (t < 1 / 2.75) {
        return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
        t -= 1.5 / 2.75;
        return 7.5625 * t * t + 0.75;
    } else if (t < 2.5 / 2.75) {
        t -= 2.25 / 2.75;
        return 7.5625 * t * t + 0.9375;
    } else {
        t -= 2.625 / 2.75;
        return 7.5625 * t * t + 0.984375;
    }
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.state = 'loading';
        this.score = 0;
        this.lastTime = 0;
        this.time = 0;
        this.paused = false;

        // Virtual game dimensions
        this.VIRTUAL_WIDTH = 400;
        this.scale = 1;
        this.gameAreaX = 0;
        this.gameAreaW = 400;

        // Game state
        this.highScore = 0;
        this.bestHeight = 0;
        this.round = 1;
        this.roundTimer = 45;
        this.roundDuration = 45;
        this.comboCount = 0;
        this.comboBest = 0;
        this.comboDisplayTimer = 0;
        this.dangerAngle = 0.22;
        this.braceActive = false;
        this.braceCooldown = 0;
        this.braceDuration = 1.5;
        this.braceMaxCooldown = 3;
        this.braceTimer = 0;
        this.earthquakeIntensity = 0;
        this.stealCooldown = 0;

        this.playerTower = null;
        this.rivalTowers = [];
        this.flyingBlocks = [];
        this.scorePopups = [];
        this.roundOverReason = '';
        this.dangerActive = false;
        this.dangerSfxCooldown = 0;

        // Camera
        this.cameraY = 0;
        this.cameraTargetY = 0;
        this.groundY = 0;

        // Screen shake
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        // Round start animation
        this.roundStartTimer = 0;

        // Tower rise animation
        this.towerRiseTimer = 0;

        // Tap tracking
        this.pendingTap = null;

        // Menu demo towers
        this.menuTowers = [];
        this.menuTime = 0;

        // Game over state
        this.gameOverTimer = 0;
        this.newHighScore = false;

        // Round transition
        this.roundTransition = false;
        this.roundEndTimer = 0;
        this.roundEndBonus = 0;

        this._boundLoop = this._loop.bind(this);
        this._resize = this._resize.bind(this);
        window.addEventListener('resize', this._resize);

        // Pointer events for position tracking
        this._onPointerDown = this._onPointerDown.bind(this);
        canvas.addEventListener('pointerdown', this._onPointerDown);

        // Visibility change
        this._onVisChange = this._onVisChange.bind(this);
        document.addEventListener('visibilitychange', this._onVisChange);
    }

    _onPointerDown(e) {
        e.preventDefault();
        var rect = this.canvas.getBoundingClientRect();
        var scaleX = this.canvas.width / rect.width;
        var scaleY = this.canvas.height / rect.height;
        var cx = (e.clientX - rect.left) * scaleX;
        var cy = (e.clientY - rect.top) * scaleY;
        this.pendingTap = { x: cx, y: cy };
    }

    _onVisChange() {
        if (document.hidden) {
            this.paused = true;
        } else {
            this.paused = false;
            this._skipNextDt = true;
        }
    }

    async init() {
        await Poki.init();
        this._resize();
        await this.loadAssets();
        Poki.gameLoadingFinished();
        this.state = 'menu';
        this._initMenu();
        this.lastTime = performance.now();
        requestAnimationFrame(this._boundLoop);
    }

    async loadAssets() {
        try {
            var hs = localStorage.getItem('stackthief_highscore');
            if (hs) this.highScore = parseInt(hs, 10) || 0;
            var bh = localStorage.getItem('stackthief_bestheight');
            if (bh) this.bestHeight = parseInt(bh, 10) || 0;
        } catch (e) {}

        Renderer.initStars(25);
    }

    _resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.floor(window.innerWidth * dpr);
        this.canvas.height = Math.floor(window.innerHeight * dpr);

        var cw = this.canvas.width;
        var ch = this.canvas.height;
        var targetAspect = 9 / 16;
        var currentAspect = cw / ch;

        if (currentAspect > targetAspect * 1.3) {
            this.gameAreaW = ch * targetAspect;
            this.gameAreaX = (cw - this.gameAreaW) / 2;
        } else {
            this.gameAreaW = cw;
            this.gameAreaX = 0;
        }

        this.scale = this.gameAreaW / this.VIRTUAL_WIDTH;
        this.groundY = (ch / this.scale) - 60;

        if (this.playerTower) {
            this._repositionTowers();
        }
    }

    _repositionTowers() {
        var towers = [this.playerTower].concat(this.rivalTowers);
        var count = towers.length;
        var spacing = this.VIRTUAL_WIDTH / (count + 1);
        for (var i = 0; i < count; i++) {
            towers[i].x = spacing * (i + 1);
            towers[i].baseY = this.groundY;
        }
    }

    _loop(now) {
        var dt = (now - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        if (this._skipNextDt) {
            dt = 0;
            this._skipNextDt = false;
        }
        this.lastTime = now;

        if (!this.paused) {
            this.time += dt;
            this.update(dt);
        }
        this.render();
        this.input.endFrame();

        requestAnimationFrame(this._boundLoop);
    }

    // -------------------------------------------------------
    // State transitions
    // -------------------------------------------------------

    start() {
        this.state = 'playing';
        this.score = 0;
        this.round = 1;
        this.comboCount = 0;
        this.comboBest = 0;
        GameAudio.initContext();
        GameAudio.resume();
        if (GameAudio.ctx) SFX.init(GameAudio.ctx);
        this._startRound();
        Poki.gameplayStart();
    }

    _startRound() {
        this.roundTimer = this.roundDuration;
        this.earthquakeIntensity = 0;
        this.braceActive = false;
        this.braceCooldown = 0;
        this.braceTimer = 0;
        this.stealCooldown = 0;
        this.comboCount = 0;
        this.flyingBlocks = [];
        this.scorePopups = [];
        this.dangerActive = false;
        this.roundTransition = false;
        ParticleSystem.clear();

        var narrow = (this.VIRTUAL_WIDTH < 350);
        var rivalCount = narrow ? 2 : 3;
        var minBlocks = Math.min(5 + this.round - 1, 8);
        var maxBlocks = Math.min(7 + this.round, 12);

        var playerHue = 190 + Math.random() * 30;
        this.playerTower = TowerFactory.createTower(0, this.groundY, 2, playerHue, true);

        var rivalHues = [10, 110, 290, 35];
        this.rivalTowers = [];
        for (var i = 0; i < rivalCount; i++) {
            var blockCount = minBlocks + Math.floor(Math.random() * (maxBlocks - minBlocks + 1));
            var hue = rivalHues[i % rivalHues.length];
            var tower = TowerFactory.createTower(0, this.groundY, blockCount, hue, false);
            this.rivalTowers.push(tower);
        }

        this._repositionTowers();

        this.cameraY = 0;
        this.cameraTargetY = 0;
        this._updateCamera(0);

        this.roundStartTimer = 1.5;
        this.towerRiseTimer = 0.5;

        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeTimer = 0;
    }

    gameOver() {
        this.state = 'gameover';
        this.gameOverTimer = 0;
        this.newHighScore = false;

        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.newHighScore = true;
            try { localStorage.setItem('stackthief_highscore', '' + this.highScore); } catch (e) {}
            SFX.playHighScore();
        }
        if (this.playerTower && this.playerTower.blocks.length > this.bestHeight) {
            this.bestHeight = this.playerTower.blocks.length;
            try { localStorage.setItem('stackthief_bestheight', '' + this.bestHeight); } catch (e) {}
        }

        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                function() { GameAudio.muteAll(); },
                function() { GameAudio.unmuteAll(); }
            );
        }
        this.state = 'playing';
        this.score = 0;
        this.round = 1;
        this.comboCount = 0;
        this.comboBest = 0;
        this._startRound();
        Poki.gameplayStart();
    }

    _nextRound() {
        this.round++;
        this._startRound();
    }

    // -------------------------------------------------------
    // Menu
    // -------------------------------------------------------

    _initMenu() {
        this.menuTowers = [];
        var hues = [190, 10, 110];
        for (var i = 0; i < 3; i++) {
            var count = 5 + Math.floor(Math.random() * 5);
            var t = TowerFactory.createTower(
                80 + i * 120,
                this.groundY,
                count, hues[i], false
            );
            t.angularVelocity = (Math.random() - 0.5) * 0.3;
            this.menuTowers.push(t);
        }
        this.menuTime = 0;
    }

    // -------------------------------------------------------
    // Update
    // -------------------------------------------------------

    update(dt) {
        if (this.state === 'menu') {
            this.updateMenu(dt);
            var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();
            if (confirm || this.pendingTap) {
                this.pendingTap = null;
                this.start();
            }
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            this.updateGameOver(dt);
        }
    }

    updateMenu(dt) {
        this.menuTime += dt;
        for (var i = 0; i < this.menuTowers.length; i++) {
            TowerPhysics.updateTower(this.menuTowers[i], dt, 0.2, false);
            if (Math.abs(this.menuTowers[i].angle) > 0.3) {
                this.menuTowers[i].angularVelocity *= -0.5;
                this.menuTowers[i].angle *= 0.95;
            }
        }
    }

    updateGameOver(dt) {
        this.gameOverTimer += dt;
        ParticleSystem.update(dt);

        if (this.playerTower && this.playerTower.isCollapsed) {
            TowerPhysics.updateTower(this.playerTower, dt, 0, false);
        }
        for (var i = 0; i < this.rivalTowers.length; i++) {
            if (this.rivalTowers[i].isCollapsed) {
                TowerPhysics.updateTower(this.rivalTowers[i], dt, 0, false);
            }
        }

        if (this.gameOverTimer > 0.8) {
            var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();
            if (confirm || this.pendingTap) {
                this.pendingTap = null;
                this.restart();
            }
        }
    }

    updatePlaying(dt) {
        if (this.roundStartTimer > 0) {
            this.roundStartTimer -= dt;
        }
        if (this.towerRiseTimer > 0) {
            this.towerRiseTimer -= dt;
        }

        // Round transition
        if (this.roundTransition) {
            this.roundEndTimer -= dt;
            if (this.roundEndTimer <= 0) {
                this._nextRound();
            }
            this.pendingTap = null;
            return;
        }

        // Timer
        this.roundTimer -= dt;
        if (this.roundTimer <= 0) {
            this.roundTimer = 0;
            this.roundOverReason = 'timeup';
            SFX.playTimeUp();
            this._endRound();
            return;
        }

        // Earthquake ramp
        var quakeFullAt = Math.max(35, 45 - (this.round - 1) * 3);
        var elapsed = this.roundDuration - this.roundTimer;
        this.earthquakeIntensity = Math.min(1, Math.max(0, elapsed / quakeFullAt));

        // Cooldowns
        this.stealCooldown = Math.max(0, this.stealCooldown - dt);
        this.braceCooldown = Math.max(0, this.braceCooldown - dt);
        this.dangerSfxCooldown = Math.max(0, this.dangerSfxCooldown - dt);
        this.comboDisplayTimer = Math.max(0, this.comboDisplayTimer - dt);

        // Brace timer
        if (this.braceActive) {
            this.braceTimer -= dt;
            if (this.braceTimer <= 0) {
                this.braceActive = false;
                this.braceCooldown = this.braceMaxCooldown;
            }
        }

        // Flash timers
        this._updateBlockFlashTimers(dt);

        // Process input
        this._processInput();

        // Flying blocks
        this._updateFlyingBlocks(dt);

        // Physics
        TowerPhysics.updateTower(this.playerTower, dt, this.earthquakeIntensity, this.braceActive);
        for (var i = 0; i < this.rivalTowers.length; i++) {
            TowerPhysics.updateTower(this.rivalTowers[i], dt, this.earthquakeIntensity, false);
        }

        // Player topple check
        if (TowerPhysics.checkTopple(this.playerTower)) {
            this.roundOverReason = 'toppled';
            TowerPhysics.collapseTower(this.playerTower);
            this._spawnCollapseParticles(this.playerTower);
            SFX.playCollapse();
            this._addShake(8, 0.4);
            this.gameOver();
            return;
        }

        // Rival topple check
        for (var j = this.rivalTowers.length - 1; j >= 0; j--) {
            var rival = this.rivalTowers[j];
            if (!rival.isCollapsed && TowerPhysics.checkTopple(rival)) {
                TowerPhysics.collapseTower(rival);
                this._spawnCollapseParticles(rival);
                SFX.playCollapse();
                this._addShake(5, 0.3);
                this.score += 25;
                this._addScorePopup(rival.x, TowerFactory.getTowerTopY(rival), '+25', '#ff8800');
            }
        }

        // Danger check
        this.dangerActive = this.playerTower && Math.abs(this.playerTower.angle) > this.dangerAngle;
        if (this.dangerActive) {
            this.comboCount = 0;
            if (this.dangerSfxCooldown <= 0) {
                SFX.playDanger();
                this.dangerSfxCooldown = 2;
            }
            if (Math.random() < 0.3) {
                ParticleSystem.spawn('danger_spark', Math.random() * this.VIRTUAL_WIDTH, Math.random() * (this.groundY - 100), 1, '#ff3333');
            }
        }

        // Clean sweep check
        var allDone = true;
        for (var k = 0; k < this.rivalTowers.length; k++) {
            if (!this.rivalTowers[k].isCollapsed && this.rivalTowers[k].blocks.length > 0) {
                allDone = false;
                break;
            }
        }
        if (allDone && this.rivalTowers.length > 0 && this.flyingBlocks.length === 0) {
            this.score += 100;
            this._addScorePopup(this.VIRTUAL_WIDTH / 2, this.groundY - 200, 'CLEAN SWEEP +100', '#ffd700');
            this._endRound();
            return;
        }

        // Particles
        ParticleSystem.update(dt);

        // Score popups
        for (var p = this.scorePopups.length - 1; p >= 0; p--) {
            this.scorePopups[p].timer -= dt;
            if (this.scorePopups[p].timer <= 0) {
                this.scorePopups.splice(p, 1);
            }
        }

        // Screen shake decay
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            this.shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.shakeIntensity *= 0.85;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // Earthquake continuous shake
        if (this.earthquakeIntensity > 0.1) {
            this.shakeX += (Math.random() * 2 - 1) * this.earthquakeIntensity * 2;
            this.shakeY += (Math.random() * 2 - 1) * this.earthquakeIntensity * 2;
        }

        // Camera
        this._updateCamera(dt);
    }

    _endRound() {
        this.roundTransition = true;
        this.roundEndTimer = 2.5;
        if (this.playerTower && !this.playerTower.isCollapsed) {
            this.roundEndBonus = this.playerTower.blocks.length * 20;
            this.score += this.roundEndBonus;
        } else {
            this.roundEndBonus = 0;
        }
    }

    _updateCamera(dt) {
        var minY = this.groundY - 100;
        if (this.playerTower && !this.playerTower.isCollapsed) {
            var topY = TowerFactory.getTowerTopY(this.playerTower);
            if (topY < minY) minY = topY;
        }
        for (var i = 0; i < this.rivalTowers.length; i++) {
            if (!this.rivalTowers[i].isCollapsed) {
                var ry = TowerFactory.getTowerTopY(this.rivalTowers[i]);
                if (ry < minY) minY = ry;
            }
        }

        var screenTopVirtual = 70 / this.scale;
        var desired = -(minY - screenTopVirtual);
        this.cameraTargetY = Math.min(0, desired);

        if (dt > 0) {
            this.cameraY = lerp(this.cameraY, this.cameraTargetY, Math.min(1, 3.0 * dt));
        } else {
            this.cameraY = this.cameraTargetY;
        }
    }

    _updateBlockFlashTimers(dt) {
        if (this.playerTower) {
            for (var i = 0; i < this.playerTower.blocks.length; i++) {
                if (this.playerTower.blocks[i].flashTimer > 0)
                    this.playerTower.blocks[i].flashTimer -= dt;
            }
        }
        for (var j = 0; j < this.rivalTowers.length; j++) {
            for (var k = 0; k < this.rivalTowers[j].blocks.length; k++) {
                if (this.rivalTowers[j].blocks[k].flashTimer > 0)
                    this.rivalTowers[j].blocks[k].flashTimer -= dt;
            }
        }
    }

    // -------------------------------------------------------
    // Input
    // -------------------------------------------------------

    _processInput() {
        if (!this.pendingTap) return;
        if (this.roundStartTimer > 0.5) {
            this.pendingTap = null;
            return;
        }

        var tap = this.pendingTap;
        this.pendingTap = null;

        // Convert screen coords to virtual game coords
        var vx = (tap.x - this.gameAreaX) / this.scale;
        var vy = tap.y / this.scale - this.cameraY;

        // Hit test player tower for brace
        if (this._hitTestTower(this.playerTower, vx, vy)) {
            this._triggerBrace();
            return;
        }

        // Hit test rival towers for steal
        if (this.stealCooldown > 0) return;

        for (var i = 0; i < this.rivalTowers.length; i++) {
            var rival = this.rivalTowers[i];
            if (rival.isCollapsed || rival.blocks.length === 0) continue;

            var hitResult = this._hitTestTowerBlock(rival, vx, vy);
            if (hitResult !== null) {
                this._stealBlock(rival, hitResult);
                return;
            }
        }
    }

    _hitTestTower(tower, vx, vy) {
        if (!tower || tower.isCollapsed || tower.blocks.length === 0) return false;
        var positions = TowerFactory.getBlockWorldPositions(tower);
        for (var i = positions.length - 1; i >= 0; i--) {
            var pos = positions[i];
            var hw = pos.block.width / 2 + 12;
            var hh = BLOCK_HEIGHT / 2 + 12;
            if (vx >= pos.x - hw && vx <= pos.x + hw &&
                vy >= pos.y - hh && vy <= pos.y + hh) {
                return true;
            }
        }
        return false;
    }

    _hitTestTowerBlock(tower, vx, vy) {
        var positions = TowerFactory.getBlockWorldPositions(tower);
        var bestDist = Infinity;
        var bestIdx = null;

        for (var i = positions.length - 1; i >= 0; i--) {
            var pos = positions[i];
            var hw = pos.block.width / 2 + 12;
            var hh = BLOCK_HEIGHT / 2 + 12;
            if (vx >= pos.x - hw && vx <= pos.x + hw &&
                vy >= pos.y - hh && vy <= pos.y + hh) {
                var dx = vx - pos.x;
                var dy = vy - pos.y;
                var dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = pos.index;
                }
            }
        }
        return bestIdx;
    }

    // -------------------------------------------------------
    // Actions
    // -------------------------------------------------------

    _triggerBrace() {
        if (this.braceCooldown > 0 || this.braceActive) return;
        this.braceActive = true;
        this.braceTimer = this.braceDuration;
        SFX.playBrace();
    }

    _stealBlock(rivalTower, blockIndex) {
        var result = TowerFactory.removeBlockFromTower(rivalTower, blockIndex);
        var block = result.block;
        var shouldCollapse = result.shouldCollapse;

        this.stealCooldown = 0.25;

        // Approximate source position of stolen block
        var srcX = rivalTower.x;
        var srcY = rivalTower.baseY - (blockIndex * BLOCK_HEIGHT + BLOCK_HEIGHT / 2);

        // Set up flying block
        block.state = 'flying';
        block.startX = srcX;
        block.startY = srcY;
        block.targetX = this.playerTower.x;
        block.targetY = TowerFactory.getTowerTopY(this.playerTower) - BLOCK_HEIGHT / 2;
        block.flyProgress = 0;
        var midX = (block.startX + block.targetX) / 2;
        var midY = Math.min(block.startY, block.targetY) - 80;
        block.flyControlX = midX;
        block.flyControlY = midY;

        this.flyingBlocks.push(block);

        // Particles
        ParticleSystem.spawn('dust', srcX, srcY, 10, block.color);

        // Shake
        this._addShake(3, 0.15);

        // Sound
        SFX.playSteal();

        // Combo tracking
        if (Math.abs(this.playerTower.angle) < this.dangerAngle) {
            this.comboCount++;
            if (this.comboCount > this.comboBest) this.comboBest = this.comboCount;
            if (this.comboCount >= 2) {
                this.comboDisplayTimer = 1.0;
                if (this.comboCount >= 3) {
                    SFX.playCombo(this.comboCount);
                    ParticleSystem.spawn('star', this.playerTower.x, TowerFactory.getTowerTopY(this.playerTower), 5, '#ffd700');
                }
            }
        }

        // Score
        var points = 10 + this.comboCount * 5;
        this.score += points;
        this._addScorePopup(srcX, srcY - 20, '+' + points, '#fff');

        // Collapse check on rival
        if (shouldCollapse && !rivalTower.isCollapsed) {
            TowerPhysics.collapseTower(rivalTower);
            this._spawnCollapseParticles(rivalTower);
            SFX.playCollapse();
            this._addShake(6, 0.3);
            this.score += 50;
            this._addScorePopup(rivalTower.x, TowerFactory.getTowerTopY(rivalTower) - 30, 'COLLAPSE +50', '#ff4444');
        }
    }

    _updateFlyingBlocks(dt) {
        for (var i = this.flyingBlocks.length - 1; i >= 0; i--) {
            var block = this.flyingBlocks[i];
            block.flyProgress += dt / 0.4; // 0.4s flight

            if (block.flyProgress >= 1) {
                block.flyProgress = 1;
                this.flyingBlocks.splice(i, 1);

                // Recolor to player hue
                block.hue = this.playerTower.hue;
                var sat = 60 + Math.random() * 20;
                var light = 50 + Math.random() * 15;
                block.color = 'hsl(' + this.playerTower.hue + ',' + sat + '%,' + light + '%)';
                block.outlineColor = 'hsl(' + this.playerTower.hue + ',' + sat + '%,' + (light - 20) + '%)';
                block.topColor = 'hsl(' + this.playerTower.hue + ',' + sat + '%,' + (light + 10) + '%)';

                TowerFactory.addBlockToTower(this.playerTower, block);

                var landX = this.playerTower.x;
                var landY = TowerFactory.getTowerTopY(this.playerTower);
                ParticleSystem.spawn('land_dust', landX, landY, 6, '#888');
                SFX.playLand();
                this._addShake(2, 0.1);
            }
        }
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    _addShake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeTimer = Math.max(this.shakeTimer, duration);
    }

    _addScorePopup(x, y, text, color) {
        this.scorePopups.push({
            x: x, y: y, text: text, color: color,
            timer: 1.0, maxTimer: 1.0
        });
    }

    _spawnCollapseParticles(tower) {
        var positions = TowerFactory.getBlockWorldPositions(tower);
        for (var i = 0; i < positions.length; i++) {
            ParticleSystem.spawn('rubble', positions[i].x, positions[i].y, 3, positions[i].block.color);
        }
    }

    // -------------------------------------------------------
    // Render
    // -------------------------------------------------------

    render() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (this.state === 'loading') this.renderLoading();
        else if (this.state === 'menu') this.renderMenu();
        else if (this.state === 'playing') this.renderPlaying();
        else if (this.state === 'gameover') this.renderGameOver();
    }

    renderLoading() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', w / 2, h / 2);
    }

    renderMenu() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        var scale = this.scale;

        Renderer.drawBackground(ctx, w, h, this.menuTime);
        Renderer.drawGround(ctx, w, h, this.groundY, scale, 0);

        // Letterbox
        if (this.gameAreaX > 0) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, this.gameAreaX, h);
            ctx.fillRect(this.gameAreaX + this.gameAreaW, 0, this.gameAreaX + 1, h);
        }

        ctx.save();
        ctx.translate(this.gameAreaX, 0);
        for (var i = 0; i < this.menuTowers.length; i++) {
            Renderer.drawTower(ctx, this.menuTowers[i], scale, 0);
        }
        ctx.restore();

        // Title
        var titleSize = Math.max(28, Math.round(48 * (w / 800)));
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.font = 'bold ' + titleSize + 'px sans-serif';
        ctx.textAlign = 'center';
        var titleY = h * 0.3;
        ctx.strokeText('STACK THIEF', w / 2, titleY);
        ctx.fillText('STACK THIEF', w / 2, titleY);

        var subAlpha = 0.5 + 0.4 * Math.sin(this.menuTime * 3);
        ctx.fillStyle = 'rgba(200, 200, 200, ' + subAlpha + ')';
        ctx.font = Math.max(14, Math.round(20 * (w / 800))) + 'px sans-serif';
        ctx.fillText('Tap to Play', w / 2, titleY + 50 * (h / 600));

        if (this.highScore > 0) {
            ctx.fillStyle = '#aaa';
            ctx.font = Math.max(12, Math.round(16 * (w / 800))) + 'px sans-serif';
            ctx.fillText('Best: ' + this.highScore, w / 2, titleY + 85 * (h / 600));
        }
    }

    renderPlaying() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        var scale = this.scale;

        Renderer.drawBackground(ctx, w, h, this.time);

        // Letterbox
        if (this.gameAreaX > 0) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, this.gameAreaX, h);
            ctx.fillRect(this.gameAreaX + this.gameAreaW, 0, this.gameAreaX + 1, h);
        }

        // Game area with shake
        ctx.save();
        ctx.translate(this.gameAreaX + this.shakeX * scale, this.shakeY * scale);

        Renderer.drawGround(ctx, this.gameAreaW, h, this.groundY, scale, this.cameraY);

        // Ghost line
        if (this.bestHeight > 0) {
            var ghostY = this.groundY - this.bestHeight * BLOCK_HEIGHT;
            Renderer.drawGhostLine(ctx, ghostY, this.gameAreaW, this.time, scale, this.cameraY);
        }

        // Rise animation factor
        var riseMul = 1;
        if (this.towerRiseTimer > 0) {
            riseMul = easeOutBounce(1 - this.towerRiseTimer / 0.5);
        }

        // Rival towers
        for (var i = 0; i < this.rivalTowers.length; i++) {
            var rt = this.rivalTowers[i];
            if (this.towerRiseTimer > 0 && !rt.isCollapsed) {
                var origBase = rt.baseY;
                rt.baseY = this.groundY + (1 - riseMul) * TowerFactory.getTowerHeight(rt);
                Renderer.drawTower(ctx, rt, scale, this.cameraY);
                rt.baseY = origBase;
            } else {
                Renderer.drawTower(ctx, rt, scale, this.cameraY);
            }
        }

        // Player tower
        if (this.playerTower) {
            if (this.towerRiseTimer > 0 && !this.playerTower.isCollapsed) {
                var origPBase = this.playerTower.baseY;
                this.playerTower.baseY = this.groundY + (1 - riseMul) * TowerFactory.getTowerHeight(this.playerTower);
                Renderer.drawTower(ctx, this.playerTower, scale, this.cameraY);
                this.playerTower.baseY = origPBase;
            } else {
                Renderer.drawTower(ctx, this.playerTower, scale, this.cameraY);
            }

            if (this.braceActive) {
                Renderer.drawBraceShield(ctx, this.playerTower, scale, this.cameraY, 1);
            }
        }

        // Flying blocks
        for (var f = 0; f < this.flyingBlocks.length; f++) {
            Renderer.drawFlyingBlock(ctx, this.flyingBlocks[f], scale, this.cameraY, this.time);
        }

        // Particles
        ParticleSystem.render(ctx, scale, this.cameraY);

        // Score popups
        for (var p = 0; p < this.scorePopups.length; p++) {
            Renderer.drawScorePopup(ctx, this.scorePopups[p], scale, this.cameraY);
        }

        ctx.restore();

        // UI overlay (unshaken)
        Renderer.drawUI(ctx, w, h, {
            score: this.score,
            round: this.round,
            roundTimer: this.roundTimer,
            time: this.time,
            comboCount: this.comboCount,
            comboDisplayTimer: this.comboDisplayTimer,
            dangerActive: this.dangerActive,
            earthquakeIntensity: this.earthquakeIntensity
        });

        // Brace indicator
        if (this.playerTower && !this.playerTower.isCollapsed) {
            var braceReady = this.braceCooldown <= 0 && !this.braceActive;
            ctx.save();
            ctx.translate(this.gameAreaX, 0);
            Renderer.drawBraceIndicator(ctx, this.braceCooldown, this.braceMaxCooldown,
                this.playerTower.x, this.groundY + 25, scale, braceReady, this.braceActive);
            ctx.restore();
        }

        // Round start text
        if (this.roundStartTimer > 0) {
            Renderer.drawRoundStart(ctx, w, h, this.round, this.roundStartTimer);
        }

        // Round transition overlay
        if (this.roundTransition) {
            this._renderRoundEnd(ctx, w, h);
        }
    }

    _renderRoundEnd(ctx, w, h) {
        var alpha = Math.min(1, (2.5 - this.roundEndTimer) / 0.5);
        ctx.fillStyle = 'rgba(0, 0, 0, ' + (alpha * 0.6) + ')';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ROUND ' + this.round + ' COMPLETE!', w / 2, h * 0.35);

        ctx.font = '22px sans-serif';
        ctx.fillText('Tower Height: ' + (this.playerTower ? this.playerTower.blocks.length : 0) + ' blocks', w / 2, h * 0.45);

        if (this.roundEndBonus > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText('Height Bonus: +' + this.roundEndBonus, w / 2, h * 0.52);
        }

        ctx.fillStyle = '#ccc';
        ctx.font = '18px sans-serif';
        ctx.fillText('Score: ' + Math.floor(this.score), w / 2, h * 0.6);

        ctx.restore();
    }

    renderGameOver() {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;
        var scale = this.scale;

        // Draw frozen game scene
        Renderer.drawBackground(ctx, w, h, this.time);

        if (this.gameAreaX > 0) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, this.gameAreaX, h);
            ctx.fillRect(this.gameAreaX + this.gameAreaW, 0, this.gameAreaX + 1, h);
        }

        ctx.save();
        ctx.translate(this.gameAreaX, 0);
        Renderer.drawGround(ctx, this.gameAreaW, h, this.groundY, scale, this.cameraY);
        for (var i = 0; i < this.rivalTowers.length; i++) {
            Renderer.drawTower(ctx, this.rivalTowers[i], scale, this.cameraY);
        }
        if (this.playerTower) {
            Renderer.drawTower(ctx, this.playerTower, scale, this.cameraY);
        }
        ParticleSystem.render(ctx, scale, this.cameraY);
        ctx.restore();

        // Dark overlay
        var fadeIn = Math.min(1, this.gameOverTimer / 0.5);
        ctx.fillStyle = 'rgba(0, 0, 0, ' + (fadeIn * 0.7) + ')';
        ctx.fillRect(0, 0, w, h);

        if (fadeIn < 0.3) return;

        var textAlpha = Math.min(1, (this.gameOverTimer - 0.2) / 0.3);
        ctx.save();
        ctx.globalAlpha = textAlpha;

        // Title
        if (this.roundOverReason === 'toppled') {
            ctx.fillStyle = '#ff4444';
        } else {
            ctx.fillStyle = '#ffd700';
        }
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.roundOverReason === 'toppled' ? 'TOPPLED!' : 'TIME UP!', w / 2, h * 0.28);

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('' + Math.floor(this.score), w / 2, h * 0.4);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('SCORE', w / 2, h * 0.44);

        // Round
        ctx.fillStyle = '#ccc';
        ctx.font = '20px sans-serif';
        ctx.fillText('Round ' + this.round, w / 2, h * 0.51);
        ctx.fillText('Best Tower: ' + this.bestHeight + ' blocks', w / 2, h * 0.57);

        // High score
        if (this.newHighScore) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 28px sans-serif';
            var pulseScale = 1.0 + 0.1 * Math.sin(this.gameOverTimer * 5);
            ctx.save();
            ctx.translate(w / 2, h * 0.65);
            ctx.scale(pulseScale, pulseScale);
            ctx.fillText('NEW BEST!', 0, 0);
            ctx.restore();
        } else if (this.highScore > 0) {
            ctx.fillStyle = '#888';
            ctx.font = '18px sans-serif';
            ctx.fillText('Best: ' + this.highScore, w / 2, h * 0.65);
        }

        // Restart prompt
        if (this.gameOverTimer > 0.8) {
            var subAlpha = 0.5 + 0.4 * Math.sin(this.time * 3);
            ctx.globalAlpha = subAlpha;
            ctx.fillStyle = '#ccc';
            ctx.font = '20px sans-serif';
            ctx.fillText('Tap to Retry', w / 2, h * 0.78);
        }

        ctx.restore();
    }
}
