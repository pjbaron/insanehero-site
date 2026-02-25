// panel.js — Bulkhead panel display and screw removal mechanic
import {
    LOGICAL_W, LOGICAL_H, SCREW_RADIUS, PANEL_COLOR, PANEL_BORDER,
    SCREW_COLOR, PANEL_FALL_DURATION,
} from './constants.js';
import { easeInCubic } from './utils.js';

export class Panel {
    constructor() {
        this.screws = [true, true, true, true]; // TL, TR, BL, BR
        this.screwsRemoved = 0;
        this.falling = false;
        this.fallProgress = 0;  // 0-1
        this.fallen = false;

        // Screw removal animation
        this.screwAnim = [0, 0, 0, 0]; // 0 = present, 1 = fully removed
        this.screwAnimating = -1; // which screw is animating (-1 = none)
    }

    reset() {
        this.screws = [true, true, true, true];
        this.screwsRemoved = 0;
        this.falling = false;
        this.fallProgress = 0;
        this.fallen = false;
        this.screwAnim = [0, 0, 0, 0];
        this.screwAnimating = -1;
    }

    /** Get panel rect (full screen) */
    getRect() {
        const margin = 60;
        return {
            x: margin,
            y: margin,
            w: LOGICAL_W - margin * 2,
            h: LOGICAL_H - margin * 2,
        };
    }

    /** Get screw positions */
    getScrewPositions() {
        const r = this.getRect();
        const inset = 50;
        return [
            { x: r.x + inset, y: r.y + inset },            // TL
            { x: r.x + r.w - inset, y: r.y + inset },      // TR
            { x: r.x + inset, y: r.y + r.h - inset },      // BL
            { x: r.x + r.w - inset, y: r.y + r.h - inset },// BR
        ];
    }

    /**
     * Handle tap. Returns 'screw_removed', 'panel_falling', or null.
     */
    onTap(x, y) {
        if (this.falling || this.fallen) return null;
        if (this.screwAnimating >= 0) return null;

        const positions = this.getScrewPositions();
        for (let i = 0; i < 4; i++) {
            if (!this.screws[i]) continue;
            const dx = x - positions[i].x;
            const dy = y - positions[i].y;
            if (Math.sqrt(dx * dx + dy * dy) < SCREW_RADIUS * 1.5) {
                this.screwAnimating = i;
                return 'screw_removing';
            }
        }
        return null;
    }

    update(dt) {
        // Animate screw removal
        if (this.screwAnimating >= 0) {
            const idx = this.screwAnimating;
            this.screwAnim[idx] += dt * 3; // ~0.33s per screw
            if (this.screwAnim[idx] >= 1) {
                this.screwAnim[idx] = 1;
                this.screws[idx] = false;
                this.screwsRemoved++;
                this.screwAnimating = -1;

                if (this.screwsRemoved >= 4) {
                    this.falling = true;
                    this.fallProgress = 0;
                    return 'panel_falling';
                }
                return 'screw_removed';
            }
        }

        // Animate panel falling
        if (this.falling && !this.fallen) {
            this.fallProgress += dt / PANEL_FALL_DURATION;
            if (this.fallProgress >= 1) {
                this.fallProgress = 1;
                this.fallen = true;
                this.falling = false;
                return 'panel_fallen';
            }
        }

        return null;
    }

    render(ctx) {
        if (this.fallen) return;

        const r = this.getRect();
        let offsetY = 0;

        if (this.falling) {
            const t = easeInCubic(this.fallProgress);
            offsetY = t * LOGICAL_H * 1.2;
            // Also rotate slightly
            ctx.save();
            ctx.translate(r.x + r.w / 2, r.y + r.h);
            ctx.rotate(t * 0.15);
            ctx.translate(-(r.x + r.w / 2), -(r.y + r.h));
        }

        // Panel body
        ctx.fillStyle = PANEL_COLOR;
        ctx.strokeStyle = PANEL_BORDER;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y + offsetY, r.w, r.h, 12);
        ctx.fill();
        ctx.stroke();

        // Panel texture lines
        ctx.strokeStyle = '#7a8494';
        ctx.lineWidth = 1;
        for (let ly = r.y + offsetY + 30; ly < r.y + offsetY + r.h - 30; ly += 20) {
            ctx.beginPath();
            ctx.moveTo(r.x + 20, ly);
            ctx.lineTo(r.x + r.w - 20, ly);
            ctx.stroke();
        }

        // "BULKHEAD" text
        ctx.fillStyle = '#5a6474';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BULKHEAD', r.x + r.w / 2, r.y + offsetY + r.h / 2 + 16);

        // Screws
        const positions = this.getScrewPositions();
        for (let i = 0; i < 4; i++) {
            const sx = positions[i].x;
            const sy = positions[i].y + offsetY;

            if (!this.screws[i] && this.screwAnim[i] >= 1) continue;

            const animFrac = this.screwAnim[i];
            const scale = 1 - animFrac;
            const alpha = 1 - animFrac;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(sx, sy);
            ctx.scale(scale, scale);
            ctx.rotate(animFrac * Math.PI * 4); // spin as it comes out

            // Screw head
            ctx.fillStyle = SCREW_COLOR;
            ctx.strokeStyle = '#889aad';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, SCREW_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Cross slot
            ctx.strokeStyle = '#667788';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-SCREW_RADIUS * 0.5, 0);
            ctx.lineTo(SCREW_RADIUS * 0.5, 0);
            ctx.moveTo(0, -SCREW_RADIUS * 0.5);
            ctx.lineTo(0, SCREW_RADIUS * 0.5);
            ctx.stroke();

            ctx.restore();
        }

        if (this.falling) {
            ctx.restore();
        }
    }

    /**
     * Draw a small panel thumbnail for the 3-panel overview.
     */
    renderThumbnail(ctx, x, y, w, h, levelNum, completed) {
        if (completed) {
            // Show completed state - green checkmark
            ctx.fillStyle = '#2a4a2a';
            ctx.strokeStyle = '#4a7a4a';
        } else {
            ctx.fillStyle = PANEL_COLOR;
            ctx.strokeStyle = PANEL_BORDER;
        }
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        // Level number
        ctx.fillStyle = completed ? '#6ab06a' : '#5a6474';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${levelNum}`, x + w / 2, y + h / 2 + 22);

        if (completed) {
            // Checkmark
            ctx.strokeStyle = '#6ab06a';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(x + w / 2 - 30, y + h / 2 + 50);
            ctx.lineTo(x + w / 2 - 5, y + h / 2 + 75);
            ctx.lineTo(x + w / 2 + 35, y + h / 2 + 35);
            ctx.stroke();
        }
    }
}
