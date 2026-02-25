//
// Very simple check-box
//
// Pete Baron 2017
//
// Extends Button
//




function CheckBox()
{
	this.checked = false;
	this.tick = null;
	this.toggleEvent = null;
	Button.call( this, Button.TYPE_CHECKBOX );
}


CheckBox.EVENT_CLICK = "check_click";


// extends Button
CheckBox.prototype = Object.create( Button.prototype );
CheckBox.prototype.constructor = CheckBox;


CheckBox.prototype.create = function(_parent, _key, _managers, _x, _y, _pcnt,			// pass through to Sprite.create
									_upKey, _overKey, _downKey, _toggledEvent,
									_tickx, _ticky )
{
	this.tick = new Sprite();
	this.tick.create( this, "menu_check", _managers.textures, _tickx, _ticky, false );
	this.tick.anchor.set( 0.5 );
	this.checked = true;
	this.toggleEvent = _toggledEvent;

	Button.prototype.create.call( this, _parent, _key, _managers, _x, _y, _pcnt,
									_upKey, _overKey, _downKey, CheckBox.EVENT_CLICK );
	this.downDetected = false;
};


CheckBox.prototype.destroy = function()
{
	Button.prototype.destroy.call( this );
};


CheckBox.prototype.update = function()
{
	var event = Button.prototype.update.call( this );
	if ( event == CheckBox.EVENT_CLICK )
	{
		this.setCheck( !this.checked );
		if ( this.toggleEvent )
			event = this.toggleEvent;
	}

	return event;
};


CheckBox.prototype.setCheck = function( _checked )
{
	this.checked = _checked;
	this.tick.visible = _checked;
};

