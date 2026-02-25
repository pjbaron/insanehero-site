//
// wrapper for PIXI.Sprite with additional functionality (e.g. percentage based positioning)
//


function Sprite( )
{
	// super constructor
	PIXI.Sprite.call( this );

	this.x = 0;
	this.y = 0;
	this.anchor.set( 0, 0 );
	this.responsive = null;
	this.myFilters = null;

	this.pickerMaskData = null;
	this.fader = null;
	this.tweener = null;
	this.button = null;

	this.globalScale = null;

	// this.spriteBounds = null;
}


// extends PIXI.Sprite
Sprite.prototype = Object.create( PIXI.Sprite.prototype );
Sprite.prototype.constructor = Sprite;


Sprite.prototype.create = function( _parent, _key, _textureManager, _x, _y, _pcnt )
{
	if ( Main.debug )
        console.log("Sprite.create", _key);

	this.key = _key;
	this.textures = _textureManager;
	this.myFilters = null;
    this.destroyTexture = false;
    
	if ( this.key )
	{
		this.texture = this.textures.get( _key );
        if ( !this.texture && Main.debug )
            console.log("WARNING: unrecognised texture applied to Sprite " + _key);
	}

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

	this.bounds = this.getBounds( false );
	this.getGlobalScale();
};


Sprite.prototype.destroy = function()
{
	if ( Main.debug )
	 	console.log("Sprite.destroy", this.key);

	if ( this.fader )
	{
		this.fader.destroy();
		this.fader = null;
	}

	this.myFilters = null;
	this.tweener = null;
	this.pickerMaskData = null;
	this.responsive = null;
	this.globalScale = null;
    if ( this.texture && this.destroyTexture )
    {
        this.texture.destroy({texture: true, baseTexture: true});
    }
    this.texture = null;
	this.textures = null;

	PIXI.Sprite.prototype.destroy.call( this );
};


Sprite.prototype.update = function( _ctx )
{
    if ( this._texture && !this._texture.orig )
    {
        console.log("_texture has no orig! " + this.key);
    }

	// adjust layout if screen has changed dimensions
	if ( Main.resized )
	{
		this.getGlobalScale( true );
		if ( this.responsive )
		{
			this.handleResponsiveLayout();
		}
		
		if ( !isNaN(this.percentx) ) this.pcntx = this.percentx;
		if ( !isNaN(this.percenty) ) this.pcnty = this.percenty;

		Main.resizeConsumed = true;
	}

	if ( this.fader )
	{
	 	this.alpha = this.fader.fadeValue;
	 	this.fader.fading( _ctx );
	}

    // if ( this.texture && this.texture.baseTexture === null && this.key )
    // {
    //     // our texture has been destroyed but we know what it is called
    //     this.texture = this.textures.get( this.key );
    //     if ( Main.debug )
    //         console.log( "Sprite.Update detected missing texture and recovered it", this.key );
    // }

	return true;
};


Sprite.prototype.addFilter = function( _filter )
{
	if ( !this.myFilters )
	{
		this.myFilters = [];
	}

	if ( this.myFilters.indexOf(_filter) === -1 )
	{
		// tacky work-around, PIXI uses a poorly defined object for 'filters' and we can't push directly to the list
		this.myFilters.push( _filter );
		this.filters = this.myFilters;
	}
};


Sprite.prototype.removeFilter = function( _filter )
{
	if ( !this.myFilters )
	{
		this.filters = null;
		return;
	}

	var i = this.myFilters.indexOf( _filter );
	if ( i !== -1 )
	{
		// tacky work-around, PIXI uses a poorly defined object for 'filters' and we can't splice from the list
		this.myFilters.splice( i, 1 );
		this.filters = this.myFilters;
	}
};


Sprite.prototype.setPickerData = function( _data )
{
	this.pickerMaskData = _data;
};


Sprite.prototype.setFrame = function( _key, _force )
{
	if ( _force || this.key != _key )
	{
		this.key = _key;
		if ( this.key )
		{
			this.texture = this.textures.get(_key);
			return true;
		}
	}
	return false;
};


// iterate up the parent tree to root, accumulating scale factors at every level
Sprite.prototype.getGlobalScale = function( _recalc )
{
	if ( _recalc || this.globalScale === null )
	{
		var sx = this.scale.x;
		var sy = this.scale.y;
		var parent = this.parent;
		while( parent )
		{
			sx *= parent.scale.x;
			sy *= parent.scale.y;
			parent = parent.parent;
		}
		this.globalScale = { x: sx, y: sy };
	}
	return this.globalScale;
};


// find the pixel alpha in the mask data
// _x,_y are offsets from the global canvas top-left
Sprite.prototype.pixelPicker = function( _x, _y )
{
	this.bounds = this.getBounds( false );
	if (_x < this.bounds.left || _x >= this.bounds.right) return 0;
	if (_y < this.bounds.top || _y >= this.bounds.bottom) return 0;

	this.getGlobalScale();
	var ix = Math.floor( (_x - this.bounds.left) / this.globalScale.x ) * 4 + 3;
	var iy = Math.floor( (_y - this.bounds.top) / this.globalScale.y );

	var p = this.pickerMaskData[ ix + iy * this.texture.frame.width * 4 ];
	if (p)
		return true;

	return false;
};


Sprite.prototype.createCanvasFromTexture = function()
{
	var canvas = document.createElement( 'canvas' );
	canvas.width = this.texture.frame.width;
	canvas.height = this.texture.frame.height;
	var context = canvas.getContext( '2d' );
	context.drawImage(
	    this.texture.baseTexture.source,
	    this.texture.frame.x,
	    this.texture.frame.y,
	    this.texture.frame.width,
	    this.texture.frame.height,
	    0,
	    0,
	    this.texture.frame.width,
	    this.texture.frame.height);
	return canvas;
};


Sprite.prototype.setCallback = function( _fnc, _ctx, _arg )
{
	this.fadeCallback = _fnc;
	this.fadeCtx = _ctx;
	this.fadeArg = _arg;
};


Sprite.prototype.addFader = function( _dir, _start, _callback, _context, _args, _trigger )
{
	this.fader = new FadeState();
	this.fader.setFade( _dir, _start, _callback, _context, _args, _trigger );
};


// return the pixel buffer for this image
Sprite.prototype.getPixels = function()
{
	var rt = PIXI.RenderTexture.create( this.texture._frame.width, this.texture._frame.height );
	Main.renderer.render( this, rt );
	return Main.renderer.extract.pixels( rt );
};


Sprite.prototype.handleResponsiveLayout = function()
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


Sprite.prototype.respond = function( r )
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


Sprite.prototype.respondDefault = function()
{
	this.pcntx = this.responsive.x;
	this.pcnty = this.responsive.y;
	this.scale.x = this.responsive.scale.x;
	this.scale.y = this.responsive.scale.y;
};


//
// properties
//
Object.defineProperties(Sprite.prototype, {
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
            else if ( this.parent && this.parent.parent && !this.parent.parent.parent )
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
            else if ( this.parent && this.parent.parent && !this.parent.parent.parent )
				this.y = _pcnt * Main.height;
			else
				this.y = _pcnt * this.parent.height;
		}
	},
	setx: {
		set: function(_x)
		{
			this.x = _x;
			if ( this.parent && this.parent.texture.noFrame )
			{
				this.msx = Main.width / this.parent.scale.x;
				this.percentx = _x / this.msx;
			}
            else if ( this.parent && this.parent.parent && !this.parent.parent.parent )
				this.percentx = _x / Main.width;
			else
				this.percentx = _x / this.parent.width;
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

