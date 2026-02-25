Here's the implementation plan for **Fold Over**:

## Summary

The plan is written to `PLAN.md` in the working directory. Here are the key design decisions:

### Core Architecture
- **4 new files**: `levels.js` (30+ hand-authored puzzles), `paper.js` (fold logic + undo stack), `renderer.js` (all drawing), `particles.js` (celebration effects)
- **Modify**: `game.js` (full game logic), `input.js` (add drag tracking), `index.html` (new script tags)

### Fold Mechanic
- Fixed-size grid (3x3 up to 6x6). Each cell holds a single visible color or null.
- Drag across the paper: start position snaps to nearest grid line, drag direction picks the fold side. One gesture = one fold. No two-step process.
- Folding mirrors one half onto the other, overwriting destination colors. Folded-away cells become null.
- Undo stack stores deep copies of the grid (cheap at max 36 cells).

### Progression
- 30+ levels in 4 difficulty tiers: Tutorial (3x3, 1-2 folds), Easy (3x3-4x4, 2-3), Medium (4x4, 3-4), Hard (4x4-5x5, 4-6)
- Star rating: 3 stars = at/under par, 2 = par+1, 1 = any completion
- No star gates -- completing any level unlocks the next

### Zero-Asset Design
- All SFX generated procedurally via Web Audio oscillators (no files to load)
- All graphics are canvas-drawn (no images)
- Instant load, zero network requests beyond the page itself

### Mobile-First
- Single drag gesture for folding (touch-native)
- 44px minimum tap targets, 15px dead zone before drag registers
- Portrait/landscape adaptive layout
- Poki lifecycle: `commercialBreak()` every 3rd completed level

### Key Edge Cases Addressed
- Fold animation (0.35s ease-in-out 3D perspective flip)
- Off-center folds where cells fold beyond grid edge (discarded)
- Resize without state loss (grid data is resolution-independent)
- localStorage failure graceful degradation