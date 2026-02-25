The implementation plan is written to `PLAN.md`. Here's a summary of what it covers:

**Game Objects (6 types):** Player (fixed-x, vertical movement), Obstacles (5 types with distinct sizes/colors), Ricochets (bouncing projectiles from shrunk obstacles), Beams (visual shrink ray effect), Reverse Ray Pickups, Particles, and Floating Text.

**Core Loop:** Obstacles scroll from right. Tap to shrink them (scores points, builds combo) but each shrunk obstacle becomes a fast-bouncing ricochet. Player dodges vertically. One-hit death. Reverse ray pickup lets you neutralize a ricochet by re-growing it.

**Key Design Decisions:**
- **No audio files** -- all SFX are procedurally generated via Web Audio oscillators (`synth.js`)
- **3 new files:** `entities.js`, `synth.js`, `renderer.js` -- all non-module globals
- **Input handling:** Pointer tracking added in `game.js` directly (no changes to `input.js`). Touch-drag for movement, tap for shrinking. Desktop gets mouse-follow + keyboard override.
- **Difficulty:** 11 tiers over ~5 minutes of play, ramping spawn rate, obstacle speed, and ricochet caps
- **Scoring:** Area-based points with combo multiplier (up to x5), 1.5s combo window, graze bonus for near-misses

**Mobile-First:** Fat-finger-friendly tap targets (+15px expansion), slightly larger obstacles on mobile, no crosshair on touch devices, touch-drag for movement vs tap-to-shrink disambiguation.

The plan includes specific numbers for all speeds, sizes, timings, colors, and thresholds so implementation can proceed without ambiguity.