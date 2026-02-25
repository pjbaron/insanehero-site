export class Enemy extends Phaser.Physics.Arcade.Sprite
{
    constructor(scene, x, y)
    {
        super(scene, x, y, 'enemy');
    }

    spawn(x, y)
    {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.setVelocityX(-100);
    }

    preUpdate(time, delta)
    {
        if (this.x < -50)
        {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}