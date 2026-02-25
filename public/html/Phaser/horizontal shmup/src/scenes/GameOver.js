export class GameOver extends Phaser.Scene
{
    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.add.image(400, 300, 'background');

        this.add.text(400, 200, 'Game Over', {
            fontSize: '64px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(400, 300, 'Score: ' + this.registry.get('score'), {
            fontSize: '32px', color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(400, 350, 'Click to Restart', {
            fontSize: '24px', color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}