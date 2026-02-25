export class Boot extends Phaser.Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        this.load.image('background', 'assets/space-background.png');
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}