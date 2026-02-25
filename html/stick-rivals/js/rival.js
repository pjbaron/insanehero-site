/**
 * Rival System - Persistent enemy with AI upgrade selection
 */

const Rival = {
    // Fixed rival order: friendly -> angriest
    // Each rival is harder than the last
    rivalOrder: [
        {
            personality: 'friendly',
            profile: 'balanced',
            name: 'The Rookie',
            description: 'A cheerful newcomer',
            bonusHp: -15,
            bonusAttack: -2
        },
        {
            personality: 'analytical',
            profile: 'defensive',
            name: 'The Calculator',
            description: 'Cold and precise',
            bonusHp: -5,
            bonusAttack: -1
        },
        {
            personality: 'dramatic',
            profile: 'glassCannon',
            name: 'The Showman',
            description: 'Lives for the spotlight',
            bonusHp: 10,
            bonusAttack: 0.5
        },
        {
            personality: 'hothead',
            profile: 'aggressive',
            name: 'The Champion',
            description: 'Rage incarnate',
            bonusHp: 15,
            bonusAttack: 1
        }
    ],

    // Current rival index (0-3, or -1 if completed)
    currentRivalIndex: 0,
    currentRivalData: null,

    // Rounds needed to permanently defeat a rival
    ROUNDS_TO_WIN: 10,

    // AI Profiles define stat category weights (higher = more likely to pick)
    profiles: {
        aggressive: {
            name: 'Aggressive',
            hint: 'Favors raw damage',
            weights: {
                attack: 5, speed: 4, crit: 4, execute: 3, bleed: 3,
                hp: 1, armor: 1, lifesteal: 2, thorns: 1, regen: 1, stun: 2
            }
        },
        defensive: {
            name: 'Defensive',
            hint: 'Favors survivability',
            weights: {
                hp: 5, armor: 5, regen: 4, thorns: 3, lifesteal: 3,
                attack: 2, speed: 2, crit: 1, execute: 1, bleed: 1, stun: 2
            }
        },
        balanced: {
            name: 'Balanced',
            hint: 'Well-rounded fighter',
            weights: {
                attack: 3, speed: 3, hp: 3, armor: 3, crit: 3,
                lifesteal: 3, thorns: 2, regen: 2, execute: 2, bleed: 2, stun: 2
            }
        },
        glassCannon: {
            name: 'Glass Cannon',
            hint: 'Maximum offense',
            weights: {
                attack: 6, speed: 5, crit: 5, execute: 4, bleed: 4,
                hp: 0, armor: 0, lifesteal: 2, thorns: 0, regen: 0, stun: 3
            }
        },
        vampire: {
            name: 'Vampire',
            hint: 'Drains life force',
            weights: {
                lifesteal: 6, bleed: 5, attack: 3, speed: 3, hp: 2,
                armor: 1, crit: 2, execute: 3, thorns: 1, regen: 2, stun: 2
            }
        }
    },

    // Counter-picking maps: what categories counter player builds
    counters: {
        // If player has high HP/armor, rival should pick execute/bleed
        hp: ['execute', 'bleed'],
        armor: ['bleed', 'execute', 'speed'],
        // If player has high damage, rival should pick HP/armor/lifesteal
        attack: ['hp', 'armor', 'lifesteal'],
        speed: ['hp', 'armor', 'stun'],
        crit: ['hp', 'armor'],
        // If player has sustain, rival should pick burst damage
        lifesteal: ['attack', 'crit', 'execute'],
        regen: ['execute', 'bleed', 'attack'],
        // If player has thorns, rival should pick lifesteal/regen
        thorns: ['lifesteal', 'regen', 'speed'],
        // If player has control, rival should pick speed
        stun: ['speed', 'regen'],
        bleed: ['regen', 'lifesteal'],
        execute: ['hp', 'regen']
    },

    // Current rival state
    fighter: null,
    profile: null,
    personality: null,
    lastPickedUpgrade: null,
    winStreak: 0,
    loseStreak: 0,

    // Track upgrade bonuses separately (so round scaling doesn't overwrite them)
    upgradeBonuses: {
        maxHp: 0,
        attackBonus: 0,
        attackSpeed: 0,
        armor: 0,
        critChance: 0,
        lifesteal: 0,
        thorns: 0,
        regen: 0,
        execute: 0,
        bleed: 0,
        stunChance: 0
    },

    /**
     * Initialize a new rival for the run
     * Uses saved progress to determine which rival to fight
     * @returns {object} - { profile, personality, rivalData }
     */
    init() {
        // Load current rival from storage
        const savedRival = Storage.get('currentRival');

        // Find rival index by personality
        this.currentRivalIndex = this.rivalOrder.findIndex(r => r.personality === savedRival);

        // Handle completed game or invalid save
        if (this.currentRivalIndex === -1) {
            if (savedRival === 'completed') {
                // Game was completed, restart from beginning
                this.currentRivalIndex = 0;
                Storage.set('currentRival', this.rivalOrder[0].personality);
            } else {
                // Invalid save, start fresh
                this.currentRivalIndex = 0;
                Storage.set('currentRival', this.rivalOrder[0].personality);
            }
        }

        // Get current rival data
        this.currentRivalData = this.rivalOrder[this.currentRivalIndex];
        this.personality = this.currentRivalData.personality;

        // Use the rival's assigned AI profile
        const profileKey = this.currentRivalData.profile;
        this.profile = this.profiles[profileKey];
        this.profile.key = profileKey;

        // Create fighter instance
        this.fighter = new Fighter(false);
        this.fighter.isRival = true;

        // Initialize mocap animation to taunt/idle
        if (this.fighter.useMocap) {
            this.fighter.animController.setState('taunt');
        }

        // Reset streaks
        this.winStreak = 0;
        this.loseStreak = 0;
        this.lastPickedUpgrade = null;

        // Reset upgrade bonuses (with difficulty scaling)
        this.upgradeBonuses = {
            maxHp: this.currentRivalData.bonusHp,
            attackBonus: this.currentRivalData.bonusAttack / 10, // Convert to percentage
            attackSpeed: 0,
            armor: 0,
            critChance: 0,
            lifesteal: 0,
            thorns: 0,
            regen: 0,
            execute: 0,
            bleed: 0,
            stunChance: 0
        };

        return {
            profile: this.profile,
            personality: this.personality,
            rivalData: this.currentRivalData
        };
    },

    /**
     * Advance to the next rival after defeating current one
     * @returns {boolean} - true if there's a next rival, false if game complete
     */
    advanceToNextRival() {
        this.currentRivalIndex++;

        if (this.currentRivalIndex >= this.rivalOrder.length) {
            // All rivals defeated!
            Storage.set('currentRival', 'completed');
            return false;
        }

        // Save progress
        Storage.set('currentRival', this.rivalOrder[this.currentRivalIndex].personality);
        return true;
    },

    /**
     * Check if this is the final rival
     * @returns {boolean}
     */
    isFinalRival() {
        return this.currentRivalIndex === this.rivalOrder.length - 1;
    },

    /**
     * Get display name for current rival
     * @returns {string}
     */
    getRivalName() {
        return this.currentRivalData ? this.currentRivalData.name : 'Unknown';
    },

    /**
     * Reset rival fighter stats for a new run
     */
    reset() {
        if (this.fighter) {
            this.fighter.reset();
        }
        this.winStreak = 0;
        this.loseStreak = 0;
        this.lastPickedUpgrade = null;
        this.upgradeBonuses = {
            maxHp: 0, attackBonus: 0, attackSpeed: 0, armor: 0, critChance: 0,
            lifesteal: 0, thorns: 0, regen: 0, execute: 0, bleed: 0, stunChance: 0
        };
    },

    /**
     * Apply base stats and upgrade bonuses to the rival fighter
     */
    applyStats() {
        if (!this.fighter) return;

        // Same base stats as player - only upgrades from cards
        const baseHp = 100;
        const baseAttack = 10;
        const baseSpeed = 1.0;

        // Apply base stats + upgrade bonuses
        this.fighter.maxHp = baseHp + this.upgradeBonuses.maxHp;
        this.fighter.hp = this.fighter.maxHp;
        this.fighter.baseAttack = baseAttack;
        this.fighter.attackBonus = this.upgradeBonuses.attackBonus;
        this.fighter.attackSpeed = baseSpeed + this.upgradeBonuses.attackSpeed;
        this.fighter.armor = this.upgradeBonuses.armor;
        this.fighter.critChance = 0.05 + this.upgradeBonuses.critChance;
        this.fighter.lifesteal = this.upgradeBonuses.lifesteal;
        this.fighter.thorns = this.upgradeBonuses.thorns;
        this.fighter.regen = this.upgradeBonuses.regen;
        this.fighter.execute = this.upgradeBonuses.execute;
        this.fighter.bleed = this.upgradeBonuses.bleed;
        this.fighter.stunChance = this.upgradeBonuses.stunChance;
    },

    /**
     * Reset fighter for combat (keep upgrades/stats)
     */
    resetForCombat() {
        if (this.fighter) {
            this.fighter.resetForCombat();
        }
    },

    /**
     * Select a card index from available choices
     * @param {Array} choices - Available upgrade objects
     * @param {string|null} playerLastPick - Player's last picked upgrade category (for counter-picking)
     * @returns {number} - Index of selected card
     */
    selectCardIndex(choices, playerLastPick = null) {
        if (!choices || choices.length === 0) return 0;

        // 30% chance to counter-pick if player has a clear build direction
        const shouldCounter = playerLastPick && Math.random() < 0.3;

        // Calculate weights for each choice
        const weightedChoices = choices.map((upgrade, index) => {
            let weight = 1;

            // Base weight from profile preferences
            const category = upgrade.statCategory;
            if (this.profile && this.profile.weights[category] !== undefined) {
                weight = this.profile.weights[category] + 1; // +1 to ensure minimum weight
            }

            // Counter-picking bonus
            if (shouldCounter && playerLastPick) {
                const counterCategories = this.counters[playerLastPick] || [];
                if (counterCategories.includes(category)) {
                    weight *= 2; // Double weight for counter picks
                }
            }

            // Rarity bonus (slight preference for better upgrades)
            if (upgrade.rarity === 'legendary') weight *= 1.5;
            else if (upgrade.rarity === 'rare') weight *= 1.3;
            else if (upgrade.rarity === 'uncommon') weight *= 1.1;

            return { index, weight };
        });

        // Weighted random selection
        const totalWeight = weightedChoices.reduce((sum, c) => sum + c.weight, 0);
        let random = Math.random() * totalWeight;

        for (const choice of weightedChoices) {
            random -= choice.weight;
            if (random <= 0) {
                return choice.index;
            }
        }

        // Fallback to last choice
        return choices.length - 1;
    },

    /**
     * Get upgrade values from Upgrades.js (single source of truth)
     * Extracts the stat and value from the upgrade's apply function by inspecting the upgrade data
     */
    getUpgradeValues(upgradeId) {
        // Check pool first, then legendary templates
        let upgrade = Upgrades.pool.find(u => u.id === upgradeId);
        if (!upgrade) {
            for (const template of Object.values(Upgrades.legendaryTemplates)) {
                if (template.id === upgradeId) {
                    upgrade = template;
                    break;
                }
            }
        }
        if (!upgrade) return null;

        // Map statCategory to the stat property and extract value from description
        const statMap = {
            hp: 'maxHp',
            attack: 'attackBonus',
            speed: 'attackSpeed',
            armor: 'armor',
            crit: 'critChance',
            lifesteal: 'lifesteal',
            thorns: 'thorns',
            regen: 'regen',
            execute: 'execute',
            bleed: 'bleed',
            stun: 'stunChance'
        };

        const stat = statMap[upgrade.statCategory];
        if (!stat) return null;

        // Extract numeric value from description (e.g., "+15 Max HP" -> 15, "+25% Attack" -> 0.25)
        const match = upgrade.description.match(/\+?([\d.]+)(%?)/);
        if (!match) return null;

        let value = parseFloat(match[1]);
        if (match[2] === '%') value /= 100; // Convert percentage to decimal

        return { [stat]: value };
    },

    /**
     * Apply an upgrade to the rival (tracks bonuses separately)
     * @param {object} upgrade - Upgrade to apply
     */
    applyUpgrade(upgrade) {
        if (!this.fighter || !upgrade) return;

        // Get the bonus values for this upgrade from Upgrades.js
        const values = this.getUpgradeValues(upgrade.id);
        if (values) {
            // Add to tracked bonuses
            for (const [stat, value] of Object.entries(values)) {
                this.upgradeBonuses[stat] = (this.upgradeBonuses[stat] || 0) + value;
            }
        }

        this.fighter.upgrades.push(upgrade.id);
        this.lastPickedUpgrade = upgrade;
    },

    /**
     * Record combat result for streak tracking
     * @param {boolean} rivalWon - Did the rival win?
     */
    recordResult(rivalWon) {
        if (rivalWon) {
            this.winStreak++;
            this.loseStreak = 0;
        } else {
            this.loseStreak++;
            this.winStreak = 0;
        }
    },

    /**
     * Get rival's current build info (dominant stat category)
     * @returns {string|null} - Dominant stat category or null
     */
    getDominantBuild() {
        if (!this.fighter || this.fighter.upgrades.length === 0) {
            return null;
        }

        // Count upgrades by category
        const categoryCounts = {};
        for (const upgradeId of this.fighter.upgrades) {
            const upgrade = Upgrades.getUpgradeById(upgradeId);
            if (upgrade && upgrade.statCategory) {
                categoryCounts[upgrade.statCategory] = (categoryCounts[upgrade.statCategory] || 0) + 1;
            }
        }

        // Find dominant category
        let maxCount = 0;
        let dominant = null;
        for (const [category, count] of Object.entries(categoryCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominant = category;
            }
        }

        return dominant;
    },

    /**
     * Get stats for display
     * @returns {object} - Fighter stats
     */
    getStats() {
        return this.fighter ? this.fighter.getStats() : null;
    }
};
