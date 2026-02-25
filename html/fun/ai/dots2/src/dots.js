/**
 *
 * the 'dots' demo
 *
 * code: Pete Baron 2015
 * 
 */



function Dots( docId )
{
	console.log("Dots c'tor: ", docId);

	// initialise
	this.list = null;
	this.percentFull = 50;
	this.worldSize = 256;
	this.numDots = 0;

	// dat.GUI controlled variables and callbacks
	var _this = this;
	this.numCtrl = gui.add(this, "percentFull").min(1).max(100).step(1).listen();
	this.numCtrl.onFinishChange(function(value) { if (!value) _this.percentFull = 1; _this.restart(); });
	this.sizeCtrl = gui.add(this, "worldSize").min(10).max(MAX_HEIGHT).step(10).listen();
	this.sizeCtrl.onFinishChange(function(value) { if (!value) _this.worldSize = 10; _this.setWorldSize(); _this.restart(); });
	gui.add(this, "numDots").listen();

	// create with default values
	this.create();
}


Dots.prototype.restart = function()
{
	this.destroy();
	this.create();
};


Dots.prototype.create = function()
{
	// create the world space
	this.setWorldSize();
	new World();
	World.create(this.worldSize, this.worldSize);

	console.log("Dots.create", this.numDots);

	// create the dots list
	this.list = [];

	// initialise all dots
	for(var i = 0; i < this.numDots; i++)
	{
		// create a dot
		this.list[i] = new Dot();

		// keep trying until we find an empty location in the world
		var x, y, vx, vy;
		var tries = 100;
		do{
			x = Math.random() * World.sizeX;
			y = Math.random() * World.sizeY;
			vx = Math.random() - 0.5;
			vy = Math.random() - 0.5;
			flag = this.list[i].create(x, y, vx, vy);

			// time to give up on random if this world is nearly full
			if (--tries < 0 && !flag)
			{
				var firstx = x;
				var firsty = y;
search: 		{
					// search starting at the last random x,y location
					for(; x < World.sizeX; x++)
					{
						for(; y < World.sizeY; y++)
							if ((flag = this.list[i].create(x, y, vx, vy)) === true)
								break search;
						y = 0;
					}

					for(x = 0; x < World.sizeX; x++)
					{
						// back to starting point... we didn't find a slot
						if (x > firstx || (x == firstx && y >= firsty))
							break search;
						for(y = 0; y < World.sizeY; y++)
							if ((flag = this.list[i].create(x, y, vx, vy)) === true)
								break search;
					}
				}
				tries = 100;
			}
		}while(!flag);
	}

	console.log("Dots.create finished", this.list.length);
};


Dots.prototype.destroy = function()
{
	console.log("Dots.destroy");

	World.destroy();
	this.list = null;
};


Dots.prototype.update = function()
{
	for(var i = 0, l = this.list.length; i < l; i++)
	{
		if (this.list[i])
			this.list[i].update();
	}

	World.draw();
};


Dots.prototype.setWorldSize = function()
{
	this.worldX = this.worldSize;
	this.worldY = this.worldSize;
	this.numDots = Math.floor(this.percentFull * this.worldX * this.worldY / 100);

	console.log("World size =", this.worldSize, "Number of dots =", this.numDots);
};



