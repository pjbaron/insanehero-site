/**
 * Created by Pete on 22/05/2014.
 */
Explosion = function(game) {
    this.game = game;
};


// constants
Explosion.personDeathRange = 26;
Explosion.chopperDeathRange = 28;


Explosion.prototype = {

    create: function(o, x, y, speed)
    {
        this.owner = o;
        
        this.damageDone = false;

        this.sprite = Game.onTopLayer.create(x, y, 'explosion');
        this.sprite.anchor.setTo(0.5, 0.5);
        this.sprite.animations.add('bang', Phaser.Animation.generateFrameNames('CopterExplosion', 1, 6), speed, false);

        this.sprite.animations.play('bang', speed, false);
        this.sprite.events.onAnimationComplete.add(this.killBang, this);
    },

    destroy: function()
    {
        this.sprite.animations.destroy();
        this.sprite.destroy();
        this.sprite = null;
        this.owner = null;
    },

    // a non-building explosion finished, clean up
    killBang: function()
    {
        this.sprite.destroy();
    },

    update: function(chopper, survivors)
    {
        var frame = (this.sprite && this.sprite.animations && this.sprite.animations.currentFrame) ? this.sprite.animations.currentFrame.index : 6;

        this.sprite.scale.x = this.sprite.scale.y += 0.05;

        if (frame < 5)
        {
            var fx = new Effects();
            //anim, first, last, x, y, vx, vy, speed, life)
            var r = Math.floor(Math.random() * 6) + 1;
            // anim, first, last, x, y, vx, vy, speed, life, gravity, number, spreadx, spready, spreadvx, spreadvy)
            fx.create("CopterShrapnel", r, r, this.sprite.x, this.sprite.y, Math.random() * 400 - 200, -Math.random() * 400, 1, 1600, 400, 0.2);

            fx = new Effects();
            fx.create("CopterSmoke", 1, 5, this.sprite.x + Math.random() * 32 - 16, this.sprite.y + Math.random() * 32 - 16, 0, -Math.random() * 100, 1, 3000, -50, 0, 0.02);
        }

        // once only per explosion
        if (!this.damageDone)
        {
            // half way through the animation (when it's big and opaque)
            if (frame >= 3)
            {
                // remember, once only per explosion
                this.damageDone = true;

                // see if this explosion blew up any survivors
                for(var i = survivors.length - 1; i >= 0; --i)
                {
                    var s = survivors[i];
                    if (game.physics.arcade.distanceBetween(s.sprite, this.sprite) < Explosion.personDeathRange)
                    {
                        // remove the sprite from the screen
                        s.sprite.destroy();
                        // remove the Person from the survivors list
                        survivors.splice(i, 1);
                        // lose a point for every death
                        Game.score--;
                        // but don't let score go negative
                        if (Game.score < 0)
                            Game.score = 0;
                    }
                }
            }
        }
    }

};