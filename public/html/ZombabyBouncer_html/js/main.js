// main.js - boot, title screen, fixed-step game loop.
(function (global) {
  "use strict";
  const GW = 640, GH = 480;
  let canvas, ctx, game = null, state = "loading";

  function fit() {
    const s = Math.min(window.innerWidth / GW, window.innerHeight / GH);
    canvas.style.width = (GW * s) + "px";
    canvas.style.height = (GH * s) + "px";
  }

  function drawTitle() {
    ctx.drawImage(Assets.img("ui_titlescreen"), 0, 0, GW, GH);
    const t = Assets.img("ui_title");
    ctx.drawImage(t, GW / 2 - t.naturalWidth / 2, 36);
    ctx.font = "48px Hobo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffff00";
    ctx.fillText("PLAY", GW * 0.70, GH * 0.5);
    ctx.font = "22px Hobo, sans-serif";
    ctx.lineWidth = 4; ctx.strokeStyle = "#7a1500";
    ctx.strokeText("click to start", GW * 0.70, GH * 0.5 + 40);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("click to start", GW * 0.70, GH * 0.5 + 40);
  }

  function startGame() {
    Input.clear();
    game = new Physics();
    window.__game = game;          // test hook
    state = "playing";
    Sound.music("tune1", true);
  }

  // mute button (top-left, original drew ui_mute_* at 0.5 scale)
  const MUTE = { x: 8, y: 8, scale: 0.5 };
  function muteBox() {
    const im = Assets.img("ui_mute_on");
    return { x: MUTE.x, y: MUTE.y, w: im.naturalWidth * MUTE.scale, h: im.naturalHeight * MUTE.scale };
  }
  function drawMute() {
    // original: ui_mute_off.png shows when sound is ON, ui_mute_on.png when muted
    const im = Assets.img(Sound.muted ? "ui_mute_on" : "ui_mute_off");
    const b = muteBox();
    ctx.drawImage(im, b.x, b.y, b.w, b.h);
  }

  function canvasCoords(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (GW / r.width), y: (e.clientY - r.top) * (GH / r.height) };
  }

  function onClick(e) {
    const p = canvasCoords(e);
    const b = muteBox();
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      Sound.setMuted(!Sound.muted);
      Sound.play("click1");
      return;                                  // a mute click never also starts/restarts
    }
    if (state === "title") { startGame(); return; }
    if (state === "playing" && game && game.waitForReset) { startGame(); }
  }

  let acc = 0, last = 0;
  const STEP = 1000 / 30;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!last) last = ts;
    acc += ts - last; last = ts;
    if (acc > 250) acc = 250;            // avoid spiral of death
    while (acc >= STEP) {
      if (state === "playing" && game) {
        game.update();
        if (game.requestRestart) { startGame(); break; }
      }
      acc -= STEP;
    }
    if (state === "title") drawTitle();
    else if (state === "playing" && game) game.draw(ctx);
    if (state !== "loading") drawMute();
  }

  window.addEventListener("load", async () => {
    canvas = document.getElementById("c");
    ctx = canvas.getContext("2d");
    canvas.width = GW; canvas.height = GH;
    fit(); window.addEventListener("resize", fit);
    canvas.addEventListener("click", onClick);

    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Loading...", GW / 2, GH / 2);

    await Assets.load((d, t) => {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, GW, GH);
      ctx.fillStyle = "#fff"; ctx.fillText("Loading " + d + "/" + t, GW / 2, GH / 2);
    });
    state = "title";
    requestAnimationFrame(loop);
  });
})(window);
