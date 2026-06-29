// assets.js - image, audio and font loading.
(function (global) {
  "use strict";

  const IMAGES = [
    "baby_arm_lower", "baby_arm_lower_lft", "baby_arm_lower_zombie", "baby_arm_upper",
    "baby_body", "baby_body1", "baby_body2", "baby_body3", "baby_head", "baby_head_zombie",
    "baby_leg_lower", "baby_leg_upper", "bg_bush", "bg_cloud", "bg_factory", "bg_grass",
    "bg_hospital", "bg_house", "bg_moon", "bg_mountain", "bg_office", "bg_pylon", "bg_tree",
    "obj_needle", "obj_stop_sign", "pram_body", "pram_chassis", "pram_handle", "pram_hood",
    "pram_wheel", "ui_mute_off", "ui_mute_on", "ui_title", "ui_titlescreen",
  ];
  const SOUNDS = ["giggle1", "giggle2", "giggle3", "babyBrains", "bounce", "doing", "click1", "click2", "needle", "tune1"];

  const imgs = {}, snds = {};

  const Assets = {
    img(name) {
      const im = imgs[name];
      if (!im) throw new Error("missing image: " + name);
      return im;
    },
    load(onProgress) {
      let total = IMAGES.length + SOUNDS.length + 1, done = 0;
      const tick = () => { done++; if (onProgress) onProgress(done, total); };
      return new Promise((resolve, reject) => {
        IMAGES.forEach((n) => {
          const im = new Image();
          im.onload = tick; im.onerror = () => reject(new Error("failed image " + n));
          im.src = "assets/grfx/" + n + ".png";
          imgs[n] = im;
        });
        SOUNDS.forEach((n) => {
          const a = new Audio();
          a.preload = "auto";
          a.oncanplaythrough = function h() { a.removeEventListener("canplaythrough", h); tick(); };
          a.addEventListener("canplaythrough", a.oncanplaythrough);
          // some browsers won't fire canplaythrough until interaction; resolve on loadeddata too
          a.addEventListener("loadeddata", () => { });
          a.onerror = () => { console.warn("audio missing", n); tick(); };
          a.src = "assets/audio/" + n + ".ogg";
          snds[n] = a;
        });
        // font
        const ff = new FontFace("Hobo", "url(assets/fonts/hobo.woff2) format('woff2'), url(assets/fonts/hobo.ttf) format('truetype')");
        ff.load().then((f) => { document.fonts.add(f); tick(); }).catch(() => { console.warn("font failed"); tick(); });

        // safety: don't hang forever on audio
        const iv = setInterval(() => { if (done >= total) { clearInterval(iv); resolve(); } }, 50);
        setTimeout(() => { clearInterval(iv); resolve(); }, 12000);
      });
    },
    sound(name) { return snds[name]; },
  };

  // per-sound minimum replay gap in ms (mirrors game.as sfxGap, which throttled
  // sounds so e.g. the "doing" boing can't retrigger every frame while skidding).
  const GAP = { giggle1: 1621, giggle2: 1245, giggle3: 1445, babyBrains: 2448, click1: 69, click2: 84, needle: 425, bounce: 700, doing: 1149 };
  const nextOk = {};

  // simple sfx player (clones so sounds overlap)
  const Sound = {
    muted: false,
    musicChannel: null,
    play(name) {
      if (Sound.muted) return;
      const a = snds[name];
      if (!a) return;
      const now = performance.now();
      if (now < (nextOk[name] || 0)) return;
      // all three giggles share one cooldown (as in the original)
      if (name.indexOf("giggle") === 0 &&
        (now < (nextOk.giggle1 || 0) || now < (nextOk.giggle2 || 0) || now < (nextOk.giggle3 || 0))) return;
      nextOk[name] = now + (GAP[name] || 0);
      try { const c = a.cloneNode(); c.volume = 1.0; c.play().catch(() => { }); } catch (e) { }
    },
    music(name, loop) {
      const a = snds[name];
      if (!a) return;
      if (Sound.musicChannel) { Sound.musicChannel.pause(); }
      a.loop = !!loop; a.currentTime = 0; a.volume = 0.6;
      a.play().catch(() => { });
      Sound.musicChannel = a;
    },
    stopMusic() { if (Sound.musicChannel) { Sound.musicChannel.pause(); Sound.musicChannel = null; } },
    setMuted(m) {
      Sound.muted = m;
      if (Sound.musicChannel) { if (m) Sound.musicChannel.pause(); else Sound.musicChannel.play().catch(() => { }); }
    },
  };

  global.Assets = Assets;
  global.Sound = Sound;
})(window);
