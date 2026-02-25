/**
 * SwipeTracker - Touch/mouse drag and swipe detection
 * Tracks pointer position, distinguishes drags from swipes,
 * and provides swipe line data for split detection.
 *
 * Coordinates are in SCREEN space. Game must convert to virtual coords.
 */

const SwipeTracker = {
    // Current pointer state
    isDown: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,

    // Swipe trail points (screen coords)
    trail: [],
    trailMax: 20,

    // Swipe detection
    swipeThreshold: 40,   // min px to count as swipe (not tap)
    _didSwipe: false,
    _didTap: false,

    // Last completed swipe line (start/end in screen coords)
    swipeLine: null,

    // Drag velocity for flick detection
    vx: 0,
    vy: 0,
    _prevX: 0,
    _prevY: 0,

    init(canvas) {
        var self = this;

        // --- Mouse ---
        canvas.addEventListener('mousedown', function(e) {
            self._pointerDown(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', function(e) {
            self._pointerMove(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', function(e) {
            self._pointerUp(e.clientX, e.clientY);
        });

        // --- Touch ---
        canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
            var t = e.touches[0];
            self._pointerDown(t.clientX, t.clientY);
        }, { passive: false });

        canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
            var t = e.touches[0];
            self._pointerMove(t.clientX, t.clientY);
        }, { passive: false });

        canvas.addEventListener('touchend', function(e) {
            e.preventDefault();
            var t = e.changedTouches[0];
            self._pointerUp(t.clientX, t.clientY);
        }, { passive: false });
    },

    _pointerDown(x, y) {
        this.isDown = true;
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this._prevX = x;
        this._prevY = y;
        this.vx = 0;
        this.vy = 0;
        this.trail = [{ x: x, y: y }];
        this.swipeLine = null;
    },

    _pointerMove(x, y) {
        if (!this.isDown) {
            this.x = x;
            this.y = y;
            return;
        }
        this.x = x;
        this.y = y;

        // Track trail
        this.trail.push({ x: x, y: y });
        if (this.trail.length > this.trailMax) {
            this.trail.shift();
        }
    },

    _pointerUp(x, y) {
        if (!this.isDown) return;
        this.isDown = false;
        this.x = x;
        this.y = y;

        var dx = x - this.startX;
        var dy = y - this.startY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= this.swipeThreshold) {
            this._didSwipe = true;
            this.swipeLine = {
                x1: this.startX,
                y1: this.startY,
                x2: x,
                y2: y
            };
        } else {
            this._didTap = true;
        }

        this.trail = [];
    },

    /** True for one frame after a swipe gesture completes */
    wasSwipe() {
        return this._didSwipe;
    },

    /** True for one frame after a tap gesture completes */
    wasTap() {
        return this._didTap;
    },

    /** Get the swipe line (screen coords), valid when wasSwipe() is true */
    getSwipeLine() {
        return this.swipeLine;
    },

    /** Update velocity tracking - call each frame with dt */
    update(dt) {
        if (this.isDown && dt > 0) {
            this.vx = (this.x - this._prevX) / dt;
            this.vy = (this.y - this._prevY) / dt;
        } else {
            this.vx *= 0.9;
            this.vy *= 0.9;
        }
        this._prevX = this.x;
        this._prevY = this.y;
    },

    /** Call at end of frame to clear edge-triggered flags */
    endFrame() {
        this._didSwipe = false;
        this._didTap = false;
    }
};
