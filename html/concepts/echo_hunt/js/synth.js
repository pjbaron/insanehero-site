/**
 * Synth - Procedural audio for Echo Hunt
 * All SFX generated via Web Audio API oscillators. Zero audio files needed.
 */

const Synth = {
    ctx: null,
    master: null,
    enabled: true,

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.5;
            this.master.connect(this.ctx.destination);
        } catch (e) {
            this.enabled = false;
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    muteAll() {
        if (this.master) this.master.gain.value = 0;
    },

    unmuteAll() {
        if (this.master) this.master.gain.value = 0.5;
    },

    /** Sonar ping - classic submarine ping sound */
    ping(depth) {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;
        var baseFreq = 1200 - (depth || 0) * 80;

        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.6);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.65);

        // Second harmonic for richness
        var osc2 = this.ctx.createOscillator();
        var gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(baseFreq * 1.5, t);
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.4);
        gain2.gain.setValueAtTime(0.12, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc2.connect(gain2);
        gain2.connect(this.master);
        osc2.start(t);
        osc2.stop(t + 0.45);
    },

    /** Creature caught - bright sparkly blip */
    catch(combo) {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;
        var baseNote = 523 + (combo || 0) * 80; // higher pitch for combos

        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseNote, t);
        osc.frequency.exponentialRampToValueAtTime(baseNote * 2, t + 0.08);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.25);

        // Sparkle overtone
        var osc2 = this.ctx.createOscillator();
        var gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(baseNote * 2, t + 0.03);
        osc2.frequency.exponentialRampToValueAtTime(baseNote * 3, t + 0.12);
        gain2.gain.setValueAtTime(0.15, t + 0.03);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc2.connect(gain2);
        gain2.connect(this.master);
        osc2.start(t + 0.03);
        osc2.stop(t + 0.2);
    },

    /** Predator hit - low thud */
    hit() {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;

        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.35);

        // Noise burst for impact
        var bufferSize = this.ctx.sampleRate * 0.1;
        var buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        var noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        var nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.2, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        noise.connect(nGain);
        nGain.connect(this.master);
        noise.start(t);
        noise.stop(t + 0.12);
    },

    /** Level complete - ascending arpeggio */
    levelUp() {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;
        var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

        for (var i = 0; i < notes.length; i++) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            var noteTime = t + i * 0.1;
            osc.frequency.setValueAtTime(notes[i], noteTime);
            gain.gain.setValueAtTime(0, noteTime);
            gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(noteTime);
            osc.stop(noteTime + 0.35);
        }
    },

    /** Game over - descending minor tones */
    gameOver() {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;
        var notes = [440, 349, 294, 220]; // A4, F4, D4, A3

        for (var i = 0; i < notes.length; i++) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'sine';
            var noteTime = t + i * 0.2;
            osc.frequency.setValueAtTime(notes[i], noteTime);
            gain.gain.setValueAtTime(0.2, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(noteTime);
            osc.stop(noteTime + 0.55);
        }
    },

    /** Reveal blip - when a creature is illuminated by sonar */
    reveal() {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;

        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 400, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    /** Combo sound - quick ascending blips */
    combo(count) {
        if (!this.enabled || !this.ctx) return;
        var t = this.ctx.currentTime;
        for (var i = 0; i < Math.min(count, 5); i++) {
            var osc = this.ctx.createOscillator();
            var gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600 + i * 150, t + i * 0.04);
            gain.gain.setValueAtTime(0.15, t + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.08);
            osc.connect(gain);
            gain.connect(this.master);
            osc.start(t + i * 0.04);
            osc.stop(t + i * 0.04 + 0.1);
        }
    }
};
