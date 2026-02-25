/**
 *
 * pbSimpleLayer - Contains one layer of multiple pbSprite objects, simple layer does not permit rotation/scaling or nested children.
 *
 */


function pbSimpleLayer()
{
	this.parent = null;
	this.renderer = null;
	this.surface = null;
	this.drawList = null;
	this.drawCall = null;
	this.prepareCall = null;
}

// pbSimpleLayer extends from the pbSprite prototype chain
pbSimpleLayer.prototype = new pbSprite();
// create property to store the class' parent
pbSimpleLayer.prototype.__super__ = pbSprite;		// http://stackoverflow.com/questions/7300552/calling-overridden-methods-in-javascript


pbSimpleLayer.prototype.create = function(_parent, _renderer, _x, _y, _surface)
{
	this.parent = _parent;
	this.renderer = _renderer;
	// call the pbSprite create for this pbSimpleLayer
	this.__super__.prototype.create.call(this, null, _x, _y);
	this.surface = _surface;
	this.drawList = new Float32Array(MAX_SPRITES * 4);
	// default to the safer (slower?) of the two drawing functions
	this.drawCall = this.draw;
	this.prepareCall = this.prepareXY;
};


pbSimpleLayer.prototype.destroy = function()
{
	// call the pbSprite destroy for this pbSimpleLayer
	this.__super__.prototype.destroy.call(this);
	this.parent = null;
	this.renderer = null;
	this.surface = null;
	this.drawList = null;
	this.drawCall = null;
	this.prepareCall = null;
};


pbSimpleLayer.prototype.update = function(_dictionary)
{

	if (!this.drawCall || !this.prepareCall)
		return false;

	if (!this.alive)
		return true;

	if (this.children)
	{
		var drawLength = this.prepareCall.call(this);
		// call to draw all sprites in the drawList
		if (drawLength > 0)
			this.drawCall.call(this, drawLength);
	}

	return true;
};


/**
 * prepareXY - prepare drawList with only X,Y coordinates per sprite
 *
 * @return {[type]} [description]
 */
pbSimpleLayer.prototype.prepareXY = function()
{
	var drawLength = 0;
	var x = this.x;
	var y = this.y;

	// for all of my child sprites
	var c = Math.min(this.children.length, MAX_SPRITES);
	while(c--)
	{
		var child = this.children[c];

		// add sprite location to drawList
		if (child.alive)
		{
			this.drawList[drawLength++] = child.x + x;
			this.drawList[drawLength++] = child.y + y;
		}
	}
	
	return drawLength;
};


/**
 * prepareXYUV - prepare drawList with X,Y coordinates and U,V texture source positions per sprite
 *
 * @return {[type]} [description]
 */
pbSimpleLayer.prototype.prepareXYUV = function()
{
	var drawLength = 0;
	var x = this.x;
	var y = this.y;

	// for all of my child sprites
	var c = Math.min(this.children.length, MAX_SPRITES);
	while(c--)
	{
		var child = this.children[c];

		// add sprite location to drawList
		if (child.alive)
		{
			this.drawList[drawLength++] = child.x + x;
			this.drawList[drawLength++] = child.y + y;
			var cx = child.image.cellFrame % this.surface.cellsWide;
			var cy = Math.floor(child.image.cellFrame / this.surface.cellsWide);
			var r = this.surface.cellTextureBounds[cx][cy];
			this.drawList[drawLength++] = r.x;
			this.drawList[drawLength++] = r.y;
		}
	}

	return drawLength;
};



/**
 * draw using blitSimpleDrawImages 
 * (sends a tri-strip for all quads in the batch to the GPU, standard stuff, very reliable, moderately heavy CPU overhead in the data preparation)
 *
 * @param  {[type]} _length [description]
 *
 * @return {[type]}         [description]
 */
pbSimpleLayer.prototype.draw = function(_length)
{
	this.renderer.graphics.blitSimpleDrawImages( this.drawList, _length, this.surface );
};


/**
 * draw using blitDrawImagesPoint, requires X,Y location only
 * (uses an enlarged GL_POINT to specify a draw region in the vertex shader - cannot rotate, must be square, may have compatibility issues on old hardware, however it's fast and very light CPU for the data preparation)
 *
 * @param  {[type]} _length [description]
 *
 * @return {[type]}         [description]
 */
pbSimpleLayer.prototype.drawPoint = function(_length)
{
	this.renderer.graphics.blitDrawImagesPoint( this.drawList, _length, this.surface );
};

/**
 * draw using blitDrawImagesPointAnim, requires X,Y location and U,V texture source offsets
 * (uses an enlarged GL_POINT to specify a draw region in the vertex shader - cannot rotate, must be square, may have compatibility issues on old hardware, however it's fast and very light CPU for the data preparation)
 *
 * @param  {[type]} _length [description]
 *
 * @return {[type]}         [description]
 */
pbSimpleLayer.prototype.drawPointAnim = function(_length)
{
	this.renderer.graphics.blitDrawImagesPointAnim( this.drawList, _length, this.surface );
};


/**
 * override the pbSprite addChild function to ensure that only pbSprite is added to this pbSimpleLayer
 *
 * @param {[type]} _child [description]
 */
pbSimpleLayer.prototype.addChild = function( _child )
{
	if (_child instanceof pbSprite)
	{
		// call the super.addChild function
		this.__super__.prototype.addChild.call( this, _child );
	}
	else
	{
		console.log("ERROR: can ONLY addChild a pbSprite to a pbSimpleLayer!");
	}
};


pbSimpleLayer.prototype.setDrawingFunctions = function( _prepareCall, _drawCall )
{
	this.prepareCall = _prepareCall;
	this.drawCall = _drawCall;
};

