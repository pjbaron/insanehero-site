The plan is written to `PLAN.md`. Here's a summary of the key design decisions:

**Pseudo-3D approach**: Pure 2D canvas with a `project(worldX, worldZ)` function that converts world coordinates to screen space via a simple perspective divide. No 3D library needed -- just trapezoids for road segments.

**6 files to create**: `constants.js`, `sfx.js`, `track.js`, `player.js`, `particles.js`, `renderer.js` -- all as non-module globals loaded before `main.js`.

**Track system**: Segments are straight road pieces between forks. Forks hold 2-3 branch references. Generated on-demand 600 Z-units ahead, culled 50 Z-units behind. A weighted random picks segment types (boost/mud/bridge/dead-end/ramp) with difficulty scaling.

**Input**: Existing InputManager gets swipe detection added (touchstart/end delta). Also tap-zone detection (left half vs right half of screen). Desktop uses arrow keys / A/D.

**Two death conditions only**: Dead-end crumble and bridge fall-off. Keeps it simple -- the core challenge is decision-making, not dexterity.

**Speed curve**: 200 -> 800 over ~2 minutes, formula `min(200 + distance * 0.03, 800)`. Fork segments get shorter as speed increases, compressing decision windows.

**All SFX synthesized procedurally** via Web Audio oscillators/noise -- no audio assets needed.

**Post-run ghost overlay**: A miniature top-down route map comparing player choices vs optimal path, driving the "one more try" hook.

**First-time experience**: No tutorial text. First 3 forks are easy 2-way with obvious good/bad choices. Default to the better branch if player gives no input on the first fork.

The plan covers all 9 requested sections with specific numbers for speeds, colors, sizes, probabilities, and timings. Implementation order is at the bottom (Section 10).