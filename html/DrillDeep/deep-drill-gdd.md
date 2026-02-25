# Game Design Document: Deep Drill (Working Title)

## Overview

An idle incremental game where the player operates a digging machine. Position a crane horizontally across the surface, drop the drill into a column, and watch it automatically dig downward through procedurally generated terrain. Collect valuables, avoid hazards, and spend earnings on upgrades to dig deeper.

**Platform**: Browser (HTML5 Canvas, ES6 modules)

**Core Fantasy**: The satisfying crunch of drilling through earth, the anticipation of what lies below, the incremental power growth of your machine.

---

## Core Loop

```
DROP → FALL → DIG (hands-free) → STOP → [teleport, hidden] → SHOP → EXIT SHOP → CRANE READY → repeat
```

### Player Agency Points

1. **Positioning** — Move crane horizontally, choose which column to drill
2. **Timing** — Decide when to drop
3. **Upgrading** — Spend earnings in the shop between runs

Everything else is spectacle. The dig phase is pure entertainment value—lean into making it visually rewarding since the player is just watching.

### Idle Philosophy

- No fail state; poor play only costs time
- Machine operation is automatic once dropped
- Player engagement comes from strategic decisions (where to dig, what to upgrade)
- Memorising valuable locations in adjacent columns rewards attention

---

## World Structure

### Grid-Based Columns

Each column is an independent vertical slice. Drops are tile-aligned.

```
[SHOP] [CRANE_____________________]
================================================ surface
[col0][col1][col2][col3]...[colN]
  |     |     |     |
  ▼     ▼     ▼     ▼
 soil  soil  soil  soil
 clay  RUBY  clay  clay
 rock  rock  rock  GAS
 ...   ...   ...   ...
```

### Terrain Layers (Top to Bottom)

| Terrain  | Hardness | Dig Time | Notes |
|----------|----------|----------|-------|
| Soil     | 1        | 0.1s     | Trivial |
| Clay     | 2        | 0.2s     | Easy |
| Rock     | 5        | 0.4s     | Medium |
| Granite  | 12       | 0.7s     | Hard |
| Obsidian | 25       | 1.0s     | Very hard |
| Bedrock  | 99       | N/A      | Impassable until endgame |

### Embedded Objects

**Valuables:**
| Type     | Min Depth | Max Depth | Value | Rarity |
|----------|-----------|-----------|-------|--------|
| Coal     | 5         | 100       | 10    | 0.50   |
| Copper   | 20        | 200       | 25    | 0.40   |
| Silver   | 50        | 300       | 75    | 0.25   |
| Gold     | 100       | 400       | 200   | 0.15   |
| Ruby     | 150       | 450       | 500   | 0.08   |
| Artifact | 200       | 500       | 1500  | 0.03   |

**Hazards:**
| Type     | Min Depth | Damage | Visual |
|----------|-----------|--------|--------|
| Gas Vent | 30        | 5      | Gas cloud |
| Lava Vein| 100       | 15     | Molten spray |
| Cave-in  | 50        | 10     | Rocks falling |
| Creature | 150       | 20     | Something moves |

---

## Procedural Generation

### Seed-Based Architecture

Worlds are generated from configuration presets. Each column uses `seededRandom(baseSeed + columnIndex)` for deterministic, reproducible generation.

```javascript
const worldPresets = {
  standard: {
    seed: 'default',
    columns: 100,
    maxDepth: 500,
    wealthDensity: 0.15,
    hazardDensity: 0.08,
    hardnessProgression: 1.0,
  },
  rich: {
    wealthDensity: 0.25,
    hazardDensity: 0.12,
  },
  hellscape: {
    hazardDensity: 0.20,
    hardnessProgression: 1.5,
  }
};
```

### Generation Benefits

- Columns generated on-demand (lazy loading)
- Players can share seeds for interesting worlds
- Changes are permanent (dug tiles stay dug)
- No regeneration; world is persistent

### Depth Curves

Terrain hardness, valuable rarity, and hazard frequency scale with depth using clamped exponential or sigmoid curves:

```
Value/Danger
    │          ╭────── late game plateau
    │        ╭─╯
    │      ╭─╯
    │    ╭─╯
    │___╯______________ depth
       early game ramp
```

---

## Machine Mechanics

### Movement Phase

- Horizontal movement along crane rail
- Left/right input, snap-to-column alignment
- Visual: machine dangling from cable with slight swing physics

### Drop Phase

- Player input triggers release
- Freefall through air and existing holes
- **Parachute deployment**: Triggers near bottom of existing hole to prevent visual "should have smashed" moment
- Satisfying landing effect

### Dig Phase

- Fully automatic once terrain contact occurs
- Camera follows smoothly with slight downward lookahead
- **Dig speed** determined by:
  - Terrain hardness
  - Drill power upgrade level
  - Fuel remaining (optional efficiency curves)
- Visual progress per tile (particle spray, progress indication)

### Stop Conditions

| Condition | What Happens | Player Consequence |
|-----------|--------------|-------------------|
| Fuel depleted | Machine stalls | Shallow run, less loot |
| Impassable terrain | Drill can't proceed | Must upgrade power |
| Hazard damage exceeds armour | Machine disabled | Run ends early |
| Reached map bottom | Victory state | Endgame |

All outcomes end the dig and transition to shop. No punishment beyond lost time.

---

## State Machine (Drill)

```
                    ┌──────────┐
         ┌─────────►│  READY   │◄────────────┐
         │          └────┬─────┘             │
         │               │ drop input        │
         │               ▼                   │
         │          ┌──────────┐             │
         │          │ FALLING  │             │
         │          └────┬─────┘             │
         │               │ contact terrain   │
         │               │ OR reach hole     │
         │               │ bottom            │
         │               ▼                   │
         │          ┌──────────┐             │
    exit shop       │ PARACHUTE│ (if needed) │
         │          └────┬─────┘             │
         │               │ landed            │
         │               ▼                   │
         │          ┌──────────┐             │
         │          │ DIGGING  │─────────────┤
         │          └────┬─────┘             │
         │               │ stop condition    │
         │               ▼                   │
         │          ┌──────────┐             │
         │          │ STOPPED  │             │
         │          └────┬─────┘             │
         │               │ auto-transition   │
         │               ▼                   │
         │          ┌──────────┐             │
         └──────────┤  SHOP    │             │
                    └──────────┘             │
                         │ exit              │
                         └───────────────────┘
```

---

## Upgrade System

### Categories

| Category | Examples | Effect |
|----------|----------|--------|
| **Power** | Drill bits, motors | Dig through harder materials |
| **Fuel** | Tank size, efficiency | Deeper runs |
| **Armour** | Plating, shields | Survive hazards |
| **Cargo** | Storage capacity | Carry more valuables per run |
| **Vision** | Scanners, sonar | Preview terrain in adjacent columns |
| **Utility** | Parachute quality | Quality of life |

### Progression Gates

Certain depths require minimum power levels, creating natural upgrade checkpoints. Players cannot brute-force depth without investment.

### Shop Interface

```
┌─────────────────────────────────────────┐
│  SHOP                        $ 1,247    │
├─────────────────────────────────────────┤
│                                         │
│  [DRILL POWER]  Lv.3  →  Lv.4   $200   │
│  [FUEL TANK]    Lv.2  →  Lv.3   $150   │
│  [ARMOUR]       Lv.1  →  Lv.2   $300   │
│  [SCANNER]      Lv.0  →  Lv.1   $500   │
│                                         │
│  ─────────────────────────────────────  │
│  Current Stats:                         │
│  Power: 8  │  Fuel: 45  │  Armour: 3   │
│  Max Depth: ~180 tiles                  │
│                                         │
│            [ READY TO DIG ]             │
└─────────────────────────────────────────┘
```

**Max Depth Estimate**: Quality-of-life indicator calculated from current fuel and average terrain hardness at depth.

---

## Visibility & Memory

Players can see adjacent columns while digging, allowing them to spot valuables for future runs.

### Options (Choose One)

1. **Ambient visibility** — Always see 1-2 columns either side
2. **Scanner upgrade** — Start blind, unlock peripheral vision
3. **Fog of war** — Only see tiles at or above current depth across all columns; previous digs reveal the map

Option 3 rewards exploration and gives purpose to shallow-but-wide early digging. Scanner upgrades could reveal deeper in adjacent columns.

---

## Juice & Feedback

Critical for "fast and satisfying" feel. The dig phase should feel relentless—think *Downwell* energy rather than *Motherload* pace.

### Visual Effects

- **Screen shake** on breaking through harder materials
- **Particle sprays** of debris flying upward (vary by material)
- **Speed lines** during freefall
- **Number popups** for value collected
- **Flash/pulse** when hitting valuables
- **Dramatic slowdown** momentarily when spotting rare items in adjacent columns

### Audio Hooks

- Crunchy dig sounds (layered, different per material)
- Satisfying collection chimes
- Warning sounds for hazard proximity
- Engine hum variations based on dig difficulty

### Feedback Systems

- Combo/streak bonuses for rapid collection
- Visual distinction for new depth records
- Celebration effects for rare finds

---

## Technical Architecture

### Directory Structure

```
/src
  main.js              # bootstrap, game loop
  /core
    Game.js            # state machine, loop coordination
    Input.js           # keyboard/mouse/touch abstraction
    Camera.js          # follow logic, shake, bounds
  /entities
    Machine.js         # player drill, state handling
    Terrain.js         # column data, dig progress, tile types
    Particle.js        # pooled particle system
  /systems
    Physics.js         # gravity, collision (simple AABB)
    Digging.js         # dig tick logic, terrain modification
    Economy.js         # currency, upgrade state, costs
  /rendering
    Renderer.js        # canvas context, draw orchestration
    TileAtlas.js       # sprite management
    UI.js              # HUD, shop overlay
  /data
    terrain.js         # tile definitions, hardness values
    upgrades.js        # upgrade tree, costs, effects
    worldConfig.js     # generation presets
```

### Core Loop

Single `requestAnimationFrame` loop with fixed timestep for logic, variable for rendering.

### Data Structures

**World**: Sparse map of columns, generated on-demand.

```javascript
class World {
  constructor(config) {
    this.config = config;
    this.columns = new Map();
  }
  
  getColumn(index) {
    if (!this.columns.has(index)) {
      this.columns.set(index, generateColumn(index, this.config));
    }
    return this.columns.get(index);
  }
  
  getTile(col, depth) {
    return this.getColumn(col)[depth] ?? null;
  }
  
  digTile(col, depth) {
    const tile = this.getTile(col, depth);
    if (tile && !tile.dugOut) {
      tile.dugOut = true;
      return tile.content;
    }
    return null;
  }
}
```

**Tile**:

```javascript
{
  terrain: 'rock',      // terrain type key
  content: null,        // valuable or hazard, if any
  dugOut: false         // has been excavated
}
```

---

## Implementation Priority

### Phase 1: Core Systems
1. World generation — seeded columns rendering with terrain types
2. Camera — vertical scrolling, follow logic, bounds
3. Drill entity — state machine, basic gravity physics
4. Dig mechanic — tile destruction, timing, loot collection

### Phase 2: Game Loop
5. Shop UI — upgrade state, cost calculation, purchase flow
6. Economy — currency tracking, upgrade effects on drill stats
7. Loop completion — full cycle from drop to shop to ready

### Phase 3: Polish
8. Juice pass — particles, screen shake, sound hooks
9. Visibility system — adjacent column viewing
10. Balance pass — upgrade costs, terrain distribution, pacing

### Phase 4: Extension
11. Additional content — more valuables, hazards, upgrade tiers
12. Endgame — what happens at max depth
13. Meta progression — prestige systems, unlockable presets

---

## Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Return mechanism | Teleport (unseen) | Keeps pace fast, no tedious ascent |
| World persistence | Permanent changes | Exploration matters, strategic digging |
| Fail state | None (time cost only) | Idle game philosophy, low stress |
| Idle scope | Dig phase only | Player agency in positioning and spending |
| Horizontal digging | Not supported | Keeps scope focused, columns independent |
