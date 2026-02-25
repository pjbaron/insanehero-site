"use strict";


function Entity()
{
    // 'super' constructor
    Container.call( this );

    this.location = null;
    this.lastUpdateTick = -1;
}


// Entity extends Container
Entity.prototype = Object.create( Container.prototype );
Entity.prototype.constructor = Container;


Entity.prototype.create = function( _key, _location )
{
    Container.prototype.create.call( this, _key, _location );
    this.location = _location;
};


Entity.prototype.destroy = function()
{
    this.location = null;
    Container.prototype.destroy.call( this );
};


Entity.prototype.update = function()
{
    // only update each entity once per frame (permits multiple references in the heirarchy)
    if (this.lastUpdateTick == Main.tick)
        return true;
    this.lastUpdateTick = Main.tick;

    

	return true;
};

