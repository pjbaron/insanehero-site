/**
 * Procedural SFX generator (global, non-module)
 * Synthesizes all game sounds via OfflineAudioContext -- zero audio file downloads
 */
var SfxGen = {
    buffers: {},
    ctx: null, // will be set to GameAudio.ctx

    init: function(audioCtx) {
        this.ctx = audioCtx;
        if (!this.ctx) return;
        this._generate('bounce', this._bounce);
        this._generate('wallPlace', this._wallPlace);
        this._generate('wallBreak', this._wallBreak);
        this._generate('demonHit', this._demonHit);
        this._generate('demonSpawn', this._demonSpawn);
        this._generate('snowSafe', this._snowSafe);
        this._generate('snowDie', this._snowDie);
        this._generate('split', this._split);
        this._generate('gameOver', this._gameOverSfx);
    },

    _generate: function(name, fn) {
        var sr = 22050;
        var dur = fn.duration || 0.3;
        var frames = Math.ceil(sr * dur);
        var offline = new OfflineAudioContext(1, frames, sr);
        fn.call(this, offline, dur);
        offline.startRendering().then(function(buf) {
            SfxGen.buffers[name] = buf;
        });
    },

    play: function(name, vol) {
        if (!this.ctx || !this.buffers[name]) return;
        var src = this.ctx.createBufferSource();
        src.buffer = this.buffers[name];
        var g = this.ctx.createGain();
        g.gain.value = (vol !== undefined ? vol : 0.5) * GameAudio.sfxVolume * GameAudio.masterVolume;
        src.connect(g);
        g.connect(this.ctx.destination);
        src.start();
    },

    // --- Sound definitions ---

    _bounce: function(ctx, dur) {
        this._bounce.duration = 0.15;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(800, 0);
        o.frequency.exponentialRampToValueAtTime(400, 0.15);
        g.gain.setValueAtTime(0.6, 0);
        g.gain.exponentialRampToValueAtTime(0.01, 0.15);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(0.15);
    },

    _wallPlace: function(ctx, dur) {
        this._wallPlace.duration = 0.12;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(1200, 0);
        o.frequency.exponentialRampToValueAtTime(600, 0.12);
        g.gain.setValueAtTime(0.3, 0);
        g.gain.exponentialRampToValueAtTime(0.01, 0.12);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(0.12);
    },

    _wallBreak: function(ctx, dur) {
        this._wallBreak.duration = 0.25;
        var bufSize = Math.ceil(22050 * 0.25);
        var noise = ctx.createBufferSource();
        var nBuf = ctx.createBuffer(1, bufSize, 22050);
        var data = nBuf.getChannelData(0);
        for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = nBuf;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.4, 0);
        g.gain.exponentialRampToValueAtTime(0.01, 0.25);
        noise.connect(g); g.connect(ctx.destination);
        noise.start(); noise.stop(0.25);
    },

    _demonHit: function(ctx, dur) {
        this._demonHit.duration = 0.35;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, 0);
        o.frequency.exponentialRampToValueAtTime(60, 0.35);
        g.gain.setValueAtTime(0.5, 0);
        g.gain.exponentialRampToValueAtTime(0.01, 0.35);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(0.35);
    },

    _demonSpawn: function(ctx, dur) {
        this._demonSpawn.duration = 0.2;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(100, 0);
        o.frequency.exponentialRampToValueAtTime(300, 0.2);
        g.gain.setValueAtTime(0.2, 0);
        g.gain.exponentialRampToValueAtTime(0.01, 0.2);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(0.2);
    },

    _snowSafe: function(ctx, dur) {
        this._snowSafe.duration = 0.3;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(600, 0);
        o.frequency.setValueAtTime(800, 0.1);
        o.frequency.setValueAtTime(1000, 0.2);
        g.gain.setValueAtTime(0.4, 0);
        g.gain.exponentialRampToValueAtTime(0.01, 0.3);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(0.3);
    },

    _snowDie: function(ctx, dur) {
        this._snowDie.duration = 0.4;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(500, 0);
        o.frequency.exponentialRampToValueAtTime(150, 0.4);
        g.gain.setValueAtTime(0.5, 0);
        g.gain.exponentialRampToValueAtTime(0.01, 0.4);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(0.4);
    },

    _split: function(ctx, dur) {
        this._split.duration = 0.5;
        var o1 = ctx.createOscillator();
        var o2 = ctx.createOscillator();
        var g = ctx.createGain();
        o1.type = 'sine'; o1.frequency.setValueAtTime(400, 0); o1.frequency.exponentialRampToValueAtTime(800, 0.25);
        o2.type = 'sine'; o2.frequency.setValueAtTime(400, 0.25); o2.frequency.exponentialRampToValueAtTime(200, 0.5);
        g.gain.setValueAtTime(0.4, 0);
        g.gain.setValueAtTime(0.4, 0.25);
        g.gain.exponentialRampToValueAtTime(0.01, 0.5);
        o1.connect(g); o2.connect(g); g.connect(ctx.destination);
        o1.start(); o1.stop(0.25);
        o2.start(0.25); o2.stop(0.5);
    },

    _gameOverSfx: function(ctx, dur) {
        this._gameOverSfx.duration = 0.6;
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, 0);
        o.frequency.exponentialRampToValueAtTime(80, 0.6);
        g.gain.setValueAtTime(0.5, 0);
        g.gain.exponentialRampToValueAtTime(0.01, 0.6);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(0.6);
    }
};
