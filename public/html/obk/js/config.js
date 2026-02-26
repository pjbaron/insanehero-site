'use strict';

// All tunable constants for One Button Kingdom.
// Editing this ONE file tunes the entire game.

const CONFIG = Object.freeze({

    // --- Layout ---
    GROUND_RATIO: 0.50,
    ACTION_ZONE_WIDTH: 80,
    ENTITY_SCALE: 1.8,

    // --- Circular world ---
    WORLD_CIRCUMFERENCE: 4500,      // pixels per revolution (~75s at base speed)
    ARC_VISUAL_RADIUS: 625,         // visual curvature radius (smaller = more curved/larger planet)
    BASE_SHOP_PROXIMITY: 0.06,      // fraction of circumference where shop triggers
    ENEMY_WALK_SPEED: 45,           // pixels/sec hostiles walk toward castle on the planet surface
    CASTLE_DAMAGE_RANGE: 40,        // pixels on planet surface for enemy to deal castle damage

    // --- Scrolling ---
    BASE_SCROLL_SPEED: 60,
    SCROLL_ACCELERATION: 0.3,
    MAX_SCROLL_SPEED: 180,

    // --- Spawn timing ---
    SPAWN_INTERVAL_START: 2.0,
    SPAWN_INTERVAL_END: 0.7,
    SPAWN_RAMP_TIME: 180,       // seconds to reach min interval
    SPAWN_JITTER: 0.3,
    INITIAL_SPAWN_INTERVAL: 1.5,
    SPAWN_TOO_CLOSE: 15,
    SPAWN_TOO_CLOSE_OFFSET_MIN: 20,
    SPAWN_TOO_CLOSE_OFFSET_MAX: 30,
    OVERLAP_FORCE_INTERVAL: 15,  // force an overlap spawn every N seconds

    // --- Object types ---
    OBJECT_TYPES: Object.freeze({
        TREE:     { name: 'tree',    icon: 'axe',     resource: 'wood',  action: 'CHOP' },
        ROCK:     { name: 'rock',    icon: 'pickaxe', resource: 'stone', action: 'MINE' },
        BUSH:     { name: 'bush',    icon: 'sickle',  resource: 'food',  action: 'HARVEST' },
        VILLAGER: { name: 'villager',icon: 'coin',    resource: 'coins', action: 'TAX' },
        ENEMY:    { name: 'enemy',   icon: 'sword',   resource: 'coins', action: 'FIGHT' },
        REBEL:    { name: 'rebel',   icon: 'sword',   resource: 'coins', action: 'FIGHT' },
        BOSS:     { name: 'boss',    icon: 'sword',   resource: 'coins', action: 'FIGHT' },
        CATAPULT: { name: 'catapult',icon: 'shield',  resource: 'stone', action: 'DEFLECT' },
        MERCHANT: { name: 'merchant',icon: 'coin',    resource: 'coins', action: 'TAX' },
        DRAGON:   { name: 'dragon',  icon: 'shield',  resource: 'coins', action: 'DEFLECT' },
    }),

    // --- Entity dimensions ---
    TREE_W: 36, TREE_H: 56,
    ROCK_W: 34, ROCK_H: 28,
    BUSH_W: 30, BUSH_H: 22,
    VILLAGER_W: 20, VILLAGER_H: 36,
    ENEMY_W: 24, ENEMY_H: 38,
    REBEL_W: 22, REBEL_H: 38,
    BOSS_W: 36, BOSS_H: 52,
    CATAPULT_W: 40, CATAPULT_H: 34,
    MERCHANT_W: 22, MERCHANT_H: 38,

    // --- Boss ---
    BOSS_HP: 3,
    BOSS_WALL_DAMAGE: 3,
    BOSS_STAGGER_TIME: 0.3,
    BOSS_SCORE: 50,
    BOSS_COINS: 3,
    BOSS_SPAWN_START: 300,       // seconds before bosses appear
    BOSS_WEIGHT_BASE: 0.04,
    BOSS_WEIGHT_MAX: 0.06,
    BOSS_WEIGHT_RAMP: 600,

    // --- Catapult ---
    CATAPULT_SPAWN_START: 300,
    CATAPULT_WEIGHT_BASE: 0.03,
    CATAPULT_WEIGHT_MAX: 0.05,
    CATAPULT_WEIGHT_RAMP: 600,
    CATAPULT_FIRE_THRESHOLD: 0.7, // fraction of W
    BOULDER_DURATION: 1.5,
    CATAPULT_SCORE: 20,

    // --- Merchant ---
    MERCHANT_SPAWN_START: 180,
    MERCHANT_WEIGHT: 0.04,
    MERCHANT_TAX_COINS: 2,
    MERCHANT_TAX_LOYALTY_COST: 5,
    MERCHANT_GIFT_AMOUNT: 3,
    MERCHANT_GIFT_SCORE: 15,

    // --- Starting resources ---
    STARTING_WALL_HP: 10,
    STARTING_MAX_WALL_HP: 10,
    STARTING_LOYALTY: 60,

    // --- Loyalty ---
    LOYALTY_MAX: 100,
    LOYALTY_TAX_COST: 3,
    VILLAGER_MAX_COINS: 3,
    VILLAGER_TAX_LOYALTY: [1, 2, 4],    // loyalty cost per coin (escalating)
    VILLAGER_SHIRT_LOYALTY: 8,           // loyalty cost for taking shirt
    LOYALTY_PASS_BONUS: 2,
    LOYALTY_LOW_THRESHOLD: 40,
    LOYALTY_UNREST_THRESHOLD: 20,
    LOYALTY_REBELLION_THRESHOLD: 10,
    LOYALTY_HIGH_THRESHOLD: 70,
    GIFT_CHANCE: 0.25,
    MILITIA_CHANCE: 0.15,
    GIFT_AMOUNT: 2,
    MILITIA_CLOTH_COLOR: '#446688',

    // --- Food drain ---
    FOOD_DRAIN_INTERVAL: 30,
    FOOD_DRAIN_LOYALTY_COST: 5,
    FOOD_ABUNDANCE_THRESHOLD: 10,
    FOOD_ABUNDANCE_LOYALTY_BONUS: 1,

    // --- Farm ---
    FARM_INTERVAL: 20,

    // --- Bakery ---
    BAKERY_INTERVAL: 20,
    BAKERY_LOYALTY_BONUS: 3,

    // --- Horde ---
    HORDE_FIRST_INTERVAL: 100,
    HORDE_WARNING_DURATION: 3.0,
    HORDE_SPAWN_INTERVAL: 0.3,
    HORDE_BASE_COUNT: 10,
    HORDE_ESCALATION: 3,
    HORDE_MAX_COUNT: 25,
    HORDE_NEXT_INTERVAL_MIN: 90,
    HORDE_NEXT_INTERVAL_RANGE: 30,
    HORDE_CALM_DURATION: 5,

    // --- War Hammer ---
    HAMMER_HOLD_THRESHOLD: 0.4,
    HAMMER_ANIM_DURATION: 3.0,
    HAMMER_WINDUP_PHASE: 0.3,     // fraction of anim for screen darken + windup
    HAMMER_IMPACT_PHASE: 0.15,    // fraction for white flash + impact
    HAMMER_SHOCKWAVE_PHASE: 0.25, // fraction for shockwave expansion
    HAMMER_CRATER_DURATION: 2.0,  // seconds for crater to fade
    HAMMER_SHAKE_DURATION: 0.5,

    // --- Archer Tower ---
    ARCHER_FIRE_INTERVAL: 2,
    ARCHER_FIRE_INTERVAL_T2: 1,     // marksman tower: 2x fire rate
    ARCHER_ARROW_SPEED: 350,        // initial arrow speed (pixels/sec)
    ARCHER_ARROW_GRAVITY: 500,      // gravity acceleration (pixels/sec^2)
    ARCHER_ARROW_MAX_TIME: 2.0,     // max flight time before removing
    ARCHER_FIRE_ARROW_BONUS: 2,     // extra damage to bosses from fire arrows

    // --- Cleave ---
    CLEAVE_RANGE: 80,
    CLEAVE_ARC_DURATION: 0.4,

    // --- Castle ---
    CASTLE_SCREEN_FRACTION: 0.5,    // fraction of screen width (0.5 = top of arc)
    CASTLE_BASE_W: 70,              // width at tier 0
    CASTLE_BASE_H: 84,              // height at tier 0
    CASTLE_GROW_W: 17,              // extra width per tier
    CASTLE_GROW_H: 25,              // extra height per tier
    CASTLE_TOWER_W: 25,             // archer tower width
    CASTLE_TOWER_H: 49,             // archer tower extra height above wall

    // --- Moat ---
    MOAT_SLOW_FACTOR: 0.7,
    DEEP_MOAT_SLOW_FACTOR: 0.5,    // deep moat: 50% slow
    BURNING_MOAT_DAMAGE: 1,         // damage per tick while in moat
    MOAT_WIDTH: 30,
    MOAT_X_OFFSET: 50, // from left edge, in front of castle

    // --- Spike Pit ---
    SPIKE_PIT_DAMAGE: 1,
    SPIKE_PIT_RANGE: 150,           // pixel offset from castle
    SPIKE_PIT_TICK: 0.8,            // seconds between spike hits

    // --- Shield Bash ---
    SHIELD_BASH_STUN_DURATION: 1.5,
    SHIELD_BASH_RANGE: 60,          // pixels

    // --- Battle Cry ---
    BATTLE_CRY_KILL_THRESHOLD: 3,
    BATTLE_CRY_DURATION: 5.0,       // seconds of bonus damage
    BATTLE_CRY_DAMAGE_BONUS: 0.5,   // 50% more damage

    // --- Rain of Arrows ---
    RAIN_ARROWS_COUNT: 5,

    // --- Fortified Wall ---
    FORTIFIED_WALL_HP: 10,
    FORTIFIED_WALL_HEAL: 5,

    // --- Golden Crown ---
    GOLDEN_CROWN_BONUS: 1,          // +1 to all gathering

    // --- Shop ---
    SHOP_FIRST_INTERVAL: 50,
    SHOP_INTERVAL_MIN: 45,
    SHOP_INTERVAL_RANGE: 15,
    SHOP_DURATION: 8,
    SHOP_MAX_OPTIONS: 4,
    SHOP_MIN_OPTIONS: 3,
    SHOP_SLIDE_SPEED: 4,
    SHOP_BUY_FLASH_DURATION: 0.4,
    SHOP_ICON_POP_DURATION: 0.6,

    // --- Day/Night ---
    DAY_CYCLE_LENGTH: 180,

    // --- Seasons ---
    SEASON_LENGTH: 300,

    // --- Weather ---
    // (Currently only 'clear' and 'rain' types exist in monolith)

    // --- Upgrade definitions ---
    UPGRADES: Object.freeze({
        wooden_wall:   { name: 'Wooden Wall',    cat: 'wall',   cost: { stone: 3, wood: 5 },              desc: '+5 Max HP, +2 HP',   tier: 1 },
        stone_wall:    { name: 'Stone Wall',     cat: 'wall',   cost: { stone: 15, wood: 10 },            desc: '+5 Max HP, +2 HP',   tier: 2, requires: 'wooden_wall' },
        iron_wall:     { name: 'Iron Wall',      cat: 'wall',   cost: { stone: 25, wood: 15 },            desc: '+5 Max HP, +2 HP',   tier: 3, requires: 'stone_wall' },
        fortified_wall:{ name: 'Fortified Wall', cat: 'wall',   cost: { stone: 45, wood: 30, coins: 20 }, desc: '+10 HP, +5 heal',    tier: 4, requires: 'iron_wall' },
        archer_tower:  { name: 'Archer Tower',   cat: 'wall',   cost: { stone: 6, coins: 5 },             desc: 'Auto-shoot enemies' },
        archer_tower_2:{ name: 'Marksman Tower', cat: 'wall',   cost: { stone: 20, coins: 18 },           desc: '2x fire rate',          requires: 'archer_tower' },
        archer_tower_3:{ name: 'Sniper Tower',   cat: 'wall',   cost: { stone: 35, coins: 25, wood: 18 }, desc: 'Fire arrows! Boss dmg', requires: 'archer_tower_2' },
        moat:          { name: 'Moat',           cat: 'wall',   cost: { stone: 5, wood: 5 },              desc: 'Enemies 30% slower' },
        moat_upgrade:  { name: 'Deep Moat',      cat: 'wall',   cost: { stone: 18, wood: 15 },            desc: '50% slow (up from 30%)', requires: 'moat' },
        burning_moat:  { name: 'Burning Moat',   cat: 'wall',   cost: { stone: 25, wood: 18, coins: 14 }, desc: 'Moat burns enemies',    requires: 'moat_upgrade' },
        spike_pit:     { name: 'Spike Pit',      cat: 'wall',   cost: { wood: 8, stone: 6 },              desc: 'Passive dmg to enemies' },
        better_axe:    { name: 'Better Axe',     cat: 'weapon', cost: { wood: 4, coins: 3 },              desc: 'One-shot medium trees' },
        master_axe:    { name: 'Master Axe',     cat: 'weapon', cost: { wood: 20, stone: 12, coins: 15 }, desc: 'One-shot large trees',   requires: 'better_axe' },
        better_pick:   { name: 'Better Pickaxe', cat: 'weapon', cost: { wood: 4, coins: 3 },              desc: 'One-shot medium rocks' },
        master_pick:   { name: 'Master Pickaxe', cat: 'weapon', cost: { stone: 20, wood: 12, coins: 15 }, desc: 'One-shot large rocks',   requires: 'better_pick' },
        cleave:        { name: 'Cleave Sword',   cat: 'weapon', cost: { wood: 6, coins: 5 },              desc: 'Hit enemies behind' },
        forward_cleave:{ name: 'Sweeping Blow',  cat: 'weapon', cost: { wood: 18, coins: 14, stone: 10 }, desc: 'Cleave front + back',   requires: 'cleave' },
        war_hammer:    { name: 'War Hammer',     cat: 'weapon', cost: { wood: 25, stone: 22, coins: 18 }, desc: 'HOLD to smash all!' },
        rain_of_arrows:{ name: 'Rain of Arrows', cat: 'weapon', cost: { wood: 12, coins: 8 },             desc: 'Arrow rain on kill' },
        shield_bash:   { name: 'Shield Bash',    cat: 'weapon', cost: { wood: 8, stone: 8 },              desc: 'Stun nearby on kill' },
        battle_cry:    { name: 'Battle Cry',     cat: 'weapon', cost: { coins: 15, food: 10 },            desc: '3-kill streak = +50% dmg' },
        wider_beam:    { name: 'Wider Beam',     cat: 'head',   cost: { coins: 10, wood: 8 },             desc: 'Beam zone +40px' },
        massive_beam:  { name: 'Massive Beam',   cat: 'head',   cost: { coins: 35, stone: 25 },           desc: 'Beam zone +40px more',  requires: 'wider_beam' },
        golden_crown:  { name: 'Golden Crown',   cat: 'food',   cost: { coins: 30, wood: 15, stone: 15 }, desc: 'All gathering +1' },
        dragon_slayer: { name: 'Dragon Slayer',  cat: 'weapon', cost: { stone: 35, wood: 30, coins: 40 }, desc: 'Instant kill dragons' },
        farm:          { name: 'Farm',           cat: 'food',   cost: { food: 5, wood: 4 },               desc: '+1 food / 20s' },
        bakery:        { name: 'Bakery',         cat: 'food',   cost: { food: 5, stone: 4 },              desc: '+3 loyalty / 20s' },
        feast:         { name: 'Feast',          cat: 'food',   cost: { food: 12, coins: 3 },             desc: '+10 loyalty now!' },
    }),

    // --- Wall upgrade effects ---
    WALL_UPGRADE_HP: 5,
    WALL_UPGRADE_HEAL: 2,

    // --- Feast ---
    FEAST_LOYALTY: 10,

    // --- Resource gathering (multi-hit tiers: small/medium/large) ---
    RESOURCE_SIZE_PROBS: Object.freeze([0.5, 0.3, 0.2]),  // spawn weights
    RESOURCE_HITS:       Object.freeze([1, 3, 5]),         // hits to deplete per size
    RESOURCE_YIELDS:     Object.freeze([1, 2, 3]),         // resources yielded per size
    BASE_WOOD: 1,
    UPGRADED_WOOD: 3,
    BASE_STONE: 1,
    UPGRADED_STONE: 3,
    RESOURCE_SCORE: 5,
    ENEMY_SCORE: 10,
    TAX_SCORE: 3,

    // --- Button ---
    BUTTON_W: 120,
    BUTTON_H: 50,
    BUTTON_Y_OFFSET: 70,   // from bottom
    BUTTON_PRESS_DURATION: 0.15,

    // --- Villager cloth colors ---
    VILLAGER_CLOTH_COLORS: Object.freeze(['#4488cc', '#cc6644', '#44aa66', '#aa44aa', '#ccaa44']),

    // --- Color palette ---
    PAL: Object.freeze({
        sky1: '#5fcde4', sky2: '#3978a8',
        cloud: '#f0f0f0', cloudShadow: '#d4d4e0',
        hillFar: '#5b8c5a', hillMid: '#4a7c4a',
        grass1: '#6abe30', grass2: '#4a8c20', grassDark: '#3a6c18',
        dirt: '#8a6040',
        wood: '#8a5030', woodDark: '#6a3820',
        leaf: '#4caf30', leafDark: '#388820',
        stone: '#9ca0a4', stoneDark: '#6c7074', stoneLight: '#c0c4c8',
        berry: '#e03030',
        skin: '#ffc890', skinDark: '#d4a060',
        enemyBody: '#8c2020', enemyDark: '#601818',
        swordBlade: '#d8dce0', swordHilt: '#b08030',
        coinGold: '#ffd700', coinDark: '#c8a800',
        wallRed: '#d03030', wallBg: '#402020',
        uiText: '#ffffff', uiShadow: '#000000',
        highlight: 'rgba(255,255,100,0.25)',
        highlightPulse: 'rgba(255,50,50,0.35)',
        buttonFace: '#e8c840', buttonDim: '#605840', buttonGlow: '#ffe860',
        outline: '#282828',
        iron: '#8090a0', ironDark: '#506070',
        shopBg: '#1a1a2e', shopBorder: '#c8a830',
        rebelBody: '#cc4444', rebelDark: '#882222',
        bossArmor: '#606878', bossArmorLight: '#8890a0', bossArmorCrack: '#404040',
        dragonBody: '#408040', dragonWing: '#306030', dragonFire: '#ff6020',
        merchantRobe: '#d4a820', merchantRobeDark: '#a08018',
        nightSky1: '#0a0a2e', nightSky2: '#1a1040',
        autumnGrass: '#b08030', winterGrass: '#d0d8e0', springGrass: '#80d040',
    }),

    // --- Cloud generation ---
    CLOUD_SHAPE_COUNT: 4,   // number of distinct cloud shapes (0-3)
    CLOUD_COUNT: 6,
    CLOUD_Y_MIN: 20,
    CLOUD_Y_RANGE: 80,
    CLOUD_W_MIN: 60,
    CLOUD_W_RANGE: 100,
    CLOUD_H_MIN: 20,
    CLOUD_H_RANGE: 30,
    CLOUD_SPEED_MIN: 5,
    CLOUD_SPEED_RANGE: 10,

    // --- Hills ---
    HILLS_FAR_COUNT: 8,
    HILLS_FAR_MIN_H: 60,
    HILLS_FAR_MAX_H: 120,
    HILLS_MID_COUNT: 10,
    HILLS_MID_MIN_H: 40,
    HILLS_MID_MAX_H: 90,

    // --- Parallax ---
    HILLS_FAR_PARALLAX_TITLE: 0.1,
    HILLS_MID_PARALLAX_TITLE: 0.2,
    HILLS_FAR_PARALLAX_PLAY: 0.15,
    HILLS_MID_PARALLAX_PLAY: 0.3,
    CLOUD_SCROLL_FACTOR: 0.1,

    // --- Screen shake ---
    SHAKE_DECAY_RATE: 2,
    SHAKE_MAGNITUDE: 12,
    SHAKE_ENEMY_HIT: 0.15,
    SHAKE_BOSS_HIT: 0.2,
    SHAKE_CATAPULT: 0.2,
    SHAKE_BOSS_PASS: 0.3,
    SHAKE_HAMMER: 1.0,

    // --- Off-screen removal ---
    OFFSCREEN_MARGIN: 50,

    // --- Spawn weights (base values, ramp with time) ---
    SPAWN_WEIGHT_TREE_BASE: 0.30,
    SPAWN_WEIGHT_TREE_RAMP: -0.10,
    SPAWN_WEIGHT_ROCK_BASE: 0.25,
    SPAWN_WEIGHT_ROCK_RAMP: -0.05,
    SPAWN_WEIGHT_BUSH: 0.15,
    SPAWN_WEIGHT_VILLAGER_BASE: 0.15,
    SPAWN_WEIGHT_VILLAGER_RAMP: 0.05,
    SPAWN_WEIGHT_ENEMY_BASE: 0.15,
    SPAWN_WEIGHT_ENEMY_RAMP: 0.10,
    SPAWN_WEIGHT_LOW_LOYALTY_FACTOR: 0.5,

    // --- HUD juice ---
    HUD_PULSE_DURATION: 0.3,   // how long resource counter pulse lasts
    WALL_SHAKE_DURATION: 0.3,  // how long wall HP bar shakes on damage
    LOW_HP_THRESHOLD: 3,       // wall HP at or below this pulses red

    // --- Feast ---
    FEAST_CHEER_DURATION: 1.5,

    // --- Loyalty face ---
    LOYALTY_FACE_SIZE: 40,         // larger face for visibility
    LOYALTY_FACE_MARGIN: 14,

    // --- Dragon ---
    DRAGON_SPAWN_START: 400,       // seconds before dragons appear
    DRAGON_WEIGHT_BASE: 0.02,
    DRAGON_WEIGHT_MAX: 0.04,
    DRAGON_WEIGHT_RAMP: 600,
    DRAGON_W: 60, DRAGON_H: 40,
    DRAGON_FLY_Y_FRACTION: 0.25,  // fraction of H from top
    DRAGON_WALL_DAMAGE: 3,
    DRAGON_TREASURE_COINS: 5,
    DRAGON_TREASURE_SCORE: 40,
    DRAGON_FIRE_DURATION: 0.8,

    // --- Kill streak ---
    KILL_STREAK_TIMEOUT: 2.0,      // seconds before streak resets
    KILL_STREAK_DISPLAY_DURATION: 1.5,

    // --- Horde celebration ---
    HORDE_CELEBRATION_DURATION: 3.0,
    HORDE_CONFETTI_COUNT: 40,
    HORDE_RESOURCE_RAIN_COUNT: 6,

    // --- Game over ---
    GAMEOVER_WALL_CRUMBLE_DURATION: 2.0,
    GAMEOVER_STAT_REVEAL_INTERVAL: 0.4,

    // --- Shop head animation ---
    HEAD_DESCEND_DURATION: 0.6,  // seconds to descend behind king
    HEAD_ASCEND_DURATION:  0.8,  // seconds to ascend back to float position

    // --- DT cap ---
    MAX_DT: 0.05,

    // --- Dev flags ---
    DEV_DISABLE_LOAD: true,   // set false to re-enable localStorage load
});

export default CONFIG;

// Day timing curve (index = day number 1-24, value = target seconds per day)
// Day 0 is unused padding so index aligns with 1-based day number.
export const DAY_DURATIONS = [
  0,   // day 0 (unused)
  25, 25, 25, 25,         // days 1-4
  20, 20, 20, 20, 20,     // days 5-9
  14, 14, 14, 14, 14, 14, 14, // days 10-16
  10, 10, 10, 10, 10, 10, 10, // days 17-23
  60                      // day 24 (final battle)
];

export const WORLD_CIRCUMFERENCE_RADIANS = 2 * Math.PI;

// Stone head screen position (upper third, horizontally centred).
// These are set dynamically at canvas init; defaults here are for 800x600.
export let HEAD_X = 400;
export let HEAD_Y = 160;
export const HEAD_RADIUS = 80;

// Allow runtime update of HEAD_X/HEAD_Y when canvas is resized.
export function setHeadPosition(x, y) {
  HEAD_X = x;
  HEAD_Y = y;
}

// Stone head animation
export const BOB_FREQ = 1.2;        // radians per second
export const BOB_AMP = 6;           // pixels

// Vacuum animation
export const VACUUM_DURATION = 500; // ms for spiral travel

// Beam
export const BEAM_WIDTH = 60;       // pixels
export const BEAM_COLOR = 'rgba(255, 230, 120, 0.35)';
export const BEAM_EDGE_COLOR = 'rgba(255, 200, 60, 0.7)';

// Head expression states
export const HEAD_EXPR_IDLE       = 'IDLE';
export const HEAD_EXPR_READY      = 'READY';
export const HEAD_EXPR_WARN       = 'WARN';
export const HEAD_EXPR_GRIN       = 'GRIN';
export const HEAD_EXPR_DESPERATE  = 'DESPERATE';

// Story arc
export const STORY_CARD_DURATION = 2000;  // ms auto-dismiss

// Enemy hut
export const ENEMY_HUT_HP          = 5;
export const ENEMY_HUT_SPAWN_DAY   = 4;
export const ENEMY_HUT_SPAWN_THETA = Math.PI / 2;  // quarter-world from castle

// Rival castle
export const RIVAL_CASTLE_HP            = 20;
export const RIVAL_CASTLE_SPAWN_DAY     = 14;
export const RIVAL_CASTLE_ATTACK_DAY    = 18;  // day player can first target it
export const RIVAL_CASTLE_SPAWN_THETA   = Math.PI;  // opposite player castle

// Targeting and hold controls
export const CYCLE_HOLD_THRESHOLD  = 0.2;   // seconds before hold-to-cycle activates
export const MODE_TOGGLE_THRESHOLD = 0.5;   // seconds for combat/harvest mode toggle
export const BRAKE_MIN_SPEED       = 0.05;  // fraction of base scroll speed
export const BRAKE_DECEL_RATE      = 3.0;   // speed multiplier lost per second while braking

// Forehead rune display
export const RUNE_MAX_DISPLAY = 5;   // max runes on forehead

// World memory recovery timers (seconds)
export const STUMP_RECOVERY_S    = 30;
export const CRATER_RECOVERY_S   = 45;
export const TRAMPLED_RECOVERY_S = 20;
export const SAPLING_GROW_S      = 60;  // sapling -> full tree

// Shop / castle approach
export const HORN_THRESHOLD_RADIANS = 0.4;  // radians before castle reaches beam

// Shop tablet animation
export const TABLET_RISE_DURATION = 400;  // ms for tablet rise animation
export const TABLET_SINK_DURATION = 300;  // ms for tablet sink animation

// TODO Phase 5: add availableFromDay field to upgrade definitions in upgrades.js

// Desperation mode
export const DESPERATION_BONUS_PX  = 30;   // extra beam width when wall HP < 5
export const DESPERATION_CHARGE_S  = 4.0;  // seconds to fill shockwave charge
export const SHOCKWAVE_HOLD_S      = 1.0;  // hold duration to fire shockwave
export const SHOCKWAVE_RADIUS      = 200;  // pixels, affects all visible enemies

// Rival head
export const RIVAL_HEAD_X_FRACTION = 0.92; // fraction of canvas width
export const RIVAL_HEAD_Y_FRACTION = 0.25; // fraction of canvas height
