/**
 * General Purpose Pickup System
 * 
 * A flexible system for managing collectible items in Phaser 3 games.
 * Supports item types, visual effects, lifetime management, and configurable behaviors.
 * 
 * emits events: 'spawn', 'collect', 'expire'
 * 
 */
export class PickupSystem {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.Phaser = globalThis.Phaser;
        
        // Physics group for pickups
        this.group = this.scene.physics.add.group({ 
            allowGravity: config.allowGravity || false, 
            immovable: config.immovable !== false 
        });

        // Item type registry
        this.itemTypes = new Map();
        
        // Default pickup behavior config
        this.config = {
            // Lifetime settings
            defaultLifetimeMs: config.defaultLifetimeMs || 10000,
            flashWindowMs: config.flashWindowMs || 3000,
            flashIntervalMs: config.flashIntervalMs || 150,
            flashMinAlpha: config.flashMinAlpha || 0.25,
            
            // Visual settings
            defaultRadius: config.defaultRadius || 20,
            defaultDepth: config.defaultDepth || 0,
            
            // Physics settings
            defaultBodySize: config.defaultBodySize || null, // null = auto-size to visual
            
            // Callbacks
            onPickup: config.onPickup || null,
            onExpire: config.onExpire || null,
            onSpawn: config.onSpawn || null,
            
            // Drop behavior
            guaranteedDrops: config.guaranteedDrops || [], // Items that must drop if conditions met
            dropChance: config.dropChance || 0.3,
            maxItemsPerDrop: config.maxItemsPerDrop || 1,
            
            ...config
        };

        // Track active pickups for batch operations
        this.activePickups = new Set();
        
        // Event system for external integration
        this.events = new Map();
    }

    /**
     * Register a new item type with the system
     * @param {string} key - Unique identifier for this item type
     * @param {Object} definition - Item type configuration
     */
    registerItemType(key, definition) {
        const itemType = {
            key,
            // Visual properties
            color: definition.color || 0xffffff,
            radius: definition.radius || this.config.defaultRadius,
            texture: definition.texture || null,
            sprite: definition.sprite || null,
            scale: definition.scale || 1,
            
            // Behavior properties
            lifetimeMs: definition.lifetimeMs || this.config.defaultLifetimeMs,
            flashWindowMs: definition.flashWindowMs || this.config.flashWindowMs,
            
            // Physics properties
            bodySize: definition.bodySize || this.config.defaultBodySize,
            immovable: definition.immovable !== false,
            allowGravity: definition.allowGravity || false,
            
            // Custom properties for game logic
            value: definition.value || 1,
            rarity: definition.rarity || 1, // affects drop chance
            stackable: definition.stackable !== false,
            maxStacks: definition.maxStacks || Infinity,
            
            // Effect definition - flexible structure for game-specific logic
            effect: definition.effect || {},
            
            // Custom spawn/pickup/expire behaviors
            onSpawn: definition.onSpawn || null,
            onPickup: definition.onPickup || null,
            onExpire: definition.onExpire || null,
            
            // Conditions for when this item can spawn
            spawnConditions: definition.spawnConditions || null,
            
            ...definition
        };
        
        this.itemTypes.set(key, itemType);
        return itemType;
    }

    /**
     * Get registered item type definition
     */
    getItemType(key) {
        return this.itemTypes.get(key);
    }

    /**
     * Get all registered item types
     */
    getAllItemTypes() {
        return Array.from(this.itemTypes.values());
    }

    /**
     * Create visual representation of a pickup
     * @private
     */
    _createPickupVisual(x, y, itemType) {
        let visual;
        
        if (itemType.texture && this.scene.textures.exists(itemType.texture)) {
            // Use texture/sprite
            visual = this.scene.add.image(x, y, itemType.texture);
            if (itemType.scale !== 1) visual.setScale(itemType.scale);
        } else if (itemType.sprite) {
            // Use sprite with animations
            visual = this.scene.add.sprite(x, y, itemType.sprite);
            if (itemType.scale !== 1) visual.setScale(itemType.scale);
            if (itemType.animation) visual.play(itemType.animation);
        } else {
            // Fallback to geometric shape
            visual = this.scene.add.circle(x, y, itemType.radius, itemType.color);
        }
        
        visual.setDepth(itemType.depth || this.config.defaultDepth);
        return visual;
    }

    /**
     * Setup physics body for a pickup
     * @private
     */
    _setupPhysics(pickup, itemType) {
        this.scene.physics.add.existing(pickup);
        pickup.body.setImmovable(itemType.immovable);
        pickup.body.allowGravity = itemType.allowGravity;
        
        // Set body size
        if (itemType.bodySize) {
            if (typeof itemType.bodySize === 'number') {
                // Circular body
                pickup.body.setCircle(itemType.bodySize);
            } else if (itemType.bodySize.width && itemType.bodySize.height) {
                // Rectangular body
                pickup.body.setSize(itemType.bodySize.width, itemType.bodySize.height, true);
            }
        }
        // else use default body size from visual
    }

    /**
     * Spawn a pickup of specified type at location
     * @param {number} x - World x coordinate
     * @param {number} y - World y coordinate  
     * @param {string} itemTypeKey - Registered item type key
     * @param {Object} overrides - Optional property overrides for this instance
     */
    spawnPickup(x, y, itemTypeKey, overrides = {}) {
        const itemType = this.getItemType(itemTypeKey);
        if (!itemType) {
            console.warn(`[PickupSystem] Unknown item type: ${itemTypeKey}`);
            return null;
        }

        // Check spawn conditions
        if (itemType.spawnConditions && !itemType.spawnConditions(this.scene, x, y)) {
            return null;
        }

        // Create visual
        const pickup = this._createPickupVisual(x, y, itemType);
        
        // Setup physics
        this._setupPhysics(pickup, itemType);
        
        // Attach metadata
        pickup.itemType = itemType;
        pickup.itemTypeKey = itemTypeKey;
        pickup.spawnTime = this.scene.time.now;
        pickup.lifetimeMs = overrides.lifetimeMs || itemType.lifetimeMs;
        pickup.expireAt = pickup.spawnTime + pickup.lifetimeMs;
        
        // Apply any instance overrides
        Object.assign(pickup, overrides);
        
        // Add to group and tracking
        this.group.add(pickup);
        this.activePickups.add(pickup);
        
        // Schedule cleanup
        this.scene.time.delayedCall(pickup.lifetimeMs, () => {
            if (pickup && pickup.active) {
                this._expirePickup(pickup);
            }
        });
        
        // Call spawn callbacks
        if (itemType.onSpawn) itemType.onSpawn(pickup, this.scene);
        if (this.config.onSpawn) this.config.onSpawn(pickup, itemType, this.scene);
        this._emit('spawn', pickup, itemType);
        
        return pickup;
    }

    /**
     * Spawn a random pickup from available types
     * @param {number} x - World x coordinate
     * @param {number} y - World y coordinate
     * @param {Object} options - Spawn options
     */
    spawnRandomPickup(x, y, options = {}) {
        const availableTypes = this.getAllItemTypes().filter(type => {
            return !type.spawnConditions || type.spawnConditions(this.scene, x, y);
        });
        
        if (availableTypes.length === 0) return null;
        
        // Weight by rarity (higher rarity = lower chance)
        const weights = availableTypes.map(type => 1 / (type.rarity || 1));
        const selectedType = this._weightedRandom(availableTypes, weights);
        
        return this.spawnPickup(x, y, selectedType.key, options);
    }

    /**
     * Handle pickup collection
     * @param {Object} collector - Entity that collected the pickup (usually player)
     * @param {Object} pickup - The pickup object
     */
    collectPickup(collector, pickup) {
        if (!pickup || !pickup.active || !pickup.itemType) return false;
        
        const itemType = pickup.itemType;
        
        // Call pickup callbacks - they can modify game state
        let collected = true;
        if (itemType.onPickup) {
            collected = itemType.onPickup(collector, pickup, this.scene) !== false;
        }
        if (collected && this.config.onPickup) {
            collected = this.config.onPickup(collector, pickup, itemType, this.scene) !== false;
        }
        
        if (collected) {
            this._emit('collect', collector, pickup, itemType);
            this._removePickup(pickup);
        }
        
        return collected;
    }

    /**
     * Update pickup states (flashing, expiration, etc.)
     */
    update() {
        const now = this.scene.time.now;
        const toRemove = [];
        
        for (const pickup of this.activePickups) {
            if (!pickup || !pickup.active) {
                toRemove.push(pickup);
                continue;
            }
            
            const timeLeft = pickup.expireAt - now;
            const flashWindow = pickup.itemType.flashWindowMs || this.config.flashWindowMs;
            
            // Handle flashing near expiration
            if (timeLeft <= flashWindow && timeLeft > 0) {
                const flashInterval = this.config.flashIntervalMs;
                const phase = Math.floor(now / flashInterval) % 2;
                const targetAlpha = phase === 0 ? 1 : this.config.flashMinAlpha;
                
                if (pickup.alpha !== targetAlpha) {
                    pickup.setAlpha(targetAlpha);
                }
            } else if (timeLeft > flashWindow && pickup.alpha !== 1) {
                // Ensure full visibility before flash window
                pickup.setAlpha(1);
            } else if (timeLeft <= 0) {
                // Expired
                toRemove.push(pickup);
            }
        }
        
        // Clean up expired or destroyed pickups
        toRemove.forEach(pickup => {
            if (pickup.active) {
                this._expirePickup(pickup);
            } else {
                this._removePickup(pickup);
            }
        });
    }

    /**
     * Handle pickup expiration
     * @private
     */
    _expirePickup(pickup) {
        if (pickup.itemType.onExpire) {
            pickup.itemType.onExpire(pickup, this.scene);
        }
        if (this.config.onExpire) {
            this.config.onExpire(pickup, pickup.itemType, this.scene);
        }
        
        this._emit('expire', pickup, pickup.itemType);
        this._removePickup(pickup);
    }

    /**
     * Remove pickup from tracking and destroy
     * @private
     */
    _removePickup(pickup) {
        this.activePickups.delete(pickup);
        if (pickup && pickup.active) {
            pickup.destroy();
        }
    }

    /**
     * Weighted random selection
     * @private
     */
    _weightedRandom(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        
        return items[items.length - 1]; // fallback
    }

    /**
     * Event system for external integration
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    _emit(event, ...args) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (e) {
                    console.error(`[PickupSystem] Event callback error for '${event}':`, e);
                }
            });
        }
    }

    /**
     * Get all active pickups
     */
    getActivePickups() {
        return Array.from(this.activePickups);
    }

    /**
     * Get pickups of specific type
     */
    getPickupsByType(itemTypeKey) {
        return Array.from(this.activePickups).filter(pickup => 
            pickup.itemTypeKey === itemTypeKey
        );
    }

    /**
     * Remove all active pickups
     */
    clearAllPickups() {
        const pickups = Array.from(this.activePickups);
        pickups.forEach(pickup => this._removePickup(pickup));
    }

    /**
     * Get pickup statistics
     */
    getStats() {
        const stats = {
            totalActive: this.activePickups.size,
            byType: {}
        };
        
        for (const pickup of this.activePickups) {
            const key = pickup.itemTypeKey;
            stats.byType[key] = (stats.byType[key] || 0) + 1;
        }
        
        return stats;
    }

    /**
     * Cleanup - call when destroying the system
     */
    destroy() {
        this.clearAllPickups();
        this.group.destroy();
        this.itemTypes.clear();
        this.events.clear();
        this.activePickups.clear();
    }
}