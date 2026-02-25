/**
 *
 * Demo testing performance of the webgl to canvas grabbing API functions.
 *
 */



// created while the data is loading (preloader)
function pbGlToCanvasDemo( docId )
{
	console.log( "pbGlToCanvasDemo c'tor entry" );

	var _this = this;
	this.count = 0;
	this.value = undefined;
	this.transform = undefined;
	this.list = null;

	this.canvasSrc = null;

	// force to 'webgl' renderer, this demo makes no sense in canvas mode
	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );

	console.log( "pbGlToCanvasDemo c'tor exit" );
}


pbGlToCanvasDemo.prototype.create = function()
{
	console.log("pbGlToCanvasDemo.create");

	// create a new div to put the canvases in so we can see their contents outside of the webGl window
	this.div = document.createElement('div');
	this.div.id = 'canvasDiv';
	document.body.appendChild(this.div);

	this.makeCanvas(300, 100);

	// initialise the demo variables
	this.transform = pbMatrix3.makeTransform(200, 200, 0, 1, 1);
};


pbGlToCanvasDemo.prototype.makeCanvas = function(_wide, _high)
{
	// kill the old ones (if there are any yet)
	if (this.canvasSrc)
		this.canvasSrc.parentNode.removeChild( this.canvasSrc );
	if (this.canvasDst)
		this.canvasDst.parentNode.removeChild( this.canvasDst );

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

	this.list = [];
	for(var i = 0; i < 10; i++)
	{
		var obj = {};
		// make the destination canvas that the webGl texture will be copied back to
		obj.canvasDst = document.createElement('canvas');
		obj.canvasDst.width = _wide;
		obj.canvasDst.height = _high;
		obj.canvasDst.id = "canvasDst";
		obj.ctxDst = obj.canvasDst.getContext("2d");
		obj.ctxDst.fillStyle = "#ffffff";
		obj.ctxDst.fillRect(0, 0, _wide, _high);
		this.div.appendChild(obj.canvasDst);
		this.list.push(obj);
	}
};


pbGlToCanvasDemo.prototype.destroy = function()
{
	console.log("pbGlToCanvasDemo.destroy");

	// destroy div, canvases, and clean up afterwards
	this.canvasSrc.parentNode.removeChild( this.canvasSrc );
	this.ctxSrc = null;
	var c = this.list.length;
	while(c--)
	{
		var obj = this.list[c];
		obj.canvasDst.parentNode.removeChild( obj.canvasDst );
	}
	this.list = null;
	if (this.div)
		this.div.parentNode.removeChild( this.div );

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;
};


pbGlToCanvasDemo.prototype.restart = function()
{
	console.log("pbGlToCanvasDemo.restart");
	
	this.destroy();
	this.create();
};


pbGlToCanvasDemo.prototype.update = function()
{
	// update the counter and use it to occasionally change the displayed value
	this.count++;
	var last = this.value;
	this.value = Math.floor(this.count / 60);

	// change the source canvas contents every frame
	this.ctxSrc.fillStyle = "rgb(" + (this.count & 0xff) + "," + ((this.count >> 4) & 0xff) + ", 0)";
	this.ctxSrc.fillRect(0, 0, 300, 100);
	this.ctxSrc.fillStyle = "#ffffff";
	this.ctxSrc.fillText(this.value, 150, 90, 300);

	// draw the source canvas texture into a transformed webGl texture
	// it will be marked as 'dirty' only when the displayed value changes
	pbPhaserRender.renderer.graphics.drawCanvasWithTransform(this.canvasSrc, (last !== this.value), this.transform, 1.0);

	// prepare the texture to be grabbed by attaching it to a frame buffer (once only)
	if (!pbPhaserRender.renderer.graphics.textures.canReadTexture)
		pbPhaserRender.renderer.graphics.textures.prepareTextureForAccess(pbPhaserRender.renderer.graphics.textures.currentSrcTexture);

	var c = this.list.length;
	while(c--)
		// grab the webGl.currentSrcTexture and draw it into the destination canvas as ImageData
		pbPhaserRender.renderer.graphics.textures.getCanvasFromTexture(this.list[c].ctxDst);
};

