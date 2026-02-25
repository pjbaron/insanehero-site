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

        // Continuous touch/mouse hold tracking with position
        this.touchDown = false;
        this.touchX = 0;
        this.touchY = 0;
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;

        this._onKeyDown = (e) => {
            if (!this._pressed.has(e.code)) {
                this._justPressed.add(e.code);
            }
            this._pressed.add(e.code);
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

        this._onTouchStart = (e) => {
            this._tapped = true;
            this.touchDown = true;
            var t = e.touches[0];
            this.touchX = t.clientX;
            this.touchY = t.clientY;
        };

        this._onTouchMove = (e) => {
            if (e.touches.length > 0) {
                this.touchX = e.touches[0].clientX;
                this.touchY = e.touches[0].clientY;
            }
        };

        this._onTouchEnd = (e) => {
            if (e.touches.length === 0) {
                this.touchDown = false;
            }
        };

        this._onMouseDown = (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        };

        this._onMouseMove = (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        };

        this._onMouseUp = (e) => {
            this.mouseDown = false;
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        canvas.addEventListener('click', this._onTap);
        canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', this._onTouchMove, { passive: true });
        canvas.addEventListener('touchend', this._onTouchEnd, { passive: true });
        canvas.addEventListener('touchcancel', this._onTouchEnd, { passive: true });
        canvas.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
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

    /** True if touch is held on left half of canvas */
    isTouchLeft() {
        return this.touchDown && this.touchX < this._canvas.width / 2;
    }

    /** True if touch is held on right half of canvas */
    isTouchRight() {
        return this.touchDown && this.touchX >= this._canvas.width / 2;
    }

    /** True if mouse is held on left half of canvas */
    isMouseLeft() {
        return this.mouseDown && this.mouseX < this._canvas.width / 2;
    }

    /** True if mouse is held on right half of canvas */
    isMouseRight() {
        return this.mouseDown && this.mouseX >= this._canvas.width / 2;
    }

    /** True if any pointer is held */
    isPointerDown() {
        return this.touchDown || this.mouseDown;
    }

    /** Call at end of each frame to reset edge-triggered state */
    endFrame() {
        this._justPressed.clear();
        this._tapped = false;
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
        this._pressed.clear();
        this._justPressed.clear();
    }
}
