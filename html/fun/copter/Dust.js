/**
 * Created by Pete on 1/10/2014.
 */


Dust = function() {
};


// constants
Dust.dustHeight = 100;

// variables
Dust.prototype.sprite = null;
Dust.prototype.sprite_l = null;
Dust.prototype.sprite_r = null;


Dust.prototype = {

    create: function(x, y, speed)
    {
        this.sprite = Game.inFrontLayer.create(x, y, null);

        this.sprite_l = game.make.sprite(-24, 0, 'dust');
        this.sprite_l.animations.add('start', Phaser.Animation.generateFrameNames('CopterDustStart', 1, 5), speed, false);
        this.sprite_l.animations.add('on', Phaser.Animation.generateFrameNames('CopterDustOn', 1, 2), speed, true);
        this.sprite_l.animations.add('end', Phaser.Animation.generateFrameNames('CopterDustEnd', 1, 5), speed, false);
        this.sprite_l.animations.play('start', speed, false);
        this.sprite_l.events.onAnimationComplete.add(this.startFinished, this);
        this.sprite_l.anchor.setTo(1,1);
        this.sprite.addChild(this.sprite_l);

        this.sprite_r = game.make.sprite(+24, 0, 'dust');
        this.sprite_r.animations.add('start', Phaser.Animation.generateFrameNames('CopterDustStart', 1, 5), speed + 1, false);
        this.sprite_r.animations.add('on', Phaser.Animation.generateFrameNames('CopterDustOn', 1, 2), speed + 1, true);
        this.sprite_r.animations.add('end', Phaser.Animation.generateFrameNames('CopterDustEnd', 1, 5), speed + 1, false);
        this.sprite_r.animations.play('start', speed, false);
        this.sprite_r.events.onAnimationComplete.add(this.startFinished_r, this);
        this.sprite_r.anchor.setTo(1,1);
        this.sprite_r.scale.x = -1;
        this.sprite.addChild(this.sprite_r);

        this.sprite.ending = false;
    },

    destroy: function()
    {
//        this.sprite_l.destroy();
        this.sprite_l = null;
//        this.sprite_r.destroy();
        this.sprite_r = null;
        this.sprite.destroy();
        this.sprite = null;
        chopper.dust = null;
    },

    startFinished: function()
    {
        if (this.sprite_l)
        {
            if (chopper.sprite.y > MissionControl.groundLevel - Dust.dustHeight)
            {
                // start dust loop
                this.sprite_l.animations.play('on');
                this.sprite_l.events.onAnimationLoop.add(this.startFinished, this);
            }
            else
            {
                // start dust end
                this.endDust();
            }
        }
    },

    endDust: function()
    {
        this.sprite_l.animations.play('end');
        this.sprite_l.events.onAnimationComplete.add(this.endFinished, this);
        this.sprite.ending = true;
    },

    endFinished: function()
    {
        if (this.sprite)
            this.destroy();
    },

    startFinished_r: function()
    {

        if (this.sprite_r)
        {
            if (chopper.sprite.y > MissionControl.groundLevel - Dust.dustHeight)
            {
                // start dust loop
                this.sprite_r.animations.play('on');
                this.sprite_r.events.onAnimationLoop.add(this.startFinished_r, this);
            }
            else
            {
                // start dust end
                this.sprite_r.animations.play('end');
                this.sprite_r.events.onAnimationComplete.add(this.endFinished_r, this);
                this.sprite.ending = true;
            }
        }
    },

    endFinished_r: function()
    {
        if (this.sprite)
            this.destroy();
    },

    update: function()
    {
        if (!this.ending)
            this.sprite.x = chopper.sprite.x;
    }


};