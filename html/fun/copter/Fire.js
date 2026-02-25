/**
 * Created by Pete on 22/05/2014.
 */
Fire = function() {
};


// constants
Fire.personDeathRange = 22;
Fire.chopperDeathRange = 28;


// static variables
Fire.sfxCount = 0;            // needs to be reset at start of MissionControl.update loop


Fire.prototype = {

    create: function(o, x, y, speed)
    {
        this.owner = o;

        this.sprite = Game.behindLayer.create(x, y, 'fire');
        this.sprite.anchor.setTo(0.5, 1);
        this.sprite.animations.add('burn');
        this.sprite.animations.play('burn', 10, true, false);
        this.breakGlass = false;
        this.sfxBuildingBurn = null;
    },

    destroy: function()
    {
        if (this.sfxBuildingBurn && gameAudio.isInList(this.sfxBuildingBurn, Audio.sfxBuildingBurns))
            gameAudio.removeFromList(this.sfxBuildingBurn, Audio.sfxBuildingBurns);
        this.sfxBuildingBurn = null;

        this.sprite.animations.destroy();
        this.sprite.kill();
        this.sprite = null;
        this.owner = null;
    },

    update: function(chopper, survivors)
    {
        if (this.sprite.inCamera && this.sprite.visible)
        {
            if (!this.breakGlass)
            {
                Audio.sfxWindowExplode.play();

                for(var i = 0; i < 4; i++)
                {
                    var fx = new Effects(game);
                    var r = Math.floor(Math.random() * 2) + 5;
                    // anim, first, last, x, y, vx, vy, speed, life, gravity, rotation speed
                    fx.create("CopterShrapnel", r, r, this.sprite.x + Math.random() * 20 - 10, this.sprite.y -26 - Math.random() * 20, rndSpread(100), Math.random() * -200, 1, 1000, 400, rndSpread(0.4));
                }

                this.breakGlass = true;

                // only play three burning sounds at any given time
                this.sfxBuildingBurn = gameAudio.addToList('sfxBuildingFire', Audio.sfxBuildingBurns, true, true, true, 3);
            }
        }
        else
        {
            if (this.sfxBuildingBurn && gameAudio.isInList(this.sfxBuildingBurn, Audio.sfxBuildingBurns))
                gameAudio.removeFromList(this.sfxBuildingBurn, Audio.sfxBuildingBurns);
            this.sfxBuildingBurn = null;
        }
    }

};