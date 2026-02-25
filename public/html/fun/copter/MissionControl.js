/**
 * Created by Pete on 21/05/2014.
 */
MissionControl = function(game) {
};


// constants
MissionControl.SKYSCRAPER = 1;
MissionControl.OCEAN = 2;
MissionControl.BUSHFIRE = 3;
MissionControl.CLIFF = 4;
MissionControl.VICTORY = 10;

MissionControl.RADAR_WIDE = 400;
MissionControl.RADAR_HIGH = 80;

MissionControl.levelType = [
    MissionControl.SKYSCRAPER,
    MissionControl.SKYSCRAPER,
    MissionControl.SKYSCRAPER,
    MissionControl.SKYSCRAPER,
    MissionControl.SKYSCRAPER,
    MissionControl.SKYSCRAPER,
    MissionControl.VICTORY
];


// variables
var bg = null;
var scenery = null;
var parallaxSprite2 = null;
var horizon = null;

var chopper = null;
var radar = null;
var radarGlow = null;
var radarChopper = null;
var hudRiskCount = null;
var hudSafeCount = null;
var messageSprite = null;

var radarSurvivor = [];
var explosionList = [];
var effectsList = [];
var fireList = [];


var survivors = null;
var saved = null;
var ground_b = null;
var ground_t = null;
var roofs = null;

var frameCount = 0;




MissionControl.prototype = {

    // level is zero based
    // return false if game has ended
    create: function(level)
    {
        //console.log("MissionControl.create level =", level);

        // show game background
        game.stage.backgroundColor = '#8080e0';
        bg = Game.behindLayer.create(0, 0, 'background');
        bg.width = game.width;
        bg.height = 540;
        bg.fixedToCamera = true;

        // work out where the ground level is (halfway down the pavement)
        game.world.setBounds(-1000 * 0.5, 0, this.worldWide, 540);
        var size_b = game.cache.getImage("ground_b1");
        MissionControl.groundLevel = game.world.bounds.height - size_b.height;
        // work out where the bottom of the wall (the top of the pavement) is
        var size_t = game.cache.getImage("ground_t1");
        MissionControl.wallLevel = MissionControl.groundLevel - size_t.height;
        // work out where the top of the wall is
        var size_w = game.cache.getImage("wall1");
        MissionControl.wallTop = MissionControl.wallLevel - size_w.height;

        explosionList = [];
        fireList = [];
        effectsList = [];

        switch(MissionControl.levelType[level])
        {
            case MissionControl.SKYSCRAPER:
                // level size
                this.worldWide = 1000 + level * 100;
                game.world.setBounds(-this.worldWide * 0.5, 0, this.worldWide, 540);

                // add parallax buildings with random heights from groundLevel up to the top of the wall
                this.addParallaxLayer();

                // add horizon
                this.createHorizon(1 + level);

                // add pavement
                this.addGround(1 + level);

                // add buildings
                scenery = [];
                this.createSkyscrapers(1 + level);
                roofs = getRoofRanges(scenery);

                // raise the bottom half of the ground tiles up so the building goes behind them
                this.popGround();

                // add chopper avoiding the skyscrapers
                chopper = new Chopper(game);
                chopper.create(Math.floor(128 + (game.world.bounds.width - 128 * 2) * Math.random()) + game.world.bounds.left, MissionControl.groundLevel - 48);

                // camera follows chopper
                game.camera.follow(chopper.sprite);

                // add survivors on the skyscraper roofs
                survivors = [];
                shrinkRanges(roofs, 0.9);
                this.addSurvivors(4 + level * 2, roofs);
                saved = [];

                break;
            case MissionControl.OCEAN:
                break;
            case MissionControl.BUSHFIRE:
                break;
            case MissionControl.CLIFF:
                break;
            case MissionControl.VICTORY:
                // game beaten
                return false;
        }

        var rw = this.worldWide * MissionControl.RADAR_WIDE / 2000;
        radar = MissionControl.createRadar('radarBg', (game.width - rw) * 0.5, -MissionControl.RADAR_HIGH, rw, MissionControl.RADAR_HIGH, survivors.length);
        var t = game.add.tween(radar.cameraOffset).to({y:0}, 500, Phaser.Easing.Quadratic.Out).delay(500);
        t.start();

        this.addUI();
        return true;
    },


    addUI: function()
    {
        hudRiskCount = new NinePatchSprite( game, 0, -45, 128, 45, 7, 13, 7, 13, 'infoLft' );
        Game.uiLayer.add(hudRiskCount);
        hudRiskCount.fixedToCamera = true;

        this.remainText = game.make.bitmapText(85, 12, 'font1', '0', 16);
        hudRiskCount.addChild(this.remainText);

        var h = game.make.sprite(9, 7, 'hudAtRisk');
        hudRiskCount.addChild(h);

        var t = game.add.tween(hudRiskCount.cameraOffset);
        t.to({y:0}, 500, Phaser.Easing.Quadratic.Out).delay(800);
        t.start();

        hudSafeCount = new NinePatchSprite( game, game.camera.width - 128, -45, 128, 45, 13, 7, 7, 13, 'infoRgt' );
        Game.uiLayer.add(hudSafeCount);
        hudSafeCount.fixedToCamera = true;

        this.savedText = game.make.bitmapText(85, 12, 'font1', '0', 16);
        hudSafeCount.addChild(this.savedText);

        h = game.make.sprite(15, 7, 'hudSaved');
        hudSafeCount.addChild(h);

        t = game.add.tween(hudSafeCount.cameraOffset);
        t.to({y:0}, 500, Phaser.Easing.Quadratic.Out).delay(800);
        t.start();
    },


    update: function()
    {
        frameCount++;

        this.remainText.setText(survivors.length.toString());
        this.savedText.setText(saved.length.toString());

        MissionControl.updateRadar();

        parallaxSprite2.x = game.world.bounds.left + game.camera.position.x * 0.5;
        parallaxSprite2.y = game.world.bounds.top + game.camera.position.y * 0.5 - 100;
        bg.cameraOffset.y = 0 - game.camera.position.y * 0.25;

        // update explosions: buildings explodes and blackens, survivors and chopper get killed if caught in blasts
        for(var i = explosionList.length - 1; i >= 0; --i)
        {
            explosionList[i].update(chopper, survivors);
        }

        // update effects
        for(i = effectsList.length - 1; i >= 0; --i)
        {
            effectsList[i].update();
        }

        // update fires
        for(i = fireList.length - 1; i >= 0; --i)
        {
            fireList[i].update(chopper, survivors);
        }

        // update scenery (including collisions which MUST come before other updates!)
        if (scenery)
        {
            for(i = scenery.length - 1; i >= 0; --i)
            {
                if (!scenery[i].update())
                {
                    scenery[i].hide();
                }
            }
        }

        // update survivors on roofs
        for(i = survivors.length - 1; i >= 0; --i)
        {
            if (!survivors[i].update(chopper))
            {
                survivors.splice(i, 1);
            }
        }
        
        // update saved people
        for(i = saved.length - 1; i >= 0; --i)
        {
            saved[i].update(chopper);
        }

        // update the chopper
        if (chopper)
            chopper.update(saved);

        // detect end of the level
        if (Game.winTime === 0 && Game.loseTime === 0)
        {
            if (!chopper || chopper.dead)
            {
                Game.loseTime = game.time.now + 6000;
            }
            else if (survivors.length === 0 && !chopper.carryLeft && !chopper.carryRight)
            {
               Game.winTime = game.time.now + 2000;
               if (!messageSprite)
               {
                    messageSprite = game.make.sprite(bg.width * 0.5, bg.height * 0.25, 'levelComplete');
                    messageSprite.anchor.setTo(0.5);
                    messageSprite.fixedToCamera = true;
                    messageSprite.scale.setTo(0.25);
                    messageSprite.alpha = 0;
                    Game.uiLayer.add(messageSprite);
                    var twa = game.add.tween(messageSprite);
                    twa.to({alpha:1.0}, 500);
                    var tws = game.add.tween(messageSprite.scale);
                    tws.to({x: 1.0, y: 1.0}, 500, Phaser.Easing.QuadraticOut);
                    twa.start();
                    tws.start();
               }
            }

        }
    },


    destroy: function()
    {
        if (hudRiskCount) hudRiskCount.destroy();
        hudRiskCount = null;
        if (hudSafeCount) hudSafeCount.destroy();
        hudSafeCount = null;
        if (chopper) chopper.destroy();
        chopper = null;
        if (survivors) destroyList(survivors);
        survivors = null;
        if (saved) destroyList(saved);
        saved = null;
        if (parallaxSprite2) parallaxSprite2.kill();
        parallaxSprite2 = null;
        if (scenery) destroyList(scenery);
        scenery = null;
        if (explosionList) destroyList(explosionList);
        explosionList = [];
        if (effectsList) destroyList(effectsList);
        effectsList = [];
        if (fireList) destroyList(fireList);
        fireList = [];
        if (ground_b) destroyList(ground_b);
        ground_b = null;
        if (ground_t) destroyList(ground_t);
        ground_t = null;
        if (horizon) destroyList(horizon);
        horizon = null;
        if (bg) bg.kill();
        bg = null;
        if (this.remainText) this.remainText.destroy();
        this.remainText = null;
        if (this.savedText) this.savedText.destroy();
        this.savedText = null;
        if (radar) radar.destroy();
        roofs = null;
        if (messageSprite) messageSprite.destroy();
        messageSprite = null;

    },


    createSkyscrapers: function(num)
    {
        for(var i = 0; i < num; i++)
        {
            var building = new Building(game);
            building.create(getRoofRanges(scenery), MissionControl.groundLevel - 8, 4 + Math.floor(Math.random() * 3), 3 + Math.floor(Math.random() * 2));
            scenery.push(building);
        }
    },


    createHorizon: function(level)
    {
        horizon = [];
        var previousTile = -1;
        var size = game.cache.getImage("wall1");
        var wallTiles = [ 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 1, 2, 3 ];
        for(var x = game.world.bounds.left; x < game.world.bounds.right; x += size.width)
        {
            var r;
            do {
                r = pickRandomFromList(wallTiles);
            }while(r === previousTile);
            previousTile = r;
            var hudSafeCount = Game.behindLayer.create(x, MissionControl.wallLevel, "wall" + r.toString());
            hudSafeCount.anchor.setTo(0, 1);
            horizon.push(hudSafeCount);
        }
    },


    addGround: function(level)
    {
        ground_b = [];
        ground_t = [];

        var previousTile_b = -1;
        var previousTile_t = -1;
        var size_b = game.cache.getImage("ground_b1");

        var groundTiles_b = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 6, 7, 8, 1, 6, 7, 8, 1, 7, 1, 7 ];
        var groundTiles_t = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 7, 8, 1, 2, 7, 8, 1, 2, 1, 2 ];

        for(var x = game.world.bounds.left; x < game.world.bounds.right; x += size_b.width)
        {
            // bottom half of the pavement - collidable
            var r;
            do {
                r = pickRandomFromList(groundTiles_b);
            }while(r == previousTile_b);
            previousTile_b = r;
            var hudSafeCount = Game.behindLayer.create(x, game.world.bounds.height, "ground_b" + r.toString());
            hudSafeCount.anchor.setTo(0, 1);
            game.physics.enable(hudSafeCount, Phaser.Physics.ARCADE);
            hudSafeCount.enableBody = true;
            hudSafeCount.body.bounce.setTo(0, 0);
            hudSafeCount.body.immovable = true;
            hudSafeCount.body.allowGravity = false;
            ground_b.push(hudSafeCount);

            // top half of the pavement - not collidable
            do {
                r = pickRandomFromList(groundTiles_t);
            }while(r == previousTile_t);
            previousTile_t = r;
            hudSafeCount = Game.behindLayer.create(x, MissionControl.groundLevel, "ground_t" + r.toString());
            hudSafeCount.anchor.setTo(0, 1);
            ground_t.push(hudSafeCount);
        }
    },


    popGround: function()
    {
        for(var i = ground_b.length - 1; i >= 0; --i)
            ground_b[i].bringToTop();
    },


    addSurvivors: function(num, validRanges)
    {
        for(var i = 0; i < num; i++)
        {
            var person = new Person(game);
            person.create(validRanges, 0);
            survivors.push(person);
        }
    },


    addParallaxLayer: function()
    {
        parallaxSprite2 = Game.behindLayer.create(game.world.bounds.left, game.world.bounds.top, null);
        px = Math.random() * 200;
        while(px < game.world.bounds.width)
        {
            py = game.rnd.integerInRange(MissionControl.wallTop, MissionControl.wallLevel);

            var p = game.make.sprite(px, py, pickRandomFromList(['bgBuilding1','bgBuilding2','bgBuilding3']));
            p.anchor.setTo(0.5, 1.0);
            parallaxSprite2.addChild(p);

            px += p.width * 0.5 + p.width * 1.5 * Math.random();
        }
    }

};


MissionControl.sceneryTop = function(x)
{
    for(var i = 0; i < scenery.length; i++)
    {
        var hudSafeCount = scenery[i].sprite;
        if (x >= hudSafeCount.x - hudSafeCount.width * 0.5 && x < hudSafeCount.x + hudSafeCount.width * 0.5)
            return hudSafeCount.y - hudSafeCount.height;
    }
    return false;
};


MissionControl.fade_l = null;
MissionControl.fade_r = null;
MissionControl.fade_all = null;


MissionControl.fadeToBlack = function(callAtEnd, context)
{
    MissionControl.fade_r = Main.faderLayer.create(800, 0, 'fader_r');
    MissionControl.fade_r.fixedToCamera = true;
    MissionControl.fade_r.anchor.setTo(1, 0);

    MissionControl.fade_l = Main.faderLayer.create(0, 0, 'fader_l');
    MissionControl.fade_l.fixedToCamera = true;

    MissionControl.fade_all = Main.faderLayer.create(0, 0, 'fader_all');
    MissionControl.fade_all.fixedToCamera = true;
    MissionControl.fade_all.width = 800;
    MissionControl.fade_all.height = 480;
    MissionControl.fade_all.alpha = 0;

    game.add.tween(MissionControl.fade_r).to({width:2000}, 800, Phaser.Easing.Linear.None, true);
    game.add.tween(MissionControl.fade_l).to({width:2000}, 800, Phaser.Easing.Linear.None, true);
    var tw3 = game.add.tween(MissionControl.fade_all);
    tw3.to({alpha:1.0}, 250).delay(600);
    tw3.onComplete.addOnce(callAtEnd, context);
    tw3.start();
};


MissionControl.fadeFromBlack = function()
{
    game.add.tween(MissionControl.fade_all).to({alpha:0}, 500, Phaser.Easing.Linear.None, true);
    game.add.tween(MissionControl.fade_r).to({width:1}, 1000, Phaser.Easing.Linear.None, true);
    var tw3 = game.add.tween(MissionControl.fade_l).to({width:1}, 1000, Phaser.Easing.Linear.None, true);
    tw3.onComplete.addOnce(MissionControl.killFaders, this);
};


MissionControl.killFaders = function()
{
    if (MissionControl.fade_l)
    {
        MissionControl.fade_l.destroy();
        MissionControl.fade_l = null;
    }
    if (MissionControl.fade_r)
    {
        MissionControl.fade_r.destroy();
        MissionControl.fade_r = null;
    }
    if (MissionControl.fade_all)
    {
        MissionControl.fade_all.destroy();
        MissionControl.fade_all = null;
    }
};


MissionControl.createRadar = function(key, x, y, wide, high, people)
{
    // set up inner bounds rectangle for positioning
    this.radarBounds = new Phaser.Rectangle(13, 7, wide - 13 * 2, high - 7 - 13);

    // create the 9 patch sprite to show the resizing radar
    var hudSafeCount = new NinePatchSprite( game, 0, 0, wide, high, 13, 13, 7, 13, key );
    hudSafeCount.x = x;
    hudSafeCount.y = y;
    Game.uiLayer.add(hudSafeCount);
    hudSafeCount.fixedToCamera = true;

    var scalex = this.radarBounds.width / game.world.bounds.width;
    var scaley = this.radarBounds.height / game.world.bounds.height;

    var mx = this.radarBounds.width * 0.5;
    var by = this.radarBounds.height;

    var buildingRanges = getRoofRanges(scenery);
    for(var i = 0; i < buildingRanges.length; i++)
    {
        var l = buildingRanges[i].left * scalex + mx;
        var r = buildingRanges[i].right * scalex + mx;
        var h = buildingRanges[i].height * scaley;
        var bs = game.make.sprite(this.radarBounds.left + l, this.radarBounds.bottom, 'radarBuilding');
        bs.width = r - l;
        bs.height = h;
        bs.anchor.setTo(0, 1);
        hudSafeCount.addChild(bs);
    }

    radarGlow = game.make.sprite(0,0,'radarPulse');
    radarGlow.y = this.radarBounds.top;
    hudSafeCount.addChild(radarGlow);
    radarGlow.alpha = false;
    radarGlow.height = this.radarBounds.height;
    radarGlow.blendMode = Phaser.blendModes.ADD;

    radarChopper = game.make.sprite(0, 0, 'radarCopter');
    radarChopper.anchor.setTo(0.5, 1);
    hudSafeCount.addChild(radarChopper);

    for(i = 0; i < people; i++)
    {
        radarSurvivor[i] = game.make.sprite(0, 0, 'radarPerson');
        radarSurvivor[i].anchor.setTo(0.5, 1);
        hudSafeCount.addChild(radarSurvivor[i]);
    }

    return hudSafeCount;
};


MissionControl.updateRadar = function()
{
    if ((frameCount & 0x7f) === 0)
    {
        radarGlow.x = this.radarBounds.left;
        var t = game.add.tween(radarGlow);
        t.to({alpha:1.0}, 100);
        t.to({x:this.radarBounds.right - radarGlow.width}, 1500, Phaser.Easing.Linear.None);
        t.to({alpha:0.0}, 100);
        t.start();
    }

    var scalex = this.radarBounds.width / game.world.bounds.width;
    var scaley = this.radarBounds.height / MissionControl.groundLevel;

    if (chopper && !chopper.dead)
    {
        radarChopper.x = this.radarBounds.left + chopper.sprite.x * scalex + this.radarBounds.width * 0.5;
        radarChopper.y = this.radarBounds.top + chopper.sprite.body.bottom * scaley;
        radarChopper.rotation = chopper.sprite.rotation;
    }
    else
    {
        if (radarChopper)
        {
            radarChopper.destroy();
            radarChopper = null;
        }
    }

    for(var i = 0; i < survivors.length; i++)
    {
        radarSurvivor[i].x = this.radarBounds.left + survivors[i].sprite.x * scalex + this.radarBounds.width * 0.5;
        radarSurvivor[i].y = this.radarBounds.top + survivors[i].sprite.body.bottom * scaley;
    }
    for(;i < radarSurvivor.length; i++)
    {
        radarSurvivor[i].visible = false;
    }
};
