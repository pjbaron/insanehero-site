The implementation plan is written to `PLAN.md`. Here's a summary of the key decisions:

**Physics: Custom, no matter.js.** Blocks are rectangles stacking on rectangles â€” AABB collision + gravity + friction is sufficient and avoids a heavy dependency.

**5 new files:**
- `js/synth.js` â€” Procedural sound effects via Web Audio oscillators (zero audio files to load)
- `js/physics.js` â€” Gravity, friction, stacking collision, toppling rules
- `js/blocks.js` â€” Block types, sizing, color themes per round
- `js/effects.js` â€” Particles, floating text, screen shake
- `js/hazards.js` â€” Wind gusts, tremors, earthquake phases

**Modified files:** `game.js` (replace demo entirely), `input.js` (add touch zones for mobile nudge), `index.html` (add script tags)

**Core loop:** Drop blocks â†’ lock on tap â†’ physics settle â†’ periodic hazards â†’ earthquake at block threshold â†’ score survivors â†’ next round harder.

**Mobile controls:** Left 25% / right 25% of screen = nudge zones (hold), center = tap to lock. Quick taps anywhere always lock. No on-screen buttons cluttering the view.

**Play area:** Capped at 500px wide (centered on wider screens) to keep stacking fair across devices. All sizes scale from a 400px reference width.

**Difficulty:** Linear interpolation from round 1 to round 8 across all parameters (fall speed, hazard frequency, earthquake force, narrow block chance), then capped.

**Ad timing:** Poki commercial breaks between every 2 rounds, never during gameplay.