// Game.js - Main game controller with full integration

import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { World } from '../entities/World.js';
import { Machine, MachineState } from '../entities/Machine.js';
import { Economy } from '../systems/Economy.js';
import { Renderer } from '../rendering/Renderer.js';
import { UI } from '../rendering/UI.js';
import { TILE_SIZE } from '../data/terrain.js';
import { defaultPreset } from '../data/worldConfig.js';
import { ParticleSystem } from '../entities/Particle.js';
import { FloatingText } from '../rendering/FloatingText.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = 480;
    this.height = 640;

    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDelta = 1000 / 60;
    this.running = false;

    // Core systems
    this.input = null;
    this.camera = null;
    this.world = null;
    this.machine = null;
    this.economy = null;
    this.renderer = null;
    this.ui = null;

    // Crane state
    this.craneX = 0;
    this.maxCraneX = 0;

    // Summary state
    this.showingSummary = false;
    this.summaryNewRecord = false;

    // Depth record celebration
    this.depthRecordDepth = 0;
    this.showingRecordFlash = false;
    this.recordFlashTime = 0;

    this.setupCanvas();
  }

  setupCanvas() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
  }

  async init() {
    console.log('Deep Drill: Initializing...');

    // Initialize systems
    this.input = new Input(this.canvas);
    this.camera = new Camera(this.width, this.height);
    this.world = new World(defaultPreset);
    this.machine = new Machine();
    this.economy = new Economy();
    this.renderer = new Renderer(this.ctx, this.camera);
    this.ui = new UI(this.ctx, this.width, this.height);

    // Setup world bounds
    this.maxCraneX = (defaultPreset.columns - 1) * TILE_SIZE;
    this.craneX = Math.floor(defaultPreset.columns / 2) * TILE_SIZE;

    // Setup camera
    this.camera.setBounds(
      0,
      this.world.getWorldWidth(),
      -100,
      this.world.getWorldHeight()
    );

    // Initialize particle system
    this.particles = new ParticleSystem(200);

    // Initialize floating text
    this.floatingText = new FloatingText();

    // Apply initial stats to machine
    this.applyUpgradesToMachine();

    // Start at surface
    this.machine.reset(Math.floor(this.craneX / TILE_SIZE), 0);
    this.camera.follow(this.machine.x, 0, true);

    // Load saved state if exists
    this.loadGame();

    console.log('Deep Drill: Ready');
  }

  applyUpgradesToMachine() {
    const stats = this.economy.getMachineStats();
    this.machine.setStats(stats.power, stats.fuel, stats.armor, stats.cargo);
    // Reset record tracking for new run
    this.depthRecordDepth = this.economy.maxDepthEver;
  }

  start() {
    this.init().then(() => {
      this.running = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    });
  }

  stop() {
    this.running = false;
  }

  loop(currentTime) {
    if (!this.running) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.accumulator += deltaTime;
    while (this.accumulator >= this.fixedDelta) {
      this.update(this.fixedDelta);
      this.accumulator -= this.fixedDelta;
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const state = this.machine.state;

    switch (state) {
      case MachineState.READY:
        this.updateReady(dt);
        break;

      case MachineState.FALLING:
      case MachineState.PARACHUTE:
      case MachineState.DIGGING:
        this.machine.update(dt, this.world);
        this.handleMachineEvents();
        this.camera.follow(this.machine.x, this.machine.y);

        // Check for new depth record during digging
        if (this.machine.depth > this.economy.maxDepthEver && this.machine.depth > this.depthRecordDepth) {
          this.depthRecordDepth = this.machine.depth;
          this.showingRecordFlash = true;
          this.recordFlashTime = 60;  // frames
          this.particles.emit(this.machine.x, this.machine.y, 20, {
            speed: 8,
            spread: Math.PI * 2,
            life: 45,
            size: 6,
            color: '#FFD700',
            gravity: 0
          });
        }

        // Decay record flash
        if (this.recordFlashTime > 0) {
          this.recordFlashTime--;
          if (this.recordFlashTime <= 0) {
            this.showingRecordFlash = false;
          }
        }
        break;

      case MachineState.STOPPED:
        if (this.showingSummary) {
          if (this.input.isKeyJustPressed(' ')) {
            this.showingSummary = false;
            this.machine.state = MachineState.SHOP;
          }
        } else {
          this.endRun();
        }
        break;

      case MachineState.SHOP:
        this.updateShop(dt);
        break;
    }

    this.particles.update(dt);
    this.floatingText.update(dt);
    this.camera.update(dt);
    this.input.endFrame();
  }

  updateReady(dt) {
    // Crane movement
    const speed = 4;
    if (this.input.isLeft()) {
      this.craneX = Math.max(0, this.craneX - speed);
    }
    if (this.input.isRight()) {
      this.craneX = Math.min(this.maxCraneX, this.craneX + speed);
    }

    // Keep machine at crane position
    const column = Math.floor(this.craneX / TILE_SIZE);
    this.machine.column = column;
    this.machine.x = column * TILE_SIZE + TILE_SIZE / 2;

    // Drop (space or mouse only, not enter - enter is for shop exit)
    if (this.input.isKeyJustPressed(' ') || this.input.mouseJustPressed) {
      this.machine.drop();
    }

    // Camera at surface
    this.camera.follow(this.width / 2, 0);
  }

  endRun() {
    const earnings = this.machine.getCargoValue();
    this.economy.addMoney(earnings);
    this.summaryNewRecord = this.economy.updateMaxDepth(this.machine.maxDepthReached);

    console.log(`Run ended: $${earnings} earned, depth ${this.machine.maxDepthReached}m`);

    // Show summary instead of going directly to shop
    this.showingSummary = true;
    this.machine.state = MachineState.STOPPED;  // Keep in stopped state
    this.camera.follow(this.width / 2, 0, true);
    this.saveGame();
  }

  handleMachineEvents() {
    for (const event of this.machine.events) {
      switch (event.type) {
        case 'collect':
          this.camera.shake(3, 100);
          this.particles.collectSparkle(
            this.machine.x,
            this.machine.y,
            event.data.color || '#FFD700'
          );
          this.floatingText.addValue(this.machine.x, this.machine.y - 20, event.data.value);
          break;
        case 'hazard':
          this.camera.shake(8, 300);
          this.particles.hazardSparks(this.machine.x, this.machine.y);
          this.floatingText.addDamage(this.machine.x, this.machine.y - 20, event.data.damage);
          break;
        case 'hard_terrain':
          this.camera.shake(2, 80);
          break;
        case 'dig_progress':
          // Spawn debris while digging
          if (event.data.terrainColor) {
            this.particles.digDebris(
              this.machine.x,
              this.machine.y + 8,
              event.data.terrainColor
            );
          }
          break;
      }
    }
    this.machine.clearEvents();
  }

  updateShop(dt) {
    if (this.ui.handleShopInput(this.input, this.economy)) {
      // Exit shop, start new run
      this.applyUpgradesToMachine();
      this.machine.reset(Math.floor(this.craneX / TILE_SIZE), 0);
      this.saveGame();
      // Clear input to prevent immediate drop
      this.input.endFrame();
    }
  }

  render() {
    const ctx = this.ctx;

    // Clear
    this.renderer.clear(this.width, this.height);

    // Sky
    this.renderer.drawSky(this.width);

    // World
    const scannerLevel = this.economy.getUpgradeLevel('scanner');
    this.renderer.drawWorld(this.world, this.width, this.height, this.machine, scannerLevel);

    // Machine (if not in shop)
    if (this.machine.state !== MachineState.SHOP) {
      this.renderer.drawMachine(this.machine);
    }

    // Speed lines during freefall
    if (this.machine.state === MachineState.FALLING || this.machine.state === MachineState.PARACHUTE) {
      this.renderer.drawSpeedLines(this.machine, this.width, this.height);
    }

    // Particles (in world space)
    this.camera.applyTransform(this.ctx);
    this.particles.draw(this.ctx);
    this.floatingText.draw(this.ctx);
    this.camera.resetTransform(this.ctx);

    // Crane (always visible at top)
    this.renderer.drawCrane(this.craneX, this.maxCraneX, this.width);

    // UI
    if (this.showingSummary) {
      this.ui.drawRunSummary(this.machine, this.economy, this.summaryNewRecord);
    } else if (this.machine.state === MachineState.SHOP) {
      this.ui.drawShop(this.economy, this.input);
    } else {
      this.ui.drawHUD(this.machine, this.economy, this.showingRecordFlash);
    }
  }

  saveGame() {
    try {
      const data = this.economy.toJSON();
      localStorage.setItem('deepdrill_save', JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save game:', e);
    }
  }

  loadGame() {
    try {
      const saved = localStorage.getItem('deepdrill_save');
      if (saved) {
        this.economy.fromJSON(JSON.parse(saved));
        this.applyUpgradesToMachine();
        console.log('Game loaded');
      }
    } catch (e) {
      console.warn('Could not load game:', e);
    }
  }
}
