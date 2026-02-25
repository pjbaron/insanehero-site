/**
 * Created by Pete on 19/05/2014.
 */
Game = function(game) {
    game = game;
};


// variables
var mission = null;

// global variables
Game.level = 0;              // zero-based
Game.score = 0;
Game.winTime = 0;
Game.loseTime = 0;
Game.behindLayer = null;
Game.inFrontLayer = null;
Game.onTopLayer = null;
Game.uiLayer = null;



Game.prototype = {

    create: function()
    {
        console.log("Game.create");
        Game.level = 0;
        mission = null;
        Game.score = 0;
        Game.winTime = 0;
        Game.loseTime = 0;
        Game.behindLayer = game.add.group();
        Game.inFrontLayer = game.add.group();
        Game.onTopLayer = game.add.group();
        Game.uiLayer = game.add.group();
        this.gameLost = false;

        game.physics.startSystem(Phaser.Physics.ARCADE);

        this.addTitles();
        game.world.bringToTop(Main.faderLayer);
    },

    hoverBtn: function()
    {
        this.tbt.loadTexture('goBtn_hvr') ;
    },

    hoverBtnOut: function()
    {
        this.tbt.loadTexture('goBtn') ;
    },

    hoverBtnDwn: function()
    {
        this.tbt.loadTexture('goBtn_dwn');
        this.goFull();
    },

    update: function()
    {
        // if there's no mission, just update all the title screen stuff
        if (!mission)
        {
            var i;

            if (effectsList)
                for(i = effectsList.length - 1; i >= 0; --i)
                    effectsList[i].update();

            if (this.anims)
                for(i = 0, l = this.anims.length; i < l; i++)
                    this.anims[i].update();

            if (this.tc)
                this.tc.y = game.world.height * 0.20 + Math.sin(game.time.now / 1000) * 15;
            return true;
        }

        // update the game when the mission is underway
        mission.update();

        // check for victory/loss conditions
        if (Game.winTime !== 0)
        {
            if (game.time.now > Game.winTime)
            {
                MissionControl.fadeToBlack(this.endLevel, this);
                Game.winTime = Game.lostTime = 0;
            }
        }

        if (Game.loseTime !== 0)
        {
            if (game.time.now > Game.loseTime)
            {
                MissionControl.fadeToBlack(this.loseLevel, this);
                Game.loseTime = 0;
            }
        }

        return (!this.gameLost);
    },


    destroy: function()
    {
        console.log("Game.destroy");
        if (mission)
            mission.destroy();
        mission = null;
    },


    startLevel: function()
    {
        Game.winTime = 0;
        Game.lostTime = 0;
        mission = new MissionControl(game);
        if (!mission.create(Game.level))
        {
            // game has ended!
            mission.destroy();
            mission = null;
            this.addTitles();
            MissionControl.fadeFromBlack();
            return;
        }

        // remove title stuff
        if (this.tbt) this.tbt.destroy();
        this.tbt = null;
        if (this.tb) this.tb.destroy();
        this.tb = null;
        if (this.tt) this.tt.destroy();
        this.tt = null;
        if (this.tc) this.tc.destroy();
        this.tc = null;
        if (effectsList)
            for(i = effectsList.length - 1; i >= 0; --i)
                effectsList[i].destroy();
        effectsList = [];
        if (this.anims)
            for(var i = 0, l = this.anims.length; i < l; i++)
                this.anims[i].destroy();
        this.anims = null;
        
        if (this.flySfx)
        {
            this.flySfx.stop();
            this.flySfx = null;
        }

        MissionControl.fadeFromBlack();
    },


    endLevel: function()
    {
        if (mission)
        {
            mission.destroy();
            mission = null;
        }
        // bonus points for completing a level
        Game.score += 10 * (Game.level + 1);
        Game.level++;
        this.startLevel();
    },


    loseLevel: function()
    {
        console.log("Game.loseLevel");
        // cause this instance of the game to be killed (and a new one created, starting at the titles again)
        this.gameLost = true;
        // start transition back to show the screen
        MissionControl.fadeFromBlack();
    },


    goFull: function()
    {
        game.input.onDown.remove(this.goFull, this);
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.NO_SCALE;
        
//        if (game.scale.isFullScreen)
//        {
//            game.scale.stopFullScreen();
//        }
//        else
        {
// TODO: put this back for release builds
//            game.scale.startFullScreen();
        }

        MissionControl.fadeToBlack(this.startLevel, this);
    },


    addTitles: function()
    {
        // fix the world size and the camera position in it
        game.world.setBounds(0, 0, 800, 480);
        game.camera.unfollow();
        game.camera.x = 0;
        game.camera.y = 0;

        // title background
        this.tb = Game.behindLayer.create(0, 0, 'titleBg');

        this.anims = [];
        this.anims[0] = new Fire(game);
        this.anims[0].create(null, 90, 450);
        this.anims[1] = new Fire(game);
        this.anims[1].create(null, 138, 450);
        this.anims[2] = new Fire(game);
        this.anims[2].create(null, 708, 415);

        this.anims[3] = new Person(game);
        this.anims[3].create(null, 726, 315);
        this.anims[4] = new Person(game);
        this.anims[4].create(null, 756, 315);
        this.anims[5] = new Person(game);
        this.anims[5].create(null, 156, 350);
        this.anims[6] = new Person(game);
        this.anims[6].create(null, 585, 400);

        // title text
        this.tt = Game.behindLayer.create(game.world.width * 0.5, game.world.height * 0.42, 'titleText');
        this.tt.anchor.set(0.5);
        this.tt.scale.setTo(1.0, 1.0);
        this.tw = game.add.tween(this.tt.scale);
        this.tw.to({x: 1.2, y: 1.2}, 100, Phaser.Easing.QuadraticOut);
        this.tw.to({x: 0.9, y: 0.9}, 100, Phaser.Easing.QuadraticInOut);
        this.tw.to({x: 1.1, y: 1.1}, 100, Phaser.Easing.QuadraticInOut);
        this.tw.to({x: 1.0, y: 1.0}, 100, Phaser.Easing.QuadraticIn, true);

        // title chopper
        this.tc = Game.uiLayer.create(game.world.width * 0.5 + 200, game.world.height * 0.20, 'titleChopper');
        var tch = this.tc.height;
        this.tc.anchor.set(0.5);
        this.tc.scale.set(0.1);
        // title chopper tail rotor
        this.tcr = game.make.sprite(58, -12, 'titleChopperRotor');
        this.tcr.anchor.setTo(0.5, 1);
        this.tcr.animations.add('spin');
        this.tcr.animations.play('spin', 30, true, false);
        this.tc.addChild(this.tcr);
        // title chopper blades
        this.tcb = game.make.sprite(-10, -tch * 0.5, 'blades');
        this.tcb.anchor.setTo(0.5, 1.0);
        this.tcb.animations.add('spin');
        this.tcb.animations.play('spin', 20, true, false);
        this.tc.addChild(this.tcb);

        // title 'go' button
        this.tbt = Game.inFrontLayer.create(game.world.width * 0.5, game.world.height * 0.8, 'goBtn');
        this.tbt.anchor.set(0.5);
        this.tbt.inputEnabled = true;
        this.tbt.input.useHandCursor = true;
        this.tbt.alpha = 0;
        this.tbt.events.onInputOver.add(this.hoverBtn, this);
        this.tbt.events.onInputOut.add(this.hoverBtnOut, this);
        this.tbt.events.onInputDown.add(this.hoverBtnDwn, this);

        // title chopper flies in from the distance
        game.add.tween(this.tc.scale).to({x:1.0, y:1.0}, 1000, Phaser.Easing.QuadraticInOut, true);
        game.add.tween(this.tc).to({x:game.world.width * 0.5}, 1000, Phaser.Easing.QuadraticOut, true);

        this.flySfx = Audio.flySfx.play('', 0, 0, true);
        game.add.tween(this.flySfx).to({volume:1.0}, 1000, Phaser.Easing.QuadraticInOut, true);

        // fade in the 'go' button
        var t1 = game.add.tween(this.tbt);
        t1.to({alpha:1.0}, 500, Phaser.Easing.Linear.None, true)
        t1.delay(1000);
    }


};