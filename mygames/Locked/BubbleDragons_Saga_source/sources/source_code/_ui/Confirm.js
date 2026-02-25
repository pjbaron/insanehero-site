//
// Confirm menu for Main
//
// Pete Baron 2017
//



function Confirm( )
{
	// this.blanker = null;
	this.panel = null;
	this.sprites = null;
	this.buttons = null;
	this.texts = null;
}


Confirm.prototype.create = function( _game, _managers, _message, _context, _onYes, _onNo )
{
	Main.swipeEnabled = false;

	this.game = _game;
	this.managers = _managers;
	this.context = _context;
	this.onYes = _onYes;
	this.onNo = _onNo;

	this.sprites = [];
	this.buttons = [];
	this.texts = [];

	// add full-screen darkening sprite behind the background
	// this.blanker = new Sprite();
	// this.blanker.create( Main.fullUI, "blanker", this.managers.textures, 0, 0 );
	// this.blanker.anchor.set( 0.5 );
	// this.blanker.scale.set( 4.0 );

	this.bg = new Sprite();
	this.bg.create( Main.bgImage, "game_title", _managers.textures );
	this.bg.anchor.set( 0.5, 1.0 );
	this.bg.y = Main.height / 2 / this.bg.parent.scale.y;

	this.panel = new Sprite();
	this.panel.create( Main.fullUI, "menu_bg", this.managers.textures, 0.0, 0.0, true );
	this.panel.anchor.set( 0.5 );
	this.sprites.push( this.panel );

	// button does not use percentage positioning because that would enable the responsive layout
	// the button must be updated to catch input events
	var b = new Button( Button.TYPE_BUTTON );
	b.create( this.panel, "menu_play_button", this.managers, -0.20, 0.20, true,
		"menu_play_button", "menu_play_button_over", "menu_play_button_down", "click_yes_event" );
	b.anchor.set( 0.5, 0.5 );
	b.scale.set( 1.0 );
	var t = new Text( this.managers.locale.get("quit_yes_button_string"), Main.textStyleBoldButtons );
	t.create( b, 0.0, 0.0, true );
	t.anchor.set( 0.5, 0.5 );
	b.text = t;
	b.sfx = "snd_click";
	b.sfxHover = "snd_rollOver";
	this.buttons.push( b );

	b = new Button( Button.TYPE_BUTTON );
	b.create( this.panel, "menu_play_button", this.managers, 0.20, 0.20, true,
		"menu_play_button", "menu_play_button_over", "menu_play_button_down", "click_no_event" );
	b.anchor.set( 0.5, 0.5 );
	b.scale.set( 1.0 );
	t = new Text( this.managers.locale.get("quit_no_button_string"), Main.textStyleBoldButtons );
	t.create( b, 0.0, 0.0, true );
	t.anchor.set( 0.5, 0.5 );
	b.text = t;
	b.sfx = "snd_click";
	b.sfxHover = "snd_rollOver";
	this.buttons.push( b );

	var style = Main.textStyleBold.clone();
	style.wordWrap = true;
	style.wordWrapWidth = 800;
	t = new Text( this.managers.locale.get(_message), style );
	t.create( this.panel, 0.0, -0.10, true );
	t.anchor.set( 0.5, 0.5 );
	this.texts.push( t );

	_gameGATracker("send", "pageview", {"page":"/ExitGamePopup"});
};




Confirm.prototype.destroy = function()
{
	var i;

	if ( this.bg )
	{
		this.bg.destroy();
		this.bg = null;
	}

	if ( this.panel )
	{
		this.panel.destroy( { children: true } );
		this.panel = null;
	}

	if ( this.sprites )
	{
		for ( i = 0; i < this.sprites.length; i++ )
			this.sprites[ i ].destroy();
		this.sprites = null;
	}

	if ( this.texts )
	{
		for ( i = 0; i < this.texts.length; i++ )
			this.texts[ i ].destroy();
		this.texts = null;
	}

	this.managers = null;
	this.context = null;
	this.onYes = null;
	this.onNo = null;

	// force responsive layout in case user changed format behind the help screen
	Main.resized = true;
	Main.resizeConsumed = false;
	Main.swipeEnabled = false;
};


Confirm.prototype.update = function()
{
	var i, event;

	this.bg.y = Main.height / 2 / this.bg.parent.scale.y;
	this.bg.update();

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

	// handle yes button
	if ( event == "click_yes_event" )
	{
		Main.click = null;
		this.onYes.call( this.context );
		return false;
	}

	// handle no button
	if ( event == "click_no_event" )
	{
		Main.click = null;
		this.onNo.call( this.context );
		return false;
	}

	return true;
};
