/**
 * Creatures - Species definitions, spawning, rendering for Echo Hunt
 * All creatures are drawn procedurally on canvas (no images).
 */

// Creature species by depth zone
var SPECIES = [
    // Zone 1 (depth 0): Shallows
    { name: 'Lanternfish',   color: '#4FC3F7', glow: '#81D4FA', size: 14, speed: 30,  points: 10,  zone: 0, shape: 'fish' },
    { name: 'Sea Butterfly',  color: '#CE93D8', glow: '#E1BEE7', size: 12, speed: 20,  points: 15,  zone: 0, shape: 'butterfly' },
    // Zone 2 (depth 1): Twilight
    { name: 'Flashlight Fish', color: '#FFD54F', glow: '#FFF176', size: 16, speed: 40,  points: 20,  zone: 1, shape: 'fish' },
    { name: 'Moon Jelly',      color: '#80DEEA', glow: '#B2EBF2', size: 18, speed: 15,  points: 25,  zone: 1, shape: 'jelly' },
    // Zone 3 (depth 2): Midnight
    { name: 'Dragonfish',     color: '#EF5350', glow: '#EF9A9A', size: 20, speed: 50,  points: 35,  zone: 2, shape: 'fish' },
    { name: 'Comb Jelly',     color: '#80CBC4', glow: '#B2DFDB', size: 15, speed: 25,  points: 30,  zone: 2, shape: 'jelly' },
    // Zone 4 (depth 3): Abyssal
    { name: 'Gulper Eel',     color: '#FF8A65', glow: '#FFAB91', size: 24, speed: 35,  points: 50,  zone: 3, shape: 'eel' },
    { name: 'Vampire Squid',  color: '#B39DDB', glow: '#D1C4E9', size: 22, speed: 45,  points: 60,  zone: 3, shape: 'squid' },
    // Zone 5 (depth 4): Hadal
    { name: 'Phantom Octopus', color: '#F48FB1', glow: '#F8BBD0', size: 26, speed: 30, points: 80,  zone: 4, shape: 'squid' },
];

// Predator types
var PREDATORS = [
    { name: 'Anglerfish',  color: '#FF1744', glow: '#FF5252', size: 28, speed: 80,  shape: 'angler',   zone: 0 },
    { name: 'Lion Jelly',  color: '#FF6D00', glow: '#FF9100', size: 32, speed: 50,  shape: 'bigjelly', zone: 1 },
    { name: 'Viperfish',   color: '#D50000', glow: '#FF1744', size: 30, speed: 100, shape: 'viper',    zone: 3 },
];

// Zone names and colors
var ZONES = [
    { name: 'Sunlit Shallows', bg: '#020810', water: '#0a1628' },
    { name: 'Twilight Zone',   bg: '#010610', water: '#060e20' },
    { name: 'Midnight Zone',   bg: '#000408', water: '#030818' },
    { name: 'Abyssal Plain',   bg: '#000204', water: '#020510' },
    { name: 'Hadal Trench',    bg: '#000102', water: '#010308' },
];

// Depth quotas: creatures needed to advance
var QUOTAS = [8, 12, 16, 20, 24];

/** Spawn a creature of given species at random position */
function spawnCreature(speciesIdx, canvasW, canvasH, margin) {
    var sp = SPECIES[speciesIdx];
    var m = margin || 40;
    return {
        type: 'creature',
        speciesIdx: speciesIdx,
        species: sp,
        x: m + Math.random() * (canvasW - 2 * m),
        y: m + Math.random() * (canvasH - 2 * m),
        vx: (Math.random() - 0.5) * sp.speed,
        vy: (Math.random() - 0.5) * sp.speed,
        size: sp.size,
        revealed: false,
        revealTimer: 0,
        caught: false,
        catchAnim: 0,
        angle: Math.random() * Math.PI * 2,
        wobble: Math.random() * Math.PI * 2,
    };
}

/** Spawn a predator at edge of screen */
function spawnPredator(predatorIdx, canvasW, canvasH) {
    var pd = PREDATORS[predatorIdx];
    // Spawn from a random edge
    var side = Math.floor(Math.random() * 4);
    var x, y;
    if (side === 0) { x = -pd.size; y = Math.random() * canvasH; }
    else if (side === 1) { x = canvasW + pd.size; y = Math.random() * canvasH; }
    else if (side === 2) { x = Math.random() * canvasW; y = -pd.size; }
    else { x = Math.random() * canvasW; y = canvasH + pd.size; }

    return {
        type: 'predator',
        predatorIdx: predatorIdx,
        predator: pd,
        x: x,
        y: y,
        vx: 0,
        vy: 0,
        size: pd.size,
        revealed: false,
        revealTimer: 0,
        agitated: false,
        agitateTimer: 0,
        targetX: canvasW / 2,
        targetY: canvasH / 2,
        angle: Math.random() * Math.PI * 2,
    };
}

/** Draw a creature shape at given position */
function drawCreatureShape(ctx, c, alpha) {
    var x = c.x;
    var y = c.y;
    var s = c.size || c.species.size;
    var col = c.species ? c.species.color : c.predator.color;
    var glowCol = c.species ? c.species.glow : c.predator.glow;
    var shape = c.species ? c.species.shape : c.predator.shape;
    var a = c.angle || 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.globalAlpha = alpha;

    // Glow effect
    ctx.shadowColor = glowCol;
    ctx.shadowBlur = s * 0.8;

    ctx.fillStyle = col;
    ctx.strokeStyle = glowCol;
    ctx.lineWidth = 1.5;

    if (shape === 'fish') {
        // Simple fish body
        ctx.beginPath();
        ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tail
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(-s * 1.5, -s * 0.5);
        ctx.lineTo(-s * 1.5, s * 0.5);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(s * 0.5, -s * 0.15, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(s * 0.55, -s * 0.15, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
    } else if (shape === 'butterfly') {
        // Two wing-like ovals
        ctx.beginPath();
        ctx.ellipse(-s * 0.4, -s * 0.3, s * 0.6, s * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(s * 0.4, -s * 0.3, s * 0.6, s * 0.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Body line
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.6);
        ctx.lineTo(0, s * 0.5);
        ctx.stroke();
    } else if (shape === 'jelly') {
        // Dome
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.7, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        // Tentacles
        ctx.lineWidth = 1.5;
        var wobble = c.wobble || 0;
        for (var i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * s * 0.25, 0);
            var cx1 = i * s * 0.3 + Math.sin(wobble + i) * s * 0.2;
            ctx.quadraticCurveTo(cx1, s * 0.6, i * s * 0.2, s * 1.1);
            ctx.stroke();
        }
    } else if (shape === 'eel') {
        // Long sinuous body
        ctx.lineWidth = s * 0.35;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s * 1.2, 0);
        var wobble = c.wobble || 0;
        ctx.bezierCurveTo(s * 0.4, Math.sin(wobble) * s * 0.4,
                          -s * 0.4, Math.sin(wobble + 2) * s * 0.4,
                          -s * 1.2, Math.sin(wobble + 4) * s * 0.3);
        ctx.stroke();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(s * 1.0, -s * 0.05, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
    } else if (shape === 'squid') {
        // Mantle
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.2, s * 0.5, s * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tentacles
        ctx.lineWidth = 2;
        var wobble = c.wobble || 0;
        for (var i = 0; i < 4; i++) {
            var startX = (i - 1.5) * s * 0.25;
            ctx.beginPath();
            ctx.moveTo(startX, s * 0.4);
            ctx.quadraticCurveTo(startX + Math.sin(wobble + i) * s * 0.3, s * 0.9,
                                 startX + Math.sin(wobble + i * 0.7) * s * 0.2, s * 1.3);
            ctx.stroke();
        }
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(-s * 0.2, -s * 0.3, s * 0.1, 0, Math.PI * 2);
        ctx.arc(s * 0.2, -s * 0.3, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
    } else if (shape === 'angler') {
        // Big round body
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Lure stalk
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.6);
        ctx.quadraticCurveTo(s * 0.3, -s * 1.2, s * 0.1, -s * 1.0);
        ctx.stroke();
        // Lure glow
        ctx.shadowBlur = s * 0.5;
        ctx.beginPath();
        ctx.arc(s * 0.1, -s * 1.0, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Teeth
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        for (var i = 0; i < 5; i++) {
            var ta = -0.4 + i * 0.2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ta) * s * 0.6, Math.sin(ta) * s * 0.6);
            ctx.lineTo(Math.cos(ta) * s * 0.8, Math.sin(ta) * s * 0.6 + s * 0.1);
            ctx.lineTo(Math.cos(ta + 0.1) * s * 0.6, Math.sin(ta + 0.1) * s * 0.6);
            ctx.fill();
        }
        // Eye
        ctx.beginPath();
        ctx.arc(s * 0.2, -s * 0.1, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#D50000';
        ctx.beginPath();
        ctx.arc(s * 0.23, -s * 0.1, s * 0.06, 0, Math.PI * 2);
        ctx.fill();
    } else if (shape === 'bigjelly') {
        // Large jellyfish dome
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.7, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        // Many thick tentacles
        ctx.lineWidth = 3;
        var wobble = c.wobble || 0;
        for (var i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * s * 0.18, 0);
            ctx.bezierCurveTo(
                i * s * 0.2 + Math.sin(wobble + i) * s * 0.3, s * 0.5,
                i * s * 0.15 + Math.sin(wobble + i + 1) * s * 0.25, s * 0.9,
                i * s * 0.2, s * 1.4
            );
            ctx.stroke();
        }
    } else if (shape === 'viper') {
        // Sleek elongated fish with fangs
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.1, s * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tail
        ctx.beginPath();
        ctx.moveTo(-s * 1.1, 0);
        ctx.lineTo(-s * 1.6, -s * 0.4);
        ctx.lineTo(-s * 1.6, s * 0.4);
        ctx.closePath();
        ctx.fill();
        // Fangs
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(s * 1.1, -s * 0.1);
        ctx.lineTo(s * 1.4, 0);
        ctx.lineTo(s * 1.1, s * 0.1);
        ctx.fill();
        // Eye
        ctx.beginPath();
        ctx.arc(s * 0.6, -s * 0.1, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.arc(s * 0.63, -s * 0.1, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}
