import { CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT } from './config.js';

const SMOOTHING = 0.08;

class Camera {
    constructor() {
        this.x = WORLD_WIDTH / 2;
        this.y = WORLD_HEIGHT / 2;
    }

    follow(targetX, targetY) {
        this.x += (targetX - this.x) * SMOOTHING;
        this.y += (targetY - this.y) * SMOOTHING;

        const halfW = CANVAS_WIDTH / 2;
        const halfH = CANVAS_HEIGHT / 2;
        this.x = Math.max(halfW, Math.min(WORLD_WIDTH - halfW, this.x));
        this.y = Math.max(halfH, Math.min(WORLD_HEIGHT - halfH, this.y));
    }

    worldToScreen(wx, wy) {
        return {
            x: wx - this.x + CANVAS_WIDTH / 2,
            y: wy - this.y + CANVAS_HEIGHT / 2,
        };
    }

    screenToWorld(sx, sy) {
        return {
            x: sx + this.x - CANVAS_WIDTH / 2,
            y: sy + this.y - CANVAS_HEIGHT / 2,
        };
    }

    applyTransform(ctx) {
        ctx.save();
        ctx.translate(
            Math.round(CANVAS_WIDTH / 2 - this.x),
            Math.round(CANVAS_HEIGHT / 2 - this.y)
        );
    }

    restore(ctx) {
        ctx.restore();
    }
}

export const camera = new Camera();
export default camera;
