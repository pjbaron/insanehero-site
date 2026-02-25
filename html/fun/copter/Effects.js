/**
 * Created by Pete on 20/11/2014.
 */
Effects = function() {
};




Effects.prototype = {

    create: function(anim, first, last, x, y, vx, vy, speed, life, gravity, rotation, scaleChange)
    {
        this.created = game.time.now;
        this.life = life;
        this.rotateSpeed = rotation;
        this.scaleChange = scaleChange;

        this.sprite = Game.onTopLayer.create(x, y, 'fxBits');
        this.sprite.anchor.setTo(0.5, 0.5);
        this.sprite.animations.add('anim', Phaser.Animation.generateFrameNames(anim, first, last), speed, true);
        game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
        this.sprite.body.velocity.setTo(vx, vy);
        this.sprite.body.gravity.y = gravity;
        this.sprite.animations.play('anim', speed, true);

        effectsList.push(this);
    },


    destroy: function()
    {
        var i = effectsList.indexOf(this);
        if (i !== -1)
            effectsList.splice(i, 1);
        else
            console.log("ERROR: couldn't find effect in effectsList!");

        this.sprite.animations.destroy();
        this.sprite.destroy();
        this.sprite = null;
    },


    update: function()
    {
        if (this.sprite)
        {
            this.sprite.rotation += this.rotateSpeed;
            if (this.scaleChange)
            {
                this.sprite.scale.x += this.scaleChange;
                this.sprite.scale.y += this.scaleChange;
            }

            // collisions with ground
            // game.physics.arcade.collide(ground_b, this.sprite); //, null, null, this.sprite);
            if (this.sprite.body.touching.down)
            {
                this.rotateSpeed *= 0.8;
                this.sprite.body.velocity.x *= 0.95;
            }

            if (this.life && game.time.now >= this.life + this.created)
                this.destroy();
        }
    }

};