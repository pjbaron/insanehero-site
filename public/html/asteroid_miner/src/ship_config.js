import { ShipGrid } from './ship_grid.js';

export function createStarterShip() {
  const grid = new ShipGrid(3, 3);
  grid.place('cockpit',       1, 1); // center
  grid.place('small_engine',  1, 2); // bottom center, exhaust fires off-grid
  grid.place('small_gun',     1, 0); // top center
  grid.place('micro_reactor', 0, 1); // left of cockpit
  grid.place('small_net',     2, 1); // right of cockpit
  return grid;
}

export function getStarterStats() {
  const grid = createStarterShip();
  let mass = 0, thrust = 0, powerGen = 0, powerDraw = 0, netCapacity = 0, gunDamage = 0;
  for (const m of grid.getAllModules()) {
    mass        += m.def.mass      || 0;
    thrust      += m.def.thrust    || 0;
    powerGen    += m.def.powerGen  || 0;
    powerDraw   += m.def.powerDraw || 0;
    netCapacity += m.def.capacity  || 0;
    gunDamage   += m.def.damage    || 0;
  }
  return { mass, thrust, powerGen, powerDraw, netCapacity, gunDamage };
}
