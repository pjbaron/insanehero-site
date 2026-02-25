/**
 * Draw input handler (global, non-module)
 * Tracks pointer drag for ice wall drawing mechanic
 * Short tap (< 150ms, < 10px move) = shatter nearest wall
 */
var DrawInput = {
    drawing: false,
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    currentX: 0, currentY: 0,
    pointerDown: false,
    downTime: 0,
    tapped: false,      // true for one frame after a short tap
    tapX: 0, tapY: 0,
    dragDist: 0,
    _canvas: null,
    segments: [],        // completed segments from current stroke: [{ax,ay,bx,by}]

    init: function(canvas) {
        this._canvas = canvas;
        var self = this;

        canvas.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            self.pointerDown = true;
            self.drawing = true;
            var r = canvas.getBoundingClientRect();
            var x = (e.clientX - r.left) * (canvas.width / r.width);
            var y = (e.clientY - r.top) * (canvas.height / r.height);
            self.startX = x; self.startY = y;
            self.lastX = x; self.lastY = y;
            self.currentX = x; self.currentY = y;
            self.downTime = performance.now();
            self.dragDist = 0;
            self.segments = [];
        });

        canvas.addEventListener('pointermove', function(e) {
            if (!self.pointerDown) return;
            e.preventDefault();
            var r = canvas.getBoundingClientRect();
            var x = (e.clientX - r.left) * (canvas.width / r.width);
            var y = (e.clientY - r.top) * (canvas.height / r.height);
            self.currentX = x; self.currentY = y;
            var dx = x - self.lastX, dy = y - self.lastY;
            self.dragDist += Math.sqrt(dx * dx + dy * dy);
        });

        canvas.addEventListener('pointerup', function(e) {
            if (!self.pointerDown) return;
            self.pointerDown = false;
            self.drawing = false;
            var elapsed = performance.now() - self.downTime;
            if (elapsed < 200 && self.dragDist < 15) {
                self.tapped = true;
                var r = canvas.getBoundingClientRect();
                self.tapX = (e.clientX - r.left) * (canvas.width / r.width);
                self.tapY = (e.clientY - r.top) * (canvas.height / r.height);
            }
        });

        canvas.addEventListener('pointercancel', function() {
            self.pointerDown = false;
            self.drawing = false;
        });
    },

    /** Call each frame to consume the wall segment if drag moved enough */
    consumeSegment: function(minLen) {
        if (!this.drawing) return null;
        var dx = this.currentX - this.lastX;
        var dy = this.currentY - this.lastY;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len >= minLen) {
            var seg = { ax: this.lastX, ay: this.lastY, bx: this.currentX, by: this.currentY, len: len };
            this.lastX = this.currentX;
            this.lastY = this.currentY;
            return seg;
        }
        return null;
    },

    endFrame: function() {
        this.tapped = false;
    }
};
