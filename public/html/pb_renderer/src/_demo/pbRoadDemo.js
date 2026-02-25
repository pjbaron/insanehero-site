/**
 *
 * Road demo using mode z...
 *
 */



// created while the data is loading (preloader)
function pbRoadDemo( docId )
{
	console.log( "pbRoadDemo c'tor entry" );

	var _this = this;

	this.surface = null;
	this.layer = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	this.spriteImg = pbPhaserRender.loader.loadImage( "road", "../img/roadSand.png" );

	console.log( "pbRoadDemo c'tor exit" );
}


pbRoadDemo.prototype.create = function()
{
	console.log("pbRoadDemo.create");

	this.addSprites();
};


pbRoadDemo.prototype.destroy = function()
{
	console.log("pbRoadDemo.destroy");

	if (this.surface)
		this.surface.destroy();
	this.surface = null;

	if (this.layer)
		this.layer.destroy();
	this.layer = null;

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;
};


pbRoadDemo.prototype.restart = function()
{
	console.log("pbRoadDemo.restart");
	
	this.destroy();
	this.create();
};


pbRoadDemo.prototype.addSprites = function()
{
	console.log("pbRoadDemo.addSprites");

	// create animation data and set destination for movement
	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	this.surface = new pbSurface();
	this.surface.create(0, 0, 1, 1, imageData);

	// create a layer to draw using mode z
	this.layer = new pbWebGlLayer();
	// _parent, _renderer, _x, _y, _z, _angleInRadians, _scaleX, _scaleY
	this.layer.create(rootLayer, this.phaserRender, 0, 0, 1, 0, 1, 1);
	// set the pbSimpleLayer to call the mode z sprite drawing function, and a data preparation function for XY and UV coordinates
	rootLayer.addChild(this.layer);

	// create an image to contain the surface
	var img = new imageClass();
	// _surface, _cellFrame, _anchorX, _anchorY, _tiling, _fullScreen)
	img.create(this.surface, 0, 0.5, 0.5);
	img.isModeZ = true;

	// create a sprite to draw using mode z
	this.spr = new pbTransformObject();
	// _image, _x, _y, _z, _angleInRadians, _scaleX, _scaleY
	this.spr.create(img, pbPhaserRender.width * 0.5, 100.0, 1.0, 0, pbPhaserRender.width / this.surface.cellWide, 4.0);
	this.layer.addChild(this.spr);
};


pbRoadDemo.prototype.update = function()
{
};

