/**
 * Cut - Swipe detection and rope intersection testing
 * Handles mouse/touch drag to create a cut line, tests against all ropes
 */

var CutSystem = {
    // Current swipe state
    active: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,

    // Visual trail
    trail: [],
    trailMaxLen: 20,

    // Cooldown after cut
    cooldown: 0,
    COOLDOWN_TIME: 0.15,

    // Touch/mouse tracking
    _pointerDown: false,
    _lastMoveX: 0,
    _lastMoveY: 0,

    init: function(canvas) {
        var self = this;

        // Mouse events
        canvas.addEventListener('mousedown', function(e) {
            self._onPointerDown(e.clientX, e.clientY);
        });
        canvas.addEventListener('mousemove', function(e) {
            self._onPointerMove(e.clientX, e.clientY);
        });
        canvas.addEventListener('mouseup', function(e) {
            self._onPointerUp();
        });

        // Touch events
        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length > 0) {
                var t = e.touches[0];
                self._onPointerDown(t.clientX, t.clientY);
            }
        }, { passive: true });
        canvas.addEventListener('touchmove', function(e) {
            if (e.touches.length > 0) {
                var t = e.touches[0];
                self._onPointerMove(t.clientX, t.clientY);
            }
        }, { passive: true });
        canvas.addEventListener('touchend', function(e) {
            self._onPointerUp();
        }, { passive: true });
        canvas.addEventListener('touchcancel', function(e) {
            self._onPointerUp();
        }, { passive: true });
    },

    _onPointerDown: function(sx, sy) {
        this._pointerDown = true;
        var world = Camera.screenToWorld(sx, sy);
        this.startX = world.x;
        this.startY = world.y;
        this.endX = world.x;
        this.endY = world.y;
        this._lastMoveX = sx;
        this._lastMoveY = sy;
        this.active = true;
        this.trail = [{ x: sx, y: sy }];
    },

    _onPointerMove: function(sx, sy) {
        if (!this._pointerDown) return;
        var world = Camera.screenToWorld(sx, sy);
        this.endX = world.x;
        this.endY = world.y;
        this._lastMoveX = sx;
        this._lastMoveY = sy;

        // Add to trail
        this.trail.push({ x: sx, y: sy });
        if (this.trail.length > this.trailMaxLen) {
            this.trail.shift();
        }
    },

    _onPointerUp: function() {
        this._pointerDown = false;
        // Keep active flag so the game can check for cuts this frame
    },

    update: function(dt) {
        if (this.cooldown > 0) {
            this.cooldown -= dt;
        }

        // Fade trail
        if (!this._pointerDown && this.trail.length > 0) {
            this.trail.shift();
            if (this.trail.length === 0) {
                this.active = false;
            }
        }
    },

    // Check if current swipe intersects any rope, returns rope or null
    checkCut: function(ropes) {
        if (!this.active || this.cooldown > 0) return null;
        if (!this._pointerDown) return null;

        // Need minimum swipe distance
        var dx = this.endX - this.startX;
        var dy = this.endY - this.startY;
        var swipeLen = Math.sqrt(dx * dx + dy * dy);
        if (swipeLen < 10) return null;

        for (var i = 0; i < ropes.length; i++) {
            var rope = ropes[i];
            if (rope.cut) continue;

            // Get rope endpoints in world space
            var rAx = rope.anchorX;
            var rAy = rope.anchorY;
            var ap = rope.attachPoint;
            var rBx = rope.body.position.x + ap.x;
            var rBy = rope.body.position.y + ap.y;

            // Check line segment intersection
            if (this._segmentsIntersect(
                this.startX, this.startY, this.endX, this.endY,
                rAx, rAy, rBx, rBy
            )) {
                // Reset swipe start to current position to avoid double-cuts
                this.startX = this.endX;
                this.startY = this.endY;
                this.cooldown = this.COOLDOWN_TIME;
                return rope;
            }
        }
        return null;
    },

    // Line segment intersection test
    _segmentsIntersect: function(ax, ay, bx, by, cx, cy, dx, dy) {
        var denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
        if (Math.abs(denom) < 0.001) return false;

        var t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
        var u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;

        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    },

    // Render the cut trail
    render: function(ctx) {
        if (this.trail.length < 2) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (var i = 1; i < this.trail.length; i++) {
            var t = i / this.trail.length;
            ctx.beginPath();
            ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
            ctx.lineTo(this.trail[i].x, this.trail[i].y);

            // Glow
            ctx.strokeStyle = 'rgba(255, 255, 200, ' + (t * 0.5) + ')';
            ctx.lineWidth = 8 * t;
            ctx.stroke();

            // Core
            ctx.strokeStyle = 'rgba(255, 240, 150, ' + (t * 0.8) + ')';
            ctx.lineWidth = 3 * t;
            ctx.stroke();
        }

        ctx.restore();
    },

    // Get the midpoint of the swipe (for particle effects)
    getMidpoint: function() {
        return {
            x: (this.startX + this.endX) / 2,
            y: (this.startY + this.endY) / 2
        };
    }
};
