


RR.MapCreate = {};


RR.MapCreate.createMap = function( _start, _numberRooms )
{
    console.log("Creating " + _numberRooms + " rooms");

    var parent = WorldData.find( _start );

    var startRoom = RR.MapCreate.createRoom( "startRoom" );
    parent.children[ startRoom.key ] = startRoom;
    var bounds = [ RR.MapCreate.getBounds(startRoom) ];

    var rooms = [ startRoom ];
    for(var i = 0; i < _numberRooms; i++)
    {
        // pick a plan type for the new room
        var planKey = RR.MapCreate.pickRoomPlan();
        var plan = RoomData[planKey];

        // pick a room that we created previously
        var existingRoom = RR.MapCreate.pickExistingRoom( rooms );

        // pick a door in that room
        var doorData = RR.MapCreate.pickDoor( existingRoom );
        if (!doorData)
        {
            // no available doors...
            i--;
            continue;
        }
        var existingDoorName = doorData.name;

        // pick a door that matches (aligns with) that door we just picked
        var myDoorName = RR.MapCreate.pickMatchingDoor( existingRoom, existingDoorName, planKey );
        if (!myDoorName)
        {
            // there is no suitable door...
            i--;
            continue;
        }

        // TODO: check that the new room plan won't overlap any existing rooms
        var bounds = plan.bounds;
        
        
        // create the room instance
        // (also clones the plan door structure into the instance)
        var room = RR.MapCreate.createRoom( planKey );
        rooms.push( room );

        RR.MapCreate.connectRoom(room, myDoorName, existingRoom, existingDoorName);

        // add it to the WorldData
        parent.children[ room.key ] = room;

        console.log("[room " + i + "] = " + room.key + " uses plan: " + planKey);
    }
}


RR.MapCreate.pickRoomPlan = function()
{
    var t = Math.floor(Math.random() * Object.keys( RoomData ).length);
    var planKey = Object.keys(RoomData)[ t ];
    return planKey;
}


RR.MapCreate.pickExistingRoom = function( rooms )
{
    // pick an existing room with at least one door
    var existingRoom;
    var existingProperties;
    do{
        var r = Math.floor( Math.random() * rooms.length );
        existingRoom = rooms[ r ];
        existingProperties = existingRoom.properties;
    } while(!existingProperties.doors || existingProperties.doors.length == 0);
    return existingRoom;
}


RR.MapCreate.pickDoor = function( _room )
{
    // pick an unconnected door from that room
    var door = null;
    var keys = Object.keys(_room.properties.doors);
    var c = 20;
    do{
        var k = Math.floor(Math.random() * keys.length);
        if (_room.doors)
        {
            door = _room.doors[ keys[k] ];
        }
        else
        {
            door = null;
        }
    }while(door && door.link && c-- > 0);

    if (c < 0)
    {
        return null;
    }
    return { name: keys[k], door: door };
}


RR.MapCreate.pickMatchingDoor = function( _room, _doorName, _planName )
{
    function doorOrientation( planName, doorName )
    {
        var plan = RoomData[planName];
        var wi = plan.doors[doorName].wall * 2;
        var sx = plan.baseData[wi + 0];
        var sy = plan.baseData[wi + 1];
        wi += 2;
        if (wi >= plan.baseData.length)
            wi = 0;
        var ex = plan.baseData[wi + 0];
        var ey = plan.baseData[wi + 1];
        var dx = Math.sign(ex - sx);
        var dy = Math.sign(ey - sy);
        return { x: dx, y: dy };
    }

    // find a suitable door to connect this new room with the existingRoom
    // TODO: only works with orthogonally aligned doors (?)
    var roomDoorOrientation = doorOrientation(_room.properties.planKey, _doorName);
    var roomPlan = RoomData[_planName];

    var myDoorName = "";
    for(var d in roomPlan.doors)
    {
        var planDoorOrientation = doorOrientation(_planName, d);
        if (roomDoorOrientation.x == -planDoorOrientation.x && roomDoorOrientation.y == -planDoorOrientation.y)
        {
            myDoorName = d;
            break;
        }
    }

    // there might not be a suitable door... try again
    if (myDoorName == "")
    {
        return null;
    }
    return myDoorName;
}


RR.MapCreate.connectRoom = function( _room, _doorName, _connectedRoom, _connectedDoorName )
{
    var myDoor = _room.doors[_doorName];

    // connect _room to the _connectedRoom
    myDoor.clip = {
        type: DoorType.open,
        mine: _doorName,
        from: _connectedRoom.key + "_" + _connectedDoorName,
        x: 0,
        y: 0,
        z: 0,
    };
    _room.links.push( _connectedRoom.key );
    myDoor.link = _connectedRoom.key;

    // connect the _connectedRoom to _room (bi-directional room links)
    var existingDoor = _connectedRoom.doors[_connectedDoorName];
    _connectedRoom.links.push( _room.key );
    existingDoor.link = _room.key;
}


RR.MapCreate.createRoom = function( _planKey )
{
    // create a unique name for the room by extending the _planKey string
    var roomName = _planKey;
    while(WorldData.find( roomName ))
    {
        roomName = _planKey.concat( Math.floor( Math.random() * 100000 ).toString() );
    }

    // create a new room instance based on this plan
    var room = { key: roomName, properties: null, children: null, links: null, doors: null };
    room.properties = RoomData[ _planKey ];
    room.properties.type = ContainerType.room;
    room.properties.planKey = _planKey;
    room.children = {};
    room.links = [];

    function cloneDoors( _doors )
    {
        var clone = Object.assign({}, _doors);
        for(var d in _doors)
        {
            clone[d] = Object.assign({}, _doors[d]);
        }
        return clone;
    }
    // clone the 'doors' structure from the plan to this new room instance
    room.doors = cloneDoors( RoomData[_planKey].doors );

    return room;
}


RR.MapCreate.getBounds = function( _room )
{

}
