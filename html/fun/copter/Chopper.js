/**
 * Created by Pete on 20/05/2014.
 * 
 */
Chopper = function(game) {
    this.game = game;
};


// constants
Chopper.crashVelocity = 150;
Chopper.rotorMaxSpeed = 7.0;
Chopper.rotorAccel = 1.0;
Chopper.rotorSlow = 0.95;
Chopper.maxSpeed = 150;



Chopper.prototype = {

    create: function(x, y)
    {
        this.rotorSpeed = Chopper.rotorMaxSpeed * 0.5;
        this.dead = 0;
        this.landed = 0;
        this.onGround = false;
        this.dust = null;
        this.carryLeft = null;
        this.carryRight = null;

        // add the shadow first (lowest priority)
        this.shadow = Game.inFrontLayer.create(x, MissionControl.groundLevel, 'chopper');
        this.shadow.animations.add('shadow', ['CopterShadow'], 1000, true);
        this.shadow.animations.play('shadow');
        this.shadow.anchor.setTo(0.5,0.5);

        // sprite and physics init
        this.sprite = Game.inFrontLayer.create(x, y, 'chopper');
        this.sprite.animations.add('hover1', ['copterfront'], 1, true);
        this.sprite.animations.add('tilt', ['CopterDown'], 1, true);
        this.sprite.animations.add('turn_l', ['CopterTurnLeft'], 1, true);
        this.sprite.animations.add('turn_r', ['CopterTurnRight'], 1, true);
        this.lastAnim = 'hover1';
        this.sprite.animations.play(this.lastAnim);
// this.memx = this.sprite.x;

        this.sprite.anchor.setTo(0.5, 0.5);
        this.game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
        this.sprite.enableBody = true;
        this.sprite.body.setSize(this.sprite.width * 0.60, this.sprite.height);
        this.sprite.body.bounce.setTo(0.3,0.1);
        this.sprite.body.gravity.y = 200;
        this.sprite.body.drag.x = 100;
        this.sprite.body.drag.y = 100;
        this.sprite.body.collideWorldBounds = true;
        this.sprite.body.checkCollision.up = false;
        this.sprite.body.checkCollision.left = false;
        this.sprite.body.checkCollision.right = false;

        console.log("chopper create", x, y, this.sprite.x, this.sprite.body.x);

        // add rotor blades (highest priority)
        this.blade = Game.inFrontLayer.create(x, y - this.sprite.height *0.5, 'blades');
        this.blade.anchor.setTo(0.5, 1.0);
        this.blade.animations.add('spin');
        this.blade.animations.play('spin', 20, true, false);

        // input methods: keyboard, device motion and touch screen
        this.keys = this.game.input.keyboard.createCursorKeys();

        var self = this;
        window.addEventListener("devicemotion", function(e)
        {
            self.handleOrientation(e);
        }, true);

        // audio fx
        Audio.flySfx.play('', 0, 1, true, false);

        this.lastWarning = game.time.now - 1000;
        this.warnSprite = game.make.sprite(0, -56, 'warningIcon');
        this.warnSprite.anchor.setTo(0.5, 1);
        this.sprite.addChild(this.warnSprite);
        this.warnSprite.visible = false;
    },

    destroy: function()
    {
        Audio.flySfx.stop();
        Audio.landSfx.stop();
        Audio.warnSfx.stop();
        Audio.explodeSfx.stop();
        if (this.dust)
        {
            this.dust.destroy();
            this.dust = null;
        }
        if (this.blade)
        {
            this.blade.animations.destroy();
            this.blade.destroy();
            this.blade = null;
        }
        if (this.sprite)
        {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.shadow)
        {
            this.shadow.destroy();
            this.shadow = null;
        }
        this.keys = null;
    },

    handleOrientation: function(e)
    {
        if (this && this.sprite && this.sprite.body)
        {
            var tilt_x = e.accelerationIncludingGravity.x;
            var tilt_y = e.accelerationIncludingGravity.y;
//            if (window.innerHeight > window.innerWidth)
            {
                if (tilt_x)
                    this.sprite.body.velocity.x += tilt_y * 15;
            }
            // else
            // {
            //     if (tilt_y)
            //         this.sprite.body.velocity.x += tilt_y * 15;
            // }
        }
    },

    update: function(_savedPeople)
    {
// if (this.sprite.x != this.memx)
// {
// console.log("chopper moved ", this.sprite.x, this.memx, this.memx - this.sprite.x);
// this.memx = this.sprite.x;
// }

        // exit if the chopper is already dead
        if (this.dead > 0)
        {
            if (this.shadow)
            {
                this.shadow.destroy();
                this.shadow = null;
            }
            if (this.blade)
            {
                this.blade.animations.destroy();
                this.blade.destroy();
                this.blade = null;
            }
            // if there is anyone still on board the destroyed chopper, they die
            if (this.carryLeft)
            {
                this.carryLeft.destroy();
                this.carryLeft = null;
            }
            if (this.carryRight)
            {
                this.carryRight.destroy();
                this.carryRight = null;
            }

            this.dead += 1;
            if (this.dead > 10)
            {
                this.destroy();
                chopper = null;
            }
            return;
        }

        // chopper collisions vs ground
        this.game.physics.arcade.collide(ground_b, chopper.sprite, null, Chopper.chopperGroundCollisionHandler, this);

        // chopper crash warning
        this.warnSprite.visible = false;
        if (!this.onGround)
        {
            if (this.sprite.body.velocity.y >= Chopper.crashVelocity * .9)
            {
                this.warnSprite.visible = true;
                if (game.time.now > this.lastWarning + 1000)
                {
                    Audio.warnSfx.play();
                    this.lastWarning = game.time.now;
                }
            }
        }

        // keyboard input
        var force = 5;
        if (!this.onGround)
        {
            if (this.keys.left.isDown)
            {
                this.sprite.body.velocity.x -= force;
            }
            else if (this.keys.right.isDown)
            {
                this.sprite.body.velocity.x += force;
            }
        }

        if (this.keys.up.isDown || this.game.input.pointer1.isDown)
        {
            this.rotorSpeed += Chopper.rotorAccel;
        }

        // speed limits
        if (this.sprite.body.velocity.x < -Chopper.maxSpeed)
            this.sprite.body.velocity.x = -Chopper.maxSpeed;
        if (this.sprite.body.velocity.x > Chopper.maxSpeed)
            this.sprite.body.velocity.x = Chopper.maxSpeed;
        if (this.sprite.body.velocity.y < -Chopper.maxSpeed)
            this.sprite.body.velocity.y = -Chopper.maxSpeed;
        if (this.rotorSpeed > Chopper.rotorMaxSpeed)
            this.rotorSpeed = Chopper.rotorMaxSpeed;

        // rotors keep the chopper flying
        this.sprite.body.velocity.y -= this.rotorSpeed;
//        this.sprite.animations.getAnimation('hover').speed = this.rotorSpeed * 50 + 50;

        // rotors slow down unless you keep them spinning
        this.rotorSpeed *= Chopper.rotorSlow;

        // tilt the chopper
        if (Math.abs(this.sprite.body.velocity.x) > 5)
            this.sprite.angle = this.sprite.body.velocity.x *0.1;

        // friction when landed on anything
        if (this.sprite.body.blocked.down)
        {
            this.landed += 1;
            this.sprite.body.drag.x = 10000;

            if (Math.abs(this.sprite.body.velocity.y) > Chopper.crashVelocity)
            {
                // crashed!
                this.crashed();
            }
        }
        else
        {
            this.sprite.body.drag.x = 100;
        }

        // turn to fly
        if (this.lastAnim == 'hover1' && this.sprite.body.bottom < MissionControl.groundLevel - 40)
        {
            if (this.sprite.body.velocity.x < -80)
            {
                // turn to face left
                this.lastAnim = 'turn_l';
                this.sprite.animations.play(this.lastAnim);
            }
            else if (this.sprite.body.velocity.x > 80)
            {
                // turn to face right
                this.lastAnim = 'turn_r';
                this.sprite.animations.play(this.lastAnim);
            }
        }

        if (this.lastAnim == 'turn_l' || this.lastAnim == 'turn_r')
        {
            if (Math.abs(this.sprite.body.velocity.x) < 50)
            {
                // too slow to face left or right
                this.lastAnim = 'hover1';
                this.sprite.animations.play(this.lastAnim);
            }
            else if (this.sprite.body.bottom >= MissionControl.groundLevel - 32 && this.sprite.body.velocity.y > 0)
            {
                // landing
                this.lastAnim = 'hover1';
                this.sprite.animations.play(this.lastAnim);
            }
        }

        if (this.landed > 2 || this.sprite.body.bottom >= MissionControl.groundLevel - 4)
        {
            // landed!
            this.lastAnim = 'tilt';
            this.sprite.animations.play(this.lastAnim);

            // survivors disembark if at ground level
            if (this.sprite.body.bottom >= MissionControl.groundLevel)
            {
                var p;
                if (this.carryLeft)
                {
                    p = new Person(this.game);
                    p.createSaved(this.sprite.x - 22, MissionControl.groundLevel, this.carryLeft.name, this.carryLeft.rootName);
                    this.carryLeft.destroy();
                    this.carryLeft = null;
                    // console.log("carryLeft off", p.sprite.x);
                    _savedPeople.push(p);
                    // gain a point for every life saved
                    Game.score++;
                }
                if (this.carryRight)
                {
                    p = new Person(this.game);
                    p.createSaved(this.sprite.x + 22, MissionControl.groundLevel, this.carryRight.name, this.carryRight.rootName);
                    this.carryRight.destroy();
                    this.carryRight = null;
                    // console.log("carryRight off", p.sprite.x);
                    _savedPeople.push(p);
                    // gain a point for every life saved
                    Game.score++;
                }
            }

            this.landed = 0;
        }
        else
        {
            if (this.lastAnim != 'turn_l' && this.lastAnim != 'turn_r' && this.lastAnim != 'side')
            {
                // travelling down fast enough to tilt?
                if (this.lastAnim != 'tilt' && this.sprite.body.velocity.y > 85.0)
                {
                    //console.log("tilt down fast");
                    this.lastAnim = 'tilt';
                    this.sprite.animations.play(this.lastAnim);
                }
                else if (this.lastAnim != 'hover1' && this.sprite.body.velocity.y < 80.0)
                {
                    //console.log("hover not down fast");
                    this.lastAnim = 'hover1';
                    this.sprite.animations.play(this.lastAnim);
                }
            }
        }

        // move clinging survivors with the chopper
        if (this.carryLeft)
        {
            this.carryLeft.x = this.sprite.x - 38 * Math.cos(this.sprite.rotation) - 30 * Math.sin(this.sprite.rotation);
            this.carryLeft.y = this.sprite.y + 36 * Math.cos(this.sprite.rotation) - 34 * Math.sin(this.sprite.rotation);
            this.carryLeft.rotation = this.sprite.rotation;
            // console.log("carryLeft", this.carryLeft.x);
        }
        if (this.carryRight)
        {
            this.carryRight.x = this.sprite.x + 38 * Math.cos(this.sprite.rotation) - 30 * Math.sin(this.sprite.rotation);
            this.carryRight.y = this.sprite.y + 36 * Math.cos(this.sprite.rotation) + 34 * Math.sin(this.sprite.rotation);
            this.carryRight.rotation = this.sprite.rotation;
            // console.log("carryRight", this.carryRight.x);
        }

        // create dust from rotor blades
        if (!this.dust)
        {
            if (this.sprite.y > MissionControl.groundLevel - Dust.dustHeight)
            {
                this.dust = new Dust();
                this.dust.create(this.sprite.x, MissionControl.groundLevel, 10);
            }
        }
        else
        {
            this.dust.update();
        }

        this.blade.x = this.sprite.x + this.sprite.height *0.5 * Math.sin(this.sprite.rotation);
        this.blade.y = this.sprite.y - this.sprite.height *0.5 * Math.cos(this.sprite.rotation);
        this.blade.rotation = this.sprite.rotation;

        this.shadow.x = this.sprite.x;
        this.shadow.alpha = Math.max(1.0 - (MissionControl.groundLevel - this.sprite.y) * 4 / MissionControl.groundLevel, 0);

        this.onGround = false;
    },


    crashed: function()
    {
        this.dead += 1;

        var e = new Explosion(this.game);
        e.create(this, this.sprite.x, this.sprite.y, 10);
        explosionList.push(e);

        // explosion sounds
        Audio.sfxWindowExplode.play();
        Audio.explodeSfx.play();

        if (this.carryLeft)
        {
            this.carryLeft.destroy();
            this.carryLeft = null;
        }
        if (this.carryRight)
        {
            this.carryRight.destroy();
            this.carryRight = null;
        }

        Audio.flySfx.stop();
        
        if (this.dust && !this.dust.ending)
        {
            this.dust.endDust();
        }
    }

};


Chopper.chopperGroundCollisionHandler = function(groundSprite, chopperSprite)
{
    if (this.landed === 0)
    {
        this.onGround = true;
        this.landed += 1;
        if (this.sprite.body.velocity.y > 10)
            Audio.landSfx.play();
    }

    if (this.sprite.body.velocity.y > Chopper.crashVelocity)
    {
        // crashed!
        this.crashed();
    }
};


Chopper.chopperBuildingCollisionHandler = function(buildingSprite, chopperSprite)
{
    // if hit a building, check whether we're on top or just descending in front of it
    if (this.sprite.body.bottom < buildingSprite.body.y + 8)
    {
        if (this.landed === 0)
        {
            this.onGround = true;
            this.landed += 1;
            if (this.sprite.body.velocity.y > 10)
                Audio.landSfx.play();
        }

        if (this.sprite.body.velocity.y > Chopper.crashVelocity)
        {
            // crashed!
            this.crashed();
        }
    }
};


function pickUpSurvivor(chopper, survivor)
{
    if (survivor.x > chopper.sprite.x)
    {
        // prefer to cling to right side of chopper
        if (!chopper.carryRight)
        {
            //console.log("chopper pick up", chopper.sprite.x);
            if (survivor.sfxGrab)
                survivor.sfxGrab.play();
            chopper.carryRight = Game.inFrontLayer.create(chopper.sprite.x + 15, chopper.sprite.y - 6, survivor.name);
            chopper.carryRight.animations.add('cling_r', [survivor.rootName + 'R_hold'], 1, true);
            chopper.carryRight.play('cling_r');
            chopper.carryRight.anchor.setTo(0.5, 1);
            chopper.carryRight.name = survivor.name;
            chopper.carryRight.rootName = survivor.rootName;
            return true;
        }
        else if (!chopper.carryLeft)
        {
            //console.log("chopper pick up", chopper.sprite.x);
            if (survivor.sfxGrab)
                survivor.sfxGrab.play();
            chopper.carryLeft = Game.inFrontLayer.create(chopper.sprite.x + 24, chopper.sprite.y - 6, survivor.name);
            chopper.carryLeft.animations.add('cling_l', [survivor.rootName + '_hold'], 1, true);
            chopper.carryLeft.play('cling_l');
            chopper.carryLeft.anchor.setTo(0.5, 1);
            chopper.carryLeft.name = survivor.name;
            chopper.carryLeft.rootName = survivor.rootName;
            return true;
        }
    }
    else
    {
        // prefer to cling to left side of chopper
        if (!chopper.carryLeft)
        {
            //console.log("chopper pick up", chopper.sprite.x);
            if (survivor.sfxGrab)
                survivor.sfxGrab.play();
            chopper.carryLeft = Game.inFrontLayer.create(chopper.sprite.x + 24, chopper.sprite.y - 6, survivor.name);
            chopper.carryLeft.animations.add('cling_l', [survivor.rootName + '_hold'], 1, true);
            chopper.carryLeft.play('cling_l');
            chopper.carryLeft.anchor.setTo(0.5, 1);
            chopper.carryLeft.name = survivor.name;
            chopper.carryLeft.rootName = survivor.rootName;
            return true;
        }
        else if (!chopper.carryRight)
        {
            //console.log("chopper pick up", chopper.sprite.x);
            if (survivor.sfxGrab)
                survivor.sfxGrab.play();
            chopper.carryRight = Game.inFrontLayer.create(chopper.sprite.x + 15, chopper.sprite.y - 6, survivor.name);
            chopper.carryRight.animations.add('cling_r', [survivor.rootName + 'R_hold'], 1, true);
            chopper.carryRight.play('cling_r');
            chopper.carryRight.anchor.setTo(0.5, 1);
            chopper.carryRight.name = survivor.name;
            chopper.carryRight.rootName = survivor.rootName;
            return true;
        }
    }

    // chopper is full, we can't pick him up
    return false;
}

