//
// functions and data for a single game Tile (representation of a Mahjongg cube)
//


// the coordinates are offsets from the base origin of the puzzle in cube units
// NOTE: any changes to this function header should be duplicated in the Tile.clone function as well as in Puzzle
function Tile( _parent, _managers, _cx, _cy, _cz, _symbol, _value, _timerStart )
{
	this.managers = _managers;
	this.symbol = _symbol;
	this.value = _value;
    this.timer = _timerStart * 1000;

	// initial frame key
	this.name = "cube_" + this.symbol + "_1";
	Sprite.call( this );
	this.create( _parent, this.name, this.managers.textures );

	this.setPickerData( this.managers.data.get( "maskData_1" ) );
	this.anchor.set( 0.5, 0.5 );
	this.scale.x = Tile.scale;
	this.scale.y = Tile.scale;

	// spacing for the front face of tiles in pixels
	this.sizex = (125 * Main.tileAssetScale) * Tile.scale;
	this.sizey = (125 * Main.tileAssetScale) * Tile.scale;

	// magic number, should scale correctly for the cubes provided
	this.scalez = 0.28;

	// cube location inside the puzzle (origin is centre bottom of the puzzle)
	this.cx = _cx;
	this.cy = _cy;
	this.cz = _cz;

	this.wobbleCount = 0;

	this.angle = 35 * Math.PI / 180;
	this.rotate3d( this.angle );
}


// extends Sprite
Tile.prototype = Object.create( Sprite.prototype );
Tile.prototype.constructor = Tile;


// globally accessible constants
Tile.scale = 0.75;
Tile.pieceSizePixels = 188;


Tile.prototype.destroy = function()
{
	this.name = null;
	this.managers = null;
	this.symbol = null;
	
	// super call
	Sprite.prototype.destroy.call( this );
};


Tile.prototype.update = function( _turning )
{
	if ( _turning )
		this.wobbleCount = 0;

	if ( this.wobbleCount > 0 )
	{
		this.wobbleCount--;
		if ( this.wobbleCount === 0 )
		{
			this.x = this.startX;
			this.y = this.startY;
		}
		else
		{
			var size = this.wobbleCount > 10 ? 4 : 2;
			this.x = this.startX + Math.random() * size - size / 2;
			this.y = this.startY + Math.random() * size - size / 2;
		}
	}

    if ( this.timer && !Game.paused && !GameControl.pageHidden )
    {
        var oldTime = Math.floor( this.timer / 1000 );
        this.timer -= Main.elapsedTime;
        if ( this.timer < 0 )
            this.timer = 0;
        var newTime = Math.floor( this.timer / 1000 );
        if ( newTime != oldTime )
        {
            // change the time displayed when the seconds tick down
            this.parent.timeTile( this.symbol, newTime, null );
            // force sprite texture update
            this.setFrame( this.key, true );
        }
    }

	Sprite.prototype.update.call( this );
};


Tile.prototype.clone = function()
{
	var nt = new Tile( this.parent, this.managers, this.cx, this.cy, this.cz, this.symbol, this.value );

	// initial frame key
	nt.name = this.name;
	nt.create( this.parent, nt.name, nt.managers.textures );
	nt.setPickerData( nt.managers.data.get( "maskData_1" ) );
	nt.anchor.set( this.anchor.x, this.anchor.y );
	nt.scale.set( this.scale.x, this.scale.y );

	// spacing for the front face of tiles in pixels
	nt.sizex = this.sizex;
	nt.sizey = this.sizey;

	// magic number lifted from Flash game, should scale correctly for the cubes provided
	nt.scalez = this.scalez;

    nt.timer = this.timer;

	nt.rotate3d( this.angle );

	return nt;
};


Tile.prototype.copyLocation = function( _toTile )
{
	_toTile.cx = this.cx;
	_toTile.cy = this.cy;
	_toTile.cz = this.cz;
	_toTile.rotate3d( _toTile.angle );
};


Tile.prototype.isOverridden = function()
{
    // if the Puzzle has a replacement key and active override timer
    // and if this tile type is not protected against override (e.g. 's0' = timer tile)
    return ( this.parent.overrideTileTimer > 0 && this.parent.overrideTileKey !== null && this.symbol != "s0" );
};


Tile.prototype.setPicture = function( _picture )
{
	// if ( Main.debug )
	// 	console.log("setPicture", _picture);

    if ( this.isOverridden() )
    {
        this.setFrame( "cube_" + this.parent.overrideTileKey + "_" + _picture.toString() );
    }
    else
    {
        this.setFrame( "cube_" + this.symbol + "_" + _picture.toString() );
    }

	this.setPickerData( this.managers.data.get( "maskData_" + _picture.toString() ) );
};


Tile.prototype.rotate3d = function( _angle )
{
    if ( _angle !== undefined )
	   this.angle = _angle;

	// round angle to nearest multiple of 10 degrees
	var deg = Math.round( this.angle * 180 / Math.PI );
	var angle = deg - deg % 10 + 5;
	_angle = angle * Math.PI / 180;

	// rotate point cx, cz around the origin by _angle radians
	var s = Math.sin( _angle );
	var c = Math.cos( _angle );
	this.tx = this.cx * c - this.cz * s;
	this.tz = this.cx * s + this.cz * c;

	// position the tile's sprite on the screen using an isometric transform
	this.x = this.tx * this.sizex;
	this.y = ( this.cy + Main.puzzleOffsetY - this.tz * this.scalez ) * this.sizey;

	// offset in the z direction by a tiny amount of the y height
	// this ensures that higher cubes are always drawn in front of the ones below them
	// it also enables correct picking where they overlap
	this.tz += this.y * 0.001;

	// calculate the correct frame to show from the angle of rotation
	this.setPicture( Math.round( ( _angle * 180 / Math.PI ) / 10 + 5 ) % 9 + 1 );
};


Tile.prototype.picked = function( _x, _y )
{
	// is the location over a non-transparent part of this tile's sprite image
	return ( this.pixelPicker( _x, _y ) > 0 );
};


Tile.prototype.wobble = function()
{
	if ( this.wobbleCount === 0 )
	{
		this.startX = this.x;
		this.startY = this.y;
		this.wobbleCount = 20;
	}
};


Tile.prototype.timeBonus = function()
{
    if ( this.symbol == "s0" )
    {
        return this.timer;
    }
    return -1;
};


// Tile.prototype.debugDraw = function()
// {
// 	Main.graphics.clear();
// 	Main.graphics.beginFill(0xff0000);
// 	for(var x = this.bounds.left; x < this.bounds.right; x++)
// 		for(var y = this.bounds.top; y < this.bounds.bottom; y++)
// 			if ( this.pixelPicker(x, y) > 0 )
// 			{
// 				Main.graphics.drawRect(x, y, 1, 1);
// 			}
// 	Main.graphics.endFill();
// };

