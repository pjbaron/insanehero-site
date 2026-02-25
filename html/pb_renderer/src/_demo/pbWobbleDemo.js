/**
 *
 * Corner point displacement demo for the new Phaser 3 renderer.
 * Displays a full-screen image wobbling.
 * NOTE: 'webgl' mode only - canvas does not support corner displacement like this
 *
 * Chop a full-screen texture into tiles, lay them out in a grid to reconstruct the original image.
 * Randomly pick a corner and apply velocity to the grid position variable.
 * Accelerate the grid positions back towards their 'home' positions, with a damping factor.
 * Calculate the multiplier value required for the corner's pixel offset from its home position, and apply it via pbImage.setCorners.
 *
 * The acceleration/damping makes the actual position of the corner 'orbit' the home position with a gradual decay.
 * 
 */



// created while the data is loading (preloader)
function pbWobbleDemo( docId )
{
	console.log( "pbWobbleDemo c'tor entry" );

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	this.spriteImg = pbPhaserRender.loader.loadImage( "image", "../img/screen1.jpg" );

	console.log( "pbWobbleDemo c'tor exit" );
}


pbWobbleDemo.prototype.allLoaded = function()
{
	console.log( "pbWobbleDemo.allLoaded" );

	this.phaserRender = new pbRenderer( 'webgl', this.docId, this.create, this.update, this );
};


pbWobbleDemo.prototype.create = function()
{
	console.log("pbWobbleDemo.create");

	this.addSprites();
};


pbWobbleDemo.prototype.destroy = function()
{
	console.log("pbWobbleDemo.destroy");

	this.surface.destroy();
	this.surface = null;

	this.phaserRender.destroy();
	this.phaserRender = null;

	this.sprList = null;
};


pbWobbleDemo.prototype.restart = function()
{
	console.log("pbWobbleDemo.restart");
	
	this.destroy();
	this.create();
};


pbWobbleDemo.prototype.addSprites = function()
{
	console.log("pbWobbleDemo.addSprites");

	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	this.surface = new pbSurface();
	this.surface.create(80, 100, 10, 6, imageData);

	var c = 0, x, y;

	// create all sprites from source texture squares and init the grid array
	this.sprList = [];
	this.grid = [];

	for(y = 0; y < this.surface.cellsHigh; y++)
	{
		this.grid[y] = [];
		for(x = 0; x < this.surface.cellsWide; x++)
		{
			var img = new imageClass();
			img.create(this.surface, c, 0.5, 0.5);

			var cx = x * this.surface.cellWide + this.surface.cellWide * 0.5;
			var cy = y * this.surface.cellHigh + this.surface.cellHigh * 0.5;
			this.grid[y][x] = { gx:cx, gy:cy, x:cx, y:cy, vx:0.0, vy:0.0, dx: 0, dy: 0 };

			this.sprList[c] = new pbTransformObject();
			this.sprList[c].create(img, cx, cy, 1.0, 0, 1.0, 1.0);

			rootLayer.addChild(this.sprList[c]);
			c += 1;
		}
	}

};


pbWobbleDemo.prototype.update = function()
{
	var c = 0, x, y, lastx = 1, lasty = 1;
	var w2 = 1.0 / (this.surface.cellWide * 0.5);
	var h2 = 1.0 / (this.surface.cellHigh * 0.5);

	for(y = 0; y < this.surface.cellsHigh; y++)
	{
		lastx = 1;
		for(x = 0; x < this.surface.cellsWide; x++)
		{
			var img = this.sprList[c].image;
			c += 1;

			// offset of this grid corner from its home position
			this.grid[y][x].dx = (this.grid[y][x].gx - this.grid[y][x].x);
			this.grid[y][x].dy = (this.grid[y][x].gy - this.grid[y][x].y);

			// accelerate grid corner velocity towards its home position
			this.grid[y][x].vx += this.grid[y][x].dx * 0.01;
			this.grid[y][x].vy += this.grid[y][x].dy * 0.01;

			// move the grid corner according to its velocity
			this.grid[y][x].x += this.grid[y][x].vx;
			this.grid[y][x].y += this.grid[y][x].vy;

			// apply damping to velocity
			this.grid[y][x].vx *= 0.99;
			this.grid[y][x].vy *= 0.99;

			// get references to each corner of this square in the grid
			var lt = (y > 0 && x > 0) ? this.grid[y - 1][x - 1] : { dx : 0, dy : 0};
			var rt = (y > 0) ? this.grid[y - 1][x] : { dx : 0, dy : 0};
			var lb = (x > 0) ? this.grid[y][x - 1] : { dx : 0, dy : 0};
			var rb = this.grid[y][x];

			// calculate the multiplier value (used to offset the corners) from the offset distances and the square dimensions
			lt.ox = (this.surface.cellWide * 0.5 - lt.dx) / (this.surface.cellWide * 0.5);
			lt.oy = (this.surface.cellHigh * 0.5 - lt.dy) / (this.surface.cellHigh * 0.5);
			rt.ox = (this.surface.cellWide * 0.5 + rt.dx) / (this.surface.cellWide * 0.5);
			rt.oy = (this.surface.cellHigh * 0.5 - rt.dy) / (this.surface.cellHigh * 0.5);
			lb.ox = (this.surface.cellWide * 0.5 - lb.dx) / (this.surface.cellWide * 0.5);
			lb.oy = (this.surface.cellHigh * 0.5 + lb.dy) / (this.surface.cellHigh * 0.5);
			rb.ox = (this.surface.cellWide * 0.5 + rb.dx) / (this.surface.cellWide * 0.5);
			rb.oy = (this.surface.cellHigh * 0.5 + rb.dy) / (this.surface.cellHigh * 0.5);

			// set all four corner multipler offsets
			img.setCorners(lt.ox, lt.oy, rt.ox, rt.oy, lb.ox, lb.oy, rb.ox, rb.oy);
		}
	}

	// pick a corner
	x = Math.floor(Math.random() * this.surface.cellsWide);
	y = Math.floor(Math.random() * this.surface.cellsHigh);
	// adjust its velocity to make the image wobble
	this.grid[y][x].vx += (Math.random() - 0.5) * 2;
	this.grid[y][x].vy += (Math.random() - 0.5) * 2;
};

