import { buildTileMesh } from './tileBuilder.js';

const LOAD_PER_FRAME = 3;

export function createWorldManager(scene, worldGen, materials, lighting, config) {
  const { TILE_WORLD_SIZE: TILE, VISIBLE_RADIUS, PRELOAD_RADIUS, DESTROY_PER_FRAME } = config;

  const activeTiles  = new Map();
  const destroyQueue = [];
  // Tiles whose wang layout is generated but whose mesh hasn't been built yet
  const buildQueue   = [];
  const buildQueued  = new Set(); // keys currently in buildQueue

  const lightGeometry = lighting.createCeilingLightGeometry(config);

  function getTileCoords(worldX, worldZ) {
    return { tx: Math.floor(worldX / TILE), ty: Math.floor(worldZ / TILE) };
  }

  function isTileVisible(tx, ty, playerTx, playerTy) {
    return Math.max(Math.abs(tx - playerTx), Math.abs(ty - playerTy)) <= VISIBLE_RADIUS;
  }

  function isTileNeeded(tx, ty, playerTx, playerTy) {
    return Math.max(Math.abs(tx - playerTx), Math.abs(ty - playerTy)) <= PRELOAD_RADIUS;
  }

  function buildTile(tx, ty) {
    const key = `${tx},${ty}`;
    if (activeTiles.has(key)) return;

    const layout    = worldGen.getLayout(tx, ty);
    const { group } = buildTileMesh(tx, ty, layout, materials, lightGeometry, config);
    scene.add(group);

    const light = lighting.createRoomLight(scene, tx * TILE + TILE / 2, ty * TILE + TILE / 2);
    activeTiles.set(key, { group, lights: [light], tx, ty });
  }

  // Kept for external callers (e.g. initial prewarm)
  function loadTile(tx, ty) {
    buildTile(tx, ty);
  }

  function queueTileForRemoval(key) {
    if (!destroyQueue.includes(key)) {
      destroyQueue.push(key);
    }
  }

  function processDestroyQueue() {
    const count = Math.min(DESTROY_PER_FRAME, destroyQueue.length);
    for (let i = 0; i < count; i++) {
      const key  = destroyQueue.shift();
      const tile = activeTiles.get(key);
      if (!tile) continue;

      scene.remove(tile.group);
      for (const child of tile.group.children) {
        if (child.geometry) child.geometry.dispose();
      }
      for (const light of tile.lights) {
        if (light) lighting.removeRoomLight(scene, light);
      }
      activeTiles.delete(key);
    }
  }

  function update(playerWorldX, playerWorldZ) {
    const { tx: playerTx, ty: playerTy } = getTileCoords(playerWorldX, playerWorldZ);

    for (const [key, tile] of activeTiles) {
      if (!isTileNeeded(tile.tx, tile.ty, playerTx, playerTy)) {
        queueTileForRemoval(key);
      }
    }

    // Phase 1: generate wang layouts in raster order (fast)
    const t0 = performance.now();
    for (let ty = playerTy - PRELOAD_RADIUS; ty <= playerTy + PRELOAD_RADIUS; ty++) {
      for (let tx = playerTx - PRELOAD_RADIUS; tx <= playerTx + PRELOAD_RADIUS; tx++) {
        const key = `${tx},${ty}`;
        if (!activeTiles.has(key) && !buildQueued.has(key) && !destroyQueue.includes(key)) {
          worldGen.getLayout(tx, ty);
          buildQueue.push({ tx, ty, key });
          buildQueued.add(key);
        }
      }
    }
    const t1 = performance.now();

    // Phase 2: build meshes at a capped rate
    for (let i = 0; i < Math.min(LOAD_PER_FRAME, buildQueue.length); i++) {
      const item = buildQueue.shift();
      buildQueued.delete(item.key);
      if (activeTiles.has(item.key)) continue;
      buildTile(item.tx, item.ty);
    }
    const t2 = performance.now();

    if (t2 - t0 > 10) {
      console.warn(`[worldManager] ${(t2-t0).toFixed(1)}ms | layout-gen ${(t1-t0).toFixed(1)}ms | mesh-build ${(t2-t1).toFixed(1)}ms | active ${activeTiles.size} buildQ ${buildQueue.length}`);
    }

    processDestroyQueue();
  }

  function getStats() {
    return {
      activeTileCount:  activeTiles.size,
      destroyQueueLength: destroyQueue.length,
      buildQueueLength: buildQueue.length,
    };
  }

  return {
    getTileCoords, isTileVisible, isTileNeeded,
    loadTile, queueTileForRemoval, processDestroyQueue,
    update, getStats, activeTiles, destroyQueue,
  };
}
