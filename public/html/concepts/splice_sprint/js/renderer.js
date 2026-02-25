/**
 * Splice Sprint - Pseudo-3D Renderer
 * Projects world coordinates to screen via perspective divide
 * Draws road as trapezoids, handles fork visualization
 */

var Renderer = {
    shakeX: 0,
    shakeY: 0,
    shakeAmount: 0,
    flashAlpha: 0,
    flashColor: '#ffffff',
    time: 0,

    // Project world (x, y, z) to screen (sx, sy, scale)
    project: function(wx, wy, wz, playerZ, w, h) {
        var relZ = wz - playerZ + C.CAM_DIST;
        if (relZ < 1) relZ = 1;
        var scale = C.FOV / relZ;
        var sx = w / 2 + wx * scale;
        var sy = h * 0.65 - (wy + C.CAM_HEIGHT) * scale;
        return { x: sx, y: sy, s: scale };
    },

    shake: function(amount) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    },

    flash: function(color) {
        this.flashAlpha = 0.5;
        this.flashColor = color;
    },

    update: function(dt) {
        this.time += dt;

        // Decay shake
        if (this.shakeAmount > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeAmount * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeAmount * 2;
            this.shakeAmount *= Math.pow(0.01, dt);
            if (this.shakeAmount < 0.5) {
                this.shakeAmount = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            }
        }

        // Decay flash
        if (this.flashAlpha > 0) {
            this.flashAlpha -= dt * 3;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
    },

    // Draw sky gradient
    renderSky: function(ctx, w, h) {
        var grad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
        grad.addColorStop(0, C.SKY_TOP);
        grad.addColorStop(1, C.SKY_BOT);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Stars
        ctx.fillStyle = '#ffffff';
        var seed = 42;
        for (var i = 0; i < 40; i++) {
            seed = (seed * 16807 + 0) % 2147483647;
            var sx = (seed % w);
            seed = (seed * 16807 + 0) % 2147483647;
            var sy = (seed % (h * 0.5));
            var twinkle = Math.sin(this.time * 3 + i) * 0.5 + 0.5;
            ctx.globalAlpha = 0.3 + twinkle * 0.5;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
    },

    // Draw ground plane
    renderGround: function(ctx, w, h, playerZ) {
        var horizonY = h * 0.65;
        ctx.fillStyle = C.GRASS_DARK;
        ctx.fillRect(0, horizonY, w, h - horizonY);
    },

    // Main road rendering
    renderTrack: function(ctx, w, h, segments, playerZ, playerX, playerY) {
        // Sort segments by Z (far to near)
        segments.sort(function(a, b) { return b.z - a.z; });

        var self = this;
        var segLen = C.SEGMENT_LENGTH;

        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            var relZ = seg.z - playerZ;
            if (relZ < -C.CULL_BEHIND || relZ > C.DRAW_DIST) continue;

            // Project bottom and top of segment
            var pBot = this.project(seg.x - playerX, -playerY, seg.z, playerZ, w, h);
            var pTop = this.project(seg.x - playerX, -playerY, seg.z + segLen, playerZ, w, h);

            if (pBot.s < 0.001 || pTop.s < 0.001) continue;

            var halfWBot = seg.width * pBot.s * 0.5;
            var halfWTop = seg.width * pTop.s * 0.5;

            // Grass strips (wider than road)
            var grassMult = 3;
            var altIndex = Math.floor(seg.z / segLen) % 2;
            ctx.fillStyle = altIndex ? C.GRASS_DARK : C.GRASS_LIGHT;
            ctx.beginPath();
            ctx.moveTo(pBot.x - halfWBot * grassMult, pBot.y);
            ctx.lineTo(pTop.x - halfWTop * grassMult, pTop.y);
            ctx.lineTo(pTop.x + halfWTop * grassMult, pTop.y);
            ctx.lineTo(pBot.x + halfWBot * grassMult, pBot.y);
            ctx.fill();

            // Road surface
            var roadColor = this._getSegColor(seg, altIndex);
            ctx.fillStyle = roadColor;
            ctx.beginPath();
            ctx.moveTo(pBot.x - halfWBot, pBot.y);
            ctx.lineTo(pTop.x - halfWTop, pTop.y);
            ctx.lineTo(pTop.x + halfWTop, pTop.y);
            ctx.lineTo(pBot.x + halfWBot, pBot.y);
            ctx.fill();

            // Road edge lines
            ctx.strokeStyle = this._getEdgeColor(seg);
            ctx.lineWidth = Math.max(1, pBot.s * 3);
            ctx.beginPath();
            ctx.moveTo(pBot.x - halfWBot, pBot.y);
            ctx.lineTo(pTop.x - halfWTop, pTop.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pBot.x + halfWBot, pBot.y);
            ctx.lineTo(pTop.x + halfWTop, pTop.y);
            ctx.stroke();

            // Center line
            if (seg.type === 'normal' || seg.type === 'boost' || seg.type === 'coins') {
                ctx.strokeStyle = C.ROAD_LINE;
                ctx.lineWidth = Math.max(0.5, pBot.s * 1.5);
                ctx.setLineDash([pBot.s * 10, pBot.s * 10]);
                ctx.beginPath();
                ctx.moveTo(pBot.x, pBot.y);
                ctx.lineTo(pTop.x, pTop.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Type-specific decorations
            this._renderSegDecor(ctx, seg, pBot, pTop, halfWBot, halfWTop, w, h, playerZ);

            // Coins
            for (var c = 0; c < seg.coins.length; c++) {
                var coin = seg.coins[c];
                if (coin.collected) continue;
                var cp = this.project(coin.x - playerX, -playerY + 15, coin.z, playerZ, w, h);
                if (cp.s < 0.005) continue;
                var cRadius = C.COIN_RADIUS * cp.s;
                var coinBob = Math.sin(this.time * 5 + coin.z * 0.1) * 3 * cp.s;

                // Glow
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = C.COIN_GLOW;
                ctx.beginPath();
                ctx.arc(cp.x, cp.y + coinBob, cRadius * 2, 0, Math.PI * 2);
                ctx.fill();

                // Coin
                ctx.globalAlpha = 1;
                ctx.fillStyle = C.COIN_COLOR;
                ctx.beginPath();
                ctx.arc(cp.x, cp.y + coinBob, cRadius, 0, Math.PI * 2);
                ctx.fill();

                // Shine
                ctx.fillStyle = '#fff';
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(cp.x - cRadius * 0.3, cp.y + coinBob - cRadius * 0.3, cRadius * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    },

    _getSegColor: function(seg, alt) {
        switch (seg.type) {
            case 'boost':
                var pulse = Math.sin(this.time * 8) * 0.15 + 0.85;
                return alt ? this._dimColor(C.BOOST_COLOR, pulse) : this._dimColor(C.BOOST_COLOR, pulse * 0.8);
            case 'mud':
                return alt ? C.MUD_COLOR : C.MUD_DARK;
            case 'bridge':
                return alt ? C.BRIDGE_COLOR : '#775533';
            case 'deadEnd':
                var warn = Math.sin(this.time * 6) * 0.3 + 0.7;
                if (seg.crumbling) {
                    return this._dimColor(C.DEAD_END_COLOR, warn);
                }
                return alt ? '#442222' : '#3a1a1a';
            case 'ramp':
                return alt ? C.RAMP_COLOR : '#dd8800';
            case 'coins':
                return alt ? '#334455' : '#2a3a4a';
            default:
                return alt ? C.ROAD_DARK : C.ROAD_LIGHT;
        }
    },

    _getEdgeColor: function(seg) {
        switch (seg.type) {
            case 'boost': return C.BOOST_GLOW;
            case 'deadEnd': return C.DEAD_END_COLOR;
            case 'ramp': return C.RAMP_COLOR;
            case 'bridge': return C.BRIDGE_RAIL;
            default: return C.ROAD_EDGE;
        }
    },

    _renderSegDecor: function(ctx, seg, pBot, pTop, halfWBot, halfWTop, w, h, playerZ) {
        if (seg.type === 'boost') {
            // Chevron arrows on boost pads
            var midX = (pBot.x + pTop.x) / 2;
            var midY = (pBot.y + pTop.y) / 2;
            var arrowSize = Math.max(3, pBot.s * 15);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, pBot.s * 2);
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(midX - arrowSize, midY + arrowSize * 0.5);
            ctx.lineTo(midX, midY - arrowSize * 0.5);
            ctx.lineTo(midX + arrowSize, midY + arrowSize * 0.5);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (seg.type === 'bridge') {
            // Bridge railings
            var railH = 20 * pBot.s;
            ctx.fillStyle = C.BRIDGE_RAIL;
            ctx.fillRect(pBot.x - halfWBot - 2, pBot.y - railH, Math.max(2, pBot.s * 4), railH);
            ctx.fillRect(pBot.x + halfWBot - 2, pBot.y - railH, Math.max(2, pBot.s * 4), railH);
        }

        if (seg.type === 'ramp' && seg.z > playerZ) {
            // Ramp triangle indicator
            var rampH = 30 * pBot.s;
            ctx.fillStyle = C.RAMP_COLOR;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(pBot.x - halfWBot * 0.3, pBot.y);
            ctx.lineTo(pBot.x, pBot.y - rampH);
            ctx.lineTo(pBot.x + halfWBot * 0.3, pBot.y);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        if (seg.crumbling) {
            // Crumble cracks (seeded by segment Z to avoid flicker)
            ctx.strokeStyle = '#000';
            ctx.lineWidth = Math.max(1, pBot.s * 2);
            ctx.globalAlpha = 0.6;
            var cx = pBot.x;
            var cy = pBot.y;
            var cseed = Math.floor(seg.z * 7.3);
            for (var j = 0; j < 3; j++) {
                cseed = (cseed * 16807 + 13) % 2147483647;
                var ox = ((cseed % 1000) / 1000 - 0.5) * halfWBot;
                cseed = (cseed * 16807 + 13) % 2147483647;
                var oy = ((cseed % 1000) / 1000 - 0.5) * 5 * pBot.s;
                cseed = (cseed * 16807 + 13) % 2147483647;
                var dx2 = ((cseed % 1000) / 1000 - 0.5) * 10 * pBot.s;
                cseed = (cseed * 16807 + 13) % 2147483647;
                var dy2 = ((cseed % 1000) / 1000) * 8 * pBot.s;
                ctx.beginPath();
                ctx.moveTo(cx + ox, cy + oy);
                ctx.lineTo(cx + ox + dx2, cy + oy + dy2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    },

    // Render the player character
    renderPlayer: function(ctx, w, h, player) {
        // Player is always at a fixed screen position
        var screenX = w / 2 + this.shakeX;
        var screenY = h * 0.72 - player.y * 0.5 + this.shakeY;
        var scale = 1;

        // Body
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(player.tilt);

        // Shadow
        if (!player.airborne) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, C.PLAYER_HEIGHT * 0.5 * scale, C.PLAYER_WIDTH * 0.5 * scale, 5 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Shadow gets smaller when airborne
            var airT = player.airTimer / player.airDuration;
            var shadowScale = 1 - Math.sin(airT * Math.PI) * 0.6;
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath();
            ctx.ellipse(0, C.PLAYER_HEIGHT * 0.5 + player.y * 0.3, C.PLAYER_WIDTH * 0.3 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Runner body - simple geometric shape
        var bob = Math.sin(player.bobPhase) * 3;
        var pw = C.PLAYER_WIDTH * scale;
        var ph = C.PLAYER_HEIGHT * scale;

        // Legs (running animation)
        var legPhase = player.bobPhase * 2;
        var legSpread = Math.sin(legPhase) * 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(-4 + legSpread, ph * 0.1, 6, ph * 0.4);
        ctx.fillRect(-4 - legSpread, ph * 0.1, 6, ph * 0.4);

        // Body
        ctx.fillStyle = C.PLAYER_COLOR;
        ctx.beginPath();
        ctx.moveTo(-pw * 0.4, ph * 0.1 + bob);
        ctx.lineTo(-pw * 0.3, -ph * 0.4 + bob);
        ctx.lineTo(0, -ph * 0.5 + bob);
        ctx.lineTo(pw * 0.3, -ph * 0.4 + bob);
        ctx.lineTo(pw * 0.4, ph * 0.1 + bob);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.fillStyle = C.PLAYER_ACCENT;
        ctx.beginPath();
        ctx.arc(0, -ph * 0.5 + bob - 8, 8, 0, Math.PI * 2);
        ctx.fill();

        // Boost effect glow
        if (player.boosted) {
            ctx.globalAlpha = 0.4 + Math.sin(this.time * 15) * 0.2;
            ctx.fillStyle = C.BOOST_COLOR;
            ctx.beginPath();
            ctx.arc(0, 0, pw, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Mud overlay
        if (player.mudded) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = C.MUD_COLOR;
            ctx.fillRect(-pw * 0.5, -ph * 0.3, pw, ph * 0.6);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    },

    // Fork arrows/indicators
    renderForkIndicators: function(ctx, w, h, fork, playerZ) {
        if (!fork || fork.chosen !== -1) return;

        var distToFork = fork.z - playerZ;
        if (distToFork > 300 || distToFork < 10) return;

        var urgency = 1 - (distToFork / 300);
        var pulse = Math.sin(this.time * C.ARROW_PULSE_SPEED) * 0.3 + 0.7;
        var alpha = urgency * pulse;

        var branches = fork.branches;
        var arrowY = h * 0.4;
        var arrowSize = C.ARROW_SIZE * (0.8 + urgency * 0.4);

        ctx.globalAlpha = alpha;

        for (var i = 0; i < branches.length; i++) {
            var b = branches[i];
            var arrowX;
            if (branches.length === 2) {
                arrowX = b.dir < 0 ? w * 0.2 : w * 0.8;
            } else {
                arrowX = w * (0.2 + i * 0.3);
            }

            // Arrow background glow
            ctx.fillStyle = this._typeGlowColor(b.type);
            ctx.beginPath();
            ctx.arc(arrowX, arrowY, arrowSize * 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Arrow shape
            ctx.fillStyle = C.ARROW_COLOR;
            ctx.beginPath();
            if (b.dir < 0) {
                // Left arrow
                ctx.moveTo(arrowX - arrowSize * 0.6, arrowY);
                ctx.lineTo(arrowX + arrowSize * 0.2, arrowY - arrowSize * 0.5);
                ctx.lineTo(arrowX + arrowSize * 0.2, arrowY + arrowSize * 0.5);
            } else if (b.dir > 0) {
                // Right arrow
                ctx.moveTo(arrowX + arrowSize * 0.6, arrowY);
                ctx.lineTo(arrowX - arrowSize * 0.2, arrowY - arrowSize * 0.5);
                ctx.lineTo(arrowX - arrowSize * 0.2, arrowY + arrowSize * 0.5);
            } else {
                // Up arrow (center)
                ctx.moveTo(arrowX, arrowY - arrowSize * 0.5);
                ctx.lineTo(arrowX - arrowSize * 0.4, arrowY + arrowSize * 0.3);
                ctx.lineTo(arrowX + arrowSize * 0.4, arrowY + arrowSize * 0.3);
            }
            ctx.fill();

            // Type icon/color indicator
            ctx.fillStyle = this._typeIndicatorColor(b.type);
            ctx.beginPath();
            ctx.arc(arrowX, arrowY + arrowSize * 0.8, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    },

    _typeGlowColor: function(type) {
        switch (type) {
            case 'boost': return 'rgba(0,255,170,0.3)';
            case 'coins': return 'rgba(255,215,0,0.3)';
            case 'ramp': return 'rgba(255,170,0,0.3)';
            case 'mud': return 'rgba(139,105,20,0.3)';
            case 'bridge': return 'rgba(136,102,68,0.3)';
            case 'deadEnd': return 'rgba(255,34,0,0.3)';
            default: return 'rgba(100,100,150,0.2)';
        }
    },

    _typeIndicatorColor: function(type) {
        switch (type) {
            case 'boost': return C.BOOST_COLOR;
            case 'coins': return C.COIN_COLOR;
            case 'ramp': return C.RAMP_COLOR;
            case 'mud': return C.MUD_COLOR;
            case 'bridge': return C.BRIDGE_COLOR;
            case 'deadEnd': return C.DEAD_END_COLOR;
            default: return '#888';
        }
    },

    // HUD
    renderHUD: function(ctx, w, h, player, track) {
        ctx.save();

        // Score
        ctx.font = 'bold ' + C.HUD_SIZE + 'px ' + C.FONT;
        ctx.textAlign = 'left';
        ctx.fillStyle = C.HUD_SHADOW;
        ctx.fillText(Math.floor(player.score), 22, 42);
        ctx.fillStyle = C.HUD_COLOR;
        ctx.fillText(Math.floor(player.score), 20, 40);

        // Coins
        ctx.fillStyle = C.COIN_COLOR;
        ctx.beginPath();
        ctx.arc(w - 50, 32, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.HUD_COLOR;
        ctx.textAlign = 'right';
        ctx.fillText(player.coins, w - 65, 40);

        // Speed bar
        var speedFrac = (player.speed - C.SPEED_MIN) / (C.SPEED_MAX - C.SPEED_MIN);
        var barW = 80;
        var barH = 8;
        var barX = 20;
        var barY = 55;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        var speedColor = player.boosted ? C.BOOST_COLOR : (speedFrac > 0.7 ? '#ff4444' : '#00aaff');
        ctx.fillStyle = speedColor;
        ctx.fillRect(barX, barY, barW * speedFrac, barH);

        // High score
        if (player.highScore > 0) {
            ctx.font = '14px ' + C.FONT;
            ctx.fillStyle = '#888';
            ctx.textAlign = 'left';
            ctx.fillText('BEST: ' + player.highScore, 20, 82);
        }

        ctx.restore();
    },

    // Screen flash overlay
    renderFlash: function(ctx, w, h) {
        if (this.flashAlpha > 0) {
            ctx.fillStyle = this.flashColor;
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }
    },

    // Death screen overlay
    renderDeathOverlay: function(ctx, w, h, player) {
        if (!player.dying) return;
        var t = Math.min(player.deathTimer / C.DEAD_END_DURATION, 1);
        ctx.fillStyle = '#000';
        ctx.globalAlpha = t * 0.5;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
    },

    // Ghost/route comparison map for game over
    renderGhostMap: function(ctx, w, h, forkHistory) {
        if (forkHistory.length === 0) return;

        var mapW = w * C.GHOST_MAP_WIDTH;
        var mapH = h * C.GHOST_MAP_HEIGHT;
        var mapX = (w - mapW) / 2;
        var mapY = h * 0.25;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        // Rounded rect with fallback
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(mapX - 10, mapY - 10, mapW + 20, mapH + 20, 10);
        } else {
            ctx.rect(mapX - 10, mapY - 10, mapW + 20, mapH + 20);
        }
        ctx.fill();
        ctx.stroke();

        // Title
        ctx.font = 'bold 16px ' + C.FONT;
        ctx.fillStyle = '#aaa';
        ctx.textAlign = 'center';
        ctx.fillText('YOUR ROUTE vs OPTIMAL', w / 2, mapY + 5);

        // Cap display to last N forks that fit
        var maxForks = Math.min(forkHistory.length, Math.floor((mapH - 30) / 16));
        var startIdx = forkHistory.length - maxForks;
        var stepH = Math.min((mapH - 30) / (maxForks + 1), 30);
        var centerX = w / 2;

        var playerX = centerX;
        var optimalX = centerX;

        for (var i = startIdx; i < forkHistory.length; i++) {
            var drawIdx = i - startIdx;
            var entry = forkHistory[i];
            var y1 = mapY + 25 + drawIdx * stepH;
            var y2 = y1 + stepH;

            // Player path
            var chosenDir = entry.chosen === 0 ? -1 : 1;
            var newPlayerX = playerX + chosenDir * 20;
            ctx.strokeStyle = entry.chosen === entry.optimal ? '#00ff88' : '#ff4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(playerX, y1);
            ctx.lineTo(newPlayerX, y2);
            ctx.stroke();
            playerX = newPlayerX;

            // Optimal path (dashed)
            var optDir = entry.optimal === 0 ? -1 : 1;
            var newOptX = optimalX + optDir * 20;
            ctx.strokeStyle = 'rgba(0,255,136,0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(optimalX, y1);
            ctx.lineTo(newOptX, y2);
            ctx.stroke();
            ctx.setLineDash([]);
            optimalX = newOptX;

            // Fork dot
            ctx.fillStyle = entry.chosen === entry.optimal ? '#00ff88' : '#ff4444';
            ctx.beginPath();
            ctx.arc(newPlayerX, y2, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _dimColor: function(hex, factor) {
        // Simple hex color dimming
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        r = Math.floor(r * factor);
        g = Math.floor(g * factor);
        b = Math.floor(b * factor);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
};
