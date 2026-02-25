"use strict";


// TODO: frozen... move variables to instances in PopulationData, these are entity _type_ descriptions so they're read-only
var EntityData = 
{
    player:
    {
        name: "Player",
        speed: 5,
        health: 10,
    }
}

Object.freeze(EntityData);


var PopulationData =
{
    rootPopulation:
    {
        properties:
        {
            type: ContainerType.data,
            name: "World Population",
        },
        children:
        {
            player:
            {
                properties:
                {
                    type: ContainerType.entity,
                    location: "startRoom",
                    // properties will be merged from RoomData with the name of this container ('player')
                },
                children:
                {
                    inventory:
                    {
                        properties:
                        {
                            type: ContainerType.data,
                            name: "Inventory",
                        },
                        children:
                        {
                            haversack:
                            {
                                properties:
                                {
                                    type: ContainerType.item,
                                    name: "Haversack",
                                    childLimit: 8,        // TODO: implement restriction in Container
                                },
                                children:
                                {
                                    rustyKnife:
                                    {
                                        properties:
                                        {
                                            type: ContainerType.item,
                                            name: "An old rusty knife",
                                        },
                                        children:
                                        {
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },

        }
    },


    find: function( _key )
    {
        //console.log("PopulationData.find " + _key);
        return PopulationData._find( _key, PopulationData );
    },

    _find: function( _key, _object)
    {
        for(var key in _object)
        {
            if (key == _key)
                return _object[key];
            if (_object[key] && (key == "children" || _object[key].children !== undefined))
            {
                var found = PopulationData._find( _key, _object[key] );
                if (found)
                    return found;
            }
        }
        return null;
    }
   
};