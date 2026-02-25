/**
 * Synth - Procedural Web Audio SFX
 * No asset files needed - generates all sounds from oscillators + noise
 */

const Synth = {
    ctx: null,
    master: null,
    volume: 0.5,

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Synth: Web Audio not supported');
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    mute() { if (this.master) this.master.gain.value = 0; },
    unmute() { if (this.master) this.master.gain.value = this.volume; },

    _osc(type, freq, duration, vol, detune) {
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
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + duration);
    },

    _noise(duration, vol) {
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var bufferSize = this.ctx.sampleRate * duration;
        var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        var src = this.ctx.createBufferSource();
        src.buffer = buffer;
        var gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol || 0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(gain);
        gain.connect(this.master);
        src.start(t);
    },

    // --- Game sounds ---

    split() {
        // Quick swoosh - high freq noise + descending tone
        this._noise(0.12, 0.2);
        this._osc('sawtooth', 800, 0.15, 0.15);
        this._osc('sawtooth', 400, 0.15, 0.1);
    },

    capture() {
        // Victory fanfare - ascending tones
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var freqs = [440, 554, 659, 880];
        for (var i = 0; i < freqs.length; i++) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freqs[i];
            gain.gain.setValueAtTime(0, t + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.2, t + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.25);
        }
    },

    hit() {
        // Quick punch impact
        this._osc('square', 150, 0.08, 0.25);
        this._noise(0.06, 0.15);
    },

    critterDie() {
        // Tiny pop
        this._osc('sine', 600, 0.06, 0.12);
        this._osc('sine', 300, 0.08, 0.08);
    },

    recall() {
        // Soft chirp - ascending
        this._osc('sine', 400, 0.1, 0.15);
        this._osc('sine', 600, 0.12, 0.12);
    },

    levelWin() {
        // Big success fanfare
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var notes = [523, 659, 784, 1047];
        for (var i = 0; i < notes.length; i++) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = notes[i];
            gain.gain.setValueAtTime(0, t + i * 0.12);
            gain.gain.linearRampToValueAtTime(0.3, t + i * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(t + i * 0.12);
            osc.stop(t + i * 0.12 + 0.5);
        }
    },

    levelLose() {
        // Descending sad tones
        this._osc('sawtooth', 300, 0.3, 0.2);
        this._osc('sawtooth', 200, 0.4, 0.15, -20);
    },

    spawn() {
        // Tiny blip
        this._osc('sine', 800, 0.05, 0.08);
    },

    tap() {
        // UI tap
        this._osc('sine', 500, 0.04, 0.1);
    },

    hazardKill() {
        // Electric zap
        this._noise(0.1, 0.2);
        this._osc('sawtooth', 200, 0.1, 0.2);
        this._osc('square', 100, 0.15, 0.1);
    },

    perfectSplit() {
        // Special sparkle
        if (!this.ctx) return;
        var t = this.ctx.currentTime;
        var freqs = [880, 1108, 1318, 1760];
        for (var i = 0; i < freqs.length; i++) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freqs[i];
            gain.gain.setValueAtTime(0, t + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.15, t + i * 0.05 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.3);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(t + i * 0.05);
            osc.stop(t + i * 0.05 + 0.3);
        }
    }
};
