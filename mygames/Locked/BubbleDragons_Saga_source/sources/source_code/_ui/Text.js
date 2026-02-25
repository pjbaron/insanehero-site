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
	// this.responsive = null;
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

	// this.responsive = null;

	PIXI.Text.prototype.destroy.call( this );
};


Text.prototype.update = function()
{
	// adjust layout if screen has changed dimensions
	if ( Main.resized )
	{
		// if ( this.responsive )
		// {
		// 	this.handleResponsiveLayout();
		// }
		
		if ( !isNaN(this.percentx) ) this.pcntx = this.percentx;
		if ( !isNaN(this.percenty) ) this.pcnty = this.percenty;

		Main.resizeConsumed = true;
	}

	return true;
};


// Text.prototype.handleResponsiveLayout = function()
// {
// 	var adjusted = false;

// 	for( var i = 0; i < this.responsive.length; i++ )
// 	{
// 		var r = this.responsive[i];

// 		if ( !isNaN( r.minWidth * this.scale.x ) )
// 		{
// 			if ( Main.width < r.minWidth )
// 			{
// 				adjusted = this.respond( r );
// 			}
// 			else if ( !adjusted )
// 			{
// 				this.respondDefault();
// 			}
// 		}

// 		if ( r.aspectRatioMin !== undefined )
// 		{
// 			if ( Main.aspectRatio < r.aspectRatioMin )
// 			{
// 				adjusted = this.respond( r );
// 			}
// 			else if ( !adjusted )
// 			{
// 				this.respondDefault();
// 			}
// 		}
// 	}
// };


// Text.prototype.respond = function( r )
// {
// 	var adjusted = false;
// 	if ( r.position )
// 	{
// 		this.pcntx = r.position.x;
// 		this.pcnty = r.position.y;
// 		adjusted = true;
// 	}
// 	if ( r.scale )
// 	{
// 		this.scale.x = r.scale.x;
// 		this.scale.y = r.scale.y;
// 		adjusted = true;
// 	}
// 	return adjusted;
// };


// Text.prototype.respondDefault = function()
// {
// 	this.pcntx = this.responsive.x;
// 	this.pcnty = this.responsive.y;
// 	this.scale.x = this.responsive.scale.x;
// 	this.scale.y = this.responsive.scale.y;
// };


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
            if ( this.parent )
            {
                if ( this.parent.texture.noFrame )
                {
                    this.x = _pcnt / this.parent.scale.x * Main.width;
                }
                else
                {
                    this.x = _pcnt / this.parent.scale.x * this.parent.width;
                }
            }
		}
	},
	pcnty: {
		set: function(_pcnt)
		{
            this.percenty = _pcnt;
            if ( this.parent )
            {
                if ( this.parent.texture.noFrame )
                {
                    this.y = _pcnt / this.parent.scale.y * Main.height;
                }
                else
                {
                    this.y = _pcnt / this.parent.scale.y * this.parent.height;
                }
            }
		}
	},
    setx: {
        set: function(_x)
        {
            this.x = _x;
            if ( this.parent )
            {
                if ( this.parent.texture.noFrame )
                {
                    this.percentx = _x / Main.width;
                }
                else
                {
                    this.percentx = _x / this.parent.width;
                }
            }
        }
    },
    sety: {
        set: function(_y)
        {
            this.y = _y;
            if ( this.parent )
            {
                if ( this.parent.texture.noFrame )
                {
                    this.percenty = _y / Main.height;
                }
                else
                {
                    this.percenty = _y / this.parent.height;
                }
            }
        }
    }
});

