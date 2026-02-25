//
// World.js
//
// Pete Baron 2017
//
// game environment management, background, ui, puzzle, etc
//


function World( _game )
{
	this.game = _game;

    World.effects = null;

	this.managers = null;
	this.lastMatchTime = -1;

    this.shotsText = null;
    this.fishText = null;
    this.fishIcon = null;
    this.fishWidget = null;
	this.scoreText = null;
	this.bm = null;
    this.boostIcon = null;
    this.endSequence = false;
    this.shootBubblesAfter = undefined;
    this.uiBits = null;
    this.star1 = this.star2 = this.star3 = null;

    this.launcherMeter = null;
    this.launcherRing = null;
    this.launcherBeam = null;
    this.launcherButton = null;
    this.launcherMask = null;
    this.starMask = null;

	// input
	this.ignoreClick = null;
	this.usePlayerInput = null;

	// the game playField
	this.playField = null;

    // the underlying grid
    this.gridCollide = null;

    // the game bubble shooter
    this.shooter = null;
}


World.brighter = null;
World.brighter2 = null;
World.effects = null;           // static effects manager


World.prototype.create = function( _managers, _level )
{
    if ( Main.debug )
        console.log("World.create " + _level);

	this.managers = _managers;
    this.level = _level;

	// enable 'swipe' gesture globally
	Main.swipeEnabled = false;

    // reset all system input parameters
    Main.mouseMoveLocal = null;
    Main.mouseUpLocal = null;
    Main.mouseDown = null;
    Main.mouseUp = null;
    Main.click = null;
    Keys.reset();
    this.uiBits = null;
    this.star1 = this.star2 = this.star3 = null;

	// screen location for the hovered and selected piece previews
	World.SelectionPreviewY = 0.23;
	World.SelectionPreviewBotY = 0.24;

	// create brightness filter to highlight selected tiles
	World.brighter = new PIXI.filters.ColorMatrixFilter();
	World.brighter.brightness(1.5, true);

	// create brightness filter to highlight hovered tiles
	World.brighter2 = new PIXI.filters.ColorMatrixFilter();
	World.brighter2.brightness(1.2, true);

    // if we are dynamically generating levels instead of using the levelDataSaga.json file...
    if ( Main.generateLevels )
    {
        this.levelData = CreateLevelData.createLevelData( this.level );
    }
    else
    {
        // challenge mode (level data is stored in levelData.js)
        var levelsData = this.managers.data.get("levels").levels;
        this.levelData = levelsData[this.level % levelsData.length];
    }

    Game.levelType = LevelType.ConvertNames[this.levelData._id];

    var losses = 0;
    if ( Main.levelLosses )
        losses = Main.levelLosses[ _level - 1 ] || 0;

    if ( Main.challengeMode )
    {
        Game.boostFullBar = Game.defaultBoostFullBar;
        Game.boostGainCost = Game.defaultBoostGainCost;
    }
    else
    {
        // saga mode sets some additional values from the loaded level data
        Game.boostFullBar = this.levelData.boostFullBar;
        Game.boostGainCost = this.levelData.boostGainCost;
        Game.shotsLeft = this.levelData.turns;

        // award extra shots for each time the player has lost this level, excluding the first time
        if ( losses > 1 )
        {
            this.levelData.extraTurns = (losses - 1);
            this.levelData.turns += this.levelData.extraTurns;
        }
    }

    // award faster boost bar charging for each three times the player has lost this level
    var l = losses >= 3 ? Math.floor(losses / 3) : 0;    
    this.levelData.boostFullBar = Math.max(this.levelData.boostFullBar - l * 10, this.levelData.boostFullBar / 4);

	// create the game playField handler
	this.playField = new PlayField( this.game );
    this.playField.create( this, this.managers, this.level, this.levelData );

    // obtain reference to the gridCollide object in playfield
	this.gridCollide = this.playField.getGridCollide();

    // create all ui components
    // (must come *after* this.playField.create which sets Game.boostType from levelData)
    this._createUI();

    // create the bubble shooter
    // (must come *after* this._createUI which sets the launcher location)
    this.shooter = new Shooter( this.game );
    this.shooter.create( this, this.managers, this.playField, this.levelData, this.gridCollide );

    // effects system
    World.effects = new Effects( this.game );
    World.effects.create( this, this.managers, this.playField, this.gridCollide );

	// force a 'window resize' to adjust all layout
	Main.resized = true;
	Main.resizeConsumed = false;

	// init
	this.lastMatchTime = -1;
	this.lastMatchType = -1;
	this.ignoreClick = null;
	this.bm = null;
    this.endSequence = false;
    this.shootBubblesAfter = undefined;
};


World.prototype.destroy = function()
{
	this.managers = null;

	var i, l;

    if ( this.uiBits )
    {
        for(i = 0, l = this.uiBits.length; i < l; i++)
        {
            var ui = this.uiBits[i];
            ui.destroy();
        }
        this.uiBits = null;
    }

    this.boostIcon = null;
    this.fishIcon = null;
    this.fishWidget = null;
    this.scoreText = null;
    this.shotsText = null;
    this.fishText = null;
    this.launcherMeter = null;
    this.launcherRing = null;
    this.launcherBeam = null;
    this.launcherButton = null;
    this.launcherMask = null;
    this.starMask = null;

	if ( this.usePlayerInput )
	{
		this.usePlayerInput.destroy();
		this.usePlayerInput = null;
	}

    if ( World.effects )
    {
        World.effects.destroy();
        World.effects = null;
    }
    
	if ( this.playField )
	{
		this.playField.destroy();
		this.playField = null;
	}

    if ( this.shooter )
    {
        this.shooter.destroy();
        this.shooter = null;
    }

	World.brighter = null;
	World.brighter2 = null;

	if ( this.bm )
	{
		this.bm.destroy();
		this.bm = null;
	}

    this.star1 = this.star2 = this.star3 = null;
	this.ignoreClick = null;
	this.game = null;
};


World.prototype.update = function()
{
    if ( Main.resized )
    {
        this._createUI();
    }

    // deal with LevelType game rules
    this._levelTypeUpdate();

	this._background();

    this._movesUpdate();
    this._userInterface();

	// NOTE: _userInput will absorb all remaining mouse input, do this *after* _userInterface which processes the buttons
	this._userInput();

    // update special effects
    World.effects.update();

    // prevent interactive gameplay when the end of game sequence is playing
    if ( !this.endSequence )
    {
        // call playfield update *before* so the shooter can alter the launcherBeam and launcherRing later
    	if ( this.playField)
    	{
            this.playField.update();
    	}

        // always call shooter update *after* playfield update
        if ( this.shooter )
        {
            this.shooter.update();
        }
    }

    // level end message and bonus award sequence
    if ( this.endSequence )
    {
        return this.levelEndSequence();
    }

    // detect end of level and set flag
    if ( this.levelEnded() )
    {
        this.endSequence = true;
    }

    if ( Main.testKeys )
    {
        // key 'x' wins the level
        if ( Keys.edgeDown[KeyCodes.key_x] )
        {
            console.log("cheat key x used");
            Keys.edgeDown[KeyCodes.key_x] = false;
            // convince the levelBeaten function that we won that level
            this.playField.clearAll();
            if ( !Main.challengeMode )
            {
                // you need at least one star to move onto the next level in Saga Mode
                Game.score += Game.starScore / 2 + 1;
            }
            return true;
        }
        // key 'l' loses the level
        if ( Keys.edgeDown[KeyCodes.key_l] )
        {
            console.log("cheat key l used");
            Keys.edgeDown[KeyCodes.key_l] = false;
            return false;
        }
    }

    return true;
};


World.prototype.levelShown = function()
{
    // return true if the level is being shown ready to play yet
    return !this.playField.introScroll;
};


// has the level ended yet or not
World.prototype.levelEnded = function()
{
    // don't end a level until all the effects have finished
    if ( this.playField.effectContinues() ||
            World.effects.count() > 0 )
    {
        if ( this.playField.invaded() || this.playField.won() )
        {
            // but do disable the shooter...
            this.shooter.endLevel();
        }
        return false;
    }

    if ( this.playField.invaded() )
    {
        return true;
    }

    if ( this.playField.won() )
    {
        return true;
    }

    // check for level failed
    if ( this.shooter.state == Shooter.OUTOFAMMO )
    {
        if ( Game.shotsLeft <= 0 )
        {
            return true;
        }
    }

    return false;
};


/// return false when World.update should no longer be called (everything has finished)
World.prototype.levelEndSequence = function()
{
    // if we're not doing the bubble shooting sequence at the end of level / game
    if ( this.shootBubblesAfter === undefined )
    {
        // if the level was beaten
        if ( this.playField.won() )
        {
            // start the bubble shooting sequence always in Saga Mode, but in Challenge Mode only after the last level
            if ( !Main.challengeMode || this.game.level >= this.game.numLevels - 1 )
            {
                this.shootBubblesAfter = Main.nowTime + 1000;
                this.shooter.hideTrajectory();
                return true;
            }

            // we've finished everything, stop the World.update
            return false;
        }
        else    // the level was not beaten..
        {
            // so you lost
            return false;
        }
    }
    else    // we're in the bubble shooting sequence...
    {
        // when we've waited a little while
        if ( Main.nowTime > this.shootBubblesAfter )
        {
            this.shooter.hideTrajectory();
            // shoot any remaining shots for bonus score
            this.shooter.shootRemaining();
            // delay until the next shot
            this.shootBubblesAfter = Main.nowTime + 200;

            // update the counter displays
            var s = Game.shotsLeft.toString();
            if ( this.shotsText.text != s )
            {
                this.shotsText.text = s;
            }
        }

        // keep going until all remaining shots are fired and vanished
        return (Game.shotsLeft > 0 || World.effects.count() > 0 );
    }

    // we haven't finished yet... keep going
    return true;
};


// called from Game when level has ended to determine victory or failure
World.prototype.levelBeaten = function()
{
	if ( !this.playField )
		return true;
    if ( this.playField.invaded() )
        return false;
	return this.playField.won();
};


World.prototype.updateScore = function()
{
    // prevent fractional scores
    Game.score = Math.floor(Game.score);

    // increment visible score until it matches actual score
	if ( Game.score > this.scoreText._visibleScore )
	{
		var d = Game.score - this.scoreText._visibleScore;
		if ( d > 25 )
			d = Math.max( Math.floor(d / 25), 1 );
		this.scoreText._visibleScore += d;
		this.scoreText.text = Utils.formatBigNumber(this.scoreText._visibleScore);
	}
};



//
// private functions
//


World.prototype._createUI = function()
{
    var s, t;

    if ( Main.debug )
        console.log("World._createUI " + (Main.isPortrait ? "portrait":"landscape") + " " + (Main.challengeMode ? "challenge":"saga"));

    // kill any existing items, this function can be called again if user switches orientation dynamically
    if ( this.uiBits )
    {
        for(var i = 0, l = this.uiBits.length; i < l; i++)
            this.uiBits[i].destroy();
    }

    // my responsive system won't work, there are too many differences in the basic layouts
    // instead, branch portrait/landscape and then use responsive for different aspect ratios
    this.uiBits = [];
    if ( Main.isPortrait )
    {
        this._portraitLayout();
    }
    else
    {
        this._landscapeLayout();
    }

    this.showStars();

    // the shot launcher base
    this.launcherMeter = new Sprite();
    this.launcherMeter.create( Main.backgroundLayer, SpriteData.LAUNCHER_METER.type, this.managers.textures, 0, Game.launcherY, true );
    this.launcherMeter.anchor.set( 0.5, 1.0 );
    this.launcherMeter.scale.set( 1 );
    this.uiBits.push(this.launcherMeter);

    this.launcherBeam = new Sprite();
    this.launcherBeam.create( Main.backgroundLayer, "beam.png", this.managers.textures, 0, Game.launcherY, true, true );
    this.launcherBeam.anchor.set( 0.5, 1.0 );
    this.launcherBeam.scale.set( 1 );
    this.launcherBeam.alpha = 0.1;
    this.uiBits.push(this.launcherBeam);

    this.launcherRing = new Sprite();
    this.launcherRing.create( Main.backgroundLayer, "indicator.png", this.managers.textures, 0, Game.launcherY, true );
    this.launcherRing.anchor.set( 0.5, 1.0 );
    this.launcherRing.scale.set( 1 );
    this.launcherRing.alpha = 0.1;
    this.uiBits.push(this.launcherRing);

    this.launcherButton = new Sprite();
    this.launcherButton.create( Main.backgroundLayer, "button_swap.png", this.managers.textures, 0, Game.launcherY, true );
    this.launcherButton.anchor.set( 0.5, 1.0 );
    this.launcherButton.scale.set( 1 );
    this.uiBits.push(this.launcherButton);

    // the boost charge bar
    this.launcherBar = new Sprite();
    this.launcherBar.create( this.launcherMeter, "meterFull.png", this.managers.textures, 0.0, 0.0, true );
    this.launcherBar.anchor.set( 0.5, 1.0 );
    this.launcherBar.scale.set( 1.0 / this.launcherMeter.scale.x, 1.0 / this.launcherMeter.scale.y );
    this.uiBits.push(this.launcherBar);

    this.launcherMask = new PIXI.Graphics();
    this.launcherMask.x = -50;
    this.launcherMask.y = -150;
    this.launcherMask.rotation = 2.1;
    this.launcherMask.beginFill(0xff0000, 0.3);
    this.launcherMask.drawRect(0,-220,-300,450);
    this.launcherMask.endFill();
    this.uiBits.push(this.launcherMask);

    this.launcherBar.addChild(this.launcherMask);
    this.launcherBar.mask = this.launcherMask;

    // number of shots left displayed on base
    t = new Text( "", Main.textStyleUIScoreAndShots );
    t.create( this.launcherMeter, 0, -0.44, true );
    t.anchor.set( 0.5 );
    t.scale.set( 1.0 );
    this.shotsText = t;
    this.uiBits.push(t);

    // add the boost type icon
    s = new Sprite();
    s.create( this.launcherMeter, Game.boostType, this.managers.textures, Game.boostImageOffsetX, Game.boostImageOffsetY, false );
    s.setAnimation( "boost" );
    s.anchor.set( 0.5 );
    s.scale.set( Game.queuePositionScale );
    this.boostIcon = s;
    if ( this.playField.introScroll )
    {
        // start level with the boostIcon hidden, PlayField will reveal it after scroll-back
        this.boostIcon.visible = false;
    }
    this.uiBits.push(s);
};


World.prototype._createStarBar = function( backing )
{
    var s;

    s = new Sprite();
    s.create( backing, "hud_meterEmpty.png", this.managers.textures, 0.5, 0.0, true);
    s.anchor.set( 0.5 );
    s.scale.set( 1.0 );
    this.uiBits.push(s);

    s = new Sprite();
    s.create( backing, "hud_meterFull.png", this.managers.textures, 0.5, 0.0, true);
    s.anchor.set( 0.5 );
    s.scale.set( 1.0 );
    this.uiBits.push(s);

    // add mask to hud meter
    var m = new PIXI.Graphics();
    m.x = 0;
    m.y = 0;
    m.beginFill(0xff0000, 0.3);
    m.drawRect(-680,-50,500,100);
    m.endFill();
    this.uiBits.push(m);
    s.addChild(m);
    s.mask = m;
    //s.addChild(m);      // debug, view the mask (comment out the two lines above)
    this.starMask = m;

    s = new Sprite();
    s.create( backing, "hud_stargrey.png", this.managers.textures, 0.5 - 0.043, 0.175, true);
    s.anchor.set( 0.5 );
    s.scale.set( 0.6 );
    this.uiBits.push(s);

    s = new Sprite();
    s.create( backing, "hud_stargrey.png", this.managers.textures, 0.5 + 0.180, 0.09, true);
    s.anchor.set( 0.5 );
    s.scale.set( 0.8 );
    this.uiBits.push(s);

    s = new Sprite();
    s.create( backing, "hud_stargrey.png", this.managers.textures, 0.5 + 0.410, -0.06, true);
    s.anchor.set( 0.5 );
    s.scale.set( 1.0 );
    this.uiBits.push(s);

    s = new Sprite();
    s.create( backing, "hud_star.png", this.managers.textures, 0.5 - 0.043, 0.175, true);
    s.anchor.set( 0.5 );
    s.scale.set( 0.6 );
    this.uiBits.push(s);
    this.star1 = s;
    this.star1.visible = false;

    s = new Sprite();
    s.create( backing, "hud_star.png", this.managers.textures, 0.5 + 0.180, 0.09, true);
    s.anchor.set( 0.5 );
    s.scale.set( 0.8 );
    this.uiBits.push(s);
    this.star2 = s;
    this.star2.visible = false;

    s = new Sprite();
    s.create( backing, "hud_star.png", this.managers.textures,  0.5 + 0.410, -0.06, true);
    s.anchor.set( 0.5 );
    s.scale.set( 1.0 );
    this.uiBits.push(s);
    this.star3 = s;
    this.star3.visible = false;
};


World.prototype._portraitLayout = function()
{
    var b, s, t;

    // adjust scale of UI components based on screen width (pixels) only
    var scale = (Main.width / 640 * 0.50);

    // settings button
    b = new Button( Button.TYPE_NOLATCH );
    b.create( Main.bottomUI, "button_settings.png", this.managers, 0.45, -0.01, true,
                    "button_settings.png", "button_settings.png", "button_settings.png", "click_pause_event" );
    b.anchor.set( 0.5, 1.0 );
    b.scale.set( scale / Main.bottomUI.scale.x, scale / Main.bottomUI.scale.y );
    b.sfx = "snd_click";
    b.sfxHover = "snd_rollOver";
    this.uiBits.push(b);

    // hud bits
    s = new Sprite();
    s.create( Main.topUI, "hud_backing.png", this.managers.textures, -0.470 , (0.04 + 0.005) , true);
    s.anchor.set( 0.0, 0.5 );
    s.scale.set( scale / Main.topUI.scale.x, scale / Main.topUI.scale.y );
    var backing = s;
    this.uiBits.push(s);

    // add the star bar stuff in Saga Mode
    if ( !Main.challengeMode )
        this._createStarBar( backing );

    s = new Sprite();
    s.create( Main.topUI, "hud_lvl.png", this.managers.textures, -0.470 , (0.04 + 0.005) , true);
    s.anchor.set( 0.0, 0.5 );
    s.scale.set( scale / Main.topUI.scale.x, scale / Main.topUI.scale.y );
    this.uiBits.push(s);

    // level value
    t = new Text( Utils.padToLength((this.game.level + 1).toString(), 3, "0"), Main.textStyleUILevelNumber );
    t.create( backing, 0.020, 0.45, true);
    t.anchor.set( 0.0, 1.0 );
    //t.scale.set( scale / Main.topUI.scale.x , scale / Main.topUI.scale.y );
    this.uiBits.push(t);

    // score value
    t = new Text( Utils.formatBigNumber(Game.score), Main.textStyleUIScoreAndShots );
    if ( Main.challengeMode )
    {
        t.create( backing, 0.220, 0.30, true );
    }
    else
    {
        t.create( backing, 0.220, 0.01, true );
    }
    t.anchor.set( 0.0, 1.0 );
    //t.scale.set( scale / Main.topUI.scale.x , scale / Main.topUI.scale.y );
    this.scoreText = t;
    this.scoreText._visibleScore = Game.score;
    this.uiBits.push(t);


    // fish to collect
    if ( Game.levelType == LevelType.GOAL_RESCUE_FISH )
    {
        s = new Sprite();
        s.create( Main.bottomUI, "goal_backing.png", this.managers.textures, -0.49, -0.01, true );
        s.anchor.set( 0.0, 1.0 );
        s.scale.set( 1.0 * scale / Main.bottomUI.scale.x , 1.0 * scale / Main.bottomUI.scale.y );
        s.visible = false;
        this.fishWidget = s;
        this.uiBits.push(s);

        s = new Sprite();
        s.create( this.fishWidget, "goal_fishIcon.png", this.managers.textures, 0.44, -0.5, true );
        s.anchor.set( 0.5 );
        s.scale.set( 1.0 );
        this.fishIcon = s;
        this.uiBits.push(s);

        t = new Text( "", Main.textStyleUIScoreAndShots );
        t.create( this.fishWidget, -0.05 + 0.53, -0.45, true );
        t.anchor.set( 0.0, 0.5 );
        t.scale.set( 0.8 );
        this.fishText = t;
        this.uiBits.push(t);
    }
};


World.prototype._landscapeLayout = function()
{
    var b, s, t;

    // adjust scale of UI components based on screen height (pixels) only.. vertical separation is most important
    var scale = (Main.height / 640 * 0.48);
    var backingScale = 0.9;

    // settings button
    b = new Button( Button.TYPE_NOLATCH );
    b.create( Main.topUI, "button_settings.png", this.managers, -0.185, 0.94, true,
                    "button_settings.png", "button_settings.png", "button_settings.png", "click_pause_event" );
    b.anchor.set( 0.5 );
    b.scale.set( scale / Main.topUI.scale.x, scale / Main.topUI.scale.y );
    b.sfx = "snd_click";
    b.sfxHover = "snd_rollOver";
    this.uiBits.push(b);

    // hud bits
    s = new Sprite();
    s.create( Main.topUI, "hud_backing.png", this.managers.textures, -0.488, (0.04 + 0.015) , true);
    s.anchor.set( 0.0, 0.5 );
    s.scale.set( backingScale * scale / Main.topUI.scale.x, backingScale * scale / Main.topUI.scale.y );
    var backing = s;
    this.uiBits.push(s);

    // add the star bar stuff in Saga Mode
    if ( !Main.challengeMode )
        this._createStarBar( backing );

    s = new Sprite();
    s.create( backing, "hud_lvl.png", this.managers.textures, 0.0, 0.01, true);
    s.anchor.set( 0.0, 0.5 );
    this.uiBits.push(s);

    // level value
    t = new Text( Utils.padToLength((this.game.level + 1).toString(), 3, "0"), Main.textStyleUILevelNumber );
    t.create( backing, 0.020, 0.45, true);
    t.anchor.set( 0.0, 1.0 );
    //t.scale.set( scale / Main.topUI.scale.x , scale / Main.topUI.scale.y );
    this.uiBits.push(t);

    // score value
    t = new Text( Utils.formatBigNumber(Game.score), Main.textStyleUIScoreAndShots );
    if ( Main.challengeMode )
    {
        t.create( backing, 0.220, 0.30, true );
    }
    else
    {
        t.create( backing, 0.220, 0.01, true );
    }
    t.anchor.set( 0.0, 1.0 );
    //t.scale.set( scale / Main.topUI.scale.x , scale / Main.topUI.scale.y );
    this.scoreText = t;
    this.scoreText._visibleScore = Game.score;
    this.uiBits.push(t);

    // fish to collect
    if ( Game.levelType == LevelType.GOAL_RESCUE_FISH )
    {
        s = new Sprite();
        s.create( Main.bottomUI, "goal_backing.png", this.managers.textures, -0.49, -0.01, true );
        s.anchor.set( 0.0, 1.0 );
        s.scale.set( 1.0 * scale / Main.bottomUI.scale.x , 1.0 * scale / Main.bottomUI.scale.y );
        s.visible = false;
        this.fishWidget = s;
        this.uiBits.push(s);

        s = new Sprite();
        s.create( this.fishWidget, "goal_fishIcon.png", this.managers.textures, 0.44, -0.5, true );
        s.anchor.set( 0.5 );
        s.scale.set( 1.0 );
        this.fishIcon = s;
        this.uiBits.push(s);

        t = new Text( "", Main.textStyleUIScoreAndShots );
        t.create( this.fishWidget, -0.05 + 0.53, -0.45, true );
        t.anchor.set( 0.0, 0.5 );
        t.scale.set( 0.8 );
        this.fishText = t;
        this.uiBits.push(t);
    }
};


// _visible undefined = we just want to set the position and not change the visibility state
World.prototype.showBoost = function( _visible )
{
    if ( this.boostIcon && this.boostIcon.parent )
    {
        if ( _visible !== undefined )
            this.boostIcon.visible = _visible;
        this.boostIcon.x = Game.boostImageOffsetX;
        this.boostIcon.y = Game.boostImageOffsetY;
    }
};


World.prototype._movesUpdate = function()
{
    var s;

    s = Game.shotsLeft.toString();
    if ( this.shotsText.text != s )
    {
        this.shotsText.text = s;
    }

    // flash display if nearly out of shots
    if ( Game.shotsLeft < 4 && Main.nowTime % 1000 < 500 )
    {
        if ( this.shotsText.tint != 0xff0000 )
        {
            // red tint alarm colour
            this.shotsText.tint = 0xff0000;
        }
    }
    else if ( this.shotsText.tint != 0xffffff )
    {
        // always revert to white otherwise
        this.shotsText.tint = 0xffffff;
    }

    if ( this.game.foodTotal >= this.game.foodCount )
    {
        s = (this.game.foodTotal - this.game.foodCount).toString() + "/" + this.game.foodTotal.toString();
        if ( this.fishText && this.fishText.text != s )
        {
            this.fishWidget.visible = true;
            this.fishText.text = s;
        }
    }

};


World.prototype._levelTypeUpdate = function()
{
    // skip this while the intro scroll is still running
    if (!this.playField || !this.playField.introScroll)
    {
        switch( Game.levelType )
        {
            case LevelType.GOAL_PROTECT_BARRIER:
                if ( this.playField )
                {
                    // disable auto-centering on playfield
                    this.playField.scrollBackAllowed = false;
                    this.playField.scrollDownAllowed = false;

                    // don't scroll while a fairy is buzzing around
                    if ( !this.playField.isFairyFlying() )
                    {
                        // auto-scroll position on a timer
                        // NOTE: levelData won't have scroll_speed for Challenge Mode levels
                        var spd = this.levelData.scroll_speed;
                        if ( spd === undefined || Number.isNaN(spd) )
                            spd = Game.survivalSpeed;
                        this.playField.autoScroll( spd * Main.elapsedTime / 1000 );
                    }
                }
                break;

            case LevelType.GOAL_BREAK_EGG:
                break;

            case LevelType.GOAL_RESCUE_FISH:
                break;
        }
    }
};


World.prototype._background = function()
{
};


World.prototype._awardBoost = function()
{
    this.managers.audio.play( "snd_booster_award" );

    var point;
    if ( Game.boostType == SpriteData.DRAGON_BLUE.type)
    {
        // make a fairy booster fly across the screen
        // and zap three bubbles on the way
        // turning them all into 'special' bubble types
        // pause shooting while this continues (PlayField.readyToFire)
        point = new PIXI.Point(0,0);
        point = this.boostIcon.toGlobal(point);
        point = Main.gameUILayer.toLocal(point);
        World.effects.add( Effects.DRAGON_BLUE, Main.gameUILayer, point.x, point.y, this.playField.fairyBoostFly, this.playField );
    }
    else if ( Game.boostType == SpriteData.PLUS5.type )
    {
        // add +5 onto the number of shots available for this level
        point = new PIXI.Point(0,0);
        point = this.boostIcon.toGlobal(point);
        point = Main.gameUILayer.toLocal(point);
        World.effects.add( Effects.BOOST_BONUS5, Main.gameUILayer, point.x, point.y, this.playField.bonus5BoostFly, this.playField );
    }
    else
    {
        // special effect to show that a boost has been earned
        point = new PIXI.Point(0,0);
        point = this.boostIcon.toGlobal(point);
        point = Main.gameUILayer.toLocal(point);
        this.shooter.addBoostToQueue( Game.boostType, point );
        // hide the boost icon until this queued boost is fired
        // (Shooter will call showBoost again afterwards)
        this.showBoost( false );
    }
};



World.prototype._userInterface = function()
{
	Keys.update();

    // set the meter bar level by rotating the mask between 4.75 (minimum) and 2 (maximum charge)
    var r = (Game.boostCharge / Game.boostFullBar) * (5.0 - 2.1) + 2.1; //(2.0 - 4.75) + 4.75;
    this.launcherMask.rotation = (this.launcherMask.rotation * 7 + r) / 8;

    // launcher beam pulses
    this.launcherBeam.alpha = Math.max(Math.abs((Game.frameCount % 200) - 100) / 100, 0.5);

    // stars scaling effect in Saga Mode only
    var target = 0;
    if ( !Main.challengeMode )
    {
        // bizarre scaling system: 1 star = 50%, 2 stars = 75%, 3 stars = 100%
        // energy bar has uneven spacing for each star position and it doesn't line
        // up with the given percentages.  Hence this mess.
        var X1 = 0, X2 = 145, X3 = 288, X4 = 490;
        var d;
        if ( Game.starsPcnt >= Game.starBarThirdStar )
        {
            // when star3 is lit the gauge must be full
            target = X4;
        }
        else if ( Game.starsPcnt >= Game.starBarSecondStar )
        {
            // star2 lights up from X3 to X4
            d = X4 - X3;
            target = X3 + d * (Game.starsPcnt - Game.starBarSecondStar) * 4 / 100;
        }
        else if ( Game.starsPcnt >= Game.starBarFirstStar )
        {
            // star1 lights up from X2 to X3
            d = X3 - X2;
            target = X2 + d * (Game.starsPcnt - Game.starBarFirstStar) * 4 / 100;
        }
        else
        {
            // no stars lit, from 0..50% gauge moves from X1 to X2
            d = X2 - X1;
            target = X1 + d * (Game.starsPcnt - 0) * 2 / 100;
        }

        // lerp towards target
        this.starMask.x = (this.starMask.x * 19 + target) / 20;

        if ( this.star1.visible && this.star1.scale.x > 0.6 )
        {
            this.star1.scale.set( this.star1.scale.x * 0.95 );
            if ( this.star1.scale.x < 0.6 ) this.star1.scale.set( 0.6 );
        }
        if ( this.star2.visible && this.star2.scale.x > 0.8 )
        {
            this.star2.scale.set( this.star2.scale.x * 0.95 );
            if ( this.star2.scale.x < 0.6 ) this.star2.scale.set( 0.8 );
        }
        if ( this.star3.visible && this.star3.scale.x > 1.0 )
        {
            this.star3.scale.set( this.star3.scale.x * 0.95 );
            if ( this.star3.scale.x < 0.6 ) this.star3.scale.set( 1.0 );
        }
    }

    if ( this.launcherMeter )
    {
        this.launcherMeter.update();
    }

    if ( Game.boostCharge >= Game.boostFullBar )
    {
        if ( Game.boostCanCharge )
        {
            // boost bar will be emptied only when the boost is used
            Game.boostCanCharge = false;
            // costs more to fully charge it next time
            Game.boostFullBar += Game.boostGainCost;
            // cap the boost bar at it's full value
            Game.boostCharge = Game.boostFullBar;

            this._awardBoost();
        }
    }

    // TODO: make sure testKeys is false for release, this lets the 'b' key give you a boost bonus instantly
    if ( Main.testKeys && Keys.edgeDown[ KeyCodes.key_b ] )
    {
        console.log("cheat key b used");
        Keys.edgeDown[ KeyCodes.key_b ] = false;
        this._awardBoost();
    }

    var i, event;
    for(i = 0, l = this.uiBits.length; i < l; i++)
    {
        var ui = this.uiBits[i];
        if ( ui instanceof Button )
        {
            if ( event === null || event === undefined )
                event = ui.update();
        }
        else if ( !(ui instanceof PIXI.Graphics) )
        {
            ui.update();
        }
    }

	switch( event )
	{
		case "click_pause_event":
			// this.usePlayerInput.removeHoverPiece();
			this.game.pauseToggle();
			break;
	}

	this.updateScore();
};


World.prototype._userInput = function()
{
	// ignore all input if the BigMessage is displayed
	if ( this.bm )
		return;

    if ( Main.testKeys )
    {
        // key 'c' toggles the aiming cursor in testKeys mode only
        if ( Keys.edgeDown[KeyCodes.key_c] )
        {
            Keys.edgeDown[KeyCodes.key_c] = false;
            Main.showLockedCursor = !Main.showLockedCursor;
        }
    }

	// TODO: debug only - show screen resolution information
	if ( Main.testKeys && ((Keys.isPressed[ KeyCodes.key_v ]) || (Main.mouseDown && Main.mouseDown.x < 30 && Main.mouseDown.y < 30)) )
	{
		EventHandlers.debugWindowData();
	}
};


World.prototype.getLevelBonus = function()
{
    if ( this.playField.levelBonusValues )
	   return this.playField.levelBonusValues[ this.game.level ];
    return 0;
};


World.prototype.GetTurnCountLocation = function()
{
    var p = this.shotsText.toGlobal({x:0, y:0});
    var l = Main.gameUILayer.toLocal(p);
    return { x: l.x, y: l.y };
};


World.prototype.getLauncherLocation = function( _layer )
{
    var point = new PIXI.Point(0,0);
    point = this.launcherMeter.toGlobal(point);
    var launcherLocation = _layer.toLocal(point);
    launcherLocation.y -= Game.shotOffsetY;
    return launcherLocation;
};


World.prototype.launcherRingReset = function()
{
    this.launcherRing.scale.set( 1.0 );
    this.launcherRing.alpha = 0.0;
};


World.prototype.updateLauncherEffect = function( _time )
{
    if ( this.launcherBeam && this.launcherRing )
    {
        if ( _time < 500 )
        {
            var t = _time / 500;
            this.launcherBeam.alpha = 0.5 + t * 0.5;
            this.launcherRing.alpha = 0.25 + t * 0.5;
            this.launcherRing.scale.set( this.launcherRing.scale.x * 1.015 );
        }
        else
        {
            this.launcherRing.scale.set( this.launcherRing.scale.x * 1.01 );
            if ( this.launcherRing.alpha > 0 )
                this.launcherRing.alpha -= 0.05;
            if ( this.launcherBeam.alpha > 0 )
                this.launcherBeam.alpha -= 0.05;
        }
    }
};


World.prototype.updateStars = function()
{
    var delay = 0;

    if ( Game.stars > 0 && !this.star1.visible )
    {
        this.star1.visible = true;
        this.star1.scale.set( 1.2 );
        this.managers.audio.play("snd_rainbow");
        delay = 0.5;
    }
    if ( Game.stars > 1 && !this.star2.visible )
    {
        this.star2.visible = true;
        this.star2.scale.set( 1.6 );
        this.managers.audio.playDelayed("snd_rainbow", delay);
        delay += 0.5;
    }
    if ( Game.stars > 2 && !this.star3.visible )
    {
        this.star3.visible = true;
        this.star3.scale.set( 2.0 );
        this.managers.audio.playDelayed("snd_rainbow", delay);
    }
};


World.prototype.showStars = function()
{
    if ( Game.stars > 0 && !this.star1.visible )
    {
        this.star1.visible = true;
    }
    if ( Game.stars > 1 && !this.star2.visible )
    {
        this.star2.visible = true;
    }
    if ( Game.stars > 2 && !this.star3.visible )
    {
        this.star3.visible = true;
    }
};
