/**
 * Player - grid-based movement, trail drawing, territory claiming
 */

const Player = {
    gx: 0, gy: 0,        // grid position (integer)
    fx: 0, fy: 0,        // fractional position (for smooth rendering)
    dx: 0, dy: -1,       // current direction
    nextDx: 0, nextDy: 0, // queued direction
    speed: 8,            // cells per second
    trail: [],           // array of {x,y} grid cells visited while outside
    isOutside: false,    // currently outside own territory
    alive: true,
    lives: 3,
    invincibleTimer: 0,  // brief invincibility after respawn
    moveAccum: 0,        // fractional movement accumulator
    color: '#4488ff',
    trailColor: '#6699ff',
    TRAIL_OWNER: -1,

    // Swipe input state
    swipeStartX: 0,
    swipeStartY: 0,
    isSwiping: false,

    init(startPos, speed) {
        this.gx = startPos.x;
        this.gy = startPos.y;
        this.fx = startPos.x;
        this.fy = startPos.y;
        this.dx = 0;
        this.dy = -1;
        this.nextDx = 0;
        this.nextDy = -1;
        this.speed = speed || 8;
        this.trail = [];
        this.isOutside = false;
        this.alive = true;
        this.moveAccum = 0;
        this.invincibleTimer = 1.0;
    },

    queueDirection(ndx, ndy) {
        // Don't allow reversal (180 degree turn)
        if (ndx === -this.dx && ndy === -this.dy) return;
        // Don't allow diagonal
        if (ndx !== 0 && ndy !== 0) return;
        // Don't allow stop
        if (ndx === 0 && ndy === 0) return;
        this.nextDx = ndx;
        this.nextDy = ndy;
    },

    update(dt) {
        if (!this.alive) return;

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }

        this.moveAccum += this.speed * dt;

        while (this.moveAccum >= 1.0) {
            this.moveAccum -= 1.0;

            // Apply queued direction at grid boundary
            if (this.nextDx !== this.dx || this.nextDy !== this.dy) {
                this.dx = this.nextDx;
                this.dy = this.nextDy;
            }

            // Move one cell
            var newX = this.gx + this.dx;
            var newY = this.gy + this.dy;

            // Wall bounce
            if (newX < 0 || newX >= Arena.W) {
                this.dx = -this.dx;
                this.nextDx = this.dx;
                newX = this.gx + this.dx;
            }
            if (newY < 0 || newY >= Arena.H) {
                this.dy = -this.dy;
                this.nextDy = this.dy;
                newY = this.gy + this.dy;
            }

            // Clamp
            newX = Math.max(0, Math.min(Arena.W - 1, newX));
            newY = Math.max(0, Math.min(Arena.H - 1, newY));

            // Check self-crossing trail
            if (this.isOutside && Arena.getTrail(newX, newY) === this.TRAIL_OWNER) {
                this.die();
                return;
            }

            this.gx = newX;
            this.gy = newY;

            var onPlayerTerritory = Arena.isPlayerTerritory(newX, newY);

            if (this.isOutside) {
                if (onPlayerTerritory) {
                    // Returned home - claim territory!
                    this.closeClaim();
                } else {
                    // Still outside - add to trail
                    this.trail.push({ x: newX, y: newY });
                    Arena.setTrail(newX, newY, this.TRAIL_OWNER);
                }
            } else {
                if (!onPlayerTerritory) {
                    // Just left territory
                    this.isOutside = true;
                    this.trail = [{ x: newX, y: newY }];
                    Arena.setTrail(newX, newY, this.TRAIL_OWNER);
                }
            }
        }

        // Smooth position for rendering
        this.fx = this.gx + this.dx * this.moveAccum;
        this.fy = this.gy + this.dy * this.moveAccum;
    },

    closeClaim() {
        // Get rivals for flood fill exclusion
        var rivals = [];
        if (typeof RivalManager !== 'undefined') {
            for (var i = 0; i < RivalManager.rivals.length; i++) {
                var r = RivalManager.rivals[i];
                if (r.alive) rivals.push({ gx: r.gx, gy: r.gy });
            }
        }

        var claimed = Arena.claimTerritory(this.trail, rivals);

        // Clear trail
        Arena.clearTrail(this.TRAIL_OWNER);
        this.trail = [];
        this.isOutside = false;

        // Spawn particles for claimed cells
        if (claimed.length > 0 && typeof Particles !== 'undefined') {
            // Burst particles on a sample of claimed cells
            var step = Math.max(1, Math.floor(claimed.length / 40));
            for (var i = 0; i < claimed.length; i += step) {
                Particles.claimBurst(claimed[i].x, claimed[i].y);
            }
        }

        // Score
        var points = claimed.length * 10;
        if (claimed.length > 50) points = Math.floor(points * 1.5); // big claim bonus
        if (typeof ClaimRush !== 'undefined') {
            ClaimRush.addScore(points);
            if (claimed.length > 0) {
                Particles.floatingText(
                    '+' + points,
                    this.gx, this.gy, '#ffff00'
                );
            }
        }

        // Sound
        if (typeof Synth !== 'undefined') {
            if (claimed.length > 20) {
                Synth.bigClaim();
            } else if (claimed.length > 0) {
                Synth.claim();
            }
        }

        return claimed;
    },

    die() {
        if (this.invincibleTimer > 0) return;

        this.alive = false;
        this.lives--;

        // Clear trail
        Arena.clearTrail(this.TRAIL_OWNER);
        this.trail = [];
        this.isOutside = false;

        // Death particles
        if (typeof Particles !== 'undefined') {
            Particles.explosion(this.gx, this.gy, this.color);
        }

        // Sound
        if (typeof Synth !== 'undefined') {
            Synth.death();
        }

        // Screen shake
        if (typeof ClaimRush !== 'undefined') {
            ClaimRush.screenShake(12, 0.3);
        }
    },

    respawn() {
        var pos = Arena.setupPlayerStart();
        this.gx = pos.x;
        this.gy = pos.y;
        this.fx = pos.x;
        this.fy = pos.y;
        this.dx = 0;
        this.dy = -1;
        this.nextDx = 0;
        this.nextDy = -1;
        this.alive = true;
        this.moveAccum = 0;
        this.invincibleTimer = 1.5;
        this.trail = [];
        this.isOutside = false;
    },

    handleInput(input, canvas) {
        // Keyboard
        if (input.isUp()) this.queueDirection(0, -1);
        else if (input.isDownKey()) this.queueDirection(0, 1);
        else if (input.isLeft()) this.queueDirection(-1, 0);
        else if (input.isRight()) this.queueDirection(1, 0);
    }
};
