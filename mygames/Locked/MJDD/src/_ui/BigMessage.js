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
	this.text = null;
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
}


BigMessage.prototype.create = function( _parent, _managers, _message, _callback, _context )
{
	this.parent = _parent;
	this.managers = _managers;
	this.callback = _callback || null;
	this.context = _context || null;

	this.timeOut = 0;
	this.doneIn = this.doneOut = false;
	this.removing = false;
	this.removeAfterClick = true;
    this.adShown = false;

	this.buttons = [];
	this.buttonPressed = 0;

	Utils.addBlanker( this.managers.textures );

	this.bg = new Sprite();
	this.bg.create( this.parent, "menu_popup_bg", this.managers.textures );
	this.bg.anchor.set( 0.5, 0.5 );

	// localise _message if possible, otherwise the _message is the message
	var style = Main.textStyleBoldHugeCentered.clone();
	style.wordWrapWidth = 800;
	var t = this.managers.locale.get( _message ) || _message;
	this.text = new Text( t, style );
	this.text.create( this.bg, 0.0, 0.0, true );
	this.text.anchor.set( 0.5, 0.5 );

	BigMessage.tweenIn.step = Utils.makeFunctionForSprite( this.bg );
	this.bg.tweener = new Tweenable();
	this.bg.tweener.tween( BigMessage.tweenIn );
	this.bg.tweener.owner = this.bg;
	this.bg.tweener.context = this;

	// whoosh sound
	this.managers.audio.play( "snd_rotate" );
};


BigMessage.prototype.addButton = function( _text, _event )
{
	// the button must be updated to catch input events
	var b = new Button( Button.TYPE_BUTTON );
	b.create( this.bg, "menu_play_button", this.managers, 0.0, 340, false,
		"menu_play_button", "menu_play_button_over", "menu_play_button_down", _event || "click1_event" );
	b.anchor.set( 0.5, 0.5 );
	var t = new Text( this.managers.locale.get( _text ), Main.textStyleBoldButtonsLarge );
	t.create( b, 0.0, 0.0, true );
	t.anchor.set( 0.5, 0.5 );
	b.text = t;
	b.sfx = "snd_clickPlay";
	this.buttons.push( b );
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
	b.sfx = "snd_clickPlay";
	this.buttons.push( b );

	b = new Button( Button.TYPE_BUTTON );
	b.create( this.bg, "menu_play_button", this.managers, 200, 340, false,
		"menu_play_button", "menu_play_button_over", "menu_play_button_down", "click2_event" );
	b.anchor.set( 0.5, 0.5 );
	t = new Text( this.managers.locale.get( _text2 ), Main.textStyleBoldButtonsLarge );
	t.create( b, 0.0, 0.0, true );
	t.anchor.set( 0.5, 0.5 );
	b.text = t;
	b.sfx = "snd_clickPlay";
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
    		this.bg.tweener.tween( BigMessage.tweenOut );
    		this.bg.tweener.owner = this;
    		this.bg.tweener.context = this;
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

	if ( this.text )
		this.text.destroy();
	this.text = null;

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
	// wait for tween in to finish
	if ( this.doneIn )
	{
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

		if ( this.timeOut )
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
			else if ( event == "click2_event")
			{
				this.timeOut = 0;
				this.buttonPressed = 2;
				if ( this.removeAfterClick )
					this.remove( this.context, _argument );
				else
					return false;
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


var tt = 350;
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

