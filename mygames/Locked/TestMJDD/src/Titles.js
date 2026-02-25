//
// game title screen code and data
//


function Titles( )
{
	this.bg = null;
	this.sprites = null;
	this.buttons = null;
	this.fader = null;
	this.textures = null;
}

Titles.ready = false;


// NOTE: this could be externalised in a JSON data file, but there seems to be little point.
// The effect is highly individual and will need to be fully recreated for any change beyond
// the utterly trivial.
var tt = 800,
	ts = 100;
Titles.pieces = [
	{
		key: "title_panel",
		x: 0,
		y: -90,
		alpha: 0.0,
		fade: 0.05,
	},
	{
		key: "letter_o",
		x: 0 - 290 + 290,
		y: -90 - 90 + 49,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 1.0
			},
			duration: tt + ts * 4,
			easing: 'bounce'
		},
	},
	{
		key: "letter_m",
		x: 0 - 280 + 64,
		y: -90 - 90 + 58,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 0.95
			},
			duration: tt + ts * 0,
			easing: 'bounce'
		},
	},
	{
		key: "letter_a",
		x: 0 - 280 + 119,
		y: -90 - 90 + 58,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 0.95
			},
			duration: tt + ts * 1,
			easing: 'bounce'
		},
	},
	{
		key: "letter_h",
		x: 0 - 280 + 171,
		y: -90 - 90 + 58,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 0.95
			},
			duration: tt + ts * 2,
			easing: 'bounce'
		},
	},
	{
		key: "letter_j",
		x: 0 - 280 + 220,
		y: -90 - 90 + 58,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 0.95
			},
			duration: tt + ts * 3,
			easing: 'bounce'
		},
	},
	{
		key: "letter_n",
		x: 0 - 280 + 347,
		y: -90 - 90 + 58,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 0.95
			},
			duration: tt + ts * 5,
			easing: 'bounce'
		},
	},
	{
		key: "letter_g",
		x: 0 - 280 + 408,
		y: -90 - 90 + 58,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 0.95
			},
			duration: tt + ts * 6,
			easing: 'bounce'
		},
	},
	{
		key: "letter_g",
		x: 0 - 280 + 470,
		y: -90 - 90 + 58,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 0.95
			},
			duration: tt + ts * 7,
			easing: 'bounce'
		},
	},
	{
		key: "title_dimensions",
		x: 0 - 10,
		y: -90 - 90 + 152,
		tween:
		{
			from:
			{
				scaleFactor: 0.25
			},
			to:
			{
				scaleFactor: 1.0
			},
			duration: tt + ts * 8,
			easing: 'bounce'
		},
	},
	{
		key: "menu_play_button",
		x: 4,
		y: 130,
		button:
		{
			over: "menu_play_button_over",
			down: "menu_play_button_down",
			clickEvent: "click_start",
			text: "new_game_start_button_string",
			sfx: "snd_clickPlay",
			sfxHover: "snd_rollOver"
		},
		tween:
		{
			from:
			{
				scaleFactor: 0.15		// 80% rescale: https://basecamp.com/1944514/projects/13440474/todos/304977970
			},
			to:
			{
				scaleFactor: 0.9 * 0.80	// 80% rescale: https://basecamp.com/1944514/projects/13440474/todos/304977970
			},
            finish: function() { Titles.ready = true; },
			duration: tt + ts * 8,
			easing: 'bounce'
		},
	}
];


Titles.prototype.create = function( _preloader )
{
    // titles are not ready until the 'start' button has finished its tween
    Titles.ready = false;

    this.preloader = _preloader;
	this.managers = this.preloader.getManagers();
	
	this.bg = new Sprite();
	this.bg.create( Main.background, "game_title", this.managers.textures );
	this.bg.anchor.set( 0.5, 1.0 );
	this.bg.y = Main.height / 2 / this.bg.parent.scale.y;

	this.version = null;
	this.version = new Text( Main.VERSION, Main.textStyleVersionTiny);
	this.version.anchor.y = 1.0;
	this.version.create( Main.bottomUI, -0.5 + 0.01, 0.493, true );

	Main.fullUIScale = 1.00;
	Main.forceResize = true;

	var r = Tweener.createTweens( Titles.pieces, Main.fullUI, this.managers, 0, 0, Main.textStyleBoldButtonTitles );
	this.sprites = r.sprites;
	this.buttons = r.buttons;
	
	EventHandlers.registerCallback( "mousedown", this.startTune, { context: this } );

	// fade up from black
	this.fader = new FadeState( );
	this.fader.setFade( 0.1 );

	if ( Main.debug )
		console.log( "titles are fading in" );

	// potential framing ad change point
    if ( Main.eventChangeAdOnTitlesShow )
    {
        // ARK_game_arena_connector.fireEventToArena("event_change");
        Main.arenaHelper.sendEventChange();
    }
};


// callback direct from the mouse click event with Titles context
Titles.prototype.startTune = function()
{
    EventHandlers.clearCallback( "mousedown", this.startTune );

    console.log("Titles.startTune");
	if ( this.managers && this.managers.audio )
	{
        // if the audio didn't load yet, try again directly from a mouse event (mobile restriction)
        if ( !this.managers.audio.sfxLoaded() )
        {
            console.log("retry loadAudioAssets from input gesture");
            this.preloader.loadAudioAssets();
        }
        console.log("play the tune...");
		this.managers.audio.startTune( "game_tune" );
	}
};


Titles.prototype.destroy = function()
{
	var i;

	Main.fullUIScale = 1.0;
	Main.forceResize = true;

	if ( this.version )
	{
		this.version.destroy();
		this.version = null;
	}

	if ( this.bg )
	{
		this.bg.destroy();
		this.bg = null;
	}

	if ( this.sprites )
	{
		for ( i = 0; i < this.sprites.length; i++ )
			this.sprites[ i ].destroy();
		this.sprites = null;
	}

	if ( this.buttons )
	{
		for ( i = 0; i < this.buttons.length; i++ )
			this.buttons[ i ].destroy();
		this.buttons = null;
	}

	if ( this.fader )
	{
		this.fader.destroy();
		this.fader = null;
	}

	this.managers = null;
};


Titles.prototype.update = function()
{
	var i;
	var event = "";

	if ( !this.fader.fading() )
	{
		if ( this.fader.reached( 0 ) )
		{
			return false;
		}
	}

	this.bg.alpha = this.fader.fadeValue;
	this.bg.y = Main.height / 2 / this.bg.parent.scale.y;
	this.bg.update();

	// update all the sprites
	if ( this.sprites )
	{
		for ( i = 0; i < this.sprites.length; i++ )
			this.sprites[ i ].update();
	}

	// update all the buttons (up/hover/down state)
	if ( this.buttons && Titles.ready )
	{
		for ( i = 0; i < this.buttons.length; i++ )
		{
			var b = this.buttons[ i ];
			event = b.update();
			if ( event !== null ) break;
		}
	}

	if ( this.version )
	{
		this.version.update();
	}

	if ( this.fader.reached( 1 ) )
	{

        // first time through this will not trigger because ad idleTimer is MAX_VALUE
        // but after the first game, this can trigger ad change if player is idle long enough
        if ( Main.eventChangeAdOnIdle !== 0 )
        {
            Main.idleTimer -= Main.elapsedTime;
            if ( Main.idleTimer < 0 )
            {
                Main.arenaHelper.sendEventChange();
                Main.idleTimer = Number.MAX_VALUE;
            }
        }

		// detect input click or space press
		if ( event == "click_start" || Keys.isPressed[ 32 ] )
		{
            // https://developers.google.com/analytics/devguides/collection/analyticsjs/events
            // ga('send', 'event', [eventCategory], [eventAction], [eventLabel], [eventValue], [fieldsObject]);
            _gameGATracker("send", "event", Main.VERSION, "start_game", "MJDD_HTML5", 1);

            // reset ad idle timer on user interaction
            Main.idleTimer = Main.eventChangeAdOnIdle;

			Main.hover = null;
			Main.click = null;
			Keys.reset( 32 );

			this.fader.setFade( -0.05 );

            // potential framing ad change point
            if ( Main.eventChangeAdOnTitlesClose )
            {
    			// ARK_game_arena_connector.fireEventToArena("event_change");
                Main.arenaHelper.sendEventChange();
            }
            
   			if ( Main.debug )
   				console.log( "Titles: start fading out" );
		}
	}

	return true;
};
