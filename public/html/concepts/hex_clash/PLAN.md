The plan is written to `PLAN.md`. Here's a summary of the key design decisions:

**Coordinate system**: Axial hex coordinates (not offset) -- makes the "shrinking border" trivial since distance-from-center is a single formula. Flat-top hexagons, radius-4 board = 61 cells.

**Turn flow**: Player selects a piece from a 2-3 piece offer tray, taps to place, then capture logic runs. AI takes its turn with a brief visual delay. Captures happen when an enemy group is fully surrounded (all adjacent cells occupied). Chain captures cascade with increasing juice.

**6 files to create**: `hex.js` (grid/math), `pieces.js` (shapes/rotation), `ai.js` (opponent logic), `effects.js` (particles/shake), `renderer.js` (all drawing), `league.js` (progression/save). Plus modifications to `game.js`, `input.js`, and `index.html`.

**Key mobile decisions**: No drag-and-drop (tap only), minimum 40px hex targets, no hover on mobile (use glowing valid cells instead), offer tray sized for 48px+ tap targets.

**Pacing**: 60-second rounds, board shrinks every 15 seconds (radius 4->3->2->1) forcing confrontation. First few turns give easy pieces to teach through play -- no tutorial text.

**AI**: 5 difficulty levels from random placement to full position evaluation, with 3 playstyle modifiers (aggressive/defensive/sneaky) applied as score bonuses. 5 leagues with 3 named rivals each.