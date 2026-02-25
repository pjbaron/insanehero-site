/**
 * SFX - Synthesized sound effects via Web Audio API
 * Zero external assets, instant load
 */

const SFX = {
    ctx: null,

    init() {
        if (this.ctx) return;
        try {
            this.ctx = GameAudio.ctx;
        } catch (e) {}
    },

    _ensureCtx() {
        if (!this.ctx && GameAudio.ctx) this.ctx = GameAudio.ctx;
        return this.ctx;
    },

    flip() {
        var ctx = this._ensureCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    },

    flipDown() {
        var ctx = this._ensureCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    },

    collect() {
        var ctx = this._ensureCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        // Two-tone arpeggio
        for (var i = 0; i < 3; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            var t = now + i * 0.06;
            osc.frequency.setValueAtTime(600 + i * 200, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
        }
    },

    nearMiss() {
        var ctx = this._ensureCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    },

    death() {
        var ctx = this._ensureCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        // Low descending buzz
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        // Noise burst
        var buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        var noise = ctx.createBufferSource();
        noise.buffer = buf;
        var ng = ctx.createGain();
        ng.gain.setValueAtTime(0.3, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        noise.connect(ng);
        ng.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.15);
    },

    riptideEnter() {
        var ctx = this._ensureCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        // Whooshing sweep
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    },

    riptideExit() {
        var ctx = this._ensureCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    },

    milestone() {
        var ctx = this._ensureCtx();
        if (!ctx) return;
        var now = ctx.currentTime;
        var notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        for (var i = 0; i < notes.length; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = 'sine';
            var t = now + i * 0.08;
            osc.frequency.setValueAtTime(notes[i], t);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.15);
        }
    }
};
