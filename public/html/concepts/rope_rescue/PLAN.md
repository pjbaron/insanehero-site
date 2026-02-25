The implementation plan is written to `PLAN.md`. Here's a summary of the key design decisions:

**Architecture**: 4 new files (`physics.js`, `synth.js`, `particles.js`, `levels.js`) as global non-module scripts, plus modifications to `game.js` and `input.js`.

**Core design choices**:
- **No external physics library** -- the physics are simple enough (line-segment collision, reflection, gravity) to handle with ~50 lines of math in `physics.js`
- **Procedural audio** via Web Audio oscillators -- zero asset files needed, instant load
- **Percentage-based layouts** so levels look correct on any screen size (portrait phone to landscape desktop)
- **Pointer events** (not separate mouse/touch) for unified drag handling
- **Object pooling** for particles to avoid GC stutters

**Difficulty curve**: 5 hand-tuned levels introducing mechanics one at a time (normal -> platforms -> heavy -> floaty -> twins), then procedural generation that scales spawn rate, geometry complexity, and rescue zone width.

**Poki integration**: Commercial breaks at level transitions (every 3 levels) and game over. gameplayStart/Stop wired to state changes. Tab visibility already handled by the template.

**Juice budget**: Screen shake on every bounce/rescue/splat, color-coded ropes that degrade visually, combo text that scales with multiplier, slow-mo on big combos, and 9 procedural sound effects.