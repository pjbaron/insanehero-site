import { getRandomAlienPattern } from '../helpers/AlienPatterns.js';
import { PowerUpType, applyPowerUp } from '../helpers/PowerUps.js';

export class Game extends Phaser.Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.background = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background').setOrigin(0, 0);

        // Create player sprite
        this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 50, 'player');
        this.player.setCollideWorldBounds(true);

        // Set up cursor keys for input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Create bullet group
        this.bullets = this.physics.add.group();

        // Create alien group
        this.aliens = this.physics.add.group();

        // Create power-up group
        this.powerUps = this.physics.add.group();

        // Set up collision detection
        this.physics.add.overlap(this.bullets, this.aliens, this.hitAlien, null, this);
        this.physics.add.overlap(this.player, this.aliens, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.powerUps, this.collectPowerUp, null, this);

        // Set up shooting
        this.input.keyboard.on('keydown-SPACE', this.shootBullet, this);

        // Initialize score
        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });

        // Start alien spawning
        this.time.addEvent({ delay: 1000, callback: this.spawnAlien, callbackScope: this, loop: true });

        // Start power-up spawning
        this.time.addEvent({ delay: 10000, callback: this.spawnPowerUp, callbackScope: this, loop: true });
    }

    update ()
    {
        // Scroll background
        this.background.tilePositionY -= 2;

        // Player movement
        if (this.cursors.left.isDown)
        {
            this.player.setVelocityX(-200);
        }
        else if (this.cursors.right.isDown)
        {
            this.player.setVelocityX(200);
        }
        else
        {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown)
        {
            this.player.setVelocityY(-200);
        }
        else if (this.cursors.down.isDown)
        {
            this.player.setVelocityY(200);
        }
        else
        {
            this.player.setVelocityY(0);
        }

        // Update alien positions
        this.aliens.children.entries.forEach(alien => {
            alien.update();
        });

        // Remove off-screen bullets
        this.bullets.children.entries.forEach(bullet => {
            if (bullet.y < 0) {
                bullet.destroy();
            }
        });
    }

    shootBullet ()
    {
        const bullet = this.bullets.create(this.player.x, this.player.y - 20, 'bullet');
        bullet.setVelocityY(-300);
    }

    spawnAlien ()
    {
        const x = Phaser.Math.Between(50, this.scale.width - 50);
        const alien = this.aliens.create(x, 0, 'alien');
        alien.body.allowGravity = false;
        alien.update = getRandomAlienPattern(this);
    }

    spawnPowerUp ()
    {
        const x = Phaser.Math.Between(50, this.scale.width - 50);
        const y = Phaser.Math.Between(50, this.scale.height - 50);
        const powerUpType = Phaser.Math.RND.pick(Object.values(PowerUpType));
        const powerUp = this.powerUps.create(x, y, 'powerup');
        powerUp.body.allowGravity = false;
        powerUp.setData('type', powerUpType);
    }

    hitAlien (bullet, alien)
    {
        bullet.destroy();
        alien.destroy();
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);
    }

    hitPlayer (player, alien)
    {
        this.scene.start('GameOver', { score: this.score });
    }

    collectPowerUp (player, powerUp)
    {
        const powerUpType = powerUp.getData('type');
        applyPowerUp(this, powerUpType);
        powerUp.destroy();
    }
}