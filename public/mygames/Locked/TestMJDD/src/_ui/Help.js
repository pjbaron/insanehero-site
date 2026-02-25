//
// Help.js
//
// Pete Baron 2017
//
// Help menu for Mahjongg Dark Dimensions
//
//
// NOTES ABOUT LAYOUT:
// - this game has a very simple draw tree which does not include a great many formatting or layout options
// - display classes can all be found in the _ui folder, eg: Text, Button, CheckBox, BigMessage, etc
// - all display classes have an anchor which specifies the offset into themselves where their x,y coordinates are
// - most display objects can be located at a pixel offset, or a percentage offset from the anchor of their parent
// Example from the create method of this class:
//  t.create( this.panel, -0.30, -0.345, true );
//  t.anchor.set( 0.5, 0.5 );
// The parent is this.panel, the offset is -30% horizontally and -34.5% vertically
// the final boolean specifies to use percentages instead of pixel offsets.
// The anchor point of the text object is its middle.
// This puts the text string "Basic Gameplay" into position for the left tab title.
//
// When using pixel offsets, the 'pixels' referred to are scaled relative to the full-size of the game's background
// image, 1200x900.  So an offset of 600,450 from a parent with anchor point of 0,0, will be in the middle of the
// screen.
//



function Help( )
{
	this.panel = null;
	this.sprites = null;
	this.buttons = null;
	this.texts = null;
	this.tab1 = null;
	this.tab2 = null;
	this.whichTab = 0;
	this.checkBox = null;
}


Help.prototype.create = function( _managers, _playBtn )
{
	this.managers = _managers;

	this.sprites = [];
	this.buttons = [];
	this.texts = [];

	// add full-screen darkening sprite behind the background
	Utils.addBlanker( this.managers.textures );

	// this.bg = new Sprite();
	// this.bg.create( Main.background, "game_title", _managers.textures );
	// this.bg.anchor.set( 0.5, 1.0 );
	// this.bg.y = Main.height / 2 / this.bg.parent.scale.y;

	this.panel = new Sprite();
	this.panel.create( Main.fullUI, "menu_bg", this.managers.textures, 0.0, 0.0, true );
	this.panel.anchor.set( 0.5 );
	this.sprites.push( this.panel );

	// button does not use percentage positioning because that would enable the responsive layout
	// the button must be updated to catch input events
	var b = new Button( Button.TYPE_BUTTON );
	b.create( this.panel, "menu_play_button", this.managers, 0.0, 361, false,
		"menu_play_button", "menu_play_button_over", "menu_play_button_down", "click_event" );
	b.anchor.set( 0.5, 0.5 );
	this.buttons.push( b );
	var t;
	if ( _playBtn )
		t = new Text( this.managers.locale.get( "help_play_string" ), Main.textStyleBoldButtonsLarge );
	else
		t = new Text( this.managers.locale.get( "continue_button_string" ), Main.textStyleBoldButtonsLarge );
	t.create( b, 0.0, 0.0, true );
	t.anchor.set( 0.5, 0.5 );
	b.text = t;
	b.sfx = "snd_clickPlay";
	b.sfxHover = "snd_rollOver";

	b = new Button( Button.TYPE_TOGGLE );
	b.create( this.panel, "menu_tab1_on", this.managers, -0.432, -0.4322, true,
		"menu_tab1_on", "menu_tab1_on", "menu_tab1_on", "click_tab1_event", null,
		"menu_tab1_off", "menu_tab1_off_over", "menu_tab1_off", "click_tab1_event" );
	b.toggled = true;
	this.buttons.push( b );
	this.tab1 = {
		button: b
	};
	b.sfx = "snd_clickPlay";
	b.sfxHover = "snd_rollOver";

	b = new Button( Button.TYPE_TOGGLE );
	b.create( this.panel, "menu_tab2_off", this.managers, -0.175, -0.4322, true,
		"menu_tab2_on", "menu_tab2_on", "menu_tab2_on", "click_tab2_event", null,
		"menu_tab2_off", "menu_tab2_off_over", "menu_tab2_off", "click_tab2_event" );
	b.toggled = false;
	this.buttons.push( b );
	this.tab2 = {
		button: b
	};
	b.sfx = "snd_clickPlay";
	b.sfxHover = "snd_rollOver";

	t = new Text( this.managers.locale.get( "help_page1_text_string" ), Main.textStyleMedium );
	t.create( this.panel, -0.30, -0.345, true );
	t.anchor.set( 0.5, 0.5 );
	this.texts.push( t );

	t = new Text( this.managers.locale.get( "help_page2_text_string" ), Main.textStyleMedium );
	t.create( this.panel, -0.0, -0.345, true );
	t.anchor.set( 0.5, 0.5 );
	this.texts.push( t );

	var c = new CheckBox();
	c.create( this.panel, "menu_check_box", this.managers, 208.0, -315, false,
		"menu_check_box", "menu_check_box_over", "menu_check_box", "check_toggled_event",
		27, 0 );
	c.anchor.set( 0.0, 0.5 );
	c.sfx = "snd_clickPlay";
	c.sfxHover = "snd_rollOver";
	this.buttons.push( c );
	this.checkBox = c;
	c.setCheck( Main.showHelp );

	var style_tiny = Main.textStyleMediumTiny.clone();
	style_tiny.wordWrap = true;
	style_tiny.wordWrapWidth = 170;
	t = new Text( this.managers.locale.get( "help_show_help_string" ), style_tiny );
	t.create( this.panel, 264, -315, false );
	t.anchor.set( 0.0, 0.5 );
	this.texts.push( t );

	//
	// tab1 contents
	//

	this.tab1.list = [];

	var style = Main.textStyleMedium2.clone();
	style.wordWrap = true;
	style.wordWrapWidth = 600;

	t = new Text( this.managers.locale.get( "help_page1_text1_string" ), style );
	t.create( this.panel, -0.1, -0.24, true );
	t.anchor.set( 0.0, 0.0 );
	this.texts.push( t );
	this.tab1.list.push( t );

	var s = new Sprite();
	s.create( this.panel, "menu_matching_rules", this.managers.textures, -0.28, -0.15, true );
	s.anchor.set( 0.5, 0.5 );
	s.scale.set( 0.60, 0.60 );
	this.sprites.push( s );
	this.tab1.list.push( s );

	s = new Sprite();
	s.create( this.panel, "time_icon", this.managers.textures, 0.24, 0.02, true );
	s.anchor.set( 0.5, 0.5 );
	s.scale.set( 0.75, 0.75 );
	this.sprites.push( s );
	this.tab1.list.push( s );

	t = new Text( "2:55", Main.textStyleSemiBold );
	t.create( this.panel, 0.28, 0.02, true );
	t.anchor.set( 0.0, 0.5 );
	this.texts.push( t );
	this.tab1.list.push( t );

	var style2 = style.clone();
	style2.wordWrapWidth = 700;

	t = new Text( this.managers.locale.get( "help_page1_text2_string" ), style2 );
	t.create( this.panel, -0.4, -0.02, true );
	t.anchor.set( 0.0, 0.0 );
	this.texts.push( t );
	this.tab1.list.push( t );

	s = new Sprite();
	s.create( this.panel, "rotate_lft_button", this.managers.textures, -0.34, 0.20, true );
	s.anchor.set( 0.5, 0.5 );
	s.scale.set( 0.4, 0.4 );
	this.sprites.push( s );
	this.tab1.list.push( s );

	s = new Sprite();
	s.create( this.panel, "rotate_rgt_button", this.managers.textures, -0.18, 0.20, true );
	s.anchor.set( 0.5, 0.5 );
	s.scale.set( 0.4, 0.4 );
	this.sprites.push( s );
	this.tab1.list.push( s );

	t = new Text( this.managers.locale.get( "help_page1_text3_string" ), style );
	t.create( this.panel, -0.1, 0.14, true );
	t.anchor.set( 0.0, 0.0 );
	this.texts.push( t );
	this.tab1.list.push( t );


	//
	// tab2 contents
	//

	this.tab2.list = [];

	s = new Sprite();
	s.create( this.panel, "menu_speedmatch", this.managers.textures, -0.305, -0.20, true );
	s.anchor.set( 0.5, 0.5 );
	s.scale.set( 0.75, 0.75 );
	this.sprites.push( s );
	this.tab2.list.push( s );

	t = new Text( this.managers.locale.get( "help_page2_text1_string" ), style2 );
	t.create( this.panel, -0.2, -0.20 - 0.04, true );
	t.anchor.set( 0.0, 0.0 );
	this.texts.push( t );
	this.tab2.list.push( t );

	s = new Sprite();
	s.create( this.panel, "menu_multimatch", this.managers.textures, -0.305, -0.015, true );
	s.anchor.set( 0.5, 0.5 );
	s.scale.set( 0.75, 0.75 );
	this.sprites.push( s );
	this.tab2.list.push( s );

	t = new Text( this.managers.locale.get( "help_page2_text2_string" ), style2 );
	t.create( this.panel, -0.2, -0.015 - 0.04, true );
	t.anchor.set( 0.0, 0.0 );
	this.texts.push( t );
	this.tab2.list.push( t );

    s = new Sprite();
    s.create( this.panel, "menu_timebonus", this.managers.textures, -0.305, 0.17, true );
    s.anchor.set( 0.5, 0.5 );
    s.scale.set( 0.75, 0.75 );
    this.sprites.push( s );
    this.tab2.list.push( s );

    t = new Text( this.managers.locale.get( "help_page2_text6_string" ), style2 );
    t.create( this.panel, -0.2, 0.17 - 0.04, true );
    t.anchor.set( 0.0, 0.0 );
    this.texts.push( t );
    this.tab2.list.push( t );

	var style3 = style2.clone();
	style3.wordWrapWidth = 900;
	t = new Text( this.managers.locale.get( "help_page2_text5_string" ), style3 );
	t.create( this.panel, 0.0, 0.25, true );
	t.anchor.set( 0.5, 0.0 );
	this.texts.push( t );
	this.tab2.list.push( t );

	// hide tab2 contents, we're showing tab1 by default
	this.showTab( 1, false );

	Help.tweenIn.step = Utils.makeFunctionForSprite( this.panel );
	this.panel.tweener = new Tweenable();
	this.panel.tweener.tween( Help.tweenIn );
	this.panel.tweener.owner = this.panel;
	this.panel.tweener.context = this;
	this.removing = false;
	// whoosh sound
	this.managers.audio.play( "snd_rotate" );	
};


Help.prototype.remove = function( _destroyCallback )
{
	if ( !this.removing )
	{
		this.removing = true;
		if ( Main.debug )
			console.log("Help.remove");
		Help.tweenOut.step = Utils.makeFunctionForSprite( this.panel );
		this.panel.tweener.tween( Help.tweenOut );
		this.panel.tweener.owner = this;
		this.destroyCallback = _destroyCallback;
	}
};


Help.prototype.destroy = function()
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

	this.tab1 = this.tab2 = null;
	this.managers = null;

	// force responsive layout in case user changed format behind the help screen
	Main.resized = true;
	Main.resizeConsumed = false;
};


Help.prototype.update = function()
{
	var i, event;

	if ( this.removing )
		return true;

	// this.bg.y = Main.height / 2 / this.bg.parent.scale.y;
	// this.bg.update();

	// update panel sprite to be responsive
	// (everything else is drawn ON the panel sprite so it transform with the bg automatically)
	this.panel.update();

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

	// handle play button click or space press
	if ( event == "click_event" || Keys.isPressed[ 32 ] )
	{
		Main.resetInput();
		return false;
	}

	if ( event == "check_toggled_event" )
	{
		Main.showHelp = this.checkBox.checked;
		this.managers.preloader.loadManager.saveGameStatus();
	}

	// handle tab click event if the tab is not active
	if ( ( event == "click_tab1_event" && !this.tab1.button.toggled ) ||
		( event == "click_tab2_event" && !this.tab2.button.toggled ) )
	{
		this.tab2.button.toggled = this.tab1.button.toggled;
		this.tab1.button.toggled = !this.tab1.button.toggled;
		// show appropriate tab contents
		this.showTab( this.tab1.button.toggled ? 1 : 0, false );
		this.showTab( this.tab1.button.toggled ? 0 : 1, true );
	}

	return true;
};


Help.prototype.showTab = function( _which, _visible )
{
	var list = _which === 0 ? this.tab1.list : this.tab2.list;

	if ( list )
	{
		for ( var i = 0; i < list.length; i++ )
			list[ i ].visible = _visible;
	}
};


var htt = 350;
Help.tweenIn =
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
	duration: htt,
	easing: 'easeInQuad',	//'bounce',
	step: null,
	finish: function() {
		//console.log("Help tweenin");
	}
};


Help.tweenOut =
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
	duration: htt,
	easing: 'easeFrom',
	step: null,
	finish: function() {
		//console.log("Help tweenout");
		// 'this' is the tweener, context is the BigMessage object
		this.context.doneOut = true;
		if ( this.owner )
		{
			this.owner.destroy();
			this.owner = null;
		}
	}
};
