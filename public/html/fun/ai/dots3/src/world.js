/**
 *
 * the voxel space world
 * static class
 *
 * code: Pete Baron 2015
 * 
 */


World.sizeX = 0;
World.sizeY = 0;
World.space = null;
World.image = null;


function World()
{
}


World.create = function(_x, _y)
{
	console.log("World.create", _x, "x", _y);

	// world size
	World.sizeX = _x;
	World.sizeY = _y;

	// create the empty world space
	World.space = [];
	for(var x = 0; x < _x; x++)
		World.space[x] = [];

	// create an image surface to draw on
	World.image = ctx.createImageData(World.sizeX, World.sizeY);
};


World.destroy = function()
{
	console.log("World.destroy");

	World.space = [];
	ctx.clearRect(0, 0, World.sizeX, World.sizeY);
	World.image = null;
};


World.draw = function()
{
	// redraw the image surface with the world contents
	var data32 = new Uint32Array(World.image.data.buffer);
	for(var x = 0; x < World.sizeX; x++)
	{
		for(var y = 0; y < World.sizeY; y++)
		{
			var dot = World.space[x][y];
			if (dot)
			{
				if (dot instanceof Dot)
				{
					// it's an active dot, draw it
					data32[x + y * World.sizeX] = dot.colour;
				}
				else
				{
					if (dot)
					{
						// it's where an active dot was recently, show the colour then fade it
						data32[x + y * World.sizeX] = 0xff000000 + dot;
						World.space[x][y] = FadeCol(dot);
					}
					else
					{
						// it's faded entirely away, show the bg colour for the canvas again
						data32[x + y * World.sizeX] = 0xff000000;
					}
				}
			}
		}
	}

	// copy the modified image surface to the display four times (tile it)
	ctx.putImageData(World.image, 0, 0);
	ctx.putImageData(World.image, World.sizeX, 0);
	ctx.putImageData(World.image, 0, World.sizeY);
	ctx.putImageData(World.image, World.sizeX, World.sizeY);
};


function FadeCol(col)
{
	var r = col & 0xff0000;
	var g = col & 0x00ff00;
	var b = col & 0x0000ff;
	if (r) r -= 0x010000;
	if (g) g -= 0x000100;
	if (b) b -= 0x000001;
	return r | g | b;
}

