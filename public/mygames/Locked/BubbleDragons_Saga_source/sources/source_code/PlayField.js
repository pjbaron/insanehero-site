//
// PlayField.js
//
// 2017 Pete Baron
//
// Contains code to initialise and maintain the game's play area
//




function PlayField( _game )
{
    this.game = _game;
    this.grid = null;
    this.gridCollide = null;
    this.scrollY = 0;
    this.introScroll = true;
    this.scrollBackAllowed = true;
    this.scrollDownBonus = false;
    this.bg = null;
    this.uiPanel = null;
    this.rightBlanker = null;
    this.topBar = null;
    this.barrier = null;
    this.barrierHighlight = null;
    this.hitGong = false;
    this.lowestBubbleY = 0;
    this.explosionList = null;
    this.resizeChargeBlocker = 0;
    this.looseFall = false;
    this.killLoose = false;
}


PlayField.prototype.create = function( _world, _managers, _level, _levelData )
{
    this.world = _world;
    this.managers = _managers;
    this.level = _level;
    this.levelData = _levelData;

    this.resizeChargeBlocker = 0;
    this.scrollY = -1;
    this.introScroll = true;            // scroll past entire playfield at start of level
    this.scrollBackAllowed = true;
    this.scrollDownBonus = false;
    Main.bubbleLayer.y = Math.floor(this.scrollY * Main.bubbleLayer.scale.y);

    Game.boostType = SpriteData[this.levelData.boost.id].type;
    Game.boostFullCost = this.levelData.boost.cost * 1;
    Game.boostGainCost = this.levelData.boost.gain * 1;

    // background image
    this.bg = new Sprite();
    this.bg.create( Main.bgImage, this.levelData.BackgroundImage, this.managers.textures );
    this.bg.anchor.set( 0.5 );

    // side bars
    this.uiPanel = new Sprite();
    this.uiPanel.create( Main.backgroundLayer, "blanker", this.managers.textures, -Game.sideBarOffset, 0, false );
    this.uiPanel.scale.set( 5.0, 8.0 );
    this.uiPanel.anchor.set( 1.0, 0.5 );
    this.uiPanel.alpha = 0.75;

    this.rightBlanker = new Sprite();
    this.rightBlanker.create( Main.backgroundLayer, "blanker", this.managers.textures, Game.sideBarOffset, 0, false );
    this.rightBlanker.scale.set( 4.0, 8.0 );
    this.rightBlanker.anchor.set( 0.0, 0.5 );
    this.rightBlanker.alpha = 0.75;

    this.hitGong = false;
    this.lowestBubbleY = 0;
    this.explosionList = [];
    this.looseFall = false;
    this.killLoose = false;

    this.createGrid( Game.width, Game.height );

    // when we run out of level data, start from the beginning again
    this.populateLevel( this.levelData );

    // requires gridCollide created in populateLevel
    var p = this.gridCollide.gridToBubble( { x: 0, y: -0.40 } );
    this.topBar = new Sprite();
    this.topBar.create( Main.bubbleLayer, SpriteData.CEILING_BEAM.type, this.managers.textures, 0, p.y, false );
    this.topBar.anchor.set( 0.5, 1.0 );
    this.topBar.scale.set( Main.backgroundLayer.bubbleAreaWidth / (1920 * Main.bubbleLayer.scale.x) ); // 1920 = bar art width

    if (Game.levelType == LevelType.GOAL_PROTECT_BARRIER)
    {
        // bonus award if map has to scroll down faster
        this.scrollDownBonus = true;

        // barrier gets repositioned on first update by Main.resized flag
        // we can't set correct position yet because this function is called before Main._createUI which locates the launcher
        this.barrier = new Sprite();
        this.barrier.create( Main.backgroundLayer, "barrier.png", this.managers.textures, 0, 0, false );
        this.barrier.anchor.set( 0.5, 0.0 );
        this.barrier.scale.set( Main.backgroundLayer.bubbleAreaWidth / (1520 * Main.backgroundLayer.scale.x) ); // 1520 = dome art width
        this.barrier.alpha = 0;

        this.barrierHighlight = new Sprite();
        this.barrierHighlight.create( Main.backgroundLayer, "barrier_red.png", this.managers.textures, 0, 0, false );
        this.barrierHighlight.anchor.set( 0.5, 0.0 );
        this.barrierHighlight.scale.set( Main.backgroundLayer.bubbleAreaWidth / (1520 * Main.backgroundLayer.scale.x) );
        this.barrierHighlight.visible = false;
    }
};


PlayField.prototype.destroy = function()
{
    this.gridCollide.destroy();
    this.gridCollide = null;

    if ( this.bg )
    {
        this.bg.destroy();
        this.bg = null;
    }

    if ( this.uiPanel )
    {
        this.uiPanel.destroy();
        this.uiPanel = null;
    }

    if ( this.rightBlanker )
    {
        this.rightBlanker.destroy();
        this.rightBlanker = null;
    }

    if ( this.topBar )
    {
        this.topBar.destroy();
        this.topBar = null;
    }

    if ( this.barrier )
    {
        this.barrier.destroy();
        this.barrier = null;
    }

    if ( this.barrierHighlight )
    {
        this.barrierHighlight.destroy();
        this.barrierHighlight = null;
    }

    this.clearAll();
    this.grid = null;

    this.game = null;
    this.world = null;
    this.managers = null;
};


PlayField.prototype.clearAll = function()
{
    // when this is called from World it needs to fake the end of the level...
    // doesn't do any harm to adjust these when it is called from destroy
    this.game.foodCount = 0;
    this.hitGong = true;

    if ( this.grid )
    {
        for(var y = 0; y < this.grid.length; y++)
        {
            for(var x = 0; x < this.grid[y].length; x++)
            {
                if ( this.grid[y][x] && this.grid[y][x] != -1 )
                {
                    this.grid[y][x].destroy();
                    this.grid[y][x] = null;
                }
            }
        }
    }
};


// TODO: debug only, find sprites which are not in the grid
// PlayField.prototype.verifyGrid = function()
// {
//     var sprites = Main.bubbleLayer.children.slice(0);
//     for(var y = 0; y < this.grid.length; y++)
//     {
//         for(var x = 0; x < this.grid[y].length; x++)
//         {
//             var b = this.grid[y][x];
//             if ( b && b != -1 && b.sprite )
//             {
//                 var j = sprites.indexOf(b.sprite);
//                 if ( j != -1 ) sprites.splice(j, 1);
//             }
//         }
//     }
//     for(var i = 0; i < sprites.length; i++)
//     {
//         if ( sprites[i].key != "game_top" )
//             console.log("WARNING: sprite not in grid: " + sprites[i].key );
//     }
// };

var rd = -0.01;

// return false on level end or no more moves
PlayField.prototype.update = function()
{
    var launcherLoc = this.world.getLauncherLocation( Main.gameUILayer );

    if ( Main.resized )
    {
        this.adjustScroll();
        this.resizeChargeBlocker = Game.frameCount;
        this.setBarrierPosition();
    }

    var highestBubbleY = Number.POSITIVE_INFINITY;
    this.lowestBubbleY = Number.NEGATIVE_INFINITY;

    // animate the sprites we 'own'
    this.topBar.update();

    // process one entry from the explosionList (FIFO)
    if ( this.explosionList && this.explosionList.length > 0 )
    {
        if ( Main.nowTime > this.explosionList[0].when )
        {
            var e = this.explosionList.shift();
            if ( Main.debug )
                console.log( "*** explosion *** at " + e.loc.x + "," + e.loc.y + " list length now = " + this.explosionList.length );
            // start animation effect for explosion
            var uiLoc = this.gridCollide.gridToGameUi( e.loc );
            World.effects.add( Effects.EXPLOSION, Main.gameUILayer, uiLoc.x, uiLoc.y );
            // pop all neighbouring bubbles to radius of 2
            this.radiusEffect( e.loc, Math.sqrt(5), this.explodeBubble );
            // newly isolated groups fall
            this.looseFall = true;
        }
    }

    var bubbles = this.getAllBubbles();
    for( var i = bubbles.length - 1; i >= 0; --i )
    {
        var bubble = bubbles[i];
        if (bubble && bubble.game !== null)
        {
            if ( bubble.update() )
            {
                if ( !bubble.sprite )
                {
                    bubbles.splice(i, 1);
                    bubble.destroy();
                }
                else
                {
                    var loc = this.gridCollide.bubbleToGameUi(bubble.sprite);
                    if (loc.y > this.lowestBubbleY)
                        this.lowestBubbleY = loc.y;
                    if (loc.y < highestBubbleY)
                        highestBubbleY = loc.y;
                }
            }
            else
            {
                bubbles.splice(i, 1);
            }
        }
        else
        {
            bubbles.splice(i, 1);
        }
    }

    if ( this.lowestBubbleY == Number.NEGATIVE_INFINITY )
    {
        if ( Main.debug )
            console.log( "WARNING: PlayField lowestBubbleY wasn't set.  May be harmless." );
        return false;
    }

    this.lowestBubbleYOffset = (launcherLoc.y - this.lowestBubbleY);

    if ( bubbles.length > 0 )
    {
        var newY = this.scrollControl( launcherLoc );
        this.scrollY = newY;
        this.gridCollide.offsetY = this.scrollY;
        Main.bubbleLayer.y = Math.floor(this.scrollY * Main.bubbleLayer.scale.y);
    }

    if ( !this.introScroll )
    {
        if ( Game.levelType == LevelType.GOAL_PROTECT_BARRIER )
        {
            var b = this.barrierHighlight.visible;
            if ( this.lowestBubbleY > launcherLoc.y + Game.bubbleInvasionUrgent )
            {
                // fast blink when touching the line
                this.barrierHighlight.visible = ((Main.nowTime % 500) > 250) ? false : true;
                if ( this.barrierHighlight.visible && !b )
                    this.managers.audio.play( "snd_warning" );

                // gently fade the white dome as it gets weaker
                if ( this.barrier.alpha > 0.2 )
                    this.barrier.alpha -= 0.01;
            }
            else if ( this.lowestBubbleY > launcherLoc.y + Game.bubbleInvasionWarning )
            {
                // slow blink when approaching the line
                this.barrierHighlight.visible = ((Main.nowTime % 1000) > 500) ? false : true;
                if ( this.barrierHighlight.visible && !b )
                    this.managers.audio.play( "snd_warning" );
            }
            else
            {
                // we're safe again, make barrier fade in and disable the highlight
                this.barrierHighlight.visible = false;
                if ( this.barrier.alpha < 1.0 )
                    this.barrier.alpha += 0.1;
            }

        }
    }

    // make sure grid collisions are locked to the PlayField scroll
    this.gridCollide.offsetY = this.scrollY;

    // added integer scrolling to avoid half-pixel fuzziness
    Main.bubbleLayer.y = Math.floor(this.scrollY * Main.bubbleLayer.scale.y);

    // if we've triggered a check then find all loose bubbles
    // and either make them fall or kill them
    if ( this.looseFall || this.killLoose )
    {
        this.looseFallNow( this.killLoose );
        this.looseFall = false;
        this.killLoose = false;
    }

    // return false if we've popped them all
    var numInGrid = Main.bubbleLayer.children.length - (this.topBar ? 1 : 0);
    return (numInGrid > 0);
};


PlayField.prototype.setBarrierPosition = function()
{
    if ( this.barrier )
    {
        var launcherLoc = this.world.getLauncherLocation( this.barrier.parent );
        this.barrier.x = this.barrierHighlight.x = launcherLoc.x;
        this.barrier.y = this.barrierHighlight.y = launcherLoc.y + Game.barrierOffsetY;
    }
};


/// called from Shooter when a shot is flying, _time is the elapsed time since it was launched
PlayField.prototype.shotFired = function( _time )
{
    this.world.updateLauncherEffect(_time);
};


// return true if a survival level was invaded
PlayField.prototype.invaded = function()
{
    // bubble invasion
    switch(Game.levelType)
    {
        case LevelType.GOAL_PROTECT_BARRIER:
            this.setBubbleValues();
            var launcherLoc = this.world.getLauncherLocation( this.barrier.parent );
            if ( !this.introScroll && this.lowestBubbleY > launcherLoc.y + Game.bubbleInvasionY )
            {
                this.barrierHighlight.visible = true;
                return true;
            }
            break;
    }
    return false;
};

// return true if the level is won
PlayField.prototype.won = function()
{
    var numInGrid = Main.bubbleLayer.children.length - (this.topBar ? 1 : 0);

    switch(Game.levelType)
    {
        case LevelType.GOAL_PROTECT_BARRIER:
            return (numInGrid <= 0);

        case LevelType.GOAL_RESCUE_FISH:
            return (this.game.foodCount <= 0);

        case LevelType.GOAL_BREAK_EGG:
            return (this.hitGong &&
                    numInGrid <= 0);
    }
    return false;
};


PlayField.prototype.createGrid = function( _width, _height )
{
    this.grid = [];
    for(var y = 0; y < _height; y++)
    {
        this.grid[y] = [];
        for(var x = 0; x < _width * 2 - 1; x++)
        {
            // mark alternate grid locations as unusable with -1
            // alternate lines start on 0 or 1 index to make a chequer-board pattern
            this.grid[y][x] = (y & 1) ? ((x & 1) ? 0 : -1) : ((x & 1) ? -1 : 0);
        }
    }

};


// recursive 6 directional flood-fill expansion
// specify only _loc and _typeToMatch on initial call, lists are auto-generated
// returns list of all bubbles that match _typeToMatch and activates all affected special bubbles
PlayField.prototype.colourMatch = function( _loc, _typeToMatch, _matches, _visited )
{
    if ( _matches === undefined ) _matches = [];
    if ( _visited === undefined ) _visited = [];

    _visited.push(_loc);

    var bubble, nl;

    nl = { x:_loc.x - 2, y: _loc.y };
    if ( (bubble = this.bubbleCheck(nl, _typeToMatch, _visited)) )
    {
        _matches.push( { bubble: bubble, loc: nl } );
        this.colourMatch( nl, bubble.type, _matches, _visited );
    }
    nl = { x:_loc.x + 2, y: _loc.y };
    if ( (bubble = this.bubbleCheck(nl, _typeToMatch, _visited)) )
    {
        _matches.push( { bubble: bubble, loc: nl } );
        this.colourMatch( nl, bubble.type, _matches, _visited );
    }
    nl = { x:_loc.x - 1, y: _loc.y - 1 };
    if ( (bubble = this.bubbleCheck(nl, _typeToMatch, _visited)) )
    {
        _matches.push( { bubble: bubble, loc: nl } );
        this.colourMatch( nl, bubble.type, _matches, _visited );
    }
    nl = { x:_loc.x + 1, y: _loc.y - 1 };
    if ( (bubble = this.bubbleCheck(nl, _typeToMatch, _visited)) )
    {
        _matches.push( { bubble: bubble, loc: nl } );
        this.colourMatch( nl, bubble.type, _matches, _visited );
    }
    nl = { x:_loc.x - 1, y: _loc.y + 1 };
    if ( (bubble = this.bubbleCheck(nl, _typeToMatch, _visited)) )
    {
        _matches.push( { bubble: bubble, loc: nl } );
        this.colourMatch( nl, bubble.type, _matches, _visited );
    }
    nl = { x:_loc.x + 1, y: _loc.y + 1 };
    if ( (bubble = this.bubbleCheck(nl, _typeToMatch, _visited)) )
    {
        _matches.push( { bubble: bubble, loc: nl } );
        this.colourMatch( nl, bubble.type, _matches, _visited );
    }

    return _matches;
};


PlayField.prototype.matchAt = function( gl, bubble, matchSize )
{
    if ( !bubble.sprite ) return;
    
    // match colours around this location
    var matched = this.colourMatch( gl, bubble.sprite.type );

    // add the new bubble to the list too
    matched.push( { bubble: bubble, loc: gl } );

//console.log( "matched " + matched.length + " at " + gl.x + "," + gl.y );

    // add pulse wave effect to all neighbours
    this.radiusEffect( gl, Math.sqrt(5), this.pulseBubble );

    // match 3 minimum
    if ( matched.length >= matchSize )
    {
        // remove spurious matches via wild bubbles (e.g. wild is touching two red and one blue will trigger all four of them)
        var remaining = this.reduceMatches( matched );

        if ( Main.debug )
            console.log( "matched " + remaining.length + " at " + gl.x + "," + gl.y );

        if ( remaining.length >= matchSize )
        {
            // remove all remaining matched bubbles
            this.removeList( remaining );
        }
    }
};


// is this location a bubble which matches, and is not already visited?
PlayField.prototype.bubbleCheck = function( _loc, _typeToMatch, _visited )
{
    // in grid?
    if ( _loc.y < 0 || _loc.y >= this.grid.length ) return null;
    if ( _loc.x < 0 || _loc.x >= this.grid[_loc.y].length ) return null;

    // a bubble?
    var bubble = this.grid[_loc.y][_loc.x];
    if ( !bubble || bubble == -1 ) return null;

    // not the egg?
    if ( bubble.overlay && bubble.overlay.type == SpriteData.EGG ) return null;

    // matching?
    if ( _typeToMatch && !bubble.matchCheck( _typeToMatch ) ) return null;

    // unvisited?
    if ( Utils.findPointInList( _loc, _visited ) != -1 ) return null;

    return bubble;
};


// due to the recursive pattern matching used, a single wild that matches a
// pair of (e.g.) red, will match a single (e.g.) blue that it is also touching
// Reduce the match list to remove those spurious matches
// _matches is a list of objects with { bubble, loc }
PlayField.prototype.reduceMatches = function( _matches, _matchSize )
{
    var remaining = [];
    var counts = [];

    // count the number of matches for each colour key
    for(var i = 0, l = _matches.length; i < l; i++)
    {
        remaining.push(_matches[i]);
        var t = _matches[i].bubble.type;
        if ( t == SpriteData.ICE.type ) t = _matches[i].bubble.under_type;
        counts[t] = counts[t] + 1 || 1;
    }

    // get the number of wild bubbles in this mixture
    var wild = counts[SpriteData.RAINBOW.type] || 0;
    delete counts[SpriteData.RAINBOW.type];

    // remove any colour with < _matchSize when added to the number of wilds
    function getList(_list, _i) { return _list[_i].bubble; }
    for(var type in counts)
    {
        if ( counts[type] + wild < _matchSize )
        {
            remaining = Utils.removeFromIndexedList( remaining, getList, "type", type );
        }
    }

    return remaining;
};


// remove all the bubbles in this list and make any isolated groups fall
PlayField.prototype.removeList = function( _list )
{
    var i, l;

    // remove all of the _list bubbles from the grid and pop them
    for( i = 0, l = _list.length; i < l; i++ )
    {
        var loc = _list[i].loc;
        var bubble = _list[i].bubble;
        if ( bubble )
        {
            bubble.pop(loc);
        }
    }
};


PlayField.prototype.looseFallNow = function( _killLoose )
{
    var i, l, x, y, l2;
    var loc, bubble;

    // all bubbles in the grid
    var allBubbles = [];

    // all bubbles at the top of the grid
    var topList = [];
    for( y = 0, l = this.grid.length; y < l; y++ )
    {
        for( x = 0, l2 = this.grid[y].length; x < l2; x++ )
        {
            bubble = this.grid[y][x];
            if ( bubble && bubble != -1 )
            {
                allBubbles.push( { x: x, y: y } );
                if ( y === 0 )
                {
                    topList.push( { x: x, y: y } );
                }
            }
        }
    }

    if (Main.debug)
    {
        console.log("looseFall found " + allBubbles.length + " bubbles, with " + topList.length + " at the top");
    }

    if ( !this.hitGong )
    {
        // remove from the list all bubbles that are connected to the top of the level
        for( i = 0, l = topList.length; i < l; i++ )
        {
            // items are removed from topList by nulling, skip those
            if ( topList[i] )
            {
                // _loc, _callback, _param1, _param2, _visited
                this.connectedGroup( topList[i], this.removeFromList, topList, allBubbles );
            }
        }
    }

    // make remaining (disconnected) bubbles fall
    var c = 0;
    for( i = 0, l = allBubbles.length; i < l; i++ )
    {
        loc = allBubbles[i];
        if ( loc )
        {
            bubble = this.grid[loc.y][loc.x];
            if ( bubble && bubble != -1 )
            {
                c++;

                // during level initialisation we should kill all loose bubbles instead of dropping them
                if ( _killLoose )
                {
                    bubble.destroy();
                    this.grid[loc.y][loc.x] = 0;
                    continue;
                }

                // don't drop explosions that have been triggered, leave them there to explode in their own time
                if ( bubble.type == SpriteData.BOMB.type && bubble.sprite.animation == "waiting" )
                {
                    continue;
                }

                var e;
                var drop = true;

                // if the bubble had something attached to it
                if (bubble.overlay)
                {
                    drop = bubble.releaseOverlay( true );
                }

                if ( drop )
                {
                    this.dropBubble( bubble );
                }

                bubble.destroy();
            }

            //if (this.grid[loc.y][loc.x] == - 1)
                //alert("SNAFU!");

            this.grid[loc.y][loc.x] = 0;
        }
    }

    if ( Main.debug )
    {
        console.log("looseFallNow dropped " + c + " bubbles");
    }
};


PlayField.prototype.dropBubble = function( _bubble )
{
    var uiLoc = this.gridCollide.bubbleToGameUi( _bubble.sprite );
    if ( Main.debugSpam )
        console.log("dropping bubble " + uiLoc.x + "," + uiLoc.y);
    // _type, _parent, _x, _y, _callback, _callbackCtx, _behind
    var e = World.effects.add( Effects.FALL_BUBBLE, Main.gameUILayer, uiLoc.x, uiLoc.y, Effects.bubbleFall, null, true );   //this.hitGong );

    // award score for every bubble that falls depending on it's type
    var score = this.droppingScore( _bubble );
    Game.score += score;
    
    if ( e )
    {
        e.setFrame( _bubble.sprite.key );
        var ft = new FloatText();
        // _x, _y, _style, _parent, _managers, _message, _distance, _delay
        ft.create(e.x, e.y, Main.textStyleBoldSmall, Main.gameUILayer, this.managers, score.toString());
    }

    // charge up the boost for every bubble that falls
    if ( Game.boostCanCharge )
        Game.boostCharge += Game.dropBubbleBoost;
};


// 'good' bubbles score more than 'bad' bubbles when they are dropped
PlayField.prototype.droppingScore = function( _bubble )
{
    var score = 0;
    if ( _bubble.overlay )
    {
        switch( _bubble.overlay.type )
        {
            // food, gong and fairy are 'good' specials
            case SpriteData.FISH.type:
            case SpriteData.EGG.type:
            case SpriteData.DRAGON_ORANGE.type:
                score = Game.scoreSpecialGoodDrop;
                break;
            // bat is a 'bad' special
            case SpriteData.DRAGON_PURPLE.type:
                score = Game.scoreSpecialBadDrop;
                break;
            default:
                score = Game.scoreFirstDrop;
                break;
        }
    }
    else
    {
        switch( _bubble.type )
        {
            // "bad" special bubble
            case SpriteData.ICE.type:
                score = Game.scoreSpecialBadDrop;
                break;
            case SpriteData.RAINBOW.type:
            case SpriteData.BOMB.type:
            case SpriteData.ROCKET.type:
                score = Game.scoreSpecialGoodDrop;
                break;
            default:
                score = Game.scoreFirstDrop;
                break;
        }
    }
    return score;
};

// callback to remove a given location from a list of locations by nulling it
PlayField.prototype.removeFromList = function( _loc, _list )
{
    var i = Utils.findPointInList( _loc, _list );
    if ( i !== -1 ) _list[i] = null;
};


// recursive 6 directional flood-fill expansion
// specify only _loc on initial call, visited list is auto-generated
// callback for all bubbles that are connected to _loc
PlayField.prototype.connectedGroup = function( _loc, _callback, _param1, _param2, _visited )
{
    if ( _visited === undefined ) _visited = [];

    _visited.push(_loc);
    _callback( _loc, _param1 );
    _callback( _loc, _param2 );

    var bubble, nl;

    nl = { x:_loc.x - 2, y: _loc.y };
    if ( (bubble = this.bubbleCheck(nl, null, _visited)) )
    {
        this.connectedGroup( nl, _callback, _param1, _param2, _visited );
    }
    nl = { x:_loc.x + 2, y: _loc.y };
    if ( (bubble = this.bubbleCheck(nl, null, _visited)) )
    {
        this.connectedGroup( nl, _callback, _param1, _param2, _visited );
    }
    nl = { x:_loc.x - 1, y: _loc.y - 1 };
    if ( (bubble = this.bubbleCheck(nl, null, _visited)) )
    {
        this.connectedGroup( nl, _callback, _param1, _param2, _visited );
    }
    nl = { x:_loc.x + 1, y: _loc.y - 1 };
    if ( (bubble = this.bubbleCheck(nl, null, _visited)) )
    {
        this.connectedGroup( nl, _callback, _param1, _param2, _visited );
    }
    nl = { x:_loc.x - 1, y: _loc.y + 1 };
    if ( (bubble = this.bubbleCheck(nl, null, _visited)) )
    {
        this.connectedGroup( nl, _callback, _param1, _param2, _visited );
    }
    nl = { x:_loc.x + 1, y: _loc.y + 1 };
    if ( (bubble = this.bubbleCheck(nl, null, _visited)) )
    {
        this.connectedGroup( nl, _callback, _param1, _param2, _visited );
    }
};


// breadth-first expansion to radius with callback on each location
PlayField.prototype.radiusEffect = function( _loc, _radius, _callback )
{
    for(var x = Math.floor(_loc.x - _radius * 2); x <= _loc.x + _radius * 2; x++)
    {
        for(var y = Math.floor(_loc.y - _radius); y <= _loc.y + _radius; y++)
        {
            var where = { x: x, y: y };
            var bubble = this.gridCollide.get( where );
            if ( bubble && bubble != -1 )
            {
                var dx = (_loc.x - x) / 2;
                var dy = _loc.y - y;
                var dist = Math.sqrt( dx * dx + dy * dy );
                if ( dist <= _radius )
                {
                    _callback.call( this, bubble, _loc, where, dist );
                    //console.log(x, y);
                }
            }
        }
    }
};


PlayField.prototype.explodeBubble = function( _bubble, _firstLoc, _loc, _range )
{
    var e;

//  if (Main.debug)
//      console.log("explode bubble at " + _loc.x + "," + _loc.y + " range=" + _range);

    // verify that bubble hasn't been destroyed already
    var b = this.grid[_loc.y][_loc.x];
    if ( b && b != -1 && b == _bubble )
    {
        // don't blow up the egg when it has started to crack already
        if ( _bubble.type == SpriteData.EGG.type && _bubble.sprite.animation == "cracking" )
        {
            // make the egg wobble if an explosion hits it but doesn't break it open
            _bubble.wobble( 0.75, 8, 4 );
            return false;
        }

        switch( _bubble.type )
        {
            case SpriteData.BOMB.type:
            {
                if ( _bubble.sprite.animation == "default" )
                {
                    // make this bomb explode after we've finished with the current one
                    this.addExplosion( _loc, _bubble );
                    if (Main.debug)
                        console.log("bomb chain reaction at " + _loc.x + "," + _loc.y + " list = " + this.explosionList.length);
                    return true;
                }

                // must be "waiting"
                // don't pop pending bombs until they are the centre of their own explosions
                if ( _loc.x != _firstLoc.x || _loc.y != _firstLoc.y )
                {
                    return true;
                }
                break;
            }

            case SpriteData.ROCKET.type:
            {
                // fire rockets which are caught in bomb explosions
                if ( Main.debug )
                    console.log("explosion triggered rocket bubble at " + _loc.x + "," + _loc.y);
                // add special effect rocket to fly and pop
                e = World.effects.add( Effects.ROCKET, Main.bubbleLayer, _bubble.sprite.x, _bubble.sprite.y, this.rocketLogic, this );
                if ( e )
                {
                    this.managers.audio.play( "snd_firework_launch" );
                    e.scale.x *= Utils.sign0(_bubble.sprite.scale.x);
                    e.vx = 50 * Utils.sign0(_bubble.sprite.scale.x);
                }
                break;
            }

            case SpriteData.ICE.type:
            {
                // crack open shells from explosion
                if ( Main.debug )
                    console.log("explosion opened shell at " + _loc.x + "," + _loc.y);
                this.crackShell( _bubble, _loc, true );
                break;
            }

            case SpriteData.EGG.type:
            {
                // make the egg wobble if an explosion hits it but doesn't break it open
                _bubble.wobble( 0.75, 8, 4 );
                // if ( _firstLoc.x == _loc.x && _firstLoc.y == _loc.y )
                // {
                //     this.crackEgg(_bubble);
                //     break;
                // }
                // don't pop the 'bubble' that the gong is hanging from unless it's a direct hit
                return true;
            }
        }

        // destroy the bubble, make the overlay fall
        _bubble.pop(_loc);
        return true;
    }
    return false;
};


PlayField.prototype.pulseBubble = function( _bubble, _firstLoc, _loc, _range )
{
    if ( !_bubble.updateCallback )
    {
        // set pulse movement away from _firstLoc scaled by _range
        // (oscillation with decay)
        var dy = (_loc.y - _firstLoc.y) * _range * Game.pulseScaler;
        var dx = (_loc.x - _firstLoc.x) * _range * Game.pulseScaler * (dy === 0 ? 0.5 : 1);
        _bubble.px = _bubble.sprite.x;
        _bubble.py = _bubble.sprite.y;
        _bubble.sprite.x += dx;
        _bubble.sprite.y += dy;
        _bubble.vx = _bubble.vy = 0;
        _bubble.updateCallback = function(bubble)
        {
            // accelerate towards original position
            bubble.vx += (bubble.px - bubble.sprite.x) * 0.125;
            bubble.vy += (bubble.py - bubble.sprite.y) * 0.125;
            // decay velocity and apply it to current position
            bubble.sprite.x += (bubble.vx *= Game.pulseDecay);
            bubble.sprite.y += (bubble.vy *= Game.pulseDecay);
            // stop when slow AND near original position
            if ( Math.abs(bubble.vx) < 0.25 && Math.abs(bubble.vy) < 0.25 &&
                 Math.abs(bubble.sprite.x - bubble.px) < 0.1 && Math.abs(bubble.sprite.y - bubble.py) < 0.1 )
            {
                bubble.updateCallback = null;
                // finish exactly where we started
                bubble.sprite.x = bubble.px;
                bubble.sprite.y = bubble.py;
            }
        };
        return true;
    }
    return false;
};


PlayField.prototype.addExplosion = function( _loc, _bubble )
{
    var d;
    var l = this.explosionList.length;

    if ( l === 0 )
        d = Main.nowTime + Game.chainReactionDelay;
    else
        d = this.explosionList[l - 1].when + Game.chainReactionDelay;

    // make bomb change colour to indicate it's getting ready to blow (and prevent recursive problems)
    _bubble.sprite.setAnimation( "waiting", false, true );

    // add it to the explosion list with a time when it should explode
    this.explosionList.push( { loc: _loc, when: d } );
};


PlayField.prototype.autoScroll = function( _distance )
{
    this.scrollY += _distance;
};


// trigger all special events that result from a direct hit around the location _grid
// (e.g. bombs explode, gong rings, etc)
PlayField.prototype.directHit = function( _grid )
{
    var nl = { x:_grid.x - 2, y: _grid.y };
    this.hit( nl );
    nl = { x:_grid.x + 2, y: _grid.y };
    this.hit( nl );
    nl = { x:_grid.x - 1, y: _grid.y - 1 };
    this.hit( nl );
    nl = { x:_grid.x + 1, y: _grid.y - 1 };
    this.hit( nl );
    nl = { x:_grid.x - 1, y: _grid.y + 1 };
    this.hit( nl );
    nl = { x:_grid.x + 1, y: _grid.y + 1 };
    this.hit( nl );
};


// trigger all special events that result from a direct hit at the location _grid
// (e.g. bombs explode, gong rings, etc)
// _fast is only used by fireball to indicate that it is fast enough to crack the egg
// return true if we hit something and it has been handled
PlayField.prototype.hit = function( _grid, _fast )
{
    if ( _grid.y < 0 || _grid.y >= this.grid.length ) return;
    if ( _grid.x < 0 || _grid.x >= this.grid[0].length ) return;
    var bubble = this.grid[_grid.y][_grid.x];
    if ( bubble )
    {
        var e;
        var uiLoc;
        switch( bubble.type )
        {
            case SpriteData.BOMB.type:
                if ( Main.debug )
                    console.log("direct hit on bomb bubble at " + _grid.x + "," + _grid.y);

                // change bubble key before explosion to prevent chain-reaction loop
                bubble.sprite.key = "invalid_key";

                // add animation effect for explosion
                uiLoc = this.gridCollide.gridToGameUi( _grid );
                World.effects.add( Effects.EXPLOSION, Main.gameUILayer, uiLoc.x, uiLoc.y );

                // pop all neighbouring bubbles to radius of 2
                this.radiusEffect( _grid, Math.sqrt(5), this.explodeBubble );

                // newly isolated groups fall
                this.looseFall = true;
                break;

            case SpriteData.ROCKET.type:
                if ( Main.debug )
                    console.log("hit rocket bubble at " + _grid.x + "," + _grid.y);

                // add special effect rocket to fly and pop
                e = World.effects.add( Effects.ROCKET, Main.bubbleLayer, bubble.sprite.x, bubble.sprite.y, this.rocketLogic, this );
                if ( e )
                {
                    this.managers.audio.play( "snd_firework_launch" );
                    e.scale.x *= Utils.sign0(bubble.sprite.scale.x);
                    e.vx = 50 * Utils.sign0(bubble.sprite.scale.x);
                }
                // remove the rocket 'bubble' so that the hitting bubble can fall immediately
                bubble.destroy();
                break;

            case SpriteData.ICE.type:
                if ( Main.debug )
                    console.log("hit shell bubble at " + _grid.x + "," + _grid.y + " " + bubble.under_type);
                //// logic moved into PlayField.matchAt function for delayed reveal and pop (or no pop)
                this.crackShell( bubble, _grid, false );
                //// time tag the contact so we can recognise it is valid in the match logic
                //bubble.directHitAt = Main.nowTime;
                //// give it a reference to the PlayField for when the shell needs to crack
                //bubble.playField = this;

                break;

            case SpriteData.EGG.type:
                if ( Main.debug )
                    console.log("hit egg bubble at " + _grid.x + "," + _grid.y);

                // _fast is only used by fireball to indicate that it is still fast enough to crack the egg
                if ( _fast || _fast === undefined )
                {
                    this.crackEgg( bubble );
                    // cancel any wobble, the egg is cracking
                    bubble.wobble( 0,0,0 );
                }
                else
                {
                    // NOTE: relies on the fact that only the fireball ever sets the 'fast' parameter to either true or false
                    // call-stack = Shooter.specialCollide -> Shooter.triggerAndPopBubbleFromSprite -> PlayField.hit
                    // fireball hit an egg but wasn't fast enough to crack it, make it wobble
                    bubble.wobble( 1.0, 8, 4 );
                }
                return true;
        }
    }
    return false;
};


PlayField.prototype.crackShell = function( _bubble, _loc, _fake )
{
    this.managers.audio.play( "snd_ice_crack" );
    var uiLoc = this.gridCollide.gridToGameUi( _loc );

    // reveal bubble underneath
    _bubble.changeType( _bubble.under_type );

    if ( _fake )
    {
        // add a fake bubble in case the actual bubble gets destroyed immediately
        var fx = World.effects.add( Effects.FAKE_BUBBLE, _bubble.sprite.parent, _bubble.sprite.x, _bubble.sprite.y, this.fakeBubbleLogic, this );
        if ( fx )
        {
            fx.setFrame( _bubble.sprite.key );
            fx.createdTime = Main.nowTime;
        }
    }

    // break shell open above real/fake bubble in the same layer as the bubble so it moves when the level scrolls
    World.effects.add( Effects.CRACK_ICE, _bubble.sprite.parent, _bubble.sprite.x, _bubble.sprite.y );
};


PlayField.prototype.crackEgg = function( _bubble )
{
    // prevent this from happening multiple times (e.g. fireball)
    if ( _bubble.overlay )
    {
        this.managers.audio.play( "snd_crack" );
        // turn it into a cracking egg bubble
        _bubble.sprite.setAnimation("cracking", true, true);
        // remove the old overlay of the uncracked egg
        _bubble.overlay.destroy();
        _bubble.overlay = null;
        // animation speed = 6 frames per step
        _bubble.animDelay = 1000 / 60 * 6;
        _bubble.animTime = Main.nowTime + _bubble.animDelay;
        // give it a reference to the PlayField for when the egg finishes cracking
        // (everything falls down, dragon flies out)
        _bubble.playField = this;
        _bubble.updateCallback = function(bubble)
        {
            // spew out glitter
            if ( (Game.frameCount & 1) === 0)
            {
                var uiLoc = this.gridCollide.bubbleToGameUi( this.sprite );
                var n = Utils.near( uiLoc, Game.bubbleRadius );
                World.effects.add( Effects.SPARKLES_WHITE, Main.gameUILayer, n.x, n.y );
            }
        };
    }
};


// bespoke logic for the fairy boost, called back on update from Effects
// return false when the fairy Effect should be destroyed
// make a fairy booster fly across the screen
// and zap three bubbles on the way
// turning them all into 'special' bubble types
// pause shooting while this continues (PlayField.readyToFire)
// _fairy is a Sprite
PlayField.prototype.fairyBoostFly = function( _fairy )
{
    if ( _fairy.leaving )
    {
        _fairy.vx -= 12.0;
        _fairy.vy += Math.random() * 8 - 4;
        _fairy.x += _fairy.vx * Main.elapsedTime / 1000;
        _fairy.y += _fairy.vy * Main.elapsedTime / 1000;
        _fairy.vy *= 0.99;
        if (_fairy.x < -Game.sideBarOffset - Game.bubbleDiameter * 1)
        {
            _fairy.alpha -= 0.05;
            if ( _fairy.alpha <= 0 )
                return false;
        }
        return true;
    }

    if ( _fairy.type == SpriteData.DRAGON_BLUE.type && _fairy.animation == "shooting" )
    {
        if ( _fairy.frameIndex == 2 && !_fairy.shootingFlag )
        {
            // change the bubble we're over into a 'special' bubble
            this.changeToSpecial( _fairy.dest );
            _fairy.shootingFlag = true;

            // count how many we changed
            if ( _fairy.transformCount === undefined )
                _fairy.transformCount = 0;
            _fairy.transformCount++;
        }
        else if ( _fairy.frameIndex == 4 )
        {
            // now pick a new bubble further to the left
            var d = this.pickVisibleBubble(_fairy.dest.x - 8, _fairy.dest.x - 5, false);

            // exit if we can't find one, or if we've done three already
            if ( !d || _fairy.transformCount >= 3 )
            {
                if ( Main.debug )
                    console.log( "fairy leaving the grid..." );
                
                _fairy.leaving = true;
                // make dragon fly again
                _fairy.animation = "flying";
                // reset the boostCharge and flag
                Game.boostCharge = 0;
                Game.boostCanCharge = true;
                return true;
            }

            _fairy.dest = d;
            // make the fairy go up initially
            _fairy.vx = 0;
            _fairy.vy = -9;
            _fairy.target = this.grid[d.y][d.x];
            // make dragon fly again
            _fairy.animation = "flying";
        }
    }
    else if ( !Effects.swoopToGridTarget( _fairy, this, { x: -80, y: 35 } ) )
    {
        // add lightning bolt
        World.effects.add( Effects.DRAGON_LIGHTNING, _fairy.parent, _fairy.x, _fairy.y );

        // make dragon shake while shooting
        _fairy.setAnimation("shooting");
        _fairy.shootingFlag = false;
    }

    return true;
};


// bespoke logic for the +5 shots boost, called back on update from Effects
// return false when the Effect should be destroyed
// make a +5 booster fly across the screen from the charging bar
// to the shots counter
// pause shooting while this continues (PlayField.readyToFire)
PlayField.prototype.bonus5BoostFly = function( _boost5 )
{
    if ( !Effects.swoopToTarget( _boost5, this.game.world.GetTurnCountLocation() ) )
    {
        // reset the boostCharge and flag
        Game.boostCharge = 0;
        Game.boostCanCharge = true;
        Game.shotsLeft += 5;
        this.managers.audio.play( "snd_moves_up" );
        return false;
    }
    return true;
};


// wait a little while so the ice cracking effect can end, then add a pop effect here
PlayField.prototype.fakeBubbleLogic = function( _fakeBubble )
{
    if ( Main.nowTime < _fakeBubble.createdTime + 1000 )
        return true;
    var uiLoc = this.gridCollide.bubbleToGameUi( _fakeBubble );
    World.effects.add( Effects.POP_BUBBLE, Main.gameUILayer, uiLoc.x, uiLoc.y );
    return false;
};


// bespoke logic for the smoke, called back on update from Effects
// return false when the Effect should be destroyed
PlayField.prototype.smokeLogic = function( _smoke )
{
    // rise
    _smoke.y += _smoke.vy * Main.elapsedTime / 1000;
    _smoke.vy -= 10.0;
    // fade away slowly
    _smoke.alpha -= 0.03;
    if ( _smoke.alpha <= 0 ) return false;
    return true;
};


// bespoke logic for the rocket, called back on update from Effects
// return false when the Effect should be destroyed
// _rocket is the Sprite object
PlayField.prototype.rocketLogic = function( _rocket )
{
    var facing = Utils.sign0(_rocket.scale.x);
    // move the rocket using the facing direction
    _rocket.x += _rocket.vx * Main.elapsedTime / 1000;
    _rocket.vx = Math.min( _rocket.vx + 21 * facing, 880.0 );

    if ( (Game.frameCount & 1) === 0 )
    {
        World.effects.add( Effects.ROCKET_SMOKE, _rocket.parent, _rocket.x - Game.bubbleDiameter * 0.9 * facing, _rocket.y, this.smokeLogic, this );
    }

    // make fire stick to tail of rocket
    if ( _rocket.effectOverlay )
    {
        _rocket.effectOverlay.x = _rocket.x - Game.bubbleRadius * 1.3 * facing;
    }

    // fade then kill it at edges after making new loose bubbles fall
    var loc = this.gridCollide.bubbleToGrid( _rocket );
    if ( Math.abs(_rocket.x) > Game.gridOffsetX || !loc )
    {
        _rocket.alpha -= 0.05;
        if ( _rocket.alpha <= 0 )
        {
            this.looseFall = true;
            return false;
        }
        return true;
    }

    // pop all the bubbles we pass over
    var bubble = this.gridCollide.get(loc);
    if ( bubble )
    {

        switch( bubble.type )
        {
            case SpriteData.EGG.type:
                // when a rocket hits the egg, the rocket dies
                if ( Main.debug )
                    console.log("rocket hit egg bubble at " + loc.x + "," + loc.y);
                this.crackEgg( bubble );
                return false;

            case SpriteData.BOMB.type:
                // when a rocket hits a bomb, the bomb explodes and the rocket dies
                this.addExplosion( loc, bubble );
                this.looseFall = true;
                World.effects.add( Effects.EXPLOSION, Main.bubbleLayer, _rocket.x, _rocket.y );
                return false;

            case SpriteData.ICE.type:
                // crack open shells from rocket impact and the rocket dies
                this.crackShell( bubble, loc, true );
                return false;
        }
        bubble.pop(loc);
    }

    return true;
};


PlayField.prototype.dragonHatchLogic = function( _dragon )
{
    // create sparkle trail
    if ( (Game.frameCount & 7) === 0 )
    {
        var n = Utils.near( _dragon, Game.bubbleRadius / 2 );
        World.effects.add( Effects.SPARKLES_WHITE, _dragon.parent, n.x, n.y );
    }

    // make dragon grow larger
    _dragon.scale.set( _dragon.scale.x * 1.002 );

    // until the hoverDelay expires...
    if ( _dragon.hoverDelay > 0 )
    {
        // fly to target location
        if ( !Effects.swoopToTarget( _dragon, _dragon.dest ) )
        {
            _dragon.hoverDelay -= Main.elapsedTime;
        }
    }
    else
    {
        // afterwards fade until invisible
        _dragon.alpha -= Main.elapsedTime * 1.0 / 1000;
        if ( _dragon.alpha <= 0 )
        {
            return false;
        }
    }

    return true;
};



//
// methods for initialisation of the PlayField
//

var tan60 = Math.tan( 60 * Math.PI / 180 );

PlayField.prototype.populateLevel = function( _data )
{
    Math.mySeed( (this.game.level + 1) );
    //Main.bubbleLayer.scaleModifier = _data.nScale * 1;
    //Main.gameUILayer.scaleModifier = _data.nScale * 1;
    Main.forceResize = true;

    this.gridCollide = new GridCollide();
    this.gridCollide.create( this.grid, Game.bubbleRadius, Game.bubbleRadius * tan60 );

    var overlayCount = _data.goal_fish ? _data.goal_fish.count : 0;

    // build grid
    for( var y = 0; y < _data.height; y++ )
    {
        for( var x = 0; x < _data.width * 2 - 1; x++ )
        {
            if ( this.grid[y][x] != -1 )
            {
                // pick a bubble type for this grid location
                var typeName = Utils.pickRandomFromList( _data.list, Math.myRandom );
                var type = SpriteData[typeName].type;
                // create the grid symmetry if it is required
                type = this.symmetry( this.grid, x, y, type, _data.symmetry );
                // create the bubble
                var b = new Bubble( this.game, this.managers, this, this.gridCollide );
                b.create( Main.bubbleLayer, type, x, y );
            }
        }
    }

    // make holes in the grid if required
    if ( _data.holes )
    {
        this.makeHoles( _data.holes );
    }

    // kill all disconnected bubbles BEFORE we add the fish or Egg
    this.looseFallNow( true );

    // post-process the grid for this level type
    switch(Game.levelType)
    {
        case LevelType.GOAL_PROTECT_BARRIER:
            break;
        case LevelType.GOAL_RESCUE_FISH:
            // ensure there are enough overlay objects and they are nicely spread out in the grid
            this.game.foodCount = overlayCount;
            this.addOverlays( this.grid, overlayCount, _data.goal_fish );
            break;
        case LevelType.GOAL_BREAK_EGG:
            this.addGong();
            break;
    }

    // add special bubble types
    if ( _data.specials )
    {
        this.addSpecials( this.grid, _data.specials );
    }

    // NOTE: specials MUST NOT punch holes in the grid, they might result in fish or egg bubbles being disconnected and destroyed
};


PlayField.prototype.changeToSpecial = function( _loc )
{
    var newType = Utils.pickRandomFromList(["bomb", "rocket", "fairy", "bat"], Math.myRandom);
    if ( Main.debug )
        console.log( "changeToSpecial " + newType + " at " + _loc.x + "," + _loc.y);
    this.addOneSpecial( _loc, newType );
    //this.managers.audio.play( "snd_transform" );
};


// add one 'special' type to the location
PlayField.prototype.addOneSpecial = function( _loc, _type )
{
   switch( _type )
    {
        case "bomb":
            this.addBomb( this.grid, _loc );
            break;
        case "rocket":
            this.addRocket( this.grid, _loc );
            break;
        case "shell":
            this.addShell( this.grid, _loc );
            break;
        case "fairy":
            this.addFairy( this.grid, _loc );
            break;
        case "bat":
            this.addBat( this.grid, _loc );
            break;
    }
};


// add all the 'special' types in the _specials object list
PlayField.prototype.addSpecials = function( _grid, _specials )
{
    for(var i = 0, l = _specials.length; i < l; i++)
        this.addSpecial(_grid, _specials[i]);
};


// add a 'special' type (using the _special object which includes a 'number' field)
PlayField.prototype.addSpecial = function( _grid, _special )
{
    if ( _special.special_bomb !== undefined )
    {
        this.addBombs( _grid, _special.special_bomb );
    }
    if ( _special.special_rocket !== undefined )
    {
        this.addRockets( _grid, _special.special_rocket );
    }
    if ( _special.special_frozen_bubble !== undefined )
    {
        this.addShells( _grid, _special.special_frozen_bubble );
    }
    if ( _special.special_burst_dragon !== undefined )
    {
        this.addFairies( _grid, _special.special_burst_dragon );
    }
    if ( _special.special_carry_dragon !== undefined )
    {
        this.addBats( _grid, _special.special_carry_dragon );
    }
};


PlayField.prototype.addBats = function( _grid, _bats )
{
    var _this = this;
    this.findLocations( _grid, _bats.number, _bats, function(_loc)
        {
            return _this.addBat(_grid, _loc);
        } );
};


PlayField.prototype.addBat = function( _grid, _loc )
{
    var bubble = _grid[_loc.y][_loc.x];
    if ( bubble && bubble.isNormal() && !bubble.overlay )
    {
        var o = bubble.addOverlay( SpriteData.DRAGON_PURPLE.type );
        return o.parent;
    }
    return null;
};


PlayField.prototype.addFairies = function( _grid, _fairies )
{
    var _this = this;
    this.findLocations( _grid, _fairies.number, _fairies, function(_loc)
        {
            return _this.addFairy( _grid, _loc );
        } );
};


PlayField.prototype.addFairy = function( _grid, _loc )
{
    var bubble = _grid[_loc.y][_loc.x];
    if ( bubble && bubble.isNormal() && !bubble.overlay )
    {
        var o = bubble.addOverlay( SpriteData.DRAGON_ORANGE.type );
        return o.parent;
    }
    return null;
};


PlayField.prototype.addBombs = function( _grid, _bombs )
{
    var _this = this;
    this.findLocations( _grid, _bombs.number, _bombs, function(_loc)
        {
            return _this.addBomb( _grid, _loc );
        } );
};


PlayField.prototype.addBomb = function( _grid, _loc )
{
    var bubble = _grid[_loc.y][_loc.x];
    var o = null;
    if ( bubble && bubble.isNormal() && !bubble.overlay )
    {
        o = bubble.changeType( SpriteData.BOMB.type );
    }
    return o;
};


PlayField.prototype.addRockets = function( _grid, _rockets )
{
    var _this = this;
    var edgeGrid = this.createEdgeGrid( _grid, 3, 3 );
    this.findLocations( edgeGrid, _rockets.number, _rockets, function(_loc)
        {
            return _this.addRocket( _grid, _loc );
        } );
};


PlayField.prototype.addRocket = function( _grid, _loc )
{
    var bubble = _grid[_loc.y][_loc.x];
    var o = null;
    if ( bubble && bubble.isNormal() && !bubble.overlay )
    {
        o = bubble.changeType( SpriteData.ROCKET.type );
        if ( _loc.x >= Game.width * 2 / 2 ) o.sprite.scale.x = -Math.abs(o.sprite.scale.x);
    }
    return o;
};


PlayField.prototype.addShells = function( _grid, _shells )
{
    var _this = this;
    this.findLocations( _grid, _shells.number, _shells, function(_loc)
        {
            return _this.addShell( _grid, _loc );
        } );
};


PlayField.prototype.addShell = function( _grid, _loc )
{
    var bubble = _grid[_loc.y][_loc.x];
    var o = null;
    if ( bubble.isNormal() && !bubble.overlay )
    {
        o = bubble.changeType( SpriteData.ICE.type );
    }
    return o;
};


PlayField.prototype.addOverlays = function( _grid, _count, _overlay )
{
    var _this = this;

    this.findLocations( _grid, _count, _overlay, function(_loc)
        {
            var bubble = _grid[_loc.y][_loc.x];
            if ( bubble && bubble.isNormal(false) && !bubble.overlay )
            {
                var o = bubble.addOverlay( SpriteData.FISH.type );
                return o.parent;
            }
            return null;
        } );
};


PlayField.prototype.addGong = function()
{
    var grid = this.grid;

    var loc = { x: Math.floor(grid[0].length / 2), y: 0 };

    // keep trying until we find a bubble to hang the gong from!
    var bubble;
    var rx = loc.x;
    do{
        bubble = grid[loc.y][rx];
        if ( bubble == - 1 )
        {
            if (rx > Game.width * 2 / 2)
                rx--;
            else
                rx++;
            bubble = grid[loc.y][rx];
        }
        rx = Math.floor(Math.myRandom() * Game.width * 2);
    }while(!bubble);

    bubble.addOverlay( SpriteData.EGG.type );
    bubble.changeType( SpriteData.EGG.type );
    var _this = this;
    bubble.sprite.updateCallback = function(_sprite)
        {
            if ( _sprite.animation == "cracking" )
            {
                if ( _sprite.frameIndex == 3 && !_sprite.taskDone )
                {
                    // the egg cracks open to release a hatchling on it's frame 03
                    var s = _this.gridCollide.bubbleToGameUi( _sprite );
                    var hatchling = World.effects.add( Effects.DRAGON_GOLD, Main.gameUILayer, s.x, s.y, _this.dragonHatchLogic, _this );
                    if ( hatchling )
                    {
                        hatchling.dest = { x: 0, y: 0 };
                    }
                    _sprite.taskDone = true;
                }
                if ( _sprite.atEnd )
                {
                    _this.hitGong = true;
                    _this.looseFall = true;
                }
            }
        };
};


PlayField.prototype.makeHoles = function( _holes )
{
    for( var i = 0; i < _holes.number; i++ )
    {
        // pick a random occupied location until we find one without anything attached to the bubble
        var r, b;
        do
        {
            r = this.gridCollide.randomLocation( this.grid, true, Math.myRandom );
            b = this.grid[r.y][r.x];
        } while( b.overlay );

        // destroy the bubble in that location
        b.destroy();
        this.grid[r.y][r.x] = 0;

/*
        // symmetrical reflection (works for r.x on either side of the symmetry lines)
        if ( _holes.symmetry )
        {
            for( var s = _holes.symmetry.length - 1; s >= 0; --s )
            {
                var reflectx = _holes.symmetry[s].x * 2 - 1;
                var rx = reflectx - (r.x - reflectx);
                if ( rx >= 0 && rx < this.grid[r.y].length )
                {
                    if ( Math.myRandom() * 100 < _holes.symmetry[s].pcnt )
                    {
                        var rb = this.grid[r.y][rx];
                        if (rb != -1)
                        {
                            // making a hole in a hole... or knocking out a special bubble
                            if ( rb !== 0 && !rb.overlay )
                            {
                                this.grid[r.y][rx] = 0;
                                rb.destroy();
                            }
                        }
                        else
                        {
                            rb = this.grid[r.y][rx + 1].key;
                            if ( rb !== 0 && !rb.overlay )
                            {
                                this.grid[r.y][rx + 1] = 0;
                                rb.destroy();
                            }
                        }
                    }
                }
                break;
            }
        }
*/
    }
};


// symmetrical reflection (works only for _x to the right of the symmetry lines)
PlayField.prototype.symmetry = function( _grid, _x, _y, _type, _symmetry )
{
    var newType = _type;

    if ( _symmetry && _symmetry.length > 0 )
    {
        for( var i = _symmetry.length - 1; i >= 0; --i )
        {
            var reflectx = _symmetry[i].x * 2 - 1;
            if ( _x > reflectx )
            {
                var rx = reflectx - (_x - reflectx);
                if ( rx >= 0 && rx < _grid[_y].length )
                {
                    if ( Math.myRandom() * 100 < _symmetry[i].pcnt )
                    {
                        newType = _grid[_y][rx].type;
                        if (newType == -1)
                            newType = _grid[_y][rx + 1].type;
                    }
                }
                break;
            }
        }
    }
    return newType;
};


PlayField.prototype.findLocations = function( _grid, _count, _ranges, _addToList )
{
    var list = [];
    var failSafe = 10;
    var tries = 100 * _count;
    var c = _count;
    while(c > 0)
    {
        var succeed = false;
        var rp = this.gridCollide.randomLocation( _grid, true, Math.myRandom );
        if ( this.validateDistanceFromList( _grid, list, rp.x, rp.y, _ranges ) )
        {
            var added = _addToList(rp);

            // if the callback returns null then the location was rejected
            if ( added )
            {
                list.push(added);
                c--;
                succeed = true;
            }
        }

        // if we fail gradually increase the tolerances, eventually give up
        if ( !succeed )
        {
            if (--tries <= 0)
            {
                if ( Main.debug )
                {
                    console.log("WARNING: PlayField.findLocations got stuck, changing ranges " + _ranges.min + " " + _ranges.max);
                }

                if ( _ranges.min > 2 )
                {
                    _ranges.min -= 2;
                    if ( _ranges.max < 1000 )
                    {
                        _ranges.max += 2;
                    }
                    tries = 500;
                    continue;
                }
                if ( _ranges.max < 1000 )
                {
                    _ranges.max += 2;
                    tries = 500;
                    continue;
                }

                // abort if we fail too often after the ranges have reached their limits
                if (--failSafe <= 0)
                {
                    console.log("ERROR: PlayField.findLocations got irrevocably stuck! Exiting with list length = " + list.length);
                    break;
                }
                tries = 100;
            }
        }
    }
    return list;
};


PlayField.prototype.validateDistanceFromList = function( _grid, _list, _x, _y, _ranges )
{
    var p = this.gridCollide.gridToBubble( { x: _x, y: _y } );
    var i = Utils.findNearestPointInList( p, _list );
    if ( i != -1 )
    {
        var d = Utils.distanceBetween( p, _list[i] );
        if ( ( !_ranges.min || d >= _ranges.min * Game.bubbleRadius/16 ) &&
            ( !_ranges.max || d < _ranges.max * Game.bubbleRadius/16 ) )
            return true;
    }
    else
    {
        return true;
    }
    return false;
};


/// clone _grid for the x coordinates 0.._widthLft and _widthRgt..right edge
PlayField.prototype.createEdgeGrid = function( _grid, _widthLft, _widthRgt )
{
    var edges = [];
    var w = _grid[0].length;
    for(var y = 0; y < _grid.length; y++)
    {
        edges[y] = [];
        for(var x = 0; x < _grid[y].length; x++)
        {
            if ( _grid[y][x] && _grid[y][x] == -1 )
                edges[y][x] = -1;
            else if (x < _widthLft || x > w - _widthRgt)
                edges[y][x] = _grid[y][x];
            else
                edges[y][x] = 0;
        }
    }
    return edges;
};


PlayField.prototype.effectContinues = function()
{
    // if the game has been resized recently let it settle
    if (Game.frameCount - this.resizeChargeBlocker < 4)
        return true;

    // if the level is scrolling into position still
    if ( this.introScroll )
        return true;

    // if the explosionList isn't empty yet
    if ( this.explosionList && this.explosionList.length > 0 )
        return true;

    // if there are any dragons flitting around still
    if ( this.isFairyFlying() )
        return true;

    // no effect is continuing
    return false;
};


PlayField.prototype.isFairyFlying = function()
{
    // if a fairy is flying around still
    if ( World.effects.countDragonsFlying() > 0 )
        return true;

    return false;    
};


// return the grid location of any visible bubble
PlayField.prototype.pickVisibleBubble = function( _minx, _maxx, _expandX )
{
    if ( Main.debug )
        console.log( "PlayField.pickVisibleBubble " + _minx + " -> " + _maxx);

    if ( _expandX === undefined ) _expandX = true;

    var loc = this.findLowestBubble();
    if ( !loc )
    {
        if ( Main.debug )
            console.log( "no lowest bubble!" );
        return null;
    }

    if ( _minx === undefined || _minx < 0 ) _minx = 0;
    if ( _minx >= this.grid[0].length ) _minx = this.grid[0].length - 1;
    if ( _maxx === undefined || _maxx > this.grid[0].length ) _maxx = this.grid[0].length;
    if ( _maxx < 0 ) _maxx = 0;

    var ret;
    var n = 5;
    var list = [];
    do{
        // collect positions of the last n lines of bubbles
        for(var y = loc.y; y >= Math.max(0, loc.y - n); --y)
        {
            for(var x = _minx; x < Math.min( _maxx, this.grid[y].length ); x++)
            {
                var bubble = this.grid[y][x];
                if (bubble && bubble != -1)
                {
                    if ( bubble.isNormal() && !bubble.overlay )
                        list.push( { x: x, y: y } );
                }
            }
        }

        if ( list.length === 0 )
        {
            // search higher
            if ( n++ <= loc.y )
                continue;
            if ( _expandX )
            {
                // search farther left
                if ( _minx-- > 0 )
                    continue;
                // search farther right
                if ( _maxx++ < this.grid[0].length - 1 )
                    continue;
            }
            // nope, give up
            if ( Main.debug )
                console.log( "failed to find any bubbles!" );
            return null;
        }

        // pick one
        ret = Utils.pickRandomFromList( list, Math.myRandom );

    } while( !ret );

    list = null;
    return ret;
};


// return the grid location of any visible gap in the bubble grid with an adjacent filled location
PlayField.prototype.pickVisibleSpace = function()
{
    var loc = this.findLowestBubble();
    if ( !loc )
        return null;

    var list = [];
    var lowest = loc.y;
    do{
        // start off with the last 6 lines of bubbles
        var highest = Math.max(lowest - 6, 0);
        // collect positions of all the holes
        for(var y = lowest; y >= highest; --y)
        {
            for(var x = 0; x < this.grid[y].length; x++)
            {
                var bubble = this.grid[y][x];
                if ( !bubble )
                {
                    var gridLoc = { x: x, y: y };
                    if ( this.adjacentFilled( gridLoc ) )
                        list.push( gridLoc );
                }
            }
        }

        // in case we didn't find any holes, prepare search of next page up
        lowest -= 6;

        // if we've reached the top and no holes found, include the line beneath the lowest bubble
        // (guaranteed spaces all the way across)
        if (lowest < 0)
            lowest = loc.y + 1;

    } while(list.length === 0);

    // pick one and return it
    var ret = Utils.pickRandomFromList( list, Math.myRandom );
    list = null;
    return ret;
};


/// return true if any of the adjacent locations has a bubble in it
PlayField.prototype.adjacentFilled = function( _loc )
{
    if ( this.gridCollide.get( { x:_loc.x - 2, y:_loc.y} ) ) return true;
    if ( this.gridCollide.get( { x:_loc.x + 2, y:_loc.y} ) ) return true;
    if ( this.gridCollide.get( { x:_loc.x - 1, y:_loc.y - 1} ) ) return true;
    if ( this.gridCollide.get( { x:_loc.x + 1, y:_loc.y - 1} ) ) return true;
    if ( this.gridCollide.get( { x:_loc.x - 1, y:_loc.y + 1} ) ) return true;
    if ( this.gridCollide.get( { x:_loc.x + 1, y:_loc.y + 1} ) ) return true;
    return false;
};


PlayField.prototype.findLowestBubble = function()
{
    for(var y = this.grid.length - 1; y >= 0; --y)
    {
        for(var x = 0; x < this.grid[y].length; x++)
        {
            if (this.grid[y][x] && this.grid[y][x] != -1)
            {
                return { x: x, y: y };
            }
        }
    }
    return null;
};


PlayField.prototype.getAllBubbles = function()
{
    var list = [];

    for(var y = 0; y < this.grid.length; y++)
    {
        for(var x = 0; x < this.grid[y].length; x++)
        {
            if ( this.grid[y][x] && this.grid[y][x] != -1 )
                list.push( this.grid[y][x] );
        }
    }

    return list;
};


PlayField.prototype.getGridCollide = function()
{
    return this.gridCollide;
};


PlayField.prototype.setBubbleValues = function()
{
    var highestBubbleY = Number.POSITIVE_INFINITY;
    this.lowestBubbleY = Number.NEGATIVE_INFINITY;

    var bubbles = this.getAllBubbles();
    for( var i = bubbles.length - 1; i >= 0; --i )
    {
        var bubble = bubbles[i];
        if (bubble && bubble.game !== null)
        {
            var loc = this.gridCollide.bubbleToGameUi(bubble.sprite);
            if (loc.y > this.lowestBubbleY)
                this.lowestBubbleY = loc.y;
            if (loc.y < highestBubbleY)
                highestBubbleY = loc.y;
        }
    }

    return highestBubbleY;
};


// set the scrollY based on the launcher location
PlayField.prototype.adjustScroll = function()
{
    var launcherLoc = this.world.getLauncherLocation( Main.gameUILayer );
    this.setBubbleValues();

    if (Game.levelType == LevelType.GOAL_PROTECT_BARRIER)
    {
        // use this.lowestBubbleY offset from the bottom of the previous screen
        if ( this.lowestBubbleYOffset ) // = (launcherLoc.y - this.lowestBubbleY)
        {
            // jump to the correct scrollY position based on the lowest bubble offset
            var targetForLowest = (launcherLoc.y - this.lowestBubbleYOffset);
            var dist = this.lowestBubbleY - targetForLowest;
            var desired = this.scrollY - dist;
            this.scrollY = desired;
        }
    }
    else
    {
        if ( !this.introScroll )
        {
            // jump to the correct scrollY position based on the lowest bubble
            var targetForLowest = (launcherLoc.y + Game.scrollLineY[Game.levelType]);
            var dist = this.lowestBubbleY - targetForLowest;
            var desired = this.scrollY - dist;
            this.scrollY = desired;
        }
    }

    this.gridCollide.offsetY = this.scrollY;
    Main.bubbleLayer.y = Math.floor(this.scrollY * Main.bubbleLayer.scale.y);
};


// lerp the scrollY based on the launcher location
PlayField.prototype.scrollControl = function( launcherLoc )
{
    this.setBubbleValues();
    var maxSpeed = Game.scrollSpeed * Main.elapsedTime / 1000;
    var N = 20;

    if (Game.levelType == LevelType.GOAL_PROTECT_BARRIER)
    {
        // scroll up at level start
        if ( this.introScroll )
        {

            var dist = this.lowestBubbleY - (launcherLoc.y + Game.scrollLineY[Game.levelType]);
            var desired = this.scrollY - dist;
            var newY = (this.scrollY * (N - 1) + desired) / N;
            var spd = Utils.limit(newY - this.scrollY, maxSpeed, maxSpeed * 5);
            if ( this.introScroll )
            {
                if ( Math.abs(this.scrollY - desired) < 0.5 )
                {
                    this.introScroll = false;
                    // make the boost icon show when the scroll-back ends
                    this.world.showBoost( true );
                }
            }
            return (this.scrollY + spd);
        }

        // if lowestBubbleY is too far up then rapid scroll down (catch-up and gain score)
        if ( this.lowestBubbleY < launcherLoc.y + Game.scrollLineY[Game.levelType] - Game.bubbleRadius * 3 )
        {
            var move = Game.scrollSpeed * Main.elapsedTime / 1000;
            this.autoScroll( move );
            if ( this.scrollDownBonus )
            {
                // award bonus because screen had to scroll the bubbles down faster
                if ( Game.boostCanCharge && (Game.frameCount - this.resizeChargeBlocker > 4) )
                {
                    Game.boostCharge += Game.catchUpBoost * move;
                    Game.score += Game.scoreCatchUp * move;
                }
            }
        }

        return this.scrollY;
    }
    else
    {
        var dist = this.lowestBubbleY - (launcherLoc.y + Game.scrollLineY[Game.levelType]);
        var desired = this.scrollY - dist;
        var newY = (this.scrollY * (N - 1) + desired) / N;
        var spd = Utils.limit(newY - this.scrollY, maxSpeed, maxSpeed * 4);
        if ( this.introScroll )
        {
            if ( Math.abs(this.scrollY - desired) < 0.5 )
            {
                this.introScroll = false;
                // make the boost icon show when the scroll-back ends
                this.world.showBoost( true );
            }
        }
        return (this.scrollY + spd);
    }
};
