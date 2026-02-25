Now I have a thorough understanding of the template. Let me write the implementation plan.

---

# STACK THIEF -- Implementation Plan

## 1. GAME OBJECTS

### 1.1 Block
The fundamental building unit for all towers.
- `x, y` -- world position (center of block)
- `width` -- 40-100px, varies per block (randomized on generation)
- `height` -- fixed 30px
- `color` -- HSL fill color (hue varies per tower, saturation 60-80%, lightness 50-65%)
- `outlineColor` -- darker shade of `color` for border
- `vx, vy` -- velocity (used during flying animation and collapse)
- `angle` -- current rotation in radians (inherited from tower sway)
- `angularVel` -- spin rate (used during collapse/flying)
- `state` -- `stacked` | `flying` | `falling` | `landed`
- `opacity` -- 1.0 normally, fades during collapse debris
- `flashTimer` -- countdown for white highlight flash on steal (0.15s)
- `theme` -- `default` | `gold` | `jelly` | `ice` | `lava` (future unlock, affects rendering only in v1)

### 1.2 Tower
A stack of Block objects with physics-based swaying.
- `x` -- base X position (center, fixed on ground)
- `baseY` -- ground level Y coordinate
- `blocks[]` -- array of Block objects, index 0 = bottom
- `angle` -- current lean angle in radians (positive = lean right)
- `angularVelocity` -- rate of angle change
- `isPlayer` -- boolean, true for the player's tower
- `isCollapsed` -- boolean, set when tower falls
- `collapseTimer` -- countdown for collapse animation (1.5s)
- `highlightTimer` -- countdown for glow when a block is stolen from this tower (0.3s)
- `maxAngle` -- the topple threshold: 0.35 radians (~20 degrees) for player, 0.5 for rivals

### 1.3 Particle
Visual effect element.
- `x, y` -- position
- `vx, vy` -- velocity
- `life` -- remaining lifetime (seconds), starts at 0.3-0.8
- `maxLife` -- initial lifetime (for alpha calculation)
- `size` -- radius 2-6px
- `color` -- string, matches source block color
- `type` -- `dust` | `spark` | `star` | `rubble`

### 1.4 FlyingBlock (transient state of Block)
When a block is stolen, it becomes a flying projectile. This is handled by setting block.state = `flying` and tracking:
- `targetX, targetY` -- destination on top of player tower
- `flyProgress` -- 0 to 1, eased with `easeOutBack`
- `startX, startY` -- origin position at steal time

### 1.5 GhostLine
High score marker.
- `y` -- screen Y position corresponding to best tower height
- `height` -- the record height in blocks
- `pulseTimer` -- oscillates 0-1 for gentle alpha pulse

### 1.6 EarthquakeShaker
Global screen effect intensifying over time.
- `intensity` -- 0.0 to 1.0, increases linearly over the round
- `offsetX, offsetY` -- current shake displacement (randomized per frame)
- `rumbleTimer` -- drives sinusoidal low-frequency camera sway


## 2. GAME STATE

```
roundTimer          -- countdown in seconds (starts at 45s)
roundDuration       -- total round time (45s, fixed for v1)
score               -- current round score (points)
highScore           -- best score ever (persisted to localStorage)
bestHeight          -- tallest player tower ever in blocks (persisted)
round               -- current round number (1, 2, 3...)
comboCount          -- consecutive steals without exceeding danger angle
comboBest           -- best combo this session
dangerAngle         -- threshold at which "danger" UI activates: 0.22 rad
braceActive         -- boolean, player tower brace is active
braceCooldown       -- seconds remaining on brace cooldown (3s total)
braceDuration       -- how long brace lasts: 1.5s
earthquakeIntensity -- 0.0 to 1.0, ramps up as roundTimer decreases
playerTower         -- Tower object (the player's)
rivalTowers[]       -- array of 2-4 Tower objects
particles[]         -- array of active Particle objects
flyingBlocks[]      -- flying blocks in transit (subset of blocks with state=flying)
screenShake         -- { x, y, timer } current shake offset and decay timer
state               -- inherited from Game: loading/menu/playing/gameover
lastStealTime       -- timestamp of last steal (to prevent spam-clicking)
stealCooldown       -- minimum 0.25s between steals
ghostLineY          -- Y position for the high score ghost line
roundOverReason     -- 'toppled' | 'timeup' (for game over display)
```

## 3. CORE MECHANICS

### 3.1 Tower Physics (every frame)

Each tower sways like an inverted pendulum. Simplified model (no full rigid-body sim needed):

1. **Restoring torque**: `angularAccel = -GRAVITY_FACTOR * sin(angle)` where `GRAVITY_FACTOR = 3.0`. This pulls the tower back to vertical.
2. **Damping**: `angularAccel -= angularVelocity * DAMPING` where `DAMPING = 1.8`. Prevents infinite oscillation.
3. **Height penalty**: Taller towers sway more. Multiply effective gravity factor by `1.0 + blocks.length * 0.04`. A 10-block tower sways ~1.4x faster than a 1-block tower.
4. **Width mismatch penalty**: When a newly added block is significantly wider or narrower than the one below it, add a one-time angular impulse: `impulse = (widthDiff / 100) * 0.08` in a random direction.
5. **Earthquake**: Add per-frame random angular impulse `random(-1,1) * earthquakeIntensity * 0.015`.
6. **Integration**: `angularVelocity += angularAccel * dt; angle += angularVelocity * dt`.
7. **Topple check**: If `|angle| > tower.maxAngle`, tower collapses.

### 3.2 Block Positioning Within Tower

Blocks are rendered stacked bottom-up. Each block's world position:
- `blockY = tower.baseY - (stackIndex * BLOCK_HEIGHT)` where `BLOCK_HEIGHT = 30`
- Apply tower lean: rotate all block positions around the tower base point by `tower.angle`
- Each block's visual position = base position rotated by angle, drawn at that rotation

### 3.3 Stealing a Block (on tap/click)

1. Player taps on a rival tower's block.
2. Hit-test: Check if tap position overlaps any block in any rival tower (test from top block down for each tower).
3. If hit and `stealCooldown <= 0`:
   - Remove the block from the rival tower's `blocks[]` array.
   - If the removed block was NOT the top block, all blocks above it drop down (fill the gap). Add angular impulse to the rival tower: `0.05 * (blocksAbove / totalBlocks)`. If `blocksAbove >= 3`, the rival tower collapses immediately (load-bearing pull).
   - Create a flying block: set `state = flying`, record start position, target = top of player tower.
   - Set `stealCooldown = 0.25`.
   - Spawn 8-12 `dust` particles at the extraction point.
   - Play `steal` SFX.
   - Increment `comboCount` if player tower angle < `dangerAngle`.
   - Award points: `10 + (comboCount * 5)`. If rival tower collapses from this steal, bonus `+50`.

4. Flying block travels along an arced path (quadratic bezier: start -> control point above midpoint -> target) over 0.4s with `easeOutBack`.
5. On arrival: push block onto player tower's `blocks[]`. Apply width-mismatch impulse. Spawn 6 `dust` particles. Play `land` SFX. Flash the block white for 0.15s.

### 3.4 Bracing (tap own tower)

1. Player taps on their own tower.
2. If `braceCooldown <= 0`:
   - Set `braceActive = true`, start `braceDuration = 1.5s` countdown.
   - While active: multiply tower damping by 5.0 and clamp angular velocity towards 0 faster.
   - Play `brace` SFX (a low stabilizing thud).
   - Visual: player tower flashes with a blue tint / shield outline for the duration.
   - When brace ends: `braceCooldown = 3.0s`.

### 3.5 Round Flow

1. **Round start**: Generate 3 rival towers (2 on mobile if screen narrow) with 5-10 random blocks each. Player tower starts with 2 blocks. Reset `roundTimer = 45`. `earthquakeIntensity = 0`.
2. **During round**: `roundTimer -= dt`. `earthquakeIntensity = 1.0 - (roundTimer / roundDuration)` (linear ramp). Player steals blocks.
3. **Round end conditions**:
   - Player tower topples -> `roundOverReason = 'toppled'`, game over.
   - Timer reaches 0 -> `roundOverReason = 'timeup'`, score round. If player tower is tallest standing, bonus points.
4. **Between rounds**: Show score tally. `commercialBreak` ad. Then start next round with +1 rival tower block count (cap at 15), slightly faster earthquake ramp.

### 3.6 Scoring

- Per block stolen: `10 + comboCount * 5`
- Rival tower collapse bonus: `+50`
- End of round (time up, still standing): `playerTower.blocks.length * 20`
- Combo streak >= 3: visual fanfare, `+15` per block in the streak

### 3.7 Rival Tower AI / Behavior

Rival towers are passive -- they just sway. No AI steals from the player. The challenge is purely physics: pulling blocks destabilizes rivals (good) but growing your tower makes it wobble (bad). Rivals may topple on their own from earthquake in late rounds, awarding the player `+25` per collapse.


## 4. RENDERING PLAN

### 4.1 Draw Order (back to front)

1. **Background**: Gradient sky. Top: `#1a1a2e`, bottom: `#16213e`. Subtle parallax stars (20-30 tiny dots, drift slowly).
2. **Ground**: Solid dark rectangle at bottom 15% of screen. Color `#2d2d2d` with a 2px highlight line at top `#444`.
3. **Ghost line**: Dashed horizontal line at high-score height. Color `rgba(255, 215, 0, 0.3)`, pulsing alpha. Small label "BEST" on the right.
4. **Rival towers**: Rendered left to right. Each block is a rounded rectangle (corner radius 4px) with 2px darker outline. Tower base has a small triangular footing (visual anchor).
5. **Player tower**: Same rendering but with a distinct accent -- thin golden border on each block, base footing has a small crown/flag icon.
6. **Flying blocks**: Blocks in transit, drawn above towers with a motion trail (3 semi-transparent copies trailing behind at previous positions).
7. **Particles**: All particle effects.
8. **UI overlay** (drawn last, unaffected by screen shake):
   - Score: top-left, `bold 28px`, white, with subtle text shadow
   - Round timer: top-center, large `bold 36px`. Turns red and pulses when < 10s
   - Combo counter: appears mid-screen when combo >= 2, e.g. "x3 COMBO!" in yellow, scales up then fades over 1s
   - Brace cooldown: small circular indicator near player tower base, fills clockwise as cooldown recharges. Blue when ready, gray when cooling.
   - Danger indicator: when player tower angle > `dangerAngle`, screen edges flash red, "DANGER" text blinks near tower
   - Earthquake rumble: as intensity rises, subtle screen-edge vignette darkens

### 4.2 Visual Style

- Blocks: Flat colors with slight gradient (lighter at top edge). Rounded corners. 2px border.
- Color palette per tower: Player = blues/teals (hue 180-220). Rivals cycle through: reds (0-20), greens (90-140), purples (270-310), oranges (25-45).
- No textures or images -- pure canvas drawing. Keeps load instant.
- All text: `sans-serif` font family.

### 4.3 Screen Shake

When applied (on steal, collapse, earthquake), translate the canvas context by `(shakeX, shakeY)` before drawing game objects. UI draws after restoring the context. Shake decays exponentially: `shakeX *= 0.85` per frame.

### 4.4 Responsive Scaling

- Define a virtual game width of 400px. Compute `scale = canvas.width / 400`.
- All game coordinates are in virtual units; multiply by scale when drawing.
- On wide screens (landscape desktop), cap the playable area to an aspect ratio of 9:16 centered, with dark bars on sides. This keeps tower spacing consistent.
- On narrow screens (portrait mobile), use full width. Reduce rival count to 2 if `canvas.width / scale < 350`.


## 5. INPUT HANDLING

### 5.1 Modifications to InputManager

The existing `input.js` only tracks generic tap/click. We need **tap position** for block targeting. Modify input handling in game.js (not input.js itself) by adding direct event listeners:

- `pointerdown` on canvas: record `tapX, tapY` in canvas coordinates (adjusted for any CSS scaling via `getBoundingClientRect`).
- `mousedown` fallback for desktop.
- Store `pendingTap = { x, y }` which is consumed once per frame in `updatePlaying`.

### 5.2 Input -> Action Mapping

Each frame during `updatePlaying`:
1. If `pendingTap` exists:
   - Convert tap coords to virtual game coords (divide by scale, account for game area offset).
   - Hit-test against player tower blocks -> if hit, trigger brace.
   - Hit-test against each rival tower's blocks (top to bottom) -> if hit, trigger steal on that block.
   - Clear `pendingTap`.
2. Keyboard (desktop accessibility): not required by spec but nice-to-have. Skip for v1.

### 5.3 Hit Testing

For each tower, compute each block's screen-space bounding box (accounting for tower lean angle). Use a simple rotated-rectangle point-in-rect test. Because blocks are small and lean angles are mild, an axis-aligned bounding box expanded by a few pixels is sufficient and much simpler. Use AABB with +8px padding on each side for finger-friendliness on mobile.


## 6. PROGRESSION

### 6.1 Round-over-Round Difficulty

| Round | Rival Towers | Blocks per Rival | Earthquake Ramp | Round Duration |
|-------|-------------|-------------------|-----------------|----------------|
| 1     | 3           | 5-7               | Linear, full at 45s | 45s |
| 2     | 3           | 6-8               | Linear, full at 42s | 45s |
| 3     | 3           | 7-10              | Linear, full at 38s | 45s |
| 4+    | 3           | 8-12 (cap 12)     | Linear, full at 35s (cap) | 45s |

On mobile with narrow screens, rival count stays at 2 for all rounds.

### 6.2 Game Over

- Triggered when player tower topples (angle exceeds maxAngle).
- Show final score, best height, and high score comparison.
- If new high score: big celebratory particles, "NEW BEST!" text.
- Show round number reached.
- Tap/click to restart (triggers `commercialBreak` before new round 1).

### 6.3 Persistence

- `localStorage.setItem('stackthief_highscore', score)`
- `localStorage.setItem('stackthief_bestheight', height)`
- Read on game init for ghost line and score display.


## 7. JUICE & FEEDBACK

### 7.1 Sound Effects (synthesized via Web Audio, no files needed)

Generate all sounds procedurally to avoid loading external assets:

| Name | Description | Generation |
|------|-------------|------------|
| `steal` | Quick upward pitch sweep | Sine wave 200->800Hz over 0.1s, gain envelope 0.5->0 |
| `land` | Soft thud | Noise burst 0.08s, lowpass 300Hz, gain 0.4 |
| `brace` | Deep stabilizing pulse | Sine 80Hz, 0.3s, gain envelope in-out |
| `collapse` | Crashing rumble | Noise 0.6s, lowpass sweep 2000->200Hz, gain 0.7->0 |
| `combo` | Ascending chime | Sine at 440*(comboCount) Hz, 0.15s, gain 0.3 |
| `danger` | Warning pulse | Square wave 200Hz, 0.1s on/off, repeated twice |
| `timeup` | Round end horn | Sawtooth 300Hz, 0.5s, gain 0.5->0 |
| `highscore` | Victory fanfare | Sequence of sine tones: C5 E5 G5 C6, 0.1s each |

### 7.2 Particles

- **Steal dust**: 8-12 particles, tan/brown, spread outward from extraction point, gravity pulls down, life 0.4s.
- **Land dust**: 6 particles, gray, small puff upward from landing point, life 0.3s.
- **Collapse rubble**: 20-30 particles per tower, block-colored, explode outward with gravity, life 0.8-1.2s. Some are larger rectangles (mini block fragments).
- **Combo stars**: 5 star-shaped particles (drawn as 4-pointed crosses), gold color, float upward with slight spread, life 0.6s.
- **Danger sparks**: Red particles at screen edges when in danger zone, 2-3 per frame, life 0.2s.

### 7.3 Screen Effects

- **Steal shake**: intensity 3px, duration 0.15s.
- **Collapse shake**: intensity 8px, duration 0.4s.
- **Earthquake continuous shake**: `intensity * 2px`, random per frame.
- **Danger flash**: red vignette overlay `rgba(255, 0, 0, 0.1)` pulsing at 3Hz when angle > dangerAngle.
- **Timer pulse**: when < 10s, timer text scales between 1.0x and 1.15x at 2Hz.

### 7.4 Animations

- **Block flying arc**: Quadratic bezier, 0.4s, easeOutBack. Block rotates 360 degrees during flight.
- **Combo text**: Scales from 0.5x to 1.2x over 0.2s (easeOutBack), holds 0.5s, fades over 0.3s.
- **Tower collapse**: Blocks scatter outward with randomized velocities. Angular velocities randomized. Gravity pulls them down. Fade out over 1.5s.
- **Round start**: Towers rise up from ground over 0.5s (easeOutBounce). "ROUND X" text fades in/out over 1.5s.
- **Ghost line**: Dashed line with alpha pulsing between 0.2 and 0.4 at 1Hz.


## 8. FILE STRUCTURE

### 8.1 Files to Create

**`js/physics.js`** -- Tower physics engine
- `TowerPhysics` object/namespace with functions:
  - `updateTower(tower, dt, earthquakeIntensity, braceActive)` -- runs the sway simulation
  - `checkTopple(tower)` -- returns boolean
  - `addBlockImpulse(tower, newBlock, belowBlock)` -- computes and applies width-mismatch impulse
  - `collapseTower(tower)` -- converts all blocks to falling state with scatter velocities
- Constants: `GRAVITY_FACTOR`, `DAMPING`, `HEIGHT_PENALTY`, `BLOCK_HEIGHT`

**`js/tower.js`** -- Tower and Block constructors/factories
- `createBlock(x, y, width, hue)` -- returns a Block object
- `createTower(x, baseY, blockCount, hue, isPlayer)` -- returns a Tower with random blocks
- `addBlockToTower(tower, block)` -- pushes block and triggers impulse
- `removeBlockFromTower(tower, index)` -- splices block, computes collapse-check, returns the block
- `getBlockWorldPositions(tower)` -- returns array of `{ x, y, angle, block }` accounting for tower lean

**`js/particles.js`** -- Particle system
- `ParticleSystem` object with:
  - `particles[]` array
  - `spawn(type, x, y, count, color)` -- creates particles based on type preset
  - `update(dt)` -- moves particles, applies gravity, reduces life, removes dead
  - `render(ctx, scale)` -- draws all particles

**`js/renderer.js`** -- All rendering logic
- `Renderer` object with:
  - `drawBackground(ctx, w, h, stars)` -- gradient sky + stars
  - `drawGround(ctx, w, h, groundY)` -- ground plane
  - `drawTower(ctx, tower, positions, scale)` -- renders one tower with all its blocks
  - `drawBlock(ctx, block, x, y, angle, scale)` -- single block with fill, border, flash
  - `drawFlyingBlock(ctx, block, scale)` -- block in transit with trail
  - `drawGhostLine(ctx, y, w, timer)` -- dashed high score line
  - `drawUI(ctx, state)` -- score, timer, combo, brace indicator, danger
  - `drawComboText(ctx, combo, timer, cx, cy)` -- animated combo display
  - `drawBraceIndicator(ctx, cooldown, maxCooldown, x, y)` -- circular cooldown

**`js/sfx.js`** -- Procedural sound synthesis
- `SFX` object with:
  - `init(audioCtx)` -- stores reference to Web Audio context
  - `playSteal()`, `playLand()`, `playBrace()`, `playCollapse()`, `playCombo(n)`, `playDanger()`, `playTimeUp()`, `playHighScore()` -- each generates and plays a procedural sound using oscillators and gain nodes

### 8.2 Files to Modify

**`js/game.js`** -- Major rewrite of the game logic
- Remove demo bouncing dot code
- Import tower, physics, particles, renderer modules (but since these are non-module scripts loaded via script tags, they'll be globals -- game.js will reference them)
- Actually: since game.js is an ES module (loaded via main.js), and the new files will be non-module scripts, the new files should attach to `window` (e.g., `window.TowerPhysics = { ... }`). Game.js accesses them as globals.
- Implement `loadAssets()` -- initialize SFX system, generate stars array, read high scores from localStorage.
- Implement `start()` -- create player tower, create rival towers, reset all state.
- Implement `updatePlaying(dt)` -- process input, update physics, update flying blocks, update particles, check win/lose conditions, update earthquake.
- Implement `renderPlaying()` -- call Renderer functions in correct order.
- Implement `gameOver()` -- stop gameplay, save high score.
- Implement `restart()` -- commercial break, then start new round 1.
- Add `updateMenu(dt)` for idle tower animation on the menu screen.
- Add `renderMenu()` override with title and animated demo towers.
- Add `renderGameOver()` override with score display.
- Add pointer event listeners for tap position tracking.

**`index.html`** -- Add script tags for new files
```html
<script src="js/sfx.js"></script>
<script src="js/particles.js"></script>
<script src="js/tower.js"></script>
<script src="js/physics.js"></script>
<script src="js/renderer.js"></script>
```
All before the `<script type="module" src="js/main.js">` tag.


## 9. EDGE CASES

### 9.1 Mobile vs Desktop

- **Touch targets**: All block hit-test areas padded by 8px. On towers with many small blocks stacked tightly, bias hit-test toward the tapped block's center to resolve ambiguity (pick the block whose center is closest to the tap point).
- **Rival tower count**: If `virtualWidth < 350` (very narrow portrait phone), use 2 rivals instead of 3.
- **Performance**: Cap particles at 200 active. On frames where dt > 0.05 (30fps or worse), reduce particle spawn counts by half.
- **Canvas resolution**: Use `devicePixelRatio` capping at 2 to avoid blurry rendering on retina displays without killing performance on 3x screens. Set `canvas.width = Math.floor(window.innerWidth * Math.min(devicePixelRatio, 2))` and scale ctx accordingly.

### 9.2 Resize Handling

- On `window.resize`: recalculate canvas dimensions, virtual game area, ground Y, and reposition all towers proportionally. Towers keep their relative X positions (as fractions of game width). Base Y recalculates from new canvas height.

### 9.3 Pause/Resume (Tab Visibility)

- On `visibilitychange` hidden: set a `paused` flag. In `_loop`, skip update when paused (still render one frozen frame). Poki SDK handles gameplay stop/start automatically.
- On `visibilitychange` visible: unpause. Clamp dt to 0 for the first frame back to avoid a physics jump.

### 9.4 Empty Rival Towers

- When all blocks are stolen from a rival tower, remove it from play. If ALL rival towers are empty or collapsed, end round early with a bonus `+100` "Clean Sweep".

### 9.5 Rapid Tapping

- `stealCooldown = 0.25s` prevents stealing faster than 4 blocks/second, which would make physics unstable.
- Ignore taps that don't hit any block (no accidental actions).

### 9.6 Tower Height vs Screen Space

- If a tower grows taller than the visible area, smoothly scroll the camera Y upward so the top of the tallest tower (or player tower) is always visible with ~50px padding. The ground may scroll off the bottom -- that's fine, it creates a vertigo effect that adds tension.
- Camera Y target = `min(default, topOfTallestTower - 50)`. Lerp camera toward target at rate 3.0/s.

### 9.7 Scoring Edge Cases

- If player tower topples on the same frame a steal lands: the steal counts, then topple triggers. Player gets the points.
- Combo resets to 0 when player tower angle exceeds `dangerAngle` at any point (not just on steal), even momentarily.

### 9.8 Menu Screen

- Show 2-3 autonomously swaying towers as background decoration (no interaction). Gentle earthquake at 0.2 intensity for ambiance.
- Title: "STACK THIEF" in bold 48px, white with black stroke. Subtitle: "Tap to Play" pulsing alpha.
- High score shown if > 0: "Best: [score]" below subtitle.