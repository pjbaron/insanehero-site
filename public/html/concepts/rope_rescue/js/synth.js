/**
 * Synth - Procedural audio via Web Audio oscillators
 * Zero asset files, instant load
 * Global object (non-module), loaded before game modules
 */

const Synth = {
    ctx: null,
    masterGain: null,
    volume: 0.35,

    init() {
        if (this.ctx) return;
        try {
            this.ctx = GameAudio.ctx || new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            this.ctx = null;
        }
    },

    _ensureCtx() {
        if (!this.ctx) this.init();
        return !!this.ctx;
    },

    _osc(type, freq, duration, vol, detune) {
        if (!this._ensureCtx()) return;
        var now = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;
        gain.gain.setValueAtTime((vol || 0.3) * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    },

    _noise(duration, vol) {
        if (!this._ensureCtx()) return;
        var now = this.ctx.currentTime;
        var bufferSize = Math.floor(this.ctx.sampleRate * duration);
        var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var src = this.ctx.createBufferSource();
        src.buffer = buffer;
        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime((vol || 0.2) * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(now);
    },

    // --- Sound effects ---

    /** Rope stretched into place */
    ropePlace() {
        this._osc('triangle', 300, 0.15, 0.25);
        this._osc('triangle', 450, 0.12, 0.15);
    },

    /** Survivor bounces off rope - pitch goes up with combo */
    bounce(combo) {
        var baseFreq = 350 + (combo || 0) * 60;
        this._osc('sine', baseFreq, 0.2, 0.35);
        this._osc('triangle', baseFreq * 1.5, 0.15, 0.15);
    },

    /** Rope snaps after 3 bounces */
    ropeSnap() {
        this._noise(0.15, 0.3);
        this._osc('sawtooth', 120, 0.2, 0.2);
    },

    /** Survivor rescued - celebratory ascending tones */
    rescue(combo) {
        var base = 440 + (combo || 0) * 30;
        var now = this.ctx ? this.ctx.currentTime : 0;
        if (!this._ensureCtx()) return;
        var ctx = this.ctx;
        for (var i = 0; i < 3; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = base * (1 + i * 0.25);
            gain.gain.setValueAtTime(0.25 * this.volume, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.25);
        }
    },

    /** Survivor splats on ground */
    splat() {
        this._noise(0.3, 0.4);
        this._osc('sawtooth', 80, 0.3, 0.3);
        this._osc('square', 60, 0.15, 0.15);
    },

    /** Rope cut by player */
    ropeCut() {
        this._osc('sawtooth', 200, 0.1, 0.2);
        this._noise(0.08, 0.15);
    },

    /** Combo multiplier increase */
    comboUp(level) {
        var freq = 500 + (level || 1) * 80;
        this._osc('sine', freq, 0.12, 0.2);
        this._osc('sine', freq * 1.5, 0.1, 0.12);
    },

    /** Level complete fanfare */
    levelComplete() {
        if (!this._ensureCtx()) return;
        var ctx = this.ctx;
        var now = ctx.currentTime;
        var notes = [523, 659, 784, 1047]; // C E G C
        for (var i = 0; i < notes.length; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = notes[i];
            gain.gain.setValueAtTime(0.3 * this.volume, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.5);
        }
    },

    /** Game over - descending sad tones */
    gameOverSound() {
        if (!this._ensureCtx()) return;
        var ctx = this.ctx;
        var now = ctx.currentTime;
        var notes = [440, 370, 311, 261];
        for (var i = 0; i < notes.length; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = notes[i];
            gain.gain.setValueAtTime(0.3 * this.volume, now + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.6);
        }
    },

    /** UI click sound */
    click() {
        this._osc('sine', 600, 0.06, 0.15);
    },

    /** Mute/unmute for ads */
    mute() { if (this.masterGain) this.masterGain.gain.value = 0; },
    unmute() { if (this.masterGain) this.masterGain.gain.value = this.volume; }
};
