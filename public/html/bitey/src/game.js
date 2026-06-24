// Game: owns all subsystems and the playable loop.
//
// Scoring READS crowd density: each kill is worth SCORE_PER_KILL x a combo
// multiplier that only climbs while kills keep coming - which only happens
// against a packed crowd. Letting the tide pile up and then mowing/blasting it
// is both the optimal play and the most satisfying thing to watch.

import * as cfg from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Spawner } from './spawner.js';
import { Horde } from './zombie.js';
import { WeaponSystem } from './weapons.js';
import { PowerUpManager, PU_META } from './powerups.js';
import { aabbOverlap, segmentIntersectsAabb } from './world.js';
import { FX } from './fx.js';

export class Game {
  constructor() {
    this.fx = new FX();
    this.reset();
  }

  reset() {
    this.world = new World();
    this.player = new Player(cfg.CANVAS_WIDTH * 0.5);
    this.spawner = new Spawner();
    this.horde = new Horde();
    this.weapons = new WeaponSystem();
    this.powerups = new PowerUpManager(this.world);
    this.fx.particles.length = 0;
    this.fx.texts.length = 0;
    this.fx.rings.length = 0;
    this.fx.shake = 0;
    this.survivalSeconds = 0;
    this.kills = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.aimDir = -1;
    this.gameOver = false;
    this.started = false; // becomes true on first input (title screen gate)
  }

  get multiplier() {
    return 1 + Math.min(Math.floor(this.combo / cfg.COMBO_PER_TIER), cfg.COMBO_MAX_MULT - 1);
  }

  // Nearest zombie by true 2D distance (so the gun can target climbers up in the
  // wave, not just whatever is closest horizontally). If `requireLOS`, only
  // consider zombies with a clear line of sight from the muzzle - a wall or
  // platform in the way blocks the shot, so the gun holds fire behind cover.
  _nearestZombie(requireLOS) {
    const px = this.player.centerX, py = this.player.centerY;
    let best = null, bestD = Infinity;
    for (const z of this.horde.zombies) {
      if (z.dead) continue;
      const dx = z.centerX - px, dy = z.centerY - py;
      const d = dx * dx + dy * dy;
      if (d >= bestD) continue;
      if (requireLOS && this._blocked(px, py, z.centerX, z.centerY)) continue;
      bestD = d; best = z;
    }
    return best;
  }

  // True if any obstacle lies on the line from (x0,y0) to (x1,y1).
  _blocked(x0, y0, x1, y1) {
    for (const o of this.world.obstacles) {
      if (segmentIntersectsAabb(x0, y0, x1, y1, o)) return true;
    }
    return false;
  }

  _muzzle() {
    const p = this.player;
    return {
      x: p.facing > 0 ? p.x + p.w : p.x,
      y: p.centerY - 4,
      dir: p.facing,
    };
  }

  update(dt, input, audio) {
    if (this.gameOver) {
      if (input && input.consumePressed && input.consumePressed('restart')) this.reset();
      this.fx.update(dt);
      return;
    }

    this.survivalSeconds += dt;

    // Face the nearest zombie (even one behind cover) so the sprite tracks the threat.
    const aim = this._nearestZombie(false);
    this.aimDir = aim ? (aim.centerX >= this.player.centerX ? 1 : -1) : -1;
    this.player.facing = this.aimDir;

    // Scheduled power-up crates (near the player) + parachute health supplies.
    this.powerups.update(this.survivalSeconds, dt, this.player.centerX);
    const picked = this.powerups.tryPickup(this.player, this.weapons);
    if (picked) {
      const meta = PU_META[picked.type];
      this.fx.text(this.player.centerX, this.player.y - 10, meta.label, meta.color, 26);
      if (audio) audio.pickup();
    }
    const supply = this.powerups.tryPickupSupply(this.player);
    if (supply) {
      this.player.hp = Math.min(cfg.PLAYER_MAX_HP, this.player.hp + cfg.PARACHUTE_HEAL);
      this.player.healFlash = cfg.PLAYER_HEAL_FLASH_TIME;
      this.fx.text(this.player.centerX, this.player.y - 10, '+' + Math.round(cfg.PARACHUTE_HEAL) + ' HP', '#5fd06a', 28);
      this.fx.ring(this.player.centerX, this.player.centerY, 60, '#5fd06a');
      if (audio) audio.pickup();
    }

    // Falling-platform physics (advance before actors so they ride it).
    this.world.update(dt);

    // Actors.
    this.player.update(dt, input, this.world);
    this.spawner.update(dt, this.horde.zombies, this.world);
    this.horde.update(dt, this.player, this.world);

    // Crush zombies caught under a falling/just-landed slab - drop the floor.
    this._crushPlatforms(audio);

    if (this.horde.contactThisFrame) {
      this.fx.addShake(cfg.SHAKE_ON_HURT);
      if (audio && Math.random() < 0.3) audio.hurt();
    }

    // Only fire at a zombie with a clear line of sight; behind a wall the gun
    // holds fire (and so never plinks the wall down). The barrel still tracks the
    // nearest threat even when there is no shot.
    const px = this.player.centerX, py = this.player.centerY;
    const visible = this._nearestZombie(true);
    const barrelTarget = visible || aim;
    if (barrelTarget && !barrelTarget.dead) {
      this.player.aimAngle = Math.atan2(barrelTarget.centerY - py, barrelTarget.centerX - px);
    } else {
      this.player.aimAngle = this.aimDir > 0 ? 0 : Math.PI;
    }

    // --- Weapons ---
    // Auto-fire baseline gun along the aim vector at the nearest VISIBLE zombie.
    if (cfg.AUTO_FIRE && visible) {
      const m = this._muzzle();
      if (this.weapons.autoFire(m.x, m.y, visible.centerX, visible.centerY)) {
        this.fx.particles.push({
          x: m.x + m.dir * 6, y: m.y, vx: m.dir * 200, vy: -20,
          life: cfg.MUZZLE_FLASH_TIME, maxLife: cfg.MUZZLE_FLASH_TIME,
          size: 6, color: '#fff2a0', gravity: 0,
        });
        if (audio) audio.shoot();
      }
    }
    // NAPALM buff: auto-lob a rolling barrage of small grenades toward the tide
    // (arcs over walls - no line-of-sight needed).
    if (this.weapons.buffs.napalm > 0) {
      const m = this._muzzle();
      this.weapons.autoNapalm(m.x, m.y, this.aimDir);
    }
    // Special (grenade) on demand.
    if (input && input.consumePressed && input.consumePressed('special')) {
      const m = this._muzzle();
      if (this.weapons.fireSpecial(m.x, m.y, m.dir)) {
        this.fx.addShake(4);
      }
    }

    const events = this.weapons.update(dt, this.horde, this.world);
    this._consumeEvents(events, audio);

    // Combo decay.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // (Wall/platform hit-flashes are decayed in world.update.)
    this.fx.update(dt);

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver = true;
      this.fx.addShake(cfg.SHAKE_ON_GRENADE);
      this.fx.sparks(this.player.centerX, this.player.centerY, 30);
      if (audio) audio.explosion();
    }
  }

  // Zombies overlapped by a falling slab are crushed. Mid-fall contact is a light
  // pulp; the LANDING is the big juicy squelch (goo spray, shake, gut-thud).
  _crushPlatforms(audio) {
    let total = 0;
    const tally = (n) => {
      for (let i = 0; i < n; i++) {
        this.kills += 1; this.combo += 1; this.comboTimer = cfg.COMBO_WINDOW;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        this.score += cfg.SCORE_PER_KILL * this.multiplier;
      }
      total += n;
    };

    // Light pulp while a slab is still mid-air.
    for (const o of this.world.obstacles) {
      if (!o.falling) continue;
      let n = 0, cx = 0, cy = 0;
      for (const z of this.horde.zombies) {
        if (z.dead) continue;
        if (aabbOverlap(o, z)) { z.dead = true; n++; cx = z.centerX; cy = z.centerY; this.fx.blood(z.centerX, z.centerY, 0, 5); }
      }
      if (n > 0) { tally(n); if (audio) audio.zombieDie(); }
    }

    // The landing: count the kill, then unleash the squelch.
    for (const plat of this.world.fallenThisStep) {
      let n = 0;
      for (const z of this.horde.zombies) {
        if (z.dead) continue;
        if (aabbOverlap(plat, z)) { z.dead = true; n++; }
      }
      const lx = plat.x + plat.w / 2, ly = this.world.groundY - 6;
      tally(n);
      if (n > 0) {
        this.fx.squelch(lx, ly, n);
        this.fx.addShake(Math.min(10 + n * 1.3, 28));
        const big = n >= 4;
        this.fx.text(lx, ly - 64, (big ? 'SQUELCH! x' : 'CRUSH x') + n, '#b5e06a', big ? 42 : 30);
        if (audio) audio.squelch(n);
      } else {
        this.fx.addShake(8); // empty slam still thuds
      }
    }
    return total;
  }

  _consumeEvents(events, audio) {
    // Per-hit blood (light - deaths get the chunky gibs).
    for (const h of events.hits) this.fx.blood(h.x, h.y, h.dir, 3);

    // Per-death: kill, combo, gibs, score.
    if (events.deaths.length > 0) {
      let frameScore = 0, cx = 0, cy = 0;
      for (const d of events.deaths) {
        this.kills += 1;
        this.combo += 1;
        this.comboTimer = cfg.COMBO_WINDOW;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        const pts = cfg.SCORE_PER_KILL * this.multiplier;
        this.score += pts;
        frameScore += pts;
        cx += d.x; cy += d.y;
        this.fx.gibs(d.x, d.y, d.dir);
      }
      cx /= events.deaths.length; cy /= events.deaths.length;
      const mult = this.multiplier;
      const color = mult >= 6 ? '#ff5050' : mult >= 3 ? '#ffd24a' : '#ffffff';
      this.fx.text(cx, cy - 8, '+' + frameScore, color, 18 + Math.min(mult, 8) * 2);
      if (audio) audio.zombieDie();
    }

    // Grenade detonations. Small (napalm) blasts are many per second, so they
    // get light fire-ball FX and throttled audio; manual grenades get the works.
    for (const det of events.detonations) {
      if (det.small) {
        this.fx.addShake(2);
        this.fx.ring(det.x, det.y, cfg.NAPALM_RADIUS, '#ff7a2a');
        this.fx.sparks(det.x, det.y, 8);
        if (audio && Math.random() < 0.22) audio.explosion();
      } else {
        this.fx.addShake(cfg.SHAKE_ON_GRENADE);
        this.fx.ring(det.x, det.y, cfg.GRENADE_RADIUS, '#ffae40');
        this.fx.sparks(det.x, det.y, 28);
        if (audio) audio.explosion();
      }
      if (det.killCount >= 3) {
        const bonus = (det.killCount - 1) * cfg.MULTIKILL_BONUS;
        this.score += bonus;
        this.fx.text(det.x, det.y - 50, det.killCount + ' KILL! +' + bonus, '#ff8030', det.small ? 26 : 34);
        if (audio) audio.combo(Math.min(det.killCount, 8));
      }
    }
  }
}
