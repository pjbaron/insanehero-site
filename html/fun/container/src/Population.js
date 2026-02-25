"use strict";


function Population()
{
    Container.call( this );
}


/// Population extends Container
Population.prototype = Object.create( Container.prototype );
Population.prototype.constructor = Container;


Population.prototype.create = function( _everything )
{
    var entities = [];

    // create the entire Container hierarchy described in PopulationData
    // using this object as the 'rootPopulation' container
    Container.prototype.containerise.call( this, "Population", PopulationData, _everything, function( _who )
    {
        entities.push( _who );

        if (_who.properties && _who.properties.location)
        {
            var room = World.get( _who.properties.location );
            _who.properties.room = room;
            // add the Container to the appropriate World location from properties.location (string)
            console.log("linked " + _who.key + " to " + room.key);
            if (!room)
            {
                console.warn("Game.create: cannot add " + _who.key + " without a valid properties.location!");
            }
        }
    } );

    Container.mergeProperties( entities, EntityData );
};


Population.prototype.destroy = function()
{
    Container.prototype.destroy.call(this);
};


Population.prototype.update = function()
{
    Container.prototype.update.call(this, this.updateEntity);
    return true;
}


RR.temp_totalRoomsVisited = 0;

Population.prototype.updateEntity = function()
{
    if (this.properties && this.properties.type == ContainerType.entity)
    {
        // TODO: this should be in World I think?
        function pickAdjacentRoom( _room )
        {
            var links = _room.links;
            if (links && links.length > 0)
            {
                var l = links.length;
                var least = Number.MAX_VALUE;
                var adjacent = null;
                for(var i = 0; i < l; i++)
                {
                    var room = World.get(links[i]);
                    if (room.visitCount === undefined)
                    {
                        RR.temp_totalRoomsVisited++;
                        //console.log(RR.temp_totalRoomsVisited);
                        room.visitCount = 0;
                    }
                    if (room.visitCount < least)
                    {
                        least = room.visitCount;
                        adjacent = room;
                    }
                }
                return adjacent;
            }
            return null;
        }

        // TODO: temporary hack - player update
        if (this.key == "player")
        {
            if (!this.properties.destination)
            {
                this.properties.destination = pickAdjacentRoom(this.properties.room);
            }
            this.properties.room = this.properties.destination;
            this.properties.location = this.properties.room.key;
            this.properties.room.visitCount++;
            this.properties.destination = null;
        }

    }
    return true;
};


Population.get = function( _name )
{
    return Container.find( _name );
};

