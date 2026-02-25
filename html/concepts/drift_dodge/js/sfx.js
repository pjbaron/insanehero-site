/**
 * SFX - Procedural sound effects using Web Audio API
 * No audio files needed - all sounds generated from oscillators
 */
const SFX = {
    ctx: null,
    _muted: false,

    init(audioCtx) {
        this.ctx = audioCtx;
    },

    _gain(vol) {
        if (!this.ctx || this._muted) return null;
        var g = this.ctx.createGain();
        g.gain.value = vol;
        g.connect(this.ctx.destination);
        return g;
    },

    nearMiss(combo) {
        if (!this.ctx || this._muted) return;
        var t = this.ctx.currentTime;
        var baseFreq = 800 + (combo || 0) * 40;

        // Whoosh - filtered noise via oscillator
        var osc = this.ctx.createOscillator();
        var g = this._gain(0.15);
        if (!g) return;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.15);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.2);

        // High zing
        var osc2 = this.ctx.createOscillator();
        var g2 = this._gain(0.08);
        if (!g2) return;
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200 + combo * 80, t);
        osc2.frequency.exponentialRampToValueAtTime(2000 + combo * 100, t + 0.1);
        g2.gain.setValueAtTime(0.08, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc2.connect(g2);
        osc2.start(t);
        osc2.stop(t + 0.15);
    },

    crash() {
        if (!this.ctx || this._muted) return;
        var t = this.ctx.currentTime;

        // Low thud
        var osc = this.ctx.createOscillator();
        var g = this._gain(0.3);
        if (!g) return;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.4);

        // Noise crunch
        var osc2 = this.ctx.createOscillator();
        var g2 = this._gain(0.2);
        if (!g2) return;
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(200, t);
        osc2.frequency.exponentialRampToValueAtTime(30, t + 0.15);
        g2.gain.setValueAtTime(0.2, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc2.connect(g2);
        osc2.start(t);
        osc2.stop(t + 0.25);
    },

    coin() {
        if (!this.ctx || this._muted) return;
        var t = this.ctx.currentTime;

        var osc = this.ctx.createOscillator();
        var g = this._gain(0.15);
        if (!g) return;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(1320, t + 0.06);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.25);
    },

    comboLost() {
        if (!this.ctx || this._muted) return;
        var t = this.ctx.currentTime;

        var osc = this.ctx.createOscillator();
        var g = this._gain(0.12);
        if (!g) return;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.4);
    },

    phaseChange() {
        if (!this.ctx || this._muted) return;
        var t = this.ctx.currentTime;

        // Rising sweep
        var osc = this.ctx.createOscillator();
        var g = this._gain(0.1);
        if (!g) return;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.4);
        g.gain.setValueAtTime(0.1, t);
        g.gain.setValueAtTime(0.1, t + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.55);

        // Harmony
        var osc2 = this.ctx.createOscillator();
        var g2 = this._gain(0.06);
        if (!g2) return;
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(450, t + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(1800, t + 0.45);
        g2.gain.setValueAtTime(0.06, t + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc2.connect(g2);
        osc2.start(t + 0.05);
        osc2.stop(t + 0.55);
    },

    gameOver() {
        if (!this.ctx || this._muted) return;
        var t = this.ctx.currentTime;

        // Low rumble
        var osc = this.ctx.createOscillator();
        var g = this._gain(0.25);
        if (!g) return;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.8);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 1.1);

        // Glass break (high noise)
        var osc2 = this.ctx.createOscillator();
        var g2 = this._gain(0.12);
        if (!g2) return;
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(2000, t);
        osc2.frequency.exponentialRampToValueAtTime(100, t + 0.4);
        g2.gain.setValueAtTime(0.12, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc2.connect(g2);
        osc2.start(t);
        osc2.stop(t + 0.55);
    },

    mute() { this._muted = true; },
    unmute() { this._muted = false; }
};
