import { Asteroid, MATERIAL_DATA } from './asteroid.js';
import { Debris } from './debris.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';

const MATERIAL_TYPES = Object.keys(MATERIAL_DATA);
const MATERIAL_WEIGHTS = MATERIAL_TYPES.map(k => MATERIAL_DATA[k].abundance);
const WEIGHT_TOTAL = MATERIAL_WEIGHTS.reduce((a, b) => a + b, 0);

function randomMaterial() {
  let r = Math.random() * WEIGHT_TOTAL;
  for (let i = 0; i < MATERIAL_TYPES.length; i++) {
    r -= MATERIAL_WEIGHTS[i];
    if (r <= 0) return MATERIAL_TYPES[i];
  }
  return MATERIAL_TYPES[MATERIAL_TYPES.length - 1];
}

function randomSize() {
  const r = Math.random();
  if (r < 0.4) return 'huge';
  if (r < 0.8) return 'large';
  return 'medium';
}

export function spawnInitialAsteroids(entityManager, count = 8) {
  const cx = WORLD_WIDTH / 2;
  const cy = WORLD_HEIGHT / 2;
  const MIN_DIST_PLAYER = 300;
  const MIN_DIST_CRUSHER = 200;

  const crushers = entityManager.getByType('crusher');

  for (let i = 0; i < count; i++) {
    let x, y, tooClose;
    do {
      x = Math.random() * WORLD_WIDTH;
      y = Math.random() * WORLD_HEIGHT;
      tooClose = Math.hypot(x - cx, y - cy) < MIN_DIST_PLAYER ||
        crushers.some(c => Math.hypot(x - c.x, y - c.y) < MIN_DIST_CRUSHER);
    } while (tooClose);

    entityManager.add(new Asteroid(x, y, randomSize(), randomMaterial()));
  }
}

export function checkBulletAsteroidCollisions(entityManager) {
  const bullets = entityManager.getByType('bullet');
  const asteroids = entityManager.getByType('asteroid');

  for (const bullet of bullets) {
    if (!bullet.alive) continue;
    for (const asteroid of asteroids) {
      if (!asteroid.alive) continue;
      if (bullet.overlaps(asteroid)) {
        const result = asteroid.hit(bullet.power);
        bullet.alive = false;
        if (Array.isArray(result)) {
          asteroid.alive = false;
          for (const child of result) {
            if (child._debrisSpec) {
              const d = new Debris(child.x, child.y, child.materialType);
              d.vx = child.vx;
              d.vy = child.vy;
              entityManager.add(d);
            } else {
              entityManager.add(child);
            }
          }
        }
        break;
      }
    }
  }
}

export function maintainAsteroidCount(entityManager, targetCount) {
  const alive = entityManager.getByType('asteroid').length;
  if (alive >= targetCount * 0.5) return;

  const needed = targetCount - alive;
  for (let i = 0; i < needed; i++) {
    const edge = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const inwardSpeed = 30 + Math.random() * 40;

    if (edge === 0) {
      x = Math.random() * WORLD_WIDTH; y = 0;
      vx = (Math.random() - 0.5) * 20; vy = inwardSpeed;
    } else if (edge === 1) {
      x = Math.random() * WORLD_WIDTH; y = WORLD_HEIGHT;
      vx = (Math.random() - 0.5) * 20; vy = -inwardSpeed;
    } else if (edge === 2) {
      x = 0; y = Math.random() * WORLD_HEIGHT;
      vx = inwardSpeed; vy = (Math.random() - 0.5) * 20;
    } else {
      x = WORLD_WIDTH; y = Math.random() * WORLD_HEIGHT;
      vx = -inwardSpeed; vy = (Math.random() - 0.5) * 20;
    }

    const a = new Asteroid(x, y, randomSize(), randomMaterial());
    a.vx = vx;
    a.vy = vy;
    entityManager.add(a);
  }
}
