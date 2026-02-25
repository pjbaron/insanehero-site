/**
 * Upgrades System - Card pool, selection, and application
 */

const Upgrades = {
    // Rarity colors
    rarityColors: {
        common: '#9e9e9e',
        uncommon: '#4caf50',
        rare: '#2196f3',
        legendary: '#ff9800'
    },

    // Legendary card templates (20% stronger than rare)
    legendaryTemplates: {
        hp: {
            id: 'legendary_hp',
            name: 'Colossus',
            description: '+48 Max HP',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'hp',
            apply: (fighter) => { fighter.maxHp += 48; fighter.hp += 48; }
        },
        attack: {
            id: 'legendary_attack',
            name: 'Destroyer',
            description: '+42% Attack',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'attack',
            apply: (fighter) => { fighter.attackBonus += 0.42; }
        },
        crit: {
            id: 'legendary_crit',
            name: 'Deadeye',
            description: '+32% Crit Chance',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'crit',
            apply: (fighter) => { fighter.critChance += 0.32; }
        },
        lifesteal: {
            id: 'legendary_lifesteal',
            name: 'Vampire Lord',
            description: '+33% Lifesteal',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'lifesteal',
            apply: (fighter) => { fighter.lifesteal += 0.33; }
        },
        thorns: {
            id: 'legendary_thorns',
            name: 'Spike Lord',
            description: '+5 Thorns',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'thorns',
            apply: (fighter) => { fighter.thorns += 5; }
        },
        regen: {
            id: 'legendary_regen',
            name: 'Immortal',
            description: '+2 Regen/tick',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'regen',
            apply: (fighter) => { fighter.regen += 2.0; }
        },
        execute: {
            id: 'legendary_execute',
            name: 'Soul Reaper',
            description: '+160% Execute',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'execute',
            apply: (fighter) => { fighter.execute += 1.60; }
        },
        bleed: {
            id: 'legendary_bleed',
            name: 'Crimson Death',
            description: '+2.5% HP Bleed/tick',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'bleed',
            apply: (fighter) => { fighter.bleed += 0.025; }
        },
        stun: {
            id: 'legendary_stun',
            name: 'Concussion',
            description: '+35% Stun',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'stun',
            apply: (fighter) => { fighter.stunChance += 0.35; }
        },
        armor: {
            id: 'legendary_armor',
            name: 'Fortress',
            description: '+2.5 Armor',
            rarity: 'legendary',
            type: 'stat',
            statCategory: 'armor',
            apply: (fighter) => { fighter.armor += 2.5; }
        }
    },

    // Current legendary card for this deck (randomized each game)
    currentLegendary: null,

    // All available upgrades with statCategory for AI weighting
    pool: [
        // === STAT UPGRADES (Common) ===
        {
            id: 'toughness',
            name: 'Toughness',
            description: '+15 Max HP',
            rarity: 'common',
            type: 'stat',
            statCategory: 'hp',
            apply: (fighter) => {
                fighter.maxHp += 15;
                fighter.hp += 15;
            }
        },
        {
            id: 'sharpened',
            name: 'Sharpened',
            description: '+15% Attack',
            rarity: 'common',
            type: 'stat',
            statCategory: 'attack',
            apply: (fighter) => {
                fighter.attackBonus += 0.15;
            }
        },
        {
            id: 'quick_hands',
            name: 'Quick Hands',
            description: '+0.20 Attack Speed',
            rarity: 'common',
            type: 'stat',
            statCategory: 'speed',
            apply: (fighter) => {
                fighter.attackSpeed += 0.20;
            }
        },
        {
            id: 'iron_skin',
            name: 'Iron Skin',
            description: '+1.5 Armor',
            rarity: 'common',
            type: 'stat',
            statCategory: 'armor',
            apply: (fighter) => {
                fighter.armor += 1.5;
            }
        },
        {
            id: 'precision',
            name: 'Precision',
            description: '+18% Crit Chance',
            rarity: 'common',
            type: 'stat',
            statCategory: 'crit',
            apply: (fighter) => {
                fighter.critChance += 0.18;
            }
        },
        {
            id: 'vampiric',
            name: 'Vampiric',
            description: '+17% Lifesteal',
            rarity: 'common',
            type: 'stat',
            statCategory: 'lifesteal',
            apply: (fighter) => {
                fighter.lifesteal += 0.17;
            }
        },

        // === STAT UPGRADES (Uncommon) ===
        {
            id: 'fortified',
            name: 'Fortified',
            description: '+25 Max HP',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'hp',
            apply: (fighter) => {
                fighter.maxHp += 25;
                fighter.hp += 25;
            }
        },
        {
            id: 'deadly',
            name: 'Deadly',
            description: '+22% Attack',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'attack',
            apply: (fighter) => {
                fighter.attackBonus += 0.22;
            }
        },
        {
            id: 'swift',
            name: 'Swift',
            description: '+0.30 Attack Speed',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'speed',
            apply: (fighter) => {
                fighter.attackSpeed += 0.30;
            }
        },
        {
            id: 'steel_plating',
            name: 'Steel Plating',
            description: '+2 Armor',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'armor',
            apply: (fighter) => {
                fighter.armor += 2;
            }
        },
        {
            id: 'siphon',
            name: 'Siphon',
            description: '+22% Lifesteal',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'lifesteal',
            apply: (fighter) => {
                fighter.lifesteal += 0.22;
            }
        },
        {
            id: 'keen_eye',
            name: 'Keen Eye',
            description: '+20% Crit Chance',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'crit',
            apply: (fighter) => {
                fighter.critChance += 0.20;
            }
        },

        // === STAT UPGRADES (Rare) ===
        {
            id: 'titan',
            name: 'Titan',
            description: '+40 Max HP',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'hp',
            apply: (fighter) => {
                fighter.maxHp += 40;
                fighter.hp += 40;
            }
        },
        {
            id: 'berserker',
            name: 'Berserker',
            description: '+32% Attack',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'attack',
            apply: (fighter) => {
                fighter.attackBonus += 0.32;
            }
        },
        {
            id: 'assassin',
            name: 'Assassin',
            description: '+25% Crit Chance',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'crit',
            apply: (fighter) => {
                fighter.critChance += 0.25;
            }
        },
        {
            id: 'leech',
            name: 'Leech',
            description: '+27% Lifesteal',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'lifesteal',
            apply: (fighter) => {
                fighter.lifesteal += 0.27;
            }
        },

        // === THORNS UPGRADES ===
        {
            id: 'spiked_armor',
            name: 'Spiked Armor',
            description: '+2 Thorns',
            rarity: 'common',
            type: 'stat',
            statCategory: 'thorns',
            apply: (fighter) => {
                fighter.thorns += 2;
            }
        },
        {
            id: 'bramble_shield',
            name: 'Brambles',
            description: '+3 Thorns',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'thorns',
            apply: (fighter) => {
                fighter.thorns += 3;
            }
        },
        {
            id: 'iron_maiden',
            name: 'Iron Maiden',
            description: '+4 Thorns',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'thorns',
            apply: (fighter) => {
                fighter.thorns += 4;
            }
        },

        // === REGEN UPGRADES ===
        {
            id: 'second_wind',
            name: 'Second Wind',
            description: '+0.8 Regen/tick',
            rarity: 'common',
            type: 'stat',
            statCategory: 'regen',
            apply: (fighter) => {
                fighter.regen += 0.8;
            }
        },
        {
            id: 'regeneration',
            name: 'Regeneration',
            description: '+1.2 Regen/tick',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'regen',
            apply: (fighter) => {
                fighter.regen += 1.2;
            }
        },
        {
            id: 'troll_blood',
            name: 'Troll Blood',
            description: '+1.6 Regen/tick',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'regen',
            apply: (fighter) => {
                fighter.regen += 1.6;
            }
        },

        // === EXECUTE UPGRADES ===
        {
            id: 'finishing_blow',
            name: 'Finisher',
            description: '+75% Execute',
            rarity: 'common',
            type: 'stat',
            statCategory: 'execute',
            apply: (fighter) => {
                fighter.execute += 0.75;
            }
        },
        {
            id: 'coup_de_grace',
            name: 'Coup de Grace',
            description: '+105% Execute',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'execute',
            apply: (fighter) => {
                fighter.execute += 1.05;
            }
        },
        {
            id: 'executioner',
            name: 'Executioner',
            description: '+140% Execute',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'execute',
            apply: (fighter) => {
                fighter.execute += 1.40;
            }
        },

        // === BLEED UPGRADES (single effect, refreshes on hit - doesn't stack) ===
        {
            id: 'serrated_edge',
            name: 'Serrated Edge',
            description: '+1% HP Bleed/tick',
            rarity: 'common',
            type: 'stat',
            statCategory: 'bleed',
            apply: (fighter) => {
                fighter.bleed += 0.01;
            }
        },
        {
            id: 'hemorrhage',
            name: 'Hemorrhage',
            description: '+1.5% HP Bleed/tick',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'bleed',
            apply: (fighter) => {
                fighter.bleed += 0.015;
            }
        },
        {
            id: 'bloodletter',
            name: 'Bloodletter',
            description: '+2% HP Bleed/tick',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'bleed',
            apply: (fighter) => {
                fighter.bleed += 0.02;
            }
        },

        // === STUN UPGRADES ===
        {
            id: 'disorienting_strike',
            name: 'Daze',
            description: '+12% Stun',
            rarity: 'common',
            type: 'stat',
            statCategory: 'stun',
            apply: (fighter) => {
                fighter.stunChance += 0.12;
            }
        },
        {
            id: 'concussive_blow',
            name: 'Concuss',
            description: '+16% Stun',
            rarity: 'uncommon',
            type: 'stat',
            statCategory: 'stun',
            apply: (fighter) => {
                fighter.stunChance += 0.16;
            }
        },
        {
            id: 'skull_cracker',
            name: 'Skull Cracker',
            description: '+22% Stun',
            rarity: 'rare',
            type: 'stat',
            statCategory: 'stun',
            apply: (fighter) => {
                fighter.stunChance += 0.22;
            }
        }
    ],

    // Current run state
    deck: [],           // Ordered deck of available upgrades
    currentChoices: [], // Currently drawn cards being shown
    playerPicksFirst: true, // Alternates each round

    // Card dimensions (from constants)
    get cardWidth() { return CONST.CARD_WIDTH; },
    get cardHeight() { return CONST.CARD_HEIGHT; },
    get cardSpacing() { return CONST.CARD_SPACING; },

    // Animation state
    animState: 'none',      // 'none', 'dealing', 'selecting', 'returning'
    animTimer: 0,
    animCardIndex: 0,       // Which card is currently animating
    get DEAL_TIME() { return CONST.DEAL_TIME; },
    get RETURN_TIME() { return CONST.RETURN_TIME; },
    get DECK_SCALE() { return CONST.DECK_SCALE; },
    cardPositions: [],      // Current animated positions [{x, y, scale}, ...]
    get deckX() { return CONST.DECK_X; },
    get deckPileBottomY() { return CONST.DECK_PILE_BOTTOM_Y; },
    get slotsY() { return CONST.UPGRADE_CARDS_Y; },
    get canvasWidth() { return CONST.WIDTH; },

    /**
     * Reset for a new run - build and shuffle deck
     */
    reset() {
        this.currentChoices = [];
        this.playerPicksFirst = true;
        this.buildDeck();
    },

    /**
     * Build and shuffle the deck for a new run
     * Interleaves categories so consecutive cards have different stats
     */
    buildDeck() {
        // Start with all cards from pool
        let allCards = [...this.pool];

        // Add a random legendary card
        const legendaryKeys = Object.keys(this.legendaryTemplates);
        const randomCategory = legendaryKeys[Math.floor(Math.random() * legendaryKeys.length)];
        allCards.push(this.legendaryTemplates[randomCategory]);

        // Group cards by category
        const byCategory = {};
        for (const card of allCards) {
            const cat = card.statCategory;
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(card);
        }

        // Shuffle each category group (Fisher-Yates)
        for (const cat in byCategory) {
            const group = byCategory[cat];
            for (let i = group.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [group[i], group[j]] = [group[j], group[i]];
            }
        }

        // Shuffle category order for variety
        const categoryKeys = Object.keys(byCategory);
        for (let i = categoryKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [categoryKeys[i], categoryKeys[j]] = [categoryKeys[j], categoryKeys[i]];
        }

        // Interleave: deal cards round-robin from categories
        this.deck = [];
        let cardsRemain = true;
        while (cardsRemain) {
            cardsRemain = false;
            for (const cat of categoryKeys) {
                if (byCategory[cat].length > 0) {
                    this.deck.push(byCategory[cat].shift());
                    cardsRemain = true;
                }
            }
        }
    },

    /**
     * Draw cards from the top of the deck
     * @param {number} count - Number of cards to draw
     * @returns {Array} - Drawn cards
     */
    drawCards(count = 3) {
        const drawn = [];
        for (let i = 0; i < count && this.deck.length > 0; i++) {
            drawn.push(this.deck.shift());
        }
        this.currentChoices = drawn;
        return drawn;
    },

    /**
     * Return unpicked cards to the bottom of the deck
     * @param {Array} cards - Cards to return
     */
    returnToBottom(cards) {
        for (const card of cards) {
            this.deck.push(card);
        }
    },

    /**
     * Pick a card - removes it from currentChoices, returns unpicked to bottom
     * @param {number} choiceIndex - Index of chosen card
     * @returns {object|null} - The picked card
     */
    pickCard(choiceIndex) {
        if (choiceIndex < 0 || choiceIndex >= this.currentChoices.length) {
            return null;
        }

        const picked = this.currentChoices[choiceIndex];
        const unpicked = this.currentChoices.filter((_, i) => i !== choiceIndex);

        // Return unpicked cards to bottom of deck
        this.returnToBottom(unpicked);

        this.currentChoices = [];
        return picked;
    },

    /**
     * Get deck top position (where cards are dealt from)
     * Returns position for full-size card so its center aligns with deck card center
     */
    getDeckTopPosition() {
        const maxVisible = Math.min(this.deck.length + this.currentChoices.length, 20);
        const deckCardW = CONST.DECK_CARD_WIDTH;
        const deckCardH = CONST.DECK_CARD_HEIGHT;
        // Deck card top-left position (top card of pile)
        // renderDeckPile draws bottom card at (deckX, deckPileBottomY - deckCardH)
        // Each card above is offset by (-0.25, -0.25)
        const deckCardX = this.deckX + (maxVisible - 1) * (-0.25);
        const deckCardY = this.deckPileBottomY - deckCardH - (maxVisible - 1) * 0.25;
        // Deck card center
        const deckCenterX = deckCardX + deckCardW / 2;
        const deckCenterY = deckCardY + deckCardH / 2;
        // Full card position so its center matches deck center
        return {
            x: deckCenterX - this.cardWidth / 2,
            y: deckCenterY - this.cardHeight / 2
        };
    },

    /**
     * Get deck bottom position (where cards return to)
     * Returns position for full-size card so its center aligns with deck card center
     */
    getDeckBottomPosition() {
        const deckCardW = CONST.DECK_CARD_WIDTH;
        const deckCardH = CONST.DECK_CARD_HEIGHT;
        // Deck card top-left at bottom of pile
        const deckCardX = this.deckX;
        const deckCardY = this.deckPileBottomY - deckCardH;
        // Deck card center
        const deckCenterX = deckCardX + deckCardW / 2;
        const deckCenterY = deckCardY + deckCardH / 2;
        // Full card position so its center matches deck center
        return {
            x: deckCenterX - this.cardWidth / 2,
            y: deckCenterY - this.cardHeight / 2
        };
    },

    /**
     * Get slot position for a card
     */
    getSlotPosition(index, total) {
        const totalWidth = (this.cardWidth * total) + (this.cardSpacing * (total - 1));
        const startX = (this.canvasWidth - totalWidth) / 2;
        return {
            x: startX + (index * (this.cardWidth + this.cardSpacing)),
            y: this.slotsY
        };
    },

    /**
     * Start dealing animation
     */
    startDealAnimation() {
        this.animState = 'dealing';
        this.animTimer = 0;
        this.animCardIndex = 0;
        this.cardPositions = [];

        // Initialize all cards at deck position
        const deckPos = this.getDeckTopPosition();
        for (let i = 0; i < this.currentChoices.length; i++) {
            this.cardPositions.push({ x: deckPos.x, y: deckPos.y });
        }
    },

    /**
     * Start return animation for unpicked cards
     * @param {number} pickedIndex - Index of the picked card (to exclude)
     */
    startReturnAnimation(pickedIndex) {
        this.animState = 'returning';
        this.animTimer = 0;
        this.animCardIndex = 0;
        this.pickedIndex = pickedIndex;

        // Initialize card positions to slot positions
        const total = this.currentChoices.length;
        this.cardPositions = [];
        for (let i = 0; i < total; i++) {
            const slotPos = this.getSlotPosition(i, total);
            this.cardPositions.push({ x: slotPos.x, y: slotPos.y });
        }
    },

    /**
     * Update card animations
     * @param {number} dt - Delta time
     * @returns {boolean} - True if animation is complete
     */
    updateAnimation(dt) {
        if (this.animState === 'none') return true;

        this.animTimer += dt;

        if (this.animState === 'dealing') {
            return this.updateDealAnimation();
        } else if (this.animState === 'returning') {
            return this.updateReturnAnimation();
        }

        return true;
    },

    updateDealAnimation() {
        const total = this.currentChoices.length;
        const cardTime = this.DEAL_TIME;
        const totalTime = cardTime * total;

        for (let i = 0; i < total; i++) {
            const cardStartTime = i * cardTime;
            const cardProgress = Math.max(0, Math.min(1, (this.animTimer - cardStartTime) / cardTime));

            const deckPos = this.getDeckTopPosition();
            const slotPos = this.getSlotPosition(i, total);

            // Ease out cubic
            const t = 1 - Math.pow(1 - cardProgress, 3);

            this.cardPositions[i] = {
                x: deckPos.x + (slotPos.x - deckPos.x) * t,
                y: deckPos.y + (slotPos.y - deckPos.y) * t,
                scale: this.DECK_SCALE + (1 - this.DECK_SCALE) * t
            };
        }

        if (this.animTimer >= totalTime) {
            this.animState = 'selecting';
            return true;
        }
        return false;
    },

    updateReturnAnimation() {
        const total = this.currentChoices.length;
        const cardTime = this.RETURN_TIME;

        // Count unpicked cards and animate them
        let unpickedIndex = 0;
        for (let i = 0; i < total; i++) {
            if (i === this.pickedIndex) continue;

            const cardStartTime = unpickedIndex * cardTime;
            const cardProgress = Math.max(0, Math.min(1, (this.animTimer - cardStartTime) / cardTime));

            const slotPos = this.getSlotPosition(i, total);
            const deckPos = this.getDeckBottomPosition();

            // Ease in cubic
            const t = Math.pow(cardProgress, 3);

            this.cardPositions[i] = {
                x: slotPos.x + (deckPos.x - slotPos.x) * t,
                y: slotPos.y + (deckPos.y - slotPos.y) * t,
                scale: 1 - (1 - this.DECK_SCALE) * t
            };

            unpickedIndex++;
        }

        const unpickedCount = total - 1;
        const totalTime = cardTime * unpickedCount;

        if (this.animTimer >= totalTime) {
            this.animState = 'none';
            return true;
        }
        return false;
    },

    /**
     * Render cards with animation
     */
    renderAnimatedCards(ctx, hoverIndex = -1, selectedIndex = -1) {
        const cards = this.currentChoices;
        if (cards.length === 0) return;

        for (let i = 0; i < cards.length; i++) {
            const upgrade = cards[i];
            const pos = this.cardPositions[i] || this.getSlotPosition(i, cards.length);
            const isHover = (i === hoverIndex) && this.animState === 'selecting';
            const isSelected = (i === selectedIndex);
            const scale = pos.scale !== undefined ? pos.scale : 1;

            // Skip rendering returned cards
            if (this.animState === 'returning' && i !== this.pickedIndex) {
                const slotPos = this.getSlotPosition(i, cards.length);
                const deckPos = this.getDeckBottomPosition();
                // If card has reached deck, don't render
                if (Math.abs(pos.x - deckPos.x) < 1 && Math.abs(pos.y - deckPos.y) < 1) {
                    continue;
                }
            }

            // Raise selected card
            let cardY = pos.y;
            if (isSelected) cardY -= 40;

            // Dim non-selected cards when one is selected
            const dimmed = (selectedIndex >= 0 && !isSelected);

            this.renderCard(ctx, upgrade, pos.x, cardY, isHover, dimmed, scale);
        }
    },

    /**
     * Get upgrade by ID
     * @param {string} id - Upgrade ID
     * @returns {object|null} - Upgrade object or null
     */
    getUpgradeById(id) {
        return this.pool.find(u => u.id === id) || null;
    },

    /**
     * Apply a picked card to a fighter
     * @param {object} upgrade - The upgrade to apply
     * @param {Fighter} fighter - Fighter to apply upgrade to
     */
    applyUpgrade(upgrade, fighter) {
        upgrade.apply(fighter);
        fighter.upgrades.push(upgrade.id);
    },

    /**
     * Get card bounds for hit testing
     * @param {number} index - Card index
     * @param {number} totalCards - Total number of cards
     * @param {number} canvasWidth - Canvas width
     * @param {number} startY - Y position of cards
     * @returns {object} - {x, y, width, height}
     */
    getCardBounds(index, totalCards, canvasWidth, startY) {
        const totalWidth = (this.cardWidth * totalCards) + (this.cardSpacing * (totalCards - 1));
        const startX = (canvasWidth - totalWidth) / 2;
        const x = startX + (index * (this.cardWidth + this.cardSpacing));

        return {
            x: x,
            y: startY,
            width: this.cardWidth,
            height: this.cardHeight
        };
    },

    /**
     * Render upgrade cards
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasWidth - Canvas width
     * @param {number} startY - Y position to start rendering
     * @param {number} hoverIndex - Index of hovered card (-1 for none)
     * @param {number} selectedIndex - Index of selected card to raise (-1 for none)
     */
    renderCards(ctx, canvasWidth, startY, hoverIndex = -1, selectedIndex = -1) {
        const cards = this.currentChoices;
        if (cards.length === 0) return;

        for (let i = 0; i < cards.length; i++) {
            const upgrade = cards[i];
            const bounds = this.getCardBounds(i, cards.length, canvasWidth, startY);
            const isHover = (i === hoverIndex);
            const isSelected = (i === selectedIndex);

            // Raise selected card
            const cardY = isSelected ? bounds.y - 40 : bounds.y;
            // Dim non-selected cards when one is selected
            const dimmed = (selectedIndex >= 0 && !isSelected);

            this.renderCard(ctx, upgrade, bounds.x, cardY, isHover, dimmed);
        }
    },

    /**
     * Render a single upgrade card
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {object} upgrade - Upgrade data
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {boolean} isHover - Whether card is hovered
     * @param {boolean} dimmed - Whether card should be dimmed
     * @param {number} scale - Scale factor (1 = full size)
     */
    renderCard(ctx, upgrade, x, y, isHover, dimmed = false, scale = 1) {
        const w = this.cardWidth;
        const h = this.cardHeight;
        const rarityColor = this.rarityColors[upgrade.rarity] || this.rarityColors.common;

        ctx.save();
        if (dimmed) {
            ctx.globalAlpha = 0.3;
        }

        // Apply scale from card center
        if (scale !== 1) {
            const centerX = x + w / 2;
            const centerY = y + h / 2;
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);
            ctx.translate(-centerX, -centerY);
        }

        // Card background
        ctx.fillStyle = isHover ? '#3a3a5a' : '#2a2a4a';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();

        // Rarity border
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = isHover ? 3 : 2;
        ctx.stroke();

        // Rarity indicator (top bar)
        ctx.fillStyle = rarityColor;
        ctx.beginPath();
        ctx.roundRect(x, y, w, 6, [8, 8, 0, 0]);
        ctx.fill();

        // Upgrade name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(upgrade.name, x + w / 2, y + 35);

        // Rarity text
        ctx.fillStyle = rarityColor;
        ctx.font = '10px sans-serif';
        ctx.fillText(upgrade.rarity.toUpperCase(), x + w / 2, y + 55);

        // Description (word wrap)
        ctx.fillStyle = '#cccccc';
        ctx.font = '12px sans-serif';
        this.wrapText(ctx, upgrade.description, x + w / 2, y + 85, w - 16, 16);

        // Hover effect - "TAP" indicator
        if (isHover && !dimmed) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('TAP', x + w / 2, y + h - 15);
        }

        ctx.restore();
    },

    /**
     * Simple word wrap for card descriptions
     */
    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lineY = y;

        for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line.trim(), x, lineY);
                line = word + ' ';
                lineY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, lineY);
    },

    /**
     * Render the deck pile showing remaining cards
     * Uses CONST.DECK_X and CONST.DECK_PILE_BOTTOM_Y for positioning
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderDeckPile(ctx) {
        const remaining = this.deck.length;
        if (remaining === 0) return;

        const x = CONST.DECK_X;
        const y = CONST.DECK_PILE_BOTTOM_Y;
        const cardW = CONST.DECK_CARD_WIDTH;
        const cardH = CONST.DECK_CARD_HEIGHT;
        const offsetX = -0.25;  // Offset per card to the left
        const offsetY = 0.25;   // Offset per card up
        const maxVisible = Math.min(remaining, 20); // Cap visual stack

        ctx.save();

        // Draw cards from bottom to top (bottom card at base position)
        for (let i = 0; i < maxVisible; i++) {
            const cardX = x + i * offsetX;
            const cardY = y - cardH - i * offsetY;

            // Card back
            ctx.fillStyle = '#2a2a4a';
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardW, cardH, 3);
            ctx.fill();

            // Border
            ctx.strokeStyle = '#4a4a6a';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.restore();
    },

    /**
     * Check which card is under the pointer
     * @param {number} px - Pointer X
     * @param {number} py - Pointer Y
     * @param {number} canvasWidth - Canvas width
     * @param {number} startY - Y position of cards
     * @returns {number} - Card index or -1
     */
    getCardAtPoint(px, py, canvasWidth, startY) {
        for (let i = 0; i < this.currentChoices.length; i++) {
            const bounds = this.getCardBounds(i, this.currentChoices.length, canvasWidth, startY);
            if (px >= bounds.x && px <= bounds.x + bounds.width &&
                py >= bounds.y && py <= bounds.y + bounds.height) {
                return i;
            }
        }
        return -1;
    }
};
