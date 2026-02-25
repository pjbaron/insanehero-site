/**
 * Dialogue System - Personality-driven banter between rounds
 */

const Dialogue = {
    // Track used lines to avoid repeats within a run
    usedLines: new Set(),

    // Dialogue banks by personality and trigger
    lines: {
        // ========== HOTHEAD PERSONALITY ==========
        hothead: {
            // Situational triggers
            close_call: [
                "That was TOO close! You got lucky!",
                "Don't think that near-win means anything!",
                "Almost had you! ALMOST!",
                "Grr... won't happen again!"
            ],
            dominated: [
                "What?! That's impossible!",
                "You're CHEATING somehow!",
                "This is RIGGED!",
                "No way you're that good!"
            ],
            rival_streak: [
                "Ha! Can't touch THIS!",
                "See that? UNSTOPPABLE!",
                "Who's the best? I AM!",
                "Keep trying, loser!"
            ],
            // Build-reactive
            player_speed: [
                "Stop moving so fast, coward!",
                "Stand still and FIGHT!",
                "Running won't save you!"
            ],
            player_tank: [
                "What are you, a wall?!",
                "Stop being so defensive!",
                "Fight back, you coward!"
            ],
            player_crit: [
                "Lucky shots don't count!",
                "Stop getting crits!",
                "That damage is UNFAIR!"
            ],
            player_lifesteal: [
                "Stop healing yourself!",
                "That's MY health!",
                "Quit sucking my life!"
            ],
            player_bleed: [
                "Make it stop bleeding!",
                "This cut HURTS!",
                "Bleeding is a cheap move!"
            ],
            // Rival pride
            rival_going_attack: [
                "More power! MORE!",
                "I'll crush you with strength!",
                "MAXIMUM DAMAGE!"
            ],
            rival_going_defense: [
                "Can't hurt what you can't kill!",
                "I'll outlast you!",
                "Try hitting me NOW!"
            ],
            // Round-based
            early_game: [
                "Let's GO already!",
                "I'm gonna destroy you!",
                "You picked the wrong fight!"
            ],
            mid_game: [
                "Getting tired yet?!",
                "Still standing? Not for long!",
                "Halfway to your doom!"
            ],
            late_game: [
                "This ends NOW!",
                "One of us DIES today!",
                "No more games!"
            ],
            // Generic fallback
            generic: [
                "RAAAGH!",
                "Come at me!",
                "I'll end you!",
                "Fight me!",
                "You're NOTHING!"
            ],
            // Final (on player death)
            final: [
                "FINALLY! I WIN!",
                "That's what you GET!",
                "Should've given up earlier!",
                "WHO'S THE CHAMPION NOW?!"
            ],
            // Defeated (rival loses final round)
            defeated: [
                "No... this can't be happening!",
                "I... I lost?! IMPOSSIBLE!",
                "You got lucky! LUCKY!"
            ]
        },

        // ========== ANALYTICAL PERSONALITY ==========
        analytical: {
            close_call: [
                "Margin of error: 3%. Adjusting.",
                "Closer than calculated. Recalibrating.",
                "Victory probability dropped. Noted.",
                "Near-defeat logged. Optimizing."
            ],
            dominated: [
                "Unexpected outcome. Analyzing.",
                "This defies my calculations.",
                "Error in prediction model detected.",
                "Interesting. Very interesting."
            ],
            rival_streak: [
                "Winning streak: expected.",
                "Performance within parameters.",
                "Success rate: optimal.",
                "Probability matrix confirmed."
            ],
            player_speed: [
                "High attack frequency detected.",
                "Speed build identified. Countering.",
                "Your tempo is noted."
            ],
            player_tank: [
                "Defense-heavy build detected.",
                "Survivability focus. Adjusting DPS.",
                "Your armor has weaknesses."
            ],
            player_crit: [
                "Critical hit probability: high.",
                "RNG-dependent build. Risky.",
                "Crit focus noted. Variance is high."
            ],
            player_lifesteal: [
                "Sustain mechanics detected.",
                "Life drain counters calculated.",
                "Self-healing logged."
            ],
            player_bleed: [
                "DoT build detected.",
                "Bleed damage factored in.",
                "Time-based damage noted."
            ],
            rival_going_attack: [
                "Optimizing damage output.",
                "Offense calculations complete.",
                "Maximum efficiency achieved."
            ],
            rival_going_defense: [
                "Survivability prioritized.",
                "Defense matrix engaged.",
                "Damage mitigation optimized."
            ],
            early_game: [
                "Initializing combat protocols.",
                "Gathering baseline data.",
                "Phase 1: Assessment."
            ],
            mid_game: [
                "Data sufficient. Adapting.",
                "Mid-fight adjustments complete.",
                "Pattern recognition: 78%."
            ],
            late_game: [
                "Endgame calculations running.",
                "Final phase initiated.",
                "Victory probability: calculating..."
            ],
            generic: [
                "Interesting data point.",
                "Noted.",
                "As expected.",
                "Calculating...",
                "Processing."
            ],
            final: [
                "Outcome: predicted.",
                "Your defeat was inevitable.",
                "Data confirms: I am superior.",
                "Victory achieved. As calculated."
            ],
            // Defeated (rival loses final round)
            defeated: [
                "Error... recalculating...",
                "This outcome was not predicted.",
                "Data corrupted. Impossible result."
            ]
        },

        // ========== FRIENDLY PERSONALITY ==========
        friendly: {
            close_call: [
                "Phew! That was exciting!",
                "Wow, you won, but it was tight!",
                "Great fight! So close!",
                "That was intense!"
            ],
            dominated: [
                "Okay, you're REALLY good!",
                "Wow, I need to step up my game!",
                "Impressive! Seriously!",
                "You're amazing at this!"
            ],
            rival_streak: [
                "I'm doing pretty well!",
                "Things are going my way!",
                "Lucky streak, I guess!",
                "Hope you don't mind!"
            ],
            player_speed: [
                "You're so fast! Cool build!",
                "Speed demon! I want Spikes!",
                "Quick hands! Impressive!"
            ],
            player_tank: [
                "Wow, you're tough!",
                "Like fighting a fortress!",
                "So much health! Respect!",
                "I need some more Crit!"
            ],
            player_crit: [
                "Those crits are scary!",
                "Big hits! Exciting!",
                "Critical master! I need armor!"
            ],
            player_lifesteal: [
                "Clever sustain build!",
                "Healing yourself! Smart!",
                "Life drain! Nice strategy!"
            ],
            player_bleed: [
                "Ouch, the bleeding!",
                "DoT build! Interesting!",
                "Death by papercuts, huh?",
                "Maybe I need Regen?"
            ],
            rival_going_attack: [
                "Going for damage!",
                "Offense is fun!",
                "Big hits incoming!"
            ],
            rival_going_defense: [
                "Playing it safe!",
                "Defense mode activated!",
                "Gotta survive first!"
            ],
            early_game: [
                "Let's have a good fight!",
                "May the best fighter win!",
                "Ready when you are!"
            ],
            mid_game: [
                "This is getting good!",
                "What a match so far!",
                "You're doing great!"
            ],
            late_game: [
                "Final stretch! Exciting!",
                "Here we go! Good luck!",
                "Let's finish this!"
            ],
            generic: [
                "Good luck!",
                "Having fun!",
                "Great fight!",
                "Nice move!",
                "Well played!"
            ],
            final: [
                "Good game! Well fought!",
                "That was fun! Thanks!",
                "Great match! Try again?",
                "You did your best!"
            ],
            // Defeated (rival loses final round)
            defeated: [
                "Wow, you beat me! Congrats!",
                "You're amazing! Well deserved!",
                "That was so fun! You're the best!"
            ]
        },

        // ========== DRAMATIC PERSONALITY ==========
        dramatic: {
            close_call: [
                "The fates almost turned!",
                "Destiny wavers on a knife's edge!",
                "You were a breath from oblivion!",
                "The stars aligned against me!"
            ],
            dominated: [
                "How can this BE?!",
                "The prophecy was WRONG!",
                "Impossible! IMPOSSIBLE!",
                "My legend... crumbles..."
            ],
            rival_streak: [
                "Destiny favors the bold!",
                "My legend GROWS!",
                "As foretold in prophecy!",
                "The champion rises!"
            ],
            player_speed: [
                "Swift as the wind itself!",
                "A tempest of blows!",
                "The speed of lightning!"
            ],
            player_tank: [
                "An immovable fortress!",
                "Like striking a mountain!",
                "Impenetrable defense!"
            ],
            player_crit: [
                "Devastating strikes!",
                "The critical blow of fate!",
                "Fortune's deadly favor!"
            ],
            player_lifesteal: [
                "A vampire's curse!",
                "Draining the essence of life!",
                "Dark sustenance!"
            ],
            player_bleed: [
                "A thousand cuts!",
                "My lifeblood flows!",
                "The crimson price of battle!"
            ],
            rival_going_attack: [
                "UNLIMITED POWER!",
                "The storm awakens!",
                "Destruction incarnate!"
            ],
            rival_going_defense: [
                "An unbreakable bastion!",
                "The fortress endures!",
                "None shall pass!"
            ],
            early_game: [
                "Our saga BEGINS!",
                "The legend starts here!",
                "Witness... HISTORY!"
            ],
            mid_game: [
                "The plot THICKENS!",
                "Act two commences!",
                "The turning point approaches!"
            ],
            late_game: [
                "The CLIMAX approaches!",
                "The final chapter!",
                "This is the END!"
            ],
            generic: [
                "BEHOLD!",
                "WITNESS ME!",
                "For GLORY!",
                "DESTINY CALLS!",
                "LEGENDARY!"
            ],
            final: [
                "AND SO IT ENDS!",
                "The prophecy fulfilled!",
                "MY LEGEND IS COMPLETE!",
                "History remembers only VICTORS!"
            ],
            // Defeated (rival loses final round)
            defeated: [
                "A twist! The hero falls!",
                "What a dramatic finale!",
                "The audience GASPS! Bravo!"
            ]
        }
    },

    // Trigger priority order (checked in sequence)
    triggerPriority: [
        'close_call',
        'dominated',
        'rival_streak',
        'player_speed',
        'player_tank',
        'player_crit',
        'player_lifesteal',
        'player_bleed',
        'rival_going_attack',
        'rival_going_defense',
        'early_game',
        'mid_game',
        'late_game',
        'generic'
    ],

    /**
     * Reset used lines for a new run
     */
    reset() {
        this.usedLines.clear();
    },

    /**
     * Get a dialogue line based on current game context
     * @param {string} personality - Rival personality
     * @param {object} context - { round, playerWon, wasCloseCall, playerStats, rivalStats, rivalBuild }
     * @returns {string} - Dialogue line to display
     */
    getLine(personality, context) {
        const bank = this.lines[personality];
        if (!bank) return "...";

        // Determine which trigger applies
        const trigger = this.determineTrigger(context);

        // Get lines for this trigger
        let lines = bank[trigger] || bank.generic;

        // Filter out used lines
        const available = lines.filter(line => !this.usedLines.has(line));

        // If all used, allow repeats but prefer unused
        if (available.length === 0) {
            available.push(...lines);
        }

        // Pick random line
        const line = available[Math.floor(Math.random() * available.length)];
        this.usedLines.add(line);

        return line;
    },

    /**
     * Get final line when player dies
     * @param {string} personality - Rival personality
     * @returns {string} - Final dialogue line
     */
    getFinalLine(personality) {
        const bank = this.lines[personality];
        if (!bank || !bank.final) return "Game over.";

        const lines = bank.final;
        const available = lines.filter(line => !this.usedLines.has(line));
        const pool = available.length > 0 ? available : lines;

        return pool[Math.floor(Math.random() * pool.length)];
    },

    /**
     * Get defeated line when rival is permanently beaten
     * @param {string} personality - Rival personality
     * @returns {string} - Defeated dialogue line
     */
    getDefeatedLine(personality) {
        const bank = this.lines[personality];
        if (!bank || !bank.defeated) return "You win...";

        const lines = bank.defeated;
        return lines[Math.floor(Math.random() * lines.length)];
    },

    /**
     * Determine which trigger applies based on context
     * @param {object} context - Game context
     * @returns {string} - Trigger name
     */
    determineTrigger(context) {
        const { round, playerWon, wasCloseCall, playerStats, rivalStats, rivalBuild, rivalWinStreak } = context;

        // Situational triggers (highest priority)
        if (wasCloseCall) {
            return 'close_call';
        }

        if (playerWon && rivalStats && playerStats) {
            // Player dominated (won with >70% HP)
            const playerHpPercent = playerStats.hp / playerStats.maxHp;
            if (playerHpPercent > 0.7) {
                return 'dominated';
            }
        }

        // removed: quotes only suit victory but the rival has lost
        // if (!playerWon && rivalWinStreak >= 2) {
        //     return 'rival_streak';
        // }

        // Build-reactive triggers
        if (playerStats) {
            var ret = null;
            // Check player's dominant stats
            if (playerStats.attackSpeed > 1.5) ret = 'player_speed';
            if (playerStats.maxHp > 150 || playerStats.armor > 6) ret = (ret == null ? 'player_tank' : (Math.random() < 0.5 ? 'player_tank' : ret));
            if (playerStats.critChance > 0.2) ret = (ret == null ? 'player_crit' : (Math.random() < 0.5 ? 'player_crit' : ret));
            if (playerStats.lifesteal > 0.3) ret = (ret == null ? 'player_lifesteal' : (Math.random() < 0.5 ? 'player_lifesteal' : ret));
            if (playerStats.bleed > 5) ret = (ret == null ? 'player_bleed' : (Math.random() < 0.5 ? 'player_bleed' : ret));
            if (ret != null && Math.random() < 0.7) return ret;
        }

        // Rival pride triggers
        if (rivalBuild) {
            const offensiveBuilds = ['attack', 'speed', 'crit', 'execute', 'bleed'];
            const defensiveBuilds = ['hp', 'armor', 'regen', 'thorns', 'lifesteal'];

            if (offensiveBuilds.includes(rivalBuild)) {
                return 'rival_going_attack';
            }
            if (defensiveBuilds.includes(rivalBuild)) {
                return 'rival_going_defense';
            }
        }

        // Round-based triggers
        if (round <= 3) return 'early_game';
        if (round <= 7) return 'mid_game';
        if (round > 7) return 'late_game';

        return 'generic';
    },

    /**
     * Check if the last combat was a close call
     * @param {Fighter} winner - Winning fighter
     * @returns {boolean} - True if winner had <20% HP
     */
    wasCloseCall(winner) {
        if (!winner) return false;
        return (winner.hp / winner.maxHp) < 0.2;
    }
};
