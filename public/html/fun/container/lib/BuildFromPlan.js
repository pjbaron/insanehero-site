"use strict";


// static class (at least for now...)
RR.BuildFromPlan = {};


// TODO: clean up by making it more modular, better variable names, cleaner logic... code taken from BabylonJS site and then mucked around.  It's a mess.
RR.BuildFromPlan.buildRoom = function( _name, _room )
{
    var _plan = _room.properties;

    //console.log("building " + _name);

    // helper functions
    var corner = function (x, y) {
        return new BABYLON.Vector3(x, 0, y);
    }
    
    var window = function(width, height) {
        this.width = width;
        this.height = height;
        this.left = 0;
        this.top = 0;
    }
    
    var windowSpace = function(window, left, top) {
        this.window = window;
        this.left = left;
        this.top = top;
    }
    
    var wall = function(corner, doorSpaces, windowSpaces) {
        this.corner = corner;
        this.doorSpaces = doorSpaces || [];
        this.windowSpaces = windowSpaces || []; 
    }


    // coordinates of the floorplan corners
    // NOTE: winding dictates inside/outside... counter-clockwise from above
    var baseData = _plan.baseData;

    var corners = [];
    for(var b = 0; b < baseData.length/2; b++) {
        corners.push(new corner(baseData[2*b], baseData[2*b + 1]));
    }
    
    // define the walls from the corner data
    var walls = [];
    for(var c=0; c<corners.length; c++)
    {
        walls.push(new wall(corners[c]));
    }
    
    // add the holes into the walls
    for(var w in _plan.windows)
    {
        var data = _plan.windows[w];
        var size = new window(data.width, data.height);
        var space = new windowSpace(size, data.left, data.top);
        var wall = data.wall;
        if (!walls[wall].windowSpaces)
            walls[wall].windowSpaces = [];
        walls[wall].windowSpaces.push(space);
    }
    for(var d in _plan.doors)
    {
        var door = _plan.doors[d];
        var wall = door.wall;
        if (!walls[wall].doorSpaces)
            walls[wall].doorSpaces = [];
        walls[wall].doorSpaces.push({ name: d, door: door, room: _room });
    }

    
    var ply = 0.3;
    var height = 3.2;

    var house = RR.BuildFromPlan._buildModel(walls, ply, height, {interiorUV: new BABYLON.Vector4(0.167, 0, 1, 1), exteriorUV: new BABYLON.Vector4(0, 0, 0.16, 1)}, this.scene);
    
    var mat = new BABYLON.StandardMaterial("", this.scene);
    mat.diffuseTexture = new BABYLON.Texture("http://i.imgur.com/88fOIk3.jpg", this.scene);
    
    house.material = mat;

/*
    //*************Roof Construction*********************************
    var roofBaseData = [-3, -2,  -1, -4,  1, -4,  3, -2,  3, 3,  -3, 3];
    
    var smallRoofBaseData = [0, -2,  5, -2,  5, 1,  0, 1];
    
    var roofApexData = [0, -2, 0, 2];

    var smallRoofApexData = [0, -0.5,  4.5, -0.5];
    
    //Construct corners for two roof structures
    var mainCorners = [];
    for(var b = 0; b < roofBaseData.length/2; b++) {
        mainCorners.push(new corner(roofBaseData[2*b], roofBaseData[2*b + 1]));
    }
    
    var smallCorners = [];
    for(var b = 0; b < smallRoofBaseData.length/2; b++) {
        smallCorners.push(new corner(smallRoofBaseData[2*b], smallRoofBaseData[2*b + 1]));
    }
    
    var overhang = 0.2;
    var overlap = ply + overhang;
    

    var wholeRoofprint = RR.roofprint(corners, overlap, height);
    var mainRoofprint = RR.roofprint(mainCorners, overlap, height);
    var smallRoofprint = RR.roofprint(smallCorners, overlap, height);
    
    var ceiling = RR.roofFloor(wholeRoofprint, this.scene);
    
    var apexes = [];
    
    for(var i = 0; i < roofApexData.length / 2; i++) {
        apexes.push(new BABYLON.Vector2(roofApexData[2 * i], roofApexData[2 * i + 1]))
    }
    
    var smallApexes = [];
    
    for(var i = 0; i < smallRoofApexData.length / 2; i++) {
        smallApexes.push(new BABYLON.Vector2(smallRoofApexData[2 * i], smallRoofApexData[2 * i + 1]))
    }
    
    var planes = [
        ["C0", "C1", "A0"],
        ["C1", "C2", "A0"],
        ["C2", "C3", "A0"],
        ["C3", "C4", "A1", "A0"],
        ["C4", "C5", "A1"],
        ["C5", "C0", "A0", "A1"]
    ];
    
    var smallPlanes = [
        ["C0", "C1", "A1", "A0"],
        ["C1", "C2", "A1"],
        ["C2", "C3", "A0", "A1"]
    ];
    
    var roofSection = RR.roof(mainRoofprint, apexes, planes, 2, height, 5.1, this.scene);
    var smallRoofSection = RR.roof(smallRoofprint, smallApexes, smallPlanes, 2, height - 1, 5.1, this.scene);
    
    var roofMat = new BABYLON.StandardMaterial("tiles", this.scene);
    roofMat.diffuseTexture = new BABYLON.Texture("https://i.imgur.com/9SH16GZ.jpg", this.scene);
    roofMat.bumpTexture = new BABYLON.Texture("https://i.imgur.com/9SH16GZ.jpg", this.scene);
    
    roofSection.material = roofMat;
    smallRoofSection.material = roofMat;
*/

    return house;
}


RR.BuildFromPlan.setLocation = function( _room )
{
    var position = { x:0, y:0, z:0 };
    var _plan = _room.properties;

    // find the door with a clip
    var clip = null;
    for(var d in _room.doors)
    {
        var door = _room.doors[d];
        if (door.clip)
        {
            clip = door.clip;
            //console.log("clip " + _room.key, clip);
            break;
        }
    }

    if (clip)
    {
        // get the name of the room and door that this clip is connected to
        var bits = clip.from.split("_", 2);
        var connectedRoomName = bits[0];
        var doorName = bits[1];

        // find the connected room container
        var connectedRoom = Container.find(connectedRoomName);
        var connectedRoomDoors = connectedRoom.doors;
        if (connectedRoomDoors)
        {
            // find the door that this clip is connected to
            var connection = connectedRoomDoors[doorName];
            // check if it has been built and placed yet
            if (connection && connection.outerCorners)
            {
                // get the door in this room
                var myDoor = _room.doors[clip.mine];
                // check if it has been built and placed yet
                if (myDoor && myDoor.outerCorners)
                {
                    //console.log("door " + clip.mine + " ", myDoor);
                    //console.log("from " + doorName + " ", connection);

                    var mx = (myDoor.innerCorners[0].x + myDoor.innerCorners[3].x) / 2;
                    var my = (myDoor.innerCorners[0].y + myDoor.innerCorners[3].y) / 2;
                    var mz = (myDoor.innerCorners[0].z + myDoor.innerCorners[3].z) / 2;
                    var px = (connection.outerCorners[0].x + connection.outerCorners[3].x) / 2;        // ERROR TAG 1
                    var py = (connection.outerCorners[0].y + connection.outerCorners[3].y) / 2;
                    var pz = (connection.outerCorners[0].z + connection.outerCorners[3].z) / 2;
                    var offset = connectedRoom.offset;
                    if (offset)
                    {
                        position.x = offset.x;
                        position.y = offset.y;
                        position.z = offset.z;
                    }
                    position.x += px - mx;
                    position.y += py - my;
                    position.z += pz - mz;
                    _room.offset = position;
                    return position;
                }
                else
                {
                    console.warn("room " + _room.key + " door " + clip.mine + " not created yet!");
                }
            }
            else
            {
                console.warn("connected room " + connectedRoom.key + " door " + doorName + " not created yet!");
            }
        }
    }
    else
    {
        //console.log("*** no clip *** " + _room.key);
    }
    return null;
}


/// https://doc.babylonjs.com/snippets/house_use
RR.BuildFromPlan._buildModel = function(walls, ply, height, options, scene)
{
    //Arrays for vertex positions and indices
    var positions = [];
    var indices = [];
    var uvs = [];
    var colors = [];

    var interiorUV = options.interiorUV || new BABYLON.Vector4(0, 0, 1, 1);
    var exteriorUV = options.exteriorUV || new BABYLON.Vector4(0, 0, 1, 1);

    var interiorColor = options.interiorColor || new BABYLON.Color4(1, 1, 1, 1);
    var exteriorColor = options.exteriorColor || new BABYLON.Color4(1, 1, 1, 1);        
    var interior = options.interior || false;
    if (!interior)
    {
        walls.push(walls[0]);
    }

    var interiorIndex;

    //Arrays to hold wall corner data 
    var innerBaseCorners = [];
    var outerBaseCorners = [];
    var innerTopCorners = [];
    var outerTopCorners = [];
    var innerDoorCorners = [];
    var outerDoorCorners = [];
    var innerWindowCorners = [];
    var outerWindowCorners = [];

    var angle = 0;
    var direction = 0;

        var line = BABYLON.Vector3.Zero();
        var nextLine = BABYLON.Vector3.Zero();        

        var nbWalls = walls.length;
        if(nbWalls === 2)
        {
            walls[1].corner.subtractToRef(walls[0].corner, line);
            var lineNormal = new BABYLON.Vector3(line.z, 0, -1 * line.x).normalize();
            line.normalize();
            innerBaseCorners[0] = walls[0].corner;
            outerBaseCorners[0] = walls[0].corner.add(lineNormal.scale(ply));
            innerBaseCorners[1] = walls[1].corner;
            outerBaseCorners[1] = walls[1].corner.add(lineNormal.scale(ply));
        }
        else if(nbWalls > 2)
        { 
            for(var w = 0; w < nbWalls - 1; w++)
            {
                walls[w + 1].corner.subtractToRef(walls[w].corner, nextLine);
                angle = Math.PI - Math.acos(BABYLON.Vector3.Dot(line, nextLine)/(line.length() * nextLine.length()));            
                direction = BABYLON.Vector3.Cross(nextLine, line).normalize().y;            
                lineNormal = new BABYLON.Vector3(line.z, 0, -1 * line.x).normalize();
                line.normalize();
                innerBaseCorners[w] = walls[w].corner
                outerBaseCorners[w] = walls[w].corner.add(lineNormal.scale(ply)).add(line.scale(direction * ply/Math.tan(angle/2)));        
                line = nextLine.clone();
            } 
            if(interior)
            {
                lineNormal = new BABYLON.Vector3(line.z, 0, -1 * line.x).normalize();
                line.normalize();
                innerBaseCorners[nbWalls - 1] = walls[nbWalls - 1].corner
                outerBaseCorners[nbWalls - 1] = walls[nbWalls - 1].corner.add(lineNormal.scale(ply));
                walls[1].corner.subtractToRef(walls[0].corner, line);
                lineNormal = new BABYLON.Vector3(line.z, 0, -1 * line.x).normalize();
                line.normalize();
                innerBaseCorners[0] = walls[0].corner;
                outerBaseCorners[0] = walls[0].corner.add(lineNormal.scale(ply));
            }
            else
            {
                walls[1].corner.subtractToRef(walls[0].corner, nextLine);
                angle = Math.PI - Math.acos(BABYLON.Vector3.Dot(line, nextLine)/(line.length() * nextLine.length()));
                direction = BABYLON.Vector3.Cross(nextLine, line).normalize().y;            
                lineNormal = new BABYLON.Vector3(line.z, 0, -1 * line.x).normalize();
                line.normalize();
                innerBaseCorners[0] = walls[0].corner
                outerBaseCorners[0] = walls[0].corner.add(lineNormal.scale(ply)).add(line.scale(direction * ply/Math.tan(angle/2)));
                innerBaseCorners[nbWalls - 1] = innerBaseCorners[0];
                outerBaseCorners[nbWalls - 1] = outerBaseCorners[0];
            }       
        }

    // inner and outer top corners
    for(var w = 0; w < nbWalls; w++)
    {
        innerTopCorners.push(new BABYLON.Vector3(innerBaseCorners[w].x, height, innerBaseCorners[w].z));
        outerTopCorners.push(new BABYLON.Vector3(outerBaseCorners[w].x, height, outerBaseCorners[w].z));
    }

    var maxL = 0;
    for(w = 0; w < nbWalls - 1; w++)
    {
        maxL = Math.max(innerBaseCorners[w + 1].subtract(innerBaseCorners[w]).length(), maxL);
    }

    var maxH = height; // for when gables introduced

    /******House Mesh Construction********/

    // Wall Construction
    var polygonCorners;
    var polygonTriangulation;
    var wallData;
    var wallDirection = BABYLON.Vector3.Zero();
    var wallNormal = BABYLON.Vector3.Zero(); 
    var wallLength;
    var exteriorWallLength;
    var doorData;
    var windowData;
    var uvx, uvy;
    var wallDiff;

    for(var w = 0; w < nbWalls - 1; w++)
    {
        walls[w + 1].corner.subtractToRef(walls[w].corner, wallDirection);
        wallLength = wallDirection.length();
        wallDirection.normalize();
        wallNormal.x = wallDirection.z;
        wallNormal.z = -1 * wallDirection.x;
        exteriorWallLength = outerBaseCorners[w + 1].subtract(outerBaseCorners[w]).length();
        wallDiff = exteriorWallLength - wallLength;
        var gableHeight = 0;

        var compareLeftDoor = function(a, b)
        {
            return a.door.left - b.door.left
        }

        //doors
        if (walls[w].doorSpaces)
        {
            walls[w].doorSpaces.sort(compareLeftDoor);
        }

        //Construct INNER wall polygon starting from (0, 0) using wall length and height and door data
        polygonCorners = [];
        polygonCorners.push(new BABYLON.Vector2(0, 0));

        var doors = walls[w].doorSpaces.length;
        for (var d = 0; d < doors; d++)
        {
            var doorSpace = walls[w].doorSpaces[d].door;
            polygonCorners.push(new BABYLON.Vector2(doorSpace.left, 0));
            polygonCorners.push(new BABYLON.Vector2(doorSpace.left, doorSpace.height));
            polygonCorners.push(new BABYLON.Vector2(doorSpace.left + doorSpace.width, doorSpace.height));
            polygonCorners.push(new BABYLON.Vector2(doorSpace.left + doorSpace.width, 0));
        }

        polygonCorners.push(new BABYLON.Vector2(wallLength, 0));
        polygonCorners.push(new BABYLON.Vector2(wallLength, height));
        polygonCorners.push(new BABYLON.Vector2(0, height));

        //Construct triangulation of polygon using its corners
        polygonTriangulation = new BABYLON.PolygonMeshBuilder("", polygonCorners, scene);    

        //windows
        //Construct holes and add to polygon from window data            
        var windows = walls[w].windowSpaces.length;
        for(var ws = 0; ws < windows; ws++)
        {
            var windowSpace = walls[w].windowSpaces[ws];
            var holeData = [
                new BABYLON.Vector2(windowSpace.left, height - windowSpace.top - windowSpace.window.height),
                new BABYLON.Vector2(windowSpace.left + windowSpace.window.width, height - windowSpace.top - windowSpace.window.height),
                new BABYLON.Vector2(windowSpace.left + windowSpace.window.width, height - windowSpace.top),
                new BABYLON.Vector2(windowSpace.left, height - windowSpace.top)
            ];
            polygonTriangulation.addHole(holeData);
        }


        // wallBuilder produces wall vertex positions array and indices using the current and next wall to rotate and translate vertex positions to correct place
        wallData = polygonTriangulation.wallBuilder(walls[w], walls[w + 1]);    

        var nbIndices = positions.length/3; // current number of indices

        polygonTriangulation._points.elements.forEach(function (p)  {
            uvx = interiorUV.x + p.x * (interiorUV.z - interiorUV.x) / maxL;
            uvy = interiorUV.y + p.y * (interiorUV.w - interiorUV.y) / height;
            uvs.push(uvx, uvy);                    
            colors.push(interiorColor.r, interiorColor.g, interiorColor.b, interiorColor.a);
        });

        //Add inner wall positions (repeated for flat shaded mesh)
        positions = positions.concat(wallData.positions);

        interiorIndex = positions.length/3;

        indices = indices.concat(wallData.indices.map(function(idx){
            return idx + nbIndices;
        }));

        //wallData has format for inner wall [base left, 0 or more doors, base right, top right, top left, windows]
        //extract door and wall data

        windowData = wallData.positions.slice(12 * (doors + 1)); //4 entries per door + 4 entries for wall corners, each entry has 3 data points
        doorData = wallData.positions.slice(3, 3 * (4 * doors + 1) ); 

        //For each inner door save corner as an array of four Vector3s, base left, top left, top right, base right
        //Extend door data outwards by ply and save outer door corners         
        var doorCornersIn = [];
        var doorCornersOut = [];
        for(var p = 0; p < doorData.length/12; p++) {
            var doorsIn = [];
            var doorsOut = [];
            for(var d = 0; d < 4; d ++) {
                doorsIn.push(new BABYLON.Vector3(doorData[3 * d + 12 * p], doorData[3 * d  + 12 * p + 1], doorData[3 * d + 12 * p + 2]));
                doorData[3 * d + 12 * p] += ply * wallNormal.x;
                doorData[3 * d + 12 * p + 2] += ply * wallNormal.z;
                doorsOut.push(new BABYLON.Vector3(doorData[3 * d + 12 * p], doorData[3 * d  + 12 * p + 1], doorData[3 * d + 12 * p + 2]));
            }
            doorCornersIn.push(doorsIn);
            doorCornersOut.push(doorsOut);
        }            
        innerDoorCorners.push(doorCornersIn);            
        outerDoorCorners.push(doorCornersOut);

        //For each inner window save corner as an array of four Vector3s, base left, top left, top right, base right
        //Extend window data outwards by ply and save outer window corners         
        var windowCornersIn = [];
        var windowCornersOut = [];
        for(var p = 0; p < windowData.length/12; p++) {
            var windowsIn = [];
            var windowsOut = [];
            for(var d = 0; d < 4; d ++) {
                windowsIn.push(new BABYLON.Vector3(windowData[3 * d + 12 * p], windowData[3 * d  + 12 * p + 1], windowData[3 * d + 12 * p + 2]));
                windowData[3 * d + 12 * p] += ply * wallNormal.x;
                windowData[3 * d + 12 * p + 2] += ply * wallNormal.z;
                windowsOut.push(new BABYLON.Vector3(windowData[3 * d + 12 * p], windowData[3 * d  + 12 * p + 1], windowData[3 * d + 12 * p + 2]));
            }
            windowCornersIn.push(windowsIn);
            windowCornersOut.push(windowsOut);
        }            
        innerWindowCorners.push(windowCornersIn);            
        outerWindowCorners.push(windowCornersOut);

        //Construct OUTER wall facet positions from inner wall 
        //Add outer wall corner positions back to wallData positions
        wallData.positions = [];

        wallData.positions.push(outerBaseCorners[w].x, outerBaseCorners[w].y, outerBaseCorners[w].z);
        wallData.positions = wallData.positions.concat(doorData);            
        wallData.positions.push(outerBaseCorners[w + 1].x, outerBaseCorners[w + 1].y, outerBaseCorners[(w + 1) % nbWalls].z);
        wallData.positions.push(outerTopCorners[w + 1].x, outerTopCorners[w + 1].y, outerTopCorners[(w + 1) % nbWalls].z);
        wallData.positions.push(outerTopCorners[w].x, outerTopCorners[w].y, outerTopCorners[w].z);
        wallData.positions = wallData.positions.concat(windowData);

        //Calulate exterior wall uvs
        polygonTriangulation._points.elements.forEach(function (p)  {
            if (p.x == 0) {
                uvx = exteriorUV.x;
            }
            else if (wallLength - p.x < 0.000001) {
                uvx = exteriorUV.x + (wallDiff + p.x) * (exteriorUV.z - exteriorUV.x) / (maxL + wallDiff)
            }
            else {
                uvx = exteriorUV.x + (0.5 * wallDiff + p.x) * (exteriorUV.z - exteriorUV.x) / (maxL + wallDiff);
            }
            uvy = exteriorUV.y + p.y * (exteriorUV.w - exteriorUV.y) / height;
            uvs.push(uvx, uvy);                    
        });

        nbIndices = positions.length/3; // current number of indices

        //Add outer wall positions, uvs and colors (repeated for flat shaded mesh)
        positions = positions.concat(wallData.positions);


        //Reverse indices for correct normals
        wallData.indices.reverse();

        indices = indices.concat(wallData.indices.map(function(idx){
            return idx + nbIndices;
        }));

        //Construct facets for base and door top and door sides, repeating positions for flatshaded mesh
        var doorsRemaining = doors;
        var doorNb = 0;

        if (doorsRemaining > 0)
        {
            //base
            nbIndices = positions.length/3; // current number of indices

            var ib = innerBaseCorners[w];
            var id = innerDoorCorners[w][doorNb][0];
            var ob = outerBaseCorners[w];
            var od = outerDoorCorners[w][doorNb][0];

            positions.push(ib.x, ib.y, ib.z); //tl
            positions.push(ob.x, ob.y, ob.z); //bl
            positions.push(id.x, id.y, id.z); //tr
            positions.push(od.x, od.y, od.z); //br

            // add location of corners of each door to a new object 'doors' in the _room_ instance data (not in the room plan!)
            var doorSpace = walls[w].doorSpaces[doorNb];
            if (!doorSpace.room.doors)
            {
                doorSpace.room.doors = {};
            }
            // NOTE: use the original door name from the room plan
            if (!doorSpace.room.doors[doorSpace.name])
            {
                doorSpace.room.doors[doorSpace.name] = {};
            }
            doorSpace.room.doors[doorSpace.name].innerCorners = innerDoorCorners[w][doorNb];
            doorSpace.room.doors[doorSpace.name].outerCorners = outerDoorCorners[w][doorNb];
            //console.log("room " + doorSpace.room.key + " door " + doorSpace.name + " has been positioned");

            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left
            uvs.push(exteriorUV.x, exteriorUV.y); //base Left                
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].doorSpaces[doorNb].door.left/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].doorSpaces[doorNb].door.left/maxL, exteriorUV.y); //base right

            indices.push(nbIndices, nbIndices + 2, nbIndices + 3, nbIndices + 3, nbIndices + 1, nbIndices);

            //left side
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerDoorCorners[w][doorNb][0].x, innerDoorCorners[w][doorNb][0].y, innerDoorCorners[w][doorNb][0].z); //br
            positions.push(innerDoorCorners[w][doorNb][1].x, innerDoorCorners[w][doorNb][1].y, innerDoorCorners[w][doorNb][1].z); //tr
            positions.push(outerDoorCorners[w][doorNb][0].x, outerDoorCorners[w][doorNb][0].y, outerDoorCorners[w][doorNb][0].z); //bl
            positions.push(outerDoorCorners[w][doorNb][1].x, outerDoorCorners[w][doorNb][1].y, outerDoorCorners[w][doorNb][1].z); //tl

            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].doorSpaces[doorNb].door.height/maxH); //top right
            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].doorSpaces[doorNb].door.height/maxH); //top Left

            indices.push(nbIndices, nbIndices + 1, nbIndices + 3, nbIndices, nbIndices + 3, nbIndices + 2);

            //top
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerDoorCorners[w][doorNb][1].x, innerDoorCorners[w][doorNb][1].y, innerDoorCorners[w][doorNb][1].z); //bl
            positions.push(innerDoorCorners[w][doorNb][2].x, innerDoorCorners[w][doorNb][2].y, innerDoorCorners[w][doorNb][2].z); //br
            positions.push(outerDoorCorners[w][doorNb][1].x, outerDoorCorners[w][doorNb][1].y, outerDoorCorners[w][doorNb][1].z); //tl
            positions.push(outerDoorCorners[w][doorNb][2].x, outerDoorCorners[w][doorNb][2].y, outerDoorCorners[w][doorNb][2].z); //tr

            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].doorSpaces[doorNb].door.width/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].doorSpaces[doorNb].door.width/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right

            indices.push(nbIndices + 2, nbIndices + 1, nbIndices + 3, nbIndices + 2, nbIndices, nbIndices + 1);

            //right side
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerDoorCorners[w][doorNb][2].x, innerDoorCorners[w][doorNb][2].y, innerDoorCorners[w][doorNb][2].z); //tl
            positions.push(innerDoorCorners[w][doorNb][3].x, innerDoorCorners[w][doorNb][3].y, innerDoorCorners[w][doorNb][3].z); //bl
            positions.push(outerDoorCorners[w][doorNb][2].x, outerDoorCorners[w][doorNb][2].y, outerDoorCorners[w][doorNb][2].z); //tr
            positions.push(outerDoorCorners[w][doorNb][3].x, outerDoorCorners[w][doorNb][3].y, outerDoorCorners[w][doorNb][3].z); //br

            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].doorSpaces[doorNb].door.height/maxH); //top Left
            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].doorSpaces[doorNb].door.height/maxH); //top right
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y); //base right

            indices.push(nbIndices, nbIndices + 3, nbIndices + 2, nbIndices, nbIndices + 1, nbIndices + 3);
        }
        doorsRemaining--;
        doorNb++;

        // there are multiple doors in the wall...
        while (doorsRemaining > 0 )
        {
            //base
            nbIndices = positions.length/3; // current number of indices

            var i3 = innerDoorCorners[w][doorNb - 1][3];
            var i0 = innerDoorCorners[w][doorNb][0];
            var o3 = outerDoorCorners[w][doorNb - 1][3];
            var o0 = outerDoorCorners[w][doorNb][0];

            positions.push(i3.x, i3.y, i3.z); //bl
            positions.push(i0.x, i0.y, i0.z); //br
            positions.push(o3.x, o3.y, o3.z); //tl
            positions.push(o0.x, o0.y, o0.z); //tr

            // add location of corners of each door to a new object 'doors' in the _room_ instance data (not in the room plan!)
            var doorSpace = walls[w].doorSpaces[doorNb];
            if (!doorSpace.room.doors)
            {
                doorSpace.room.doors = {};
            }
            // NOTE: use the original door name from the room plan
            if (!doorSpace.room.doors[doorSpace.name])
            {
                doorSpace.room.doors[doorSpace.name] = {};
            }
            doorSpace.room.doors[doorSpace.name].innerCorners = innerDoorCorners[w][doorNb];
            doorSpace.room.doors[doorSpace.name].outerCorners = outerDoorCorners[w][doorNb];
            //console.log("room " + doorSpace.room.key + " door " + doorSpace.name + " has been positioned");

            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * (walls[w].doorSpaces[doorNb].door.left - (walls[w].doorSpaces[doorNb - 1].door.left + walls[w].doorSpaces[doorNb - 1].door.width))/maxL/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * (walls[w].doorSpaces[doorNb].door.left - (walls[w].doorSpaces[doorNb - 1].door.left + walls[w].doorSpaces[doorNb - 1].door.width))/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right

            indices.push(nbIndices, nbIndices + 1, nbIndices + 3, nbIndices + 3, nbIndices + 2, nbIndices);

            //left side
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerDoorCorners[w][doorNb][0].x, innerDoorCorners[w][doorNb][0].y, innerDoorCorners[w][doorNb][0].z); //br
            positions.push(innerDoorCorners[w][doorNb][1].x, innerDoorCorners[w][doorNb][1].y, innerDoorCorners[w][doorNb][1].z); //tr
            positions.push(outerDoorCorners[w][doorNb][0].x, outerDoorCorners[w][doorNb][0].y, outerDoorCorners[w][doorNb][0].z); //bl
            positions.push(outerDoorCorners[w][doorNb][1].x, outerDoorCorners[w][doorNb][1].y, outerDoorCorners[w][doorNb][1].z); //tl

            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].doorSpaces[doorNb].door.height/maxH); //top right
            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].doorSpaces[doorNb].door.height/maxH); //top Left

            indices.push(nbIndices, nbIndices + 1, nbIndices + 3, nbIndices, nbIndices + 3, nbIndices + 2);

            //top
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerDoorCorners[w][doorNb][1].x, innerDoorCorners[w][doorNb][1].y, innerDoorCorners[w][doorNb][1].z); //bl
            positions.push(innerDoorCorners[w][doorNb][2].x, innerDoorCorners[w][doorNb][2].y, innerDoorCorners[w][doorNb][2].z); //br
            positions.push(outerDoorCorners[w][doorNb][1].x, outerDoorCorners[w][doorNb][1].y, outerDoorCorners[w][doorNb][1].z); //tl
            positions.push(outerDoorCorners[w][doorNb][2].x, outerDoorCorners[w][doorNb][2].y, outerDoorCorners[w][doorNb][2].z); //tr

            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].doorSpaces[doorNb].door.width/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].doorSpaces[doorNb].door.width/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right

            indices.push(nbIndices + 2, nbIndices + 1, nbIndices + 3, nbIndices + 2, nbIndices, nbIndices + 1);

            //right side
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerDoorCorners[w][doorNb][2].x, innerDoorCorners[w][doorNb][2].y, innerDoorCorners[w][doorNb][2].z); //tl
            positions.push(innerDoorCorners[w][doorNb][3].x, innerDoorCorners[w][doorNb][3].y, innerDoorCorners[w][doorNb][3].z); //bl
            positions.push(outerDoorCorners[w][doorNb][2].x, outerDoorCorners[w][doorNb][2].y, outerDoorCorners[w][doorNb][2].z); //tr
            positions.push(outerDoorCorners[w][doorNb][3].x, outerDoorCorners[w][doorNb][3].y, outerDoorCorners[w][doorNb][3].z); //br

            uvs.push(exteriorUV.x, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].doorSpaces[doorNb].door.height/maxH); //top Left
            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].doorSpaces[doorNb].door.height/maxH); //top right
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y); //base right

            indices.push(nbIndices, nbIndices + 3, nbIndices + 2, nbIndices, nbIndices + 1, nbIndices + 3);

            doorsRemaining--;
            doorNb++;
        } 

        doorNb--;
        nbIndices = positions.length/3; // current number of indices

        //final base
        if (doors > 0)
        {
            var ic = innerDoorCorners[w][doorNb][3];
            var ib = innerBaseCorners[w + 1];
            var oc = outerDoorCorners[w][doorNb][3];
            var ob = outerBaseCorners[w + 1];

            positions.push(ic.x, ic.y, ic.z);  //bl
            positions.push(ib.x, ib.y, ib.z);    //br
            positions.push(oc.x, oc.y, oc.z);  //tl
            positions.push(ob.x, ob.y, ob.z);  //tr

            // // add location of centre of door directly to the door data structure: it's very useful for linking rooms together...
            // walls[w].doorSpaces[doorNb].door.x = (ic.x + ib.x + oc.x + ob.x) / 4;
            // walls[w].doorSpaces[doorNb].door.y = (ic.y + ib.y + oc.y + ob.y) / 4;
            // walls[w].doorSpaces[doorNb].door.z = (ic.z + ib.z + oc.z + ob.z) / 4;

            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * (wallLength - (walls[w].doorSpaces[doorNb].door.left + walls[w].doorSpaces[doorNb].door.width))/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * (wallLength - (walls[w].doorSpaces[doorNb].door.left + walls[w].doorSpaces[doorNb].door.width))/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right
        }
        else
        {
            positions.push(innerBaseCorners[w].x, innerBaseCorners[w].y, innerBaseCorners[w].z); //bl
            positions.push(innerBaseCorners[w + 1].x, innerBaseCorners[w + 1].y, innerBaseCorners[w + 1].z); //br
            positions.push(outerBaseCorners[w].x, outerBaseCorners[w].y, outerBaseCorners[w].z); //tl
            positions.push(outerBaseCorners[w + 1].x, outerBaseCorners[w + 1].y, outerBaseCorners[w + 1].z); //tr

            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * wallLength/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * wallLength/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right

        }
        indices.push(nbIndices, nbIndices + 1, nbIndices + 3, nbIndices + 3, nbIndices + 2, nbIndices);

        //Construct facets for window base, top and sides, repeating positions for flatshaded mesh
        for (var ww = 0 ; ww < innerWindowCorners[w].length; ww++)
        {
            //left side
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerWindowCorners[w][ww][3].x, innerWindowCorners[w][ww][3].y, innerWindowCorners[w][ww][3].z); //tr
            positions.push(innerWindowCorners[w][ww][0].x, innerWindowCorners[w][ww][0].y, innerWindowCorners[w][ww][0].z); //br
            positions.push(outerWindowCorners[w][ww][3].x, outerWindowCorners[w][ww][3].y, outerWindowCorners[w][ww][3].z); //tl
            positions.push(outerWindowCorners[w][ww][0].x, outerWindowCorners[w][ww][0].y, outerWindowCorners[w][ww][0].z); //bl

            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].windowSpaces[ww].window.height/maxH); //top right
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].windowSpaces[ww].window.height/maxH); //top Left
            uvs.push(exteriorUV.x, exteriorUV.y); //base Left

            indices.push(nbIndices + 1, nbIndices, nbIndices + 3,  nbIndices + 2, nbIndices + 3, nbIndices);

            //base
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerWindowCorners[w][ww][0].x, innerWindowCorners[w][ww][0].y, innerWindowCorners[w][ww][0].z); //tl
            positions.push(innerWindowCorners[w][ww][1].x, innerWindowCorners[w][ww][1].y, innerWindowCorners[w][ww][1].z); //tr
            positions.push(outerWindowCorners[w][ww][0].x, outerWindowCorners[w][ww][0].y, outerWindowCorners[w][ww][0].z); //bl
            positions.push(outerWindowCorners[w][ww][1].x, outerWindowCorners[w][ww][1].y, outerWindowCorners[w][ww][1].z); //br

            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].windowSpaces[ww].window.width/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right
            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].windowSpaces[ww].window.width/maxL, exteriorUV.y); //base right

            indices.push(nbIndices + 1, nbIndices, nbIndices + 3, nbIndices + 3,nbIndices, nbIndices + 2);

            //right side
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerWindowCorners[w][ww][1].x, innerWindowCorners[w][ww][1].y, innerWindowCorners[w][ww][1].z); //bl
            positions.push(innerWindowCorners[w][ww][2].x, innerWindowCorners[w][ww][2].y, innerWindowCorners[w][ww][2].z); //tl
            positions.push(outerWindowCorners[w][ww][1].x, outerWindowCorners[w][ww][1].y, outerWindowCorners[w][ww][1].z); //br
            positions.push(outerWindowCorners[w][ww][2].x, outerWindowCorners[w][ww][2].y, outerWindowCorners[w][ww][2].z); //tr

            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].windowSpaces[ww].window.height/maxH); //top Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x), exteriorUV.y + (exteriorUV.w - exteriorUV.y) * walls[w].windowSpaces[ww].window.height/maxH); //top right

            indices.push(nbIndices + 1, nbIndices + 2, nbIndices + 3, nbIndices, nbIndices + 2, nbIndices + 1);

            //top
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerWindowCorners[w][ww][2].x, innerWindowCorners[w][ww][2].y, innerWindowCorners[w][ww][2].z); //br
            positions.push(innerWindowCorners[w][ww][3].x, innerWindowCorners[w][ww][3].y, innerWindowCorners[w][ww][3].z); //bl
            positions.push(outerWindowCorners[w][ww][2].x, outerWindowCorners[w][ww][2].y, outerWindowCorners[w][ww][2].z); //tr
            positions.push(outerWindowCorners[w][ww][3].x, outerWindowCorners[w][ww][3].y, outerWindowCorners[w][ww][3].z); //tl

            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].windowSpaces[ww].window.width/maxL, exteriorUV.y); //base right
            uvs.push(exteriorUV.x, exteriorUV.y); //base Left
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * walls[w].windowSpaces[ww].window.width/maxL, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right
            uvs.push(exteriorUV.x , exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left

            indices.push(nbIndices + 3, nbIndices, nbIndices + 2, nbIndices + 1, nbIndices, nbIndices + 3);
        }

        //Construction of top of wall facets
        nbIndices = positions.length/3; // current number of indices

        positions.push(innerTopCorners[w].x, innerTopCorners[w].y, innerTopCorners[w].z); //tl
        positions.push(innerTopCorners[w + 1].x, innerTopCorners[w + 1].y, innerTopCorners[w + 1].z); //tr
        positions.push(outerTopCorners[w].x, outerTopCorners[w].y, outerTopCorners[w].z); //bl
        positions.push(outerTopCorners[w + 1].x, outerTopCorners[w + 1].y, outerTopCorners[w + 1].z); //br

        uvx = exteriorUV.x + 0.5 * wallDiff * (exteriorUV.z - exteriorUV.x)/maxL;
        uvs.push(uvx, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top Left

        uvx = exteriorUV.x + (0.5 * wallDiff + wallLength) * (exteriorUV.z - exteriorUV.x)/maxL;
        uvs.push(uvx, exteriorUV.y + (exteriorUV.w - exteriorUV.y) * ply/maxH); //top right

        uvs.push(exteriorUV.x, exteriorUV.y); //base Left        
        uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * exteriorWallLength/(maxL + wallDiff), exteriorUV.y); //base right

        indices.push(nbIndices + 1, nbIndices, nbIndices + 3, nbIndices + 2, nbIndices + 3, nbIndices); 

        for(var p = interiorIndex; p < positions.length/3; p++)
        {
            colors.push(exteriorColor.r, exteriorColor.g, exteriorColor.b, exteriorColor.a);
        }

        if (interior)
        {   //close ends of walls
            nbIndices = positions.length/3; // current number of indices

            positions.push(innerBaseCorners[0].x, innerBaseCorners[0].y, innerBaseCorners[0].z);
            positions.push(outerBaseCorners[0].x, outerBaseCorners[0].y, outerBaseCorners[0].z);
            positions.push(outerTopCorners[0].x, outerTopCorners[0].y, outerTopCorners[0].z);
            positions.push(innerTopCorners[0].x, innerTopCorners[0].y, innerTopCorners[0].z);

            uvs.push(exteriorUV.x, exteriorUV.y);
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply / maxL, exteriorUV.y);
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply / maxL, exteriorUV.z);
            uvs.push(exteriorUV.x, exteriorUV.z);

            indices.push(nbIndices, nbIndices + 1, nbIndices + 2, nbIndices, nbIndices + 2, nbIndices + 3);

            nbIndices = positions.length/3; // current number of indices

            positions.push(innerBaseCorners[nbWalls -1].x, innerBaseCorners[nbWalls -1].y, innerBaseCorners[nbWalls -1].z);
            positions.push(outerBaseCorners[nbWalls -1].x, outerBaseCorners[nbWalls -1].y, outerBaseCorners[nbWalls -1].z);
            positions.push(outerTopCorners[nbWalls -1].x, outerTopCorners[nbWalls -1].y, outerTopCorners[nbWalls -1].z);
            positions.push(innerTopCorners[nbWalls -1].x, innerTopCorners[nbWalls -1].y, innerTopCorners[nbWalls -1].z);

            uvs.push(exteriorUV.x, exteriorUV.y);
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply / maxL, exteriorUV.y);
            uvs.push(exteriorUV.x + (exteriorUV.z - exteriorUV.x) * ply / maxL, exteriorUV.z);
            uvs.push(exteriorUV.x, exteriorUV.z);

            indices.push(nbIndices + 1, nbIndices, nbIndices + 2, nbIndices + 2, nbIndices, nbIndices + 3);

            for(var p = 0; p < 8; p++)
            {
                colors.push(exteriorColor.r, exteriorColor.g, exteriorColor.b, exteriorColor.a);
            }
        }
    }

    var normals = [];

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    BABYLON.VertexData._ComputeSides(BABYLON.Mesh.FRONTSIDE, positions, indices, normals, uvs);


    //Create a custom mesh  
    var customMesh = new BABYLON.Mesh("custom", scene);

    //Create a vertexData object
    var vertexData = new BABYLON.VertexData();

    //Assign positions and indices to vertexData
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.colors = colors;

    //Apply vertexData to custom mesh
    vertexData.applyToMesh(customMesh);

    return customMesh;
}


BABYLON.PolygonMeshBuilder.prototype.wallBuilder = function (w0, w1) {
    var positions = [];
    var direction = w1.corner.subtract(w0.corner).normalize();
    var angle = Math.acos(direction.x);
    if(direction.z !=0) {
        angle *= direction.z/Math.abs(direction.z);
    }    
    this._points.elements.forEach(function (p) {
        positions.push(p.x * Math.cos(angle) + w0.corner.x, p.y, p.x * Math.sin(angle) + w0.corner.z);
    });
    var indices = [];        
    var res = earcut(this._epoints, this._eholes, 2);
    for (var i = res.length; i > 0; i--) {
        indices.push(res[i - 1]);
    };            
    return {positions: positions, indices: indices};
};


RR.roofprint = function(corners, overlap, height) {
    var outerData = [];
    var angle = 0;
    var direction = 0;
    var line = BABYLON.Vector3.Zero();
    corners[1].subtractToRef(corners[0], line);
    var nextLine = BABYLON.Vector3.Zero();
    corners[2].subtractToRef(corners[1], nextLine);    
    
    var nbCorners = corners.length;
    for(var c = 0; c < nbCorners; c++) {    
        angle = Math.PI - Math.acos(BABYLON.Vector3.Dot(line, nextLine)/(line.length() * nextLine.length()));            
        direction = BABYLON.Vector3.Cross(nextLine, line).normalize().y;                
        lineNormal = new BABYLON.Vector3(line.z, 0, -1 * line.x).normalize();
        line.normalize();
        outerData[(c + 1) % nbCorners] = corners[(c + 1) % nbCorners].add(lineNormal.scale(overlap)).add(line.scale(direction * overlap/Math.tan(angle/2)));        
        outerData[(c + 1) % nbCorners].y = height
        line = nextLine.clone();        
        corners[(c + 3) % nbCorners].subtractToRef(corners[(c + 2) % nbCorners], nextLine);    
    }
    
    return outerData;
}

RR.roofFloor = function(roofprint, scene) {
    var height = roofprint[0].y;
    var floor = BABYLON.MeshBuilder.CreatePolygon("polygon", {shape:roofprint,  updatable: true, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
    var positions = floor.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for(var p = 0; p < positions.length / 3; p++) {
        positions[3 * p + 1] = height + 0.01;
    }
    floor.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    return floor;
}

RR.roof = function(roofprint, apexes, planes, rise, height, uvbase, scene) {
    var positions = [];
    var uvs = [];
    
    var offset = roofprint.length;
    var vidx = [];
    var currentv = [];
    var v = [
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 0),
        new BABYLON.Vector3(0, 0, 0)
    ]
    var vint = new BABYLON.Vector3(0, 0, 0);
    var indices = [];
    var index = 0;
    var norm = new BABYLON.Vector3(0, 0, 0);
    var inPlane = new BABYLON.Vector3(0, 0, 0);
    var ax0 = new BABYLON.Vector3(0, 0, 0);
    var ax1 = new BABYLON.Vector3(0, 0, 0);
    var xvalues = [];
    var yvalues = [];
    var uvs = [];
    var uvset = new Set();
    for(var i = 0; i < planes.length; i++) {
        for(var idx = 0; idx < 3; idx++) {
            vidx[idx] = parseInt(planes[i][idx].substring(1));                
            if(planes[i][idx].substring(0, 1).toLowerCase() == "c") {
                positions.push(roofprint[vidx[idx]].x, roofprint[vidx[idx]].y, roofprint[vidx[idx]].z)                    
                indices.push(index);
            }
            else {
                positions.push(apexes[vidx[idx]].x, rise + height, apexes[vidx[idx]].y);                        
                indices.push(index);
            }
            currentv[idx] = index;
            v[idx].set(positions[3 * index], positions[3 * index + 1], positions[3 * index + 2]);
            index++;                
        }
        
        if(planes[i].length == 4) {
            if(planes[i][0].substring(0, 1).toLowerCase() == "c") {
                positions.push(roofprint[vidx[0]].x, roofprint[vidx[0]].y, roofprint[vidx[0]].z)
                indices.push(index);
            }
            else {
                positions.push(apexes[vidx[0]].x, rise + height, apexes[vidx[0]].y);
                indices.push(index);
            }
            currentv[idx] = index;
            v[idx].set(positions[3 * index], positions[3 * index + 1], positions[3 * index + 2]);
            index++;
            for(var idx = 2; idx < 4; idx++) {
                vidx[idx] = parseInt(planes[i][idx].substring(1));
                if(planes[i][idx].substring(0, 1).toLowerCase() == "c") {
                    positions.push(roofprint[vidx[idx]].x, roofprint[vidx[idx]].y, roofprint[vidx[idx]].z)
                    indices.push(index);
                }
                else {
                    positions.push(apexes[vidx[idx]].x, rise + height, apexes[vidx[idx]].y);
                    indices.push(index);
                }
                currentv[idx] = index;
                v[idx].set(positions[3 * index], positions[3 * index + 1], positions[3 * index + 2]);
                index++;
            }
        }
        ax0 = v[1].subtract(v[0]).normalize();
        
        if(BABYLON.Vector3.Dot(ax0, BABYLON.Axis.Y) > 0) {
            vint = v[1].subtract(v[2]);
            vint.y = 0;
            ax0 = v[0].add(vint).normalize();
        }
        ax1 = v[2].subtract(v[0]).normalize();
        norm = BABYLON.Vector3.Cross(ax0, ax1).normalize();
        inPlane = BABYLON.Vector3.Cross(norm, ax0).normalize();
        xvalues[0] = 0;
        yvalues[0] = 0;
        xvalues[1] = BABYLON.Vector3.Dot(v[1].subtract(v[0]), ax0);
        yvalues[1] = BABYLON.Vector3.Dot(v[1].subtract(v[0]), inPlane);
        xvalues[2] = BABYLON.Vector3.Dot(v[2].subtract(v[0]), ax0);
        yvalues[2] = BABYLON.Vector3.Dot(v[2].subtract(v[0]), inPlane);

        minX = Math.min(xvalues[0], xvalues[1], xvalues[2]);
        if(planes[i].length == 4) {
            xvalues[3] = BABYLON.Vector3.Dot(v[3].subtract(v[0]), ax0);
            yvalues[3] = BABYLON.Vector3.Dot(v[3].subtract(v[0]), inPlane);
            minX = Math.min(minX, xvalues[3]);                
        }
        for(var idx = 0; idx < 3; idx++) {
            if(minX < 0) {
                xvalues[idx] += Math.abs(minX);
            }
            uvs.push(xvalues[idx] / uvbase, yvalues[idx] / uvbase);
        }
        if(planes[i].length == 4) {
            uvs.push(xvalues[0] / uvbase, yvalues[0] / uvbase);
            uvs.push(xvalues[2] / uvbase, yvalues[2] / uvbase);
            if(minX < 0) {
                xvalues[3] += Math.abs(minX);
            }
            uvs.push(xvalues[3] / uvbase, yvalues[3] / uvbase);
        }            
    }
            
    var roofMesh = new BABYLON.Mesh("roof", scene);

    var normals = [];

    var vertexData = new BABYLON.VertexData();
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals; 
    vertexData.uvs = uvs;
    vertexData.applyToMesh(roofMesh);

    return roofMesh;
}
