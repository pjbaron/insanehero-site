//
// Button.js
//
// Pete Baron 2017
//
// Extremely simple button class, extends Sprite
//



function Button( _type )
{
	Sprite.call( this );
	this.textures = null;
	this.type = _type || Button.TYPE_BUTTON;
	this.downDetected = true;
	this._toggled = "on";
	this.text = null;
	this.sfx = null;
	this.sfxHover = null;
}


Button.TYPE_BUTTON = 1;
Button.TYPE_CHECKBOX = 2;
Button.TYPE_TOGGLE = 3;
Button.TYPE_NOLATCH = 4; // regular button which does not latch in the down-state (e.g. 'help' from options, we'll return after)


// extends Sprite
Button.prototype = Object.create( Sprite.prototype );
Button.prototype.constructor = Button;


Button.prototype.create = function( _parent, _key, _managers, _x, _y, _pcnt, // pass through to Sprite.create
	_upKey, _overKey, _downKey, _downEvent, _overEvent,
	_upKey2, _overKey2, _downKey2, _downEvent2, _overEvent2 )
{
	this.managers = _managers;
	Sprite.prototype.create.call( this, _parent, _key, this.managers.textures, _x, _y, _pcnt );
	this.upKey = {
		on: _upKey,
		off: _upKey2
	};
	this.overKey = {
		on: _overKey,
		off: _overKey2
	};
	this.downKey = {
		on: _downKey,
		off: _downKey2
	};
	this.downEvent = {
		on: _downEvent,
		off: _downEvent2
	};
	this.overEvent = {
		on: _overEvent,
		off: _overEvent2
	};
	this.downDetected = true;
	this._toggled = "on";
	this.text = null;
	this.sfx = null;
	this.sfxHover = null;

	EventHandlers.registerCallback( "mousedown", this.playSfx, { context: this } );
};


Button.prototype.destroy = function()
{
	EventHandlers.clearCallback( "mousedown", this.playSfx );
	this.managers = null;
	Sprite.prototype.destroy.call( this );
	if ( this.text )
	{
		this.text.destroy();
		this.text = null;
	}
	this.upKey = this.overKey = this.downKey = this.downEvent = this.overEvent = null;
	this._toggled = null;
	this.sfx = this.sfxHover = null;
};


// returns event type strings or null
Button.prototype.update = function()
{
	var event = null;
	var o = false;
	var c = false;
	this.calculateBounds();
	var r = this.getBounds();

	if ( this.type == Button.TYPE_BUTTON || this.type == Button.TYPE_NOLATCH )
	{
		// mouse down or click on button
		c = ( ( this.downDetected && Main.mouseDown !== null && r.contains( Main.mouseDown.x, Main.mouseDown.y ) ) ||
			( Main.click !== null && r.contains( Main.click.x, Main.click.y ) ) );
	}
	else
	{
		// click on button only (no mouse-down state change)
		c = ( Main.click !== null && r.contains( Main.click.x, Main.click.y ) );
	}

	if ( c )
	{
		//if ( this.sfx ) this.managers.audio.play( this.sfx );
		this.setFrame( this.downKey[ this._toggled ] );
		Main.mouseDown = Main.click = null;
		event = this.downEvent[ this._toggled ];
		o = true;
	}

	// stay down once clicked
	if ( this.type == Button.TYPE_BUTTON && // toggle buttons don't latch on 'down' state
		this.key == this.downKey[ this._toggled ] && // latch if in down-state
		this.downKey[ this._toggled ] != this.upKey[ this._toggled ] ) // but only if there is a distinct down-state
	{
		o = true;
	}

	// hover over button
	if ( !o && Main.hover )
	{
		if ( r.contains( Main.hover.x, Main.hover.y ) )
		{
			if ( this.setFrame( this.overKey[ this._toggled ] ) )
			{
				// only play hover sound if the frame changed to 'hover' state
				if ( this.sfxHover ) this.managers.audio.play( this.sfxHover );
			}
			if ( this.overEvent )
			{
				event = this.overEvent[ this._toggled ];
			}
			o = true;
		}
	}

	// no click or hover, revert to up-state
	if ( !o && this.type != Button.TYPE_TOGGLE )
	{
		this.setFrame( this.upKey[ this._toggled ] );
	}

	Sprite.prototype.update.call( this );

	if ( this.text )
	{
		this.text.update();
	}

	return event;
};


Button.prototype.playSfx = function( _x, _y )
{
	if ( this && this.managers && this.sfx )
	{
		this.calculateBounds();
		var r = this.getBounds();
		if ( r.contains( _x, _y ) )
			this.managers.audio.play( this.sfx );
	}
};


//
// properties
//
Object.defineProperties( Button.prototype,
{
	toggled:
	{
		set: function( _state )
		{
			this._toggled = _state ? "on" : "off";
			this.setFrame( this.upKey[ this._toggled ] );
		},
		get: function()
		{
			return ( this._toggled == "on" );
		}
	}
} );
