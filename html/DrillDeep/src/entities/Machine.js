// Machine.js - Player drill with state machine

import { TILE_SIZE, TerrainTypes, Valuables, Hazards } from '../data/terrain.js';

export const MachineState = {
  READY: 'ready',
  FALLING: 'falling',
  PARACHUTE: 'parachute',
  DIGGING: 'digging',
  STOPPED: 'stopped',
  SHOP: 'shop'
};

export class Machine {
  constructor() {
    this.state = MachineState.READY;

    // Event queue for effects
    this.events = [];

    // Position (world coordinates)
    this.x = 0;  // center of machine
    this.y = 0;  // bottom of machine (drill tip)
    this.column = 0;  // current column index

    // Physics
    this.velocityY = 0;
    this.gravity = 0.5;
    this.terminalVelocity = 15;
    this.parachuteSpeed = 2;

    // Digging state
    this.digProgress = 0;
    this.currentTile = null;

    // Stats (from upgrades)
    this.power = 5;
    this.maxFuel = 30;
    this.fuel = 30;
    this.maxArmor = 10;
    this.armor = 10;
    this.cargoCapacity = 5;

    // Run state
    this.cargo = [];  // collected valuables this run
    this.depth = 0;   // current depth in tiles
    this.maxDepthReached = 0;
    this.stopReason = null;

    // Visual
    this.width = 24;
    this.height = 48;
  }

  reset(column, surfaceY = 0) {
    this.state = MachineState.READY;
    this.column = column;
    this.x = column * TILE_SIZE + TILE_SIZE / 2;
    this.y = surfaceY - this.height;
    this.velocityY = 0;
    this.digProgress = 0;
    this.currentTile = null;
    this.fuel = this.maxFuel;
    this.armor = this.maxArmor;
    this.cargo = [];
    this.depth = 0;
    this.stopReason = null;
  }

  setStats(power, fuel, armor, cargo) {
    this.power = power;
    this.maxFuel = fuel;
    this.fuel = fuel;
    this.maxArmor = armor;
    this.armor = armor;
    this.cargoCapacity = cargo;
  }

  drop() {
    if (this.state === MachineState.READY) {
      this.state = MachineState.FALLING;
      this.velocityY = 0;
      console.log(`Machine dropped at column ${this.column}`);
    }
  }

  update(dt, world) {
    switch (this.state) {
      case MachineState.FALLING:
        this.updateFalling(dt, world);
        break;
      case MachineState.PARACHUTE:
        this.updateParachute(dt, world);
        break;
      case MachineState.DIGGING:
        this.updateDigging(dt, world);
        break;
      case MachineState.STOPPED:
        // Auto-transition to shop after brief delay
        this.state = MachineState.SHOP;
        break;
    }

    // Update depth tracking
    this.depth = Math.floor(this.y / TILE_SIZE);
    this.maxDepthReached = Math.max(this.maxDepthReached, this.depth);
  }

  updateFalling(dt, world) {
    // Apply gravity
    this.velocityY = Math.min(this.velocityY + this.gravity, this.terminalVelocity);
    this.y += this.velocityY;

    // Check for terrain contact
    const tileDepth = Math.floor(this.y / TILE_SIZE);
    const tile = world.getTile(this.column, tileDepth);

    if (tile && !tile.dugOut) {
      // Hit solid ground - check if we need parachute
      const holeBottom = world.getFirstSolidDepth(this.column) * TILE_SIZE;

      if (this.y > holeBottom - TILE_SIZE * 3 && this.velocityY > 5) {
        // Deploy parachute near bottom of hole
        this.state = MachineState.PARACHUTE;
      } else {
        // Land and start digging
        this.y = tileDepth * TILE_SIZE;
        this.startDigging(tile);
      }
    }
  }

  updateParachute(dt, world) {
    // Slow descent
    this.velocityY = this.parachuteSpeed;
    this.y += this.velocityY;

    // Check for landing
    const tileDepth = Math.floor(this.y / TILE_SIZE);
    const tile = world.getTile(this.column, tileDepth);

    if (tile && !tile.dugOut) {
      this.y = tileDepth * TILE_SIZE;
      this.startDigging(tile);
    }
  }

  startDigging(tile) {
    this.state = MachineState.DIGGING;
    this.currentTile = tile;
    this.digProgress = 0;
    this.velocityY = 0;

    // Emit event for hard terrain
    const terrainData = tile.getTerrainData();
    if (terrainData.hardness >= 10) {
      this.emitEvent('hard_terrain', { terrain: tile.terrain, hardness: terrainData.hardness });
    }
  }

  updateDigging(dt, world) {
    if (!this.currentTile) {
      this.stop('no_tile');
      return;
    }

    const terrainData = this.currentTile.getTerrainData();

    // Check if we can dig this terrain
    if (terrainData.impassable || terrainData.hardness > this.power * 3) {
      this.stop('too_hard');
      return;
    }

    // Consume fuel
    const fuelCost = terrainData.hardness * 0.01;
    this.fuel -= fuelCost;

    if (this.fuel <= 0) {
      this.fuel = 0;
      this.stop('no_fuel');
      return;
    }

    // Calculate dig speed based on power vs hardness
    const digSpeed = this.power / terrainData.hardness;
    const progressPerTick = digSpeed * (dt / terrainData.digTime);
    this.digProgress += progressPerTick;

    // Emit dig debris particles periodically
    if (Math.random() < 0.15) {  // 15% chance per frame
      this.emitEvent('dig_progress', { terrainColor: terrainData.color });
    }

    // Check for tile completion
    if (this.digProgress >= 1) {
      this.completeTile(world);
    }
  }

  completeTile(world) {
    const tileDepth = Math.floor(this.y / TILE_SIZE);
    const content = world.digTile(this.column, tileDepth);

    // Handle content
    if (content) {
      if (Valuables[content]) {
        // Collected valuable
        if (this.cargo.length < this.cargoCapacity) {
          this.cargo.push(content);
          this.emitEvent('collect', { valuable: content, value: Valuables[content].value, color: Valuables[content].color });
          console.log(`Collected: ${Valuables[content].name}`);
        } else {
          console.log(`Cargo full, missed: ${Valuables[content].name}`);
        }
      } else if (Hazards[content]) {
        // Hit hazard
        const hazard = Hazards[content];
        this.armor -= hazard.damage;
        this.emitEvent('hazard', { hazard: content, damage: hazard.damage });
        console.log(`Hit ${hazard.name}! Armor: ${this.armor}/${this.maxArmor}`);

        if (this.armor <= 0) {
          this.armor = 0;
          this.stop('destroyed');
          return;
        }
      }
    }

    // Move to next tile
    this.y += TILE_SIZE;
    this.digProgress = 0;

    // Check for next tile
    const nextDepth = Math.floor(this.y / TILE_SIZE);
    const nextTile = world.getTile(this.column, nextDepth);

    if (!nextTile) {
      this.stop('bottom');
    } else if (nextTile.dugOut) {
      // Fall through already-dug tile
      this.state = MachineState.FALLING;
    } else {
      this.currentTile = nextTile;
    }
  }

  stop(reason) {
    this.state = MachineState.STOPPED;
    this.stopReason = reason;
    console.log(`Machine stopped: ${reason}`);
  }

  exitShop(column) {
    this.reset(column);
  }

  getCargoValue() {
    return this.cargo.reduce((sum, item) => {
      return sum + (Valuables[item]?.value || 0);
    }, 0);
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  emitEvent(type, data = {}) {
    this.events.push({ type, data, time: Date.now() });
  }

  clearEvents() {
    this.events = [];
  }
}
