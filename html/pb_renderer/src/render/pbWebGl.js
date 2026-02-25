/**
 *
 * WebGL support code
 *
 */



var MAX_SPRITES = 300000;

var gl = null;


function pbWebGl()
{
	console.log( "pbWebGl c'tor" );
	gl = null;
	this.shaders = null;
	this.filters = null;
	this.bgVertexBuffer = null;
	this.bgColorBuffer = null;
	this.positionBuffer = null;
	// pre-allocate the this.drawingArray to avoid memory errors from fragmentation (seen on Chrome (debug Version 39.0.2171.71 m) after running 75000 sprite demo for ~15 seconds)
	this.drawingArray = new Float32Array( MAX_SPRITES * (44 + 22) - 22 );
}



// pbWebGl extends from the pbBaseGraphics prototype chain
pbWebGl.prototype = new pbBaseGraphics();
// create property to store the class' parent
pbWebGl.prototype.__super__ = pbBaseGraphics;		// http://stackoverflow.com/questions/7300552/calling-overridden-methods-in-javascript



pbWebGl.prototype.create = function( _canvas )
{
	// https://www.khronos.org/webgl/wiki/FAQ
	if ( window.WebGLRenderingContext )
	{
		console.log( "pbWebGl.initGl" );
		
		try
		{
			gl = _canvas.getContext( "webgl", { alpha: false } );
			if (!gl)	// support IE11, lagging behind as usual
				gl = _canvas.getContext( "experimental-webgl", { alpha: false } );
		}
		catch ( e )
		{
			console.log( "WebGL initialisation error:\n", e.message );
			alert( "WebGL initialisation error:\n", e.message );
			return false;
		}

		if (!gl)
		{
			console.log( "WebGL did not initialise!");
			alert( "WebGL did not initialise!");
			return false;
		}

		// if this version of webGl can't use textures, it's useless to us
		var numTexturesAvailableInVertexShader = gl.getParameter( gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS );
		if ( numTexturesAvailableInVertexShader === 0 )
		{
			gl = null;
			return false;
		}

		// create the texture handler
		this.textures = new pbWebGlTextures();
		this.textures.create();

		// create the shader handler
		this.shaders = new pbWebGlShaders();
		this.shaders.create();

		// create the filter handler
		this.filters = new pbWebGlFilters();
		this.filters.create();

		// enable the depth buffer so we can order our sprites
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);

		// set blending mode
		gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		gl.enable( gl.BLEND );

		// set the parameters to clear the render area
		gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
		gl.clearDepth( 1.0 );

		// precalculate the drawing buffer's half-width and height values
		this.screenWide2 = gl.drawingBufferWidth * 0.5;
		this.screenHigh2 = gl.drawingBufferHeight * 0.5;
		// calculate inverse to avoid division in loop
		this.iWide = 1.0 / this.screenWide2;
		this.iHigh = 1.0 / this.screenHigh2;

		return true;
	}
	return false;
};


pbWebGl.prototype.destroy = function()
{
	if (this.shaders)
		this.shaders.destroy();
	this.shaders = null;

	if (this.filters)
		this.filters.destroy();
	this.filters = null;

	if (this.textures)
		this.textures.destroy();
	this.textures = null;

	this.bgVertexBuffer = null;
	this.bgColorBuffer = null;
	this.positionBuffer = null;
	this.drawingArray = null;

	gl = null;
};


pbWebGl.prototype.preRender = function(_width, _height, _fb, _rb)
{
	// make sure that all drawing goes to the correct place
	gl.bindFramebuffer(gl.FRAMEBUFFER, _fb);
	gl.bindRenderbuffer(gl.RENDERBUFFER, _rb);

	// clear the viewport
	gl.disable( gl.SCISSOR_TEST );
	gl.viewport( 0, 0, _width, _height);
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
};


pbWebGl.prototype.prepareBuffer = function()
{
	// create a GL buffer to transfer all the vertex position data through
	this.positionBuffer = gl.createBuffer();

	// bind the buffer to the RAM resident positionBuffer
    gl.bindBuffer( gl.ARRAY_BUFFER, this.positionBuffer );
};


pbWebGl.prototype.prepareShader = function()
{
	// set the fragment shader sampler to use TEXTURE0
	if (pbWebGlShaders.currentProgram.samplerUniform)
   		gl.uniform1i( pbWebGlShaders.currentProgram.samplerUniform, 0 );

	// set up a projection matrix in the vertex shader
	if (pbWebGlShaders.currentProgram.uProjectionMatrix)
		gl.uniformMatrix3fv( pbWebGlShaders.currentProgram.uProjectionMatrix, false, pbMatrix3.makeProjection(gl.drawingBufferWidth, gl.drawingBufferHeight) );

	// set up a 3D projection matrix in the vertex shader
	if (pbWebGlShaders.currentProgram.uProjectionMatrix4)
		gl.uniformMatrix4fv( pbWebGlShaders.currentProgram.uProjectionMatrix4, false, pbMatrix4.makeProjection(gl.drawingBufferWidth, gl.drawingBufferHeight) );
};


pbWebGl.prototype.fillStyle = function(_fillColor, _lineColor)
{
	this.fillColorRGBA = _fillColor;
	this.lineColorValue = _lineColor;
	this.fillColorString = "#000";			// fill color as a css format color string, # prefixed, rgb(), rgba() or hsl()
	this.fillColorValue = 0;				// fill color as a Number
	this.fillColorRGBA = { r: 0, g: 0, b: 0, a: 0 };
	this.lineColorString = "#000";			// line color as a css format color string, # prefixed, rgb(), rgba() or hsl()
	this.lineColorValue = 0;				// line color as a Number
	this.lineColorRGBA = { r: 0, g: 0, b: 0, a: 0 };
};


// test for webgl drawing basics
pbWebGl.prototype.fillRect = function( x, y, wide, high, color )
{
	// console.log( "pbWebGl.fillRect" );

	this.shaders.setProgram(this.shaders.graphicsShaderProgram, 0);

	var x2 = x + wide;
	var y2 = y + high;
	var vertices =
	[
         x, y,
         x2, y,
         x, y2,
         x2, y2
    ];

	this.bgVertexBuffer = gl.createBuffer();
	this.bgVertexBuffer.numPoints = 4;
	gl.bindBuffer( gl.ARRAY_BUFFER, this.bgVertexBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.STATIC_DRAW );

	var colors =
	[
		color.r, color.g, color.b, color.a,
		color.r, color.g, color.b, color.a,
		color.r, color.g, color.b, color.a,
		color.r, color.g, color.b, color.a
	];

	this.bgColorBuffer = gl.createBuffer();
	this.bgColorBuffer.numPoints = 4;
	gl.bindBuffer( gl.ARRAY_BUFFER, this.bgColorBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( colors ), gl.STATIC_DRAW );

	gl.bindBuffer( gl.ARRAY_BUFFER, this.bgVertexBuffer );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 2, gl.FLOAT, gl.FALSE, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, this.bgColorBuffer );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aColor, 4, gl.FLOAT, gl.FALSE, 0, 0 );

	gl.drawArrays( gl.TRIANGLE_STRIP, 0, this.bgVertexBuffer.numPoints );
};


// TODO: third wave of pbWebGL optimisation... these drawing functions are tied to the shaders that support them, maybe set a currentProgram attribute callback?  Definitely need to move these out into their own files.

// single image instances from pbWebGlLayer
pbWebGl.prototype.drawImageWithTransform = function( _image, _transform, _z )
{
	// console.log("drawImageWithTransform", _image);

	this.shaders.setProgram(this.shaders.imageShaderProgram, 0);

	var surface = _image.surface;
	if (this.textures.prepare( surface.imageData, _image.tiling, surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	// split off a small part of the big buffer, for a single display object
	var buffer = this.drawingArray.subarray(0, 16);

	// set up the animation frame
	var cell = Math.floor(_image.cellFrame);
	var rect = surface.cellTextureBounds[cell % surface.cellsWide][Math.floor(cell / surface.cellsWide)];

	var wide, high;
	if (_image.fullScreen)
	{
		rect.width = gl.drawingBufferWidth / surface.cellWide;
		rect.height = gl.drawingBufferHeight / surface.cellHigh;
		wide = gl.drawingBufferWidth;
		high = gl.drawingBufferHeight;
	}
	else
	{
		// half width, half height (of source frame)
		wide = surface.cellWide;
		high = surface.cellHigh;
	}

	// screen destination position
	// l, b,		0,1
	// l, t,		4,5
	// r, b,		8,9
	// r, t,		12,13
	var l, r, t, b;
	if (_image.corners)
	{
		var cnr = _image.corners;
		l = -wide * _image.anchorX;
		r = wide + l;
		t = -high * _image.anchorY;
		b = high + t;
		// object has corner offets (skewing/perspective etc)
		buffer[ 0 ] = cnr.lbx * l; buffer[ 1 ] = cnr.lby * b;
		buffer[ 4 ] = cnr.ltx * l; buffer[ 5 ] = cnr.lty * t;
		buffer[ 8 ] = cnr.rbx * r; buffer[ 9 ] = cnr.rby * b;
		buffer[ 12] = cnr.rtx * r; buffer[ 13] = cnr.rty * t;
	}
	else
	{
		l = -wide * _image.anchorX;
		r = wide + l;
		t = -high * _image.anchorY;
		b = high + t;
		buffer[ 0 ] = buffer[ 4 ] = l;
		buffer[ 1 ] = buffer[ 9 ] = b;
		buffer[ 8 ] = buffer[ 12] = r;
		buffer[ 5 ] = buffer[ 13] = t;
	}

	// texture source position
	// x, b,		2,3
	// x, y,		6,7
	// r, b,		10,11
	// r, y,		14,15
	buffer[ 2 ] = buffer[ 6 ] = rect.x;
	buffer[ 3 ] = buffer[ 11] = rect.y + rect.height;
	buffer[ 10] = buffer[ 14] = rect.x + rect.width;
	buffer[ 7 ] = buffer[ 15] = rect.y;

    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );

	// bind the source texture
    gl.bindTexture(gl.TEXTURE_2D, this.textures.currentSrcTexture);
    // bind the source buffer
    gl.bindBuffer( gl.ARRAY_BUFFER, this.positionBuffer );

	// send the transform matrix to the vector shader
	gl.uniformMatrix3fv( pbWebGlShaders.currentProgram.uModelMatrix, false, _transform );
	// set the depth value
   	gl.uniform1f( pbWebGlShaders.currentProgram.uZ, _z );
	// point the position attribute at the last bound buffer
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray(pbWebGlShaders.currentProgram.aPosition);
    // draw the buffer: four vertices per quad, one quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};




/**
 * drawTextureWithTransform - draw a texture that is on the GPU using the transform provided
 *
 * @param  {ImageData} _texture - the gl.createTexture reference to the texture, must have width and height members (eg. if pbWebGlTextures.initTexture created it)
 * @param  {pbMatrix3} _transform - the transform to apply, can specify translation, rotation and scaling, plus anything else that goes into a 3x3 homogenous matrix
 * @param  {Number} _z - the z depth at which to draw
 */
pbWebGl.prototype.drawTextureWithTransform = function( _texture, _transform, _z )
{
	// console.log("drawTextureWithTransform", _texture);

	// _texture, _npot, _tiling
	this.textures.prepareOnGPU(_texture, true, false);

	this.shaders.setProgram(this.shaders.imageShaderProgram, 0);

	// split off a small part of the big buffer, for a single display object
	var buffer = this.drawingArray.subarray(0, 16);

	var wide, high;
	// half width, half height (of source frame)
	wide = _texture.width;
	high = _texture.height;

	// screen destination position
	// l, b,		0,1
	// l, t,		4,5
	// r, b,		8,9
	// r, t,		12,13
	var l, r, t, b;
	{
		l = -wide * 0.5;
		r = wide + l;
		t = high * 0.5;
		b = -high + t;
		buffer[ 0 ] = buffer[ 4 ] = l;
		buffer[ 1 ] = buffer[ 9 ] = b;
		buffer[ 8 ] = buffer[ 12] = r;
		buffer[ 5 ] = buffer[ 13] = t;
	}

	// texture source position (use the whole texture)
	// x, b,		2,3
	// x, y,		6,7
	// r, b,		10,11
	// r, y,		14,15
	buffer[ 2 ] = buffer[ 6 ] = buffer[ 7 ] = buffer[ 15] = 0;
	buffer[ 3 ] = buffer[ 11] = buffer[ 10] = buffer[ 14] = 1.0;

    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
    // bind the source buffer
    gl.bindBuffer( gl.ARRAY_BUFFER, this.positionBuffer );

	// send the transform matrix to the vector shader
	gl.uniformMatrix3fv( pbWebGlShaders.currentProgram.uModelMatrix, false, _transform );

	// set the depth value
   	gl.uniform1f( pbWebGlShaders.currentProgram.uZ, _z );

	// point the position attribute at the last bound buffer
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

    // four vertices per quad, one quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};


pbWebGl.prototype.drawTextureToDisplay = function(_textureNumber, _texture, _shaderProgram)
{
	if (_shaderProgram !== undefined)
		this.shaders.setProgram(_shaderProgram, _textureNumber);
	else
		this.shaders.setProgram(this.shaders.simpleShaderProgram, _textureNumber);

	if (!this.positionBuffer)
		this.prepareBuffer();
	
	// create a buffer for the vertices used to transfer the render-to-texture to the display
	var buffer = this.drawingArray.subarray(0, 16);

	var verts = [
		1,  1,
		-1,  1,
		-1, -1,
		1,  1,
		-1, -1,
		1, -1
	];
    gl.bindBuffer( gl.ARRAY_BUFFER, this.positionBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW );

	gl.bindTexture(gl.TEXTURE_2D, _texture);

	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);
	gl.drawArrays(gl.TRIANGLES, 0, 3 * 2);	// three vertices per tri, two tris
};


pbWebGl.prototype.applyFilterToTexture = function(_textureNumber, _srcTexture, _callback, _context)
{
	// callback to set the filter program and parameters
	_callback.call(_context, this.filters, _textureNumber);

	// create a buffer for the vertices used to draw the _srcTexture to the _dstTexture
	var buffer = this.drawingArray.subarray(0, 16);

	var verts = [
		1,  1,
		-1,  1,
		-1, -1,
		1,  1,
		-1, -1,
		1, -1
	];
    gl.bindBuffer( gl.ARRAY_BUFFER, this.positionBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW );

	gl.bindTexture(gl.TEXTURE_2D, _srcTexture);

	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);
	gl.drawArrays(gl.TRIANGLES, 0, 3 * 2);	// three vertices per tri, two tris
};


/**
 * drawImageToTextureWithTransform - draw images to a render texture
 * - after each call the framebuffer is released, so no further action is required when rendering to texture is completed
 *
 * @param  {[type]} _width     - size of the texture to render to
 * @param  {[type]} _height    - size of the texture to render to
 * @param  {[type]} _image     - the image to render
 * @param  {[type]} _transform - the transform matrix for the image
 * @param  {[type]} _z         - the depth value for the image
 */
// single image instances from pbWebGlLayer drawn to a texture
pbWebGl.prototype.drawImageToTextureWithTransform = function( _width, _height, _image, _transform, _z )
{
	this.shaders.setProgram(this.shaders.imageShaderProgram, 0);

	// create the source texture and initialise webgl (once only)
	var surface = _image.surface;
	if (this.textures.prepare( surface.imageData, _image.tiling, surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	// set up the source imageData as the render source
	this.textures.setRenderSourceImage( surface.imageData );

	// create the destination texture
	this.textures.setRenderTargetToTexture(_width, _height);

	// this indented block is identical to part of drawImageWithTransform...
	// TODO: how many of these are there? Worth adding a function? DRY

		// split off a small part of the big buffer, for a single display object
		var buffer = this.drawingArray.subarray(0, 16);

		// set up the animation frame
		var cell = Math.floor(_image.cellFrame);
		var rect = surface.cellTextureBounds[cell % surface.cellsWide][Math.floor(cell / surface.cellsWide)];

		var wide, high;
		if (_image.fullScreen)
		{
			rect.width = gl.drawingBufferWidth / surface.cellWide;
			rect.height = gl.drawingBufferHeight / surface.cellHigh;
			wide = gl.drawingBufferWidth;
			high = gl.drawingBufferHeight;
		}
		else
		{
			// half width, half height (of source frame)
			wide = surface.cellWide;
			high = surface.cellHigh;
		}

		// screen destination position
		// l, b,		0,1
		// l, t,		4,5
		// r, b,		8,9
		// r, t,		12,13
		var l, r, t, b;
		if (_image.corners)
		{
			var cnr = _image.corners;
			l = -wide * _image.anchorX;
			r = wide + l;
			t = -high * _image.anchorY;
			b = high + t;
			// object has corner offets (skewing/perspective etc)
			buffer[ 0 ] = cnr.lbx * l; buffer[ 1 ] = cnr.lby * b;
			buffer[ 4 ] = cnr.ltx * l; buffer[ 5 ] = cnr.lty * t;
			buffer[ 8 ] = cnr.rbx * r; buffer[ 9 ] = cnr.rby * b;
			buffer[ 12] = cnr.rtx * r; buffer[ 13] = cnr.rty * t;
		}
		else
		{
			l = -wide * _image.anchorX;
			r = wide + l;
			t = -high * _image.anchorY;
			b = high + t;
			buffer[ 0 ] = buffer[ 4 ] = l;
			buffer[ 1 ] = buffer[ 9 ] = b;
			buffer[ 8 ] = buffer[ 12] = r;
			buffer[ 5 ] = buffer[ 13] = t;
		}

		// texture source position
		// x, b,		2,3
		// x, y,		6,7
		// r, b,		10,11
		// r, y,		14,15
		buffer[ 2 ] = buffer[ 6 ] = rect.x;
		buffer[ 3 ] = buffer[ 11] = rect.y + rect.height;
		buffer[ 10] = buffer[ 14] = rect.x + rect.width;
		buffer[ 7 ] = buffer[ 15] = rect.y;

	    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );

		// send the transform matrix to the vector shader
		gl.uniformMatrix3fv( pbWebGlShaders.currentProgram.uModelMatrix, false, _transform );

		// set the depth value
	   	gl.uniform1f( pbWebGlShaders.currentProgram.uZ, _z );

		// point the position attribute at the last bound buffer
	    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

	    // four vertices per quad, one quad
	    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

   	// cease rendering to the render texture
   	this.textures.stopRenderTexture();
};



// single image instances from pbWebGlLayer
pbWebGl.prototype.drawModeZ = function( _image, _transform, _z )
{
	this.shaders.setProgram(this.shaders.modezShaderProgram, 0);

	var surface = _image.surface;
	if (this.textures.prepare( surface.imageData, _image.tiling, surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	// split off a small part of the big buffer, for a single display object
	var buffer = this.drawingArray.subarray(0, 16);

	// set up the animation frame
	var cell = Math.floor(_image.cellFrame);
	var rect = surface.cellTextureBounds[cell % surface.cellsWide][Math.floor(cell / surface.cellsWide)];

	var wide, high;
	if (_image.fullScreen)
	{
		rect.width = gl.drawingBufferWidth / surface.cellWide;
		rect.height = gl.drawingBufferHeight / surface.cellHigh;
		wide = gl.drawingBufferWidth;
		high = gl.drawingBufferHeight;
	}
	else
	{
		// half width, half height (of source frame)
		wide = surface.cellWide;
		high = surface.cellHigh;
	}

	// screen destination position
	// l, b,		0,1
	// l, t,		4,5
	// r, b,		8,9
	// r, t,		12,13
	if (_image.corners)
	{
		var cnr = _image.corners;
		l = -wide * _image.anchorX;
		r = wide + l;
		t = -high * _image.anchorY;
		b = high + t;
		// object has corner offets (skewing/perspective etc)
		buffer[ 0 ] = cnr.lbx * l; buffer[ 1 ] = cnr.lby * b;
		buffer[ 4 ] = cnr.ltx * l; buffer[ 5 ] = cnr.lty * t;
		buffer[ 8 ] = cnr.rbx * r; buffer[ 9 ] = cnr.rby * b;
		buffer[ 12] = cnr.rtx * r; buffer[ 13] = cnr.rty * t;
	}
	else
	{
		l = -wide * _image.anchorX;
		r = wide + l;
		t = -high * _image.anchorY;
		b = high + t;
		buffer[ 0 ] = buffer[ 4 ] = l;
		buffer[ 1 ] = buffer[ 9 ] = b;
		buffer[ 8 ] = buffer[ 12] = r;
		buffer[ 5 ] = buffer[ 13] = t;
	}

	// texture source position
	// x, b,		2,3
	// x, y,		6,7
	// r, b,		10,11
	// r, y,		14,15
	buffer[ 2 ] = buffer[ 6 ] = rect.x;
	buffer[ 3 ] = buffer[ 11] = rect.y + rect.height;
	buffer[ 10] = buffer[ 14] = rect.x + rect.width;
	buffer[ 7 ] = buffer[ 15] = rect.y;

    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );

	// send the transform matrix to the vector shader
	gl.uniformMatrix3fv( pbWebGlShaders.currentProgram.uModelMatrix, false, _transform );

	// set the depth value
   	gl.uniform1f( pbWebGlShaders.currentProgram.uZ, _z );

	// point the position attribute at the last bound buffer
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

	if (pbWebGlShaders.currentProgram.uTime)
		gl.uniform1f( pbWebGlShaders.currentProgram.uTime, (pbRenderer.frameCount % 100) / 100.0 );

    // four vertices per quad, one quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};



// single image instances from pbWebGlLayer using a 3D projection
pbWebGl.prototype.drawImageWithTransform3D = function( _image, _transform, _z )
{
	this.shaders.setProgram(this.shaders.imageShaderProgram3D, 0);

	var surface = _image.surface;
	if (this.textures.prepare( surface.imageData, _image.tiling, surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	// split off a small part of the big buffer, for a single display object
	var buffer = this.drawingArray.subarray(0, 16);

	// set up the animation frame
	var cell = Math.floor(_image.cellFrame);
	var rect = surface.cellTextureBounds[cell % surface.cellsWide][Math.floor(cell / surface.cellsWide)];

	// width, height (of source frame)
	var wide = surface.cellWide;
	var high = surface.cellHigh;

	// screen destination position (aPosition.xy in vertex shader)
	// l, b,		0,1
	// l, t,		4,5
	// r, b,		8,9
	// r, t,		12,13
	var l = -wide * _image.anchorX;
	var t = -high * _image.anchorY;
	buffer[ 0 ] = buffer[ 4 ] = l;
	buffer[ 1 ] = buffer[ 9 ] = high + t;
	buffer[ 8 ] = buffer[ 12] = wide + l;
	buffer[ 5 ] = buffer[ 13] = t;

	// texture source position (aPosition.zw in vertex shader)
	// x, b,		2,3
	// x, y,		6,7
	// r, b,		10,11
	// r, y,		14,15
	buffer[ 2 ] = buffer[ 6 ] = rect.x;
	buffer[ 3 ] = buffer[ 11] = rect.y + rect.height;
	buffer[ 10] = buffer[ 14] = rect.x + rect.width;
	buffer[ 7 ] = buffer[ 15] = rect.y;

    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );

	// send the transform matrix to the vector shader
	gl.uniformMatrix4fv( pbWebGlShaders.currentProgram.uModelMatrix4, false, _transform );

	// set the depth value
   	gl.uniform1f( pbWebGlShaders.currentProgram.uZ, _z );

	// point the position attribute at the last bound buffer
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

    // four vertices per quad, one quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};


// unused at present.  Draws a single image, sends the transform matrix as a uniform.
pbWebGl.prototype.drawImage = function( _x, _y, _z, _surface, _cellFrame, _angle, _scale )
{
	this.shaders.setProgram(this.shaders.imageShaderProgram, 0);

	if (this.textures.prepare( _surface.imageData, null, _surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	// split off a small part of the big buffer, for a single display object
	var buffer = this.drawingArray.subarray(0, 20);

	// half width, half height (of source frame)
	var wide = _surface.cellWide * 0.5;
	var high = _surface.cellHigh * 0.5;

	// set up the animation frame
	var cell = Math.floor(_cellFrame);
	var cx = cell % _surface.cellsWide;
	var cy = Math.floor(cell / _surface.cellsWide);
	var rect = _surface.cellTextureBounds[cx][cy];
	var tex_x = rect.x;
	var tex_y = rect.y;
	var tex_r = rect.x + rect.width;
	var tex_b = rect.y + rect.height;

	// screen destination position
	// l, b,		0,1
	// l, t,		4,5
	// r, b,		8,9
	// r, t,		12,13
	buffer[ 0 ] = buffer[ 4 ] = -wide;
	buffer[ 1 ] = buffer[ 9 ] =  high;
	buffer[ 8 ] = buffer[ 12] =  wide;
	buffer[ 5 ] = buffer[ 13] = -high;

	// texture source position
	// 0, 0,		2,3
	// 0, 1,		6,7
	// 1, 0,		10,11
	// 1, 1,		14,15
	buffer[ 2 ] = buffer[ 6 ] = tex_x;
	buffer[ 3 ] = buffer[ 11] = tex_b;
	buffer[ 10] = buffer[ 14] = tex_r;
	buffer[ 7 ] = buffer[ 15] = tex_y;

    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );

	// TODO: most of these are semi-static, cache them
	var matrix = pbMatrix3.makeTransform(_x, _y, _angle, _scale, _scale);

	// var translationMatrix = pbMatrix3.makeTranslation(_x, _y);
	// var rotationMatrix = pbMatrix3.makeRotation(_angle);
	// var scaleMatrix = pbMatrix3.makeScale(_scale, _scale);

	// var matrix = pbMatrix3.fastMultiply(rotationMatrix, scaleMatrix);
	// matrix = pbMatrix3.fastMultiply(matrix, translationMatrix);

	// send the matrix to the vector shader
	gl.uniformMatrix3fv( pbWebGlShaders.currentProgram.uModelMatrix, false, matrix );

	// set the depth value
   	gl.uniform1f( pbWebGlShaders.currentProgram.uZ, _z );

	// point the position attribute at the last bound buffer
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

    // four vertices per quad, one quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};


// TODO: test variation of blitSimpleDrawImages that uses non-indexed triangle list instead of tri-strips... overhead of degenerate triangles might be greater than the extra vertex data, especially as the JS will become shorter/simpler too!

// batch images, no transforms, pbSimpleLayer, pbBunnyDemo
// requires _list to be alternately x and y coordinate values
pbWebGl.prototype.blitSimpleDrawImages = function( _list, _listLength, _surface )
{
	this.shaders.setProgram(this.shaders.blitShaderProgram, 0);

	if (this.textures.prepare( _surface.imageData, null, _surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	var screenWide2 = gl.drawingBufferWidth * 0.5;
	var screenHigh2 = gl.drawingBufferHeight * 0.5;

	// calculate inverse to avoid division in loop
	var iWide = 1.0 / screenWide2;
	var iHigh = 1.0 / screenHigh2;

	// TODO: generate warning if length is capped
	var len = Math.min(_listLength, MAX_SPRITES * 2);

	var scale = 1.0;
	var wide = _surface.cellWide * scale * 0.5 / screenWide2;
	var high = _surface.cellHigh * scale * 0.5 / screenHigh2;

	var old_t;
	var old_r;

	// store local reference to avoid extra scope resolution (http://www.slideshare.net/nzakas/java-script-variable-performance-presentation)
    var buffer = this.drawingArray.subarray(0, len * 24 - 8);

	// weird loop speed-up (http://www.paulirish.com/i/d9f0.png) gained 2fps on my rig!
	for ( var i = -2, c = 0; (i += 2) < len; c += 16 )
	{
		var x = _list[i] * iWide - 1;
		var y = 1 - _list[i + 1] * iHigh;
		var l = x - wide;
		var b = y + high;

		if ( c > 0 )
		{
			// degenerate triangle: repeat the last vertex
			buffer[ c     ] = old_r;
			buffer[ c + 1 ] = old_t;
		 	// repeat the next vertex
			buffer[ c + 4 ] = l;
		 	buffer[ c + 5 ] = b;
		 	// texture coordinates are unused
			//buffer[ c + 2 ] = buffer[ c + 3 ] = buffer[ c + 6 ] = buffer[ c + 7 ] = 0;
			c += 8;
		}

		// screen destination position
		// l, b,		0,1
		// l, t,		4,5
		// r, b,		8,9
		// r, t,		12,13

		buffer[ c     ] = buffer[ c + 4 ] = l;
		buffer[ c + 1 ] = buffer[ c + 9 ] = b;
		buffer[ c + 8 ] = buffer[ c + 12] = old_r = x + wide;
		buffer[ c + 5 ] = buffer[ c + 13] = old_t = y - high;

		// texture source position
		// 0, 0,		2,3
		// 0, 1,		6,7
		// 1, 0,		10,11
		// 1, 1,		14,15
		buffer[ c + 2 ] = buffer[ c + 6] = buffer[ c + 3 ] = buffer[ c + 11] = 0;
		buffer[ c + 10] = buffer[ c + 14] = buffer[ c + 7 ] = buffer[ c + 15] = 1;
	}


    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, len / 2 * 6 - 2);		// four vertices per sprite plus two degenerate points
};


// batch images, no transforms
// _list contains objects with an .x and .y property
pbWebGl.prototype.blitListDirect = function( _list, _listLength, _surface )
{
	this.shaders.setProgram(this.shaders.blitShaderProgram, 0);

	if (this.textures.prepare( _surface.imageData, null, _surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	var screenWide2 = gl.drawingBufferWidth * 0.5;
	var screenHigh2 = gl.drawingBufferHeight * 0.5;

	// calculate inverse to avoid division in loop
	var iWide = 1.0 / screenWide2;
	var iHigh = 1.0 / screenHigh2;

	// TODO: generate warning if length is capped
	var len = Math.min(_listLength, MAX_SPRITES);

	var scale = 1.0;
	var wide = _surface.cellWide * scale * 0.5 / screenWide2;
	var high = _surface.cellHigh * scale * 0.5 / screenHigh2;

	var old_t;
	var old_r;

	// store local reference to avoid extra scope resolution (http://www.slideshare.net/nzakas/java-script-variable-performance-presentation)
    var buffer = this.drawingArray.subarray(0, len * 24 - 8);

	// weird loop speed-up (http://www.paulirish.com/i/d9f0.png) gained 2fps on my rig!
	for ( var i = -1, c = 0; ++i < len; c += 16 )
	{
		var x = _list[i].x * iWide - 1;
		var y = 1 - _list[i].y * iHigh;
		var l = x - wide;
		var b = y + high;

		if ( i > 0 )
		{
			// degenerate triangle: repeat the last vertex
			buffer[ c     ] = old_r;
			buffer[ c + 1 ] = old_t;
		 	// repeat the next vertex
			buffer[ c + 4 ] = l;
		 	buffer[ c + 5 ] = b;
		 	// texture coordinates are unused
			//buffer[ c + 2 ] = buffer[ c + 3 ] = buffer[ c + 6 ] = buffer[ c + 7 ] = 0;
			c += 8;
		}

		// screen destination position
		// l, b,		0,1
		// l, t,		4,5
		// r, b,		8,9
		// r, t,		12,13

		buffer[ c     ] = buffer[ c + 4 ] = l;
		buffer[ c + 1 ] = buffer[ c + 9 ] = b;
		buffer[ c + 8 ] = buffer[ c + 12] = old_r = x + wide;
		buffer[ c + 5 ] = buffer[ c + 13] = old_t = y - high;

		// texture source position
		// 0, 0,		2,3
		// 0, 1,		6,7
		// 1, 0,		10,11
		// 1, 1,		14,15
		buffer[ c + 2 ] = buffer[ c + 6] = buffer[ c + 3 ] = buffer[ c + 11] = 0;
		buffer[ c + 10] = buffer[ c + 14] = buffer[ c + 7 ] = buffer[ c + 15] = 1;
	}


    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, len * 6 - 2);		// four vertices per sprite plus two degenerate points
};


// currently unused in demos.  pbImage.isParticle through pbWebGlLayer, sends four floats per vertex (x,y,u,v) to gl, no sprite sheet
// TODO: don't need u,v stream if it's always 0 & 1 values??
pbWebGl.prototype.blitDrawImages = function( _list, _surface )
{
	this.shaders.setProgram(this.shaders.blitShaderProgram, 0);

	if (this.textures.prepare( _surface.imageData, null, _surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	var screenWide2 = gl.drawingBufferWidth * 0.5;
	var screenHigh2 = gl.drawingBufferHeight * 0.5;

	// calculate inverse to avoid division in loop
	var iWide = 1.0 / screenWide2;
	var iHigh = 1.0 / screenHigh2;

	// TODO: generate warning if length is capped
	var len = Math.min(_list.length, MAX_SPRITES);

	var scale = 1.0;
	var wide = _surface.cellWide * scale * 0.5 / screenWide2;
	var high = _surface.cellHigh * scale * 0.5 / screenHigh2;

	var old_t;
	var old_r;

	// store local reference to avoid extra scope resolution (http://www.slideshare.net/nzakas/java-script-variable-performance-presentation)
    var buffer = this.drawingArray.subarray(0, len * 24 - 8);

	// weird loop speed-up (http://www.paulirish.com/i/d9f0.png) gained 2fps on my rig!
	for ( var i = -1, c = 0; ++i < len; c += 16 )
	{
		var t = _list[ i ].transform;
		var x = t[6] * iWide - 1;
		var y = 1 - t[7] * iHigh;
		var l = x - wide;
		var b = y + high;

		if ( i > 0 )
		{
			// degenerate triangle: repeat the last vertex
			buffer[ c     ] = old_r;
			buffer[ c + 1 ] = old_t;
		 	// repeat the next vertex
			buffer[ c + 4 ] = l;
		 	buffer[ c + 5 ] = b;
		 	// texture coordinates are unused
			//buffer[ c + 2 ] = buffer[ c + 3 ] = buffer[ c + 6 ] = buffer[ c + 7 ] = 0;
			c += 8;
		}

		// screen destination position
		// l, b,		0,1
		// l, t,		4,5
		// r, b,		8,9
		// r, t,		12,13

		buffer[ c     ] = buffer[ c + 4 ] = l;
		buffer[ c + 1 ] = buffer[ c + 9 ] = b;
		buffer[ c + 8 ] = buffer[ c + 12] = old_r = x + wide;
		buffer[ c + 5 ] = buffer[ c + 13] = old_t = y - high;

		// texture source position
		// 0, 0,		2,3
		// 0, 1,		6,7
		// 1, 0,		10,11
		// 1, 1,		14,15
		buffer[ c + 2 ] = buffer[ c + 6] = buffer[ c + 3 ] = buffer[ c + 11] = 0;
		buffer[ c + 10] = buffer[ c + 14] = buffer[ c + 7 ] = buffer[ c + 15] = 1;
	}


    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, len * 6 - 2);		// four vertices per sprite plus two degenerate points
};


// called when pbSimpleLayer.setDrawingFunctions is directed to pbSimpleLayer.drawPoint
// sends points directly to gl from the source array (no further JS looping required)
// draws the whole of _surface at the point locations, extremely quickly
pbWebGl.prototype.blitDrawImagesPoint = function( _list, _listLength, _surface )
{
	this.shaders.setProgram(this.shaders.blitShaderPointProgram, 0);

	if (this.textures.prepare( _surface.imageData, null, _surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();

		var max = Math.max(_surface.cellWide, _surface.cellHigh);
		// set the size of the 'point' (it's square)
		if (pbWebGlShaders.currentProgram.uSize)
		{
			gl.uniform1f( pbWebGlShaders.currentProgram.uSize, max );
		}
		// set the dimensions of the actual texture (can be rectangular)
		if (pbWebGlShaders.currentProgram.uTextureSize)
		{
			gl.uniform2f( pbWebGlShaders.currentProgram.uTextureSize, max / _surface.cellWide, max / _surface.cellHigh );
		}
	}

	// TODO: generate warning if length is capped
	var len = Math.min(_listLength, MAX_SPRITES * 2);

	// make a buffer view of the _list which is only as long as we need
    var buffer = _list.subarray(0, len);
    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.drawArrays(gl.POINTS, 0, len / 2);
};


// sends points and texture locations to gl
// draws a single animation frame from _surface at the point locations, very quickly
// _list contains x,y,u,v values, repeated for each point sprite
pbWebGl.prototype.blitDrawImagesPointAnim = function( _list, _listLength, _surface )
{
	this.shaders.setProgram(this.shaders.blitShaderPointAnimProgram, 0);

	if (this.textures.prepare( _surface.imageData, null, _surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();

		var max = Math.max(_surface.cellWide, _surface.cellHigh);
		// set the size of the 'point' (it's square)
		if (pbWebGlShaders.currentProgram.uSize)
		{
			gl.uniform1f( pbWebGlShaders.currentProgram.uSize, max );
		}
		// set the dimensions of the actual texture (can be rectangular)
		if (pbWebGlShaders.currentProgram.uTextureSize)
		{
			gl.uniform2f( pbWebGlShaders.currentProgram.uTextureSize, 1 / _surface.cellsWide, 1 / _surface.cellsHigh );
		}
	}

	// TODO: generate warning if length is capped
	var len = Math.min(_listLength, MAX_SPRITES * 4);

	// make a buffer view of the _list which is only as long as we need
    var buffer = _list.subarray(0, len);
    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 2, gl.FLOAT, false, 4 * 4, 0 * 4 );
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aTextureCoord, 2, gl.FLOAT, false, 4 * 4, 2 * 4 );
    gl.drawArrays(gl.POINTS, 0, len / 4);
};


// TODO: turns out we can use multiple bindBuffers instead of interleaving the data... give it a test for speed!  (I suspect this will cause additional stalls when transmitting the data)
    // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    // gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray(colorLoc);
    // gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    // gl.vertexAttribPointer(vertLoc, 2, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray(vertLoc);
    // gl.drawArrays(gl.POINTS, 0, numPoints);


// unused.  Sends tx,ty,sin,cos,sx,sy and u,v to gl.
pbWebGl.prototype.batchDrawImages = function( _list, _surface )
{
	this.shaders.setProgram(this.shaders.batchImageShaderProgram, 0);

	if (this.textures.prepare( _surface.imageData, null, _surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	// half width, half height (of source frame)
	var wide = _surface.cellWide * 0.5;
	var high = _surface.cellHigh * 0.5;

	// TODO: generate warning if length is capped
	var len = Math.min(_list.length, MAX_SPRITES);

	// store local reference to avoid extra scope resolution (http://www.slideshare.net/nzakas/java-script-variable-performance-presentation)
    var buffer = this.drawingArray.subarray(0, len * (44 + 22) - 22);

	// weird loop speed-up (http://www.paulirish.com/i/d9f0.png) gained 2fps on my rig (chrome)!
	for ( var i = -1, c = 0; ++i < len; c += 44 )
	{
		// set up texture reference coordinates based on the image frame number
		var img = _list[i].image;
		var cell = Math.floor(img.cellFrame);
		var surface = img.surface;
		var cx = cell % surface.cellsWide;
		var cy = Math.floor(cell / surface.cellsWide);
		var rect = surface.cellTextureBounds[cx][cy];
		var tex_x = rect.x;
		var tex_y = rect.y;
		var tex_r = rect.x + rect.width;
		var tex_b = rect.y + rect.height;

		var cos = -Math.cos(_list[i].angle);
		var sin = Math.sin(_list[i].angle);
		var scale = _list[i].scale;
		var x = Math.round(_list[i].x);
		var y = Math.round(_list[i].y);
		var z = _list[i].z;

		if ( i > 0)
		{
			// degenerate triangle: repeat the last vertex and the next vertex
			// 
			// screen destination position
			buffer[ c     ] = buffer[ c - 44 + 33 ];
			buffer[ c + 1 ] = buffer[ c - 44 + 34 ];
			buffer[ c + 11] = -wide;
			buffer[ c + 12] =  high;

			// texture source position and size
			buffer[ c + 2 ] = buffer[c - 44 + 35];
			buffer[ c + 3 ] = buffer[c - 44 + 36];
			buffer[ c + 15] = tex_x;
			buffer[ c + 16] = tex_y;

			// rotation cos & sin components
			buffer[ c + 4 ] = buffer[c - 44 + 37];
			buffer[ c + 5 ] = buffer[c - 44 + 38];
			buffer[ c + 15] = sin;
			buffer[ c + 16] = cos;

			// scaling sx & sy components
			buffer[ c + 6 ] = buffer[ c - 44 + 39];
			buffer[ c + 7 ] = buffer[ c - 44 + 40];
			buffer[ c + 17] = scale;
			buffer[ c + 18] = scale;

			// world translation
			buffer[ c + 8 ] = buffer[c - 44 + 41];
			buffer[ c + 9 ] = buffer[c - 44 + 42];
			buffer[ c + 10] = buffer[c - 44 + 43];
			buffer[ c + 19] = x;
			buffer[ c + 20] = y;
			buffer[ c + 21] = z;

			c += 22;
		}

		// screen destination position
		// l, b,		0,1
		// l, t,		11,12
		// r, b,		22,23
		// r, t,		33,34
		buffer[ c     ] = buffer[ c + 11] = -wide;		// l
		buffer[ c + 1 ] = buffer[ c + 23] =  high;		// b
		buffer[ c + 22] = buffer[ c + 33] =  wide;		// r
		buffer[ c + 12] = buffer[ c + 34] = -high;		// t

		// texture source position
		// l, b,		2,3
		// l, t,		13,14
		// r, b,		24,25
		// r, t,		35,36
		buffer[ c + 2 ] = buffer[ c + 13] = tex_x;		// l
		buffer[ c + 3 ] = buffer[ c + 25] = tex_y;		// b
		buffer[ c + 24] = buffer[ c + 35] = tex_r;		// r
		buffer[ c + 14] = buffer[ c + 36] = tex_b;		// t

		// rotation cos & sin components
		//  4, 5
		// 15,16
		// 26,27
		// 37,38
		buffer[ c + 4 ] = buffer[ c + 15] = buffer[ c + 26] = buffer[ c + 37] = cos;
		buffer[ c + 5 ] = buffer[ c + 16] = buffer[ c + 27] = buffer[ c + 38] = sin;

		// scaling sx & sy components
		//  6, 7
		// 17,18
		// 28,29
		// 39,40
		buffer[ c + 6 ] = buffer[ c + 17] = buffer[ c + 28] = buffer[ c + 39] = scale;
		buffer[ c + 7 ] = buffer[ c + 18] = buffer[ c + 29] = buffer[ c + 40] = scale;

		// world translation
		buffer[ c + 8 ] = buffer[ c + 19] = buffer[ c + 30] = buffer[ c + 41] = x;
		buffer[ c + 9 ] = buffer[ c + 20] = buffer[ c + 31] = buffer[ c + 42] = y;

		// world depth (0 = front, 1 = back)
		buffer[ c + 10] = buffer[ c + 21] = buffer[ c + 32] = buffer[ c + 43] = z;
	}

	// point the attributes at the buffer (stride and offset are in bytes, there are 4 bytes per gl.FLOAT)
    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition , 4, gl.FLOAT, false, 11 * 4, 0 * 4 );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aTransform, 4, gl.FLOAT, false, 11 * 4, 4 * 4 );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aTranslate, 3, gl.FLOAT, false, 11 * 4, 8 * 4 );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, len * 6 - 2);		// four vertices per sprite plus two degenerate points
};


// Used by pbWebGlLayer for multiple sprite instances which are not particles
// Sends transform matrix elements to gl.
// _list object format: { image: pbImage, transform: pbMatrix3, z_order: Number }
pbWebGl.prototype.rawBatchDrawImages = function( _list )
{
	var surface = _list[0].image.surface;

	this.shaders.setProgram(this.shaders.rawBatchImageShaderProgram, 0);

	if (this.textures.prepare( surface.imageData, _list[0].image.tiling, surface.isNPOT ))
	{
		this.prepareBuffer();
		this.prepareShader();
	}

	// half width, half height (of source frame)
	var wide = surface.cellWide;
	var high = surface.cellHigh;

	// TODO: generate warning if length is capped
	var len = Math.min(_list.length, MAX_SPRITES);

	// store local reference to avoid extra scope resolution (http://www.slideshare.net/nzakas/java-script-variable-performance-presentation)
    var buffer = this.drawingArray.subarray(0, len * (44 + 22) - 22);

    var l, r, t, b;

	// weird loop speed-up (http://www.paulirish.com/i/d9f0.png) gained 2fps on my rig!
	for ( var i = -1, c = 0; ++i < len; c += 44 )
	{
		var obj = _list[i];
		var img = obj.image;

		// set up texture reference coordinates based on the image frame number
		var cell = Math.floor(img.cellFrame);
		var cx = cell % surface.cellsWide;
		var cy = Math.floor(cell / surface.cellsWide);
		var rect = surface.cellTextureBounds[cx][cy];
		if (!rect)
			console.log("ERROR: invalid cellFrame", cx, cy);
		var tex_x = rect.x;
		var tex_y = rect.y;
		var tex_r = rect.x + rect.width;
		var tex_b = rect.y + rect.height;

		if ( i > 0)
		{
			// degenerate triangle: repeat the last vertex and the next vertex
			// 
			// screen destination position
			buffer[ c     ] = buffer[ c - 44 + 33 ];
			buffer[ c + 1 ] = buffer[ c - 44 + 34 ];

			// last transform matrix
			buffer[ c + 4 ] = buffer[ c + 4  - 44 ];
			buffer[ c + 5 ] = buffer[ c + 5  - 44 ];
			buffer[ c + 6 ] = buffer[ c + 6  - 44 ];
			buffer[ c + 7 ] = buffer[ c + 7  - 44 ];
			buffer[ c + 8 ] = buffer[ c + 8  - 44 ];
			buffer[ c + 9 ] = buffer[ c + 9  - 44 ];
			buffer[ c + 10] = buffer[ c + 10 - 44 ];

			c += 22;
		}

		// screen destination position
		// l, b,		0,1
		// l, t,		11,12
		// r, b,		22,23
		// r, t,		33,34
		if (img.corners)
		{
			var cnr = img.corners;
			l = -wide * img.anchorX;
			r = wide + l;
			t = -high * img.anchorY;
			b = high + t;
			// object has corner offets (skewing/perspective etc)
			buffer[ c     ] = cnr.lbx * l; buffer[ c + 1 ] = cnr.lby * b;
			buffer[ c + 11] = cnr.ltx * l; buffer[ c + 12] = cnr.lty * t;
			buffer[ c + 22] = cnr.rbx * r; buffer[ c + 23] = cnr.rby * b;
			buffer[ c + 33] = cnr.rtx * r; buffer[ c + 34] = cnr.rty * t;
		}
		else
		{
			l = -wide * img.anchorX;
			r = wide + l;
			t = -high * img.anchorY;
			b = high + t;
			buffer[ c     ] = l; buffer[ c + 1 ] = b;
			buffer[ c + 11] = l; buffer[ c + 12] = t;
			buffer[ c + 22] = r; buffer[ c + 23] = b;
			buffer[ c + 33] = r; buffer[ c + 34] = t;
		}

		// texture source position
		// l, b,		2,3
		// l, t,		13,14
		// r, b,		24,25
		// r, t,		35,36
		buffer[ c + 2 ] = buffer[ c + 13] = tex_x;		// l
		buffer[ c + 3 ] = buffer[ c + 25] = tex_b;		// b
		buffer[ c + 24] = buffer[ c + 35] = tex_r;		// r
		buffer[ c + 14] = buffer[ c + 36] = tex_y;		// t


		if ( i > 0 )
		{
			// next transform matrix for degenerate triangle preceding this entry

			// destination corner (left, bottom)
			buffer[ c - 22 + 11] = buffer[ c     ];
			buffer[ c - 22 + 12] = buffer[ c + 1 ];

			// model matrix and z_order
			buffer[ c - 22 + 15 ] = buffer[ c + 4 ] = buffer[ c + 15] = buffer[ c + 26] = buffer[ c + 37] = obj.transform[0];
			buffer[ c - 22 + 16 ] = buffer[ c + 5 ] = buffer[ c + 16] = buffer[ c + 27] = buffer[ c + 38] = obj.transform[1];
			buffer[ c - 22 + 17 ] = buffer[ c + 6 ] = buffer[ c + 17] = buffer[ c + 28] = buffer[ c + 39] = obj.transform[3];
			buffer[ c - 22 + 18 ] = buffer[ c + 7 ] = buffer[ c + 18] = buffer[ c + 29] = buffer[ c + 40] = obj.transform[4];
			buffer[ c - 22 + 19 ] = buffer[ c + 8 ] = buffer[ c + 19] = buffer[ c + 30] = buffer[ c + 41] = obj.transform[6];
			buffer[ c - 22 + 20 ] = buffer[ c + 9 ] = buffer[ c + 20] = buffer[ c + 31] = buffer[ c + 42] = obj.transform[7];
			buffer[ c - 22 + 21 ] = buffer[ c + 10] = buffer[ c + 21] = buffer[ c + 32] = buffer[ c + 43] = obj.z_order;
		}
		else
		{
			// model matrix and z_order (no degenerate triangle preceeds the first triangle in the strip)
			buffer[ c + 4 ] = buffer[ c + 15] = buffer[ c + 26] = buffer[ c + 37] = obj.transform[0];
			buffer[ c + 5 ] = buffer[ c + 16] = buffer[ c + 27] = buffer[ c + 38] = obj.transform[1];
			buffer[ c + 6 ] = buffer[ c + 17] = buffer[ c + 28] = buffer[ c + 39] = obj.transform[3];
			buffer[ c + 7 ] = buffer[ c + 18] = buffer[ c + 29] = buffer[ c + 40] = obj.transform[4];
			buffer[ c + 8 ] = buffer[ c + 19] = buffer[ c + 30] = buffer[ c + 41] = obj.transform[6];
			buffer[ c + 9 ] = buffer[ c + 20] = buffer[ c + 31] = buffer[ c + 42] = obj.transform[7];
			buffer[ c + 10] = buffer[ c + 21] = buffer[ c + 32] = buffer[ c + 43] = obj.z_order;
		}
	}

	// point the attributes at the buffer (stride and offset are in bytes, there are 4 bytes per gl.FLOAT)
    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition,     4, gl.FLOAT, false, 11 * 4,  0 * 4 );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aModelMatrix0, 2, gl.FLOAT, false, 11 * 4,  4 * 4 );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aModelMatrix1, 2, gl.FLOAT, false, 11 * 4,  6 * 4 );
	gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aModelMatrix2, 3, gl.FLOAT, false, 11 * 4,  8 * 4 );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, len * 6 - 2);		// four vertices per sprite plus two degenerate points, except for the last one
};


pbWebGl.prototype.reset = function()
{
    gl.bindBuffer( gl.ARRAY_BUFFER, null );
   	gl.bindTexture( gl.TEXTURE_2D, null );
   	this.shaders.clearProgram();
	this.textures.currentSrcTexture = null;
};



pbWebGl.prototype.scissor = function(_x, _y, _width, _height)
{
	if (_x === undefined)
	{
		gl.disable(gl.SCISSOR_TEST);
	}
	else
	{
		gl.enable(gl.SCISSOR_TEST);
		// vertical coordinate system is inverted (0,0) is left, bottom of the screen
		gl.scissor(_x, gl.drawingBufferHeight - 1 - (_y + _height), _width, _height);
	}
};


// function clearDepthBuffer()
// {
// 	gl.clear(gl.DEPTH_BUFFER_BIT);
// }


// pbCanvasToGlDemo and pbGlToCanvasDemo.  Uses imageShaderProgram to draw after transfering the canvas data to gl.
pbWebGl.prototype.drawCanvasWithTransform = function( _canvas, _dirty, _transform, _z )
{
	this.shaders.setProgram(this.shaders.imageShaderProgram, 0);

	if ( _dirty || !this.textures.currentSrcTexture || this.textures.currentSrcTexture.canvas !== _canvas )
	{
		// create a webGl texture from the canvas
		this.textures.createTextureFromCanvas(_canvas);
	    // set the fragment shader sampler to use TEXTURE0
	   	gl.uniform1i( pbWebGlShaders.currentProgram.samplerUniform, 0 );
		// prepare the projection matrix in the vertex shader
		gl.uniformMatrix3fv( pbWebGlShaders.currentProgram.uProjectionMatrix, false, pbMatrix3.makeProjection(gl.drawingBufferWidth, gl.drawingBufferHeight) );
	}

	// split off a small part of the big buffer, for a single display object
	var buffer = this.drawingArray.subarray(0, 16);

	// source rectangle
	var rect = new pbRectangle(0, 0, 1, 1);

	// half width, half height (of source frame)
	var wide, high;
	wide = _canvas.width;
	high = _canvas.height;

	var anchorX = 0.5;
	var anchorY = 0.5;

	// screen destination position
	// l, b,		0,1
	// l, t,		4,5
	// r, b,		8,9
	// r, t,		12,13
	var l = -wide * anchorX;
	var r = wide + l;
	var t = -high * anchorY;
	var b = high + t;
	buffer[ 0 ] = buffer[ 4 ] = l;
	buffer[ 1 ] = buffer[ 9 ] = b;
	buffer[ 8 ] = buffer[ 12] = r;
	buffer[ 5 ] = buffer[ 13] = t;

	// texture source position
	// x, b,		2,3
	// x, y,		6,7
	// r, b,		10,11
	// r, y,		14,15
	buffer[ 2 ] = buffer[ 6 ] = rect.x;
	buffer[ 3 ] = buffer[ 11] = rect.y + rect.height;
	buffer[ 10] = buffer[ 14] = rect.x + rect.width;
	buffer[ 7 ] = buffer[ 15] = rect.y;

    gl.bufferData( gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW );

	// send the transform matrix to the vector shader
	gl.uniformMatrix3fv( pbWebGlShaders.currentProgram.uModelMatrix, false, _transform );

	// set the depth value
   	gl.uniform1f( pbWebGlShaders.currentProgram.uZ, _z );

	// point the position attribute at the last bound buffer
    gl.vertexAttribPointer( pbWebGlShaders.currentProgram.aPosition, 4, gl.FLOAT, false, 0, 0 );

    // four vertices per quad, one quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};




// check if value is a power of two 
function isPowerOfTwo(x)
{
    return ((x & (x - 1)) === 0);
}

 
// return the next highest power of two from this value (keep the value if it is already a power of two)
function nextHighestPowerOfTwo(x)
{
    --x;
    for (var i = 1; i < 32; i <<= 1)
    {
        x = x | x >> i;
    }
    return x + 1;
}
