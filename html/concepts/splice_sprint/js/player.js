/**
 * Splice Sprint - Player State
 * Handles position, speed, effects, death conditions
 */

var Player = {
    z: 0,
    x: 0,           // lateral offset within road
    y: 0,           // vertical offset (for ramp jumps)
    speed: 0,
    baseSpeed: 0,
    targetX: 0,     // target X for smooth lane switching

    // Effects
    boosted: false,
    boostTimer: 0,
    mudded: false,
    mudTimer: 0,
    airborne: false,
    airTimer: 0,
    airDuration: 0,
    onBridge: false,
    bridgeWobble: 0,

    // Death
    dying: false,
    deathTimer: 0,
    deathType: '',   // 'deadEnd' or 'bridge'

    // Score
    score: 0,
    distance: 0,
    coins: 0,
    highScore: 0,

    // Visual
    tilt: 0,         // lean angle
    trail: [],       // [{x, y, z, age}] for speed trail effect
    bobPhase: 0,

    reset: function() {
        this.z = 0;
        this.x = 0;
        this.y = 0;
        this.speed = C.SPEED_MIN;
        this.baseSpeed = C.SPEED_MIN;
        this.targetX = 0;
        this.boosted = false;
        this.boostTimer = 0;
        this.mudded = false;
        this.mudTimer = 0;
        this.airborne = false;
        this.airTimer = 0;
        this.airDuration = 0;
        this.onBridge = false;
        this.bridgeWobble = 0;
        this.dying = false;
        this.deathTimer = 0;
        this.deathType = '';
        this.score = 0;
        this.distance = 0;
        this.coins = 0;
        this.tilt = 0;
        this.trail = [];
        this.bobPhase = 0;

        // Load high score
        try {
            var saved = localStorage.getItem('splice_sprint_high');
            if (saved) this.highScore = parseInt(saved) || 0;
        } catch (e) {}
    },

    saveHighScore: function() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try {
                localStorage.setItem('splice_sprint_high', String(this.highScore));
            } catch (e) {}
        }
    },

    update: function(dt) {
        if (this.dying) {
            this.deathTimer += dt;
            this.speed *= (1 - dt * 3); // slow down rapidly
            if (this.speed < 10) this.speed = 0;
            this.z += this.speed * dt;
            return;
        }

        // Calculate base speed from distance
        this.baseSpeed = Math.min(C.SPEED_MIN + this.distance * C.SPEED_ACCEL, C.SPEED_MAX);

        // Apply boost/mud modifiers
        var speedMult = 1;
        if (this.boosted) {
            speedMult = C.BOOST_MULT;
            this.boostTimer -= dt;
            if (this.boostTimer <= 0) {
                this.boosted = false;
            }
        }
        if (this.mudded) {
            speedMult *= C.MUD_MULT;
            this.mudTimer -= dt;
            if (this.mudTimer <= 0) {
                this.mudded = false;
            }
        }

        this.speed = this.baseSpeed * speedMult;

        // Airborne (ramp jump)
        if (this.airborne) {
            this.airTimer += dt;
            var t = this.airTimer / this.airDuration;
            if (t >= 1) {
                this.airborne = false;
                this.y = 0;
                this.airTimer = 0;
            } else {
                // Parabolic arc
                this.y = C.RAMP_HEIGHT * 4 * t * (1 - t);
            }
        }

        // Move forward
        this.z += this.speed * dt;
        this.distance = this.z;

        // Bridge wobble
        if (this.onBridge) {
            this.bridgeWobble += (Math.random() - 0.5) * C.BRIDGE_WOBBLE * this.speed * dt;
            this.bridgeWobble *= 0.98; // dampen slightly
        } else {
            this.bridgeWobble *= 0.9;
        }

        // Smooth lateral movement
        var lerpSpeed = 8;
        this.x += (this.targetX + this.bridgeWobble - this.x) * Math.min(lerpSpeed * dt, 1);

        // Tilt based on lateral movement
        var lateralVel = this.targetX - this.x;
        this.tilt += (lateralVel * 0.02 - this.tilt) * Math.min(5 * dt, 1);

        // Bob phase
        this.bobPhase += this.speed * dt * 0.05;

        // Score
        this.score = Math.floor(this.distance * C.SCORE_PER_METER / 10);

        // Trail
        if (this.speed > C.SPEED_MIN * 1.2) {
            this.trail.push({
                x: this.x,
                y: this.y,
                z: this.z,
                age: 0
            });
        }

        // Age and cull trail
        for (var i = this.trail.length - 1; i >= 0; i--) {
            this.trail[i].age += dt;
            if (this.trail[i].age > 0.5) {
                this.trail.splice(i, 1);
            }
        }
    },

    applyBoost: function() {
        this.boosted = true;
        this.boostTimer = C.BOOST_DURATION;
        this.score += C.SCORE_BOOST_BONUS;
    },

    applyMud: function() {
        this.mudded = true;
        this.mudTimer = C.MUD_DURATION;
    },

    applyRamp: function() {
        if (this.airborne) return;
        this.airborne = true;
        this.airTimer = 0;
        this.airDuration = C.RAMP_AIRTIME;
        this.score += C.SCORE_RAMP_BONUS;
    },

    startDeath: function(type) {
        if (this.dying) return;
        this.dying = true;
        this.deathType = type;
        this.deathTimer = 0;
    },

    isDead: function() {
        if (!this.dying) return false;
        return this.deathTimer >= C.DEAD_END_DURATION;
    },

    collectCoin: function() {
        this.coins++;
        this.score += C.SCORE_COIN_BONUS;
    }
};
