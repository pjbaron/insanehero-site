//
// Effects.js
//
// Pete Baron 2017
//
// very simple animation player for effects, handles a list of them and updates them
// each Effect is actually just a Sprite with additional properties
//


Effects.GRAVITY = 11.0;


Effects.POP_BUBBLE = 1;
Effects.FALL_BUBBLE = 2;
Effects.ROCKET = 3;
Effects.EXPLOSION = 4;
Effects.DRAGON_BLUE = 5;
Effects.BOOST_BONUS5 = 6;
Effects.ROCKET_SMOKE = 7;
Effects.ROCKET_FIRE = 8;
Effects.DRAGON_FLAME_JET = 9;
Effects.BOOST_SMOKE = 10;
Effects.DRAGON_LIGHTNING = 11;
Effects.DRAGON_GOLD = 12;
Effects.CRACK_ICE = 13;
Effects.FAKE_BUBBLE = 14;
Effects.SPARKLES_WHITE = 15;
Effects.SPARKLES_RAINBOW = 16;
Effects.DROP_FISH = 17;
Effects.DRAGON_ORANGE = 18;
Effects.DRAGON_PURPLE = 19;
Effects.DRAGON_PURPLE_LEAVE = 20;
Effects.FISH_SPLASH = 21;
Effects.STAR = 22;
Effects.DROP_DRAGON_ORANGE = 23;



// speed is used to multiply elapsed time in seconds which is added to the current frame number
// so a speed value of 0.06 * 16.666 = 1.0 (elapsed = 16.666ms = 1/60th second = 1 frame)
Effects.definitions = [
	// 0 = none
	{},
    // 1 = POP_BUBBLE
    {
        type: SpriteData.EFFECT_POP_BUBBLE.type,
        animation: "default",
        scale: 0.75,
        sound: "snd_pop",
        soundDelay: 0.15
    },
	// 2 = FALL_BUBBLE
	{
        type: SpriteData.EFFECT_FALL_BUBBLE.type,
        animation: "default",
        lockLast: true,
        scale: 1.0
    },
    // 3 = ROCKET
    {
        type: SpriteData.ROCKET.type,
        animation: "default",
        lockLast: true,
        scale: 1.0
    },
    // 4 = EXPLOSION
    {
        type: SpriteData.EFFECT_EXPLOSION.type,
        animation: "default",
        scale: 1.0,
        sound: "snd_bomb",
        soundDelay: 0.15
    },
    // 5 = DRAGON_BLUE
    {
        type: SpriteData.DRAGON_BLUE.type,
        animation: "flying",
        repeat: true,
        soundOnLoop: "snd_wing",
        scale: 1.0
    },
    // 6 = BOOST_BONUS5
    {
        type: SpriteData.PLUS5.type,
        speed: 0.0,
        key: "5plus.png",
        scale: 1.0
    },
    // 7 = ROCKET_SMOKE
    {
        type: SpriteData.EFFECT_ROCKET_SMOKE.type,
        animation: "default",
        lockLast: true,
        scale: 1.0
    },
    // 8 = ROCKET_FIRE
    {
        type: SpriteData.EFFECT_ROCKET_FIRE.type,
        animation: "default",
        repeat: true,
        scale: 1.0
    },
    // 9 = DRAGON_FLAME_JET
    {
        type: SpriteData.EFFECT_DRAGON_FLAME_JET.type,
        animation: "default",
        scale: 1.0,
        sound: "snd_dragon_fire"
    },
    // 10 = BOOST_SMOKE
    {
        type: SpriteData.EFFECT_BOOST_SMOKE.type,
        animation: "default",
        lockLast: true,
        scale: 1.0
    },
    // 11 = DRAGON_LIGHTNING
    {
        type: SpriteData.EFFECT_DRAGON_LIGHTNING.type,
        animation: "default",
        scale: 1.0,
        sound: "snd_dragon_zap"
    },
    // 12 = DRAGON_GOLD
    {
        type: SpriteData.DRAGON_EGG.type,
        animation: "default",
        repeat: true,
        scale: 1.0,
        sound: "snd_dragon_zap"
    },
    // 13 = CRACK_ICE
    {
        type: SpriteData.ICE.type,
        animation: "cracking",
        scale: 1.0
    },
    // 14 = FAKE_BUBBLE
    {
        type: SpriteData.EFFECT_FAKE_BUBBLE.type,
        lockLast: true,
        key: "bble_red.png",
        scale: 1.0,
        noAnim: true
    },
    // 15 = SPARKLES_WHITE
    {
        type: SpriteData.EFFECT_SPARKLES_WHITE.type,
        animation: "default",
        scale: 1.0
    },
    // 16 = SPARKLES_RAINBOW
    {
        type: SpriteData.EFFECT_SPARKLES_RAINBOW.type,
        animation: "default",
        scale: 1.0
    },
    // 17 = DROP_FISH
    {
        type: SpriteData.EFFECT_DROP_FISH.type,
        animation: "default",
        repeat: true,
        scale: 1.0
    },
    // 18 = DRAGON_ORANGE
    {
        type: SpriteData.DRAGON_ORANGE.type,
        animation: "flying",
        repeat: true,
        fadeOut: 0.1,
        soundOnLoop: "snd_wing",
        scale: 1.0
    },
    // 19 = DRAGON_PURPLE
    {
        type: SpriteData.DRAGON_PURPLE.type,
        animation: "flying",
        repeat: true,
        //fadeOut: 0.1,
        soundOnLoop: "snd_wing",
        scale: 1.0
    },
    // 20 = DRAGON_PURPLE_LEAVE
    {
        type: SpriteData.DRAGON_PURPLE.type,
        animation: "gliding",
        repeat: true,
        //fadeOut: 0.1,
        soundOnLoop: "snd_wing",
        scale: 1.0
    },
    // 21 = FISH_SPLASH
    {
        type: SpriteData.EFFECT_FISH_SPLASH.type,
        animation: "default",
        scale: 1.0
    },
    // 22 = STAR
    {
        type: SpriteData.EFFECT_STAR.type,
        animation: "default",
        lockLast: true,
        scale: 0.5
    },
    // 23 = DROP_DRAGON_ORANGE
    {
        type: SpriteData.DRAGON_ORANGE.type,
        animation: "default",
        lockLast: true,
        scale: 1.0
    },

];




function Effects( _game )
{
    this.game = _game;
	this.list = null;
}


Effects.prototype.create = function( _world, _managers, _playField, _gridCollide )
{
    this.world = _world;
    this.managers = _managers;
    this.playField = _playField;
    this.gridCollide = _gridCollide;
	this.list = [];
};


Effects.prototype.destroy = function()
{
    if ( Main.debug )
        console.log("Effects.destroy");
    
    this.reset();
	this.list = null;

    this.gridCollide = null;
    this.playField = null;
    this.managers = null;
    this.world = null;
    this.game = null;
    this.target = null;
};


Effects.prototype.reset = function()
{
    if ( Main.debug )
        console.log("Effects.reset");
    
    for( var i = this.list.length - 1; i >= 0; --i )
        this.list[i].destroy();
    this.list = [];
};


Effects.prototype.add = function( _type, _parent, _x, _y, _callback, _callbackCtx, _behind, _pcent )
{
    var effectSprite = new Sprite();
    var def = Effects.definitions[ _type ];
    effectSprite.create( _parent, def.type, this.managers.textures, _x, _y, _pcent, _behind );
    effectSprite.anchor.set( 0.5 );
    effectSprite.scale.set( def.scale );
    effectSprite.fxType = _type;
    effectSprite.vx = effectSprite.vy = 0;
    effectSprite.repeat = def.repeat;

    if ( !this.bespokeInit( _type, effectSprite, _parent ) )
    {
        effectSprite.destroy();
        effectSprite = null;
        return null;
    }

    if (def.animation !== undefined)
    {
        // use the universal SpriteData animation system with this animation name
        effectSprite.setAnimation( def.animation, false, true );
    }
    else
    {
        effectSprite.fxFrameNumber = def.first;
    }

    if ( _callback )
        effectSprite.bespokeLogic = _callback;
    else
        effectSprite.bespokeLogic = null;
    if ( _callbackCtx )
        effectSprite.bespokeLogicContext = _callbackCtx;
    else
        effectSprite.bespokeLogicContext = this;

    this.list.push(effectSprite);

    if ( def.sound )
    {
        // if ( def.soundDelay )
        //     this.game.managers.audio.playDelayed( def.sound, def.soundDelay * Math.random() );
        // else
            this.game.managers.audio.play( def.sound );
    }

    if ( Main.debugSpam )
        console.log( "Effects.add [" + (this.list.length) + "] type = " + _type + " " + _x + "," + _y );

    return effectSprite;
};


/// return false if we decide not to build this effectSprite
Effects.prototype.bespokeInit = function( _type, _effectSprite, _parent )
{
    var d;

    switch( _type )
    {
        case Effects.DRAGON_GOLD:
        {
            // make the dragon hatchling go up initially with a random horizontal component
            _effectSprite.vx = Math.random() * 96 - 48;
            _effectSprite.vy = -48;
            _effectSprite.hoverDelay = 1500;
            break;
        }

        case Effects.DRAGON_BLUE:
        {
            d = this.game.world.playField.pickVisibleBubble(this.game.world.playField.grid[0].length - 5, this.game.world.playField.grid[0].length - 2);
            if ( !d ) return false;
            _effectSprite.dest = d;
            // make it move rapidly
            _effectSprite.sx = 35;     // default = 25
            _effectSprite.sy = 31;     // default = 21
            _effectSprite.dx = _effectSprite.dy = 0.92;       // default = 0.940
            // make it launch to the right initially (from the boost start position)
            _effectSprite.vx = 400;
            _effectSprite.vy = 0;
            _effectSprite.leaving = false;
            _effectSprite.target = this.game.world.playField.grid[d.y][d.x];
            break;
        }

        case Effects.DRAGON_ORANGE:
        {
            d = this.game.world.playField.pickVisibleBubble();
            if ( !d ) return false;
            _effectSprite.dest = d;
            _effectSprite.vx = Math.random() * 40 - 20;
            _effectSprite.vy = -30;
            _effectSprite.target = this.game.world.playField.grid[d.y][d.x];
            _effectSprite.hoverDelay = 1000;
            break;
        }

        case Effects.DRAGON_PURPLE:
        {
            // pick a destination for the purple dragon
            d = this.playField.pickVisibleSpace();
            if ( !d ) return false;

            // drag a copy of my bubble to the new location
            var uiLoc = this.gridCollide.bubbleToGameUi(_effectSprite);
            var drag = new Sprite();
            drag.create( Main.gameUILayer, SpriteData.EFFECT_FAKE_BUBBLE.type, this.managers.textures, uiLoc.x, uiLoc.y, false, true);
            drag.anchor.set( 0.5 );

            _effectSprite.dest = d;
            _effectSprite.vx = Math.random() * 40 - 20;
            _effectSprite.vy = -30;
            _effectSprite.target = this.game.world.playField.grid[d.y][d.x];
            _effectSprite.hoverDelay = 1000;

            // make the bat go up initially with a random horizontal component
            _effectSprite.vx = Math.random() * 64 - 32;
            _effectSprite.vy = -50;
            _effectSprite.dragging = drag;
            break;
        }

        case Effects.DRAGON_PURPLE_LEAVE:
        {
            // make the purple dragon go up initially
            _effectSprite.vy = -100 - Math.random() * 100;
            break;
        }

        case Effects.BOOST_BONUS5:
        {
            // make the '5' go right initially
            _effectSprite.vx = 300;
            _effectSprite.vy = 0;
            // make it move rapidly
            _effectSprite.sx = 21;
            _effectSprite.sy = 25;
            // with less damping than usual
            _effectSprite.dx = _effectSprite.dy = 0.965;
            // with a high landing speed
            _effectSprite.landingSpeed = 90.0;
            break;
        }

        case Effects.ROCKET:
        {
            // add a flame _effectSprite to the tail of this rocket
            _effectSprite.effectOverlay = this.addAttached( Effects.ROCKET_FIRE, _effectSprite, -16, 0 );
            break;
        }

        case Effects.FALL_BUBBLE:
        {
            _effectSprite.vx = Math.random() * 40 - 20;
            _effectSprite.vy = -60 - Math.random() * 100;
            break;
        }

        case Effects.DROP_FISH:
        {
            _effectSprite.moveToFront();
            break;
        }
    }

    return true;
};


Effects.prototype.addAttached = function( _type, _attached, _xoff, _yoff, _callback, _callbackCtx )
{
    if ( Main.debugSpam )
        console.log( "Effects.addAttached type = " + _type + " " + _xoff + "," + _yoff);

	var effectSprite = new Sprite();
	var def = Effects.definitions[ _type ];
	effectSprite.create( _attached.parent, def.type, this.managers.textures, _attached.x + _xoff, _attached.y + _yoff, false );
	_attached.parent.setChildIndex( effectSprite, _attached.parent.getChildIndex( _attached ) );
	effectSprite.anchor.set( _attached.anchor.x, _attached.anchor.y );
    effectSprite.scale.set( def.scale );
	effectSprite.fxType = _type;
	effectSprite.fxFrameNumber = def.first;
    effectSprite.tz = _attached.tz;       // if it is a Tile then we want to preserve its z ordering position for this effectSprite
    effectSprite.repeat = def.repeat;
    if ( _callback )
        effectSprite.bespokeLogic = _callback;
    else
        effectSprite.bespokeLogic = null;
    if ( _callbackCtx )
        effectSprite.bespokeLogicContext = _callbackCtx;
    else
        effectSprite.bespokeLogicContext = this;
	this.list.push(effectSprite);
    if ( def.sound )
    {
        // if ( def.soundDelay )
        //     this.game.managers.audio.playDelayed( def.sound, def.soundDelay * Math.random() );
        // else
            this.game.managers.audio.play( def.sound );
    }
    return effectSprite;
};


Effects.prototype.update = function()
{
	for( var i = this.list.length - 1; i >= 0; --i )
	{
		var e = this.list[i];

        // detect if this effect was destroyed elsewhere
        if ( e.parent === null )
        {
            // destroy the sprite again (Sprite.destroy is protected, and this ensures it was done right)
            e.destroy();
            // remove it from the list if it was
            this.list.splice(i, 1);
            continue;
        }

        if ( e.shouldDie || (e.bespokeLogic && !e.bespokeLogic.call(e.bespokeLogicContext, e)) )
        {
            // kill any effect attached to this effect when it updates next
            if ( e.effectOverlay )
                e.effectOverlay.shouldDie = true;

            // destroy any Sprite that this effect might be dragging around with it
            if ( e.dragging && e.dragging.parent )
            {
                e.dragging.destroy();
                e.dragging = null;
            }

            var t = e.fxType;
            e.destroy();
            this.list.splice(i, 1);
            if ( Main.debugSpam )
                console.log("Effects destroy [" + (this.list.length) + "] type = " + t);
            continue;
        }

        // do this after the bespokeLogic because that could change the Effect type!
        var def = Effects.definitions[ e.fxType ];
        if ( def.animation )
        {
            if ( e.atEnd )
            {
                // play sound at loop repeat point unless the repeat has been cancelled (e.g. orange dragon shoot-then-fade)
                if ( def.soundOnLoop && e.repeat )
                    this.game.managers.audio.play( def.soundOnLoop );
                if ( !e.repeat && !def.lockLast )
                {
                    if ( def.fadeOut > 0 )
                    {
                        e.alpha -= def.fadeOut;
                        if ( e.alpha > 0.0 )
                            continue;
                    }
                    var t2 = e.fxType;
                    e.destroy();
                    this.list.splice(i, 1);
                    if ( Main.debugSpam )
                        console.log("Effects anim destroy [" + (this.list.length) + "] type = " + t2);
                    continue;
                }
                e.atEnd = false;
            }
        }

        // if ( def.last !== undefined && e.fxFrameNumber > def.last )
        // {
        //     if ( def.lockLast )
        //     {
        //         e.fxFrameNumber = def.last;
        //     }
        //     else if ( def.repeat )
        //     {
        //         e.fxFrameNumber = 0;
        //         if ( def.soundOnLoop )
        //             this.game.managers.audio.play( def.soundOnLoop );
        //     }
        //     else
        //     {
        //         var t2 = e.fxType;
        //         e.destroy();
        //         this.list.splice(i, 1);
        //         if ( Main.debugSpam )
        //             console.log("Effects anim destroy [" + (this.list.length) + "] type = " + t2);
        //         continue;
        //     }
        // }

        // if ( !def.noAnim )
        // {
        //     var key = this.getKeyName( e.fxType, Math.floor(e.fxFrameNumber) );
        //     e.setFrame( key );
        // }
        
        e.update();

        // if ( def.speed !== undefined )
        //     e.fxFrameNumber += Main.elapsedTime * def.speed;
        // else
        //     e.fxFrameNumber += Main.elapsedTime * def.speeds[Math.floor(e.fxFrameNumber)];

        if ( def.rotation )
            e.rotation += def.rotation;
	}

	return this.list.length;
};


Effects.prototype.getKeyName = function( _type, _frame )
{
    var def = Effects.definitions[ _type ];
    if ( def.key ) return def.key;
    if ( _frame === undefined || def.speed === 0.0 ) return def.baseKey + (def.keySubscript ? def.keySubscript : "");
    if ( def.digits ) return def.baseKey + Utils.padToLength(_frame.toString(), def.digits, "0", false) + (def.keySubscript ? def.keySubscript : "");
	return def.baseKey + _frame.toString() + (def.keySubscript ? def.keySubscript : "");
};


// swoop to grid location _object.dest to arrive at bubble _object.target (if there is one)
// return false when we have arrived
Effects.swoopToGridTarget = function( _object, _playField, _offset )
{
    // NOTE: code is dangerous if we start using object pooling (it might get reused before this function notices it died)
    if ( _object.target && _object.target.game === null )
    {
        // target bubble has been destroyed... pick another
        var d = _playField.pickVisibleBubble();
        if ( !d )
        {
            // we can't find one, kill this _object
            _object.target = null;
            return false;
        }
        _object.dest = d;
        _object.target = _playField.grid[d.y][d.x];
    }

    // accelerate towards the target location
    var target = _playField.gridCollide.gridToGameUi( _object.dest );
    if ( _offset )
    {
        target.x += _offset.x;
        target.y += _offset.y;
    }
    return Effects.swoopToTarget( _object, target );
};


// _target has .x and .y in pixels on the same layer as _object.parent
// return false when we have arrived
Effects.swoopToTarget = function( _object, _target )
{
    var dx = _target.x - _object.x;
    var dy = _target.y - _object.y;
    var d2 = dx * dx + dy * dy;
    var dist = Math.sqrt(d2);
    _object.vx += (_object.sx || 25) * dx / dist;
    _object.vy += (_object.sy || 21) * dy / dist;
    _object.x += _object.vx * Main.elapsedTime / 1000;
    _object.y += _object.vy * Main.elapsedTime / 1000;

    if ( dist < Game.bubbleRadius * 4 )
    {
        // apply damping to velocity when we're getting close
        _object.vx *= _object.dx || 0.940;
        _object.vy *= _object.dy || 0.940;
    }
    else
    {
        // apply slight damping to velocity the rest of the time
        _object.vx *= 0.980;
        _object.vy *= 0.980;
    }

    // close enough to touch the target and not too fast
    if ( dist < Game.bubbleRadius && Math.abs(_object.vx) + Math.abs(_object.vy) * 1.6 < (_object.landingSpeed || 55.0) )
    {
        return false;
    }

    return true;
};


Effects.prototype.countDragonsFlying = function()
{
    var c = 0;
    for( var i = this.list.length - 1; i >= 0; --i )
    {
        var e = this.list[i];
        if ( e.fxType == Effects.DRAGON_BLUE || e.fxType == Effects.DRAGON_ORANGE )
            c++;
    }
    return c;
};


Effects.prototype.count = function()
{
    return this.list.length;
};


//
// common callback functions for particular effects (static functions)
//


Effects.starFall = function( _effectSprite )
{
    Effects.fall( _effectSprite );
    _effectSprite.rotation += 0.1;
    return ( --_effectSprite.life > 0 );
};


Effects.bubbleFall = function( _effectSprite )
{
    var e;

    Effects.fall( _effectSprite );

    switch( _effectSprite.type )
    {
        case SpriteData.EFFECT_DROP_FISH.type:
            _effectSprite.rotation += _effectSprite.vr;
            if (_effectSprite.y >= Game.killAtBottom)
            {
                // add splash where the fish enters the water
                World.effects.add( Effects.FISH_SPLASH, _effectSprite.parent, _effectSprite.x, _effectSprite.y );
                // add splash over the fish collection UI widget
                e = World.effects.add( Effects.FISH_SPLASH, this.game.world.fishWidget, 0.25, -0.5, null, null, false, true );
                if ( e )
                {
                    e.scale.set( 1.0 ); //0.5 / e.parent.scale.x, 0.5 / e.parent.scale.y );
                }
                // count down remaining foods
                this.game.foodCount--;
                this.game.managers.audio.play( "snd_collect_fish" );
            }
            break;
    }

    return (_effectSprite.y < Game.killAtBottom);
};


Effects.fall = function( _effectSprite )
{
    // damp x velocity
    _effectSprite.vx *= 0.985;
    // gravity on y velocity
    _effectSprite.vy += Effects.GRAVITY;

    // move the sprite
    _effectSprite.x += _effectSprite.vx * Main.elapsedTime / 1000;
    _effectSprite.y += _effectSprite.vy * Main.elapsedTime / 1000;

    return true;
};

