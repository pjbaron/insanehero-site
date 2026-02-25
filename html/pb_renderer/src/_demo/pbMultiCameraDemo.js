/**
 *
 * A multiple camera demo using render-to-texture for the new Phaser 3 renderer.
 * This demo draws multiple instances of the Invaders Core demo to textures, then it directly accesses the textures
 * using pbWebGl.drawTextureWithTransform as the source surface for multiple bouncing, rotating, scaling camera sprite.
 * NOTE: all cameras are displaying the same source texture which is a single instance of the invaders core demo...
 * this is to show how fast the camera technique is without being bogged down by lots of CPU game instances.
 *
 */

// created while the data is loading (preloader)
function pbMultiCameraDemo( docId )
{
	console.log( "pbMultiCameraDemo c'tor entry" );

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
	// put a frame around each invaders instance to make them stand out better
	this.frame_l = pbPhaserRender.loader.loadImage( "frame_l", "../img/frame_l.png" );
	this.frame_r = pbPhaserRender.loader.loadImage( "frame_r", "../img/frame_r.png" );
	this.frame_t = pbPhaserRender.loader.loadImage( "frame_t", "../img/frame_t.png" );
	this.frame_b = pbPhaserRender.loader.loadImage( "frame_b", "../img/frame_b.png" );

	console.log( "pbMultiCameraDemo c'tor exit" );
}


pbMultiCameraDemo.prototype.create = function()
{
	console.log("pbMultiCameraDemo.create");

	this.gameLayer = new layerClass();
	this.gameLayer.create(rootLayer, this.phaserRender, 0, 0, 1.0, 0, 1.0, 1.0);
	rootLayer.addChild(this.gameLayer);

	// add the game instance to a layer which is attached to the rootLayer
	// because otherwise the renderer.update won't update the game's sprite
	// transforms or draw them to the render-to-texture
	this.game = new pbInvaderDemoCore();
	this.game.create( this, this.gameLayer, true );

	// create the render-to-texture
	var rttTextureNumber = 1;
	this.rttTexture = pbWebGlTextures.initTexture( rttTextureNumber, pbPhaserRender.width, pbPhaserRender.height );
	// create a frame & depth buffer and set them as the target for the 'update' drawing callback
	this.rttFramebuffer = pbWebGlTextures.useFramebufferRenderbuffer( this.rttTexture );

	// set up the renderer postUpdate callback to draw the camera sprite using the render-to-texture surface on the GPU
    pbPhaserRender.renderer.postUpdate = this.postUpdate;

    // parameters to control all of the camera views
	this.tx = [];
	this.tdx = [];
	this.ty = [];
	this.tdy = [];
	this.tr = [];
	this.tdr = [];
	this.ts = [];
	this.tds = [];
	this.transform = [];
	for(var i = 0; i < 100; i++)
	{
		// bouncing, scaling, spinning variables
		this.tx[i] = Math.random() * pbPhaserRender.width;
		this.tdx[i] = 6 * Math.random() - 3;
		this.ty[i] = Math.random() * pbPhaserRender.height;
		this.tdy[i] = 4 * Math.random() - 2;
		this.tr[i] = Math.PI * 2.0 * Math.random();
		this.tdr[i] = 0.02 * Math.random() - 0.01;
		this.ts[i] = 0.23 * Math.random() + 0.26;
		this.tds[i] = 0.002 * Math.random() - 0.001;
		// create a transform matrix to draw this image with
		this.transform[i] = pbMatrix3.makeTransform(this.tx[i], this.ty[i], this.tr[i], this.ts[i], this.ts[i]);
	}
};


pbMultiCameraDemo.prototype.destroy = function()
{
	console.log("pbMultiCameraDemo.destroy");

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


pbMultiCameraDemo.prototype.update = function()
{
	// update the invaders demo core, draws to the framebuffer defined in create
	this.game.update();
};


/**
 * postUpdate - draw the camera sprites using the render-to-texture surface on the GPU
 *
 */
pbMultiCameraDemo.prototype.postUpdate = function()
{
	// don't render to texture any more, render to the display instead
	pbWebGlTextures.cancelFramebuffer();

	for(var i = 0; i < this.transform.length; i++)
	{
		// move the draw image around
		this.tx[i] += this.tdx[i];
		if (this.tx[i] <= 0 || this.tx[i] >= pbPhaserRender.width) this.tdx[i] = -this.tdx[i];
		this.ty[i] += this.tdy[i];
		if (this.ty[i] <= 0 || this.ty[i] >= pbPhaserRender.height) this.tdy[i] = -this.tdy[i];
		this.tr[i] += this.tdr[i];
		if (this.tr[i] >= Math.PI * 2.0) this.tr[i] -= Math.PI * 2.0;
		this.ts[i] += this.tds[i];
		if (this.ts[i] <= 0.2 || this.ts[i] >= 0.5) this.tds[i] = -this.tds[i];
		this.transform[i] = pbMatrix3.makeTransform(this.tx[i], this.ty[i], this.tr[i], this.ts[i], this.ts[i]);

		// _image, _transform, _z
		pbPhaserRender.renderer.graphics.drawTextureWithTransform( this.rttTexture, this.transform[i], 1.0 );
	}
};

