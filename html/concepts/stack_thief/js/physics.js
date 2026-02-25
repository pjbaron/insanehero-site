/**
 * Tower Physics Engine for Stack Thief
 * Inverted pendulum sway model with earthquake and bracing
 */

var TowerPhysics = {
    GRAVITY_FACTOR: 3.0,
    DAMPING: 1.8,
    HEIGHT_PENALTY: 0.04,

    updateTower(tower, dt, earthquakeIntensity, braceActive) {
        if (tower.isCollapsed) {
            tower.collapseTimer -= dt;
            this._updateCollapseBlocks(tower, dt);
            return;
        }
        if (tower.blocks.length === 0) return;

        tower.highlightTimer = Math.max(0, tower.highlightTimer - dt);

        var heightMul = 1.0 + tower.blocks.length * this.HEIGHT_PENALTY;
        var gravFactor = this.GRAVITY_FACTOR * heightMul;
        var damping = this.DAMPING;

        // Bracing multiplies damping and clamps velocity
        if (braceActive && tower.isPlayer) {
            damping *= 5.0;
        }

        // Restoring torque
        var angularAccel = -gravFactor * Math.sin(tower.angle);

        // Damping
        angularAccel -= tower.angularVelocity * damping;

        // Earthquake random impulse (per-frame, not divided by dt)
        if (earthquakeIntensity > 0 && dt > 0) {
            angularAccel += (Math.random() * 2 - 1) * earthquakeIntensity * 0.5;
        }

        // Integrate
        tower.angularVelocity += angularAccel * dt;
        tower.angle += tower.angularVelocity * dt;

        // Bracing extra clamp
        if (braceActive && tower.isPlayer) {
            tower.angularVelocity *= 0.9;
        }
    },

    checkTopple(tower) {
        if (tower.isCollapsed) return false;
        return Math.abs(tower.angle) > tower.maxAngle;
    },

    collapseTower(tower) {
        tower.isCollapsed = true;
        tower.collapseTimer = 1.5;

        var positions = TowerFactory.getBlockWorldPositions(tower);
        for (var i = 0; i < tower.blocks.length; i++) {
            var block = tower.blocks[i];
            var pos = positions[i];
            block.state = 'falling';
            block.x = pos.x;
            block.y = pos.y;
            block.angle = pos.angle;
            // Scatter velocities - outward from tower lean direction
            var dir = tower.angle > 0 ? 1 : -1;
            block.vx = dir * (30 + Math.random() * 80) + (Math.random() - 0.5) * 40;
            block.vy = -(50 + Math.random() * 100);
            block.angularVel = (Math.random() - 0.5) * 8;
        }
    },

    _updateCollapseBlocks(tower, dt) {
        for (var i = 0; i < tower.blocks.length; i++) {
            var block = tower.blocks[i];
            if (block.state !== 'falling') continue;
            block.vy += 400 * dt; // gravity
            block.x += block.vx * dt;
            block.y += block.vy * dt;
            block.angle += block.angularVel * dt;
            block.opacity = Math.max(0, tower.collapseTimer / 1.5);
        }
    }
};
