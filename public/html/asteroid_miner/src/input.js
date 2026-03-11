const KEYS = {
  THRUST: ['ArrowUp', 'w'],
  LEFT:   ['ArrowLeft', 'a'],
  RIGHT:  ['ArrowRight', 'd'],
  FIRE:   [' '],
  COLLECT:['e'],
  RELEASE:['q'],
};

const PREVENT_DEFAULTS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab']);

class InputManager {
  constructor() {
    this._held = new Set();
    this._pressed = new Set();

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (PREVENT_DEFAULTS.has(e.key)) e.preventDefault();
        if (!this._held.has(e.key)) {
          this._pressed.add(e.key);
        }
        this._held.add(e.key);
      });

      window.addEventListener('keyup', (e) => {
        this._held.delete(e.key);
        this._pressed.delete(e.key);
      });
    }
  }

  isDown(key) {
    return this._held.has(key);
  }

  consumePress(key) {
    if (this._pressed.has(key)) {
      this._pressed.delete(key);
      return true;
    }
    return false;
  }
}

export const THRUST  = KEYS.THRUST;
export const LEFT    = KEYS.LEFT;
export const RIGHT   = KEYS.RIGHT;
export const FIRE    = KEYS.FIRE;
export const COLLECT = KEYS.COLLECT;
export const RELEASE = KEYS.RELEASE;

export const input = new InputManager();
export default input;
