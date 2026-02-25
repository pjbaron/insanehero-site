export class Bullet extends Phaser.Physics.Arcade.Image
{
    constructor(scene, x, y)
    {
        super(scene, x, y, 'bullet');
    }

    fire(x, y)
    {
        this.setPosition(x + 50, y);
        this.setActive(true);
        this.setVisible(true);
        this.setVelocityX(300);
    }

    preUpdate(time, delta)
    {
        if (this.x > 800)
        {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}