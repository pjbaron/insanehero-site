Now I have a thorough understanding of the template. Let me also check what the InputManager provides for touch â€” I need to understand if it tracks ongoing touch position (for left/right half detection) or just tap events.

The InputManager only tracks tap (click/touchstart) as a one-shot boolean and keyboard holds. For this game, we need continuous touch-hold detection with left/right side discrimination. That's a critical gap to address.

Here's the implementation plan:

---

# DRIFT DODGE - Implementation Plan

## 1. GAME OBJECTS

### 1.1 Player Car
- `x`, `y` â€” position on canvas (y is fixed relative to screen, ~75% down from top)
- `width`: 40px, `height`: 70px (in game-world units, scaled to road)
- `angle` â€” visual rotation in radians (tilts into curves, max +/-0.25 rad)
- `driftDir` â€” -1 (left), 0 (straight), +1 (right), smoothly interpolated
- `lateralSpeed` â€” current horizontal velocity (px/s), lerps toward target
- `hitbox` â€” inset rectangle (32x60) slightly smaller than visual for forgiving collisions
- `spinTimer` â€” countdown when hit (0.8s spin-out animation)
- `invincibleTimer` â€” 1.5s of invincibility after crash (flashing)
- `skinIndex` â€” which car skin to draw (0 = default)
- `trailParticles[]` â€” tire marks left behind during drift

### 1.2 Oncoming Vehicle
- `x`, `y` â€” position on road
- `width`: 38-50px, `height`: 65-85px (varies by type)
- `type` â€” one of: `sedan` (38x65), `truck` (44x80), `bus` (48x85), `speedDemon` (36x60)
- `speed` â€” downward speed (relative to road scroll), speedDemons get +150 extra
- `lane` â€” which lane (0-3) they spawn in
- `color` â€” randomly assigned from palette per type
- `swerveTimer`, `swerveDir` â€” only for speedDemon type (sinusoidal lane change)
- `passed` â€” bool, has player passed this vehicle (for near-miss detection)

### 1.3 Coin
- `x`, `y` â€” position on road
- `radius`: 12px
- `bobOffset` â€” sine wave phase for float animation
- `collected` â€” bool

### 1.4 Road Marking
- `y` â€” vertical position (scrolls down)
- `lane` â€” which lane divider (0-2 for 3 dividers between 4 lanes)

### 1.5 Particle
- `x`, `y`, `vx`, `vy` â€” position and velocity
- `life`, `maxLife` â€” countdown for fade
- `size` â€” radius
- `color` â€” string
- `type` â€” `spark`, `tire`, `coin`, `crash`

### 1.6 Screen Shake
- `shakeX`, `shakeY` â€” offset applied to camera
- `shakeMagnitude` â€” current intensity, decays per frame
- `shakeDecay` â€” how fast it decays (0.9 per frame)

### 1.7 Floating Text
- `x`, `y` â€” spawn position
- `text` â€” e.g. "+50", "x3!", "NEAR MISS!"
- `life` â€” 0.8s total, drifts upward and fades

---

## 2. GAME STATE

```
score             â€” float, accumulated points
highScore         â€” int, loaded from localStorage
combo             â€” int, current near-miss chain (0 = no combo)
comboTimer        â€” float, seconds remaining before combo resets (2.0s window)
comboMultiplier   â€” combo + 1 (capped at 10x)
lives             â€” int, starts at 3
baseSpeed         â€” float, base road scroll speed (px/s), starts at 300
currentSpeed      â€” float, baseSpeed + combo bonus, the actual scroll rate
speedBoostFromCombo â€” float, extra speed from combo (combo * 15)
distanceTraveled  â€” float, for score and difficulty gating
phaseTimer        â€” float, counts up to 30s then resets (triggers traffic pattern shifts)
phase             â€” int, increments each 30s
trafficPattern    â€” string: 'normal', 'convoy', 'staggered', 'speedDemons'
vehicles[]        â€” active oncoming vehicles
coins[]           â€” active coins
particles[]       â€” active particles
floatingTexts[]   â€” active floating text popups
roadMarkings[]    â€” active lane dividers (recycled)
spawnTimer        â€” float, countdown to next vehicle spawn
coinSpawnTimer    â€” float, countdown to next coin spawn
grassOffset       â€” float, for scrolling grass texture on sides
unlockedSkins[]   â€” array of booleans, loaded from localStorage
```

---

## 3. CORE MECHANICS

### 3.1 Per-Frame Update (updatePlaying(dt)):

1. **Read Input** â€” Determine drift direction:
   - Left held: `targetDrift = -1`
   - Right held: `targetDrift = +1`
   - Neither: `targetDrift = 0`

2. **Update Player Lateral Movement**:
   - `lateralSpeed` lerps toward `targetDrift * 350` at rate 8/s
   - `player.x += lateralSpeed * dt`
   - Clamp `player.x` within road boundaries (roadLeft + 20 to roadRight - 20)
   - `player.angle` lerps toward `targetDrift * -0.25` at rate 6/s

3. **Update Speed**:
   - `baseSpeed` increases by 2 px/s every second (so +60 after 30s)
   - `speedBoostFromCombo = combo * 15`
   - `currentSpeed = baseSpeed + speedBoostFromCombo`
   - Cap `currentSpeed` at 800

4. **Scroll Road**:
   - Move all road markings down by `currentSpeed * dt`
   - Recycle markings that go off bottom
   - `grassOffset = (grassOffset + currentSpeed * dt) % 20`

5. **Update Vehicles**:
   - Move each vehicle `y += (currentSpeed + vehicle.speed) * dt`
   - SpeedDemon swerve: `vehicle.x += sin(vehicle.swerveTimer * 3) * 60 * dt`
   - Remove vehicles that go below `canvas.height + 100`
   - **Near-miss check**: If vehicle.y > player.y and not yet `passed`:
     - Mark `passed = true`
     - Check horizontal distance: if `abs(vehicle.x - player.x) < 55` (close call) AND no collision:
       - `combo++`, `comboTimer = 2.0`
       - Spawn "NEAR MISS!" floating text
       - Spawn spark particles
       - Play near-miss SFX (pitch increases with combo)
       - Add `50 * comboMultiplier` to score

6. **Collision Detection**:
   - AABB overlap between player hitbox and each vehicle hitbox
   - On collision:
     - `lives--`
     - `combo = 0`, `comboTimer = 0`
     - `player.spinTimer = 0.8`
     - `player.invincibleTimer = 1.5`
     - Screen shake: `shakeMagnitude = 12`
     - Spawn crash particles (20 orange/red sparks)
     - Play crash SFX
     - `currentSpeed *= 0.6` (sudden slowdown), `baseSpeed = max(baseSpeed - 40, 300)`
     - If `lives <= 0`: trigger gameOver()

7. **Update Coins**:
   - Move down at `currentSpeed * dt`
   - Overlap check with player: if within 30px distance, collect:
     - `score += 25 * comboMultiplier`
     - Spawn 8 gold particles
     - Play coin SFX
     - Spawn "+25" floating text

8. **Spawn Vehicles** (based on `spawnTimer`):
   - `spawnTimer -= dt`
   - When `spawnTimer <= 0`:
     - Spawn pattern depends on `trafficPattern`
     - Reset `spawnTimer` based on difficulty (starts 0.8s, decreases to 0.35s by phase 5)
   - Normal: 1 vehicle in random lane
   - Convoy: 2-3 vehicles in adjacent lanes simultaneously
   - Staggered: 1 vehicle, but alternating left/right lanes rapidly (timer 0.3s)
   - SpeedDemons: spawn `speedDemon` type with swerve behavior

9. **Spawn Coins**:
   - `coinSpawnTimer -= dt`, reset to 2.0-4.0s random
   - Spawn coin in gap between vehicles (pick a lane not occupied within 200px)

10. **Phase Advancement**:
    - `phaseTimer += dt`
    - Every 30s: `phase++`, pick new traffic pattern, flash "PHASE X" text
    - Phase 0-1: normal, Phase 2: staggered, Phase 3: convoy, Phase 4+: random mix

11. **Update Particles**: Move, decay life, remove dead ones

12. **Update Floating Texts**: Drift up, decay life, remove dead ones

13. **Update Combo Timer**:
    - `comboTimer -= dt`
    - If `comboTimer <= 0`: `combo = 0`

14. **Score Accumulation**:
    - `score += currentSpeed * 0.02 * comboMultiplier * dt` (distance-based scoring)

15. **Spin-out Update** (if `spinTimer > 0`):
    - Player cannot steer
    - Visual: rotate player sprite rapidly
    - `spinTimer -= dt`

16. **Invincibility Update** (if `invincibleTimer > 0`):
    - Skip collision checks
    - Visual: player flickers (draw every other 0.1s)
    - `invincibleTimer -= dt`

---

## 4. RENDERING PLAN

Drawing order (back to front):

1. **Background** â€” Dark gray `#333` fill for grass/shoulder areas
2. **Road Surface** â€” Centered rectangle, width = 4 lanes * 55px = 220px (scaled), color `#555`
3. **Road Shoulders** â€” 2px white lines on both sides of road
4. **Lane Markings** â€” Dashed white lines between lanes, scrolling down
5. **Coins** â€” Gold circle with inner highlight, gentle bob animation
6. **Oncoming Vehicles** â€” Drawn as colored rectangles with detail lines (windshield, bumpers). Colors by type:
   - Sedan: random from `[#e74c3c, #3498db, #2ecc71, #f39c12, #9b59b6]`
   - Truck: `#c0392b` or `#7f8c8d`
   - Bus: `#f1c40f`
   - SpeedDemon: `#e91e63` with racing stripes
7. **Tire Mark Particles** â€” Dark semi-transparent marks on road during drift
8. **Player Car** â€” Drawn with `ctx.save/rotate/restore` for drift angle. White body with colored stripe. During invincibility: flicker alpha
9. **Spark/Crash Particles** â€” Small circles with motion blur (line from prev to current pos)
10. **Floating Texts** â€” Bold font, fading out, drifting upward
11. **HUD** (drawn in screen-space, not road-space):
    - Top-left: Score (large) and High Score (small below it)
    - Top-center: Combo counter (e.g. "x5 COMBO") with pulsing scale when active, color shifts from white to yellow to orange to red as combo grows
    - Top-right: Lives shown as 3 small car icons, lost ones grayed out
    - Center: Phase announcement text (fades after 2s)
    - Speed indicator: subtle bar at bottom edge showing relative speed

### Road Geometry (responsive):
- `roadWidth = min(canvas.width * 0.55, 260)`
- `roadLeft = (canvas.width - roadWidth) / 2`
- `roadRight = roadLeft + roadWidth`
- `laneWidth = roadWidth / 4`
- Player Y = `canvas.height * 0.75`
- All game-world X positions are relative to road bounds

### Visual Style:
- Flat/bold colors, no textures (fast to render, clean look)
- Everything drawn with canvas primitives (fillRect, arc, lines)
- Road is a straight vertical strip â€” "scrolling" is faked by moving objects down + lane markings
- Grass sides get subtle horizontal stripe scroll for speed feel

---

## 5. INPUT HANDLING

### Modification to InputManager (input.js):
Add continuous touch-hold tracking with left/right side detection:
- Track `touchDown` (bool), `touchX` (float) on `touchstart`/`touchmove`
- Clear on `touchend`/`touchcancel`
- Add `isTouchLeft()`: `touchDown && touchX < canvas.width / 2`
- Add `isTouchRight()`: `touchDown && touchX >= canvas.width / 2`
- Add `isTouchHeld()`: `touchDown` (for detecting any touch)
- Also track mouse hold: `mouseDown`, `mouseX` on `mousedown`/`mousemove`, clear on `mouseup`

### Input Mapping in Game:
```
Drift Left:  input.isLeft() || input.isTouchLeft() || input.isMouseLeft()
Drift Right: input.isRight() || input.isTouchRight() || input.isMouseRight()
Confirm:     input.wasPressed('Enter') || input.wasPressed('Space') || input.wasTapped()
```

### Why modify InputManager:
The existing InputManager only has `wasTapped()` (edge-triggered click/touchstart). The game needs **continuous hold** detection with **position awareness** â€” holding left half vs right half. This is a fundamental requirement for the drift mechanic. The additions are minimal and non-breaking.

---

## 6. PROGRESSION

### Difficulty Scaling:
| Phase | Time    | baseSpeed | spawnInterval | Traffic Pattern   |
|-------|---------|-----------|---------------|-------------------|
| 0     | 0-30s   | 300       | 0.80s         | normal            |
| 1     | 30-60s  | 360       | 0.65s         | normal            |
| 2     | 60-90s  | 420       | 0.55s         | staggered waves   |
| 3     | 90-120s | 480       | 0.45s         | convoys           |
| 4     | 120-150s| 540       | 0.40s         | speedDemons       |
| 5+    | 150s+   | 580 cap   | 0.35s floor   | random mix        |

(baseSpeed also increases continuously at 2/s, the table shows approximate values)

### Combo Speed Boost:
- Each combo point adds 15 to currentSpeed
- At x10 combo: +150 speed (significant, makes weaving harder)
- Combo resets to 0 on crash or after 2s without a near-miss

### Game Over:
- 3 lives total (3 crashes = done)
- On final crash: 1.5s dramatic slowdown, car tumbles, then game over screen
- High score saved to localStorage

### Unlockable Skins (stretch goal):
- Score milestones: 1000, 5000, 15000, 50000 unlock new car colors
- Stored in localStorage, selectable on menu (tap car to cycle)

---

## 7. JUICE & FEEDBACK

### Particles:
- **Tire marks** (during drift): dark gray dots spawning at rear wheels, 0.5s life, fade to transparent
- **Near-miss sparks**: 6 yellow/white sparks burst sideways from near-miss vehicle, 0.4s life
- **Crash sparks**: 20 orange/red sparks burst from collision point, 0.6s life, spread widely
- **Coin collect**: 8 gold sparkles burst from coin position, 0.3s life
- **Speed lines**: When speed > 500, faint white streaks on grass areas scroll fast

### Screen Effects:
- **Screen shake** on crash: magnitude 12, decays by *0.85 each frame
- **Combo pulse**: HUD combo text scales up briefly (1.0 -> 1.3 -> 1.0 over 0.2s) on each near-miss
- **Speed vignette**: At high speeds, darken edges of screen slightly (draw gradient overlay)
- **Flash on hit**: Brief white overlay (0.05s) on crash

### Floating Text:
- "NEAR MISS!" â€” white, appears near passed vehicle, floats up 0.8s
- "x3 COMBO!" â€” yellow/orange (color by combo level), center screen, scale pop
- "+50" / "+25" â€” score popup near event location

### Sound Effects (generated procedurally or placeholder):
- `nearmiss` â€” short whoosh/zing, pitch increases with combo (1.0 + combo * 0.05)
- `crash` â€” crunch/thud
- `coin` â€” bright ding
- `combo_lost` â€” descending tone
- `phase_change` â€” rising sweep
- `gameover` â€” low rumble + glass break

### SFX Generation:
Since we need instant load and no asset files, generate all SFX programmatically using Web Audio API oscillators in a `js/sfx.js` utility. Each sound is a function that creates oscillator nodes, applies envelopes, and plays immediately. No mp3 files needed.

---

## 8. FILE STRUCTURE

### Files to CREATE:
1. **`js/drift_dodge.js`** â€” Main game class extending Game. Contains:
   - All game state variables
   - `loadAssets()` â€” init SFX, precompute colors
   - `start()`, `restart()`, `gameOver()` â€” state transitions
   - `updatePlaying(dt)` â€” full game logic per section 3
   - `renderPlaying()` â€” full render pipeline per section 4
   - `renderMenu()`, `renderGameOver()` â€” override screens with themed art
   - Vehicle spawning logic
   - Collision detection
   - Combo/scoring system

2. **`js/sfx.js`** â€” Procedural sound effects (non-module, loaded as global `SFX` object):
   - `SFX.init(audioCtx)` â€” store reference to audio context
   - `SFX.nearMiss(combo)` â€” whoosh with pitch based on combo
   - `SFX.crash()` â€” impact sound
   - `SFX.coin()` â€” collect ding
   - `SFX.comboLost()` â€” descending tone
   - `SFX.phaseChange()` â€” rising sweep
   - `SFX.gameOver()` â€” rumble

### Files to MODIFY:
3. **`js/input.js`** â€” Add touch-hold tracking with position (`touchDown`, `touchX`, `isTouchLeft()`, `isTouchRight()`, mouse equivalents)

4. **`js/main.js`** â€” Import `DriftDodge` instead of `Game`, instantiate it

5. **`index.html`** â€” Add `<script src="js/sfx.js"></script>` before main.js. Add `<script src="js/drift_dodge.js"></script>` is NOT needed since it's imported as ES module via main.js. Only sfx.js needs a script tag (it's a non-module global).

### Files UNCHANGED:
- `js/poki.js` â€” used as-is
- `js/audio.js` â€” used for music infrastructure; SFX goes through sfx.js instead for procedural generation, but GameAudio.initContext() / muteAll / unmuteAll still used
- `css/styles.css` â€” used as-is
- `js/game.js` â€” base class used as-is (DriftDodge extends it)

---

## 9. EDGE CASES

### Mobile vs Desktop:
- Road width scales to `min(canvas.width * 0.55, 260)` â€” works on narrow phones
- Touch: hold left/right half of screen. Visual hint: faint left/right arrows on first play
- No hover states, no right-click context menu (CSS already handles this)
- Font sizes in HUD use `Math.max(14, canvas.height * 0.025)` for readability

### Resize Handling:
- `_resize()` already fires on window resize
- All positions are computed relative to canvas dimensions each frame (roadLeft, roadRight, playerY)
- Vehicles and player positions stored as road-relative fractions internally? No â€” simpler to just clamp player.x within new road bounds on resize. Vehicles off-road after resize get removed.

### Pause/Resume (tab visibility):
- Poki.js already handles `visibilitychange` for gameplay tracking
- In `updatePlaying()`: if `document.hidden`, skip update (dt clamp to 0.1 already helps, but explicitly skip is safer)
- On resume: don't spawn a burst of vehicles from accumulated dt (the dt clamp at 0.1s handles this)

### Performance:
- Object pooling not needed initially (arrays of simple objects, max ~20 vehicles + 50 particles at once)
- All rendering is canvas primitives â€” no images to load, no texture switching
- Target: well under 2ms per frame on mobile

### First Play Experience:
- Menu screen shows game title, car graphic, "TAP TO PLAY" / "PRESS ENTER"
- First 5 seconds of play: reduced traffic (spawnInterval * 1.5) to let player get oriented
- No tutorial text â€” controls are intuitive (hold side = drift that way)

### localStorage:
- Keys: `dd_highScore` (int), `dd_skins` (JSON array of booleans), `dd_musicMuted` (already handled by audio.js)
- Wrap all localStorage access in try/catch (incognito mode, storage full)

### Ad Integration:
- `commercialBreak` on restart (after game over, before new game starts)
- Config.adsEnabled starts false for development, set true for production
- SFX.js respects GameAudio.muteAll/unmuteAll cycle during ads

---

This plan covers every system needed for a complete, polished Drift Dodge implementation. The game can be built file-by-file following sections 8's order: input.js modifications first, then sfx.js, then drift_dodge.js (the bulk), then main.js + index.html wiring.