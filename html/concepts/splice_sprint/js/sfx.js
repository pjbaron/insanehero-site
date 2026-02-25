/**
 * Splice Sprint - Procedural SFX
 * All sounds synthesized via Web Audio oscillators + noise
 */

var SFX = {
    _ctx: null,
    _master: null,

    init: function() {
        this._ctx = GameAudio.ctx;
        if (!this._ctx) return;
        this._master = this._ctx.createGain();
        this._master.gain.value = 0.3;
        this._master.connect(this._ctx.destination);
    },

    _osc: function(type, freq, duration, volume, detune) {
        if (!this._ctx || !this._master) return;
        var ctx = this._ctx;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;
        gain.gain.setValueAtTime(volume || 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(this._master);
        osc.start(t);
        osc.stop(t + duration);
    },

    _noise: function(duration, volume, filterFreq) {
        if (!this._ctx || !this._master) return;
        var ctx = this._ctx;
        var t = ctx.currentTime;
        var bufSize = ctx.sampleRate * duration;
        var buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < bufSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var src = ctx.createBufferSource();
        src.buffer = buf;
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq || 2000;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(volume || 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this._master);
        src.start(t);
        src.stop(t + duration);
    },

    // Fork choice - quick chirp
    forkChoose: function() {
        this._osc('sine', 600, 0.08, 0.25);
        this._osc('sine', 900, 0.06, 0.15);
    },

    // Boost pickup - rising sweep
    boost: function() {
        if (!this._ctx || !this._master) return;
        var ctx = this._ctx;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this._master);
        osc.start(t);
        osc.stop(t + 0.3);
    },

    // Coin collect - high ping
    coin: function() {
        this._osc('sine', 1200, 0.08, 0.2);
        this._osc('sine', 1600, 0.06, 0.15);
    },

    // Mud hit - low thud
    mud: function() {
        this._noise(0.3, 0.25, 400);
        this._osc('sine', 80, 0.2, 0.3);
    },

    // Bridge wobble - creaky
    bridge: function() {
        this._osc('sawtooth', 120, 0.15, 0.1);
        this._noise(0.2, 0.1, 800);
    },

    // Dead end crumble - rumble + crack
    deadEnd: function() {
        this._noise(0.8, 0.4, 600);
        this._osc('square', 60, 0.5, 0.3);
        this._osc('sawtooth', 40, 0.6, 0.2);
    },

    // Ramp launch - whoosh up
    ramp: function() {
        if (!this._ctx || !this._master) return;
        var ctx = this._ctx;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(this._master);
        osc.start(t);
        osc.stop(t + 0.5);
        this._noise(0.4, 0.15, 3000);
    },

    // Land after ramp
    land: function() {
        this._noise(0.15, 0.3, 500);
        this._osc('sine', 100, 0.15, 0.25);
    },

    // Game over - descending
    gameOver: function() {
        if (!this._ctx || !this._master) return;
        var ctx = this._ctx;
        var t = ctx.currentTime;
        for (var i = 0; i < 4; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = 400 - i * 80;
            gain.gain.setValueAtTime(0.15, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.2);
            osc.connect(gain);
            gain.connect(this._master);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.2);
        }
    },

    // Menu select
    select: function() {
        this._osc('sine', 500, 0.05, 0.2);
        this._osc('sine', 750, 0.08, 0.2);
    },

    // Speed milestone
    speedUp: function() {
        this._osc('triangle', 400, 0.1, 0.15);
        this._osc('triangle', 600, 0.1, 0.15);
        this._osc('triangle', 800, 0.15, 0.2);
    }
};
