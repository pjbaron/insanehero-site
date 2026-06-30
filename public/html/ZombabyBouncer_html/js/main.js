// main.js - boot, title screen, fixed-step game loop, reactive fill layout,
// on-screen touch controls, pause, and Poki SDK integration.
(function (global) {
  "use strict";

  // Design height is LOCKED at 480; the design WIDTH flexes to the window aspect so
  // the canvas is filled edge-to-edge (Poki requires full-screen cover, no bars).
  const DESIGN_H = 480;
  const View = global.View || (global.View = { w: 640, h: DESIGN_H, scale: 1, dpr: 1 });

  let canvas, ctx, game = null, state = "loading";
  let paused = false;

  // ----- On-screen touch controls --------------------------------------------
  // touchMode follows the LAST INPUT ACTUALLY USED (seeded from the primary pointer):
  // a real touch turns the buttons on, a mouse/keyboard action turns them off. So a
  // touchscreen laptop driven with a mouse never shows phantom mobile buttons (a Poki
  // QA flag). Keyboard always drives the game regardless (input.js owns its keys).
  let touchMode = !!(global.matchMedia && global.matchMedia("(pointer: coarse)").matches);
  global.IS_TOUCH = touchMode;            // physics.js reads this to pick hint/label text
  let btn = { brake: null, faster: null, r: 44, m: 20 };
  const activePointers = new Map();       // pointerId -> 'brake' | 'faster'

  function setTouchMode(on) {
    if (touchMode === on) return;
    touchMode = on;
    global.IS_TOUCH = on;
    if (!on) {                            // switched to mouse/keyboard: release held buttons
      for (const action of activePointers.values()) Input.setVirtual(action, false);
      activePointers.clear();
    }
  }

  function layoutButtons() {
    const W = View.w, H = View.h;
    // Real-pixel thumb sizing, then convert to design units (divide by cssScale).
    const minDimCss = Math.min(global.innerWidth, global.innerHeight);
    const r = Math.max(52, Math.min(120, minDimCss * 0.14)) / View.scale / 2;
    const m = Math.max(16, minDimCss * 0.04) / View.scale;
    btn.r = r; btn.m = m;
    btn.brake = { cx: m + r, cy: H - m - r, label: "BRAKE" };
    btn.faster = { cx: W - m - r, cy: H - m - r, label: "GO" };
    global.BTN_TOP_Y = (H - m - r) - r;   // physics.js anchors the control hint above this
  }

  function buttonAt(dx, dy) {
    for (const key of ["brake", "faster"]) {
      const b = btn[key];
      if (!b) continue;
      // Generous square hit zone around the visible circle for fat-thumb tolerance.
      if (Math.abs(dx - b.cx) <= btn.r * 1.4 && Math.abs(dy - b.cy) <= btn.r * 1.6) return key;
    }
    return null;
  }

  function drawButtons() {
    if (!touchMode || state !== "playing" || !game || game.waitForReset || paused) return;
    for (const key of ["brake", "faster"]) {
      const b = btn[key];
      const held = [...activePointers.values()].includes(key);
      ctx.beginPath();
      ctx.arc(b.cx, b.cy, btn.r, 0, Math.PI * 2);
      ctx.fillStyle = held ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.18)";
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold " + Math.round(btn.r * 0.42) + "px Hobo, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.label, b.cx, b.cy);
    }
  }

  // ----- Reactive viewport ----------------------------------------------------
  function resize() {
    const dpr = global.devicePixelRatio || 1;
    const cssW = global.innerWidth, cssH = global.innerHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    const scale = cssH / DESIGN_H;        // lock height, fill width
    View.w = cssW / scale;
    View.h = DESIGN_H;
    View.scale = scale;
    View.dpr = dpr;
    layoutButtons();
  }

  // Map a client (screen) point into design-space coordinates.
  function toDesign(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) / View.scale, y: (clientY - r.top) / View.scale };
  }

  // ----- Title / mute ---------------------------------------------------------
  function drawTitle() {
    const W = View.w, H = View.h;
    // Cover-fit the title art (preserve aspect, fill the canvas).
    const bg = Assets.img("ui_titlescreen");
    const s = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
    const bw = bg.naturalWidth * s, bh = bg.naturalHeight * s;
    ctx.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh);

    const t = Assets.img("ui_title");
    const ts = Math.min(1, (W * 0.8) / t.naturalWidth);
    ctx.drawImage(t, W / 2 - t.naturalWidth * ts / 2, 28, t.naturalWidth * ts, t.naturalHeight * ts);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "48px Hobo, sans-serif";
    ctx.fillStyle = "#ffff00";
    ctx.fillText("PLAY", W / 2, H * 0.62);
    ctx.font = "22px Hobo, sans-serif";
    const cta = touchMode ? "tap to start" : "click to start";
    ctx.lineWidth = 4; ctx.strokeStyle = "#7a1500";
    ctx.strokeText(cta, W / 2, H * 0.62 + 40);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(cta, W / 2, H * 0.62 + 40);
  }

  // mute button (top-left). Sized in design units; hit-tested in design space.
  function muteBox() {
    const im = Assets.img("ui_mute_on");
    const scale = 0.5;
    return { x: 8, y: 8, w: im.naturalWidth * scale, h: im.naturalHeight * scale };
  }
  function drawMute() {
    // ui_mute_off shows when sound is ON, ui_mute_on when muted (original behaviour)
    const im = Assets.img(Sound.muted ? "ui_mute_on" : "ui_mute_off");
    const b = muteBox();
    ctx.drawImage(im, b.x, b.y, b.w, b.h);
  }

  // ----- Game flow ------------------------------------------------------------
  function startGame() {
    Input.clear();
    paused = false;
    game = new Physics();
    if (global.DEV_TOOLS) global.__game = game;   // test hook (stripped from release)
    state = "playing";
    Sound.music("tune1", true);
  }

  // Restart from an end screen: fire the interstitial FIRST (a no-op while ads are
  // off), then start the next run - so the ad never plays over live gameplay.
  let restarting = false;
  async function restartRun() {
    if (restarting) return;
    restarting = true;
    try { await Poki.commercialBreak(); startGame(); }
    finally { restarting = false; }
  }

  // First-input gesture: claim keyboard focus (Poki runs us in an iframe) and start.
  function onStartInput() {
    if (global.focus) global.focus();
    if (state === "title") { startGame(); return true; }
    if (state === "playing" && game && game.waitForReset) { restartRun(); return true; }
    return false;
  }

  // ----- Pointer input --------------------------------------------------------
  function onPointerDown(e) {
    e.preventDefault();
    setTouchMode(e.pointerType === "touch");

    // Mute toggle (works for mouse and touch). A mute click never also starts a run.
    const d = toDesign(e.clientX, e.clientY);
    if (state !== "loading") {
      const mb = muteBox();
      if (d.x >= mb.x && d.x <= mb.x + mb.w && d.y >= mb.y && d.y <= mb.y + mb.h) {
        Sound.setMuted(!Sound.muted); Sound.play("click1"); return;
      }
    }

    // Paused (touch has no ESC key): a tap anywhere resumes.
    if (paused) { paused = false; return; }

    // Title / end-screen: any tap/click starts or restarts.
    if (state === "title" || (state === "playing" && game && game.waitForReset)) {
      onStartInput(); return;
    }

    // In-play touch buttons (touch only; a mouse player drives via the keyboard).
    if (state === "playing" && touchMode && !paused) {
      const key = buttonAt(d.x, d.y);
      if (key) { activePointers.set(e.pointerId, key); Input.setVirtual(key, true); }
    }
  }
  function onPointerUp(e) {
    const key = activePointers.get(e.pointerId);
    if (key) Input.setVirtual(key, false);
    activePointers.delete(e.pointerId);
  }
  function onPointerMove(e) {
    if (e.pointerType === "mouse") setTouchMode(false);
    if (!activePointers.has(e.pointerId)) return;
    const prev = activePointers.get(e.pointerId);
    const d = toDesign(e.clientX, e.clientY);
    const key = buttonAt(d.x, d.y);
    if (key === prev) return;
    Input.setVirtual(prev, false);                 // slid off the button
    if (key) { Input.setVirtual(key, true); activePointers.set(e.pointerId, key); }
    else activePointers.delete(e.pointerId);
  }

  // ----- Keyboard -------------------------------------------------------------
  function onKeyDown(e) {
    // A physical game key means a keyboard player even if we guessed touch - drop
    // touch mode so the on-screen buttons hide.
    if ([65, 68, 37, 39, 82].includes(e.keyCode)) setTouchMode(false);

    // ESC / P: pause-resume during active play (Poki requirement). Folded into the
    // Poki playing state below, so the SDK stops on pause and restarts on resume.
    if (e.keyCode === 27 || e.keyCode === 80) {
      if (state === "playing" && game && !game.waitForReset) paused = !paused;
      return;
    }
    // Any other key starts the game from the title / acts as PLAY on the end screen.
    if (onStartInput()) return;
  }

  // ----- Poki gameplay tracking ----------------------------------------------
  let pokiPlaying = false;
  function syncPoki() {
    const playing = state === "playing" && game && !game.waitForReset && !paused;
    if (playing && !pokiPlaying) Poki.gameplayStart();
    else if (!playing && pokiPlaying) Poki.gameplayStop();
    pokiPlaying = playing;
  }

  // ----- Pause veil -----------------------------------------------------------
  function drawPauseVeil() {
    const W = View.w, H = View.h;
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff"; ctx.font = "56px Hobo, sans-serif";
    ctx.fillText("PAUSED", W / 2, H / 2 - 20);
    ctx.font = "24px Hobo, sans-serif";
    ctx.fillText(touchMode ? "tap to resume" : "press ESC to resume", W / 2, H / 2 + 30);
  }

  // ----- Loop -----------------------------------------------------------------
  let acc = 0, last = 0;
  const STEP = 1000 / 30;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!last) last = ts;
    acc += ts - last; last = ts;
    if (acc > 250) acc = 250;                 // avoid spiral of death
    while (acc >= STEP) {
      // Freeze the sim while a restart is resolving (its ad break is in flight).
      if (state === "playing" && game && !paused && !restarting) {
        game.update();
        // R mid-run restart routes through the SAME ad flow as the end-screen
        // restart (commercialBreak first, a no-op while ads are off), rather than an
        // instant reset - so in the release build it never restarts over an ad.
        if (game.requestRestart) { restartRun(); break; }
      }
      acc -= STEP;
    }
    syncPoki();

    // Render: lock the base transform so all drawing is in design space at DPR.
    ctx.setTransform(View.scale * View.dpr, 0, 0, View.scale * View.dpr, 0, 0);
    if (state === "title") drawTitle();
    else if (state === "playing" && game) {
      game.draw(ctx);
      if (paused) drawPauseVeil();
      drawButtons();
    }
    if (state !== "loading") drawMute();
  }

  // ----- Boot -----------------------------------------------------------------
  global.addEventListener("load", async () => {
    canvas = document.getElementById("c");
    ctx = canvas.getContext("2d");
    resize();
    global.addEventListener("resize", resize);
    global.addEventListener("orientationchange", resize);

    canvas.addEventListener("pointerdown", onPointerDown);
    global.addEventListener("pointerup", onPointerUp);
    global.addEventListener("pointercancel", onPointerUp);
    global.addEventListener("pointermove", onPointerMove);
    global.addEventListener("keydown", onKeyDown);

    // Ads are live ONLY in the stripped release build (DEV_TOOLS folded false).
    Poki.adsEnabled = !global.DEV_TOOLS;
    Poki.audioSink = Sound;
    await Poki.init();

    const drawLoading = (txt) => {
      ctx.setTransform(View.scale * View.dpr, 0, 0, View.scale * View.dpr, 0, 0);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, View.w, View.h);
      ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(txt, View.w / 2, View.h / 2);
    };
    drawLoading("Loading...");
    await Assets.load((d, t) => drawLoading("Loading " + d + "/" + t));

    Poki.gameLoadingFinished();
    state = "title";
    requestAnimationFrame(loop);
  });
})(window);
