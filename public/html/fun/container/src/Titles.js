"use strict";


function Titles()
{
    // this.sprite = null;
    this.graphics = null;
    this.titleText = null;
}


Titles.prototype.create = function( _graphics )
{
    // var image = Preloader.image("titleImage");
    // this.sprite = new Sprite();
    // this.sprite.create(image, (canvas.width - image.width) / 2, (canvas.height - image.height) / 2);
    this.graphics = _graphics;
    this.titleText = this.graphics.addText("Roguish!", "white", 48);
};


Titles.prototype.destroy = function()
{
    // this.sprite.destroy();
    this.graphics.removeText(this.titleText);
    this.titleText = null;
};


Titles.prototype.update = function()
{
    // this.sprite.draw();
	// detect space press
	if (Keys.isPressed[ 32 ])
		return false;
	return true;
};

