export function getRandomAlienPattern(scene) {
    const patterns = [
        straightDownPattern,
        zigzagPattern,
        circularPattern
    ];
    return Phaser.Math.RND.pick(patterns)(scene);
}

function straightDownPattern(scene) {
    return function() {
        this.y += 2;
        if (this.y > scene.scale.height) {
            this.destroy();
        }
    };
}

function zigzagPattern(scene) {
    let direction = 1;
    let counter = 0;
    return function() {
        this.x += direction;
        this.y += 1;
        counter++;
        if (counter >= 100) {
            direction *= -1;
            counter = 0;
        }
        if (this.y > scene.scale.height) {
            this.destroy();
        }
    };
}

function circularPattern(scene) {
    let angle = 0;
    const centerX = scene.scale.width / 2;
    const radius = 100;
    return function() {
        angle += 0.02;
        this.x = centerX + Math.cos(angle) * radius;
        this.y += 1;
        if (this.y > scene.scale.height) {
            this.destroy();
        }
    };
}