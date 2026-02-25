"use strict";


function World()
{
    Container.call( this );
}


/// World extends Container
World.prototype = Object.create( Container.prototype );
World.prototype.constructor = Container;


World.prototype.create = function( _everything, _numberRooms )
{
    // prepare the pre-existing map data
    //this.prepareMapData( _everything );

    // create the map as children of the named node
    RR.MapCreate.createMap( "startDistrict", _numberRooms );

    // prepare the complete map
    this.prepareMapData( _everything );
}


World.prototype.prepareMapData = function( _everything )
{
    var rooms = [];

    // create the entire Container hierarchy described in WorldData
    // using this object as the 'rootWorld' container
    Container.prototype.containerise.call( this, "World", WorldData, _everything, function( _room )
    {
        if (_room.properties.type == ContainerType.room)
            rooms.push( _room );
    } );

    // for all rooms, if there is corresponding roomdata for the properties, merge it in: with overwrite
    Container.mergeProperties( rooms, RoomData );
}


World.prototype.destroy = function()
{
    Container.prototype.destroy.call(this);
}


World.prototype.update = function()
{
    Container.prototype.update.call(this);
	return true;
}


World.get = function( _name )
{
    return Container.find( _name );
}

