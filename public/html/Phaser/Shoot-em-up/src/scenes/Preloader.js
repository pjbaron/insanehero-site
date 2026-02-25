export class Preloader extends Phaser.Scene
{
    constructor ()
    {
        super('Preloader');
    }

    preload ()
    {
        this.add.text(this.scale.width / 2, this.scale.height / 2, 'Loading...', {
            fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Load assets for the shoot-em-up game
        this.load.image('player', 'assets/player-ship.png');
        this.load.image('alien', 'assets/alien-ship.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('powerup', 'assets/powerup.png');
    }

    create ()
    {
        this.scene.start('MainMenu');
    }
}