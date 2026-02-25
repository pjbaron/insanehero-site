/**
 *
 * Tilt demo file, loads a texture and sets up the renderer to show a 3D rotated sprite
 *
 */



// created while the data is loading (preloader)
function pbTiltDemo( docId )
{
	console.log( "pbTiltDemo c'tor entry" );

	var _this = this;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	this.spriteImg = pbPhaserRender.loader.loadImage( "car", "../img/car.png" );

	console.log( "pbTiltDemo c'tor exit" );
}


pbTiltDemo.prototype.allLoaded = function()
{
	console.log( "pbTiltDemo.allLoaded" );

};


pbTiltDemo.prototype.create = function()
{
	console.log("pbTiltDemo.create");

	this.addSprites();
};


pbTiltDemo.prototype.destroy = function()
{
	console.log("pbTiltDemo.destroy");

	if (this.surface)
		this.surface.destroy();
	this.surface = null;

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;
};


pbTiltDemo.prototype.restart = function()
{
	console.log("pbTiltDemo.restart");
	
	this.destroy();
	this.create();
};


pbTiltDemo.prototype.addSprites = function()
{
	console.log("pbTiltDemo.addSprites");

	// create surface from raw image data
	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	this.surface = new pbSurface();
	this.surface.create(0, 0, 1, 1, imageData);

	// create an image holder for the surface
	var img = new imageClass();
	img.create(this.surface, 0, 0.5, 0.5);
	img.is3D = true;

	// create a 3D layer and add it to the root
	var layer3D = new pbWebGlLayer();
	// _parent, _renderer, _x, _y, _z, _angleInRadians, _scaleX, _scaleY)
	layer3D.create(rootLayer, this.phaserRender, 0,0,0, 0, 1,1);
	rootLayer.addChild(layer3D);

	// create a sprite and add it to the layer
	this.spr = new pbTransformObject();
	//_image, _x, _y, _z, _rx, _ry, _rz, _scaleX, _scaleY, _scaleZ
	this.spr.create3D(img, pbPhaserRender.width * 0.5, pbPhaserRender.height * 0.5, 1.0, 0, 0, 0, 1.0, 1.0, 1.0);
	layer3D.addChild(this.spr);
};


pbTiltDemo.prototype.update = function()
{
	this.spr.rx += 0.01;
};

