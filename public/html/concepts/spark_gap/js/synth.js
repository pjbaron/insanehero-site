/**
 * Synth - Runtime audio synthesis for Spark Gap
 * All sounds generated with Web Audio oscillators, no files needed
 * Global object (non-module), loaded before game modules
 */

const Synth = {
    ctx: null,
    master: null,
    enabled: true,

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.3;
            this.master.connect(this.ctx.destination);
        } catch (e) {
            this.enabled = false;
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    mute() { if (this.master) this.master.gain.value = 0; },
    unmute() { if (this.master) this.master.gain.value = 0.3; },

    _osc(type, freq, duration, vol, detune) {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;
        var o = this.ctx.createOscillator();
        var g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        if (detune) o.detune.value = detune;
        g.gain.setValueAtTime(vol || 0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + duration);
    },

    _noise(duration, vol) {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;
        var len = this.ctx.sampleRate * duration;
        var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        var src = this.ctx.createBufferSource();
        src.buffer = buf;
        var g = this.ctx.createGain();
        g.gain.setValueAtTime(vol || 0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(g);
        g.connect(this.master);
        src.start(t);
        src.stop(t + duration);
    },

    /** Wire placed on a cell - quick electric tick, pitch rises with length */
    wireStep(pathLength) {
        var base = 600 + pathLength * 30;
        this._osc('square', base, 0.04, 0.12);
        this._osc('sine', base * 1.5, 0.03, 0.06);
    },

    /** Connection complete - satisfying ascending arc */
    connect(pathLength) {
        var base = 400;
        for (var i = 0; i < 5; i++) {
            var t = this.ctx.currentTime + i * 0.05;
            var o = this.ctx.createOscillator();
            var g = this.ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(base + i * 120, t);
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            o.connect(g);
            g.connect(this.master);
            o.start(t);
            o.stop(t + 0.15);
        }
        // Sparkle on top
        this._osc('triangle', 1200, 0.2, 0.1);
    },

    /** Short circuit - harsh buzz */
    short() {
        this._osc('sawtooth', 80, 0.3, 0.25);
        this._osc('square', 120, 0.25, 0.15);
        this._noise(0.15, 0.2);
    },

    /** Fuse blown - deep thud + crack */
    fuseBlow() {
        this._osc('sine', 60, 0.4, 0.3);
        this._osc('sawtooth', 90, 0.3, 0.2);
        this._noise(0.2, 0.25);
    },

    /** Energy drain warning - fast beep */
    drainWarning() {
        this._osc('square', 800, 0.08, 0.15);
    },

    /** Energy ran out */
    energyDead() {
        this._osc('sawtooth', 200, 0.3, 0.2);
        this._osc('sine', 150, 0.4, 0.15);
    },

    /** Surge round starts */
    surgeStart() {
        this._osc('square', 500, 0.1, 0.2);
        this._osc('square', 700, 0.1, 0.15);
        this._osc('square', 900, 0.1, 0.12);
        this._noise(0.08, 0.1);
    },

    /** Game over */
    gameOverSound() {
        var base = 400;
        for (var i = 0; i < 4; i++) {
            var t = this.ctx.currentTime + i * 0.15;
            var o = this.ctx.createOscillator();
            var g = this.ctx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(base - i * 80, t);
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            o.connect(g);
            g.connect(this.master);
            o.start(t);
            o.stop(t + 0.2);
        }
    },

    /** Menu/start click */
    menuClick() {
        this._osc('sine', 600, 0.08, 0.15);
        this._osc('triangle', 900, 0.06, 0.1);
    },

    /** Combo increase */
    comboUp(level) {
        var base = 500 + level * 100;
        this._osc('sine', base, 0.1, 0.15);
        this._osc('triangle', base * 1.5, 0.08, 0.1);
    },

    /** Section power up - deep satisfying hum */
    powerUp() {
        this._osc('sine', 100, 0.5, 0.15);
        this._osc('sine', 200, 0.4, 0.1);
        this._osc('triangle', 400, 0.3, 0.08);
    },

    /** Backtrack - erase wire cell */
    wireErase() {
        this._osc('sine', 300, 0.04, 0.08);
    },

    /** Ambient electric hum (called periodically) */
    ambientHum() {
        this._osc('sine', 60, 0.8, 0.02);
    }
};
