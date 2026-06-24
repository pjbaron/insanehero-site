// Keyboard input tracking. Maps physical keys to logical game actions.

// Auto-fire means no manual shoot/aim/swap. Movement, jump, special, restart.
const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  KeyK: 'special',
  KeyL: 'special',
  ShiftLeft: 'special',
  KeyR: 'restart',
};

export class InputManager {
  constructor(target) {
    this.held = new Set();
    // Virtual (on-screen / touch) held actions, merged with keyboard.
    this.vheld = new Set();
    // Edge-triggered actions consumed once per press (jump, swap, restart).
    this.pressed = new Set();
    this._target = target || (typeof window !== 'undefined' ? window : null);
    this._onDown = this._onDown.bind(this);
    this._onUp = this._onUp.bind(this);
    if (this._target) {
      this._target.addEventListener('keydown', this._onDown);
      this._target.addEventListener('keyup', this._onUp);
    }
  }

  _onDown(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (!this.held.has(action)) {
      this.pressed.add(action);
    }
    this.held.add(action);
  }

  _onUp(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();
    this.held.delete(action);
  }

  // Set/clear a virtual (touch button) action. Rising edge also fires pressed.
  setVirtual(action, on) {
    if (on) {
      if (!this.vheld.has(action) && !this.held.has(action)) this.pressed.add(action);
      this.vheld.add(action);
    } else {
      this.vheld.delete(action);
    }
  }

  // Fire a one-shot virtual press (e.g. a tap on JUMP).
  pressVirtual(action) {
    this.pressed.add(action);
  }

  // True while the key OR a touch button is held down.
  has(action) {
    return this.held.has(action) || this.vheld.has(action);
  }

  // True once per physical press; clear with endFrame().
  consumePressed(action) {
    if (this.pressed.has(action)) {
      this.pressed.delete(action);
      return true;
    }
    return false;
  }

  // Call at the end of each frame to clear edge-trigger state.
  endFrame() {
    this.pressed.clear();
  }

  dispose() {
    if (this._target) {
      this._target.removeEventListener('keydown', this._onDown);
      this._target.removeEventListener('keyup', this._onUp);
    }
  }
}
