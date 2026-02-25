/**
 *
 * A render-to-texture demo for the new Phaser 3 renderer.
 * Shows the very simplest way to render to a texture then have that texture displayed on screen.
 *
 */



// created while the data is loading (preloader)
function pbRenderTextureDemo( docId )
{
	console.log( "pbRenderTextureDemo c'tor entry" );

	this.surface = null;
	this.srcImage = null;
	this.renderSurface = null;
	this.displayLayer = null;
	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	this.spriteImg = pbPhaserRender.loader.loadImage( "image", "../img/screen1.jpg" );

	console.log( "pbRenderTextureDemo c'tor exit" );
}


pbRenderTextureDemo.prototype.create = function()
{
	console.log("pbRenderTextureDemo.create");

	this.addSprites();

	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	this.rttTextureNumber = 0;
	this.rttTexture = pbWebGlTextures.initTexture(this.rttTextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.rttRenderbuffer = pbWebGlTextures.initDepth(this.rttTexture);
	this.rttFramebuffer = pbWebGlTextures.initFramebuffer(this.rttTexture, this.rttRenderbuffer);

	// set the transformation for rendering to the render-to-texture
	this.srcTransform = pbMatrix3.makeTransform(10, 10, 0, 1, 1);

    // clear the gl bindings
    gl.bindTexture(gl.TEXTURE_2D, null);
	pbWebGlTextures.cancelFramebuffer();
};


pbRenderTextureDemo.prototype.destroy = function()
{
	console.log("pbRenderTextureDemo.destroy");

	this.surface.destroy();
	this.surface = null;

	this.phaserRender.destroy();
	this.phaserRender = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;
};


pbRenderTextureDemo.prototype.restart = function()
{
	console.log("pbRenderTextureDemo.restart");
	
	this.destroy();
	this.create();
};


pbRenderTextureDemo.prototype.addSprites = function()
{
	console.log("pbRenderTextureDemo.addSprites");

	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	this.surface = new pbSurface();
	// _wide, _high, _numWide, _numHigh, _image
	this.surface.create(0, 0, 1, 1, imageData);

	this.srcImage = new imageClass();
	// _surface, _cellFrame, _anchorX, _anchorY, _tiling, _fullScreen
	this.srcImage.create(this.surface, 0, 0, 0);
};


pbRenderTextureDemo.prototype.drawSceneToTexture = function(_fb, _image, _transform)
{
	// bind the framebuffer so drawing will go to the associated texture and depth buffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, _fb);
	// clear the render-to-texture using a varying green shade to make it stand out
	gl.clearColor(0, (pbPhaserRender.frameCount % 100 / 100), 0, 1); // green shades
	gl.clear(gl.COLOR_BUFFER_BIT);
	// draw this.srcImage into the render-to-texture
	pbPhaserRender.renderer.graphics.drawImageWithTransform(this.rttTextureNumber, _image, _transform, 1.0);
};


pbRenderTextureDemo.prototype.update = function()
{
	// draw srcImage using the render-to-texture framebuffer
	this.drawSceneToTexture(this.rttFramebuffer, this.srcImage, this.srcTransform);

	// draw the render-to-texture to the display
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	pbPhaserRender.renderer.graphics.drawTextureToDisplay( this.rttTexture );
};

