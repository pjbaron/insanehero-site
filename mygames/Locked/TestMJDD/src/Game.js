//
// Game.js
//
// central controller for all in-game updates and displays
// handles in-game flow (end of level -> advance to next)
//



// globals
Game.frameCount = 0;
Game.paused = false;
Game.requestQuit = false;
Game.effects = null;		// effects manager
Game.score = 0;
Game.highScore = 0;
Game.timeLeft = 0;
Game.options = null;
Game.levelMatches = 0;

// states
Game.STARTING = 0;
Game.PLAYING = 1;
Game.WON_LEVEL = 2;
Game.FINAL_MESSAGE = 3;
Game.NEXT_LEVEL = 4;
Game.TIME_UP = 5;
Game.NO_MOVES = 6;
Game.GAME_WON = 7;
Game.WAIT_DELAY = 8;
Game.REMOVE_MSG_QUIT = 9;
Game.QUIT_REQUEST = 10;



function Game()
{
	this.world = null;
	this.managers = null;
	this.level = 0;
	this.numLevels = 0;
	this.help = null;
	this.confirm = null;
	this.bm = null;
	this.lastState = -1;
	this.state = Game.STARTING;
	this.nextState = -1;
	this.delay = 0;
    this.won = false;

	Game.paused = false;
    Game.requestQuit = false;
	Game.effects = null;
	Game.timeLeft = 0;
	Game.score = 0;
	// don't reset Game.highScore here, it must carry through multiple games
	Game.options = null;
}


Game.prototype.create = function( _managers, _numLevels )
{
	this.managers = _managers;
	this.numLevels = _numLevels;

	Game.paused = false;
    Game.requestQuit = false;
	Game.score = 0;
    Game.levelMatches = 0;
	// don't reset Game.highScore here, it must carry through multiple games
	Game.timeLeft = Main.timerStart;
	Game.effects = new Effects();
	Game.effects.create( this.managers.textures );

	this.level = 1 - 1;        // zero based level number
	this.help = null;
	this.confirm = null;
	this.bm = null;
	this.state = Game.PLAYING;
	this.nextState = -1;
	this.delay = 0;
    this.won = false;

	/*ARK_game_arena_connector.registerAction("pause", Game.pauseGame.bind(this));
	ARK_game_arena_connector.registerAction("resume", Game.resumeGame.bind(this));*/
    Main.arenaHelper.addPauseAndResumeActions(Game.pauseGame.bind(this),Game.resumeGame.bind(this));

	//_gameGATracker("send", "pageview", {"page":"/GameScene"});

	this.managers.audio.play( "snd_startSting" );
	if ( Main.showHelp )
	{
		// show help at game start, use the "Play" button
		this.showHelp( true );
	}
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

	if ( this.confirm )
	{
		this.confirm.destroy();
		this.confirm = null;
	}

	if ( Game.effects )
	{
		Game.effects.destroy();
		Game.effects = null;
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
		var _this = this;
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

    if ( Game.requestQuit )
    {
        // user selected Quit from game options
        Game.requestQuit = false;
        this.state = Game.QUIT_REQUEST;
    }

	// hide puzzle if the game does not have focus
	// if ( GameControl.pageHidden )
	// {
	// 	if ( Main.puzzle.alpha > 0.0 )
	// 		Main.puzzle.alpha -= 0.2;
	// }
	// else
	{
		if ( Main.puzzle.alpha < 1.0 )
			Main.puzzle.alpha += 0.2;
	}

	var again;
	do {
		again = false;

		// if the state has changed since last call, set the newState flag
		var newState = ( this.lastState != this.state );
		this.lastState = this.state;

		switch( this.state )
		{
			case Game.PLAYING:
				if ( newState )
				{
                    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                    _gameGATracker("send", "event", Main.VERSION, "start_level_" + (this.level + 1), "MJDD_HTML5", Math.round(Game.timeLeft / 1000));

					// create game world
					this.world = new World( this );
					this.world.create( this.managers, this.level );
                    Game.levelMatches = 0;

                    // reset the idle timer at the start of each level
                    Main.idleTimer = Main.eventChangeAdOnIdle;
				}

				// update game world
				if ( !this.world.update() )
				{
					// check if we won or failed
					if ( this.world.levelBeaten() )
					{
						// we finished a level
						//_gameGATracker("send", "event", "Level Complete", this.level, Game.score);
						//_gameGATracker("send", "pageview", {"page":"/LevelCompletePopup"});
						this.state = Game.WON_LEVEL;
					}
					else
					{
						// we failed the level, game over...
						if ( this.world.timeUp() )
						{
							// we ran out of time
							this.state = Game.TIME_UP;
						}
						else
						{
							// by deduction: we ran out of moves
							this.state = Game.NO_MOVES;
						}
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
				break;

			case Game.WON_LEVEL:
				// show "Good Job!  Bonus +1000" message
				if ( newState )
				{
					this.managers.audio.play( "snd_endSting" );

					var bonusAmount = this.world.getLevelBonus();
					Game.score += bonusAmount;

                    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                    _gameGATracker("send", "event", Main.VERSION, "win_level_" + Math.min(this.level + 1, this.numLevels), "MJDD_HTML5", Game.score);

					var bonusString = this.managers.locale.get( "gvp_level_good_job_text_string" ) +
										"\n" +
										((bonusAmount > 0) ? ("+" + bonusAmount.toString()) : "");

					this.bm = new BigMessage();
					this.bm.create( Main.fullUI, this.managers, bonusString );
					this.bm.timeOut = 1000;
				}

				if ( this.world )
					this.world.updateScore();
				
				// next state when the big message closes and kills itself
				if ( !this.bm.update() )
				{
					this.state = Game.NEXT_LEVEL;

					// added mid-roll adverts between levels after level 2 if 0 replays left: https://basecamp.com/1944514/projects/13440474/todos/304979554
					if ( this.level === 2 - 1 && Main.repeatedGamesLeft === 0 )
                    {
						if ( Main.playMidRollAd )
						{
                            // ARK_game_arena_connector.fireEventToArena("pause_ready");
							Main.arenaHelper.requestMidroll();
                        }
                    }
				}
				break;

			case Game.NEXT_LEVEL:
				// start the next level or end the game if we've finished
				if ( newState )
				{
					// next level...
					this.level++;
					if ( this.level > this.numLevels - 1 )
					{
						// we beat the game!
						this.state = Game.GAME_WON;
                        this.won = true;
						again = true;
						break;
					}

					// destroy the old game world
					this.world.destroy();

					// start the next level playing
					this.state = Game.PLAYING;

					// don't wait a frame after destroying world, create the next level instantly
					again = true;
				}
				break;

			case Game.TIME_UP:
				// prepare the end of game message
				this.managers.audio.play( "snd_timeUp" );
				this.bm = new BigMessage();
				if ( Game.score > Game.highScore )
					Game.highScore = Game.score;
				var timeupString = this.managers.locale.get( "gvp_level_times_up_text_string" ) + "\n" +
									this.managers.locale.get( "gvp_level_score_indication_text_string" ) + " " + Game.score.toString() + "\n" +
									this.managers.locale.get( "gvp_high_score_indication_text_string" ) + " " + Game.highScore.toString();
				this.bm.create( Main.fullUI, this.managers, timeupString );
				this.world.puzzle.tornadoRemove = true;
                if ( this.level == this.numLevels - 1 )
                {
                    // user lost on last level
                    _gameGATracker("send", "event", Main.VERSION, "final_level_lose", "MJDD_HTML5", 1);
                }

				this.state = Game.FINAL_MESSAGE;
				break;

			case Game.NO_MOVES:
				// prepare the end of game message
				this.managers.audio.play( "snd_error2" );
				this.bm = new BigMessage();
				if ( Game.score > Game.highScore )
					Game.highScore = Game.score;
				var noMovesString = this.managers.locale.get( "gvp_level_no_more_move_text_string" ) + "\n" +
									this.managers.locale.get( "gvp_level_score_indication_text_string" ) + " " + Game.score.toString() + "\n" +
									this.managers.locale.get( "gvp_high_score_indication_text_string" ) + " " + Game.highScore.toString();
				this.bm.create( Main.fullUI, this.managers, noMovesString );
				this.world.puzzle.tornadoRemove = true;
                if ( this.level == this.numLevels - 1 )
                {
                    // user lost on last level
                    _gameGATracker("send", "event", Main.VERSION, "final_level_lose", "MJDD_HTML5", 1);
                }

				this.state = Game.FINAL_MESSAGE;
				break;

			case Game.GAME_WON:

                // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                _gameGATracker("send", "event", Main.VERSION, "win_game_timer", "MJDD_HTML5", Math.round(Game.timeLeft / 1000));

				// prepare the end of game message
				this.bm = new BigMessage();
				if ( Game.score > Game.highScore )
					Game.highScore = Game.score;
				var winString = this.managers.locale.get( "game_over_win_header_string" ) + "\n" +
								this.managers.locale.get( "gvp_level_score_indication_text_string" ) + " " + Game.score.toString() + "\n" +
								this.managers.locale.get( "gvp_high_score_indication_text_string" ) + " " + Game.highScore.toString();
				this.bm.create( Main.fullUI, this.managers, winString );

				this.state = Game.FINAL_MESSAGE;
				break;
			
            case Game.QUIT_REQUEST:
                if ( newState )
                {
                    //_gameGATracker("send", "event", "Quit Game", this.level + 1, Game.score);
                    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                    _gameGATracker("send", "event", Main.VERSION, "quit_game", "MJDD_HTML5", Game.score);
                    _gameGATracker("send", "event", Main.VERSION, "quit_game_timer", "MJDD_HTML5", Math.round((Main.nowTime - Main.timeStarted) / 1000));
                    _gameGATracker("send", "event", Main.VERSION, "submit_score", "MJDD_HTML5", Game.score);
                    
                    if ( this.level == this.numLevels - 1 )
                    {
                        // user quit on last level
                        _gameGATracker("send", "event", Main.VERSION, "final_level_quit", "MJDD_HTML5", 1);
                    }

                    if ( Game.score === 0 )
                    {
                        // user quit without scoring
                        _gameGATracker("send", "event", Main.VERSION, "abandon", "MJDD_HTML5", 1);
                    }

                    this.bm = new BigMessage();
                    if ( Game.score > Game.highScore )
                        Game.highScore = Game.score;
                    var quitRequestString = this.managers.locale.get( "game_over_lose_header_string" ) + "\n" +
                                        this.managers.locale.get( "gvp_level_score_indication_text_string" ) + " " + Game.score.toString() + "\n" +
                                        this.managers.locale.get( "gvp_high_score_indication_text_string" ) + " " + Game.highScore.toString();
                    this.bm.create( Main.fullUI, this.managers, quitRequestString );
                    this.world.puzzle.tornadoRemove = true;

                    this.state = Game.FINAL_MESSAGE;
                }
                break;

			case Game.FINAL_MESSAGE:
				if ( newState )
				{
                    // if the game was won then the level = this.numLevels already, we don't want to add one for analytics
                    var lvl = Math.min( this.level + 1, this.numLevels );
                    this.bm.timeOut = 5000;
                    if ( this.won )
                        _gameGATracker("send", "event", "Game Complete", lvl, Game.score);
                    else
                        _gameGATracker("send", "event", "Game Over", lvl, Game.score);
					//_gameGATracker("send", "pageview", {"page":"/GameOverPopup"});

                    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                    _gameGATracker("send", "event", Main.VERSION, "level_" + lvl + "_matches", "MJDD_HTML5", Game.levelMatches);
				}

				// display the end of game message with options buttons
				if ( this.world )
				{
					this.world.updateScore();

					if ( this.world.puzzle.tornadoRemove )
					{
						this.world.puzzle.update();
					}
				}

				if ( !this.bm.update() )
				{
                    // the BigMessage timed out, destroy it and null the reference
                    this.bm.destroy();
                    this.bm = null;

                    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
                    _gameGATracker("send", "event", Main.VERSION, "submit_score", "MJDD_HTML5", Game.score);
					/*ARK_game_arena_connector.changeScore(Game.highScore, "Game Complete");
					ARK_game_arena_connector.fireEventToArena("game_end");*/
					Main.arenaHelper.sendGameEnd(Game.highScore);

					this.delay = 4 * 1000;					// pause for four seconds
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

	// update special effects
	Game.effects.update();

	return ret;
};


Game.prototype.showHelp = function( _playBtn )
{
	this.help = new Help( );
	this.help.create( this.managers, _playBtn );
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
        _gameGATracker("send", "event", Main.VERSION, "help", "MJDD_HTML5", 1);
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
	//_gameGATracker("send", "pageview", {"page":"/PausePopup"});	
};


Game.resumeGame = function()
{
	if ( Main.debug )
		console.log("Game.resumeGame");
	this.managers.audio.visibilityMute( false );
	Game.paused = (Game.options !== null);
	//_gameGATracker("send", "pageview", {"page":"/GameScene"});	
};


Game.optionsDestroyed = function()
{
	Game.options = null;
	Game.paused = false;
};

