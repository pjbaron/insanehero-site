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

Click/tap **PLAY**. Controls: **D / Right** = faster, **A / Left** = brakes, **R** =
restart, **ESC** = pause. On mobile use the on-screen **GO** / **BRAKE** buttons.
Grab syringes to reset the infection; reach the hospital before the baby turns zombie.

## Layout

```
index.html            canvas + script tags + Poki SDK + DEV_TOOLS flag
js/planck.min.js      physics engine (vendored, planck 1.4.2)
js/poki.js            Poki SDK wrapper (init, gameplay events, ad breaks; no-op offline)
js/input.js           keyboard state + virtual buttons; brake()/faster() action helpers
js/assets.js          image / audio / font loading, Sound helper, incognito-safe Store
js/ragdoll.js         the baby ragdoll  (port of src/ragdoll.as)
js/physics.js         the game: pram, hill, scenery, needles, reactive HUD, win/lose
js/main.js            boot, title, fixed 30fps loop, reactive fill layout, touch
                      controls, pause, Poki integration
assets/grfx/*.png     original art
assets/audio/*.ogg    sfx + music (the build re-encodes the music to mono 64k)
assets/fonts/hobo.*   the embedded Hobo font, extracted from the SWF and rebuilt
build.js              two-path build (release/ and release-test/) - see below
tools/compress_image.py   Pillow image optimiser used by the build
```

## Poki build

`npm install` once, then:

```
npm run build          # -> release/        SUBMIT THIS  (DEV_TOOLS off, ads ON, minified)
npm run build:test     # -> release-test/   on-Poki playtesting (DEV_TOOLS on, ads OFF)
```

The build bundles+minifies the game scripts into `js/game.min.js`, optimises the PNGs
(Pillow) and down-bitrates the music to mono 64 kbps (ffmpeg), then rewrites
`index.html` to load the bundle and set the `window.DEV_TOOLS` literal. Total shipped
size is ~3 MB (well under Poki's 8 MB target). Needs `python`+`Pillow` and `ffmpeg` on PATH.

Poki readiness (mirrors the overbite reference):
- Reactive fill layout: locked design height (480), flexed width, DPR-aware, no letterbox.
- Touch controls: on-screen BRAKE/GO buttons (last-input-wins), HUD relaid out so nothing
  overlaps the buttons or the mute icon in portrait or landscape.
- SDK events: `gameLoadingFinished` on load, `gameplayStart` on first input,
  `gameplayStop` on end-screen/pause/tab-hidden, `commercialBreak` between runs (ads only
  in the release build). Audio is muted for the duration of an ad.
- ESC/P pauses on desktop (firing the SDK events); a tap resumes on touch.
- Incognito-safe `localStorage` (best distance + mute preference persist, wrapped in
  try/catch). The only external request is the Poki SDK CDN script.

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

Poki-ready: reactive fill layout, on-screen touch controls, pause, Poki SDK events +
ad breaks, incognito-safe storage, asset compression, and a stripped release build
(see "Poki build" above). The mute button is wired (top-left).

Intentionally not ported (original relied on dead services or is non-essential):
- Mochi leaderboards / MochiAds, FGL & swfStats tracking, the sponsor site-lock check.
- The credits dialog, difficulty menu, and animated preloader (the `dialog`,
  `menubtn`, `preloaderbg` symbols are extracted under `../tools/out/` if you want them).
- Dust uses a simple procedural puff rather than the original `fx_dust_gfx` clip.

Notes for a production submission:
- planck reproduces Box2D closely but not bit-identically; if the feel differs,
  the tunables are the impulse magnitudes and joint limits in `physics.js`/`ragdoll.js`.
- Before submitting, run the release build through the Poki Inspector
  (https://inspector.poki.dev/) and verify each module against the live tool.
```
