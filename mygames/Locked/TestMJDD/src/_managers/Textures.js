//
// Textures.js
//
// Pete Baron 2017
//
// a very simple texture manager
// handles loading, tracks pending loads, provides simple dictionary access indexed by keys
//




function Textures( )
{
	this.pending = 0;
	this.loader = null;
}


Textures.prototype.create = function()
{
	this.pending = 0;

	this.loader = PIXI.loader;
};


Textures.prototype.destroy = function()
{
	this.pending = 0;
	this.loader = null;
};


Textures.prototype.addImage = function( _key, _resourceURL )
{
	this.loader.add( _key, _resourceURL );

	if ( Main.debug )
		console.log( "Textures.addImage ", _key, _resourceURL );

	this.pending++;
};


Textures.prototype.startLoading = function( _callback, _context )
{
	var _this = this;

	if ( Main.debug )
		console.log( "Textures.startLoading" );

	if ( this.pending > 0 )
	{
		this.loader.once('complete', function()
			{
				_this.pending = 0;
				if ( Main.debug )
					console.log( "Textures all loaded!" );
				if ( _callback && _context )
					_callback.call( _context );
			}).load();
	}
	else
	{
		if ( Main.debug )
			console.log( "WARNING: Textures.startLoading - no images to load!" );
	}
};


Textures.prototype.loadImage = function( _key, _resourceURL, _callback, _context )
{
    if ( Main.debug )
        console.log( "Textures.loadImage", _key, _resourceURL );

	this.loader.add( _key, _resourceURL );
	this.loader.once('complete', function()
		{
            if ( Main.debug )
                console.log( "Texture loaded!" );
			_callback.call( _context );
		}).load();
};


// WARNING: do not use Textures.get to test of existence of texture in cache
// it can allocate PIXI.BaseTexture and will not clean it up automatically.
// Use Textures.exists for all such queries.
// p.s. and make sure you 'destroy' returned textures from Textures.get
Textures.prototype.get = function( _key, _dontConvert )
{
	if ( !PIXI.loader.resources[_key] )
		return null;

    if ( PIXI.loader.resources[_key].texture )
        return PIXI.loader.resources[_key].texture;

    if ( _dontConvert )
        return null;

    if ( Main.debug )
        console.log( "texture created from canvas", _key );

    var img = PIXI.Texture.fromCanvas( PIXI.loader.resources[_key] );
    PIXI.loader.resources[_key].texture = img;
    return img;
};


Textures.prototype.set = function( _key, _img )
{
    var resource = PIXI.loader.resources[_key];
    if ( resource && resource != _img )
    {
        if ( Main.debug )
            console.log( "Textures.set removing image from cache", _key );
        this.remove( _key );
    }

    if ( Main.debug )
        console.log( "Textures.set adding image to cache", _key, _img.width, "x", _img.height );

    resource = PIXI.loader.resources[_key] = _img;
};


Textures.prototype.exists = function( _key, _dontConvert )
{
    if ( !PIXI.loader.resources[_key] )
        return false;

    if ( PIXI.loader.resources[_key].texture )
        return true;

    return !_dontConvert;
};


Textures.isCanvas = function( _object )
{
    if ( !_object )
    {
        if ( Main.debug )
            alert("ERROR: null or undefined object being tested for HTMLCanvasElement!");
        return false;
    }

    return (
            (_object instanceof HTMLCanvasElement) ||
            (_object.constructor.name == "HTMLCanvasElement") ||
            (_object.prototype ? _object.prototype.constructor : _object.constructor).toString() == "HTMLCanvasElement"
        );
};


Textures.prototype.remove = function( _key )
{
    var resource = PIXI.loader.resources[_key];
    if ( !resource )
    {
        if ( Main.debug )
            alert("ERROR: Textures.remove can't remove a null resource", _key);
        return;
    }

    if ( !resource.texture )
    {
        if ( Main.debug )
        {
            if ( !Textures.isCanvas( resource ) )
                console.log("Textures.remove can't remove a null texture", _key);
            else
                console.log("Textures.remove removing a Canvas", _key);
        }
        PIXI.loader.resources[_key] = null;
        delete PIXI.loader.resources[_key];
        return;
    }

    // remove the texture
    //console.log( "The texture is a '" + resource.texture.getConstructorName() + "'" );
    if ( !Textures.isCanvas( resource.texture ) )
        resource.texture.destroy({texture: true, baseTexture: true});
    resource.texture = null;

    //console.log( "The resource is a '" + resource.getConstructorName() + "'" );
    if ( !Textures.isCanvas( resource ) )
    {
        if ( Main.debug )
            console.log( "Textures.remove removing a Texture", _key );

        // remove the resource container
        resource.destroy({texture: true, baseTexture: true});
    }
    else
    {
        if ( Main.debug )
            console.log("Textures.remove removing a Texture with a Canvas", _key);
    }

    PIXI.loader.resources[_key] = null;
    delete PIXI.loader.resources[_key];
};
