/**
 * Drift Dodge - Main game class
 * Steer a drifting car through oncoming traffic, building near-miss combos
 */

import { Game, Config } from './game.js';

// Vehicle type definitions
const VEHICLE_TYPES = {
    sedan:      { w: 38, h: 65, speed: 0, colors: ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6'] },
    truck:      { w: 44, h: 80, speed: 0, colors: ['#c0392b','#7f8c8d'] },
    bus:        { w: 48, h: 85, speed: 0, colors: ['#f1c40f','#e67e22'] },
    speedDemon: { w: 36, h: 60, speed: 150, colors: ['#e91e63'] }
};

const SKIN_COLORS = ['#ffffff', '#00e5ff', '#ff4081', '#76ff03', '#ffd740'];
const SKIN_THRESHOLDS = [0, 1000, 5000, 15000, 50000];

export class DriftDodge extends Game {
    constructor(canvas) {
        super(canvas);
        // Player
        this.player = { x: 0, y: 0, angle: 0, driftDir: 0, lateralSpeed: 0, spinTimer: 0, invincibleTimer: 0, skinIndex: 0 };
        // State
        this.highScore = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.lives = 3;
        this.baseSpeed = 300;
        this.currentSpeed = 300;
        this.speedBoostFromCombo = 0;
        this.phaseTimer = 0;
        this.phase = 0;
        this.trafficPattern = 'normal';
        this.spawnTimer = 0;
        this.coinSpawnTimer = 2.0;
        this.grassOffset = 0;
        this.playTime = 0;
        this.gameOverTimer = 0;
        this.flashTimer = 0;
        this.phaseAnnounceTimer = 0;
        this.phaseAnnounceText = '';
        // Arrays
        this.vehicles = [];
        this.coins = [];
        this.particles = [];
        this.floatingTexts = [];
        this.roadMarkings = [];
        // Screen shake
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeMagnitude = 0;
        // Road geometry (computed on resize)
        this.roadWidth = 220;
        this.roadLeft = 0;
        this.roadRight = 220;
        this.laneWidth = 55;
        this.playerY = 0;
        // Combo pulse animation
        this.comboPulse = 0;
        // Unlocked skins
        this.unlockedSkins = [true, false, false, false, false];
        // Menu animation
        this.menuTime = 0;
        this.menuVehicles = [];
        // First play grace period
        this.firstPlayGrace = 0;
    }

    async loadAssets() {
        // Load high score and skins from localStorage
        try {
            var hs = localStorage.getItem('dd_highScore');
            if (hs !== null) this.highScore = parseInt(hs) || 0;
            var sk = localStorage.getItem('dd_skins');
            if (sk) this.unlockedSkins = JSON.parse(sk);
        } catch (e) {}
        // Init SFX engine
        GameAudio.initContext();
        if (GameAudio.ctx) {
            SFX.init(GameAudio.ctx);
        }
    }

    _resize() {
        super._resize();
        this._computeRoad();
    }

    _computeRoad() {
        this.roadWidth = Math.min(this.canvas.width * 0.55, 260);
        this.roadLeft = (this.canvas.width - this.roadWidth) / 2;
        this.roadRight = this.roadLeft + this.roadWidth;
        this.laneWidth = this.roadWidth / 4;
        this.playerY = this.canvas.height * 0.75;
    }

    // -------------------------------------------------------
    // State transitions
    // -------------------------------------------------------

    start() {
        this.state = 'playing';
        this.score = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.lives = 3;
        this.baseSpeed = 300;
        this.currentSpeed = 300;
        this.speedBoostFromCombo = 0;
        this.phaseTimer = 0;
        this.phase = 0;
        this.trafficPattern = 'normal';
        this.spawnTimer = 1.0;
        this.coinSpawnTimer = 3.0;
        this.grassOffset = 0;
        this.playTime = 0;
        this.gameOverTimer = 0;
        this.flashTimer = 0;
        this.phaseAnnounceTimer = 0;
        this.shakeMagnitude = 0;
        this.comboPulse = 0;
        this.firstPlayGrace = 5.0;
        this.vehicles = [];
        this.coins = [];
        this.particles = [];
        this.floatingTexts = [];

        this._computeRoad();
        this.player.x = (this.roadLeft + this.roadRight) / 2;
        this.player.y = this.playerY;
        this.player.angle = 0;
        this.player.driftDir = 0;
        this.player.lateralSpeed = 0;
        this.player.spinTimer = 0;
        this.player.invincibleTimer = 0;

        // Init road markings
        this.roadMarkings = [];
        for (var i = 0; i < 20; i++) {
            this.roadMarkings.push({ y: i * 50 - 100 });
        }

        GameAudio.initContext();
        GameAudio.resume();
        if (GameAudio.ctx && !SFX.ctx) SFX.init(GameAudio.ctx);
        Poki.gameplayStart();
    }

    gameOver() {
        this.state = 'gameover';
        this.gameOverTimer = 0;
        // Save high score
        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            try { localStorage.setItem('dd_highScore', String(this.highScore)); } catch (e) {}
        }
        // Check skin unlocks
        this._checkSkinUnlocks();
        SFX.gameOver();
        Poki.gameplayStop();
    }

    async restart() {
        if (Config.adsEnabled) {
            await Poki.commercialBreak(
                () => { GameAudio.muteAll(); SFX.mute(); },
                () => { GameAudio.unmuteAll(); SFX.unmute(); }
            );
        }
        this.start();
    }

    _checkSkinUnlocks() {
        var changed = false;
        for (var i = 0; i < SKIN_THRESHOLDS.length; i++) {
            if (this.highScore >= SKIN_THRESHOLDS[i] && !this.unlockedSkins[i]) {
                this.unlockedSkins[i] = true;
                changed = true;
            }
        }
        if (changed) {
            try { localStorage.setItem('dd_skins', JSON.stringify(this.unlockedSkins)); } catch (e) {}
        }
    }

    // -------------------------------------------------------
    // Update - Playing
    // -------------------------------------------------------

    updatePlaying(dt) {
        if (document.hidden) return;
        this.playTime += dt;
        this.firstPlayGrace = Math.max(0, this.firstPlayGrace - dt);

        var inp = this.input;

        // 1. Read Input
        var targetDrift = 0;
        if (this.player.spinTimer <= 0) {
            if (inp.isLeft() || inp.isTouchLeft() || inp.isMouseLeft()) targetDrift = -1;
            else if (inp.isRight() || inp.isTouchRight() || inp.isMouseRight()) targetDrift = 1;
        }

        // 2. Update Player Lateral Movement
        var targetLatSpeed = targetDrift * 350;
        this.player.lateralSpeed += (targetLatSpeed - this.player.lateralSpeed) * Math.min(1, 8 * dt);
        this.player.x += this.player.lateralSpeed * dt;
        this.player.x = Math.max(this.roadLeft + 20, Math.min(this.roadRight - 20, this.player.x));

        var targetAngle = targetDrift * -0.25;
        this.player.angle += (targetAngle - this.player.angle) * Math.min(1, 6 * dt);
        this.player.driftDir = targetDrift;

        // Tire marks during drift
        if (Math.abs(targetDrift) > 0 && this.player.spinTimer <= 0) {
            if (Math.random() < 0.5) {
                this.particles.push({
                    x: this.player.x + (targetDrift > 0 ? 12 : -12),
                    y: this.player.y + 28,
                    vx: 0, vy: 0, life: 0.5, maxLife: 0.5,
                    size: 2, color: 'rgba(40,40,40,0.4)', type: 'tire'
                });
            }
        }

        // 3. Update Speed
        this.baseSpeed += 2 * dt;
        this.speedBoostFromCombo = this.combo * 15;
        this.currentSpeed = this.baseSpeed + this.speedBoostFromCombo;
        if (this.currentSpeed > 800) this.currentSpeed = 800;

        // 4. Scroll Road
        for (var i = 0; i < this.roadMarkings.length; i++) {
            this.roadMarkings[i].y += this.currentSpeed * dt;
            if (this.roadMarkings[i].y > this.canvas.height + 50) {
                this.roadMarkings[i].y -= this.roadMarkings.length * 50;
            }
        }
        this.grassOffset = (this.grassOffset + this.currentSpeed * dt) % 20;

        // 5. Update Vehicles
        for (var i = this.vehicles.length - 1; i >= 0; i--) {
            var v = this.vehicles[i];
            v.y += (this.currentSpeed + v.speed) * dt;
            // SpeedDemon swerve
            if (v.type === 'speedDemon') {
                v.swerveTimer += dt;
                v.x += Math.sin(v.swerveTimer * 3) * 60 * dt;
            }
            // Remove off-screen
            if (v.y > this.canvas.height + 100) {
                this.vehicles.splice(i, 1);
                continue;
            }
            // Near-miss check
            if (!v.passed && v.y > this.player.y + 35) {
                v.passed = true;
                var dx = Math.abs(v.x - this.player.x);
                if (dx < 55 && dx > 15) {
                    // Near miss!
                    this.combo++;
                    this.comboTimer = 2.0;
                    this.comboPulse = 0.2;
                    var mult = Math.min(this.combo + 1, 10);
                    var pts = 50 * mult;
                    this.score += pts;
                    SFX.nearMiss(this.combo);
                    this._spawnFloatingText(v.x, v.y - 20, 'NEAR MISS!', '#fff');
                    if (this.combo > 1) {
                        this._spawnFloatingText(this.canvas.width / 2, this.canvas.height * 0.3, 'x' + mult + ' COMBO!', this._comboColor());
                    }
                    // Sparks
                    for (var s = 0; s < 6; s++) {
                        this.particles.push({
                            x: (this.player.x + v.x) / 2,
                            y: v.y,
                            vx: (Math.random() - 0.5) * 300,
                            vy: (Math.random() - 0.5) * 200,
                            life: 0.4, maxLife: 0.4,
                            size: 3, color: '#ffeb3b', type: 'spark'
                        });
                    }
                }
            }
        }

        // 6. Collision Detection
        if (this.player.spinTimer <= 0 && this.player.invincibleTimer <= 0) {
            var pw = 32, ph = 60;
            var px1 = this.player.x - pw / 2, py1 = this.player.y - ph / 2;
            var px2 = px1 + pw, py2 = py1 + ph;
            for (var i = 0; i < this.vehicles.length; i++) {
                var v = this.vehicles[i];
                var vt = VEHICLE_TYPES[v.type];
                var vw = vt.w - 6, vh = vt.h - 10;
                var vx1 = v.x - vw / 2, vy1 = v.y - vh / 2;
                var vx2 = vx1 + vw, vy2 = vy1 + vh;
                if (px1 < vx2 && px2 > vx1 && py1 < vy2 && py2 > vy1) {
                    this._handleCrash(v);
                    break;
                }
            }
        }

        // 7. Update Coins
        for (var i = this.coins.length - 1; i >= 0; i--) {
            var c = this.coins[i];
            c.y += this.currentSpeed * dt;
            c.bobOffset += dt * 4;
            if (c.y > this.canvas.height + 50) {
                this.coins.splice(i, 1);
                continue;
            }
            var cdx = this.player.x - c.x;
            var cdy = this.player.y - c.y;
            if (cdx * cdx + cdy * cdy < 30 * 30) {
                var mult = Math.min(this.combo + 1, 10);
                this.score += 25 * mult;
                SFX.coin();
                this._spawnFloatingText(c.x, c.y, '+' + (25 * mult), '#ffd740');
                for (var s = 0; s < 8; s++) {
                    this.particles.push({
                        x: c.x, y: c.y,
                        vx: (Math.random() - 0.5) * 200,
                        vy: (Math.random() - 0.5) * 200,
                        life: 0.3, maxLife: 0.3,
                        size: 3, color: '#ffd740', type: 'coin'
                    });
                }
                this.coins.splice(i, 1);
            }
        }

        // 8. Spawn Vehicles
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this._spawnVehicles();
            var interval = this._getSpawnInterval();
            if (this.firstPlayGrace > 0) interval *= 1.5;
            this.spawnTimer = interval;
        }

        // 9. Spawn Coins
        this.coinSpawnTimer -= dt;
        if (this.coinSpawnTimer <= 0) {
            this._spawnCoin();
            this.coinSpawnTimer = 2.0 + Math.random() * 2.0;
        }

        // 10. Phase Advancement
        this.phaseTimer += dt;
        if (this.phaseTimer >= 30) {
            this.phaseTimer -= 30;
            this.phase++;
            this._advancePhase();
        }

        // 11. Update Particles
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // 12. Update Floating Texts
        for (var i = this.floatingTexts.length - 1; i >= 0; i--) {
            var f = this.floatingTexts[i];
            f.y -= 60 * dt;
            f.life -= dt;
            if (f.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // 13. Update Combo Timer
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0 && this.combo > 0) {
                this.combo = 0;
                SFX.comboLost();
            }
        }

        // 14. Score Accumulation (distance-based)
        var mult = Math.min(this.combo + 1, 10);
        this.score += this.currentSpeed * 0.02 * mult * dt;

        // 15. Spin-out Update
        if (this.player.spinTimer > 0) {
            this.player.spinTimer -= dt;
            this.player.angle += 15 * dt; // rapid spin
        }

        // 16. Invincibility Update
        if (this.player.invincibleTimer > 0) {
            this.player.invincibleTimer -= dt;
        }

        // Combo pulse decay
        if (this.comboPulse > 0) this.comboPulse -= dt;

        // Screen shake decay
        if (this.shakeMagnitude > 0) {
            this.shakeX = (Math.random() - 0.5) * 2 * this.shakeMagnitude;
            this.shakeY = (Math.random() - 0.5) * 2 * this.shakeMagnitude;
            this.shakeMagnitude *= Math.pow(0.85, dt * 60);
            if (this.shakeMagnitude < 0.5) this.shakeMagnitude = 0;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // Flash timer
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Phase announce timer
        if (this.phaseAnnounceTimer > 0) this.phaseAnnounceTimer -= dt;

        // Speed lines at high speed
        if (this.currentSpeed > 500 && Math.random() < 0.3) {
            var side = Math.random() < 0.5 ? this.roadLeft - 20 - Math.random() * 30 : this.roadRight + 20 + Math.random() * 30;
            this.particles.push({
                x: side, y: -10,
                vx: 0, vy: this.currentSpeed * 1.5,
                life: 0.3, maxLife: 0.3,
                size: 1, color: 'rgba(255,255,255,0.3)', type: 'speedline'
            });
        }
    }

    _handleCrash(vehicle) {
        this.lives--;
        if (this.combo > 0) SFX.comboLost();
        this.combo = 0;
        this.comboTimer = 0;
        this.player.spinTimer = 0.8;
        this.player.invincibleTimer = 1.5;
        this.shakeMagnitude = 12;
        this.flashTimer = 0.05;
        SFX.crash();

        // Crash particles
        for (var i = 0; i < 20; i++) {
            this.particles.push({
                x: this.player.x, y: this.player.y,
                vx: (Math.random() - 0.5) * 400,
                vy: (Math.random() - 0.5) * 400,
                life: 0.6, maxLife: 0.6,
                size: 2 + Math.random() * 3,
                color: Math.random() < 0.5 ? '#ff5722' : '#ff9800',
                type: 'crash'
            });
        }

        // Speed penalty
        this.currentSpeed *= 0.6;
        this.baseSpeed = Math.max(this.baseSpeed - 40, 300);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    _getSpawnInterval() {
        // Difficulty ramps down from 0.80 to 0.35
        var base = Math.max(0.35, 0.80 - this.phase * 0.09);
        return base;
    }

    _spawnVehicles() {
        var pattern = this.trafficPattern;
        if (pattern === 'normal') {
            this._spawnOneVehicle(this._randomLane(), this._randomVehicleType());
        } else if (pattern === 'convoy') {
            var lane1 = Math.floor(Math.random() * 3);
            var count = 2 + Math.floor(Math.random() * 2);
            for (var i = 0; i < count; i++) {
                this._spawnOneVehicle((lane1 + i) % 4, 'sedan');
            }
        } else if (pattern === 'staggered') {
            var lane = Math.random() < 0.5 ? 0 : 3;
            this._spawnOneVehicle(lane, this._randomVehicleType());
        } else if (pattern === 'speedDemons') {
            this._spawnOneVehicle(this._randomLane(), 'speedDemon');
        } else {
            // Random mix
            var r = Math.random();
            if (r < 0.3) {
                this._spawnOneVehicle(this._randomLane(), 'speedDemon');
            } else if (r < 0.5) {
                var lane1 = Math.floor(Math.random() * 3);
                this._spawnOneVehicle(lane1, 'sedan');
                this._spawnOneVehicle(lane1 + 1, 'sedan');
            } else {
                this._spawnOneVehicle(this._randomLane(), this._randomVehicleType());
            }
        }
    }

    _spawnOneVehicle(lane, type) {
        var vt = VEHICLE_TYPES[type];
        var colors = vt.colors;
        var x = this.roadLeft + this.laneWidth * (lane + 0.5);
        this.vehicles.push({
            x: x,
            y: -vt.h,
            type: type,
            speed: vt.speed,
            lane: lane,
            color: colors[Math.floor(Math.random() * colors.length)],
            swerveTimer: 0,
            swerveDir: Math.random() < 0.5 ? -1 : 1,
            passed: false
        });
    }

    _randomLane() {
        return Math.floor(Math.random() * 4);
    }

    _randomVehicleType() {
        var r = Math.random();
        if (r < 0.55) return 'sedan';
        if (r < 0.80) return 'truck';
        return 'bus';
    }

    _spawnCoin() {
        // Find a lane without a vehicle nearby
        var safeLanes = [0, 1, 2, 3];
        for (var i = 0; i < this.vehicles.length; i++) {
            var v = this.vehicles[i];
            if (v.y < 200 && v.y > -100) {
                var idx = safeLanes.indexOf(v.lane);
                if (idx !== -1) safeLanes.splice(idx, 1);
            }
        }
        if (safeLanes.length === 0) safeLanes = [Math.floor(Math.random() * 4)];
        var lane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        var x = this.roadLeft + this.laneWidth * (lane + 0.5);
        this.coins.push({ x: x, y: -20, bobOffset: Math.random() * 6.28, collected: false });
    }

    _advancePhase() {
        if (this.phase <= 1) this.trafficPattern = 'normal';
        else if (this.phase === 2) this.trafficPattern = 'staggered';
        else if (this.phase === 3) this.trafficPattern = 'convoy';
        else if (this.phase === 4) this.trafficPattern = 'speedDemons';
        else {
            var patterns = ['normal', 'convoy', 'staggered', 'speedDemons', 'mix'];
            this.trafficPattern = patterns[Math.floor(Math.random() * patterns.length)];
        }
        this.phaseAnnounceText = 'PHASE ' + (this.phase + 1);
        this.phaseAnnounceTimer = 2.0;
        SFX.phaseChange();
    }

    _comboColor() {
        var c = this.combo;
        if (c <= 2) return '#ffffff';
        if (c <= 4) return '#ffeb3b';
        if (c <= 7) return '#ff9800';
        return '#f44336';
    }

    _spawnFloatingText(x, y, text, color) {
        this.floatingTexts.push({ x: x, y: y, text: text, color: color, life: 0.8, maxLife: 0.8 });
    }

    // -------------------------------------------------------
    // Render - Playing
    // -------------------------------------------------------

    renderPlaying() {
        var ctx = this.ctx;
        var cw = this.canvas.width, ch = this.canvas.height;
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // 1. Background (grass)
        ctx.fillStyle = '#2d5a1e';
        ctx.fillRect(0, 0, cw, ch);

        // Grass stripes for speed feel
        ctx.fillStyle = '#265217';
        for (var gy = -20 + (this.grassOffset % 20); gy < ch; gy += 20) {
            ctx.fillRect(0, gy, this.roadLeft, 4);
            ctx.fillRect(this.roadRight, gy, cw - this.roadRight, 4);
        }

        // 2. Road Surface
        ctx.fillStyle = '#444';
        ctx.fillRect(this.roadLeft, 0, this.roadWidth, ch);

        // 3. Road Shoulders
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.roadLeft - 2, 0, 3, ch);
        ctx.fillRect(this.roadRight - 1, 0, 3, ch);

        // 4. Lane Markings
        ctx.fillStyle = '#aaa';
        for (var m = 0; m < this.roadMarkings.length; m++) {
            var my = this.roadMarkings[m].y;
            for (var l = 1; l < 4; l++) {
                var mx = this.roadLeft + this.laneWidth * l;
                ctx.fillRect(mx - 1, my, 2, 25);
            }
        }

        // Tire mark particles (drawn on road)
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            if (p.type === 'tire') {
                var a = p.life / p.maxLife * 0.4;
                ctx.fillStyle = 'rgba(40,40,40,' + a + ')';
                ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
            }
        }

        // 5. Coins
        for (var i = 0; i < this.coins.length; i++) {
            var c = this.coins[i];
            var bob = Math.sin(c.bobOffset) * 3;
            ctx.beginPath();
            ctx.arc(c.x, c.y + bob, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd740';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(c.x - 2, c.y + bob - 2, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff9c4';
            ctx.fill();
        }

        // 6. Oncoming Vehicles
        for (var i = 0; i < this.vehicles.length; i++) {
            this._drawVehicle(ctx, this.vehicles[i]);
        }

        // Speed line particles
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            if (p.type === 'speedline') {
                var a = p.life / p.maxLife;
                ctx.strokeStyle = 'rgba(255,255,255,' + (a * 0.3) + ')';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y - 20);
                ctx.stroke();
            }
        }

        // 8. Player Car
        this._drawPlayer(ctx);

        // 9. Spark/Crash/Coin Particles
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            if (p.type === 'tire' || p.type === 'speedline') continue;
            var a = p.life / p.maxLife;
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
            ctx.fill();
            // Motion trail
            if (p.type === 'spark' || p.type === 'crash') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size * a * 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // 10. Floating Texts
        for (var i = 0; i < this.floatingTexts.length; i++) {
            var f = this.floatingTexts[i];
            var a = f.life / f.maxLife;
            ctx.globalAlpha = a;
            var fontSize = Math.max(14, ch * 0.025);
            ctx.font = 'bold ' + Math.floor(fontSize) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y);
            ctx.globalAlpha = 1;
        }

        // Speed vignette at high speeds
        if (this.currentSpeed > 500) {
            var vignetteAlpha = Math.min((this.currentSpeed - 500) / 300 * 0.3, 0.3);
            var grad = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.3, cw / 2, ch / 2, ch * 0.8);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,' + vignetteAlpha + ')');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, cw, ch);
        }

        ctx.restore(); // end shake transform

        // Flash on hit
        if (this.flashTimer > 0) {
            ctx.fillStyle = 'rgba(255,255,255,' + (this.flashTimer / 0.05 * 0.3) + ')';
            ctx.fillRect(0, 0, cw, ch);
        }

        // 11. HUD (screen-space, no shake)
        this._drawHUD(ctx, cw, ch);
    }

    _drawVehicle(ctx, v) {
        var vt = VEHICLE_TYPES[v.type];
        var w = vt.w, h = vt.h;
        var x = v.x, y = v.y;

        // Body
        ctx.fillStyle = v.color;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);

        // Windshield
        ctx.fillStyle = 'rgba(100,200,255,0.5)';
        ctx.fillRect(x - w / 2 + 4, y + h / 2 - 18, w - 8, 12);

        // Bumper highlights
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x - w / 2 + 2, y - h / 2, w - 4, 4);

        // Racing stripes for speed demons
        if (v.type === 'speedDemon') {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillRect(x - 3, y - h / 2, 2, h);
            ctx.fillRect(x + 1, y - h / 2, 2, h);
        }

        // Taillights (top of car since they're coming toward us)
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(x - w / 2 + 2, y - h / 2 + 2, 5, 4);
        ctx.fillRect(x + w / 2 - 7, y - h / 2 + 2, 5, 4);
    }

    _drawPlayer(ctx) {
        var p = this.player;

        // Invincibility flicker
        if (p.invincibleTimer > 0) {
            if (Math.floor(p.invincibleTimer * 10) % 2 === 0) return;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        var w = 40, h = 70;
        var skinColor = SKIN_COLORS[p.skinIndex] || '#ffffff';

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);

        // Body
        ctx.fillStyle = skinColor;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Racing stripe
        ctx.fillStyle = '#1565c0';
        ctx.fillRect(-3, -h / 2, 6, h);

        // Windshield (front = bottom since player goes up)
        ctx.fillStyle = 'rgba(100,200,255,0.6)';
        ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, 14);

        // Taillights (rear = top visually since car faces up)
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(-w / 2 + 2, h / 2 - 6, 6, 4);
        ctx.fillRect(w / 2 - 8, h / 2 - 6, 6, 4);

        // Headlights
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(-w / 2 + 2, -h / 2 + 2, 6, 4);
        ctx.fillRect(w / 2 - 8, -h / 2 + 2, 6, 4);

        ctx.restore();
    }

    _drawHUD(ctx, cw, ch) {
        var fontSize = Math.max(16, ch * 0.028);

        // Score (top-left)
        ctx.textAlign = 'left';
        ctx.font = 'bold ' + Math.floor(fontSize * 1.4) + 'px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(Math.floor(this.score), 15, 35);
        ctx.font = Math.floor(fontSize * 0.7) + 'px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('HI: ' + this.highScore, 15, 55);

        // Combo (top-center)
        if (this.combo > 0) {
            var mult = Math.min(this.combo + 1, 10);
            var pulseScale = 1 + (this.comboPulse > 0 ? this.comboPulse / 0.2 * 0.3 : 0);
            var comboFontSize = Math.floor(fontSize * 1.6 * pulseScale);
            ctx.save();
            ctx.font = 'bold ' + comboFontSize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = this._comboColor();
            ctx.fillText('x' + mult, cw / 2, 40);
            // Combo timer bar
            var barW = 80, barH = 4;
            var barX = cw / 2 - barW / 2;
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(barX, 48, barW, barH);
            ctx.fillStyle = this._comboColor();
            ctx.fillRect(barX, 48, barW * Math.max(0, this.comboTimer / 2.0), barH);
            ctx.restore();
        }

        // Lives (top-right) - small car icons
        ctx.textAlign = 'right';
        for (var i = 0; i < 3; i++) {
            var lx = cw - 20 - i * 28;
            var ly = 22;
            ctx.fillStyle = i < this.lives ? '#fff' : '#555';
            ctx.fillRect(lx - 8, ly - 12, 16, 24);
            ctx.fillStyle = i < this.lives ? '#1565c0' : '#333';
            ctx.fillRect(lx - 1, ly - 12, 2, 24);
        }

        // Phase announcement
        if (this.phaseAnnounceTimer > 0) {
            var a = Math.min(1, this.phaseAnnounceTimer / 0.5);
            ctx.globalAlpha = a;
            ctx.font = 'bold ' + Math.floor(fontSize * 2.5) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(this.phaseAnnounceText, cw / 2, ch * 0.45);
            ctx.globalAlpha = 1;
        }

        // Speed bar (bottom)
        var speedPct = this.currentSpeed / 800;
        var barW = cw * 0.4;
        var barH = 3;
        var barX = (cw - barW) / 2;
        var barY = ch - 10;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(barX, barY, barW, barH);
        var speedColor = speedPct < 0.5 ? '#4caf50' : speedPct < 0.75 ? '#ff9800' : '#f44336';
        ctx.fillStyle = speedColor;
        ctx.fillRect(barX, barY, barW * speedPct, barH);
    }

    // -------------------------------------------------------
    // Render - Menu
    // -------------------------------------------------------

    renderMenu() {
        var ctx = this.ctx;
        var cw = this.canvas.width, ch = this.canvas.height;
        this.menuTime += 0.016;

        // Background - road preview
        ctx.fillStyle = '#2d5a1e';
        ctx.fillRect(0, 0, cw, ch);

        this._computeRoad();
        ctx.fillStyle = '#444';
        ctx.fillRect(this.roadLeft, 0, this.roadWidth, ch);

        // Scrolling lane markings
        ctx.fillStyle = '#aaa';
        for (var y = (this.menuTime * 200) % 50 - 50; y < ch; y += 50) {
            for (var l = 1; l < 4; l++) {
                ctx.fillRect(this.roadLeft + this.laneWidth * l - 1, y, 2, 25);
            }
        }

        // Road shoulders
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.roadLeft - 2, 0, 3, ch);
        ctx.fillRect(this.roadRight - 1, 0, 3, ch);

        // Animated menu vehicles scrolling down
        for (var i = 0; i < 5; i++) {
            var vy = ((this.menuTime * 180 + i * 200) % (ch + 200)) - 100;
            var vx = this.roadLeft + this.laneWidth * (i % 4 + 0.5);
            ctx.fillStyle = VEHICLE_TYPES.sedan.colors[i % 5];
            ctx.fillRect(vx - 19, vy - 32, 38, 65);
            ctx.fillStyle = 'rgba(100,200,255,0.5)';
            ctx.fillRect(vx - 15, vy, 30, 12);
        }

        // Title
        var titleSize = Math.max(32, Math.min(cw * 0.1, 64));
        ctx.font = 'bold ' + Math.floor(titleSize) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('DRIFT DODGE', cw / 2, ch * 0.3);

        // Subtitle
        ctx.font = Math.floor(titleSize * 0.35) + 'px sans-serif';
        ctx.fillStyle = '#ccc';
        ctx.fillText('Weave through traffic. Build combos. Stay alive.', cw / 2, ch * 0.3 + titleSize * 0.5);

        // Player car preview
        ctx.save();
        ctx.translate(cw / 2, ch * 0.52);
        var bob = Math.sin(this.menuTime * 2) * 5;
        ctx.translate(0, bob);
        ctx.fillStyle = SKIN_COLORS[this.player.skinIndex];
        ctx.fillRect(-20, -35, 40, 70);
        ctx.fillStyle = '#1565c0';
        ctx.fillRect(-3, -35, 6, 70);
        ctx.fillStyle = 'rgba(100,200,255,0.6)';
        ctx.fillRect(-15, -30, 30, 14);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(-18, -33, 6, 4);
        ctx.fillRect(12, -33, 6, 4);
        ctx.restore();

        // Skin selector (tap car to cycle)
        var skinCount = 0;
        for (var i = 0; i < this.unlockedSkins.length; i++) {
            if (this.unlockedSkins[i]) skinCount++;
        }
        if (skinCount > 1) {
            ctx.font = Math.floor(titleSize * 0.25) + 'px sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText('< tap car to change skin >', cw / 2, ch * 0.52 + 50);
        }

        // Start prompt
        var blink = Math.sin(this.menuTime * 3) > 0;
        if (blink) {
            ctx.font = 'bold ' + Math.floor(titleSize * 0.4) + 'px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText('TAP TO PLAY', cw / 2, ch * 0.75);
        }

        // High score
        if (this.highScore > 0) {
            ctx.font = Math.floor(titleSize * 0.3) + 'px sans-serif';
            ctx.fillStyle = '#ffd740';
            ctx.fillText('BEST: ' + this.highScore, cw / 2, ch * 0.82);
        }

        // Controls hint
        ctx.font = Math.floor(Math.max(12, titleSize * 0.22)) + 'px sans-serif';
        ctx.fillStyle = '#777';
        ctx.fillText('Hold left/right side to drift | A/D or Arrow keys', cw / 2, ch * 0.92);
    }

    // -------------------------------------------------------
    // Render - Game Over
    // -------------------------------------------------------

    renderGameOver() {
        var ctx = this.ctx;
        var cw = this.canvas.width, ch = this.canvas.height;
        this.gameOverTimer += 0.016;

        // Render the gameplay scene behind the overlay
        this.renderPlaying();

        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, cw, ch);

        var titleSize = Math.max(28, Math.min(cw * 0.09, 56));
        var fadeIn = Math.min(1, this.gameOverTimer / 0.5);

        ctx.globalAlpha = fadeIn;

        // Game over text
        ctx.font = 'bold ' + Math.floor(titleSize) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f44336';
        ctx.fillText('GAME OVER', cw / 2, ch * 0.32);

        // Score
        ctx.font = 'bold ' + Math.floor(titleSize * 0.8) + 'px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(Math.floor(this.score), cw / 2, ch * 0.45);
        ctx.font = Math.floor(titleSize * 0.35) + 'px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('SCORE', cw / 2, ch * 0.45 + titleSize * 0.5);

        // High score
        var isNewBest = Math.floor(this.score) >= this.highScore && this.highScore > 0;
        if (isNewBest) {
            ctx.font = 'bold ' + Math.floor(titleSize * 0.4) + 'px sans-serif';
            ctx.fillStyle = '#ffd740';
            ctx.fillText('NEW BEST!', cw / 2, ch * 0.57);
        } else {
            ctx.font = Math.floor(titleSize * 0.35) + 'px sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText('BEST: ' + this.highScore, cw / 2, ch * 0.57);
        }

        // Stats
        ctx.font = Math.floor(titleSize * 0.3) + 'px sans-serif';
        ctx.fillStyle = '#bbb';
        ctx.fillText('Survived ' + Math.floor(this.playTime) + 's | Phase ' + (this.phase + 1), cw / 2, ch * 0.65);

        // Restart prompt
        if (this.gameOverTimer > 1.0) {
            var blink = Math.sin(this.gameOverTimer * 3) > 0;
            if (blink) {
                ctx.font = 'bold ' + Math.floor(titleSize * 0.4) + 'px sans-serif';
                ctx.fillStyle = '#fff';
                ctx.fillText('TAP TO RETRY', cw / 2, ch * 0.78);
            }
        }

        ctx.globalAlpha = 1;
    }

    // -------------------------------------------------------
    // Override update to handle menu skin cycling
    // -------------------------------------------------------

    update(dt) {
        var confirm = this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasTapped();

        if (this.state === 'menu') {
            if (confirm) {
                // Check if tap is on the car (skin cycle area) - only if multiple skins unlocked
                var skinCount = 0;
                for (var si = 0; si < this.unlockedSkins.length; si++) {
                    if (this.unlockedSkins[si]) skinCount++;
                }
                var mx = this.input.touchDown ? this.input.touchX : this.input.mouseX;
                var my = this.input.touchDown ? this.input.touchY : this.input.mouseY;
                var carCenterY = this.canvas.height * 0.52;
                if (skinCount > 1 && my > carCenterY - 50 && my < carCenterY + 60 && Math.abs(mx - this.canvas.width / 2) < 60) {
                    var next = this.player.skinIndex;
                    for (var tries = 0; tries < SKIN_COLORS.length; tries++) {
                        next = (next + 1) % SKIN_COLORS.length;
                        if (this.unlockedSkins[next]) {
                            this.player.skinIndex = next;
                            break;
                        }
                    }
                } else {
                    this.start();
                }
            }
        } else if (this.state === 'playing') {
            this.updatePlaying(dt);
        } else if (this.state === 'gameover') {
            if (this.gameOverTimer > 1.0 && confirm) this.restart();
        }
    }
}
