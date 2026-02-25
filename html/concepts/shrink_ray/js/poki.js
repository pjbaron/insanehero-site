/**
 * Poki SDK Integration
 * Wrapper for Poki platform features: ads, analytics, gameplay tracking
 */

const Poki = {
    initialized: false,
    enabled: true,  // Set false to disable all Poki calls (for local testing without SDK)
    isPlaying: false,  // Track if we're in active gameplay

    /**
     * Initialize the Poki SDK
     * Call this before starting the game
     */
    async init() {
        if (!this.enabled || typeof PokiSDK === 'undefined') {
            console.log('Poki SDK not available, running in offline mode');
            this.initialized = false;
            return true;  // Continue game anyway
        }

        try {
            await PokiSDK.init();
            this.initialized = true;
            this.initVisibilityHandler();
            console.log('Poki SDK initialized');
            return true;
        } catch (e) {
            console.log('Poki SDK init failed, continuing anyway:', e);
            this.initialized = false;
            return true;  // Continue game anyway
        }
    },

    /**
     * Signal that game loading is complete
     * Call after all assets are loaded and game is ready to play
     */
    gameLoadingFinished() {
        if (!this.initialized) return;
        try {
            PokiSDK.gameLoadingFinished();
        } catch (e) {
            console.warn('Poki gameLoadingFinished error:', e);
        }
    },

    /**
     * Signal that gameplay has started
     * Call when player enters active gameplay
     */
    gameplayStart() {
        if (this.isPlaying) return;  // Already playing, avoid duplicate
        this.isPlaying = true;
        if (!this.initialized) return;
        try {
            PokiSDK.gameplayStart();
        } catch (e) {
            console.warn('Poki gameplayStart error:', e);
        }
    },

    /**
     * Signal that gameplay has stopped
     * Call when player leaves active gameplay (menus, pause, game over)
     */
    gameplayStop() {
        if (!this.isPlaying) return;  // Already stopped, avoid duplicate
        this.isPlaying = false;
        if (!this.initialized) return;
        try {
            PokiSDK.gameplayStop();
        } catch (e) {
            console.warn('Poki gameplayStop error:', e);
        }
    },

    /**
     * Set up visibility change listener for tab switching
     * Pauses gameplay tracking when tab is hidden
     * Note: Calls SDK directly to bypass duplicate checks (re-sending state is intentional)
     */
    initVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (!this.initialized || !this.isPlaying) return;

            try {
                if (document.hidden) {
                    PokiSDK.gameplayStop();
                } else {
                    PokiSDK.gameplayStart();
                }
            } catch (e) {}
        });
    },

    /**
     * Request a commercial break (video ad)
     * Returns a promise that resolves when the ad is done (or skipped/failed)
     * Call at natural break points: between rounds, after defeat, etc.
     */
    async commercialBreak(muteAudioFn, unmuteAudioFn) {
        if (!this.initialized) return;
        try {
            // Only stop if currently playing (avoid duplicate calls)
            if (this.isPlaying) {
                PokiSDK.gameplayStop();
                this.isPlaying = false;
            }
            await PokiSDK.commercialBreak(() => {
                // SDK calls this when ad starts - mute game audio
                if (muteAudioFn) muteAudioFn();
            });
            // Ad finished/skipped - unmute game audio
            if (unmuteAudioFn) unmuteAudioFn();
        } catch (e) {
            console.warn('Poki commercialBreak error:', e);
            if (unmuteAudioFn) unmuteAudioFn();
        }
    },

    /**
     * Request a rewarded ad (player chooses to watch for reward)
     * Returns true if the ad was watched completely, false otherwise
     */
    async rewardedBreak(muteAudioFn, unmuteAudioFn) {
        if (!this.initialized) return false;
        try {
            PokiSDK.gameplayStop();
            const success = await PokiSDK.rewardedBreak(() => {
                if (muteAudioFn) muteAudioFn();
            });
            if (unmuteAudioFn) unmuteAudioFn();
            return success;
        } catch (e) {
            console.warn('Poki rewardedBreak error:', e);
            if (unmuteAudioFn) unmuteAudioFn();
            return false;
        }
    },

    /**
     * Check if rewarded ads are available
     */
    isRewardedAvailable() {
        if (!this.initialized) return false;
        try {
            return PokiSDK.rewardedBreak.isAvailable?.() ?? true;
        } catch (e) {
            return false;
        }
    }
};
