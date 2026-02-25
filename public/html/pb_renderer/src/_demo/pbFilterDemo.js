/**
 *
 * A filter demo for the new Phaser 3 renderer.
 *
 *
 * TODO: extend this and pbWebGl support functions to allow 'ping-pong' filtering...
 * eg.
 * texture0 = raw image -> texture1 apply tint filter
 * texture1 = tinted image -> texture0 apply warp filter
 * etc
 * finally, render from texture 0 or 1 to display
 * 
 */



// created while the data is loading (preloader)
function pbFilterDemo( docId )
{
	console.log( "pbFilterDemo c'tor entry" );

	this.firstTime = true;
	this.surface = null;
	this.srcImage = null;
	this.renderSurface = null;
	this.displayLayer = null;
	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;
	this.filterTexture = null;
	this.redScale = 1.0;
	this.greenScale = 1.0;
	this.blueScale = 1.0;

	// dat.GUI controlled variables and callbacks
	this.redCtrl = gui.add(this, "redScale").min(0.0).max(2.0).step(0.1).listen();
	this.redCtrl.onFinishChange(function(value) { if (!value) _this.redScale = 0; });
	this.grnCtrl = gui.add(this, "greenScale").min(0.0).max(2.0).step(0.1).listen();
	this.grnCtrl.onFinishChange(function(value) { if (!value) _this.greenScale = 0; });
	this.bluCtrl = gui.add(this, "blueScale").min(0.0).max(2.0).step(0.1).listen();
	this.bluCtrl.onFinishChange(function(value) { if (!value) _this.blueScale = 0; });

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	this.tintShaderJSON = pbPhaserRender.loader.loadFile( "../json/tintShaderSources.json" );
	this.spriteImg = pbPhaserRender.loader.loadImage( "image", "../img/screen1.jpg" );

	console.log( "pbFilterDemo c'tor exit" );
}


pbFilterDemo.prototype.create = function()
{
	console.log("pbFilterDemo.create");

	// add the shader
	var jsonString = pbPhaserRender.loader.getFile( this.tintShaderJSON ).responseText;
	this.tintShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	this.surface = new pbSurface();
	// _wide, _high, _numWide, _numHigh, _image
	this.surface.create(0, 0, 1, 1, imageData);

	this.srcImage = new imageClass();
	// _surface, _cellFrame, _anchorX, _anchorY, _tiling, _fullScreen
	this.srcImage.create(this.surface, 0, 0, 0);

	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	this.rttTextureNumber = 3;
	this.rttTexture = pbWebGlTextures.initTexture(this.rttTextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.rttRenderbuffer = pbWebGlTextures.initDepth(this.rttTexture);
	this.rttFramebuffer = pbWebGlTextures.initFramebuffer(this.rttTexture, this.rttRenderbuffer);

	// create the filter texture
	this.filterTextureNumber = 1;
	this.filterTexture = pbWebGlTextures.initTexture(this.filterTextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.filterFramebuffer = pbWebGlTextures.initFramebuffer(this.filterTexture, null);

	// set the transformation for rendering to the render-to-texture
	this.srcTransform = pbMatrix3.makeTransform(0, 0, 0, 1, 1);

    // clear the gl bindings
    gl.bindTexture(gl.TEXTURE_2D, null);
	pbWebGlTextures.cancelFramebuffer();
};


pbFilterDemo.prototype.destroy = function()
{
	console.log("pbFilterDemo.destroy");

	gui.remove(this.redCtrl);
	gui.remove(this.grnCtrl);
	gui.remove(this.bluCtrl);

	if (this.surface)
		this.surface.destroy();
	this.surface = null;

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;
	this.filterTexture = null;
};


pbFilterDemo.prototype.restart = function()
{
	console.log("pbFilterDemo.restart");
	
	this.destroy();
	this.create();
};


pbFilterDemo.prototype.update = function()
{
	// draw srcImage using the render-to-texture framebuffer
	// bind the framebuffer so drawing will go to the associated texture and depth buffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.rttFramebuffer);
	// draw this.srcImage into the render-to-texture
	pbPhaserRender.renderer.graphics.drawImageWithTransform(this.rttTextureNumber, this.srcImage, this.srcTransform, 1.0);

	// copy rttTexture to the filterFramebuffer attached texture, applying a filter as it draws
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.filterFramebuffer);
	pbPhaserRender.renderer.graphics.applyShaderToTexture( this.rttTexture, this.setTint, this );

	// draw the filter texture to the display
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	pbPhaserRender.renderer.graphics.drawTextureToDisplay( this.filterTexture );
};


// callback required to set the correct shader program and it's associated attributes and/or uniforms
pbFilterDemo.prototype.setTint = function(_shaders)
{
   	// set the shader program
	_shaders.setProgram(this.tintShaderProgram, this.rttTextureNumber);
	// set the tint values in the shader program
	gl.uniform1f( _shaders.getUniform( "uRedScale" ), this.redScale );
	gl.uniform1f( _shaders.getUniform( "uGreenScale" ), this.greenScale );
	gl.uniform1f( _shaders.getUniform( "uBlueScale" ), this.blueScale );
};

