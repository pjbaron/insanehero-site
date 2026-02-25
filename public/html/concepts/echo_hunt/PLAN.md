The plan is written to `PLAN.md`. Here's a summary of the key decisions:

**Architecture**: 3 new files (`echo_hunt.js`, `creatures.js`, `synth.js`), minimal changes to template files. `EchoHuntGame extends Game` keeps the Poki lifecycle intact.

**Core loop**: Tap emits sonar ring from submarine -> ring expands revealing creatures as glowing silhouettes -> tap revealed creatures to catch -> pings also agitate predators that chase your sub. Drag moves the submarine.

**Key numbers**:
- 9 creature species across 5 depth zones, 3 predator types
- Ping expands at 400px/s, 40px detection band, 0.4s cooldown, max 3 active
- Creatures visible for 2s after reveal, predators agitated for 5s
- 3 HP, combo up to x5, quotas from 8 to 24
- All SFX procedurally generated (no audio files needed)

**Input**: Custom pointer tracking in `echo_hunt.js` for tap coordinates + drag detection. Template `InputManager` used only for keyboard fallback (Space to ping, arrows to move).

**No audio files, no image files** -- everything is canvas shapes and Web Audio oscillators. Instant load, zero assets.