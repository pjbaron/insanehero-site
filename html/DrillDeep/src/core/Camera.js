// Camera.js - View management, following, shake

export class Camera {
  constructor(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;

    // Camera position (top-left corner in world space)
    this.x = 0;
    this.y = 0;

    // Target for smooth following
    this.targetX = 0;
    this.targetY = 0;

    // Follow settings
    this.followSpeed = 0.1; // Smoothing factor
    this.lookahead = 100;   // Look ahead of target (downward)

    // Shake effect
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Bounds
    this.minX = 0;
    this.maxX = Infinity;
    this.minY = -100; // Allow some sky
    this.maxY = Infinity;
  }

  setBounds(minX, maxX, minY, maxY) {
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;
  }

  follow(targetX, targetY, immediate = false) {
    // Center target in view with lookahead
    this.targetX = targetX - this.viewWidth / 2;
    this.targetY = targetY - this.viewHeight / 2 + this.lookahead;

    if (immediate) {
      this.x = this.targetX;
      this.y = this.targetY;
    }
  }

  update(dt) {
    // Smooth follow
    this.x += (this.targetX - this.x) * this.followSpeed;
    this.y += (this.targetY - this.y) * this.followSpeed;

    // Apply bounds
    this.x = Math.max(this.minX, Math.min(this.maxX - this.viewWidth, this.x));
    this.y = Math.max(this.minY, Math.min(this.maxY - this.viewHeight, this.y));

    // Update shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;

      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }
  }

  shake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  // Transform world coordinates to screen coordinates
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x + this.shakeOffsetX,
      y: worldY - this.y + this.shakeOffsetY
    };
  }

  // Transform screen coordinates to world coordinates
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x - this.shakeOffsetX,
      y: screenY + this.y - this.shakeOffsetY
    };
  }

  // Check if a world rectangle is visible
  isVisible(worldX, worldY, width, height) {
    return (
      worldX + width > this.x &&
      worldX < this.x + this.viewWidth &&
      worldY + height > this.y &&
      worldY < this.y + this.viewHeight
    );
  }

  // Apply camera transform to canvas context
  applyTransform(ctx) {
    ctx.save();
    ctx.translate(
      -Math.floor(this.x) + this.shakeOffsetX,
      -Math.floor(this.y) + this.shakeOffsetY
    );
  }

  resetTransform(ctx) {
    ctx.restore();
  }
}
