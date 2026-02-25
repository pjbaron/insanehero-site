/**
 * Synth - Procedural audio via Web Audio API oscillators
 * No audio files needed.
 */

var Synth = {
    ctx: null,

    init() {
        // Will use GameAudio.ctx if available
    },

    _getCtx() {
        if (this.ctx) return this.ctx;
        if (typeof GameAudio !== 'undefined' && GameAudio.ctx) {
            this.ctx = GameAudio.ctx;
            return this.ctx;
        }
        return null;
    },

    _playTone(freq, duration, type, volume, ramp) {
        var ctx = this._getCtx();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.value = freq;
        gain.gain.value = (volume || 0.15) * (typeof GameAudio !== 'undefined' ? GameAudio.sfxVolume * GameAudio.masterVolume : 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        var now = ctx.currentTime;
        osc.start(now);
        if (ramp) {
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        } else {
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.linearRampToValueAtTime(0, now + duration);
        }
        osc.stop(now + duration);
    },

    claim() {
        this._playTone(440, 0.1, 'square', 0.12, true);
        this._playTone(660, 0.1, 'square', 0.1, true);
        var self = this;
        setTimeout(function() {
            self._playTone(880, 0.15, 'square', 0.08, true);
        }, 80);
    },

    bigClaim() {
        this._playTone(440, 0.15, 'square', 0.15, true);
        var self = this;
        setTimeout(function() { self._playTone(554, 0.12, 'square', 0.12, true); }, 60);
        setTimeout(function() { self._playTone(660, 0.12, 'square', 0.1, true); }, 120);
        setTimeout(function() { self._playTone(880, 0.2, 'square', 0.12, true); }, 180);
    },

    death() {
        this._playTone(400, 0.15, 'sawtooth', 0.15, true);
        var self = this;
        setTimeout(function() { self._playTone(300, 0.15, 'sawtooth', 0.13, true); }, 100);
        setTimeout(function() { self._playTone(200, 0.2, 'sawtooth', 0.12, true); }, 200);
        setTimeout(function() { self._playTone(100, 0.3, 'sawtooth', 0.1, true); }, 300);
    },

    levelComplete() {
        var notes = [523, 659, 784, 1047];
        var self = this;
        for (var i = 0; i < notes.length; i++) {
            (function(idx) {
                setTimeout(function() {
                    self._playTone(notes[idx], 0.2, 'square', 0.12, true);
                }, idx * 120);
            })(i);
        }
    },

    gameOverJingle() {
        var notes = [523, 440, 349, 262];
        var self = this;
        for (var i = 0; i < notes.length; i++) {
            (function(idx) {
                setTimeout(function() {
                    self._playTone(notes[idx], 0.25, 'sawtooth', 0.1, true);
                }, idx * 180);
            })(i);
        }
    },

    menuSelect() {
        this._playTone(600, 0.08, 'square', 0.1, true);
    },

    directionChange() {
        this._playTone(800, 0.04, 'sine', 0.05, true);
    }
};
