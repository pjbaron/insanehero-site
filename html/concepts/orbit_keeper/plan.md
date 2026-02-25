Now I have a thorough understanding of the template. Let me write the implementation plan.

---

# ORBIT KEEPER -- Implementation Plan

## 1. GAME OBJECTS

### 1.1 Planet
```
{
  x, y,                   // center position (float)
  vx, vy,                 // drift velocity, pixels/sec (initially ~20-40 px/s, slowing to 0 once "anchored")
  radius,                 // visual radius: 28-50 px (scaled to min(screenW,screenH)/20 base)
  color,                  // fill color, picked from palette per planet index
  ringColor,              // lighter tint of color, used for orbit ring guides
  orbitSlots,             // array of radii: [r*1.8, r*2.5, r*3.2, r*3.9] (4 slots per planet)
  moons,                  // array of Moon refs currently orbiting this planet
  anchored,               // bool -- true once first moon locks on; stops drift
  pulseTimer,             // 0..1 oscillator for gentle breathing glow
  spawnTime,              // timestamp when planet appeared (for intro animation)
}
```

### 1.2 Moon
```
{
  x, y,                   // current position (computed from orbit each frame)
  radius,                 // 6-10 px (scales with screen)
  color,                  // white/pale tint
  state,                  // 'flying' | 'capturing' | 'orbiting' | 'shattering'

  // Flying state:
  vx, vy,                 // velocity in px/sec (launch speed: 500 px/s)
  flyTime,                // seconds since launch; moon dies if > 3s without capture

  // Capturing state (tween into orbit over 0.2s):
  captureTimer,           // 0..0.2 countdown
  captureStartAngle,      // angle when capture began
  captureStartDist,       // distance when capture began

  // Orbiting state:
  planet,                 // ref to host Planet
  orbitIndex,             // which slot (0-3)
  orbitRadius,            // actual orbit radius (copied from planet.orbitSlots[i])
  angle,                  // current angle in radians
  angularSpeed,           // rad/sec -- inner orbits ~2.5, outer ~1.2 (inversely proportional)
  direction,              // +1 or -1 (alternates per slot for visual interest)

  // Trail:
  trail,                  // circular buffer of last 12 positions [{x,y}], drawn as fading dots
}
```

### 1.3 LaunchIndicator (UI only, not a persistent object)
```
{
  active,                 // bool -- is the player currently dragging?
  originX, originY,       // where the touch/click started
  currentX, currentY,     // current pointer position
  targetPlanet,           // nearest planet to aim line, or null
}
```

### 1.4 Particle (for shattering/scoring effects)
```
{
  x, y,
  vx, vy,
  radius,                 // starts 2-4, shrinks to 0
  color,                  // inherited from source moon/planet
  life,                   // 0..1 (1 = just born, 0 = dead)
  decay,                  // life reduction per second (1.5-3.0)
}
```

### 1.5 ScorePopup (floating "+1" text)
```
{
  x, y,
  text,                   // "+1", "+2" for combos, "PERFECT!" for sweet-spot hits
  life,                   // 0..1, rises and fades over 0.8s
  color,
}
```

### 1.6 Star (background decoration)
```
{
  x, y,                   // 0..1 normalized coords (multiplied by canvas size)
  brightness,             // 0.2-0.8
  twinkleOffset,          // random phase for sin-based twinkle
  size,                   // 0.5-2.0 px
}
```

## 2. GAME STATE

```
score                     // int -- total moons currently in orbit (simultaneous count)
bestScore                 // int -- highest simultaneous count ever (persisted in localStorage)
totalLaunched             // int -- moons launched this run
totalOrbiting             // int -- current orbiting count (= score)
planets                   // array of Planet
moons                     // array of Moon (all states)
particles                 // array of Particle
scorePopups               // array of ScorePopup
stars                     // array of 80-120 Star (generated once)

// Spawning
planetSpawnTimer          // seconds until next planet spawns
planetSpawnInterval       // starts at 5.0s, decreases to 2.0s minimum
planetsSpawned            // count of planets ever spawned this run

// Difficulty
difficultyLevel           // 0..10, computed from planetsSpawned
moonSpeed                 // base launch speed, stays fixed at 500 px/s

// Launch cooldown
launchCooldown            // 0 when ready; set to 0.3s after each launch

// Drag state
drag                      // LaunchIndicator object

// Timing
gameTime                  // total elapsed seconds in current run

// Combo
comboCount                // moons captured consecutively without a miss
comboTimer                // resets to 3s after each capture; if it hits 0, combo resets

// Screen shake
shakeAmount               // current shake magnitude (decays quickly)
shakeX, shakeY            // current frame offset
```

## 3. CORE MECHANICS

### 3.1 Frame Update (`updatePlaying(dt)`)

1. **Update planet spawn timer.** Decrement `planetSpawnTimer` by `dt`. If <= 0, call `spawnPlanet()` and reset timer to `planetSpawnInterval`.

2. **Update planets.** For each planet:
   - If not anchored: move by `(vx, vy) * dt`. If planet drifts fully off-screen (center > 100px past any edge), remove it and any orbiting moons (triggers shatter on those moons, counts as lost score).
   - Update `pulseTimer += dt * 1.5; wrap to 0..2PI`.

3. **Update drag/aim.** If `drag.active`, compute aim direction from `drag.origin` to `drag.current`. Find the closest planet along that ray (within 200px lateral tolerance) and highlight it as `drag.targetPlanet`.

4. **Update flying moons.** For each moon with `state === 'flying'`:
   - Move by `(vx, vy) * dt`.
   - Increment `flyTime += dt`. If `flyTime > 3.0`, destroy moon (fizzle particles).
   - **Gravity capture check:** For each planet, compute distance `d` from moon center to planet center. If `d < planet.orbitSlots[lastAvailableSlot] + 15` AND `d > planet.radius + 5`:
     - Find the closest available orbit slot (one not at max capacity of 1 moon per slot).
     - If slot found and moon velocity is somewhat tangential (dot product of velocity with radial vector < 0.7 * speed -- not heading straight at planet), begin capture.
     - Transition moon to `'capturing'` state: record `captureStartAngle`, `captureStartDist`, set `captureTimer = 0.2`.
   - **Planet collision:** If `d < planet.radius`, destroy moon (shatter particles), shake screen.
   - **Off-screen:** If moon leaves screen bounds by 50px in any direction, remove it silently.

5. **Update capturing moons.** For each moon with `state === 'capturing'`:
   - `captureTimer -= dt`. Lerp moon position from (captureStartDist, captureStartAngle) to (orbitRadius, captureStartAngle) over 0.2s.
   - When `captureTimer <= 0`: transition to `'orbiting'`. Add moon to planet's `moons` array. Increment score. Create score popup. Play "lock" SFX. If planet wasn't anchored, set `anchored = true`, zero its velocity. Update combo.

6. **Update orbiting moons.** For each moon with `state === 'orbiting'`:
   - `angle += angularSpeed * direction * dt`.
   - Compute `x = planet.x + cos(angle) * orbitRadius`, `y = planet.y + sin(angle) * orbitRadius`.
   - Push `{x, y}` to trail buffer (keep last 12).

7. **Moon-moon collision.** For every pair of moons where both are `'orbiting'` or `'flying'`:
   - If `dist(moonA, moonB) < moonA.radius + moonB.radius`:
     - Both shatter. Spawn 8-12 particles each. Play "shatter" SFX. Screen shake 6px.
     - Remove from their planets' moon arrays. Decrement score for each orbiting moon lost.
     - **Chain reaction:** Mark nearby moons (within 40px of shatter point) for destruction next frame via a `shatterQueue`.
   - Skip collision between a flying moon and the moon that just launched (grace period 0.1s).

8. **Process shatter queue.** Destroy any moons flagged for chain-reaction shatter. Each one can flag more neighbors. Cap chain length at 20 to prevent frame drops.

9. **Update particles.** `life -= decay * dt`. Remove when `life <= 0`.

10. **Update score popups.** `life -= dt / 0.8`. Remove when `life <= 0`. `y -= 40 * dt` (float upward).

11. **Update screen shake.** `shakeAmount *= max(0, 1 - dt * 12)`. Generate `shakeX = (random()-0.5) * shakeAmount`, `shakeY = (random()-0.5) * shakeAmount`.

12. **Update combo timer.** `comboTimer -= dt`. If `<= 0`, reset `comboCount = 0`.

13. **Check game over.** Game over if: score was > 0 and is now 0 (all moons destroyed) AND at least 1 planet has been anchored. Also game over if: all planets have drifted off-screen and none remain.

14. **Update difficulty.** `difficultyLevel = min(10, floor(planetsSpawned / 2))`. Adjust `planetSpawnInterval = max(2.0, 5.0 - difficultyLevel * 0.3)`.

### 3.2 Planet Spawning

`spawnPlanet()`:
- Pick a random edge (top/bottom/left/right).
- Place planet just off that edge with velocity pointing inward + slight random angle.
- Velocity magnitude: `25 + random() * 15` px/s.
- Radius: `28 + random() * 22` (scaled by `min(canvasW, canvasH) / 800`).
- Color: pick from palette array at index `planetsSpawned % palette.length`.
- Palette: `['#4A90D9','#D94A6B','#6BD94A','#D9A44A','#9B59B6','#1ABC9C','#E67E22','#3498DB']`.
- Compute `orbitSlots` from radius.
- Increment `planetsSpawned`.

### 3.3 Moon Launching

On drag release:
- Direction = normalize(drag.origin - drag.current) -- pull-back slingshot feel.
- Moon spawns at `drag.origin`.
- Velocity = direction * 500 px/s.
- Moon radius = 7 * screenScale.
- Set `launchCooldown = 0.3`.

### 3.4 Capture Sweet Spot

A moon entering an orbit slot earns base +1. If the moon enters within 5px of the exact orbit radius (very precise), mark as "PERFECT!" for extra feedback (bigger popup, brighter flash). No bonus score -- just juice.

## 4. RENDERING PLAN

Draw order (back to front):

1. **Background.** Fill canvas with `#0B0E17` (very dark blue-black).
2. **Stars.** For each star, draw a 1-2px dot with alpha = `brightness * (0.7 + 0.3 * sin(time * 2 + twinkleOffset))`.
3. **Orbit ring guides.** For each anchored planet, draw orbit slot circles as dashed arcs, color = `ringColor` at alpha 0.15. Occupied slots drawn at alpha 0.25.
4. **Moon trails.** For each orbiting moon, draw trail as 12 circles of decreasing radius (3 -> 1px) and decreasing alpha (0.4 -> 0.0), using moon color.
5. **Planets.** For each planet:
   - Draw filled circle at planet color.
   - Draw a subtle radial gradient highlight (lighter at top-left, simulating light source).
   - Draw breathing glow: outer ring at `planet.color` with alpha `0.1 + 0.05 * sin(pulseTimer)`.
6. **Moons.** For each moon:
   - `'flying'`: white filled circle with short motion blur (2-3 ghost copies behind at lower alpha).
   - `'capturing'`: circle with growing bright ring (lerp radius from 0 to orbitRadius over 0.2s at low alpha).
   - `'orbiting'`: filled circle, white with slight tint matching planet color.
   - `'shattering'`: not drawn (replaced by particles).
7. **Particles.** Filled circles, radius * life, color with alpha = life.
8. **Aim line.** If `drag.active`:
   - Draw a dotted line from `drag.origin` in the launch direction (slingshot reversed from drag).
   - If `drag.targetPlanet`, draw a highlight ring around it (pulsing white at alpha 0.3).
   - Draw the moon preview at `drag.origin` (white circle, alpha 0.5).
9. **Score popups.** Text rendered at popup position, alpha = life, font = bold 20px.
10. **HUD.** Top-left: score as large number with label "MOONS" beneath. Top-right: best score. Font: bold 32px / 14px sans-serif, white, alpha 0.9.

### Menu Screen
- Starfield background (same stars).
- Title "ORBIT KEEPER" in bold 44px, white, vertically centered - 60px.
- Subtitle "Tap and drag to launch moons" in 18px, #aaa, centered + 10px.
- "Tap to Start" pulsing alpha (sin oscillation 0.4-1.0) centered + 50px.
- A decorative animated planet with 3 orbiting moons, slowly spinning at center-right area.

### Game Over Screen
- Dim the playing field (draw a semi-transparent black overlay, alpha 0.6).
- "GAME OVER" in bold 44px, #FF6B6B, centered - 40px.
- "Moons: [score]" in 28px white, centered.
- "Best: [bestScore]" in 20px #aaa, centered + 30px.
- "Tap to Retry" pulsing, centered + 70px.

## 5. INPUT HANDLING

**The default InputManager does not support drag.** We need to add drag tracking.

### Modifications to `input.js` -- NONE. Instead, add drag handling directly in game.js:

Register on canvas in Game constructor:
- `pointerdown` -> record `drag.originX/Y`, set `drag.active = true`.
- `pointermove` -> if `drag.active`, update `drag.currentX/Y`.
- `pointerup` -> if `drag.active` and drag distance > 30px, launch moon. Set `drag.active = false`.
- `touchstart/touchmove/touchend` -> same via `e.touches[0]`, with `preventDefault()` on touchmove.

We use pointer events as primary (covers mouse + touch), with touch fallback for older browsers.

**Input flow:**
1. Player presses down on empty space -> drag begins, aim line appears.
2. Player drags toward a planet -> aim line shows direction (slingshot: moon goes opposite of drag direction, like Angry Birds).

   **CORRECTION: Re-reading the spec** -- "drag toward a planet to aim, release to launch." So the launch direction IS the drag direction (origin -> current). The moon flies from origin toward where you dragged. This is more intuitive for kids.

3. Player releases -> moon launches from origin point, traveling in the direction of (current - origin), at fixed speed.
4. If drag distance < 30px, treat as a tap (cancel, no launch). This prevents accidental micro-launches.

**Menu/GameOver:** A tap (pointerdown + pointerup within 30px and 300ms) on these screens triggers start/restart. We detect this via the drag system: if drag distance < 30px on release, it counts as a tap.

## 6. PROGRESSION

### Difficulty Curve

| Planets Spawned | Spawn Interval | Moon angular speed multiplier | Notes |
|---|---|---|---|
| 0-2 | 5.0s | 1.0x | Tutorial-paced. Lots of room. |
| 3-5 | 4.1s | 1.1x | Getting busier. |
| 6-9 | 3.2s | 1.2x | Threading gaps becomes real. |
| 10-14 | 2.6s | 1.35x | Dense web of orbits. |
| 15+ | 2.0s | 1.5x | Maximum chaos. |

### Score Milestones (visual only, no gameplay impact)
- 5 moons: Quick flash of "NICE!" text.
- 10 moons: "AMAZING!" + brief screen flash white at alpha 0.1.
- 15 moons: "INCREDIBLE!" + all moons briefly trail rainbow.
- 20+: "LEGENDARY!" every 5 additional moons.

### Game Over Triggers
- All orbiting moons are destroyed (score drops to 0 after having been >= 1).
- No planets remain on screen and no new ones are pending (edge case: only if `planetsSpawned > 0`).
- There is NO time-based game over. The game is purely survival.

### Best Score
- Stored in `localStorage` key `'orbitkeeper_best'`.
- Updated whenever `score > bestScore` during play.

## 7. JUICE & FEEDBACK

### Particles
- **Moon capture:** 6 small white particles burst outward from lock point. Life = 0.5s.
- **Moon shatter:** 10-14 particles in moon's color + white mix, burst radially. Life = 0.8s. Radius 2-5px.
- **Chain reaction:** Each chain shatter adds a brief white flash circle expanding from impact point (radius 0 -> 60px over 0.3s, alpha 1 -> 0).
- **Planet collision (moon hits planet surface):** 8 particles in planet's color, life = 0.6s.
- **Miss (moon flies off-screen or times out):** 4 tiny grey particles, subtle.

### Screen Shake
- Moon shatter: shakeAmount = 5px.
- Chain reaction of 3+: shakeAmount = 10px.
- Planet lost (drifted off screen with moons): shakeAmount = 8px.
- Decay: multiply by `(1 - 12 * dt)` each frame, clamp to 0.

### Sound Effects (synthesized via Web Audio -- no files needed)
Generate all SFX procedurally in audio.js using OscillatorNode + GainNode envelopes:
- **launch:** Short rising tone, 200Hz -> 400Hz over 0.1s, sine wave, quiet.
- **capture:** Pleasing "ding" -- 800Hz sine, sharp attack, 0.3s decay. Pitch increases slightly with combo count (800 + comboCount * 50, capped at 1200).
- **shatter:** White noise burst, 0.15s, bandpass filtered at 2000Hz. Volume proportional to chain size.
- **perfect:** Same as capture but add a second harmonic at 1200Hz, creating a chord.
- **planet_arrive:** Low rumble -- 80Hz sine, 0.5s fade in/out.
- **gameover:** Descending three-note sequence: 400Hz, 300Hz, 200Hz, each 0.2s, triangle wave.
- **milestone:** Quick ascending arpeggio: 400, 600, 800, 1000Hz, each 0.05s, sine.

### Visual Juice
- **Aim line:** Dotted line with animated dash offset (flows toward target).
- **Target planet highlight:** White ring pulses in/out (alpha 0.1-0.3, period 0.5s).
- **Moon capture flash:** Brief white circle expands from moon, radius 0 -> 30px, alpha 1 -> 0 over 0.15s.
- **Planet breathing:** Gentle glow radius oscillation, +/- 3px, period 2s.
- **Orbiting moon trails:** 12-point trail, fading. Creates the "web" visual described in the concept.
- **Score counter:** When score increases, briefly scale the HUD number to 1.3x then ease back to 1.0x over 0.2s (use a `scoreDisplayScale` variable).
- **Background:** Very subtle slow-scrolling star parallax (stars at different "depths" move at 0.5-2 px/s in one direction).

## 8. FILE STRUCTURE

### Files to CREATE:

**`js/objects.js`** (loaded as non-module script before main.js)
- `Planet` class/constructor
- `Moon` class/constructor  
- `Particle` class/constructor
- `ScorePopup` class/constructor
- Helper: `dist(x1,y1,x2,y2)`, `normalize(x,y)`, `lerp(a,b,t)`
- Helper: `randRange(min,max)`, `randAngle()`
- All orbit slot math (computing slot radii from planet radius)

**`js/synth.js`** (loaded as non-module script before main.js)
- `SynthAudio` object with methods: `init(audioCtx)`, `playLaunch()`, `playCapture(combo)`, `playShatter(chainSize)`, `playPerfect()`, `playPlanetArrive()`, `playGameOver()`, `playMilestone()`
- Each method creates oscillator + gain nodes, schedules envelope, and auto-disconnects.

### Files to MODIFY:

**`index.html`** -- Add two script tags:
```html
<script src="js/synth.js"></script>
<script src="js/objects.js"></script>
```
(before the `<script type="module" src="js/main.js">` line)

**`js/game.js`** -- Replace entirely with Orbit Keeper implementation:
- Constructor: init all game state vars, starfield, register pointer/touch events for drag.
- `loadAssets()`: generate starfield, call SynthAudio.init().
- `start()`: reset all arrays, spawn first planet immediately, set timers.
- `updatePlaying(dt)`: full game loop as described in section 3.
- `renderPlaying()`: full render pipeline as described in section 4.
- `renderMenu()`: custom menu screen with animated demo planet.
- `renderGameOver()`: overlay with stats.
- `gameOver()`: save best score, stop gameplay.
- `restart()`: call Poki commercial break, then reset.
- Private methods: `spawnPlanet()`, `launchMoon(ox, oy, dx, dy)`, `shatterMoon(moon)`, `spawnParticles(x, y, count, color, speed)`, `checkCollisions()`, `findTargetPlanet(ox, oy, dx, dy)`.

**`js/input.js`** -- NO CHANGES. Drag is handled in game.js directly on the canvas.

**`js/audio.js`** -- NO CHANGES. We use the existing `GameAudio.initContext()` to get the AudioContext, then pass it to SynthAudio.

**`js/poki.js`** -- NO CHANGES.

**`css/styles.css`** -- NO CHANGES.

**`js/main.js`** -- NO CHANGES.

## 9. EDGE CASES

### Mobile vs Desktop
- **Pointer events** handle both mouse and touch uniformly. Fallback touch listeners added for older WebViews.
- **Canvas coordinates:** All pointer positions converted from `clientX/Y` via `canvas.getBoundingClientRect()` to handle any CSS scaling discrepancies.
- **Drag threshold:** 30px minimum drag distance prevents accidental taps from launching moons. On mobile where fingers are imprecise, this is critical.
- **Touch-action: none** already in CSS prevents scroll/zoom interference.
- **Fat finger tolerance:** Planet target detection uses generous 200px lateral tolerance from aim ray.

### Resize Handling
- On `window.resize`, canvas dimensions update (already handled by template).
- All game objects use absolute pixel positions -- no recalculation needed since canvas just crops/extends.
- Stars use normalized 0-1 coordinates, multiplied by canvas size each frame, so they redistribute on resize.
- HUD positions are computed from canvas.width/height each render frame.
- Screen scale factor `min(canvasW, canvasH) / 800` applied to planet/moon radii and font sizes so the game looks proportional on all screens.

### Pause/Resume
- Poki's `visibilitychange` handler already pauses/resumes gameplay tracking.
- The `dt` clamp to 0.1s in the game loop prevents physics explosions after tab switch.
- No explicit pause menu needed (Poki games typically don't have one; the tab-away handles it).

### Performance Considerations
- **Collision checking:** Moons array is small (typically < 30). N^2 pair check is fine at this scale.
- **Particle cap:** Maximum 200 particles. If exceeded, oldest particles are removed.
- **Chain reaction cap:** Maximum 20 shatters per chain to prevent frame-length spikes.
- **Trail rendering:** Fixed 12 points per moon. With 20 moons = 240 small circles. Trivial for canvas.

### First-Play Experience
- First planet spawns immediately (0.5s after game starts, not waiting for full spawn interval).
- First planet drifts slowly toward screen center and has generous orbit slots.
- No tutorial text. The aim line + target highlight teach the mechanic visually.
- If the player doesn't interact for 5 seconds, briefly pulse the first planet brighter as a hint.

### Extreme Cases
- **Max planets on screen:** Cap at 8. If 8 planets exist, don't spawn more until one leaves or is cleared.
- **Zero planets:** If no planets on screen and spawn timer hasn't fired, reduce timer to 0.5s.
- **Very small screens (< 400px width):** Scale factor ensures planets/moons are still visible but tighter. Orbit slots compress proportionally.
- **Very large screens (> 1920px):** Scale factor prevents things from being microscopic. Max scale factor capped at 1.5x.

---

This plan covers every system needed for Orbit Keeper. The two new files (`objects.js` for game entities/math, `synth.js` for procedural audio) plus the rewritten `game.js` form the complete implementation. The game is playable from frame one: tap, drag, launch, orbit, survive.