/**
 *
 * A camera demo using render-to-texture for the new Phaser 3 renderer.
 * This demo draws an instance of the Invaders Core demo to texture, then it directly accesses that texture
 * using pbWebGl.drawTextureWithTransform as the source surface for a bouncing, rotating, scaling camera sprite.
 * 
 * It differs from pbSpriteRTTDemo in that it renders to texture every frame rather than creating the texture from
 * a surface once at the start.
 *
 */

// created while the data is loading (preloader)
function pbCameraRTTDemo( docId )
{
	console.log( "pbCameraRTTDemo c'tor entry" );

	this.gameLayer = null;
	this.game = null;

	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	pbPhaserRender.loader.loadImage( "player", "../img/invader/player.png" );
	pbPhaserRender.loader.loadImage( "invader", "../img/invader/invader32x32x4.png", 32, 32, 4, 1);
	pbPhaserRender.loader.loadImage( "stars", "../img/invader/starfield.png" );
	pbPhaserRender.loader.loadImage( "bullet", "../img/invader/bullet.png" );
	pbPhaserRender.loader.loadImage( "bomb", "../img/invader/enemy-bullet.png" );
	pbPhaserRender.loader.loadImage( "rocket", "../img/invader/rockets32x32x8.png", 32, 32, 8, 1 );
	pbPhaserRender.loader.loadImage( "smoke", "../img/invader/smoke64x64x8.png", 64, 64, 8, 1 );
	pbPhaserRender.loader.loadImage( "explosion", "../img/invader/explode.png", 128, 128, 16, 1 );
	pbPhaserRender.loader.loadImage( "font", "../img/fonts/arcadeFonts/16x16/Bubble Memories (Taito).png", 16, 16, 95, 7 );


	console.log( "pbCameraRTTDemo c'tor exit" );
}


pbCameraRTTDemo.prototype.create = function()
{
	console.log("pbCameraRTTDemo.create");

	// create an instance of the game engine and add it to a layer
	this.createGame();

	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	var textureNumber = 4;
	this.rttTexture = pbWebGlTextures.initTexture(textureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.rttFramebuffer = pbWebGlTextures.useFramebufferRenderbuffer(this.rttTexture);

	// set the renderer postUpdate callback to draw the camera sprite using the render-to-texture surface on the GPU
    pbPhaserRender.renderer.postUpdate = this.postUpdate;

	// bouncing, scaling, spinning variables
	this.tx = 0;
	this.tdx = 3;
	this.ty = 300;
	this.tdy = 2;
	this.tr = 0;
	this.tdr = 0.01;
	this.ts = 0.7;
	this.tds = 0.001;
	// create a transform matrix to draw the camera
	this.transform = pbMatrix3.makeTransform(this.tx, this.ty, this.tr, this.ts, this.ts);
};


pbCameraRTTDemo.prototype.createGame = function()
{
	this.gameLayer = new layerClass();
	this.gameLayer.create(rootLayer, this.phaserRender, 0, 0, 1.0, 0, 1.0, 1.0);
	rootLayer.addChild(this.gameLayer);

	// add the game instance to a layer which is attached to the rootLayer
	// because otherwise the renderer.update won't update the game's sprite
	// transforms or draw them to the render-to-texture
	this.game = new pbInvaderDemoCore();
	this.game.create(this, this.gameLayer);
};


pbCameraRTTDemo.prototype.destroy = function()
{
	console.log("pbCameraRTTDemo.destroy");

	this.gameLayer.destroy();
	this.gameLayer = null;

	this.phaserRender.destroy();
	this.phaserRender = null;

	this.game.destroy();
	this.game = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;
};


pbCameraRTTDemo.prototype.update = function()
{
	// update the invaders demo core and draw it to the texture
	this.game.update();
};


/**
 * postUpdate - draw the camera sprite using the render-to-texture surface on the GPU
 *
 */
pbCameraRTTDemo.prototype.postUpdate = function()
{
	// move the camera around
	this.tx += this.tdx;
	if (this.tx <= 0 || this.tx >= pbPhaserRender.width) this.tdx = -this.tdx;
	this.ty += this.tdy;
	if (this.ty <= 0 || this.ty >= pbPhaserRender.height) this.tdy = -this.tdy;
	this.tr += this.tdr;
	if (this.tr >= Math.PI * 2.0) this.tr -= Math.PI * 2.0;
	this.ts += this.tds;
	if (this.ts <= 0.4 || this.ts >= 0.8) this.tds = -this.tds;
	this.transform = pbMatrix3.makeTransform(this.tx, this.ty, this.tr, this.ts, this.ts);

	// don't render to texture any more, render to the display instead
	pbWebGlTextures.cancelFramebuffer();

	// draw the texture containing the game image to the display
	// _texture, _transform, _z
	pbPhaserRender.renderer.graphics.drawTextureWithTransform( this.rttTexture, this.transform, 1.0 );
};

