"use strict";


/// types of doorways
var DoorType =
{
    open: 0,
    closed: 1,
    hidden: 2,
    locked: 3,
};


var ContainerType =
{
    invalid: 0,
    data: 1,
    room: 2,
    entity: 3,
    item: 4,
};


// plans for all available room types
var RoomData =
{
    startRoom:
    {
        name: "Square Room",
        bounds: { lft: -3, rgt: +3, top: +3, bot: -3 },
        artStyle: "Dungeon",
        baseData: [3,-3, 3,3, -3,3, -3,-3],
        doors:
        {
            door0: { width: 1.0, height: 1.8, left: 1.0, wall: 0 },
            door1: { width: 1.0, height: 1.8, left: 1.0, wall: 1 },
            door2: { width: 1.0, height: 1.8, left: 1.0, wall: 2 },
            door3: { width: 1.0, height: 1.8, left: 1.0, wall: 3 },
        },
    },
    firstPassage:
    {
        name: "First Passage",
        bounds: { lft: -1, rgt: +1, top: +5, bot: -4 },
        artStyle: "Dungeon",
        baseData: [1,-4, 1,5, -1,5, -1,-4],
        doors:
        {
            door1: { width: 1.0, height: 1.8, left: 0.5, wall: 1 },
            door3: { width: 1.0, height: 1.8, left: 0.5, wall: 3 },
        },
    },
    sidewaysPassage:
    {
        name: "Sideways Passage",
        bounds: { lft: -4, rgt: +5, top: +1, bot: -1 },
        artStyle: "Dungeon",
        baseData: [5,-1, 5,1, -4,1, -4,-1],
        doors:
        {
            door0: { width: 1.0, height: 1.8, left: 0.5, wall: 0 },
            door2: { width: 1.0, height: 1.8, left: 0.5, wall: 2 },
        },
    },
}

Object.freeze(RoomData);


/// hierarchy of containers that define the world
var WorldData =
{
    rootWorld:
    {
        parent: null,
        properties:
        {
            type: ContainerType.data,
            name: "Everything",
        },
        children:
        {
            startWorld:
            {
                parent: null,
                properties:
                {
                    type: ContainerType.data,
                    name: "Start World Map",
                },
                children:
                {
                    startDistrict:
                    {
                        parent: null,
                        properties:
                        {
                            type: ContainerType.data,
                            name: "Start District Map",
                        },
                        children:
                        {
                        }
                    }
                }
            }
        }
    },

    find: function( _key )
    {
        //console.log("WorldData.find " + _key);
        return WorldData._find( _key, WorldData );
    },

    _find: function( _key, _object)
    {
        for(var key in _object)
        {
            if (key == _key)
                return _object[key];
            if (_object[key] && (key == "children" || _object[key].children !== undefined))
            {
                var found = WorldData._find( _key, _object[key] );
                if (found)
                    return found;
            }
        }
        return null;
    }

};
