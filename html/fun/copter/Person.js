/**
 * Created by Pete on 20/05/2014.
 */


Person = function(game) {
    game = game;
};


// constants
Person.rescueRange = 48;

// states for AI
Person.AI_IDLE = 0;
Person.AI_WAVE = 1;
Person.AI_WALK = 2;
Person.AI_FALL = 3;
Person.AI_HOLD = 4;

// facing
Person.FACE_OUT = 0;
Person.FACE_LEFT = 1;
Person.FACE_RIGHT = 2;


// variables
Person.prototype.game = null;
Person.prototype.sprite = null;
Person.prototype.saved = false;
var halfWide = 8;


Person.prototype = {

    /// @param: validRanges = list of left/right edge pairs for valid creation locations, or null = use startx, starty
    create: function(validRanges, startx, starty)
    {
        // find valid x location for this person
        var x, y;

// if (validRanges)
// {
//     var str = "";
//     for (var i = 0; i < validRanges.length; i++)
//     {
//         str += " " + validRanges[i].left;
//         str += " " + validRanges[i].right + ",";
//     }
//     console.log("Person.create", str);
// }

        var tries = 2000;
        if (validRanges)
        {
            do{
                x = game.world.randomX;
            }while(overlapRange(x, validRanges, 4) === false && --tries > 0);

            // find y location on top of scenery for this person
            y = MissionControl.sceneryTop(x);

            this.falls = true;
        }
        else
        {
            x = startx;
            y = starty;

            this.falls = false;
        }

        var r = Math.floor(Math.random() * 5) + 1;
        this.rootName = [null, 'man1', 'man2', 'man3', 'woman1', 'woman2'][r];
        this.name = 'person' + r.toString();
        this.sprite = Game.behindLayer.create(x, y, this.name);
        this.addAnims();
        this.addAudio();

// console.log(this.rootName + " x = ", x);
// this.memx = this.sprite.x;

        this.state = Person.AI_IDLE;
        this.facing = Person.FACE_LEFT;
        this.lastAnim = 'idle_l';
        this.sprite.animations.play(this.lastAnim);

        this.sprite.anchor.setTo(0.5, 1.0);
        if (this.falls)
        {
            game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
            this.sprite.enableBody = true;
            this.sprite.body.bounce.setTo(0.1, 0.1);
            this.sprite.body.gravity.y = 400;
            this.sprite.body.drag.x = 1000;
            this.sprite.body.drag.y = 0;
            this.sprite.body.collideWorldBounds = true;
        }
        this.saved = false;
        this.lastState = -1;
        this.edges = 0;
        this.terminal = false;
    },


    addAudio: function()
    {
        switch(this.rootName)
        {
            case 'man1':
            case 'man2':
            case 'man3':
                this.sfxCall1 = Audio.sfxCall1_m;
                this.sfxCall2 = Audio.sfxCall2_m;
                this.sfxDie = Audio.sfxDie_m;
                this.sfxGrab = Audio.sfxGrab_m;
                this.sfxSafe = Audio.sfxSafe_m;
                this.sfxFall = Audio.sfxFall_m;
                break;
            case 'woman1':
            case 'woman2':
                this.sfxCall1 = Audio.sfxCall1_f;
                this.sfxCall2 = Audio.sfxCall2_f;
                this.sfxDie = Audio.sfxDie_f;
                this.sfxGrab = Audio.sfxGrab_f;
                this.sfxSafe = Audio.sfxSafe_f;
                this.sfxFall = Audio.sfxFall_f;
                break;
        }
    },


    addAnims: function()
    {
        this.sprite.animations.add('fall_r', [this.rootName + '_fall'], 1, true);
        this.sprite.animations.add('fall_l', [this.rootName + 'R_fall'], 1, true);
        this.sprite.animations.add('cling_r', [this.rootName + '_hold'], 1, true);
        this.sprite.animations.add('cling_l', [this.rootName + 'R_hold'], 1, true);
        this.sprite.animations.add('idle_r', [this.rootName + '_idle'], 1, true);
        this.sprite.animations.add('idle_l', [this.rootName + 'R_idle'], 1, true);
        this.sprite.animations.add('wave_r', [this.rootName + '_wave01', this.rootName + '_wave02', this.rootName + '_wave03', this.rootName + '_wave02'], 6, true);
        this.sprite.animations.add('wave_l', [this.rootName + 'R_wave01', this.rootName + 'R_wave02', this.rootName + 'R_wave03', this.rootName + 'R_wave02'], 8, true);
        this.sprite.animations.add('walk_r', [this.rootName + '_walk01', this.rootName + '_walk02', this.rootName + '_walk03', this.rootName + '_walk04', this.rootName + '_walk05', this.rootName + '_walk06'], 12, true);
        this.sprite.animations.add('walk_l', [this.rootName + 'R_walk01', this.rootName + 'R_walk02', this.rootName + 'R_walk03', this.rootName + 'R_walk04', this.rootName + 'R_walk05', this.rootName + 'R_walk06'], 12, true);
    },


    createSaved: function(x, y, name, rootName)
    {
        this.name = name;
        this.rootName = rootName;
        this.sprite = Game.inFrontLayer.create(x, y, this.name);
        this.sprite.anchor.setTo(0.5, 1.0);
        this.addAnims();

        this.state = Person.AI_IDLE;
        this.lastState = -1;
        this.edges = 0;
        this.terminal = false;
        this.facing = Person.FACE_RIGHT;
        this.lastAnim = 'idle_r';
        this.sprite.animations.play(this.lastAnim);
        this.saved = true;

        this.addAudio();
        this.sfxSafe.play();
    },


    destroy: function()
    {
        if (this.sprite)
            this.sprite.kill();
        this.sprite = null;
        this.sfxCall1 = null;
        this.sfxCall2 = null;
        this.sfxDie = null;
        this.sfxGrab = null;
        this.sfxSafe = null;
        this.sfxFall = null;
    },


    /**
     * update function to control the person's frame-to-frame existence
     * 
     * @param  {Chopper} chopper
     * 
     * @return {boolean} - false if this survivor should be removed from the list
     */
    update: function(chopper)
    {
// if (this.sprite.x != this.memx)
// {
// console.log(this.rootName + " moved: x = ", this.sprite.x, this.memx, " dx = ", this.memx - this.sprite.x);
// this.memx = this.sprite.x;    
// }

        // can't update until the sprite is available
        if (!this.sprite)
            return true;

        // we've died and gone to 'alpha == 0' heaven...
        if (this.sprite.alpha <= 0.05)
            return false;

        // collision against ground layer
        if (this.sprite.body)
            game.physics.arcade.collide(ground_b, this.sprite, Person.personCollisionHandler, null, this);

        // if this person hasn't been saved yet
        if (!this.saved && this.falls && chopper)
        {
            // is the chopper close enough?
            if (game.physics.arcade.distanceBetween(this.sprite, chopper.sprite) < Person.rescueRange)
            {
                // did it collect him?
                if (pickUpSurvivor(chopper, this))
                {
                    // erase this survivor
                    this.sprite.kill();
                    this.sprite = null;
                    return false;
                }
            }
        }

        // ai control
        this.stateMachine();

        if (this.sprite.body || this.killed)
        {
            // has this person hit the ground at a terminal velocity?
            if ((this.sprite.body.touching.down && this.terminal) || this.killed)
            {
                // splat!
                this.sfxDie.play();
                game.add.tween(this.sprite).to({alpha:0}, 1000, Phaser.Easing.Linear.NONE, true);
                this.terminal = false;
            }
            
            // will the person die if he lands with this velocity?
            if (this.sprite.body.velocity.y > 200)
            {
                this.terminal = true;
                this.state = Person.AI_FALL;
                this.stateDelay = 0;
            }
        }

        return true;
    },


    stateMachine: function()
    {
        // state has a timer
        if (this.stateDelay > 0)
        {
            this.stateDelay--;
            return;
        }

        //console.log("person", this.rootName);

        // has the state changed
        var newState = (this.state != this.lastState);
        this.lastState = this.state;
        switch(this.state)
        {
            case Person.AI_IDLE:
                if (newState)
                {
                    this.stateDelay = 60;
                    if (this.facing == Person.FACE_LEFT)
                        this.sprite.animations.play('idle_l');
                    else
                        this.sprite.animations.play('idle_r');
                    break;
                }

                if (Math.random() < 0.25)
                {
                    this.stateDelay = 60;
                }
                else if (Math.random() < 0.25)
                {
                    this.turnAround();
                }
                else if (Math.random() < 0.40 && this.falls && this.facing != this.edges)
                {
                    this.state = Person.AI_WALK;
                }
                else
                {
                    this.state = Person.AI_WAVE;
                }
                break;

            case Person.AI_FALL:
                if (newState)
                {
                    if (!this.saved)
                        this.sfxFall.play();
                    if (this.facing == Person.FACE_LEFT)
                        this.sprite.animations.play('fall_l');
                    else
                        this.sprite.animations.play('fall_r');
                    break;
                }
                break;

            case Person.AI_WALK:
                if (newState)
                {
                    if (this.facing == Person.FACE_LEFT)
                    {
                        this.sprite.animations.play('walk_l');
                        this.speed = -50;
                    }
                    else
                    {
                        this.sprite.animations.play('walk_r');
                        this.speed = 50;
                    }
                    break;
                }

                if (this.sprite.animations.currentAnim.loopCount > 3 || this.facing == this.edges)
                {
                    this.sprite.animations.stop();
                    this.sprite.body.velocity.x = 0;

                    if (Math.random() < 0.25)
                    {
                        this.turnAround();
                        // treat it like a new state next time
                        this.lastState = -1;
                    }
                    else
                    {
                        this.state = Person.AI_IDLE;
                    }
                }
                else
                {
                    this.sprite.body.velocity.x = this.speed;
                }
                break;

            case Person.AI_WAVE:
                if (newState)
                {
                    if (!this.saved && Math.random() < .10)
                        this.sfxCall1.play();
                    if (!this.saved && Math.random() < .10)
                        this.sfxCall2.play();

                    this.stateDelay = 60;
                    if (this.facing == Person.FACE_LEFT)
                        this.sprite.animations.play('wave_l');
                    else
                        this.sprite.animations.play('wave_r');
                    break;
                }
                if (Math.random() < 0.25)
                {
                    this.stateDelay = 60;
                }
                else if (Math.random() < 0.25)
                {
                    this.turnAround();
                }
                else
                {
                    this.state = Person.AI_IDLE;
                }
                break;
        }

    },


    turnAround: function()
    {
        var name = this.sprite.animations.currentAnim.name;
        if (this.facing == Person.FACE_LEFT)
        {
            this.facing = Person.FACE_RIGHT;
            if (name.substring(name.length - 1, 1) == 'l')
                name = name.substring(0, name.length - 1) + 'r';
        }
        else
        {
            this.facing = Person.FACE_LEFT;
            if (name.substring(name.length - 1, 1) == 'r')
                name = name.substring(0, name.length - 1) + 'l';
        }
        this.sprite.animations.play(name);
    }



};


Person.personCollisionHandler = function(buildingSprite, personSprite)
{
    // this person is standing on a collapsing building, make him fall...
    if (buildingSprite.collapsing)
    {
        this.state = Person.AI_FALL;
        this.stateDelay = 0;
        return;
    }

    if (personSprite.body.x <= buildingSprite.body.x)
        this.edges = Person.FACE_LEFT;
    else if (personSprite.body.right >= buildingSprite.body.right)
        this.edges = Person.FACE_RIGHT;
    else
        this.edges = 0;
};

