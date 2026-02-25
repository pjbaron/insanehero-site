// Renderer.js - Canvas rendering for game elements

import { TILE_SIZE, TerrainTypes, Valuables, Hazards } from '../data/terrain.js';
import { MachineState } from '../entities/Machine.js';

export class Renderer {
  constructor(ctx, camera) {
    this.ctx = ctx;
    this.camera = camera;
  }

  clear(width, height) {
    this.ctx.fillStyle = '#0D0D15';
    this.ctx.fillRect(0, 0, width, height);
  }

  drawSky(width) {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, 120);
  }

  drawWorld(world, viewWidth, viewHeight, machine = null, scannerLevel = 0) {
    const camera = this.camera;
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    const endCol = Math.min(world.config.columns, Math.ceil((camera.x + viewWidth) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    const endRow = Math.min(world.config.maxDepth, Math.ceil((camera.y + viewHeight) / TILE_SIZE) + 1);

    camera.applyTransform(this.ctx);

    // Draw surface
    this.ctx.fillStyle = '#3d5c5c';
    this.ctx.fillRect(0, -TILE_SIZE, world.getWorldWidth(), TILE_SIZE);

    // Calculate visibility range based on scanner
    const currentCol = machine ? machine.column : -1;
    const visibleRange = 1 + scannerLevel;  // Base visibility + scanner bonus

    // Draw tiles
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const colDistance = currentCol >= 0 ? Math.abs(col - currentCol) : 0;
        const visibility = this.calculateVisibility(colDistance, visibleRange, machine, row);
        this.drawTile(world, col, row, visibility);
      }
    }

    camera.resetTransform(this.ctx);
  }

  calculateVisibility(colDistance, visibleRange, machine, row) {
    if (!machine || machine.state === 'ready' || machine.state === 'shop') {
      return 1.0;  // Full visibility when not digging
    }

    if (colDistance === 0) return 1.0;  // Current column always visible

    // Rows above machine's depth are visible (already explored)
    const machineDepth = Math.floor(machine.y / TILE_SIZE);
    if (row < machineDepth - 2) return 0.7;  // Explored area is dimmed

    // Adjacent columns visible based on scanner
    if (colDistance <= visibleRange) {
      // Fade with distance
      return Math.max(0.3, 1.0 - (colDistance * 0.25));
    }

    return 0.1;  // Barely visible fog
  }

  drawTile(world, col, row, visibility = 1.0) {
    const tile = world.getTile(col, row);
    if (!tile) return;

    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;

    if (tile.dugOut) {
      this.ctx.fillStyle = '#0D0D15';
      this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      return;
    }

    // Apply visibility darkening
    const terrainData = TerrainTypes[tile.terrain];
    let color = terrainData?.color || '#696969';

    if (visibility < 1.0) {
      color = this.darkenColor(color, visibility);
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, TILE_SIZE - 1, TILE_SIZE - 1);

    // Draw content indicator (only if visible enough)
    if (tile.content && visibility > 0.4) {
      const valuable = Valuables[tile.content];
      const hazard = Hazards[tile.content];

      if (valuable) {
        let contentColor = valuable.color;
        if (visibility < 1.0) contentColor = this.darkenColor(contentColor, visibility);
        this.ctx.fillStyle = contentColor;
        this.ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      } else if (hazard) {
        let contentColor = hazard.color;
        if (visibility < 1.0) contentColor = this.darkenColor(contentColor, visibility);
        this.ctx.fillStyle = contentColor;
        this.ctx.beginPath();
        this.ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  darkenColor(hexColor, factor) {
    // Convert hex to RGB, darken, convert back
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    const dr = Math.floor(r * factor);
    const dg = Math.floor(g * factor);
    const db = Math.floor(b * factor);

    return `rgb(${dr}, ${dg}, ${db})`;
  }

  drawMachine(machine) {
    const camera = this.camera;
    camera.applyTransform(this.ctx);

    const x = machine.x;
    const y = machine.y;

    // Draw based on state
    switch (machine.state) {
      case MachineState.PARACHUTE:
        this.drawParachute(x, y - 30);
        this.drawDrillBody(x, y);
        break;
      case MachineState.DIGGING:
        this.drawDrillBody(x, y);
        this.drawDigEffect(x, y, machine.digProgress);
        break;
      default:
        this.drawDrillBody(x, y);
    }

    camera.resetTransform(this.ctx);
  }

  drawDrillBody(x, y) {
    // Main body
    this.ctx.fillStyle = '#4169E1';
    this.ctx.fillRect(x - 12, y - 48, 24, 40);

    // Drill bit
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.moveTo(x - 8, y - 8);
    this.ctx.lineTo(x + 8, y - 8);
    this.ctx.lineTo(x, y + 8);
    this.ctx.closePath();
    this.ctx.fill();

    // Details
    this.ctx.fillStyle = '#1E3A8A';
    this.ctx.fillRect(x - 8, y - 42, 16, 4);
  }

  drawParachute(x, y) {
    this.ctx.fillStyle = '#FF6B6B';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 20, Math.PI, 0);
    this.ctx.fill();

    // Strings
    this.ctx.strokeStyle = '#A0A0A0';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 18, y);
    this.ctx.lineTo(x - 8, y + 30);
    this.ctx.moveTo(x + 18, y);
    this.ctx.lineTo(x + 8, y + 30);
    this.ctx.stroke();
  }

  drawDigEffect(x, y, progress) {
    // Simple progress indicator
    this.ctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
    const particleCount = 3;
    for (let i = 0; i < particleCount; i++) {
      const angle = (progress * 10 + i * 2) % (Math.PI * 2);
      const dist = 12 + Math.sin(progress * 20 + i) * 4;
      const px = x + Math.cos(angle) * dist;
      const py = y + 4 + Math.sin(angle) * 4;
      this.ctx.fillRect(px - 2, py - 2, 4, 4);
    }
  }

  drawCrane(craneX, maxCraneX, viewWidth) {
    // Rail
    this.ctx.fillStyle = '#808080';
    this.ctx.fillRect(0, 60, viewWidth, 8);

    // Trolley position (screen space)
    const screenX = (craneX / maxCraneX) * (viewWidth - 32) + 16;

    // Trolley
    this.ctx.fillStyle = '#A0A0A0';
    this.ctx.fillRect(screenX - 16, 52, 32, 16);

    // Wheels
    this.ctx.fillStyle = '#606060';
    this.ctx.fillRect(screenX - 14, 68, 8, 4);
    this.ctx.fillRect(screenX + 6, 68, 8, 4);
  }

  drawSpeedLines(machine, viewWidth, viewHeight) {
    if (machine.state !== 'falling' && machine.state !== 'parachute') return;
    if (machine.velocityY < 3) return;  // Only show at speed

    const ctx = this.ctx;

    // Calculate intensity based on velocity
    const intensity = Math.min(1, machine.velocityY / 15);
    const lineCount = Math.floor(5 + intensity * 10);

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.3})`;
    ctx.lineWidth = 2;

    // Draw lines in screen space
    for (let i = 0; i < lineCount; i++) {
      const x = Math.random() * viewWidth;
      const startY = Math.random() * viewHeight * 0.7;
      const length = 20 + intensity * 40;

      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x + (Math.random() - 0.5) * 10, startY + length);
      ctx.stroke();
    }

    ctx.restore();
  }
}
