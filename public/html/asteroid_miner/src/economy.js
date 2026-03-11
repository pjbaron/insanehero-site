import { Crusher } from './crusher.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config.js';

export const economy = {
  gold: 0,
  totalEarned: 0,
  addGold(amount) {
    this.gold += amount;
    this.totalEarned += amount;
  },
  getGold() {
    return this.gold;
  },
  spendGold(amount) {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }
};

export const CRUSHER_POSITIONS = [
  // Starter near center
  { x: WORLD_WIDTH / 2 + 200, y: WORLD_HEIGHT / 2 + 200 },
  // Cardinal spread - not too close to edges
  { x: 800,                   y: 800 },
  { x: WORLD_WIDTH - 800,     y: 800 },
  { x: WORLD_WIDTH - 800,     y: WORLD_HEIGHT - 800 },
  { x: 800,                   y: WORLD_HEIGHT - 800 },
  // Mid-map outpost
  { x: WORLD_WIDTH / 2,       y: 600 },
];

export function spawnCrushers(entityManager) {
  for (const pos of CRUSHER_POSITIONS) {
    entityManager.add(new Crusher(pos.x, pos.y));
  }
}

export function processCrushers(entityManager, ship) {
  const crushers = entityManager.getByType('crusher');
  for (const crusher of crushers) {
    const { value, count } = crusher.checkCollection(ship);
    if (value > 0) {
      economy.addGold(value);
      if (ship.net && ship.net.tetheredDebris) {
        ship.net.tetheredDebris = ship.net.tetheredDebris.filter(d => d.alive);
      }
      return { type: 'crush', value, count, x: crusher.x, y: crusher.y };
    }
  }
  return null;
}
