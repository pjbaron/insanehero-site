// main.js — Entry point: fullscreen, canvas setup, game loop
import { LOGICAL_W, LOGICAL_H } from './constants.js';
import { Game } from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const prompt = document.getElementById('tap-prompt');

let game = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    scale = Math.min(w / LOGICAL_W, h / LOGICAL_H);
    canvas.width = Math.round(LOGICAL_W * scale);
    canvas.height = Math.round(LOGICAL_H * scale);
    offsetX = (w - canvas.width) / 2;
    offsetY = (h - canvas.height) / 2;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
}

/** Convert page coordinates to logical coordinates */
function pageToLogical(px, py) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (px - rect.left) / scale,
        y: (py - rect.top) / scale,
    };
}

// --- Input forwarding ---
function onPointerDown(x, y) { if (game) game.onPointerDown(x, y); }
function onPointerMove(x, y) { if (game) game.onPointerMove(x, y); }
function onPointerUp(x, y) { if (game) game.onPointerUp(x, y); }

canvas.addEventListener('mousedown', e => {
    const p = pageToLogical(e.clientX, e.clientY);
    onPointerDown(p.x, p.y);
});
canvas.addEventListener('mousemove', e => {
    const p = pageToLogical(e.clientX, e.clientY);
    onPointerMove(p.x, p.y);
});
canvas.addEventListener('mouseup', e => {
    const p = pageToLogical(e.clientX, e.clientY);
    onPointerUp(p.x, p.y);
});
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const p = pageToLogical(t.clientX, t.clientY);
    onPointerDown(p.x, p.y);
}, { passive: false });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const p = pageToLogical(t.clientX, t.clientY);
    onPointerMove(p.x, p.y);
}, { passive: false });
canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const p = pageToLogical(t.clientX, t.clientY);
    onPointerUp(p.x, p.y);
}, { passive: false });

// --- Game loop ---
let lastTime = 0;

function frame(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = timestamp;

    ctx.save();
    ctx.scale(scale, scale);

    if (game) {
        game.update(dt);
        game.render(ctx);
    }

    ctx.restore();
    requestAnimationFrame(frame);
}

// --- Start ---
function startGame() {
    prompt.style.display = 'none';
    canvas.style.display = 'block';

    const fs = document.documentElement.requestFullscreen
        || document.documentElement.webkitRequestFullscreen;
    if (fs) {
        fs.call(document.documentElement).catch(() => {});
    }

    resize();
    game = new Game();
    game.init();
    lastTime = performance.now();
    requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', () => setTimeout(resize, 100));

prompt.addEventListener('click', startGame);
prompt.addEventListener('touchend', e => { e.preventDefault(); startGame(); });

resize();
