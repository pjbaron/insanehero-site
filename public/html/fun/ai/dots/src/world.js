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


function World(_x, _y)
{
	// world size
	World.sizeX = _x;
	World.sizeY = _y;

	// create the empty world space
	World.space = [];
	for(var x = 0; x < _x; x++)
		World.space[x] = [];
}


World.draw = function(_ctx, _wide, _high)
{
	_ctx.clearRect(0, 0, _wide, _high);

	_ctx.beginPath();
	for(var x = 0; x < World.sizeX; x++)
		for(var y = 0; y < World.sizeY; y++)
		{
			var dot = World.space[x][y];
			if (dot)
			{
				// TODO: might be faster if we batch the colours?
				_ctx.fillStyle = dot.colour;
				_ctx.fillRect(x, y, 1, 1);
			}
		}
	_ctx.closePath();
};


