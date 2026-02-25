/**
 *
 * Ellipse.js
 *
 * code: Pete Baron 2015
 * 
 */


Ellipse.shape = null;


function Ellipse()
{
	this.parent = null;
	this.x = 0;
	this.y = 0;
	this.angle = 0;
	this.ax = 0;
	this.by = 0;
	this.vx = 0;
	this.vy = 0;
	this.trail = null;
}


/**
 * [create description]
 *
 * @return {bool} true if not colliding, false if colliding
 */
Ellipse.prototype.create = function(parent, x, y, angle, ax, by, speed)
{
	this.parent = parent;
	this.x = x;
	this.y = y;
	this.angle = angle;
	this.ax = ax;
	this.by = by;
	this.speed = speed;
	this.turnAmount = 0;
	this.turnCount = 0;
	this.vx = Math.cos(angle) * speed;
	this.vy = Math.sin(angle) * speed;
	this.trail = [];
	this.trail.unshift( {x: this.x, y: this.y} );

	// if we haven't already drawn one, draw an ellipse into the Ellipse.shape canvas
	if (!Ellipse.shape)
		Ellipse.shape = this.drawEllipse();

	return (this.parent.collide(this) === null);
};


Ellipse.prototype.update = function(turnNose, turnSide, turnRear)
{
	// if a color change (or something else) reset the ellipse sprite, draw it again
	if (!Ellipse.shape)
		Ellipse.shape = this.drawEllipse();

	this.move(this.vx, this.vy);

	// if we're colliding
	c = this.parent.collide(this, false);
	if (c)
	{
		// deal with it
		this.collisionResponse(c, turnNose, turnSide, turnRear, false);
	}

	if ((frameCount % 7) === 0 && this.parent.showTrail > 0)
	{
		// stop the trail list getting too long
		while(this.trail.length >= MAX_TRAIL)
			this.trail.pop();
		// keep track of where we've been
		this.trail.unshift( {x: this.x, y: this.y} );
	}

	// turn if we're still turning
	if (this.turnCount > 0)
	{
		this.angle += this.turnAmount;
		this.turnCount--;
		this.vx = Math.cos(this.angle) * this.speed;
		this.vy = Math.sin(this.angle) * this.speed;
	}
};


Ellipse.prototype.move = function(vx, vy, moveTrail)
{
	this.x += vx;
	this.y += vy;

	if (this.x < 0)
	{
		this.x += this.parent.areaWide;
	}
	if (this.x >= this.parent.areaWide)
	{
		this.x -= this.parent.areaWide;
	}
	if (this.y < 0)
	{
		this.y += this.parent.areaHigh;
	}
	if (this.y >= this.parent.areaHigh)
	{
		this.y -= this.parent.areaHigh;
	}

	if (moveTrail)
	{
		for(var i = this.trail.length - 1; i >= 0; --i)
		{
			this.trail[i].x += vx;
			this.trail[i].y += vy;
			if (this.trail[i].x < 0)
			{
				this.trail[i].x += this.parent.areaWide;
			}
			if (this.trail[i].x >= this.parent.areaWide)
			{
				this.trail[i].x -= this.parent.areaWide;
			}
			if (this.trail[i].y < 0)
			{
				this.trail[i].y += this.parent.areaHigh;
			}
			if (this.trail[i].y >= this.parent.areaHigh)
			{
				this.trail[i].y -= this.parent.areaHigh;
			}
		}
	}
};


Ellipse.prototype.collisionResponse = function(c, turnNose, turnSide, turnRear, isOther)
{
	var a = this.coll.a;

	// push the collision apart by a fraction of their longest axis (max 1.0)
	var far = Math.min(Math.max(this.ax, this.by) * 0.1, 1.0);
	this.x -= Math.cos(a) * far;
	this.y -= Math.sin(a) * far;

	// find point of contact angle on me
	var da = a - this.angle;
	while(da >= Math.PI) da -= Math.PI * 2.0;
	while(da < -Math.PI) da += Math.PI * 2.0;

	this.turnCount = this.parent.turnSteps;

	// turn and recalculate velocity components
	var nose = this.parent.noseAngle * Math.PI / 180;
	if (da > -nose && da < nose)
	{
		this.turnAmount = (da > 0 ? -turnNose * Math.PI / 180 : turnNose * Math.PI / 180) / this.turnCount;
	}
	else
	{
		var rear = this.parent.rearAngle * Math.PI / 180;
		var ra = da - Math.PI;
		while(ra < -Math.PI) ra += Math.PI * 2.0;
		if (ra > -rear && ra < rear)
			this.turnAmount = (ra > 0 ? -turnRear * Math.PI / 180 :  turnRear * Math.PI / 180) / this.turnCount;
		else
			this.turnAmount = (da > 0 ? -turnSide * Math.PI / 180 : turnSide * Math.PI / 180) / this.turnCount;
	}

	if (!isOther)
	{
		// create a collision field for the thing I collided with
		c.coll = { a: this.coll.a - Math.PI };	// flip the angle around 180 degrees
		// activate it's own collision response (recursive, one time only due to bool parameter)
		c.collisionResponse(this, turnNose, turnSide, turnRear, true);
	}
};


Ellipse.prototype.drawEllipse = function()
{
	var px, py, a, r;

	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d");

	ctx.canvas.width = this.ax * 2 + 2;
	ctx.canvas.height = this.by * 2 + 2;
	for(a = 0; a < Math.PI * 2; a += Math.PI * 0.01)
	{
		r = ellipseRadius(this.ax, this.by, 0, a);
		if (px === undefined)
		{
			px = Math.cos(a) * r + this.ax;
			py = Math.sin(a) * r + this.by;
			ctx.beginPath();
			ctx.moveTo(px, py);
		}
		else
		{
			px = Math.cos(a) * r + this.ax;
			py = Math.sin(a) * r + this.by;
			ctx.lineTo(px, py);
		}
	}

	ctx.closePath();
	ctx.fillStyle = this.parent.colorEllipse;
	ctx.fill();

	if (Math.min(this.ax, this.by) > 3)
	{
		// draw nose and rear angles if ellipse is not tiny
		ctx.strokeStyle = "#003f3f";
		a = this.parent.noseAngle * Math.PI / 180.0;
		r = ellipseRadius(this.ax, this.by, 0, a);
		ctx.moveTo(this.ax, this.by);
		px = Math.cos(a) * r + this.ax;
		py = Math.sin(a) * r + this.by;
		ctx.lineTo(px, py);
		ctx.stroke();
		a = -this.parent.noseAngle * Math.PI / 180.0;
		r = ellipseRadius(this.ax, this.by, 0, a);
		ctx.moveTo(this.ax, this.by);
		px = Math.cos(a) * r + this.ax;
		py = Math.sin(a) * r + this.by;
		ctx.lineTo(px, py);
		ctx.stroke();
		a = Math.PI + this.parent.rearAngle * Math.PI / 180.0;
		r = ellipseRadius(this.ax, this.by, 0, a);
		ctx.moveTo(this.ax, this.by);
		px = Math.cos(a) * r + this.ax;
		py = Math.sin(a) * r + this.by;
		ctx.lineTo(px, py);
		ctx.stroke();
		a = Math.PI - this.parent.rearAngle * Math.PI / 180.0;
		r = ellipseRadius(this.ax, this.by, 0, a);
		ctx.moveTo(this.ax, this.by);
		px = Math.cos(a) * r + this.ax;
		py = Math.sin(a) * r + this.by;
		ctx.lineTo(px, py);
		ctx.stroke();
	}

	return canvas;
};


Ellipse.prototype.draw = function(ctx, showTrail)
{
	ctx.translate(this.x, this.y);
	ctx.rotate(this.angle);
	ctx.drawImage(Ellipse.shape, -this.ax, -this.by);
	ctx.rotate(-this.angle);
	ctx.translate(-this.x, -this.y);
};


Ellipse.prototype.drawTrail = function(ctx)
{
	if (this.trail.length <= 1)
		return;

	var px, py;

	for(var i = Math.min(this.trail.length, this.parent.showTrail) - 1; i >= 0; --i)
	{
		if (px === undefined)
		{
			px = this.trail[i].x;
			py = this.trail[i].y;

			ctx.strokeStyle = this.parent.colorTrail;
			ctx.lineWidth = 1.0;
			ctx.beginPath();
			ctx.moveTo(px, py);
		}
		else if (this.trail[i])
		{
			var npx = this.trail[i].x;
			var npy = this.trail[i].y;
			// don't draw lines across the screen if the ellipse wrapped around the borders
			if (Math.abs(npx - px) > this.parent.areaWide * 0.25 ||
				Math.abs(npy - py) > this.parent.areaHigh * 0.25)
				ctx.moveTo(npx, npy);
			else
				ctx.lineTo(npx, npy);
			px = npx;
			py = npy;
		}
	}
	ctx.stroke();
};

