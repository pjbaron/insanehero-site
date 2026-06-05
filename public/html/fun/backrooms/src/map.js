export function createMap(worldGen, config) {
  const { LAYOUT_SIZE, TILE_WORLD_SIZE: TILE } = config;
  const CELL_PX = 7;
  const TILE_PX = CELL_PX * LAYOUT_SIZE;   // 63px per tile
  const RADIUS  = 3;                        // tiles in each direction
  const DIM     = (RADIUS * 2 + 1) * TILE_PX;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;z-index:50;pointer-events:none;background:rgba(0,0,0,0.55)';

  const title = document.createElement('div');
  title.style.cssText = 'color:rgba(200,180,100,0.75);font-family:monospace;font-size:11px;margin-bottom:6px;letter-spacing:0.18em';
  title.textContent = 'MAP  [M] CLOSE';

  const canvas = document.createElement('canvas');
  canvas.width  = DIM;
  canvas.height = DIM;
  canvas.style.cssText = 'image-rendering:pixelated;border:1px solid rgba(200,180,100,0.3)';

  wrap.appendChild(title);
  wrap.appendChild(canvas);
  document.body.appendChild(wrap);

  const ctx = canvas.getContext('2d');
  let visible = false;

  function toggle() {
    visible = !visible;
    wrap.style.display = visible ? 'flex' : 'none';
    return visible;
  }

  function isVisible() { return visible; }

  function render(worldX, worldZ, yaw) {
    const ptx = Math.floor(worldX / TILE);
    const pty = Math.floor(worldZ / TILE);

    ctx.fillStyle = '#0d0c09';
    ctx.fillRect(0, 0, DIM, DIM);

    for (let dty = -RADIUS; dty <= RADIUS; dty++) {
      for (let dtx = -RADIUS; dtx <= RADIUS; dtx++) {
        const layout = worldGen.getLayout(ptx + dtx, pty + dty);
        const sx = (dtx + RADIUS) * TILE_PX;
        const sy = (dty + RADIUS) * TILE_PX;

        for (let cy = 0; cy < LAYOUT_SIZE; cy++) {
          for (let cx = 0; cx < LAYOUT_SIZE; cx++) {
            ctx.fillStyle = layout[cy][cx]
              ? ((cx + cy) % 2 === 0 ? '#c8b87a' : '#b8a86a')
              : (cy % 2 === 0 ? '#1e1a10' : '#2a2318');
            ctx.fillRect(sx + cx * CELL_PX, sy + cy * CELL_PX, CELL_PX, CELL_PX);
          }
        }

        // Tile grid line
        ctx.strokeStyle = 'rgba(200,180,100,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_PX - 1, TILE_PX - 1);
      }
    }

    // Player marker: triangle pointing in yaw direction
    // yaw=0 faces -Z = "up" on map; ctx.rotate(-yaw) maps correctly
    const px = ((worldX / TILE) - (ptx - RADIUS)) * TILE_PX;
    const pz = ((worldZ / TILE) - (pty - RADIUS)) * TILE_PX;

    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-yaw);
    ctx.fillStyle = '#f5c842';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return { toggle, render, isVisible };
}
