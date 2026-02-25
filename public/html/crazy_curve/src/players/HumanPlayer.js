import { simulateShot, simulateTrajectory, simulateTrajectoryDebug } from '../physics/Simulation.js';
import {
    ROTATION_SENSITIVITY,
    CUE_PULL_SENSITIVITY,
    CAMERA_DISTANCE,
    CAMERA_HEIGHT,
    MAX_CUE_PULLBACK,
    MAX_SHOT_POWER,
    MIN_SHOT_POWER,
    STRIKE_ANIM_SPEED
} from '../config.js';

/**
 * Human player with mouse-based aiming and power controls.
 * Aiming (mouse X) and power (mouse Y pullback) happen simultaneously.
 * Click fires a cue strike animation that applies the shot on contact.
 */
export class HumanPlayer {
    constructor(canvas) {
        this.canvas = canvas;
        this.state = 'idle';  // 'idle', 'aiming', 'striking'
        this.aimAngle = 0;
        this.cueOffset = 0;

        // Strike offset for spin (0,0 = center, range -0.5 to 0.5)
        this.strikeOffset = { x: 0, y: 0 };

        // Cue elevation angle in radians (0 = flat, max ~0.35 = 20 degrees)
        this.cueElevation = 0;

        // Shot indicator for trajectory preview
        this.shotIndicator = null;
        this._lastTrajectoryTime = 0;

        // Strike animation state
        this._strikeAnimId = null;
        this._storedShotPower = 0;
        this._strikeLastTime = 0;

        // References set when taking turn
        this.game = null;
        this.camera = null;
        this.cue = null;
        this.onComplete = null;

        this._setupEventListeners();
        this._createSpinWidget();
        this._createElevationArc();
        this._createPowerGauge();
    }

    _createSpinWidget() {
        // Container
        this.spinWidget = document.createElement('div');
        this.spinWidget.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: radial-gradient(circle, #fff 0%, #ddd 100%);
            border: 3px solid #333;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: none;
            touch-action: none;
            z-index: 11;
        `;

        // Strike point indicator
        this.spinDot = document.createElement('div');
        this.spinDot.style.cssText = `
            position: absolute;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #e00;
            border: 2px solid #900;
            transform: translate(-50%, -50%);
            pointer-events: none;
        `;
        this._updateSpinDot();
        this.spinWidget.appendChild(this.spinDot);

        document.body.appendChild(this.spinWidget);

        // Event handlers for spin widget
        const handleSpinInput = (clientX, clientY) => {
            const rect = this.spinWidget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const radius = rect.width / 2;

            let dx = (clientX - centerX) / radius;
            let dy = (clientY - centerY) / radius;

            // Clamp to circle
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.9) {
                dx = (dx / dist) * 0.9;
                dy = (dy / dist) * 0.9;
            }

            this.strikeOffset.x = dx * 0.5;
            this.strikeOffset.y = dy * 0.5;
            this._updateSpinDot();
        };

        this._spinMoveHandler = null;
        this._spinTrajectoryInterval = null;

        const startSpinTrajectoryUpdates = () => {
            if (!this._spinTrajectoryInterval) {
                this._spinTrajectoryInterval = setInterval(() => this._updateTrajectory(), 100);
            }
        };

        this.spinWidget.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            handleSpinInput(e.clientX, e.clientY);
            startSpinTrajectoryUpdates();
            this._spinMoveHandler = (e) => handleSpinInput(e.clientX, e.clientY);
            const onUp = () => {
                this._cleanupSpinDrag();
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', this._spinMoveHandler);
            document.addEventListener('mouseup', onUp);
        });

        this.spinWidget.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleSpinInput(e.touches[0].clientX, e.touches[0].clientY);
            startSpinTrajectoryUpdates();
        });
        this.spinWidget.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handleSpinInput(e.touches[0].clientX, e.touches[0].clientY);
        });
        this.spinWidget.addEventListener('touchend', () => {
            this._cleanupSpinDrag();
        });
    }

    _updateSpinDot() {
        const offsetX = (this.strikeOffset.x / 0.5) * 35 + 40;  // 40 = center of 80px widget
        const offsetY = (this.strikeOffset.y / 0.5) * 35 + 40;
        this.spinDot.style.left = offsetX + 'px';
        this.spinDot.style.top = offsetY + 'px';
    }

    _cleanupSpinDrag() {
        if (this._spinMoveHandler) {
            document.removeEventListener('mousemove', this._spinMoveHandler);
            this._spinMoveHandler = null;
        }
        if (this._spinTrajectoryInterval) {
            clearInterval(this._spinTrajectoryInterval);
            this._spinTrajectoryInterval = null;
            this._updateTrajectory();
        }
    }

    _createElevationArc() {
        const arcSize = 120;  // Canvas size
        const MAX_ELEVATION = 1.22;  // ~70 degrees

        // Container div
        this.elevationArc = document.createElement('div');
        this.elevationArc.style.cssText = `
            position: absolute;
            bottom: 8px;
            left: 8px;
            width: ${arcSize}px;
            height: ${arcSize}px;
            display: none;
            touch-action: none;
            pointer-events: none;
            z-index: 10;
        `;

        // Canvas for the arc
        const canvas = document.createElement('canvas');
        canvas.width = arcSize;
        canvas.height = arcSize;
        canvas.style.cssText = 'pointer-events: auto; cursor: pointer;';
        this.elevationArc.appendChild(canvas);
        this._arcCanvas = canvas;
        this._arcSize = arcSize;
        this._maxElevation = MAX_ELEVATION;

        // Arc geometry: arc hugs the left outer edge of the spin widget
        // Spin widget is 80px at bottom:20px, left:20px => center at (60, window.h - 60)
        // Arc center is at the spin widget center relative to this container
        // Container is at bottom:8px, left:8px
        // Spin widget center in container coords: (60-8, arcSize - (60-8)) = (52, arcSize-52)
        this._arcCenterX = 52;
        this._arcCenterY = arcSize - 52;
        this._arcRadius = 52;  // 40 (spin radius) + 8 (gap) + 4 (line width/2)

        this._drawArc();
        document.body.appendChild(this.elevationArc);

        // Hit-test: is the click near the arc path?
        const isNearArc = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left - this._arcCenterX;
            const y = clientY - rect.top - this._arcCenterY;
            const dist = Math.sqrt(x * x + y * y);
            // Must be within 15px of the arc radius
            if (Math.abs(dist - this._arcRadius) > 15) return false;
            // Must be on the left side (within the 120-degree arc span)
            const fromLeft = Math.atan2(y, -x);
            return Math.abs(fromLeft) <= Math.PI / 3 + 0.15;
        };

        // Drag interaction
        const handleArcInput = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left - this._arcCenterX;
            const y = clientY - rect.top - this._arcCenterY;

            // Convert to angle from straight-left direction (pointing left = 0)
            let fromLeft = Math.atan2(y, -x);

            // Clamp to arc range: -60 to +60 degrees from left
            const arcHalf = Math.PI / 3;
            fromLeft = Math.max(-arcHalf, Math.min(arcHalf, fromLeft));

            // Map: bottom (-60 deg) = 0, top (+60 deg) = max elevation
            const t = (fromLeft + arcHalf) / (2 * arcHalf);
            this.cueElevation = t * MAX_ELEVATION;

            this._drawArc();
            this._updateAimingView();
        };

        this._arcMoveHandler = null;
        this._arcTrajectoryInterval = null;

        const startArcTrajectoryUpdates = () => {
            if (!this._arcTrajectoryInterval) {
                this._arcTrajectoryInterval = setInterval(() => this._updateTrajectory(), 100);
            }
        };

        canvas.addEventListener('mousedown', (e) => {
            if (!isNearArc(e.clientX, e.clientY)) return;
            e.stopPropagation();
            e.preventDefault();
            this._cleanupArcDrag();
            handleArcInput(e.clientX, e.clientY);
            startArcTrajectoryUpdates();
            this._arcMoveHandler = (me) => handleArcInput(me.clientX, me.clientY);
            this._arcUpHandler = () => { this._cleanupArcDrag(); };
            document.addEventListener('mousemove', this._arcMoveHandler);
            document.addEventListener('mouseup', this._arcUpHandler);
        });

        canvas.addEventListener('touchstart', (e) => {
            if (!isNearArc(e.touches[0].clientX, e.touches[0].clientY)) return;
            e.preventDefault();
            this._cleanupArcDrag();
            handleArcInput(e.touches[0].clientX, e.touches[0].clientY);
            startArcTrajectoryUpdates();
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handleArcInput(e.touches[0].clientX, e.touches[0].clientY);
        });
        canvas.addEventListener('touchend', () => {
            this._cleanupArcDrag();
        });
    }

    _drawArc() {
        const canvas = this._arcCanvas;
        const ctx = canvas.getContext('2d');
        const cx = this._arcCenterX;
        const cy = this._arcCenterY;
        const r = this._arcRadius;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Arc spans 120 degrees on the left side of the circle
        // In canvas coords: 0 = right, PI/2 = down, PI = left, 3PI/2 = up
        // Left side arc: from 2PI/3 (120 deg, upper-left) to 4PI/3 (240 deg, lower-left)
        const startAngle = 2 * Math.PI / 3;   // 120 degrees (upper-left)
        const endAngle = 4 * Math.PI / 3;     // 240 degrees (lower-left)

        // Draw background arc
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw active portion (from bottom to current elevation)
        const t = this.cueElevation / this._maxElevation;
        if (t > 0.01) {
            const activeAngle = endAngle - t * (endAngle - startAngle);
            ctx.beginPath();
            ctx.arc(cx, cy, r, endAngle, activeAngle, true);  // draw counterclockwise (bottom to top)
            ctx.strokeStyle = '#4af';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Draw dot at current elevation position
        const dotAngle = endAngle - t * (endAngle - startAngle);
        const dotX = cx + Math.cos(dotAngle) * r;
        const dotY = cy + Math.sin(dotAngle) * r;

        ctx.beginPath();
        ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#4af';
        ctx.fill();
        ctx.strokeStyle = '#08f';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw degree label
        const degrees = Math.round(this.cueElevation * 180 / Math.PI);
        if (degrees > 0) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(degrees + '\u00B0', dotX - 14, dotY);
        }
    }

    _cleanupArcDrag() {
        if (this._arcMoveHandler) {
            document.removeEventListener('mousemove', this._arcMoveHandler);
            this._arcMoveHandler = null;
        }
        if (this._arcUpHandler) {
            document.removeEventListener('mouseup', this._arcUpHandler);
            this._arcUpHandler = null;
        }
        if (this._arcTrajectoryInterval) {
            clearInterval(this._arcTrajectoryInterval);
            this._arcTrajectoryInterval = null;
            this._updateTrajectory();
        }
    }

    _showElevationArc() {
        this.elevationArc.style.display = 'block';
    }

    _hideElevationArc() {
        this.elevationArc.style.display = 'none';
    }

    _showSpinWidget() {
        this.spinWidget.style.display = 'block';
    }

    _hideSpinWidget() {
        this.spinWidget.style.display = 'none';
    }

    _createPowerGauge() {
        // Outer container
        this.powerGauge = document.createElement('div');
        this.powerGauge.style.cssText = `
            position: absolute;
            right: 20px;
            bottom: 20px;
            width: 20px;
            height: 200px;
            background: rgba(0,0,0,0.6);
            border: 2px solid #555;
            border-radius: 4px;
            display: none;
            overflow: hidden;
        `;

        // Fill bar (grows from bottom)
        this.powerGaugeFill = document.createElement('div');
        this.powerGaugeFill.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 0%;
            background: linear-gradient(to top, #0a0, #ff0, #f00);
            transition: none;
        `;

        this.powerGauge.appendChild(this.powerGaugeFill);
        document.body.appendChild(this.powerGauge);
    }

    _showPowerGauge() {
        this.powerGauge.style.display = 'block';
    }

    _hidePowerGauge() {
        this.powerGauge.style.display = 'none';
    }

    _updatePowerGauge() {
        const fraction = Math.min(this.cueOffset / MAX_CUE_PULLBACK, 1);
        this.powerGaugeFill.style.height = (fraction * 100) + '%';
    }

    _setupEventListeners() {
        this.canvas.addEventListener('click', this._onCanvasClick.bind(this));
        this.canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        document.addEventListener('pointerlockchange', this._onPointerLockChange.bind(this));
        document.addEventListener('mozpointerlockchange', this._onPointerLockChange.bind(this));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state !== 'idle') {
                this._exitAimingMode();
            }
            if ((e.key === 'D' || e.key === 'd') && this.state === 'aiming') {
                this._dumpTrajectoryDebug();
            }
        });
    }

    /**
     * Take a turn - enter aiming mode.
     * @param {Object} game - The game instance
     * @param {BABYLON.ArcRotateCamera} camera - The scene camera
     * @param {Cue} cue - The cue stick
     * @param {Function} onComplete - Called with the shot when ready
     */
    takeTurn(game, camera, cue, onComplete) {
        this.game = game;
        this.camera = camera;
        this.cue = cue;
        this.onComplete = onComplete;

        this._enterAimingMode();
    }

    _enterAimingMode() {
        this.state = 'aiming';
        console.log("Player " + this.game.currentPlayer + " - Click to lock aim, mouse Y to set power, click again to shoot");

        // Disable camera controls
        this.camera.detachControl(this.canvas);

        // Initial aim toward center of table
        this.aimAngle = 0;

        // Position camera and cue
        this._updateAimingView();

        // Show cue, spin widget, elevation arc, and power gauge
        this.cue.show();
        this.cueOffset = 0;
        this.strikeOffset = { x: 0, y: 0 };
        this.cueElevation = 0;
        this._updateSpinDot();
        this._showSpinWidget();
        this._showElevationArc();
        this._drawArc();
        this._showPowerGauge();
        this._updatePowerGauge();

        // Show initial trajectory
        this._lastTrajectoryTime = 0;
        this._updateTrajectory();
    }

    _exitAimingMode() {
        // Cancel any running strike animation
        if (this._strikeAnimId) {
            cancelAnimationFrame(this._strikeAnimId);
            this._strikeAnimId = null;
        }

        this.state = 'idle';

        // Exit pointer lock if active
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }

        // Hide cue, spin widget, elevation arc, power gauge, and shot indicator
        this.cue.hide();
        this._hideSpinWidget();
        this._hideElevationArc();
        this._hidePowerGauge();
        this._cleanupSpinDrag();
        this._cleanupArcDrag();
        if (this.shotIndicator) this.shotIndicator.hide();

        // Re-enable camera controls
        this.camera.attachControl(this.canvas, true);

        console.log("Exited aiming mode");
    }

    _updateAimingView() {
        const whiteBall = this.game.whiteBall;
        if (!whiteBall) return;

        const whitePos = whiteBall.getAbsolutePosition();

        // Direction vector from aim angle
        const dirX = Math.sin(this.aimAngle);
        const dirZ = Math.cos(this.aimAngle);

        // Position camera behind the white ball
        const camX = whitePos.x - dirX * CAMERA_DISTANCE;
        const camZ = whitePos.z - dirZ * CAMERA_DISTANCE;
        const camY = whitePos.y + CAMERA_HEIGHT;

        const camPos = new BABYLON.Vector3(camX, camY, camZ);
        this.camera.position = camPos;

        // Look at a point ahead of the white ball
        const lookAtX = whitePos.x + dirX * 10;
        const lookAtZ = whitePos.z + dirZ * 10;
        this.camera.setTarget(new BABYLON.Vector3(lookAtX, whitePos.y, lookAtZ));

        // Update cue position - point from camera to white ball with spin offset and elevation
        this.cue.updatePosition(whitePos, camPos, this.cueOffset, this.strikeOffset, this.cueElevation);
    }

    _getCameraPosition() {
        const whitePos = this.game.whiteBall.getAbsolutePosition();
        const dirX = Math.sin(this.aimAngle);
        const dirZ = Math.cos(this.aimAngle);
        return new BABYLON.Vector3(
            whitePos.x - dirX * CAMERA_DISTANCE,
            whitePos.y + CAMERA_HEIGHT,
            whitePos.z - dirZ * CAMERA_DISTANCE
        );
    }

    _updateAiming(movementX, movementY) {
        // Mouse X = aim rotation
        this.aimAngle -= movementX * ROTATION_SENSITIVITY;

        // Keep angle in reasonable range
        while (this.aimAngle > Math.PI * 2) this.aimAngle -= Math.PI * 2;
        while (this.aimAngle < 0) this.aimAngle += Math.PI * 2;

        // Mouse Y = cue pullback (power)
        this.cueOffset += movementY * CUE_PULL_SENSITIVITY;
        if (this.cueOffset < 0) this.cueOffset = 0;
        if (this.cueOffset > MAX_CUE_PULLBACK) this.cueOffset = MAX_CUE_PULLBACK;

        this._updateAimingView();
        this._updatePowerGauge();
        this._updateTrajectory();
    }

    _updateTrajectory() {
        if (!this.shotIndicator || !this.game) return;

        const now = performance.now();
        if (now - this._lastTrajectoryTime < 100) return;
        this._lastTrajectoryTime = now;

        // Use actual power from pullback, but floor at 15 so trajectory always reaches object balls
        const power = Math.max(15, (this.cueOffset / MAX_CUE_PULLBACK) * MAX_SHOT_POWER);
        const cosElev = Math.cos(this.cueElevation);
        const sinElev = Math.sin(this.cueElevation);
        const shot = {
            force: {
                x: Math.sin(this.aimAngle) * power * cosElev,
                y: 0,
                z: Math.cos(this.aimAngle) * power * cosElev
            },
            jumpSpeed: power * sinElev * 0.25,
            strikeOffset: { x: this.strikeOffset.x, y: -this.strikeOffset.y }
        };

        const result = simulateTrajectory(
            shot,
            this.game.physicsWorld,
            this.game.frictionList,
            this.game.whiteBall
        );

        const playerInfo = this.game.getPlayerInfo();
        this.shotIndicator.update(result.whitePath, result.targetPath, result.firstBallHitColor, playerInfo.color, playerInfo.canPotBlack, result.bounceData);
    }

    _dumpTrajectoryDebug() {
        if (!this.game) return;

        const power = Math.max(15, (this.cueOffset / MAX_CUE_PULLBACK) * MAX_SHOT_POWER);
        const cosElev = Math.cos(this.cueElevation);
        const sinElev = Math.sin(this.cueElevation);
        const shot = {
            force: {
                x: Math.sin(this.aimAngle) * power * cosElev,
                y: 0,
                z: Math.cos(this.aimAngle) * power * cosElev
            },
            jumpSpeed: power * sinElev * 0.25,
            strikeOffset: { x: this.strikeOffset.x, y: -this.strikeOffset.y }
        };

        const result = simulateTrajectoryDebug(
            shot,
            this.game.physicsWorld,
            this.game.frictionList,
            this.game.whiteBall
        );

        const json = JSON.stringify(result, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trajectory_debug.json';
        a.click();
        URL.revokeObjectURL(url);
        console.log('Trajectory debug dumped: ' + result.frames.length + ' frames, ' + result.bounceData.length + ' bounces');
    }

    _startStrikeAnimation() {
        // Ignore if cue barely pulled back
        if (this.cueOffset < 1) return;

        this.state = 'striking';
        this._cleanupSpinDrag();
        if (this.shotIndicator) this.shotIndicator.hide();

        // Store power from current pullback
        this._storedShotPower = (this.cueOffset / MAX_CUE_PULLBACK) * MAX_SHOT_POWER;
        this._storedShotPower = Math.min(Math.max(this._storedShotPower, MIN_SHOT_POWER), MAX_SHOT_POWER);

        this._strikeLastTime = performance.now();

        const animate = (timestamp) => {
            const dt = (timestamp - this._strikeLastTime) / 1000;
            this._strikeLastTime = timestamp;

            this.cueOffset -= STRIKE_ANIM_SPEED * dt;

            if (this.cueOffset <= 0) {
                this.cueOffset = 0;
                this.cue.updatePosition(
                    this.game.whiteBall.getAbsolutePosition(),
                    this._getCameraPosition(),
                    this.cueOffset,
                    this.strikeOffset,
                    this.cueElevation
                );
                this._strikeAnimId = null;
                this._executeShot(this._storedShotPower);
                return;
            }

            this.cue.updatePosition(
                this.game.whiteBall.getAbsolutePosition(),
                this._getCameraPosition(),
                this.cueOffset,
                this.strikeOffset,
                this.cueElevation
            );
            this._strikeAnimId = requestAnimationFrame(animate);
        };

        this._strikeAnimId = requestAnimationFrame(animate);
    }

    _executeShot(power) {
        console.log("Strike! Power: " + power.toFixed(1));

        // Exit pointer lock
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }

        const cosElev = Math.cos(this.cueElevation);
        const sinElev = Math.sin(this.cueElevation);
        const forceX = Math.sin(this.aimAngle) * power * cosElev;
        const forceZ = Math.cos(this.aimAngle) * power * cosElev;

        const shot = {
            force: { x: forceX, y: 0, z: forceZ },
            jumpSpeed: power * sinElev * 0.25,
            strikeOffset: { x: this.strikeOffset.x, y: -this.strikeOffset.y }
        };

        // Simulate to get result for turn processing
        const playerInfo = this.game.getPlayerInfo();
        const result = simulateShot(
            shot,
            playerInfo,
            this.game.physicsWorld,
            this.game.frictionList,
            this.game.whiteBall
        );
        shot.result = result;

        // Log shot
        const p = result.potted;
        let msg = "P" + this.game.currentPlayer + "(human)";
        if (playerInfo.color) msg += "[" + playerInfo.color + "]";
        msg += ": " + p.red + "," + p.blue + "," + p.black + "," + p.white;
        if (!result.firstBallHitColor) msg += " missed";
        msg += " power=" + power.toFixed(1);
        console.log(msg);

        // Clean up state
        this.state = 'idle';
        this.cue.hide();
        this._hideSpinWidget();
        this._hideElevationArc();
        this._hidePowerGauge();
        if (this.shotIndicator) this.shotIndicator.hide();
        this.cueOffset = 0;

        // Smoothly raise and pull back camera for better view of the shot
        this.game.setCameraTarget(90, 0.72, new BABYLON.Vector3(0, 0, 0));

        // Re-enable camera controls
        this.camera.attachControl(this.canvas, true);

        // Callback with the shot
        if (this.onComplete) {
            this.onComplete(shot);
        }
    }

    _onCanvasClick(event) {
        if (this.state === 'aiming') {
            if (document.pointerLockElement !== this.canvas) {
                // First click: request pointer lock
                const requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
                if (requestPointerLock) {
                    requestPointerLock.call(this.canvas);
                }
            } else {
                // Second click: start strike animation
                this._startStrikeAnimation();
            }
            event.preventDefault();
        }
    }

    _onMouseMove(event) {
        if (this.state === 'aiming' && document.pointerLockElement === this.canvas) {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            this._updateAiming(movementX, movementY);
        }
    }

    _onPointerLockChange() {
        if (document.pointerLockElement !== this.canvas) {
            // Pointer unlocked — preserve cue offset so power setting
            // survives exiting pointer lock to adjust spin widget
            if (this.state === 'aiming') {
            }
        }
    }

    /**
     * Check if player is currently in aiming/striking mode.
     */
    isActive() {
        return this.state !== 'idle';
    }

    /**
     * Get current state.
     */
    getState() {
        return this.state;
    }
}
