export class Boot extends Phaser.Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        this.load.image('background', 'assets/background.png');
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}