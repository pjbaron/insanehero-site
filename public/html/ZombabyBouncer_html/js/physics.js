// physics.js - port of src/Physics.as (the actual game) to planck.js + canvas.
(function (global) {
  "use strict";
  const pl = global.planck;
  const Vec2 = pl.Vec2;

  // Design height is locked at 480; the design WIDTH flexes with the window aspect
  // ratio so the canvas is filled edge-to-edge (no letterbox). main.js owns View and
  // updates it on every resize; screen-space drawing reads View.w / View.h live.
  const View = global.View || (global.View = { w: 640, h: 480, scale: 1, dpr: 1 });
  // Fixed DESIGN reference (the original game was authored at 640x480). World/level
  // generation and the gameplay triggers tuned to it stay on these constants; only
  // SCREEN-SPACE drawing (camera framing, background, HUD) reads the live View.
  const GW = 640, GH = 480;
  const PS = 30;                       // physics scale (px per metre)
  const TS = 1 / 30, VIT = 15, PIT = 15;
  const BABY_FELL_DELAY = 60, STOP_SIGN_WIDE = 48;
  const pramStartX = 150, pramStartY = 70;
  const startX = pramStartX + 25, startY = pramStartY - 70;
  const pramWide = 50, pramHigh = 8, pramWheelHigh = 20;
  const frontWheelSize = 16, backWheelSize = 24, wheelOffsetX = 32;
  const frontWheelHigh = pramWheelHigh + (backWheelSize - frontWheelSize) / 2;

  // persistent across restarts (matches AS3 static vars). The best distance also
  // persists across reloads via incognito-safe storage (Store wraps localStorage).
  let signPositions = [];
  let recordDistance = (() => {
    const v = global.Store ? parseFloat(global.Store.get("zb_record")) : NaN;
    return isFinite(v) ? v : 0;
  })();

  function img(n) { return Assets.img(n); }

  class Physics {
    constructor() {
      this.world = pl.World({ gravity: Vec2(0, 10) });
      this.world.on("begin-contact", (c) => this._contact(c, +1));
      this.world.on("end-contact", (c) => this._contact(c, -1));
      this.babyOnGround = 0;
      this.babyOnGroundCount = 0;
      this.firstContact = false;
      this.gameRunning = true;
      this.waitForReset = false;
      this.infectionSpread = 1.0;
      this.infectionSpeed = 0.25;
      this.runTime = 0; this.timeTaken = 0; this.timeBonus = 0;
      this.isRecord = false;
      this.nextGiggle = 1;
      this.dusts = [];
      this.needles = [];
      this.scenery = [];           // {img, x, y, z}
      this.grass = [];             // {x,y,angle,len}
      this.signs = [];             // {x,y}
      this.groundPts = [];
      this.endState = null;        // null | 'won' | 'lost'

      // camera (AS3 m_sprite.x/y)
      this.camX = 0; this.camY = GH;

      this._buildPram();
      this._buildWheels();
      this.baby = new Ragdoll(this.world, PS, startX, startY);
      this._buildHill(0.25);
      this._buildSigns();

      // snap camera to follow target so first frame looks right
      const p = this.baby.getPosition();
      this.camX = View.w * 0.33 - p.x * PS;
      this.camY = View.h * 0.5 - p.y * PS;
      // Don't show the empty space left of the first hill segment (wide screens only).
      const leftLimit = -this.groundPts[0].x;
      if (this.camX > leftLimit) this.camX = leftLimit;

      this.instrT = 0;             // instructions fade-in timer (frames)
      Sound.play("giggle3");
    }

    _contact(c, dir) {
      const a = String(c.getFixtureA().getUserData());
      const b = String(c.getFixtureB().getUserData());
      if (a !== "baby" && a !== "ground") return;
      if (b !== "baby" && b !== "ground") return;
      if (a !== b) this.babyOnGround += dir;
    }

    _buildPram() {
      const b = this.world.createBody({ type: "dynamic", position: Vec2(pramStartX / PS, pramStartY / PS) });
      b.createFixture(pl.Box(pramWide / PS, pramHigh / PS), { friction: 0.9, density: 1, restitution: 0.01, userData: "pram" });
      // rear wall
      b.createFixture(pl.Box(5 / PS, 10 / PS, Vec2(-(pramWide - 5) / PS, -(pramHigh + 10) / PS), 0), { friction: 0.9, density: 1, restitution: 0.01, userData: "pram" });
      // front wall
      b.createFixture(pl.Box(5 / PS, 20 / PS, Vec2((pramWide - 5) / PS, -(pramHigh + 20) / PS), 0), { friction: 0.9, density: 1, restitution: 0.01, userData: "pram" });
      this.pram = b;
    }

    _buildWheels() {
      const front = this.world.createBody({ type: "dynamic", position: Vec2((pramStartX + wheelOffsetX) / PS, (pramStartY + frontWheelHigh) / PS) });
      front.createFixture(pl.Circle(frontWheelSize / PS), { friction: 0.9, density: 30, restitution: 0.2, userData: "front wheel" });
      const rear = this.world.createBody({ type: "dynamic", position: Vec2((pramStartX - wheelOffsetX) / PS, (pramStartY + pramWheelHigh) / PS) });
      rear.createFixture(pl.Circle(backWheelSize / PS), { friction: 0.9, density: 30, restitution: 0.2, userData: "back wheel" });
      this.frontWheel = front; this.rearWheel = rear;
      this.world.createJoint(pl.RevoluteJoint({}, this.pram, front, front.getPosition()));
      this.world.createJoint(pl.RevoluteJoint({}, this.pram, rear, rear.getPosition()));
    }

    _buildHill(steepness) {
      let lastRamp = 0.0;
      const rampGap = GW * 5;
      let nextNeedle = GW, nextNeedleDistance = GW * 3;
      let x1 = -80, y1 = 100, x2, y2;

      const pts = this.groundPts;
      pts.push({ x: x1, y: y1 });
      do {
        if (x1 < lastRamp + rampGap) {
          x2 = x1 + Math.random() * 128 + 64;
          y2 = y1 + (Math.random() * 128 + 64) * steepness;
        } else {
          x2 = x1 + Math.random() * 32 + 128;
          y2 = y1 - 10;
          lastRamp = x1;
          steepness += Math.random() * 0.5;
        }
        pts.push({ x: x2, y: y2 });

        nextNeedle -= x2 - x1;
        if (nextNeedle <= 0) {
          const im = img("obj_needle");
          this.needles.push({ x: x2, y: y2 - im.naturalHeight * 0.5 - Math.random() * 80, rot: Math.random() * 360 - 180, s: 0.5, visible: true });
          nextNeedle += nextNeedleDistance;
          nextNeedleDistance = Math.min(nextNeedleDistance + GW / 3, GW * 8);
        }

        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        this.grass.push({ x: x1, y: y1 - 12, angle, len: Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * 1.1 });

        if (x2 < 45000) steepness += Math.random() - 0.75; else steepness -= 0.1;
        if (steepness < 0.15) steepness = 0.15;
        if (steepness > 1.50) steepness = 1.50;

        x1 = x2; y1 = y2;
      } while (x2 < 50000);

      // static collision chain along the surface
      const ground = this.world.createBody();
      const verts = pts.map(p => Vec2(p.x / PS, p.y / PS));
      ground.createFixture(pl.Chain(verts, false), { friction: 0.9, restitution: 0.1, userData: "ground" });

      this._placeScenery();
    }

    _findGround(x) {
      const pts = this.groundPts;
      for (let i = 1; i < pts.length; i++) {
        if (x < pts[i].x) {
          const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
          return pts[i - 1].y + (x - pts[i - 1].x) * dy / dx;
        }
      }
      return NaN;
    }

    _placeScenery() {
      const pts = this.groundPts;
      const sw = (n) => img(n).naturalWidth, sh = (n) => img(n).naturalHeight;
      const houseOffset = 42, officeOffset = 42, factoryOffset = 42, hospitalOffset = 42;
      const pylonOffset = 377, pylonWidth = 156, treeTrunkWidth = 156, treeTrunkOffset = 109;
      let next = 0;
      const add = (n, x, y, z) => this.scenery.push({ img: img(n), x, y, z });

      for (let i = 0; i < pts.length - 2; i++) {
        const lx = pts[i].x;
        if (lx > 49000 && lx <= 49000 + (pts[i + 1].x - pts[i].x)) {
          // place hospital once near the foot
        }
        if (lx > 49000 && !this._hospitalPlaced) {
          this._hospitalPlaced = true;
          const w = sw("bg_hospital"), h = sh("bg_hospital");
          const x = 49900 - w;
          add("bg_hospital", x, this._findGround(x + w) - h + hospitalOffset * 0.5, -10);
          next = lx + w + 50;
          continue;
        }
        if (lx <= next) continue;
        const dx = pts[i + 1].x - lx, dy = pts[i + 1].y - pts[i].y, steep = dy / dx;
        const dx2 = pts[i + 2].x - pts[i + 1].x, dy2 = pts[i + 2].y - pts[i + 1].y, steep2 = dy2 / dx2;
        const flat = steep < 0.15, flat2 = steep2 < 0.15;
        let placed = false, w, h;
        const tryBuild = (n, off) => {
          w = sw(n); h = sh(n);
          add(n, lx, this._findGround(lx + w) - h + off * 0.5, -10);
          next = lx + w + 50; placed = true;
        };
        if (Math.random() < 0.20 && ((flat && dx > sw("bg_house") / 2) || (flat && flat2 && dx + dx2 > sw("bg_house") / 2))) tryBuild("bg_house", houseOffset);
        else if (Math.random() < 0.30 && ((flat && dx > sw("bg_office") / 2) || (flat && flat2 && dx + dx2 > sw("bg_office") / 2))) tryBuild("bg_office", officeOffset);
        else if (Math.random() < 0.45 && ((flat && dx > sw("bg_factory") / 2) || (flat && flat2 && dx + dx2 > sw("bg_factory") / 2))) tryBuild("bg_factory", factoryOffset);
        else if (Math.random() < 0.25 && ((steep < 0.18 && dx > pylonWidth / 2) || (steep < 0.18 && steep2 < 0.18 && dx + dx2 > pylonWidth / 2))) {
          w = sw("bg_pylon"); h = sh("bg_pylon");
          add("bg_pylon", lx - pylonOffset, this._findGround(lx + treeTrunkWidth) - h, -10); next = lx + w + 50; placed = true;
        }
        else if (steep < 0.2 && dx > treeTrunkWidth && Math.random() < 0.33) {
          w = sw("bg_tree"); h = sh("bg_tree");
          add("bg_tree", lx - treeTrunkOffset, this._findGround(lx + treeTrunkWidth) - h, -10); next = lx + w + 50; placed = true;
        }
        else if (steep < 0.2 && dx > treeTrunkWidth && Math.random() < 0.5) {
          w = sw("bg_bush"); h = sh("bg_bush");
          add("bg_bush", lx - treeTrunkOffset, this._findGround(lx + treeTrunkWidth) - h, -10); next = lx + w + 50; placed = true;
        }
        else if (Math.random() < 0.05) { w = sw("bg_mountain"); h = sh("bg_mountain"); add("bg_mountain", lx, this._findGround(lx + w) - h + houseOffset * 0.5, -20); next = lx + w + 100; placed = true; }
        else if (Math.random() < 0.07) { w = sw("bg_cloud"); h = sh("bg_cloud"); add("bg_cloud", lx, this._findGround(lx + w) - h - 200 - 200 * Math.random(), -30); next = lx + w + 50; placed = true; }
      }
      this.scenery.sort((a, b) => a.z - b.z);
    }

    _buildSigns() {
      for (const x of signPositions)
        this.signs.push({ x, y: this._findGround(x) - img("obj_stop_sign").naturalHeight * (STOP_SIGN_WIDE / img("obj_stop_sign").naturalWidth) });
    }

    update() {
      if (Input.isKeyDown(82)) { this.requestRestart = true; return; }   // R
      if (this.waitForReset) { this._endTick(); return; }

      // dust lifetimes
      for (let d = this.dusts.length - 1; d >= 0; d--) {
        this.dusts[d].life--; this.dusts[d].x += this.dusts[d].vx;
        if (this.dusts[d].life <= 0) this.dusts.splice(d, 1);
      }

      if (this.gameRunning) {
        this.runTime++;
        this.world.step(TS, VIT, PIT);

        const v = this.baby.getLinearVelocity();
        this.infectionSpread = Math.min(this.infectionSpread + this.infectionSpeed, 100);
        this.baby.fadeFaceArms(1.0 - this.infectionSpread / 100);

        if (this.babyOnGround || this.infectionSpread >= 100) {
          if (v.x < 2.0 || this.infectionSpread >= 100) {
            if ((this.babyOnGroundCount += 2) > BABY_FELL_DELAY) {
              const sx = this.baby.getX();
              this.signs.push({ x: sx, y: this._findGround(sx) - img("obj_stop_sign").naturalHeight * (STOP_SIGN_WIDE / img("obj_stop_sign").naturalWidth) });
              signPositions.push(sx);
              Sound.play("bounce");
              this.gameRunning = false;
              return;
            }
          } else if ((!this.firstContact && this.babyOnGround) || (this.babyOnGround && v.length() > 15.0)) {
            this.firstContact = true; Sound.play("doing");
          }
        } else {
          if (--this.babyOnGroundCount < 0) {
            this.babyOnGroundCount = 0;
            if (Math.random() < 0.0075) {
              Sound.play("giggle" + this.nextGiggle++);
              if (this.nextGiggle > 3) this.nextGiggle = 1;
            }
          }
        }

        // camera follows baby. In portrait the view is tighter, so follow more
        // closely (less lag) to keep the pram from drifting to the screen edge.
        const p = this.baby.getPosition();
        const lag = View.w < View.h ? 4 : 8;
        const cx = View.w * 0.33 - p.x * PS, cy = View.h * 0.5 - p.y * PS;
        this.camX += (cx - this.camX) / lag;
        this.camY += (cy - this.camY) / lag;
        // Don't show the empty space left of the first hill segment (wide screens only;
        // inactive once the pram has rolled right, where camX is far negative).
        const leftLimit = -this.groundPts[0].x;
        if (this.camX > leftLimit) this.camX = leftLimit;
        if (this.camX < -48200) {
          if (this.infectionSpread >= 99 - this.infectionSpeed) this.infectionSpeed = 0;
          if (this.camX < -50000 + GW) {
            this.camX = -50000 + GW; this.gameRunning = false;
            if (this.timeTaken === 0) this.timeTaken = this.runTime;
          } else {
            if (v.x > 8.0) this.rearWheel.applyLinearImpulse(Vec2(-48, 0), Vec2(0, 0), true);
            else if (v.x < 4.0) this.frontWheel.applyLinearImpulse(Vec2(16, 0), Vec2(0, 0), true);
          }
        }

        // controls (keyboard OR on-screen touch buttons, via Input action helpers)
        const vel = this.pram.getLinearVelocity();
        if (Input.brake() && vel.x > 4) {
          this.rearWheel.applyLinearImpulse(Vec2(-24, 0), Vec2(0, 0), true);
          if ((this.runTime & 3) === 0) this._dust(this.frontWheel, 8, 0.25);
        }
        if (this.camX < 48000 && Input.faster()) {
          this.frontWheel.applyLinearImpulse(Vec2(16, 0), Vec2(0, 0), true);
          if ((this.runTime & 3) === 0) this._dust(this.rearWheel, -4, -0.25);
        }

        // needle pickups
        const hb = this.baby.headBounds();
        const pramAabb = this._pramAabb();
        for (const n of this.needles) {
          if (!n.visible) continue;
          const nw = img("obj_needle").naturalWidth * n.s, nh = img("obj_needle").naturalHeight * n.s;
          const nb = { x: n.x - nw / 2, y: n.y - nh / 2, w: nw, h: nh };
          if (this._overlap(hb, nb) || this._overlap(pramAabb, nb)) {
            n.visible = false; this.infectionSpread = 0.0; Sound.play("needle");
          }
        }

        // instructions fade in over the first ~1s, then linger
        if (this.instrT < 240) this.instrT++;

        if (this.camX <= -48000) this._maybeWinSetup();
      } else {
        this._loseOrWinProgress();
      }
    }

    _maybeWinSetup() {}

    _loseOrWinProgress() {
      // after gameRunning stops: either reached hospital (win) or convert to zombaby (lose)
      if (this.camX <= -49990 + GW) {
        this.infectionSpeed = 0;
        this.infectionSpread = Math.max(this.infectionSpread - 0.5, 0);
        this.baby.fadeFaceArms(1.0 - this.infectionSpread / 100);
        if (this.infectionSpread <= 0 && !this.waitForReset) {
          this.timeBonus = Math.max(5000 - this.timeTaken, 0) / 10;
          this.endState = "won";
          this._finishScore();
          Sound.play("giggle3");
          this.waitForReset = true;
        }
      } else {
        this.infectionSpread = Math.min(this.infectionSpread + 2.0, 100);
        this.baby.fadeFaceArms(1.0 - this.infectionSpread / 100);
        if (this.infectionSpread >= 100 && !this.waitForReset) {
          this.endState = "lost";
          this._finishScore();
          Sound.play("babyBrains");
          this.waitForReset = true;
        }
      }
    }

    _finishScore() {
      const p = this.baby.getPosition();
      const dist = p.x + (this.endState === "won" ? this.timeBonus : 0);
      if (dist > recordDistance) {
        recordDistance = dist; this.isRecord = true;
        if (global.Store) global.Store.set("zb_record", String(Math.round(dist)));
      }
      this.finalDistance = dist;
    }

    _endTick() {
      // idle on the end screen; main.js handles click/key to restart
    }

    _dust(wheelBody, vx, off) {
      const p = wheelBody.getPosition();
      this.dusts.push({ x: p.x * PS, y: p.y * PS + 6, vx, life: 18, a: 1 });
    }

    _pramAabb() {
      const p = this.pram.getPosition();
      const w = pramWide * 1.6, h = 60;
      return { x: p.x * PS - w / 2, y: p.y * PS - h, w, h };
    }
    _overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

    // ---------------- rendering ----------------
    draw(ctx) {
      ctx.save();
      ctx.fillStyle = "#8CB5FF";
      ctx.fillRect(0, 0, View.w, View.h);
      ctx.translate(this.camX, this.camY);

      // scenery (back)
      for (const s of this.scenery) ctx.drawImage(s.img, s.x, s.y);

      // hill fill
      const pts = this.groundPts;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      const last = pts[pts.length - 1];
      const FILL_BOTTOM = 200000;   // flat bottom well below the deepest point => soil always fills downward
      ctx.lineTo(last.x, FILL_BOTTOM);
      ctx.lineTo(pts[0].x, FILL_BOTTOM);
      ctx.closePath();
      ctx.fillStyle = "#402601";
      ctx.fill();

      // grass strips
      const grassImg = img("bg_grass");
      for (const g of this.grass) {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.angle * Math.PI / 180);
        const scaleX = g.len / grassImg.naturalWidth;
        ctx.drawImage(grassImg, -12 * scaleX, -13, g.len, grassImg.naturalHeight);
        ctx.restore();
      }

      // signs
      const signImg = img("obj_stop_sign");
      const signScale = STOP_SIGN_WIDE / signImg.naturalWidth;
      for (const s of this.signs) ctx.drawImage(signImg, s.x, s.y, STOP_SIGN_WIDE, signImg.naturalHeight * signScale);

      // needles
      const ndl = img("obj_needle");
      for (const n of this.needles) {
        if (!n.visible) continue;
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rot * Math.PI / 180);
        ctx.drawImage(ndl, -ndl.naturalWidth * n.s / 2, -ndl.naturalHeight * n.s / 2, ndl.naturalWidth * n.s, ndl.naturalHeight * n.s);
        ctx.restore();
      }

      // baby
      this.baby.draw(ctx);

      // pram skin (drawn over the baby)
      this._drawPram(ctx);

      // dust puffs
      for (const d of this.dusts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, d.life / 18) * 0.6;
        ctx.fillStyle = "#caa86a";
        ctx.beginPath(); ctx.arc(d.x, d.y, 6 + (18 - d.life), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      this._drawUI(ctx);
    }

    _drawPram(ctx) {
      const p = this.pram.getPosition();
      ctx.save();
      ctx.translate(p.x * PS, p.y * PS);
      ctx.rotate(this.pram.getAngle());
      ctx.scale(0.25, 0.25);
      const pramBmp = img("pram_body"), handle = img("pram_handle"), chassis = img("pram_chassis"), hood = img("pram_hood");
      const pbx = -pramBmp.naturalWidth * 0.5, pby = -pramBmp.naturalHeight * 0.7;
      // chassis (scaleY 0.8) behind body
      ctx.drawImage(chassis, -chassis.naturalWidth * 0.55, pby + chassis.naturalHeight * 0.5, chassis.naturalWidth, chassis.naturalHeight * 0.8);
      ctx.drawImage(pramBmp, pbx, pby);
      ctx.drawImage(handle, pbx - handle.naturalWidth * 0.8, pby - handle.naturalHeight * 0.65);
      ctx.drawImage(hood, 8, pby - hood.naturalHeight * 0.9);
      ctx.restore();

      this._drawWheel(ctx, this.frontWheel, 0.18);
      this._drawWheel(ctx, this.rearWheel, 0.25);
    }

    _drawWheel(ctx, body, scale) {
      const w = img("pram_wheel");
      const p = body.getPosition();
      ctx.save();
      ctx.translate(p.x * PS, p.y * PS);
      ctx.rotate(body.getAngle());
      ctx.scale(scale, scale);
      ctx.drawImage(w, -w.naturalWidth / 2, -w.naturalHeight / 2);
      ctx.restore();
    }

    _drawUI(ctx) {
      // on the end screen, draw only the focused panel (no HUD clutter behind it)
      if (this.endState && this.waitForReset) { this._drawEndScreen(ctx); return; }

      const W = View.w, H = View.h;
      const p = this.baby.getPosition();
      const v = this.baby.getLinearVelocity();
      ctx.textBaseline = "top";

      // All readouts are stacked along the TOP (the bottom corners are reserved for
      // the on-screen touch buttons, and bottom-centre for the control hint) so
      // nothing overlaps in either portrait or landscape. Fonts scale with the
      // dynamic design width so they fit a narrow phone in portrait.
      const infFont = Math.min(38, W * 0.085);
      const small = Math.min(24, Math.max(14, W * 0.05));
      const row1 = 6, row2 = row1 + infFont + 4, row3 = row2 + small + 2;

      // Infection: top-centre, the focal readout.
      ctx.font = infFont.toFixed(0) + "px Hobo, sans-serif";
      ctx.fillStyle = "#ff0000";
      ctx.textAlign = "center";
      const inf = Math.min(this.infectionSpread, 100).toFixed(0);
      ctx.fillText("Infection: " + inf + "%", W / 2, row1);

      // Distance / Record (row 2), Speed (row 3). The left column is indented past
      // the top-left mute button so it never overlaps it; Record is right-aligned.
      const leftX = 52;
      ctx.font = small.toFixed(0) + "px Hobo, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText("Distance: " + p.x.toFixed(0), leftX, row2);
      ctx.fillText("Speed: " + Math.max(v.x, 0).toFixed(1), leftX, row3);
      ctx.textAlign = "right";
      ctx.fillText("Record: " + recordDistance.toFixed(0), W - 16, row2);

      // Control hint, fading in at the start of a run. On touch it sits just ABOVE the
      // on-screen buttons (main.js publishes their top as BTN_TOP_Y); on desktop it
      // goes along the bottom. Either way it never overlaps the buttons.
      const a = Math.min(this.instrT / 60, 1) * (this.instrT < 220 ? 1 : Math.max(0, (240 - this.instrT) / 20));
      if (a > 0.01) {
        ctx.globalAlpha = a;
        ctx.fillStyle = "#ffff00";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.font = small.toFixed(0) + "px Hobo, sans-serif";
        const hint = global.IS_TOUCH ? "BRAKE / GO - keep the Zombaby in the pram!"
                                     : "'A' = brake   'D' = faster - keep the Zombaby in the pram!";
        const hintY = (global.IS_TOUCH && global.BTN_TOP_Y) ? global.BTN_TOP_Y - 10 : H - 16;
        ctx.fillText(hint, W / 2, hintY);
        ctx.globalAlpha = 1;
        ctx.textBaseline = "top";
      }
    }

    _drawEndScreen(ctx) {
      const won = this.endState === "won";
      const W = View.w, H = View.h;
      const cx = W / 2;

      // dim the play field
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, W, H);

      // centred panel (clamped so it fits a narrow portrait screen)
      const pw = Math.min(460, W - 32), ph = 300, px = cx - pw / 2, py = (H - ph) / 2;
      ctx.fillStyle = "rgba(18,20,30,0.88)";
      ctx.strokeStyle = won ? "#00e000" : "#ff3030";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 18);
      else ctx.rect(px, py, pw, ph);
      ctx.fill(); ctx.stroke();

      ctx.textAlign = "center";
      // Each line shrinks to fit inside the panel so long values (e.g. a 4-digit
      // distance, or the desktop "Click or press R..." prompt) never overrun the edges
      // on a narrow portrait panel.
      const maxW = pw - 36;
      const line = (text, y, size, fill, stroke) => {
        let fs = size;
        ctx.font = fs + "px Hobo, sans-serif";
        const tw = ctx.measureText(text).width;
        if (tw > maxW) { fs = size * maxW / tw; ctx.font = fs + "px Hobo, sans-serif"; }
        ctx.textBaseline = "middle";
        if (stroke) { ctx.lineWidth = Math.max(3, fs / 10); ctx.strokeStyle = stroke; ctx.strokeText(text, cx, y); }
        ctx.fillStyle = fill; ctx.fillText(text, cx, y);
      };

      // title
      line(won ? "SAFE!" : "ZOMBABY!", py + 58, 64, won ? "#37e000" : "#ff2a2a", "#000000");

      // stats block (consistent rhythm)
      let y = py + 130;
      line("Distance  " + (this.finalDistance || 0).toFixed(0), y, 36, "#ffffff"); y += 44;
      if (won && this.timeBonus > 0) { line("Time Bonus  " + this.timeBonus.toFixed(0), y, 30, "#9fe89f"); y += 38; }
      line("Best  " + recordDistance.toFixed(0) + (this.isRecord ? "   NEW!" : ""), y, 30, this.isRecord ? "#ffd23f" : "#cfd2dc");

      // call to action, gently pulsing
      const pulse = 0.6 + 0.4 * Math.abs(Math.sin(performance.now() * 0.004));
      ctx.globalAlpha = pulse;
      line(global.IS_TOUCH ? "Tap to play again" : "Click or press R to play again",
        py + ph - 34, 26, "#ffe14d", "#5a4a00");
      ctx.globalAlpha = 1;
      ctx.textBaseline = "top";
    }
  }

  global.Physics = Physics;
  global.resetPersistentScores = function () { signPositions = []; recordDistance = 0; };
})(window);
