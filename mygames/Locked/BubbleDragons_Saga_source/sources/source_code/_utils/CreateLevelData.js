// CreateLevelData.js
//
// Pete Baron 2018
//
// generate level data for "Saga" mode of Bubble Dragons based on the level number
//

/*

Notes for level balancing:

This system uses an incrementing sine-wave to calculate a difficulty from the level number.
Given that difficulty value, the rest of the code will create a sample level and calculate its score.
If the score is close enough to the desired difficulty, we're done.
Otherwise, the counters for boosts, scroll speed, fish, bubbles, holes, etc etc, are adjusted
to make the level easier or harder (in the correct direction for the desired difficulty).

The counters are subject to min and max value limits.
The score awarded for each counter has a multiplier (one more hole is worth less than a extra shot).
Some counters have such strong effects that they are table driven instead of linear multipliers (number of different colours).
Some counters have a 'standard' value, in this case when the counter equals its standard value the score is zero.

Some features are limited to appear before or after a fixed level number.
To find these search for the variable _level in this file...

e.g.:
    // prevent too many colours in early levels, after level 25 stop
    // making levels with only two colours
    if ( _level <= 1 ) { maxColours = 2; }
    else if ( _level < 10 ) { maxColours = 3; }
    else if ( _level < 25 ) { maxColours = 4; }
    else { minColours = 3; }


As well as the limits, standards, tables at the top of the code part of this file, there are also one or
two 'global' variables which can be used for changes to *every* level because they modify fundamental
equations.  They are heavily commented but feel free to email me: sibaroni@hotmail.com with any specific
questions.

e.g.:
    // the power to which a fractional difficulty (< 1.0) is raised to flatten the curves
    // larger numbers make the difference between 'hard' and 'easy' levels less
    // 1.0 here gives the original curve values
    CreateLevelData.difficultyPower = 2.5;

    // multiplied by the difficulty (< 1.0) to get a valid score target number
    // larger numbers make the game harder (on every level)
    // smaller numbers make it easier
    CreateLevelData.difficultyScaler = 1000;




Original requirements statement from David Or:

As a designer, I want to provide an integer into the system to define the difficulty level, and have the system spit out a procedurally generated level based on my number


**Pillars**
- Mechanics to be introduced over time
- Difficulty should be incremental sine wave, with resets every 35 levels
- Avoid repeating the same content (e.g. level type, boost, specials) in a row. So unpicked content has a higher probability to being picked the longer it is unpicked.
- Every level MUST have 1 boost
- Early levels should have fewer shots (be shorter)

**Mechanics level requirements**
1) Hatch level, Boost mine, 3 colors
2) Special rocket
3) Fish level, Boost fireball
6) Survival level, Special bomb
8) Boost wild
10) Special frozen
15) Special burst dragon
20) Special carry dragon 
25) Boost convert dragon
30) Boost extra moves
40) Special convert dragon ?
50) Boost burst dragon ?

**Rules**
- Number of shots (20 shots min - 45 shots, 10 rating)
- Number of bubbles in grid (15 rows - 40 rows, 4 rating)
- Number of colors (2 - 6, 10 rating)
- Number of good special bubbles (6 rating)
- Number of bad special bubbles (4 rating)
- Number of holes (8 rating)
- Symmetry (stick to 1 line, 2 rating)


- **Boost type**
Boost mine (-8)
Boost fireball (-9)
Boost wild (-2)
Boost convert (-5)
Boost extra moves (-10)

- **Level type**
Hatch (+4)
Fish (+6)
Survival (+10)

- **Special types**
Special bomb (-8)
Special rocket (-10)
Special burst (-6)
Special frozen (+5)
Special carry (+3)

*/




var CreateLevelData = {};

CreateLevelData.score = 0;
CreateLevelData.history = [];


// for any bad auto-generated levels, change the random seed value by adding an object to this list
// { level: X, seed: Y }
// level starts at 1 (not 0)
// seed can be any number except 0, including fractions
//
// I have included two examples:
CreateLevelData.overrideSeeds =
[
    { level: 5, seed: 11.1 },
    { level: 50, seed: 100 }
];


// the power to which a fractional difficulty (< 1.0) is raised to flatten the curves
// larger numbers make the difference between 'hard' and 'easy' levels less
// 1.0 here gives the original curve values
CreateLevelData.difficultyPower = 2.5;

// multiplied by the difficulty (< 1.0) to get a valid score target number
// larger numbers make the game harder (on every level)
// smaller numbers make it easier
CreateLevelData.difficultyScaler = 1000;

// Added to the difficulty to give the minimum possible difficulty level.
// Difficulty can vary (with current Power and Scaler values) to about 600 maximum.
// Adjusting this can give very small modifications that will have the largest
// impact on early levels.  It should not be 0 for algorithmic reasons.
CreateLevelData.difficultyMin = 10;


// the minimum number of shots permitted per level, this is indexed by the number of colours (0, 1 colours = impossible)
// the shotsMultiplier value is used on the difference between the number of shots and this value
CreateLevelData.minimumShots = [ 0,0, 10, 18, 22, 25 ];

// the maximum number of shots usually permitted per level
// sometimes the level generator might get stuck, in those cases this number may be exceeded
// with a decreasing chance for every shot over the limit
CreateLevelData.maximumShots = 45;

// hard-limit shortest level (number of rows of bubbles)
CreateLevelData.minimumHeight = 11;

// soft-cap highest level
CreateLevelData.maximumHeightSoftCap = 50;

// the starting height value for a level
// the heightMultiplier is used on the difference between the level height and this value
CreateLevelData.standardHeight = 14;

// The holes multiplier per line of bubbles.
// The total number of holes (gaps where a bubble slot is empty) in the whole grid cannot exceed
// the number of lines of bubbles multiplied by this constant (e.g. 11 rows * 5 = 55 holes maximum).
CreateLevelData.holesMultiplier = 3;

// the starting number of holes value for a level
CreateLevelData.standardHoles = 20;

// level types have a fixed cost per type
CreateLevelData.levelTypeMultiplier = 18.0;
CreateLevelData.levelTypeScores = {
    "level_hatch_egg": 5,
    "level_collect_fish": 7,
    "level_protect_barrier": 10
};


// special bubbles have a fixed cost for each one in the level
// if there are multiple types of special then the values are accumulated for each type
CreateLevelData.specialTypeMultiplier = 0.15;
CreateLevelData.specialScores = {
    "special_bomb": -7,
    "special_rocket": -10,
    "special_burst_dragon": -4,
    "special_frozen_bubble": 2.5,
    "special_carry_dragon": 3
};

// boost weapons have a fixed cost for each type
CreateLevelData.boostTypeMultiplier = 2.0;
CreateLevelData.boostScores = {
    "boost_mine": -7,
    "boost_fireball": -9,
    "boost_wild": -2,
    "boost_convert_dragon": -5,
    "boost_extra_moves": -10
};

// standard (zero score modification) value for the amount of boost
// required to fill a boost bar, and how much that value is increased
// every time the player does fill one up.
CreateLevelData.standardBoostFull = 100;
CreateLevelData.standardBoostGain = 20;
// min/max values for boost settings
CreateLevelData.minBoostFull = 20;
CreateLevelData.maxBoostFull = 200;
CreateLevelData.minBoostGain = 5;
CreateLevelData.maxBoostGain = 40;
// multipliers to convert the boost changes into points for level balancing
CreateLevelData.boostFullMultiplier = 1.0;
CreateLevelData.boostGainMultiplier = 8.0;

// maximum values for the number of each special bubble type
CreateLevelData.maxBombs = 40;
CreateLevelData.maxRockets = 30;
CreateLevelData.maxBurstDragons = 20;
CreateLevelData.maxFrozen = 50;
CreateLevelData.maxCarryDragons = 20;

// other multipliers are applied for each of the relevant items
// height is the cost for an entire row of bubbles
CreateLevelData.shotsMultiplier = -4.0;
CreateLevelData.heightMultiplier = 7.0;
CreateLevelData.holesNumberMultiplier = -0.5;
CreateLevelData.goalFishMultiplier = 8.0;

// the starting fish count value for a fish level
// the goalFishMultiplier is used on the difference between the level fish and this value
CreateLevelData.standardFish = 8;
CreateLevelData.minFish = 6;
CreateLevelData.maxFish = 15;

// scroll speed controls for survival levels
// default value is Game.survivalSpeed (11.0)
CreateLevelData.minScrollSpeed = 5.0;
CreateLevelData.maxScrollSpeed = 18.0;

// how many points are awarded for each 1.0 difference between scroll_speed and Game.survivalSpeed
// 5 - 11 = -6, * 20 = -120 for minScrollSpeed
// 18 - 11 = 7, * 20 = 140 for maxScrollSpeed
CreateLevelData.scrollSpeedMultiplier = 20.0;

// the number of colours has such a major impact on the level difficulty
// that I have hand tweaked to find these costs for each of the options
// it is not possible to have 0 or only 1 bubble colour in a level
CreateLevelData.numColourScores = [ -1, -200, -50, 0, 75, 150 ];





// create a set of levelData for _level number and return it
CreateLevelData.createLevelData = function( _level )
{
    // level is zero based, this system expects it to be one based
    _level += 1;

    // get the seed from the override system, if there isn't an override then use the level number
    var seed = CreateLevelData.findOverrideSeed( _level ) || _level;

    // seed the random number generator to create a 'randomish' sequence of numbers
    // which can be repeated by using the same seed again
    Math.mySeed( seed );

    // DEBUG ONLY: dump 150 levels worth of difficulty ratings into the console
    // this is useful if you decide to adjust the difficulty curve settings to
    // get a visual representation of the curve (paste the console log into Excel)
    //
    // console.log( "difficulty by level" );
    // console.log( "****** start data");
    // var s = "";
    // for(i = 1; i <= 150; i++)
    //     s += CreateLevelData.getDesiredDifficulty( i ) + "\n";
    // console.log( s );
    // console.log( "****** end data");

    // how difficult should this level be?
    var d = CreateLevelData.getDesiredDifficulty( _level );

    // convert 'd' value of < 1.0 into a useful difficulty range
    var difficulty = Math.floor( d * CreateLevelData.difficultyScaler + CreateLevelData.difficultyMin );

    // if ( Main.debug )
    //     console.log("CreateLevelData.createLevelData level = " + _level + " difficulty = " + difficulty);

    return CreateLevelData.createLevelWithDifficulty( _level, difficulty );
};


CreateLevelData.createLevelWithDifficulty = function( _level, _difficulty )
{
    // get the number of times the player has failed on this level
    var bgImage, levelId, specialsList, boostShot, levelHeight, levelShots;
    var numHoles = CreateLevelData.standardHoles;
    var numColours;
    var goalFish = CreateLevelData.standardFish;

    var minColours = 2;
    var maxColours = CreateLevelData.numColourScores.length - 1;

    // prevent too many colours in early levels, after level 25 stop
    // making levels with only two colours
    if ( _level <= 1 ) { maxColours = 2; }
    else if ( _level < 10 ) { maxColours = 3; }
    else if ( _level < 25 ) { maxColours = 4; }
    else { minColours = 3; }
    numColours = Math.floor((minColours + maxColours) / 2);

    // choose level contents reducing the likelihood of duplication
    levelId = CreateLevelData.pickLevelType( _level );
    specialsList = CreateLevelData.pickSpecials( _level );
    boostShot = CreateLevelData.pickBoost( _level );
    levelHeight = CreateLevelData.chooseHeight( _difficulty, (levelId == "level_protect_barrier") );
    levelShots = CreateLevelData.chooseShots( _difficulty, levelHeight, numColours );

    // "specials": [
    //     { "special_carry_dragon": { "number": 15, "min": 96, "max": 160 } },
    //     { "special_burst_dragon": { "number": 15, "min": 96, "max": 640 } } 
    // ]    

    /*
        { "name": "game_bg1", "description": "forest-stage-bg" },
        { "name": "game_bg2", "description": "river-stage-bg" },
        { "name": "game_bg3", "description": "cave-stage-bg" },
        { "name": "game_bg4", "description": "desert-stage-bg" },
        { "name": "game_bg5", "description": "lake-stage-bg" },
        { "name": "game_bg6", "description": "cave-stage-bg2" },
     */
    // pick a background image at random from the selection for this level type
    // set number of shots for this level (subject to tweaking for level difficulty)
    switch(levelId)
    {
        case "level_hatch_egg":
            bgImage = Utils.pickRandomFromList( ["game_bg3","game_bg6"], Math.myRandom );
            break;
        case "level_collect_fish":
            bgImage = Utils.pickRandomFromList( ["game_bg2","game_bg5"], Math.myRandom );
            break;
        case "level_protect_barrier":
            bgImage = Utils.pickRandomFromList( ["game_bg1","game_bg4"], Math.myRandom );
            levelShots = CreateLevelData.maximumShots;
            break;
    }

    // create a default levelData description
    var levelData =
        {
            _score: 0,
            _difficulty: _difficulty,
            _level: _level,
            _id: levelId,
            BackgroundImage: bgImage,
            width: 12,
            height: 10,
            symmetry: [ {x: 6, pcnt: 20 } ],
            holes: { seed: 1, number: 1, symmetry: [ {x: 6, pcnt: 100 } ] },
            list: [],
            boost: { id: "boost_mine", cost: 120, gain: 10 },
            boostFullBar: CreateLevelData.standardBoostFull,
            boostGainCost: CreateLevelData.standardBoostGain,
            specials: [],
            turns: 10
        };

    // add level type specific stuff to the levelData description
    switch(levelId)
    {
        case "level_hatch_egg":
            break;
        case "level_collect_fish":
            levelData.goal_fish = { count: CreateLevelData.standardFish, min: 120, max: 500 };
            break;
        case "level_protect_barrier":
            levelData.scroll_speed = Game.survivalSpeed;
            break;
    }


    //
    // iteratively adjust levelData values to get the desired difficulty
    //

    var diff;
    do {
        // apply variables to the levelData description
        levelData.height = levelHeight;
        levelData.holes.number = numHoles;
        levelData.boost = boostShot;
        if ( levelData.list.length != numColours )
            levelData.list = CreateLevelData.buildColourBubbleList(numColours);
        levelData.turns = levelShots;
        if ( levelData.goal_fish ) levelData.goal_fish.count = goalFish;

        // add the specialsList to the levelData description
        if ( specialsList && specialsList.length > 0 )
        {
            levelData.specials = specialsList;
        }

        // calculate the difference between the desired difficulty and the calculated score for this levelData object
        var score = CreateLevelData.calculateScore( levelData );
        diff = _difficulty - score;

        if ( Main.debugSpam )
            console.log( "CreateLevelData.scores difficulty = " + _difficulty + " score = " + (_difficulty - diff));

        // we need to get within 10% of the target difficulty
        if ( Math.abs(diff) <= _difficulty * 0.10 )
        {
            levelData._score = score;
            // exit the eternal do-while loop
            break;
        }

        // adjust the level closer to the desired difficulty value
        if ( diff > 0 )
        {
            //
            // make the level harder
            //

            // random selection with fall-through on failure to the next case
            switch(Math.floor(Math.myRandom() * 11))
            {
                case 0:
                    // adjust number of colours upwards
                    if ( diff > 20 )
                    {
                        if ( numColours < maxColours )
                        {
                            numColours++;
                            // reapply the minimum limit for number of shots based on number of colours
                            if ( levelShots < CreateLevelData.minimumShots[numColours] )
                                levelShots = CreateLevelData.minimumShots[numColours];
                            break;
                        }
                    }
                    // deliberate fall-through
                case 1:
                    if ( levelShots > CreateLevelData.minimumShots[numColours] )
                    {
                        levelShots--;
                        break;
                    }
                    // deliberate fall-through
                    // multiple entries increase the probability of this being picked
                    // subtracting holes is a nice modifier
               case 2:
               case 3:
                    if ( numHoles > 0 )
                    {
                        numHoles--;
                        break;
                    }
                    // deliberate fall-through
                case 4:
                    if ( levelHeight < CreateLevelData.maximumHeightSoftCap )
                    {
                        levelHeight++;
                        break;
                    }
                    // deliberate fall-through
                case 5:
                    // decrease the number of 'good' specials
                    if ( CreateLevelData.changeNumberOfSpecials(levelData.specials, true, -1) )
                    {
                        break;
                    }
                    // deliberate fall-through
                case 6:
                    // increase the number of 'bad' specials
                    if ( CreateLevelData.changeNumberOfSpecials(levelData.specials, false, 1) )
                    {
                        break;
                    }
                    // deliberate fall-through
                case 7:
                    // modify speed of survival levels
                    if ( levelData._id == "level_protect_barrier" )
                    {
                        if ( levelData.scroll_speed < CreateLevelData.maxScrollSpeed )
                        {
                            levelData.scroll_speed += 1.0;
                            break;
                        }
                    }
                    // deliberate fall-through
                case 8:
                    // adjust number of fish to collect in fish levels
                    if ( levelData.goal_fish )
                    {
                        if ( goalFish < CreateLevelData.maxFish )
                        {
                            goalFish++;
                            break;
                        }
                    }
                    // deliberate fall-through
                case 9:
                    // adjust amount of boost required to fill the boost bar
                    if ( levelData.boostFullBar <= CreateLevelData.maxBoostFull - 10 )
                    {
                        levelData.boostFullBar += 10;
                        break;
                    }
                    // deliberate fall-through
                case 10:
                    // adjust gain to get the next one for each full bar of boost used
                    if ( levelData.boostGainCost < CreateLevelData.maxBoostGain )
                    {
                        levelData.boostGainCost += 1.0;
                        break;
                    }
                    break;
             }
        }
        else
        {
            //
            // make the level easier
            //

            // random selection with fall-through on failure to the next case
            switch(Math.floor(Math.myRandom() * 12))
            {
                case 0:
                    if ( diff < -20 && numColours > minColours )
                    {
                        numColours--;
                        // reapply the minimum limit for number of shots based on number of colours
                        if ( levelShots < CreateLevelData.minimumShots[numColours] )
                        {
                            levelShots = CreateLevelData.minimumShots[numColours];
                            break;
                        }
                    }
                // deliberate fall-through
                case 1:
                    if ( levelHeight > CreateLevelData.minimumHeight )
                    {
                        levelHeight--;
                        break;
                    }
                    // deliberate fall-through
                    // multiple entries increase the probability of this being picked
                    // adding holes is a nice modifier
                case 2:
                case 3:
                case 4:
                    if ( numHoles < levelHeight * CreateLevelData.holesMultiplier )
                    {
                        numHoles++;
                        break;
                    }
                    // deliberate fall-through
                case 5:
                    var r = Math.max(levelShots - CreateLevelData.maximumShots, 0) / 10;
                    if ( Math.myRandom() >= r )
                    {
                        levelShots++;
                        break;
                    }
                    // deliberate fall-through
                case 6:
                    // increase the number of 'good' specials
                    if ( CreateLevelData.changeNumberOfSpecials(levelData.specials, true, 1) )
                    {
                        break;
                    }
                    // deliberate fall-through
                case 7:
                    // decrease the number of 'bad' specials
                    if ( CreateLevelData.changeNumberOfSpecials(levelData.specials, false, -1) )
                    {
                        break;
                    }
                    // deliberate fall-through
                case 8:
                    // modify speed of survival levels
                    if ( levelData._id == "level_protect_barrier" )
                    {
                        if ( levelData.scroll_speed > CreateLevelData.minScrollSpeed )
                        {
                            levelData.scroll_speed -= 1.0;
                            break;
                        }
                    }
                    // deliberate fall-through
                case 9:
                    if ( levelData.goal_fish )
                    {
                        if ( goalFish > CreateLevelData.minFish )
                        {
                            goalFish--;
                            break;
                        }
                    }
                    // deliberate fall-through
                case 10:
                    // adjust amount of boost required to fill the boost bar
                    if ( levelData.boostFullBar >= CreateLevelData.minBoostFull + 9 )
                    {
                        // NOTE: using 9 here and 10 in the other branch (make things harder) to reduce
                        // the likelihood of a back-and-forth exchange not achieving the desired score
                        levelData.boostFullBar -= 9;
                        break;
                    }
                    // deliberate fall-through
                case 11:
                    // adjust gain to get the next one for each full bar of boost used
                    if ( levelData.boostGainAmount > CreateLevelData.minBoostGain )
                    {
                        levelData.boostGainAmount -= 1.0;
                        break;
                    }
                    break;
            }
        }

    } while( true );    // exit via conditional break when score is close to desired difficulty

    // remember what this level used so we can avoid repeats in the future levels
    CreateLevelData.history.push( levelData );

    // prevent the history from growing too large
    while ( CreateLevelData.history.length > 5 )
        CreateLevelData.history.shift();

    if ( Main.debug )
        console.log("CreateLevelData.createLevelData data:", levelData);

    return levelData;
};


CreateLevelData.removeLastHistory = function()
{
    // remove the most recently added history record
    if ( CreateLevelData.history && CreateLevelData.history.length > 0 )
        CreateLevelData.history.pop();
};


//
// calculate the score for a level based on it's contents
//
CreateLevelData.calculateScore = function( _levelData )
{
    // level type
    var score = CreateLevelData.levelTypeScores[_levelData._id] * CreateLevelData.levelTypeMultiplier;
    // number of bubble colours
    score += CreateLevelData.numColourScores[_levelData.list.length];
    // number of shots
    score += (_levelData.turns - CreateLevelData.minimumShots[_levelData.list.length]) * CreateLevelData.shotsMultiplier;
    // number of rows of bubbles to pop
    score += (_levelData.height - CreateLevelData.standardHeight) * CreateLevelData.heightMultiplier;
    // amount of boost needed to fill the first bar
    score += (_levelData.boostFullBar - CreateLevelData.standardBoostFull) * CreateLevelData.boostFullMultiplier;
    // change in boost bar size for each filled boost bar
    score += (_levelData.boostGainCost - CreateLevelData.standardBoostGain) * CreateLevelData.boostGainMultiplier;
    // type of boost available
    score += CreateLevelData.boostScores[_levelData.boost.id] * CreateLevelData.boostTypeMultiplier;
    // number of holes in the bubble grid at the start
    score += _levelData.holes.number * CreateLevelData.holesNumberMultiplier;

    // specials may be good or bad and the number can vary
    for(var i in _levelData.specials)
    {
        var keys = Object.keys(_levelData.specials[i]);
        var num = _levelData.specials[i][keys[0]].number;
        score += CreateLevelData.specialScores[keys[0]] * num * CreateLevelData.specialTypeMultiplier;
    }

    // fish levels can adjust the number of fish to be collected
    if ( _levelData._id == "level_collect_fish" )
    {
        score += _levelData.goal_fish.count * CreateLevelData.goalFishMultiplier;
    }

    // survival levels can adjust the scroll speed of the bubbles
    if ( _levelData._id == "level_protect_barrier" )
    {
        score += (_levelData.scroll_speed - Game.survivalSpeed) * CreateLevelData.scrollSpeedMultiplier;
    }

    return score;
};



// how many rows of bubbles shall we create?
CreateLevelData.chooseHeight = function( _difficulty, _isProtectType )
{
    var base = CreateLevelData.standardHeight;            // starting point for level height
    var scale = 0.0125;         // scale factor applied to _difficulty
    var protectFactor = 1.30;   // multiplier if the level is a 'protect the shield' type

    var h = Math.floor( base + _difficulty * scale );
    if ( _isProtectType )
    {
        if ( Main.debugSpam )
            console.log("CreateLevelData.chooseHeight = " + h * protectFactor);
        return Math.floor(h * protectFactor);
    }

    if ( Main.debugSpam )
        console.log("CreateLevelData.chooseHeight = " + h);
    
    return h;
};


// how many shots will we give the player this level?
CreateLevelData.chooseShots = function( _difficulty, _height, _numColours )
{
    var base = CreateLevelData.minimumShots[_numColours];          // starting point and minimum shots per level
    var scale = 0.20;       // scale factor applied to _height
    var hardness = 0.01;    // bigger = difficulty has more effect on number of shots

    var s = base + Math.floor( _height * scale ) - Math.floor( _difficulty * hardness );
    s = Math.max( s, base );

    if ( Main.debugSpam )
        console.log("CreateLevelData.chooseShots = " + s);
    
    return s;
};


// what level type will it be (uses history to reduce repetition)
CreateLevelData.pickLevelType = function( _level )
{
    var i, l;
    var levelWeights = [];

    // Mechanics to be introduced over time
    var levelTypes = ["level_hatch_egg"];
    if ( _level >= 3 ) levelTypes.push("level_collect_fish");
    if ( _level >= 6 ) levelTypes.push("level_protect_barrier");

    // create weights for each level type, if it's been picked three times in the last four levels then it cannot be picked again
    // if ranking power is 2 (squared) then weights: (never used) = 9, (used once) = 4, (used twice) = 1, (used more than twice) = 0
    for( i = 0, l = levelTypes.length; i < l; i++ )
    {
        var usedCount = CreateLevelData.countHistory("_id", levelTypes[i], 4);  // 0..4 inclusive
        var ranking = 3 - Math.min(usedCount, 3);                               // 3..0 inclusive
        levelWeights[i] = ranking * ranking;                                    // raised to a power for logarithmic weights
    }

    // avoid repeating the same content (level type)
    var type = Utils.weightedPickRandomFromList( levelTypes, levelWeights, Math.myRandom );

    if ( Main.debugSpam )
        console.log("CreateLevelData.pickLevelType from " + levelTypes + " with weights " + levelWeights + " picked " + type);

    return type;
};


// what types of specials will we include in the bubbles
CreateLevelData.pickSpecials = function( _level )
{
    var specialTypes = [];

    // Mechanics to be introduced over time
    if ( _level >= 2 ) specialTypes.push("special_rocket");         // e.g. { "special_rocket": { "number": 12, "min": 200 } }
    if ( _level >= 6 ) specialTypes.push("special_bomb");           // e.g. { "special_bomb": { "number": 20, "min": 200, "max": 1000 } }
    if ( _level >= 10 ) specialTypes.push("special_frozen_bubble"); // e.g. { "special_frozen_bubble": { "number": 30, "min": 96, "max": 1000 } }
    if ( _level >= 15 ) specialTypes.push("special_burst_dragon");  // e.g. { "special_burst_dragon": { "number": 9, "min": 96, "max": 1000 } }
    if ( _level >= 20 ) specialTypes.push("special_carry_dragon");  // e.g. { "special_carry_dragon": { "number": 15, "min": 96, "max": 160 } }

    if ( specialTypes.length === 0 )
        return null;

    // Data Structure
    //
    // "specials": [
    //     { "special_carry_dragon": { "number": 15, "min": 96, "max": 160 } },
    //     { "special_burst_dragon": { "number": 15, "min": 96, "max": 640 } } 
    // ]

    var numberOfTypes = 1;
    if ( _level > 20 )
    {
        // level 24 = +1, level 36 = +2, level 56 = +3  (level 20 +4, +16, +36)
        numberOfTypes += Math.floor(Math.min(Math.myRandom() * Math.pow(_level - 20, 0.5) / 2, 3));
    }

    var specials = [];

    // loop to pick more specials if the level is high enough
    var i;
    for( i = 0; i < numberOfTypes; i++ )
    {
        var type = CreateLevelData.pickSpecialType( specialTypes );
        var special = {};
        special[type] = { number: 10, min: 100, max: 500 };        // TODO: adjust these numbers for different types and difficulties
        specials.push(special);
    }

    if ( Main.debugSpam )
        console.log("CreateLevelData.pickSpecials from " + specialTypes + " picked ", specials);
    
    return specials;
};


CreateLevelData.pickSpecialType = function( _specialTypes )
{
    var i, l;
    var specialWeights = [];

    // create weights for each _specialTypes entry, if it's been picked three times in the last four levels then it cannot be picked again
    // if ranking power is 2 (squared) then weights: (never used) = 9, (used once) = 4, (used twice) = 1, (used more than twice) = 0
    for( i = 0, l = _specialTypes.length; i < l; i++ )
    {
        var usedCount = CreateLevelData.countHistoryList("specials", _specialTypes[i], 4);  // 0..4 inclusive
        var ranking = 3 - Math.min(usedCount, 3);                                           // 3..0 inclusive
        specialWeights[i] = ranking * ranking;                                              // raised to a power for logarithmic weights
    }

    // avoid repeating the same content (specials)
    return Utils.weightedPickRandomFromList( _specialTypes, specialWeights, Math.myRandom );
};


// what type of boost will be available
CreateLevelData.pickBoost = function( _level )
{
    var boostWeights = [];

    // Mechanics to be introduced over time
    var boostTypes = [ "boost_mine" ];                              // e.g. "boost": { "id": "boost_mine", "cost": "120", "gain": "10" }
    if ( _level >= 3 ) boostTypes.push("boost_fireball");           // e.g. "boost": { "id": "boost_fireball", "cost": "170", "gain": "35" }
    if ( _level >= 8 ) boostTypes.push("boost_wild");               // e.g. "boost": { "id": "boost_wild", "cost": "100", "gain": "15" }
    if ( _level >= 25 ) boostTypes.push("boost_convert_dragon");    // e.g. "boost": { "id": "boost_convert_dragon", "cost": "110", "gain": "20" }
    if ( _level >= 30 ) boostTypes.push("boost_extra_moves");       // e.g. "boost": { "id": "boost_extra_moves", "cost": "80", "gain": "15" }

    // create weights for each boost type, if it's been picked three times in the last four levels then it cannot be picked again
    // if ranking power is 2 (squared) then weights: (never used) = 9, (used once) = 4, (used twice) = 1, (used more than twice) = 0
    var i, l;
    for( i = 0, l = boostTypes.length; i < l; i++ )
    {
        var usedCount = CreateLevelData.countHistoryObject("boost", "id", boostTypes[i], 4);    // 0..4 inclusive
        var ranking = 3 - Math.min(usedCount, 3);                                               // 3..0 inclusive
        boostWeights[i] = ranking * ranking;                                                    // raised to a power for logarithmic weights
    }

    // avoid repeating the same content (level type)
    var type = Utils.weightedPickRandomFromList( boostTypes, boostWeights, Math.myRandom );

    // build the return object
    // Data Structure
    //
    // "boost": {
    //     "id": "boost_convert_dragon",
    //     "cost": "110",
    //     "gain": "20"
    // }

    var boost = { id: type, cost: 110, gain: 20 };          // TODO: adjust these numbers for different types and difficulties

    if ( Main.debugSpam )
        console.log("CreateLevelData.pickBoost from " + boostTypes + " with weights " + boostWeights + " picked ", boost);

    return boost;
};


// e.g. [ "bubble_blue", "bubble_green", "bubble_yellow" ]
CreateLevelData.buildColourBubbleList = function( _num )
{
    if ( Main.debugSpam )
        console.log("CreateLevelData.buildColourBubbleList " + _num);
    var cols = [ "bubble_blue", "bubble_green", "bubble_yellow", "bubble_red", "bubble_purple" ];
    var list = [];
    var i;
    for( i = 0; i < _num; i++ )
    {
        var r = Math.floor(Math.myRandom() * cols.length);
        list.push( cols[r] );
        if ( Main.debugSpam )
            console.log("CreateLevelData.buildColourBubbleList " + cols[r]);
        cols.splice( r, 1 );
    }
    return list;
};


// count how many times history._parameter[_value] exists where history._parameter is a list
// e.g. CreateLevelData.countHistoryList("specials", "special_carry_dragon", 4) == one for this single history element
// history =
// [ {
//  "specials": [
//      { "special_carry_dragon": { "number": 15, "min": 96, "max": 160 } },
//      { "special_burst_dragon": { "number": 15, "min": 96, "max": 640 } }
//              ]
// } ]
CreateLevelData.countHistoryList = function( _parameter, _value, _depth )
{
    var i, l, c = 0;
    for( i = 0, l = CreateLevelData.history.length; i < l && i < _depth; i++ )
    {
        var h = CreateLevelData.history[l - i - 1];
        if ( h[_parameter] )
        {
            var j, k;
            for( j = 0, k = h[_parameter].length; j < k; j++ )
                if ( h[_parameter][j] &&  h[_parameter][j][_value] !== undefined )
                    c++;
        }
    }
    return c;
};


// count how many times history[index]._parameter[_parameter2] = _value
// e.g. search for ('boost', 'id', 'boost_convert_dragon', 4) would count 1 from this entry
// history =
// [ {
//    "boost": {
//      "id": "boost_convert_dragon",
//      "cost": "110",
//      "gain": "20"
//    }
// } ]
CreateLevelData.countHistoryObject = function( _parameter, _parameter2, _value, _depth )
{
    var i, l, c = 0;
    for( i = 0, l = CreateLevelData.history.length; i < l && i < _depth; i++)
    {
        if ( CreateLevelData.history[l - i - 1][_parameter][_parameter2] == _value)
            c++;
    }
    return c;
};


// count how many times history._parameter == _value
CreateLevelData.countHistory = function( _parameter, _value, _depth )
{
    var i, l, c = 0;
    for( i = 0, l = CreateLevelData.history.length; i < l && i < _depth; i++)
    {
        if ( CreateLevelData.history[l - i - 1][_parameter] == _value)
            c++;
    }
    return c;
};


//
// convert the level number into a difficulty value < 1.0
//
// uses an incrementing sine wave with a rest every 30 levels
// the reset drops down significantly but not all the way down
// after about level 120 the reset point remains static so all
// further levels will adhere to the same pattern of difficulties
// (they won't repeat levels though because the random numbers
// is seeded by the level number)
//
CreateLevelData.getDesiredDifficulty = function( _level )
{
    var repeat = 30;
    var start = Math.min( Math.floor(_level / repeat), 3 ) * 0.25;
    var l = _level % repeat;

    var frequency = 20;
    var slope = 0.0333;
    var amplitude = 0.5;

    // start at lowest point of sine wave (270 degrees)
    var a = ( l * frequency + 270 ) * Math.PI / 180;
    var s = Math.sin( a ) * amplitude + amplitude;
    s += slope * l + start;

    // s < 3.0
    return Math.pow(s / 3.0, CreateLevelData.difficultyPower);
};


// "specials": [
//     { "special_carry_dragon": { "number": 15, "min": 96, "max": 160 } },
//     { "special_burst_dragon": { "number": 15, "min": 96, "max": 640 } } 
// ]

// return true if we change anything, false if not
CreateLevelData.changeNumberOfSpecials = function( _specials, _good, _amount )
{
    if ( !_specials || _specials.length === 0 )
        return false;

    // build a list of good or bad type specials available in this level
    var items = [];
    var i, l;
    for( i = 0, l = _specials.length; i < l; i++)
    {
        var special = _specials[i];

        if ( _good )
        {
            // check for each 'good' (makes things easier) special type
            if ( special.special_bomb ) items.push( { ref: special.special_bomb, min: 0, max: CreateLevelData.maxBombs } );
            if ( special.special_rocket ) items.push( { ref: special.special_rocket, min: 0, max: CreateLevelData.maxRockets } );
            if ( special.special_burst_dragon ) items.push( { ref: special.special_burst_dragon, min: 0, max: CreateLevelData.maxBurstDragons } );
        }
        else
        {
            // check for each 'bad' (makes things harder) special type
            if ( special.special_frozen_bubble ) items.push( { ref: special.special_frozen_bubble, min: 0, max: CreateLevelData.maxFrozen } );
            if ( special.special_carry_dragon ) items.push( { ref: special.special_carry_dragon, min: 0, max: CreateLevelData.maxCarryDragons } );
        }
    }

    // while there are any left to pick from
    while( items.length > 0 )
    {
        // pick one at random
        var item = Utils.pickRandomFromList( items, Math.myRandom );

        // test it against the min/max limits for the type
        var value = item.ref.number + _amount;

        if ( value >= item.min && value <= item.max )
        {
            // it's a valid change, apply it and return true
            item.number += _amount;
            return true;
        }
        else
        {
            // that change is invalid, remove it from the list of options
            items.splice( items.indexOf(item), 1 );
        }
    }

    return false;
};


// check the list of overrideSeeds to see if this level has a corresponding value
CreateLevelData.findOverrideSeed = function( _level )
{
    var i, l;
    for( i = 0, l = CreateLevelData.overrideSeeds.length; i < l; i++ )
        if ( CreateLevelData.overrideSeeds[i].level == _level )
            return CreateLevelData.overrideSeeds[i].seed;

    // there is no override seed for this level
    return null;
};


// create level data for all game levels... debug feature should not be enabled for releases
CreateLevelData.createAllData = function()
{
    // start of copy and paste region
    console.log("***** start of level data *****");

    // structure head
    console.log("\n{\n\"levels\":\n[\n");

    var i;
    for( i = Main.generateFirstLevel - 1; i <= Main.generateLastLevel - 1; i++ )
    {
        var levelData = CreateLevelData.createLevelData( i );
        console.log( JSON.stringify(levelData) + (i < Main.generateLastLevel - 1 ? ",":"") );
    }

    // structure tail
    console.log("\n]\n}\n");

    // end of copy and paste region
    console.log("*****  end of level data  *****");
};
