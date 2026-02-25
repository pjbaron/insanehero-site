/**
 *
 * Point light demo - uses a shader to generate lighting and shadows from a point source.
 *
 */



// created while the data is loading (preloader)
function pbPointLightDemo( docId )
{
	console.log( "pbPointLightDemo c'tor entry" );

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

	this.pointLightShaderJSON = pbPhaserRender.loader.loadFile( "../json/pointLightSources.json" );

	pbPhaserRender.loader.loadImage( "logo", "../img/phaser_128x32.png" );


	console.log( "pbPointLightDemo c'tor exit" );
}


pbPointLightDemo.prototype.create = function()
{
	console.log("pbPointLightDemo.create");

	// add the shader
	var jsonString = pbPhaserRender.loader.getFile( this.pointLightShaderJSON ).responseText;
	this.pointLightShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

	//
	// draw a big logo shadow-caster
	//

	this.logo = new pbSprite();
	this.logo.createWithKey(pbPhaserRender.width * 0.5, pbPhaserRender.height * 0.75, "logo");
	// TODO: this is pretty horrible... because the logo isn't attached to a layer (it is drawn separately in the update function),
	// changes to its transform variables never get recalculated into the transform matrix.  Here I'm calling the transform.create
	// function a second time (first time is in pbSprite) to force it to change scale and to set the z depth to zero.
	this.logo.transform.create(this.logo.image, this.logo.x, this.logo.y, 0.0, 0.0, 3.0, 3.0);
	this.logo.anchorX = this.logo.anchorY = 0.5;

	//
	// also draw an instance of invaders as a shadow-caster
	//

	this.gameLayer = new layerClass();
	this.gameLayer.create(rootLayer, this.phaserRender, 0, 0, 1.0, 0, 1.0, 1.0);
	rootLayer.addChild(this.gameLayer);

	// add the game instance to a layer which is attached to the rootLayer
	// because otherwise the renderer.update won't update the game's sprite
	// transforms or draw them to the render-to-texture
	this.game = new pbInvaderDemoCore();
	this.game.create(this, this.gameLayer);

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


pbPointLightDemo.prototype.destroy = function()
{
	console.log("pbPointLightDemo.destroy");

	this.gameLayer.destroy();
	this.gameLayer = null;

	this.phaserRender.destroy();
	this.phaserRender = null;

	this.game.destroy();
	this.game = null;

	this.logo = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;

	this.filterTexture = null;
	this.filterFramebuffer = null;
};


pbPointLightDemo.prototype.update = function()
{
	// update and draw the invaders demo core to the render-to-texture
	this.game.update();

	// draw logo using the render-to-texture framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.rttFramebuffer);
	pbPhaserRender.renderer.graphics.drawImageWithTransform(this.rttTextureNumber, this.logo.image, this.logo.transform.transform, 1.0);
};


/**
 * postUpdate - apply the filter to the rttTexture, then draw the results on screen
 *
 */
pbPointLightDemo.prototype.postUpdate = function()
{
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	// copy the rttTexture to the filterFramebuffer attached texture, applying a filter as it draws
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.filterFramebuffer);
	pbPhaserRender.renderer.graphics.applyShaderToTexture( this.rttTexture, this.setShader, this );

	// draw the filter texture to the display
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	pbPhaserRender.renderer.graphics.drawTextureToDisplay( this.filterTexture );
};


// callback required to set the correct shader program and it's associated attributes and/or uniforms
pbPointLightDemo.prototype.setShader = function(_shaders, _textureNumber)
{
   	// set the shader program
	_shaders.setProgram(this.pointLightShaderProgram, _textureNumber);

	// set the parameters for the filter shader program
	var x = ((pbPhaserRender.frameCount % 2000) / 1000.0);
	if (x > 1.0) x = 2.0 - x;
	gl.uniform1f( _shaders.getUniform( "uLightPosX" ), x );

	var y = ((pbPhaserRender.frameCount % 3400) / 1700.0);
	if (y > 1.0) y = 2.0 - y;
	gl.uniform1f( _shaders.getUniform( "uLightPosY" ), y );
};

   	
