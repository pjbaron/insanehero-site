/**
 * Input Manager
 * Keyboard + touch input with edge-triggered and continuous detection
 */

export class InputManager {
    constructor(canvas) {
        this._pressed = new Set();
        this._justPressed = new Set();
        this._tapped = false;

        this._onKeyDown = (e) => {
            if (!this._pressed.has(e.code)) {
                this._justPressed.add(e.code);
            }
            this._pressed.add(e.code);
            // Prevent scrolling on game keys
            if (e.code.startsWith('Arrow') || e.code === 'Space') {
                e.preventDefault();
            }
        };

        this._onKeyUp = (e) => {
            this._pressed.delete(e.code);
        };

        this._onTap = (e) => {
            this._tapped = true;
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        canvas.addEventListener('click', this._onTap);
        canvas.addEventListener('touchstart', this._onTap, { passive: true });
    }

    /** Continuous hold detection */
    isDown(code) {
        return this._pressed.has(code);
    }

    /** Edge-triggered: true once per press, consumed by endFrame() */
    wasPressed(code) {
        return this._justPressed.has(code);
    }

    /** True if canvas was clicked/tapped this frame */
    wasTapped() {
        return this._tapped;
    }

    isLeft() {
        return this._pressed.has('ArrowLeft') || this._pressed.has('KeyA');
    }

    isRight() {
        return this._pressed.has('ArrowRight') || this._pressed.has('KeyD');
    }

    isUp() {
        return this._pressed.has('ArrowUp') || this._pressed.has('KeyW');
    }

    isDownKey() {
        return this._pressed.has('ArrowDown') || this._pressed.has('KeyS');
    }

    /** Call at end of each frame to reset edge-triggered state */
    endFrame() {
        this._justPressed.clear();
        this._tapped = false;
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this._pressed.clear();
        this._justPressed.clear();
    }
}
