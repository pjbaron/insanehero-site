/**
 * StickFigureRenderer - Renders mocap poses as stick figures with tier overlays
 */

const StickFigureRenderer = {
    // Joint visual sizes
    JOINT_RADII: {
        head: 10,
        hand_l: 4,
        hand_r: 4,
        foot_l: 4,
        foot_r: 4,
        default: 2
    },

    // Line width for bones
    LINE_WIDTH: 3,

    // Scale factor: mocap units to pixels (~2 units tall -> ~100px figure)
    DEFAULT_SCALE: 55,

    // Motion blur settings (disabled - coordinate transform issues)
    MOTION_BLUR_ENABLED: false,
    MOTION_BLUR_THRESHOLD: 2.0,
    MOTION_BLUR_COPIES: 3,

    /**
     * Calculate angle between two joints (in radians)
     * @param {Array} from - [x, y] position
     * @param {Array} to - [x, y] position
     * @returns {number} - Angle in radians
     */
    _getAngle(from, to) {
        return Math.atan2(to[1] - from[1], to[0] - from[0]);
    },

    /**
     * Render a mocap pose as a stick figure
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {object} pose - Pose object from MocapAnimation.sample()
     * @param {MocapAnimation} animation - Animation data (for bone definitions)
     * @param {number} x - Base X position on canvas
     * @param {number} y - Base Y position on canvas (ground level)
     * @param {number} scale - Scale factor (default: DEFAULT_SCALE)
     * @param {object} options - Render options
     */
    render(ctx, pose, animation, x, y, scale, options = {}) {
        if (!pose || !animation) return;

        const {
            color = '#ffffff',
            mirror = false,
            evolution = null,
            velocities = null,
            alpha = 1,
            flashColor = null
        } = options;

        scale = scale || this.DEFAULT_SCALE;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Transform joint positions to canvas coordinates
        const groundFeet = animation.groundFeet || false;
        const canvasPos = this._transformPose(pose, x, y, scale, mirror, groundFeet);

        // Calculate size scale for proportional rendering
        const sizeScale = scale / this.DEFAULT_SCALE;

        // Draw evolution effects behind figure
        if (evolution) {
            this._renderBackgroundEffects(ctx, canvasPos, evolution, color, sizeScale);
        }

        // Draw motion trails if enabled and velocities provided
        if (this.MOTION_BLUR_ENABLED && velocities) {
            this._renderMotionTrails(ctx, canvasPos, velocities, color, scale);
        }

        // Draw bones (scale line width proportionally)
        const drawColor = flashColor || color;
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = this.LINE_WIDTH * sizeScale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const [jointA, jointB] of animation.bones) {
            const posA = canvasPos[jointA];
            const posB = canvasPos[jointB];
            if (posA && posB) {
                ctx.beginPath();
                ctx.moveTo(posA[0], posA[1]);
                ctx.lineTo(posB[0], posB[1]);
                ctx.stroke();
            }
        }

        // Draw joints (scale radii proportionally)
        ctx.fillStyle = drawColor;
        for (const joint of animation.joints) {
            const pos = canvasPos[joint];
            if (pos) {
                const baseRadius = this.JOINT_RADII[joint] || this.JOINT_RADII.default;
                const radius = baseRadius * sizeScale;
                ctx.beginPath();
                ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw evolution tier overlays on top
        if (evolution) {
            this._renderForegroundEffects(ctx, canvasPos, evolution, color, mirror, sizeScale);
        }

        ctx.restore();
    },

    /**
     * Get world position of a specific joint
     * @param {object} pose - Pose object with joint positions
     * @param {string} jointName - Name of joint (e.g., 'hand_r', 'foot_l')
     * @param {number} x - Fighter's X position
     * @param {number} y - Fighter's Y position (ground level)
     * @param {number} scale - Scale factor
     * @param {boolean} mirror - Whether figure is mirrored
     * @returns {Array|null} - [x, y] world position or null if joint not found
     */
    getJointWorldPosition(pose, jointName, x, y, scale, mirror) {
        if (!pose || !pose[jointName]) return null;

        const mirrorMult = mirror ? 1 : -1;
        const hipsY = pose.hips ? pose.hips[1] : 1.0;
        const pos = pose[jointName];

        return [
            x + pos[0] * scale * mirrorMult,
            y - (pos[1] - hipsY) * scale
        ];
    },

    /**
     * Transform mocap pose to canvas coordinates
     * Centers the figure on the hips (default) or grounds to lowest foot
     * @private
     */
    _transformPose(pose, x, y, scale, mirror, groundFeet = false) {
        const canvasPos = {};
        // Flip X by default (mocap faces opposite direction), then mirror if needed
        const mirrorMult = mirror ? 1 : -1;

        // Get hips Y (used as base anchor)
        const hipsY = pose.hips ? pose.hips[1] : 1.0;
        let anchorY = hipsY;

        // For groundFeet mode, use fixed reference points from standing pose
        // This keeps ground constant as the character falls
        if (groundFeet) {
            const STANDING_HIPS_Y = 1.4;   // Hips Y in standing pose
            const STANDING_GROUND_Y = 0.1; // Feet Y in standing pose (ground level)

            // Use fixed ground as anchor instead of dynamic hips
            anchorY = STANDING_GROUND_Y;

            // Offset Y so ground ends up at same visual position as hip-based feet
            y += (STANDING_HIPS_Y - STANDING_GROUND_Y) * scale;
        }

        for (const joint in pose) {
            const pos = pose[joint];
            // Mocap: Y up, Canvas: Y down
            // X is flipped by default, then mirrored for rival
            canvasPos[joint] = [
                x + pos[0] * scale * mirrorMult,
                y - (pos[1] - anchorY) * scale  // Invert Y, offset by anchor height
                // Z ignored (depth)
            ];
        }

        return canvasPos;
    },

    /**
     * Render background evolution effects (motion lines, auras)
     * @private
     */
    _renderBackgroundEffects(ctx, canvasPos, tiers, color, sizeScale) {
        // Speed tier: motion lines behind figure
        if (tiers.speed > 0 && canvasPos.spine && canvasPos.hips) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 1 * sizeScale;

            const spineX = canvasPos.spine[0];
            const spineY = canvasPos.spine[1];
            const hipsY = canvasPos.hips[1];

            for (let i = 1; i <= tiers.speed; i++) {
                const offsetX = -8 * i * sizeScale;
                ctx.beginPath();
                ctx.moveTo(spineX + offsetX, spineY);
                ctx.lineTo(spineX + offsetX, hipsY);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Regen tier: green vines
        if (tiers.regen > 0 && canvasPos.neck && canvasPos.hips) {
            ctx.save();
            ctx.strokeStyle = '#27ae60';
            ctx.globalAlpha = 0.4 + (tiers.regen * 0.15);
            ctx.lineWidth = 1 * sizeScale;

            const neckY = canvasPos.neck[1];
            const hipsY = canvasPos.hips[1];
            const centerX = canvasPos.spine ? canvasPos.spine[0] : canvasPos.neck[0];

            if (tiers.regen >= 2) {
                ctx.beginPath();
                ctx.moveTo(centerX - 3 * sizeScale, neckY + 5 * sizeScale);
                ctx.quadraticCurveTo(centerX - 6 * sizeScale, (neckY + hipsY) / 2, centerX - 2 * sizeScale, hipsY - 5 * sizeScale);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Lifesteal tier: red glow
        if (tiers.lifesteal > 0 && canvasPos.head) {
            ctx.save();
            ctx.strokeStyle = '#c0392b';
            ctx.globalAlpha = 0.2 + (tiers.lifesteal * 0.1);
            ctx.lineWidth = 6 * sizeScale;
            ctx.beginPath();
            ctx.arc(canvasPos.head[0], canvasPos.head[1], (this.JOINT_RADII.head + 3) * sizeScale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    },

    /**
     * Render foreground evolution effects (weapons, armor)
     * @private
     */
    _renderForegroundEffects(ctx, canvasPos, tiers, color, mirror, sizeScale) {
        const mirrorMult = mirror ? -1 : 1;
        const ss = sizeScale;  // Shorthand for cleaner code

        // Crit tier: targeting reticle on left hand
        if (tiers.crit > 0 && canvasPos.hand_l && canvasPos.elbow_l) {
            const handL = canvasPos.hand_l;
            const handAngle = this._getAngle(canvasPos.elbow_l, handL);

            ctx.save();
            ctx.strokeStyle = '#ffff00';
            ctx.fillStyle = '#ffff00';
            ctx.lineWidth = 1 * ss;
            ctx.translate(handL[0], handL[1]);
            ctx.rotate(handAngle);

            // Center dot
            ctx.beginPath();
            ctx.arc(0, 0, 2 * ss, 0, Math.PI * 2);
            ctx.fill();

            if (tiers.crit >= 2) {
                // Crosshair
                ctx.beginPath();
                ctx.moveTo(0, -6 * ss);
                ctx.lineTo(0, 6 * ss);
                ctx.moveTo(-6 * ss, 0);
                ctx.lineTo(6 * ss, 0);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Execute tier: skull knuckle on left hand
        if (tiers.execute > 0 && canvasPos.hand_l && canvasPos.elbow_l) {
            const handL = canvasPos.hand_l;
            const handAngle = this._getAngle(canvasPos.elbow_l, handL);

            ctx.save();
            ctx.strokeStyle = '#8e44ad';
            ctx.fillStyle = '#8e44ad';
            ctx.lineWidth = 2 * ss;
            ctx.translate(handL[0], handL[1]);
            ctx.rotate(handAngle);

            // Knuckle ring
            const size = (5 + tiers.execute) * ss;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.stroke();

            if (tiers.execute >= 2) {
                // Skull eye sockets
                ctx.beginPath();
                ctx.arc(-2 * ss, -1 * ss, 1.5 * ss, 0, Math.PI * 2);
                ctx.arc(2 * ss, -1 * ss, 1.5 * ss, 0, Math.PI * 2);
                ctx.fill();
            }

            if (tiers.execute >= 3) {
                // Skull teeth
                ctx.lineWidth = 1 * ss;
                ctx.beginPath();
                ctx.moveTo(-3 * ss, 3 * ss);
                ctx.lineTo(3 * ss, 3 * ss);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Armor tier: helmet and breastplate
        if (tiers.armor >= 2 && canvasPos.head && canvasPos.neck) {
            const headX = canvasPos.head[0];
            const headY = canvasPos.head[1];
            const headAngle = this._getAngle(canvasPos.neck, canvasPos.head) - Math.PI / 2;
            const headRadius = this.JOINT_RADII.head * ss;

            ctx.save();
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 2 * ss;
            ctx.translate(headX, headY);
            ctx.rotate(headAngle);

            // Helmet visor
            ctx.beginPath();
            ctx.moveTo(-headRadius, 0);
            ctx.lineTo(headRadius, 0);
            ctx.stroke();

            if (tiers.armor >= 3) {
                ctx.beginPath();
                ctx.moveTo(0, -headRadius);
                ctx.lineTo(0, -headRadius - 8 * ss);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Armor tier: breastplate
        if (tiers.armor >= 1 && canvasPos.neck && canvasPos.spine) {
            const neckX = canvasPos.neck[0];
            const neckY = canvasPos.neck[1];
            const torsoAngle = this._getAngle(canvasPos.neck, canvasPos.spine) - Math.PI / 2;

            ctx.save();
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 2 * ss;
            ctx.translate(neckX, neckY + 8 * ss);
            ctx.rotate(torsoAngle);

            ctx.beginPath();
            ctx.moveTo(-8 * ss, 0);
            ctx.lineTo(8 * ss, 0);
            ctx.lineTo(6 * ss, 12 * ss);
            ctx.lineTo(-6 * ss, 12 * ss);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // Lifesteal tier: fangs
        if (tiers.lifesteal >= 2 && canvasPos.head && canvasPos.neck) {
            const headX = canvasPos.head[0];
            const headY = canvasPos.head[1];
            const headAngle = this._getAngle(canvasPos.neck, canvasPos.head) - Math.PI / 2;
            const headRadius = this.JOINT_RADII.head * ss;

            ctx.save();
            ctx.strokeStyle = '#ecf0f1';
            ctx.lineWidth = 2 * ss;
            ctx.translate(headX, headY);
            ctx.rotate(headAngle);
            ctx.beginPath();
            ctx.moveTo(-3 * ss, headRadius - 2 * ss);
            ctx.lineTo(-3 * ss, headRadius + 4 * ss);
            ctx.moveTo(3 * ss, headRadius - 2 * ss);
            ctx.lineTo(3 * ss, headRadius + 4 * ss);
            ctx.stroke();
            ctx.restore();
        }

        // Thorns tier: shoulder spikes
        if (tiers.thorns > 0 && canvasPos.shoulder_l && canvasPos.shoulder_r && canvasPos.elbow_l && canvasPos.elbow_r) {
            ctx.save();
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 2 * ss;

            const spikeLen = (4 + (tiers.thorns * 3)) * ss;
            const shoulderL = canvasPos.shoulder_l;
            const shoulderR = canvasPos.shoulder_r;

            // Left spike - perpendicular to upper arm
            const armAngleL = this._getAngle(shoulderL, canvasPos.elbow_l);
            ctx.save();
            ctx.translate(shoulderL[0], shoulderL[1]);
            ctx.rotate(armAngleL - Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-spikeLen, -spikeLen);
            ctx.stroke();
            ctx.restore();

            // Right spike - perpendicular to upper arm
            const armAngleR = this._getAngle(shoulderR, canvasPos.elbow_r);
            ctx.save();
            ctx.translate(shoulderR[0], shoulderR[1]);
            ctx.rotate(armAngleR - Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(spikeLen, -spikeLen);
            ctx.stroke();
            ctx.restore();

            ctx.restore();
        }

        // Attack tier: gauntlets on hands
        if (tiers.attack > 0 && canvasPos.hand_r && canvasPos.elbow_r) {
            const handR = canvasPos.hand_r;
            const handAngle = this._getAngle(canvasPos.elbow_r, handR);

            ctx.save();
            ctx.fillStyle = tiers.attack >= 2 ? '#f39c12' : '#95a5a6';
            const fistSize = (4 + tiers.attack) * ss;
            ctx.beginPath();
            ctx.arc(handR[0], handR[1], fistSize, 0, Math.PI * 2);
            ctx.fill();

            if (tiers.attack >= 3) {
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 2 * ss;
                ctx.translate(handR[0], handR[1]);
                ctx.rotate(handAngle);
                ctx.beginPath();
                ctx.moveTo(fistSize, 0);
                ctx.lineTo(fistSize + 5 * ss, 0);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Bleed tier: claws on hands
        if (tiers.bleed > 0 && canvasPos.hand_r && canvasPos.elbow_r) {
            const handR = canvasPos.hand_r;
            const handAngle = this._getAngle(canvasPos.elbow_r, handR);

            ctx.save();
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 2 * ss;
            ctx.translate(handR[0], handR[1]);
            ctx.rotate(handAngle);

            const clawLen = (3 + (tiers.bleed * 2)) * ss;
            ctx.beginPath();
            ctx.moveTo(3 * ss, -2 * ss);
            ctx.lineTo(3 * ss + clawLen, -2 * ss - clawLen);
            ctx.moveTo(3 * ss, 2 * ss);
            ctx.lineTo(3 * ss + clawLen, 2 * ss);
            ctx.stroke();
            ctx.restore();
        }

        // Speed tier: winged ankles
        if (tiers.speed >= 2 && canvasPos.foot_l && canvasPos.foot_r && canvasPos.knee_l && canvasPos.knee_r) {
            ctx.save();
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 1 * ss;

            const feet = [
                { foot: canvasPos.foot_l, knee: canvasPos.knee_l },
                { foot: canvasPos.foot_r, knee: canvasPos.knee_r }
            ];

            for (const { foot, knee } of feet) {
                const legAngle = this._getAngle(knee, foot);
                ctx.save();
                ctx.translate(foot[0], foot[1] - 5 * ss);
                ctx.rotate(legAngle - Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(-3 * ss * mirrorMult, 0);
                ctx.lineTo(-8 * ss * mirrorMult, -5 * ss);
                ctx.lineTo(-3 * ss * mirrorMult, -3 * ss);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        // Lifesteal tier 3: bat wings
        if (tiers.lifesteal >= 3 && canvasPos.shoulder_l && canvasPos.shoulder_r) {
            ctx.save();
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 1 * ss;
            ctx.globalAlpha = 0.6;

            const shoulderL = canvasPos.shoulder_l;
            const shoulderR = canvasPos.shoulder_r;

            // Left wing
            ctx.beginPath();
            ctx.moveTo(shoulderL[0], shoulderL[1]);
            ctx.quadraticCurveTo(
                shoulderL[0] - 20 * ss * mirrorMult, shoulderL[1] - 15 * ss,
                shoulderL[0] - 25 * ss * mirrorMult, shoulderL[1] + 5 * ss
            );
            ctx.quadraticCurveTo(
                shoulderL[0] - 15 * ss * mirrorMult, shoulderL[1] + 5 * ss,
                shoulderL[0], shoulderL[1] + 10 * ss
            );
            ctx.stroke();

            // Right wing
            ctx.beginPath();
            ctx.moveTo(shoulderR[0], shoulderR[1]);
            ctx.quadraticCurveTo(
                shoulderR[0] + 20 * ss * mirrorMult, shoulderR[1] - 15 * ss,
                shoulderR[0] + 25 * ss * mirrorMult, shoulderR[1] + 5 * ss
            );
            ctx.quadraticCurveTo(
                shoulderR[0] + 15 * ss * mirrorMult, shoulderR[1] + 5 * ss,
                shoulderR[0], shoulderR[1] + 10 * ss
            );
            ctx.stroke();
            ctx.restore();
        }

        // Stun tier: impact rings around fists
        if (tiers.stun > 0 && canvasPos.hand_r) {
            const handR = canvasPos.hand_r;

            ctx.save();
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 1 * ss;
            ctx.globalAlpha = 0.5;

            for (let i = 1; i <= tiers.stun; i++) {
                ctx.beginPath();
                ctx.arc(handR[0], handR[1], (6 + i * 4) * ss, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Regen tier 3: leaf crown
        if (tiers.regen >= 3 && canvasPos.head && canvasPos.neck) {
            const headX = canvasPos.head[0];
            const headY = canvasPos.head[1];
            const headAngle = this._getAngle(canvasPos.neck, canvasPos.head) - Math.PI / 2;
            const headRadius = this.JOINT_RADII.head * ss;

            ctx.save();
            ctx.strokeStyle = '#27ae60';
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = 1 * ss;
            ctx.translate(headX, headY);
            ctx.rotate(headAngle);

            ctx.beginPath();
            ctx.moveTo(-6 * ss, -headRadius - 2 * ss);
            ctx.lineTo(0, -headRadius - 9 * ss);
            ctx.lineTo(6 * ss, -headRadius - 2 * ss);
            ctx.stroke();
            ctx.restore();
        }
    },

    /**
     * Render motion trails for fast-moving joints
     * @private
     */
    _renderMotionTrails(ctx, canvasPos, velocities, color, scale) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        for (const joint in velocities) {
            const vel = velocities[joint];
            const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1]);

            if (speed > this.MOTION_BLUR_THRESHOLD && canvasPos[joint]) {
                const pos = canvasPos[joint];
                const velNorm = [-vel[0] / speed, -vel[1] / speed];

                for (let i = 1; i <= this.MOTION_BLUR_COPIES; i++) {
                    ctx.globalAlpha = 0.3 / i;
                    const offset = i * 5 * (speed / 2);
                    ctx.beginPath();
                    ctx.arc(
                        pos[0] + velNorm[0] * offset * scale,
                        pos[1] - velNorm[1] * offset * scale,
                        this.JOINT_RADII[joint] || this.JOINT_RADII.default,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }
};
