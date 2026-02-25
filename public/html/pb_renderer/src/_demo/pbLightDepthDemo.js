/**
 *
 * Empty demo file, loads a texture and sets up the renderer...
 *
 */



// created while the data is loading (preloader)
function pbLightDepthDemo( docId )
{
	console.log( "pbLightDepthDemo c'tor entry" );

	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	this.multiLightBgShaderJSON = pbPhaserRender.loader.loadFile( "../json/multiLightDepthBgSources.json" );
	this.levelData = pbPhaserRender.loader.loadFile( "../img/tiles/dungeon.json" );
	this.tileImg = pbPhaserRender.loader.loadImage( "tiles", "../img/tiles/gridtiles.png" );
	pbPhaserRender.loader.loadImage( "wizard", "../img/spritesheets/wizard.png", 32, 32, 30, 4 );
	pbPhaserRender.loader.loadImage( "minotaur", "../img/spritesheets/minotaur.png", 32, 32, 30, 4 );
	pbPhaserRender.loader.loadImage( "bullet", "../img/bullet_glow.png" );
	this.floorImg = pbPhaserRender.loader.loadImage( "floor", "../img/bumpy_floor.png" );
	this.depthImg = pbPhaserRender.loader.loadImage( "depthmap", "../img/tiles/bumpy_floor_tile.png" );

	console.log( "pbLightDepthDemo c'tor exit" );
}


pbLightDepthDemo.prototype.create = function()
{
	console.log("pbLightDepthDemo.create");

	this.lightData = [
		// x, y, power/color, range
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
		0.0, 0.0, 0.0, 0.0,
	];



	// add the shader
	var jsonString = pbPhaserRender.loader.getFile( this.multiLightBgShaderJSON ).responseText;
	this.multiLightBgShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

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

	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	this.rttTexture = pbWebGlTextures.initTexture(1, pbPhaserRender.width, pbPhaserRender.height);
	this.rttFramebuffer = pbWebGlTextures.useFramebufferRenderbuffer( this.rttTexture );

	// create the filter destination texture and framebuffer
	this.filterTexture = pbWebGlTextures.initTexture(2, pbPhaserRender.width, pbPhaserRender.height);
	this.filterFramebuffer = pbWebGlTextures.initFramebuffer(this.filterTexture, null);

	// set up the renderer postUpdate callback to apply the filter and draw the result on the display
    pbPhaserRender.renderer.postUpdate = this.postUpdate;

    // create a top layer that doesn't cast shadows
	this.topLayer = new layerClass();
	this.topLayer.create(rootLayer, this.phaserRender, 0, 0, 1.0, 0, 1.0, 1.0);

	// create the wizard
	// NOTE: 'move' uses fixed point integers with three decimal places of precision (* 1000)
    this.wiz = new pbSprite();
    this.wiz.createWithKey(32, 32, "wizard", this.topLayer);
    this.wiz.z = 0;
    this.wiz.move = { x : 1000, y : 1000, cellFrame : 0, dx : 0, dy : 0, speed : 50 };
    this.wiz.light = { x : this.wiz.surface.cellWide * 0.5, y : this.wiz.surface.cellHigh * 0.5, r : 0.0, g : 0.0, b : 8.0, range : 0.40 };

    // create the enemies
    this.enemy = [];
    for(var e = 0; e < 10; e++)
    {
    	var enemy = new pbSprite();
    	enemy.createWithKey(32, 32, "minotaur", this.topLayer);
	    enemy.z = 0;
    	enemy.move = { x : 1000, y : 1000, cellFrame : 0, dx : 0, dy : 0, speed : 10 + Math.floor(Math.random() * 40) };
    	enemy.light = { x : enemy.surface.cellWide * 0.5, y : enemy.surface.cellHigh * 0.5, r : 0.50 + Math.random() * 0.5, g : 0.50 + Math.random() * 0.5, b : 0.0, range : 0.15 + e / 50.0 };
    	this.enemy.push(enemy);
    	this.moveToRandomEmptyLocation(this.enemy[e]);
    }

    // create the bullets
    this.bullets = [];

    // get the ImageData for the floor
	var imageData = pbPhaserRender.loader.getFile( this.floorImg );
	// upload the floor image directly to the correct texture register on the GPU (it's hardwired in the shader to texture number 3)
	pbPhaserRender.renderer.graphics.textures.prepare(imageData, false, true, 3 );

    // get the ImageData for the depthmap
	imageData = pbPhaserRender.loader.getFile( this.depthImg );
	// upload the depthmap image directly to the correct texture register on the GPU (it's hardwired in the shader to texture number 4)
	pbPhaserRender.renderer.graphics.textures.prepare(imageData, false, true, 4 );
};


/**
 * moveToRandomEmptyLocation - pick a random location in the map and move _who there
 *
 * @param  {[type]} _who [description]
 */
pbLightDepthDemo.prototype.moveToRandomEmptyLocation = function(_who)
{
	var w = this.tileMap.layers[0].width;
	var h = this.tileMap.layers[0].height;
	var rx, ry;
	do{
		rx = Math.floor(Math.random() * w);
		ry = Math.floor(Math.random() * h);
	}while(this.collide(rx, ry));
	_who.move.x = rx * 1000;
	_who.move.y = ry * 1000;
};


pbLightDepthDemo.prototype.destroy = function()
{
	console.log("pbLightDepthDemo.destroy");

	if (this.wiz)
		this.wiz.destroy();
	this.wiz = null;
	


	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;

	this.filterTexture = null;
	this.filterFramebuffer = null;
};


pbLightDepthDemo.prototype.createSurfaces = function()
{
	console.log("pbScrollDemo.createSurfaces");

	// set up the tiles in a pbTransformObject
	imageData = pbPhaserRender.loader.getFile( this.tileImg );
	this.tileSurface = new pbSurface();
	this.tileSurface.create(this.tileMap.tilesets[0].tilewidth, this.tileMap.tilesets[0].tileheight, this.tileMap.tilesets[0].imagewidth / this.tileMap.tilesets[0].tilewidth, this.tileMap.tilesets[0].imageheight / this.tileMap.tilesets[0].tileheight, imageData);
	this.tileSurface.isNPOT = true;

	// create all the scrolling layers to draw from the tileSurface
	this.createLayers(this.tileSurface);
};


pbLightDepthDemo.prototype.createLayers = function(_surface)
{
	// create the scrolling layers
	this.tileLayers = [];
	this.addLayer(_surface);
};


pbLightDepthDemo.prototype.addLayer = function(_surface)
{
	var layer = new layerClass();
	layer.create(rootLayer, this.phaserRender, 0, 0, 1, 0, 1, 1);
	rootLayer.addChild(layer);

	var i = this.tileLayers.length;
	// draw map tiles into the new layer
	this.drawMap(layer);
	this.tileLayers.push(layer);
};


pbLightDepthDemo.prototype.drawMap = function(_layer)
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


pbLightDepthDemo.prototype.createTile = function(_x, _y, _cell)
{
	var img = new imageClass();
	img.create(this.tileSurface, _cell, 0, 0, false, false);
	var spr = new pbTransformObject();
	spr.create(img, _x, _y, 0.5, 0, 1, 1);
	return spr;
};


pbLightDepthDemo.prototype.restart = function()
{
	console.log("pbLightDepthDemo.restart");
	
	this.destroy();
	this.create();
};


pbLightDepthDemo.prototype.addSprites = function()
{
	console.log("pbLightDepthDemo.addSprites");

};


pbLightDepthDemo.prototype.collide = function(_x, _y)
{
	var tile = this.tileMap.layers[0].data[_x + _y * this.tileMap.layers[0].width];
	return (tile !== 0);
};


pbLightDepthDemo.prototype.dirChoose = function(_who, _dir)
{
	if (_who.x % 1000 !== 0 || _who.y % 1000 !== 0)
		return;

	var wx = _who.x / 1000;
	var wy = _who.y / 1000;
	do {
		// pick a direction at random (0 = right, 1 = left, 2 = down, 3 = up)
		var d = Math.floor(Math.random() * 4);
		// decrease chance of reversing direction
		if (_dir !== undefined)
		{
			var reverse = [ 1, 0, 3, 2 ];
			if (d === reverse[_dir])
				d = Math.floor(Math.random() * 4);
			if (d === reverse[_dir])
				d = Math.floor(Math.random() * 4);
			if (d === reverse[_dir])
				d = Math.floor(Math.random() * 4);
		}
		switch(d)
		{
			case 0:
				if (!this.collide(wx + 1, wy))
				{
					_who.dx = _who.speed;
					_who.dy = 0;
					return;
				}
				break;
			case 1:
				if (!this.collide(wx - 1, wy))
				{
					_who.dx = -_who.speed;
					_who.dy = 0;
					return;
				}
				break;
			case 2:
				if (!this.collide(wx, wy + 1))
				{
					_who.dx = 0;
					_who.dy = _who.speed;
					return;
				}
				break;
			case 3:
				if (!this.collide(wx, wy - 1))
				{
					_who.dx = 0;
					_who.dy = -_who.speed;
					return;
				}
				break;
		}
	} while(true);
};


/**
 * fract - given fixed point integers with 3 decimal places of precision, return the fractional component
 *
 * @param  {[type]} _value [description]
 *
 * @return {[type]}        [description]
 */
function fract(_value)
{
	return _value % 1000;
}


pbLightDepthDemo.prototype.randomWalk = function(who)
{
	var wx = Math.floor(who.move.x / 1000);
	var wy = Math.floor(who.move.y / 1000);

	// sometimes we just turn
	if (Math.random() < 0.25)
		this.dirChoose(who.move, [ 0, 1, 2, 3 ][who.move.dx > 0 ? 0 : who.move.dx < 0 ? 1 : who.move.dy > 0 ? 2 : 3]);

	// pick a new direction when we bump into a wall
	if (who.move.dx > 0)
	{
		if (who.move.dx >= 1000 - fract(who.move.x) && this.collide(wx + 2, wy))
		{
			who.move.x = (wx + 1) * 1000;
			this.dirChoose(who.move, 0);
		}
	}
	if (who.move.dx < 0)
	{
		if (who.move.dx < -fract(who.move.x) && this.collide(wx - 1, wy))
		{
			who.move.x -= who.move.x % 1000;
			this.dirChoose(who.move, 1);
		}
	}
	if (who.move.dy > 0)
	{
		if (who.move.dy >= 1000 - fract(who.move.y) && this.collide(wx, wy + 2))
		{
			who.move.y = (wy + 1) * 1000;
			this.dirChoose(who.move, 2);
		}
	}
	if (who.move.dy < 0)
	{
		if (who.move.dy < -fract(who.move.y) && this.collide(wx, wy - 1))
		{
			who.move.y -= who.move.y % 1000;
			this.dirChoose(who.move, 3);
		}
	}

	// move in the current direction
	who.move.x += who.move.dx;
	who.move.y += who.move.dy;

	// update the sprite position to match our logical position
	who.x = (who.move.x / 1000) * this.tileMap.tilesets[0].tilewidth;
	who.y = (who.move.y / 1000) * this.tileMap.tilesets[0].tileheight;

	// animate the sprite, showing the correct direction frames
	who.move.cellFrame += 1;
	if (who.move.cellFrame >= 30)
		who.move.cellFrame = 0;
	if (who.move.dx > 0)
		who.image.cellFrame = who.move.cellFrame + 90;
	else if (who.move.dx < 0)
		who.image.cellFrame = who.move.cellFrame + 30;
	else if (who.move.dy > 0)
		who.image.cellFrame = who.move.cellFrame + 0;
	else if (who.move.dy < 0)
		who.image.cellFrame = who.move.cellFrame + 60;
};


pbLightDepthDemo.prototype.shoot = function(who)
{
	if (this.bullets.length < 5)
	{
		var bullet = new pbSprite();
		bullet.createWithKey(32, 32, "bullet", this.topLayer);
		bullet.anchorX = bullet.anchorY = 0.5;
	    bullet.z = 0;
	    bullet.life = 60 * 5;
		bullet.move = { x : who.move.x + 500, y : who.move.y + 250, cellFrame : 0, dx : who.move.dx * 3, dy : who.move.dy * 3, speed : 100 };
		bullet.light = { x : 0.0, y : 0.0, r : 4.0, g : 0.0, b : 0.0, range : 0.30 };
		this.bullets.push(bullet);
	}
};


/**
 * update - called every frame before drawing, run the AI for game entities
 *
 */
pbLightDepthDemo.prototype.update = function()
{
	// wizard walk and shoot
	this.randomWalk(this.wiz);
	if ((pbPhaserRender.frameCount & 0x0f) === 0 && Math.random() < 0.30)
	{
		this.shoot(this.wiz);
	}

	var j, l;

	// enemies walk
	for(j = 0, l = this.enemy.length; j < l; j++)
	{
		this.randomWalk(this.enemy[j]);
	}

	// bullets move and collide
	for(j = this.bullets.length - 1; j >= 0; j--)
	{
		var bullet = this.bullets[j];

		// move in the current direction
		bullet.move.x += bullet.move.dx;
		bullet.move.y += bullet.move.dy;

		// update the sprite position to match our logical position
		bullet.x = (bullet.move.x / 1000) * this.tileMap.tilesets[0].tilewidth;
		bullet.y = (bullet.move.y / 1000) * this.tileMap.tilesets[0].tileheight;

		if (bullet.move.dx !== 0 || bullet.move.dy !== 0)
		{
			// hit a wall
			var bx = Math.floor(bullet.move.x / 1000);
			var by = Math.floor(bullet.move.y / 1000);
			if (this.collide(bx + Math.sign(bullet.move.dx), by + Math.sign(bullet.move.dy)))
			{
				// stop moving
				bullet.move.dx = bullet.move.dy = 0;
				// die in a short while
				bullet.life = 0;
			}
		}

		// life timer has expired
		if (bullet.life-- <= 0)
		{
			// remove the bullet
			bullet.destroy();
			this.bullets.splice(j, 1);
		}
	}
};


/**
 * postUpdate - apply the filter to the rttTexture, then draw the results on screen
 *
 */
pbLightDepthDemo.prototype.postUpdate = function()
{
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	// copy the rttTexture to the filterFramebuffer attached texture, applying a shader as it draws
	gl.activeTexture(gl.TEXTURE1);
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.filterFramebuffer);
	pbPhaserRender.renderer.graphics.applyShaderToTexture( this.rttTexture, this.setShader, this );

	// update transforms and draw sprites that are not shadow casters
	this.topLayer.update();

	// draw the filter texture to the display
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.activeTexture(gl.TEXTURE2);
	pbPhaserRender.renderer.graphics.drawTextureToDisplay( this.filterTexture );
};


// pack bytes _r, _g and _b into a single float with four precision bits each
function pack(_r, _g, _b)
{
	return (Math.floor(_r * 16.0) + Math.floor(_g * 16.0) * 256.0 + Math.floor(_b * 16.0) * 256.0 * 256.0);
}


pbLightDepthDemo.prototype.setLight = function(index, who)
{
	var w = this.tileMap.tilesets[0].tilewidth;
	var h = this.tileMap.tilesets[0].tileheight;
	this.lightData[index * 4 + 0] = (who.move.x / 1000 * w + who.light.x) / pbPhaserRender.width;
	this.lightData[index * 4 + 1] = 1.0 - (who.move.y / 1000 * h + who.light.y) / pbPhaserRender.height;
	this.lightData[index * 4 + 2] = pack(who.light.r, who.light.g, who.light.b);
	this.lightData[index * 4 + 3] = who.light.range;
};

/**
 * setLightData - build the lightData array ready for the shader to use
 */
pbLightDepthDemo.prototype.setLightData = function()
{
	// attach light to the wizard
	this.setLight(0, this.wiz);

	// attach lights to the enemies
	var i = 1, j = 0, l;
	for(j = 0, l = this.enemy.length; j < l; j++)
	{
		this.setLight(i, this.enemy[j]);
		if (++i >= 16) break;
	}

	// attach lights to the bullets
	for(j = 0, l = this.bullets.length; j < l; j++)
	{
		this.setLight(i, this.bullets[j]);
		if (++i >= 16) break;
	}

	while(i < 16)
	{
	 	// a light with power/colour of zero is switched off
	 	this.lightData[i * 4 + 2] = 0.0;
	 	i++;
	}
};


// callback to set the correct shader program and it's associated attributes and/or uniforms
pbLightDepthDemo.prototype.setShader = function(_shaders, _textureNumber)
{
   	// set the shader program
	_shaders.setProgram(this.multiLightBgShaderProgram, _textureNumber);

	// set the secondary source texture for the shader - this draws the floors using the ImageData in register 3
	gl.uniform1i( _shaders.getSampler( "uFloorSampler" ), 3 );

	// set the tertiary source texture for the shader - this provides a depth map using the ImageData in register 4
	gl.uniform1i( _shaders.getSampler( "uDepthSampler" ), 4 );

	// set the parameters for the shader program
	this.setLightData();

	// send them to the shader
	gl.uniform4fv( _shaders.getUniform( "uLights" ), this.lightData );
};
