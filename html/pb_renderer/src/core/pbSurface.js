/**
 *
 * A raw texture surface with handling and manipulation methods.
 * TODO: Currently holds the HTML Image only but should be extended to any other image sources.
 * 
 * Each surface may contain a number of separate images, called 'cells' here because they will often be animation cells.
 * Surfaces will be sent entire to graphics card in WebGL mode, the shaders use the cell data to pick out the correct frame.
 * 
 */


function pbSurface()
{
	this.cellWide = 0;
	this.cellHigh = 0;
	this.cellsWide = 0;
	this.cellsHigh = 0;
	this.imageData = null;
	this.cellTextureBounds = null;
	this.isNPOT = false;
}


pbSurface.prototype.create = function(_wide, _high, _numWide, _numHigh, _imageData)
{
	if (_wide === 0) _wide = _imageData.width;
	if (_high === 0) _high = _imageData.height;
	
	this.cellWide = _wide;
	this.cellHigh = _high;
	this.cellsWide = _numWide;
	this.cellsHigh = _numHigh;
	this.imageData = _imageData;
	this.isNPOT = false;

	// dimensions of one cell in texture coordinates (0 = left/top, 1 = right/bottom)
	if (_imageData)
	{
		// _image may have padding around the animation cells
		texWide = 1.0 / (this.imageData.width / this.cellWide);
		texHigh = 1.0 / (this.imageData.height / this.cellHigh);
	}
	else
	{
		// there is no image attached, create a surface to exactly fit the animation cells
		texWide = 1.0 / this.cellsWide;
		texHigh = 1.0 / this.cellsHigh;
	}

	// TODO: change cellTextureBounds into a linear list indexed only by pbImage.cellFrame... faster, and more logical when sprites are not grid aligned!
	this.cellTextureBounds = [];
	for(var x = 0; x < this.cellsWide; x++)
	{
		this.cellTextureBounds[x] = [];
		for(var y = 0; y < this.cellsHigh; y++)
			this.cellTextureBounds[x][y] = new pbRectangle(x * texWide, y * texHigh, texWide, texHigh);
	}
};


pbSurface.prototype.destroy = function()
{
	this.imageData = null;
	this.cellTextureBounds = null;
};

