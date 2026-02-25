/**
 *
 * dots demo
 *
 * code: Pete Baron 2015
 * 
 */

function Dots( docId )
{
	console.log("Dots c'tor: ", docId);

	demoContext = this;
	createFnc = this.create;
	drawFnc = this.update;

	this.count = 0;
	this.limit = 18;
	this.countTo = 30;
	this.list = null;

	console.log("new goo");

	var _this = this;

	// http://www.storminthecastle.com/projects/goo.js/
	this.g = new Goo(
		{
			fullscreen: true,
			onDraw: function(g)
			{
				_this.update();
			}
		});

	this.create();
}


Dots.prototype.create = function()
{
	console.log("Dots.create");

	this.g.userData = { startAngle : 0 };
	this.list = [];
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
	// counter increment and reset
	this.count += 0.1;
	if (Math.floor(this.count) > this.countTo) this.count = 0;

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
	canvas.style = "letter-spacing: -0.5em;";

	var ctx = g.ctx;
	ctx.clearRect(0, 0, g.width, g.height);

	// test figure
	ctx.globalAlpha = 0.20;
	var n = 5;
	var a = g.userData.startAngle + ((2* 3.1415) / n);
	var s = ((canvas.width < canvas.height)?canvas.width:canvas.height)/2;
	for (var i = 0; i < n; i++)
	{
		ctx.save();
		ctx.beginPath();
		ctx.translate(canvas.width/2, canvas.height/2);
		ctx.rotate(i * a);
		ctx.translate(-s/2,-s/2);
		ctx.rect(0, 0, s, s);
		ctx.fillStyle="#E30B5D"; // raspberry
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	// counter display
	ctx.globalAlpha = 0.90;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "150px Major Mono Display";
	ctx.fillStyle = "white";
	ctx.fillText(Math.min(Math.floor(this.count), this.limit).toString() + "%", canvas.width / 2, canvas.height / 2);
};
