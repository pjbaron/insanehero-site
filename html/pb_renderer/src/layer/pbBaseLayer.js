/**
 *
 * pbBaseLayer - Base class for Layers, contains one layer of multiple pbSprite objects.
 *
 */


function pbBaseLayer()
{
	this.super(pbBaseLayer, 'constructor');

	this.list = null;
	this.parent = null;
	this.renderer = null;
	this.clip = null;
}

// pbBaseLayer extends from the pbSprite prototype chain
// permits multiple levels of inheritance 	http://jsfiddle.net/ZWZP6/2/  
// improvement over original answer at 		http://stackoverflow.com/questions/7300552/calling-overridden-methods-in-javascript
pbBaseLayer.prototype = new pbSprite();
pbBaseLayer.prototype.constructor = pbBaseLayer;
pbBaseLayer.prototype.__super__ = pbSprite;


pbBaseLayer.prototype.create = function(_parent, _renderer, _x, _y, _z, _angleInRadians, _scaleX, _scaleY)
{
	// console.log("pbBaseLayer.create", _x, _y);
	
	// call the pbSprite create for this pbBaseLayer
	this.super(pbBaseLayer, 'create', null, _x, _y, _z, _angleInRadians, _scaleX, _scaleY);

	// TODO: add pass-through option so that layers can choose not to inherit their parent's transforms and will use the rootLayer transform instead
	// TODO: pbBaseLayer is rotating around it's top-left corner (because there's no width/height and no anchor point??)

	this.renderer = _renderer;

	this.parent = _parent;
	this.list = [];
};


pbBaseLayer.prototype.setClipping = function(_x, _y, _width, _height)
{
	this.clip = new pbRectangle(_x, _y, _width, _height);
};


pbBaseLayer.prototype.destroy = function()
{
	// call the pbSprite destroy for this pbBaseLayer
	this.super(pbBaseLayer, 'destroy');

	this.clip = null;

	this.renderer = null;

	if (this.parent && this.parent.list)
	{
		var i = this.parent.list.indexof(this);
		if (i != -1)
			this.parent.list.splice(i, 1);
	}
	this.parent = null;
	this.list = null;
};


pbBaseLayer.prototype.update = function(_drawList)
{
	// console.log("pbBaseLayer.update");
	// call the pbSprite update for this pbBaseLayer to access the child hierarchy
	this.super(pbBaseLayer, 'update', _drawList);
};


pbBaseLayer.prototype.draw = function(_list)
{
	var obj = _list[0];
	
	if (_list.length === 1)
	{
		if (obj.image.isModeZ)
			this.renderer.graphics.drawModeZ( obj.image, obj.transform, obj.z_order );
		else if (obj.image.is3D)
			this.renderer.graphics.drawImageWithTransform3D( obj.image, obj.transform, obj.z_order );
		else if (obj.image.toTexture)
			this.renderer.graphics.drawImageToTextureWithTransform( 256, 256, obj.image, obj.transform, obj.z_order );
		else
			this.renderer.graphics.drawImageWithTransform( obj.image, obj.transform, obj.z_order );
	}
	else if (obj.image.isParticle)
	{
		this.renderer.graphics.blitDrawImages( _list, obj.image.surface );
	}
	else
	{
		this.renderer.graphics.rawBatchDrawImages( _list );
	}
};


/**
 * override the pbSprite addChild function to handle case where a pbBaseLayer is added to a pbBaseLayer
 * in that case it should go into list instead of children in order to provide the correct order of processing
 *
 * @param {[type]} _child [description]
 */
pbBaseLayer.prototype.addChild = function( _child )
{
	// console.log("pbBaseLayer.addChild", this.list.length);

	// TODO: debug only, catches hard to track error that can propagate down through multiple layers and sprites hierarchies
	if (_child === undefined || _child === null)
		alert("ERROR: pbBaseLayer.addChild received an invalid _child", _child);

	if ((_child instanceof pbBaseLayer) || (_child instanceof pbCanvasLayer) || (_child instanceof pbWebGlLayer) || (_child instanceof pbSimpleLayer))
	{
		this.list.push( _child );
		_child.parent = this;
	}
	else
	{
		// call the super.addChild function
		this.super(pbBaseLayer, 'addChild', _child);
	}
};


pbBaseLayer.prototype.removeChild = function( _child )
{
	// console.log("pbBaseLayer.removeChild", this.list.length);

	if ((_child instanceof pbBaseLayer) || (_child instanceof pbCanvasLayer) || (_child instanceof pbWebGlLayer) || (_child instanceof pbSimpleLayer))
	{
		if (!this.list) return;
		var index = this.list.indexOf(_child);
		if (index != -1 && index < this.list.length)
		{
			this.list[index].parent = null;
			this.list.splice(index, 1);
		}
	}
	else
	{
		// call the super.removeChild function
		this.super(pbBaseLayer, 'removeChild', _child);
	}
};

