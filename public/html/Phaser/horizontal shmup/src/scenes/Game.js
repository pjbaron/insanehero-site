import { Bullet } from '../gameObjects/Bullet.js';
import { Enemy } from '../gameObjects/Enemy.js';

export class Game extends Phaser.Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.bg1 = this.add.tileSprite(0, 0, 800, 600, 'background').setOrigin(0, 0);
        this.bg2 = this.add.tileSprite(800, 0, 800, 600, 'background').setOrigin(0, 0);

        this.player = this.physics.add.sprite(100, 300, 'player');
        this.player.setCollideWorldBounds(true);

        this.cursors = this.input.keyboard.createCursorKeys();

        // Create bullet group
        this.bullets = this.physics.add.group({
            classType: Bullet,
            maxSize: 10,
            runChildUpdate: true
        });

        // Create enemy group
        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true
        });

        // Set up collision between bullets and enemies
        this.physics.add.collider(this.bullets, this.enemies, this.bulletHitEnemy, null, this);

        // Set up collision between player and enemies
        this.physics.add.collider(this.player, this.enemies, this.gameOver, null, this);

        // Set up score
        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });

        // Set up fire button
        this.fireButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Enemy spawning
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }

    update ()
    {
        this.bg1.tilePositionX += 2;
        this.bg2.tilePositionX += 2;

        if (this.bg1.x <= -800) {
            this.bg1.x = 800;
        }
        if (this.bg2.x <= -800) {
            this.bg2.x = 800;
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
        } else {
            this.player.setVelocityY(0);
        }

        // Fire bullet
        if (Phaser.Input.Keyboard.JustDown(this.fireButton)) {
            this.fireBullet();
        }

        // Check for game over
        this.enemies.getChildren().forEach((enemy) => {
            if (enemy.x <= 0) {
                this.gameOver();
            }
        });
    }

    fireBullet ()
    {
        let bullet = this.bullets.get();
        if (bullet) {
            bullet.fire(this.player.x, this.player.y);
        }
    }

    spawnEnemy ()
    {
        const y = Phaser.Math.Between(50, 550);
        const enemy = this.enemies.get();
        if (enemy) {
            enemy.spawn(800, y);
        }
    }

    bulletHitEnemy (bullet, enemy)
    {
        bullet.destroy();
        enemy.destroy();
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);
    }

    gameOver ()
    {
        this.registry.set('score', this.score);
        this.scene.start('GameOver');
    }
}