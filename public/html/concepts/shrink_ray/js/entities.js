/**
 * Entities - All game objects for Shrink Ray
 * Non-module global: Player, Obstacle, Ricochet, Beam, Pickup, Particle, FloatingText
 */

// ---- Obstacle type definitions ----
var OBSTACLE_TYPES = [
    { name: 'crate',    shape: 'rect',   minR: 25, maxR: 45, color: '#e67e22', accent: '#d35400', points: 10 },
    { name: 'boulder',  shape: 'circle', minR: 30, maxR: 55, color: '#7f8c8d', accent: '#5d6d7e', points: 15 },
    { name: 'barrel',   shape: 'rect',   minR: 20, maxR: 35, color: '#c0392b', accent: '#922b21', points: 8  },
    { name: 'crystal',  shape: 'diamond',minR: 22, maxR: 40, color: '#9b59b6', accent: '#7d3c98', points: 20 },
    { name: 'meteor',   shape: 'circle', minR: 35, maxR: 65, color: '#e74c3c', accent: '#c0392b', points: 25 }
];

// ---- Player ----
function Player(canvasW, canvasH) {
    this.x = canvasW * 0.12;
    this.y = canvasH / 2;
    this.w = 28;
    this.h = 40;
    this.targetY = this.y;
    this.speed = 500;
    this.hasReverseRay = false;
    this.reverseRayTimer = 0;
    this.invulnTimer = 0;  // brief invuln after start
    this.trail = [];       // recent positions for trail effect
}

Player.prototype.update = function(dt, canvasH, targetY, useKeyboard, isUp, isDown) {
    // Keyboard movement overrides pointer
    if (useKeyboard) {
        if (isUp) this.targetY = this.y - this.speed * dt;
        if (isDown) this.targetY = this.y + this.speed * dt;
    } else {
        this.targetY = targetY;
    }

    // Clamp target
    var halfH = this.h / 2;
    if (this.targetY < halfH) this.targetY = halfH;
    if (this.targetY > canvasH - halfH) this.targetY = canvasH - halfH;

    // Smooth follow
    var diff = this.targetY - this.y;
    var maxMove = this.speed * dt;
    if (Math.abs(diff) > maxMove) {
        this.y += (diff > 0 ? maxMove : -maxMove);
    } else {
        this.y = this.targetY;
    }

    // Trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();

    // Timers
    if (this.reverseRayTimer > 0) {
        this.reverseRayTimer -= dt;
        if (this.reverseRayTimer <= 0) {
            this.hasReverseRay = false;
            this.reverseRayTimer = 0;
        }
    }
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
};

Player.prototype.getBounds = function() {
    return {
        x: this.x - this.w / 2,
        y: this.y - this.h / 2,
        w: this.w,
        h: this.h
    };
};

// ---- Obstacle ----
function Obstacle(canvasW, canvasH, tier, isMobile, speedMult) {
    var typeIdx = Math.floor(Math.random() * OBSTACLE_TYPES.length);
    var type = OBSTACLE_TYPES[typeIdx];
    this.type = type;
    this.shape = type.shape;
    this.color = type.color;
    this.accent = type.accent;

    // Size scales slightly with tier, bigger on mobile
    var sizeScale = isMobile ? 1.15 : 1;
    this.r = (type.minR + Math.random() * (type.maxR - type.minR)) * sizeScale;
    this.points = type.points;

    // Spawn off right edge
    this.x = canvasW + this.r + 20;
    this.y = this.r + Math.random() * (canvasH - this.r * 2);

    // Speed ramps with tier and speed multiplier
    var sm = speedMult || 1;
    var baseSpeed = (120 + tier * 12) * sm;
    this.vx = -(baseSpeed + Math.random() * 40);
    this.vy = (Math.random() - 0.5) * 30;

    this.alive = true;
    this.shrinking = false;
    this.shrinkTimer = 0;
    this.origR = this.r;
    this.rotation = 0;
    this.rotSpeed = (Math.random() - 0.5) * 2;
}

Obstacle.prototype.update = function(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;

    if (this.shrinking) {
        this.shrinkTimer += dt;
        var t = this.shrinkTimer / 0.15; // 150ms shrink
        if (t >= 1) {
            this.alive = false;
        } else {
            this.r = this.origR * (1 - t * 0.8);
        }
    }
};

Obstacle.prototype.isOffScreen = function(canvasW) {
    return this.x < -this.r * 2;
};

Obstacle.prototype.hitTest = function(px, py, expand) {
    var ex = expand || 0;
    var dx = px - this.x;
    var dy = py - this.y;
    if (this.shape === 'circle') {
        return dx * dx + dy * dy <= (this.r + ex) * (this.r + ex);
    }
    // rect/diamond - use bounding box with expansion
    return Math.abs(dx) <= this.r + ex && Math.abs(dy) <= this.r + ex;
};

Obstacle.prototype.collidePlayer = function(player) {
    if (this.shrinking) return false;
    var b = player.getBounds();
    // Simple AABB vs circle/rect
    var cx = Math.max(b.x, Math.min(this.x, b.x + b.w));
    var cy = Math.max(b.y, Math.min(this.y, b.y + b.h));
    var dx = this.x - cx;
    var dy = this.y - cy;
    return dx * dx + dy * dy <= this.r * this.r;
};

// ---- Ricochet ----
function Ricochet(obstacle, canvasW, canvasH) {
    this.x = obstacle.x;
    this.y = obstacle.y;
    this.r = 6 + Math.random() * 4;
    this.color = obstacle.color;
    this.accent = obstacle.accent;
    this.shape = obstacle.shape;

    // Random direction, fast speed
    var angle = Math.random() * Math.PI * 2;
    var speed = 280 + Math.random() * 180;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.alive = true;
    this.age = 0;
    this.maxAge = 12 + Math.random() * 6; // 12-18 seconds lifespan
    this.bounces = 0;
    this.rotation = 0;
    this.rotSpeed = (Math.random() - 0.5) * 10;
    this.growing = false;
    this.growTimer = 0;
    this.origR = this.r;
    this.flash = 0;
}

Ricochet.prototype.update = function(dt, canvasW, canvasH) {
    if (this.growing) {
        this.growTimer += dt;
        var t = this.growTimer / 0.3;
        if (t >= 1) {
            this.alive = false;
        } else {
            this.r = this.origR + t * 30;
            this.vx *= 0.92;
            this.vy *= 0.92;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
    this.age += dt;

    if (this.flash > 0) this.flash -= dt;

    // Bounce off walls
    var bounced = false;
    if (this.x - this.r < 0) {
        this.x = this.r;
        this.vx = Math.abs(this.vx);
        bounced = true;
    } else if (this.x + this.r > canvasW) {
        this.x = canvasW - this.r;
        this.vx = -Math.abs(this.vx);
        bounced = true;
    }
    if (this.y - this.r < 0) {
        this.y = this.r;
        this.vy = Math.abs(this.vy);
        bounced = true;
    } else if (this.y + this.r > canvasH) {
        this.y = canvasH - this.r;
        this.vy = -Math.abs(this.vy);
        bounced = true;
    }

    if (bounced) {
        this.bounces++;
        this.flash = 0.1;
        Synth.bounce();
    }

    // Age out
    if (this.age > this.maxAge) {
        this.alive = false;
    }
};

Ricochet.prototype.collidePlayer = function(player) {
    if (this.growing) return false;
    var b = player.getBounds();
    var cx = Math.max(b.x, Math.min(this.x, b.x + b.w));
    var cy = Math.max(b.y, Math.min(this.y, b.y + b.h));
    var dx = this.x - cx;
    var dy = this.y - cy;
    return dx * dx + dy * dy <= this.r * this.r;
};

Ricochet.prototype.hitTest = function(px, py, expand) {
    var ex = expand || 0;
    var dx = px - this.x;
    var dy = py - this.y;
    return dx * dx + dy * dy <= (this.r + ex) * (this.r + ex);
};

// ---- Beam (visual shrink ray effect) ----
function Beam(startX, startY, endX, endY) {
    this.sx = startX;
    this.sy = startY;
    this.ex = endX;
    this.ey = endY;
    this.life = 0.2;
    this.maxLife = 0.2;
    this.alive = true;
}

Beam.prototype.update = function(dt) {
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
};

// ---- Reverse Ray Pickup ----
function Pickup(canvasW, canvasH) {
    this.x = canvasW + 30;
    this.y = 40 + Math.random() * (canvasH - 80);
    this.r = 16;
    this.vx = -80;
    this.alive = true;
    this.age = 0;
    this.bobPhase = Math.random() * Math.PI * 2;
}

Pickup.prototype.update = function(dt) {
    this.x += this.vx * dt;
    this.age += dt;
    this.bobPhase += dt * 3;
    if (this.x < -30) this.alive = false;
};

Pickup.prototype.collidePlayer = function(player) {
    var b = player.getBounds();
    var cx = Math.max(b.x, Math.min(this.x, b.x + b.w));
    var cy = Math.max(b.y, Math.min(this.y + Math.sin(this.bobPhase) * 5, b.y + b.h));
    var dx = this.x - cx;
    var dy = (this.y + Math.sin(this.bobPhase) * 5) - cy;
    return dx * dx + dy * dy <= this.r * this.r;
};

// ---- Particle ----
function Particle(x, y, color, opts) {
    var o = opts || {};
    this.x = x;
    this.y = y;
    this.color = color;
    var angle = o.angle !== undefined ? o.angle : Math.random() * Math.PI * 2;
    var speed = o.speed !== undefined ? o.speed : 60 + Math.random() * 120;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.r = o.r !== undefined ? o.r : 2 + Math.random() * 3;
    this.life = o.life !== undefined ? o.life : 0.3 + Math.random() * 0.5;
    this.maxLife = this.life;
    this.alive = true;
    this.gravity = o.gravity || 0;
}

Particle.prototype.update = function(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
};

// ---- Floating Text ----
function FloatingText(x, y, text, color, size) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color || '#fff';
    this.size = size || 20;
    this.vy = -60;
    this.life = 0.8;
    this.maxLife = 0.8;
    this.alive = true;
}

FloatingText.prototype.update = function(dt) {
    this.y += this.vy * dt;
    this.vy *= 0.96;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
};
