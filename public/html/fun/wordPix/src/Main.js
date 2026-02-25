
const wordsFilename = "./data/words.txt";
const sourceImageFilename = "./data/rose.png";


const MinFont = 13;
const FontStep = 4;
const MaxFont = 140;

const Tightness = 4096;		// how hard it will try to fit words cleverly
const Padding = 3;			// space around each word
const WordSpread = 0.5;		// higher = more variation, 0.9 maximum, don't reduce lower than 0

const BackgroundColour = "#ffafafff";

const Colours = [
	"#1f0000",
	"#9f007f",
	"#7f003f",
	"#3f0000",
	"#8f0000",
	"#af0000",
	"#cf0000",
	"#ff0000",
];



const States =
{
	None: 0,
	LoadImage: 1,
	LoadWords: 2,
	MeasureWords: 3,
	FitWords: 4,
	CreateImage: 5,
}


function Main()
{
	this.rafID = undefined;
	this.canvas = null;
	this.ctx = null;
	this.state = null;
	this.lastState = null;
	this.image = null;
	this.words = null;
	this.wordSizes = null;
	this.layout = null;
	this.imageAlpha = null;
	this.frequency = null;
}


Main.prototype.create = function( _canvas )
{
	this.canvas = _canvas;
	this.canvas.setAttribute('id', "Word Pix");
	this.canvas.setAttribute('style', 'border: none');
	this.ctx = this.canvas.getContext('2d');

	this.state = States.LoadImage;
	this.lastState = States.None;
	this.image = null;
	this.words = null;
	this.wordSizes = null;
	this.layout = null;
	this.imageAlpha = null;
	this.frequency = null;
}


Main.prototype.start = function()
{
	this.rafID = window.requestAnimationFrame(this.update.bind(this));
}


Main.prototype.update = function()
{
	this.process();
	this.rafID = window.requestAnimationFrame(this.update.bind(this));
}


Main.prototype.process = function()
{
	var newState = (this.state != this.lastState);
	this.lastState = this.state;

	switch(this.state)
	{
		case States.LoadImage:

			if (newState)
			{
				this.image = new Image();
				this.image.crossOrigin = "./";
				this.image.onload = () =>
				{
					console.log("loaded image " + this.image.width + "x" + this.image.height);
					this.canvas.setAttribute('width', this.image.width);
					this.canvas.setAttribute('height', this.image.height);

					var c = document.createElement("canvas");
					c.width = this.image.width;
					c.height = this.image.height;
					var ctx = c.getContext("2d");
					ctx.drawImage(this.image, 0, 0);
					var data = ctx.getImageData(0, 0, this.image.width, this.image.height).data;
					this.imageAlpha = data.filter(function(element, index)
					{
						if (index % 4 == 3)
							return true;
					});
					this.state = States.LoadWords;
				}
				this.image.src = sourceImageFilename;
				console.log("loading " + this.image.src);
			}
			break;

		case States.LoadWords:

			if (newState)
			{
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = (e) =>
				{
					if (xhr.readyState == 4 && xhr.status == 200)
					{
						var text = xhr.responseText;
						this.words = [...new Set(text.split("\n"))].filter(x => x != "");
						console.log("loaded " + this.words.length + " unique words");
						this.state = States.MeasureWords;
					}
				}
				xhr.open("GET", wordsFilename, true);
				xhr.setRequestHeader('Content-type', 'text/html');
				xhr.send();
				console.log("loading " + wordsFilename);
			}
			break;

		case States.MeasureWords:

			this.wordSizes = [];
			for(var i = MinFont; i <= MaxFont; i+=FontStep)
			{
				var size = i.toString();
				console.log("Measuring words at font size " + size);

				var c = document.createElement("canvas");
				c.width = 1024;
				c.height = 512;
				var ctx = c.getContext("2d");
				var x = 16;
				var y = c.height / 2;

				this.wordSizes[i] = this.words.map(
					function(word)
					{
						function findExtents(data, wide, high)
						{
							var minx = Number.MAX_VALUE, miny = Number.MAX_VALUE;
							var maxx = 0, maxy = 0;
							for(var y = 0; y < high; y++)
							{
								var yw = y * wide * 4;
								for(var x = 0; x < wide; x++)
								{
									if (data[x * 4 + yw] > 0)
									{
										if (x < minx) minx = x;
										if (x > maxx) maxx = x;
										if (y < miny) miny = y;
										if (y > maxy) maxy = y;
									}
								}
							}
							if (maxx == 0 || maxy == 0)
							{
								console.log("can't measure " + word + " at size " + size);

							}
							return { width: Math.ceil(maxx - minx) + Padding, height: Math.ceil(maxy - miny) + Padding, baseLine: Math.ceil(c.height / 2 - miny) };
						}

						ctx.fillStyle = "#000000";
						ctx.fillRect(0, 0, c.width, c.height);
						ctx.font = size.toString() + "px Arial";
						ctx.fillStyle = "#ffffff";
						ctx.fillText(word, x - Padding / 2, y);
						var data = ctx.getImageData(0, 0, c.width, c.height).data;
						var extents = findExtents(data, c.width, c.height);
						return { w: extents.width, h: extents.height, b: extents.baseLine };
					});
			}
			this.state = States.FitWords;
			break;

		case States.FitWords:
			if (newState)
			{
				console.log("fitting words...");
				this.fits = [];
				this.frequency = [];
				for(var i = 0, l = this.words.length; i < l; i++)
					this.frequency[i] = 0;
			}

			if (!this.biggestFit())
			{
				console.log("finished fitting.");
				this.state = States.CreateImage;
			}
			break;

		case States.CreateImage:

			if (newState)
			{
				this.ctx.fillStyle = BackgroundColour;
				this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

				for(var i = 0, l = this.fits.length; i < l; i++)
				{
					var fit = this.fits[i];
					var word = this.words[fit.wordIndex];
					var size = fit.sizeIndex;
					var x = fit.area.x;
					var y = fit.area.y + this.wordSizes[fit.sizeIndex][fit.wordIndex].b;
					this.ctx.font = size.toString() + "px Arial";
					this.ctx.fillStyle = Colours[Math.floor(Math.random() * Colours.length)];
					this.ctx.fillText(word, x, y);
				}
			}

			console.log("done.");
			this.state = States.None;
			break;
	}
}


Main.prototype.biggestFit = function()
{
	var fitted = false;
	for(var i = this.wordSizes.length - 1; i >= 0; i--)
	{
		if (this.wordSizes[i])
		{
			var fit = this.fitSize(i);
			if (fit)
			{
				this.fits.push(fit);
				this.clearArea(fit.area);
				fitted = true;
			}
		}
	}
	return fitted;
}


Main.prototype.fitSize = function( _sizeIndex )
{
	this.indices = [];
	for(var i = 0, l = this.words.length; i < l; i++)
		this.indices[i] = i;
	this.indices.sort((a,b) => (this.frequency[a] < this.frequency[b] ? -1:1));

	// var l = this.words.length;
	// this.indices = [];
	// while(this.indices.length < l)
	// {
	// 	var r = Math.floor(Math.random() * l);
	// 	if (this.indices.indexOf(r) === -1)
	// 		this.indices.push(r);
	// }

	for(var i = 0, l = Math.ceil(this.indices.length * (1 - WordSpread)); i < l; i++)
	{
		var size = this.wordSizes[_sizeIndex][this.indices[i]];
		var w = size.w;
		var h = size.h;
		var tries = Tightness;
		var mx = this.image.width - w;
		var my = this.image.height - h;
		do{
			var x = Math.floor(Math.random() * mx);
			var y = Math.floor(Math.random() * my);
			var area = { x:x, y:y, w:w, h:h };
			if (this.solidArea(area))
			{
				this.slideToEdge(area);
				console.log("'" + this.words[this.indices[i]] + "' fits at " + area.x + "," + area.y + " size " + _sizeIndex);
				this.frequency[this.indices[i]]++;
				return { area: area, wordIndex: this.indices[i], sizeIndex: _sizeIndex };
			}
		}while(tries--);
	}
	return null;
}

Main.prototype.slide = function( _area, _dx, _dy )
{
	_area.x += _dx;
	_area.y += _dy;
	if (this.solidArea(_area))
		return true;
	_area.x -= _dx;
	_area.y -= _dy;
	return false;
}


Main.prototype.slideToEdge = function( _area )
{
	var dir = Math.floor(Math.random() * 4);
	var dx = 0, dy = 0;
	switch(dir)
	{
		case 0:
			dx = -1;
			break;
		case 1:
			dx = 1;
			break;
		case 2:
			dy = -1;
			break;
		case 3:
			dy = 1;
			break;
	}
	
	var sx = _area.x;
	var sy = _area.y;
	while(this.slide(_area, dx, dy))
		if (_area.x < 0 || _area.x > this.image.width || _area.y < 0 || _area.y > this.image.height)
		{
			_area.x = sx;
			_area.y = sy;
			break;
		}
}


Main.prototype.solidArea = function( _area )
{
	var w = this.image.width;
	var sx = _area.x;
	var mx = sx + _area.w;
	var my = _area.y + _area.h;
	for(var y = _area.y; y < my; y++)
	{
		var yw = y * w;
		for(var x = sx; x < mx; x++)
			if (this.imageAlpha[x + yw] <= 0)
				return false;
	}
	return true;
}


Main.prototype.clearArea = function( _area )
{
	var w = this.image.width;
	var sx = _area.x;
	var mx = sx + _area.w;
	var my = _area.y + _area.h;
	for(var y = _area.y; y < my; y++)
	{
		var yw = y * w;
		for(var x = sx; x < mx; x++)
			this.imageAlpha[x + yw] = 0;
	}

/*
	// show image with holes being punched into it
	var data = [];
	for(var i in this.imageAlpha)
	{
		data.push(255,255,255,this.imageAlpha[i]);
	}
	var imgData = new ImageData(new Uint8ClampedArray(data), this.image.width, this.image.height);
	this.ctx.fillStyle = 'rgba(0, 0, 0, 255)';
	this.ctx.fillRect(0, 0, 258, 258);
	this.ctx.putImageData(imgData, 1, 1);
*/
}

