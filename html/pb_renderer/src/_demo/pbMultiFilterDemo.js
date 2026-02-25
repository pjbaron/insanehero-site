/**
 *
 * A multiple filter demo for the new Phaser 3 renderer.
 *
 */



// created while the data is loading (preloader)
function pbMultiFilterDemo( docId )
{
	console.log( "pbMultiFilterDemo c'tor entry" );

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
	this.waveShaderJSON = pbPhaserRender.loader.loadFile( "../json/waveShaderSources.json" );
	this.spriteImg = pbPhaserRender.loader.loadImage( "image", "../img/screen1.jpg" );

	console.log( "pbMultiFilterDemo c'tor exit" );
}


pbMultiFilterDemo.prototype.create = function()
{
	console.log("pbMultiFilterDemo.create");

	// add the shaders
	var jsonString = pbPhaserRender.loader.getFile( this.tintShaderJSON ).responseText;
	this.tintShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );
	jsonString = pbPhaserRender.loader.getFile( this.waveShaderJSON ).responseText;
	this.waveShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	this.surface = new pbSurface();
	// _wide, _high, _numWide, _numHigh, _image
	this.surface.create(0, 0, 1, 1, imageData);

	this.srcImage = new imageClass();
	// _surface, _cellFrame, _anchorX, _anchorY, _tiling, _fullScreen
	this.srcImage.create(this.surface, 0, 0, 0);


	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	this.rttTextureNumber = 2;
	this.rttTexture = pbWebGlTextures.initTexture(this.rttTextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.rttRenderbuffer = pbWebGlTextures.initDepth(this.rttTexture);
	this.rttFramebuffer = pbWebGlTextures.initFramebuffer(this.rttTexture, this.rttRenderbuffer);

	// create the filter texture
	this.filterTextureNumber = 0;
	this.filterTexture = pbWebGlTextures.initTexture(this.filterTextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.filterFramebuffer = pbWebGlTextures.initFramebuffer(this.filterTexture, null);

	// create the 2nd filter texture
	this.filter2TextureNumber = 1;
	this.filter2Texture = pbWebGlTextures.initTexture(this.filter2TextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.filter2Framebuffer = pbWebGlTextures.initFramebuffer(this.filter2Texture, null);

	// set the transformation for rendering to the render-to-texture
	this.srcTransform = pbMatrix3.makeTransform(0, 0, 0, 1, 1);

    // clear the gl bindings
    gl.bindTexture(gl.TEXTURE_2D, null);
	pbWebGlTextures.cancelFramebuffer();
};


pbMultiFilterDemo.prototype.destroy = function()
{
	console.log("pbMultiFilterDemo.destroy");

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
	this.filterFramebuffer = null;
	this.filter2Texture = null;
	this.filter2Framebuffer = null;
};


pbMultiFilterDemo.prototype.restart = function()
{
	console.log("pbMultiFilterDemo.restart");
	
	this.destroy();
	this.create();
};



pbMultiFilterDemo.prototype.update = function()
{
	// draw srcImage using the render-to-texture framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.rttFramebuffer);
	pbPhaserRender.renderer.graphics.drawImageWithTransform(this.rttTextureNumber, this.srcImage, this.srcTransform, 1.0);

	// draw rttTexture to the filterTexture, applying a tint shader (from TEXTURE0, filterTexture is on TEXTURE1)
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.filterFramebuffer);
	pbPhaserRender.renderer.graphics.applyShaderToTexture( this.rttTexture, this.setTint, this );

	// draw filterTexture to the rttTexture, applying a wave shader (from TEXTURE1, rttTexture is still on TEXTURE0)
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.filter2Framebuffer);
	pbPhaserRender.renderer.graphics.applyShaderToTexture( this.filterTexture, this.setWave, this );

	// draw the final texture to the display
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	pbPhaserRender.renderer.graphics.drawTextureToDisplay( this.filter2Texture );
};


// callback required to set the correct shader program and it's associated attributes and/or uniforms
pbMultiFilterDemo.prototype.setTint = function(_shaders, _textureNumber)
{
   	// set the shader program
	_shaders.setProgram(this.tintShaderProgram, _textureNumber);
	// set the tint values in the shader program
	gl.uniform1f( _shaders.getUniform( "uRedScale" ), this.redScale );
	gl.uniform1f( _shaders.getUniform( "uGreenScale" ), this.greenScale );
	gl.uniform1f( _shaders.getUniform( "uBlueScale" ), this.blueScale );
};


// callback required to set the correct shader program and it's associated attributes and/or uniforms
pbMultiFilterDemo.prototype.setWave = function(_shaders, _textureNumber)
{
   	// set the shader program
	_shaders.setProgram(this.waveShaderProgram, _textureNumber);
	// set the wave offset values in the shader program
	gl.uniform1f( _shaders.getUniform( "uOffsetX" ), (pbPhaserRender.frameCount % 1000) / 1000.0 );
	gl.uniform1f( _shaders.getUniform( "uOffsetY" ), (pbPhaserRender.frameCount % 1000) / 1000.0 );
};

