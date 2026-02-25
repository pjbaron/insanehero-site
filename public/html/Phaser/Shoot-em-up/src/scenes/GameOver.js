export class GameOver extends Phaser.Scene
{
    constructor ()
    {
        super('GameOver');
    }

    init (data)
    {
        this.score = data.score;
    }

    create ()
    {
        this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'background').setOrigin(0, 0);

        this.add.text(this.scale.width / 2, this.scale.height / 2, 'Game Over', {
            fontFamily: 'Arial, sans-serif', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 60, `Your Score: ${this.score}`, {
            fontFamily: 'Arial, sans-serif', fontSize: 32, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        const highScore = localStorage.getItem('highScore') || 0;
        if (this.score > highScore) {
            localStorage.setItem('highScore', this.score);
            this.add.text(this.scale.width / 2, this.scale.height / 2 + 120, 'New High Score!', {
                fontFamily: 'Arial, sans-serif', fontSize: 32, color: '#ffff00',
                align: 'center'
            }).setOrigin(0.5);
        }

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 180, 'Click to Restart', {
            fontFamily: 'Arial, sans-serif', fontSize: 24, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}