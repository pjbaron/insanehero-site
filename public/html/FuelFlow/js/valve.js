// valve.js — Valve rotation interaction and state
import {
    GRID_X, GRID_Y, CELL_SIZE, INLET_PIPE_LEN, VALVE_RADIUS,
    PIPE_WIDTH,
} from './constants.js';

export class Valve {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.angle = 0;          // current rotation in radians
        this.totalRotation = 0;  // accumulated rotation
        this.turning = false;
        this.lastAngle = 0;      // last pointer angle for delta
        this.completed = false;  // true after 360° rotation
        this.windingBack = false;
        this.windBackSpeed = 4;  // radians/sec
        this.locked = false;     // true once fuel starts flowing
    }

    /**
     * Set position based on inlet row.
     */
    setPosition(inletRow) {
        this.x = GRID_X - INLET_PIPE_LEN / 2;
        this.y = GRID_Y + inletRow * CELL_SIZE + CELL_SIZE / 2;
    }

    reset(inletRow) {
        this.angle = 0;
        this.totalRotation = 0;
        this.turning = false;
        this.completed = false;
        this.windingBack = false;
        this.locked = false;
        this.setPosition(inletRow);
    }

    onPointerDown(x, y) {
        if (this.locked || this.completed) return false;

        const dx = x - this.x;
        const dy = y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < VALVE_RADIUS * 2) {
            this.turning = true;
            this.windingBack = false;
            this.lastAngle = Math.atan2(dy, dx);
            return true;
        }
        return false;
    }

    onPointerMove(x, y) {
        if (!this.turning) return false;

        const dx = x - this.x;
        const dy = y - this.y;
        const currentAngle = Math.atan2(dy, dx);

        let delta = currentAngle - this.lastAngle;
        // Normalize delta to [-PI, PI]
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;

        // Only allow forward (clockwise) rotation
        if (delta > 0) {
            this.angle += delta;
            this.totalRotation += delta;
        }

        this.lastAngle = currentAngle;

        // Check if completed full 360
        if (this.totalRotation >= Math.PI * 2) {
            this.completed = true;
            this.turning = false;
            return true;
        }

        return true;
    }

    onPointerUp() {
        if (!this.turning) return false;
        this.turning = false;

        if (!this.completed && this.totalRotation > 0) {
            this.windingBack = true;
        }

        return true;
    }

    update(dt) {
        if (this.windingBack) {
            this.angle -= this.windBackSpeed * dt;
            this.totalRotation -= this.windBackSpeed * dt;

            if (this.totalRotation <= 0) {
                this.angle = 0;
                this.totalRotation = 0;
                this.windingBack = false;
            }
        }
    }

    getProgress() {
        return Math.min(this.totalRotation / (Math.PI * 2), 1);
    }

    render(ctx) {
        const x = this.x;
        const y = this.y;
        const r = VALVE_RADIUS;

        // Valve body
        ctx.fillStyle = '#556677';
        ctx.strokeStyle = '#3a4a5a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Progress ring
        if (this.totalRotation > 0) {
            ctx.strokeStyle = '#e6a817';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(x, y, r + 5, -Math.PI / 2,
                -Math.PI / 2 + Math.min(this.totalRotation, Math.PI * 2));
            ctx.stroke();
        }

        // Handle
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.angle);

        ctx.fillStyle = '#778899';
        ctx.strokeStyle = '#556677';
        ctx.lineWidth = 2;

        // Handle bar
        ctx.beginPath();
        ctx.roundRect(-6, -r * 1.3, 12, r * 2.6, 4);
        ctx.fill();
        ctx.stroke();

        // Center bolt
        ctx.fillStyle = '#8899aa';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Completed indicator
        if (this.completed) {
            ctx.fillStyle = '#44aa44';
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
