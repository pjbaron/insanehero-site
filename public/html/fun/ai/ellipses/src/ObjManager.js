/**
 *
 * ellipses demo
 *
 * code: Pete Baron 2015
 * 
 */

function ObjManager( docId )
{
	console.log("ObjManager c'tor: ", docId);

	demoContext = this;
	createFnc = this.create;
	drawFnc = this.update;

	this.pause = false;
	this.dragStart = null;
	this.dragging = false;
	this.restartFlag = false;
	this.list = null;

	this.numEllipse = 720;
	this.orderParameter = 0.0001;
	this.velocity = 1.0;
	this.noseAngle = 14.0;
	this.rearAngle = 30.0;
	this.turnBumpNose = 30;
	this.turnBumpSide = 46;
	this.turnBumpRear = 31;
	this.turnSteps = 10;
	this.majorAxis = 10;
	this.minorAxis = 5;
	this.showTrail = 5;
	this.areaWide = 640;
	this.areaHigh = 500;
	this.bgColor = "#101010";
	this.colorTrail = "#898989";
	this.colorEllipse = "#00af9a";

	// dat.GUI controlled variables and callbacks
	var _this = this;
	gui.add(this, "orderParameter", 0.0, 2.0).listen();

	this.numCtrl = gui.add(this, "numEllipse").min(5).max(2000).step(5).listen();
	this.numCtrl.onFinishChange(function(value) { if (!value) _this.numEllipse = 1; _this.restartFlag = true; });
	this.velCtrl = gui.add(this, "velocity").min(0.1).max(2.0).step(0.01).listen();
	this.velCtrl.onFinishChange(function(value) { _this.restartFlag = true; });

	this.noseAngleCtrl = gui.add(this, "noseAngle").min(0).max(180).step(1).listen();
	this.noseAngleCtrl.onChange(function(value) { Ellipse.shape = null; });
	this.rearAngleCtrl = gui.add(this, "rearAngle").min(0).max(180).step(1).listen();
	this.rearAngleCtrl.onChange(function(value) { Ellipse.shape = null; });

	gui.add(this, "turnBumpNose").min(-179).max(179).step(1);
	gui.add(this, "turnBumpSide").min(-179).max(179).step(1);
	gui.add(this, "turnBumpRear").min(-179).max(179).step(1);
	gui.add(this, "turnSteps").min(1).max(60).step(1);

	this.majorCtrl = gui.add(this, "majorAxis").min(1).max(30).step(1).listen();
	this.majorCtrl.onFinishChange(function(value) { if (!value) _this.majorAxis = 1; _this.restartFlag = true; });
	this.minorCtrl = gui.add(this, "minorAxis").min(1).max(30).step(1).listen();
	this.minorCtrl.onFinishChange(function(value) { if (!value) _this.minorAxis = 1; _this.restartFlag = true; });

	gui.add(this, "showTrail").min(0).max(MAX_TRAIL).step(5);

	this.areaWidth = gui.add(this, "areaWide").min(200).max(2000).step(10).listen();
	this.areaWidth.onFinishChange(function(value) { if (!value) _this.areaWide = 200; _this.restartFlag = true; });
	this.areaHeight = gui.add(this, "areaHigh").min(200).max(1000).step(10).listen();
	this.areaHeight.onFinishChange(function(value) { if (!value) _this.areaHigh = 200; _this.restartFlag = true; });

	gui.addColor(this, "bgColor");
	gui.addColor(this, "colorTrail");
	this.colCtrl = gui.addColor(this, "colorEllipse").listen();
	this.colCtrl.onChange(function(value) { Ellipse.shape = null; });

    // detect mouse click for pause and drag
	document.body.onmousedown = function(e) {
		if (e.clientX < _this.areaWide)
			if (e.clientY < _this.areaHigh)
				if (!_this.dragStart)
				{
					_this.dragStart = { x: e.clientX, y: e.clientY };
					_this.dragging = false;
					return;
				}
		_this.dragStart = null;
	};
	document.body.onmousemove = function(e) {
		if (_this.dragStart)
		{
			var offx = e.clientX - _this.dragStart.x;
			var offy = e.clientY - _this.dragStart.y;
			if (offx || offy)
			{
				_this.moveAll(offx, offy);
				_this.dragStart = { x: e.clientX, y: e.clientY };
				_this.dragging = true;
			}
		}
	};
	document.body.onmouseup = function(e) {
		if (e.clientX || e.clientY)	// ignore first mouse up: clientx and y are both 0
			if (e.clientX < _this.areaWide)
				if (e.clientY < _this.areaHigh)
					if (!_this.dragging)
						_this.pause = !_this.pause;
					else
					{
						_this.dragging = false;
						_this.dragStart = null;
					}
	};

	// save the context so we can undo the clipping when it changes
	console.log("save context");
}


ObjManager.prototype.constructor = ObjManager;


ObjManager.prototype.create = function()
{
	console.log("ObjManager.create", this.areaWide, this.areaHigh);

	this.restartFlag = false;

	// resize the canvas
	canvas.width = this.areaWide;
	canvas.height = this.areaHigh;
	// erase the entire canvas
	// ctx.clearRect(0, 0, canvas.width, canvas.height);
	// console.log("restore context");
	// ctx.restore();
	// // delimit the clipping rectangle
	// ctx.rect(0, 0, this.areaWide, this.areaHigh);
	// // set clipping to stop ellipses sticking out at edges
	// ctx.clip();

	this.list = [];
	for(var i = 0; i < this.numEllipse; i++)
	{
		var e = new Ellipse();
		var angle = Math.floor(Math.random() * (Math.PI * 2.0 / (this.turnBumpNose * Math.PI / 180.0))) * this.turnBumpNose * Math.PI / 180 - Math.PI;
		// keep trying different locations until we find one that isn't colliding with an existing Ellipse
		var c = 0;
		while( c < 10000 &&
				!e.create(
					this,
					Math.random() * this.areaWide, Math.random() * this.areaHigh,
					angle,
					this.majorAxis, this.minorAxis,
					this.velocity) )
			c++;

		// if we had to give up, break the loop
		if (c < 10000)
			this.list[i] = e;
		else
			break;
	}

	console.log("Created objects: ", this.list.length);
	this.numEllipse = this.list.length;
};


ObjManager.prototype.destroy = function()
{
	this.list = null;
};


ObjManager.prototype.restart = function()
{
	this.destroy();
	this.create();
};


ObjManager.prototype.destroy = function()
{
	console.log("ObjManager.destroy");

	Ellipse.shape = null;
	this.list = null;
};


ObjManager.prototype.update = function()
{
	if (this.pause)
		return;

	if (this.restartFlag)
	{
		this.restart();
		return;
	}

	var sumV = { x: 0, y:0 };
	var sumC = 0;

	for(var i = 0, l = this.list.length; i < l; i++)
	{
		var e = this.list[i];
		if (e)
		{
			e.update(this.turnBumpNose, this.turnBumpSide, this.turnBumpRear);
			sumV.x += e.vx;
			sumV.y += e.vy;
			sumC++;
		}
	}
	this.draw();

	// calculate average normalised velocity for all objects
	this.orderParameter = Math.sqrt(sumV.x * sumV.x + sumV.y * sumV.y) / sumC;
};


ObjManager.prototype.moveAll = function(_dx, _dy)
{
	for(var i = 0, l = this.list.length; i < l; i++)
	{
		if (this.list[i])
		{
			this.list[i].move(_dx, _dy, true);
		}
	}
	this.draw();
};


ObjManager.prototype.collide = function(e)
{
	var who = null;
	for(var i = 0, l = this.list.length; i < l; i++)
	{
		var c = this.list[i];
		if (c && c != e)
		{
			// circular range check first (quick reject)
			var dx = c.x - e.x;
			var dy = c.y - e.y;
			var d2 = dx * dx + dy * dy;
			var s2 = (e.ax + c.ax) * (e.ax + c.ax);
			if (d2 <= s2)
			{
				// the circles touch
				var d = Math.sqrt(d2);
				var a = Math.atan2(dy, dx);
				var r1 = ellipseRadius(e.ax, e.by, e.angle, a - Math.PI);
				var r2 = ellipseRadius(c.ax, c.by, c.angle, a);

				// do the ellipses actually touch?
				// (approximation uses distance < radius1 + radius2)
				// this can give incorrect results because the radius may not pass through the point of contact for ellipse collisions
				if (d <= r1 + r2)
				{
					// store collision partials
					e.coll = { d: d, a: a, r1: r1, r2: r2 };
					return c;
				}
			}
		}
	}
	return who;
};


function ellipseRadius(ax, by, facing, angle)
{
	// find difference in angles so we can use non-rotated ellipse equations
	var t = angle - facing;
	while (t < -Math.PI) t += Math.PI * 2.0;
	while (t >= Math.PI) t -= Math.PI * 2.0;
	var s = Math.sin(t);
	var c = Math.cos(t);

	// equation from: http://math.stackexchange.com/questions/432902/how-to-get-the-radius-of-an-ellipse-at-a-specific-angle-by-knowing-its-semi-majo
	// r = (a.b) / sqrt(sqr(a).sqr(sin(theta)) + sqr(b).sqr(cos(theta)))
	var r = ax * by / Math.sqrt(ax * ax * s * s + by * by * c * c);
	return r;
}


ObjManager.prototype.draw = function()
{
	ctx.fillStyle = this.bgColor;
	ctx.fillRect(0, 0, this.areaWide, this.areaHigh);

	var i, l;
	if (this.showTrail)
	{
		for(i = 0, l = this.list.length; i < l; i++)
		{
			if (this.list[i])
				this.list[i].drawTrail(ctx);
		}
	}

	for(i = 0, l = this.list.length; i < l; i++)
	{
		if (this.list[i])
			this.list[i].draw(ctx, this.showTrail);
	}
};
