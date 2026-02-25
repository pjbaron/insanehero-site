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
	this.numDots = 10000;

	// create the world space
	new World(256, 256);

	// create the graphics system (which calls update)
	// http://www.storminthecastle.com/projects/goo.js/
	var _this = this;
	this.g = new Goo(
		{
			fullscreen: false,
			width: 400,
			height: 400,
			onDraw: function(g)
			{
				stats.begin();
				_this.update();
				stats.end();
			}
		});
	document.body.appendChild(this.g.canvas);

	// create with default values
	this.create();
}


Dots.prototype.create = function()
{
	console.log("Dots.create");

	this.g.userData = { startAngle : 0 };
	this.list = [];

	for(var i = 0; i < this.numDots; i++)
	{
		this.list[i] = new Dot();
		var x = Math.random() * World.sizeX;
		var y = Math.random() * World.sizeY;
		var vx = Math.random() - 0.5;
		var vy = Math.random() - 0.5;
		this.list[i].create(x, y, vx, vy);
	}
};


Dots.prototype.destroy = function()
{
	console.log("Dots.destroy");

	this.g.onDraw = null;
	this.g = null;
	this.list = null;
};


Dots.prototype.update = function()
{
	for(var i = 0, l = this.list.length; i < l; i++)
	{
		if (this.list[i])
			this.list[i].update();
	}
	this.draw(this.g);
};


Dots.prototype.draw = function(g)
{
	var canvas = g.canvas;
	var ctx = g.ctx;
	ctx.clearRect(0, 0, g.width, g.height);

	World.draw(ctx, g.width, g.height);

	// test figure
	// ctx.globalAlpha = 0.20;
	// var n = 5;
	// var a = g.userData.startAngle + ((2* 3.1415) / n);
	// var s = ((canvas.width < canvas.height)?canvas.width:canvas.height)/2;
	// for (var i = 0; i < n; i++)
	// {
	// 	ctx.save();
	// 	ctx.beginPath();
	// 	ctx.translate(canvas.width/2, canvas.height/2);
	// 	ctx.rotate(i * a);
	// 	ctx.translate(-s/2,-s/2);
	// 	ctx.rect(0, 0, s, s);
	// 	ctx.fillStyle="#E30B5D"; // raspberry
	// 	ctx.fill();
	// 	ctx.stroke();
	// 	ctx.restore();
	// }
};

