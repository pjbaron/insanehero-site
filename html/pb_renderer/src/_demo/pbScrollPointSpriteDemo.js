/**
 *
 * pbScrollPointSpriteDemo.js - a scrolling tile world with multiple levels of parallax
 *
 *
 * TODO: non-scaled/skewed/rotated tile layers should be drawn using a faster render mode.
 * (Not pbImage.isParticle because that can't handle tiles in the source image, it draws the whole thing)
 * 
 */



// created while the data is loading (preloader)
function pbScrollPointSpriteDemo( docId )
{
	console.log( "pbScrollPointSpriteDemo c'tor entry" );

	var _this = this;

	this.numLayers = 2;
	// dat.GUI controlled variables and callbacks
	this.numCtrl = gui.add(this, "numLayers").min(0).max(MAX_SPRITES).step(250).listen();
	this.numCtrl.onFinishChange(function(value) { if (!value) _this.numLayers = 2; _this.restart(); });

	this.tileMap = null;
	this.bgSpr = null;
	this.tileSurface = null;
	this.mapSprites = null;
	this.scrollLayers = null;
	this.mapWidth = 0;
	this.mapHeight = 0;
	this.fps60 = 0;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	this.levelData = pbPhaserRender.loader.loadFile( "../img/tiles/level1.json" );
	this.bgImg = pbPhaserRender.loader.loadImage( "background", "../img/tiles/background_128x512.png" );
	this.dudeImg = pbPhaserRender.loader.loadImage( "dude", "../img/tiles/dude.png" );
	this.tileImg = pbPhaserRender.loader.loadImage( "tiles", "../img/tiles/tiles-1.png" );
	
	console.log( "pbScrollPointSpriteDemo c'tor exit" );
}


pbScrollPointSpriteDemo.prototype.allLoaded = function()
{
	console.log( "pbScrollPointSpriteDemo.allLoaded" );

	this.phaserRender = new pbRenderer( useRenderer, this.docId, this.create, this.update, this );
};


pbScrollPointSpriteDemo.prototype.create = function()
{
	console.log("pbScrollPointSpriteDemo.create");

	var tileMapJSON = pbPhaserRender.loader.getFile(this.levelData).responseText;

	// Tile Map data format:
	//
	// width: number
	// height: number
	// layers: array
	//		object:
	//			name: string ("Tile Layer 1")
	//			type: string ("tilelayer")
	//			x: number
	//			y: number
	//			width: number
	//			height: number
	//			opacity: number
	//			visible: boolean
	//	 		data: array
	// tilesets: array
	//		object:
	//			name: string ("tiles-1")
	//			firstgid: number
	//			image: string ("tiles-1.png")
	//			imagewidth: number
	//			imageheight: number
	//			margin: number
	//			spacing: number
	//			tilewidth: number
	//			tileheight: number
	//			properties: object
	// tilewidth: number (duplicate of tilesets object 'tilewidth')
	// tileheight: number (duplicate of tilesets object 'tileheight')
	// orientation: string ("orthogonal")
	// properties: object
	// version: number
	this.tileMap = JSON.parse(tileMapJSON);

	this.createSurfaces();
};


pbScrollPointSpriteDemo.prototype.destroy = function()
{
	console.log("pbScrollPointSpriteDemo.destroy");

	gui.remove(this.numCtrl);

	this.phaserRender.destroy();
	this.phaserRender = null;

	this.tileMap = null;
	this.bgSpr.destroy();
	this.bgSpr = null;
	this.tileSurface.destroy();
	this.tileSurface = null;
	this.mapSprites = null;

	for(var i = 0, l = this.scrollLayers.length; i < l; i++)
		this.scrollLayers[i].destroy();
	this.scrollLayers = null;

	this.loader = null;

	this.levelData = null;
	this.bgImg = null;
	this.dudeImg = null;
	this.tileImg = null;
};


pbScrollPointSpriteDemo.prototype.restart = function()
{
	console.log("pbScrollPointSpriteDemo.restart");
	
	this.destroy();
	this.create();
};


pbScrollPointSpriteDemo.prototype.createSurfaces = function()
{
	console.log("pbScrollPointSpriteDemo.createSurfaces");

	// the background image (tiled and stretched to fill the whole viewport)
	var imageData = pbPhaserRender.loader.getFile( this.bgImg );
	var surface = new pbSurface();
	surface.create(0, 0, 1, 1, imageData);
	surface.cellTextureBounds[0][0].width = pbPhaserRender.width / surface.cellWide;
	var img = new imageClass();
	img.create(surface, 0, 0, 0, true, false);
	this.bgSpr = new pbTransformObject();

	// scale the tiled background to compensate for the extra drawn width from tiling
	// TODO: create a simple API to fix surface and sprite scaling, or add a separate variable to handle tiling properly
	this.bgSpr.create(img, 0, 0, 1.0, 0, pbPhaserRender.width / surface.cellWide, pbPhaserRender.height / surface.cellHigh);
	rootLayer.addChild(this.bgSpr);

	// set up the tiles in a pbTransformObject
	imageData = pbPhaserRender.loader.getFile( this.tileImg );
	this.tileSurface = new pbSurface();
	this.tileSurface.create(this.tileMap.tilesets[0].tilewidth, this.tileMap.tilesets[0].tileheight, this.tileMap.tilesets[0].imagewidth / this.tileMap.tilesets[0].tilewidth, this.tileMap.tilesets[0].imageheight / this.tileMap.tilesets[0].tileheight, imageData);
	this.tileSurface.isNPOT = true;

	// create all the scrolling layers to draw from the tileSurface
	this.createLayers(this.tileSurface);
};


pbScrollPointSpriteDemo.prototype.createLayers = function(_surface)
{
	// create scrolling simple layers using Point sprite drawing for maximum speed
	this.scrollLayers = [];
	for(var i = 0; i < this.numLayers; i++)
		this.addLayer(_surface);
};


pbScrollPointSpriteDemo.prototype.addLayer = function(_surface)
{
	var layer = new pbSimpleLayer();
	layer.create(rootLayer, this.phaserRender, 0, 0, _surface);
	layer.setDrawingFunctions( layer.prepareXYUV, layer.drawPointAnim );
	rootLayer.addChild(layer);
	var i = this.scrollLayers.length;
	layer.dirX = 1 / (i + 1);
	layer.dirY = 1 - 1 / (i + 1);
	// draw map tiles into the new layer
	this.drawMap(layer);
	this.scrollLayers.push(layer);
};


pbScrollPointSpriteDemo.prototype.drawMap = function(_layer)
{
	// pre-calc pixel dimensions of map
	this.mapWidth = this.tileMap.layers[0].width * this.tileMap.tilesets[0].tilewidth;
	this.mapHeight = this.tileMap.layers[0].height * this.tileMap.tilesets[0].tileheight;

	this.mapSprites = [];
	for(var y = 0; y < this.tileMap.layers[0].height; y++)
	{
		this.mapSprites[y] = [];
		for(var x = 0; x < this.tileMap.layers[0].width; x++)
		{
			var tile = this.tileMap.layers[0].data[x + y * this.tileMap.layers[0].width];

			// 0 tile number is empty space, all other tile numbers are +1 their actual index position in the tile texture
			if (tile !== 0)
			{
				var s = this.createTile(x * this.tileMap.tilesets[0].tilewidth, y * this.tileMap.tilesets[0].tileheight, tile - 1);
				_layer.addChild(s);
				this.mapSprites[y][x] = s;
			}
		}
	}
};


pbScrollPointSpriteDemo.prototype.createTile = function(_x, _y, _cell)
{
	var img = new imageClass();
	img.create(this.tileSurface, _cell, 0, 0, false, false);
	var spr = new pbTransformObject();
	spr.create(img, _x, _y, 0.5, 0, 1, 1);
	return spr;
};


pbScrollPointSpriteDemo.prototype.update = function()
{
	for(var i = 0, l = this.scrollLayers.length; i < l; i++)
	{
		var sx = -(this.scrollLayers[i].x + this.scrollLayers[i].dirX);
		var sy = -(this.scrollLayers[i].y + this.scrollLayers[i].dirY);

		if (sx <= 0)
		{
			sx = 0;
			this.scrollLayers[i].dirX = -this.scrollLayers[i].dirX;
		}

		if (sx >= this.mapWidth - pbPhaserRender.width)
		{
			sx = this.mapWidth - pbPhaserRender.width - 1;
			this.scrollLayers[i].dirX = -this.scrollLayers[i].dirX;
		}

		if (sy <= 0)
		{
			sy = 0;
			this.scrollLayers[i].dirY = -this.scrollLayers[i].dirY;
		}

		if (sy >= this.mapHeight - pbPhaserRender.height)
		{
			sy = this.mapHeight - pbPhaserRender.height - 1;
			this.scrollLayers[i].dirY = -this.scrollLayers[i].dirY;
		}

		this.scrollLayers[i].x = -sx;
		this.scrollLayers[i].y = -sy;
	}

	// rough fps balancing by adjusting the number of layers, attempts to find the maximum possible at > 57 fps
	if (fps >= 59)
	{
		// don't add more until the fps has been at 60 for one second
		if (this.fps60++ > 60 && fps >= 60)
		{
			// add more with a gradually increasing amount as the fps stays at 60
	 		this.addLayer(this.tileSurface);
	 		this.numLayers = this.scrollLayers.length;
	 		// delay before adding any more
			this.fps60 = 0;
		}
	}
	else
	{
		// fps dropped a little, reset counter
		this.fps60 = 0;

		// if (fps > 0 && fps <= 57 && (pbPhaserRender.frameCount & 15) === 0)
		// {
		//  	// fps is too low, remove sprites... more when the fps is lower
		//   	this.removeSprites((58 - fps) * 16);
		// }
	}

};

