/**
 *
 * Demo testing performance of the canvas to webgl transfer API functions.
 *
 */



// created while the data is loading (preloader)
function pbCanvasToGlDemo( docId )
{
	console.log( "pbCanvasToGlDemo c'tor entry" );

	var _this = this;
	this.count = 0;
	this.value = undefined;
	this.list = null;

	this.canvasSrc = null;

	// force to 'webgl' renderer, this demo makes no sense in canvas mode
	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );

	console.log( "pbCanvasToGlDemo c'tor exit" );
}


pbCanvasToGlDemo.prototype.create = function()
{
	console.log("pbCanvasToGlDemo.create");

	// create a new div to put the canvases in so we can see their contents outside of the webGl window
	this.div = document.createElement('div');
	this.div.id = 'canvasDiv';
	document.body.appendChild(this.div);

	this.makeCanvas(300, 100);

	// initialise the demo variables
	this.list = [];
	for(var i = 0; i < 10; i++)
	{
		var obj =
		{
			x : Math.random() * pbPhaserRender.width,
			y : Math.random() * pbPhaserRender.height,
			vx : (Math.random() > 0.5 ? 1 : -1),
			vy : (Math.random() > 0.5 ? 1 : -1),
			angleInRadians : Math.random() * Math.PI * 2.0,
			scale : Math.random() + 0.1,
			scaleDir : (Math.random() > 0.5 ? 0.01 : -0.01)
		};

		obj.transform = pbMatrix3.makeTransform(obj.x, obj.y, obj.angleInRadians, obj.scale, obj.scale);
		this.list.push(obj);
	}

};


pbCanvasToGlDemo.prototype.makeCanvas = function(_wide, _high)
{
	// kill the old ones (if there are any yet)
	if (this.canvasSrc)
		this.canvasSrc.parentNode.removeChild( this.canvasSrc );

	// make the source canvas with an initial text element
	// this canvas will be copied to a webGl texture
	this.canvasSrc = document.createElement('canvas');
	this.canvasSrc.width = _wide;
	this.canvasSrc.height = _high;
	this.canvasSrc.id = "canvasSrc";
	this.ctxSrc = this.canvasSrc.getContext("2d");
	this.ctxSrc.font = "bold 100px Arial";
	this.ctxSrc.fillStyle = "#ffffff";
	this.ctxSrc.fillText("-", _wide / 2, _high * 0.9, _wide);
	this.ctxSrc.textAlign = "center";

	// append the canvas to the new div
	this.div.appendChild(this.canvasSrc);
};


pbCanvasToGlDemo.prototype.destroy = function()
{
	console.log("pbCanvasToGlDemo.destroy");

	// destroy div, canvases, and clean up afterwards
	this.canvasSrc.parentNode.removeChild( this.canvasSrc );
	this.ctxSrc = null;
	if (this.div)
		this.div.parentNode.removeChild( this.div );
	
	this.list = null;

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;
};


pbCanvasToGlDemo.prototype.restart = function()
{
	console.log("pbCanvasToGlDemo.restart");
	
	this.destroy();
	this.create();
};


pbCanvasToGlDemo.prototype.update = function()
{
	// update the counter and use it to occasionally change the displayed value
	this.count++;
	this.value = Math.floor(this.count / 60);

	// change the source canvas contents every frame
	this.ctxSrc.fillStyle = "rgb(" + (this.count & 0xff) + "," + ((this.count >> 4) & 0xff) + ", 0)";
	this.ctxSrc.fillRect(0, 0, 300, 100, 0);
	this.ctxSrc.fillStyle = "#ffffff";
	this.ctxSrc.fillText(this.value, 150, 90, 300);

	// transfer data to GPU time test loop
	var c = this.list.length;
	while(c--)
	{
		var obj = this.list[c];

		// move the webGl texture around
		obj.angleInRadians += 0.01;
		obj.x += obj.vx;
		if (obj.x <= 0 || obj.x >= pbPhaserRender.width) obj.vx = -obj.vx;
		obj.y += obj.vy;
		if (obj.y <= 0 || obj.y >= pbPhaserRender.height) obj.vy= -obj.vy;
		obj.scale += obj.scaleDir;
		if (obj.scale < 0.1 || obj.scale >= 2.0) obj.scaleDir = -obj.scaleDir;

		// recalculate the transform matrix
		pbMatrix3.setTransform(obj.transform, obj.x, obj.y, obj.angleInRadians, obj.scale, obj.scale);

		// draw the canvas texture into this transformed webGl texture every frame
		this.textureNumber = 0;
		pbPhaserRender.renderer.graphics.drawCanvasWithTransform(this.canvasSrc, true, obj.transform, 1.0);
	}
};

