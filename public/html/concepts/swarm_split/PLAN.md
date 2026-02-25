The implementation plan is written to `PLAN.md`. Here's a summary:

**File structure:** 3 new files + 2 modified files
- `js/synth.js` - Procedural Web Audio SFX (no asset files needed)
- `js/swipe.js` - Touch/mouse drag & swipe tracking
- `js/levels.js` - Level data (10 hand-crafted + procedural generation beyond)
- `js/game.js` - Complete rewrite (~700-800 lines)
- `index.html` - Add 3 new script tags

**Key design decisions:**
1. **Virtual coordinate system (800x600)** scaled to fit any screen - prevents distortion on mobile vs desktop
2. **Swipe vs tap disambiguation** at 40px threshold - prevents accidental splits
3. **Procedural audio synthesis** - no mp3 files to load, instant startup
4. **Spatial grid** for critter separation checks - keeps 200 critters at 60fps
5. **Combat uses fractional accumulators** - smooth kill rates rather than discrete ticks
6. **Split detection** checks which side of the swipe line each critter falls on using cross product
7. **Minimum 3 critters** to split - prevents degenerate empty-swarm states
8. **All new files are non-module globals** matching the template pattern (poki.js, audio.js style)

**10 levels** escalating from 1 base / 15 critters to 5 bases + hazard zones / 50 critters, then procedural generation for endless play. Star ratings based on time remaining (3/2/1 at 2/3, 1/3 thresholds).