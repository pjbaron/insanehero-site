// Central tunables for A Bit Bitey. No magic numbers should live outside this file.

// --- Canvas / world geometry ---
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const GROUND_Y = 620;            // y of the ground line (world space)
export const WORLD_WIDTH = 9000;        // finite playfield extent - long runway to retreat

// --- Player kinematics ---
export const GRAVITY = 2000;            // px/s^2 downward
export const PLAYER_SPEED = 280;        // px/s horizontal
export const PLAYER_JUMP_VELOCITY = 820; // px/s upward impulse on jump
export const JUMP_BUFFER = 0.12;        // s a jump press is held if pressed mid-air
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 52;
export const PLAYER_MAX_HP = 100;

// --- Camera ---
export const CAMERA_LERP = 8;           // follow stiffness per second

// --- Zombie tide ---
export const ZOMBIE_SPEED_FRAC = 0.8;   // BASE ground speed = PLAYER_SPEED * this
// Per-zombie speed variance. Each zombie rolls a multiplier in [MIN,MAX] on the
// base frac, hard-capped at MAX_FRAC of the player. The spread makes fast ones
// catch slower ones and CLIMB over them, churning the queue into a wave front.
export const ZOMBIE_SPEED_VAR_MIN = 0.6;
export const ZOMBIE_SPEED_VAR_MAX = 1.4;
export const ZOMBIE_SPEED_MAX_FRAC = 0.9; // runners stay scary but you can open a gap
export const ZOMBIE_CLIMB_SPEED = 150;  // px/s upward when mounting the zombie in front
export const ZOMBIE_CLIMB_DELAY = 0.06; // s blocked behind a stalled zombie before climbing
export const ZOMBIE_HAND_DPS = 4;       // small damage to a wall from clawing hands
export const ZOMBIE_WIDTH = 26;
export const ZOMBIE_HEIGHT = 50;
export const ZOMBIE_MAX_HP = 30;
export const ZOMBIE_CONTACT_DPS = 22;   // damage/sec to player on contact
export const ZOMBIE_SPAWN_X = 20;       // single LEFT origin

// --- Spawn curve ---
// A non-zero floor (SPAWN_BASE_FRAC of peak) means pressure starts arriving in
// the first few seconds instead of a dull empty warm-up.
export const SPAWN_PEAK_RATE = 7.0;     // zombies/sec the initial ramp approaches
export const SPAWN_BASE_FRAC = 0.22;    // fraction of peak present immediately
export const SPAWN_RAMP_SECONDS = 48;   // time to approach the ramp peak
// After the ramp the rate keeps creeping up forever (very slowly), so an
// equilibrium can't hold indefinitely - eventually the tide outpaces any defence
// and you are overrun. +0.01/s means ~+0.6/sec each minute (~14/s by ~12 min).
export const SPAWN_CREEP_PER_SEC = 0.01;
export const MAX_ZOMBIES = 260;         // hard cap = perf budget

// --- Obstacles / walls ---
export const WALL_HP = 120;

// Max height the player's feet rise on a jump: v^2 / (2*g). The first wall must
// stay below this so footwork alone can clear it.
export const PLAYER_JUMP_HEIGHT = (PLAYER_JUMP_VELOCITY * PLAYER_JUMP_VELOCITY) / (2 * GRAVITY);

// Seeded test walls. Wall 1 is short enough for the player to jump over; wall 2
// is tall, so the horde can only get over it by stacking on each other.
// Terrain (walls, support pillars and platforms) is laid out in world.js
// _seedWorld(). Walls are jumpable (height < PLAYER_JUMP_HEIGHT ~168) so the tide
// can never dead-end the player; pillars hold platforms the player can hop
// between, and a pillar clawed down drops its platform.
export const PLATFORM_FALL_DAMAGE = 999; // a dropped slab crushes whatever it lands on

// Max overlap tolerated between two zombie bodies before they are pushed apart.
export const ZOMBIE_OVERLAP_SKIN = 2;
// Positional relaxation passes per frame that separate overlapping zombies.
export const ZOMBIE_SOLVER_ITERATIONS = 6;

// --- Baseline weapon ---
export const BASELINE_FIRE_RATE = 7;    // shots/sec (humble baseline; buffs ramp it up)
export const BULLET_DAMAGE = 12;
export const BULLET_SPEED = 1100;       // px/s
export const BULLET_RANGE = 900;        // px before despawn

// --- Power weapon: grenade launcher ---
export const GRENADE_CHARGES = 8;
export const GRENADE_FIRE_RATE = 1.2;   // shots/sec
export const GRENADE_SPEED = 700;       // px/s initial horizontal
export const GRENADE_LOB_VELOCITY = 420; // px/s initial upward
export const GRENADE_RADIUS = 120;      // AoE radius
export const GRENADE_DAMAGE = 60;       // AoE damage to zombies and obstacles

// --- Power-up crates (timed, dropped near the player) ---
// Crates drop on a clock at offsets RELATIVE to the player, so they are always
// reachable and never buried deep in enemy-held ground. A new crate appears on
// schedule whether or not the previous was collected, and each self-despawns.
export const CACHE_WIDTH = 36;
export const CACHE_HEIGHT = 36;
export const POWERUP_FIRST_TIME = 9;    // s before the first crate drops
export const POWERUP_INTERVAL = 11;     // s between scheduled drops
export const POWERUP_LIFETIME = 60;     // s an uncollected crate persists
export const SCREEN_REF = CANVAS_WIDTH; // "one screen" of world for placement maths
// Drop offsets in screens relative to the player. Negative = upstream (into the
// horde, to the left); capped so a crate is never more than ~1.6 screens into
// enemy territory. Positive = ahead in the retreat direction (safe pull).
export const POWERUP_OFFSETS = [-1.6, 0.9, -1.0, 1.4, -1.3, 0.6];
// Hard floor near the LEFT edge of the map only: a crate may never appear within
// half a screen of x=0 (the zombie-entry zone), where it would be unobtainable.
export const POWERUP_LEFT_LIMIT = SCREEN_REF * 0.5;

// Temporary main-weapon buffs (seconds), granted by crates.
export const BUFF_TIME = 12;
export const RAPID_FIRE_MULT = 2.6;     // fire-rate multiplier while RAPID active
export const TRIPLE_SPREAD = 0.16;      // rad between the 3 barrels while TRIPLE active
export const HEAVY_DAMAGE_MULT = 2.4;   // bullet damage multiplier while HEAVY active
export const HEAVY_KNOCK_MULT = 2.6;    // bullet knockback multiplier while HEAVY active

// --- NAPALM buff: auto-fired small grenades (a rolling wall of flame) ---
export const NAPALM_TIME = 8;           // s the napalm strike lasts
export const NAPALM_FIRE_RATE = 8;      // small grenades/sec (a stream in the air)
export const NAPALM_RADIUS = 78;        // smaller blast than a manual grenade
export const NAPALM_DAMAGE = 34;        // still one-shots most zombies in radius
export const NAPALM_KNOCK = 220;
export const NAPALM_SPEED = 540;        // px/s base horizontal (varied per shot)
export const NAPALM_SPEED_VAR = 0.95;   // +/- spread so blasts land staggered (rolling wall)
export const NAPALM_LOB = 540;          // px/s initial upward (longer airtime = more aloft)

// --- Health parachute supply (descends slowly; catch it mid-air) ---
export const PARACHUTE_FIRST_TIME = 20; // s before the first supply
export const PARACHUTE_INTERVAL = 26;   // s between supplies
export const PARACHUTE_FALL_SPEED = 55; // px/s slow descent
export const PARACHUTE_HEAL = PLAYER_MAX_HP * 0.5; // restores 50% of full health
export const PARACHUTE_GROUND_TIME = 8; // s it stays grabbable after landing
export const PARACHUTE_W = 32;
export const PARACHUTE_H = 30;

// --- Simulation ---
export const FIXED_DT = 1 / 60;         // fixed timestep seconds
export const MAX_FRAME_DT = 0.1;        // delta clamp to avoid spiral of death

// ============================================================================
// FUN PASS (mobile / Poki): auto-fire, combo scoring, knockback, juice.
// ============================================================================

// --- Auto-fire ---
// The tide always comes from the left, so the player never needs to aim. The
// gun fires automatically at the nearest zombie. Positioning is the only skill.
export const AUTO_FIRE = true;

// --- Baseline gun feel ---
// Pierce: one bullet passes through this many bodies (losing some damage each),
// so a PACKED column dies in rows. This is how the gun "reads" crowd density.
export const BULLET_PIERCE = 1;           // front shields the rear -> a queue builds
export const BULLET_PIERCE_FALLOFF = 0.6; // damage retained per body pierced
export const BULLET_KNOCKBACK = 70;       // px/s leftward shove on hit
export const MUZZLE_FLASH_TIME = 0.05;

// --- Grenade feel ---
export const GRENADE_KNOCKBACK = 520;     // huge radial shove (sculpts the pile)
export const SHAKE_ON_GRENADE = 14;       // screen-shake magnitude (px)
export const SHAKE_ON_HURT = 7;

// --- Combo scoring (score READS crowd density) ---
// Kills score base x multiplier. Multiplier climbs while kills keep coming and
// decays if the killing stops - which only sustains against a packed crowd.
export const SCORE_PER_KILL = 10;
export const COMBO_WINDOW = 1.8;          // s since last kill before combo resets
export const COMBO_PER_TIER = 8;          // kills per +1 to the multiplier
export const COMBO_MAX_MULT = 12;         // headroom left high on purpose
export const MULTIKILL_BONUS = 25;        // per extra zombie in one grenade

// --- Player damage feedback ---
export const PLAYER_CONTACT_KNOCKBACK = 240; // shove player right when bitten
export const PLAYER_HURT_IFRAME = 0.0;       // (no i-frames; tide is relentless)
export const PLAYER_HIT_FLASH_TIME = 0.12;
export const PLAYER_HEAL_FLASH_TIME = 0.7; // HP bar pulses this long after a heal
export const ZOMBIE_HIT_FLASH_TIME = 0.08;

// --- Touch / on-screen controls ---
export const BTN_SIZE = 96;               // base button diameter (px, design space)
export const BTN_MARGIN = 28;
