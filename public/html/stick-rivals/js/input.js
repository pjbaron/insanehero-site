/**
 * Input Handler - Manages touch and mouse input for the game
 * Mobile-first design with touch as primary, mouse as fallback
 */

const Input = {
    // Current input state
    pointer: {
        x: 0,
        y: 0,
        isDown: false,
        justPressed: false,
        justReleased: false
    },

    // Keyboard state
    keys: {},

    // Canvas reference (set during init)
    canvas: null,
    canvasRect: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0,

    /**
     * Initialize input handling for the given canvas
     * @param {HTMLCanvasElement} canvas - The game canvas
     */
    init(canvas) {
        this.canvas = canvas;
        this.updateCanvasRect();

        // Touch events (primary for mobile)
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse events (fallback for desktop)
        canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Update rect on resize
        window.addEventListener('resize', () => this.updateCanvasRect());
    },

    /**
     * Handle key down
     */
    handleKeyDown(e) {
        this.keys[e.key] = true;
    },

    /**
     * Handle key up
     */
    handleKeyUp(e) {
        this.keys[e.key] = false;
    },

    /**
     * Update the canvas bounding rect for coordinate conversion
     */
    updateCanvasRect() {
        if (this.canvas) {
            this.canvasRect = this.canvas.getBoundingClientRect();
        }
    },

    /**
     * Set the scale and offset for coordinate conversion
     * Called by the game when canvas scaling changes
     */
    setTransform(scale, offsetX, offsetY) {
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    },

    /**
     * Convert screen coordinates to game coordinates
     */
    screenToGame(screenX, screenY) {
        const rect = this.canvasRect || this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;

        // Convert to game coordinates accounting for scaling
        return {
            x: (canvasX - this.offsetX) / this.scale,
            y: (canvasY - this.offsetY) / this.scale
        };
    },

    // Touch handlers
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const pos = this.screenToGame(touch.clientX, touch.clientY);
            this.pointer.x = pos.x;
            this.pointer.y = pos.y;
            this.pointer.isDown = true;
            this.pointer.justPressed = true;
        }
    },

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const pos = this.screenToGame(touch.clientX, touch.clientY);
            this.pointer.x = pos.x;
            this.pointer.y = pos.y;
        }
    },

    handleTouchEnd(e) {
        e.preventDefault();
        this.pointer.isDown = false;
        this.pointer.justReleased = true;
    },

    // Mouse handlers
    handleMouseDown(e) {
        const pos = this.screenToGame(e.clientX, e.clientY);
        this.pointer.x = pos.x;
        this.pointer.y = pos.y;
        this.pointer.isDown = true;
        this.pointer.justPressed = true;
    },

    handleMouseMove(e) {
        const pos = this.screenToGame(e.clientX, e.clientY);
        this.pointer.x = pos.x;
        this.pointer.y = pos.y;
    },

    handleMouseUp(e) {
        this.pointer.isDown = false;
        this.pointer.justReleased = true;
    },

    /**
     * Clear frame-specific input state (call at end of each frame)
     */
    endFrame() {
        this.pointer.justPressed = false;
        this.pointer.justReleased = false;
    },

    /**
     * Check if a rectangle was tapped/clicked this frame
     * @param {number} x - Left edge
     * @param {number} y - Top edge
     * @param {number} width - Width
     * @param {number} height - Height
     * @returns {boolean} True if tapped within bounds
     */
    isTapped(x, y, width, height) {
        if (!this.pointer.justPressed) return false;
        return (
            this.pointer.x >= x &&
            this.pointer.x <= x + width &&
            this.pointer.y >= y &&
            this.pointer.y <= y + height
        );
    },

    /**
     * Check if pointer is currently over a rectangle
     */
    isOver(x, y, width, height) {
        return (
            this.pointer.x >= x &&
            this.pointer.x <= x + width &&
            this.pointer.y >= y &&
            this.pointer.y <= y + height
        );
    }
};
