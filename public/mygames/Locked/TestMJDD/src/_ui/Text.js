//
// extend PIXI.Text to support responsive layout
// (code cloned from Sprite... DRY fail!)
//


function Text( _text, _style )
{
	// super constructor
	PIXI.Text.call( this, _text, _style );

	this.x = 0;
	this.y = 0;
	this.responsive = null;
}


// extends PIXI.Text
Text.prototype = Object.create( PIXI.Text.prototype );
Text.prototype.constructor = Text;


Text.prototype.create = function( _parent, _x, _y, _pcnt )
{
	// if ( Main.debug )
	// 	console.log("Text.create", this.text);

	_parent.addChild( this );

	if ( _pcnt )
	{
		this.pcntx = _x || 0;
		this.pcnty = _y || 0;
	}
	else
	{
		this.x = _x || 0;
		this.y = _y || 0;
	}
};


Text.prototype.destroy = function()
{
	// if ( Main.debug )
	// 	console.log("Text.destroy", this.text);

	this.responsive = null;

	PIXI.Text.prototype.destroy.call( this );
};


Text.prototype.update = function()
{
	// adjust layout if screen has changed dimensions
	if ( Main.resized )
	{
		if ( this.responsive )
		{
			this.handleResponsiveLayout();
		}
		
		if ( !isNaN(this.percentx) ) this.pcntx = this.percentx;
		if ( !isNaN(this.percenty) ) this.pcnty = this.percenty;

		Main.resizeConsumed = true;
	}

	return true;
};


Text.prototype.handleResponsiveLayout = function()
{
	var adjusted = false;

	for( var i = 0; i < this.responsive.length; i++ )
	{
		var r = this.responsive[i];

		if ( !isNaN( r.minWidth * this.scale.x ) )
		{
			if ( Main.width < r.minWidth )
			{
				adjusted = this.respond( r );
			}
			else if ( !adjusted )
			{
				this.respondDefault();
			}
		}

		if ( r.aspectRatioMin !== undefined )
		{
			if ( Main.aspectRatio < r.aspectRatioMin )
			{
				adjusted = this.respond( r );
			}
			else if ( !adjusted )
			{
				this.respondDefault();
			}
		}
	}
};


Text.prototype.respond = function( r )
{
	var adjusted = false;
	if ( r.position )
	{
		this.pcntx = r.position.x;
		this.pcnty = r.position.y;
		adjusted = true;
	}
	if ( r.scale )
	{
		this.scale.x = r.scale.x;
		this.scale.y = r.scale.y;
		adjusted = true;
	}
	return adjusted;
};


Text.prototype.respondDefault = function()
{
	this.pcntx = this.responsive.x;
	this.pcnty = this.responsive.y;
	this.scale.x = this.responsive.scale.x;
	this.scale.y = this.responsive.scale.y;
};


//
// properties
//
Object.defineProperties(Text.prototype, {
	scaleFactor: {
		get: function() {
			return this.scale;
		},
		// permit (Number) or {x, y}
		set: function(_first) {
			if ( typeof _first == "number" )
			{
				this.scale.x = _first;
				this.scale.y = _first;
			}
			else
			{
				if (_first.hasOwnProperty('x'))
				{
					this.scale.x = _first.x;
				}
				if (_first.hasOwnProperty('y'))
				{
					this.scale.y = _first.y;
				}
			}
		}
	},
	pcntx: {
		set: function(_pcnt)
		{
			this.percentx = _pcnt;
			if ( this.parent && this.parent.texture.noFrame )
			{
				this.msx = Main.width / this.parent.scale.x;
				this.x = _pcnt * this.msx;
			}
			else if ( this.parent == Main.window )
				this.x = _pcnt * Main.width;
			else
				this.x = _pcnt * this.parent.width;
		}
	},
	pcnty: {
		set: function(_pcnt)
		{
			this.percenty = _pcnt;
			if ( this.parent && this.parent.texture.noFrame )
			{
				this.msy = Main.height / this.parent.scale.y;
				this.y = _pcnt * this.msy;
			}
			else if ( this.parent == Main.window )
				this.y = _pcnt * Main.height;
			else
				this.y = _pcnt * this.parent.height;
		}
	},
	responsiveLayout: {
		set: function( _list )
		{
			this.responsive = _list;
			// store default layout if this item is responsive to screen dimensions
			this.responsive.x = this.percentx;
			this.responsive.y = this.percenty;
			this.responsive.scale = { x: this.scale.x, y: this.scale.y };
		}
	}
});

