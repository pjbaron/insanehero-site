//
// BigMessage.js
//
// Pete Baron 2017
//
// large fly-out panel with large font message on it
//



function BigMessage()
{
	this.parent = null;
	this.managers = null;
	this.bg = null;
    this.texts = null;
    this.icon = null;
    //this.frame = null;
    this.underline = null;
    this.fields = null;
	this.buttons = null;
	this.callback = null;
	this.context = null;
	this.removeContext = null;
	this.removeArgument = null;
	this.timeOut = 0;
	this.doneIn = false;
	this.doneOut = false;
	this.buttonPressed = 0;
	this.removing = false;
	this.removeAfterClick = true;
    this.adShown = false;
    this.star1 = this.star2 = this.star3 = null;
}


/// build the normal popup background (level start, level complete, etc)
BigMessage.prototype.create = function( _parent, _managers, _message, _callback, _context, _title, _icon, _iconx, _icony )
{
    this.parent = _parent;
    this.managers = _managers;
    this.texts = [];

    Utils.addBlanker( this.managers.textures );

    this.bg = new Sprite();
    this.bg.create( this.parent, "popup_small_v03.png", this.managers.textures );
    this.bg.anchor.set( 0.5, 0.5 );

    this._create( _parent, _managers, _message, _callback, _context, _title, _icon, _iconx, _icony );
};


/// build the level won popup background
BigMessage.prototype.createLevelWon = function( _parent, _managers, _title, _message, _message2 )
{
    this.parent = _parent;
    this.managers = _managers;
    this.texts = [];

    Utils.addBlanker( this.managers.textures );

    this.bg = new Sprite();
    this.bg.create( this.parent, "popup_small_v03.png", this.managers.textures );
    this.bg.anchor.set( 0.5, 0.5 );

// this._create( _parent, _managers, _message, _callback, _context, _title, _icon, _iconx, _icony );

    this.timeOut = 0;
    this.doneIn = this.doneOut = false;
    this.removing = false;
    this.removeAfterClick = true;
    this.adShown = false;

    this.buttons = [];
    this.buttonPressed = 0;

    var style, txt, s;

    if ( _title )
    {
        style = Main.textStyleBigMessageTitle.clone();
        style.wordWrapWidth = 800;
        style.wordWrap = true;
        txt = this.managers.locale.get( _title ) || _title;
        t = new Text( txt, style );
        t.create( this.bg, 0.0, -0.2, true );
        t.anchor.set( 0.5, 0.5 );
        this.texts.push(t);
    }

    // localise _message if possible, otherwise the _message is the message
    style = Main.textStyleBigMessage.clone();
    style.wordWrapWidth = 800;
    style.wordWrap = true;
    txt = this.managers.locale.get( _message ) || _message;
    t = new Text( txt, style );
    t.create( this.bg, 0.0, -0.1, true );
    t.anchor.set( 0.5, 0.0 );
    this.texts.push(t);

    if ( _message2)
    {
        // localise _message if possible, otherwise the _message is the message
        style = Main.textStyleMediumMessage.clone();
        style.wordWrapWidth = 800;
        style.wordWrap = true;
        txt = this.managers.locale.get( _message2 ) || _message2;
        t = new Text( txt, style );
        t.create( this.bg, 0.0, 0.05, true );
        t.anchor.set( 0.5, 0.0 );
        this.texts.push(t);
    }

    if ( !Main.challengeMode )
    {
        var delay = 0;
        var _this = this;

        s = new Sprite();
        if ( Game.stars > 0 )
        {
            s.create( this.bg, "hud_star.png", this.managers.textures, -0.16, 0.13, true );
            s.scale.set( 3.0 );
            s.visible = false;
            this.managers.audio.playDelayed("snd_rainbow", delay, function() { _this.star1.visible = true; } );
            delay += 0.7;
        }
        else
        {
            s.create( this.bg, "hud_stargrey.png", this.managers.textures, -0.16, 0.13, true );
            s.scale.set( 1.5 );
        }
        s.anchor.set( 0.5 );
        this.star1 = s;

        s = new Sprite();
        if ( Game.stars > 1 )
        {
            s.create( this.bg, "hud_star.png", this.managers.textures, 0.0, 0.13, true );
            s.scale.set( 3.4 );
            s.visible = false;
            this.managers.audio.playDelayed("snd_rainbow", delay, function() { _this.star2.visible = true; } );
            delay += 0.7;
        }
        else
        {
            s.create( this.bg, "hud_stargrey.png", this.managers.textures, 0.0, 0.13, true );
            s.scale.set( 1.7 );
        }
        s.anchor.set( 0.5 );
        this.star2 = s;

        s = new Sprite();
        if ( Game.stars > 2 )
        {
            s.create( this.bg, "hud_star.png", this.managers.textures, 0.16, 0.13, true );
            s.scale.set( 3.8 );
            s.visible = false;
            this.managers.audio.playDelayed("snd_rainbow", delay, function() { _this.star3.visible = true; } );
        }
        else
        {
            s.create( this.bg, "hud_stargrey.png", this.managers.textures, 0.16, 0.13, true );
            s.scale.set( 1.9 );
        }
        s.anchor.set( 0.5 );
        this.star3 = s;
    }

    BigMessage.tweenIn.step = Utils.makeFunctionForSprite( this.bg );
    this.bg.tweener = new Tweenable();
    this.bg.tweener.owner = this.bg;
    this.bg.tweener.context = this;
    this.bg.tweener.tween( BigMessage.tweenIn );
};


/// build the level objective popup background (level start, level complete, etc)
BigMessage.prototype.createObjective = function( _parent, _managers, _message, _title, _icon )
{
    var style, txt, s;

    this.parent = _parent;
    this.managers = _managers;
    this.texts = [];

    Utils.addBlanker( this.managers.textures );

    this.bg = new Sprite();
    this.bg.create( this.parent, "popup_small_v03.png", this.managers.textures );
    this.bg.anchor.set( 0.5 );

    // s = new Sprite();
    // s.create( this.bg, "popup_small_frame.png", this.managers.textures );
    // s.anchor.set( 0.5 );
    // this.frame = s;

    s = new Sprite();
    s.create( this.bg, _icon, this.managers.textures, -0.225, -0.03, true );
    s.anchor.set( 0.5 );
    s.scale.set( 1.60 );
    this.icon = s;

    this.timeOut = 0;
    this.doneIn = this.doneOut = false;
    this.removing = false;
    this.removeAfterClick = true;
    this.adShown = false;

    this.buttons = [];
    this.buttonPressed = 0;

    style = Main.textStyleBigMessageObjTitle.clone();
    style.wordWrapWidth = 800;
    style.wordWrap = true;
    txt = this.managers.locale.get( _title ) || _title;
    t = new Text( txt, style );
    t.create( this.bg, -0.1, -0.18, true );
    t.anchor.set( 0.0, 0.5 );
    this.texts.push(t);

    s = new Sprite();
    s.create( this.bg, "hud_line2px.png", this.managers.textures, -0.1, -0.11, true );
    s.anchor.set( 0, 0.5 );
    s.scale.set( 0.9, 1.0 );
    this.underline = s;

    // localise _message if possible, otherwise the _message is the message
    style = Main.textStyleBigMessageObjective.clone();
    style.wordWrapWidth = 800;
    style.wordWrap = true;
    txt = this.managers.locale.get( _message ) || _message;
    t = new Text( txt, style );
    t.create( this.bg, -0.1, 0.0, true );
    t.anchor.set( 0.0, 0.5 );
    this.texts.push(t);

    BigMessage.tweenIn.step = Utils.makeFunctionForSprite( this.bg );
    this.bg.tweener = new Tweenable();
    this.bg.tweener.owner = this.bg;
    this.bg.tweener.context = this;
    this.bg.tweener.tween( BigMessage.tweenIn );
};


/// build the win/lose popup background
BigMessage.prototype.createWinLose = function( _parent, _managers, _message, _subText, _showHighscore, _showRetryQuit )
{
    if ( Main.debug )
        console.log("BigMessage _subText = " + _subText + " shotsLeft = " + Game.shotsLeft);

    var style, txt, s, b;

    this.parent = _parent;
    this.managers = _managers;
    this.texts = [];

    Utils.addBlanker( this.managers.textures );

    this.bg = new Sprite();
    this.bg.create( this.parent, "popup_large_v03.png", this.managers.textures );
    this.bg.anchor.set( 0.5 );

    // localise _message if possible, otherwise the _message is the message
    style = Main.textStyleBigMessage.clone();
    style.wordWrapWidth = 800;
    style.wordWrap = true;
    txt = this.managers.locale.get( _message ) || _message;
    t = new Text( txt, style );
    t.create( this.bg, 0.0, -0.24, true );
    t.anchor.set( 0.5 );
    this.texts.push(t);

    // yellow text explanation of how you lost
    if ( _subText )
    {
        // change the explanation if we ran out of shots
        if ( Game.shotsLeft <= 0 )
            _subText = "string_level_out_of_shots";
        style = Main.textStyleBigMessageSubText.clone();
        style.wordWrapWidth = 800;
        style.wordWrap = true;
        if ( Main.debug )
            console.log("BigMessage _subText = " + _subText);
        txt = this.managers.locale.get( _subText ) || _subText;
        t = new Text( txt, style );
        t.create( this.bg, 0.0, 0.030, true );
        t.anchor.set( 0.5, 0.0 );
        this.texts.push(t);
    }

    // score digit field background
    s = new Sprite();
    s.create( this.bg, "field_01.png", this.managers.textures, 0, 0.02, true );
    s.anchor.set( 0.5 );
    s.scale.set( 1.0 );
    this.fields = [ s ];

    // "score" above field
    style = Main.textStyleMediumMessage.clone();
    style.wordWrapWidth = 800;
    style.wordWrap = true;
    txt = this.managers.locale.get( "string_score" );
    t = new Text( txt, style );
    t.create( s, 0.0, -0.14, true );
    t.anchor.set( 0.5, 1.0 );
    this.texts.push(t);

    // score digits
    style = Main.textStyleBigMessage.clone();
    style.wordWrapWidth = 800;
    style.wordWrap = true;
    txt = Utils.formatBigNumber(Game.score);
    t = new Text( txt, style );
    t.create( s, 0.0, -0.08, true );
    t.anchor.set( 0.5 );
    this.texts.push(t);

    if ( _showHighscore )
    {
        // highscore digit field background
        s = new Sprite();
        s.create( this.bg, "field_01.png", this.managers.textures, 0, 0.02 + 0.20, true );
        s.anchor.set( 0.5 );
        s.scale.set( 1.0 );
        this.fields.push( s );

        // "high score" above field
        style = Main.textStyleMediumMessage.clone();
        style.wordWrapWidth = 800;
        style.wordWrap = true;
        txt = this.managers.locale.get( "string_high_score" );
        t = new Text( txt, style );
        t.create( s, 0.0, -0.14, true );
        t.anchor.set( 0.5, 1.0 );
        this.texts.push(t);

        // highscore digits
        txt = Utils.formatBigNumber(Game.highScore);
        style = Main.textStyleBigMessage.clone();
        t = new Text( txt, style );
        t.create( s, 0.0, -0.08, true );
        t.anchor.set( 0.5 );
        this.texts.push(t);
    }

    this.timeOut = 0;
    this.doneIn = this.doneOut = false;
    this.removing = false;
    this.removeAfterClick = true;
    this.adShown = false;

    this.buttons = [];
    this.buttonPressed = 0;

    if ( _showRetryQuit )
    {
        b = this.addButton( "string_quit", "click_quit_event", -200, 200 );
        b.scale.set( 0.65 );
        b = this.addButton( "string_retry", "click_retry_event", 200, 200 );
        b.scale.set( 0.65 );
    }

    BigMessage.tweenIn.step = Utils.makeFunctionForSprite( this.bg );
    this.bg.tweener = new Tweenable();
    this.bg.tweener.owner = this.bg;
    this.bg.tweener.context = this;
    this.bg.tweener.tween( BigMessage.tweenIn );
};


/// helper to build all types of popup backgrounds
BigMessage.prototype._create = function( _parent, _managers, _message, _callback, _context, _title, _icon, _iconx, _icony )
{
	this.callback = _callback || null;
	this.context = _context || null;

	this.timeOut = 0;
	this.doneIn = this.doneOut = false;
	this.removing = false;
	this.removeAfterClick = true;
    this.adShown = false;
    this.star1 = this.star2 = this.star3 = null;

	this.buttons = [];
	this.buttonPressed = 0;

    var style, txt, s;

    if ( _title )
    {
        style = Main.textStyleBigMessageTitle.clone();
        style.wordWrapWidth = 800;
        style.wordWrap = true;
        txt = this.managers.locale.get( _title ) || _title;
        t = new Text( txt, style );
        t.create( this.bg, 0.0, -0.2, true );
        t.anchor.set( 0.5, 0.5 );
        this.texts.push(t);
    }

    // localise _message if possible, otherwise the _message is the message
    style = Main.textStyleBigMessage.clone();
    style.wordWrapWidth = 800;
    style.wordWrap = true;
    txt = this.managers.locale.get( _message ) || _message;
    t = new Text( txt, style );
    t.create( this.bg, 0.0, 0.0, true );
    t.anchor.set( 0.5, 0.5 );
    this.texts.push(t);

    if ( _icon )
    {
        s = new Sprite();
        s.create( this.bg, _icon, this.managers.textures, _iconx, _icony, true );
        s.anchor.set( 0.5 );
        this.icon = s;
    }

	BigMessage.tweenIn.step = Utils.makeFunctionForSprite( this.bg );
	this.bg.tweener = new Tweenable();
    this.bg.tweener.owner = this.bg;
    this.bg.tweener.context = this;
	this.bg.tweener.tween( BigMessage.tweenIn );
};


BigMessage.prototype.addButton = function( _text, _event, _x, _y )
{
	// the button must be updated to catch input events
	var b = new Button( Button.TYPE_BUTTON );
	b.create( this.bg, "menu_play_button", this.managers, _x || 0, _y || 340, false,
		"menu_play_button", "menu_play_button", "menu_play_button", _event || "click1_event" );
	b.anchor.set( 0.5, 0.5 );
	var t = new Text( this.managers.locale.get( _text ), Main.textStyleBoldButtonsLarge );
	t.create( b, 0.0, 0.0, true );
	t.anchor.set( 0.5, 0.5 );
	b.text = t;
	b.sfx = "snd_click";
	this.buttons.push( b );

    return b;
};


BigMessage.prototype.addButtons = function( _text1, _text2, _removeAfter )
{
	this.removeAfterClick = _removeAfter;

	var b = new Button( Button.TYPE_BUTTON );
	b.create( this.bg, "menu_play_button", this.managers, -200, 340, false,
		"menu_play_button", "menu_play_button_over", "menu_play_button_down", "click1_event" );
	b.anchor.set( 0.5, 0.5 );
	var t = new Text( this.managers.locale.get( _text1 ), Main.textStyleBoldButtonsLarge );
	t.create( b, 0.0, 0.0, true );
	t.anchor.set( 0.5, 0.5 );
	b.text = t;
	b.sfx = "snd_click";
	this.buttons.push( b );

	b = new Button( Button.TYPE_BUTTON );
	b.create( this.bg, "menu_play_button", this.managers, 200, 340, false,
		"menu_play_button", "menu_play_button_over", "menu_play_button_down", "click2_event" );
	b.anchor.set( 0.5, 0.5 );
	t = new Text( this.managers.locale.get( _text2 ), Main.textStyleBoldButtonsLarge );
	t.create( b, 0.0, 0.0, true );
	t.anchor.set( 0.5, 0.5 );
	b.text = t;
	b.sfx = "snd_click";
	this.buttons.push( b );
};


BigMessage.prototype.remove = function( _context, _argument )
{
	if ( !this.removing )
	{
		if ( this.bg && this.bg.tweener )
		{
			this.bg.tweener.stop();
			this.bg.tweener.owner = null;
			this.bg.tweener.context = null;
		}

		this.removing = true;
        if ( this.bg )
        {
            BigMessage.tweenOut.step = Utils.makeFunctionForSprite( this.bg );
            this.bg.tweener.owner = this;
            this.bg.tweener.context = this;
    		this.bg.tweener.tween( BigMessage.tweenOut );
        }
		this.removeContext = _context || null;
		this.removeArgument = _argument || null;

		return true;
	}

	return false;
};


BigMessage.prototype.destroy = function()
{
	var i, l;

	Utils.removeBlanker();

	if ( this.buttons )
	{
		for ( i = 0, l = this.buttons.length; i < l; i++ )
			this.buttons[i].destroy();
	}
	this.buttons = null;

	if ( this.bg && this.bg.tweener )
	{
		this.bg.tweener.stop();
		this.bg.tweener.owner = null;
		this.bg.tweener.context = null;
	}

	if ( this.bg )
		this.bg.destroy();
	this.bg = null;

    if ( this.icon )
        this.icon.destroy();
    this.icon = null;

    // if ( this.frame )
    //     this.frame.destroy();
    // this.frame = null;

    if ( this.underline )
        this.underline.destroy();
    this.underline = null;

    if ( this.texts )
    {
        for( i = 0, l = this.texts.length; i < l; i++ )
            this.texts[i].destroy();
    }
    this.texts = null;

    if ( this.fields )
    {
        for( i = 0, l = this.fields.length; i < l; i++ )
            this.fields[i].destroy();
    }
    this.fields = null;

	this.managers = null;
	this.parent = null;
	this.callback = null;
	this.context = null;
	this.removeContext = null;
	this.removeArgument = null;

	this.removing = false;

    // reset the idle timer after each popup
    Main.idleTimer = Main.eventChangeAdOnIdle;
};


// argument to BigMessage.update is the name of the owning parameter in it's parent scope
// if specified it is used to self-delete after a tweening destruction sequence
BigMessage.prototype.update = function( _argument )
{
    var e;

	// wait for tween in to finish
	if ( this.doneIn )
	{
        // star scaling on SagaMode end of level popup
        if ( this.star1 && this.star1.visible && this.star1.scale.x > 1.5 )
        {
            this.star1.scale.set( this.star1.scale.x * 0.97 );
            if ( this.star1.scale.x < 1.5 ) this.star1.scale.set( 1.5 );
            e = World.effects.add( Effects.STAR, this.star1.parent, this.star1.x, this.star1.y, Effects.starFall, World.effects, false, false );
            if ( e )
            {
                e.vx = Math.random() * 400 - 200;
                e.vy = Math.random() * -400 - 300;
                e.life = Math.random() * 20 + 20;
            }
        }
        if ( this.star2 && this.star2.visible && this.star2.scale.x > 1.7 )
        {
            this.star2.scale.set( this.star2.scale.x * 0.97 );
            if ( this.star2.scale.x < 1.7 ) this.star2.scale.set( 1.7 );
            e = World.effects.add( Effects.STAR, this.star2.parent, this.star2.x, this.star2.y, Effects.starFall, World.effects, false, false );
            if ( e )
            {
                e.vx = Math.random() * 500 - 250;
                e.vy = Math.random() * -500 - 300;
                e.life = Math.random() * 20 + 25;
            }
        }
        if ( this.star3 && this.star3.visible && this.star3.scale.x > 1.9 )
        {
            this.star3.scale.set( this.star3.scale.x * 0.97 );
            if ( this.star3.scale.x < 1.9 ) this.star3.scale.set( 1.9 );
            e = World.effects.add( Effects.STAR, this.star3.parent, this.star3.x, this.star3.y, Effects.starFall, World.effects, false, false );
            if ( e )
            {
                e.vx = Math.random() * 600 - 300;
                e.vy = Math.random() * -600 - 300;
                e.life = Math.random() * 20 + 30;
            }
        }

        if ( Main.eventChangeAdOnPopup && !this.adShown )
        {
            // potential framing ad change point
            //ARK_game_arena_connector.fireEventToArena("event_change");
            Main.arenaHelper.sendEventChange();
            this.adShown = true;

            // popup must show for at least 2 seconds
            // https://trello.com/c/JS6UhVda/89-mjd-implement-standard-ad-rules-and-make-a-new-release-build
            if ( this.timeOut < 2000 )
                this.timeOut = 2000;
        }

		// perform callback once only
		if ( this.context && this.callback )
		{
			this.callback.call( this.context );
			this.callback = null;
		}

        // don't timeOut if there are buttons to be pressed...
		if ( this.timeOut && (!this.buttons || this.buttons.length === 0) )
		{
			this.timeOut -= Main.elapsedTime;
			if ( this.timeOut <= 0 )
			{
				this.timeOut = 0;
				this.remove( this.context, _argument );
			}
		}

		if ( this.buttons )
		{
			var i, l, event;

			for ( i = 0, l = this.buttons.length; i < l; i++ )
			{
				event = this.buttons[i].update();

				// fading buttons can't trigger events
				if ( this.buttons[i].alpha != 1 )
					event = null;

				if ( event ) break;
			}

			if ( event == "click1_event" )
			{
				this.timeOut = 0;
				this.buttonPressed = 1;

				// normally a button click will remove the message panel with a tween
				// but if removeAfterClick is false it will remain, and this update
				// will return false immediately (instead of after the tween-out)
				if ( this.removeAfterClick )
					this.remove( this.context, _argument );
				else
					return false;
			}
			else if ( event == "click2_event" )
			{
				this.timeOut = 0;
				this.buttonPressed = 2;
				if ( this.removeAfterClick )
					this.remove( this.context, _argument );
				else
					return false;
			}
            else if ( event == "click_quit_event" )
            {
                return "quit";
            }
            else if ( event == "click_retry_event" )
            {
                return "retry";
            }
		}
	}

	return !this.doneOut;
};


BigMessage.prototype.fadeButtons = function( _speed )
{
	for(var i = 0, l = this.buttons.length; i < l; i++)
	{
		// Sprite.prototype.addFader = function( _dir, _start, _callback, _context, _args, _trigger )
		this.buttons[i].addFader( _speed || -0.02, 1 );
	}
};


var tt = 300;
BigMessage.tweenIn =
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
		this.context.doneIn = true;
	}
};


BigMessage.tweenOut =
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
		// 'this' is the tweener, context is the BigMessage object
		this.context.doneOut = true;
		if ( this.owner )
		{
			if ( this.owner.removeContext && this.owner.removeArgument )
				this.owner.removeContext[this.owner.removeArgument] = null;
			this.owner.destroy();
			this.owner = null;
		}
	}
};


