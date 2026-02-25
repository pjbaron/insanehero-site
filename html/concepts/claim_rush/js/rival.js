/**
 * RivalManager & Rival - AI opponents
 * Behaviors: patrol (random movement), hunt (chase player trail), claim (grab territory)
 */

var RIVAL_COLORS = [
    '#ff4444', '#ff8800', '#cc44ff', '#44ff44', '#ffff44'
];

function Rival(id, gx, gy, speed, aggression) {
    this.id = id;
    this.gx = gx;
    this.gy = gy;
    this.fx = gx;
    this.fy = gy;
    this.dx = (Math.random() < 0.5) ? 1 : -1;
    this.dy = 0;
    this.speed = speed;
    this.moveAccum = 0;
    this.alive = true;
    this.color = RIVAL_COLORS[(id - 1) % RIVAL_COLORS.length];
    this.aggression = aggression; // 0-1, higher = more hunting
    this.behavior = 'patrol';    // patrol, hunt, claim
    this.behaviorTimer = 2 + Math.random() * 3;
    this.trail = [];
    this.isOutside = false;      // is this rival outside its "home" (neutral)
    this.trailOwner = -(id + 1); // unique trail ID per rival
    this.turnCooldown = 0;
}

Rival.prototype.update = function(dt) {
    if (!this.alive) return;

    this.behaviorTimer -= dt;
    if (this.behaviorTimer <= 0) {
        this.chooseBehavior();
    }

    if (this.turnCooldown > 0) this.turnCooldown -= dt;

    this.moveAccum += this.speed * dt;

    while (this.moveAccum >= 1.0) {
        this.moveAccum -= 1.0;
        this.step();
    }

    this.fx = this.gx + this.dx * this.moveAccum;
    this.fy = this.gy + this.dy * this.moveAccum;
};

Rival.prototype.step = function() {
    // Decide direction based on behavior
    if (this.behavior === 'hunt' && this.turnCooldown <= 0) {
        this.huntStep();
    } else if (this.behavior === 'claim' && this.turnCooldown <= 0) {
        this.claimStep();
    }

    // Random turn chance for patrol
    if (this.behavior === 'patrol' && this.turnCooldown <= 0 && Math.random() < 0.15) {
        this.randomTurn();
    }

    var newX = this.gx + this.dx;
    var newY = this.gy + this.dy;

    // Wall bounce
    if (newX < 0 || newX >= Arena.W) {
        this.dx = -this.dx;
        newX = this.gx + this.dx;
        this.turnCooldown = 0.2;
    }
    if (newY < 0 || newY >= Arena.H) {
        this.dy = -this.dy;
        newY = this.gy + this.dy;
        this.turnCooldown = 0.2;
    }

    newX = Math.max(0, Math.min(Arena.W - 1, newX));
    newY = Math.max(0, Math.min(Arena.H - 1, newY));

    // Check if hitting player trail -> kill player
    var trailVal = Arena.getTrail(newX, newY);
    if (trailVal === Player.TRAIL_OWNER && Player.isOutside && Player.invincibleTimer <= 0) {
        Player.die();
    }

    this.gx = newX;
    this.gy = newY;
};

Rival.prototype.chooseBehavior = function() {
    var roll = Math.random();
    if (Player.isOutside && roll < this.aggression) {
        this.behavior = 'hunt';
        this.behaviorTimer = 3 + Math.random() * 2;
    } else if (roll < 0.3) {
        this.behavior = 'patrol';
        this.behaviorTimer = 2 + Math.random() * 3;
    } else {
        this.behavior = 'patrol';
        this.behaviorTimer = 2 + Math.random() * 2;
    }
};

Rival.prototype.huntStep = function() {
    if (!Player.isOutside || Player.trail.length === 0) {
        this.behavior = 'patrol';
        return;
    }

    // Find nearest trail cell
    var nearest = null;
    var bestDist = Infinity;
    for (var i = 0; i < Player.trail.length; i++) {
        var t = Player.trail[i];
        var dist = Math.abs(t.x - this.gx) + Math.abs(t.y - this.gy);
        if (dist < bestDist) {
            bestDist = dist;
            nearest = t;
        }
    }

    if (nearest) {
        var ddx = nearest.x - this.gx;
        var ddy = nearest.y - this.gy;

        // Pick the axis with larger distance, avoid 180 reversal
        if (Math.abs(ddx) >= Math.abs(ddy)) {
            var wantDx = ddx > 0 ? 1 : -1;
            if (wantDx !== -this.dx || this.dy !== 0) {
                this.dx = wantDx;
                this.dy = 0;
            }
        } else {
            var wantDy = ddy > 0 ? 1 : -1;
            if (wantDy !== -this.dy || this.dx !== 0) {
                this.dx = 0;
                this.dy = wantDy;
            }
        }
        this.turnCooldown = 0.3;
    }
};

Rival.prototype.claimStep = function() {
    // Simple: just patrol, rivals don't claim territory in this version
    // (keeps gameplay focused on player claiming)
    this.behavior = 'patrol';
};

Rival.prototype.randomTurn = function() {
    if (Math.random() < 0.5) {
        // Turn perpendicular
        if (this.dx !== 0) {
            this.dx = 0;
            this.dy = Math.random() < 0.5 ? 1 : -1;
        } else {
            this.dy = 0;
            this.dx = Math.random() < 0.5 ? 1 : -1;
        }
    }
    this.turnCooldown = 0.4;
};


var RivalManager = {
    rivals: [],

    init() {
        this.rivals = [];
    },

    spawnRivals(count, speed, aggression) {
        for (var i = 0; i < count; i++) {
            var pos = Arena.findRivalSpawn();
            var rival = new Rival(i + 2, pos.x, pos.y, speed, aggression);
            this.rivals.push(rival);
        }
    },

    update(dt) {
        for (var i = 0; i < this.rivals.length; i++) {
            this.rivals[i].update(dt);
        }
    },

    /** Check if player collides with any rival */
    checkPlayerCollision() {
        if (!Player.alive || Player.invincibleTimer > 0) return false;
        for (var i = 0; i < this.rivals.length; i++) {
            var r = this.rivals[i];
            if (!r.alive) continue;
            if (r.gx === Player.gx && r.gy === Player.gy) {
                // If player is on their own territory, player is safe
                if (Arena.isPlayerTerritory(Player.gx, Player.gy)) continue;
                return true;
            }
        }
        return false;
    },

    /** Check if any rival is on the player's trail */
    checkTrailCollision() {
        if (!Player.alive || !Player.isOutside || Player.invincibleTimer > 0) return false;
        for (var i = 0; i < this.rivals.length; i++) {
            var r = this.rivals[i];
            if (!r.alive) continue;
            if (Arena.getTrail(r.gx, r.gy) === Player.TRAIL_OWNER) {
                return true;
            }
        }
        return false;
    }
};
