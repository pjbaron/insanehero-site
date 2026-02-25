/**
 * SFX - Procedural audio using Web Audio API
 * No files to load - everything is generated
 */

var SFX = {
    ctx: null,
    enabled: true,
    volume: 0.4,

    init: function() {
        // Will use GameAudio's context when available
    },

    _getCtx: function() {
        if (this.ctx) return this.ctx;
        if (GameAudio && GameAudio.ctx) {
            this.ctx = GameAudio.ctx;
            return this.ctx;
        }
        return null;
    },

    // Play a procedural sound
    _play: function(fn) {
        if (!this.enabled) return;
        var ctx = this._getCtx();
        if (!ctx) return;
        try { fn(ctx); } catch (e) {}
    },

    // ---- SOUND EFFECTS ----

    // Rope snap - sharp percussive sound
    ropeSnap: function() {
        this._play(function(ctx) {
            var now = ctx.currentTime;
            var gain = ctx.createGain();
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(SFX.volume * 0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            // Noise burst for snap
            var bufLen = ctx.sampleRate * 0.1;
            var buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.15));
            }
            var noise = ctx.createBufferSource();
            noise.buffer = buffer;

            // Bandpass filter for "twang"
            var filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
            filter.Q.value = 5;

            noise.connect(filter);
            filter.connect(gain);
            noise.start(now);
            noise.stop(now + 0.15);
        });
    },

    // Boulder impact - heavy thud
    boulderImpact: function(intensity) {
        intensity = intensity || 1;
        this._play(function(ctx) {
            var now = ctx.currentTime;
            var gain = ctx.createGain();
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(SFX.volume * 0.4 * intensity, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            // Low frequency thud
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(80 * intensity, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.3);

            // Add noise for texture
            var bufLen = ctx.sampleRate * 0.1;
            var buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.2));
            }
            var noise = ctx.createBufferSource();
            noise.buffer = buffer;
            var noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(SFX.volume * 0.2 * intensity, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            noise.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(now);
            noise.stop(now + 0.15);
        });
    },

    // Explosion - rumble + noise
    explosion: function() {
        this._play(function(ctx) {
            var now = ctx.currentTime;

            // Low rumble
            var gain = ctx.createGain();
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(SFX.volume * 0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            var osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(60, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
            osc.connect(gain);
            osc.start(now);
            osc.stop(now + 0.5);

            // Noise burst
            var bufLen = ctx.sampleRate * 0.3;
            var buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.3));
            }
            var noise = ctx.createBufferSource();
            noise.buffer = buffer;
            var noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(SFX.volume * 0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            noise.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(now);
            noise.stop(now + 0.3);
        });
    },

    // Camp destroyed - crash + squelch
    campDestroyed: function() {
        this._play(function(ctx) {
            var now = ctx.currentTime;

            // Crash
            var bufLen = ctx.sampleRate * 0.2;
            var buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25));
            }
            var noise = ctx.createBufferSource();
            noise.buffer = buffer;
            var gain = ctx.createGain();
            gain.gain.setValueAtTime(SFX.volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            noise.connect(gain);
            gain.connect(ctx.destination);
            noise.start(now);
            noise.stop(now + 0.2);

            // Goblin squeal
            var osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
            var oscGain = ctx.createGain();
            oscGain.gain.setValueAtTime(SFX.volume * 0.15, now + 0.05);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(oscGain);
            oscGain.connect(ctx.destination);
            osc.start(now + 0.05);
            osc.stop(now + 0.25);
        });
    },

    // Level complete - ascending chime
    levelComplete: function() {
        this._play(function(ctx) {
            var now = ctx.currentTime;
            var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

            for (var i = 0; i < notes.length; i++) {
                var t = now + i * 0.1;
                var osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = notes[i];

                var gain = ctx.createGain();
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(SFX.volume * 0.25, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.4);
            }
        });
    },

    // Star earned - sparkle
    starEarned: function() {
        this._play(function(ctx) {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(2400, now + 0.1);

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(SFX.volume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        });
    },

    // Button click
    click: function() {
        this._play(function(ctx) {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 800;

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(SFX.volume * 0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        });
    },

    // Platform break
    platformBreak: function() {
        this._play(function(ctx) {
            var now = ctx.currentTime;

            var bufLen = ctx.sampleRate * 0.15;
            var buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.2));
            }
            var noise = ctx.createBufferSource();
            noise.buffer = buffer;

            var filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(SFX.volume * 0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(now);
            noise.stop(now + 0.15);
        });
    },

    // Split sound
    split: function() {
        this._play(function(ctx) {
            var now = ctx.currentTime;

            // Glass-like shatter
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1500, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(SFX.volume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);

            // Second tone
            var osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(2000, now + 0.03);
            osc2.frequency.exponentialRampToValueAtTime(1000, now + 0.12);

            var gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(SFX.volume * 0.15, now + 0.03);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.03);
            osc2.stop(now + 0.12);
        });
    },

    // Mute all (for ads)
    mute: function() {
        this.enabled = false;
    },

    unmute: function() {
        this.enabled = true;
    }
};
