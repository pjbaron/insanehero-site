//
// Bubble Shooter
//
// Pete Baron 2017
//
// a puzzle game using Mahjongg style rules on a 3d cube
// the cube rotates on the x,z plane, 'edges' in the Mahjongg
// sense are always vertical (you cannot remove a tile from the
// top centre)
//
//
// this game state machine controls whole game sequencing
// 



function GameControl( )
{
	this.preloader = null;
	this.titles = null;
	this.game = null;
	this.bm = null;
    this.level = 1;
    this.menu = null;
}



GameControl.firstLevel = 11;        // adjust for fast debug in Challenge Mode


GameControl.GameStates = {
	NONE : -1,
	PRELOAD : 0,
	TITLES : 1,
    LEVEL_SELECT : 2,
    MENU_FADE : 3,
	PLAY : 4
};

GameControl.pageHidden = false;


GameControl.prototype.create = function()
{
	this.preloader = new Preloader(Main.arenaHelper.getAbsoluteURL(""));
	this.preloader.preload( this, Main.lowResolutionAssets );

	this.lastState = GameControl.GameStates.NONE;
	this.state = GameControl.GameStates.PRELOAD;

	this.titles = null;
	this.game = null;
	this.bm = null;
    this.level = 1;
    this.menu = null;
};


// called once per frame
// main game control state machine
GameControl.prototype.update = function()
{
	var again;
	do{
		again = false;

		// if the state has changed since last call, set the newState flag
		var newState = ( this.lastState != this.state );
		this.lastState = this.state;

		if ( Main.debug && newState )
		{
			console.log( "GameControl.state changed to", this.state );
		}

		switch ( this.state )
		{
			case GameControl.GameStates.PRELOAD:

				this.preloader.update();
				
				if ( this.preloader.allLoaded() )
				{
					this.state = GameControl.GameStates.TITLES;

					// start page visibility system
					Utils.focusChangeCallback = this.onFocusChange;
					Utils.focusChangeContext = this;
                    Utils.detectHidden();
					GameControl.pageHidden = Utils.isHidden();

                    var levelsData = this.preloader.dataManager.get("levels");
                    Main.totalShots = levelsData.numShots;

					// load the game status variables from local storage
					this.preloader.loadManager.loadGameStatus();
                    
					// instantly repeat the state-machine to avoid black flicker between screens
					again = true;
				}
				break;


			case GameControl.GameStates.TITLES:
				if ( newState )
				{
					// initialise the keyboard listeners
					Keys.create();

					// clear all event callbacks (from orphaned buttons etc)
					EventHandlers.clearCallbacks();
					
                    this.preloader.audioManager.stopTune();
					this.resetInput();
					this.titles = new Titles( );
					this.titles.create( this.preloader );
				}

				this.preloader.audioManager.update();
				if ( !this.titles.update() )
				{
					this.titles.destroy();
					this.titles = null;

                    if ( Main.challengeMode )
                    {
                        this.level = GameControl.firstLevel;
                        this.state = GameControl.GameStates.PLAY;
                    }
                    else
                    {
                        this.state = GameControl.GameStates.LEVEL_SELECT;
                    }
				}
				break;


            case GameControl.GameStates.LEVEL_SELECT:
                if ( newState )
                {
                    // play the title tune for the level select menu
                    this.preloader.audioManager.startTune( "game_title_tune" );
                    this.menu = new LevelSelect();
                    this.menu.create( this, this.preloader.getManagers(), this.level );
                }

                this.level = this.menu.update();
                if ( this.level > 0 )
                {
                    this.state = GameControl.GameStates.MENU_FADE;
                }
                break;


            case GameControl.GameStates.MENU_FADE:
                if ( !this.menu.remove() )
                {
                    this.state = GameControl.GameStates.PLAY;
                    this.menu = null;
                }
                break;


			case GameControl.GameStates.PLAY:
				if ( newState )
				{
					// ARK_game_arena_connector.fireEventToArena("game_start");
					Main.arenaHelper.sendGameStart();
					this.resetInput();
					this.game = new Game();
                    var numLevels = this.preloader.levels;
                    if ( !Main.challengeMode ) numLevels = Main.numSagaLevels;
					this.game.create( this.preloader.getManagers(), this.level, numLevels );
				}
				
				this.preloader.audioManager.update();

                if ( !this.game.update() )
                {
                    this.game.destroy();
                    this.game = null;

                    // either loop back to titles, or restart to enter the level select screen
                    if ( !Game.requestQuit || Main.challengeMode )
                    {
                        this.state = GameControl.GameStates.TITLES;
                    }
                    else
                    {
                        this.lastState = GameControl.GameStates.NONE;
                        this.state = GameControl.GameStates.LEVEL_SELECT;
                    }
                }
				break;

		}
	}while(again);

	// secondary system to focus window for keypresses
	if ( Main.mouseDown )
	{
        Main.getFocus();
	}

	// draw everything
	Main.render();
};


GameControl.prototype.resetInput = function()
{
	Keys.reset();
	Main.resetInput();
};


GameControl.prototype.onFocusChange = function( _hidden )
{
//console.log("GameControl.onFocusChange hidden=" + _hidden);

    // set focus to the game window so we can capture key-presses
    if (!_hidden) Main.getFocus();

    // ignore focus change events if pauseOnFocusLoss is false
    // https://trello.com/c/71XUVFZ5/52-remove-the-pause-on-losing-focus-let-the-game-keep-running-this-should-probably-be-set-to-a-toggle-that-we-can-turn-on-and-off
    if ( !Main.pauseOnFocusLoss )
    {
        // mute/unmute audio if focus switch
        // https://trello.com/c/c4ki6zij/58-audio-must-mute-when-losing-focus-no-matter-what-device
        this.preloader.audioManager.visibilityMute( _hidden );

        // if device is mobile, don't exit... pause anyway
        // https://trello.com/c/2iVe9MFe/59-game-should-pause-when-losing-focus-on-mobile-okay-if-it-doesnt-work-on-100-on-mobile-devices
        if ( !PIXI.utils.isMobile.any )
        {
            return;
        }
    }

	//GameControl.pageHidden = _hidden;

	// if ( _hidden )
	// {
        // if we're showing the 'click to continue' banner
		// if ( this.bm )
		// {
  //           // but it's not fully displayed yet
		// 	if ( this.bm.removing )
		// 	{
		// 		// kill it instantly so we can create a new one
		// 		this.bm.destroy();
		// 		this.bm = null;
		// 	}
		// }

		// if ( !this.bm && this.game )
		// {
		// 	this.bm = new BigMessage();
		// 	this.bm.create( Main.fullUI, this.preloader.getManagers(), "click_to_continue_string" );
		// }
	// }
	// else
	{
		// if ( this.bm )
		// {
		// 	if ( this.bm.remove( this, "bm" ) )
		// 	{
		// 		Main.mouseDown = null;
		// 		Main.mouseUp = null;
		// 	}
		// }
        
        // switch Game.paused flag directly (instead of through the Game.pauseGame function) to prevent side-effects
		Game.paused = (Game.options !== null);
	}
	
	// step timer back to the start of this second (to cover time taken to visually re-aquire the game content)
	Main.time = Math.floor(Main.time / 1000) * 1000 + 999;

    // mute/unmute audio
    this.preloader.audioManager.visibilityMute( GameControl.pageHidden );

	if ( Main.debug )
		console.log( "GameControl.onFocusChange hidden =", _hidden, "at time =", Date.now() );
};

