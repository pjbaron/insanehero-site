//
// create the graphics and hold the current state of the puzzle
//



function Puzzle()
{
	// super constructor
	PIXI.Container.call( this );

	this.angle = 0;
	this.targetAngle = 0;
	this.speedMatchValue = 0;
	this.speedMatchTime = 0;
	this.multiMatchValue = 0;
	this.levelBonusValues = null;
	this.world = null;
    this.overrideTileTimer = 0;
    this.overrideTileKey = null;

	// list of symbol numbers used in this puzzle
	this.tileDescriptions = null;
	this.puzzleLayout = null;

    this.levelName = "";
	this.tiles = null;
	this.managers = null;
	this.tornadoRemove = false;
	this.lastTornadoPiece = 0;
	this.cacheSpriteList = [];
	this.second = false;
    this.removeTiles = null;
    this.blankCubes = null;
    this.blankTimeCubes = null;
    this.lastTimeString = "";

	Puzzle.turnSpeed = 4 * Math.PI / 180;
}


// extend Container to hold all of the puzzle tile pieces
Puzzle.prototype = Object.create( PIXI.Container.prototype );
Puzzle.prototype.constructor = Puzzle;


// globally accessible constants
Puzzle.maxTilesHigh = 6;
Puzzle.maxHalfTilesWide = 12;	// count full visible faces horizontally on biggest puzzle, add one for margin


// create the tile graphics and initialise the puzzle
// _size - dimensions of the puzzle in x,y and z directions
// _levelData - description of this level in a JSON style data object
// _baseData - description of the game rules in a JSON style data object (typically level 0 contains this)
Puzzle.prototype.create = function( _world, _managers, _levelData, _baseData )
{
	this.world = _world;
	this.managers = _managers;

    this.levelName = _levelData._id;
	this.tileDescriptions = _levelData.TileImages;

	this.parent = Main.puzzle;
	this.x = 0;
	this.y = 0;

	this.tornadoRemove = false;
	this.lastTornadoPiece = 0;
	this.second = false;

	// create the tile graphics for each available symbol
    this.createCubes( this.cacheSpriteList );
	this.createTiles( this.tileDescriptions, this.cacheSpriteList );
    this.removeTiles = [];

	// initialise the puzzle
	this.tiles = [];

    this.lastTimeString = "";
    this.overrideTileTimer = 0;
    this.overrideTileKey = null;

    // find scale of pieces for this level
    var nScale = parseFloat(_levelData.nScale);
    Main.pieceScale = nScale;

    // adjust puzzle vertical location
	var yOff = parseFloat(_levelData.yOffset);
    Main.puzzleOffsetY = yOff;

    // force canvas resize to set the piece scale
    EventHandlers.resizeCanvas();

    // find the puzzle layout from the level data and reset the puzzle
	this.puzzleLayout = _levelData.TileStructure;
	this.resetPuzzle( ["1", "2"], ["-","+"], this.puzzleLayout );
	
	this.multiMatchValue = 0;  //_baseData.nMultiMatchValue;
	this.speedMatchValue = _baseData.nSpeedBonusValue;
	this.speedMatchTime = _baseData.nSpeedBonusTime;
	this.levelBonusValues = JSON.parse("[" + _baseData.aLevelCompleteBonuses + "]");

	var j = 0;
	var count = 0;
	var symbol;
	var value;

	while ( true )
	{
		if ( count === 0 )
		{
			// any more to add?
			if ( j >= this.tileDescriptions.length )
				break;
			// how many to add... (convert string to integer)
			count = this.tileDescriptions[ j ]._num || 0;
			// what symbol to add...
			symbol = this.tileDescriptions[ j ]._name;
			// how many points is it worth...
			value = this.tileDescriptions[ j ]._value;
			j++;
		}

        // symbol s0 is a time block, they go into the puzzle where there is a '2' in the layout
        if ( symbol == "s0" )
            this.addTileToPuzzle( symbol, value, this.puzzleLayout, "2", "+", value );
        else
            this.addTileToPuzzle( symbol, value, this.puzzleLayout, "1", "-" );
		count--;
	}

	Main.puzzle.addChild( this );
    Main.forceResize = true;
};


// clean up and release memory
Puzzle.prototype.destroy = function()
{
	var i;

	// super destructor
	PIXI.Container.prototype.destroy.call( this );

	this.levelBonusValues = null;
	this.tileDescriptions = null;

	this.world = null;
	if ( this.tiles )
	{
		for( i = 0; i < this.tiles.length; i++ )
			this.tiles[i].destroy({texture: true, baseTexture: true});
		this.tiles = null;
	}
	this.managers = null;
	this.puzzleLayout = null;

    // clean up the blank cube sprites
    for ( var a = 0; a < this.blankCubes.length; a++ )
    {
        this.blankCubes[a].destroy({texture: true, baseTexture: true});
        this.blankTimeCubes[a].destroy({texture: true, baseTexture: true});
    }
    this.blankCubes = null;
    this.blankTimeCubes = null;

	if ( this.cacheSpriteList )
	{
		// delete the sprite list that forces textures into the PIXI cache
		for ( i = 0; i < this.cacheSpriteList.length; i++ )
			this.cacheSpriteList[i].destroy({texture: true, baseTexture: true});
		this.cacheSpriteList = null;
	}
};

// call update for each tile, remove tile from puzzle if its update returns false
Puzzle.prototype.update = function()
{
	var i;

	if ( this.cacheSpriteList && this.cacheSpriteList.length > 0 && this.second )
	{
        if ( Main.debug )
            console.log( "Puzzle.prototype destroying cacheSpriteList items", this.cacheSpriteList.length );
		// delete the sprite list that forces textures into the PIXI cache
		for ( i = 0; i < this.cacheSpriteList.length; i++ )
			this.cacheSpriteList[i].destroy({texture: true, baseTexture: true});
		this.cacheSpriteList = null;
	}
	this.second = true;

    // if the tiles are overridden for a limited time, update the timer
    if ( this.overrideTileTimer > 0 )
    {
        this.overrideTileTimer -= Main.elapsedTime;
        if ( this.overrideTileTimer <= 0 )
        {
            if ( Main.debug )
                console.log( "Puzzle.overrideTileTimer expired" );
            // switch them back when the timer expires
            this.overrideTileTimer = 0;
            this.overrideTileKey = null;
            this.forceDraw();
            // redraw the hovered and drop-pieces in the UI
            this.world.puzzleInput.resetSidePieces();
            // TODO: sound effect for override wearing off
        }
    }

    // remove any tiles that have been queued for removal
    this.removePendingTiles();

	var turning = false;
	if ( this.angle != this.targetAngle )
	{
		this.angle = Utils.rotateTo( this.angle, this.targetAngle, Puzzle.turnSpeed * Main.elapsedTime * 0.06 );
		this.rotate( this.angle );
		turning = true;
	}

	for ( i = this.tiles.length - 1; i >= 0; --i )
	{
		this.tiles[ i ].update( turning );
	}

	if ( this.tornadoRemove )
	{
		this.tornado();
	}

	// return false if the puzzle is stuck or finished, unless it is rotating or the tornado is going
	if ( this.angle == this.targetAngle && !this.tornadoRemove )
		return !this.puzzleLocked();

	return true;
};


Puzzle.prototype.setTargetAngle = function( _angle, _instant )
{
	this.targetAngle = Utils.normaliseAngle( _angle );

	if ( _instant )
	{
		this.angle = this.targetAngle;
		this.rotate( this.angle );
	}
};


Puzzle.prototype.adjustTargetAngle = function( _angle )
{
	if ( this.angle == this.targetAngle )
	{
		this.targetAngle = Utils.normaliseAngle( this.targetAngle + _angle );
		return true;
	}
	return false;
};


Puzzle.prototype.isTurning = function()
{
	return ( this.angle != this.targetAngle );
};


// rotate the puzzle to _angle and resort the sprites for depth order
Puzzle.prototype.rotate = function( _angle )
{
    var a = Utils.normaliseAnglePositive( _angle );
    for ( var i = this.tiles.length - 1; i >= 0; --i )
    {
        this.tiles[ i ].rotate3d( a );
    }
    this.reSort();
};


Puzzle.prototype.reSort = function()
{
	this.children.sort( function( a, b )
	{
        a.tz = a.tz || 0;
        b.tz = b.tz || 0;
		return b.tz - a.tz;
	} );
};


// force all tiles to redraw themselves at their current angles
Puzzle.prototype.forceDraw = function()
{
    for ( var i = this.tiles.length - 1; i >= 0; --i )
    {
        this.tiles[ i ].rotate3d();
    }
    this.reSort();
};


Puzzle.prototype.createCubes = function()
{
    this.blankCubes = [];
    this.blankTimeCubes = [];

    //
    // create sprite and pixel picking data for each cube angle
    //


    var symbolOffsets = this.managers.data.get( "symbol_offsets" );
    var symbol = new Sprite();
    symbol.create( this, "timeText_icon", this.managers.textures );

    for ( var a = 1; a <= 9; a++ )
    {
        // create blank tile sprites
        var sprite = new Sprite();
        sprite.create( this, "tile_" + a.toString(), this.managers.textures );
        this.blankCubes.push( sprite );

        // create data buffers for each angle of the cube (for pixel picking)
        var data = sprite.getPixels();
        this.managers.data.set( "maskData_" + a.toString(), data );

        // now that we've grabbed the pixels out of it, it is ok to move this sprite off-screen
        sprite.x = sprite.y = -1000;

        // create blank time tile sprites (reuse same mask data as the silhouette is identical)
        var timeSprite = new Sprite();
        var key = "time_tile_" + a.toString();
        timeSprite.create( this, key, this.managers.textures, -1000, -1000, false );

        // pre-print the "timeText_icon" image to the time cubes
        var base = this.addSymbolToCube( symbol, a - 1, timeSprite, symbolOffsets );
        // add the resulting canvas image to the texture manager
        this.managers.textures.set( key + "b", base );
        // switch the blankTimeCubes Sprite to use this new image source
        timeSprite.setFrame( key + "b", true );
        this.blankTimeCubes.push( timeSprite );
    }

    symbol.destroy();
};


// create tile graphics:
//
// 1. create a sprite for each angle of the cubes (1..9)
// 2. for each variety of symbol, create a sprite for it
// 2.1. clone the symbol sprite twice (two faces of the cube are visible)
// 2.2. clone the raw cube sprite
// 2.3. draw the two symbols into the raw cube using the data table offsets, scales, and skews
// 2.4. add the final cube picture to the texture manager with key cube_S_A
// (where S = symbol name, A = angle integer)
//
Puzzle.prototype.createTiles = function( _variety, _tmpSpr )
{
	//
	// print symbols on each cube angle picture
	//

	var symbolOffsets = this.managers.data.get( "symbol_offsets" );

	for ( var v = 0; v < _variety.length; v++ )
	{
        var name = _variety[ v ]._name;
        if ( name == "s0" )
        {
            this.timeTile( name, 90, _tmpSpr );
            continue;
        }

		var symbol = new Sprite();
		symbol.create( this, name, this.managers.textures );
		// for each cube angle
		for ( var b = 0; b < this.blankCubes.length; b++ )
		{
			var key = "cube_" + name + "_" + ( b + 1 ).toString();

			// if this cube texture hasn't been created already (a previous tile, maybe in previous puzzle)
			if ( !this.managers.textures.exists( key, false ) )
			{
                var base = this.addSymbolToCube( symbol, b, this.blankCubes[ b ], symbolOffsets );

				// add the resulting canvas image to the texture manager
				this.managers.textures.set( key, base );
			}

			// create a sprite using this texture to ensure it is in the VRAM
			// it will be destroyed after it has been displayed for one frame
			// created in the middle of the screen, they will be hidden by the puzzle
			var spr = new Sprite();
			spr.create( Main.puzzle, key, this.managers.textures, -1000, -1000 );
			_tmpSpr.push( spr );
		}

		symbol.destroy();
	}

};


Puzzle.prototype.addSymbolToCube = function( symbol, b, cube, symbolOffsets )
{
    // two faces of the cube are visible with different angles
    var symbolLft = symbol.createCanvasFromTexture();
    var symbolRgt = symbol.createCanvasFromTexture();

    // grab a blank tile image as a canvas surface
    var base = cube.createCanvasFromTexture();
    var w2 = base.width / 2;
    var h2 = base.height / 2;
    var bctx = base.getContext( '2d' );

    // scale, skew, transpose and draw symbols matching the visible sides of this cube canvas
    bctx.save();
    bctx.scale( symbolOffsets.scalex[ 0 ][ b ] * 0.5, 0.5 );
    bctx.transform( 1, symbolOffsets.skewy[ 0 ][ b ], 0, 1, 0, 0 );
    bctx.drawImage( symbolLft, w2 + symbolOffsets.offx[ 0 ][ b ] * Main.tileAssetScale - symbolLft.width / 2, h2 + symbolOffsets.offy[ 0 ][ b ] * Main.tileAssetScale - symbolLft.height / 2 );
    bctx.restore();

    bctx.scale( symbolOffsets.scalex[ 1 ][ b ] * 0.5, 0.5 );
    bctx.transform( 1, symbolOffsets.skewy[ 1 ][ b ], 0, 1, 0, 0 );
    bctx.drawImage( symbolRgt, w2 + symbolOffsets.offx[ 1 ][ b ] * Main.tileAssetScale - symbolRgt.width / 2, h2 + symbolOffsets.offy[ 1 ][ b ] * Main.tileAssetScale - symbolRgt.height / 2 );
    bctx.restore();

    return base;
};


Puzzle.prototype.timeTile = function( _name, _time, _tmpSpr )
{
    if ( Main.debug )
    {
        console.log( "Puzzle.timeTile", _time, _name );
    }

    var symbolOffsets = this.managers.data.get( "symbol_offsets" );

    // convert the time in ms into a string of minutes and seconds
    var ts = Utils.timeToString( _time * 1000 );

    // don't recreate the time texture if it's the one we are already displaying
    if ( ts == this.lastTimeString )
        return;

    this.lastTimeString = ts;

    // create a base text object containing the string to display on this cube
    var text = new PIXI.Text("\n" + ts, {
            fontFamily: 'mjd_font1',
            fontSize: 100 * Main.tileAssetScale,
            fill: '#ffffff', 
            align: 'center'
            //letterSpacing: 10         // TODO: nice to have if the game doesn't run too slowly - spread out the time digits a little more
        });
    //text.x = -1000;
    //text.y = -1000;
    text.renderCanvas( Main.renderer );
    var symbol = text.canvas;

    // for each cube angle plus one extra for the UI side-panel (PuzzleInput.dropPiece)
    for ( var b = 0; b < this.blankTimeCubes.length; b++ )
        this.addTimeToTile( _name, symbolOffsets, b, symbol, false, _tmpSpr );
    this.addTimeToTile( _name, symbolOffsets, 0, symbol, true, null );

    // always add to queue to destroy the base text object and it's associated texture
    // (pixi uses deferred rendering, if we destroy this here then pixi will crash due to the missing texture)
    if ( !this.cacheSpriteList )
        this.cacheSpriteList = [];
    this.cacheSpriteList.push(text);
};


Puzzle.prototype.addTimeToTile = function( _name, symbolOffsets, b, symbol, extraTexture, _tmpSpr )
{
    var key;

    if ( extraTexture )
    {
        key = "cube_s0b_1";
    }
    else
    {
        key = "cube_" + _name + "_" + ( b + 1 ).toString();
    }

    // two faces of the cube are visible with different angles
    var symbolLft = symbol;
    var symbolRgt = symbol;

    // grab a blank tile image as a canvas surface
    var base = this.blankTimeCubes[ b ].createCanvasFromTexture();
    var w2 = base.width / 2;
    var h2 = base.height / 2;
    var bctx = base.getContext( '2d' );

    // scale, skew, transpose and draw symbols matching the visible sides of this cube canvas
    bctx.save();
    bctx.scale( symbolOffsets.scalex[ 0 ][ b ] * 0.5, 0.5 );
    bctx.transform( 1, symbolOffsets.skewy[ 0 ][ b ], 0, 1, 0, 0 );
    bctx.drawImage( symbolLft, w2 + symbolOffsets.offx[ 0 ][ b ] * Main.tileAssetScale - symbolLft.width / 2, h2 + symbolOffsets.offy[ 0 ][ b ] * Main.tileAssetScale - symbolLft.height / 2 );
    bctx.restore();

	bctx.save();
	bctx.scale( symbolOffsets.scalex[ 1 ][ b ] * 0.5, 0.5 );
	bctx.transform( 1, symbolOffsets.skewy[ 1 ][ b ], 0, 1, 0, 0 );
	bctx.drawImage( symbolRgt, w2 + symbolOffsets.offx[ 1 ][ b ] * Main.tileAssetScale - symbolRgt.width / 2, h2 + symbolOffsets.offy[ 1 ][ b ] * Main.tileAssetScale - symbolRgt.height / 2 );
	bctx.restore();

    // add the resulting canvas image to the texture manager
    this.managers.textures.set( key, base );

    if ( _tmpSpr )
    {
        // create a sprite using this texture to ensure it is in the VRAM
        // it will be destroyed after it has been displayed for one frame
        // created in the middle of the screen, they will be hidden by the puzzle
        var spr = new Sprite();
        spr.create( Main.puzzle, key, this.managers.textures, -1000, -1000);
        spr.destroyTexture = true;
        _tmpSpr.push( spr );
    }
};


// is a location over a tile?
// return the 'top-most' tile (lowest .tz member)
// NOTE: cannot pick a fading tile (tile.fader !== null)
Puzzle.prototype.tilePicker = function( _x, _y )
{
	var pickList = [];
	var topTile = null;
	var tile = null;

	for ( var i = this.tiles.length - 1; i >= 0; --i )
	{
		tile = this.tiles[ i ];
		if ( !tile.fader && tile.picked( _x, _y ) )
			pickList.push( tile );
	}

	if ( pickList.length > 0 )
	{
		for ( i = pickList.length - 1; i >= 0; --i )
		{
			tile = pickList[ i ];
			if ( !topTile || topTile.tz > tile.tz )
				topTile = tile;
		}

		//topTile.debugDraw();
		return topTile;
	}

	return null;
};


// is this tile open for selection?
Puzzle.prototype.tileOpen = function( _tile )
{
	var x = _tile.cx;
	var y = _tile.cy;
	var z = _tile.cz;
	return ( this.spaceOpen( x + 1, y, z ) && this.spaceOpen( x, y, z + 1 ) ) ||
		( this.spaceOpen( x - 1, y, z ) && this.spaceOpen( x, y, z + 1 ) ) ||
		( this.spaceOpen( x - 1, y, z ) && this.spaceOpen( x, y, z - 1 ) ) ||
		( this.spaceOpen( x + 1, y, z ) && this.spaceOpen( x, y, z - 1 ) );
};


// is this grid space open?
Puzzle.prototype.spaceOpen = function( _x, _y, _z )
{
	// NOTE: could speed this up with a 'structure' like the AS3 (puzzle.as:365)
	// but I believe it's only used for picking, where speed is not an issue.
	// The structure solution involves extra code to maintain its state, this
	// is simpler.
	for ( var i = this.tiles.length - 1; i >= 0; --i )
	{
		var tile = this.tiles[ i ];
		// fading tiles are counted as open spaces
		if ( !tile.fader && tile.cx == _x && tile.cy == _y && tile.cz == _z )
			return false;
	}
	return true;
};


// callback from a timer event, could happen at any point in the game sequence
Puzzle.prototype.removeTile = function( _tile )
{
    // queue this tile for removal at the next Puzzle.update
    if ( !this.removeTiles )
        this.removeTiles = [];

    this.removeTiles.push( _tile );
};


// remove tiles safely (they've been waiting in the removeTiles queue)
Puzzle.prototype.removePendingTiles = function()
{
    if ( !this.removeTiles || this.removeTiles.length === 0 )
        return;

    for( var t = this.removeTiles.length - 1; t >= 0; --t )
    {
        var tile = this.removeTiles[t];

    	if ( tile.children.length > 0 )
        {
            continue;
        }

    	var i = this.tiles.indexOf( tile );
    	if ( i != -1 )
    	{
    		tile.destroy();
    		this.tiles.splice( i, 1 );
    	}

        this.removeTiles.splice( t, 1 );
    }

    if ( Main.eventChangeAdOnMatch )
    {
        Main.arenaHelper.sendEventChange();
    }

    this.reSort();
};


Puzzle.prototype.fadeTile = function( _tile, _callback )
{
	Game.effects.add( Effects.REMOVE_TILE, _tile, 0, 0 );	
	_tile.addFader( -1/10, 1, _callback, this, _tile, -0.5 );

    // ensure effect is at the correct z depth
    this.reSort();
};


Puzzle.prototype.resetPuzzle = function( _availableList, _usedList, _layout )
{
    for(var x = 0; x < _layout._x; x++)
    {
        for(var y = 0; y < _layout._y; y++)
        {
            for(var z = 0; z < _layout._z; z++)
            {
                var c = _layout.layer[ z ].row[ y ].charAt( x );
                var i = _usedList.indexOf( c );
                if ( i != -1 )
                    _layout.layer[ z ].row[ y ] = Utils.replaceAt( _layout.layer[ z ].row[ y ], x, _availableList[i] );
            }
        }
    }
};


Puzzle.prototype.addTileToPuzzle = function( _symbol, _value, _layout, _available, _used, _timerStart )
{
	// find an unused and required tile location in the layout
	var x, y, z, c = 1000;
	do {
		x = Math.floor( Math.random() * _layout._x );
		y = Math.floor( Math.random() * _layout._y );
		z = Math.floor( Math.random() * _layout._z );
	} while ( _layout.layer[ z ].row[ y ].charAt( x ) !== _available && --c > 0 );

    // couldn't find one with random?
    if ( c <= 0 )
    {
        for(x = 0; x < _layout._x; x++)
            for(y = 0; y < _layout._y; y++)
                for(z = 0; z < _layout._z; z++)
                    if ( _layout.layer[ z ].row[ y ].charAt(x) == _available )
                    {
                        break;
                    }
        console.alert("ERROR in level data, cannot add Tile to full puzzle!");
    }

	// add the tile there
//    this.tiles.push( new Tile( this, this.managers, x - ( _layout._x - 1 ) / 2, -((_layout._z - 1) - z), y - ( _layout._y - 1 ) / 2, _symbol, _value, _timerStart ) );
    this.tiles.push( new Tile( this, this.managers, x - ( _layout._x - 1 ) / 2, -z, y - ( _layout._y - 1 ) / 2, _symbol, _value, _timerStart ) );

	// mark the location in the layout as 'used'
	_layout.layer[ z ].row[ y ] = Utils.replaceAt( _layout.layer[ z ].row[ y ], x, _used );
};


Puzzle.prototype.matchingPair = function( _tile, _list )
{
	for( var i = _list.length - 1; i >= 0; --i )
	{
		if ( _list[i].symbol == _tile.symbol )
		{
			return true;
		}
	}
	return false;
};


Puzzle.prototype.puzzleLocked = function()
{
	var open = [];

	var c = this.tiles.length;
	while(--c >= 0)
	{
		var tile = this.tiles[c];
		if ( this.tileOpen( tile ) )
		{
			if ( this.matchingPair( tile, open ) )
			{
				// there is at least one open matching pair, puzzle is not locked
				return false;
			}
			open.push( tile );
		}
	}

	// there are no matching pairs of tiles, puzzle is locked
	return true;
};


Puzzle.prototype.finished = function( _fadingIsFinished )
{
	// return true if there are no tiles left
	if ( !this.tiles || this.tiles.length === 0 )
		return true;

	if ( _fadingIsFinished )
	{
		// if all remaining tiles are fading, return true
		for( var i = this.tiles.length - 1; i >= 0; --i )
			if ( !this.tiles[i].fader )
				return false;
		return true;
	}

	return false;
};


Puzzle.prototype.reshuffle = function()
{
	var c = 1000;
	var tl = this.tiles.length;
	while(c-- > 0)
	{
		// pick two tiles at random and swap them
		var t1 = Math.floor(Math.random() * tl);
		var t2 = Math.floor(Math.random() * tl);
		if ( t1 != t2 )
		{
			// make a clone of t1
			var tmp = this.tiles[t1].clone();
			// move clone of t1 to t2 location
			this.tiles[t2].copyLocation( tmp );
			// move t2 to t1 location
			this.tiles[t1].copyLocation( this.tiles[t2] );
			this.tiles[t1].destroy();
			// make a clone of t2
			this.tiles[t1] = this.tiles[t2].clone();
			this.tiles[t2].destroy();
			this.tiles[t2] = tmp;
		}
	}

	if ( Main.debug )
		console.log( "Puzzle pieces reshuffled" );

	// force full redraw
	this.setTargetAngle( this.targetAngle, true );
};


// return the highest tile with the lowest .tz member
// will not pick a fading tile (tile.fader !== null) or one which is part of the tornado
Puzzle.prototype.highestTile = function()
{
	var topTile = null;

	for ( var i = this.tiles.length - 1; i >= 0; --i )
	{
		var tile = this.tiles[ i ];
		if ( !tile.fader && !tile.tornadoRemove )
			if ( !topTile ||
				( tile.cy < topTile.cy && 
				  topTile.tz > tile.tz ))
				topTile = tile;
	}

	return topTile;
};


Puzzle.prototype.tornado = function()
{
	// rotate constantly
	this.setTargetAngle( this.angle + Puzzle.turnSpeed );

	// start highest tile moving upward at regular intervals
	if ( !this.lastTornadoPiece || Main.time - this.lastTornadoPiece > 100 )
	{
		this.lastTornadoPiece = Main.time;
		var t = this.highestTile();
		if ( t )
		{
			if ( !Main.suppressBigAnimations )
				t.tornadoRemove = true;
			else
				t.cy = -100;
		}
	}

	// continue to move any tile that is moving up, until it leaves the screen
	for ( var i = this.tiles.length - 1; i >= 0; --i )
	{
		var tile = this.tiles[ i ];
		if ( tile.tornadoRemove )
		{
			tile.cy -= 0.2;
		}
		if ( tile.cy < -13 )
		{
			tile.destroy();
			this.tiles.splice( i, 1 );
		}
	}

	// detect when all tiles are cleared
	if ( this.tiles.length === 0 )
	{
		this.tornadoRemove = false;
	}
};


Puzzle.prototype.contains = function( _point )
{
	var r = this.getBounds();
	return r.contains( _point.x, _point.y );
};


Puzzle.prototype.overrideTiles = function( _timeSecs, _key )
{
    if ( Main.debug )
        console.log( "Puzzle.overrideTiles with " + _key + " for " + _timeSecs + " secs.");
    this.overrideTileTimer = _timeSecs * 1000;
    this.overrideTileKey = _key;
    this.forceDraw();
    this.world.puzzleInput.resetSidePieces();
};
