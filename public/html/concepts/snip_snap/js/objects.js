/**
 * Objects - Game object factories and rendering
 * Boulder, Rope, Platform, Seesaw, Ramp, GoblinCamp, Cradle, Breakable
 */

var GameObjects = {

    // ---- BOULDER ----
    createBoulder: function(x, y, radius, type) {
        type = type || 'normal';
        var opts = { label: 'boulder' };
        if (type === 'explosive') {
            opts.density = 0.006;
        } else if (type === 'heavy') {
            opts.density = 0.012;
        } else if (type === 'splitting') {
            opts.density = 0.007;
        }
        var body = Physics.createBoulder(x, y, radius, opts);
        body.gameType = 'boulder';
        body.boulderType = type;
        body.radius = radius;
        body.hasExploded = false;
        body.hasSplit = false;
        return body;
    },

    renderBoulder: function(ctx, body, cam) {
        var pos = cam.worldToScreen(body.position.x, body.position.y);
        var r = body.radius * cam.scale;
        var type = body.boulderType || 'normal';

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(body.angle);

        // Main body
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);

        if (type === 'normal') {
            var grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
            grad.addColorStop(0, '#888');
            grad.addColorStop(1, '#444');
            ctx.fillStyle = grad;
        } else if (type === 'explosive') {
            var grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
            grad.addColorStop(0, '#f44');
            grad.addColorStop(1, '#811');
            ctx.fillStyle = grad;
        } else if (type === 'heavy') {
            var grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
            grad.addColorStop(0, '#666');
            grad.addColorStop(1, '#222');
            ctx.fillStyle = grad;
        } else if (type === 'splitting') {
            var grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
            grad.addColorStop(0, '#8cf');
            grad.addColorStop(1, '#348');
            ctx.fillStyle = grad;
        }
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crack lines for detail
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, -r * 0.1);
        ctx.lineTo(r * 0.1, r * 0.3);
        ctx.moveTo(r * 0.1, -r * 0.4);
        ctx.lineTo(r * 0.3, -r * 0.1);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight
        ctx.beginPath();
        ctx.arc(-r * 0.25, -r * 0.25, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fill();

        ctx.restore();
    },

    // ---- ROPE ----
    createRope: function(anchorX, anchorY, bodyB, attachPoint, length, id) {
        // Anchor point in world (static end)
        var anchor = Physics.createStatic(anchorX, anchorY, 6, 6, {
            label: 'rope_anchor',
            render: { visible: false },
            collisionFilter: { group: -1, mask: 0 }
        });
        anchor.gameType = 'rope_anchor';

        var constraint = Physics.createRope(
            anchor, bodyB,
            { x: 0, y: 0 },
            attachPoint || { x: 0, y: 0 },
            length
        );

        var rope = {
            id: id || ('rope_' + Math.random().toString(36).substr(2, 6)),
            anchor: anchor,
            body: bodyB,
            constraint: constraint,
            cut: false,
            anchorX: anchorX,
            anchorY: anchorY,
            attachPoint: attachPoint || { x: 0, y: 0 }
        };
        return rope;
    },

    renderRope: function(ctx, rope, cam) {
        if (rope.cut) return;
        var c = rope.constraint;
        var startX = rope.anchorX;
        var startY = rope.anchorY;
        var endBody = rope.body;
        var ap = rope.attachPoint;
        var endX = endBody.position.x + ap.x;
        var endY = endBody.position.y + ap.y;

        var start = cam.worldToScreen(startX, startY);
        var end = cam.worldToScreen(endX, endY);

        // Rope segments (wavy line)
        var dx = end.x - start.x;
        var dy = end.y - start.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        var segments = Math.max(4, Math.floor(len / 12));

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);

        for (var i = 1; i < segments; i++) {
            var t = i / segments;
            var mx = start.x + dx * t;
            var my = start.y + dy * t;
            // Slight sag
            var sag = Math.sin(t * Math.PI) * len * 0.05;
            ctx.lineTo(mx, my + sag);
        }
        ctx.lineTo(end.x, end.y);

        ctx.strokeStyle = '#a87832';
        ctx.lineWidth = 3 * cam.scale;
        ctx.stroke();

        // Knots at endpoints
        ctx.fillStyle = '#8b6420';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 4 * cam.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(end.x, end.y, 4 * cam.scale, 0, Math.PI * 2);
        ctx.fill();
    },

    // ---- PLATFORM (static) ----
    createPlatform: function(x, y, w, h, angle) {
        var body = Physics.createStatic(x, y, w, h, {
            label: 'platform',
            angle: angle || 0,
            friction: 0.6
        });
        body.gameType = 'platform';
        body.w = w;
        body.h = h;
        return body;
    },

    renderPlatform: function(ctx, body, cam) {
        var verts = body.vertices;
        var p0 = cam.worldToScreen(verts[0].x, verts[0].y);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (var i = 1; i < verts.length; i++) {
            var p = cam.worldToScreen(verts[i].x, verts[i].y);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = '#5a4a3a';
        ctx.fill();
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    // ---- BREAKABLE PLATFORM ----
    createBreakable: function(x, y, w, h) {
        var body = Physics.createStatic(x, y, w, h, {
            label: 'breakable',
            friction: 0.5
        });
        body.gameType = 'breakable';
        body.w = w;
        body.h = h;
        body.hp = 1;
        body.broken = false;
        return body;
    },

    renderBreakable: function(ctx, body, cam) {
        if (body.broken) return;
        var verts = body.vertices;
        var p0 = cam.worldToScreen(verts[0].x, verts[0].y);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (var i = 1; i < verts.length; i++) {
            var p = cam.worldToScreen(verts[i].x, verts[i].y);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = '#7a6040';
        ctx.fill();
        ctx.strokeStyle = '#5a4020';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crack pattern
        var center = cam.worldToScreen(body.position.x, body.position.y);
        var sw = body.w * cam.scale;
        ctx.beginPath();
        ctx.moveTo(center.x - sw * 0.3, center.y);
        ctx.lineTo(center.x, center.y - 2);
        ctx.lineTo(center.x + sw * 0.2, center.y + 1);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    // ---- SEESAW ----
    createSeesaw: function(x, y, w, h) {
        var body = Matter.Bodies.rectangle(x, y, w, h, {
            density: 0.003,
            friction: 0.6,
            label: 'seesaw'
        });
        Physics.addBody(body);
        var hinge = Physics.createHinge(body, { x: x, y: y });
        body.gameType = 'seesaw';
        body.w = w;
        body.h = h;
        body.hinge = hinge;
        return body;
    },

    renderSeesaw: function(ctx, body, cam) {
        var verts = body.vertices;
        var p0 = cam.worldToScreen(verts[0].x, verts[0].y);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (var i = 1; i < verts.length; i++) {
            var p = cam.worldToScreen(verts[i].x, verts[i].y);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = '#6a5a4a';
        ctx.fill();
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fulcrum triangle
        var center = cam.worldToScreen(body.position.x, body.position.y);
        var triSize = 10 * cam.scale;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y + body.h * 0.5 * cam.scale);
        ctx.lineTo(center.x - triSize, center.y + body.h * 0.5 * cam.scale + triSize);
        ctx.lineTo(center.x + triSize, center.y + body.h * 0.5 * cam.scale + triSize);
        ctx.closePath();
        ctx.fillStyle = '#4a3a2a';
        ctx.fill();
    },

    // ---- RAMP (angled static platform) ----
    createRamp: function(x, y, w, h, angle) {
        return this.createPlatform(x, y, w, h, angle);
    },

    // ---- GOBLIN CAMP ----
    createGoblinCamp: function(x, y, w, h) {
        var body = Physics.createStatic(x, y, w, h, {
            label: 'goblin_camp',
            isSensor: true
        });
        body.gameType = 'goblin_camp';
        body.w = w;
        body.h = h || 30;
        body.destroyed = false;
        body.destroyAnim = 0;
        return body;
    },

    renderGoblinCamp: function(ctx, body, cam) {
        var pos = cam.worldToScreen(body.position.x, body.position.y);
        var w = body.w * cam.scale;
        var h = body.h * cam.scale;

        if (body.destroyed) {
            // Destroyed camp - rubble
            var alpha = Math.max(0, 1 - body.destroyAnim);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#4a3020';
            ctx.fillRect(pos.x - w / 2, pos.y - h / 4, w, h / 2);
            // Scatter debris
            for (var i = 0; i < 5; i++) {
                var dx = (Math.sin(i * 2.3) * w * 0.4);
                var dy = (Math.cos(i * 1.7) * h * 0.3);
                ctx.fillStyle = '#5a4030';
                ctx.fillRect(pos.x + dx - 3, pos.y + dy - 3, 6, 6);
            }
            ctx.globalAlpha = 1;
            return;
        }

        // Tent body
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - h * 0.8);
        ctx.lineTo(pos.x - w * 0.45, pos.y + h * 0.3);
        ctx.lineTo(pos.x + w * 0.45, pos.y + h * 0.3);
        ctx.closePath();
        ctx.fillStyle = '#2a7a2a';
        ctx.fill();
        ctx.strokeStyle = '#1a5a1a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tent opening
        ctx.beginPath();
        ctx.moveTo(pos.x - w * 0.1, pos.y + h * 0.3);
        ctx.lineTo(pos.x, pos.y - h * 0.1);
        ctx.lineTo(pos.x + w * 0.1, pos.y + h * 0.3);
        ctx.fillStyle = '#1a4a1a';
        ctx.fill();

        // Flag on top
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - h * 0.8);
        ctx.lineTo(pos.x, pos.y - h * 1.2);
        ctx.strokeStyle = '#654';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Flag cloth
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - h * 1.2);
        ctx.lineTo(pos.x + w * 0.15, pos.y - h * 1.05);
        ctx.lineTo(pos.x, pos.y - h * 0.9);
        ctx.fillStyle = '#e44';
        ctx.fill();

        // Goblin face peeking out
        var faceX = pos.x;
        var faceY = pos.y + h * 0.05;
        ctx.beginPath();
        ctx.arc(faceX, faceY, w * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = '#5a5';
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ff0';
        ctx.beginPath();
        ctx.arc(faceX - w * 0.03, faceY - w * 0.02, 1.5, 0, Math.PI * 2);
        ctx.arc(faceX + w * 0.03, faceY - w * 0.02, 1.5, 0, Math.PI * 2);
        ctx.fill();
    },

    // ---- CRADLE (holds a boulder from below) ----
    createCradle: function(x, y, w) {
        // A static U-shaped body made of 3 rectangles
        var thickness = 6;
        var bottom = Physics.createStatic(x, y, w, thickness, { label: 'cradle_bottom' });
        var left = Physics.createStatic(x - w / 2 + thickness / 2, y - 15, thickness, 30, { label: 'cradle_left' });
        var right = Physics.createStatic(x + w / 2 - thickness / 2, y - 15, thickness, 30, { label: 'cradle_right' });
        bottom.gameType = 'cradle';
        left.gameType = 'cradle';
        right.gameType = 'cradle';
        return { bottom: bottom, left: left, right: right, x: x, y: y, w: w };
    },

    renderCradle: function(ctx, cradle, cam) {
        var parts = [cradle.bottom, cradle.left, cradle.right];
        for (var p = 0; p < parts.length; p++) {
            var verts = parts[p].vertices;
            var p0 = cam.worldToScreen(verts[0].x, verts[0].y);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            for (var i = 1; i < verts.length; i++) {
                var pt = cam.worldToScreen(verts[i].x, verts[i].y);
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.closePath();
            ctx.fillStyle = '#5a4a3a';
            ctx.fill();
        }
    },

    // ---- WALL (level boundary) ----
    createWall: function(x, y, w, h) {
        var body = Physics.createStatic(x, y, w, h, {
            label: 'wall',
            friction: 0.3
        });
        body.gameType = 'wall';
        body.w = w;
        body.h = h;
        return body;
    },

    renderWall: function(ctx, body, cam) {
        var verts = body.vertices;
        var p0 = cam.worldToScreen(verts[0].x, verts[0].y);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        for (var i = 1; i < verts.length; i++) {
            var p = cam.worldToScreen(verts[i].x, verts[i].y);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = '#3a332a';
        ctx.fill();
    }
};
