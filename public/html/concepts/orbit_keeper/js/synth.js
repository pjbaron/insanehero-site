/**
 * SynthAudio - Procedural sound effects via Web Audio API
 * No audio files needed - everything is generated from oscillators
 */

var SynthAudio = {
    ctx: null,
    masterGain: null,
    volume: 0.5,

    init: function(audioCtx) {
        this.ctx = audioCtx;
        if (!this.ctx) return;
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.volume;
        this.masterGain.connect(this.ctx.destination);
    },

    _osc: function(type, freq, startTime, duration, gainVal) {
        if (!this.ctx || !this.masterGain) return null;
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.masterGain);
        gain.gain.setValueAtTime(gainVal, startTime);
        osc.start(startTime);
        osc.stop(startTime + duration);
        return { osc: osc, gain: gain };
    },

    _noise: function(startTime, duration, gainVal, filterFreq) {
        if (!this.ctx || !this.masterGain) return;
        var sr = this.ctx.sampleRate;
        var len = Math.floor(sr * duration);
        var buf = this.ctx.createBuffer(1, len, sr);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var src = this.ctx.createBufferSource();
        src.buffer = buf;

        var filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq || 2000;
        filter.Q.value = 1.0;

        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(gainVal, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        src.start(startTime);
        src.stop(startTime + duration);
    },

    playLaunch: function() {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var n = this._osc('sine', 200, t, 0.12, 0.15);
        if (n) {
            n.osc.frequency.linearRampToValueAtTime(400, t + 0.1);
            n.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        }
    },

    playCapture: function(combo) {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        combo = combo || 0;
        var freq = Math.min(800 + combo * 50, 1200);
        var n = this._osc('sine', freq, t, 0.35, 0.25);
        if (n) {
            n.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        }
    },

    playPerfect: function() {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var n1 = this._osc('sine', 800, t, 0.4, 0.2);
        var n2 = this._osc('sine', 1200, t, 0.4, 0.15);
        if (n1) n1.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        if (n2) n2.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    },

    playShatter: function(chainSize) {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        chainSize = chainSize || 1;
        var vol = Math.min(0.15 + chainSize * 0.03, 0.35);
        this._noise(t, 0.18, vol, 2000);
    },

    playPlanetArrive: function() {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var n = this._osc('sine', 80, t, 0.6, 0);
        if (n) {
            n.gain.gain.linearRampToValueAtTime(0.12, t + 0.25);
            n.gain.gain.linearRampToValueAtTime(0, t + 0.6);
        }
    },

    playGameOver: function() {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var notes = [400, 300, 200];
        for (var i = 0; i < notes.length; i++) {
            var n = this._osc('triangle', notes[i], t + i * 0.22, 0.25, 0.2);
            if (n) {
                n.gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.22 + 0.25);
            }
        }
    },

    playMilestone: function() {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var notes = [400, 600, 800, 1000];
        for (var i = 0; i < notes.length; i++) {
            var n = this._osc('sine', notes[i], t + i * 0.06, 0.1, 0.15);
            if (n) {
                n.gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.1);
            }
        }
    },

    muteAll: function() {
        if (this.masterGain) this.masterGain.gain.value = 0;
    },

    unmuteAll: function() {
        if (this.masterGain) this.masterGain.gain.value = this.volume;
    }
};
