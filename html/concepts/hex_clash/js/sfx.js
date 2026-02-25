/**
 * SFX - Procedural sound effects using Web Audio API oscillators
 * No audio files needed - all sounds generated in real-time
 */

var SFX = (function() {
    var ctx = null;

    function getCtx() {
        if (ctx) return ctx;
        if (GameAudio.ctx) {
            ctx = GameAudio.ctx;
            return ctx;
        }
        return null;
    }

    // Play a short tone
    function tone(freq, duration, type, volume, delay) {
        var ac = getCtx();
        if (!ac) return;
        var t = ac.currentTime + (delay || 0);
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime((volume || 0.15) * GameAudio.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + duration);
    }

    function place() {
        tone(440, 0.08, 'square', 0.12);
        tone(660, 0.06, 'square', 0.08, 0.03);
    }

    function capture(cascadeLevel) {
        var baseFreq = 330 + cascadeLevel * 110;
        tone(baseFreq, 0.15, 'sawtooth', 0.12);
        tone(baseFreq * 1.5, 0.12, 'sawtooth', 0.10, 0.05);
        tone(baseFreq * 2, 0.10, 'sawtooth', 0.08, 0.10);
    }

    function select() {
        tone(880, 0.05, 'sine', 0.08);
    }

    function rotate() {
        tone(550, 0.04, 'sine', 0.06);
    }

    function shrink() {
        tone(220, 0.3, 'sawtooth', 0.15);
        tone(165, 0.2, 'sawtooth', 0.12, 0.15);
    }

    function win() {
        tone(523, 0.15, 'square', 0.12, 0);
        tone(659, 0.15, 'square', 0.12, 0.15);
        tone(784, 0.15, 'square', 0.12, 0.30);
        tone(1047, 0.25, 'square', 0.15, 0.45);
    }

    function lose() {
        tone(400, 0.2, 'sawtooth', 0.12, 0);
        tone(350, 0.2, 'sawtooth', 0.12, 0.15);
        tone(300, 0.3, 'sawtooth', 0.15, 0.30);
    }

    function aiPlace() {
        tone(330, 0.06, 'triangle', 0.08);
        tone(440, 0.05, 'triangle', 0.06, 0.03);
    }

    return {
        place: place,
        capture: capture,
        select: select,
        rotate: rotate,
        shrink: shrink,
        win: win,
        lose: lose,
        aiPlace: aiPlace
    };
})();
