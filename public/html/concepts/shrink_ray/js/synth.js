/**
 * Synth - Procedural sound effects via Web Audio API oscillators
 * No audio files needed. All SFX are generated in real-time.
 */

var Synth = {
    ctx: null,
    masterGain: null,
    volume: 0.35,

    init: function() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            this.ctx = null;
        }
    },

    resume: function() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    mute: function() {
        if (this.masterGain) this.masterGain.gain.value = 0;
    },

    unmute: function() {
        if (this.masterGain) this.masterGain.gain.value = this.volume;
    },

    _osc: function(type, freq, duration, vol, detune) {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;
        gain.gain.setValueAtTime(vol || 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + duration);
    },

    _noise: function(duration, vol) {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var sampleRate = this.ctx.sampleRate;
        var len = Math.floor(sampleRate * duration);
        var buffer = this.ctx.createBuffer(1, len, sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        }
        var src = this.ctx.createBufferSource();
        src.buffer = buffer;
        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol || 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(gain);
        gain.connect(this.masterGain);
        src.start(t);
    },

    // Shrink ray zap - descending sci-fi tone
    shrink: function() {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);

        // Add a second layer for thickness
        var osc2 = this.ctx.createOscillator();
        var gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(900, t);
        osc2.frequency.exponentialRampToValueAtTime(150, t + 0.12);
        gain2.gain.setValueAtTime(0.12, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(t);
        osc2.stop(t + 0.15);
    },

    // Reverse ray - ascending tone
    reverseRay: function() {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.2);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.3);

        this._osc('triangle', 400, 0.25, 0.15, 5);
    },

    // Wall bounce - short thump (throttled to avoid audio spam)
    _lastBounce: 0,
    bounce: function() {
        var now = performance.now();
        if (now - this._lastBounce < 60) return; // max ~16 bounces/sec
        this._lastBounce = now;
        this._osc('sine', 180, 0.08, 0.15);
        this._noise(0.04, 0.08);
    },

    // Player hit / death
    death: function() {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        // Low rumble
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.6);

        this._noise(0.4, 0.25);
    },

    // Combo sound - quick ascending pips
    combo: function(level) {
        var baseFreq = 400 + (level - 1) * 100;
        this._osc('square', baseFreq, 0.08, 0.12);
        var self = this;
        setTimeout(function() {
            self._osc('square', baseFreq * 1.25, 0.08, 0.12);
        }, 50);
    },

    // Pickup collected
    pickup: function() {
        this._osc('sine', 600, 0.1, 0.2);
        var self = this;
        setTimeout(function() {
            self._osc('sine', 900, 0.15, 0.2);
        }, 80);
    },

    // Graze near-miss
    graze: function() {
        this._osc('triangle', 500, 0.06, 0.1);
    },

    // Menu click / UI
    click: function() {
        this._osc('square', 800, 0.05, 0.1);
    }
};
