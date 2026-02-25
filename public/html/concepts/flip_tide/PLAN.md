The plan is written to `PLAN.md`. Here's a summary of the key decisions:

**Architecture**: 4 new files (`entities.js`, `renderer.js`, `sfx.js`) plus modifications to `game.js` and `input.js`. All graphics are procedural canvas drawing, all audio is synthesized via Web Audio -- zero external assets, instant load.

**Core Gameplay**: Two lanes (surface at 35% height, ceiling at 65%). Surfer is fixed at 20% X, world scrolls right. Tap flips between lanes with a 0.25s ease-out transition. Hold slows the transition for more float time. One-hit death.

**Difficulty**: Driven by distance (0-20,000 to reach max). Speed ramps from 200 to 440 px/s, gaps shrink by 40%, cave narrows from 30% to 14% of screen height. Riptide reverse zones appear after distance 5000.

**Key design choices**:
- 800px virtual width with scale factor for resolution independence
- Queued flip input (1 flip buffered) to prevent eaten inputs
- Particle pool of 200 for mobile performance
- No tutorial -- ramp handles teaching (first obstacle at 200 distance, ceiling obstacles after 500, riptides after 5000)
- 7 unlockable skins driven by lifetime shell collection
- Near-miss bonus (+5 distance) for passing within 10px of obstacles

**Build order**: 13 steps from skeleton to polish, each producing a testable increment.