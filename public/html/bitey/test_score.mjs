// Verification: combo scoring (score READS crowd density via the multiplier)
// and game-over on hp depletion.

import { Game } from './src/game.js';
import * as cfg from './src/config.js';

const dt = cfg.FIXED_DT;
const noInput = { has: () => false, consumePressed: () => false };

// --- Survival time accrues and score never decreases during a sim ---
{
  const game = new Game();
  game.started = true;
  let lastScore = 0;
  for (let i = 0; i < 300; i++) { // ~5s
    game.update(dt, noInput, null);
    if (game.score < lastScore) throw new Error('score decreased during sim');
    lastScore = game.score;
  }
  if (game.survivalSeconds <= 0) throw new Error('no survival time accrued');
}

// --- Multiplier climbs with combo and is bounded ---
{
  const game = new Game();
  game.combo = 0;
  if (game.multiplier !== 1) throw new Error('base multiplier should be 1');
  game.combo = cfg.COMBO_PER_TIER;
  if (game.multiplier !== 2) throw new Error('one tier of kills should give x2');
  game.combo = cfg.COMBO_PER_TIER * 100;
  if (game.multiplier !== cfg.COMBO_MAX_MULT) throw new Error('multiplier should cap at COMBO_MAX_MULT');
}

// --- A kill awards SCORE_PER_KILL x multiplier and advances the combo ---
{
  const game = new Game();
  const before = game.score;
  game._consumeEvents({ hits: [], deaths: [{ x: 100, y: 100, dir: -1 }], detonations: [] }, null);
  if (game.kills !== 1) throw new Error('kill not counted');
  if (game.combo !== 1) throw new Error('combo not advanced');
  if (game.score !== before + cfg.SCORE_PER_KILL * 1) throw new Error('kill score wrong: ' + game.score);
}

// --- A grenade multi-kill grants a bonus on top of per-kill score ---
{
  const game = new Game();
  const deaths = [];
  for (let i = 0; i < 5; i++) deaths.push({ x: 100 + i, y: 100, dir: -1 });
  game._consumeEvents({ hits: [], deaths, detonations: [{ x: 100, y: 100, killCount: 5 }] }, null);
  const perKill = cfg.SCORE_PER_KILL * 5; // all at x1 here (combo just started)
  const bonus = (5 - 1) * cfg.MULTIKILL_BONUS;
  if (game.score !== perKill + bonus) throw new Error('multi-kill bonus wrong: ' + game.score);
}

// --- Combo decays to zero after the window with no kills ---
{
  const game = new Game();
  game.started = true;
  // Silence the tide so no new kills refresh the combo.
  game.spawner.update = () => {};
  game.horde.zombies = [];
  game.combo = 10;
  game.comboTimer = cfg.COMBO_WINDOW;
  const steps = Math.ceil((cfg.COMBO_WINDOW + 0.1) / dt);
  for (let i = 0; i < steps; i++) game.update(dt, noInput, null);
  if (game.combo !== 0) throw new Error('combo did not decay to 0');
}

// --- hp reaching 0 sets gameOver ---
{
  const game = new Game();
  game.started = true;
  game.player.hp = 0;
  game.update(dt, noInput, null);
  if (!game.gameOver) throw new Error('gameOver not set when hp reached 0');
}

console.log('score OK');
