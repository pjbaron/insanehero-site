/**
 *
 * A filter demo for the new Phaser 3 renderer.
 *
 *
 * 
 */

function Camera()
{
	this.x = this.y = this.z = 0;
	this.lx = this.ly = this.lz = 0;
}

Camera.prototype.create = function(_x, _y, _z, _lx, _ly, _lz)
{
	this.x = _x;
	this.y = _y;
	this.z = _z;
	this.lx = _lx;
	this.ly = _ly;
	this.lz = _lz;
};

Camera.prototype.getXAxis = function()
{
	// var dx = this.lx - this.x;
	// var dy = this.ly - this.y;
	// var dz = this.lz - this.z;
	// var ux = 0;
	// var uy = 1;
	// var uz = 0;
	// var cx = dy * uz - dz * uy;
	// var cy = dz * ux - dx * uz;
	// var cz = dx * uy - dy * ux;
	// var l = Math.sqrt(cx * cx + cy * cy + cz * cz);
	// return [ cx / l, cy / l, cz / l ];

	var dx = this.lx - this.x;
	var dz = this.lz - this.z;
	var cx = -dz;
	var cz = dx;
	var l = Math.sqrt(cx * cx + cz * cz);
	return [ cx / l, 0, cz / l ];
};

Camera.prototype.rotate = function(u, v, w, angle)
{
	// rotate lx,ly,lz around the line through x,y,z with direction u,v,w by angle (vector must be normalised)
	var u2 = u * u;
	var v2 = v * v;
	var w2 = w * w;

	var au = this.x * u;
	var bv = this.y * v;
	var cw = this.z * w;
	var ux = u * this.lx;
	var vy = v * this.ly;
	var wz = w * this.lz;

	var sin = Math.sin(angle);
	var cos = Math.cos(angle);

	this.lx = (this.x * (v2 + w2) - u * (bv + cw - ux - vy - wz)) * (1 - cos) + this.lx * cos + (-this.z*v + this.y*w - w*this.ly + v*this.lz) * sin;
	this.ly = (this.y * (u2 + w2) - v * (au + cw - ux - vy - wz)) * (1 - cos) + this.ly * cos + ( this.z*u - this.x*w + w*this.lx - u*this.lz) * sin;
	this.lz = (this.z * (u2 + v2) - w * (au + bv - ux - vy - wz)) * (1 - cos) + this.lz * cos + (-this.y*u + this.x*v - v*this.lx + u*this.ly) * sin;
};

Camera.prototype.moveForwards = function(dist)
{
	var dx = this.lx - this.x;
	var dy = this.ly - this.y;
	var dz = this.lz - this.z;
	var l = Math.sqrt(dx * dx + dy * dy + dz * dz);
	var mx = dist * dx / l;
	var my = dist * dy / l;
	var mz = dist * dz / l;
	this.x += mx;
	this.y += my;
	this.z += mz;
	this.lx += mx;
	this.ly += my;
	this.lz += mz;
};

Camera.prototype.moveSideways = function(dist)
{
	var dx = this.getXAxis();
	var l = Math.sqrt(dx[0] * dx[0] + dx[1] * dx[1] + dx[2] * dx[2]);
	var mx = dist * dx[0] / l;
	var my = dist * dx[1] / l;
	var mz = dist * dx[2] / l;
	this.x += mx;
	this.y += my;
	this.z += mz;
	this.lx += mx;
	this.ly += my;
	this.lz += mz;
};



// created while the data is loading (preloader)
function pbMineCraftDemo( docId )
{
	console.log( "pbMineCraftDemo c'tor entry" );

	this.firstTime = true;
	this.surface = null;
	this.srcImage = null;
	this.renderSurface = null;
	this.displayLayer = null;
	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;
	this.filterTexture = null;

	this.mousex = 0;
	this.mousey = 0;
	this.mouseDown = false;
	this.keyUp = false;
	this.keyDown = false;
	this.keyLeft = false;
	this.keyRight = false;

	this.camera = new Camera();
	this.camera.create(-246, 54, 700, 0, 15, 1);

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	this.shaderJSON = pbPhaserRender.loader.loadFile( "../json/minecraftShaderSources.json" );
	this.spriteImg = pbPhaserRender.loader.loadImage( "image", "../img/island.png" );

	console.log( "pbMineCraftDemo c'tor exit" );
}


pbMineCraftDemo.prototype.create = function()
{
	console.log("pbMineCraftDemo.create");

	// add the shader
	var jsonString = pbPhaserRender.loader.getFile( this.shaderJSON ).responseText;
	this.shaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	this.surface = new pbSurface();
	// _imageData, _rttTexture, _rttTextureRegister
	this.surface.createSingle(imageData);

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

	// register mouse listeners
	this.element = document.body;

	var _this = this;
	document.body.onmousemove = function(e) {
		_this.mousex = e.clientX;
		_this.mousey = e.clientY;
	};
	document.body.onmousedown = function(e) {
		_this.mouseDown = true;
	};
	document.body.onmouseup = function(e) {
		_this.mouseDown = false;
	};
	document.body.onkeydown = function(e) {
		var evt = window.event ? window.event : e;
		switch(evt.keyCode)
		{
			case 37: // left
			case 65: // A
				_this.keyLeft = true;
				break;
			case 39: // right
			case 68: // D
				_this.keyRight = true;
				break;
			case 38: // up
			case 87: // W
				_this.keyUp = true;
				break;
			case 40: // down
			case 83: // S
				_this.keyDown = true;
				break;
		}
	};
	document.body.onkeyup = function(e) {
		var evt = window.event ? window.event : e;
		switch(evt.keyCode)
		{
			case 37: // left
			case 65: // A
				_this.keyLeft = false;
				break;
			case 39: // right
			case 68: // D
				_this.keyRight = false;
				break;
			case 38: // up
			case 87: // W
				_this.keyUp = false;
				break;
			case 40: // down
			case 83: // S
				_this.keyDown = false;
				break;
		}
	};
};


pbMineCraftDemo.prototype.destroy = function()
{
	console.log("pbMineCraftDemo.destroy");

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


pbMineCraftDemo.prototype.restart = function()
{
	console.log("pbMineCraftDemo.restart");
	
	this.destroy();
	this.create();
};


pbMineCraftDemo.prototype.update = function()
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

	// turn the camera
	if (this.mouseDown)
	{
		// around the UP vector
		var dx = this.mousex - pbPhaserRender.width * 0.5;
		this.camera.rotate(0, 1, 0, dx * 0.007 * Math.PI / 180.0);

		// around the X axis
		var dy = this.mousey - pbPhaserRender.height * 0.5;
		var xa = this.camera.getXAxis();
		this.camera.rotate(xa[0], xa[1], xa[2], -dy * 0.003 * Math.PI / 180.0);
	}
	if (this.keyUp)
	{
		this.camera.moveForwards(1.0);
	}
	if (this.keyDown)
	{
		this.camera.moveForwards(-1.0);
	}
	if (this.keyLeft)
	{
		this.camera.moveSideways(1.0);
	}
	if (this.keyRight)
	{
		this.camera.moveSideways(-1.0);
	}
};


// callback required to set the correct shader program and it's associated attributes and/or uniforms
pbMineCraftDemo.prototype.setTint = function(_shaders)
{
   	// set the shader program
	_shaders.setProgram(this.shaderProgram, this.rttTextureNumber);
	// set the tint values in the shader program
	gl.uniform1f( _shaders.getUniform( "uGlobalTime"), pbPhaserRender.frameCount );
	gl.uniform3f( _shaders.getUniform( "uCameraLookAt"), this.camera.lx, this.camera.ly, this.camera.lz );
	gl.uniform3f( _shaders.getUniform( "uCameraPos"), this.camera.x, this.camera.y, this.camera.z );
};

