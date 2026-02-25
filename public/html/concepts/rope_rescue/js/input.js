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

        // Pointer/drag state
        this.mouseX = 0;
        this.mouseY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragging = false;
        this._dragStarted = false; // edge-triggered: true for one frame when drag begins
        this._dragEnded = false;   // edge-triggered: true for one frame when drag ends
        this._dragEndX = 0;
        this._dragEndY = 0;

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

        // Pointer events for drag handling (unified mouse + touch)
        this._onPointerDown = (e) => {
            var rect = canvas.getBoundingClientRect();
            var scaleX = canvas.width / rect.width;
            var scaleY = canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            this.dragStartX = this.mouseX;
            this.dragStartY = this.mouseY;
            this.dragging = true;
            this._dragStarted = true;
            canvas.setPointerCapture(e.pointerId);
            e.preventDefault();
        };

        this._onPointerMove = (e) => {
            var rect = canvas.getBoundingClientRect();
            var scaleX = canvas.width / rect.width;
            var scaleY = canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
        };

        this._onPointerUp = (e) => {
            var rect = canvas.getBoundingClientRect();
            var scaleX = canvas.width / rect.width;
            var scaleY = canvas.height / rect.height;
            this._dragEndX = (e.clientX - rect.left) * scaleX;
            this._dragEndY = (e.clientY - rect.top) * scaleY;
            this.mouseX = this._dragEndX;
            this.mouseY = this._dragEndY;
            if (this.dragging) {
                this._dragEnded = true;
                this._tapped = true; // Also counts as a tap
            }
            this.dragging = false;
        };

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        canvas.addEventListener('click', this._onTap);
        canvas.addEventListener('touchstart', this._onTap, { passive: true });

        // Pointer events on canvas
        canvas.addEventListener('pointerdown', this._onPointerDown);
        canvas.addEventListener('pointermove', this._onPointerMove);
        canvas.addEventListener('pointerup', this._onPointerUp);
        canvas.addEventListener('pointercancel', this._onPointerUp);
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

    /** True for one frame when a drag starts */
    dragStarted() {
        return this._dragStarted;
    }

    /** True for one frame when a drag ends (finger/mouse released) */
    dragEnded() {
        return this._dragEnded;
    }

    /** End position of completed drag */
    getDragEnd() {
        return { x: this._dragEndX, y: this._dragEndY };
    }

    /** Call at end of each frame to reset edge-triggered state */
    endFrame() {
        this._justPressed.clear();
        this._tapped = false;
        this._dragStarted = false;
        this._dragEnded = false;
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        var c = this._canvas;
        if (c) {
            c.removeEventListener('pointerdown', this._onPointerDown);
            c.removeEventListener('pointermove', this._onPointerMove);
            c.removeEventListener('pointerup', this._onPointerUp);
            c.removeEventListener('pointercancel', this._onPointerUp);
        }
        this._pressed.clear();
        this._justPressed.clear();
    }
}
