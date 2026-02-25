define([], function () {
var Common;

//=============================================================================
// Game Variables
//=============================================================================
Common = {
  fps            : 60,                      // target frames per second
  drawDistance   : 300,                     // number of segments to draw
  roadWidth      : 2000,                    // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
  segmentLength  : 200,                     // length of a single segment
  rumbleLength   : 3,                       // number of segments per red/white rumble strip
  numLaps        : 3,                       // number of laps in the race. Can be changed through GUI
  numRacers      : 8,                       // number of racers in the race. change through GUI
  playerSegment  : {},                      // the current segment with the player in it
  segments       : [],                      // array of road segments
  cars           : [],                      // array of cars on the road
  trackLength    : null,                    // z length of entire track (computed)
  lanes          : 3,                       // number of lanes
  centrifugal    : 4,                       // The centrifugal force going around turns
  raceActive     : false
};
Common.step         = 1/Common.fps;                          // how long is each frame (in seconds)
Common.maxSpeed     = Common.segmentLength/Common.step;      // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)
Common.accel        =  Common.maxSpeed/5;                    // acceleration rate - tuned until it 'felt' right
Common.breaking     = -Common.maxSpeed;                      // deceleration rate when braking
Common.decel        = -Common.maxSpeed/5;                    // 'natural' deceleration rate when neither accelerating, nor braking
Common.offRoadDecel = -Common.maxSpeed/2;                    // off road deceleration is somewhere in between
Common.offRoadLimit =  Common.maxSpeed/4;                    // limit when off road deceleration no longer applies (e.g. you can always go at least this speed even when off road)


// CAR REFERENCE, all cars on the road should have a .car attribute with this object.
// Make sure to use jQuery.extend(true, {}, Common.carDefault) or your values will be global!



//=============================================================================
// Graphic constants
//=============================================================================
var COLORS = {
  SKY:  '#4458a1',
  TREE: '#005108',
  FOG:  '#005108',
  LIGHT:  { road: '#6B6B6B', grass: '#105A20', rumble: '#555555', lane: '#CCCCCC'  },
  DARK:   { road: '#696969', grass: '#024A10', rumble: '#BBBBBB'                   },
  START:  { road: 'white',   grass: '#009A00',   rumble: 'white'                   },
  FINISH: { road: 'black',   grass: '#009A00',   rumble: 'black'                   }
};

var BACKGROUND = {
  HILLS: { x:   5, y:   5, w: 1280, h: 480 },
  SKY:   { x:   5, y: 500, w: 1280, h: 480 },
  TREES: { x:   5, y: 985, w: 1280, h: 480 },
  SKYOFFSET: -50        // make sure that background doesn't show at top of screen when the sky scrolls down a bit for hills
};


// convert sprite sheet JSON into format used by this game
// bundles multiple sprite sheets worth of offset data into the SPRITES array
var SPRITES = {};
SPRITES.SCALE = 0.3 * (1 / 224);     // the reference sprite width should be 1/3rd the roadWidth

for(var ss = 0; ss < 4; ss++)
{
    var ssName = "sprites" + ss.toString();
    loadSpriteSheetData(ss, ssName);

}

function loadSpriteSheetData(_index, _name)
{
    var data = window[_name];

    for(var i in data.frames)
    {
        var spriteData = data.frames[i];
        var name = convertName(spriteData.filename.substring(0, spriteData.filename.length - 4));

        SPRITES[name] = { s: SPRITES.SCALE, i: _index, x: spriteData.frame.x, y: spriteData.frame.y, w: spriteData.frame.w, h: spriteData.frame.h };
        console.log("SPRITES[" + name + "]=" + JSON.stringify(SPRITES[name]));
    }
}

function convertName( _name )
{
    var newName = "";
    for(var i = 0; i < _name.length; i++)
    {
        var c = _name.charAt(i);
        if (c == " " || c == "/" || c == "-") c = "_";
        c = c.toUpperCase();
        newName += c;
    }
    return newName;
}


// create indices to each frame of a car
SPRITES.CAR_ORIENT = [];
for(var y = 0; y < 4; y++)
{
    SPRITES.CAR_ORIENT[y] = [];
    var ys = y.toString();
    ys = "000".substring(0, 3 - ys.length) + ys;
    for(var x = 0; x < 17; x++)
    {
        var xs = x.toString();
        xs = "000".substring(0, 3 - xs.length) + xs;
        var fname = "CHARGER_TEST_" + ys + "_" + xs + "_000";
        SPRITES.CAR_ORIENT[y][x] = SPRITES[fname];
        //console.log("CAR_ORIENT[" + y + "][" + x + "]=" + fname);
    }
}

SPRITES.CAR_STRAIGHT = SPRITES.CHARGER_TEST_000_008_000;

SPRITES.BILLBOARDS = [SPRITES.BENJAMINS_BILLBOARD, SPRITES.SOAPIES_BILLBOARD, SPRITES.STARDUST_BILLBOARD, SPRITES.CROWN_BILLBOARD];
SPRITES.PLANTS     = [SPRITES.TREE_01, SPRITES.TREE2, SPRITES.TREE4_SPIN_0025, SPRITES.DRYTREE4];
SPRITES.BUILDINGS  = [SPRITES.FARMHOUSEA1, SPRITES.FARMHOUSEB1, SPRITES.FARMHOUSEC3, SPRITES.FARMHOUSEB3, SPRITES.WINDMILL2, SPRITES.SILOA1];
SPRITES.EQUIPMENT  = [SPRITES.DIGGER1, SPRITES.DIGGER3, SPRITES.DIGGER4];
SPRITES.PYLONS     = [SPRITES.POWER_LINE1, SPRITES.POWER_LINE2];
SPRITES.GANTRYS    = [SPRITES.CITYBANK_GANTRY, SPRITES.MARKET_GANTRY, SPRITES.NINE2FIVE_GANTRY, SPRITES.TKAUTO_GANTRY, SPRITES.TURBONUKE_GANTRY];
SPRITES.CARS       = [SPRITES.CAR_STRAIGHT];
SPRITES.CAR_MIDDLE_FRAME_INDEX = 8;

// resize some of the source art
var rs;
for(rs = 0; rs < SPRITES.PLANTS.length; rs++)
{
    SPRITES.PLANTS[rs].s *= 2.0;
}
for(rs = 0; rs < SPRITES.BUILDINGS.length; rs++)
{
    SPRITES.BUILDINGS[rs].s *= 4.0;
}
for(rs = 0; rs < SPRITES.EQUIPMENT.length; rs++)
{
    SPRITES.EQUIPMENT[rs].s *= 1.5;
}
for(rs = 0; rs < SPRITES.GANTRYS.length; rs++)
{
    SPRITES.GANTRYS[rs].s *= 3.8;
}

Common.COLORS      = COLORS;
Common.BACKGROUND  = BACKGROUND;
Common.SPRITES     = SPRITES;

return Common;
});

