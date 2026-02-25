/**
 * Tower and Block factories for Stack Thief
 */

var BLOCK_HEIGHT = 30;

var TowerFactory = {
    createBlock(x, y, width, hue) {
        var sat = 60 + Math.random() * 20;
        var light = 50 + Math.random() * 15;
        return {
            x: x,
            y: y,
            width: width,
            height: BLOCK_HEIGHT,
            color: 'hsl(' + hue + ',' + sat + '%,' + light + '%)',
            outlineColor: 'hsl(' + hue + ',' + sat + '%,' + (light - 20) + '%)',
            topColor: 'hsl(' + hue + ',' + sat + '%,' + (light + 10) + '%)',
            hue: hue,
            vx: 0,
            vy: 0,
            angle: 0,
            angularVel: 0,
            state: 'stacked',
            opacity: 1,
            flashTimer: 0,
            // Flying block fields
            startX: 0, startY: 0,
            targetX: 0, targetY: 0,
            flyProgress: 0,
            flyControlX: 0, flyControlY: 0
        };
    },

    createTower(x, baseY, blockCount, hue, isPlayer) {
        var tower = {
            x: x,
            baseY: baseY,
            blocks: [],
            angle: 0,
            angularVelocity: (Math.random() - 0.5) * 0.1,
            isPlayer: isPlayer || false,
            isCollapsed: false,
            collapseTimer: 0,
            highlightTimer: 0,
            maxAngle: isPlayer ? 0.35 : 0.5,
            hue: hue
        };
        for (var i = 0; i < blockCount; i++) {
            var w = 50 + Math.random() * 40;
            if (isPlayer) w = 55 + Math.random() * 30; // slightly more uniform for player
            var block = this.createBlock(x, baseY - i * BLOCK_HEIGHT, w, hue);
            tower.blocks.push(block);
        }
        return tower;
    },

    addBlockToTower(tower, block) {
        block.state = 'stacked';
        block.opacity = 1;
        block.flashTimer = 0.15;
        block.angle = 0;
        block.angularVel = 0;
        block.vx = 0;
        block.vy = 0;
        tower.blocks.push(block);

        // Width mismatch impulse
        if (tower.blocks.length >= 2) {
            var below = tower.blocks[tower.blocks.length - 2];
            var widthDiff = Math.abs(block.width - below.width);
            var impulse = (widthDiff / 100) * 0.08;
            tower.angularVelocity += (Math.random() > 0.5 ? 1 : -1) * impulse;
        }
    },

    removeBlockFromTower(tower, index) {
        var block = tower.blocks.splice(index, 1)[0];
        var blocksAbove = tower.blocks.length - index;

        // Destabilize the tower
        if (blocksAbove > 0) {
            var impulse = 0.05 * (blocksAbove / (tower.blocks.length + 1));
            tower.angularVelocity += (Math.random() > 0.5 ? 1 : -1) * impulse;
        }

        // If 3+ blocks were above the pulled block, tower collapses
        var shouldCollapse = blocksAbove >= 3;

        tower.highlightTimer = 0.3;
        return { block: block, shouldCollapse: shouldCollapse };
    },

    getBlockWorldPositions(tower) {
        var positions = [];
        var baseX = tower.x;
        var baseY = tower.baseY;
        var angle = tower.angle;
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);

        for (var i = 0; i < tower.blocks.length; i++) {
            var block = tower.blocks[i];
            // Local position relative to tower base
            var localX = 0;
            var localY = -(i * BLOCK_HEIGHT + BLOCK_HEIGHT / 2);
            // Rotate around base
            var worldX = baseX + localX * cosA - localY * sinA;
            var worldY = baseY + localX * sinA + localY * cosA;
            positions.push({
                x: worldX,
                y: worldY,
                angle: angle,
                block: block,
                index: i
            });
        }
        return positions;
    },

    getTowerHeight(tower) {
        return tower.blocks.length * BLOCK_HEIGHT;
    },

    getTowerTopY(tower) {
        return tower.baseY - tower.blocks.length * BLOCK_HEIGHT;
    }
};
