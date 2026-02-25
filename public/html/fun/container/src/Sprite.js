"use strict";


function Sprite()
{
    this.x = this.y = 0;
    this.image = null;
}


Sprite.prototype.create = function( _image, _x, _y )
{
    this.image = _image;
    this.x = _x;
    this.y = _y;
};


Sprite.prototype.destroy = function()
{
    this.image = null;
}


Sprite.prototype.draw = function()
{
    //ctx.drawImage(this.image, this.x, this.y);
};