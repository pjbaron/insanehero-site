// annals.js -- Kingdom Annals: run history, feats, prestige, daily chronicle

import CONFIG from './config.js';

const STORAGE_KEY = 'obk_annals';

// 10 defined feats: id, label, description, bonus description
export const FEATS = [
  { id: 'hut_early',     label: 'Hut Slayer',        desc: 'Destroy enemy hut before Day 6',    bonus: '+10% hut spawn delay' },
  { id: 'dragon_days',   label: 'Dragon Survivor',   desc: 'Survived 3 dragon days',            bonus: 'Start with +3 wood' },
  { id: 'win_day24',     label: 'Final Hour',        desc: 'Won on Day 24',                     bonus: '+10% day 24 scroll speed' },
  { id: 'loyalty_high',  label: 'Beloved',           desc: 'Loyalty 80+ for 5 consecutive days',bonus: 'Start with loyalty 60' },
  { id: 'shockwave',     label: 'Shockwave',         desc: 'Used shockwave in desperation mode',bonus: 'Shockwave charges 10% faster' },
  { id: 'beam_maxed',    label: 'The Eye Widens',    desc: 'All beam upgrades owned',           bonus: 'Beam width +5px at start' },
  { id: 'day18_choice',  label: 'At The Crossroads', desc: 'Made a Day 18 branch choice',       bonus: 'Choice card shows 3 options' },
  { id: 'rival_slain',   label: 'Rival Felled',      desc: 'Destroyed the rival castle',        bonus: 'Rival castle has -2 HP' },
  { id: 'prestige1',     label: 'Once Is Not Enough',desc: 'Completed a prestige run',          bonus: 'Start prestige with +10 gold' },
  { id: 'no_war_hammer', label: 'The Gentle Head',   desc: 'Won without buying war hammer',     bonus: '+5% resource yield' },
];

// 14 Daily Chronicle modifiers (rotate by calendar day)
export const DAILY_MODIFIERS = [
  { name: 'The Fresh Start',    config_override: {} },
  { name: 'The Short Day',      config_override: { DAY_DURATIONS_MULT: 0.85 } },
  { name: 'The Generous Earth', config_override: { RESOURCE_YIELD_MULT: 1.15 } },
  { name: 'The Barren Soil',    config_override: { RESOURCE_YIELD_MULT: 0.8 } },
  { name: 'The Slow World',     config_override: { BRAKE_MIN_SPEED: 0.02 } },
  { name: 'The Fast World',     config_override: { BRAKE_MIN_SPEED: 0.15 } },
  { name: 'The Hungry Head',    config_override: { VACUUM_DURATION: 350 } },
  { name: 'The Patient Head',   config_override: { VACUUM_DURATION: 650 } },
  { name: 'The Fierce Enemy',   config_override: { ENEMY_HUT_HP: 7 } },
  { name: 'The Weakened Enemy', config_override: { ENEMY_HUT_HP: 3 } },
  { name: 'The Broad Beam',     config_override: { BEAM_WIDTH: 80 } },
  { name: 'The Narrow Beam',    config_override: { BEAM_WIDTH: 40 } },
  { name: 'The Warm Season',    config_override: { STUMP_RECOVERY_S: 20 } },
  { name: 'The Cold Season',    config_override: { STUMP_RECOVERY_S: 50 } },
];

export function loadAnnals() {
  if (CONFIG.DEV_DISABLE_LOAD) return { runs: [], lastPlayed: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { runs: [], lastPlayed: null };
  } catch {
    return { runs: [], lastPlayed: null };
  }
}

export function saveRun(runRecord) {
  // runRecord = { days, win, feats[], day, chronicle, prestige }
  const annals = loadAnnals();
  annals.runs.push({ ...runRecord, timestamp: Date.now() });
  annals.lastPlayed = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annals));
  } catch {
    // Storage full -- silently ignore
  }
}

export function getFeats() {
  const annals = loadAnnals();
  const earned = new Set();
  for (const run of annals.runs) {
    for (const f of (run.feats ?? [])) earned.add(f);
  }
  return FEATS.filter(f => earned.has(f.id));
}

export function getPrestigeTier() {
  const annals = loadAnnals();
  return annals.runs.filter(r => r.win).length > 0 ? 1 : 0;
}

export function getOvernightEntry() {
  // Returns a flavour summary for the overnight gap between runs
  const annals  = loadAnnals();
  const last    = annals.lastPlayed;
  if (!last) return null;
  const gapMs   = Date.now() - last;
  const gapDays = gapMs / 86400000;
  if (gapDays < 0.1) return 'The head barely slept.';
  if (gapDays < 1)   return 'The head rested briefly.';
  if (gapDays < 3)   return 'The head dreamed of distant kingdoms.';
  if (gapDays < 7)   return 'The head grew impatient.';
  return 'The head had nearly given up on you.';
}

export function getDailyModifier() {
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_MODIFIERS.length;
  return DAILY_MODIFIERS[dayIndex];
}

export function getTitleExpression(lastPlayed) {
  if (!lastPlayed) return { text: 'IT IS TIME TO RULE.', expr: 'IDLE' };
  const gapMs = Date.now() - lastPlayed;
  if (gapMs < 3600000)   return { text: 'BACK ALREADY.', expr: 'GRIN' };
  if (gapMs < 86400000)  return { text: 'THE HEAD IS THINKING.', expr: 'IDLE' };
  if (gapMs < 604800000) return { text: 'THE HEAD HAS BEEN THINKING.', expr: 'IDLE' };
  return { text: 'THE HEAD IS STARVING.', expr: 'WARN' };
}
