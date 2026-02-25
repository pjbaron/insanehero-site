The implementation plan is written to `PLAN.md`. Here's a summary of the key design decisions:

**Architecture**: 4 new files (board.js, wire.js, particles.js as ES modules; synth.js as a global script for audio synthesis) plus a major rewrite of game.js. Only index.html gets one added script tag.

**Core Gameplay**: Grid-based circuit board where the player drags from source to target terminals. Wire paths follow 4-directional adjacency. Crossing a completed wire causes a short (loses a fuse). Energy bar drains continuously while a pair is active. Every 5 connections triggers a surge round with multiple simultaneous pairs.

**Key Numbers**:
- 3 fuses, 10s starting energy, 8x10 starting grid
- 6 wire colors cycling through pairs
- Combo multiplier: +1x every 3 clean connections, max 5x
- Scoring: path length * 10 * combo * surge bonus
- Difficulty: grid grows, obstacles increase, energy shrinks per level

**Mobile-First**: 32px minimum cell size, grid adjusts to screen dimensions, drag snaps to grid centers, backtracking by dragging over previous cells.

**All sounds synthesized** at runtime with Web Audio oscillators -- no audio files to load, instant start.

**No-tutorial design**: The first pair is simple (few obstacles, long timer). Glowing source terminal + pulsing target make the goal obvious. Drawing by dragging is discoverable.