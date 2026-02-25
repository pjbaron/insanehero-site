export class MainMenu extends Phaser.Scene
{
    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background').setOrigin(0, 0);

        this.add.text(this.scale.width / 2, this.scale.height / 2, 'Shoot-em-up', {
            fontFamily: 'Arial, sans-serif', fontSize: 48, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 60, 'Click to Start', {
            fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        const highScore = localStorage.getItem('highScore') || 0;
        this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, `High Score: ${highScore}`, {
            fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}