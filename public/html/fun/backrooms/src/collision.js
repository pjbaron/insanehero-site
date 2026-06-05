export const PLAYER_RADIUS = 0.35;

export function createCollisionSystem(worldManager, config) {
  const { PLAYER_HEIGHT } = config;

  const RAY_DIRS = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    RAY_DIRS.push(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
  }

  const raycaster = new THREE.Raycaster();
  raycaster.far = PLAYER_RADIUS + 0.1;

  function resolveCollision(position, scene) {
    const t0 = performance.now();
    const playerTile = worldManager.getTileCoords(position.x, position.z);

    const candidates = [];
    let meshCount = 0;
    for (const child of scene.children) {
      if (!child.isGroup) continue;
      const { tx, ty } = child.userData;
      if (tx === undefined || ty === undefined) continue;
      if (Math.abs(tx - playerTile.tx) <= 1 && Math.abs(ty - playerTile.ty) <= 1) {
        candidates.push(child);
        meshCount += child.children.length;
      }
    }
    const t1 = performance.now();

    const origin = new THREE.Vector3(position.x, PLAYER_HEIGHT * 0.6, position.z);
    const corrected = new THREE.Vector3(position.x, position.y, position.z);

    for (const dir of RAY_DIRS) {
      raycaster.set(origin, dir);
      const hits = raycaster.intersectObjects(candidates, true);
      if (hits.length > 0 && hits[0].distance < PLAYER_RADIUS) {
        const push = PLAYER_RADIUS - hits[0].distance;
        corrected.x -= dir.x * push;
        corrected.z -= dir.z * push;
      }
    }
    const t2 = performance.now();

    const total = t2 - t0;
    if (total > 10) {
      console.warn(`[collision] ${total.toFixed(1)}ms | filter ${(t1-t0).toFixed(1)}ms | raycast ${(t2-t1).toFixed(1)}ms | ${candidates.length} tiles, ${meshCount} meshes, ${scene.children.length} scene children`);
    }

    corrected.y = PLAYER_HEIGHT;
    return corrected;
  }

  return { resolveCollision };
}
