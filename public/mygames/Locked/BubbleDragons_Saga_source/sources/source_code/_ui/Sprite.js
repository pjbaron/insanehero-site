//
// Sprite.js
//
// Pete Baron 2017
//
// wrapper for PIXI.Sprite with additional functionality (e.g. percentage based positioning, tweening, fading, animation, etc)
//






function Sprite( )
{
	// super constructor
	PIXI.Sprite.call( this );

	this.x = 0;
	this.y = 0;
	this.anchor.set( 0, 0 );
	// this.responsive = null;
    // this.responsiveCallback = null;
	this.myFilters = null;

	this.pickerMaskData = null;
	this.fader = null;
	this.tweener = null;
	this.button = null;
    this.updateCallback = null;
    
	this.globalScale = null;
	// this.spriteBounds = null;
}


// extends PIXI.Sprite
Sprite.prototype = Object.create( PIXI.Sprite.prototype );
Sprite.prototype.constructor = Sprite;


Sprite.prototype.create = function( _parent, _type, _textureManager, _x, _y, _pcnt, _behind )
{
//	if ( Main.debug )
//        console.log("Sprite.create", _type);

    this.textures = _textureManager;
    
    this.animation = 'default';
    this.frameIndex = 0;
    this.atEnd = false;
    this.animInterval = 0;
    this.animNextTick = 0;
    this.taskDone = false;
    
    this.setType( _type );

    this.myFilters = null;
    this.destroyTexture = false;
    this.updateCallback = null;
    
    if ( this.key )
    {
        this.texture = this.textures.get( this.key );
        if ( !this.texture && Main.debug )
            console.log("WARNING: unrecognised texture applied to Sprite " + this.key);
    }

    if ( !_behind )
        _parent.addChild( this );
    else
        _parent.addChildAt( this, 0 );

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
	// if ( Main.debug )
	//  	console.log("Sprite.destroy", this.key);

	if ( this.fader )
	{
		this.fader.destroy();
		this.fader = null;
	}

	this.myFilters = null;
	this.tweener = null;
	this.pickerMaskData = null;
	// this.responsive = null;
 //    this.responsiveCallback = null;
	this.globalScale = null;
    if ( this.texture && this.destroyTexture )
    {
        this.texture.destroy({texture: true, baseTexture: true});
    }
    this.texture = null;
	this.textures = null;

	PIXI.Sprite.prototype.destroy.call( this );
    this.parent = null;
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

        // if ( this.responsive )
        // {
        // 	this.handleResponsiveLayout();
        // }

        // if ( this.responsiveCallback )
        // {
        //     this.responsiveCallback( this );
        // }

		if ( !isNaN(this.percentx) ) this.pcntx = this.percentx;
		if ( !isNaN(this.percenty) ) this.pcnty = this.percenty;

		Main.resizeConsumed = true;
	}

	if ( this.fader )
	{
	 	this.alpha = this.fader.fadeValue;
	 	this.fader.fading( _ctx );
	}

    if ( this.animInterval !== 0 && this.animNextTick !== 0 )
    {
        if ( Main.nowTime >= this.animNextTick )
        {
            // this next line will lose a little time if the frame rate is low, however
            // it will never try to catch-up if the game has been paused externally
            // like this would:  "this.animNextTick += this.animInterval;"
            // (which will change frames every tick until it has caught up)
            this.animNextTick = Main.nowTime + this.animInterval;
            this.frameIndex++;
            if ( this.frameIndex >= SpriteData[this.type].animations[this.animation].length )
            {
                this.atEnd = true;
                if ( !this.noRepeat )
                    this.frameIndex = 0;
                else
                    this.frameIndex = SpriteData[this.type].animations[this.animation].length - 1;
            }
            this.setFrame( SpriteData[this.type].animations[this.animation][this.frameIndex] );
        }
    }

    // if ( this.texture && this.texture.baseTexture === null && this.key )
    // {
    //     // our texture has been destroyed but we know what it is called
    //     this.texture = this.textures.get( this.key );
    //     if ( Main.debug )
    //         console.log( "Sprite.Update detected missing texture and recovered it", this.key );
    // }

    if ( this.updateCallback )
    {
        this.updateCallback( this );
    }

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


Sprite.prototype.setAnimation = function( _animation, _dontReset, _force )
{
    if ( _force || this.animation != _animation )
    {
        this.animation = _animation;
        this.atEnd = false;
        if ( !_dontReset )
            this.frameIndex = 0;

        var a = SpriteData[this.type].animations;
        if ( a )
        {
            this.setFrame( a[this.animation][this.frameIndex] );
            this.noRepeat = a.noRepeat;
            this.animInterval = a.interval;
            // we can specify randomise: true to make a set of animations started at the same time animate out of sync
            if ( a.randomise )
                this.animNextTick = Main.nowTime + Math.floor(this.animInterval * Math.random());
            else
                this.animNextTick = Main.nowTime + this.animInterval;

            return true;
        }
    }
    return false;
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


Sprite.prototype.setType = function( _type )
{
    if ( _type != this.type )
    {
        this.type = _type;
        this.animation = 'default';
        this.animInterval = 0;
        this.animNextTick = 0;
        this.frameIndex = 0;
        this.atEnd = false;
    }

    if ( !SpriteData[this.type] )
        this.setFrame( this.type );
    else
    {
        if ( !this.setAnimation( this.animation, true, true ) )
        {
            if ( SpriteData[this.type].key )
                this.setFrame( SpriteData[this.type].key );
            else
                console.error("ERROR: Sprite.create there is no key or animations for _type: '" + _type + "'!");
        }
    }
};


Sprite.prototype.moveToFront = function()
{
    var p = this.parent;
    p.removeChild(this);
    p.addChildAt(this, p.children.length - 1);
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


// Sprite.prototype.handleResponsiveLayout = function()
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


// Sprite.prototype.respond = function( r )
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


// Sprite.prototype.respondDefault = function()
// {
// 	this.pcntx = this.responsive.x;
// 	this.pcnty = this.responsive.y;
// 	this.scale.x = this.responsive.scale.x;
// 	this.scale.y = this.responsive.scale.y;
// };


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
            if ( this.parent )
            {
    			if ( this.parent.texture.noFrame )
    			{
    				this.x = _pcnt / this.parent.scale.x * Main.width;
    			}
    			// else if ( this.parent == Main.window )
    			// 	this.x = _pcnt * this.parent.width; //Main.width;
    			else
    				this.x = _pcnt / this.parent.scale.x * this.parent.width;
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
    			// else if ( this.parent == Main.window )
    			// 	this.y = _pcnt * this.parent.height;    //Main.height;
    			else
    				this.y = _pcnt / this.parent.scale.y * this.parent.height;
            }
		}
	},
    setx: {
        set: function(_x)
        {
            this.x = _x;
            // if ( this.parent && this.parent.texture.noFrame )
            // {
            //     this.msx = Main.width / this.parent.scale.x;
            //     this.percentx = _x / this.msx;
            // }
            // else if ( this.parent == Main.window )
            //     this.percentx = _x / Main.width;
            // else
            if ( this.parent )
                this.percentx = _x / this.parent.width;
        }
    },
    sety: {
        set: function(_y)
        {
            this.y = _y;
            // if ( this.parent && this.parent.texture.noFrame )
            // {
            //     this.msy = Main.height / this.parent.scale.y;
            //     this.percenty = _y / this.msy;
            // }
            // else if ( this.parent == Main.window )
            //     this.percenty = _y / Main.Height;
            // else
            if ( this.parent )
                this.percenty = _y / this.parent.height;
        }
    }
 //    ,
	// responsiveLayout: {
	// 	set: function( _list )
	// 	{
	// 		this.responsive = _list;
	// 		// store default layout if this item is responsive to screen dimensions
	// 		this.responsive.x = this.percentx;
	// 		this.responsive.y = this.percenty;
	// 		this.responsive.scale = { x: this.scale.x, y: this.scale.y };
	// 	}
	// }
});

