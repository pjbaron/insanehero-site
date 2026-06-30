// poki.js - Poki SDK integration (global-script version of the overbite module).
//
// The SDK itself is loaded as a <script> in index.html (window.PokiSDK). If it is
// absent (local/offline dev) every call degrades to a safe no-op, so the game runs
// identically with or without Poki.
//
// FLAGS:
//   enabled    - master switch for ALL Poki calls (false = pure offline mode).
//   adsEnabled - gates ONLY the ad breaks. Stays false for dev/testing; the release
//                build turns it on (main.js: adsEnabled = !window.DEV_TOOLS).
(function (global) {
  "use strict";

  const Poki = {
    enabled: true,
    adsEnabled: false,
    initialized: false,
    isPlaying: false,
    audioSink: null,        // set by main.js; muted for the duration of an ad break

    async init() {
      if (!this.enabled || typeof PokiSDK === "undefined") {
        console.log("Poki SDK not available - running in offline mode");
        this.initialized = false;
        return true;
      }
      try {
        await PokiSDK.init();
        this.initialized = true;
        this.initVisibilityHandler();
        console.log("Poki SDK initialized");
      } catch (e) {
        console.log("Poki SDK init failed, continuing anyway:", e);
        this.initialized = false;
      }
      return true;
    },

    // Call once all assets are loaded and the game is ready to play.
    gameLoadingFinished() {
      if (!this.initialized) return;
      try { PokiSDK.gameLoadingFinished(); } catch (e) { console.warn("Poki gameLoadingFinished error:", e); }
    },

    // Player entered active gameplay (first input). No double-fire.
    gameplayStart() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      if (!this.initialized) return;
      try { PokiSDK.gameplayStart(); } catch (e) { console.warn("Poki gameplayStart error:", e); }
    },

    // Player left active gameplay (end screen, pause, tab hidden). No double-fire.
    gameplayStop() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      if (!this.initialized) return;
      try { PokiSDK.gameplayStop(); } catch (e) { console.warn("Poki gameplayStop error:", e); }
    },

    // Pause/resume gameplay tracking when the tab is hidden/shown (covers mobile
    // interruptions where there is no ESC key).
    initVisibilityHandler() {
      document.addEventListener("visibilitychange", () => {
        if (!this.initialized || !this.isPlaying) return;
        try {
          if (document.hidden) PokiSDK.gameplayStop();
          else PokiSDK.gameplayStart();
        } catch (e) { }
      });
    },

    // Interstitial at a natural break (between runs). Resolves when done/skipped/
    // failed. No-op (instant resolve) while adsEnabled is false.
    async commercialBreak() {
      if (!this.adsEnabled || !this.initialized) return;
      try {
        if (this.isPlaying) { PokiSDK.gameplayStop(); this.isPlaying = false; }
        if (this.audioSink) this.audioSink.setAdMuted(true);
        await PokiSDK.commercialBreak();
      } catch (e) { console.warn("Poki commercialBreak error:", e); }
      finally { if (this.audioSink) this.audioSink.setAdMuted(false); this.reclaimFocus(); }
    },

    // After an ad (its iframe held focus) reclaim keyboard focus for the game iframe.
    reclaimFocus() {
      if (typeof window !== "undefined" && window.focus) window.focus();
    },
  };

  global.Poki = Poki;
})(window);
