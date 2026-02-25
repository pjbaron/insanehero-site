/**
 * Synth - Procedural audio via Web Audio API oscillators
 * Zero asset files, instant load
 */

const Synth = {
    ctx: null,

    init() {
        if (this.ctx) return;
        try {
            this.ctx = GameAudio.ctx || new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            return;
        }
    },

    _tone(freq, duration, type, vol, decay) {
        if (!this.ctx) return;
        var now = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime((vol || 0.3) * GameAudio.sfxVolume * GameAudio.masterVolume, now);
        if (decay !== false) {
            gain.gain.exponentialRampToValueAtTime(0.001, now + (duration || 0.15));
        }
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (duration || 0.15));
    },

    _noise(duration, vol) {
        if (!this.ctx) return;
        var now = this.ctx.currentTime;
        var dur = duration || 0.1;
        var sr = this.ctx.sampleRate;
        var buf = this.ctx.createBuffer(1, sr * dur, sr);
        var data = buf.getChannelData(0);
        for (var i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        var src = this.ctx.createBufferSource();
        src.buffer = buf;
        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime((vol || 0.2) * GameAudio.sfxVolume * GameAudio.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start(now);
    },

    // Ball hits a regular peg - pitch increases with combo
    pegHit(combo) {
        var base = 440 + Math.min(combo, 20) * 40;
        this._tone(base, 0.12, 'sine', 0.25);
        this._tone(base * 1.5, 0.08, 'sine', 0.1);
    },

    // Ball hits a bumper - chunky bounce
    bumperHit() {
        this._tone(220, 0.15, 'square', 0.2);
        this._tone(330, 0.1, 'triangle', 0.15);
    },

    // Ball hits wall
    wallHit() {
        this._tone(180, 0.06, 'triangle', 0.1);
    },

    // Ball launched
    launch() {
        if (!this.ctx) return;
        var now = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.25 * GameAudio.sfxVolume * GameAudio.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    },

    // Ball lands in a zone
    landing(multiplier) {
        var base = 300 + multiplier * 50;
        this._tone(base, 0.2, 'sine', 0.3);
        this._tone(base * 1.25, 0.15, 'sine', 0.2);
        if (multiplier >= 5) {
            this._tone(base * 1.5, 0.25, 'triangle', 0.15);
        }
    },

    // Explosive peg detonation
    explode() {
        this._noise(0.3, 0.35);
        this._tone(80, 0.3, 'sawtooth', 0.2);
        this._tone(60, 0.4, 'square', 0.15);
    },

    // Magnet peg activation
    magnet() {
        if (!this.ctx) return;
        var now = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);
        gain.gain.setValueAtTime(0.2 * GameAudio.sfxVolume * GameAudio.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    },

    // Extra ball earned
    extraBall() {
        var self = this;
        this._tone(523, 0.1, 'sine', 0.3);
        setTimeout(function () { self._tone(659, 0.1, 'sine', 0.3); }, 80);
        setTimeout(function () { self._tone(784, 0.15, 'sine', 0.3); }, 160);
    },

    // Round complete fanfare
    roundComplete() {
        var self = this;
        this._tone(523, 0.15, 'triangle', 0.25);
        setTimeout(function () { self._tone(659, 0.15, 'triangle', 0.25); }, 120);
        setTimeout(function () { self._tone(784, 0.15, 'triangle', 0.25); }, 240);
        setTimeout(function () { self._tone(1047, 0.3, 'triangle', 0.3); }, 360);
    },

    // Game over
    gameOverSound() {
        var self = this;
        this._tone(400, 0.2, 'sine', 0.25);
        setTimeout(function () { self._tone(350, 0.2, 'sine', 0.25); }, 200);
        setTimeout(function () { self._tone(300, 0.3, 'sine', 0.2); }, 400);
        setTimeout(function () { self._tone(200, 0.5, 'triangle', 0.2); }, 600);
    }
};
