/**
 * Physics - Line-segment collision, reflection, gravity
 * Global object (non-module), loaded before game modules
 */

const Physics = {
    GRAVITY: 600,

    /**
     * Check if a circle (survivor) intersects a line segment (rope)
     * Returns { hit, point, normal, t } or { hit: false }
     * t = position along segment [0,1]
     */
    circleSegment(cx, cy, radius, x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var fx = x1 - cx;
        var fy = y1 - cy;

        var a = dx * dx + dy * dy;
        if (a < 0.001) return { hit: false };

        var b = 2 * (fx * dx + fy * dy);
        var c = fx * fx + fy * fy - radius * radius;
        var disc = b * b - 4 * a * c;

        if (disc < 0) return { hit: false };

        disc = Math.sqrt(disc);
        var t1 = (-b - disc) / (2 * a);
        var t2 = (-b + disc) / (2 * a);

        // We want the first intersection in [0,1]
        var t = t1;
        if (t < 0 || t > 1) t = t2;
        if (t < 0 || t > 1) {
            // Check closest point clamped to segment
            t = -(fx * dx + fy * dy) / a;
            t = Math.max(0, Math.min(1, t));
            var px = x1 + t * dx;
            var py = y1 + t * dy;
            var distSq = (cx - px) * (cx - px) + (cy - py) * (cy - py);
            if (distSq > radius * radius) return { hit: false };
        }

        // Closest point on segment
        var clampT = -(fx * dx + fy * dy) / a;
        clampT = Math.max(0, Math.min(1, clampT));
        var closestX = x1 + clampT * dx;
        var closestY = y1 + clampT * dy;

        var distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
        if (distSq > radius * radius) return { hit: false };

        // Normal: from closest point to circle center
        var dist = Math.sqrt(distSq);
        var nx, ny;
        if (dist < 0.001) {
            // Circle center is on the line - use perpendicular
            var len = Math.sqrt(a);
            nx = -dy / len;
            ny = dx / len;
        } else {
            nx = (cx - closestX) / dist;
            ny = (cy - closestY) / dist;
        }

        return {
            hit: true,
            x: closestX,
            y: closestY,
            nx: nx,
            ny: ny,
            t: clampT,
            penetration: radius - dist
        };
    },

    /**
     * Reflect velocity off a surface normal with elasticity
     * Returns { vx, vy }
     */
    reflect(vx, vy, nx, ny, elasticity) {
        var dot = vx * nx + vy * ny;
        // Only reflect if moving into the surface
        if (dot >= 0) return { vx: vx, vy: vy, bounced: false };

        var rvx = vx - (1 + elasticity) * dot * nx;
        var rvy = vy - (1 + elasticity) * dot * ny;
        return { vx: rvx, vy: rvy, bounced: true };
    },

    /**
     * Distance from point to line segment (for anchor proximity checks)
     */
    pointToSegmentDist(px, py, x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var lenSq = dx * dx + dy * dy;
        if (lenSq < 0.001) {
            var ddx = px - x1;
            var ddy = py - y1;
            return Math.sqrt(ddx * ddx + ddy * ddy);
        }
        var t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        var cx = x1 + t * dx;
        var cy = y1 + t * dy;
        var ex = px - cx;
        var ey = py - cy;
        return Math.sqrt(ex * ex + ey * ey);
    },

    /**
     * Distance between two points
     */
    dist(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Rope sag - returns offset for a catenary-like curve at parameter t [0,1]
     * sagAmount is max pixels of droop at midpoint
     */
    ropeSag(t, sagAmount) {
        return sagAmount * 4 * t * (1 - t);
    }
};
