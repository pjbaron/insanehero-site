//
// Shooter.js
//
// Pete Baron 2017
//
// Handle aiming, trajectory plot and shooting out bubbles.
//





function Shooter( _game )
{
    this.game = _game;
}


// state machine
Shooter.ANIMATING = 0;
Shooter.WAITING = 1;
Shooter.LOADSHOT = 2;
Shooter.AIMING = 3;
Shooter.ARM_SHOT = 4;
Shooter.FIRE = 5;
Shooter.MOVING = 6;
Shooter.CANCEL = 7;
Shooter.CHANGEORDER = 8;
Shooter.OUTOFAMMO = 9;
Shooter.ENDOFLEVEL = 10;


Shooter.colourFromType = [];


Shooter.prototype.create = function( _world, _managers, _playField, _levelData, _gridCollide )
{
    this.world = _world;
    this.managers = _managers;
    this.playField = _playField;
    this.levelData = _levelData;
    this.gridCollide = _gridCollide;

    // must come *before* addBubbleToQueue which calls pickABubble which uses this list
    this.bubblesInLevel = _levelData.list;

    Shooter.colourFromType[SpriteData.BLUE.type] = "traj_blue.png";
    Shooter.colourFromType[SpriteData.GREEN.type] = "traj_green.png";
    Shooter.colourFromType[SpriteData.RED.type] = "traj_red.png";
    Shooter.colourFromType[SpriteData.YELLOW.type] = "traj_yellow.png";
    Shooter.colourFromType[SpriteData.PURPLE.type] = "traj_purple.png";
    Shooter.colourFromType[SpriteData.RAINBOW.type] = "traj_special.png";
    Shooter.colourFromType[SpriteData.FIREBALL.type] = "traj_special.png";
    Shooter.colourFromType[SpriteData.MINE.type] = "traj_special.png";

    this.state = Shooter.WAITING;
    this.lastState = -1;


    this.rememberFiredTypes = [];
    this.bubbleQueue = [];
    this.addBubbleToQueue();
    this.addBubbleToQueue();

    this.shotLoading = false;
    //this.loadShot();
    this.shotFired = null;
    this.aimPoint = null;
    this.angleTooMuch = true;
    this.shotStartTime = -1;
    this.ignoreCollisions = null;
    this.trajectory = [];

    this.cursor = null;

    this.remainingSpread = 0;
    this.remainingAngle = 0;
    this.remainingDelay = 0;
    this.launchTime = 0;
    this.bonusShotsFired = 0;

    this.shotLoadedLocation = this.world.getLauncherLocation( Main.gameUILayer );
};


Shooter.prototype.destroy = function()
{
    this.game = null;
    this.world = null;
    this.levelData = null;
    this.playField = null;
    this.managers = null;
    this.aimPoint = null;
    this.ignoreCollisions = null;
    this.bubblesInLevel = null;
    this.rememberFiredTypes = null;
    
    this.destroyShots();

    if ( this.trajectory )
    {
        for(var i = 0; i < this.trajectory.length; i++)
            if ( this.trajectory[i] )
                this.trajectory[i].destroy();
        this.trajectory = null;
    }

    if ( this.cursor )
    {
        this.cursor.destroy();
        this.cursor = null;
    }
};


/// return true if there is a 'special' shot
Shooter.prototype.destroyShots = function()
{
    var ret = false;
    if ( this.bubbleQueue )
    {
        for(var i = 0; i < this.bubbleQueue.length; i++)
        {
            // detect special shot in the bubbleQueue
            if ( !Bubble.isNormalKey(this.bubbleQueue[i].key, false) )
                ret = true;
            this.bubbleQueue[i].destroy();
            this.bubbleQueue[i] = null;
        }
        this.bubbleQueue = null;
    }

    if ( this.shotLoaded )
    {
        // detect if shotLoaded is a special shot
        if ( !Bubble.isNormalKey(this.shotLoaded.key, false) )
            ret = true;
        this.shotLoaded.destroy();
        this.shotLoaded = null;
    }

    if ( this.shotFired )
    {
        this.shotFired.destroy();
        this.shotFired = null;
    }

    return ret;
};


Shooter.prototype.update = function()
{
    var c;

    if ( Main.resized )
    {
        this.shotLoadedLocation = this.world.getLauncherLocation( Main.gameUILayer );
        if ( this.shotLoaded )
        {
            this.shotLoaded.x = this.shotLoadedLocation.x;
            this.shotLoaded.y = this.shotLoadedLocation.y;
            this.showQueue( 1 );
            this.world.showBoost();
        }
    }

    var newState = ( this.state != this.lastState );
    this.lastState = this.state;

    switch( this.state )
    {
        case Shooter.OUTOFAMMO:
            // in case the player got a +5 bonus from his last shot
            if ( Game.shotsLeft > 0 )
            {
                // game continues when player has shots left!
                this.state = Shooter.WAITING;
            }
            break;

        case Shooter.ENDOFLEVEL:
        case Shooter.ANIMATING:
            break;

        case Shooter.WAITING:
            // wait for effects to finish
            if ( this.readyForShot() )
            {
                this.state = Shooter.LOADSHOT;
            }
            else
            {
                // animate the launcher for the shot we just fired
                if ( this.launchTime < 500 ) this.launchTime = 500;
                this.playField.shotFired( this.launchTime += Main.elapsedTime );
                this.hideTrajectory();
            }
            break;

        case Shooter.LOADSHOT:
            if ( newState )
            {
                // reset the launcher for the next shot
                this.world.launcherRingReset();
            }
            // prepare to shoot by showing the bubble and the queue
            if ( Game.shotsLeft === 0 )
            {
                // don't load a shot that we don't have
                this.state = Shooter.OUTOFAMMO;
                break;
            }
            // make sure a shot is loaded
            if ( !this.shotLoaded )
            {
                this.showQueue( 0 );
                this.loadShot();
                break;
            }
            this.showQueue( 1 );
            this.world.showBoost();
            this.state = Shooter.AIMING;
            break;
 
        case Shooter.AIMING:
            if ( newState )
            {
                this.mouseMoveLocal = null;
            }

            // cancel next shot if the previous shot cracked the egg open
            if ( this.playField.hitGong || this.game.droppedLastFish )
            {
                this.state = Shooter.CANCEL;
                this.hideTrajectory();
                break;
            }

            // if non-touch, this is the mouse move aiming stage
            if ( this.shotLoaded.alpha < 1 )
                this.shotLoaded.alpha += 0.1;
            this.specialAim( this.shotLoaded );
            this.aimShot();
            break;

        case Shooter.ARM_SHOT:
            // the mouse is down or the screen is touched, continue to aim
            if ( this.shotLoaded.alpha < 1 )
                this.shotLoaded.alpha += 0.1;
            this.specialAim( this.shotLoaded );
            if ( this.readyForShot() )
            {
                // NOTE: aimShot and armShot call drawTrajectory
                this.armShot();
            }
            else
            {
                this.hideTrajectory();
                this.state = Shooter.AIMING;
            }
            break;

        case Shooter.FIRE:
            // mouse up or screen released, shoot
            if ( newState )
            {
                // reset the score multipliers ready for the shot
                Game.popCount = 0;
                this.shotLoaded.alpha = 1;
                this.specialFire( this.shotLoaded );
            }
            this.fireShot();
            this.takeBubbleFromQueue();
            this.addBubbleToQueue();
            break;

        case Shooter.MOVING:
            // shot is in the air
            if ( newState )
            {
                this.ignoreCollisions = [];
                this.launchTime = 0;
            }

            // animate the launcher for the shot we just fired
            this.playField.shotFired( this.launchTime += Main.elapsedTime );

            // wait for shot to reach destination and match completion, before waiting for next shot
            if ( !this.moveShot( this.shotFired, true ) )
            {
                this.playField.looseFall = true;
                this.state = Shooter.WAITING;
            }
            break;

        case Shooter.CHANGEORDER:
            // click to use the queued bubble
            this.rotateQueue();
            break;

        case Shooter.CANCEL:
            // shot cancelled
            this.state = Shooter.WAITING;
            break;
    }

    // don't display the first shot until the bubbles have settled into place
    if ( this.playField.introScroll && this.shotLoaded )
        this.shotLoaded.alpha = 0;

    // check if the shots got destroyed before we try to animate them
    if ( this.shotLoaded && this.shotLoaded.parent === null )
        this.shotLoaded = null;
    if ( this.shotFired && this.shotFired.parent === null )
        this.shotFired = null;
    if ( this.shotFired )
        this.shotFired.update();
    if ( this.shotLoaded )
        this.shotLoaded.update();
};


Shooter.prototype.readyForShot = function()
{
    // we can't start the next shot while the playField is still running effects from the previous one
    if ( this.playField.effectContinues() )
        return false;
    // don't start a shot if the load animation is running
    if ( this.shotLoading )
        return false;
    if ( this.playField.hitGong || this.game.droppedLastFish )
        return false;
    return true;
};


Shooter.prototype.showQueue = function( _index )
{
    var waitingShot = this.bubbleQueue[ _index ];
    waitingShot.x = this.shotLoadedLocation.x + Game.queuePositionX1;
    waitingShot.y = this.shotLoadedLocation.y + Game.queuePositionY1;
    waitingShot.anchor.set( 0.5 );
    waitingShot.scale.set( Game.queuePositionScale );
    waitingShot.visible = true;
};


// player is moving the mouse around or not touching the screen
Shooter.prototype.aimShot = function()
{
    // near the end of the level, don't offer a bubble colour that isn't left in the grid
    this.matchAvailableColours();

    if ( Main.mouseMoveLocal )
    {
        this.aimPoint = { x: Main.mouseMoveLocal.x, y: Main.mouseMoveLocal.y };     // mouseMoveLocal is on the gameUILayer
        
        if ( !EventHandlers.touchEvent )
        {
            // show aiming cursor for mouse hover
            if ( Main.showLockedCursor )
            {
                if ( !this.cursor )
                {
                    this.cursor = new Sprite();
                    this.cursor.create( Main.gameUILayer, "bubble_cursor", this.managers.textures, 0, 0, false);
                    this.cursor.anchor.set(0.5);
                }
            }
            else
            {
                if ( this.cursor )
                {
                    this.cursor.destroy();
                    this.cursor = null;
                }
            }

            if ( Game.shotsLeft > 0 )
            {
                this.drawTrajectory( Main.mouseMoveLocal, Game.trajectoryLength );
            }
        }
    }

    // can't shoot if no shots left
    if ( Game.shotsLeft > 0 )
    {
        // when player touches the screen or holds the mouse button down, arm the shot for fire on release
        if ( Main.mouseDown )
        {
            this.state = Shooter.ARM_SHOT;
            this.shotStartTime = Main.nowTime;
            Main.mouseUp = Main.click = null;
        }

        if ( Keys.isPressed[KeyCodes.space_bar] )
        {
            this.state = Shooter.CHANGEORDER;
        }
    }
};


// player is touching the screen or pressing the mouse button
Shooter.prototype.armShot = function()
{
    this.drawTrajectory( Main.mouseMoveLocal, Game.trajectoryLength );
    this.aimPoint = { x: Main.mouseMoveLocal.x, y: Main.mouseMoveLocal.y };

    if ( Main.mouseUp || Main.click )
    {
        if ( !this.aimingAtOwnShooter() )
        {
            if ( !this.angleTooMuch )
                this.state = Shooter.FIRE;
            else
                this.state = Shooter.WAITING;
        }
        else
        {
            if ( Main.nowTime - this.shotStartTime <= Main.shortTapDurationMS )
            {
                // only if 'short tap' should we rotate the bubbleQueue
                this.state = Shooter.CHANGEORDER;
            }
            else
            {
                // cancel shot if aiming at your own shooting device (hold, aim, release)
                this.state = Shooter.WAITING;
            }
        }
        Main.mouseUp = Main.click = Main.mouseUpLocal = null;
        return;
    }

    if ( Keys.isPressed[KeyCodes.space_bar] )
    {
        this.state = Shooter.CHANGEORDER;
    }
};


// return true if you aim at your own shooting device
Shooter.prototype.aimingAtOwnShooter = function( _optionalPoint )
{
    if ( !_optionalPoint )
    {
        if ( this.aimPoint)
            _optionalPoint = this.aimPoint;
        else
            return false;
    }

    var btn = this.world.launcherButton;
    var point = new PIXI.Point(0,0);
    point = btn.toGlobal(point);
    point.y -= 40 * Main.height / 480;      // button is not drawn at it's origin point
    btn = Main.gameUILayer.toLocal(point);

    return ( Utils.distanceBetweenScaled( _optionalPoint, { x: btn.x, y: btn.y }, 1.0, 1.0 ) < Game.shooterRadius );
};


Shooter.prototype.hideTrajectory = function()
{
    if ( this.trajectory )
    {
        for(var i = 0; i < this.trajectory.length; i++)
            if ( this.trajectory[i] )
                this.trajectory[i].visible = false;
    }
};


// draw a trajectory line from the shooter towards _whereTo which can bounce off the sides
Shooter.prototype.drawTrajectory = function( _whereTo, _length )
{
    // don't draw trajectory if aiming at own shooter
    if ( !this.aimingAtOwnShooter( _whereTo ) )
    {
        if ( !this.trajectory )
            this.trajectory = [];

        // don't draw trajectory for invalid angles
        var dx = _whereTo.x - this.shotLoadedLocation.x;
        var dy = _whereTo.y - this.shotLoadedLocation.y;
        var angle = Math.atan2(dx, -dy) * 180.0 / Math.PI;
        if ( Math.abs(angle) <= Game.aimAngleLimit )
        {
            this.angleTooMuch = false;
            var list = this.simulateShotMovement();
            var t = 0;
            for(var i = 0, l = list.length; i < l && i < _length; i += Game.shotStep)
            {
                var s = this.trajectory[t];
                if ( !s )
                {
                    s = new Sprite();
                    // _parent, _key, _textureManager, _x, _y, _pcnt, _behind
                    s.create( Main.gameUILayer, "traj_blue.png", this.managers.textures, 0, 0, false, true );
                    s.anchor.set( 0.5 );
                    this.trajectory[t] = s;
                }
                s.x = list[i].x;
                s.y = list[i].y;
                s.visible = true;
                s.setFrame(Shooter.colourFromType[this.shotLoaded.type]);
                t++;
            }
            // destroy any left-over trajectory sprites from last line drawn
            for(l = this.trajectory.length; t < l; t++)
            {
                if ( this.trajectory[t] )
                {
                    this.trajectory[t].destroy();
                    this.trajectory[t] = null;
                }
            }
            list = null;
        }
        else
        {
            this.angleTooMuch = true;
            this.hideTrajectory();
        }
    }
};


Shooter.prototype.simulateShotMovement = function()
{
    var points = [];

    // create the simulated shooting bubble

    // DRY addBubbleToQueue
    this.simulateShot = new Sprite();
    // _parent, _key, _textureManager, _x, _y, _pcnt
    this.simulateShot.create( Main.gameUILayer, this.shotLoaded.type, this.managers.textures, this.shotLoaded.x, this.shotLoaded.y, false) ;
    this.simulateShot.anchor.set( 0.5 );
    this.simulateShot.visible = false;

    // fire the simulated shooting bubble

    // DRY fireShot
    var dx = this.aimPoint.x - this.simulateShot.x;
    var dy = this.aimPoint.y - this.simulateShot.y;
    var d = Math.sqrt(dx *dx + dy * dy);
    this.simulateShot.vx = dx / d * Game.shotSpeed;
    this.simulateShot.vy = dy / d * Game.shotSpeed;

    // simulate the bubble movement until it hits
    this.ignoreCollisions = [];
    while( this.moveShot(this.simulateShot, false) )
    {
        points.push( { x: this.simulateShot.x, y: this.simulateShot.y } );
    }

    // show cursor at the hit location
    if ( this.cursor )
    {
        this.cursor.x = this.simulateShot.x;
        this.cursor.y = this.simulateShot.y;
        this.cursor.visible = true;
    }

    this.simulateShot.destroy();
    this.simulateShot = null;

    return points;
};


Shooter.prototype.fireShot = function()
{

    if ( Main.debug )
        console.log("*** fireShot *** " + this.shotLoaded.type + " shotsLeft = " + Game.shotsLeft);
    
    // can't shoot if there are no shots left
    if ( Game.shotsLeft > 0 )
    {
        Game.shotsLeft--;

        // remember the latest colour shot
        this.rememberFiredTypes.push(this.shotLoaded.type);

        // prevent list from getting too long
        while (this.rememberFiredTypes.length > 4)
            this.rememberFiredTypes.shift();

        // reset the idle timer every time the player fires a shot
        Main.idleTimer = Main.eventChangeAdOnIdle;

        this.shotFired = this.shotLoaded;
        this.shotLoaded = null;
        
        // set velocity for shotFired to hit the aim point
        var dx = this.aimPoint.x - this.shotFired.x;
        var dy = this.aimPoint.y - this.shotFired.y;
        var d = Math.sqrt(dx *dx + dy * dy);
        this.shotFired.vx = dx / d * Game.shotSpeed;
        this.shotFired.vy = dy / d * Game.shotSpeed;

        this.state = Shooter.MOVING;
        this.managers.audio.play( "snd_shoot" );
    }

    // erase trajectory while bubble is actually shooting
    this.hideTrajectory();
};


Shooter.prototype.addBubbleToQueue = function()
{
    if ( this.bubbleQueue.length < 2 )
    {
        var type = this.pickABubble();
        var sprite = new Sprite();
        // _parent, _type, _textureManager, _x, _y, _pcnt
        sprite.create( Main.gameUILayer, type, this.managers.textures, 0, 0, false );
        sprite.anchor.set( 0.5 );
        sprite.visible = false;

        this.bubbleQueue.push( sprite );
    }
};


Shooter.prototype.boostInQueue = function( _type )
{
    for( var i = 0; i < this.bubbleQueue.length; i++ )
        if ( this.bubbleQueue[i].type == _type )
            return true;
    return false;
};


// animation to show boost moving into 'next' slot
Shooter.prototype.addBoostToQueue = function( _type, _start )
{
    // we've already got one, you see?
    if ( this.boostInQueue( _type ) )
        return;

    // change the queued bubble into the new boost type
    if ( this.bubbleQueue && this.bubbleQueue.length > 0 )
    {
        var queued = this.bubbleQueue.pop();
        if ( queued )
        {
            queued.setType( _type );
            queued.setAnimation( "default", true, true );
            this.bubbleQueue.push( queued );

            // set its location to where the boost icon is
            queued.x = _start.x;
            queued.y = _start.y;

            // tween it to the queued bubble position
            this.tweenLoadBoost(queued, { x: this.shotLoadedLocation.x + Game.queuePositionX1, y: this.shotLoadedLocation.y + Game.queuePositionY1, scale: Game.queuePositionScale },
                function()
                {
                });
        }
    }
};


// animation to show bubbles moving into 'next' and 'current' slots
Shooter.prototype.loadShot = function( _animate )
{
    var _this = this;

    // hide the trajectory while the animation is playing
    this.hideTrajectory();

    // don't load the shot if the front of the bubbleQueue is already tweening
    var first = this.bubbleQueue[0];
    if ( !first.tweener )
    {
        this.shotLoaded = first;

        if ( Main.debug )
            console.log("Shooter.loadShot " + this.shotLoaded.key);

        if ( _animate !== false )
        {
            this.shotLoading = true;
            this.tweenLoad(this.shotLoaded, { x: this.shotLoadedLocation.x, y: this.shotLoadedLocation.y, scale: 1.0 },
                function()
                {
                    // show the queued bubble
                    _this.showQueue( 1 );
                    _this.world.showBoost();
                    // wait for player to shoot
                    _this.state = Shooter.AIMING;
                    // shot has loaded
                    _this.shotLoading = false;
                });
        }
        else
        {
            // show the queued bubble
            this.showQueue( 1 );
            this.world.showBoost();
        }

        // wait for animation to finish
        this.state = Shooter.WAITING;
    }
};


Shooter.prototype.rotateQueue = function()
{
    if ( Main.debug )
        console.log("Shooter.rotateQueue");

    var _this = this;
    this.state = Shooter.ANIMATING;

    // make sure that the queued bubble is in the correct location
    var last = this.bubbleQueue[this.bubbleQueue.length - 1];
    last.x = this.shotLoadedLocation.x + Game.queuePositionX1;
    last.y = this.shotLoadedLocation.y + Game.queuePositionY1;

    // swap them over
    this.tweenSwap(this.bubbleQueue[0], last,
        function()
        {
            var first = _this.bubbleQueue.shift();
            _this.bubbleQueue.push( first );
            _this.loadShot(false);
            _this.showQueue(1);
            _this.state = Shooter.WAITING;
        });

    this.hideTrajectory();
};


Shooter.prototype.pickABubble = function()
{
    // try to pick a colour which has not been repeated three or more times in a row
    var c = 3, type;
    do {
        var name = Utils.pickRandomFromList(this.bubblesInLevel);
        type = SpriteData[name].type;
    } while( Utils.countInList( this.rememberFiredTypes, type ) >= 3 && c-- > 0 );

    return type;
};


Shooter.prototype.takeBubbleFromQueue = function()
{
    if ( this.bubbleQueue && this.bubbleQueue.length > 0 )
        this.bubbleQueue.shift();
};


Shooter.prototype.moveShot = function( _gameUiBubble, _real )
{
    _gameUiBubble.mx = _gameUiBubble.x;
    _gameUiBubble.my = _gameUiBubble.y;

    if ( _real )
    {
        _gameUiBubble.x += _gameUiBubble.vx * Main.elapsedTime / 1000;
        _gameUiBubble.y += _gameUiBubble.vy * Main.elapsedTime / 1000;
        this.specialAnim( _gameUiBubble );
    }
    else
    {
        // for simulation pretend frame speed is constant at 60fps
        _gameUiBubble.x += _gameUiBubble.vx * 16 / 1000;
        _gameUiBubble.y += _gameUiBubble.vy * 16 / 1000;
    }

    // bounce off side walls
    if ( _gameUiBubble.x <= -Game.gridOffsetX )
    {
        _gameUiBubble.x = -Game.gridOffsetX + 0.0001;
        _gameUiBubble.vx = Math.abs(_gameUiBubble.vx);
        if ( _real )
            this.managers.audio.play( "snd_bubbleBounce" );
    }
    if ( _gameUiBubble.x >= Game.gridOffsetX )
    {
        _gameUiBubble.x = Game.gridOffsetX - 0.0001;
        _gameUiBubble.vx = -Math.abs(_gameUiBubble.vx);
        if ( _real )
            this.managers.audio.play( "snd_bubbleBounce" );
    }

    var b = this.gridCollide.gridToBubble( { x: 0, y: 0 } );
    var t = this.gridCollide.bubbleToGameUi( b );
    if ( _gameUiBubble.y < t.y )
    {
        _gameUiBubble.y = t.y;
        _gameUiBubble.vy = 0;
    }

    // convert shotFired to bubble layer coordinates
    var shotInBubble = this.gridCollide.gameUiToBubble( _gameUiBubble );
    shotInBubble.type = _gameUiBubble.type;
    // offset and copy the shotFired members needed for reverseMotion and createBubble
    var offsetMem = this.gridCollide.gameUiToBubble( { x: _gameUiBubble.mx, y: _gameUiBubble.my } );
    shotInBubble.mx = offsetMem.x;
    shotInBubble.my = offsetMem.y;

    var loc = this.gridCollide.bubbleToGrid( shotInBubble );

    // stop if we've somehow gone past the bottom of the grid
    if ( loc.y > this.playField.grid.length )
    {
        return false;
    }

    // stick to top wall (apply rounding error compensation to the gridOffsetY value)
    if ( shotInBubble.y <= -(Game.gridOffsetY - 0.01) )
    {
        if ( this.canStickToTop(shotInBubble.type) )
        {
            if ( _real )
                this.managers.audio.play( "snd_stick_top" );
            shotInBubble.x = shotInBubble.mx;
            shotInBubble.y = shotInBubble.my;
            this.makeShotIntoBubble( shotInBubble, _real );
            return false;
        }
        else
        {
            if ( _real )
            {
                // if mine hits the top wall, make it explode
                if ( shotInBubble.type == SpriteData.MINE.type )
                {
                    var gl = this.gridCollide.bubbleToGrid( shotInBubble );
                    this.playField.radiusEffect( gl, Math.sqrt(11.5), this.playField.explodeBubble );
                    World.effects.add( Effects.EXPLOSION, Main.gameUILayer, _gameUiBubble.x, _gameUiBubble.y );
                    if ( Main.debug )
                        console.log("Mine explodes against top at location " + gl.x + "," + gl.y, " pixels = " + _gameUiBubble.x + "," + _gameUiBubble.y );
                }

                // destroy the bubble that hit the top wall
                _gameUiBubble.destroy();
            }
            return false;
        }
    }

    // detect collisions and lock into grid
    var collisions = this.gridCollide.collide(_gameUiBubble, 1);
    if ( collisions !== null && collisions.length > 0 )
    {
        // reduce collisions to the actual contacts
        collisions = this.getActualCollisions( shotInBubble, collisions, Game.bubbleCollisionRadius );
        if ( collisions && collisions.length > 0 )
        {
            if ( !this.handleCollisions( collisions, shotInBubble, _gameUiBubble, _real ) )
                return false;
        }
    }

    return true;
};


Shooter.prototype.canStickToTop = function( _type )
{
    if ( _type == SpriteData.FIREBALL.type ) return false;
    if ( _type == SpriteData.MINE.type ) return false;
    return true;
};


Shooter.prototype.handleCollisions = function( _collisions, _shotInBubble, _gameUiBubble, _real)
{
    // handle special bubble collisions
    var ret = this.specialCollide( _gameUiBubble, _collisions, _real );
    if (ret !== null)
        return ret;

    // stop moving
    _gameUiBubble.vx = _gameUiBubble.vy = 0;
    // push bubble backwards towards where it started
    _shotInBubble.x = (_shotInBubble.x + _shotInBubble.mx) / 2;
    _shotInBubble.y = (_shotInBubble.y + _shotInBubble.my) / 2;

    if ( _gameUiBubble.type == SpriteData.MINE.type )
    {
        if ( _real )
        {
            var gl = this.gridCollide.bubbleToGrid( _shotInBubble );
            
            // everything this bubble is touching is considered to be a 'direct hit'
            // so (e.g.) bombs will detonate
            this.playField.directHit( gl );

            //this.playField.radiusEffect( gl, Math.sqrt(5), this.playField.explodeBubble );
            this.playField.radiusEffect( gl, Math.sqrt(11.5), this.playField.explodeBubble );
            var fx = World.effects.add( Effects.EXPLOSION, Main.gameUILayer, _gameUiBubble.x, _gameUiBubble.y );
            if ( fx )
            {
                fx.scale.set( 1.5 );
            }
            this.shotFired.destroy();
            this.shotFired = null;
        }
        return false;
    }

    //this.reverseMotion( _shotInBubble, _collisions, Game.bubbleRadius );
    this.makeShotIntoBubble( _shotInBubble, _real );
    return false;
};


Shooter.prototype.makeShotIntoBubble = function( _shotInBubble, _real )
{
    var gl;

    // error trap, seems to happen after fireball sometimes
    if ( _shotInBubble.key === null ) return;

    // snap fired bubble into grid and add it to the grid contents
    if ( _real )
    {
        gl = this.snapBubbleToGrid( _shotInBubble );
        if ( Main.debug )
            console.log("makeShotIntoBubble snapped to " + gl.x + "," + gl.y + " " + _shotInBubble.key);

        var bubble = new Bubble( this.game, this.managers, this.playField, this.gridCollide );
        bubble.create( Main.bubbleLayer, _shotInBubble.type, gl.x, gl.y );
        this.shotFired.destroy();
        this.shotFired = null;

        this.managers.audio.play( "snd_stick" );

        // trigger colour matching at this location for this bubble
        this.playField.matchAt( gl, bubble, 3 );

        // everything this bubble is touching is considered to be a 'direct hit'
        // so (e.g.) bombs will detonate
        this.playField.directHit( gl );

        // newly isolated groups fall
        this.playField.looseFall = true;
    }
    else
    {
        // it's a simulated shot, fast lock it into the final location (it doesn't need to be perfect)
        gl = this.gridCollide.bubbleToGrid( _shotInBubble );

        var l = this.gridCollide.gridToGameUi(gl);
        this.simulateShot.x = l.x;
        this.simulateShot.y = l.y;
    }
};


// _bubble must contain velocity data as well as position
Shooter.prototype.snapBubbleToGrid = function( _bubble )
{
    // pixel based distance method
    return this.findClosestEmptyGridTo(_bubble);
};


Shooter.prototype.findClosestEmptyGridTo = function( _bubble )
{
    var dist = Number.MAX_VALUE;
    var where = null;

    var g = this.gridCollide.bubbleToGrid( _bubble );
    for(var y = -1; y <= 1; y++)
    {
        for(var x = -2; x <= 2; x++)
        {
            var gl = { x: g.x + x, y: g.y + y };

            // if the location is empty (available)
            var b = this.gridCollide.get( gl );
            if ( b === 0 || b === null )
            {
                // find the pixel location of this empty grid location
                var bub = this.gridCollide.gridToBubble(gl);

                // distance
                var dx = _bubble.x - bub.x;
                var dy = _bubble.y - bub.y;
                var d2 = dx * dx + dy * dy;
                if ( d2 < dist )
                {
                    // closest one found
                    dist = d2;
                    where = { x: gl.x, y: gl.y };
                }
            }
        }
    }
    return where;
};


// grid based distance method
// Shooter.prototype.findClosestEmptyGridTo = function( _gfl )
// {
//     var dist = Number.MAX_VALUE;
//     var where = null;

//     var gx = Math.round(_gfl.x);
//     var gy = Math.round(_gfl.y);

//     for(var y = -1; y <= 1; y++)
//     {
//         for(var x = -2; x <= 2; x++)
//         {
//             var b = this.gridCollide.get({x: gx + x, y: gy + y});
//             if (b === 0 || b === null)
//             {
//                 var dx = (_gfl.x - (gx + x)) / 2;
//                 var dy = _gfl.y - (gy + y);
//                 var d2 = dx * dx + dy * dy;
//                 if ( d2 < dist )
//                 {
//                     dist = d2;
//                     where = { x:gx+x, y:gy+y };
//                 }
//             }
//         }
//     }
//     return where;
// };


/// used by e.g. the fireball which explodes stuff as it flies through
Shooter.prototype.triggerAndPopBubbleFromSprite = function( _sprite, _fast )
{
    if ( _sprite && _sprite.transform )
    {
        var loc = this.gridCollide.bubbleToGrid( _sprite );

        // trigger the bubbles we pop and check if they've been handled
        if ( !this.playField.hit( loc, _fast ) )
        {
            // pop them if they didn't already and are not handled yet
            var bubble = this.gridCollide.get( loc );
            if ( bubble && bubble != -1 )
                bubble.pop( loc );
        }
    }
    else
    {
        // https://trello.com/c/aB16e67h/119-crash-error-after-shooting-fireball
        console.log("WARNING: triggerAndPopBubbleFromSprite has an invalid sprite!");
        console.log(_sprite);
        console.log(_sprite.transform);
    }
};


Shooter.prototype.getActualCollisions = function(_object, _potentialCollisions, _radius)
{
    var list = [];
    var r2 = _radius * 2 * _radius * 2;

    for(var i = 0, l = _potentialCollisions.length; i < l; i++)
    {
        var c = _potentialCollisions[i].sprite;
        if ( c.transform )
        {
            if ( this.contact( _object, c, r2 ) )
                list.push(c);
        }
        else
        {
            alert("snafu! invalid sprite found");
        }
    }

    return list;
};


Shooter.prototype.contact = function( _obj1, _obj2, _r2 )
{
    var dx = _obj1.x - _obj2.x;
    var dy = _obj1.y - _obj2.y;
    var d2 = dx * dx + dy * dy;
    return (d2 <= _r2);
};


Shooter.prototype.reverseMotion = function( _object, _collisions, _radius )
{
    var r2 = (_radius * 2) * (_radius * 2);
    var x = _object.x;
    var y = _object.y;
    var vx = _object.mx - x;
    var vy = _object.my - y;

    // binary chop algorithm
    var lastFlag = true;
    do
    {
        vx /= 2;
        vy /= 2;
        _object.x = (x += vx);
        _object.y = (y += vy);

        var flag = false;
        for(var i = 0, l = _collisions.length; i < l; i++)
        {
            if ( this.contact( _object, _collisions[i], r2 ) )
            {
                flag = true;
                break;
            }
        }

        if ( this.gridCollide.outsideGrid(_object) )
        {
            flag = true;
        }

        if ( flag != lastFlag )
        {
            // collision state has changed, reverse direction of movement
            vx = -vx;
            vy = -vy;
            lastFlag = flag;
        }

    } while(Math.abs(vx) >= 0.5 || Math.abs(vy) >= 0.5);
};


Shooter.prototype.matchAvailableColours = function()
{
    if ( !this.bubbleQueue || !Main.bubbleLayer || !Main.bubbleLayer.children )
        return;

    var i;
    var numInGrid = Main.bubbleLayer.children.length - (this.playField.topBar ? 1 : 0);

    if ( numInGrid < 15 && numInGrid > 0 )
    {
        // collect list of available colours in the grid
        var available = [];
        for( i = 0; i < Main.bubbleLayer.children.length; i++ )
        {
            var child = Main.bubbleLayer.children[i];

            // ignore the topBar image which might be attached to the bubbleLayer from PlayField
            if ( child != this.playField.topBar )
            {
                // only add each type once to avoid bias when picking replacements
                if ( Bubble.isNormal( child.type, false ) && available.indexOf( child.type ) == - 1 )
                    available.push( child.type );
            }
        }


        // if bubbles in queue do not match colours in list, replace them from the list
        for( i = 0; i < this.bubbleQueue.length; i++ )
        {
            var type = this.bubbleQueue[i].type;
            if ( available.indexOf( type ) == -1 && Bubble.isNormal( this.bubbleQueue[i].type, false ) )
            {
                var newType = Utils.pickRandomFromList(available);
                // it's possible for all remaining bubbles to be 'special' so available is empty
                // in this case, ++exit without changing bubble to shoot --just pick any random colour that the level could normally get
                if ( newType === null || newType === SpriteData.UNDEFINED.type ) return;
                // TODO: there should be an effect for this
                this.bubbleQueue[i].setType( newType );
            }
        }
    }
};


/// shoot all the remaining shots (Game.shotsLeft) up into the air and
/// make them explode while the score bonus is awarded
Shooter.prototype.shootRemaining = function()
{
    if ( Game.shotsLeft > 0 )
    {
        if ( !this.remainingSpread )
        {
            if ( Main.debug )
                console.log("*** start bonus sequence ***");

            this.destroyShots();
            this.remainingSpread = Math.max( 70 / (Game.shotsLeft + 1), 10 );
            this.remainingAngle = -35 + this.remainingSpread;
            this.remainingDelay = Main.nowTime;
        }

        if ( Main.nowTime >= this.remainingDelay )
        {
            // delay between each shot
            this.remainingDelay = Main.nowTime + Game.bonusShootDelay;

            // make an effect to shoot up and award bonus when it explodes
            //this.world.looseBubbles.addBonus( this.pickABubble(), this.remainingAngle );
            var launcherLoc = this.world.getLauncherLocation( Main.gameUILayer );
            var e = World.effects.add( Effects.FAKE_BUBBLE, Main.gameUILayer, launcherLoc.x, launcherLoc.y, this.endSequenceLogic, this );

            if ( e )
            {
                // bonus score varies, if the shots are 'extra shots' awarded for failing the level, it will be substantially less
                if ( !this.levelData.extraTurns || this.bonusShotsFired >= this.levelData.extraTurns )
                    e.score = Game.bonusScoreFinale;
                else
                    e.score = Game.bonusScoreFinale_Extras;

                e.vx = Math.sin(this.remainingAngle * Math.PI / 180.0) * Game.bonusShootSpeed;
                e.vy = -Math.cos(this.remainingAngle * Math.PI / 180.0) * Game.bonusShootSpeed;
                e.setType( this.pickABubble() );
            }

            // play sound effect for each shot
            this.managers.audio.play( "snd_shoot" );

            // count the number of bonus shots we have fired
            this.bonusShotsFired++;

            // count down until all remaining shots are fired
            Game.shotsLeft--;

            if ( Main.debug )
                console.log("shoot bonus at " + Main.nowTime + " next at " + this.remainingDelay + " shotsLeft = " + Game.shotsLeft);

            // rotate to next shooting angle
            this.remainingAngle += this.remainingSpread;

            // ping-pong off each angle limit
            if ( this.remainingAngle > 35 )
            {
                this.remainingSpread = -Math.abs(this.remainingSpread);
                this.remainingAngle = 35 + this.remainingSpread;
            }
            else if ( this.remainingAngle < -35 )
            {
                this.remainingSpread = Math.abs(this.remainingSpread);
                this.remainingAngle = -35 + this.remainingSpread;
            }
        }
    }
};


Shooter.prototype.endLevel = function()
{
    // at end of level, switch off the trajectory and sit waiting for the next one
    this.hideTrajectory();
    this.state = Shooter.ENDOFLEVEL;
};


Shooter.prototype.endSequenceLogic = function( _effect )
{
    _effect.x += _effect.vx;
    _effect.y += _effect.vy;
    if ( _effect.y < -Game.bubbleDiameter * 2 )
    {
        // add explosion effect over this sprite
        World.effects.add( Effects.EXPLOSION, Main.gameUILayer, _effect.x, _effect.y );

        // add score for this bonus award to the game score and a floating text effect
        Game.score += _effect.score;
        var ft = new FloatText();
        // _x, _y, _style, _parent, _managers, _message, _distance, _delay
        ft.create(_effect.x, _effect.y, Main.textStyleBoldSmall, Main.gameUILayer, this.managers, _effect.score.toString());
        return false;
    }

    return true;
};


// bespoke logic for the boost smoke, called back on update from Effects
// return false when the Effect should be destroyed
Shooter.prototype.boostSmokeLogic = function( _smoke )
{
    _smoke.y += _smoke.vy * Main.elapsedTime / 1000;
    _smoke.vy -= 1.0;
    if ( _smoke.vy > 0 ) _smoke.vy = 0;
    // fade away slowly
    _smoke.alpha -= 0.03;
    if ( _smoke.alpha <= 0 ) return false;
    return true;
};


/// unique tests for special weapons being aimed
Shooter.prototype.specialAim = function( _shotLoaded )
{
    if ( _shotLoaded.type == SpriteData.FIREBALL.type && (Game.frameCount & 7) === 0 )
    {
        // TODO: replace with an animation in the SpriteData
        c = _shotLoaded.key.substring(16, 18);
        c = (c - 0) + 1;        // convert c into a number and add one
        if ( c > 2 ) c = 0;
        _shotLoaded.frameIndex = c;
    }
    else if ( _shotLoaded.type == SpriteData.RAINBOW.type )
    {
        if ( (Game.frameCount & 3) === 0 )
        {
            var n = Utils.near( _shotLoaded, Game.bubbleRadius );
            if ( Math.random() < 0.5 )
                World.effects.add( Effects.SPARKLES_RAINBOW, Main.gameUILayer, n.x, n.y );
            else
                World.effects.add( Effects.SPARKLES_WHITE, Main.gameUILayer, n.x, n.y );
        }
    }
};


/// unique tests for special weapons being fired
Shooter.prototype.specialFire = function( _shotLoaded )
{
    if ( _shotLoaded.type == SpriteData.FIREBALL.type )
    {
        this.managers.audio.play( "snd_fireball" );
        // empty the boost bar when we fire the boost
        Game.boostCharge = 0;
        Game.boostCanCharge = true;
        // display the boost icon again
        this.world.showBoost(true);
    }
    else if ( _shotLoaded.type == SpriteData.MINE.type )
    {
        this.managers.audio.play( "snd_mine" );
        // empty the boost bar when we fire the boost
        Game.boostCharge = 0;
        Game.boostCanCharge = true;
        this.world.showBoost(true);
    }
    else if ( _shotLoaded.type == SpriteData.RAINBOW.type )
    {
        this.managers.audio.play( "snd_rainbow" );
        // empty the boost bar when we fire the boost
        Game.boostCharge = 0;
        Game.boostCanCharge = true;
        this.world.showBoost(true);
    }
};


/// unique animations for special weapons when they've been fired
Shooter.prototype.specialAnim = function( _gameUiBubble )
{
    if ( _gameUiBubble.type == SpriteData.FIREBALL.type )
    {
        // animate the fireball shot
        if ( (Game.frameCount & 7) === 0 )
        {
            // TODO: replace with an animation in the SpriteData
            var c = _gameUiBubble.key.substring(16, 18);
            c = (c - 0) + 1;
            if ( c > 2 ) c = 0;
            _gameUiBubble.frameIndex = c;
        }
        // produce smoke from the fireball shot
        if ( (Game.frameCount & 3) === 0 )
        {
            var e = World.effects.add( Effects.BOOST_SMOKE, _gameUiBubble.parent, _gameUiBubble.x, _gameUiBubble.y + 16, this.boostSmokeLogic, this, true );
            if ( e )
            {
                e.scale.set( e.scale.x * 1.25, e.scale.y );
            }
        }
        // shrink fireball when it slows down
        if ( Math.abs(_gameUiBubble.vx) + Math.abs(_gameUiBubble.vy) < Game.shotSpeed * 0.50 )
        {
            _gameUiBubble.scale.set(_gameUiBubble.scale.x * 0.95);
        }
    }
    else if ( _gameUiBubble.type == SpriteData.RAINBOW.type )
    {
        if ( (Game.frameCount & 3) === 0 )
        {
            var n = Utils.near( _gameUiBubble, Game.bubbleRadius );
            if ( Math.random() < 0.5 )
                World.effects.add( Effects.SPARKLES_RAINBOW, Main.gameUILayer, n.x, n.y );
            else
                World.effects.add( Effects.SPARKLES_WHITE, Main.gameUILayer, n.x, n.y );
        }
    }
};


Shooter.prototype.specialCollide = function( _gameUiBubble, _collisions, _real )
{
    if ( _gameUiBubble.type == SpriteData.FIREBALL.type )
    {
        for(var i = 0, l = _collisions.length; i < l; i++)
        {
            var c = _collisions[i];

            // simulated fireball (for aiming line) stops at first collision
            if ( !_real )
                return false;

            // trigger and pop the bubbles we touch
            this.triggerAndPopBubbleFromSprite( c, Math.abs(_gameUiBubble.vx) + Math.abs(_gameUiBubble.vy) > Game.shotSpeed * 0.75 );

            // slow down on each impact
            _gameUiBubble.vx *= Game.fireBallDeceleration;
            _gameUiBubble.vy *= Game.fireBallDeceleration;
            if ( Math.abs(_gameUiBubble.vx) + Math.abs(_gameUiBubble.vy) < Game.shotSpeed / 4 )
            {
                // until we stop and die
                _gameUiBubble.destroy();
                return false;
            }
        }
        return true;
    }

    return null;
};


Shooter.prototype.tweenLoadBoost = function( _from, _to, _callback )
{
    if ( !_from || !_to ) return;

    if ( _from.x === 0 && _from.y === 0 )
    {
        _from.x = _to.x;
        _from.y = _to.y;
        _from.scale.set( _to.scale );
        if ( _callback )
            _callback();
        return;
    }

    // set start and end values for tweens
    Shooter.tweenBoost.from.x = _from.x;
    Shooter.tweenBoost.from.y = _from.y;
    Shooter.tweenBoost.from.scaleFactor = _from.scale.x;
    Shooter.tweenBoost.to.x = _to.x;
    Shooter.tweenBoost.to.y = _to.y;
    Shooter.tweenBoost.to.scaleFactor = _to.scale;

    // make tween update this sprite
    Shooter.tweenBoost.step = Utils.makeFunctionForSprite( _from );

    // create the tween
    _from.tweener = new Tweenable();
    _from.tweener.tween( Shooter.tweenBoost );
    _from.tweener.owner = _from;
    _from.tweener.callback = _callback;
};


Shooter.prototype.tweenLoad = function( _from, _to, _callback )
{
    if ( !_from || !_to ) return;

    if ( _from.x === 0 && _from.y === 0 )
    {
        _from.x = _to.x;
        _from.y = _to.y;
        _from.scale.set( _to.scale );
        if ( _callback )
            _callback();
        return;
    }

    // set start and end values for tweens
    Shooter.tweenSwap1.from.x = _from.x;
    Shooter.tweenSwap1.from.y = _from.y;
    Shooter.tweenSwap1.from.scaleFactor = _from.scale.x;
    Shooter.tweenSwap1.to.x = _to.x;
    Shooter.tweenSwap1.to.y = _to.y;
    Shooter.tweenSwap1.to.scaleFactor = _to.scale;

    // make tween update this sprite
    Shooter.tweenSwap1.step = Utils.makeFunctionForSprite( _from );

    // create the tween
    _from.tweener = new Tweenable();
    _from.tweener.tween( Shooter.tweenSwap1 );
    _from.tweener.owner = _from;
    _from.tweener.callback = _callback;
};


Shooter.prototype.tweenSwap = function( _first, _second, _callback )
{
    if ( !_first || !_second ) return;

    // set start and end values for tweens
    Shooter.tweenSwap1.from.x = Shooter.tweenSwap2.to.x = _first.x;
    Shooter.tweenSwap1.from.y = Shooter.tweenSwap2.to.y = _first.y;
    Shooter.tweenSwap1.from.scaleFactor = Shooter.tweenSwap2.to.scaleFactor = _first.scale.x;

    Shooter.tweenSwap2.from.x = Shooter.tweenSwap1.to.x = _second.x;
    Shooter.tweenSwap2.from.y = Shooter.tweenSwap1.to.y = _second.y;
    Shooter.tweenSwap2.from.scaleFactor = Shooter.tweenSwap1.to.scaleFactor = _second.scale.x;

    // make tweens update these sprites
    Shooter.tweenSwap1.step = Utils.makeFunctionForSprite( _first );
    Shooter.tweenSwap2.step = Utils.makeFunctionForSprite( _second );
    
    // create the tweens
    _first.tweener = new Tweenable();
    _first.tweener.tween( Shooter.tweenSwap1 );
    _first.tweener.owner = _first;
    _first.tweener.callback = null;

    _second.tweener = new Tweenable();
    _second.tweener.tween( Shooter.tweenSwap2 );
    _second.tweener.owner = _second;
    _second.tweener.callback = _callback;

};


var tt = 350;
Shooter.tweenSwap1 =
{
    from:
    {
        scaleFactor: 1
    },
    to:
    {
        scaleFactor: 1
    },
    duration: tt,
    easing: 'easeInQuad',
    step: null,
    finish: function() { this.owner.tweener = null; if ( this.callback ) this.callback(); }
};
Shooter.tweenSwap2 =
{
    from:
    {
        scaleFactor: 1
    },
    to:
    {
        scaleFactor: 1
    },
    duration: tt,
    easing: 'easeInQuad',
    step: null,
    finish: function() { this.owner.tweener = null; if ( this.callback ) this.callback(); }
};
Shooter.tweenBoost =
{
    from:
    {
        scaleFactor: 1
    },
    to:
    {
        scaleFactor: 1
    },
    duration: tt * 2,
    easing: 'easeInQuad',
    step: null,
    finish: function()
        {
            this.owner.tweener = null;
            if ( this.callback ) this.callback();
        }
};
