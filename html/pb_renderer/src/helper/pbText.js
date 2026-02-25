/**
 *
 * pbText.js - support functions to produce and manipulate text on screen
 *
 * TODO: very crude first attempt at this, look at some other APIs and decide what would be nice to have...
 * 
 */



function pbText()
{
	this.surface = null;
	this.layer = null;
	this.firstAscii = 0;
	this.lines = null;
}


pbText.prototype.create = function(_surface, _layer, _firstAscii)
{
	this.surface = _surface;
	this.layer = _layer;
	this.firstAscii = _firstAscii;
	this.lines = [];
};


pbText.prototype.destroy = function()
{
	this.surface = null;
	this.layer = null;
	for(var i = 0, l = this.lines.length; i < l; i++)
	{
		for(var j = 0, m = this.lines[i].line.length; j < m; j++)
		{
			this.lines[i].line[j].destroy();
		}
		this.lines[i] = null;
	}
	this.lines = null;
};


pbText.prototype.addLine = function(_text, _x, _y, _gap)
{
	var x = _x, y = _y;
	var line = [];

	for(var i = 0, l = _text.length; i < l; i++)
	{
		var c = _text.charCodeAt(i) - this.firstAscii;
		var img = new imageClass();
		img.create(this.surface, c);

		// TODO: layers are not correctly depth separated: If this UI layer 'z' is not lower than it's parent layer, the text will appear behind that layer's sprite children
		var spr = new pbSprite();
		spr.create(img, x, y, 0.0, 0, 1.0, 1.0);		// z coordinate == 0; draw in front of everything else

		this.layer.addChild(spr);

		line.push( spr );

		x += _gap;
	}

	if (l > 0)
	{
		// always fill in gaps in the list before extending it
		var slot = this.lines.indexOf(null);
		if (slot === -1)
			return this.lines.push( { line: line, text: _text, x: _x, y: _y, gap: _gap } ) - 1;
		this.lines[slot] = { line: line, text: _text, x: _x, y: _y, gap: _gap };
		return slot;
	}

	return -1;
};


pbText.prototype.removeLine = function(_whichLine)
{
	if (this.lines && this.lines.length > _whichLine && this.lines[_whichLine] !== null)
	{
		var line = this.lines[_whichLine].line;
		for(var i = 0, l = line.length; i < l; i++)
			line[i].destroy();
		this.lines[_whichLine] = null;
	}
};


pbText.prototype.changeLine = function(_whichLine, _text)
{
	var oldText = this.lines[_whichLine].text;

	// remove the old one and add a new one if the text string has changed length
	if (oldText.length != _text.length)
	{
		var x = this.lines[_whichLine].x;
		var y = this.lines[_whichLine].x;
		var gap = this.lines[_whichLine].x;
		this.removeLine(_whichLine);
		return this.addLine(_text, x, y, gap);
	}

	// otherwise animate the characters to the new string values
	var line = this.lines[_whichLine].line;
	for(var i = 0, l = _text.length; i < l; i++)
	{
		var c = _text.charCodeAt(i) - this.firstAscii;
		line[i].image.cellFrame = c;
	}

	return _whichLine;
};

