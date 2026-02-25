/**
 * 
 * a 'dot' object
 * 
 * code: Pete Baron 2015
 * 
 */


function Dot()
{
	this.x = this.ix = -1;
	this.y = this.iy = -1;
	this.vx = 0;
	this.vy = 0;
	this.colour = "#000000";
}


Dot.prototype.create = function(_x, _y, _vx, _vy)
{
	this.x = _x;
	this.y = _y;
	this.integerPosition();
	this.vx = _vx;
	this.vy = _vy;

	this.colour =
	[
		"#ff0000","#7f0000","#3f0000",	// reds
		"#00ff00","#007f00","#003f00",	// greens
		"#0000ff","#00007f","#00003f",	// blues
		"#ffff00","#ff7f00","#7f7f00",	// yellow/oranges
		"#00ffff","#007f7f","#003f3f",	// cyans
		"#ff00ff","#7f007f","#3f003f",	// purples
		"#ffffff","#7f7f7f","#3f3f3f"	// white/greys
	][Math.floor(Math.random() * 3 * 7) ];

	this.setWorld( this );
};


Dot.prototype.destroy = function()
{
	if (this.ix > -1 && this.iy > -1)
	{
		if (this.getWorld() == this)
			this.setWorld( null );
	}
	this.x = this.ix = -1;
	this.y = this.iy = -1;
};


Dot.prototype.update = function()
{
	this.setWorld(null);

	this.saveState();
	this.move(this.vx, this.vy);

	// new location is occupied?
	var hit = this.getWorld();
	if (hit !== null)
	{
		// back up
		this.restoreState();
		// react
		this.collisionResponse(hit);
	}

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
	this.memVx = this.vx;
	this.memVy = this.vy;
};


Dot.prototype.restoreState = function()
{
	this.x = this.memX;
	this.y = this.memY;
	this.vx = this.memVx;
	this.vy = this.memVy;
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
	var v = World.space[this.ix][this.iy];
	// convert undefined values into null
	if (v === undefined) return null;
	return v;
};
