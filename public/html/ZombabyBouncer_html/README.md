# Zombaby Bouncer - HTML5 port

A faithful JS/HTML5/canvas re-implementation of the original AS3 + Box2D Flash game.
The AS3 game logic was translated module-for-module; physics runs on **planck.js**
(a faithful Box2D 2.x port), art is the original PNGs, and the **Hobo** font was
extracted from the published SWF and rebuilt as a real WOFF2/TTF.

## Run it

Any static web server works (the game uses `fetch`/`Audio`, so `file://` won't do):

```
cd web
python -m http.server 8000
# open http://localhost:8000/
```

Click **PLAY**. Controls: **D / Right** = faster, **A / Left** = brakes, **R** = restart.
Grab syringes to reset the infection; reach the hospital before the baby turns zombie.

## Layout

```
index.html            canvas + script tags
js/planck.min.js      physics engine (vendored, planck 1.4.2)
js/input.js           keyboard state by keyCode
js/assets.js          image / audio / font loading + Sound helper
js/ragdoll.js         the baby ragdoll  (port of src/ragdoll.as)
js/physics.js         the game: pram, hill, scenery, needles, UI, win/lose (port of src/Physics.as)
js/main.js            boot, title screen, fixed 30fps loop
assets/grfx/*.png     original art
assets/audio/*.ogg    sfx + music (transcoded from the source WAVs, 52MB -> 3.6MB)
assets/fonts/hobo.*   the embedded Hobo font, extracted from the SWF and rebuilt
```

## How the assets were produced

- Art: copied straight from `../grfx`.
- Font: `../tools/flextract.py` pulled the Hobo glyphs out of the SWF;
  `../tools/fontbuild/build_font.py` flipped them to font orientation and ran
  svg2ttf/ttf2woff2 to make `hobo.ttf` / `hobo.woff2`.
- Audio: `ffmpeg` transcoded the source WAVs to OGG Vorbis.

## Status

Working: title, full physics gameplay (pram + wheels + 12-body ragdoll baby on a
procedural hill), camera follow, scenery generation, syringe pickups, infection
mechanic with baby->zombaby crossfade, dust FX, distance/speed/record HUD, stop-sign
markers persisting across runs, win ("SAFE!") and lose ("ZOMBABY!") screens, restart.

Intentionally not ported (original relied on dead services or is non-essential):
- Mochi leaderboards / MochiAds, FGL & swfStats tracking, the sponsor site-lock check.
- The credits dialog, difficulty menu, and animated preloader (the `dialog`,
  `menubtn`, `preloaderbg` symbols are extracted under `../tools/out/` if you want them).
- The mute button is loaded but not yet wired to a click handler.
- Dust uses a simple procedural puff rather than the original `fx_dust_gfx` clip.

Notes for a production submission:
- planck reproduces Box2D closely but not bit-identically; if the feel differs,
  the tunables are the impulse magnitudes and joint limits in `physics.js`/`ragdoll.js`.
- For Poki/CrazyGames you'd add their SDK calls (ad breaks, loading/gameplay events).
```
