The plan is written to `PLAN.md`. Here's a summary:

**Claim Rush** is a grid-based territory capture game (Xonix/Qix style) on an 80x80 cell arena.

**Key design decisions:**

1. **Grid-based movement** - Player and rivals move in 4 cardinal directions at constant speed, snapping direction changes to grid intersections. Always moving, no stop state.

2. **Territory claim via flood fill** - Leave safe territory, draw a trail loop, return to your color. BFS from rival positions determines which enclosed regions get claimed.

3. **6 new files** - `arena.js` (grid/flood-fill), `player.js`, `rival.js`, `particles.js`, `synth.js` (procedural audio), plus a full rewrite of `game.js`.

4. **Rival AI** with 3 behaviors - patrol, claim territory for themselves, and hunt the player's exposed trail. Aggression scales with level.

5. **8 levels** scaling from 1 rival at speed 5 to 5 rivals at speed 8.5, with player always at speed 8 (advantage that shrinks).

6. **Mobile-first input** - Swipe steering (drag to change direction continuously). Desktop uses arrow keys or mouse direction.

7. **All sounds procedurally generated** via Web Audio oscillators - no audio files needed.

8. **Juice**: claim-burst particles, death explosions, trail sparkles, screen shake, color flashes, floating score text, HUD percentage bounce.

9. **Edge cases covered**: self-crossing trails = death, simultaneous collisions favor player death, wall bouncing, resize-safe rendering, tab pause/resume, 200-particle cap, ad integration between levels.

The plan is ready for implementation. Shall I proceed to code it?