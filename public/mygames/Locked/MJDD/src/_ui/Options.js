//
// Options.js
//
// Pete Baron 2017
//
// Options menu for Mahjongg Dark Dimensions
//




function Options( )
{
	this.panel = null;
	this.sprites = null;
	this.buttons = null;
	this.texts = null;
	this.soundBtn = null;
	this.musicBtn = null;
	this.destroyCallback = null;
	this.removing = false;
    this.doneIn = false;
    this.doneOut = false;
    this.adShown = false;
    this.soundAdjustTracked = false;

	this.sliderTab = [];
	this.sliderBar = [];
}


Options.prototype.create = function( _game, _managers )
{
	Main.swipeEnabled = false;

	this.game = _game;
	this.managers = _managers;

	this.sprites = [];
	this.buttons = [];
	this.texts = [];

    this.doneIn = this.doneOut = false;
    this.adShown = false;

	Utils.addBlanker( this.managers.textures );

	// this.bg = new Sprite();
	// this.bg.create( Main.background, "game_title", this.managers.textures );
	// this.bg.anchor.set( 0.5, 1.0 );
	// this.bg.y = Main.height / 2 / this.bg.parent.scale.y;

	this.panel = new Sprite();
	this.panel.create( Main.fullUI, "menu_bg", this.managers.textures, 0.0, 0.0, true );
	this.panel.anchor.set( 0.5 );
	this.sprites.push( this.panel );

	// "OPTIONS" header
	var t = new Text( this.managers.locale.get( "options_header_string" ), Main.textStyleBold );
	t.create( this.panel, 0.0, -0.34, true );
	t.anchor.set( 0.5, 0.5 );
	this.texts.push( t );

	// close button
	var b = new Button( Button.TYPE_BUTTON );
	b.create( this.panel, "menu_close_button", this.managers, 0.33, -0.3, true,
		"menu_close_button", "menu_close_button_over", "menu_close_button_down", "click_close_event" );
	b.anchor.set( 0.5, 0.5 );
	b.scale.set( 2.0 );
	b.sfx = "snd_clickPlay";
	b.sfxHover = "snd_rollOver";
	this.buttons.push( b );

	// volume sliders if not Chrome on Android (audio doesn't work)
	var by = -0.15;
    var sy = 0.16;
	if ( !Main.isAndroid || !Main.isChromeMobile )
	{
        by = 0.15;
        sy = 0.16;

		b = new Button( Button.TYPE_BUTTON );
		b.create( this.panel, "menu_sound_button", this.managers, -0.22, by - 0.35 + sy * 0, true,
			"menu_sound_button", "menu_sound_button_over", "menu_sound_button_down", "click_sound_event", null,
			"menu_sound_button_mute", "menu_sound_button_mute_over", "menu_sound_button_mute_down", "click_sound_event_mute", null );
		b.anchor.set( 0.0, 0.5 );
		b.toggled = !this.managers.audio.mute;
		b.sfx = "snd_clickPlay";
		b.sfxHover = "snd_rollOver";
		this.buttons.push( b );
		this.soundBtn = b;

		var s = new Sprite();
		s.create( this.panel, "menu_slider_bar", this.managers.textures, -0.10, by - 0.35 + sy * 0, true );
		s.anchor.set( 0.0, 0.5 );
		this.sprites.push( s );
		this.sliderBar[0] = s;
		s = new Sprite();
		s.create( this.sliderBar[0], "menu_slider_tab", this.managers.textures, 0.0, 0.0, true );
		s.anchor.set( 0.5, 0.5 );
		this.sprites.push( s );
		s.setx = this.sliderBar[0].width * AudioManager.sfxVolume;
		this.sliderTab[0] = s;

		b = new Button( Button.TYPE_BUTTON );
		b.create( this.panel, "menu_music_button", this.managers, -0.22, by - 0.35 + sy * 1, true,
			"menu_music_button", "menu_music_button_over", "menu_music_button_down", "click_music_event", null,
			"menu_music_button_mute", "menu_music_button_mute_over", "menu_music_button_mute_down", "click_music_event_mute" );
		b.anchor.set( 0.0, 0.5 );
		b.toggled = !this.managers.audio.tunesMuted;
		b.sfx = "snd_clickPlay";
		b.sfxHover = "snd_rollOver";
		this.buttons.push( b );
		this.musicBtn = b;

		s = new Sprite();
		s.create( this.panel, "menu_slider_bar", this.managers.textures, -0.10, by - 0.35 + sy * 1, true );
		s.anchor.set( 0.0, 0.5 );
		this.sprites.push( s );
		this.sliderBar[1] = s;
		s = new Sprite();
		s.create( this.sliderBar[1], "menu_slider_tab", this.managers.textures, 0.0, 0.0, true );
		s.anchor.set( 0.5, 0.5 );
		s.setx = this.sliderBar[1].width * AudioManager.musicVolume;
		this.sprites.push( s );
		this.sliderTab[1] = s;
	}

	// help button
	b = new Button( Button.TYPE_NOLATCH );
	b.create( this.panel, "menu_help_button", this.managers, -0.22, by - 0.35 + sy * 2, true,
		"menu_help_button", "menu_help_button_over", "menu_help_button_down", "click_help_event" );
	b.anchor.set( 0.0, 0.5 );
	b.sfx = "snd_clickPlay";
	b.sfxHover = "snd_rollOver";
	this.buttons.push( b );

	t = new Text( this.managers.locale.get( "help_header_string" ), Main.textStyleLarge );
	t.create( this.panel, -0.10, by - 0.35 + sy * 2, true );
	t.anchor.set( 0.0, 0.5 );
	this.texts.push( t );

	// quit button
	b = new Button( Button.TYPE_NOLATCH );
	b.create( this.panel, "menu_quit_button", this.managers, -0.22, by - 0.35 + sy * 3, true,
		"menu_quit_button", "menu_quit_button_over", "menu_quit_button_down", "click_quit_event" );
	b.anchor.set( 0.0, 0.5 );
	b.sfx = "snd_clickPlay";
	b.sfxHover = "snd_rollOver";
	this.buttons.push( b );

	t = new Text( this.managers.locale.get( "options_quit_string" ), Main.textStyleLarge );
	t.create( this.panel, -0.10, by - 0.35 + sy * 3, true );
	t.anchor.set( 0.0, 0.5 );
	this.texts.push( t );

	Options.tweenIn.step = Utils.makeFunctionForSprite( this.panel );
	this.panel.tweener = new Tweenable();
	this.panel.tweener.tween( Options.tweenIn );
	this.panel.tweener.owner = this.panel;
	this.panel.tweener.context = this;
	this.removing = false;
	// whoosh sound
	this.managers.audio.play( "snd_rotate" );	
};


Options.prototype.remove = function( _destroyCallback )
{
	if ( !this.removing )
	{
		this.removing = true;
		if ( Main.debug )
			console.log("Options.remove");
		Options.tweenOut.step = Utils.makeFunctionForSprite( this.panel );
		this.panel.tweener.tween( Options.tweenOut );
		this.panel.tweener.owner = this;
		this.destroyCallback = _destroyCallback;
	}
};


Options.prototype.destroy = function()
{
	var i;

	Utils.removeBlanker();

	if ( this.destroyCallback )
	{
		this.destroyCallback.call( this );
		this.destroyCallback = null;
	}

	// if ( this.bg )
	// {
	// 	this.bg.destroy();
	// 	this.bg = null;
	// }

	if ( this.panel )
	{
		this.panel.tweener = null;
		this.panel.destroy( { children: true } );
		this.panel = null;
	}

	if ( this.texts )
	{
		for ( i = 0; i < this.texts.length; i++ )
			this.texts[ i ].destroy();
		this.texts = null;
	}

	if ( this.buttons )
	{
		for ( i = 0; i < this.buttons.length; i++ )
			this.buttons[ i ].destroy();
		this.buttons = null;
	}
	this.soundBtn = null;
	this.musicBtn = null;

	if ( this.sprites )
	{
		for ( i = 0; i < this.sprites.length; i++ )
			this.sprites[ i ].destroy();
		this.sprites = null;
	}
	this.sliderTab = null;
	this.sliderBar = null;

	this.game = null;
	this.managers = null;

	// force responsive layout in case user changed format behind the help screen
	Main.resized = true;
	Main.resizeConsumed = false;
	Main.swipeEnabled = true;

    // reset the idle timer after each popup
    Main.idleTimer = Main.eventChangeAdOnIdle;
};


Options.prototype.update = function()
{
	var i, event;

    if ( this.doneIn )
    {
        // potential framing ad change point
        if ( Main.eventChangeAdOnOptions && !this.adShown )
        {
            // ARK_game_arena_connector.fireEventToArena("event_change");
            Main.arenaHelper.sendEventChange();
            this.adShown = true;
        }
    }

	// this.bg.y = Main.height / 2 / this.bg.parent.scale.y;
	// this.bg.update();

	// update panel sprite to be responsive
	// (everything else is drawn ON the panel sprite so it transform with the bg automatically)
	this.panel.update();

	if ( this.sprites )
	{
		for ( i = 0; i < this.sprites.length; i++ )
		{
			var s = this.sprites[ i ];
			s.update();
		}
	}

	// slider tab jump to mouse position if down on slider bar
	if ( Main.mouseDown !== null )
	{
		var mp = Main.hover;
		if ( mp === null ) mp = Main.mouseDown;
		for( i = 0; i < this.sliderBar.length; i++ )
		{
			this.sliderBar[i].getGlobalScale( true );
			this.sliderBar[i].bounds = this.sliderBar[i].getBounds( false );

			if ( this.sliderBar[i].bounds.contains(mp.x, mp.y) )
			{
				this.sliderTab[i].pcntx = Utils.clamp((mp.x - this.sliderBar[i].bounds.left) / this.sliderBar[i].globalScale.x / this.sliderBar[i].width, 0, 1);
				if ( i === 0 )
				{
					AudioManager.sfxVolume = this.sliderTab[i].percentx;
                    if ( !this.soundAdjustTracked )
                    {
                        this.soundAdjustTracked = true;
                        _gameGATracker("send", "event", Main.VERSION, "sound", "MJDD_HTML5", 1);
                    }
				}
				else
				{
					this.managers.audio.setMusicVolume( this.sliderTab[i].percentx );
                    if ( !this.soundAdjustTracked )
                    {
                        this.soundAdjustTracked = true;
                        _gameGATracker("send", "event", Main.VERSION, "sound", "MJDD_HTML5", 1);
                    }
				}
				this.managers.preloader.loadManager.saveGameStatus();
			}
		}
	}

	if ( this.buttons )
	{
		for ( i = 0; i < this.buttons.length; i++ )
		{
			var b = this.buttons[ i ];
			event = b.update();
			// stop processing buttons when one of them returns an event
			if ( event !== null ) break;
		}
	}

	// let space bar emulate 'close' button click
	if ( event === null && Keys.isPressed[KeyCodes.space_bar] )
	{
		event = "click_close_event";
	}

	switch( event )
	{
		case "click_close_event":
		{
			Main.click = null;
			Keys.reset( KeyCodes.space_bar );

            if ( Main.playMidRollAdAfterPause )
            {
                //ARK_game_arena_connector.fireEventToArena("pause_ready");
                Main.arenaHelper.requestMidroll();
            }

			return false;
		}

		case "click_help_event":
		{
			// show help from Options screen, use the "Continue" button
			this.game.showHelp( false );
			break;
		}

		case "click_quit_event":
		{
			this.game.showConfirm( "quit_header_string", this, this.onYesQuit, this.onNoQuit );
			break;
		}

		case "click_sound_event":
		{
			this.soundBtn.toggled = false;
			this.managers.audio.setMute( true, false );
            if ( !this.soundAdjustTracked )
            {
                this.soundAdjustTracked = true;
                _gameGATracker("send", "event", Main.VERSION, "sound", "MJDD_HTML5", 1);
            }
			break;
		}

		case "click_sound_event_mute":
		{
			this.soundBtn.toggled = true;
			this.managers.audio.setMute( false, false );
            if ( !this.soundAdjustTracked )
            {
                this.soundAdjustTracked = true;
                _gameGATracker("send", "event", Main.VERSION, "sound", "MJDD_HTML5", 1);
            }
			break;
		}

		case "click_music_event":
		{
			this.musicBtn.toggled = false;
			this.managers.audio.muteTunes( true, false );
            if ( !this.soundAdjustTracked )
            {
                this.soundAdjustTracked = true;
                _gameGATracker("send", "event", Main.VERSION, "sound", "MJDD_HTML5", 1);
            }
			break;
		}

		case "click_music_event_mute":
		{
			this.musicBtn.toggled = true;
			this.managers.audio.muteTunes( false, false );
            if ( !this.soundAdjustTracked )
            {
                this.soundAdjustTracked = true;
                _gameGATracker("send", "event", Main.VERSION, "sound", "MJDD_HTML5", 1);
            }
			break;
		}
	}

	return true;
};


Options.prototype.onYesQuit = function()
{
	this.destroy();
	Game.requestQuit = true;
	Game.options = null;
};


Options.prototype.onNoQuit = function()
{

};


var tt = 350;
Options.tweenIn =
{
	from:
	{
		pcnty: 1.0
		//scaleFactor: 0.10
	},
	to:
	{
		pcnty: 0
		//scaleFactor: 1.0
	},
	duration: tt,
	easing: 'easeInQuad',	//'bounce',
	step: null,
	finish: function() {
		//console.log("Options tweenin");
        this.context.doneIn = true;
	}
};


Options.tweenOut =
{
	from:
	{
		pcnty: 0
		//scaleFactor: 1.0
	},
	to:
	{
		pcnty: -1.0
		//scaleFactor: 0.10
	},
	duration: tt,
	easing: 'easeFrom',
	step: null,
	finish: function() {
		//console.log("Options tweenout");
		// 'this' is the tweener, context is the BigMessage object
		this.context.doneOut = true;
		if ( this.owner )
		{
			this.owner.destroy();
			this.owner = null;
		}
	}
};
