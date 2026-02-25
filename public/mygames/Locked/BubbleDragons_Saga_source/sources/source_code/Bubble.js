//
// Bubble.js
//
// Pete Baron 2017
//
// Contains logic and data for individual bubbles
//



function Bubble( _game, _managers, _parent, _gridCollide )
{
    this.game = _game;
    this.managers = _managers;
    this.parent = _parent;
    this.playField = this.game.world.playField;
    this.grid = this.playField.grid;
    this.gridCollide = _gridCollide;

    this.sprite = null;
    this.under_type = null;
    this.overlay = null;
    this.vx = 0;
    this.vy = 0;
    this.mx = 0;
    this.my = 0;
    this.wobbleTime = 0;
    this.wobblex = this.wobbley = 0;
    this.updateCallback = null;
}


Bubble.prototype.create = function( _layer, _type, _gx, _gy )
{
    var loc = { x: _gx, y: _gy };
    var p = this.gridCollide.gridToBubble( loc );

    var gb = this.getFromGrid(loc);
    if ( Main.debug )
        if ( gb !== 0 && gb !== null )
            console.log( "WARNING: bubble created in invalid grid location! " + gb);

    this.type = _type;
    this.under_type = SpriteData.UNDEFINED.type;
    this.overlay = null;
    this.vx = 0;
    this.vy = 0;
    this.mx = 0;
    this.my = 0;

    this.sprite = new Sprite();
    // _parent, _key, _textureManager, _x, _y, _pcnt
    this.sprite.create( _layer, this.type, this.managers.textures, p.x, p.y, false );
    this.sprite.anchor.set(0.5);
    this.addToGrid( loc );

    if ( Main.debugSpam )
        console.log( "Bubble.create " + this.sprite.key + " " + _type + " " + _gx + "," + _gy + " " + p.x + "," + p.y );
};


Bubble.prototype.destroy = function()
{
    if ( Main.debugSpam )
    {
        if ( this.sprite )
            console.log("Bubble.destroy at " + this.sprite.x + "," + this.sprite.y);
        else
            console.log("Bubble.destroy WARNING no sprite");
    }

    if ( this.gridCollide )
    {
        this.gridCollide.removeBubble(this);
        this.gridCollide = null;
    }

    if ( this.overlay )
    {
        this.overlay.destroy();
        this.overlay = null;
    }

    if ( this.sprite )
    {
        if ( this.sprite.dragging )
        {
            this.sprite.dragging.destroy();
            this.sprite.dragging = null;
        }
        this.sprite.destroy();
        this.sprite = null;
    }

    this.updateCallback = null;
    this.under_type = SpriteData.UNDEFINED.type;
    this.grid = null;
    this.parent = null;
    this.managers = null;
    this.game = null;
    this.playField = null;
};


/// return false if caller should destroy the bubble now
Bubble.prototype.update = function()
{
    if ( this.wobbleTime !== 0 )
    {
        if ( this.wobbleTime > Main.nowTime )
        {
            this.sprite.x = this.wx + Math.random() * this.wobblex * 2 - this.wobblex;
            this.sprite.y = this.wy + Math.random() * this.wobbley * 2 - this.wobbley;
        }
        else
        {
            // put the sprite back where it started
            this.sprite.x = this.wx;
            this.sprite.y = this.wy;
            this.wobbleTime = 0;
        }
    }

    if ( this.updateCallback )
    {
        this.updateCallback( this );
    }

    this.sprite.update();

    return true;
};


Bubble.prototype.getFromGrid = function( _loc )
{
    if ( _loc )
    {
        if ( _loc.y >= 0 && _loc.y < this.grid.length )
            if ( _loc.x >= 0 && _loc.x < this.grid[_loc.y].length )
                return this.grid[_loc.y][_loc.x];
    }
    return null;
};


Bubble.prototype.addToGrid = function( _loc )
{
    if ( _loc )
    {
        if ( _loc.y >= 0 && _loc.y < this.grid.length )
            if ( _loc.x >= 0 && _loc.x < this.grid[_loc.y].length )
                this.grid[_loc.y][_loc.x] = this;
    }
};


// return true if they match
Bubble.prototype.matchCheck = function( _typeMatch )
{
    if ( this.type == _typeMatch ) return true;

    // frozen bubble should compare it's hidden type
    if ( this.type == SpriteData.ICE.type ) return (this.under_type == _typeMatch);

    // wild matches anything
    if ( _typeMatch == SpriteData.RAINBOW.type || this.type == SpriteData.RAINBOW.type ) return true;

    return false;
};


Bubble.prototype.addOverlay = function( _type )
{
    if ( Main.debug )
        console.log( "Bubble.addOverlay " + _type + " on " + this.sprite.key );

    var f = new Sprite();
    f.create( this.sprite, _type, this.managers.textures, 0, 0, false );
    f.anchor.set( 0.5 );
    this.overlay = f;

    return f;
};


Bubble.prototype.pop = function( _loc )
{
    // don't try to pop a destroyed bubble
    if ( this.game === null )
    {
        if (Main.debug)
            console.log("WARNING: bubble already destroyed!");
        return;
    }

    // don't pop the egg bubble, it destroys itself after releasing the dragon
    if ( this.type == SpriteData.EGG.type )
    {
        if ( Main.debug )
            console.log("Bubble.pop will not pop the egg, it cracks and destroys itself");
        return;
    }

    if ( Main.debugSpam )
        console.log("Bubble.pop at " + _loc.x + "," + _loc.y);

    // award boost for popping bubbles too
    if ( Game.boostCanCharge )
        Game.boostCharge += Game.popBoost;

    // clear the grid location where the bubble was
    if ( _loc.y < 0 || _loc.x < 0 || _loc.x >= this.grid[_loc.y].length || this.grid[_loc.y][_loc.x] == -1 )
        alert("snafu!");

    this.grid[_loc.y][_loc.x] = 0;

    if ( this.overlay )
    {
        this.releaseOverlay( false );
    }

    var uiLoc = this.gridCollide.bubbleToGameUi( this.sprite );

    // bomb will cause an explosion, doesn't need this little pop effect
    if ( this.type != SpriteData.BOMB.type )
    {
        // pop effect
        World.effects.add( Effects.POP_BUBBLE, Main.gameUILayer, uiLoc.x, uiLoc.y );
    }

    var score = Game.scoreFirstPop + Game.popCount * Game.scoreMultiplyPop;
    Game.popCount++;
    Game.score += score;
    var ft = new FloatText();
    // _x, _y, _style, _parent, _managers, _message, _distance, _delay
    ft.create(uiLoc.x, uiLoc.y, Main.textStyleBoldSmall, Main.gameUILayer, this.managers, score.toString());

    // destroy this bubble
    this.destroy();
};


Bubble.prototype.changeType = function( _type )
{
    this.under_type = this.type;    // remember what my original type value was (e.g. for shell bubbles to revert)
    this.type = _type;
    this.sprite.setType( this.type );
    return this;
};


Bubble.prototype.isNormal = function( _rainbowAllowed )
{
    return Bubble.isNormal( this.type, _rainbowAllowed );
};


Bubble.isNormal = function( _type, _rainbowAllowed )
{
    if ( SpriteData[ _type ].normal )
    {
        if ( _type == "RAINBOW" || _type == SpriteData.RAINBOW.type && _rainbowAllowed === false )
            return false;
        return true;
    }
    return false;
};


Bubble.isNormalKey = function( _key, _rainbowAllowed )
{
    var type = SpriteData.UNDEFINED.type;
    for( var i in SpriteData )
    {
        var o = SpriteData[i];
        if ( o.animations && o.animations.default && o.animations.default[0] == _key )
        {
            if ( o.normal )
            {
                if ( o.type == SpriteData.RAINBOW.type && _rainbowAllowed === false )
                    return false;
                return true;
            }
        }
    }

    return false;
};


Bubble.prototype.releaseOverlay = function( _dropped )
{
    if ( Main.debug )
    {
        console.log( "Bubble.releaseOverlay " + this.overlay.key + " on " + this.sprite.key );
    }

    var e;
    var dropOverlay = true;

    var uiLoc = this.gridCollide.bubbleToGameUi( this.sprite );
    uiLoc.x += this.overlay.x;
    uiLoc.y += this.overlay.y;

    switch( this.overlay.type )
    {
        // if it was a fish
        case SpriteData.FISH.type:
        {
            // _type, _parent, _x, _y, _callback, _callbackCtx, _behind
            e = World.effects.add( Effects.DROP_FISH, Main.gameUILayer, uiLoc.x, uiLoc.y, Effects.bubbleFall );
            if ( e )
                e.vr = Math.random() * 0.25 - 0.125;
            if ( this.game.foodCount == 1 )
                this.game.droppedLastFish = true;
            break;
        }

        // if it was an orange flame dragon
        case SpriteData.DRAGON_ORANGE.type:
        {
            if ( !_dropped && this.overlay.animation == "default" )
            {
                // if it was not dropped make it fly to another group
                e = World.effects.add( Effects.DRAGON_ORANGE, Main.gameUILayer, uiLoc.x, uiLoc.y, this.orangeDragonLogic, this );
                // we're going to destroy 'this' so transfer useful references so the callback can use them
                if ( e )
                    e.playField = this.playField;
                dropOverlay = false;
            }
            else
            {
                // if it was dropped make an effect for it
                e = World.effects.add( Effects.DROP_DRAGON_ORANGE, Main.gameUILayer, uiLoc.x, uiLoc.y, Effects.bubbleFall );
                if ( e )
                    e.moveToFront();
            }
            break;
        }

        // if it was a purple carry dragon
        case SpriteData.DRAGON_PURPLE.type:
        {
            // check if this was dropped when the player cracked the egg (hitGong)... we don't want it to carry in that case
            if ( _dropped && !this.playField.hitGong )
            {
                if ( this.overlay.animation == "default" )
                {
                    // if it was dropped make it carry the bubble to another group
                    e = World.effects.add( Effects.DRAGON_PURPLE, Main.gameUILayer, uiLoc.x, uiLoc.y, this.purpleDragonLogic, this );
                    if ( e )
                    {
                        // we're going to destroy 'this' so transfer useful references so the callback can use them
                        e.playField = this.playField;
                        e.gridCollide = this.gridCollide;
                        e.game = this.game;
                        e.managers = this.managers;
                        // change the dragged fake bubble to match this bubble type
                        if ( e.dragging )
                            e.dragging.setType( this.type );
                    }
                    dropOverlay = false;
                }
            }
            else    // not dropped, must be popped...
            {
                // if it was popped make dragon glide off the right-hand screen edge
                e = World.effects.add( Effects.DRAGON_PURPLE_LEAVE, Main.gameUILayer, uiLoc.x, uiLoc.y, this.purpleDragonLeave, this );
                if ( e )
                {
                    e.vx = 200 + 50 * Math.random();
                    e.vy = -75 - 50 * Math.random();
                }
            }
            break;
        }

    }

    // the overlay is dropping separately as an effect...
    // if ( dropOverlay )
    // {
    // }

    this.overlay.destroy();
    this.overlay = null;

    return dropOverlay;
};


Bubble.prototype.wobble = function( _durationSec, _rangex, _rangey )
{
    this.wobbleTime = Main.nowTime + _durationSec * 1000;
    this.wobblex = _rangex;
    this.wobbley = _rangey;
    this.wx = this.sprite.x;
    this.wy = this.sprite.y;
};



// callback for purple (carry) dragon flying
Bubble.prototype.purpleDragonLogic = function( _effectSprite )
{
    var d, dx, dy, d2, dist;

    switch( _effectSprite.animation )
    {
        case "gliding":

            break;

        case "flying":
            // if we have started to fade
            if ( _effectSprite.alpha < 1.0 )
            {
                // continue to fade then kill this bat (and it's bubble)
                _effectSprite.alpha -= Main.elapsedTime / 1000;
                if ( _effectSprite.alpha <= 0 )
                {
                    // return false will kill the effectSprite and anything it is dragging too
                    return false;
                }
                break;
            }

            // target hole has been filled or adjacent bubble is gone... 
            if ( _effectSprite.dragging && (_effectSprite.gridCollide.get( _effectSprite.dest ) || !_effectSprite.playField.adjacentFilled(_effectSprite.dest)) )
            {
                // pick another destination
                d = _effectSprite.playField.pickVisibleSpace();

                if ( !d )
                {
                    // we can't find one, fade then kill this bat (and it's bubble)
                    _effectSprite.alpha -= Main.elapsedTime / 1000;
                    break;
                }
                // we found one, restore the alpha and set the destination
                _effectSprite.alpha = 1.0;
                _effectSprite.dest = d;
            }

            // accelerate towards the target location
            target = _effectSprite.gridCollide.gridToGameUi( _effectSprite.dest );
            dx = target.x - _effectSprite.x;
            dy = target.y - _effectSprite.y - Game.bubbleRadius;
            d2 = dx * dx + dy * dy;
            dist = Math.sqrt(d2);
            _effectSprite.vx += 22 * dx / dist;
            _effectSprite.vy += 15 * dy / dist;
            _effectSprite.x += _effectSprite.vx * Main.elapsedTime / 1000;
            _effectSprite.y += _effectSprite.vy * Main.elapsedTime / 1000;

            // if flying too near the bottom of the screen...
            if (_effectSprite.y > Main.height / 3 * 2)
            {
                // set velocity to upwards
                _effectSprite.vy = Math.min(_effectSprite.vy, -30);
                // pick a new destination
                _effectSprite.dest = _effectSprite.playField.pickVisibleSpace();
                if ( _effectSprite.dest === null )
                {
                    // we can't find one, fade then kill this bat (and it's bubble)
                    _effectSprite.alpha -= Main.elapsedTime / 1000;
                }
            }

            // drag bubble if attached to one
            if ( _effectSprite.dragging )
            {
                _effectSprite.dragging.x = _effectSprite.x;
                _effectSprite.dragging.y = _effectSprite.y + Game.bubbleRadius;
            }

            // apply damping to velocity
            _effectSprite.vx *= 0.94;
            _effectSprite.vy *= 0.94;

            // close enough to touch the target and not dragging or not too fast
            if ( dist < Game.bubbleRadius && (!_effectSprite.dragging || Math.abs(_effectSprite.vx) + Math.abs(_effectSprite.vy) * 1.6 < 24.0) )
            {
                if ( _effectSprite.dragging )
                {
                    // so long as we're not so low that the player will lose...
                    if ( _effectSprite.y < Main.height / 3 * 2 )
                    {
                        // create bubble copy of _effectSprite.dragging in the hole we flew to
                        var b = new Bubble( _effectSprite.game, _effectSprite.managers, _effectSprite.playField, _effectSprite.gridCollide );
                        b.create( Main.bubbleLayer, _effectSprite.dragging.type, _effectSprite.dest.x, _effectSprite.dest.y );
                        // create bat overlay for the new bubble
                        b.addOverlay( SpriteData.DRAGON_PURPLE.type );
                    }
                    // return false will destroy dragged fake bubble in the Effects.update which called this bespokeUpdate
                }
                return false;
            }
            break;
    }
    return true;
};


Bubble.prototype.purpleDragonLeave = function( _effectSprite )
{
    _effectSprite.x += _effectSprite.vx * Main.elapsedTime / 1000;
    _effectSprite.y += _effectSprite.vy * Main.elapsedTime / 1000;
    _effectSprite.vx += 10;
    _effectSprite.vy *= 0.995;
    // fade when off edges    
    if ( Math.abs(_effectSprite.x) > Game.gridOffsetX )
    {
        _effectSprite.alpha -= 0.05;
        if ( _effectSprite.alpha <= 0 )
        {
            // return false will destroy dragged fake bubble in the Effects.update which called this bespokeUpdate
            return false;
        }
    }
    return true;
};


// callback for orange (flame) dragon flying
Bubble.prototype.orangeDragonLogic = function( _effectSprite )
{
    switch( _effectSprite.animation )
    {
        case "flying":
            if ( !Effects.swoopToGridTarget( _effectSprite, _effectSprite.playField, { x: -80, y: 4 } ) )
            {
                // start the fire-blow animation when we arrive
                _effectSprite.setAnimation( "shooting" );
                _effectSprite.shootingFlag = false;
                _effectSprite.noRepeat = true;      // for the Sprite animation system
                _effectSprite.repeat = false;       // for the Effect update system
            }
            break;

        case "shooting":
            if ( _effectSprite.frameIndex == 5 && !_effectSprite.shootingFlag )
            {
                var flameEffect = World.effects.add( Effects.DRAGON_FLAME_JET, _effectSprite.parent, _effectSprite.x, _effectSprite.y, this.orangeFlameLogic, this );
                _effectSprite.shootingFlag = true;
                if ( flameEffect )
                {
                    // transfer my references to the flame effect that will pop the target bubble
                    flameEffect.target = _effectSprite.target;
                    flameEffect.dest = _effectSprite.dest;
                    flameEffect.playField = _effectSprite.playField;
                }
            }
            break;
    }
    return true;
};


Bubble.prototype.orangeFlameLogic = function( _effectSprite )
{
    if ( _effectSprite.target && _effectSprite.atEnd )
    {
        if ( _effectSprite.target && _effectSprite.target.sprite )
        {
            _effectSprite.playField.matchAt( _effectSprite.dest, _effectSprite.target, 2 );
            _effectSprite.target.pop( _effectSprite.dest );
            _effectSprite.target = null;
            _effectSprite.playField.looseFall = true;
        }
        return false;
    }
    return true;
};

