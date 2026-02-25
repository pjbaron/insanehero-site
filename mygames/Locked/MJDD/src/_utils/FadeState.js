//
// control fading for game states
//


function FadeState( )
{
	this.fadeValue = 0;
	this.fadedir = 0;
	this.trigger = undefined;
	this.direction = undefined;
	this.callback = null;
	this.context = null;
	this.args = null;
}


FadeState.prototype.destroy = function()
{
	this.callback = null;
	this.context = null;
	this.args = null;
};


FadeState.prototype.setFade = function( _dir, _value, _callback, _context, _args, _trigger )
{
	if ( _dir !== null && _dir !== undefined )
		this.fadedir = _dir;
	if ( _value !== null && _value !== undefined )
		this.fadeValue = _value;

	this.callback = _callback;
	this.context = _context;
	this.args = _args;

	// specify undefined to cancel an existing trigger
	if ( _trigger !== null )
	{
		this.trigger = _trigger;
		if ( this.trigger !== undefined )
		{
			// which side of the trigger value are we starting?
			if ( this.fadeValue >= this.trigger )
				this.direction = -1;
			else
				this.direction = 1;
		}
	}


};


FadeState.prototype.reached = function( _target )
{
	return (this.fadeValue == _target);
};


FadeState.prototype.fading = function()
{
	var ret = true;

	// adjust fade value
	if ( this.fadedir !== 0 )
	{
		this.fadeValue += this.fadedir;
		if ( isNaN(this.trigger) || this.direction === undefined )
		{
			if ( this.fadeValue <= 0 )
			{
				// reached zero, exit and close
				this.fadeValue = 0;
				this.fadedir = 0;
				if ( Main.debug )
					console.log( "FadeState: finished fading out" );
				ret = false;
			}
			else if ( this.fadeValue >= 1 )
			{
				// reached one, stop fading
				this.fadeValue = 1;
				this.fadedir = 0;
				if ( Main.debug )
					console.log( "FadeState: finished fading in" );
				ret = false;
			}
		}
	}

	// if we've reached or passed the trigger value and there's a callback
	if ( !isNaN(this.trigger) && this.direction !== undefined )
	{
		if ( this.direction === -1 )
		{
			if ( this.fadeValue <= this.trigger )
			{
				if ( this.callback.call( this.context, this.args ) )
				{
					// prevent any further callbacks from this fader
					this.callback = null;
					return false;
				}
			}
		}
		else
		{
			if ( this.fadeValue >= this.trigger )
			{
				if ( this.callback.call( this.context, this.args ) )
				{
					this.callback = null;
					return false;
				}
			}
		}
	}

	return ret;
};

