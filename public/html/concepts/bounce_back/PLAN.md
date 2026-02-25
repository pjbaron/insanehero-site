The plan is written to `PLAN.md`. Here's a summary of the key design decisions:

**No external physics library** -- circle-vs-circle and circle-vs-line collisions are simple enough to implement in ~50 lines. Avoids a CDN dependency and keeps load instant.

**Virtual coordinate system (400x700)** -- all game logic runs in fixed virtual space, scaled to fit any screen. This eliminates all mobile/desktop/resize edge cases in one stroke.

**Procedural audio** -- all 10 SFX are generated via Web Audio oscillators at runtime. Zero asset files to load, zero network requests, instant start.

**Slingshot aiming** -- drag opposite to launch direction (pull-back feel). Dotted trajectory preview. Min drag distance of 20px prevents accidental launches from taps.

**5 files to create**: `synth.js` (audio), `physics.js` (collisions), `pegs.js` (layout generation), `particles.js` (effects), `renderer.js` (all drawing). Plus modifying `game.js` and `index.html`.

**Retention hooks**: combo system with escalating pitch, extra balls as survival mechanic (hit 10+ pegs = +1 ball), landing zone multipliers that slide to create tension, and round escalation with new obstacle types introduced gradually.

**Poki integration**: commercial breaks every 3 rounds at the natural round-end pause point, never interrupting active play.