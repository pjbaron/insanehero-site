import { MODULE_DEFS } from './modules.js';

const CELL_SIZE = 16;

// Inverse of Ship's gridVecToWorld (which uses the convention that grid -Y = ship forward):
//   wx = -gx*sin - gy*cos
//   wy =  gx*cos - gy*sin
// Solving: gx = wy*cos - wx*sin,  gy = -(wx*cos + wy*sin)
function worldVecToGrid(wx, wy, angle) {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return {
    x: wy * c - wx * s,
    y: -(wx * c + wy * s),
  };
}

// Returns whether any alive exhaust-capable module's zone covers (gridX, gridY).
// Checks all engines regardless of firing state (static placement check).
function isStaticExhaustZone(shipGrid, gridX, gridY) {
  for (const m of shipGrid.getAllModules()) {
    if (!m.isAlive() || !m.def.hasExhaust) continue;
    if (shipGrid.getExhaustZone(m).some(z => z.gridX === gridX && z.gridY === gridY)) return true;
  }
  return false;
}

export function calculateDockPreview(orbitingModule, shipGrid, shipX, shipY, shipAngle) {
  const def = MODULE_DEFS[orbitingModule.type];
  if (!def) return { gridX: 0, gridY: 0, valid: false, warning: null, cells: [] };

  const w = def.gridW || 1;
  const h = def.gridH || 1;

  // World offset from ship CoM to module (may be far outside grid bounds)
  const dx = orbitingModule.x - shipX;
  const dy = orbitingModule.y - shipY;

  // Convert to grid-space vector (relative to CoM)
  const local = worldVecToGrid(dx, dy, shipAngle);
  const com = shipGrid.calculateCoM();

  // Reference grid-pixel position: used only as a direction target for picking the nearest cell
  const refGpx = local.x + com.x;
  const refGpy = local.y + com.y;

  // Scan all valid placements and pick the one whose centre is closest to the reference direction.
  // This always finds a dockable cell even when the orbit is outside grid bounds.
  // Ties are broken by scan order (top-left first), giving a predictable result for diagonal angles.
  let bestGridX = null, bestGridY = null, bestDist = Infinity;
  for (let gy = 0; gy <= shipGrid.rows - h; gy++) {
    for (let gx = 0; gx <= shipGrid.cols - w; gx++) {
      if (!shipGrid.canPlace(orbitingModule.type, gx, gy)) continue;
      const cellCX = (gx + w / 2) * CELL_SIZE;
      const cellCY = (gy + h / 2) * CELL_SIZE;
      const dist = Math.hypot(cellCX - refGpx, cellCY - refGpy);
      if (dist < bestDist) {
        bestDist = dist;
        bestGridX = gx;
        bestGridY = gy;
      }
    }
  }

  if (bestGridX === null) {
    // Grid is full — show invalid indicator at projected position for feedback
    const gridX = Math.round(refGpx / CELL_SIZE - w / 2);
    const gridY = Math.round(refGpy / CELL_SIZE - h / 2);
    const cells = [];
    for (let r = gridY; r < gridY + h; r++) {
      for (let c = gridX; c < gridX + w; c++) cells.push({ gridX: c, gridY: r });
    }
    return { gridX, gridY, valid: false, warning: null, cells };
  }

  const gridX = bestGridX;
  const gridY = bestGridY;
  const cells = [];
  for (let r = gridY; r < gridY + h; r++) {
    for (let c = gridX; c < gridX + w; c++) cells.push({ gridX: c, gridY: r });
  }

  let warning = null;
  for (const cell of cells) {
    if (isStaticExhaustZone(shipGrid, cell.gridX, cell.gridY)) {
      warning = 'exhaust';
      break;
    }
  }

  return { gridX, gridY, valid: true, warning, cells };
}

export function getPreviewColor(preview) {
  if (!preview.valid) return 'red';
  if (preview.warning === 'exhaust') return 'yellow';
  return 'green';
}

// orbitManager is required to remove the module from orbit.
// Caller is responsible for calling ship.recalcStats() after this returns true.
export function commitDock(orbitingModule, preview, shipGrid, orbitManager) {
  if (!preview.valid) return false;
  const placed = shipGrid.place(orbitingModule.type, preview.gridX, preview.gridY);
  if (!placed) return false;
  if (orbitManager) orbitManager.removeModule(orbitingModule);
  return true;
}

// Caller is responsible for calling ship.recalcStats() after this returns true.
export function popModule(gridX, gridY, shipGrid, orbitManager) {
  const mod = shipGrid.getModuleAt(gridX, gridY);
  if (!mod) return false;
  if (mod.type === 'cockpit') return false;
  const type = shipGrid.remove(gridX, gridY);
  if (!type) return false;
  if (orbitManager) orbitManager.addModule(type, shipGrid);
  return true;
}
