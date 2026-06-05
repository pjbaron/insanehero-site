import { CONFIG } from './config.js';

let useRectArea = false;

if (typeof THREE !== 'undefined' && THREE.RectAreaLightUniformsLib) {
  THREE.RectAreaLightUniformsLib.init();
  useRectArea = true;
  console.log('Lighting: RectAreaLight mode');
} else {
  console.log('Lighting: PointLight fallback mode');
}

export function createLighting(scene) {
  const ambient = new THREE.AmbientLight(0xfff0d0, 0.30);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xfff8e0, 0x3a3020, 0.80);
  scene.add(hemi);
}

export function updateLightsForTiles(scene, activeTilePositions, config) {
  // Implemented in Phase 3
}

export function createCeilingLightGeometry() {
  return new THREE.BoxGeometry(
    CONFIG.TILE_WORLD_SIZE * 0.35,
    0.04,
    CONFIG.TILE_WORLD_SIZE * 0.35
  );
}

// Per-tile lights removed — too expensive with PBR forward rendering at 81+ tiles.
// Lighting is handled by ambient + hemisphere + a single player-following point light (main.js).
export function createRoomLight()   { return null; }
export function removeRoomLight()   {}
