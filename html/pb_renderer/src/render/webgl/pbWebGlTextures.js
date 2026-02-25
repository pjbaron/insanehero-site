/**
 *
 * pbWebGlTextures.js - texture handler for the pbWebGl drawing functions
 * 
 */


function pbWebGlTextures()
{
	this.onGPU = null;
	this.fb = null;
	this.currentSrcTexture = null;
	this.canReadTexture = false;
	this.rttFb = null;
	this.currentDstTexture = null;
	this.rtDepth = null;
}


pbWebGlTextures.prototype.create = function()
{
	this.onGPU = [];
	this.fb = null;
	this.currentSrcTexture = null;
	this.canReadTexture = false;
	this.rttFb = null;
	this.currentDstTexture = null;
	this.rtDepth = null;
};


pbWebGlTextures.prototype.destroy = function()
{
	this.onGPU = null;
	this.fb = null;
	this.currentSrcTexture = null;
	this.rttFb = null;
	this.currentDstTexture = null;
	this.rtDepth = null;
};


/**
 * prepareOnGPU - prepare a texture which is on the GPU to be used as a source surface
 *
 */
pbWebGlTextures.prototype.prepareOnGPU = function(_texture, _npot, _tiling)
{
	// bind the texture to the active texture register
    gl.bindTexture(gl.TEXTURE_2D, _texture);

    if (_npot)
    {
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    else if (_tiling)
    {
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	    gl.generateMipmap(gl.TEXTURE_2D);
    }
	else
	{
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	    gl.generateMipmap(gl.TEXTURE_2D);
	}

    this.currentSrcTexture = _texture;
};


/**
 * prepare - prepare a texture to be rendered with webGl
 *
 * @param  {ImageData} _imageData  [description]
 * @param  {Boolean} _tiling - true if the image will repeat to tile a larger area
 * @param  {Boolean} _npot - true if the image has a non-power-of-two dimension
 *
 * @return {Boolean} true if successfully prepared a new texture, false if failed or it was already prepared
 */
pbWebGlTextures.prototype.prepare = function( _imageData, _tiling, _npot )
{
	// this _imageData is already the selected texture
	if (this.currentSrcTexture && this.currentSrcTexture.imageData === _imageData)
		return false;

	var texture = null;

	// activate the first texture register
    gl.activeTexture( gl.TEXTURE0 );

	var index = this.onGPU.indexOf(_imageData);
    if (index != -1 && !_imageData.isDirty)
    {
		// the _imageData is already on the GPU
		texture = this.onGPU[index].gpuTexture;
		// bind the texture to the active texture register
	    gl.bindTexture(gl.TEXTURE_2D, texture);
    }
    else
    {
    	// upload it to the GPU
	    var maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
	    if (_imageData.width > maxSize || _imageData.height > maxSize)
	    {
		    alert("ERROR: Texture size not supported by this video card!", _imageData.width, _imageData.height, " > ", maxSize);
		    return false;
	    }

	    if (!_imageData.isDirty)	// only debug when a new texture is sent, not when an old texture is marked 'dirty' (because spam will slow things down)
			console.log( "pbWebGlTextures.prepare uploading source texture : ", _imageData.width, "x", _imageData.height );

	    // link the texture object to the imageData and vice-versa
		texture = gl.createTexture();
		texture.imageData = _imageData;
		_imageData.gpuTexture = texture;
	    _imageData.isDirty = false;

		// bind the texture to the active texture register
	    gl.bindTexture(gl.TEXTURE_2D, texture);
	    
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _imageData);
	    if (_npot)
	    {
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	    }
	    else if (_tiling)
	    {
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		    gl.generateMipmap(gl.TEXTURE_2D);
	    }
    	else
    	{
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		    gl.generateMipmap(gl.TEXTURE_2D);
    	}

	    // remember that this texture has been uploaded
	    this.onGPU.push(_imageData);
	}

    this.currentSrcTexture = texture;

    return true;
};


// http://stackoverflow.com/questions/13626465/how-to-create-a-new-imagedata-object-independently
function ImageData(_width, _height)
{
	console.log("ImageData", _width, "x", _height);

    var canvas = document.createElement('canvas');
    canvas.width = _width;
    canvas.height = _height;
    var ctx = canvas.getContext('2d');
    var imageData = ctx.createImageData(canvas.width, canvas.height);
    return imageData;
}


/**
 * prepare - prepare a texture for webGl to render to it, leave it bound to the framebuffer so everything will go there
 *
 */
pbWebGlTextures.prototype.prepareRenderToTexture = function( _width, _height )
{
	console.log( "pbWebGlTextures.prepareRenderToTexture creating new target texture : ", _width, "x", _height );

	// create a render-to-texture frame buffer
	this.rttFb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.rttFb);
	this.rttFb.width = _width;
	this.rttFb.height = _height;

	// create a texture surface to render to
	this.currentDstTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.currentDstTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    //gl.generateMipmap(gl.TEXTURE_2D);

	// create a new ImageData to hold the texture pixels
	this.currentDstTexture.imageData = new ImageData(_width, _height);
	// link the imageData to the destination texture
	this.currentDstTexture.imageData.gpuTexture = this.currentDstTexture;

	var dataTypedArray = new Uint8Array(this.currentDstTexture.imageData.data);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.rttFb.width, this.rttFb.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, dataTypedArray);


    // create a depth buffer
    this.rtDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.rtDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.rttFb.width, this.rttFb.height);

    // attach the texture and depth buffers to the frame buffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.currentDstTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rtDepth);

    // unbind everything
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};


/**
 * setRenderTargetToTexture - rebind the rttFb frame buffer to render to currentDstTexture
 * 
 */
pbWebGlTextures.prototype.setRenderTargetToTexture = function(_width, _height)
{
	if (!this.rttFb)
	{
		// create the destination texture
		this.prepareRenderToTexture(_width, _height);
	}
	console.log("pbWebGlTextures.setRenderTargetToTexture", _width, "x", _height);

	// rebind the frame buffer containing the destination texture
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.rttFb);
};


/**
 * stopRenderTexture - stop future rendering going to the render texture
 *
 */
pbWebGlTextures.prototype.stopRenderTexture = function()
{
	// unbind the frame buffer to stop rendering to a texture and resume rendering to the display
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};


pbWebGlTextures.prototype.setRenderSourceImage = function( _imageData )
{
	// make sure that _image is the current source texture
	if (!this.currentSrcTexture || this.currentSrcTexture.imageData !== _imageData)
	{
		console.log("pbWebGlTextures.setRenderSourceImage", _imageData.width, "x", _imageData.height);

		var index = this.onGPU.indexOf(_imageData);
		if (index == -1)
			this.onGPU.push(_imageData);
		texture = _imageData.gpuTexture;
		if (texture === null)
			console.log("WARNING: imageData has null for gpuTexture.");
		gl.bindTexture(gl.TEXTURE_2D, texture);
		this.currentSrcTexture = texture;
		gl.activeTexture( gl.TEXTURE0 );
	}
};


/**
 * prepareTextureForAccess - prepare a webGl texture as currentSrcTexture, ready to transfer it's content to system memory
 *
 */
pbWebGlTextures.prototype.prepareTextureForAccess = function(_texture)
{
	// if (_texture.canvas)
	// 	console.log("pbWebGlTextures.prepareTextureForAccess", _texture.canvas.width, "x", _texture.canvas.height);
	// else if (_texture.imageData)
	// 	console.log("pbWebGlTextures.prepareTextureForAccess", _texture.imageData.width, "x", _texture.imageData.height);
	// else
	// 	console.log("pbWebGlTextures.prepareTextureForAccess", _texture.width, "x", _texture.height);

	if (!this.fb)
		// make a framebuffer
		this.fb = gl.createFramebuffer();

	// make this the current frame buffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);

	// attach the texture to the framebuffer.
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, _texture, 0);

	// check if you can read from this type of texture.
	this.canReadTexture = (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE);

	// remember which texture we're working with
    this.currentSrcTexture = _texture;
};


/**
 * getTextureToCanvas - transfer a webGl texture to the Canvas associated with the context provided
 * 
 */
// from http://www.html5rocks.com/en/tutorials/webgl/webgl_fundamentals/
// and https://html.spec.whatwg.org/multipage/scripting.html#pixel-manipulation
// and https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
pbWebGlTextures.prototype.getTextureToCanvas = function(_ctx)
{
	if (this.canReadTexture && this.fb)
	{
		var canvas = _ctx.canvas;
		var imageData = _ctx.createImageData(canvas.width, canvas.height);

		// get the texture data to the ImageData buffer
		this.getTextureData(this.fb, this.currentSrcTexture, imageData.data.buffer);

		// put the ImageData on the _canvas
		_ctx.putImageData(imageData, 0, 0);
	}
};


/**
 * getTextureToSurface - grab the currentSrcTexture from the GPU into a pbSurface
 * 
 */
pbWebGlTextures.prototype.getTextureToSurface = function(_surface)
{
	if (this.canReadTexture && this.fb)
	{
		var wide = this.currentSrcTexture.width;
		var high = this.currentSrcTexture.height;
		// console.log("pbWebGlTextures.getTextureToSurface", wide, "x", high);

		var imageData = _surface.imageData;
		if (!imageData || imageData.width != wide || imageData.height != high)
		{
			// create an ImageData to copy the pixels into
			imageData = new ImageData(wide, high);
		}

		// transfer the destination texture pixels from the GPU into the image data
		this.getTextureData(this.fb, this.currentSrcTexture, imageData.data.buffer);

		// associate the ImageData with the _surface
		_surface.imageData = imageData;
		// _wide, _high, _numWide, _numHigh, _imageData)
//		_surface.create(wide, high, 1, 1, imageData);
	}
};


/**
 * getTextureData - transfer a webGl texture from the GPU to a system RAM buffer (returns a Uint8Array)
 *
 */
// from http://learningwebgl.com/blog/?p=1786
pbWebGlTextures.prototype.getTextureData = function(_fb, _texture, _buffer)
{
	if (this.canReadTexture && _fb)
	{
		// make _fb the current frame buffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, _fb);

		// attach the texture to the framebuffer again (to update the contents)
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, _texture, 0);

		// dimensions of the texture, branch depending on the original image source
		var wide, high;
		if (_texture.canvas)
		{
			wide = _texture.canvas.width;
			high = _texture.canvas.height;
		}
		else if (_texture.imageData)
		{
			wide = _texture.imageData.width;
			high = _texture.imageData.height;
		}
		else
		{
			wide = _texture.width;
			high = _texture.height;
		}

		//console.log("pbWebGlTextures.getTextureData", wide, "x", high);

		var buf8;
		if (_buffer !== null && _buffer !== undefined)
		{
			// create an 8 bit view of the supplied _buffer
			// WARNING: if _buffer is a typed array, this will DUPLICATE it instead of creating a view (slow, and probably not what you wanted!)
			buf8 = new Uint8Array(_buffer);
		}
		else
		{
			// create an 8 bit array large enough to hold the data
			buf8 = new Uint8Array(wide * high * 4);

			// add width & height parameters (this buf8 will be used after it is returned)
			buf8.width = wide;
			buf8.height = high;
		}

		// read the texture pixels into the 8 bit array
		gl.readPixels(0, 0, wide, high, gl.RGBA, gl.UNSIGNED_BYTE, buf8);

		// unbind the framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		return buf8;
	}
	return null;
};


// TODO: look into http://www.goocreate.com/learn/procedural-textures/

pbWebGlTextures.prototype.createTextureFromCanvas = function(_canvas)
{
//	var ctx = _canvas.getContext('2d');
//	var p2width = nextHighestPowerOfTwo(_canvas.width);
//	var p2height = nextHighestPowerOfTwo(_canvas.height);

	var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // clamp to permit NPOT textures, no MIP mapping
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	// upload the canvas ImageData into the texture
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, _canvas);

	// activate the texture
    this.currentSrcTexture = texture;
    this.currentSrcTexture.canvas = _canvas;
    gl.activeTexture( gl.TEXTURE0 );

	// create a buffer to transfer all the vertex position data through
	this.positionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, this.positionBuffer );
};




/**
 *
 * static helper functions
 * 
 */

// create an empty webgl texture to draw to
pbWebGlTextures.initTexture = function(_textureRegister, _width, _height)
{
	var texture = gl.createTexture();
    texture.width = _width;
    texture.height = _height;
    gl.activeTexture(_textureRegister);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texture.width, texture.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	return texture;
};


// create a webgl 'render-to' depth buffer matching the _texture dimensions
pbWebGlTextures.initDepth = function(_texture)
{
    var depth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, _texture.width, _texture.height);
    return depth;
};


// attach _texture and _depth to a webgl framebuffer
pbWebGlTextures.initFramebuffer = function(_texture, _depth)
{
    // attach the render-to-texture to a new framebuffer
	var fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, _texture, 0);
    // attach the depth buffer to the framebuffer
    if (_depth)
    	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, _depth);

    return fb;
};


