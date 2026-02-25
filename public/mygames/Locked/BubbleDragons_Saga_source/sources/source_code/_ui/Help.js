//
// Help.js
//
// Pete Baron 2018
//
// Help menu for Bubble Dragons
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



function Help( _levelData )
{
    this.levelData = _levelData;
	this.panel = null;
	this.sprites = null;
	this.buttons = null;
	this.texts = null;
	this.page = 0;
    this.title = null;
    this.icon = null;
    this.nameText = null;
    this.nameDesc = null;
    this.nextPageBtn = null;
    this.prevPageBtn = null;
}


// items to display on each 'page' of the help popup
Help.titles = [ "help_title_boost", "help_title_boost", "help_title_boost", "help_title_boost", "help_title_boost",
                "help_title_special", "help_title_special", "help_title_special", "help_title_special", "help_title_special", "help_title_special" ];
Help.names = ["name_boost_mine", "name_boost_wild", "name_boost_fireball", "name_boost_extra_moves", "name_boost_convert_dragon",
                "name_special_bomb", "name_special_rocket", "name_special_frozen_bubble", "name_special_carry_dragon", "name_special_burst_dragon", "name_special_convert_dragon" ];
Help.descriptions = ["desc_boost_mine", "desc_boost_wild", "desc_boost_fireball", "desc_boost_extra_moves", "desc_boost_convert_dragon",
                "desc_special_bomb", "desc_special_rocket", "desc_special_frozen_bubble", "desc_special_carry_dragon", "desc_special_burst_dragon", "desc_special_convert_dragon" ];
Help.icons = ["boostIcon_mine.png", "bble_wild.png", "boostIcon_flame.png", "5plus.png", "boostIcon_bluDrag.png",
                "bomb_spark/bomb00.png", "rocket.png", "frozen01.png", "purple_flying/00.png", "orange_flying/00.png", "blue_flying/00.png" ];
Help.requirements = [ "boost_mine", "boost_wild", "boost_fireball", "boost_extra_moves", "boost_convert_dragon", 
                "special_bomb", "special_rocket", "special_frozen_bubble", "special_carry_dragon", "special_burst_dragon", "special_convert_dragon" ];


Help.prototype.create = function( _managers )
{
	this.managers = _managers;

	this.sprites = [];
	this.buttons = [];
	this.texts = [];

	// add full-screen darkening sprite behind the background
	Utils.addBlanker( this.managers.textures );

	this.panel = new Sprite();
	this.panel.create( Main.fullUI, "popup_large_v03.png", this.managers.textures, 0.0, 0.0, true );
	this.panel.anchor.set( 0.5 );
    this.panel.scale.set( 1.1 );
	this.sprites.push( this.panel );

    var b, s, t;

    // banner background
    s = new Sprite();
    s.create( this.panel, "help_banner.png", this.managers.textures, 0.0, -0.275, true );
    s.anchor.set( 0.5 );
    this.sprites.push( s );

    // banner text
    var style = Main.textStyleBigMessageObjTitle.clone();
    txt = this.managers.locale.get( "help_title_boost" );
    t = new Text( txt, style );
    t.create( this.panel, 0.0, -0.275 + 0.008, true );
    t.anchor.set( 0.5 );
    this.title = t;
    this.texts.push(t);

    // next page button
    b = new Button( Button.TYPE_BUTTON );
    b.create( this.panel, "help_arwRgt.png", this.managers, 0.30, -0.10, true,
        "help_arwRgt.png", "help_arwRgt.png", "help_arwRgt.png", "click_nextPage_event" );
    b.anchor.set( 0.5 );
    b.sfx = "snd_click";
    b.sfxHover = "snd_rollOver";
    this.nextPageBtn = b;
    this.buttons.push( b );

    // previous page button
    b = new Button( Button.TYPE_BUTTON );
    b.create( this.panel, "help_arwLft.png", this.managers, -0.30, -0.10, true,
        "help_arwLft.png", "help_arwLft.png", "help_arwLft.png", "click_prevPage_event" );
    b.anchor.set( 0.5 );
    b.sfx = "snd_click";
    b.sfxHover = "snd_rollOver";
    b.visible = false;          // start on first page, can't go backwards
    this.prevPageBtn = b;
    this.buttons.push( b );

    // boost icon
    s = new Sprite();
    s.create( this.panel, "boostIcon_mine.png", this.managers.textures, 0.0, -0.10, true );
    s.anchor.set( 0.5 );
    s.scale.set( 1.5 );
    this.icon = s;
    this.sprites.push( s );

    // boost name text
    style = Main.textStyleHelpBoostTitle.clone();
    txt = this.managers.locale.get( "name_boost_mine" );
    t = new Text( txt, style );
    t.create( this.panel, 0.0, 0.05, true );
    t.anchor.set( 0.5 );
    this.nameText = t;
    this.texts.push(t);

    // boost description text
    style = Main.textStyleHelpBoostDescription.clone();
    style.wordWrap = true;
    style.wordWrapWidth = 800;
    txt = this.managers.locale.get( "desc_boost_mine" );
    t = new Text( txt, style );
    t.create( this.panel, 0.0, 0.10, true );
    t.anchor.set( 0.5, 0.0 );
    this.nameDesc = t;
    this.texts.push(t);

    // close button
    b = new Button( Button.TYPE_BUTTON );
    b.create( this.panel, "button_close.png", this.managers, 0.412, -0.382, true,       //0.375, -0.348, true,
        "button_close.png", "button_close.png", "button_close.png", "click_close_event" );
    b.anchor.set( 0.5 );
    b.scale.set( 1.05 );
    b.sfx = "snd_click";
    b.sfxHover = "snd_rollOver";
    this.buttons.push( b );

    this.page = this.nextPage( -1 );
    this.showPage();

	Help.tweenIn.step = Utils.makeFunctionForSprite( this.panel );
	this.panel.tweener = new Tweenable();
	this.panel.tweener.tween( Help.tweenIn );
	this.panel.tweener.owner = this.panel;
	this.panel.tweener.context = this;
	this.removing = false;
	// whoosh sound
    this.managers.audio.play( "snd_popup_flying" ); 
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

    if ( this.buttons )
    {
        for ( i = 0; i < this.buttons.length; i++ )
            this.buttons[ i ].destroy();
        this.buttons = null;
    }

	this.managers = null;
    this.title = null;
    this.icon = null;
    this.nameText = null;
    this.nameDesc = null;
    this.nextPageBtn = null;
    this.prevPageBtn = null;

	// force responsive layout in case user changed format behind the help screen
	Main.resized = true;
	Main.resizeConsumed = false;
};


Help.prototype.update = function()
{
	var i, event;

	if ( this.removing )
		return true;

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

    if ( event == "click_prevPage_event" && this.page > 0 )
    {
        this.page = this.previousPage( this.page );
        this.showPage();
    }

    if ( event == "click_nextPage_event" && this.page < Help.icons.length - 1 )
    {
        this.page = this.nextPage( this.page );
        this.showPage();
    }

    if ( event == "click_close_event" )
    {
        Main.resetInput();
        this.managers.audio.play( "snd_popup_flying" ); 
        return false;
    }

	return true;
};


Help.prototype.previousPage = function( _start )
{
    var page = _start;
    do{
        page--;
        if (page < 0)
            return _start;
    }while(!this.validPage(page));
    return page;
};


Help.prototype.nextPage = function( _start )
{
    var page = _start;
    do{
        page++;
        if (page >= Help.icons.length - 1)
            return _start;
    }while(!this.validPage(page));
    return page;
};


Help.prototype.validPage = function( _page )
{
    if ( this.levelData )
    {
        var req = Help.requirements[_page];
        if ( this.levelData.boost.id == req ) return true;
        var list = this.levelData.specials;
        for( var i = 0, l = list.length; i < l; i++)
            if ( list[i][req] !== undefined )
                return true;
        return false;
    }
    return true;
};


Help.prototype.showPage = function()
{
    var title = this.managers.locale.get( Help.titles[this.page] );
    var name = this.managers.locale.get( Help.names[this.page] );
    var desc = this.managers.locale.get( Help.descriptions[this.page] );
    var icon = Help.icons[this.page];

    this.title.text = title;
    this.nameText.text = name;
    this.nameDesc.text = desc;
    this.icon.setFrame( icon );

    this.prevPageBtn.visible = (this.previousPage( this.page ) != this.page);
    this.nextPageBtn.visible = (this.nextPage( this.page ) != this.page);
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
