//
// Options.js
//
// Pete Baron 2017
//
// Options menu for Bubble Shooter
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

	this.panel = new Sprite();
	this.panel.create( Main.fullUI, "popup_small_v03.png", this.managers.textures, 0.0, 0.0, true );
	this.panel.anchor.set( 0.5 );
	this.sprites.push( this.panel );

	// close button
	var b = new Button( Button.TYPE_BUTTON );
	b.create( this.panel, "button_close.png", this.managers, 0.420, -0.329, true,
		"button_close.png", "button_close.png", "button_close.png", "click_close_event" );
	b.anchor.set( 0.5 );
	b.sfx = "snd_click";
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
		b.create( this.panel, "settingsScreen/settingsBtn_fxOn.png", this.managers, -0.30, -0.06, true,
			"settingsScreen/settingsBtn_fxOn.png", "settingsScreen/settingsBtn_fxOn.png", "settingsScreen/settingsBtn_fxOn.png", "click_sound_event", null,
			"settingsScreen/settingsBtn_fxOff.png", "settingsScreen/settingsBtn_fxOff.png", "settingsScreen/settingsBtn_fxOff.png", "click_sound_event_mute", null );
		b.anchor.set( 0.5 );
		b.toggled = !this.managers.audio.mute;
		b.sfx = "snd_click";
		b.sfxHover = "snd_rollOver";
		this.buttons.push( b );
		this.soundBtn = b;

		b = new Button( Button.TYPE_BUTTON );
		b.create( this.panel, "settingsScreen/settingsBtn_musicOn.png", this.managers, -0.10, -0.06, true,
			"settingsScreen/settingsBtn_musicOn.png", "settingsScreen/settingsBtn_musicOn.png", "settingsScreen/settingsBtn_musicOn.png", "click_music_event", null,
			"settingsScreen/settingsBtn_musicOff.png", "settingsScreen/settingsBtn_musicOff.png", "settingsScreen/settingsBtn_musicOff.png", "click_music_event_mute" );
		b.anchor.set( 0.5 );
		b.toggled = !this.managers.audio.tunesMuted;
		b.sfx = "snd_click";
		b.sfxHover = "snd_rollOver";
		this.buttons.push( b );
		this.musicBtn = b;
	}

	// help button
    b = new Button( Button.TYPE_NOLATCH );
    b.create( this.panel, "settingsScreen/settingsBtn_help.png", this.managers, 0.10, -0.06, true,
        "settingsScreen/settingsBtn_help.png", "settingsScreen/settingsBtn_helpDown.png", "settingsScreen/settingsBtn_helpDown.png", "click_help_event" );
    b.anchor.set( 0.5 );
    b.sfx = "snd_click";
    b.sfxHover = "snd_rollOver";
    this.buttons.push( b );

	// quit button
	b = new Button( Button.TYPE_NOLATCH );
	b.create( this.panel, "settingsScreen/settingsBtn_exit.png", this.managers, 0.30, -0.06, true,
		"settingsScreen/settingsBtn_exit.png", "settingsScreen/settingsBtn_exitDown.png", "settingsScreen/settingsBtn_exitDown.png", "click_quit_event" );
	b.anchor.set( 0.5 );
	b.sfx = "snd_click";
	b.sfxHover = "snd_rollOver";
	this.buttons.push( b );

	Options.tweenIn.step = Utils.makeFunctionForSprite( this.panel );
	this.panel.tweener = new Tweenable();
    this.panel.tweener.context = this;
	this.panel.tweener.tween( Options.tweenIn );
	this.removing = false;
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
        this.panel.tweener.context = this;
		this.destroyCallback = _destroyCallback;
	}
};


Options.prototype.destroy = function()
{
	var i;

    if ( Main.debug )
        console.log("Options.destroy");

	Utils.removeBlanker();

	if ( this.destroyCallback )
	{
		this.destroyCallback.call( this );
		this.destroyCallback = null;
	}

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
	Main.swipeEnabled = false;

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
			// show help from Options screen
			this.game.showHelp();
			break;
		}

		case "click_quit_event":
		{
			//this.game.showConfirm( "quit_header_string", this, this.onYesQuit, this.onNoQuit );
            this.onYesQuit();
			break;
		}

		case "click_sound_event":
		{
			this.soundBtn.toggled = false;
			this.managers.audio.setMute( true, false );
            if ( !this.soundAdjustTracked )
            {
                this.soundAdjustTracked = true;
                _gameGATracker("send", "event", Main.VERSION, "sound", "BUBB_HTML5", 1);
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
                _gameGATracker("send", "event", Main.VERSION, "sound", "BUBB_HTML5", 1);
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
                _gameGATracker("send", "event", Main.VERSION, "sound", "BUBB_HTML5", 1);
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
                _gameGATracker("send", "event", Main.VERSION, "sound", "BUBB_HTML5", 1);
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
    start: function() {
        this.context.managers.audio.play( "snd_popup_flying" );
    },
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
    start: function() {
        this.context.managers.audio.play( "snd_popup_flying" );
    },
	finish: function() {
		//console.log("Options tweenout");
		// 'this' is the tweener, context is the BigMessage object
		this.context.doneOut = true;
		if ( this.context )
		{
			this.context.destroy();
			this.context = null;
		}
	}
};
