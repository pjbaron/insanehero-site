/**
 * Orbit Keeper - Game Objects and Helpers
 * Loaded as non-module script before main.js
 */

// --- Helpers ---

function dist(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function normalize(x, y) {
    var len = Math.sqrt(x * x + y * y);
    if (len < 0.0001) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function randAngle() {
    return Math.random() * Math.PI * 2;
}

function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
}

// --- Palette ---
var PALETTE = ['#4A90D9','#D94A6B','#6BD94A','#D9A44A','#9B59B6','#1ABC9C','#E67E22','#3498DB'];

function lightenColor(hex, amt) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    r = Math.min(255, r + amt);
    g = Math.min(255, g + amt);
    b = Math.min(255, b + amt);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}

// --- Planet ---

function Planet(x, y, vx, vy, radius, colorIndex) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = PALETTE[colorIndex % PALETTE.length];
    this.ringColor = lightenColor(this.color, 80);
    this.orbitSlots = [
        radius * 1.8,
        radius * 2.5,
        radius * 3.2,
        radius * 3.9
    ];
    this.slotOccupied = [false, false, false, false];
    this.moons = [];
    this.anchored = false;
    this.pulseTimer = Math.random() * Math.PI * 2;
    this.spawnTime = 0;
}

Planet.prototype.firstAvailableSlot = function() {
    for (var i = 0; i < 4; i++) {
        if (!this.slotOccupied[i]) return i;
    }
    return -1;
};

Planet.prototype.closestAvailableSlot = function(d) {
    var bestIdx = -1;
    var bestDiff = Infinity;
    for (var i = 0; i < 4; i++) {
        if (this.slotOccupied[i]) continue;
        var diff = Math.abs(d - this.orbitSlots[i]);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
        }
    }
    return bestIdx;
};

// --- Moon ---

function Moon(x, y, vx, vy, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = '#FFFFFF';
    this.state = 'flying'; // flying | capturing | orbiting | shattering

    // Flying
    this.vx = vx;
    this.vy = vy;
    this.flyTime = 0;
    this.launchGrace = 0.1; // grace period to not collide with moons near launch point

    // Capturing
    this.captureTimer = 0;
    this.captureStartAngle = 0;
    this.captureStartDist = 0;
    this.captureTargetRadius = 0;

    // Orbiting
    this.planet = null;
    this.orbitIndex = -1;
    this.orbitRadius = 0;
    this.angle = 0;
    this.angularSpeed = 0;
    this.direction = 1;

    // Trail
    this.trail = [];

    // Shatter flag for chain reactions
    this.markedForShatter = false;
}

// --- Particle ---

function Particle(x, y, vx, vy, radius, color, life, decay) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.life = life;
    this.decay = decay;
}

// --- ScorePopup ---

function ScorePopup(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.life = 1.0;
    this.color = color || '#FFFFFF';
}

// --- Star ---

function Star() {
    this.x = Math.random();
    this.y = Math.random();
    this.brightness = 0.2 + Math.random() * 0.6;
    this.twinkleOffset = Math.random() * Math.PI * 2;
    this.size = 0.5 + Math.random() * 1.5;
    this.depth = 0.3 + Math.random() * 0.7; // parallax depth
}

// --- Flash ring (for chain reaction / capture) ---

function FlashRing(x, y, maxRadius, duration, color) {
    this.x = x;
    this.y = y;
    this.maxRadius = maxRadius;
    this.duration = duration;
    this.color = color || '#FFFFFF';
    this.timer = 0;
}
