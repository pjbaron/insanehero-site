import { CONFIG } from './config.js';
import { seedToTimeString } from './utils.js';
import { createWorldGen } from './wang.js';
import { createScene } from './scene.js';
import { createMaterials } from './materials.js';
import { createLighting, createCeilingLightGeometry, createRoomLight, removeRoomLight } from './lighting.js';
import { createWorldManager } from './worldManager.js';
import { createPlayer, requestPointerLock } from './player.js';
import { createCollisionSystem } from './collision.js';
import { createMap } from './map.js';

document.addEventListener('DOMContentLoaded', () => {
  const seed = CONFIG.SEED === 0 ? Math.floor(Math.random() * 86400) : CONFIG.SEED;

  // Build overlay before createPlayer so player.js reuses it
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'background:rgba(0,0,0,0.85)', 'color:#f5c842',
    'font-family:monospace', 'pointer-events:none',
    'user-select:none', 'z-index:20', 'letter-spacing:0.18em',
  ].join(';');
  overlay.innerHTML = [
    '<div style="font-size:2rem;font-weight:bold">CLICK TO EXPLORE</div>',
    `<div style="font-size:0.9rem;margin-top:1rem;opacity:0.7">${seedToTimeString(seed)}</div>`,
    '<div style="font-size:0.9rem;opacity:0.7">LEVEL 0</div>',
  ].join('');
  document.body.appendChild(overlay);

  // Stats HUD
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.style.cssText = 'position:fixed;bottom:8px;left:12px;font-family:monospace;font-size:11px;color:rgba(255,255,255,0.45);pointer-events:none;line-height:1.6';
  document.body.appendChild(hud);

  let canvas = document.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100vw;height:100vh';
    document.body.prepend(canvas);
  }

  const sceneCtx   = createScene(canvas);
  const materials  = createMaterials();
  const lightingAPI = { createCeilingLightGeometry, createRoomLight, removeRoomLight };
  createLighting(sceneCtx.scene);

  const worldGen      = createWorldGen(seed);
  const worldManager  = createWorldManager(sceneCtx.scene, worldGen, materials, lightingAPI, CONFIG);
  const player        = createPlayer(sceneCtx.camera, CONFIG);
  const collisionSystem = createCollisionSystem(worldManager, CONFIG);
  const map = createMap(worldGen, CONFIG);

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm') map.toggle();
  });

  // Start at tile (0,0) centre
  const startX = CONFIG.TILE_WORLD_SIZE / 2;
  const startZ = CONFIG.TILE_WORLD_SIZE / 2;
  player.setPosition(startX, CONFIG.PLAYER_HEIGHT, startZ);
  worldManager.update(startX, startZ);

  document.getElementById('seed-display').textContent = seedToTimeString(seed);
  // Single point light simulating the nearest ceiling lamp above the player
  const playerLight = new THREE.PointLight(0xfff5e0, 2, 18, 1.5);
  playerLight.position.set(startX, CONFIG.PLAYER_HEIGHT, startZ);
  sceneCtx.scene.add(playerLight);

  requestPointerLock(canvas);

  // Game loop
  const dtHistory = new Array(30).fill(0.016);
  let frameCount = 0;
  let lastTime = 0;

  const SLOW_FRAME_MS = 50; // warn if any section exceeds this

  function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    dtHistory[frameCount % 30] = dt;
    frameCount++;

    const pos = player.getPosition();
    playerLight.position.set(pos.x, CONFIG.PLAYER_HEIGHT, pos.z);

    let t0, t1;

    t0 = performance.now();
    worldManager.update(pos.x, pos.z);
    t1 = performance.now();
    if (t1 - t0 > SLOW_FRAME_MS) console.warn(`[frame] worldManager.update ${(t1-t0).toFixed(1)}ms`);

    t0 = performance.now();
    player.update(dt, (p) => collisionSystem.resolveCollision(p, sceneCtx.scene));
    t1 = performance.now();
    if (t1 - t0 > SLOW_FRAME_MS) console.warn(`[frame] player.update+collision ${(t1-t0).toFixed(1)}ms`);

    if (map.isVisible()) map.render(pos.x, pos.z, player.getYaw());

    t0 = performance.now();
    sceneCtx.renderer.render(sceneCtx.scene, sceneCtx.camera);
    t1 = performance.now();
    if (t1 - t0 > SLOW_FRAME_MS) console.warn(`[frame] renderer.render ${(t1-t0).toFixed(1)}ms`);

    if (frameCount % 30 === 0) {
      const avgDt = dtHistory.reduce((a, b) => a + b, 0) / 30;
      const fps = Math.round(1 / avgDt);
      const p2 = player.getPosition();
      const stats = worldManager.getStats();
      hud.textContent = `FPS ${fps}  |  ${p2.x.toFixed(1)} ${p2.z.toFixed(1)}  |  tiles ${stats.activeTileCount}`;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
