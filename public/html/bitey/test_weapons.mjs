// Verification: piercing baseline damage, grenade collateral + knockback,
// charge depletion. Weapons now expose autoFire() + fireSpecial() and update()
// returns an events object.

import { WeaponSystem } from './src/weapons.js';
import { Zombie, Horde } from './src/zombie.js';
import { World } from './src/world.js';
import * as cfg from './src/config.js';

const dt = cfg.FIXED_DT;

// --- Baseline bullet damages a zombie ---
{
  const world = new World();
  const horde = new Horde();
  const z = new Zombie(500, world);
  z.x = 500; z.y = world.groundY - z.h;
  horde.zombies.push(z);
  const ws = new WeaponSystem();
  const startHp = z.hp;
  ws.autoFire(z.x - 30, z.centerY, z.centerX, z.centerY);
  for (let i = 0; i < 30; i++) ws.update(dt, horde, world);
  if (z.hp >= startHp) throw new Error('baseline bullet did not damage zombie');
}

// --- Piercing: one bullet damages multiple lined-up zombies ---
{
  const world = new World();
  const horde = new Horde();
  for (let i = 0; i < 3; i++) {
    const z = new Zombie(500 + i * 30, world);
    z.x = 500 + i * 30; z.y = world.groundY - z.h;
    horde.zombies.push(z);
  }
  const ws = new WeaponSystem();
  const t = horde.zombies[2];
  ws.autoFire(440, horde.zombies[0].centerY, t.centerX, t.centerY);
  for (let i = 0; i < 40; i++) ws.update(dt, horde, world);
  const damaged = horde.zombies.filter(z => z.hp < cfg.ZOMBIE_MAX_HP).length;
  if (damaged < 2) throw new Error('pierce did not hit multiple zombies: ' + damaged);
}

// --- Bullet hits apply leftward knockback ---
{
  const world = new World();
  const horde = new Horde();
  const z = new Zombie(500, world);
  z.x = 500; z.y = world.groundY - z.h;
  horde.zombies.push(z);
  const ws = new WeaponSystem();
  ws.autoFire(z.x + z.w + 30, z.centerY, z.centerX, z.centerY); // from the right, aimed left
  for (let i = 0; i < 30 && z.knockVx === 0; i++) ws.update(dt, horde, world);
  if (z.knockVx >= 0) throw new Error('bullet did not knock zombie left');
}

// --- Grenade collateral hits BOTH zombie and obstacle, and reports the kill ---
{
  const world = new World();
  const horde = new Horde();
  const wall = world.obstacles[0];
  const wallStartHp = wall.hp;
  const z = new Zombie(wall.x - 30, world);
  z.x = wall.x - 30;
  horde.zombies.push(z);
  const zStartHp = z.hp;

  const ws = new WeaponSystem();
  ws.giveGrenadeLauncher();
  ws.fireSpecial(wall.x - 20, world.groundY - 10, 1);
  let detonations = 0;
  for (let i = 0; i < 300 && ws.grenades.length > 0; i++) {
    const ev = ws.update(dt, horde, world);
    detonations += ev.detonations.length;
  }
  if (z.hp >= zStartHp) throw new Error('grenade did not damage zombie');
  if (wall.hp >= wallStartHp) throw new Error('grenade did not damage obstacle (no collateral)');
  if (detonations < 1) throw new Error('no detonation event reported');
}

// --- Charges decrement and fireSpecial refuses at 0 ---
{
  const world = new World();
  const horde = new Horde();
  const ws = new WeaponSystem();
  ws.giveGrenadeLauncher();
  if (ws.charges !== cfg.GRENADE_CHARGES) throw new Error('charges not full on pickup');

  let fired = 0;
  for (let i = 0; i < cfg.GRENADE_CHARGES + 3; i++) {
    if (ws.fireSpecial(100, 100, 1)) fired++;
  }
  if (fired !== cfg.GRENADE_CHARGES) {
    throw new Error('expected ' + cfg.GRENADE_CHARGES + ' grenades, fired ' + fired);
  }
  if (ws.charges !== 0) throw new Error('charges did not reach 0');
  if (ws.fireSpecial(100, 100, 1)) throw new Error('special fired with 0 charges');
}

console.log('weapons OK');
