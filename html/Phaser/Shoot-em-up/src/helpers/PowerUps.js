export const PowerUpType = {
    SPEED_BOOST: 'speed_boost',
    RAPID_FIRE: 'rapid_fire',
    SHIELD: 'shield'
};

export function applyPowerUp(scene, powerUpType) {
    switch (powerUpType) {
        case PowerUpType.SPEED_BOOST:
            applySpeedBoost(scene);
            break;
        case PowerUpType.RAPID_FIRE:
            applyRapidFire(scene);
            break;
        case PowerUpType.SHIELD:
            applyShield(scene);
            break;
    }
}

function applySpeedBoost(scene) {
    const originalSpeed = 200;
    scene.player.setVelocity(originalSpeed * 1.5);
    scene.time.delayedCall(5000, () => {
        scene.player.setVelocity(originalSpeed);
    });
}

function applyRapidFire(scene) {
    const rapidFireInterval = scene.time.addEvent({
        delay: 100,
        callback: scene.shootBullet,
        callbackScope: scene,
        loop: true
    });
    scene.time.delayedCall(5000, () => {
        rapidFireInterval.remove();
    });
}

function applyShield(scene) {
    const shield = scene.add.circle(scene.player.x, scene.player.y, 40, 0x0000ff, 0.5);
    scene.physics.add.existing(shield);
    shield.body.setCircle(40);
    shield.body.allowGravity = false;
    scene.physics.add.overlap(shield, scene.aliens, (shield, alien) => {
        alien.destroy();
    });
    scene.time.delayedCall(5000, () => {
        shield.destroy();
    });
}