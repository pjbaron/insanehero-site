/**
 *
 * Surface holder with a single pbSurface and a cellFrame index for the current animation cell.
 * 
 * This information cannot be stored in pbSurface (they are reused so the cellFrame needs to be unique)
 * and should not be in pbSprite (it's a logical transform object with an optional image attached).
 *
 * These objects will usually be one per pbSprite, but can safely be shared if a large number of pbSprite
 * objects will animate entirely in sync.  Be careful not to update the cellFrame in every pbSprite though!
 *
 */


function pbWebGlImage()
{
	this.surface = null;
	this.cellFrame = 0;
	this.gpuTexture = null;
	this.corners = null;
	this.anchorX = 0.5;
	this.anchorY = 0.5;
	this.fullScreen = false;
	this.tiling = false;
	this.isParticle = false;
	this.is3D = false;
	this.isModeZ = false;
	this.toTexture = false;
}


// pbWebGlImage extends from the pbBaseImage prototype chain
// permits multiple levels of inheritance 	http://jsfiddle.net/ZWZP6/2/  
// improvement over original answer at 		http://stackoverflow.com/questions/7300552/calling-overridden-methods-in-javascript
pbWebGlImage.prototype = new pbBaseImage();
pbWebGlImage.prototype.constructor = pbWebGlImage;
pbWebGlImage.prototype.__super__ = pbBaseImage;


/**
 * setCorners - specify the x,y offset of each corner of the drawn quadrilateral (for perspective/skewing type effects)
 * l = left, r = right, t = top, b = bottom
 * call with no parameters to clear the existing corners back to default (no offset)
 *
 * @param {[type]} ltx [description]
 * @param {[type]} lty [description]
 * @param {[type]} rtx [description]
 * @param {[type]} rty [description]
 * @param {[type]} lbx [description]
 * @param {[type]} lby [description]
 * @param {[type]} rbx [description]
 * @param {[type]} rby [description]
 */
pbWebGlImage.prototype.setCorners = function(ltx, lty, rtx, rty, lbx, lby, rbx, rby)
{
	if (ltx === undefined)
		this.corners = null;
	else
		this.corners = { ltx:ltx, lty:lty, rtx:rtx, rty:rty, lbx:lbx, lby:lby, rbx:rbx, rby:rby };
};


pbWebGlImage.prototype.draw = function(_drawDictionary, _transform, _z_order)
{
	_drawDictionary.add( this.surface, { image: this, transform: _transform, z_order: _z_order });
};


pbWebGlImage.prototype.simpleDraw = function(_drawDictionary, _x, _y)
{
	_drawDictionary.add( this.surface, { image: this, x: _x, y: _y });
};

