The plan is written to `PLAN.md`. Here's a summary of the key decisions:

**Physics**: Matter.js via CDN -- handles rigid bodies, constraints (ropes), collision detection, and sleeping. No custom physics engine.

**Architecture**: 8 new JS files, each with a focused responsibility:
- `physics.js` - Matter.js wrapper
- `objects.js` - Boulder, Rope, Platform, Seesaw, Ramp, GoblinCamp, Cradle
- `levels.js` - 40 level definitions + loader
- `camera.js` - viewport transforms + shake
- `particles.js` - visual particle system
- `cut.js` - swipe detection + rope intersection
- `ui.js` - HUD, menus, level select, result screen
- `sfx.js` - procedural audio (no files to load)

**Core loop**: Player swipes to cut ropes in `playing` state -> physics cascades in `watching` state -> settles -> check if all camps destroyed -> `result` or back to `playing`.

**Progression**: 40 levels across 4 themed worlds, 3-star rating per level, new boulder types unlocked at levels 11/21/31. LocalStorage persistence.

**No fail state**: players can always make more cuts. Stars incentivize efficiency. This keeps it frustration-free for the young Poki audience.

**All rendering is Canvas2D paths** -- zero image assets, instant load, zero download overhead.

**10 detailed level designs** are included for world 1, with a difficulty curve table for all 40 levels.