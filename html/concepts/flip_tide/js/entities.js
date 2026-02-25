/**
 * Entities - Game objects for Flip Tide
 * All positions in virtual coordinates (800px wide base)
 */

// ---- Particle Pool ----
var ParticlePool = {
    pool: [],
    active: [],
    MAX: 200,

    init() {
        this.pool = [];
        this.active = [];
        for (var i = 0; i < this.MAX; i++) {
            this.pool.push({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 1,
                r: 255, g: 255, b: 255, a: 1,
                size: 3, type: 'circle'
            });
        }
    },

    spawn(x, y, vx, vy, life, r, g, b, size, type) {
        if (this.pool.length === 0) return null;
        var p = this.pool.pop();
        p.x = x; p.y = y;
        p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.r = r !== undefined ? r : 255;
        p.g = g !== undefined ? g : 255;
        p.b = b !== undefined ? b : 255;
        p.a = 1;
        p.size = size || 3;
        p.type = type || 'circle';
        this.active.push(p);
        return p;
    },

    update(dt) {
        for (var i = this.active.length - 1; i >= 0; i--) {
            var p = this.active[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.active.splice(i, 1);
                this.pool.push(p);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.a = p.life / p.maxLife;
        }
    },

    clear() {
        while (this.active.length > 0) {
            this.pool.push(this.active.pop());
        }
    }
};

// ---- Surfer ----
function Surfer() {
    this.x = 0;       // Virtual X (fixed at ~20% of 800)
    this.y = 0;       // Virtual Y
    this.targetY = 0;
    this.lane = 0;    // 0 = surface (top), 1 = ceiling (bottom)
    this.flipTimer = 0;
    this.flipDuration = 0.25;
    this.fromY = 0;
    this.flipping = false;
    this.dead = false;
    this.angle = 0;    // Visual tilt
    this.width = 30;
    this.height = 14;
    this.trail = [];   // Trail positions
    this.skin = 0;     // Skin index
    this.nearMissTimer = 0;
    this.queuedFlip = false;
}

Surfer.prototype.startFlip = function(surfaceY, ceilingY) {
    if (this.flipping) {
        this.queuedFlip = true;
        return;
    }
    this.lane = this.lane === 0 ? 1 : 0;
    this.fromY = this.y;
    this.targetY = this.lane === 0 ? surfaceY : ceilingY;
    this.flipTimer = 0;
    this.flipping = true;
    this.queuedFlip = false;
};

Surfer.prototype.update = function(dt, surfaceY, ceilingY, holding) {
    if (this.dead) return;

    // Update target positions (cave can narrow)
    if (this.lane === 0) this.targetY = surfaceY;
    else this.targetY = ceilingY;

    if (this.flipping) {
        var speed = holding ? 0.6 : 1.0; // Slow-fall when holding
        this.flipTimer += dt * speed;
        var t = Math.min(this.flipTimer / this.flipDuration, 1);
        // Ease-out cubic
        var ease = 1 - Math.pow(1 - t, 3);
        this.y = this.fromY + (this.targetY - this.fromY) * ease;
        // Rotation during flip
        this.angle = (this.lane === 1 ? 1 : -1) * Math.sin(t * Math.PI) * 0.4;

        if (t >= 1) {
            this.y = this.targetY;
            this.flipping = false;
            this.angle = 0;

            // Process queued flip
            if (this.queuedFlip) {
                this.startFlip(surfaceY, ceilingY);
            }
        }
    } else {
        // Settle to lane
        this.y += (this.targetY - this.y) * 10 * dt;
    }

    // Trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 12) this.trail.pop();

    // Near miss timer
    if (this.nearMissTimer > 0) this.nearMissTimer -= dt;
};

Surfer.prototype.getHitbox = function() {
    return {
        x: this.x - this.width * 0.4,
        y: this.y - this.height * 0.4,
        w: this.width * 0.8,
        h: this.height * 0.8
    };
};

// ---- Obstacle ----
function Obstacle(x, lane, gapStart, gapWidth, type) {
    this.x = x;          // World X position
    this.lane = lane;     // 0 = surface wave, 1 = ceiling coral
    this.gapStart = gapStart; // Where the gap begins (relative to obstacle strip)
    this.gapWidth = gapWidth; // Width of the gap
    this.type = type || (lane === 0 ? 'wave' : 'coral');
    this.width = 40;
    this.height = 0;     // Set by game based on cave dimensions
    this.passed = false;
    this.nearMissed = false;
    this.active = true;
    // Visual variation
    this.seed = Math.random() * 1000;
    this.spikes = 3 + Math.floor(Math.random() * 3);
}

Obstacle.prototype.getHitboxes = function(surfaceY, ceilingY, caveTop, caveBottom) {
    var boxes = [];
    if (this.lane === 0) {
        // Surface wave - covers the surface lane zone
        // From cave top down to surface + some margin
        boxes.push({
            x: this.x - this.width / 2,
            y: caveTop,
            w: this.width,
            h: surfaceY - caveTop + 12
        });
    } else {
        // Ceiling coral - covers the ceiling lane zone
        // From ceiling - margin down to cave bottom
        boxes.push({
            x: this.x - this.width / 2,
            y: ceilingY - 12,
            w: this.width,
            h: caveBottom - ceilingY + 12
        });
    }
    return boxes;
};

// ---- Shell (Collectible) ----
function Shell(x, y) {
    this.x = x;
    this.y = y;
    this.collected = false;
    this.active = true;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.size = 10;
    this.sparkle = 0;
}

Shell.prototype.update = function(dt) {
    this.bobPhase += dt * 3;
    this.sparkle += dt * 5;
};

// ---- Riptide Zone ----
function RiptideZone(x, width) {
    this.x = x;           // World X start
    this.width = width;    // Zone width in world units
    this.active = true;
    this.entered = false;
    this.wavePhase = 0;
}

RiptideZone.prototype.update = function(dt) {
    this.wavePhase += dt * 4;
};

RiptideZone.prototype.containsX = function(worldX) {
    return worldX >= this.x && worldX <= this.x + this.width;
};

// ---- Skin Definitions ----
var SKINS = [
    { name: 'Classic',    bodyColor: '#FFD700', boardColor: '#2196F3', trailColor: [33, 150, 243],  cost: 0 },
    { name: 'Coral',      bodyColor: '#FF6B6B', boardColor: '#FF4757', trailColor: [255, 71, 87],   cost: 25 },
    { name: 'Emerald',    bodyColor: '#2ED573', boardColor: '#26DE81', trailColor: [46, 213, 115],  cost: 75 },
    { name: 'Violet',     bodyColor: '#A55EEA', boardColor: '#8854D0', trailColor: [136, 84, 208],  cost: 150 },
    { name: 'Lava',       bodyColor: '#FF4500', boardColor: '#FF6348', trailColor: [255, 99, 72],   cost: 300 },
    { name: 'Ice',        bodyColor: '#70D6FF', boardColor: '#00BFFF', trailColor: [0, 191, 255],   cost: 500 },
    { name: 'Phantom',    bodyColor: '#DFE6E9', boardColor: '#B2BEC3', trailColor: [178, 190, 195], cost: 1000 }
];
