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
	this.managers = null;
	this.lastMatchTime = -1;

	// graphics pieces
	this.bg = null;
	this.buttons = null;
	this.icons = null;
	this.sprites = null;
	this.texts = null;
	this.timeText = null;
	this.scoreText = null;
	this.bm = null;
	this.container1 = null;
	this.container2 = null;

	// input
	this.ignoreClick = null;
	this.puzzleInput = null;

	// the puzzle is controlled from here
	this.puzzle = null;
}


World.brighter = null;
World.brighter2 = null;


World.prototype.create = function( _managers, _level )
{
	this.managers = _managers;

	// enable 'swipe' gesture globally
	Main.swipeEnabled = true;

	// screen location for the hovered and selected piece previews
	World.SelectionPreviewY = 0.23;
	World.SelectionPreviewBotY = 0.24;

	// create brightness filter to highlight selected tiles
	World.brighter = new PIXI.filters.ColorMatrixFilter();
	World.brighter.brightness(1.5, true);

	// create brightness filter to highlight hovered tiles
	World.brighter2 = new PIXI.filters.ColorMatrixFilter();
	World.brighter2.brightness(1.2, true);

	// background image
	this.bg = new Sprite();
	this.bg.create( Main.background, "game_bg", this.managers.textures );
	this.bg.anchor.set( 0.5, 1.0 );
	this.bg.y = Main.height / 2 / this.bg.parent.scale.y;

	// ui component lists
	this.icons = [];
	this.buttons = [];
	this.sprites = [];
	this.texts = [];

	// create the puzzle manager
	this.puzzle = new Puzzle();
	this.puzzle.create( this, this.managers, this.managers.data.get("levels").levels[_level], this.managers.data.get("levels") );
	this.puzzle.setTargetAngle( (30 + 180) * Math.PI / 180, true );
	this.puzzle.adjustTargetAngle( 90 * Math.PI / 180 );

	// create the puzzle input handler (must be called before _createUI which uses it)
	this.puzzleInput = new PuzzleInput();
	this.puzzleInput.create( this.managers, this.puzzle );

	// create all ui components
	this._createUI();

	// force a 'window resize' to adjust all layout
	Main.resized = true;
	Main.resizeConsumed = false;

	// init
	this.lastMatchTime = -1;
	this.lastMatchType = -1;
	this.ignoreClick = null;
	this.reshuffled = false;
	this.bm = null;
};


World.prototype.destroy = function()
{
	this.managers = null;

	if ( this.bg )
	{
		this.bg.destroy();
		this.bg = null;
	}

	var i;
	if ( this.buttons )
	{
		for(i = 0; i < this.buttons.length; i++)
			this.buttons[i].destroy();
		this.buttons = null;
	}

	if ( this.icons )
	{
		for(i = 0; i < this.icons.length; i++)
			this.icons[i].destroy();
		this.icons = null;
	}

	if ( this.sprites )
	{
		for(i = 0; i < this.sprites.length; i++)
			this.sprites[i].destroy();
		this.sprites = null;
	}

	if ( this.texts )
	{
		for(i = 0; i < this.texts.length; i++)
			this.texts[i].destroy();
		this.texts = null;
	}

	if ( this.puzzleInput )
	{
		this.puzzleInput.destroy();
		this.puzzleInput = null;
	}

	if ( this.puzzle )
	{
		this.puzzle.destroy();
		this.puzzle = null;
	}
	World.brighter = null;
	World.brighter2 = null;

	if ( this.bm )
	{
		this.bm.destroy();
		this.bm = null;
	}

	if ( this.container1 )
	{
		this.container1.destroy();
		this.container1 = null;
	}

	if ( this.container2 )
	{
		this.container2.destroy();
		this.container2 = null;
	}

	//this.reshuffleBtn = null;
	this.ignoreClick = null;
	this.game = null;
};


World.prototype.update = function()
{
	this._background();

	// NOTE: _userInput will absorb all remaining mouse input, do this *after* _userInterface which processes the buttons
	this._userInput();

	if ( this.puzzle)
	{
		// update the timer value, returns false if timeup
		if ( !this._timerUpdate() )
		{
			return false;
		}

		// update the puzzle then check if it has been completed or is stuck
		// if it is stuck and the player has not used reshuffle, use it automatically
		if ( !this._finishedOrStuck() )
			return false;
	}

	var ret = !this.puzzle.finished( false );

    if ( this.container1 )
        this.container1.update();
    if ( this.container2 )
        this.container2.update();

    // don't return false from 'update' while PuzzleInput is still running a multiplier animation
    if ( this._userInterface() )
        return true;

    return ret;
};


World.prototype.levelBeaten = function()
{
	if ( !this.puzzle )
		return true;
	return this.puzzle.finished( false );
};


World.prototype.timeUp = function()
{
	return (Game.timeLeft <= 0);
};


World.prototype.updateScore = function()
{
	// increment visible score until it matches actual score
	if ( Game.score > this.scoreText._visibleScore )
	{
		var d = Game.score - this.scoreText._visibleScore;
		if ( d > 25 )
			d = Math.max( Math.floor(d / 25), 1 );
		this.scoreText._visibleScore += d;
		this.scoreText.text = this.scoreText._visibleScore.toString();
	}
};



//
// private functions
//


World.prototype._createUI = function()
{
	// top ui buttons
	var b = new Button( Button.TYPE_NOLATCH );
	b.create( Main.topUI, "pause_button", this.managers, 0.50 - 0.07, 0.07, true,
		"pause_button", "pause_button_over", "pause_button_down", "click_pause_event" );
	b.anchor.x = b.anchor.y = 0.5;
	b.scale.x = b.scale.y = 1.5;
	b.sfx = "snd_clickPlay";
	b.sfxHover = "snd_rollOver";
	this.buttons.push(b);

	// b = new Button( Button.TYPE_BUTTON );
	// b.create( Main.topUI, "reshuffle_button", this.managers, 0.50 - 0.15 - 0.07, 0.07, true,
	// 	"reshuffle_button", "reshuffle_button_over", "reshuffle_button_down", "click_reshuffle_event" );
	// b.anchor.x = b.anchor.y = 0.5;
	// b.scale.x = b.scale.y = 1.5;
	// b.sfx = "snd_clickPlay";
	// b.sfxHover = "snd_rollOver";
	// this.reshuffleBtn = b;
	// this.buttons.push(b);


	// top ui icons and text
	var s = new Sprite();
	s.create( Main.topUI, "time_icon", this.managers.textures, -0.5 + 0.05, 0.07, true );
	s.anchor.x = s.anchor.y = 0.5;
	s.scale.x = s.scale.y = 1.0;
	this.icons.push(s);

	var t = new Text( "", Main.textStyleSemiBold );
	t.create( Main.topUI, -0.5 + 0.05 + 0.050, 0.07, true );
	t.anchor.y = 0.5;
	this.texts.push(t);
	this.timeText = t;

	s = new Sprite();
    s.create( Main.topUI, "score_icon", this.managers.textures, -0.5 + 0.37, 0.07, true );
    //s.create( Main.topUI, "score_icon", this.managers.textures, -0.5 + 0.05, 0.15 + 0.07, true );
	//s.responsiveLayout = [ { aspectRatioMin: 1.35, position: { x: -0.5 + 0.37, y: 0.07 } } ];
	s.anchor.x = s.anchor.y = 0.5;
	s.scale.x = s.scale.y = 1.0;
	this.icons.push(s);

	t = new Text( Game.score.toString(), Main.textStyleSemiBold );
    t.create( Main.topUI, -0.5 + 0.37 + 0.055, 0.07, true );
    //t.create( Main.topUI, -0.5 + 0.05 + 0.050, 0.15 + 0.07, true );
	//t.responsiveLayout = [ { aspectRatioMin: 1.35, position: { x: -0.5 + 0.37 + 0.055, y: 0.07 } } ];
	t.anchor.y = 0.5;
	this.texts.push(t);
	this.scoreText = t;
	this.scoreText._visibleScore = Game.score;


	// bottom ui buttons (rotate)
	b = new Button( Button.TYPE_BUTTON );
	b.create( Main.bottomUI, "rotate_lft_button", this.managers, -0.36, 0.40, true,
		"rotate_lft_button", "rotate_lft_button_over", "rotate_lft_button", "click_left_event" );
	b.anchor.x = b.anchor.y = 0.5;
	b.scale.x = b.scale.y = 0.60;
	b.sfxHover = "snd_rollOver";
	//b.responsiveLayout = [ { minWidth: 800, position: { x: -0.30, y: 0.43 } } ];
	this.buttons.push(b);

	b = new Button( Button.TYPE_BUTTON );
	b.create( Main.bottomUI, "rotate_rgt_button", this.managers, 0.36, 0.40, true,
		"rotate_rgt_button", "rotate_rgt_button_over", "rotate_rgt_button", "click_right_event" );
	b.anchor.x = b.anchor.y = 0.5;
	b.scale.x = b.scale.y = 0.60;
	b.sfxHover = "snd_rollOver";
	//b.responsiveLayout = [ { minWidth: 800, position: { x: 0.30, y: 0.43 } } ];
	this.buttons.push(b);

    var sprite;

	// piece preview containers
	sprite = new Sprite();
	sprite.create( Main.rightUI, "preview_container", this.managers.textures, -0.02, World.SelectionPreviewY, true );
	sprite.anchor.x = sprite.anchor.y = 0.5;
	sprite.scale.x = 1.3;
	sprite.scale.y = 1.2;
	sprite.alpha = 0.5;
	this.container1 = sprite;

	sprite = new Sprite();
	sprite.create( Main.rightUI, "preview_container", this.managers.textures, -0.02, World.SelectionPreviewY, true );
	sprite.anchor.x = sprite.anchor.y = 0.5;
	sprite.scale.x = 1.3;
	sprite.scale.y = 1.2;
	sprite.alpha = 0.5;
	this.container2 = sprite;

	// hover piece and drop piece previews
	sprite = new Sprite();
	sprite.create( Main.rightUI, "cube_s1_1", this.managers.textures, -0.02, World.SelectionPreviewY, true );
	sprite.anchor.x = sprite.anchor.y = 0.5;
	sprite.scale.x = sprite.scale.y = Tile.scale / Main.tileAssetScale;
	this.puzzleInput.createHoveredPiece( sprite );

	sprite = new Sprite();
	sprite.create( Main.rightUI, "cube_s1_1", this.managers.textures, -0.02, World.SelectionPreviewY, true );
	sprite.y += sprite.height;
	sprite.anchor.x = sprite.anchor.y = 0.5;
	sprite.scale.x = sprite.scale.y = Tile.scale / Main.tileAssetScale;
	this.puzzleInput.createDroppedPiece( sprite );
    
    if ( !Main.isPortrait )
    {
        this.container1.visible = this.container2.visible = true;
    }
    else
    {
        this.container1.visible = this.container2.visible = false;
    }

	if ( this.container2 )
		this.container2.y = World.SelectionPreviewBotY = sprite.y;
};


World.prototype._timerUpdate = function()
{
    // timer does not tick while BigMessage is displayed or tornado plays
	if ( !this.bm )
	{
        //if ( !GameControl.pageHidden && !this.puzzle.tornadoRemove )
        if ( !this.puzzle.tornadoRemove )
		{
            //if ( !Utils.isHidden() && !Game.paused )
            if ( !Game.paused )
			{
				// timer tick
				Game.timeLeft -= Main.elapsedTime;
				if ( this.timeUp() )
					return false;

    			// change text if necessary
    			var timeString = Utils.timeToString( Game.timeLeft );
    			if ( this.timeText.text != timeString )
    			{
    				this.timeText.text = timeString;
    			}

    			// flash timer if nearly out of time
    			if ( Game.timeLeft / 1000 < 10 )
    			{
    				if ( Game.timeLeft % 1000 < 500 )
    				{
    					if ( this.timeText.tint != 0xff0000 )
    					{
    						// audio warning every 0.5 second for the last 5 seconds
    						if ( Game.timeLeft / 1000 < 5 )
    							this.managers.audio.play( ["snd_timerWarning"] );
    						this.timeText.tint = 0xff0000;
    					}
    				}
    				else
    				{
    					if ( this.timeText.tint != 0xffffff )
    					{
    						// audio warning every 1 second for the last 10 seconds
    						this.managers.audio.play( ["snd_timerWarning"] );
    						this.timeText.tint = 0xffffff;
    					}
    				}
                }
			}
		}
	}
	else
	{
		// argument to BigMessage.update is the name of the parameter in it's parent scope
		this.bm.update( "bm" );
	}

	return true;
};


// check if the puzzle has been completed or is stuck
// if it is stuck and the player has not used reshuffle, use it automatically
World.prototype._finishedOrStuck = function()
{
	// puzzle.update returns false if the puzzle is finished or stuck
	if ( !this.puzzle.update() )
	{
		// if it is not finished (ignoring pieces that are currently fading)
		if ( !this.puzzle.finished( true ) )
		{
			if ( this.reshuffled )
			{
				// already shuffled once, puzzle is stuck, game over...
				this.managers.audio.play( ["snd_error1", "snd_error2", "snd_error3"] );
				return false;
			}

            // don't reshuffle when all tiles are matching (overridden)
            if ( !this.puzzle.overrideTileKey )
            {
    			// auto reshuffle until the puzzle can be solved
    			while( this.puzzle.puzzleLocked() )
    			{
    				this._reshuffle();
    			}
            }
		}
	}
	return true;
};


World.prototype._background = function()
{
	this.bg.y = Main.height / 2 / this.bg.parent.scale.y;
	this.bg.update();
};


World.prototype._userInterface = function()
{
	Keys.update();

    // update in response to orientation changes
    if ( !Main.isPortrait )
    {
        this.container1.visible = this.container2.visible = true;
    }
    else
    {
        this.container1.visible = this.container2.visible = false;
    }

	// update sprites created as a response to puzzle inputs
	var ret = this.puzzleInput.update();

	// draw buttons
	var event;
	for(var i = 0; i < this.buttons.length; i++)
	{
		event = this.buttons[i].update();
		if ( event !== null && event !== undefined ) break;
	}

	switch( event )
	{
		case "click_pause_event":
			this.puzzleInput.removeHoverPiece();
			this.game.pauseToggle();
			break;
		// case "click_reshuffle_event":
		// 	this._reshuffleClick();
		// 	break;
		case "click_left_event":
			this.puzzleInput.removeHoverPiece();
			if ( this.puzzle.adjustTargetAngle( -90 * Math.PI / 180 ) )
				this.managers.audio.play( "snd_rotate" );
            if ( Main.eventChangeAdOnRotate )
            {
    		    // ARK_game_arena_connector.fireEventToArena("event_change");
                Main.arenaHelper.sendEventChange();
            }
			break;
		case "click_right_event":
			this.puzzleInput.removeHoverPiece();
			if ( this.puzzle.adjustTargetAngle( 90 * Math.PI / 180 ) )
				this.managers.audio.play( "snd_rotate" );
            if ( Main.eventChangeAdOnRotate )
            {
    			// ARK_game_arena_connector.fireEventToArena("event_change");
                Main.arenaHelper.sendEventChange();
            }
			break;
	}

	// draw icons
	for(i = 0; i < this.icons.length; i++)
		this.icons[i].update();

	// draw sprites
	for(i = 0; i < this.sprites.length; i++)
		this.sprites[i].update();

	this.updateScore();

	// draw texts
	for(i = 0; i < this.texts.length; i++)
		this.texts[i].update();

	// show the side-bar pieces
	this.puzzleInput.showDropAndHoverPieces();

	// fix the container positions in case screen dimensions have changed
	if ( this.container1 )
		this.container1.pcnty = World.SelectionPreviewY;	
	if ( this.container2 )
		this.container2.y = World.SelectionPreviewBotY;

	return ret;
};


World.prototype._userInput = function()
{
	// ignore all input if the BigMessage is displaying or the tornado is playing
	if ( this.bm || this.puzzle.tornadoRemove )
		return;

	// key 'q' is for azerty keyboard layout: http://ccm.net/faq/331-qwerty-vs-azerty-keyboards
	if ( Main.swipe < 0 || Keys.isPressed[KeyCodes.left_arrow] || Keys.isPressed[KeyCodes.key_a] || Keys.isPressed[KeyCodes.key_q] )
	{
		this.puzzleInput.removeHoverPiece();
		if ( this.puzzle.adjustTargetAngle( -90 * Math.PI / 180 ) )
		{
			this.managers.audio.play( "snd_rotate" );
			// potential framing ad change point
            if ( Main.eventChangeAdOnRotate )
            {
    			// ARK_game_arena_connector.fireEventToArena("event_change");
                Main.arenaHelper.sendEventChange();
            }
		}
		Main.swipe = 0;
        // reset the idle timer after each keypress or mouse swipe (rotation)
        Main.idleTimer = Main.eventChangeAdOnIdle;
	}

	// key 'e' is for dvorak keyboard layout: http://www.dvorak-keyboard.com/
	if ( Main.swipe > 0 || Keys.isPressed[KeyCodes.right_arrow] || Keys.isPressed[KeyCodes.key_d] || Keys.isPressed[KeyCodes.key_e] )
	{
		this.puzzleInput.removeHoverPiece();
		if ( this.puzzle.adjustTargetAngle( 90 * Math.PI / 180 ) )
		{
			this.managers.audio.play( "snd_rotate" );
			// potential framing ad change point
            if ( Main.eventChangeAdOnRotate )
            {
    			//ARK_game_arena_connector.fireEventToArena("event_change");
                Main.arenaHelper.sendEventChange();
            }
		}
		Main.swipe = 0;
        // reset the idle timer after each keypress or mouse swipe (rotation)
        Main.idleTimer = Main.eventChangeAdOnIdle;
	}

	// select puzzle tiles on user input
	var pick;
	if ( Main.mouseDown === null &&
		Main.click === null &&
		Main.hover !== null &&
		!isNaN(Main.hover.x) && !isNaN(Main.hover.y) &&
		this.puzzle.contains(Main.hover) )
	{
		pick = this.puzzle.tilePicker( Main.hover.x, Main.hover.y );
		Main.hover = null;

		if ( pick )
		{
			this.puzzleInput.showHoveredPiece( pick );
		}
		else
		{
			this.puzzleInput.removeHoverPiece();
		}
	}

	// "click" is mouse or touch 'tap'
	if ( Main.click !== null )
	{
        // reset the idle timer after each mouse click
        Main.idleTimer = Main.eventChangeAdOnIdle;

		// we have mouseDown AND onTap, mouseDown can happen immediately
		// but onTap will happen 300ms later
		// this code ignores taps which are delayed responses to mouseDown/mouseUp
		// events (the mouseDown code will already have handled them)
		var ignore = false;
		if ( this.ignoreClick )
		{
			// close enough to same location
			if ( Utils.distanceBetween( this.ignoreClick, Main.click ) < 10 )
			{
				// soon enough afterwards (500ms)
				if ( Game.frameCount - this.ignoreClick.when < 30 )
				{
					ignore = true;
				}
			}
		}

		if ( !ignore )
		{
			pick = this.puzzle.tilePicker( Main.click.x, Main.click.y );

			if ( pick )
			{
				this.puzzleInput.clickedPiece( pick );
			}
		}

		Main.click = null;
		this.ignoreClick = null;
	}

	// more responsive game-play, react immediately on mouseDown
	if ( Main.mouseDown !== null )
	{
        // reset the idle timer after each mouse down
        Main.idleTimer = Main.eventChangeAdOnIdle;

		pick = this.puzzle.tilePicker( Main.mouseDown.x, Main.mouseDown.y );
		this.ignoreClick = Main.mouseDown;
		this.ignoreClick.when = Game.frameCount;

		if ( pick )
		{
			if ( this.puzzleInput.clickedPiece( pick ) )
			{
				Main.mouseDown = null;
			}
		}
	}

	// other key presses


    // TODO: debug only - test override on 'o' key press
    if ( Main.testKeys && Keys.isPressed[KeyCodes.key_o] )
    {
        // TODO: testing with "s10" cubes because we they are
        // present in the first 3 levels
        this.puzzle.overrideTiles( 5, "s10" );
    }

    // TODO: debug only - reshuffle on 'r' key press
    if ( Main.testKeys && Keys.isPressed[KeyCodes.key_r] )
    {
        this._reshuffleClick();
    }

    // TODO: debug only - piece tornado on 't' key press
	if ( Main.testKeys && Keys.isPressed[KeyCodes.key_t] )
	{
		this.puzzle.tornadoRemove = true;
	}
	// TODO: debug only - time up on 'x' key press
	if ( Main.testKeys && Keys.isPressed[KeyCodes.key_x] )
	{
		Game.timeLeft = 1;
	}
	// TODO: debug only - show screen resolution information
	if ( Main.testKeys && ((Keys.isPressed[ KeyCodes.key_v ]) || (Main.mouseDown && Main.mouseDown.x < 30 && Main.mouseDown.y < 30)) )
	{
		EventHandlers.debugWindowData();
	}
};


// callback, destroy _sprite when the fader has finished
World.prototype.destroySprite = function( _sprite )
{
	// remove the sprite from the 'sprites' list if it is in there
	var i = this.sprites.indexOf( _sprite );
	if ( i !== -1 )
		this.sprites.splice( i, 1 );

	// destroy the sprite
	_sprite.destroy();
};


World.prototype._reshuffle = function()
{
    // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
    _gameGATracker("send", "event", Main.VERSION, "shuffle", "MJDD_HTML5", 1);

	this.managers.audio.playDelayed( ["snd_reshuffle2"], 1.5 );
	this.puzzle.reshuffle();
	// this.reshuffled = true;     // auto-reshuffle can happen multiple times if required
};


World.prototype._reshuffleClick = function()
{
	this.puzzleInput.removeHoverPiece();
	if ( !this.reshuffled )
	{
		this.managers.audio.play( ["snd_reshuffle1"] );
		this.bm = new BigMessage();
		this.bm.create( Main.fullUI, this.managers, "gvp_level_reshuffle_text_string", this._reshuffle, this );
		this.bm.timeOut = 2500;
        if ( this.reshuffleBtn )
		  this.reshuffleBtn.visible = false;
	}
	else
	{
		this.managers.audio.play( ["snd_error1", "snd_error2", "snd_error3"] );
	}
};


World.prototype.getLevelBonus = function()
{
    if ( this.puzzle.levelBonusValues )
	   return this.puzzle.levelBonusValues[ this.game.level ];
    return 0;
};
