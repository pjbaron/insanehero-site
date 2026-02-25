// World.js - Procedural terrain generation and state

import { SeededRandom } from '../core/Random.js';
import { TILE_SIZE, TerrainTypes, Valuables, Hazards, getTerrainForDepth } from '../data/terrain.js';

export class Tile {
  constructor(terrain, content = null) {
    this.terrain = terrain;  // terrain type key
    this.content = content;  // valuable/hazard key or null
    this.dugOut = false;
    this.digProgress = 0;    // 0-1 progress through this tile
  }

  getTerrainData() {
    return TerrainTypes[this.terrain];
  }

  getContentData() {
    if (!this.content) return null;
    return Valuables[this.content] || Hazards[this.content] || null;
  }
}

export class World {
  constructor(config) {
    this.config = config;
    this.columns = new Map();
    this.random = new SeededRandom(config.seed);
  }

  getColumn(index) {
    if (index < 0 || index >= this.config.columns) return null;

    if (!this.columns.has(index)) {
      this.columns.set(index, this.generateColumn(index));
    }
    return this.columns.get(index);
  }

  generateColumn(columnIndex) {
    const colRandom = this.random.derive(columnIndex);
    const column = [];

    for (let depth = 0; depth < this.config.maxDepth; depth++) {
      const tileRandom = colRandom.derive(depth);

      // Determine terrain type
      const terrain = getTerrainForDepth(depth, tileRandom.next());

      // Determine content (valuable or hazard)
      let content = null;

      // Check for valuables
      for (const [key, val] of Object.entries(Valuables)) {
        if (depth >= val.minDepth && depth <= val.maxDepth) {
          const adjustedRarity = val.rarity * this.config.wealthDensity / 0.15;
          if (tileRandom.chance(adjustedRarity * 0.1)) {
            content = key;
            break;
          }
        }
      }

      // Check for hazards (only if no valuable)
      if (!content) {
        for (const [key, haz] of Object.entries(Hazards)) {
          if (depth >= haz.minDepth && depth <= haz.maxDepth) {
            const adjustedRarity = haz.rarity * this.config.hazardDensity / 0.08;
            if (tileRandom.chance(adjustedRarity * 0.1)) {
              content = key;
              break;
            }
          }
        }
      }

      column.push(new Tile(terrain, content));
    }

    return column;
  }

  getTile(col, depth) {
    const column = this.getColumn(col);
    if (!column || depth < 0 || depth >= column.length) return null;
    return column[depth];
  }

  digTile(col, depth) {
    const tile = this.getTile(col, depth);
    if (tile && !tile.dugOut) {
      tile.dugOut = true;
      return tile.content;
    }
    return null;
  }

  // Get the first solid (not dug) tile in a column
  getFirstSolidDepth(col) {
    const column = this.getColumn(col);
    if (!column) return 0;

    for (let i = 0; i < column.length; i++) {
      if (!column[i].dugOut) return i;
    }
    return column.length;
  }

  // Check if a depth is passable (dug out or not yet solid)
  isPassable(col, depth) {
    const tile = this.getTile(col, depth);
    if (!tile) return false;
    return tile.dugOut;
  }

  getWorldWidth() {
    return this.config.columns * TILE_SIZE;
  }

  getWorldHeight() {
    return this.config.maxDepth * TILE_SIZE;
  }
}
