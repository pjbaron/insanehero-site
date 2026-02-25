//
// Game.js
//
// central controller for all in-game updates and displays
// handles in-game flow (end of level -> advance to next)
//



// global constants
Game.maxRowsHigh = 12;      // max rows visible on screen
Game.width = 12;
Game.height = 200;          //90 // max dimensions of play grid
Game.bubbleRadius = 86 / 2;                     // size of bubble source art in pixels
Game.bubbleDiameter = Game.bubbleRadius * 2;

Game.scrollSpeed = 176;     // pixels per second
Game.shotSpeed = 2000.0;    // formerly 1100.0
Game.shotStep = 2;          // formerly 3
Game.trajectoryLength = 25; // formerly 42  // in 'move turns' (spacing is three moves per dot)
Game.mapTop = [ -180, -Game.bubbleDiameter * 5, -Game.bubbleDiameter * 5 ];     // indexed by Game.levelType
Game.gameUILayerTop = -615; // convert a bubble to a gameUI location, what is the highest it can be seen on the visible screen...
Game.scrollLineY = [ -Game.bubbleRadius * 14, -Game.bubbleRadius * 10, -Game.bubbleRadius * 10 ];              // indexed by Game.levelType
Game.goalStrings = ["string_level_goal_protect","string_level_goal_crack_egg","string_level_goal_collect"];    // indexed by Game.levelType
Game.goalFailStrings = ["string_level_goal_protect_fail","string_level_goal_crack_egg_fail","string_level_goal_collect_fail"];    // indexed by Game.levelType
Game.goalIcons = ["barrier_objective.png","egg_objective.png","fish_objective.png"];    // indexed by Game.levelType
Game.barrierOffsetY = -Game.bubbleDiameter * 2.0;           // offset of barrier from the launcher position
Game.bubbleInvasionY = -Game.bubbleDiameter * 1.25;         // y location of the barrier top offset from the launcher position
Game.bubbleInvasionUrgent = -Game.bubbleDiameter * 2.5;
Game.bubbleInvasionWarning = -Game.bubbleDiameter * 3.5;
Game.killAtBottom = Game.bubbleDiameter * 6;
Game.aimAngleLimit = 75.0;                          // degrees from vertical
Game.shooterRadius = Game.bubbleDiameter * 1.7;
Game.launcherY = 0.5;   //Game.bubbleRadius * 15;
Game.shotOffsetY = Game.bubbleDiameter * 3.5;
Game.queuePositionX1 = Game.bubbleDiameter * 2.12;
Game.queuePositionY1 = Game.bubbleDiameter * 2;
Game.queuePositionScale = 0.85;
Game.bubbleRub = 10;
Game.bubbleCollisionRadius = Game.bubbleRadius - Game.bubbleRub;
Game.sideBarOffset = Game.width / 2 * Game.bubbleDiameter;
Game.gridOffsetX = (Game.width - 1) * Game.bubbleRadius;
Game.gridOffsetY = 159;
Game.survivalSpeed = 11.0;          // pixels per second
Game.chainReactionDelay = 250;
Game.pulseScaler = 0.75;            // scaling factor, larger = bigger pulse wave displacement
Game.pulseDecay = 0.82;             // decay factor, larger = more elastic (0.87 was too much)
Game.fireBallDeceleration = 0.83;
Game.bonusShootDelay = 100;         // delay in ms between shots for the bonus sequence
Game.bonusShootSpeed = 20;          // speed of the shots for the bonus sequence
// boost charge constants
Game.popBoost = 1;
Game.catchUpBoost = 2;
Game.dropBubbleBoost = 10;
Game.boostImageOffsetX = Game.bubbleDiameter * -2.17;       // offset from launcher to the boost type icon
Game.boostImageOffsetY = -Game.bubbleDiameter * 2.6;         // offset from launcher to the boost type icon
// score award constants
Game.scoreFirstPop = 100;
Game.scoreMultiplyPop = 10;
Game.scoreFirstDrop = 20;
Game.scoreSpecialBadDrop = 10;
Game.scoreSpecialGoodDrop = 30;
//Game.scoreNormalBonus = 250;
//Game.scoreSpecialBonus = 500;
Game.scoreCatchUp = 5;
//Game.shooterPositionY = 170;
Game.bonusScoreFinale = 150;
Game.bonusScoreFinale_Extras = 30;
Game.defaultBoostFullBar = 100;
Game.defaultBoostGainCost = 20;
Game.starBarFirstStar = 50;
Game.starBarSecondStar = 75;
Game.starBarThirdStar = 100;



// global variables
Game.frameCount = 0;
Game.paused = false;
Game.boostFullBar = Game.defaultBoostFullBar;
Game.boostGainCost = Game.defaultBoostGainCost;
Game.boostCharge = 0;
Game.boostCanCharge = true;
Game.boostType = -1;
Game.requestQuit = false;
Game.starScore = 0;
Game.starsPcnt = 0;
Game.stars = 0;
Game.score = 0;
Game.lastScore = 0;
Game.highScore = 0;
//Game.timeLeft = 0;
if ( Main.debug )
    console.log("Game() instanciation resetting shotsLeft");
Game.shotsLeft = 0;
Game.options = null;
Game.levelType = 0;
Game.popCount = 0;      // number of Bubbles popped since the last shot was fired (used for score multiplier)


// game states
Game.LEVEL_START = 1;
Game.LEVEL_INTRO = 2;
Game.PLAYING = 3;
Game.WON_LEVEL = 4;
Game.LOST_LEVEL = 5;
Game.FINAL_MESSAGE = 6;
Game.NEXT_LEVEL = 7;
Game.GAME_WON = 8;
Game.WAIT_DELAY = 9;
Game.REMOVE_MSG_QUIT = 10;
Game.QUIT_REQUEST = 11;



// level type definitions
LevelType = {};
LevelType.ConvertNames = null;
LevelType.GOAL_PROTECT_BARRIER = 0;
LevelType.GOAL_BREAK_EGG = 1;
LevelType.GOAL_RESCUE_FISH = 2;






function Game()
{
	this.world = null;
	this.managers = null;
	this.level = 0;
	this.numLevels = 0;
	this.help = null;
    this.menu = null;
	this.confirm = null;
	this.bm = null;
    this.lastState = -1;
    this.state = Game.LEVEL_START;
	this.nextState = -1;
	this.delay = 0;
    this.foodTotal = 0;
    this.foodCount = 0;
    this.droppedLastFish = false;

	Game.paused = false;
    Game.requestQuit = false;
    Game.requestQuitHandled = false;
	//Game.timeLeft = 0;
    if ( Main.debug )
        console.log("new Game() resetting shotsLeft to zero");
    Game.shotsLeft = 0;
    Game.starScore = 0;
    Game.starsPcnt = 0;
    Game.stars = 0;
	Game.score = 0;
    Game.lastScore = 0;
    Game.levelType = LevelType.GOAL_PROTECT_BARRIER;

    LevelType.ConvertNames = [];
    LevelType.ConvertNames["level_protect_barrier"] = LevelType.GOAL_PROTECT_BARRIER;
    LevelType.ConvertNames["level_collect_fish"] = LevelType.GOAL_RESCUE_FISH;
    LevelType.ConvertNames["level_hatch_egg"] = LevelType.GOAL_BREAK_EGG;

	// don't reset Game.highScore here, it must carry through multiple games
	Game.options = null;
}


Game.prototype.create = function( _managers, _level, _numLevels )
{
	this.managers = _managers;
	this.numLevels = _numLevels;

    // fade in from nearly invisible
    Main.bubbleLayer.alpha = 0.01;

	Game.paused = false;
    Game.requestQuit = false;
    Game.requestQuitHandled = false;
    Game.starScore = 0;
    Game.starsPcnt = 0;
    Game.stars = 0;
    Game.score = 0;
    Game.lastScore = 0;

    if ( Main.debug )
        console.log("Game.create resetting shotsLeft");

    Game.shotsLeft = Main.totalShots;

	// don't reset Game.highScore here, it must carry through multiple games
	this.level = _level - 1;
	this.help = null;
    this.menu = null;
	this.confirm = null;
	this.bm = null;

    this.lastState = -1;
    this.state = Game.LEVEL_START;
	this.nextState = -1;

	this.delay = 0;
    this.foodCount = 0;
    this.foodTotal = 0;
    this.droppedLastFish = false;
    
	/*ARK_game_arena_connector.registerAction("pause", Game.pauseGame.bind(this));
	ARK_game_arena_connector.registerAction("resume", Game.resumeGame.bind(this));*/
    Main.arenaHelper.addPauseAndResumeActions(Game.pauseGame.bind(this),Game.resumeGame.bind(this));

	_gameGATracker("send", "pageview", {"page":"/GameScene"});
};


Game.prototype.destroy = function()
{
	if ( this.bm )
	{
		this.bm.destroy();
		this.bm = null;
	}

	if ( this.world )
	{
		this.world.destroy();
		this.world = null;
	}

	if ( this.help )
	{
		this.help.destroy();
		this.help = null;
	}

    if ( this.menu )
    {
        this.menu.destroy();
        this.menu = null;
    }

	if ( this.confirm )
	{
		this.confirm.destroy();
		this.confirm = null;
	}

	if ( Game.options )
	{
		Game.options.destroy();
		Game.options = null;
	}
	
	this.managers = null;
};


Game.prototype.update = function()
{
	var ret = true;
    var _this = this;

	Game.frameCount++;

	// update confirmation panel
	if ( this.confirm )
	{
		if ( this.confirm.update() )
		{
			return ret;
		}
		this.confirm.destroy();
		this.confirm = null;
	}

	// update help panel
	if ( this.help )
	{
		if ( this.help.update() )
		{
			// exit if it's still blocking
			return ret;
		}
		this.help.remove( function() { _this.help = null; } );
	}

	// handle options if paused
	if ( Game.paused )
	{
		if ( Game.options )
		{
			if ( Game.options.update() )
				return ret;
			Game.options.remove( Game.optionsDestroyed );
			return ret;
		}
	}

    if ( Game.requestQuit && !Game.requestQuitHandled )
    {
        // user selected Quit from game options
        this.state = Game.QUIT_REQUEST;

        // The Game.requestQuit flag is used by GameControl to detect when the game
        // quits from player using the Help|Options|Quit button... we can't reset it
        // here because that will lock the state to QUIT_REQUEST, hence this ugly
        // latch flag.
        Game.requestQuitHandled = true;
    }

	if ( Main.bubbleLayer.alpha < 1.0 )
    {
		Main.bubbleLayer.alpha = Math.min(Main.bubbleLayer.alpha + 0.05, 1.0);
        Main.backgroundLayer.alpha = Main.gameUILayer.alpha = Main.bubbleLayer.alpha;
    }

	var again, newState;
	do {

		// if the state has changed since last call, set the newState flag
		newState = ( this.lastState != this.state );
		this.lastState = this.state;

        again = false;
		switch( this.state )
		{
            case Game.LEVEL_START:
                if ( newState || (this.world && !this.world.game))
                {
                    this.managers.audio.startTune( "game_tune", false );

                    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                    _gameGATracker("send", "event", Main.VERSION, "start_level_" + (this.level + 1), "BUBB_HTML5", 0);

                    // reset variables for each level
                    Game.boostCharge = 0;
                    Game.boostCanCharge = true;
                    
                    // reset the number of stars won in this level so far
                    Game.stars = 0;
                    Game.starsPcnt = 0;

                    // create game world
                    this.world = new World( this );
                    this.world.create( this.managers, this.level );

                    // fade in from nearly invisible
                    Main.bubbleLayer.alpha = 0.01;

                    if ( !Main.challengeMode )
                    {
                        // in Saga Mode the score starts at zero for each level
                        Game.score = 0;

                        //
                        // what score is required to earn 3 stars
                        //

                        var ld = this.world.levelData;
                        var bubbles = ld.height * 11.5 - ld.holes.number;

                        // calculate starScore using information about the level we created in this.world.create
                        // number of bubbles divided by the size of 'groups' of bubbles
                        // plus the number of colours because more colours = more small groups
                        // raised to a power as a scaling factor to account for non-linear (exponential) scoring
                        // multiplied by a constant for a linear scaling factor
                        Game.starScore = Math.pow( bubbles / (10 + ld.list.length), 1.5 ) * 500.0 +
                            (ld.boost.id == "boost_mine" ? 2000 : 0) +              // bursts lots of bubbles for multipliers
                            (ld.boost.id == "boost_fireball" ? 2000 : 0) +          // bursts lots of bubbles for multipliers
                            (ld.boost.id == "boost_wild" ? 2000 : 0) +              // can burst multiple colours for bigger multipliers
                            (ld._id == "level_collect_fish" ? -2000 : 0) +          // usually end before all bubbles are popped
                            (ld._id == "level_protect_barrier" ? -2000 : 0);        // less time to aim carefully to make big groups

                        // universal simple scaling factor for how hard it is to get 3 stars.  At 1.0 it is impossible on some levels.
                        Game.starScore *= 0.60;

                        if ( Main.debug )
                            console.log("**** star score = " + Game.starScore + " **** bubbles = " + bubbles);
                    }
                    
                    // remember the score at the start of this level to determine the score gain whilst playing it
                    Game.lastScore = Game.score;
                }

                if ( Main.bgImage.alpha < 1.0 )
                {
                    Main.bgImage.alpha += 0.1;
                }

                // wait for level to be shown properly before switching to PLAYING state
                this.world.update();
                if ( this.world.levelShown() )
                {
                    this.state = Game.LEVEL_INTRO;
                }
                break;

            case Game.LEVEL_INTRO:
                if ( newState )
                {
                    this.foodTotal = this.foodCount;
                    this.droppedLastFish = false;
                    var goalIcon = Game.goalIcons[Game.levelType];
                    this.bm = new BigMessage();
                    // _parent, _managers, _message, _callback, _context, _title
                    this.bm.createObjective( Main.fullUI, this.managers, Game.goalStrings[Game.levelType], "string_level_goal_title", goalIcon );
                    this.bm.timeOut = 3000;
                }

                if ( this.bm )
                {
                    if ( Main.click || Keys.isPressed[32] )
                    {
                        Main.click = null;
                        Keys.reset();
                        this.bm.remove( this, "bm" );
                    }

                    // next state when the big message closes and kills itself
                    if ( !this.bm.update() )
                    {
                        this.bm.destroy();
                        this.bm = null;
                    }
                }
                else
                {
                    this.state = Game.PLAYING;
                }
                break;

			case Game.PLAYING:
				if ( newState )
				{
                    // reset the idle timer at the start of each level
                    Main.idleTimer = Main.eventChangeAdOnIdle;
				}

				// update game world
				if ( !this.world.update() )
				{
                    // disable trajectory on level completed
                    this.world.shooter.hideTrajectory();

					// check if we won or failed
					if ( this.world.levelBeaten() )
					{
                        if ( Main.debug )
                            console.log("level won");
						// we finished a level
                        _gameGATracker("send", "pageview", {"page":"/LevelCompletePopup"});
						this.state = Game.WON_LEVEL;
					}
                    else
                    {
                        // we lost
                        if ( Main.debug )
                            console.log("level lost");
                        this.state = Game.LOST_LEVEL;
                    }
				}
                else
                {
                    // game is continuing...
                    if ( Main.eventChangeAdOnIdle !== 0 )
                    {
                        Main.idleTimer -= Main.elapsedTime;
                        if ( Main.idleTimer < 0 )
                        {
                            Main.arenaHelper.sendEventChange();
                            Main.idleTimer = Number.MAX_VALUE;
                        }
                    }
                }

                // calculate how many stars the player has earned so far
                if ( this.calculateStars() )
                    this.world.updateStars();
				break;

			case Game.WON_LEVEL:
				// show "Good Job!  Bonus +1000" message
				if ( newState )
				{
                    this.managers.audio.startTune( "game_win_tune", true );

                    // only in Saga Mode...
                    if ( !Main.challengeMode )
                    {
                        // shouldn't be required but make sure the level we just played is unlocked
                        Main.unlockLevel( this.level );
                        // unlock the next level (if they have earned at least one star) and record scores and stars earned
                        // https://trello.com/c/95qOHogJ/34-1-to-3-star-level-rating-system
                        if ( Game.stars >= 1 )
                            Main.unlockLevel( this.level + 1 );
                        Main.levelScores[ this.level ] = Math.max(Main.levelScores[ this.level ], Game.score - Game.lastScore);
                        Main.levelStars[ this.level ] = Math.max(Main.levelStars[ this.level ], Game.stars);

                        // reset the losses counter when we beat the level
                        Main.levelLosses[ this.level ] = 0;

                        // save the level data
                        this.managers.loadSave.saveGameStatus();
                    }


                    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                    _gameGATracker("send", "event", Main.VERSION, "win_level_" + (this.level + 1), "BUBB_HTML5", Game.score);

                    var completeString = (this.level + 1).toString();
                    var completeString2 = null;
                    if ( Main.challengeMode )
                    {
                        completeString += " / " + this.numLevels.toString();
                        // don't add "carried over X bubbles" for saga and last level of challenge mode
                        if ( this.level < this.numLevels - 1 )
                            completeString2 = this.managers.locale.get( "string_level_complete_carried1" ) + " " + Game.shotsLeft.toString() + " " + this.managers.locale.get( "string_level_complete_carried2" );
                    }
					this.bm = new BigMessage();
					this.bm.createLevelWon( Main.fullUI, this.managers, this.managers.locale.get( "string_level_complete" ), completeString, completeString2 );
                    if ( Main.fastLevelSwitch )
                        this.bm.timeOut = 1000;
                    else
                        this.bm.timeOut = 3800;

                    if ( Main.debug )
                        console.log("**** final score = " + (Game.score - Game.lastScore) + " ****");
				}

				if ( this.world )
                {
					this.world.updateScore();
                    World.effects.update();
                }
				
				// next state when the big message closes and kills itself
				if ( !this.bm.update() )
				{
					this.state = Game.NEXT_LEVEL;
				}
				break;

			case Game.NEXT_LEVEL:
				// start the next level or end the game if we've finished

                // in Saga Mode you only advance a level if you earn one or more stars in the current level
                // https://trello.com/c/95qOHogJ/34-1-to-3-star-level-rating-system
                if ( Main.challengeMode || Game.stars >= 1 )
                {
                    // next level...
                    this.level++;
                }

				if ( this.level > this.numLevels - 1 )
				{
					// we beat the game!
					this.state = Game.GAME_WON;
					again = true;
					break;
				}

				// destroy the old game world
				this.world.destroy();

				// start the next level playing
				this.state = Game.LEVEL_START;

				// don't wait a frame after destroying world, create the next level instantly
				again = true;
				break;

			case Game.LOST_LEVEL:
                if ( newState )
                {
                    this.managers.audio.startTune( "game_over_tune", true );

                    if ( !Main.challengeMode )
                    {
                        // reset the losses counter when we beat the level
                        if ( Main.levelLosses[ this.level ] === undefined )
                            Main.levelLosses[ this.level ] = 0;
                        Main.levelLosses[ this.level ]++;

                        // save the level data
                        this.managers.loadSave.saveGameStatus();
                    }

                    if ( Game.score > Game.highScore )
                    {
                        Game.highScore = Game.score;
                    }

                    // prepare the end of game message
                    this.bm = new BigMessage();

                    if ( Main.challengeMode )
                        this.bm.createWinLose( Main.fullUI, this.managers, "string_lose", Game.goalFailStrings[Game.levelType], false );
                    else
                        this.bm.createWinLose( Main.fullUI, this.managers, "string_lose", Game.goalFailStrings[Game.levelType], false, true );

                    this.state = Game.FINAL_MESSAGE;
                }
				break;

			case Game.GAME_WON:
                _gameGATracker("send", "event", Main.VERSION, "win_game_timer", "BUBB_HTML5", 0);


				if ( Game.score > Game.highScore )
                {
					Game.highScore = Game.score;
                }

                // prepare the end of game message
                this.bm = new BigMessage();
                this.bm.createWinLose( Main.fullUI, this.managers, "string_win", null, true );

				this.state = Game.FINAL_MESSAGE;
				break;
			
            case Game.QUIT_REQUEST:
                if ( newState )
                {
                    _gameGATracker("send", "event", Main.VERSION, "quit_game_timer", "BUBB_HTML5", Math.round((Main.nowTime - Main.timeStarted) / 1000));
                    _gameGATracker("send", "event", Main.VERSION, "submit_score", "BUBB_HTML5", Game.score);
                    
                    // if ( this.level == this.numLevels - 1 )
                    // {
                        // user quit on last level
                        //_gameGATracker("send", "event", Main.VERSION, "final_level_quit", "BUBB_HTML5", 1);
                    // }

                    if ( Game.score === 0 )
                    {
                        // user quit without scoring
                        _gameGATracker("send", "event", Main.VERSION, "abandon", "BUBB_HTML5", 1);
                    }


                    if ( Game.score > Game.highScore )
                    {
                        Game.highScore = Game.score;
                    }

                    this.bm = new BigMessage();
                    var quitRequestString = this.managers.locale.get( "game_quit_title" ) + "\n\n" +
                                        this.managers.locale.get( "string_score" ) + " " + Utils.formatBigNumber(Game.score) + "\n" +
                                        this.managers.locale.get( "string_high_score" ) + " " + Utils.formatBigNumber(Game.highScore) + "\n";
                    this.bm.create( Main.fullUI, this.managers, quitRequestString );

                    this.state = Game.FINAL_MESSAGE;
                }
                break;

			case Game.FINAL_MESSAGE:
				if ( newState )
				{
                    // if the game was won then the level = this.numLevels already, we don't want to add one for analytics
                    var lvl = Math.min( this.level + 1, this.numLevels );
                    if ( Main.fastLevelSwitch )
                        this.bm.timeOut = 1000;
                    else
                        this.bm.timeOut = 5000;
					_gameGATracker("send", "pageview", {"page":"/GameOverPopup"});
				}

				// display the end of game message with options buttons
				if ( this.world )
				{
					this.world.updateScore();
				}

                var msg = this.bm.update();
				if ( msg === false || msg == "quit" || msg == "retry" )
				{
                    // the BigMessage timed out, destroy it and null the reference
                    this.bm.destroy();
                    this.bm = null;

                    if ( msg == "retry" )
                    {
                        // destroy the game world
                        this.world.destroy();
                        // restart the level
                        this.delay = 1000;
                        this.state = Game.WAIT_DELAY;
                        this.nextState = Game.LEVEL_START;
                        break;
                    }

                    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                    _gameGATracker("send", "event", Main.VERSION, "submit_score", "BUBB_HTML5", Game.score);
					Main.arenaHelper.sendGameEnd(Game.highScore);

                    if ( !Game.requestQuit )
                        this.delay = 4 * 1000;				// pause for four seconds while arena might switch to highscore system
                    else
                        this.delay = 1 * 1000;
                    
                    this.state = Game.WAIT_DELAY;
                    this.nextState = Game.REMOVE_MSG_QUIT;	// then remove message and return to titles
				}
				break;

			case Game.WAIT_DELAY:
				// wait for delay to reach zero, then switch to nextState
				this.delay = Math.max( this.delay - Main.elapsedTime, 0 );
				if ( this.delay === 0 )
				{
					// switch to the preset 'nextState'
					this.state = this.nextState;
					again = true;
				}
				else
				{
					// continue to update animations and fades while we wait
					if ( this.bm )
						this.bm.update();
				}
				break;

			case Game.REMOVE_MSG_QUIT:
				// remove the big message panel (if there is one) then end the game
				if ( newState )
				{
					// start message fly-away tween
					if ( this.bm )
					{
						this.bm.remove( this, "bm" );
					}
				}

                if ( this.bm )
                {
                    if ( !this.bm.update() )
                    {
                        this.bm = null;
                    }
                }
                else
                {
                    // destroy the game world
                    this.world.destroy();
                    // shut-down and return to titles
                    ret = false;
                }
                break;
		}

	} while( again );

	return ret;
};


/// return true if new stars have been awarded
Game.prototype.calculateStars = function()
{
    // stars only apply in Saga Mode
    if ( Main.challengeMode ) return false;

    var s = Game.score - Game.lastScore;
    var pcnt = s * 100 / Game.starScore;
    var ms = Game.stars;
    Game.stars = (pcnt < 50) ? 0 : (pcnt < 75) ? 1 : (pcnt < 100) ? 2 : 3;
    Game.starsPcnt = Math.min(pcnt, 100);
    return (ms != Game.stars);
};


Game.prototype.showHelp = function()
{
    this.help = new Help( this.world.levelData );
    this.help.create( this.managers );
};


Game.prototype.showConfirm = function( _message, _context, _onYes, _onNo )
{
	this.confirm = new Confirm( );
	this.confirm.create( this, this.managers, _message, _context, _onYes, _onNo );
};


Game.prototype.pauseToggle = function()
{
	Game.paused = !Game.paused;

	if ( Main.debug )
    {
		if ( Game.paused )
			console.log("Game.pauseToggle to true");
		else
			console.log("Game.pauseToggle to false");
    }

	if ( Game.paused )
	{
		Game.options = new Options( );
		Game.options.create( this, this.managers );
        _gameGATracker("send", "event", Main.VERSION, "help", "BUBB_HTML5", 1);
	}
	else
	{
		if ( Game.options )
		{
			Game.options.destroy();
			Game.options = null;
		}
	}
};


// callbacks for Arkadium connector pause/resume
Game.pauseGame = function()
{
	if ( Main.debug )
		console.log("Game.pauseGame");
	this.managers.audio.visibilityMute( true );
	Game.paused = true;
	_gameGATracker("send", "pageview", {"page":"/PausePopup"});	
};


Game.resumeGame = function()
{
	if ( Main.debug )
		console.log("Game.resumeGame");
	this.managers.audio.visibilityMute( false );
	Game.paused = (Game.options !== null);
	_gameGATracker("send", "pageview", {"page":"/GameScene"});	
};


Game.optionsDestroyed = function()
{
	Game.options = null;
	Game.paused = false;
};

