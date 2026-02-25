/**
 * Combat System - Auto-battle mechanics
 * Handles attack timing, damage calculation, and combat resolution
 *
 * All game logic is tick-based for simulation compatibility.
 * Only TICK_INTERVAL links ticks to real time.
 */

const Combat = {
    // Combat state
    isActive: false,
    isPaused: false,
    combatTime: 0,          // Real time elapsed (for display)
    tickCount: 0,           // Ticks elapsed (for game logic)
    tickAccumulator: 0,     // Real time accumulated toward next tick

    // Tick timing - only link to real time
    TICK_INTERVAL: 0.5,     // Seconds per tick (2 ticks per second)

    // Game balance constants (in ticks)
    TICKS_PER_BASE_ATTACK: 2,   // Base attackSpeed 1.0 = 1 attack per 2 ticks
    STUN_DURATION: 2,           // Stun lasts 2 ticks
    BLEED_DURATION: 6,          // Bleed lasts 6 ticks

    // Damage numbers for visual feedback
    damageNumbers: [],

    // Hit effects for visual impact
    hitEffects: [],

    // Pending hit effects waiting for animation contact frame
    pendingHitEffects: [],

    // Pending damage waiting for animation contact frame
    pendingDamage: [],

    // Combat log for debugging
    log: [],

    // Track killing blow info
    killingBlow: null,

    /**
     * Start a new combat encounter
     * @param {Fighter} player - Player fighter
     * @param {Fighter} enemy - Enemy fighter
     */
    start(player, enemy) {
        this.isActive = true;
        this.isPaused = false;
        this.combatTime = 0;
        this.tickCount = 0;
        this.tickAccumulator = 0;
        this.damageNumbers = [];
        this.hitEffects = [];
        this.pendingHitEffects = [];
        this.pendingDamage = [];
        this.log = [];
        this.killingBlow = null;

        // Reset attack timers and stun
        player.attackTimer = 0;
        enemy.attackTimer = 0;
        player.stunTicks = 0;
        enemy.stunTicks = 0;

        this.logEvent('Combat started');
    },

    /**
     * Update combat state (real-time wrapper for tick processing)
     * @param {number} dt - Delta time in seconds
     * @param {Fighter} player - Player fighter
     * @param {Fighter} enemy - Enemy fighter
     * @returns {string|null} - 'win', 'lose', or null if combat continues
     */
    update(dt, player, enemy) {
        if (!this.isActive || this.isPaused) return null;

        this.combatTime += dt;

        // Update visual elements (real time for smooth animation)
        this.updateDamageNumbers(dt);
        this.updateHitEffects(dt);
        this.updatePendingHitEffects(dt);
        this.updatePendingDamage(dt);

        // Check if combat is over (return immediately when someone dies)
        if (!player.isAlive) {
            this.isActive = false;
            this.logEvent('Player defeated');
            return 'lose';
        }
        if (!enemy.isAlive) {
            this.isActive = false;
            this.logEvent('Enemy defeated');
            return 'win';
        }

        // Accumulate real time and process ticks
        this.tickAccumulator += dt;
        while (this.tickAccumulator >= this.TICK_INTERVAL) {
            this.tickAccumulator -= this.TICK_INTERVAL;
            const result = this.processTick(player, enemy);
            if (result) return result;
        }

        return null;
    },

    /**
     * Process a single game tick (all game logic)
     * @param {Fighter} player - Player fighter
     * @param {Fighter} enemy - Enemy fighter
     * @returns {string|null} - 'win', 'lose', or null if combat continues
     */
    processTick(player, enemy) {
        this.tickCount++;

        // Don't process if either fighter is dead
        if (!player.isAlive || !enemy.isAlive) {
            return null;
        }

        // Process periodic effects (regen, bleed)
        this.processPeriodicEffects(player, enemy);

        // Update stun (in ticks)
        if (player.stunTicks > 0) player.stunTicks--;
        if (enemy.stunTicks > 0) enemy.stunTicks--;

        // Process attacks
        this.processAttacks(player, enemy);

        return null;
    },

    /**
     * Simulate multiple ticks without real time (for AI/testing)
     * @param {number} count - Number of ticks to simulate
     * @param {Fighter} player - Player fighter
     * @param {Fighter} enemy - Enemy fighter
     * @returns {string|null} - 'win', 'lose', or null if combat continues
     */
    simulateTicks(count, player, enemy) {
        for (let i = 0; i < count; i++) {
            const result = this.processTick(player, enemy);
            if (result) return result;
        }
        return null;
    },

    /**
     * Process attack timers and execute attacks (tick-based)
     * @param {Fighter} player - Player fighter
     * @param {Fighter} enemy - Enemy fighter
     */
    processAttacks(player, enemy) {
        // Accumulate attack timers based on attack speed (paused if stunned)
        if (player.stunTicks <= 0) {
            player.attackTimer += player.attackSpeed;
        }
        if (enemy.stunTicks <= 0) {
            enemy.attackTimer += enemy.attackSpeed;
        }

        // Player attacks when timer reaches threshold (not while stunned)
        while (player.attackTimer >= this.TICKS_PER_BASE_ATTACK && enemy.isAlive && player.stunTicks <= 0) {
            player.attackTimer -= this.TICKS_PER_BASE_ATTACK;
            this.executeAttack(player, enemy);
        }

        // Enemy attacks when timer reaches threshold (not while stunned)
        while (enemy.attackTimer >= this.TICKS_PER_BASE_ATTACK && player.isAlive && enemy.stunTicks <= 0) {
            enemy.attackTimer -= this.TICKS_PER_BASE_ATTACK;
            this.executeAttack(enemy, player);
        }
    },

    /**
     * Process periodic effects (regen, bleed) - called once per tick
     * @param {Fighter} player - Player fighter
     * @param {Fighter} enemy - Enemy fighter
     */
    processPeriodicEffects(player, enemy) {
        // Process for both fighters
        const fighters = [player, enemy];
        for (const fighter of fighters) {
            if (!fighter.isAlive) continue;

            // Regen: heal every tick if below maxHp
            if (fighter.regen > 0 && fighter.hp < fighter.maxHp) {
                const healAmount = fighter.regen;
                const healed = fighter.heal(healAmount);
                if (healed > 0) {
                    this.spawnDamageNumber(
                        fighter.x,
                        fighter.y - 60,
                        healed,
                        'regen'
                    );
                }
            }

            // Bleed: deal damage from single bleed effect, decrement tick counter
            if (fighter.bleedEffect) {
                const bleedDamage = fighter.bleedEffect.damage;
                fighter.bleedEffect.ticksRemaining--;

                // Remove expired bleed
                if (fighter.bleedEffect.ticksRemaining <= 0) {
                    fighter.bleedEffect = null;
                }

                if (bleedDamage > 0) {
                    // Bleed ignores armor (direct HP damage)
                    fighter.hp -= bleedDamage;
                    if (fighter.hp <= 0) {
                        fighter.hp = 0;
                        fighter.isAlive = false;
                        fighter.playAnim('death', 1.5);
                        this.killingBlow = {
                            type: 'bleed',
                            victimIsPlayer: fighter.isPlayer
                        };
                    }
                    this.spawnDamageNumber(
                        fighter.x,
                        fighter.y - 60,
                        bleedDamage,
                        'bleed'
                    );
                }
            }
        }
    },

    /**
     * Execute a single attack - starts animation and schedules damage at contact frame
     * @param {Fighter} attacker - The attacking fighter
     * @param {Fighter} defender - The defending fighter
     */
    executeAttack(attacker, defender) {
        // Play attack animation first (returns true if new animation started)
        const animStarted = attacker.playAnim('attack', 0.3);

        // Pre-roll crit and calculate damage info (needs to be consistent between schedule and apply)
        const isCrit = Math.random() < attacker.critChance;
        const isExecute = defender.hp <= defender.maxHp * 0.5 && attacker.execute > 0;

        if (animStarted) {
            // Schedule damage to apply when animation reaches contact frame
            this.scheduleDamage(attacker, defender, isCrit, isExecute);
        } else {
            // Animation didn't start (one already playing) - apply damage immediately
            // This keeps DPS consistent with attack speed upgrades
            this.applyDamage(attacker, defender, isCrit, isExecute, false);
        }
    },

    /**
     * Schedule damage to apply when animation reaches contact frame
     * @param {Fighter} attacker - The attacking fighter
     * @param {Fighter} defender - The defending fighter
     * @param {boolean} isCrit - Whether this is a critical hit
     * @param {boolean} isExecute - Whether this triggers execute bonus
     */
    scheduleDamage(attacker, defender, isCrit, isExecute) {
        const animName = attacker.animController.currentAnimName;
        const animConfig = ANIMATIONS[animName];
        const animation = attacker.animController.currentAnim;

        if (!animConfig || !animation) {
            // Fallback: apply damage immediately
            this.applyDamage(attacker, defender, isCrit, isExecute, true);
            return;
        }

        // Calculate delay until contact frame (same as hit effect timing)
        const contactFrame = animConfig.contactFrame || 0.5;
        const animSpeed = animation.speed || 1.0;
        const attackSpeed = attacker.attackSpeed || 1.0;
        const duration = animation.duration || 1.0;
        const delay = (duration * contactFrame) / (animSpeed * attackSpeed);

        this.pendingDamage.push({
            attacker: attacker,
            defender: defender,
            isCrit: isCrit,
            isExecute: isExecute,
            delay: delay,
            contactJoint: animConfig.contactJoint || null
        });
    },

    /**
     * Update pending damage timers and apply when ready
     * @param {number} dt - Delta time in seconds
     */
    updatePendingDamage(dt) {
        for (let i = this.pendingDamage.length - 1; i >= 0; i--) {
            const pending = this.pendingDamage[i];
            pending.delay -= dt;

            if (pending.delay <= 0) {
                // Time to apply damage!
                this.applyDamage(
                    pending.attacker,
                    pending.defender,
                    pending.isCrit,
                    pending.isExecute,
                    true,  // spawn hit effect
                    pending.contactJoint
                );
                this.pendingDamage.splice(i, 1);
            }
        }
    },

    /**
     * Apply damage and all associated effects
     * @param {Fighter} attacker - The attacking fighter
     * @param {Fighter} defender - The defending fighter
     * @param {boolean} isCrit - Whether this is a critical hit
     * @param {boolean} isExecute - Whether this triggers execute bonus
     * @param {boolean} spawnHitEffect - Whether to spawn visual hit effect
     * @param {string} contactJoint - Joint name for hit effect positioning
     */
    applyDamage(attacker, defender, isCrit, isExecute, spawnHitEffect, contactJoint = null) {
        // Don't apply damage if defender already dead
        if (!defender.isAlive) return;

        const critMult = isCrit ? 2 : 1;
        const baseDamage = attacker.attack * critMult;

        let result;
        if (isExecute) {
            const executeBonus = Math.floor(baseDamage * attacker.execute);
            const armoredDamage = Math.max(1, baseDamage - defender.armor);
            const totalDamage = armoredDamage + executeBonus;
            const blocked = Math.min(baseDamage - 1, defender.armor);

            defender.hp -= totalDamage;
            defender.flashTimer = 0.1;
            if (defender.hp <= 0) {
                defender.hp = 0;
                defender.isAlive = false;
                defender.playAnim('death', 1.5);
                this.killingBlow = {
                    type: 'execute',
                    victimIsPlayer: defender.isPlayer,
                    isCrit: isCrit
                };
            }
            result = { damage: Math.round(totalDamage), blocked: Math.round(blocked) };
        } else {
            result = defender.takeDamage(baseDamage);
            if (!defender.isAlive) {
                this.killingBlow = {
                    type: isCrit ? 'crit' : 'normal',
                    victimIsPlayer: defender.isPlayer,
                    isCrit: isCrit
                };
            }
        }

        // Spawn hit effect at contact point
        if (spawnHitEffect) {
            const contactPos = attacker.getContactJointPosition(contactJoint);
            const hitX = contactPos ? contactPos[0] : defender.x;
            const hitY = contactPos ? contactPos[1] : defender.y - 30;
            this.spawnHitEffect(hitX, hitY, isCrit || isExecute ? 'big' : 'normal');
        }

        // Determine damage number type
        let damageType = 'normal';
        if (isExecute) {
            damageType = 'execute';
        } else if (isCrit) {
            damageType = 'crit';
        }

        // Create damage number
        this.spawnDamageNumber(
            defender.x,
            defender.y - 60,
            result.damage,
            damageType
        );

        // Apply lifesteal
        if (attacker.lifesteal > 0 && result.damage > 0) {
            const healAmount = Math.max(1, Math.round(result.damage * attacker.lifesteal));
            const healed = attacker.heal(healAmount);
            if (healed > 0) {
                this.spawnDamageNumber(
                    defender.x,
                    defender.y - 60,
                    healed,
                    'heal',
                    { targetX: attacker.x, targetY: attacker.y }
                );
            }
        }

        // Apply Thorns reflection
        if (defender.thorns > 0 && defender.isAlive) {
            const thornsDamage = defender.thorns;
            if (thornsDamage > 0) {
                const thornsResult = attacker.takeDamage(thornsDamage);
                const contactPos = attacker.getContactJointPosition(contactJoint);
                this.spawnDamageNumber(
                    attacker.x,
                    attacker.y - 60,
                    thornsResult.damage,
                    'thorns',
                    contactPos ? { contactX: contactPos[0], contactY: contactPos[1] } : {}
                );
                this.logEvent(`Thorns reflects ${thornsResult.damage} damage`);
                if (!attacker.isAlive) {
                    this.killingBlow = {
                        type: 'thorns',
                        victimIsPlayer: attacker.isPlayer
                    };
                }
            }
        }

        // Apply Bleed
        if (attacker.bleed > 0 && defender.isAlive) {
            const isNew = !defender.bleedEffect;
            const bleedDamage = Math.max(1, Math.floor(attacker.bleed * defender.maxHp));
            defender.bleedEffect = {
                damage: bleedDamage,
                ticksRemaining: this.BLEED_DURATION
            };
            this.logEvent(isNew ? 'Applied bleed' : 'Refreshed bleed');
        }

        // Roll Stun chance
        if (attacker.stunChance > 0 && defender.isAlive) {
            if (Math.random() < attacker.stunChance) {
                defender.stunTicks = this.STUN_DURATION;
                this.spawnDamageNumber(
                    defender.x,
                    defender.y - 40,
                    'STUNNED',
                    'stun'
                );
                this.logEvent('Stun applied!');
            }
        }

        // Log the attack
        const attackerName = attacker.isPlayer ? 'Player' : 'Enemy';
        const defenderName = defender.isPlayer ? 'Player' : 'Enemy';
        this.logEvent(
            `${attackerName} attacks ${defenderName} for ${result.damage}` +
            (isCrit ? ' (CRIT!)' : '') +
            (isExecute ? ' (EXECUTE!)' : '') +
            (result.blocked > 0 ? ` (${result.blocked} blocked)` : '')
        );
    },

    /**
     * Spawn a floating damage number
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} value - Damage/heal value
     * @param {string} type - 'normal', 'crit', 'heal', 'bleed', 'thorns', 'execute', etc.
     * @param {object} opts - Optional: {targetX, targetY} for lifesteal flying effect
     */
    spawnDamageNumber(x, y, value, type, opts = {}) {
        // Round numeric values to avoid displaying decimals
        const displayValue = typeof value === 'number' ? Math.round(value) : value;
        const num = {
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            startX: x,
            startY: y,
            value: displayValue,
            type: type,
            timer: 1.0,
            maxTimer: 1.0,
            vy: -60,
            vx: 0
        };

        // Bleed: squirt like blood with random trajectory
        if (type === 'bleed') {
            num.vx = (Math.random() - 0.5) * 120; // Random horizontal velocity
            num.vy = -80 - Math.random() * 40;    // Upward burst
            num.timer = 0.8;
            num.maxTimer = 0.8;
        }

        // Lifesteal: fly from victim to healer
        if (type === 'heal' && opts.targetX !== undefined) {
            num.targetX = opts.targetX;
            num.targetY = opts.targetY - 60; // Above target's head
            num.isFlying = true;
            num.timer = 0.5;
            num.maxTimer = 0.5;
        }

        // Thorns: start at contact point if provided
        if (type === 'thorns' && opts.contactX !== undefined) {
            num.x = opts.contactX;
            num.y = opts.contactY;
        }

        this.damageNumbers.push(num);
    },

    /**
     * Update floating damage numbers
     * @param {number} dt - Delta time
     */
    updateDamageNumbers(dt) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const num = this.damageNumbers[i];
            num.timer -= dt;

            if (num.isFlying && num.targetX !== undefined) {
                // Lifesteal: fly toward target with easing
                const progress = 1 - (num.timer / num.maxTimer);
                const eased = 1 - Math.pow(1 - progress, 2); // Ease out
                num.x = num.startX + (num.targetX - num.startX) * eased;
                num.y = num.startY + (num.targetY - num.startY) * eased;
            } else if (num.type === 'bleed') {
                // Bleed: parabolic squirt trajectory
                num.x += num.vx * dt;
                num.y += num.vy * dt;
                num.vy += 200 * dt; // Gravity
            } else {
                // Normal: float upward and slow
                num.y += num.vy * dt;
                num.vy += 50 * dt;
            }

            if (num.timer <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }
    },

    /**
     * Render damage numbers
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderDamageNumbers(ctx) {
        for (const num of this.damageNumbers) {
            const alpha = Math.min(1, num.timer * 2);
            ctx.globalAlpha = alpha;

            // Color and style based on type
            let color, fontSize, outline = null;
            switch (num.type) {
                case 'crit':
                    color = '#ffff00'; // Yellow for crits
                    fontSize = 24;
                    break;
                case 'heal':
                    color = '#2ecc71'; // Green for heals (lifesteal)
                    fontSize = 18;
                    break;
                case 'thorns':
                    color = '#9b59b6'; // Purple for thorns
                    fontSize = 18;
                    break;
                case 'bleed':
                    color = '#c0392b'; // Dark red for bleed
                    fontSize = 16;
                    break;
                case 'regen':
                    color = '#27ae60'; // Dark green for regen
                    fontSize = 16;
                    break;
                case 'execute':
                    color = '#ffffff'; // White fill for execute
                    outline = '#ff6600'; // Orange outline
                    fontSize = 24;
                    break;
                case 'stun':
                    color = '#00bfff'; // Cyan for stun
                    fontSize = 16;
                    break;
                default:
                    color = '#ffffff'; // White for normal
                    fontSize = 18;
            }

            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (outline) {
                // Execute: draw outline then fill
                ctx.strokeStyle = outline;
                ctx.lineWidth = 3;
                ctx.strokeText(num.value, num.x, num.y);
                ctx.fillStyle = color;
                ctx.fillText(num.value, num.x, num.y);
            } else {
                // Normal: shadow then fill
                ctx.fillStyle = '#000000';
                ctx.fillText(num.value, num.x + 1, num.y + 1);
                ctx.fillStyle = color;
                ctx.fillText(num.value, num.x, num.y);
            }
        }
        ctx.globalAlpha = 1;
    },

    /**
     * Spawn a hit effect at impact point
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} size - 'normal' or 'big' for crits/executes
     */
    spawnHitEffect(x, y, size = 'normal') {
        const isBig = size === 'big';

        // Expanding circle (normal is 25% smaller than before)
        this.hitEffects.push({
            type: 'circle',
            x: x,
            y: y,
            radius: isBig ? 8 : 4,
            maxRadius: isBig ? 45 : 22,
            timer: 0.25,
            maxTimer: 0.25,
            lineWidth: isBig ? 3 : 1.5
        });

        // Radial lines (normal is 25% smaller)
        const lineCount = isBig ? 8 : 4;
        for (let i = 0; i < lineCount; i++) {
            const angle = (Math.PI * 2 * i / lineCount) + (Math.random() - 0.5) * 0.3;
            const speed = (isBig ? 200 : 110) + Math.random() * 40;
            const length = isBig ? 15 : 8;
            this.hitEffects.push({
                type: 'line',
                x: x,
                y: y,
                angle: angle,
                speed: speed,
                length: length,
                distance: 0,
                timer: 0.2,
                maxTimer: 0.2,
                lineWidth: isBig ? 2.5 : 1.2
            });
        }
    },

    /**
     * Schedule a hit effect to spawn when animation reaches contact frame
     * @param {Fighter} attacker - The attacking fighter
     * @param {Fighter} defender - The target fighter
     * @param {string} size - 'normal' or 'big'
     */
    scheduleHitEffect(attacker, defender, size) {
        // Get the animation that was just started
        const animName = attacker.animController.currentAnimName;
        const animConfig = ANIMATIONS[animName];
        const animation = attacker.animController.currentAnim;

        if (!animConfig || !animation) {
            // Fallback: spawn immediately at defender
            this.spawnHitEffect(defender.x, defender.y - 30, size);
            return;
        }

        // Calculate delay until contact frame
        // contactFrame is normalized (0-1), duration is in seconds
        // Account for both animation speed and fighter's attack speed stat
        const contactFrame = animConfig.contactFrame || 0.5;
        const animSpeed = animation.speed || 1.0;
        const attackSpeed = attacker.attackSpeed || 1.0;
        const duration = animation.duration || 1.0;
        const delay = (duration * contactFrame) / (animSpeed * attackSpeed);

        // Store pending effect
        this.pendingHitEffects.push({
            attacker: attacker,
            defender: defender,
            size: size,
            delay: delay,
            contactJoint: animConfig.contactJoint || null
        });
    },

    /**
     * Update pending hit effects and spawn when delay expires
     * @param {number} dt - Delta time
     */
    updatePendingHitEffects(dt) {
        for (let i = this.pendingHitEffects.length - 1; i >= 0; i--) {
            const pending = this.pendingHitEffects[i];
            pending.delay -= dt;

            if (pending.delay <= 0) {
                // Time to spawn the effect!
                // Get contact position from attacker's current pose, using the specific contact joint
                const contactPos = pending.attacker.getContactJointPosition(pending.contactJoint);
                const hitX = contactPos ? contactPos[0] : pending.defender.x;
                const hitY = contactPos ? contactPos[1] : pending.defender.y - 30;

                this.spawnHitEffect(hitX, hitY, pending.size);
                this.pendingHitEffects.splice(i, 1);
            }
        }
    },

    /**
     * Update hit effects
     * @param {number} dt - Delta time
     */
    updateHitEffects(dt) {
        for (let i = this.hitEffects.length - 1; i >= 0; i--) {
            const effect = this.hitEffects[i];
            effect.timer -= dt;

            if (effect.type === 'circle') {
                // Expand circle
                const progress = 1 - (effect.timer / effect.maxTimer);
                effect.radius = effect.radius + (effect.maxRadius - effect.radius) * progress;
            } else if (effect.type === 'line') {
                // Move line outward
                effect.distance += effect.speed * dt;
            }

            if (effect.timer <= 0) {
                this.hitEffects.splice(i, 1);
            }
        }
    },

    /**
     * Render hit effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderHitEffects(ctx) {
        for (const effect of this.hitEffects) {
            const alpha = effect.timer / effect.maxTimer;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = effect.lineWidth;
            ctx.lineCap = 'round';

            if (effect.type === 'circle') {
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (effect.type === 'line') {
                const startDist = effect.distance;
                const endDist = effect.distance + effect.length;
                const startX = effect.x + Math.cos(effect.angle) * startDist;
                const startY = effect.y + Math.sin(effect.angle) * startDist;
                const endX = effect.x + Math.cos(effect.angle) * endDist;
                const endY = effect.y + Math.sin(effect.angle) * endDist;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    },

    /**
     * Log a combat event
     * @param {string} message - Event message
     */
    logEvent(message) {
        const timestamp = this.combatTime.toFixed(2);
        this.log.push(`[${timestamp}s] ${message}`);

        // Keep log size manageable
        if (this.log.length > 100) {
            this.log.shift();
        }
    },

    /**
     * Get combat summary for result screen
     * @returns {object} - Combat statistics
     */
    getSummary() {
        return {
            duration: this.combatTime,
            logEntries: this.log.length
        };
    }
};
