/**
 * Camera - viewport transforms, zoom, pan, shake
 * Maps world coordinates (800x600) to screen coordinates
 */

var Camera = {
    // World-space focus point
    x: 400,
    y: 300,

    // Zoom level (1 = world fills screen height)
    zoom: 1.0,

    // Computed values
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,

    // Screen dimensions
    screenW: 800,
    screenH: 600,

    // Shake
    shakeAmount: 0,
    shakeDuration: 0,
    shakeTimer: 0,
    shakeX: 0,
    shakeY: 0,

    // Smooth follow
    targetX: 400,
    targetY: 300,
    targetZoom: 1.0,
    followSpeed: 3.0,

    init: function(screenW, screenH) {
        this.screenW = screenW;
        this.screenH = screenH;
        this.recalc();
    },

    resize: function(screenW, screenH) {
        this.screenW = screenW;
        this.screenH = screenH;
        this.recalc();
    },

    recalc: function() {
        // Scale: fit 800x600 world into screen, maintaining aspect ratio
        var scaleX = this.screenW / Physics.WORLD_W;
        var scaleY = this.screenH / Physics.WORLD_H;
        this.scale = Math.min(scaleX, scaleY) * this.zoom;

        // Center the world on screen
        this.offsetX = this.screenW / 2 - this.x * this.scale;
        this.offsetY = this.screenH / 2 - this.y * this.scale;
    },

    // Set camera to frame the level
    frameLevelInstant: function() {
        this.x = Physics.WORLD_W / 2;
        this.y = Physics.WORLD_H / 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.recalc();
    },

    update: function(dt) {
        // Smooth follow
        var lerpFactor = 1 - Math.exp(-this.followSpeed * dt);
        this.x += (this.targetX - this.x) * lerpFactor;
        this.y += (this.targetY - this.y) * lerpFactor;
        this.zoom += (this.targetZoom - this.zoom) * lerpFactor;

        // Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            var intensity = (this.shakeTimer / this.shakeDuration) * this.shakeAmount;
            this.shakeX = (Math.random() - 0.5) * 2 * intensity;
            this.shakeY = (Math.random() - 0.5) * 2 * intensity;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        this.recalc();
    },

    // Trigger screen shake
    shake: function(amount, duration) {
        this.shakeAmount = amount;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    },

    // World coords -> screen coords
    worldToScreen: function(wx, wy) {
        return {
            x: wx * this.scale + this.offsetX + this.shakeX,
            y: wy * this.scale + this.offsetY + this.shakeY
        };
    },

    // Screen coords -> world coords
    screenToWorld: function(sx, sy) {
        return {
            x: (sx - this.offsetX - this.shakeX) / this.scale,
            y: (sy - this.offsetY - this.shakeY) / this.scale
        };
    },

    // Apply camera transform to canvas context
    applyTransform: function(ctx) {
        ctx.save();
        ctx.translate(this.offsetX + this.shakeX, this.offsetY + this.shakeY);
        ctx.scale(this.scale, this.scale);
    },

    // Restore canvas context
    restoreTransform: function(ctx) {
        ctx.restore();
    }
};
