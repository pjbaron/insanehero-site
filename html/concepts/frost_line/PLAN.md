The implementation plan is written to `PLAN.md`. Here's the summary:

**6 new files**, 1 modified file, ~930 lines total:

| File | Purpose | ~Lines |
|------|---------|--------|
| `js/collision.js` | Geometry math: line-circle, circle-circle, reflection, segment intersection | 80 |
| `js/particles.js` | Pooled particle system (200 max), radial burst helpers | 60 |
| `js/sfx_gen.js` | Procedural sound via OfflineAudioContext (8 effects, zero asset files) | 100 |
| `js/entities.js` | Fireball, IceWall, FireDemon, Snowflake, ScorePopup data classes | 120 |
| `js/draw_input.js` | Pointer drag tracking for draw-to-defend mechanic | 70 |
| `js/game.js` | Complete rewrite: all game state, update loop, rendering, menus | 500 |

**Key design decisions:**
- **No image assets** -- everything is canvas primitives (arcs, lines, glows). Instant load.
- **No audio files** -- all 8 SFX synthesized procedurally via Web Audio. Zero HTTP requests.
- **Drag-to-draw** uses PointerEvents (unified mouse+touch). Short tap = shatter nearest wall.
- **Ink system** caps at 100, regenerates at 25/s, costs 0.5 per pixel of wall drawn. Max wall length 120px, max 15 walls on screen.
- **Demons are blocked by walls** (the core defense mechanic) but fireballs melt through walls (0.5 hp per hit, walls have 1.0 hp).
- **Difficulty** ramps via spawn interval decay (3.0s down to 0.8s min) and demon speed increase (+0.3 px/s per second). Fireball splits at 2000/6000/15000 score.
- **3 lives** = 3 snowflakes can be destroyed before game over. Multiplier (x1.0 +0.5 per safe exit) resets on death for risk/reward tension.
- **All helper files are non-module globals** loaded via `<script>` tags before the module `main.js`, keeping the architecture flat and simple.