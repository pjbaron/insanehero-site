import { CONFIG } from './config.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 120);
  camera.position.set(0, CONFIG.PLAYER_HEIGHT, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0906);
  scene.fog = new THREE.Fog(0x0a0906, CONFIG.FOG_NEAR, CONFIG.FOG_FAR);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  return { renderer, camera, scene, canvas };
}
