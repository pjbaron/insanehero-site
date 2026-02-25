/**
 *
 * Point lights demo - uses a shader to generate lighting and shadows from multiple point sources.
 *
 */



// created while the data is loading (preloader)
function pbPointLightsDemo( docId )
{
	console.log( "pbPointLightsDemo c'tor entry" );

	this.gameLayer = null;
	this.game = null;

	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	pbPhaserRender.loader.loadImage( "player", "../img/invader/player.png" );
	pbPhaserRender.loader.loadImage( "invader", "../img/invader/invader32x32x4.png", 32, 32, 4, 1);
	//pbPhaserRender.loader.loadImage( "stars", "../img/invader/starfield.png" );
	pbPhaserRender.loader.loadImage( "bullet", "../img/invader/bullet.png" );
	pbPhaserRender.loader.loadImage( "bomb", "../img/invader/enemy-bullet.png" );
	pbPhaserRender.loader.loadImage( "rocket", "../img/invader/rockets32x32x8.png", 32, 32, 8, 1 );
	pbPhaserRender.loader.loadImage( "smoke", "../img/invader/smoke64x64x8.png", 64, 64, 8, 1 );
	pbPhaserRender.loader.loadImage( "explosion", "../img/invader/explode.png", 128, 128, 16, 1 );
	pbPhaserRender.loader.loadImage( "font", "../img/fonts/arcadeFonts/16x16/Bubble Memories (Taito).png", 16, 16, 95, 7 );

	this.multiLightShaderJSON = pbPhaserRender.loader.loadFile( "../json/multiLightSources.json" );

	console.log( "pbPointLightsDemo c'tor exit" );
}


pbPointLightsDemo.prototype.create = function()
{
	console.log("pbPointLightsDemo.create");

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
	var jsonString = pbPhaserRender.loader.getFile( this.multiLightShaderJSON ).responseText;
	this.multiLightShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

	//
	// draw an instance of invaders
	//

	this.gameLayer = new layerClass();
	// _parent, _renderer, _x, _y, _z, _angleInRadians, _scaleX, _scaleY)
	this.gameLayer.create(rootLayer, this.phaserRender, 0, 0, 1.0, 0, 1.0, 1.0);
	rootLayer.addChild(this.gameLayer);

	this.game = new pbInvaderDemoCore();
	this.game.create(this, this.gameLayer, false, true);

	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	this.rttTextureNumber = 0;
	this.rttTexture = pbWebGlTextures.initTexture(this.rttTextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.rttFramebuffer = pbWebGlTextures.useFramebufferRenderbuffer( this.rttTexture );

	// create the filter destination texture and framebuffer
	this.filterTextureNumber = 1;
	this.filterTexture = pbWebGlTextures.initTexture(this.filterTextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.filterFramebuffer = pbWebGlTextures.initFramebuffer(this.filterTexture, null);

	// set up the renderer postUpdate callback to apply the filter and draw the result on the display
    pbPhaserRender.renderer.postUpdate = this.postUpdate;
};


pbPointLightsDemo.prototype.destroy = function()
{
	console.log("pbPointLightsDemo.destroy");

	this.phaserRender.destroy();
	this.phaserRender = null;

	this.game.destroy();
	this.game = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;

	this.filterTexture = null;
	this.filterFramebuffer = null;

	this.gameLayer.destroy();
	this.gameLayer = null;
};


pbPointLightsDemo.prototype.update = function()
{
	// update and draw the invaders demo core to the render-to-texture
	this.game.update();
};


/**
 * postUpdate - apply the filter to the rttTexture, then draw the results on screen
 *
 */
pbPointLightsDemo.prototype.postUpdate = function()
{
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	// copy the rttTexture to the filterFramebuffer attached texture, applying a filter as it draws
	gl.activeTexture(gl.TEXTURE0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.filterFramebuffer);
	pbPhaserRender.renderer.graphics.applyShaderToTexture( this.rttTexture, this.setShader, this );

	// update transforms and draw sprites that are not shadow casters
	this.game.layer.update();

	// draw the filter texture to the display
	gl.activeTexture(gl.TEXTURE1);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	pbPhaserRender.renderer.graphics.drawTextureToDisplay( this.filterTexture );
};



// pack bytes _r, _g and _b into a single float with four precision bits each
function pack(_r, _g, _b)
{
	return (Math.floor(_r * 16.0) + Math.floor(_g * 16.0) * 256.0 + Math.floor(_b * 16.0) * 256.0 * 256.0);
}


pbPointLightsDemo.prototype.setLightData = function()
{
	// first light is attached to the player ship
	this.lightData[0 * 4 + 0] = this.game.player.x / pbPhaserRender.width;
	this.lightData[0 * 4 + 1] = 1.0 - this.game.player.y / pbPhaserRender.height;
	this.lightData[0 * 4 + 2] = pack(0.0, 0.75, 0.0);
	this.lightData[0 * 4 + 3] = 0.05 + Math.abs((pbPhaserRender.frameCount % 64) - 32.0) / 32.0 * 0.05;

	var i, j;
	// next 7 lights are attached to explosions
	for(i = 0; i < Math.min(this.game.explosions.length, 7); i++)
	{
		var explosion = this.game.explosions[i];
		var life = explosion.image.cellFrame / 16.0;

		j = (i + 1) * 4;
		this.lightData[j + 0] = explosion.x / pbPhaserRender.width;
		this.lightData[j + 1] = 1.0 - explosion.y / pbPhaserRender.height;
		// fade from orange/yellow through to blue as the explosion ages
		this.lightData[j + 2] = pack(5.0 * (1.0 - life), 3.0 * (1.0 - life), 1.0 * life);
		// grow as the explosion ages
		this.lightData[j + 3] = 0.02 + life * 0.20;
	}
	for(;i < 7; i++)
	{
		j = (i + 1) * 4;
		// a light with power/colour of zero is switched off
		this.lightData[j + 2] = 0.0;
	}
	// the last 8 lights are attached to enemy bombs
	for(i = 0; i < Math.min(this.game.bombs.length, 8); i++)
	{
		var bomb = this.game.bombs[i];

		j = (i + 8) * 4;
		this.lightData[j + 0] = bomb.x / pbPhaserRender.width;
		this.lightData[j + 1] = 1.0 - bomb.y / pbPhaserRender.height;
		this.lightData[j + 2] = pack(1.0, 0, 0);
		this.lightData[j + 3] = 0.1;
	}
	for(;i < 8; i++)
	{
		j = (i + 8) * 4;
		this.lightData[j + 2] = 0.0;
	}
};


// callback required to set the correct shader program and it's associated attributes and/or uniforms
pbPointLightsDemo.prototype.setShader = function(_shaders, _textureNumber)
{
   	// set the filter program
	_shaders.setProgram(this.multiLightShaderProgram, _textureNumber);

	// set the parameters for the filter shader program
	this.setLightData();

	// send them to the shader
	gl.uniform4fv( _shaders.getUniform( "uLights" ), this.lightData );
};

   	
