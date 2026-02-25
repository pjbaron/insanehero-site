/**
 * Collision / geometry helpers (global, non-module)
 */
var Collision = {
    /**
     * Line segment vs circle intersection.
     * Returns { hit: bool, point: {x,y}, normal: {x,y}, t: 0-1 }
     */
    lineCircle: function(ax, ay, bx, by, cx, cy, r) {
        var dx = bx - ax, dy = by - ay;
        var fx = ax - cx, fy = ay - cy;
        var a = dx * dx + dy * dy;
        var b = 2 * (fx * dx + fy * dy);
        var c = fx * fx + fy * fy - r * r;
        var disc = b * b - 4 * a * c;
        if (disc < 0) return { hit: false };
        disc = Math.sqrt(disc);
        var t1 = (-b - disc) / (2 * a);
        var t2 = (-b + disc) / (2 * a);
        var t = (t1 >= 0 && t1 <= 1) ? t1 : (t2 >= 0 && t2 <= 1) ? t2 : -1;
        if (t < 0) return { hit: false };
        var px = ax + t * dx, py = ay + t * dy;
        var nx = px - cx, ny = py - cy;
        var nl = Math.sqrt(nx * nx + ny * ny) || 1;
        return { hit: true, point: { x: px, y: py }, normal: { x: nx / nl, y: ny / nl }, t: t };
    },

    /**
     * Circle vs circle overlap test
     */
    circleCircle: function(x1, y1, r1, x2, y2, r2) {
        var dx = x2 - x1, dy = y2 - y1;
        var dist = Math.sqrt(dx * dx + dy * dy);
        return dist < r1 + r2;
    },

    /**
     * Point-to-segment closest distance squared
     */
    pointSegDistSq: function(px, py, ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        var lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return (px - ax) * (px - ax) + (py - ay) * (py - ay);
        var t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
        var cx = ax + t * dx, cy = ay + t * dy;
        return (px - cx) * (px - cx) + (py - cy) * (py - cy);
    },

    /**
     * Reflect velocity off a wall segment.
     * Returns new {vx, vy}
     */
    reflectOffSegment: function(vx, vy, ax, ay, bx, by) {
        // wall normal (perpendicular)
        var wx = bx - ax, wy = by - ay;
        var wl = Math.sqrt(wx * wx + wy * wy) || 1;
        var nx = -wy / wl, ny = wx / wl;
        // make sure normal faces against velocity
        if (vx * nx + vy * ny > 0) { nx = -nx; ny = -ny; }
        var dot = vx * nx + vy * ny;
        return { vx: vx - 2 * dot * nx, vy: vy - 2 * dot * ny };
    },

    /**
     * Segment-segment intersection test (for demon blocking)
     */
    segmentIntersect: function(ax, ay, bx, by, cx, cy, dx, dy) {
        var s1x = bx - ax, s1y = by - ay;
        var s2x = dx - cx, s2y = dy - cy;
        var denom = s1x * s2y - s2x * s1y;
        if (Math.abs(denom) < 0.0001) return false;
        var s = (-s1y * (ax - cx) + s1x * (ay - cy)) / denom;
        var t = (s2x * (ay - cy) - s2y * (ax - cx)) / denom;
        return s >= 0 && s <= 1 && t >= 0 && t <= 1;
    },

    /**
     * Distance from circle center to line segment
     */
    circleSegDist: function(cx, cy, ax, ay, bx, by) {
        return Math.sqrt(this.pointSegDistSq(cx, cy, ax, ay, bx, by));
    }
};
