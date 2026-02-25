/**
 * Created by Pete on 20/05/2014.
 */
Building = function()
{
};


// variables
Building.prototype.sprite = null;
var explosionList = null;

Building.buildingRoofLists =
    [
        ['building1_rm1','building1_rm2','building1_rm3'],
        ['building2_rm1','building2_rm2','building2_rm3'],
        ['building3_rm1','building3_rm2','building3_rm3']
    ];
Building.buildingMidLists =
    [
        ['building1_m1','building1_m2','building1_m3','building1_m4','building1_m5','building1_m6'],
        ['building2_m1','building2_m2','building2_m3','building2_m4','building2_m5','building2_m6'],
        ['building3_m1','building3_m2','building3_m3','building3_m4','building3_m5','building3_m6']
    ];
Building.buildingRoofLeft =
    [
        'building1_rl',
        'building2_rl',
        'building3_rl'
    ];
Building.buildingRoofRight =
    [
        'building1_rr',
        'building2_rr',
        'building3_rr'
    ];
Building.buildingLeft =
    [
        'building1_l',
        'building2_l',
        'building3_l'
    ];
Building.buildingRight =
    [
        'building1_r',
        'building2_r',
        'building3_r'
    ];



Building.prototype =
{
    create: function(buildingRanges, y, wide, high)
    {
        var buildingComponent = game.cache.getImage('building1_m1');        // the size of one building component
        var roofAndEdge = game.cache.getImage('building1_rl');              // this size of a roofing component (vertically) and an edge piece (horizontally)
        var buildingWidth = (wide - 2) * buildingComponent.width + 2 * roofAndEdge.width;   // the width in pixels of the completed building

        // create array to store list of points where windows are located
        this.windows = [];
        this.myFire = [];
        this.nextFireTime = game.time.now + 0xffffffff;

        // find a location for the building
        var tries = 2000;
        var x = 0;
        do{
            x = Math.floor(Math.random() * (game.world.width - buildingWidth)) + buildingWidth * 0.5 + game.world.bounds.left;
        }while(overlapRange(x, buildingRanges, wide * buildingComponent.width * 0.5) === true && --tries > 0);

        //console.log("Building.create", wide, "x", high, "at", Math.floor(x), ",", Math.floor(y));

        var bmpData = new Phaser.BitmapData(game, null, buildingWidth, (high - 1) * buildingComponent.height + roofAndEdge.height);
        this.sprite = Game.behindLayer.create(x, y, bmpData);
        this.sprite.xPos = this.sprite.x;
        this.sprite.yPos = this.sprite.y;

        this.xShake = 0;
        this.yShake = 0;

        this.dustCloudLft = null;
        this.dustCloudRgt = null;
        this.dustCloudMid = [];
        this.rubbleLft = null;
        this.rubbleRgt = null;
        this.rubbleMid = [];

        var b = Math.floor(Math.random() * 3);
        var buildingRoofList = Building.buildingRoofLists[b];
        var buildingMidList = Building.buildingMidLists[b];

        // draw the building out of building panels
        for(var bx = 0; bx < wide; bx++)
        {
            for(var by = 0; by < high; by++)
            {
                var sy = bmpData.height - (by + 1) * buildingComponent.height;
                if (by == high - 1)
                    sy += buildingComponent.height - roofAndEdge.height;

                if (bx === 0)
                {
                    // left edge
                    if (by >= high - 1)
                    {
                        // roof
                        bmpData.draw(game.make.sprite(0, 0, Building.buildingRoofLeft[b]), 0, sy);
                    }
                    else
                    {
                        if (by === 0)
                        {
                            this.rubbleLft = Game.behindLayer.create(this.sprite.x - this.sprite.width * 0.5 + roofAndEdge.width, MissionControl.groundLevel, 'rubbleLft');
                            this.rubbleLft.anchor.setTo(1, 1);
                            this.rubbleLft.visible = false;
                            this.dustCloudLft = Game.behindLayer.create(this.rubbleLft.x, this.rubbleLft.y, 'dustCloudLft');
                            this.dustCloudLft.anchor.setTo(1, 1);
                            this.dustCloudLft.visible = false;
                        }
                        // rest of building
                        bmpData.draw(game.make.sprite(0, 0, Building.buildingLeft[b]), 0, sy);
                    }
                }
                else if (bx >= wide - 1)
                {
                    // right edge
                    if (by >= high - 1)
                    {
                        // roof
                        bmpData.draw(game.make.sprite(0, 0, Building.buildingRoofRight[b]), bmpData.width - roofAndEdge.width, sy);
                    }
                    else
                    {
                        if (by === 0)
                        {
                            this.rubbleRgt = Game.behindLayer.create(this.sprite.x + this.sprite.width * 0.5 - roofAndEdge.width, MissionControl.groundLevel, 'rubbleRgt');
                            this.rubbleRgt.anchor.setTo(0, 1);
                            this.rubbleRgt.visible = false;
                            this.dustCloudRgt = Game.behindLayer.create(this.rubbleRgt.x, this.rubbleRgt.y, 'dustCloudRgt');
                            this.dustCloudRgt.anchor.setTo(0, 1);
                            this.dustCloudRgt.visible = false;
                        }
                        // rest of building
                        bmpData.draw(game.make.sprite(0, 0, Building.buildingRight[b]), bmpData.width - roofAndEdge.width, sy);
                    }
                }
                else
                {
                    // middle piece
                    if (by >= high - 1)
                    {
                        // roof
                        bmpData.draw(game.make.sprite(0, 0, pickRandomFromList(buildingRoofList)), roofAndEdge.width + (bx - 1) * buildingComponent.width, sy);
                    }
                    else
                    {
                        // lowest floor piece
                        if (by === 0)
                        {
                            var s = Game.behindLayer.create(this.sprite.x - this.sprite.width * 0.5 + (bx - 1) * buildingComponent.width + roofAndEdge.width, MissionControl.groundLevel, pickRandomFromList(['rubbleMd1', 'rubbleMd2', 'rubbleMd3']));
                            s.anchor.setTo(0, 1);
                            s.visible = false;
                            this.rubbleMid.push(s);

                            s = Game.behindLayer.create(s.x, s.y, 'dustCloudMid');
                            s.anchor.setTo(0, 1);
                            s.visible = false;
                            this.dustCloudMid.push(s);
                        }
                        // rest of building
                        bmpData.draw(game.make.sprite(0, 0, pickRandomFromList(buildingMidList)), roofAndEdge.width + (bx - 1) * buildingComponent.width, sy);
                        this.windows.push( { x:roofAndEdge.width + (bx - 1) * buildingComponent.width + buildingComponent.width * 0.5, y:sy, bx:bx, by:by } );
                    }
                }
            }
        }

        // remember how many windows the building had initially
        this.startWindows = this.windows.length;

        this.sprite.anchor.setTo(0.5, 1);
        game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
        this.sprite.enableBody = true;
        this.sprite.body.bounce.setTo(0, 0);
        this.sprite.body.immovable = true;
        this.sprite.body.height -= 16;
        this.sprite.body.allowGravity = false;

        // when does the first fire start?
        this.nextFireTime = game.time.now + Math.random() * 8000 + 1000;

        // when will this building collapse next, and how far down has it moved?
        this.nextCollapse = 0;
        this.shaking = false;
        // flag on sprite so the Person collision callback can see it... set true when the building first starts collapsing
        this.sprite.collapsing = false;

        this.sfxRumble = gameAudio.addToList('sfxBuildingRumble', Audio.sfxRumbles, false, true, false, 2);
        this.sfxDemolished = gameAudio.addToList('sfxBuildingDemolished', Audio.sfxDemolisheds, false, false, false, 2);
    },


    hide: function()
    {
        if (this.dustCloudLft) this.dustCloudLft.destroy();
        this.dustCloudLft = null;
        if (this.dustCloudRgt) this.dustCloudRgt.destroy();
        this.dustCloudRgt = null;
        if (this.dustCloudMid)
        {
            for (var i = this.dustCloudMid.length - 1; i >= 0; --i)
            {
                var s = this.dustCloudMid[i];
                s.destroy();
            }
        }
        this.dustCloudMid = null;
        this.sprite.visible = false;
    },


    destroy: function()
    {
        if (this.sfxRumble)
            gameAudio.removeFromList(this.sfxRumble, Audio.sfxRumbles);
        this.sfxRumble = null;
        if (this.sfxDemolished)
            gameAudio.removeFromList(this.sfxDemolished, Audio.sfxDemolisheds);
        this.sfxDemolished = null;

        if (this.rubbleLft) this.rubbleLft.destroy();
        this.rubbleLft = null;
        if (this.rubbleRgt) this.rubbleRgt.destroy();
        this.rubbleRgt = null;
        if (this.rubbleMid)
        {
            for (i = this.rubbleMid.length - 1; i >= 0; --i)
            {
                s = this.rubbleMid[i];
                s.destroy();
            }
        }
        this.rubbleMid = null;

        this.sprite.destroy();
        this.sprite = null;
        this.windows = null;
        // don't destroyList myFire because the entries are duplicated in the global fireList array and will be destroyed from there
        this.myFire = null;
    },

    update: function()
    {
        // stop update when the building has been hidden
        if (!this.sprite.visible)
            return true;

        // spreads fire if it's time
        this.spreadFire();

        // collapses building if it's time
        if (this.nextCollapse > 0)
        {
            if (!this.collapse())
            {
                return false;
            }
        }

        // shakes building just before it collapses
        if (this.shaking)
            this.shake();

        if (!this.sprite.collapsing)
            this.collisions();

        // set sprite position from xPos, yPos
        this.sprite.x = this.sprite.xPos + this.xShake;
        this.sprite.y = this.sprite.yPos + this.yShake;

        return true;
    },

    shake : function()
    {
        // make the building shake
        this.xShake = Math.random() * 2 - 1;
        this.yShake = Math.random();
        if (this.sfxRumble)
            this.sfxRumble.play('', 0, 1, true, false);
    },

    collapse : function()
    {
        if (game.time.now > this.nextCollapse)
        {
            if (this.sfxDemolished)
                this.sfxDemolished.play('', 0, 1, false, false);

            if (!this.sprite.collapsing)
            {
                // the building has only just started to collapse
                this.sprite.collapsing = true;
                // call the collisions one more time to let others know that this building is collapsing
                this.collisions();
            }

            var i;
            if (!this.dustCloudLft.visible)
            {
                var s;

                this.dustCloudLft.bringToTop();
                this.dustCloudLft.visible = true;
                this.dustCloudLft.animations.add('dustCloudLft');
                this.dustCloudLft.animations.play('dustCloudLft', 9, true, false);
                this.dustCloudRgt.bringToTop();
                this.dustCloudRgt.visible = true;
                this.dustCloudRgt.animations.add('dustCloudRgt');
                this.dustCloudRgt.animations.play('dustCloudRgt', 9, true, false);
                for(i = this.dustCloudMid.length - 1; i >= 0; --i)
                {
                    s = this.dustCloudMid[i];
                    s.bringToTop();
                    s.visible = true;
                    s.animations.add('dustCloudMid');
                    s.animations.play('dustCloudMid', 10 + Math.floor(Math.random() * 5), true, false);
                }
            }
            // make the building fall
            this.sprite.yPos += 8;

            // make all window fires fall with it
            for (i = this.myFire.length - 1; i >= 0; --i)
            {
                this.myFire[i].sprite.y += 8;
                // hide fire when its base goes underground
                if (this.myFire[i].sprite.y > MissionControl.groundLevel)
                    this.myFire[i].sprite.visible = false;
            }

            // if the building has fallen almost to the bottom then show the rubble
            if (!this.rubbleLft.visible && this.sprite.yPos - this.sprite.height > MissionControl.groundLevel - 48)
            {
                var r;

                // show the rubble pile and make sure it's above the building
                this.rubbleLft.bringToTop();
                this.rubbleLft.visible = true;
                this.rubbleRgt.bringToTop();
                this.rubbleRgt.visible = true;
                for(i = this.rubbleMid.length - 1; i >= 0; --i)
                {
                    r = this.rubbleMid[i];
                    r.bringToTop();
                    r.visible = true;
                }
                // make sure dust is above the rubble
                this.dustCloudLft.bringToTop();
                this.dustCloudRgt.bringToTop();
                for(i = this.dustCloudMid.length - 1; i >= 0; --i)
                {
                    r = this.dustCloudMid[i];
                    r.bringToTop();
                }
            }

            // if the building has fallen off the screen then return false
            if (this.sprite.yPos - this.sprite.height > MissionControl.groundLevel)
            {
                if (this.sfxRumble)
                    gameAudio.removeFromList(this.sfxRumble, Audio.sfxRumbles);
                this.sfxRumble = null;
                if (this.sfxDemolished)
                    gameAudio.removeFromList(this.sfxDemolished, Audio.sfxDemolisheds);
                this.sfxDemolished = null;
                return false;
            }

            this.nextCollapse = game.time.now + 250;
        }
        return true;
    },

    spreadFire : function()
    {
        if (game.time.now > this.nextFireTime)
        {
            if (this.windows && this.windows.length > 0)
            {
                // pick a window
                var w = pickRandomFromList(this.windows);
                // make a fire and add it to the list (so it can be destroyed later)
                var f = new Fire(game);
                f.create(this, w.x + this.sprite.x - this.sprite.width * 0.5, this.sprite.y - w.y + 24);
                fireList.push(f);
                this.myFire.push(f);
                // remove the window so it doesn't get used again
                this.windows.splice(this.windows.indexOf(w), 1);
                // set the time when the fire spreads
                this.nextFireTime = game.time.now + Math.max(Math.min((this.startWindows - this.windows.length) * 1000, 8000), 2000);      // 2 - 8 seconds, *slower* when more windows are burning
                if (this.windows.length === 0)
                    this.shaking = true;
            }
            else
            {
                // TODO: make building collapse, it's been destroyed by fire!
                this.nextFireTime = game.time.now + 0xffffff;
                this.nextCollapse = game.time.now + 250;
            }
        }
    },


    collisions : function()
    {
        if (chopper)
        {
            // chopper collisions vs buildings
            game.physics.arcade.collide(this.sprite, chopper.sprite, null, Chopper.chopperBuildingCollisionHandler, chopper);
        }

        // survivors collisions vs buildings
        for(var i = 0; i < survivors.length; i++)
        {
            game.physics.arcade.collide(this.sprite, survivors[i].sprite, Person.personCollisionHandler, null, survivors[i]);
        }
    }

};

