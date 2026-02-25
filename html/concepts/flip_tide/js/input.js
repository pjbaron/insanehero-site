/**
 * Input Manager
 * Keyboard + touch input with edge-triggered and continuous detection
 */

export class InputManager {
    constructor(canvas) {
        this._pressed = new Set();
        this._justPressed = new Set();
        this._tapped = false;
        this._touching = false;
        this._lastTouchTime = 0;
        this.mouseX = 0;
        this.mouseY = 0;

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

        this._onTouchStart = (e) => {
            this._tapped = true;
            this._touching = true;
            this._lastTouchTime = performance.now();
            if (e.touches && e.touches.length > 0) {
                this.mouseX = e.touches[0].clientX;
                this.mouseY = e.touches[0].clientY;
            }
        };

        this._onTouchEnd = (e) => {
            this._touching = false;
        };

        this._onMouseDown = (e) => {
            // Ignore synthesized mouse events after touch (within 500ms)
            if (performance.now() - this._lastTouchTime < 500) return;
            this._tapped = true;
            this._touching = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        };

        this._onMouseUp = (e) => {
            if (performance.now() - this._lastTouchTime < 500) return;
            this._touching = false;
        };

        this._onMouseMove = (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
        canvas.addEventListener('touchend', this._onTouchEnd, { passive: true });
        canvas.addEventListener('touchcancel', this._onTouchEnd, { passive: true });
        canvas.addEventListener('mousedown', this._onMouseDown);
        canvas.addEventListener('mouseup', this._onMouseUp);
        canvas.addEventListener('mousemove', this._onMouseMove);
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

    /** True if touch/mouse is currently held */
    isTouching() {
        return this._touching;
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
