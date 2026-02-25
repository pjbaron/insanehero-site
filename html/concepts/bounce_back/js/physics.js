/**
 * Physics - Circle-vs-circle and circle-vs-line collision detection & response
 * All in virtual coordinates (400x700)
 */

var Physics = {
    GRAVITY: 600,       // pixels/s^2
    BALL_RADIUS: 7,
    DAMPING: 0.65,      // bounce energy retention
    MAX_VEL: 1200,      // clamp ball speed

    /**
     * Update ball position with gravity
     */
    integrate(ball, dt) {
        ball.vy += this.GRAVITY * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Clamp velocity
        var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > this.MAX_VEL) {
            ball.vx = (ball.vx / speed) * this.MAX_VEL;
            ball.vy = (ball.vy / speed) * this.MAX_VEL;
        }
    },

    /**
     * Circle-vs-circle collision
     * Returns { hit, nx, ny, overlap } or null
     */
    circleVsCircle(ax, ay, ar, bx, by, br) {
        var dx = ax - bx;
        var dy = ay - by;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = ar + br;

        if (dist < minDist && dist > 0.001) {
            return {
                hit: true,
                nx: dx / dist,
                ny: dy / dist,
                overlap: minDist - dist
            };
        }
        return null;
    },

    /**
     * Resolve ball bouncing off a static circle (peg/bumper)
     */
    bounceBallOffCircle(ball, cx, cy, cr) {
        var col = this.circleVsCircle(ball.x, ball.y, this.BALL_RADIUS, cx, cy, cr);
        if (!col) return false;

        // Push out
        ball.x += col.nx * col.overlap;
        ball.y += col.ny * col.overlap;

        // Reflect velocity
        var dot = ball.vx * col.nx + ball.vy * col.ny;
        if (dot < 0) { // Only if moving towards the circle
            ball.vx -= 2 * dot * col.nx;
            ball.vy -= 2 * dot * col.ny;
            ball.vx *= this.DAMPING;
            ball.vy *= this.DAMPING;
        }

        return true;
    },

    /**
     * Bounce ball off a bumper (higher restitution)
     */
    bounceBallOffBumper(ball, cx, cy, cr) {
        var col = this.circleVsCircle(ball.x, ball.y, this.BALL_RADIUS, cx, cy, cr);
        if (!col) return false;

        ball.x += col.nx * col.overlap;
        ball.y += col.ny * col.overlap;

        var dot = ball.vx * col.nx + ball.vy * col.ny;
        if (dot < 0) {
            ball.vx -= 2 * dot * col.nx;
            ball.vy -= 2 * dot * col.ny;
            // Bumpers add energy
            ball.vx *= 1.1;
            ball.vy *= 1.1;
        }

        return true;
    },

    /**
     * Bounce ball off vertical walls
     */
    wallBounce(ball, minX, maxX) {
        var r = this.BALL_RADIUS;
        var hit = false;
        if (ball.x - r < minX) {
            ball.x = minX + r;
            ball.vx = Math.abs(ball.vx) * this.DAMPING;
            hit = true;
        }
        if (ball.x + r > maxX) {
            ball.x = maxX - r;
            ball.vx = -Math.abs(ball.vx) * this.DAMPING;
            hit = true;
        }
        return hit;
    },

    /**
     * Bounce ball off spinning obstacle (line segment)
     * Returns true if hit
     */
    bounceBallOffLine(ball, x1, y1, x2, y2) {
        var r = this.BALL_RADIUS;
        // Project ball center onto line segment
        var dx = x2 - x1;
        var dy = y2 - y1;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) return false;

        var ux = dx / len;
        var uy = dy / len;
        var bx = ball.x - x1;
        var by = ball.y - y1;
        var t = (bx * ux + by * uy) / len;
        t = Math.max(0, Math.min(1, t));

        var closestX = x1 + t * dx;
        var closestY = y1 + t * dy;
        var distX = ball.x - closestX;
        var distY = ball.y - closestY;
        var dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < r && dist > 0.001) {
            var nx = distX / dist;
            var ny = distY / dist;
            var overlap = r - dist;

            ball.x += nx * overlap;
            ball.y += ny * overlap;

            var dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
                ball.vx -= 2 * dot * nx;
                ball.vy -= 2 * dot * ny;
                ball.vx *= this.DAMPING;
                ball.vy *= this.DAMPING;
            }
            return true;
        }
        return false;
    },

    /**
     * Simulate trajectory for aiming preview
     * Returns array of {x,y} points
     */
    simulateTrajectory(startX, startY, vx, vy, steps, stepDt) {
        var points = [];
        var x = startX, y = startY;
        var svx = vx, svy = vy;
        for (var i = 0; i < steps; i++) {
            svy += this.GRAVITY * stepDt;
            x += svx * stepDt;
            y += svy * stepDt;
            if (x < this.BALL_RADIUS) { x = this.BALL_RADIUS; svx = Math.abs(svx); }
            if (x > 400 - this.BALL_RADIUS) { x = 400 - this.BALL_RADIUS; svx = -Math.abs(svx); }
            if (y > 700) break;
            points.push({ x: x, y: y });
        }
        return points;
    }
};
