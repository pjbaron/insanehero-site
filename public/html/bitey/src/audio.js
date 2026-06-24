// Audio: tiny procedural WebAudio sfx. No assets - everything is synthesised so
// the prototype stays a few small files. Must be unlocked by a user gesture
// (browser autoplay policy); call unlock() from the first tap/key.

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this._lastShot = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  _tone(freq, dur, type, gain, slideTo) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, gain, lowpass) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain || 0.3;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass || 1200;
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t);
  }

  shoot() {
    if (!this.ctx) return;
    // Throttle so rapid auto-fire doesn't turn into a wall of clicks.
    const now = this.ctx.currentTime;
    if (now - this._lastShot < 0.045) return;
    this._lastShot = now;
    this._tone(420 + Math.random() * 60, 0.06, 'square', 0.12, 160);
  }

  explosion() {
    this._noise(0.5, 0.5, 900);
    this._tone(120, 0.45, 'sawtooth', 0.25, 40);
  }

  zombieDie() { this._tone(180 + Math.random() * 60, 0.12, 'sawtooth', 0.12, 70); }
  squelch(n) {
    this._noise(0.2 + Math.min(n || 1, 8) * 0.02, 0.55, 650); // wet splat
    this._tone(170, 0.22, 'sawtooth', 0.22, 45);              // low gut-thud
  }
  hurt() { this._tone(220, 0.2, 'square', 0.22, 80); }
  pickup() { this._tone(523, 0.1, 'square', 0.2); setTimeout(() => this._tone(784, 0.12, 'square', 0.2), 90); }
  combo(tier) { this._tone(440 + tier * 90, 0.08, 'triangle', 0.18); }
}
