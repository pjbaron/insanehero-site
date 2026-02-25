/*
 * Template code for a Horde Wave shooter game.
 * This implementation uses Zombies and a player on foot.
 * 
 * The player can shoot bullets, and can collect a pickup to provide homing missiles.
 * The zombies march relentlessly towards the player, pausing only when knocked back by bullets hitting them.
 * There are effects like blood splatters and blood pools.
 * The pickups include:
 *   health (becomes speed upgrade if player is full health already)
 *   auto-fire (becomes faster fire rate if auto is enabled)
 *   missiles (becomes stronger missiles after the first collection)
 * There is a camera which tracks the player, permitting the arena area to be larger than a single screen.
 * Zombies come in waves which get harder as the game progresses.
 * There is a boss after each wave of zombies, who dashes towards the player and has lots of hit points.
 * 
 * The code is divided into clean components, which can be modified or replaced for new user requests.
*/

const Phaser = globalThis.Phaser;

// Start the game once Phaser is available
if (!Phaser) {
    throw new Error('Phaser failed to load on window');
}

import { PickupSystem } from './pickup_manager_component.js';
import CameraController from './camera_control_component.js';

export class BossManager {
    constructor(scene) {
        this.scene = scene;
        this.Phaser = globalThis.Phaser;
        this.group = this.scene.physics.add.group();

        // Ensure boss uses a valid base scale similar to zombies
        this.zombieScale = (scene && scene.zombies && typeof scene.zombies.zombieScale === 'number') ? scene.zombies.zombieScale : 0.1;

        // Tuning
        this.bossScaleMultiplier = 3.0;
        this.bossBaseSpeed = 90;
        this.bossOffscreenSpeed = 260;
        this.bossDashSpeed = 300;
        this.bossDashCooldownMs = 1700;
        this.bossDashDurationMsMin = 750;
        this.bossDashDurationMsMax = 1500;
        this.bossHP = 75;
        this.bossActive = false;
        this._lastBossDashAt = 0;
        this.bossTurnSpeed = 0.80;
        // Slight per-wave scaling (5% per wave) for speed and turn rate
        this.perWaveSpeedMultiplier = 0.05;
        this.perWaveTurnMultiplier = 0.05;
    }

    // Returns true if sprite is within the current camera view
    _isInView(sprite) {
        const cam = this.scene.cameras && this.scene.cameras.main;
        if (!cam) return true;
        const view = cam.worldView;
        return view && sprite.x >= view.x && sprite.x <= view.x + view.width && sprite.y >= view.y && sprite.y <= view.y + view.height;
    }

    _approachAngle(current, target, maxStep) {
        let delta = target - current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const clamped = Math.max(-maxStep, Math.min(maxStep, delta));
        return current + clamped;
    }

    spawnBoss() {
        if (this.bossActive) return null;

        // Spawn just off-screen similar to zombies
        const cam = this.scene.cameras && this.scene.cameras.main;
        const view = cam && cam.worldView;
        const wb = this.scene.worldBounds || { x: 0, y: 0, width: this.scene.physics.world.bounds.width, height: this.scene.physics.world.bounds.height };
        const left = wb.x;
        const right = wb.x + wb.width;
        const top = wb.y;
        const bottom = wb.y + wb.height;
        let x, y;
        if (view) {
            const vLeft = view.x;
            const vRight = view.x + view.width;
            const vTop = view.y;
            const vBottom = view.y + view.height;
            const edge = this.Phaser.Math.Between(0, 3);
            switch (edge) {
                case 0:
                    x = this.Phaser.Math.Between(Math.max(left + 8, vLeft), Math.min(right - 8, vRight));
                    y = Math.max(top + 8, vTop - 128);
                    break;
                case 1:
                    x = Math.min(right - 8, vRight + 128);
                    y = this.Phaser.Math.Between(Math.max(top + 8, vTop), Math.min(bottom - 8, vBottom));
                    break;
                case 2:
                    x = this.Phaser.Math.Between(Math.max(left + 8, vLeft), Math.min(right - 8, vRight));
                    y = Math.min(bottom - 8, vBottom + 128);
                    break;
                case 3:
                default:
                    x = Math.max(left + 8, vLeft - 128);
                    y = this.Phaser.Math.Between(Math.max(top + 8, vTop), Math.min(bottom - 8, vBottom));
                    break;
            }
        } else {
            // Fallback: choose an edge
            const edge = this.Phaser.Math.Between(0, 3);
            switch (edge) {
                case 0:
                    x = this.Phaser.Math.Between(left, right);
                    y = top;
                    break;
                case 1:
                    x = right;
                    y = this.Phaser.Math.Between(top, bottom);
                    break;
                case 2:
                    x = this.Phaser.Math.Between(left, right);
                    y = bottom;
                    break;
                case 3:
                default:
                    x = left;
                    y = this.Phaser.Math.Between(top, bottom);
                    break;
            }
        }

        const boss = this.scene.physics.add.sprite(x, y, 'zombie');
        boss.setOrigin(0.5, 0.5);
        boss.setScale(this.zombieScale * this.bossScaleMultiplier);
        const wave = (this.scene.gameState && Number.isFinite(this.scene.gameState.wave)) ? this.scene.gameState.wave : 1;
        const scaledHP = this.bossHP + Math.max(0, (wave - 1)) * 25;
        boss.health = scaledHP;
        const waveBonus = Math.max(0, (wave - 1));
        const speedScale = 1 + waveBonus * this.perWaveSpeedMultiplier;
        boss.speed = this.bossOffscreenSpeed * speedScale;
        boss.isBoss = true;
        boss.isDashing = false;

        // Physics body: centered circle sized proportionally to frame
        const frameW = boss.frame?.width || boss.width;
        const frameH = boss.frame?.height || boss.height;
        const bodyRadius = Math.round(frameH * 0.5);
        const headScale = bodyRadius * 0.35;
        boss.body.setCircle(headScale, (frameW / 2) - headScale, (frameH / 2) - headScale);

        this.group.add(boss);
        this.bossActive = true;
        this._lastBossDashAt = 0;

        return boss;
    }

    onBulletHit(bullet, boss, gameState) {
        const hitX = (bullet && typeof bullet.x === 'number') ? bullet.x : boss?.x;
        const hitY = (bullet && typeof bullet.y === 'number') ? bullet.y : boss?.y;
        if (bullet && bullet.active) bullet.destroy();
        if (!boss || !boss.active) return;

        const damage = Math.max(1, bullet?._damage ?? 1);
        boss.health -= damage;
        if (boss.health <= 0) {
            const dropX = boss.x;
            const dropY = boss.y;
            // Reuse zombies blood effects for consistency
            this.scene.zombies?.emitKillBlood(dropX, dropY, 2);
            this.scene.zombies?.emitBloodPool(dropX, dropY, {
                circleCountMin: 15,
                circleCountMax: 30,
                radiusMin: 8,
                radiusMax: 32,
                spreadMin: 16,
                spreadMax: 48,
                color: 0xff1f00,
                alpha: 0.20,
                lifetimeMs: 15000,
                fadeDurationMs: 1000,
                depth: (boss.depth ?? 0) - 1
             });

            
            boss.destroy();

            // Boss death handling
            this.bossActive = false;
            if (this.scene.pickups) {
                const spawned = this.scene.pickups.spawnRandomPickup(dropX, dropY);
                if (spawned) gameState.itemDroppedThisWave = true;
            }
            if (this.scene.waves && typeof this.scene.waves.onBossDefeated === 'function') {
                this.scene.waves.onBossDefeated();
            }
        } else {
            // Small hit particles
            this.scene.zombies?.emitHitBlood(hitX, hitY);
            const originalTint = boss.tintTopLeft;
            boss.setTint(0xffffff);
            this.scene.time.delayedCall(100, () => {
                if (boss && boss.active) boss.clearTint();
            });
        }
    }

    onPlayerOverlap(player, boss, gameState) {
        gameState.playerHealth -= 10;
        if (gameState.playerHealth < 0) gameState.playerHealth = 0;

        const angle = this.Phaser.Math.Angle.Between(player.x, player.y, boss.x, boss.y);
        boss.body.setVelocity(Math.cos(angle) * 75, Math.sin(angle) * 75);

        const applyTint = (target, color) => {
            if (!target || !target.active) return;
            if (typeof target.setTint === 'function') target.setTint(color);
            else if (typeof target.setFillStyle === 'function') target.setFillStyle(color);
        };
        const clearTintOrRestore = (target, fallbackColor) => {
            if (!target || !target.active) return;
            if (typeof target.clearTint === 'function') target.clearTint();
            else if (typeof target.setFillStyle === 'function') target.setFillStyle(fallbackColor);
        };

        const originalColor = 0x00ff00;
        if (this.scene.player) {
            applyTint(this.scene.player, 0xff0000);
            this.scene.time.delayedCall(200, () => {
                if (this.scene.player && this.scene.player.active) {
                    if (typeof this.scene.updatePlayerColorByHealth === 'function') {
                        this.scene.updatePlayerColorByHealth();
                    } else {
                        clearTintOrRestore(this.scene.player, originalColor);
                    }
                }
            });
        }

        return gameState.playerHealth <= 0;
    }

    update(player) {
        this.group.children.each((boss) => {
            if (!boss.active) return;
            const angleToPlayer = this.Phaser.Math.Angle.Between(boss.x, boss.y, player.x, player.y);
            const inView = this._isInView(boss);

            const wave = (this.scene.gameState && Number.isFinite(this.scene.gameState.wave)) ? this.scene.gameState.wave : 1;
            const waveBonus = Math.max(0, (wave - 1));
            const speedScale = 1 + waveBonus * this.perWaveSpeedMultiplier;
            const turnScale = 1 + waveBonus * this.perWaveTurnMultiplier;

            const baseSpeed = inView ? this.bossBaseSpeed : this.bossOffscreenSpeed;
            const targetSpeed = baseSpeed * speedScale;

            const now = this.scene.time.now;
            const timeSinceDash = now - (this._lastBossDashAt || 0);
            const canDash = inView && timeSinceDash >= this.bossDashCooldownMs;
            if (canDash) {
                const facingAngle = (boss.rotation + Math.PI / 2);
                let delta = angleToPlayer - facingAngle;
                while (delta > Math.PI) delta -= Math.PI * 2;
                while (delta < -Math.PI) delta += Math.PI * 2;
                const withinAim = Math.abs(delta) < (Math.PI / 8);
                if (withinAim) {
                    boss.isDashing = true;
                    this._lastBossDashAt = now;
                    const dashSpeed = this.bossDashSpeed * speedScale;
                    boss.body.setVelocity(
                        Math.cos(angleToPlayer) * dashSpeed,
                        Math.sin(angleToPlayer) * dashSpeed
                    );
                    const dashDurationMs = this.Phaser.Math.Between(this.bossDashDurationMsMin, this.bossDashDurationMsMax);
                    this.scene.time.delayedCall(dashDurationMs, () => {
                        if (boss && boss.active) boss.isDashing = false;
                    });
                    // Camera shake on dash start
                    if (this.scene?.cameraController?.shake) {
                        this.scene.cameraController.shake(0.8, Math.ceil(dashDurationMs * 1.5));
                    }
                }
            }

            if (!boss.isDashing) {
                boss.body.setVelocity(
                    Math.cos(angleToPlayer) * targetSpeed,
                    Math.sin(angleToPlayer) * targetSpeed
                );

                const deltaSec = (this.scene.game && this.scene.game.loop && typeof this.scene.game.loop.delta === 'number') ? (this.scene.game.loop.delta / 1000) : (1 / 60);
                const targetRotation = angleToPlayer - Math.PI / 2;
                const turnRate = this.bossTurnSpeed * turnScale;
                boss.rotation = this._approachAngle(boss.rotation, targetRotation, turnRate * deltaSec);
            }
        });
    }
} 
export class BulletsManager {
    constructor(scene) {
        this.scene = scene;
        this.Phaser = globalThis.Phaser;
        this.group = this.scene.physics.add.group({ allowGravity: false, immovable: false, maxSize: 200 });
        this.lastFired = 0;
        this.fireRate = 200;
        // Trail configuration
        this.trailEmitEveryUpdates = 2; // emit every X update calls
        this.trailMaxDotsPerBullet = 10; // X circles long
        this.trailDotRadius = 5; // smaller than bullet (bullet is radius 6)
        this.trailStartAlpha = 0.8;
        this.trailLifetimeFrames = this.trailEmitEveryUpdates * this.trailMaxDotsPerBullet - 1; // fade completes before next needed
        // Maintain all trail dots so they continue fading even if bullet is destroyed
        this._allTrailDots = [];
    }

    shootFrom(player, pointer) {
        const time = this.scene.time.now;
        if (time <= this.lastFired + this.fireRate) return null;

        const angle = this.Phaser.Math.Angle.Between(
            player.x, player.y,
            pointer.worldX, pointer.worldY
        );

        const spawnOffset = 28;
        const spawnX = player.x + Math.cos(angle) * spawnOffset;
        const spawnY = player.y + Math.sin(angle) * spawnOffset;
        const bullet = this.scene.add.circle(spawnX, spawnY, 6, 0xffff00);
        this.scene.physics.add.existing(bullet);
        bullet.body.setCollideWorldBounds(false);
        bullet.body.allowGravity = false;
        bullet.body.setImmovable(false);
        bullet.body.setSize(12, 12, true);
        bullet.body.moves = true;
        const speed = 300;
        bullet._angle = angle;
        bullet._speed = speed;
        bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.group.add(bullet);

        // Initialize trail state per bullet
        bullet._trail = [];
        bullet._trailTick = 0;

        this.scene.time.delayedCall(3000, () => {
            if (bullet && bullet.active) bullet.destroy();
        });

        this.lastFired = time;
        return bullet;
    }

    update() {
        this.group.children.each((bullet) => {
            if (!bullet.active) return;
            const wb = this.scene.worldBounds || { x: 0, y: 0, width: this.scene.physics.world.bounds.width, height: this.scene.physics.world.bounds.height };
            if (bullet.x < wb.x || bullet.x > wb.x + wb.width || bullet.y < wb.y || bullet.y > wb.y + wb.height) {
                bullet.destroy();
                return;
            }
            if (bullet.body && bullet._speed) {
                bullet.body.setVelocity(
                    Math.cos(bullet._angle) * bullet._speed,
                    Math.sin(bullet._angle) * bullet._speed
                );
            }
            if (bullet.body) {
                bullet.x = bullet.body.x + bullet.body.halfWidth;
                bullet.y = bullet.body.y + bullet.body.halfHeight;
            }

            // Emit trail dots every N updates
            bullet._trailTick = (bullet._trailTick || 0) + 1;
            if (bullet._trailTick % this.trailEmitEveryUpdates === 0) {
                const color = (typeof bullet.fillColor !== 'undefined') ? bullet.fillColor : 0xffff00;
                const dot = this.scene.add.circle(bullet.x, bullet.y, this.trailDotRadius, color);
                dot.setAlpha(this.trailStartAlpha);
                dot._framesLeft = this.trailLifetimeFrames;
                dot._initialFrames = this.trailLifetimeFrames;
                // Track per-bullet for max-length, and globally for lifecycle updates
                bullet._trail.push(dot);
                this._allTrailDots.push(dot);
                if (bullet._trail.length > this.trailMaxDotsPerBullet) {
                    const oldest = bullet._trail.shift();
                    if (oldest && oldest.destroy) oldest.destroy();
                }
            }
        });

        // Update and fade all existing trail dots
        if (this._allTrailDots.length > 0) {
            const remaining = [];
            for (let i = 0; i < this._allTrailDots.length; i++) {
                const dot = this._allTrailDots[i];
                if (!dot || !dot.active) continue;
                dot._framesLeft -= 1;
                const alpha = Math.max(0, (dot._framesLeft / dot._initialFrames));
                dot.setAlpha(alpha * this.trailStartAlpha);
                if (dot._framesLeft <= 0) {
                    dot.destroy();
                } else {
                    remaining.push(dot);
                }
            }
            this._allTrailDots = remaining;
        }
    }
} 
export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // No external textures needed; we will use simple geometry objects
        // Load background rock texture for the world
        try {
            this.load.setCORS('anonymous');
            // World background rock texture
            this.load.image('worldBgRock', './assets/horde-wave-template/rock-ore.jpg'); //'https://phaserbeam.media/beam/assets/horde-wave-template/rock-ore.jpg');
            // Player sprite
            this.load.image('player', './assets/horde-wave-template/player.png');
            // Zombie sprite
            this.load.image('zombie', './assets/horde-wave-template/zombie.png');
        } catch (e) {
            console.error('[GameScene] Load error:', e);
        }
    }

    create() {
        // Reset game over and resume physics in case we came from a previous run
        this.isGameOver = false;
        if (this.physics && this.physics.world && this.physics.world.isPaused) {
            this.physics.resume();
        }
        // Game state
        this.gameState = {
            wave: 4,
            zombiesKilled: 0,
            zombiesRemaining: 0,
            playerHealth: 100,
            score: 0,
            waveActive: false,
            // Power-ups/effects
            effects: {
                AUTO_FIRE: { active: true, stacks: 2 },
                MISSILES: { active: false, stacks: 0 }
            },
            // Wave guarantees
            itemDroppedThisWave: false
        };

        // World and camera
        this.world = new WorldManager(this, { width: 2048, height: 2048 }).create();

        // Managers
        this.bullets = new BulletsManager(this);
        this.zombies = new ZombiesManager(this);
        this.boss = new BossManager(this);
        this.waves = new WavesManager(this);
        this.playerManager = new PlayerManager(this, this.bullets);
        this.missiles = new MissilesManager(this, this.zombies);

        // Pickups: initialize PickupSystem and register item types
        this.pickups = new PickupSystem(this, {
            defaultLifetimeMs: 9000,
            flashWindowMs: 3000,
            flashIntervalMs: 150,
            flashMinAlpha: 0.25
        });
        const scene = this;
        // AUTO_FIRE
        this.pickups.registerItemType('AUTO_FIRE', {
            color: 0xffaa00,
            radius: 20,
            lifetimeMs: 9000,
            flashWindowMs: 3000,
            onPickup(collector, pickup, s) {
                const gs = scene.gameState;
                const pm = scene.playerManager;
                if (!gs || !pm) return;
                if (!gs.effects.AUTO_FIRE.active) {
                    gs.effects.AUTO_FIRE.active = true;
                    gs.effects.AUTO_FIRE.stacks = 0;
                    pm.applyAutoFireStacks(0);
                } else {
                    gs.effects.AUTO_FIRE.stacks += 1;
                    pm.applyAutoFireStacks(gs.effects.AUTO_FIRE.stacks);
                }
                const stacks = gs.effects.AUTO_FIRE.stacks;
                const interval = pm.autoFireIntervalMs ?? 0;
                const perSecond = interval > 0 ? (1000 / interval).toFixed(1) : '?';
                scene.setStatusMessage?.(`Auto-Fire — Stacks ${stacks}, ${interval}ms (${perSecond}/s)`);
            }
        });
        // HEALTH_25
        this.pickups.registerItemType('HEALTH_25', {
            color: 0x00ff88,
            radius: 20,
            lifetimeMs: 9000,
            flashWindowMs: 3000,
            onPickup(collector, pickup, s) {
                const gs = scene.gameState;
                const pm = scene.playerManager;
                if (!gs || !pm) return;
                const amount = Math.floor(100 * 0.25);
                if (gs.playerHealth >= 100) {
                    pm.addSpeedBoostStacks(1);
                    const stacks = pm.speedBoostStacks;
                    const maxStacks = pm.maxSpeedStacks;
                    const percent = Math.min(100, stacks * 10);
                    const speedVal = pm.playerSpeed;
                    scene.setStatusMessage?.(`Speed Boost — ${stacks}/${maxStacks} stacks, +${percent}% ⇒ Speed=${speedVal}`);
                } else {
                    gs.playerHealth = Math.min(100, gs.playerHealth + amount);
                    scene.updatePlayerColorByHealth?.();
                    scene.setStatusMessage?.(`Health +25 — Health=${gs.playerHealth}`);
                }
            }
        });
        // MISSILES
        this.pickups.registerItemType('MISSILES', {
            color: 0x55ddff,
            radius: 20,
            lifetimeMs: 9000,
            flashWindowMs: 3000,
            onPickup(collector, pickup, s) {
                const gs = scene.gameState;
                if (!gs) return;
                if (!gs.effects.MISSILES.active) {
                    gs.effects.MISSILES.active = true;
                    gs.effects.MISSILES.stacks = 1;
                } else {
                    gs.effects.MISSILES.stacks += 1;
                }
                const stacks = gs.effects.MISSILES.stacks;
                scene.setStatusMessage?.(`Homing Missiles — Damage Stacks ${stacks}`, 1500);
            }
        });

        // Alias for other systems/access
        this.player = this.playerManager.player;
        this.updatePlayerColorByHealth();

        // Configure advanced camera controller (gentle deadzone to reduce motion)
        this.cameraController = new CameraController(this, {
            target: this.player,
            worldBounds: this.worldBounds || { x: 0, y: 0, width: 2048, height: 2048 },
            mode: 'deadzone',
            smoothness: 0.08,
            deadzone: { x: -this.scale.width * 0.125, y: -this.scale.height * 0.25, width: this.scale.width * 0.25, height: this.scale.height * 0.5 },
            offset: { x: 0, y: 0 },
            shakeConfig: { maxIntensity: 10, decayRate: 0.97 }
        });
        // Snap camera to player immediately at start
        this.cameraController.setTarget(this.player, true);
        this.cameraController.setActive(true);

        // Collisions
        this.physics.add.overlap(this.bullets.group, this.zombies.group, this.bulletHitZombie, null, this);
        this.physics.add.overlap(this.player, this.zombies.group, this.zombieHitPlayer, null, this);
        this.physics.add.overlap(this.player, this.pickups.group, this.itemCollected, null, this);
        this.physics.add.overlap(this.missiles.group, this.zombies.group, this.missileHitZombie, null, this);
        // Boss collisions
        this.physics.add.overlap(this.bullets.group, this.boss.group, this.bulletHitZombie, null, this);
        this.physics.add.overlap(this.missiles.group, this.boss.group, this.missileHitZombie, null, this);
        this.physics.add.overlap(this.player, this.boss.group, this.zombieHitPlayer, null, this);

        // UI via HUD
        this.hud = new HUD(this);
        this.hud.create();

        // Start waves system
        this.waves.start();

        // Boss test flag via URL (?boss=1)
        try {
            const params = new URLSearchParams(globalThis.location?.search || '');
            const bossFlag = params.get('boss');
            if (bossFlag === '1' || bossFlag?.toLowerCase() === 'true') {
                this.waves.startBossTest();
            }
        } catch(e) {
            // ignore if not in a browser context
        }

        // Do not auto-fire on scene start; require explicit pointer input to begin firing
    }

    updatePlayerColorByHealth() {
        if (this.player && this.player.active) {
            const health = this.gameState.playerHealth;
            if (health > 50) {
                if (typeof this.player.clearTint === 'function') this.player.clearTint();
            } else {
                this.player.setTint(this.getHealthColor(health));
            }
        }
    }

    getHealthColor(health) {
        return health > 50 ? 0x00ff00 : (health > 25 ? 0xffff00 : 0xff0000);
    }

    isObjectVisible(obj) {
        try {
            const camera = this.cameras && this.cameras.main;
            if (!camera || !obj || typeof obj.getBounds !== 'function') return true;
            const objBounds = obj.getBounds();
            const view = camera.worldView;
            if (!view || !objBounds) return true;
            return Phaser.Geom.Rectangle.Overlaps(objBounds, view);
        } catch (e) {
            return true;
        }
    }

    shoot(pointer) {
        // Kept for compatibility if other systems call it; delegate to player manager
        if (this.playerManager) this.playerManager.shoot(pointer);
    }

    bulletHitZombie(bullet, zombie) {
        if (!this.isObjectVisible(zombie)) return;
        if (zombie?.isBoss) this.boss.onBulletHit(bullet, zombie, this.gameState);
        else this.zombies.onBulletHit(bullet, zombie, this.gameState);
    }

    missileHitZombie(missile, zombie) {
        if (!this.isObjectVisible(zombie)) return;
        if (zombie?.isBoss) this.boss.onBulletHit(missile, zombie, this.gameState);
        else this.zombies.onBulletHit(missile, zombie, this.gameState);
    }

    zombieHitPlayer(player, zombie) {
        const isDead = zombie?.isBoss ? this.boss.onPlayerOverlap(player, zombie, this.gameState) : this.zombies.onPlayerOverlap(player, zombie, this.gameState);
        if (isDead) this.gameOver();
    }

    itemCollected(player, item) {
        if (this.pickups) this.pickups.collectPickup(player, item);
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        if (this.waves) this.waves.stop();
        // Freeze physics but keep scene active so inputs still work
        if (this.physics && this.physics.world) this.physics.pause();
        // Also stop camera updates to avoid drifting view after death
        if (this.cameraController) this.cameraController.setActive(false);

        // Centered to camera view, not world coordinates
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // Dark overlay
        const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.45)
            .setScrollFactor(0)
            .setDepth(9998)
            .setInteractive({ useHandCursor: true });

        // Big title
        this.add.text(cx, cy - 80, 'GAME OVER', { fontFamily: '"Frijole", system-ui', fontSize: '72px', fill: '#ff3b3b' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(9999);

        // Stats
        this.add.text(cx, cy + 10, `Final Score: ${this.gameState.score}`, { fontFamily: '"Frijole", system-ui', fontSize: '28px', fill: '#ffffff' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(9999);
        this.add.text(cx, cy + 50, `Wave Reached: ${this.gameState.wave}`, { fontFamily: '"Frijole", system-ui', fontSize: '22px', fill: '#ffffff' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(9999);

        // Continue hint (click or press Enter/Space)
        const continueText = this.add.text(cx, cy + 110, 'Click or Press Enter to Continue', { fontFamily: '"Frijole", system-ui', fontSize: '20px', fill: '#ffff00' })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(9999)
            .setInteractive({ useHandCursor: true });

        const goToMenu = () => {
            if (this.scene && typeof this.scene.start === 'function') {
                this.scene.start('MenuScene');
            }
        };

        overlay.once('pointerdown', goToMenu);
        continueText.once('pointerdown', goToMenu);
        if (this.input && this.input.keyboard) {
            this.input.keyboard.once('keydown-ENTER', goToMenu);
            this.input.keyboard.once('keydown-SPACE', goToMenu);
        }
    }

    update() {
        // Halt all gameplay updates after game over, but allow HUD to refresh
        if (this.isGameOver) {
            if (this.hud) this.hud.update();
            return;
        }
        if (this.gameState.playerHealth <= 0) {
            if (!this.isGameOver) this.gameOver();
            if (this.hud) this.hud.update();
            return;
        }

        // Player update (movement, aiming, auto-fire)
        if (this.playerManager) this.playerManager.update();

        // Zombies
        if (this.zombies) this.zombies.update(this.player);

        // Boss
        if (this.boss) this.boss.update(this.player);

        // Bullets
        if (this.bullets) this.bullets.update();

        // Pickups
        if (this.pickups) this.pickups.update();

        // Missiles
        if (this.missiles) this.missiles.update();

        // Camera update
        if (this.cameraController) this.cameraController.update(this.time.now, (this.game && this.game.loop && this.game.loop.delta) || 16);

        // HUD update
        if (this.hud) this.hud.update();

        // Wave update
        if (this.waves) this.waves.update();
    }

    // Expose status API for other systems (items, etc.)
    setStatusMessage(text, durationMs = 1400) {
        if (this.hud && typeof this.hud.setStatusMessage === 'function') {
            this.hud.setStatusMessage(text, durationMs);
        } else {
            this.statusText.setText(text);
        }
    }
} 
export class HUD {
    constructor(scene) {
        this.scene = scene;
        this._statusLockUntil = 0;
        this._lastAutoStatusKey = null;

        // Status window config (defaults, will be initialized in create)
        this.statusMessages = [];
        this.statusFadeMs = 2600;
        this.statusScrollMs = 180;
        this.statusMaxLines = 3;
        this.statusLineHeight = 22;
        this.statusWindowTop = 0;
        this.statusWindowBg = null;

        // HUD text elements
        this.uiBackground = null;
        this.waveText = null;
        this.healthText = null;
        this.scoreText = null;
        this.zombiesText = null;

        // Radar overlay
        this.radarGfx = null;
        this.radarRadius = 64; // pixels
        this.radarRange = 1400; // world units displayed from center to edge
        this.radarMargin = 24; // pixels from screen edges
    }

    create() {
        // UI background
        this.uiBackground = this.scene.add.rectangle(360, 50, 700, 80, 0x000000, 0.7);
        this.uiBackground.setScrollFactor(0);

        // Text elements
        this.waveText = this.scene.add.text(20, 20, 'Wave: 1', { fontFamily: '"B612 Mono", monospace', fontSize: '18px', fill: '#ffffff' });
        this.healthText = this.scene.add.text(20, 45, 'Health: 100', { fontFamily: '"B612 Mono", monospace', fontSize: '18px', fill: '#00ff00' });
        this.scoreText = this.scene.add.text(200, 20, 'Score: 0', { fontFamily: '"B612 Mono", monospace', fontSize: '18px', fill: '#ffffff' });
        this.zombiesText = this.scene.add.text(200, 45, 'Zombies: 0', { fontFamily: '"B612 Mono", monospace', fontSize: '18px', fill: '#ff0000' });
        this.waveText.setScrollFactor(0);
        this.healthText.setScrollFactor(0);
        this.scoreText.setScrollFactor(0);
        this.zombiesText.setScrollFactor(0);

        // Status window (full width, below score/HUD)
        const windowWidth = this.scene.scale.width;
        const maxLines = this.statusMaxLines;
        const lineHeight = this.statusLineHeight;
        const paddingY = 6;
        const windowHeight = maxLines * lineHeight + paddingY * 2;
        const windowY = 50 + 40 + windowHeight / 2;
        this.statusWindowBg = this.scene.add.rectangle(this.scene.scale.width / 2, windowY, windowWidth, windowHeight, 0x000000, 0.55);
        this.statusWindowBg.setScrollFactor(0);
        this.statusWindowTop = this.statusWindowBg.y - this.statusWindowBg.height / 2 + paddingY;

        // Reset state
        this._statusLockUntil = 0;
        this._lastAutoStatusKey = null;
        this.statusMessages = [];

        // Radar graphics overlay
        this.radarGfx = this.scene.add.graphics();
        this.radarGfx.setScrollFactor(0);
        this.radarGfx.setDepth(1000);
    }

    update() {
        const gs = this.scene.gameState;
        if (!gs) return;

        // HUD values
        this.waveText.setText(`Wave: ${gs.wave}`);
        this.healthText.setText(`Health: ${gs.playerHealth}`);
        this.healthText.setColor(gs.playerHealth > 50 ? '#00ff00' : gs.playerHealth > 25 ? '#ffff00' : '#ff0000');
        this.scoreText.setText(`Score: ${gs.score}`);
        this.zombiesText.setText(`Zombies: ${gs.zombiesRemaining}`);

        // Draw radar
        this._drawRadar();

        // Respect active status message lock
        const now = this.scene.time.now;
        if (now < (this._statusLockUntil || 0)) return;

        // Avoid spamming the same auto status each frame
        if (!gs.waveActive && gs.playerHealth > 0) {
            const key = 'nextWave';
            if (this._lastAutoStatusKey !== key) {
                this.setStatusMessage('Next Wave Incoming...');
                this._lastAutoStatusKey = key;
            }
        } else if (gs.waveActive) {
            const key = 'fight';
            if (this._lastAutoStatusKey !== key) {
                this.setStatusMessage('Fight!');
                this._lastAutoStatusKey = key;
            }
        }
    }

    _layoutStatusMessages() {
        const visibleStart = Math.max(0, this.statusMessages.length - this.statusMaxLines);
        for (let i = 0; i < this.statusMessages.length; i++) {
            const entry = this.statusMessages[i];
            const relIndex = i - visibleStart;
            const targetY = relIndex >= 0 ? (this.statusWindowTop + relIndex * this.statusLineHeight) : (this.statusWindowTop - this.statusLineHeight);
            if (relIndex >= 0) {
                this.scene.tweens.add({
                    targets: entry.obj,
                    y: targetY,
                    alpha: 1,
                    duration: this.statusScrollMs,
                    ease: 'Cubic.easeOut'
                });
            } else {
                entry.obj.y = targetY;
                entry.obj.alpha = 0;
            }
        }
    }

    setStatusMessage(text, durationMs = 1400) {
        this._statusLockUntil = this.scene.time.now + durationMs;

        const style = { fontFamily: '"B612 Mono", monospace', fontSize: '18px', fill: '#ffff00' };
        const msg = this.scene.add.text(20, 0, text, style);
        msg.setAlpha(0);
        msg.setScrollFactor(0);
        if (this.statusWindowBg && this.statusWindowBg.width) {
            msg.setWordWrapWidth(this.statusWindowBg.width - 40, true);
        }
        this.statusMessages.push({ obj: msg, birth: this.scene.time.now });

        this._layoutStatusMessages();

        this.scene.tweens.add({
            targets: msg,
            alpha: 0,
            duration: this.statusFadeMs,
            ease: 'Linear',
            delay: durationMs,
            onComplete: () => {
                const idx = this.statusMessages.findIndex(e => e.obj === msg);
                if (idx !== -1) {
                    this.statusMessages.splice(idx, 1);
                }
                if (msg && msg.active) msg.destroy();
                this._layoutStatusMessages();
            }
        });

        if (this.statusMessages.length > 12) {
            const removed = this.statusMessages.splice(0, this.statusMessages.length - 12);
            removed.forEach(e => { if (e.obj && e.obj.active) e.obj.destroy(); });
        }
    }

    _drawRadar() {
        if (!this.radarGfx) return;
        const player = this.scene.player;
        const zombiesGroup = this.scene.zombies?.group;
        if (!player || !zombiesGroup) return;

        const g = this.radarGfx;
        g.clear();

        // Position at bottom-right
        const r = this.radarRadius;
        const cx = this.scene.scale.width - this.radarMargin - r;
        const cy = this.scene.scale.height - this.radarMargin - r;

        // Background circle
        g.fillStyle(0x000000, 0.45);
        g.fillCircle(cx, cy, r);
        g.lineStyle(2, 0xffffff, 0.35);
        g.strokeCircle(cx, cy, r);

        // Mid-range ring (optional visual aid)
        g.lineStyle(1, 0xffffff, 0.18);
        g.strokeCircle(cx, cy, Math.floor(r * 0.5));

        // Player dot (green, 1px)
        g.fillStyle(0x00ff00, 1);
        const px = Math.round(cx);
        const py = Math.round(cy);
        g.fillRect(px, py, 1, 1);

        // Zombies (yellow, 1px each)
        const maxRange = Math.max(1, this.radarRange);
        const innerRadius = r - 2; // keep dots inside border
        zombiesGroup.children.each((zombie) => {
            if (!zombie.active) return;
            const dx = zombie.x - player.x;
            const dy = zombie.y - player.y;
            const dist = Math.hypot(dx, dy);
            // Normalize and clamp to inner radius
            const scale = innerRadius / maxRange;
            let zx = dx * scale;
            let zy = dy * scale;
            const m = Math.hypot(zx, zy);
            if (m > innerRadius) {
                const k = innerRadius / (m || 1);
                zx *= k;
                zy *= k;
            }
            const rx = Math.round(cx + zx);
            const ry = Math.round(cy + zy);
            g.fillStyle(0xffff00, 1);
            g.fillRect(rx, ry, 1, 1);
        });
    }
} 
export class ZombiesManager {
    constructor(scene) {
        this.scene = scene;
        this.Phaser = globalThis.Phaser;
        this.group = this.scene.physics.add.group();
        
        // Tier colors indexed by (hp - 1). Higher HP => typically darker/meaner color.
        this.TIER_COLORS = [
            0x66ff66, // HP 1
            0xaaff66, // HP 2
            0xffcc33, // HP 3
            0xff8844, // HP 4
            0xff4444, // HP 5
            0xcc2244, // HP 6
            0x992244  // HP 7
        ];

        // Spawn behavior tuning
        this.spawnScreenOffset = 128; // how far beyond the screen edge to spawn (in world units)
        this.spawnClampMargin = 8;    // when at world edge, keep inside by this margin

        this.zombieScale = 0.1;

        // Hit reaction tuning
        this.knockbackSpeed = 140;           // units per second during knockback
        this.knockbackDurationMs = 120;      // time applying knockback velocity
        this.stunAfterKnockbackMs = 160;     // additional pause before resuming chase
    }

    getRandomTierForWave(waveNumber) {
        const maxTier = Math.min(Math.max(1, waveNumber), this.TIER_COLORS.length);
        // Wave 1 => only tier 1; Wave 2 => tier 1..2; etc.
        return this.Phaser.Math.Between(1, maxTier);
    }

    darkenColor(hex, factor = 0.7) {
        const r = Math.max(0, Math.min(255, Math.floor(((hex >> 16) & 0xff) * factor)));
        const g = Math.max(0, Math.min(255, Math.floor(((hex >> 8) & 0xff) * factor)));
        const b = Math.max(0, Math.min(255, Math.floor((hex & 0xff) * factor)));
        return (r << 16) | (g << 8) | b;
    }

    // Emit simple geometry-based blood particles
    emitBloodParticles(x, y, {
        countMin = 8,
        countMax = 14,
        radiusMin = 2,
        radiusMax = 5,
        distanceMin = 20,
        distanceMax = 60,
        lifespanMin = 300,
        lifespanMax = 600,
        colors = [0xff4444, 0xee2222, 0xaa0000]
    } = {}) {
        const count = this.Phaser.Math.Between(countMin, countMax);
        for (let i = 0; i < count; i++) {
            const angle = this.Phaser.Math.FloatBetween(0, Math.PI * 2);
            const distance = this.Phaser.Math.FloatBetween(distanceMin, distanceMax);
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            const radius = this.Phaser.Math.FloatBetween(radiusMin, radiusMax);
            const color = this.Phaser.Utils.Array.GetRandom(colors);
            const life = this.Phaser.Math.Between(lifespanMin, lifespanMax);

            const particle = this.scene.add.circle(x, y, radius, color, 1);

            this.scene.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                scale: 0,
                alpha: 0,
                duration: life,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    if (particle && particle.active) particle.destroy();
                }
            });
        }
    }

    emitHitBlood(x, y) {
        this.emitBloodParticles(x, y, {
            countMin: 8,
            countMax: 15,
            radiusMin: 3,
            radiusMax: 9,
            distanceMin: 24,
            distanceMax: 64,
            lifespanMin: 350,
            lifespanMax: 750
        });
    }

    emitKillBlood(x, y, multiplier = 1) {
        this.emitBloodParticles(x, y, {
            countMin: 12 * multiplier,
            countMax: 25 * multiplier,
            radiusMin: 6 * multiplier,
            radiusMax: 12 * multiplier,
            distanceMin: 60 * multiplier,
            distanceMax: 160 * multiplier,
            lifespanMin: 400 * multiplier,
            lifespanMax: 800 * multiplier
        });
    }

    // Create a small additive blood pool that persists ~15s then fades away
    emitBloodPool(x, y, {
        circleCountMin = 8,
        circleCountMax = 16,
        radiusMin = 4,
        radiusMax = 20,
        spreadMin = 6,
        spreadMax = 24,
        color = 0xff0000,
        alpha = 0.25,
        lifetimeMs = 15000,
        fadeDurationMs = 1000,
        depth = -1
    } = {}) {
        const count = this.Phaser.Math.Between(circleCountMin, circleCountMax);
        const container = this.scene.add.container(0, 0);
        container.setDepth(depth);

        for (let i = 0; i < count; i++) {
            const angle = this.Phaser.Math.FloatBetween(0, Math.PI * 2);
            const dist = this.Phaser.Math.FloatBetween(spreadMin, spreadMax);
            const cx = x + Math.cos(angle) * dist;
            const cy = y + Math.sin(angle) * dist;
            const r = this.Phaser.Math.FloatBetween(radiusMin, radiusMax);

            const circle = this.scene.add.circle(cx, cy, r, color, alpha);
            circle.setBlendMode(this.Phaser.BlendModes.ADD);
            container.add(circle);
        }

        // Ensure it renders beneath typical actors
        this.scene.children.sendToBack(container);

        // Hold for lifetime, then fade out and destroy
        this.scene.time.delayedCall(lifetimeMs, () => {
            this.scene.tweens.add({
                targets: container,
                alpha: 0,
                duration: fadeDurationMs,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    if (container && container.active) container.destroy();
                }
            });
        });
    }

    spawnZombie(waveNumber) {
        let x, y;
        const wb = this.scene.worldBounds || { x: 0, y: 0, width: this.scene.physics.world.bounds.width, height: this.scene.physics.world.bounds.height };
        const left = wb.x;
        const right = wb.x + wb.width;
        const top = wb.y;
        const bottom = wb.y + wb.height;

        const cam = this.scene.cameras && this.scene.cameras.main;
        const view = cam && cam.worldView;

        if (view) {
            const vLeft = view.x;
            const vRight = view.x + view.width;
            const vTop = view.y;
            const vBottom = view.y + view.height;

            const edge = this.Phaser.Math.Between(0, 3);
            switch (edge) {
                case 0: // top of screen (just above view)
                    x = this.Phaser.Math.Between(Math.max(left + this.spawnClampMargin, vLeft), Math.min(right - this.spawnClampMargin, vRight));
                    y = Math.max(top + this.spawnClampMargin, vTop - this.spawnScreenOffset);
                    break;
                case 1: // right of screen (just beyond view)
                    x = Math.min(right - this.spawnClampMargin, vRight + this.spawnScreenOffset);
                    y = this.Phaser.Math.Between(Math.max(top + this.spawnClampMargin, vTop), Math.min(bottom - this.spawnClampMargin, vBottom));
                    break;
                case 2: // bottom of screen (just below view)
                    x = this.Phaser.Math.Between(Math.max(left + this.spawnClampMargin, vLeft), Math.min(right - this.spawnClampMargin, vRight));
                    y = Math.min(bottom - this.spawnClampMargin, vBottom + this.spawnScreenOffset);
                    break;
                case 3:
                default: // left of screen (just beyond view)
                    x = Math.max(left + this.spawnClampMargin, vLeft - this.spawnScreenOffset);
                    y = this.Phaser.Math.Between(Math.max(top + this.spawnClampMargin, vTop), Math.min(bottom - this.spawnClampMargin, vBottom));
                    break;
            }
        } else {
            // Fallback: spawn at world edges
            const edge = this.Phaser.Math.Between(0, 3);
            switch (edge) {
                case 0: // top edge
                    x = this.Phaser.Math.Between(left, right);
                    y = top;
                    break;
                case 1: // right edge
                    x = right;
                    y = this.Phaser.Math.Between(top, bottom);
                    break;
                case 2: // bottom edge
                    x = this.Phaser.Math.Between(left, right);
                    y = bottom;
                    break;
                case 3:
                default: // left edge
                    x = left;
                    y = this.Phaser.Math.Between(top, bottom);
                    break;
            }
        }

        // Choose a tier (hp) up to the current wave to create a mix of prior tiers
        const tier = this.getRandomTierForWave(waveNumber);
        const hp = Math.ceil(tier * 1.5); // Increase base HP

        // Create zombie sprite facing down; set origin to center
        const sprite = this.scene.physics.add.sprite(x, y, 'zombie');
        sprite.setOrigin(0.5, 0.5);
        // Match player visual height if available
        const sourceW = 1024;
        const sourceH = 1024;
        const playerH = this.scene.player?.displayHeight;
        const scaleUniform = this.zombieScale;
        sprite.setScale(scaleUniform);
        sprite.health = hp;
        sprite.speed = Math.round((40 + (waveNumber * 5)) * 0.75);
        sprite.tier = tier;

        // Slightly reduce radius to better fit the torso and avoid arms
        const zombieRadius = 30;
        sprite.body.setCircle(zombieRadius / this.zombieScale);
        // Center the body on the sprite using display dimensions, with a small downward bias
        const halfDisplayW = sprite.displayWidth / 2;
        const halfDisplayH = sprite.displayHeight / 2;
        const xBias = 200;                    // tweak if needed
        const yBias = 160;
        sprite.body.setOffset(xBias, yBias);

        this.group.add(sprite);
        return sprite;
    }

    onBulletHit(bullet, zombie, gameState) {
        // Capture impact location before destroying the bullet so we can place hit effects accurately
        const hitX = (bullet && typeof bullet.x === 'number') ? bullet.x : zombie?.x;
        const hitY = (bullet && typeof bullet.y === 'number') ? bullet.y : zombie?.y;
        // Determine projectile travel direction before we potentially destroy it
        const travelAngle = (() => {
            if (bullet && typeof bullet._angle === 'number') return bullet._angle; // bullets
            if (bullet && typeof bullet._rotation === 'number') return bullet._rotation; // missiles
            if (bullet && bullet.body && bullet.body.velocity) return Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
            const px = this.scene.player?.x ?? (zombie?.x ?? hitX);
            const py = this.scene.player?.y ?? (zombie?.y ?? hitY);
            // Fallback: assume shot from player towards zombie
            return this.Phaser.Math.Angle.Between(px, py, zombie?.x ?? hitX, zombie?.y ?? hitY);
        })();
        if (bullet && bullet.active) bullet.destroy();
        if (!zombie || !zombie.active) return;

        // Determine damage from projectile
        const damage = Math.max(1, bullet?._damage ?? 1);

        zombie.health -= damage;
        if (zombie.health <= 0) {
            // Emit larger burst on death
            const dropX = zombie.x;
            const dropY = zombie.y;
            this.emitKillBlood(dropX, dropY);
            // Leave an additive blood pool beneath actors
            this.emitBloodPool(dropX, dropY, { depth: (zombie.depth ?? 0) - 1 });

            if (zombie.armLeft) zombie.armLeft.destroy();
            if (zombie.armRight) zombie.armRight.destroy();
            zombie.destroy();

            // Normal zombie death handling
            gameState.zombiesKilled++;
            gameState.score += 10 * gameState.wave;
            gameState.zombiesRemaining--;

            const isLastZombie = gameState.zombiesRemaining <= 0;

            // ~30% chance to drop an item
            let dropped = false;
            if (this.scene.pickups && this.Phaser.Math.FloatBetween(0, 1) < 0.3) {
                const p = this.scene.pickups.spawnRandomPickup(dropX, dropY);
                dropped = !!p;
            }

            // Track if any drop occurred this wave
            if (dropped) {
                gameState.itemDroppedThisWave = true;
            }

            // If this was the last zombie and no item dropped yet this wave, force a drop
            if (isLastZombie && this.scene.pickups && !gameState.itemDroppedThisWave) {
                const p2 = this.scene.pickups.spawnRandomPickup(dropX, dropY);
                if (p2) gameState.itemDroppedThisWave = true;
            }
        } else {
            // Emit small hit particles at the actual impact location
            this.emitHitBlood(hitX, hitY);

            zombie.setTintFill(0xffffff);
            this.scene.time.delayedCall(100, () => {
                if (zombie && zombie.active) zombie.clearTint();
            });

            // Apply brief knockback in the projectile's travel direction, then a short stun
            const now = this.scene.time.now;
            const kbSpeed = this.knockbackSpeed || 140;
            zombie._knockbackVx = Math.cos(travelAngle) * kbSpeed;
            zombie._knockbackVy = Math.sin(travelAngle) * kbSpeed;
            zombie._knockbackUntil = now + (this.knockbackDurationMs || 120);
            zombie._stunnedUntil = zombie._knockbackUntil + (this.stunAfterKnockbackMs || 160);
        }
    }

    onPlayerOverlap(player, zombie, gameState) {
        gameState.playerHealth -= 10;
        if (gameState.playerHealth < 0) gameState.playerHealth = 0;

        const angle = this.Phaser.Math.Angle.Between(player.x, player.y, zombie.x, zombie.y);
        zombie.body.setVelocity(Math.cos(angle) * 75, Math.sin(angle) * 75);

        const applyTint = (target, color) => {
            if (!target || !target.active) return;
            if (typeof target.setTint === 'function') target.setTint(color);
            else if (typeof target.setFillStyle === 'function') target.setFillStyle(color);
        };
        const clearTintOrRestore = (target, fallbackColor) => {
            if (!target || !target.active) return;
            if (typeof target.clearTint === 'function') target.clearTint();
            else if (typeof target.setFillStyle === 'function') target.setFillStyle(fallbackColor);
        };

        const originalColor = 0x00ff00;
        if (this.scene.player) {
            applyTint(this.scene.player, 0xff0000);
            this.scene.time.delayedCall(200, () => {
                if (this.scene.player && this.scene.player.active) {
                    if (typeof this.scene.updatePlayerColorByHealth === 'function') {
                        this.scene.updatePlayerColorByHealth();
                    } else {
                        clearTintOrRestore(this.scene.player, originalColor);
                    }
                }
            });
        }

        return gameState.playerHealth <= 0;
    }

    // Returns true if sprite is within the current camera view
    _isInView(sprite) {
        const cam = this.scene.cameras && this.scene.cameras.main;
        if (!cam) return true;
        const view = cam.worldView;
        return view && sprite.x >= view.x && sprite.x <= view.x + view.width && sprite.y >= view.y && sprite.y <= view.y + view.height;
    }

    _approachAngle(current, target, maxStep) {
        let delta = target - current;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const clamped = Math.max(-maxStep, Math.min(maxStep, delta));
        return current + clamped;
    }

    update(player) {
        // Regular zombies
        this.group.children.each((zombie) => {
            if (!zombie.active) return;
            const now = this.scene.time.now;
            if (zombie._stunnedUntil && now < zombie._stunnedUntil) {
                if (zombie._knockbackUntil && now < zombie._knockbackUntil) {
                    zombie.body.setVelocity(zombie._knockbackVx || 0, zombie._knockbackVy || 0);
                } else {
                    zombie.body.setVelocity(0, 0);
                }
                // Face the player while stunned
                const face = this.Phaser.Math.Angle.Between(
                    zombie.x, zombie.y,
                    player.x, player.y
                );
                zombie.rotation = face - Math.PI / 2;
                return;
            }
            const angle = this.Phaser.Math.Angle.Between(
                zombie.x, zombie.y,
                player.x, player.y
            );
            zombie.body.setVelocity(
                Math.cos(angle) * zombie.speed,
                Math.sin(angle) * zombie.speed
            );
            // Face the player (image faces down initially)
            zombie.rotation = angle - Math.PI / 2;
        });
    }
} 

export class WavesManager {
    constructor(scene) {
        this.scene = scene;
        this.Phaser = globalThis.Phaser;
        this.gameState = scene.gameState;
        this.zombies = scene.zombies;
        this.boss = scene.boss;
        this.spawnTimer = null;
        this.waveTimer = null;
        this.bossPhaseActive = false;
    }

    start() {
        if (this.waveTimer) this.waveTimer.remove(false);
        this.waveTimer = this.scene.time.addEvent({
            delay: 1000,
            callback: this.update,
            callbackScope: this,
            loop: true
        });
        this.startWave();
    }

    startWave() {
        this.gameState.waveActive = true;
        this.bossPhaseActive = false;
        this.gameState.zombiesRemaining = this.gameState.wave * 10 + 2;
        this.gameState.zombiesKilled = 0;
        // Reset per-wave item drop guarantee
        this.gameState.itemDroppedThisWave = false;

        if (this.spawnTimer) this.spawnTimer.remove(false);
        const delay = Math.max(200, 1000 - (this.gameState.wave * 50));
        this.spawnTimer = this.scene.time.addEvent({
            delay,
            callback: this.spawnZombie,
            callbackScope: this,
            repeat: this.gameState.zombiesRemaining - 1
        });

        this.scene.updateUI?.();
    }

    spawnZombie() {
        this.zombies.spawnZombie(this.gameState.wave);
    }

    update() {
        if (this.scene.isGameOver) return;
        // When a wave ends (no zombies remaining and group empty), trigger boss phase
        if (this.gameState.waveActive && this.gameState.zombiesRemaining <= 0 && this.zombies.group.children.size === 0) {
            this.gameState.waveActive = false;
            if (!this.boss.bossActive && this.boss.group.children.size === 0) {
                this.bossPhaseActive = true;
                this.boss.spawnBoss();
                this.scene.setStatusMessage?.('Boss approaching!', 1600);
            }
        }
    }

    onBossDefeated() {
        if (this.scene.isGameOver) return;
        // End boss phase and proceed to next wave after a short delay
        this.bossPhaseActive = false;
        this.gameState.wave++;
        this.gameState.playerHealth = Math.min(100, this.gameState.playerHealth + 20);
        this.scene.updatePlayerColorByHealth?.();
        this.scene.setStatusMessage?.('Boss defeated! Next wave incoming...', 1800);
        this.scene.time.delayedCall(2000, () => {
            this.startWave();
        });
    }

    // Immediately start boss test phase, clearing any current wave and zombies
    startBossTest() {
        // Stop spawning
        if (this.spawnTimer) {
            this.spawnTimer.remove(false);
            this.spawnTimer = null;
        }
        // Mark wave inactive
        this.gameState.waveActive = false;
        this.bossPhaseActive = true;
        // Clear existing zombies
        this.zombies.group.clear(true, true);
        this.gameState.zombiesRemaining = 0;
        // Spawn boss and show status
        if (!this.boss.bossActive) {
            this.boss.spawnBoss();
        }
        this.scene.setStatusMessage?.('Boss test mode', 1400);
    }

    stop() {
        if (this.spawnTimer) {
            this.spawnTimer.remove(false);
            this.spawnTimer = null;
        }
        if (this.waveTimer) {
            this.waveTimer.remove(false);
            this.waveTimer = null;
        }
    }
} 
export class WorldManager {
    constructor(scene, { width = 2048, height = 2048, backgroundColor = 0x0b0b0b } = {}) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.backgroundColor = backgroundColor;
        this.Phaser = globalThis.Phaser;
        this._bg = null;
    }

    create() {
        // Set physics world bounds to larger world area
        this.scene.physics.world.setBounds(0, 0, this.width, this.height);

        // Background image covering entire world
        if (this.scene.textures && this.scene.textures.exists('worldBgRock')) {
            // Scale single image to exactly match world bounds to avoid tiling/wrap
            this._bg = this.scene.add.image(0, 0, 'worldBgRock');
            this._bg.setOrigin(0, 0);
            this._bg.setDisplaySize(this.width, this.height);
         } else {
             // Fallback: solid color rectangle
             this._bg = this.scene.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, this.backgroundColor, 1);
         }
         // Ensure background is behind all elements and scrolls with world
         this._bg.setDepth(-1000);

        // Expose dimensions on scene for convenience
        this.scene.worldBounds = { x: 0, y: 0, width: this.width, height: this.height };

        return this;
    }
} 
export class PlayerManager {
    constructor(scene, bullets) {
        this.scene = scene;
        this.bullets = bullets;
        this.Phaser = globalThis.Phaser;

        // Create player (circle body)
        const wb = this.scene.worldBounds || { x: 0, y: 0, width: this.scene.physics.world.bounds.width, height: this.scene.physics.world.bounds.height };
        const spawnX = wb.x + wb.width / 2;
        const spawnY = wb.y + wb.height / 2;
        // Replace circle with sprite
        this.player = this.scene.physics.add.sprite(spawnX, spawnY, 'player');
        // The source image is 66x60
        this.player.setScale(0.118);
        this.player.setCollideWorldBounds(true);
        // Use a tighter body size to match the visible sprite better
        // Center using the unscaled frame size so physics debug aligns correctly
        const bodyRadius = 30;
        const frameW = this.player.frame?.width || this.player.width;
        const frameH = this.player.frame?.height || this.player.height;
        const radius = bodyRadius / this.player.scaleX;
        const offsetX = (frameW / 2) - radius;
        const offsetY = (frameH / 2) - radius;
        this.player.body.setCircle(radius, offsetX, offsetY);

        // Movement
        this.playerSpeed = 140;
        // Track base speed and stacking speed boosts (max +100%)
        this.basePlayerSpeed = this.playerSpeed;
        this.speedBoostStacks = 3; // each stack = +10% of base speed
        this.maxSpeedStacks = 10; // 10 stacks => +100%

        // Input
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.wasd = this.scene.input.keyboard.addKeys('W,S,A,D');

        // Mouse input
        this.scene.input.on('pointerdown', (pointer) => this.shoot(pointer), this);
        this.scene.input.on('pointerup', () => { this._isPointerDown = false; }, this);
        this._isPointerDown = false;
        this._lastPointer = null;

        // Auto-fire cadence (2 shots/sec => every 500ms)
        this.autoFireIntervalMs = 500;
        this._nextAutoFireAt = 0;

        // Track base rate so we can scale it with stacks
        this._baseAutoFireIntervalMs = this.autoFireIntervalMs; // 500ms default
    }



    _firePrimaryAndSecondary(pointer) {
        // Primary
        this.bullets.shootFrom(this.player, pointer);
        // Secondary missiles if active
        if (this.scene.gameState?.effects?.MISSILES?.active && this.scene.missiles) {
            this.scene.missiles.shootFrom(this.player, pointer);
        }
    }

    shoot(pointer) {
        this._isPointerDown = true;
        this._lastPointer = pointer || this.scene.input.activePointer;
        this._firePrimaryAndSecondary(this._lastPointer);
    }

    applyAutoFireStacks(stacks) {
        const factor = Math.pow(0.85, stacks);
        const minAutoFire = 50; // cap for auto-fire interval
        this.autoFireIntervalMs = Math.max(minAutoFire, Math.round(this._baseAutoFireIntervalMs * factor));
    }

    // Apply a +10% speed boost per stack relative to base speed, capped at +100%
    addSpeedBoostStacks(increment = 1) {
        const newStacks = Math.min(this.maxSpeedStacks, this.speedBoostStacks + increment);
        this.speedBoostStacks = newStacks;
        const multiplier = Math.min(2, 1 + 0.1 * this.speedBoostStacks);
        this.playerSpeed = Math.round(this.basePlayerSpeed * multiplier);
    }

    update() {
        // Guard when player might be missing (e.g., after game over cleanups)
        if (!this.player || !this.player.body) return;

        // Player movement
        let velocityX = 0;
        let velocityY = 0;

        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            velocityX = -this.playerSpeed;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            velocityX = this.playerSpeed;
        }

        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            velocityY = -this.playerSpeed;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            velocityY = this.playerSpeed;
        }

        this.player.body.setVelocity(velocityX, velocityY);

        // Rotate sprite to face aim
        const pointer = this.scene.input.activePointer;
        const aimAngle = this.Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
        this.player.rotation = aimAngle;

        // Clamp player inside the current camera window
        {
            const cam = this.scene.cameras && this.scene.cameras.main;
            const view = cam && cam.worldView;
            const body = this.player.body;
            if (view && body) {
                const halfW = (body.halfWidth !== undefined ? body.halfWidth : (body.radius !== undefined ? body.radius : this.player.displayWidth * 0.5));
                const halfH = (body.halfHeight !== undefined ? body.halfHeight : (body.radius !== undefined ? body.radius : this.player.displayHeight * 0.5));
                const minX = view.x + halfW;
                const maxX = view.x + view.width - halfW;
                const minY = view.y + halfH;
                const maxY = view.y + view.height - halfH;

                if (this.player.x < minX) { this.player.x = minX; body.setVelocityX(Math.max(0, body.velocity.x)); }
                else if (this.player.x > maxX) { this.player.x = maxX; body.setVelocityX(Math.min(0, body.velocity.x)); }
                if (this.player.y < minY) { this.player.y = minY; body.setVelocityY(Math.max(0, body.velocity.y)); }
                else if (this.player.y > maxY) { this.player.y = maxY; body.setVelocityY(Math.min(0, body.velocity.y)); }
            }
        }

        // Auto-fire when active and button held
        const now = this.scene.time.now;
        if (this.scene.gameState?.effects?.AUTO_FIRE?.active && this._isPointerDown) {
            if (now >= this._nextAutoFireAt) {
                this._lastPointer = this._lastPointer || this.scene.input.activePointer;
                this._firePrimaryAndSecondary(this._lastPointer);
                this._nextAutoFireAt = now + this.autoFireIntervalMs;
            }
        } else {
            // Reset cadence so next press fires immediately
            this._nextAutoFireAt = now;
        }
    }
}

export class MissilesManager {
    constructor(scene, zombiesManager) {
        this.scene = scene;
        this.zombiesManager = zombiesManager;
        this.Phaser = globalThis.Phaser;

        this.group = this.scene.physics.add.group({ allowGravity: false, immovable: false, maxSize: 100 });

        // Fire cadence
        this.lastFired = 0;
        this.fireRate = 300; // ms

        // Physics parameters
        this.accelerationPerSecond = 225; // pixels/s^2
        this.maxSpeed = 315; // pixels/s
        this.turnRate = Math.PI * 1.25; // radians/s
        this.lifetimeMs = 4000;

        // Trails
        this.smokeIntervalMs = 25;
    }

    _pickTarget() {
        if (!this.zombiesManager || !this.zombiesManager.group) return null;
        let best = null;
        let bestDistSq = Infinity;
        const children = this.zombiesManager.group.getChildren();
        for (const z of children) {
            if (!z || !z.active) continue;
            const wb = this.scene.worldBounds || { x: 0, y: 0, width: this.scene.physics.world.bounds.width, height: this.scene.physics.world.bounds.height };
            if (z.x < wb.x || z.x > wb.x + wb.width || z.y < wb.y || z.y > wb.y + wb.height) continue;
            const dx = (this._spawnX ?? 0) - z.x;
            const dy = (this._spawnY ?? 0) - z.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDistSq) {
                best = z;
                bestDistSq = d2;
            }
        }
        return best;
    }

    _emitSmoke(x, y) {
        const p = this.scene.add.circle(x, y, 4, 0x999999, 0.9);
        // Expand a bit then shrink and fade over 500ms
        this.scene.tweens.add({
            targets: p,
            scale: { from: 0.9, to: 1.5 },
            alpha: { from: 0.9, to: 0 },
            duration: 350,
            ease: 'Sine.easeOut',
            onComplete: () => {
                if (p && p.active) {
                    // Shrink phase to finish trail
                    this.scene.tweens.add({
                        targets: p,
                        scale: { from: 1.5, to: 0.5 },
                        alpha: { from: p.alpha, to: 0 },
                        duration: 350,
                        ease: 'Sine.easeIn',
                        onComplete: () => { if (p && p.active) p.destroy(); }
                    });
                }
            }
        });
    }

    _getEffectiveBulletDelayMs() {
        const pm = this.scene.playerManager;
        const bulletsMgr = this.scene.bullets;
        const autoActive = this.scene.gameState?.effects?.AUTO_FIRE?.active === true;
        const autoInterval = autoActive ? pm?.autoFireIntervalMs : undefined;
        const bulletFireRate = bulletsMgr?.fireRate;
        // Use the larger of the two as the effective limiter (actual cadence)
        let delay = 0;
        if (typeof autoInterval === 'number' && autoInterval > 0) delay = autoInterval;
        if (typeof bulletFireRate === 'number' && bulletFireRate > delay) delay = bulletFireRate;
        if (!delay || delay <= 0) delay = 200; // sensible default
        return delay;
    }

    shootFrom(player, pointer) {
        const time = this.scene.time.now;
        const missileDelay = this._getEffectiveBulletDelayMs() * 2; // one missile per two bullets
        if (time <= this.lastFired + missileDelay) return null;
        if (!player) return null;

        const angle = this.Phaser.Math.Angle.Between(
            player.x, player.y,
            pointer?.worldX ?? player.x, pointer?.worldY ?? player.y
        );

        const spawnOffset = 36;
        const spawnX = player.x + Math.cos(angle) * spawnOffset;
        const spawnY = player.y + Math.sin(angle) * spawnOffset;
        this._spawnX = spawnX;
        this._spawnY = spawnY;

        // Thin rectangle missile
        const missile = this.scene.add.rectangle(spawnX, spawnY, 32, 6, 0x55ddff);
        missile.setOrigin(0.5, 0.5);
        this.scene.physics.add.existing(missile);
        missile.body.setCollideWorldBounds(false);
        missile.body.allowGravity = false;
        missile.body.setImmovable(false);
        missile.body.setSize(28, 12, true);
        missile.body.moves = true;

        // Missile state
        missile._rotation = angle; // current facing
        missile.rotation = angle;
        missile._speed = 50; // initial speed
        missile._spawnTime = time;

        // Damage equals MISSILES stacks (1 damage per stack)
        const stacks = this.scene.gameState?.effects?.MISSILES?.stacks ?? 0;
        missile._damage = stacks;

        // Acquire a target at fire time
        missile._target = this._pickTarget();

        // Initial velocity aligned to facing
        missile.body.setVelocity(Math.cos(missile._rotation) * missile._speed, Math.sin(missile._rotation) * missile._speed);

        // Trail timing
        missile._nextSmokeAt = time;

        this.group.add(missile);

        // Auto-despawn safety
        this.scene.time.delayedCall(this.lifetimeMs, () => {
            if (missile && missile.active) missile.destroy();
        });

        this.lastFired = time;
        return missile;
    }

    update() {
        const dt = (this.scene.game.loop.delta || 16) / 1000; // seconds
        const now = this.scene.time.now;
        this.group.children.each((missile) => {
            if (!missile || !missile.active) return;

            // Destroy if outside world bounds with small margin
            {
                const wb = this.scene.worldBounds || { x: 0, y: 0, width: this.scene.physics.world.bounds.width, height: this.scene.physics.world.bounds.height };
                const margin = 32;
                if (missile.x < wb.x - margin || missile.x > wb.x + wb.width + margin || missile.y < wb.y - margin || missile.y > wb.y + wb.height + margin) {
                    missile.destroy();
                    return;
                }
            }

            // Homing turn towards target picked at fire time
            const target = missile._target;
            if (target && target.active) {
                const desired = this.Phaser.Math.Angle.Between(missile.x, missile.y, target.x, target.y);
                let diff = this.Phaser.Math.Angle.Wrap(desired - missile._rotation);
                const maxTurn = this.turnRate * dt;
                diff = this.Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
                missile._rotation = this.Phaser.Math.Angle.Wrap(missile._rotation + diff);
                missile.rotation = missile._rotation;
            }

            // Accelerate forward
            missile._speed = Math.min(this.maxSpeed, missile._speed + this.accelerationPerSecond * dt);

            // Update velocity from facing and speed
            const vx = Math.cos(missile._rotation) * missile._speed;
            const vy = Math.sin(missile._rotation) * missile._speed;
            missile.body.setVelocity(vx, vy);

            // Sync display to body
            if (missile.body) {
                missile.x = missile.body.x + missile.body.halfWidth;
                missile.y = missile.body.y + missile.body.halfHeight;
            }

            // Emit smoke behind the missile
            if (now >= (missile._nextSmokeAt || 0)) {
                const backOffset = -16;
                const sx = missile.x + Math.cos(missile._rotation) * backOffset;
                const sy = missile.y + Math.sin(missile._rotation) * backOffset;
                this._emitSmoke(sx, sy);
                missile._nextSmokeAt = now + this.smokeIntervalMs;
            }
        });
    }
} 

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        this.load.setCORS('anonymous');
        try {
            this.load.image('menuBg', './assets/horde-wave-template/zombie_horde.png');
        } catch (e) {
            console.error('[MenuScene] Load error:', e);
        }
        this.load.on('filecomplete-image-menuBg', () => {
            console.log('[MenuScene] menuBg loaded');
        });
        this.load.on('loaderror', (file) => {
            console.error('[MenuScene] Load error:', file?.key || file);
        });
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        let bg = null;
        if (this.textures.exists('menuBg')) {
            const key = 'menuBg';
            bg = this.add.image(centerX, centerY, key).setOrigin(0.5).setScrollFactor(0).setDepth(-2);
            const src = bg.texture.getSourceImage();
            const srcW = src.width;
            const srcH = src.height;
            const scale = Math.max(this.scale.width / srcW, this.scale.height / srcH);
            bg.setScale(scale);
            this._menuBg = bg;
            this.scale.on('resize', (gameSize) => {
                const w = gameSize.width;
                const h = gameSize.height;
                const newScale = Math.max(w / srcW, h / srcH);
                bg.setPosition(w / 2, h / 2).setScale(newScale);
            });
        } else {
            console.warn('[MenuScene] menuBg texture missing; falling back to solid background');
            this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x111111, 1).setDepth(-2);
        }
        this.add.text(centerX, centerY + 140, 'Click to Play', { fontFamily: '"B612 Mono", monospace', fontSize: '48px', fill: '#cf2f1f' }).setOrigin(0.5);
        this.input.once('pointerdown', () => {
            try {
                if (this.sound) {
                    if (this.sound.locked && typeof this.sound.unlock === 'function') {
                        this.sound.unlock();
                    }
                    if (this.sound.context && this.sound.context.state === 'suspended' && typeof this.sound.context.resume === 'function') {
                        this.sound.context.resume();
                    }
                }
            } catch (e) {}
            this.scene.start('GameScene');
        });
    }
} 

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [MenuScene, GameScene]
};

new Phaser.Game(config); 
