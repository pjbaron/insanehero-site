/**
 *
 * pbMultiInstanceDemo.js - example to illustrate the use of multiple cameras simultaneously
 *
 * 
 */


function pbMultiInstanceDemo( docId )
{
	console.log( "pbMultiInstanceDemo c'tor entry" );

	this.layer = null;
	this.cameras = null;
	this.fps60 = 0;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	pbPhaserRender.loader.loadImage( "player", "../img/invader/player.png" );
	pbPhaserRender.loader.loadImage( "invader", "../img/invader/invader32x32x4.png", 32, 32, 4, 1);
	pbPhaserRender.loader.loadImage( "stars", "../img/invader/starfield.png" );
	pbPhaserRender.loader.loadImage( "bullet", "../img/invader/bullet.png" );
	pbPhaserRender.loader.loadImage( "bomb", "../img/invader/enemy-bullet.png" );
	pbPhaserRender.loader.loadImage( "rocket", "../img/invader/rockets32x32x8.png", 32, 32, 8, 1 );
	pbPhaserRender.loader.loadImage( "smoke", "../img/invader/smoke64x64x8.png", 64, 64, 8, 1 );
	pbPhaserRender.loader.loadImage( "explosion", "../img/invader/explode.png", 128, 128, 16, 1 );
	pbPhaserRender.loader.loadImage( "font", "../img/fonts/arcadeFonts/16x16/Bubble Memories (Taito).png", 16, 16, 95, 7 );

	console.log( "pbMultiInstanceDemo c'tor exit" );
}


pbMultiInstanceDemo.prototype.create = function()
{
	this.numWide = 1;
	this.numHigh = 1;
	this.addCameras();
};


pbMultiInstanceDemo.prototype.addCameras = function()
{
	var cx = 0;
	var cy = 0;
	var tx = pbPhaserRender.width / this.numWide;
	var ty = pbPhaserRender.height / this.numHigh;

	this.cameras = [];
	for(var y = 0; y < this.numHigh; y++)
	{
		if (!this.cameras[y])
			this.cameras[y] = [];

		for(var x = 0; x < this.numWide; x++)
		{
			// add a new camera
			var layer = new layerClass();
			layer.create(rootLayer, this.phaserRender, cx, cy, 0, 0, 1 / this.numWide, 1 / this.numHigh);
			layer.setClipping(cx, cy, tx, ty);
			this.cameras[y][x] = new pbInvaderDemoCore();
			this.cameras[y][x].create(this, layer);
			rootLayer.addChild(layer);

			cx += tx;
		}
		cx = 0;
		cy += ty;
	}
};


pbMultiInstanceDemo.prototype.removeCameras = function()
{
	for(var y = 0; y < this.numHigh; y++)
	{
		for(var x = 0; x < this.numWide; x++)
		{
			this.cameras[y][x].layer.destroy();
			this.cameras[y][x].destroy();
		}
		this.cameras[y] = null;
	}
	this.cameras = null;
};


pbMultiInstanceDemo.prototype.destroy = function()
{
	this.removeCameras();

	this.phaserRender.destroy();
	this.phaserRender = null;
};


pbMultiInstanceDemo.prototype.update = function()
{
	var y = this.numHigh;
	while(y--)
	{
		var x = this.numWide;
		while(x--)
			this.cameras[y][x].update();
	}

	if (fps >= 60)
		this.fps60++;
	else
		this.fps60 = 0;

	if (this.fps60 > 60 * 5)
	{
		this.fps60 = 0;
		this.removeCameras();

		if (this.numWide <= this.numHigh)
			this.numWide++;
		else
			this.numHigh++;

		this.addCameras();
	}
};








