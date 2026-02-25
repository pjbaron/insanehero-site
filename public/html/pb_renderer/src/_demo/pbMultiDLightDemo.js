/**
 *
 * MultiDLight demo - uses a shader to show multiple light sources effecting normal maps created by the spriteDLight tool
 *
 */



// created while the data is loading (preloader)
function pbMultiDLightDemo( docId )
{
	console.log( "pbMultiDLightDemo c'tor entry" );

	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );

	pbPhaserRender.loader.loadImage( "texture", "../img/spriteDLight/Skeleton1 attack1_0006.png" );
	this.normalsImg = pbPhaserRender.loader.loadImage( "normals", "../img/spriteDLight/Skeleton1 attack1_0006_NORMALS.png" );

	this.multiLightShaderJSON = pbPhaserRender.loader.loadFile( "../json/multiDLightSources.json" );

	console.log( "pbMultiDLightDemo c'tor exit" );
}


pbMultiDLightDemo.prototype.create = function()
{
	console.log("pbMultiDLightDemo.create");

	this.lightData = [
		// x, y, colour
		0.0, 0.0, 0,
		0.0, 0.0, 0,
		0.0, 0.0, 0,
		0.0, 0.0, 0,
		0.0, 0.0, 0,
		0.0, 0.0, 0,
		0.0, 0.0, 0,
		0.0, 0.0, 0
	];

	// prepare the light circle and a sprite to show where it is
	this.light = [];
	for(var i = 0; i < 2; i++)
	{
		this.light[i] = {
			pos: { x: 0.0, y: 0.0 },
			radius: 1.0 - i * 0.50 / 8.0,
			angle: i * 360.0 / 8.0,
			rotate: [-0.50, 0.50, 0.25, -0.25, 0.10, -0.10, 0.75, -0.75 ][i],
			colour: [{ r:0.0,g:0.0,b:2.0 },
					{ r:2.0,g:0.0,b:0.0 },
					{ r:0.0,g:2.0,b:0.0 },
					{ r:2.0,g:2.0,b:0.0 },
					{ r:2.0,g:0.0,b:2.0 },
					{ r:0.0,g:2.0,b:2.0 },
					{ r:2.0,g:2.0,b:2.0 },
					{ r:2.0,g:1.2,b:0.0 }
					][i]
		};
	}
	this.move = 0;

	// add the shader
	var jsonString = pbPhaserRender.loader.getFile( this.multiLightShaderJSON ).responseText;
	this.MultiDLightShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

	// create a sprite to display
	this.sprite = new pbSprite();
	this.sprite.createWithKey(0, 0, "texture", rootLayer);

	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	this.rttTextureNumber = 1;
	this.rttTexture = pbWebGlTextures.initTexture(this.rttTextureNumber, 600, 600);
	this.rttFramebuffer = pbWebGlTextures.useFramebufferRenderbuffer( this.rttTexture );

	// create the destination texture and framebuffer
	this.destTextureNumber = 2;
	this.destTexture = pbWebGlTextures.initTexture(this.destTextureNumber, 600, 600);
	this.destFramebuffer = pbWebGlTextures.initFramebuffer(this.destTexture, null);

    // get the ImageData for the normals
    this.normalsTextureNumber = 3;
	var imageData = pbPhaserRender.loader.getFile( this.normalsImg );
	// upload the normals image directly to the GPU
	pbPhaserRender.renderer.graphics.textures.prepare(imageData, false, true, this.normalsTextureNumber, true);

	// set up the renderer postUpdate callback to apply the filter and draw the result on the display
    pbPhaserRender.renderer.postUpdate = this.postUpdate;
};


pbMultiDLightDemo.prototype.destroy = function()
{
	console.log("pbMultiDLightDemo.destroy");

	this.phaserRender.destroy();
	this.phaserRender = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;

	this.destTexture = null;
	this.destFramebuffer = null;
};


pbMultiDLightDemo.prototype.update = function()
{
	// pbPhaserRender automatically draws the sprite to the render-to-texture

	this.moveLights();
};



pbMultiDLightDemo.prototype.moveLights = function()
{
	var i;
	var ll = this.light.length;

	for(i = 0; i < ll; i++)
	{
		var l = this.light[i];

		// move the light source around in a circle
		l.pos.x = 0.5 + l.radius * Math.cos(l.angle * Math.PI / 180.0);
		l.pos.y = 0.5 + l.radius * Math.sin(l.angle * Math.PI / 180.0);
		l.angle += l.rotate;
		if (l.angle >= 360) l.angle -= 360;
		if (l.angle < 0) l.angle += 360;
		this.lightData[i * 3 + 0] = l.pos.x;
		this.lightData[i * 3 + 1] = l.pos.y;
		this.lightData[i * 3 + 2] = pack(l.colour.r, l.colour.g, l.colour.b);
	}
	// switch off all unused lights
	ll = this.lightData.length / 3;
	for(; i < ll; i++)
	{
		this.lightData[i * 3 + 2] = 0.0;
	}
};

/**
 * postUpdate - apply the shader to the rttTexture, then draw the results on screen
 *
 */
pbMultiDLightDemo.prototype.postUpdate = function()
{
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	gl.bindFramebuffer(gl.FRAMEBUFFER, this.destFramebuffer);
	// clear the destTexture ready to receive a texture with alpha
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
	// copy the rttTexture to the destFramebuffer attached texture, applying a shader as it draws
	gl.activeTexture(gl.TEXTURE1);
	pbPhaserRender.renderer.graphics.applyShaderToTexture( this.rttTexture, this.setShader, this );

	// draw the dest texture to the display
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.activeTexture(gl.TEXTURE3);
	this.destTransform = pbMatrix3.makeTransform(pbPhaserRender.width / 2, pbPhaserRender.height / 2, 0.1, 1.0, 1.0);
	pbPhaserRender.renderer.graphics.drawTextureWithTransform( this.destTexture, this.destTransform, 1.0 );
};


// callback to set the correct shader program and it's associated attributes and/or uniforms
pbMultiDLightDemo.prototype.setShader = function(_shaders, _textureNumber)
{
   	// set the shader program
	_shaders.setProgram(this.MultiDLightShaderProgram, _textureNumber);

	// set the normals sampler texture
	gl.uniform1i( _shaders.getSampler( "uNormalSampler" ), this.normalsTextureNumber );

	// set the parameters for the shader program
	gl.uniform3fv( _shaders.getUniform( "uLights" ), this.lightData );
	gl.uniform3f( _shaders.getUniform( "uAmbientCol" ), 0.10, 0.10, 0.10 );
	gl.uniform2f( _shaders.getUniform( "uSrcSize" ), this.destTexture.width, this.destTexture.height );
};
