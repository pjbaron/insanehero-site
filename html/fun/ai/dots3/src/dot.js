/**
 * 
 * a 'dot' object
 * 
 * code: Pete Baron 2015
 * 
 */


var colourTemperatures =
[
	0xff600100,
	0xffae0100,
	0xfff40000,
	0xffff1313,
	0xffff393a,
	0xffff5d5e,
	0xfffe7273,
	0xfffe8e8e,
	0xfffeabaa,
	0xffffbcbb,
	0xffffd7d8,
	0xfffef4f4,
	0xffecfeff,
	0xff9bf7fc,
	0xff40eff9,
	0xff12e9f8,
	0xff0cdcfa,
	0xff04cbfc,
	0xff02baff,
	0xff017dff,
	0xff00002f,
	0xff000070,
	0xff0100c1,
	0xff0008ff,
	0xff0033ff
];


function Dot()
{
	this.x = this.ix = -1;
	this.y = this.iy = -1;
	this.vx = 0;
	this.vy = 0;
	this.temperature = 0;
	this.colour = 0xffffffff;
}


Dot.prototype.create = function(_x, _y, _vx, _vy)
{
	this.x = _x;
	this.y = _y;
	this.integerPosition();

	if (this.getWorld())
		return false;

	this.vx = _vx;
	this.vy = _vy;

	this.temperature = 0;
	this.colour = this.getColour(this.temperature, 100);

	this.setWorld( this );

	return true;
};


Dot.prototype.destroy = function()
{
	if (this.ix > -1 && this.iy > -1)
	{
		if (this.getWorld() === this)
			this.setWorld( null );
	}
	this.x = this.ix = -1;
	this.y = this.iy = -1;
};


Dot.prototype.update = function()
{
	// erase this dot and leave a trail behind
	this.setWorld( 0xff000000 + trailColour );

	// move it
	this.saveState();
	this.move(this.vx, this.vy);

	// if new location is occupied
	var hit = this.getWorld();
	if (hit instanceof Dot)
	{
		// back up to prior position
		this.restoreState();
		// react to collision
		this.collisionResponse(hit);
		// modify temperature on collision
		//hit.temperature = this.temperature = (this.temperature + hit.temperature) * 0.5 + 1.0;
	}
	//else
	//{
		// cool down when not colliding
		//this.temperature -= 1.0;
	//}

	// limit min and max temperatures
	//this.temperature = Math.max(Math.min(this.temperature, 100), 0);
	// set colour based on temperature
	this.colour = 0xffffffff;	//this.getColour(100);

	// add this dot back into the world
	this.setWorld(this);
};


Dot.prototype.collisionResponse = function(_hit)
{
	this.turn(-90.0);
	_hit.turn(45.0);
};


/**
 * Helper functions
 */

Dot.prototype.saveState = function()
{
	this.memX = this.x;
	this.memY = this.y;
};


Dot.prototype.restoreState = function()
{
	this.x = this.memX;
	this.y = this.memY;
	this.integerPosition();
};


Dot.prototype.move = function(_x, _y)
{
	this.x += _x;
	this.y += _y;

	// wrap around at world boundaries
	if (this.x < 0) this.x += World.sizeX;
	if (this.x >= World.sizeX) this.x -= World.sizeX;
	if (this.y < 0) this.y += World.sizeY;
	if (this.y >= World.sizeY) this.y -= World.sizeY;

	this.integerPosition();
};


Dot.prototype.turn = function(_degrees)
{
	var r = _degrees * Math.PI / 180.0;
	var c = Math.cos(r);
	var s = Math.sin(r);
	var vx = this.vx * c - this.vy * s;
	var vy = this.vx * s + this.vy * c;
	this.vx = vx;
	this.vy = vy;
};


Dot.prototype.integerPosition = function()
{
	this.ix = Math.floor(this.x);
	this.iy = Math.floor(this.y);
};


Dot.prototype.setWorld = function(_value)
{
	World.space[this.ix][this.iy] = _value;
};


Dot.prototype.getWorld = function()
{
	return World.space[this.ix][this.iy];
};


Dot.prototype.getColour = function(_range)
{
	var i = Math.floor(this.temperature / _range * (colourTemperatures.length - 1));
	return colourTemperatures[i];
};
