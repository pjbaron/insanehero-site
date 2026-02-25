/**
 * Stick Rivals
 * A browser-based auto-battler with stick figure combat
 */

const Game = {
    // Canvas and rendering
    canvas: null,
    ctx: null,

    // Game dimensions (from constants)
    get WIDTH() { return CONST.WIDTH; },
    get HEIGHT() { return CONST.HEIGHT; },

    // Scaling for responsive display
    scale: 1,
    dpr: 1, // Device pixel ratio for HiDPI support
    offsetX: 0,
    offsetY: 0,

    // Timing
    lastTime: 0,
    deltaTime: 0,
    fps: 0,
    frameCount: 0,
    fpsUpdateTime: 0,

    // Game state
    state: 'menu', // menu, rivalIntro, upgrade, rivalPick, combat, dialogue, result, rivalDefeated, gameWon
    round: 1,
    isRunning: false,

    // Win condition (from constants)
    get ROUNDS_TO_WIN() { return CONST.ROUNDS_TO_WIN; },

    // Fighters
    player: null,

    // Upgrade state (from constants)
    get upgradeCardsY() { return CONST.UPGRADE_CARDS_Y; },
    hoveredCard: -1,
    lastPickedUpgrade: null,

    // Rival state
    rivalPickedUpgrade: null,

    // Dialogue state
    dialogueText: '',
    lastCombatWasCloseCall: false,

    // Colors (theme)
    colors: {
        backgroundTop: '#1a1a2e',
        backgroundBottom: '#0f0f1a',
        player: '#2ecc71',
        enemy: '#3498db',
        accent: '#2ecc71',
        text: '#ffffff',
        textDim: '#888888',
        health: '#2ecc71',
        healthBg: '#333333',
        damage: '#e74c3c'
    },

    // Background gradient (created on init)
    bgGradient: null,

    /**
     * Get a human-readable message describing the killing blow
     * @param {object} killingBlow - The killing blow info from Combat
     * @param {boolean} playerWon - Whether the player won the fight
     * @returns {string} - Description of what happened
     */
    getKillMessage(killingBlow, playerWon) {
        if (!killingBlow) return '';

        const killTypes = {
            normal: playerWon ? 'Finished with a solid blow' : 'Defeated by a direct hit',
            crit: playerWon ? 'Finished with a critical strike!' : 'Defeated by a critical hit!',
            execute: playerWon ? 'Executed at low health!' : 'Defeated by an execute!',
            bleed: playerWon ? 'They bled out from their wounds!' : 'Defeated by bleed damage',
            thorns: playerWon ? 'Defeated by your thorns!' : 'Defeated by thorns damage'
        };

        return killTypes[killingBlow.type] || '';
    },

    /**
     * Initialize the game
     */
    async init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Set up responsive canvas
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Initialize input
        Input.init(this.canvas);

        // Preload animations
        try {
            await AnimationLoader.preload(PRELOAD_ANIMATIONS);
            //console.log('Animations loaded successfully');
        } catch (error) {
            console.warn('Failed to load some animations, using fallback:', error);
        }

        // Create player fighter
        this.player = new Fighter(true);

        // Initialize player animation to idle
        this.player.animController.setState('idle');

        // Set fighter positions
        this.player.x = this.WIDTH * CONST.PLAYER_X_RATIO;
        this.player.y = this.HEIGHT * CONST.PLAYER_Y_RATIO;

        // Start game loop
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));

        //console.log('Stick Rivals initialized');
    },

    /**
     * Handle window resize - scale canvas to fit while maintaining aspect ratio
     */
    resize() {
        const container = document.getElementById('game-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Get device pixel ratio for HiDPI/Retina support
        this.dpr = window.devicePixelRatio || 1;

        // Calculate scale to fit container (portrait orientation primary)
        const scaleX = containerWidth / this.WIDTH;
        const scaleY = containerHeight / this.HEIGHT;
        this.scale = Math.min(scaleX, scaleY);

        // Set canvas display size (CSS pixels)
        const displayWidth = Math.floor(this.WIDTH * this.scale);
        const displayHeight = Math.floor(this.HEIGHT * this.scale);

        // Canvas buffer must match exact physical pixels for crisp rendering
        // Physical pixels = CSS pixels × devicePixelRatio
        const bufferWidth = Math.floor(displayWidth * this.dpr);
        const bufferHeight = Math.floor(displayHeight * this.dpr);

        // Set canvas buffer size to match physical pixels exactly
        // Note: Setting canvas.width/height resets the context transform
        this.canvas.width = bufferWidth;
        this.canvas.height = bufferHeight;

        // Set display size via CSS
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';

        // Scale context from logical coordinates to physical pixels
        // Combined scale = display scale × device pixel ratio
        const totalScale = this.scale * this.dpr;
        this.ctx.setTransform(totalScale, 0, 0, totalScale, 0, 0);

        // Disable image smoothing for crisp edges
        this.ctx.imageSmoothingEnabled = false;

        // Calculate offset for centering
        this.offsetX = 0;
        this.offsetY = 0;

        // Update input transform
        Input.setTransform(this.scale, this.offsetX, this.offsetY);
        Input.updateCanvasRect();

        // Create background gradient
        this.bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.HEIGHT);
        this.bgGradient.addColorStop(0, this.colors.backgroundTop);
        this.bgGradient.addColorStop(1, this.colors.backgroundBottom);
    },

    /**
     * Main game loop - fixed timestep with variable rendering
     */
    loop(currentTime) {
        if (!this.isRunning) return;

        // Calculate delta time (capped to prevent spiral of death)
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }

        // Update game logic
        this.update(this.deltaTime);

        // Render
        this.render();

        // Clear frame-specific input state
        Input.endFrame();

        // Schedule next frame
        requestAnimationFrame((time) => this.loop(time));
    },

    /**
     * Update game logic based on current state
     */
    update(dt) {
        switch (this.state) {
            case 'menu':
                this.updateMenu(dt);
                break;
            case 'rivalIntro':
                this.updateRivalIntro(dt);
                break;
            case 'playerDealing':
                this.updatePlayerDealing(dt);
                break;
            case 'upgrade':
                this.updateUpgrade(dt);
                break;
            case 'upgradeSelected':
                this.updateUpgradeSelected(dt);
                break;
            case 'playerReturning':
                this.updatePlayerReturning(dt);
                break;
            case 'rivalDealing':
                this.updateRivalDealing(dt);
                break;
            case 'rivalUpgrade':
                this.updateRivalUpgrade(dt);
                break;
            case 'rivalReturning':
                this.updateRivalReturning(dt);
                break;
            case 'combat':
                this.updateCombat(dt);
                break;
            case 'combatEnd':
                this.updateCombatEnd(dt);
                break;
            case 'dialogue':
                this.updateDialogue(dt);
                break;
            case 'result':
                this.updateResult(dt);
                break;
            case 'rivalDefeated':
                this.updateRivalDefeated(dt);
                break;
            case 'gameWon':
                this.updateGameWon(dt);
                break;
        }
    },

    /**
     * Render game based on current state
     */
    render() {
        const ctx = this.ctx;

        // Clear canvas with gradient background
        ctx.fillStyle = this.bgGradient || this.colors.backgroundTop;
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Render current state
        switch (this.state) {
            case 'menu':
                this.renderMenu();
                break;
            case 'rivalIntro':
                this.renderRivalIntro();
                break;
            case 'playerDealing':
                this.renderPlayerDealing();
                break;
            case 'upgrade':
                this.renderUpgrade();
                break;
            case 'upgradeSelected':
                this.renderUpgradeSelected();
                break;
            case 'playerReturning':
                this.renderPlayerReturning();
                break;
            case 'rivalDealing':
                this.renderRivalDealing();
                break;
            case 'rivalUpgrade':
                this.renderRivalUpgrade();
                break;
            case 'rivalReturning':
                this.renderRivalReturning();
                break;
            case 'combat':
                this.renderCombat();
                break;
            case 'combatEnd':
                this.renderCombatEnd();
                break;
            case 'dialogue':
                this.renderDialogue();
                break;
            case 'result':
                this.renderResult();
                break;
            case 'rivalDefeated':
                this.renderRivalDefeated();
                break;
            case 'gameWon':
                this.renderGameWon();
                break;
        }
    },

    // ========== MENU STATE ==========

    // Reset confirmation state
    showResetConfirm: false,

    updateMenu(dt) {
        // Check for start button tap
        const btnX = this.WIDTH / 2 - 80;
        const btnY = this.HEIGHT / 2 + 60;
        const btnW = 160;
        const btnH = 60;

        if (Input.isTapped(btnX, btnY, btnW, btnH)) {
            this.startNewRun();
        }
    },

    renderMenu() {
        const ctx = this.ctx;

        // Title
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('STICK RIVALS', this.WIDTH / 2, this.HEIGHT / 2 - 100);

        // Subtitle
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Deck Building Auto-Battler', this.WIDTH / 2, this.HEIGHT / 2 - 55);

        // Progress indicator
        const savedRival = Storage.get('currentRival');
        const rivalIndex = Rival.rivalOrder.findIndex(r => r.personality === savedRival);

        if (rivalIndex > 0) {
            // Show progress
            ctx.fillStyle = this.colors.accent;
            ctx.font = '14px sans-serif';
            ctx.fillText(`Progress: ${rivalIndex}/${Rival.rivalOrder.length} rivals defeated`, this.WIDTH / 2, this.HEIGHT / 2 + 15);

            const nextRival = Rival.rivalOrder[rivalIndex];
            ctx.fillStyle = this.colors.enemy;
            ctx.fillText(`Next: ${nextRival.name}`, this.WIDTH / 2, this.HEIGHT / 2 + 35);
        } else if (savedRival === 'completed') {
            ctx.fillStyle = '#ffd700';
            ctx.font = '14px sans-serif';
            ctx.fillText('CHAMPION - All rivals defeated!', this.WIDTH / 2, this.HEIGHT / 2 + 15);
        }

        // Start button
        const btnX = this.WIDTH / 2 - 80;
        const btnY = this.HEIGHT / 2 + 60;
        const btnW = 160;
        const btnH = 60;

        const isHover = Input.isOver(btnX, btnY, btnW, btnH);

        ctx.fillStyle = isHover ? '#4a4a6a' : '#2a2a4a';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 20px sans-serif';

        if (rivalIndex > 0) {
            ctx.fillText('CONTINUE', this.WIDTH / 2, btnY + btnH / 2);
        } else {
            ctx.fillText('START', this.WIDTH / 2, btnY + btnH / 2);
        }
    },

    // ========== UPGRADE STATE ==========

    // Selection animation state
    selectedCardIndex: -1,
    selectionTimer: 0,
    get SELECTION_HOLD_TIME() { return CONST.SELECTION_HOLD_TIME; },
    returnWaitTimer: 0,
    get RETURN_WAIT_TIME() { return CONST.RETURN_WAIT_TIME; },

    enterUpgradeState() {
        this.hoveredCard = -1;
        this.selectedCardIndex = -1;
        Input.pointer.justPressed = false;

        // Reset fighter scales after combat
        this.player.scale = 1.0;
        Rival.fighter.scale = 1.0;

        // Start healing animation and reset animation state for both fighters
        this.player.startHealAnimation(1.0);
        this.player.animState = 'idle';
        if (this.player.useMocap) {
            this.player.animController.setState('idle');
        }

        Rival.fighter.startHealAnimation(1.0);
        Rival.fighter.animState = 'idle';
        if (Rival.fighter.useMocap) {
            Rival.fighter.animController.setState('idle');
        }

        // Check who picks first this round
        if (Upgrades.playerPicksFirst) {
            this.startPlayerPick();
        } else {
            this.startRivalPick();
        }
    },

    startPlayerPick() {
        // Draw 3 cards for player
        const choices = Upgrades.drawCards(3);

        if (choices.length === 0) {
            // No cards left, skip to combat
            this.startCombat();
            return;
        }

        // Start deal animation
        Upgrades.startDealAnimation();
        this.state = 'playerDealing';
    },

    startRivalPick() {
        // Draw 3 cards for rival
        const choices = Upgrades.drawCards(3);

        if (choices.length === 0) {
            // No cards left, skip to combat
            this.startCombat();
            return;
        }

        // Final rival gets no rare+ cards in early rounds
        if (Rival.isFinalRival() && this.round <= 2) {
            const blocked = ['rare', 'legendary'];
            for (let i = 0; i < choices.length; i++) {
                if (blocked.includes(choices[i].rarity)) {
                    // Swap with a non-rare card from deck
                    const swapIdx = Upgrades.deck.findIndex(c => !blocked.includes(c.rarity));
                    if (swapIdx !== -1) {
                        const swap = Upgrades.deck.splice(swapIdx, 1)[0];
                        Upgrades.deck.push(choices[i]); // Return rare to deck
                        choices[i] = swap;
                        Upgrades.currentChoices[i] = swap;
                    }
                }
            }
        }

        // Start deal animation
        Upgrades.startDealAnimation();
        this.state = 'rivalDealing';
    },

    // Player dealing animation
    updatePlayerDealing(dt) {
        this.player.update(dt);
        if (Upgrades.updateAnimation(dt)) {
            // Dealing done, allow selection
            this.state = 'upgrade';
        }
    },

    renderPlayerDealing() {
        const ctx = this.ctx;

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('YOUR TURN', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        this.player.x = this.WIDTH / 2;
        this.player.y = 170;
        this.player.render(ctx, this.colors.player);

        Upgrades.renderDeckPile(ctx);
        Upgrades.renderAnimatedCards(ctx);

        this.renderPlayerStats();
    },

    // Rival dealing animation
    updateRivalDealing(dt) {
        this.player.update(dt);
        Rival.fighter.update(dt);
        if (Upgrades.updateAnimation(dt)) {
            // Dealing done, rival selects
            const playerLastCategory = this.lastPickedUpgrade ? this.lastPickedUpgrade.statCategory : null;
            this.selectedCardIndex = Rival.selectCardIndex(Upgrades.currentChoices, playerLastCategory);
            this.selectionTimer = this.SELECTION_HOLD_TIME;
            this.state = 'rivalUpgrade';

            // Play flexing animation when rival picks a card
            if (Rival.fighter.useMocap) {
                Rival.fighter.animController.setState('flexing');
            }
        }
    },

    renderRivalDealing() {
        const ctx = this.ctx;

        ctx.fillStyle = this.colors.enemy;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RIVAL\'S TURN', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        Rival.fighter.x = this.WIDTH / 2;
        Rival.fighter.y = 170;
        Rival.fighter.render(ctx, this.colors.enemy);

        Upgrades.renderDeckPile(ctx);
        Upgrades.renderAnimatedCards(ctx);

        this.renderRivalStats();
    },

    updateUpgrade(dt) {
        // Update fighter animations
        this.player.update(dt);

        // Check which card is hovered
        const px = Input.pointer.x;
        const py = Input.pointer.y;
        this.hoveredCard = Upgrades.getCardAtPoint(px, py, this.WIDTH, this.upgradeCardsY);

        // Check for card tap
        if (Input.pointer.justPressed && this.hoveredCard >= 0) {
            this.selectedCardIndex = this.hoveredCard;
            this.selectionTimer = this.SELECTION_HOLD_TIME;
            this.state = 'upgradeSelected';

            // Play flexing animation when card is selected
            if (this.player.useMocap) {
                this.player.animController.setState('flexing');
            }
        }
    },

    updateUpgradeSelected(dt) {
        this.player.update(dt);
        this.selectionTimer -= dt;

        if (this.selectionTimer <= 0) {
            // Start return animation (before pickCard clears choices)
            Upgrades.startReturnAnimation(this.selectedCardIndex);
            this.returnWaitTimer = 0;
            this.state = 'playerReturning';
        }
    },

    updatePlayerReturning(dt) {
        this.player.update(dt);

        // Still animating
        if (!Upgrades.updateAnimation(dt)) {
            return;
        }

        // Animation just finished - start wait timer and pick the card
        if (this.returnWaitTimer === 0) {
            this.returnWaitTimer = this.RETURN_WAIT_TIME;

            const upgrade = Upgrades.pickCard(this.selectedCardIndex);
            if (upgrade) {
                Upgrades.applyUpgrade(upgrade, this.player);
                this.lastPickedUpgrade = upgrade;
            }
            this.selectedCardIndex = -1;
        }

        // Count down wait timer
        this.returnWaitTimer -= dt;

        // Wait done - transition to next state
        if (this.returnWaitTimer <= 0) {
            this.returnWaitTimer = 0;
            if (Upgrades.playerPicksFirst) {
                this.startRivalPick();
            } else {
                // Both have picked, toggle and start combat
                Upgrades.playerPicksFirst = !Upgrades.playerPicksFirst;
                this.startCombat();
            }
        }
    },

    renderPlayerReturning() {
        const ctx = this.ctx;

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('YOU CHOSE', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        this.player.x = this.WIDTH / 2;
        this.player.y = 170;
        this.player.render(ctx, this.colors.player);

        Upgrades.renderDeckPile(ctx);
        Upgrades.renderAnimatedCards(ctx, -1, this.selectedCardIndex);

        this.renderPlayerStats();
    },

    updateRivalUpgrade(dt) {
        this.player.update(dt);
        Rival.fighter.update(dt);
        this.selectionTimer -= dt;

        if (this.selectionTimer <= 0) {
            // Start return animation (before pickCard clears choices)
            Upgrades.startReturnAnimation(this.selectedCardIndex);
            this.returnWaitTimer = 0;
            this.state = 'rivalReturning';
        }
    },

    updateRivalReturning(dt) {
        this.player.update(dt);
        Rival.fighter.update(dt);

        // Still animating
        if (!Upgrades.updateAnimation(dt)) {
            return;
        }

        // Animation just finished - start wait timer and pick the card
        if (this.returnWaitTimer === 0) {
            this.returnWaitTimer = this.RETURN_WAIT_TIME;

            const upgrade = Upgrades.pickCard(this.selectedCardIndex);
            if (upgrade) {
                Rival.applyUpgrade(upgrade);
                this.rivalPickedUpgrade = upgrade;
            }
            this.selectedCardIndex = -1;
        }

        // Count down wait timer
        this.returnWaitTimer -= dt;

        // Wait done - transition to next state
        if (this.returnWaitTimer <= 0) {
            this.returnWaitTimer = 0;
            if (!Upgrades.playerPicksFirst) {
                this.startPlayerPick();
            } else {
                // Both have picked, toggle and start combat
                Upgrades.playerPicksFirst = !Upgrades.playerPicksFirst;
                this.startCombat();
            }
        }
    },

    renderRivalReturning() {
        const ctx = this.ctx;

        ctx.fillStyle = this.colors.enemy;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RIVAL CHOSE', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        Rival.fighter.x = this.WIDTH / 2;
        Rival.fighter.y = 170;
        Rival.fighter.render(ctx, this.colors.enemy);

        Upgrades.renderDeckPile(ctx);
        Upgrades.renderAnimatedCards(ctx, -1, this.selectedCardIndex);

        this.renderRivalStats();
    },

    renderUpgrade() {
        const ctx = this.ctx;

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CHOOSE UPGRADE', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        // Render player preview
        this.player.x = this.WIDTH / 2;
        this.player.y = 170;
        this.player.render(ctx, this.colors.player);

        // Render upgrade cards
        Upgrades.renderCards(ctx, this.WIDTH, this.upgradeCardsY, this.hoveredCard);

        // Render deck pile
        Upgrades.renderDeckPile(ctx);

        // Instruction text
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '14px sans-serif';
        ctx.fillText('Tap a card to select', this.WIDTH / 2, this.upgradeCardsY + 180);

        // Show player stats
        this.renderPlayerStats();
    },

    /**
     * Render fighter stats in 3-column layout
     * @param {Fighter} fighter - Fighter to show stats for
     * @param {number} startY - Y position to start rendering
     * @param {boolean} showCurrentHp - Show current/max HP (true) or just max (false)
     */
    renderFighterStats(fighter, startY, showCurrentHp = true) {
        const ctx = this.ctx;
        const stats = fighter.getStats();
        const lineHeight = 14;

        ctx.fillStyle = this.colors.text;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';

        const col1X = 10;
        const col2X = 140;
        const col3X = 275;

        // Column 1: Core stats
        const hpText = showCurrentHp ? `HP: ${fighter.getDisplayHp()}/${stats.maxHp}` : `HP: ${stats.maxHp}`;
        ctx.fillText(hpText, col1X, startY);
        ctx.fillText(`Attack: ${stats.attack}`, col1X, startY + lineHeight);
        ctx.fillText(`Speed: ${stats.attackSpeed.toFixed(2)}`, col1X, startY + lineHeight * 2);
        ctx.fillText(`Armor: ${stats.armor.toFixed(1)}`, col1X, startY + lineHeight * 3);

        // Column 2: Offensive stats
        ctx.fillText(`Crit: ${(stats.critChance * 100).toFixed(0)}%`, col2X, startY);
        ctx.fillText(`Lifesteal: ${(stats.lifesteal * 100).toFixed(0)}%`, col2X, startY + lineHeight);
        ctx.fillText(`Execute: ${(stats.execute * 100).toFixed(0)}%`, col2X, startY + lineHeight * 2);
        ctx.fillText(`Bleed: ${(stats.bleed * 100).toFixed(1)}%/tick`, col2X, startY + lineHeight * 3);

        // Column 3: Defensive/utility stats
        ctx.fillText(`Thorns: ${stats.thorns.toFixed(0)}`, col3X, startY);
        ctx.fillText(`Regen: ${stats.regen.toFixed(1)}/tick`, col3X, startY + lineHeight);
        ctx.fillText(`Stun: ${(stats.stunChance * 100).toFixed(0)}%`, col3X, startY + lineHeight * 2);

    },

    renderPlayerStats() {
        this.renderFighterStats(this.player, this.HEIGHT - 115, true);
    },

    // ========== UPGRADE SELECTED STATE (animation) ==========

    renderUpgradeSelected() {
        const ctx = this.ctx;

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('YOU CHOSE', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        // Render player preview
        this.player.x = this.WIDTH / 2;
        this.player.y = 170;
        this.player.render(ctx, this.colors.player);

        // Render cards with selected one raised
        Upgrades.renderCards(ctx, this.WIDTH, this.upgradeCardsY, -1, this.selectedCardIndex);

        // Render deck pile
        Upgrades.renderDeckPile(ctx);

        this.renderPlayerStats();
    },

    // ========== RIVAL UPGRADE STATE ==========

    renderRivalUpgrade() {
        const ctx = this.ctx;

        ctx.fillStyle = this.colors.enemy;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RIVAL CHOOSES', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        // Render rival preview
        Rival.fighter.x = this.WIDTH / 2;
        Rival.fighter.y = 170;
        Rival.fighter.render(ctx, this.colors.enemy);

        // Render cards with selected one raised
        Upgrades.renderCards(ctx, this.WIDTH, this.upgradeCardsY, -1, this.selectedCardIndex);

        // Render deck pile
        Upgrades.renderDeckPile(ctx);

        // Show rival stats
        this.renderRivalStats();
    },

    renderRivalStats() {
        const ctx = this.ctx;
        const stats = Rival.fighter.getStats();
        const startY = this.HEIGHT - 115;
        const lineHeight = 14;

        ctx.fillStyle = this.colors.text;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';

        const col1X = 10;
        const col2X = 140;
        const col3X = 275;

        // Column 1: Core stats
        ctx.fillText(`HP: ${stats.maxHp}/${stats.maxHp}`, col1X, startY);
        ctx.fillText(`Attack: ${stats.attack}`, col1X, startY + lineHeight);
        ctx.fillText(`Speed: ${stats.attackSpeed.toFixed(2)}`, col1X, startY + lineHeight * 2);
        ctx.fillText(`Armor: ${stats.armor.toFixed(1)}`, col1X, startY + lineHeight * 3);

        // Column 2: Offensive stats
        ctx.fillText(`Crit: ${(stats.critChance * 100).toFixed(0)}%`, col2X, startY);
        ctx.fillText(`Lifesteal: ${(stats.lifesteal * 100).toFixed(0)}%`, col2X, startY + lineHeight);
        ctx.fillText(`Execute: ${(stats.execute * 100).toFixed(0)}%`, col2X, startY + lineHeight * 2);
        ctx.fillText(`Bleed: ${(stats.bleed * 100).toFixed(1)}%/tick`, col2X, startY + lineHeight * 3);

        // Column 3: Defensive/utility stats
        ctx.fillText(`Thorns: ${stats.thorns.toFixed(0)}`, col3X, startY);
        ctx.fillText(`Regen: ${stats.regen.toFixed(1)}/tick`, col3X, startY + lineHeight);
        ctx.fillText(`Stun: ${(stats.stunChance * 100).toFixed(0)}%`, col3X, startY + lineHeight * 2);

    },

    // ========== COMBAT STATE ==========

    startCombat() {
        // Reset fighters for combat
        this.player.resetForCombat();
        Rival.resetForCombat();
        Rival.applyStats();

        // Set combat positions (closer together for fighting)
        this.player.x = this.WIDTH * CONST.COMBAT_PLAYER_X_RATIO;
        this.player.y = this.HEIGHT * CONST.PLAYER_Y_RATIO;
        Rival.fighter.x = this.WIDTH * CONST.COMBAT_ENEMY_X_RATIO;
        Rival.fighter.y = this.HEIGHT * CONST.ENEMY_Y_RATIO;
        Rival.fighter.facing = -1;

        // Make fighters larger during combat
        this.player.scale = CONST.COMBAT_SCALE;
        Rival.fighter.scale = CONST.COMBAT_SCALE;

        // Start combat system
        Combat.start(this.player, Rival.fighter);

        this.state = 'combat';
    },

    updateCombat(dt) {
        // Update fighter animations
        this.player.update(dt);
        Rival.fighter.update(dt);

        // Update combat system
        const result = Combat.update(dt, this.player, Rival.fighter);

        // Check for combat end
        if (result) {
            this.combatResult = result;

            // Handle tie scenario: if both fighters died, only the loser should fall
            // The tiebreaker is built into combat.js - player loses if both die
            const winner = result === 'win' ? this.player : Rival.fighter;
            const loser = result === 'win' ? Rival.fighter : this.player;

            // If winner also died (tie scenario), restore them visually
            if (!winner.isAlive) {
                winner.isAlive = true;
            }
            // Ensure winner shows at least 1 HP
            if (winner.hp < 1) {
                winner.hp = 1;
            }
            // Winner plays flexing animation once, then switches to taunt (bassai)
            winner.animState = 'flexing';
            if (winner.useMocap) {
                winner.animController.setState('flexing', {
                    loop: false,
                    onComplete: () => winner.animController.setState('taunt')
                });
            }

            // Track close call for dialogue
            this.lastCombatWasCloseCall = Dialogue.wasCloseCall(winner);

            // Record result for rival streak tracking
            Rival.recordResult(result === 'lose');

            // Ensure the loser plays the death/fall animation
            if (loser.useMocap) {
                loser.animController.setState('death');
            }
            loser.animState = 'death';
            loser.animTimer = CONST.COMBAT_END_TIMER;
            loser.hp = 0; // Ensure HP shows as 0 (regen/lifesteal may have ticked after death)

            // Wait for fall animation to complete before transitioning
            this.combatEndTimer = CONST.COMBAT_END_TIMER;
            this.state = 'combatEnd';
        }
    },

    renderCombat() {
        const ctx = this.ctx;

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('COMBAT', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        // Render fighters with stick figures
        this.player.render(ctx, this.colors.player);
        Rival.fighter.render(ctx, this.colors.enemy);

        // Render damage numbers
        Combat.renderHitEffects(ctx);
        Combat.renderDamageNumbers(ctx);

        // Labels (below fighters, adjusted for larger combat scale)
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '14px sans-serif';
        ctx.fillText('PLAYER', this.player.x, this.player.y + 140);
        ctx.fillText('"' + Rival.currentRivalData.name.toUpperCase() + '"', Rival.fighter.x, Rival.fighter.y + 140);

        // Combat timer
        ctx.fillText(`Time: ${Combat.combatTime.toFixed(1)}s`, this.WIDTH / 2, this.HEIGHT - 50);
    },

    // ========== COMBAT END STATE (fall animation) ==========

    combatEndTimer: 0,

    updateCombatEnd(dt) {
        // Update fighter animations (let fall animation play)
        this.player.update(dt);
        Rival.fighter.update(dt);

        this.combatEndTimer -= dt;

        if (this.combatEndTimer <= 0) {
            // Fall animation complete, transition to dialogue
            if (this.combatResult === 'win') {
                this.enterDialogueState();
            } else {
                // Final dialogue on loss
                this.dialogueText = Dialogue.getFinalLine(Rival.personality);
                this.state = 'dialogue';
                this.dialogueIsGameOver = true;
            }
        }
    },

    renderCombatEnd() {
        const ctx = this.ctx;

        // Show result text
        const isWin = this.combatResult === 'win';
        ctx.fillStyle = isWin ? this.colors.accent : this.colors.damage;
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isWin ? 'VICTORY!' : 'DEFEAT', this.WIDTH / 2, 50);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('Round ' + this.round + '/' + this.ROUNDS_TO_WIN, this.WIDTH / 2, 80);

        // Render fighters (loser plays fall animation)
        this.player.render(ctx, this.colors.player);
        Rival.fighter.render(ctx, this.colors.enemy);

        // Labels (adjusted for larger combat scale)
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '14px sans-serif';
        ctx.fillText('PLAYER', this.player.x, this.player.y + 140);
        ctx.fillText('"' + Rival.currentRivalData.name.toUpperCase() + '"', Rival.fighter.x, Rival.fighter.y + 140);
    },

    // ========== DIALOGUE STATE ==========

    dialogueIsGameOver: false,

    enterDialogueState() {
        // Build context for dialogue selection
        const context = {
            round: this.round,
            playerWon: this.combatResult === 'win',
            wasCloseCall: this.lastCombatWasCloseCall,
            playerStats: this.player.getStats(),
            rivalStats: Rival.getStats(),
            rivalBuild: Rival.getDominantBuild(),
            rivalWinStreak: Rival.winStreak
        };

        // Use special defeated line if rival is permanently beaten
        if (context.playerWon && this.round >= this.ROUNDS_TO_WIN) {
            this.dialogueText = Dialogue.getDefeatedLine(Rival.personality);
        } else {
            this.dialogueText = Dialogue.getLine(Rival.personality, context);
        }
        this.dialogueIsGameOver = false;
        this.state = 'dialogue';

        // Set rival to taunt animation for dialogue (use playAnim to reset animState)
        Rival.fighter.animState = 'idle';
        Rival.fighter.playAnim('taunt', 999);
    },

    updateDialogue(dt) {
        // Update rival animation
        Rival.fighter.update(dt);

        // Require explicit tap to continue (no auto-dismiss to avoid accidental clicks)
        if (Input.pointer.justPressed) {
            if (this.dialogueIsGameOver) {
                this.state = 'result';
            } else {
                this.round++;

                // Check for rival defeat (10 rounds)
                if (this.round > this.ROUNDS_TO_WIN) {
                    this.enterRivalDefeatedState();
                } else {
                    this.enterUpgradeState();
                }
            }
        }
    },

    renderDialogue() {
        const ctx = this.ctx;

        // Background - gradient with dark overlay
        ctx.fillStyle = this.bgGradient || this.colors.backgroundTop;
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Rival figure (facing left toward player)
        Rival.fighter.x = this.WIDTH / 2;
        Rival.fighter.y = this.HEIGHT * 0.35;
        Rival.fighter.facing = -1;
        Rival.fighter.render(ctx, this.colors.enemy);

        // Speech bubble (above rival)
        const bubbleX = this.WIDTH / 2;
        const bubbleY = 50;
        const bubbleW = this.WIDTH - 60;
        const bubbleH = 55;

        ctx.fillStyle = '#2a2a4a';
        ctx.beginPath();
        ctx.roundRect(bubbleX - bubbleW / 2, bubbleY, bubbleW, bubbleH, 10);
        ctx.fill();

        // Bubble tail (pointing down to rival)
        ctx.beginPath();
        ctx.moveTo(bubbleX - 10, bubbleY + bubbleH);
        ctx.lineTo(bubbleX, bubbleY + bubbleH + 15);
        ctx.lineTo(bubbleX + 10, bubbleY + bubbleH);
        ctx.fill();

        // Dialogue text
        ctx.fillStyle = this.colors.text;
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Simple word wrap
        const words = this.dialogueText.split(' ');
        let line = '';
        let y = bubbleY + 18;
        const maxWidth = bubbleW - 30;

        for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                ctx.fillText(line.trim(), bubbleX, y);
                line = word + ' ';
                y += 18;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), bubbleX, y);

        // Show what ended the fight (use combatResult as single source of truth)
        if (Combat.killingBlow) {
            const playerWon = this.combatResult === 'win';
            ctx.fillStyle = playerWon ? this.colors.accent : this.colors.damage;
            ctx.font = '14px sans-serif';
            const msg = this.getKillMessage(Combat.killingBlow, playerWon);
            ctx.fillText(msg, this.WIDTH / 2, this.HEIGHT * 0.58);
        }

        // Game over: show victor stats
        if (this.dialogueIsGameOver) {
            ctx.fillStyle = this.colors.damage;
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('GAME OVER', this.WIDTH / 2, 325);

            ctx.font = '12px sans-serif';
            ctx.fillStyle = this.colors.textDim;
            ctx.fillText("Rival's Final Stats", this.WIDTH / 2, 395);

            this.renderFighterStats(Rival.fighter, 420, false);

            ctx.textAlign = 'center';
            ctx.fillStyle = this.colors.textDim;
            ctx.fillText(`Round ${this.round}`, this.WIDTH / 2, 420 + 14 * 4 + 25);
        }

        // Skip hint
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tap to continue', this.WIDTH / 2, this.HEIGHT - 30);
    },

    // ========== RESULT STATE ==========

    combatResult: 'win', // 'win' or 'lose'

    updateResult(dt) {
        const btnY = this.HEIGHT / 2 + 130;
        const btnW = 160;
        const btnH = 60;
        const btnX = this.WIDTH / 2 - btnW / 2;

        if (Input.isTapped(btnX, btnY, btnW, btnH)) {
            // Result state is only reached on defeat now - restart against same rival
            this.startNewRun();
        }
    },

    renderResult() {
        const ctx = this.ctx;

        // Result text (only defeats reach this state now)
        ctx.fillStyle = this.colors.damage;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DEFEAT', this.WIDTH / 2, this.HEIGHT / 2 - 80);

        // Round info
        ctx.fillStyle = this.colors.text;
        ctx.font = '18px sans-serif';
        const roundsSurvived = this.round - 1;
        ctx.fillText(`Survived ${roundsSurvived} round${roundsSurvived !== 1 ? 's' : ''}`, this.WIDTH / 2, this.HEIGHT / 2 - 40);

        // Rival info
        ctx.fillStyle = this.colors.enemy;
        ctx.font = '14px sans-serif';
        ctx.fillText(`Rival: ${Rival.profile.name}`, this.WIDTH / 2, this.HEIGHT / 2);

        // Player upgrades count
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '14px sans-serif';
        ctx.fillText(`Your upgrades: ${this.player.upgrades.length}`, this.WIDTH / 2, this.HEIGHT / 2 + 25);
        ctx.fillText(`Rival upgrades: ${Rival.fighter.upgrades.length}`, this.WIDTH / 2, this.HEIGHT / 2 + 45);

        // Combat duration
        const summary = Combat.getSummary();
        ctx.fillText(`Final combat: ${summary.duration.toFixed(1)}s`, this.WIDTH / 2, this.HEIGHT / 2 + 70);

        // What killed you
        if (Combat.killingBlow) {
            ctx.fillStyle = this.colors.damage;
            ctx.font = '14px sans-serif';
            const killMsg = this.getKillMessage(Combat.killingBlow, false);
            ctx.fillText(killMsg, this.WIDTH / 2, this.HEIGHT / 2 + 95);
        }

        // Retry button
        const btnY = this.HEIGHT / 2 + 130;
        const btnW = 160;
        const btnH = 60;
        const btnX = this.WIDTH / 2 - btnW / 2;

        const isHover = Input.isOver(btnX, btnY, btnW, btnH);

        ctx.fillStyle = isHover ? '#4a4a6a' : '#2a2a4a';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('RETRY', this.WIDTH / 2, btnY + btnH / 2);
    },

    // ========== GAME CONTROL ==========

    /**
     * Start a new game run
     */
    startNewRun() {
        this.round = 1;
        this.player.reset();
        this.player.scale = 1.0;

        // Initialize rival system
        Rival.init();
        Rival.applyStats();
        Rival.fighter.x = this.WIDTH * CONST.ENEMY_X_RATIO;
        Rival.fighter.y = this.HEIGHT * CONST.ENEMY_Y_RATIO;
        Rival.fighter.scale = 1.0;

        // Reset upgrade and dialogue systems
        Upgrades.reset();
        Dialogue.reset();

        this.lastPickedUpgrade = null;
        this.rivalPickedUpgrade = null;

        // Go to rival intro state
        this.state = 'rivalIntro';
    },

    // ========== RIVAL INTRO STATE ==========

    // Animation debug mode
    debugAnimations: false,
    debugAnimIndex: 0,
    debugAnimList: null,
    debugScrubStart: 0,
    debugScrubDuration: 3.0,
    debugScrubMode: false,
    debugFileData: null,

    initDebugAnimations() {
        // Build list of all animations with their configs
        this.debugAnimList = Object.keys(ANIMATIONS).map(name => ({
            name: name,
            config: ANIMATIONS[name]
        }));
        this.debugAnimIndex = 0;
        this.debugScrubMode = false;
        this.playDebugAnimation();
    },

    playDebugAnimation() {
        if (!this.debugAnimList || this.debugAnimList.length === 0) return;

        const anim = this.debugAnimList[this.debugAnimIndex];

        // Always load the raw file data for duration display
        this.loadDebugScrub(anim.config.file);

        if (this.debugScrubMode) {
            // Scrub mode - playScrubSegment is called by loadDebugScrub
        } else {
            // Normal mode - play configured animation
            AnimationLoader.load(anim.name).then(() => {
                Rival.fighter.animController.play(anim.name, {
                    loop: ANIMATIONS[anim.name].loop
                });
            });
        }
    },

    async loadDebugScrub(filename) {
        // Load the raw file data
        try {
            const response = await fetch('data/' + filename);
            this.debugFileData = await response.json();
            if (this.debugScrubMode) {
                this.playScrubSegment();
            }
        } catch (e) {
            console.error('Failed to load file for scrub:', e);
        }
    },

    playScrubSegment() {
        if (!this.debugFileData) return;

        // Create a temporary animation with the scrub segment
        const tempConfig = {
            loop: true,
            speed: 1.0,
            startTime: this.debugScrubStart,
            endTime: this.debugScrubStart + this.debugScrubDuration
        };

        const tempAnim = new MocapAnimation(this.debugFileData, tempConfig);
        Rival.fighter.animController.currentAnim = tempAnim;
        Rival.fighter.animController.currentTime = 0;
        Rival.fighter.animController.options = { loop: true };
    },

    updateRivalIntro(dt) {
        // Update rival animation
        Rival.fighter.update(dt);

        // Debug mode controls
        if (this.debugAnimations) {
            if (!this.debugAnimList) {
                this.initDebugAnimations();
            }

            // Tab to toggle scrub mode
            if (Input.keys && Input.keys['Tab']) {
                Input.keys['Tab'] = false;
                this.debugScrubMode = !this.debugScrubMode;
                if (this.debugScrubMode) {
                    const anim = this.debugAnimList[this.debugAnimIndex];
                    this.debugScrubStart = anim.config.startTime || 0;
                    this.debugScrubDuration = (anim.config.endTime || 3) - this.debugScrubStart;
                    this.loadDebugScrub(anim.config.file);
                } else {
                    this.playDebugAnimation();
                }
            }

            if (this.debugScrubMode) {
                // Scrub mode controls
                // Left/Right to move start time by 0.5s
                if (Input.keys && Input.keys['ArrowLeft']) {
                    Input.keys['ArrowLeft'] = false;
                    this.debugScrubStart = Math.max(0, this.debugScrubStart - 0.5);
                    this.playScrubSegment();
                }
                if (Input.keys && Input.keys['ArrowRight']) {
                    Input.keys['ArrowRight'] = false;
                    this.debugScrubStart += 0.5;
                    this.playScrubSegment();
                }
                // Up/Down to adjust duration
                if (Input.keys && Input.keys['ArrowUp']) {
                    Input.keys['ArrowUp'] = false;
                    this.debugScrubDuration = Math.min(10, this.debugScrubDuration + 0.5);
                    this.playScrubSegment();
                }
                if (Input.keys && Input.keys['ArrowDown']) {
                    Input.keys['ArrowDown'] = false;
                    this.debugScrubDuration = Math.max(0.5, this.debugScrubDuration - 0.5);
                    this.playScrubSegment();
                }
                // Space to replay
                if (Input.keys && Input.keys[' ']) {
                    Input.keys[' '] = false;
                    this.playScrubSegment();
                }
            } else {
                // Normal debug controls
                // Space to replay current animation
                if (Input.keys && Input.keys[' ']) {
                    Input.keys[' '] = false;
                    this.playDebugAnimation();
                }
            }

            // Enter to go to next animation
            if (Input.keys && Input.keys['Enter']) {
                Input.keys['Enter'] = false;
                this.debugAnimIndex = (this.debugAnimIndex + 1) % this.debugAnimList.length;
                this.debugScrubMode = false;
                this.playDebugAnimation();
            }

            // Backspace to go to previous animation
            if (Input.keys && Input.keys['Backspace']) {
                Input.keys['Backspace'] = false;
                this.debugAnimIndex = (this.debugAnimIndex - 1 + this.debugAnimList.length) % this.debugAnimList.length;
                this.debugScrubMode = false;
                this.playDebugAnimation();
            }

            return; // Skip normal button handling in debug mode
        }

        // Continue button (using constants)
        const btnY = this.HEIGHT + CONST.RIVAL_INTRO_BTN_Y_OFFSET;
        const btnW = CONST.RIVAL_INTRO_BTN_W;
        const btnH = CONST.RIVAL_INTRO_BTN_H;
        const btnX = this.WIDTH / 2 - btnW / 2;

        // Reset button (small, below BEGIN)
        const resetW = CONST.RIVAL_INTRO_RESET_W;
        const resetH = CONST.RIVAL_INTRO_RESET_H;
        const resetX = this.WIDTH / 2 - resetW / 2;
        const resetY = btnY + btnH + CONST.RIVAL_INTRO_RESET_GAP;

        if (this.showResetConfirm) {
            // Confirmation buttons
            const confirmW = CONST.RIVAL_INTRO_CONFIRM_W;
            const confirmH = CONST.RIVAL_INTRO_CONFIRM_H;
            const yesX = this.WIDTH / 2 - confirmW - 8;
            const noX = this.WIDTH / 2 + 8;

            if (Input.isTapped(yesX, resetY, confirmW, confirmH)) {
                Storage.reset();
                this.showResetConfirm = false;
                this.state = 'menu';
            } else if (Input.isTapped(noX, resetY, confirmW, confirmH)) {
                this.showResetConfirm = false;
            }
        } else {
            if (Input.isTapped(btnX, btnY, btnW, btnH)) {
                this.enterUpgradeState();
            } else if (Input.isTapped(resetX, resetY, resetW, resetH)) {
                this.showResetConfirm = true;
            }
        }
    },

    renderRivalIntro() {
        const ctx = this.ctx;

        // Debug animation mode
        if (this.debugAnimations && this.debugAnimList) {
            const anim = this.debugAnimList[this.debugAnimIndex];
            const config = anim.config;

            // Title
            ctx.fillStyle = this.colors.text;
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ANIMATION DEBUG', this.WIDTH / 2, 40);

            // Animation info
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 20px monospace';
            ctx.fillText(`${this.debugAnimIndex + 1}/${this.debugAnimList.length}: ${anim.name}`, this.WIDTH / 2, 80);

            ctx.fillStyle = this.colors.textDim;
            ctx.font = '14px monospace';
            ctx.fillText(`File: ${config.file} (${this.debugFileData ? this.debugFileData.duration.toFixed(1) + 's total' : 'loading...'})`, this.WIDTH / 2, 110);

            if (this.debugScrubMode) {
                // Scrub mode display
                ctx.fillStyle = '#00ff00';
                ctx.font = 'bold 14px monospace';
                ctx.fillText(`SCRUB MODE: ${this.debugScrubStart.toFixed(1)}s - ${(this.debugScrubStart + this.debugScrubDuration).toFixed(1)}s (${this.debugScrubDuration.toFixed(1)}s duration)`, this.WIDTH / 2, 130);
            } else {
                ctx.fillText(`Config: ${config.startTime || 0}s - ${config.endTime || '?'}s | Speed: ${config.speed} | Loop: ${config.loop}`, this.WIDTH / 2, 130);
            }

            // Rival figure (larger, centered)
            Rival.fighter.x = this.WIDTH / 2;
            Rival.fighter.y = this.HEIGHT * 0.5;
            Rival.fighter.facing = 1;
            Rival.fighter.render(ctx, this.colors.enemy);

            // Current playback time
            const controller = Rival.fighter.animController;
            if (controller.currentAnim) {
                ctx.fillStyle = this.colors.text;
                ctx.font = '12px monospace';
                ctx.fillText(`Playback: ${controller.currentTime.toFixed(2)}s / ${controller.currentAnim.duration.toFixed(2)}s`, this.WIDTH / 2, this.HEIGHT - 100);
            }

            // Controls
            ctx.fillStyle = this.colors.accent;
            ctx.font = '12px sans-serif';
            if (this.debugScrubMode) {
                ctx.fillText('LEFT/RIGHT = Move start (0.5s) | UP/DOWN = Duration', this.WIDTH / 2, this.HEIGHT - 70);
                ctx.fillText('SPACE = Replay | TAB = Exit scrub | ENTER = Next anim', this.WIDTH / 2, this.HEIGHT - 50);
            } else {
                ctx.fillText('SPACE = Replay | ENTER = Next | BACKSPACE = Prev', this.WIDTH / 2, this.HEIGHT - 70);
                ctx.fillText('TAB = Enter scrub mode', this.WIDTH / 2, this.HEIGHT - 50);
            }

            return;
        }

        // Normal rival intro rendering
        const rivalData = Rival.currentRivalData;

        // Title
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A CHALLENGER APPEARS', this.WIDTH / 2, 60);

        // Progress
        const currentNum = Rival.currentRivalIndex + 1;
        const totalNum = Rival.rivalOrder.length;
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '14px sans-serif';
        ctx.fillText(`Rival ${currentNum} of ${totalNum}`, this.WIDTH / 2, 90);

        // Rival figure (facing left toward player)
        Rival.fighter.x = this.WIDTH / 2;
        Rival.fighter.y = this.HEIGHT * 0.4;
        Rival.fighter.facing = -1;
        Rival.fighter.render(ctx, this.colors.enemy);

        // Rival name and description
        ctx.fillStyle = this.colors.enemy;
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(rivalData.name.toUpperCase(), this.WIDTH / 2, this.HEIGHT / 2 + 30);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText(rivalData.description, this.WIDTH / 2, this.HEIGHT / 2 + 55);

        // Strategy hint
        ctx.fillStyle = this.colors.accent;
        ctx.font = '14px sans-serif';
        ctx.fillText('Strategy: ' + Rival.profile.hint, this.WIDTH / 2, this.HEIGHT / 2 + 80);

        // Win condition
        ctx.fillStyle = this.colors.text;
        ctx.font = '12px sans-serif';
        ctx.fillText(`Survive ${this.ROUNDS_TO_WIN} rounds to defeat this rival`, this.WIDTH / 2, this.HEIGHT / 2 + 105);

        // Continue button (using constants)
        const btnY = this.HEIGHT + CONST.RIVAL_INTRO_BTN_Y_OFFSET;
        const btnW = CONST.RIVAL_INTRO_BTN_W;
        const btnH = CONST.RIVAL_INTRO_BTN_H;
        const btnX = this.WIDTH / 2 - btnW / 2;

        const isHover = Input.isOver(btnX, btnY, btnW, btnH);
        ctx.fillStyle = isHover ? '#4a4a6a' : '#2a2a4a';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('BEGIN', this.WIDTH / 2, btnY + btnH / 2);

        // Reset button (small, below BEGIN)
        const resetW = CONST.RIVAL_INTRO_RESET_W;
        const resetH = CONST.RIVAL_INTRO_RESET_H;
        const resetX = this.WIDTH / 2 - resetW / 2;
        const resetY = btnY + btnH + CONST.RIVAL_INTRO_RESET_GAP;

        if (this.showResetConfirm) {
            // Confirmation prompt
            ctx.fillStyle = this.colors.textDim;
            ctx.font = '10px sans-serif';
            ctx.fillText('Reset all progress?', this.WIDTH / 2, resetY - 6);

            const confirmW = CONST.RIVAL_INTRO_CONFIRM_W;
            const confirmH = CONST.RIVAL_INTRO_CONFIRM_H;
            const yesX = this.WIDTH / 2 - confirmW - 8;
            const noX = this.WIDTH / 2 + 8;

            // Yes button
            const yesHover = Input.isOver(yesX, resetY, confirmW, confirmH);
            ctx.fillStyle = yesHover ? '#5a3030' : '#3a2020';
            ctx.beginPath();
            ctx.roundRect(yesX, resetY, confirmW, confirmH, 3);
            ctx.fill();

            ctx.fillStyle = this.colors.textDim;
            ctx.font = '10px sans-serif';
            ctx.fillText('Yes', yesX + confirmW / 2, resetY + confirmH / 2);

            // No button
            const noHover = Input.isOver(noX, resetY, confirmW, confirmH);
            ctx.fillStyle = noHover ? '#304030' : '#203020';
            ctx.beginPath();
            ctx.roundRect(noX, resetY, confirmW, confirmH, 3);
            ctx.fill();

            ctx.fillStyle = this.colors.textDim;
            ctx.fillText('No', noX + confirmW / 2, resetY + confirmH / 2);
        } else {
            // Reset button
            const resetHover = Input.isOver(resetX, resetY, resetW, resetH);
            ctx.fillStyle = resetHover ? '#333333' : '#222222';
            ctx.beginPath();
            ctx.roundRect(resetX, resetY, resetW, resetH, 3);
            ctx.fill();

            ctx.fillStyle = '#666666';
            ctx.font = '10px sans-serif';
            ctx.fillText('reset', this.WIDTH / 2, resetY + resetH / 2);
        }
    },

    // ========== RIVAL DEFEATED STATE ==========

    enterRivalDefeatedState() {
        this.state = 'rivalDefeated';
    },

    updateRivalDefeated(dt) {
        Rival.fighter.update(dt);

        const btnY = this.HEIGHT - 80;
        const btnW = 220;
        const btnH = 50;
        const btnX = this.WIDTH / 2 - btnW / 2;

        if (Input.isTapped(btnX, btnY, btnW, btnH)) {
            // Advance to next rival
            const hasNext = Rival.advanceToNextRival();

            if (hasNext) {
                // Start new run against next rival
                this.startNewRun();
            } else {
                // All rivals defeated - game won!
                this.state = 'gameWon';
            }
        }
    },

    renderRivalDefeated() {
        const ctx = this.ctx;
        const rivalData = Rival.currentRivalData;

        // Background overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Victory title
        ctx.fillStyle = this.colors.accent;
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RIVAL DEFEATED!', this.WIDTH / 2, 80);

        // Rival info
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(rivalData.name, this.WIDTH / 2, 140);

        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText(rivalData.description, this.WIDTH / 2, 170);

        // Rival figure (defeated pose, no HP bar)
        Rival.fighter.x = this.WIDTH / 2;
        Rival.fighter.y = this.HEIGHT * 0.45;
        Rival.fighter.facing = 1;
        Rival.fighter.showHPBar = false;
        Rival.fighter.render(ctx, this.colors.enemy);
        Rival.fighter.showHPBar = true;

        // Progress info (moved down to avoid overlap with figure)
        const currentNum = Rival.currentRivalIndex + 1;
        const totalNum = Rival.rivalOrder.length;
        ctx.fillStyle = this.colors.text;
        ctx.font = '18px sans-serif';
        ctx.fillText(`${currentNum} of ${totalNum} rivals defeated`, this.WIDTH / 2, this.HEIGHT / 2 + 100);

        // What won the fight
        if (Combat.killingBlow) {
            ctx.fillStyle = this.colors.accent;
            ctx.font = '14px sans-serif';
            const winMsg = this.getKillMessage(Combat.killingBlow, true);
            ctx.fillText(winMsg, this.WIDTH / 2, this.HEIGHT / 2 + 125);
        }

        // Next rival preview (if not final)
        if (!Rival.isFinalRival()) {
            const nextRival = Rival.rivalOrder[Rival.currentRivalIndex + 1];
            ctx.fillStyle = this.colors.textDim;
            ctx.font = '14px sans-serif';
            ctx.fillText('Next challenger:', this.WIDTH / 2, this.HEIGHT / 2 + 155);

            ctx.fillStyle = this.colors.enemy;
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(nextRival.name, this.WIDTH / 2, this.HEIGHT / 2 + 175);
        }

        // Continue button
        const btnY = this.HEIGHT - 80;
        const btnW = 220;
        const btnH = 50;
        const btnX = this.WIDTH / 2 - btnW / 2;

        const isHover = Input.isOver(btnX, btnY, btnW, btnH);
        ctx.fillStyle = isHover ? '#3a6a3a' : '#2a5a2a';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 18px sans-serif';

        if (Rival.isFinalRival()) {
            ctx.fillText('CLAIM VICTORY', this.WIDTH / 2, btnY + btnH / 2);
        } else {
            ctx.fillText('NEXT CHALLENGER', this.WIDTH / 2, btnY + btnH / 2);
        }
    },

    // ========== GAME WON STATE ==========

    updateGameWon(dt) {
        // Animate something if desired

        const btnY = this.HEIGHT - 80;
        const btnW = 160;
        const btnH = 50;
        const btnX = this.WIDTH / 2 - btnW / 2;

        if (Input.isTapped(btnX, btnY, btnW, btnH)) {
            // Reset progress and return to menu
            Storage.reset();
            this.state = 'menu';
        }
    },

    renderGameWon() {
        const ctx = this.ctx;

        // Epic background
        ctx.fillStyle = this.bgGradient || this.colors.backgroundTop;
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Gold overlay effect
        ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
        ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // Victory title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CHAMPION!', this.WIDTH / 2, 80);

        // Subtitle
        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('All Rivals Defeated', this.WIDTH / 2, 130);

        // Player figure (victory pose)
        this.player.x = this.WIDTH / 2;
        this.player.y = this.HEIGHT * 0.38;
        this.player.render(ctx, this.colors.player);

        // Stats summary
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '16px sans-serif';
        ctx.fillText('You have proven yourself the', this.WIDTH / 2, this.HEIGHT / 2 + 20);
        ctx.fillText('Ultimate Stick Rivals Champion!', this.WIDTH / 2, this.HEIGHT / 2 + 45);

        // Rivals defeated list
        ctx.fillStyle = this.colors.accent;
        ctx.font = '14px sans-serif';
        let y = this.HEIGHT / 2 + 80;
        for (const rival of Rival.rivalOrder) {
            ctx.fillText('[X] ' + rival.name, this.WIDTH / 2, y);
            y += 22;
        }

        // Play again button
        const btnY = this.HEIGHT - 80;
        const btnW = 160;
        const btnH = 50;
        const btnX = this.WIDTH / 2 - btnW / 2;

        const isHover = Input.isOver(btnX, btnY, btnW, btnH);
        ctx.fillStyle = isHover ? '#6a6a3a' : '#5a5a2a';
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 8);
        ctx.fill();

        ctx.fillStyle = this.colors.text;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('PLAY AGAIN', this.WIDTH / 2, btnY + btnH / 2);
    },

    // ========== DEBUG ==========

    renderDebugInfo() {
        const ctx = this.ctx;
        ctx.fillStyle = this.colors.textDim;
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('FPS: ' + this.fps, 5, 5);
        ctx.fillText('State: ' + this.state, 5, 20);
    }
};

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => Game.init());
