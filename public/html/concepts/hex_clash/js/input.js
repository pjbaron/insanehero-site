/**
 * Input Manager
 * Keyboard + touch input with edge-triggered and continuous detection
 */

export class InputManager {
    constructor(canvas) {
        this._canvas = canvas;
        this._pressed = new Set();
        this._justPressed = new Set();
        this._tapped = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.tapX = 0;
        this.tapY = 0;

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

        this._onMouseMove = (e) => {
            var rect = canvas.getBoundingClientRect();
            this.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
            this.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        };

        this._lastTouchTime = 0;

        this._onTap = (e) => {
            var rect = canvas.getBoundingClientRect();
            if (e.touches && e.touches.length > 0) {
                this._lastTouchTime = performance.now();
                this._tapped = true;
                this.tapX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
                this.tapY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
                this.mouseX = this.tapX;
                this.mouseY = this.tapY;
            } else if (e.clientX !== undefined) {
                // Ignore click events that follow a recent touch (prevents double-tap)
                if (performance.now() - this._lastTouchTime < 500) return;
                this._tapped = true;
                this.tapX = (e.clientX - rect.left) * (canvas.width / rect.width);
                this.tapY = (e.clientY - rect.top) * (canvas.height / rect.height);
                this.mouseX = this.tapX;
                this.mouseY = this.tapY;
            }
        };

        this._onTouchMove = (e) => {
            if (e.touches && e.touches.length > 0) {
                var rect = canvas.getBoundingClientRect();
                this.mouseX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
                this.mouseY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
            }
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        canvas.addEventListener('mousemove', this._onMouseMove);
        canvas.addEventListener('click', this._onTap);
        canvas.addEventListener('touchstart', this._onTap, { passive: true });
        canvas.addEventListener('touchmove', this._onTouchMove, { passive: true });
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
