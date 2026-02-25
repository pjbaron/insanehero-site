The implementation plan is written to `PLAN.md`. Here's a summary of the key design decisions:

**Architecture**: One new file (`js/lava-rise.js`) holds all game logic. `game.js` gets its demo code replaced with calls into the LavaRise systems. No changes to `input.js`, `audio.js`, or `poki.js`.

**Coordinate System**: Fixed 400-unit virtual width, height derived from aspect ratio. This makes gameplay identical across screen sizes.

**Core Loop**: Instant tap-to-jump (no hold delay -- better for mobile). Player alternates between walls with physics-based arcing jumps. Gravity pulls down, walls catch. Simple and snappy.

**Difficulty**: Single `difficultyLevel` float (0-1 over 2 minutes) drives everything -- lava speed (60->150), wall gap (400->220), spawn density. Clean single-knob tuning.

**Key Design Choices**:
- **No audio files** -- all SFX are procedurally generated via Web Audio oscillators = zero load time
- **No sprite sheets** -- player and all objects drawn with canvas primitives = instant start
- **Particle pooling** -- pre-allocated array of 200, reuse dead particles for performance
- **Coin slow-mo** -- 0.3s at 40% speed on collect, makes coin grabs feel impactful
- **Safe first 5 seconds** -- no obstacles, wide walls, brief invincibility for new players
- **0.8s input lockout** on game over to prevent accidental restart

The plan has specific numbers for every speed, size, timing, and color -- ready for implementation without ambiguity.