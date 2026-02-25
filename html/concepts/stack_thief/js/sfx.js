/**
 * SFX - Procedural sound synthesis for Stack Thief
 * All sounds generated via Web Audio API oscillators, no files needed
 */

const SFX = {
    ctx: null,

    init(audioCtx) {
        this.ctx = audioCtx;
    },

    _getCtx() {
        if (!this.ctx) {
            if (GameAudio.ctx) this.ctx = GameAudio.ctx;
            else return null;
        }
        return this.ctx;
    },

    playSteal() {
        var ctx = this._getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    playLand() {
        var ctx = this._getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var bufferSize = ctx.sampleRate * 0.08;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(t);
    },

    playBrace() {
        var ctx = this._getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 80;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
    },

    playCollapse() {
        var ctx = this._getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var bufferSize = ctx.sampleRate * 0.6;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.6);
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(t);
    },

    playCombo(n) {
        var ctx = this._getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var freq = 440 * Math.min(n, 8);
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = Math.min(freq, 3000);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    },

    playDanger() {
        var ctx = this._getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        for (var i = 0; i < 2; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = 200;
            gain.gain.setValueAtTime(0.15, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.1);
        }
    },

    playTimeUp() {
        var ctx = this._getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 300;
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    },

    playHighScore() {
        var ctx = this._getCtx();
        if (!ctx) return;
        var t = ctx.currentTime;
        var notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
        for (var i = 0; i < notes.length; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = notes[i];
            var start = t + i * 0.12;
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.16);
        }
    }
};
