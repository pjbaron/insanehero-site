/**
 * Fighter - Entity with stats, rendering, and animations
 */

class Fighter {
    /**
     * Create a new fighter
     * @param {boolean} isPlayer - true for player, false for enemy
     */
    constructor(isPlayer = true) {
        this.isPlayer = isPlayer;

        // Position (set by combat system)
        this.x = 0;
        this.y = 0;

        // Base stats
        this.maxHp = 100;
        this.hp = 100;
        this.baseAttack = 10;
        this.attackBonus = 0;   // Percentage bonus (0.25 = +25%)
        this.attackSpeed = 1.0; // attacks per second
        this.armor = 0;
        this.critChance = 0.05; // 5%
        this.lifesteal = 0;

        // New combat stats
        this.thorns = 0;
        this.regen = 0;
        this.execute = 0;
        this.bleed = 0;
        this.stunChance = 0;

        // Combat state
        this.attackTimer = 0;
        this.isAlive = true;
        this.bleedEffect = null;  // {damage, ticksRemaining} - single effect, refreshes on hit
        this.stunTicks = 0;

        // Animation state
        this.animState = 'idle'; // idle, attack, hit, death
        this.animTimer = 0;
        this.animDuration = 0;

        // Visual properties
        this.scale = 1;
        this.rotation = 0;
        this.alpha = 1;
        this.flashTimer = 0;

        // Healing animation state
        this.healTimer = 0;
        this.healDuration = 0;
        this.healStartHp = 0;

        // Stick figure dimensions
        this.headRadius = 12;
        this.bodyLength = 30;
        this.armLength = 20;
        this.legLength = 25;
        this.lineWidth = 3;

        // Direction (1 = facing right, -1 = facing left)
        this.facing = isPlayer ? 1 : -1;

        // Whether to show the HP bar (can be hidden for certain screens)
        this.showHPBar = true;

        // Triggered/passive upgrade effects storage
        this.upgrades = [];

        // Computed attack property (base * bonus multiplier)
        Object.defineProperty(this, 'attack', {
            get: function() {
                return Math.floor(this.baseAttack * (1 + this.attackBonus));
            }
        });

        // Mocap animation system
        this.animController = new FighterAnimationController();
        this.useMocap = true;  // Fallback flag - set to false to use procedural rendering
    }

    /**
     * Reset fighter to base stats for a new run
     */
    reset() {
        this.maxHp = 100;
        this.hp = 100;
        this.baseAttack = 10;
        this.attackBonus = 0;
        this.attackSpeed = 1.0;
        this.armor = 0;
        this.critChance = 0.05;
        this.lifesteal = 0;
        this.thorns = 0;
        this.regen = 0;
        this.execute = 0;
        this.bleed = 0;
        this.stunChance = 0;
        this.attackTimer = 0;
        this.isAlive = true;
        this.bleedEffect = null;
        this.stunTicks = 0;
        this.animState = 'idle';
        this.animTimer = 0;
        this.flashTimer = 0;
        this.alpha = 1;
        this.upgrades = [];

        // Reset mocap animation to idle
        if (this.useMocap) {
            this.animController.setState('idle');
        }
    }

    /**
     * Reset fighter HP for a new combat round (keep upgrades/stats)
     */
    resetForCombat() {
        this.hp = this.maxHp;
        this.attackTimer = 0;
        this.isAlive = true;
        this.bleedEffect = null;
        this.stunTicks = 0;
        this.animState = 'idle';
        this.animTimer = 0;
        this.flashTimer = 0;
        this.alpha = 1;
        this.healTimer = 0;

        // Reset mocap animation to idle
        if (this.useMocap) {
            this.animController.setState('idle');
        }
    }

    /**
     * Update fighter state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        // Update mocap animation controller
        if (this.useMocap) {
            this.animController.update(dt);
        }

        // Update animation timer (for procedural fallback and combat timing)
        if (this.animTimer > 0) {
            this.animTimer -= dt;
            if (this.animTimer <= 0) {
                this.animTimer = 0;
                if (this.animState !== 'death') {
                    this.animState = 'idle';
                }
            }
        }

        // Update flash timer (for damage flash)
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
        }

        // Update heal animation timer
        if (this.healTimer > 0) {
            this.healTimer -= dt;
            if (this.healTimer <= 0) {
                this.healTimer = 0;
                this.hp = this.maxHp; // Ensure HP is actually full when animation ends
            }
        }
    }

    /**
     * Play an animation
     * @param {string} state - Animation state to play
     * @param {number} duration - Duration in seconds
     * @returns {boolean} - True if a new animation started, false if skipped
     */
    playAnim(state, duration = 0.2) {
        // Update procedural animation state (for fallback and timing)
        this.animState = state;
        this.animTimer = duration;
        this.animDuration = duration;

        // Trigger mocap animation
        if (this.useMocap) {
            return this.animController.setState(state, {
                attackSpeed: state === 'attack' ? this.attackSpeed : 1
            });
        }
        return true;
    }

    /**
     * Take damage and return actual damage dealt
     * @param {number} damage - Raw damage amount
     * @returns {object} - { damage: actual damage, blocked: armor reduction }
     */
    takeDamage(damage) {
        const blocked = Math.min(damage - 1, this.armor);
        const actualDamage = Math.max(1, damage - this.armor);

        this.hp -= actualDamage;
        this.flashTimer = 0.1;

        if (this.hp <= 0) {
            this.hp = 0;
            this.isAlive = false;
            this.playAnim('death', 1.5);
        }

        return { damage: Math.round(actualDamage), blocked: Math.round(blocked) };
    }

    /**
     * Heal the fighter
     * @param {number} amount - Amount to heal
     * @returns {number} - Actual amount healed
     */
    heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - before;
    }

    /**
     * Start the healing animation (used on upgrade screen)
     * @param {number} duration - Duration of animation in seconds
     */
    startHealAnimation(duration = 1.0) {
        this.healStartHp = this.hp;
        this.healTimer = duration;
        this.healDuration = duration;
    }

    /**
     * Get the HP value to display (animated during healing, actual otherwise)
     * @returns {number} - Display HP value
     */
    getDisplayHp() {
        if (this.healTimer > 0) {
            const progress = 1 - (this.healTimer / this.healDuration);
            return Math.floor(this.healStartHp + (this.maxHp - this.healStartHp) * progress);
        }
        return Math.round(this.hp);
    }

    /**
     * Render the fighter
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} color - Base color
     */
    render(ctx, color) {
        // Try mocap rendering first
        if (this.useMocap) {
            const pose = this.animController.getCurrentPose();
            const animation = this.animController.getCurrentAnimation();

            if (pose && animation) {
                this.renderMocap(ctx, color, pose, animation);
                this.renderHPBar(ctx, color);
                return;
            }
        }

        // Fallback to procedural rendering
        this.renderProcedural(ctx, color);
    }

    /**
     * Render the fighter using mocap animation data
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} color - Base color
     * @param {object} pose - Current pose from animation
     * @param {MocapAnimation} animation - Animation data
     */
    renderMocap(ctx, color, pose, animation) {
        const tiers = this.getVisualTiers();

        // HP tier affects scale (1.0 to 1.3), plus any combat scale modifier
        const hpScale = 1.0 + (tiers.hp * 0.1);
        const scale = StickFigureRenderer.DEFAULT_SCALE * hpScale * this.scale;

        // Calculate alpha for death fade
        let alpha = 1;
        if (this.animState === 'death') {
            const progress = 1 - (this.animTimer / this.animDuration);
            alpha = 1 - progress;
        }

        // Flash color for damage
        let flashColor = null;
        if (this.flashTimer > 0) {
            flashColor = '#ffffff';
        }

        StickFigureRenderer.render(ctx, pose, animation, this.x, this.y, scale, {
            color: color,
            mirror: this.facing === 1,
            evolution: tiers,
            velocities: this.animController.getVelocities(),
            alpha: alpha,
            flashColor: flashColor
        });
    }

    /**
     * Render the fighter using procedural animations (fallback)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} color - Base color
     */
    renderProcedural(ctx, color) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Get visual tiers for evolution effects
        const tiers = this.getVisualTiers();

        // HP tier affects scale (1.0 to 1.3), plus any combat scale modifier
        const hpScale = 1.0 + (tiers.hp * 0.1);
        const totalScale = hpScale * this.scale;
        ctx.scale(this.facing * totalScale, totalScale);

        // Apply damage flash
        let drawColor = color;
        if (this.flashTimer > 0) {
            drawColor = '#ffffff';
        }

        // Apply death fade
        if (this.animState === 'death') {
            const progress = 1 - (this.animTimer / this.animDuration);
            ctx.globalAlpha = 1 - progress;
        }

        // Calculate animation offsets
        let armAngle = 0;
        let bodyOffset = 0;

        if (this.animState === 'idle') {
            // Subtle idle breathing animation
            const breathe = Math.sin(Date.now() * 0.003) * 2;
            bodyOffset = breathe;
        } else if (this.animState === 'attack') {
            // Attack animation - arm swings forward
            const progress = 1 - (this.animTimer / this.animDuration);
            if (progress < 0.5) {
                armAngle = -Math.PI * 0.3 * (progress * 2);
            } else {
                armAngle = -Math.PI * 0.3 + Math.PI * 0.8 * ((progress - 0.5) * 2);
            }
            bodyOffset = Math.sin(progress * Math.PI) * 5;
        } else if (this.animState === 'hit') {
            const progress = 1 - (this.animTimer / this.animDuration);
            bodyOffset = -Math.sin(progress * Math.PI) * 8;
        }

        ctx.strokeStyle = drawColor;
        ctx.fillStyle = drawColor;
        ctx.lineWidth = this.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const headY = -this.bodyLength - this.headRadius + bodyOffset;
        const neckY = -this.bodyLength + bodyOffset;
        const hipY = 0 + bodyOffset;
        const shoulderY = neckY + 5;

        // === SPEED TIER: Motion lines behind figure ===
        if (tiers.speed > 0) {
            ctx.save();
            ctx.strokeStyle = drawColor;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 1;
            for (let i = 1; i <= tiers.speed; i++) {
                const offsetX = -8 * i;
                ctx.beginPath();
                ctx.moveTo(offsetX, neckY);
                ctx.lineTo(offsetX, hipY);
                ctx.stroke();
            }
            ctx.restore();
        }

        // === REGEN TIER: Green tint/vines ===
        if (tiers.regen > 0) {
            ctx.save();
            ctx.strokeStyle = '#27ae60';
            ctx.globalAlpha = 0.4 + (tiers.regen * 0.15);
            ctx.lineWidth = 1;
            // Vines along body
            if (tiers.regen >= 2) {
                ctx.beginPath();
                ctx.moveTo(-3, neckY + 5);
                ctx.quadraticCurveTo(-6, (neckY + hipY) / 2, -2, hipY - 5);
                ctx.stroke();
            }
            if (tiers.regen >= 3) {
                // Leaf crown
                ctx.beginPath();
                ctx.moveTo(-6, headY - 5);
                ctx.lineTo(0, headY - 12);
                ctx.lineTo(6, headY - 5);
                ctx.stroke();
            }
            ctx.restore();
        }

        // === LIFESTEAL TIER: Red tint, fangs ===
        if (tiers.lifesteal > 0) {
            // Red glow around figure
            ctx.save();
            ctx.strokeStyle = '#c0392b';
            ctx.globalAlpha = 0.2 + (tiers.lifesteal * 0.1);
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, headY, this.headRadius + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // === MAIN FIGURE ===

        // Head (circle)
        ctx.beginPath();
        ctx.arc(0, headY, this.headRadius, 0, Math.PI * 2);
        ctx.stroke();

        // === CRIT TIER: Targeting eye ===
        if (tiers.crit > 0) {
            ctx.save();
            ctx.strokeStyle = '#ffff00';
            ctx.fillStyle = '#ffff00';
            ctx.lineWidth = 1;
            // Eye dot
            ctx.beginPath();
            ctx.arc(4, headY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            if (tiers.crit >= 2) {
                // Crosshair around eye
                ctx.beginPath();
                ctx.moveTo(4, headY - 6);
                ctx.lineTo(4, headY + 2);
                ctx.moveTo(0, headY - 2);
                ctx.lineTo(8, headY - 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // === EXECUTE TIER: Hood/reaper ===
        if (tiers.execute > 0) {
            ctx.save();
            ctx.strokeStyle = '#8e44ad';
            ctx.lineWidth = 2;
            // Hood
            ctx.beginPath();
            ctx.arc(0, headY - 2, this.headRadius + 4, Math.PI * 0.8, Math.PI * 2.2);
            ctx.stroke();
            if (tiers.execute >= 3) {
                // Point on hood
                ctx.beginPath();
                ctx.moveTo(0, headY - this.headRadius - 4);
                ctx.lineTo(0, headY - this.headRadius - 10);
                ctx.stroke();
            }
            ctx.restore();
        }

        // === LIFESTEAL TIER: Fangs ===
        if (tiers.lifesteal >= 2) {
            ctx.save();
            ctx.strokeStyle = '#ecf0f1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-3, headY + this.headRadius - 2);
            ctx.lineTo(-3, headY + this.headRadius + 4);
            ctx.moveTo(3, headY + this.headRadius - 2);
            ctx.lineTo(3, headY + this.headRadius + 4);
            ctx.stroke();
            ctx.restore();
        }

        // === ARMOR TIER: Helmet ===
        if (tiers.armor >= 2) {
            ctx.save();
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 2;
            // Helmet visor
            ctx.beginPath();
            ctx.moveTo(-this.headRadius, headY);
            ctx.lineTo(this.headRadius, headY);
            ctx.stroke();
            if (tiers.armor >= 3) {
                // Helmet crest
                ctx.beginPath();
                ctx.moveTo(0, headY - this.headRadius);
                ctx.lineTo(0, headY - this.headRadius - 8);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Body (line from neck to hip)
        ctx.beginPath();
        ctx.moveTo(0, neckY);
        ctx.lineTo(0, hipY);
        ctx.stroke();

        // === ARMOR TIER: Breastplate ===
        if (tiers.armor >= 1) {
            ctx.save();
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 2;
            const chestY = neckY + 8;
            // Chest plate
            ctx.beginPath();
            ctx.moveTo(-8, chestY);
            ctx.lineTo(8, chestY);
            ctx.lineTo(6, chestY + 12);
            ctx.lineTo(-6, chestY + 12);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // === THORNS TIER: Shoulder spikes ===
        if (tiers.thorns > 0) {
            ctx.save();
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 2;
            const spikeLen = 4 + (tiers.thorns * 3);
            const shoulderX = 10; // Position on actual shoulders
            // Left shoulder spike (angled outward)
            ctx.beginPath();
            ctx.moveTo(-shoulderX, shoulderY);
            ctx.lineTo(-shoulderX - spikeLen, shoulderY - spikeLen * 0.5);
            ctx.stroke();
            // Right shoulder spike (angled outward)
            ctx.beginPath();
            ctx.moveTo(shoulderX, shoulderY);
            ctx.lineTo(shoulderX + spikeLen, shoulderY - spikeLen * 0.5);
            ctx.stroke();
            if (tiers.thorns >= 3) {
                // Extra spikes below main ones
                ctx.beginPath();
                ctx.moveTo(-shoulderX + 2, shoulderY + 5);
                ctx.lineTo(-shoulderX - spikeLen * 0.7, shoulderY + 2);
                ctx.moveTo(shoulderX - 2, shoulderY + 5);
                ctx.lineTo(shoulderX + spikeLen * 0.7, shoulderY + 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Arms
        // Back arm
        ctx.beginPath();
        ctx.moveTo(0, shoulderY);
        ctx.lineTo(-this.armLength * 0.7, shoulderY + this.armLength * 0.5);
        ctx.stroke();

        // Front arm (with attack animation)
        ctx.save();
        ctx.translate(0, shoulderY);
        ctx.rotate(armAngle);

        // === EXECUTE TIER: Scythe arm ===
        if (tiers.execute >= 2) {
            ctx.strokeStyle = '#8e44ad';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.armLength, this.armLength * 0.3);
            ctx.lineTo(this.armLength + 10, this.armLength * 0.3 - 8);
            ctx.quadraticCurveTo(this.armLength + 15, this.armLength * 0.3, this.armLength + 8, this.armLength * 0.3 + 5);
            ctx.stroke();
        }

        // Main arm
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.armLength, this.armLength * 0.3);
        ctx.stroke();

        // === ATTACK TIER: Gauntlets ===
        if (tiers.attack > 0) {
            ctx.save();
            ctx.fillStyle = tiers.attack >= 2 ? '#f39c12' : '#95a5a6';
            const fistSize = 4 + tiers.attack;
            ctx.beginPath();
            ctx.arc(this.armLength, this.armLength * 0.3, fistSize, 0, Math.PI * 2);
            ctx.fill();
            if (tiers.attack >= 3) {
                // Spikes on gauntlet
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.armLength + fistSize, this.armLength * 0.3);
                ctx.lineTo(this.armLength + fistSize + 5, this.armLength * 0.3);
                ctx.stroke();
            }
            ctx.restore();
        }

        // === BLEED TIER: Claws ===
        if (tiers.bleed > 0) {
            ctx.save();
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 2;
            const clawLen = 3 + (tiers.bleed * 2);
            ctx.beginPath();
            ctx.moveTo(this.armLength + 3, this.armLength * 0.3 - 2);
            ctx.lineTo(this.armLength + 3 + clawLen, this.armLength * 0.3 - 2 - clawLen);
            ctx.moveTo(this.armLength + 3, this.armLength * 0.3 + 2);
            ctx.lineTo(this.armLength + 3 + clawLen, this.armLength * 0.3 + 2);
            ctx.stroke();
            if (tiers.bleed >= 2) {
                ctx.beginPath();
                ctx.moveTo(this.armLength + 3, this.armLength * 0.3 + 5);
                ctx.lineTo(this.armLength + 3 + clawLen, this.armLength * 0.3 + 5 + clawLen * 0.5);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.restore(); // End arm rotation

        // === STUN TIER: Impact rings/hammer fists ===
        if (tiers.stun > 0) {
            ctx.save();
            ctx.strokeStyle = '#00bfff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            // Impact ring around fist area (estimate position)
            const fistX = Math.cos(armAngle) * this.armLength;
            const fistY = shoulderY + Math.sin(armAngle) * this.armLength + this.armLength * 0.3;
            for (let i = 1; i <= tiers.stun; i++) {
                ctx.beginPath();
                ctx.arc(fistX, fistY, 6 + i * 4, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Legs
        const legSpread = 8;
        const legBend = Math.sin(Date.now() * 0.002) * 2;

        // Left leg
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(-legSpread + legBend, hipY + this.legLength);
        ctx.stroke();

        // Right leg
        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(legSpread - legBend, hipY + this.legLength);
        ctx.stroke();

        // === SPEED TIER: Winged ankles ===
        if (tiers.speed >= 2) {
            ctx.save();
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 1;
            const ankleY = hipY + this.legLength - 5;
            // Left wing
            ctx.beginPath();
            ctx.moveTo(-legSpread - 3, ankleY);
            ctx.lineTo(-legSpread - 8, ankleY - 5);
            ctx.lineTo(-legSpread - 3, ankleY - 3);
            ctx.stroke();
            // Right wing
            ctx.beginPath();
            ctx.moveTo(legSpread + 3, ankleY);
            ctx.lineTo(legSpread + 8, ankleY - 5);
            ctx.lineTo(legSpread + 3, ankleY - 3);
            ctx.stroke();
            ctx.restore();
        }

        // === LIFESTEAL TIER 3: Bat wings ===
        if (tiers.lifesteal >= 3) {
            ctx.save();
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            // Left wing
            ctx.beginPath();
            ctx.moveTo(-5, shoulderY);
            ctx.quadraticCurveTo(-20, shoulderY - 15, -25, shoulderY + 5);
            ctx.quadraticCurveTo(-15, shoulderY + 5, -5, shoulderY + 10);
            ctx.stroke();
            // Right wing
            ctx.beginPath();
            ctx.moveTo(5, shoulderY);
            ctx.quadraticCurveTo(20, shoulderY - 15, 25, shoulderY + 5);
            ctx.quadraticCurveTo(15, shoulderY + 5, 5, shoulderY + 10);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();

        // Render HP bar above fighter
        this.renderHPBar(ctx, color);
    }

    /**
     * Render HP bar above the fighter
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} color - Fighter color for accent
     */
    renderHPBar(ctx, color) {
        if (!this.showHPBar) return;

        const barWidth = 60;
        const barHeight = 12;
        // Account for scale when positioning HP bar above fighter
        const barY = this.y - (this.bodyLength + this.headRadius * 2 + 25) * this.scale;
        const barX = this.x - barWidth / 2;

        // Background
        ctx.fillStyle = Game.colors.healthBg;
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health fill
        const displayHp = this.getDisplayHp();
        const hpPercent = displayHp / this.maxHp;
        const healthColor = hpPercent > 0.5 ? Game.colors.health :
                           hpPercent > 0.25 ? '#f1c40f' : Game.colors.damage;

        // Flash effect
        if (this.flashTimer > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = healthColor;
        }
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // HP text (inside bar)
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getDisplayHp() + '/' + this.maxHp, this.x, barY + barHeight / 2);
    }

    /**
     * Get the world position of the contact joint for the current attack animation
     * Used for precise positioning of thorns damage numbers
     * @param {string} jointOverride - Optional joint name to use instead of animation config
     * @returns {Array|null} - [x, y] world position or null if unavailable
     */
    getContactJointPosition(jointOverride = null) {
        if (!this.useMocap) return null;

        // Determine which joint to use
        let contactJoint = jointOverride;
        if (!contactJoint) {
            const animName = this.animController.currentAnimName;
            const animConfig = ANIMATIONS[animName];
            if (!animConfig || !animConfig.contactJoint) return null;
            contactJoint = animConfig.contactJoint;
        }

        const pose = this.animController.getCurrentPose();
        if (!pose || !pose[contactJoint]) return null;

        // Calculate scale (same as in render)
        const tiers = this.getVisualTiers();
        const hpScale = 1.0 + (tiers.hp * 0.1);
        const scale = StickFigureRenderer.DEFAULT_SCALE * hpScale * this.scale;

        // Mirror matches facing direction
        const mirror = this.facing === 1;

        return StickFigureRenderer.getJointWorldPosition(
            pose,
            contactJoint,
            this.x,
            this.y,
            scale,
            mirror
        );
    }

    /**
     * Get stat summary for UI display
     * @returns {object} - Stats object
     */
    getStats() {
        return {
            hp: this.hp,
            maxHp: this.maxHp,
            attack: this.attack,
            attackSpeed: this.attackSpeed,
            armor: this.armor,
            critChance: this.critChance,
            lifesteal: this.lifesteal,
            thorns: this.thorns,
            regen: this.regen,
            execute: this.execute,
            bleed: this.bleed,
            stunChance: this.stunChance
        };
    }

    /**
     * Calculate visual tier (0-3) based on stat accumulation
     * @param {number} value - Current stat value above base
     * @param {Array} thresholds - [tier1, tier2, tier3] thresholds
     * @returns {number} - Tier 0-3
     */
    calcTier(value, thresholds) {
        if (value >= thresholds[2]) return 3;
        if (value >= thresholds[1]) return 2;
        if (value >= thresholds[0]) return 1;
        return 0;
    }

    /**
     * Get visual tiers for all stats (used for rendering visual evolution)
     * @returns {object} - { attack, speed, armor, hp, crit, lifesteal, thorns, regen, bleed, stun, execute }
     */
    getVisualTiers() {
        // Base stats for comparison
        const baseHp = 100;
        const baseSpeed = 1.0;

        return {
            // Core stats
            hp: this.calcTier(this.maxHp - baseHp, [25, 50, 80]),
            attack: this.calcTier(this.attackBonus, [0.5, 1.0, 1.5]),  // 50%, 100%, 150% bonus
            speed: this.calcTier(this.attackSpeed - baseSpeed, [0.3, 0.6, 1.0]),
            armor: this.calcTier(this.armor, [4, 8, 14]),
            crit: this.calcTier(this.critChance - 0.05, [0.1, 0.2, 0.35]),
            // Special stats
            lifesteal: this.calcTier(this.lifesteal, [0.2, 0.4, 0.6]),
            thorns: this.calcTier(this.thorns, [5, 10, 16]),
            regen: this.calcTier(this.regen, [4, 8, 13]),
            bleed: this.calcTier(this.bleed, [6, 12, 19]),
            stun: this.calcTier(this.stunChance, [0.1, 0.18, 0.25]),
            execute: this.calcTier(this.execute, [0.25, 0.5, 0.8])
        };
    }
}
