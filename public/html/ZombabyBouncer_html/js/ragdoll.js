// ragdoll.js - faithful port of src/ragdoll.as to planck.js + canvas.
// Box2D-Flash math is reproduced exactly; only the API names change.
(function (global) {
  "use strict";
  const pl = global.planck;
  const Vec2 = pl.Vec2;

  const S = 0.25;                 // scaleX/scaleY applied to every baby bitmap
  const overlap = 4.0 * S;        // joint overlap amount
  const DEG = Math.PI / 180;

  function img(name) { return Assets.img(name); }
  function W(name) { return img(name).naturalWidth * S; }
  function H(name) { return img(name).naturalHeight * S; }

  class Ragdoll {
    constructor(world, physScale, x, y) {
      this.world = world;
      this.ps = physScale;
      this.startX = x; this.startY = y;
      this.faceAlpha = 1.0;
      this.armCt = 1.0;

      // scaled bitmap dimensions (AS3 read bmp.width AFTER scaling)
      const faceW = W("baby_head"), faceH = H("baby_head");
      const b1W = W("baby_body1");
      const b2W = W("baby_body2");
      const b3W = W("baby_body3");
      const ulArmW = W("baby_arm_upper"), ulArmH = H("baby_arm_upper");
      const llArmW = W("baby_arm_lower_lft");
      const lrArmW = W("baby_arm_lower");
      const ulLegW = W("baby_leg_upper"), ulLegH = H("baby_leg_upper");
      const llLegLW = W("baby_leg_lower"), llLegLH = H("baby_leg_lower");

      const neck_y = faceH * 0.5 - 4 * overlap;
      const shoulder_y = neck_y + ulArmH * 0.5;
      const arm_y = shoulder_y;
      const shoulder_overlap = ulArmW * 0.3;
      const torso1_y = neck_y + 30 * S - overlap;
      const torso2_y = torso1_y + 30 * S - overlap;
      const hips_y = torso2_y + 30 * S * 0.5 - overlap;
      const hips_overlap = ulLegH * 0.2;
      const knees_y = hips_y - hips_overlap + ulLegH - overlap;
      this._dims = { faceW, faceH, b1W, b2W, b3W };

      const ps = physScale;
      const mk = (px, py, fix) => {
        const b = world.createBody({ type: "dynamic", position: Vec2(px / ps, py / ps) });
        b.createFixture(fix.shape, fix);
        b.setUserData("baby");
        return b;
      };
      const box = (hwPx, hhPx, extra) =>
        Object.assign({ shape: pl.Box(hwPx / ps, hhPx / ps), userData: "baby" }, extra);

      // --- Lower legs (group -1, dense) ---
      let f = { density: 10.0, friction: 0.4, restitution: 0.01, filterGroupIndex: -1 };
      this.lowerLegL = mk(x - b1W * 0.5 + llLegLW * 0.5, y + knees_y + llLegLH * 0.5 - overlap,
        box(llLegLW * 0.5, llLegLH * 0.5, f));
      this.lowerLegR = mk(x + b1W * 0.5 - llLegLW * 0.5, y + knees_y + llLegLH * 0.5 - overlap,
        box(W("baby_leg_lower") * 0.5, H("baby_leg_lower") * 0.5, f));

      // --- Upper legs (group -2) ---
      f = { density: 1.0, friction: 0.4, restitution: 0.01, filterGroupIndex: -2 };
      this.upperLegL = mk(x - b1W * 0.5 + ulLegW * 0.5, y + hips_y - hips_overlap + ulLegH * 0.5,
        box(ulLegW * 0.5, ulLegH * 0.5, f));
      this.upperLegR = mk(x + b1W * 0.5 - ulLegW * 0.5, y + hips_y - hips_overlap + ulLegH * 0.5,
        box(ulLegW * 0.5, ulLegH * 0.5, f));

      // --- Torsos / arms / head ---
      // NB: the AS3 reuses one fixtureDef and never resets groupIndex after the
      // upper legs, so every part from here on stays in group -2 (they do not
      // collide with each other). That is what makes the ragdoll floppy.
      f = { density: 1.0, friction: 0.4, restitution: 0.01, filterGroupIndex: -2 };
      this.torso1 = mk(x, y + neck_y + 30 * S * 0.5, box(b1W * 0.5, 30 * S * 0.5, f));
      this.torso2 = mk(x, y + neck_y + 30 * S - overlap + 30 * S * 0.5 - overlap, box(b2W * 0.5, 30 * S * 0.5, f));
      this.torso3 = mk(x, y + neck_y + 30 * S - overlap + 30 * S - overlap + 30 * S * 0.5 - overlap, box(b3W * 0.5, 30 * S * 0.5, f));

      // --- Upper arms ---
      this.upperArmL = mk(x - b1W * 0.5 + shoulder_overlap - ulArmW * 0.5, y + shoulder_y, box(ulArmW * 0.5, ulArmH * 0.5, f));
      this.upperArmR = mk(x + b1W * 0.5 - shoulder_overlap + ulArmW * 0.5, y + shoulder_y, box(ulArmW * 0.5, ulArmH * 0.5, f));

      // --- Lower arms ---
      this.lowerArmL = mk(x - b1W * 0.5 + shoulder_overlap - ulArmW + overlap - llArmW * 0.5, y + shoulder_y, box(llArmW * 0.5, H("baby_arm_lower_lft") * 0.5, f));
      this.lowerArmR = mk(x + b1W * 0.5 - shoulder_overlap + ulArmW - overlap + lrArmW * 0.5, y + shoulder_y, box(lrArmW * 0.5, H("baby_arm_lower") * 0.5, f));

      // --- Head ---
      const headR = (faceW + faceH) * 0.25;
      this.head = world.createBody({ type: "dynamic", position: Vec2(x / ps, y / ps) });
      this.head.createFixture(pl.Circle(headR / ps), { density: 1.0, friction: 0.4, restitution: 0.01, filterGroupIndex: -2, userData: "baby" });
      this.head.setUserData("baby");

      // --- Joints ---
      const joint = (a, b, anchorPx, lo, hi) => {
        world.createJoint(pl.RevoluteJoint(
          { enableLimit: true, lowerAngle: lo * DEG, upperAngle: hi * DEG },
          a, b, Vec2(anchorPx.x / ps, anchorPx.y / ps)));
      };
      joint(this.torso1, this.head, { x: x, y: y + neck_y }, -15, 15);
      joint(this.torso1, this.upperArmL, { x: x - b1W * 0.5 + overlap, y: y + shoulder_y }, -85, 20);
      joint(this.torso1, this.upperArmR, { x: x + b1W * 0.5 - overlap, y: y + shoulder_y }, -20, 85);
      joint(this.upperArmL, this.lowerArmL, { x: x - b1W * 0.5 + overlap - ulArmW + overlap, y: y + shoulder_y }, -45, 45);
      joint(this.upperArmR, this.lowerArmR, { x: x + b1W * 0.5 - overlap + ulArmW - overlap, y: y + shoulder_y }, -45, 45);
      joint(this.torso1, this.torso2, { x: x, y: y + torso1_y }, -5, 5);
      joint(this.torso2, this.torso3, { x: x, y: y + torso2_y }, -5, 5);
      joint(this.torso3, this.upperLegL, { x: x - b3W * 0.5 + ulLegW * 0.5, y: y + hips_y }, -25, 45);
      joint(this.torso3, this.upperLegR, { x: x + b3W * 0.5 - ulLegW * 0.5, y: y + hips_y }, -45, 25);
      joint(this.upperLegL, this.lowerLegL, { x: x - b3W * 0.5 + ulLegW * 0.5, y: y + knees_y }, -25, 115);
      joint(this.upperLegR, this.lowerLegR, { x: x + b3W * 0.5 - ulLegW * 0.5, y: y + knees_y }, -115, 25);
    }

    getLinearVelocity() { return this.head.getLinearVelocity(); }
    getPosition() { return this.head.getPosition(); }
    getBaby() { return this.head; }
    getX() { return this.head.getPosition().x * this.ps; }

    fadeFaceArms(amount) {
      this.faceAlpha = amount;
      this.armCt = amount * 0.5 + 0.5;
    }

    // world-space AABB of the head (for needle collisions)
    headBounds() {
      const p = this.head.getPosition();
      const r = this._dims.faceW * 0.5;
      return { x: p.x * this.ps - r, y: p.y * this.ps - r, w: r * 2, h: r * 2 };
    }

    _drawPart(ctx, body, name) {
      const p = body.getPosition();
      ctx.save();
      ctx.translate(p.x * this.ps, p.y * this.ps);
      ctx.rotate(body.getAngle());
      const im = img(name);
      const w = im.naturalWidth * S, h = im.naturalHeight * S;
      ctx.drawImage(im, -w * 0.5, -h * 0.5, w, h);
      ctx.restore();
    }

    draw(ctx) {
      // z-order matches the AS3 addChild sequence
      this._drawPart(ctx, this.lowerLegL, "baby_leg_lower");
      this._drawPart(ctx, this.lowerLegR, "baby_leg_lower");
      this._drawPart(ctx, this.upperLegL, "baby_leg_upper");
      this._drawPart(ctx, this.upperLegR, "baby_leg_upper");
      this._drawPart(ctx, this.torso3, "baby_body3");
      this._drawPart(ctx, this.torso2, "baby_body2");
      this._drawPart(ctx, this.torso1, "baby_body1");
      this._drawPart(ctx, this.upperArmL, "baby_arm_upper");
      this._drawPart(ctx, this.upperArmR, "baby_arm_upper");
      this._drawPart(ctx, this.lowerArmL, "baby_arm_lower_lft");
      this._drawPart(ctx, this.lowerArmR, "baby_arm_lower");
      // head: zombie behind, normal face fading on top
      this._drawPart(ctx, this.head, "baby_head_zombie");
      if (this.faceAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = this.faceAlpha;
        this._drawPart(ctx, this.head, "baby_head");
        ctx.restore();
      }
    }
  }

  global.Ragdoll = Ragdoll;
})(window);
