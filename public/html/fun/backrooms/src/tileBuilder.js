function isFloor(layout, cx, cy, size) {
  if (cx < 0 || cy < 0 || cx >= size || cy >= size) return false;
  return layout[cy][cx];
}

function isWall(layout, cx, cy, size) {
  if (cx < 0 || cy < 0 || cx >= size || cy >= size) return false;
  return !layout[cy][cx];
}

// Merge an array of {geo, matrix} pairs into one BufferGeometry.
// Applies each matrix to the vertex positions and normals before concatenating.
function mergeGeos(items) {
  if (!items.length) return null;

  let totalV = 0, totalI = 0;
  for (const { geo } of items) {
    totalV += geo.attributes.position.count;
    totalI += geo.index.count;
  }

  const pos = new Float32Array(totalV * 3);
  const nor = new Float32Array(totalV * 3);
  const uv  = new Float32Array(totalV * 2);
  const idx = new Uint32Array(totalI);

  const tv = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  let vOff = 0, iOff = 0;

  for (const { geo, matrix } of items) {
    const n = geo.attributes.position.count;
    nm.getNormalMatrix(matrix);

    const sp = geo.attributes.position.array;
    const sn = geo.attributes.normal.array;
    const su = geo.attributes.uv.array;

    for (let i = 0; i < n; i++) {
      tv.set(sp[i*3], sp[i*3+1], sp[i*3+2]).applyMatrix4(matrix);
      pos[(vOff+i)*3]   = tv.x;
      pos[(vOff+i)*3+1] = tv.y;
      pos[(vOff+i)*3+2] = tv.z;

      tv.set(sn[i*3], sn[i*3+1], sn[i*3+2]).applyMatrix3(nm).normalize();
      nor[(vOff+i)*3]   = tv.x;
      nor[(vOff+i)*3+1] = tv.y;
      nor[(vOff+i)*3+2] = tv.z;
    }

    uv.set(su, vOff * 2);

    const si = geo.index.array;
    for (let i = 0; i < si.length; i++) idx[iOff+i] = si[i] + vOff;
    iOff += si.length;
    vOff += n;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
  merged.setAttribute('uv',       new THREE.Float32BufferAttribute(uv,  2));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  return merged;
}

export function buildTileMesh(tx, ty, layout, materials, lightGeometry, config) {
  const {
    LAYOUT_SIZE, CELL_SIZE: CELL, TILE_WORLD_SIZE: TILE,
    ROOM_HEIGHT: H, FLOOR_Y, CEILING_Y,
  } = config;

  const MID  = Math.floor(LAYOUT_SIZE / 2);
  const sw   = 0.03;
  const shy  = FLOOR_Y + 0.062;

  const group = new THREE.Group();
  group.userData = { tx, ty };

  // Per-material geometry accumulators
  const gFloor  = [], gFloor2 = [];
  const gCeil   = [];
  const gWall   = [], gWall2  = [];
  const gSkirt  = [];

  // Shared source geometries (reused across all cells/tiles)
  const pFloor   = new THREE.PlaneGeometry(CELL, CELL);
  const pCeil    = new THREE.PlaneGeometry(CELL, CELL);
  const pWall    = new THREE.PlaneGeometry(CELL, H);
  const bSkirtNS = new THREE.BoxGeometry(CELL, 0.12, sw);
  const bSkirtEW = new THREE.BoxGeometry(sw,   0.12, CELL);
  const bSkirtC  = new THREE.BoxGeometry(sw,   0.12, sw);

  // Rotation matrices for each surface orientation
  const rFloor = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const rCeil  = new THREE.Matrix4().makeRotationX( Math.PI / 2);
  const rWallN = new THREE.Matrix4().makeRotationY( Math.PI);
  const rWallS = new THREE.Matrix4();           // identity — default +Z normal
  const rWallE = new THREE.Matrix4().makeRotationY( Math.PI / 2);
  const rWallW = new THREE.Matrix4().makeRotationY(-Math.PI / 2);

  const mat4 = new THREE.Matrix4();
  const trs  = new THREE.Matrix4();

  function push(arr, geo, rotM, tx_, ty_, tz_) {
    trs.makeTranslation(tx_, ty_, tz_);
    mat4.multiplyMatrices(trs, rotM);
    arr.push({ geo, matrix: mat4.clone() });
  }

  function pushBox(arr, geo, tx_, ty_, tz_) {
    arr.push({ geo, matrix: new THREE.Matrix4().makeTranslation(tx_, ty_, tz_) });
  }

  for (let cy = 0; cy < LAYOUT_SIZE; cy++) {
    for (let cx = 0; cx < LAYOUT_SIZE; cx++) {
      const wx = tx * TILE + cx * CELL;
      const wz = ty * TILE + cy * CELL;

      if (layout[cy][cx]) {
        // Floor
        const fArr = (cx + cy) % 2 === 0 ? gFloor : gFloor2;
        push(fArr, pFloor, rFloor, wx + CELL/2, FLOOR_Y,   wz + CELL/2);
        // Ceiling
        push(gCeil, pCeil, rCeil,  wx + CELL/2, CEILING_Y, wz + CELL/2);

        // Skirting — only against explicit in-bounds wall cells
        if (isWall(layout, cx, cy-1, LAYOUT_SIZE))
          pushBox(gSkirt, bSkirtNS, wx + CELL/2,      shy, wz + sw/2);
        if (isWall(layout, cx, cy+1, LAYOUT_SIZE))
          pushBox(gSkirt, bSkirtNS, wx + CELL/2,      shy, wz + CELL - sw/2);
        if (isWall(layout, cx+1, cy, LAYOUT_SIZE))
          pushBox(gSkirt, bSkirtEW, wx + CELL - sw/2, shy, wz + CELL/2);
        if (isWall(layout, cx-1, cy, LAYOUT_SIZE))
          pushBox(gSkirt, bSkirtEW, wx + sw/2,        shy, wz + CELL/2);

      } else {
        // Wall panels — one PlaneGeometry per exposed floor face
        const wArr = cy % 2 === 0 ? gWall : gWall2;

        if (isFloor(layout, cx, cy-1, LAYOUT_SIZE))
          push(wArr, pWall, rWallN, wx + CELL/2, H/2, wz);
        if (isFloor(layout, cx, cy+1, LAYOUT_SIZE))
          push(wArr, pWall, rWallS, wx + CELL/2, H/2, wz + CELL);
        if (isFloor(layout, cx+1, cy, LAYOUT_SIZE))
          push(wArr, pWall, rWallE, wx + CELL,   H/2, wz + CELL/2);
        if (isFloor(layout, cx-1, cy, LAYOUT_SIZE))
          push(wArr, pWall, rWallW, wx,           H/2, wz + CELL/2);

        // Convex corner skirting fill pieces
        const flN = isFloor(layout, cx,   cy-1, LAYOUT_SIZE);
        const flS = isFloor(layout, cx,   cy+1, LAYOUT_SIZE);
        const flE = isFloor(layout, cx+1, cy,   LAYOUT_SIZE);
        const flW = isFloor(layout, cx-1, cy,   LAYOUT_SIZE);
        const wN  = isWall(layout,  cx,   cy-1, LAYOUT_SIZE);
        const wS  = isWall(layout,  cx,   cy+1, LAYOUT_SIZE);
        const wE  = isWall(layout,  cx+1, cy,   LAYOUT_SIZE);
        const wW  = isWall(layout,  cx-1, cy,   LAYOUT_SIZE);

        if (flN && flE && !wN && !wE)
          pushBox(gSkirt, bSkirtC, wx + CELL + sw/2, shy, wz - sw/2);
        if (flN && flW && !wN && !wW)
          pushBox(gSkirt, bSkirtC, wx - sw/2,        shy, wz - sw/2);
        if (flS && flE && !wS && !wE)
          pushBox(gSkirt, bSkirtC, wx + CELL + sw/2, shy, wz + CELL + sw/2);
        if (flS && flW && !wS && !wW)
          pushBox(gSkirt, bSkirtC, wx - sw/2,        shy, wz + CELL + sw/2);
      }
    }
  }

  // Merge each material group into a single mesh
  const addMerged = (items, mat) => {
    const g = mergeGeos(items);
    if (g) group.add(new THREE.Mesh(g, mat));
  };

  addMerged(gFloor,  materials.floor);
  addMerged(gFloor2, materials.floor2);
  addMerged(gCeil,   materials.ceiling);
  addMerged(gWall,   materials.wall);
  addMerged(gWall2,  materials.wall2);
  addMerged(gSkirt,  materials.skirting);

  // Four ceiling light panels in a 2×2 grid, with strips of plain ceiling between them
  if (isFloor(layout, MID, MID, LAYOUT_SIZE)) {
    const panelW  = CELL * 0.5;   // 1 m wide  (short axis)
    const panelL  = CELL * 1.1;   // 2.2 m long (long axis)
    const panelGeo = new THREE.BoxGeometry(panelW, 0.04, panelL);
    const cx = tx * TILE + MID * CELL + CELL / 2;
    const cz = ty * TILE + MID * CELL + CELL / 2;
    const py = CEILING_Y - 0.06;
    const off = CELL;             // 2 m offset from tile centre → 4 m centre-to-centre

    const gLight = [];
    for (const [dx, dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
      gLight.push({
        geo: panelGeo,
        matrix: new THREE.Matrix4().makeTranslation(cx + dx * off, py, cz + dz * off),
      });
    }
    const lg = mergeGeos(gLight);
    if (lg) group.add(new THREE.Mesh(lg, materials.lightPanel));
  }

  return { group, lights: [] };
}
