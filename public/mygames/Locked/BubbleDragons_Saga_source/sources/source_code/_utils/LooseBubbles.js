//
// LooseBubbles.js
//
// Pete Baron 2017
//
// Control all the loose bubbles as they fall off the grid
//





function LooseBubbles( _game )
{
    this.game = _game;
}


LooseBubbles.GRAVITY = 11.0;


LooseBubbles.prototype.create = function( _world, _managers, _playField, _gridCollide )
{
    this.world = _world;
    this.managers = _managers;
    this.playField = _playField;
    this.gridCollide = _gridCollide;
    this.list = [];
};


LooseBubbles.prototype.destroy = function()
{
    if ( this.list )
    {
        for(var i = this.list.length - 1; i >= 0; --i)
        {
            this.list[i].destroy();
            this.list[i] = null;
        }
        this.list = null;
    }

    this.gridCollide = null;
    this.playField = null;
    this.managers = null;
    this.world = null;
    this.game = null;
};


LooseBubbles.prototype.addBubble = function( _bubble, _delayMS )
{
    if (!_bubble) return null;

    // don't add a looseBubble version of the Gong placeholder
    if ( _bubble.type == SpriteData.EGG.type ) return null;

    var uiLoc;
    uiLoc = this.gridCollide.bubbleToGameUi(_bubble.sprite);
    var lb = new Sprite();
    // add bubble to the front of the children list (final boolean in create function) to keep them
    // behind any overlay that might also be falling
    lb.create( Main.gameUILayer, _bubble.type, this.managers.textures, uiLoc.x, uiLoc.y, false, true);
    lb.anchor.set( 0.5 );
    lb.scale.set( _bubble.sprite.scale.x, _bubble.sprite.scale.y );
    // carry any pulse wave effect over to the loose bubbles, make them go up initially
    lb.vx = (_bubble.vx || 0) * 10;
    if ( lb.vx === 0 ) lb.vx = Math.random() * 120 - 60;
    lb.vy = (_bubble.vy || 0) * 10 - 80;
    lb.delay = _delayMS;
    lb.lbType = "bubble";
    this.list.push(lb);

    return lb;
};


LooseBubbles.prototype.addOverlay = function( _overlay, _delayMS )
{
    if (!_overlay) return;
    var sprite = _overlay.parent;
    if (!sprite) return;
    var uiLoc;
    uiLoc = this.gridCollide.bubbleToGameUi(sprite);
    var lb = new Sprite();
    lb.create( Main.gameUILayer, _overlay.type, this.managers.textures, uiLoc.x, uiLoc.y, false);
    lb.anchor.set( 0.5 );
    lb.scale.set( sprite.scale.x, sprite.scale.y );
    // carry any pulse wave effect over to the loose bubbles, make them go up initially
    lb.vx = (sprite.vx || 0) * 50;
    if ( lb.vx === 0 ) lb.vx = Math.random() * 200 - 100;
    lb.vy = (sprite.vy || 0) * 50 - 200;
    lb.delay = _delayMS;
    lb.lbType = "overlay";
    if ( _overlay.animation )
    {
        lb.vr = Math.random() - 0.5;
        lb.animDelay = _overlay.animDelay;
        lb.animTime = _overlay.animTime;
        lb.animFrame = _overlay.animFrame;
        lb.animation = _overlay.animation;
        lb.animBaseKey = _overlay.animBaseKey;
    }
    this.list.push(lb);
};


LooseBubbles.prototype.addFairy = function( _overlay, _delayMS )
{
    if (!_overlay) return;
    var sprite = _overlay.parent;
    if (!sprite) return;
    var uiLoc;
    uiLoc = this.gridCollide.bubbleToGameUi(sprite);
    // pick a destination for the fairy
    var d = this.playField.pickVisibleBubble();
    if ( !d ) return;

    var lb = this.addDragon( d, sprite, "orange_flying/", "fairy" );

    // make the fairy go up initially with a random horizontal component
    lb.vx = Math.random() * 40 - 20;
    lb.vy = -30;
    lb.delay = _delayMS;
    lb.dragging = null;
    lb.target = this.playField.grid[d.y][d.x];
    lb.hoverDelay = 1000;
};


LooseBubbles.prototype.addBat = function( _overlay, _delayMS, _findEmpty )
{
    if (!_overlay) return;
    var sprite = _overlay.parent;
    if (!sprite) return;
    var uiLoc;
    uiLoc = this.gridCollide.bubbleToGameUi(sprite);

    // pick a destination for the bat and create a bubble copy if required
    // if it is popped the bat will fly off the screen top
    // if it is dropped the bat will carry the bubble to an empty location
    var d, drag;
    if ( _findEmpty )
    {
        d = this.playField.pickVisibleSpace();
        if ( !d ) return;

        // drag a copy of my bubble to the new location
        // NOTE: do this before creating the bat in order to preserve sprite order
        drag = new Sprite();
        drag.create( Main.gameUILayer, sprite.type, this.managers.textures, uiLoc.x, uiLoc.y, false);
        drag.anchor.set( 0.5 );
    }
    else
    {
        d = this.gridCollide.bubbleToGrid(sprite);
        d.x = (sprite.x < 0 ? -1 : Game.width * 2);  // depart at left or right edge
        drag = null;
    }

    // create the bat
    var lb = this.addDragon( d, sprite, "purple_flying/", "bat" );

    // make the bat go up initially with a random horizontal component
    lb.vx = Math.random() * 64 - 32;
    lb.vy = -50;
    lb.delay = _delayMS;
    lb.dragging = drag;
};


LooseBubbles.prototype.addDragon = function( _gotoGrid, _parentSprite, _baseKey, _type )
{
    var uiLoc = this.gridCollide.bubbleToGameUi(_parentSprite);

    var lb = new Sprite();
    lb.create( Main.gameUILayer, _baseKey + "00.png", this.managers.textures, uiLoc.x, uiLoc.y - Game.bubbleRadius, false);
    lb.anchor.set( 0.5 );
    lb.scale.set( _parentSprite.scale.x, _parentSprite.scale.y );
    lb.parentKey = _parentSprite.key;
    lb.lbType = _type;
    lb.dest = _gotoGrid;
    lb.animTime = Main.nowTime + Math.floor( Math.random() / 4 * 1000 );
    lb.animDelay = 6 * 16.67;
    lb.animFrame = 0;
    lb.animation = [ { frame: "00.png", delay: 6, sound: "snd_wing" }, { frame: "01.png", delay: 6 }, { frame: "02.png", delay: 6 }, { frame: "01.png", delay: 6 }  ];
    lb.animBaseKey = _baseKey;
    this.list.push(lb);

    return lb;
};


// end of game sequence shoots bonus balls into the air
LooseBubbles.prototype.addBonus = function( _key, _angle, _delayMS )
{
    var lb = new Sprite();
    // _parent, _key, _textureManager, _x, _y, _pcnt
    lb.create( Main.gameUILayer, _key, this.managers.textures, Game.shotStartX, Game.shotStartY, false );
    lb.anchor.set( 0.5 );
    lb.visible = true;
    lb.vx = Math.sin(_angle * Math.PI / 180.0) * Game.bonusShootSpeed;
    lb.vy = -Math.cos(_angle * Math.PI / 180.0) * Game.bonusShootSpeed;
    lb.delay = _delayMS;
    lb.lbType = "bonus";
    this.list.push(lb);
    return lb;
};




LooseBubbles.prototype.update = function()
{
    for(var i = this.list.length - 1; i >= 0; --i)
    {
        var target, dx, dy, d2, dist, d;

        var lb = this.list[i];
        if ( lb.delay > 0 )
        {
            lb.delay = Math.max( lb.delay - Main.elapsedTime, 0 );
        }
        else
        {
            // loose bubble animation
            if ( lb.animTime && Main.nowTime >= lb.animTime )
            {
                if ( lb.animation )
                {
                    var a = lb.animation[lb.animFrame];
                    lb.setFrame( lb.animBaseKey + a.frame );
                    lb.animDelay = a.delay * 16.67;
                    if ( a.sound ) this.managers.audio.play( a.sound );
                    lb.animFrame++;
                    if (lb.animFrame >= lb.animation.length)
                        lb.animFrame = 0;
                }
                else
                {
                    switch( lb.key )
                    {
                        case "orange_fireBlow/00.png":
                            lb.animDelay = 3 * 16.67;
                            lb.setFrame("orange_fireBlow/01.png");
                            this.managers.audio.play( "snd_wing" );
                            break;
                        case "orange_fireBlow/01.png":
                            lb.animDelay = 6 * 16.67;
                            lb.setFrame("orange_fireBlow/02.png");
                            break;
                        case "orange_fireBlow/02.png":
                            lb.setFrame("orange_fireBlow/03.png");
                            break;
                        case "orange_fireBlow/03.png":
                            lb.setFrame("orange_fireBlow/04.png");
                            lb.animDelay = 6 * 16.67;
                            break;
                        case "orange_fireBlow/04.png":
                            lb.animDelay = 6 * 16.67;
                            lb.setFrame("orange_fireBlow/05.png");
                            // add flame effect from this dragon
                            World.effects.add( Effects.DRAGON_FLAME_JET, lb.parent, lb.x, lb.y );    //, this.fireBallLogic, this );
                            break;
                        case "orange_fireBlow/05.png":
                            lb.alpha -= 0.1;
                            if ( lb.alpha < 0.9 )
                            {
                                // do matching from the bubble we pop
                                if ( lb.target )
                                {
                                    this.playField.matchAt( lb.dest, lb.target, 2 );
                                    lb.target.pop( lb.dest );
                                    lb.target = null;
                                    this.playField.looseFall();
                                }
                            }
                            if ( lb.alpha <= 0 )
                            {
                                // fade then remove the dragon
                                this.list.splice(i, 1);
                                lb.destroy();
                                continue;
                            }
                            break;
                    }
                }

                lb.animTime += lb.animDelay;

                // catch up if a stalled frame has put us more than one frame behind
                if ( lb.animTime < Main.nowTime )
                    lb.animTime = Main.nowTime;
            }

            switch(lb.lbType)
            {
                case "bonus":

                    // apply velocity
                    lb.x += lb.vx * Main.elapsedTime / 1000;
                    lb.y += lb.vy * Main.elapsedTime / 1000;

                    // stop when half-way up the ui layer
                    if ( lb.y < -Game.bubbleDiameter * 2 )
                    {
                        // add explosion effect over this sprite
                        World.effects.add( Effects.EXPLOSION, Main.gameUILayer, lb.x, lb.y );
                        this.list.splice(i, 1);

                        if ( lb.score )
                        {
                            // add score for this bonus award to the game score and a floating text effect
                            Game.score += lb.score;
                            var ft = new FloatText();
                            // _x, _y, _style, _parent, _managers, _message, _distance, _delay
                            ft.create(lb.x, lb.y, Main.textStyleBoldSmall, Main.gameUILayer, this.managers, lb.score.toString());
                        }

                        lb.destroy();
                    }

                    break;

                case "hatchling":

                    if ( (Game.frameCount & 7) === 0 )
                    {
                        var n = Utils.near( lb, Game.bubbleRadius / 2 );
                        World.effects.add( Effects.SPARKLES_WHITE, lb.parent, n.x, n.y );
                    }

                    lb.scale.set( lb.scale.x * 1.003 );

                    if ( lb.hoverDelay > 0 )
                    {
                        Effects.swoopToGridTarget( lb, this.playField );
                        lb.hoverDelay -= Main.elapsedTime;
                    }
                    else
                    {
                        lb.alpha -= Main.elapsedTime / 1000;
                        if ( lb.alpha <= 0 )
                        {
                            this.list.splice(i, 1);
                            lb.destroy();
                        }
                    }

                    break;

                case "fairy":

                    if ( !Effects.swoopToGridTarget( lb, this.playField, { x: -70, y: 14 } ) )
                    {
                        // when we arrive, if we're not already blowing fire
                        if ( lb.type != SpriteData.DRAGON_FLAME_JET.type || lb.animation != 2 )
                        {
                            // start the fire-blow animation
                            lb.animation = 2;
                            lb.frameIndex = 0;
                            lb.animDelay = 6 * 16.67;
                            lb.animTime = Main.nowTime + lb.animDelay;
                        }
                    }

                    break;

                case "bat":

                    // if we have started to fade
                    if ( lb.alpha < 1.0 )
                    {
                        // continue to fade then kill this bat (and it's bubble)
                        lb.alpha -= Main.elapsedTime / 1000;
                        if ( lb.alpha <= 0 )
                        {
                            this.list.splice(i, 1);
                            if ( lb.dragging )
                                lb.dragging.destroy();
                            lb.destroy();
                        }
                        break;
                    }

                    // target hole has been filled or adjacent bubble is gone... 
                    if ( lb.dragging && (this.gridCollide.get( lb.dest ) || !this.playField.adjacentFilled(lb.dest)) )
                    {
                        // pick another destination
                        d = this.playField.pickVisibleSpace();

                        if ( !d )
                        {
                            // we can't find one, fade then kill this bat (and it's bubble)
                            lb.alpha -= Main.elapsedTime / 1000;
                            break;
                        }
                        // we found one, restore the alpha and set the destination
                        lb.alpha = 1.0;
                        lb.dest = d;
                    }

                    // accelerate towards the target location
                    target = this.gridCollide.gridToGameUi( lb.dest );
                    dx = target.x - lb.x;
                    dy = target.y - lb.y - Game.bubbleRadius;
                    d2 = dx * dx + dy * dy;
                    dist = Math.sqrt(d2);
                    lb.vx += 22 * dx / dist;
                    lb.vy += 15 * dy / dist;
                    lb.x += lb.vx * Main.elapsedTime / 1000;
                    lb.y += lb.vy * Main.elapsedTime / 1000;

                    // if flying too near the bottom of the screen...
                    if (lb.y > Game.loseLineY / 2)
                    {
                        // set velocity to upwards
                        lb.vy = Math.min(lb.vy, -30);
                        // pick a new destination
                        lb.dest = this.playField.pickVisibleSpace();
                        if ( lb.dest === null )
                        {
                            // we can't find one, fade then kill this bat (and it's bubble)
                            lb.alpha -= Main.elapsedTime / 1000;
                        }
                    }

                    // drag bubble if attached to one
                    if ( lb.dragging )
                    {
                        lb.dragging.x = lb.x;
                        lb.dragging.y = lb.y + Game.bubbleRadius;
                    }

                    // apply damping to velocity
                    lb.vx *= 0.94;
                    lb.vy *= 0.94;

                    // close enough to touch the target and not dragging or not too fast
                    if ( dist < Game.bubbleRadius && (!lb.dragging || Math.abs(lb.vx) + Math.abs(lb.vy) * 1.6 < 24.0) )
                    {
                        if ( lb.dragging )
                        {
                            // so long as we're not so low that the player will lose...
                            if ( lb.y < Game.loseLineY )
                            {
                                // create bubble copy of lb.dragging in the hole we flew to
                                var b = new Bubble( this.game, this.managers, this.playField, this.gridCollide );
                                b.create( Main.bubbleLayer, lb.dragging.key, lb.dest.x, lb.dest.y );
                                // create bat overlay for the new bubble
                                b.addOverlay( "special_dragon_grab.png" );
                            }
                            // destroy dragged fake bubble
                            lb.dragging.destroy();
                            lb.dragging = null;
                        }

                        lb.alpha -= 0.05;
                        if ( lb.alpha <= 0 )
                        {
                            // destroy the bat
                            this.list.splice(i, 1);
                            lb.destroy();
                        }
                    }

                    break;

                default:

                    // rotate slowly with damping
                    if ( lb.vr !== undefined )
                    {
                        lb.rotation += lb.vr;
                        lb.vr *= 0.98;
                    }

                    // damp x velocity
                    lb.vx *= 0.985;
                    // gravity on y velocity
                    lb.vy += LooseBubbles.GRAVITY;

                    // move the sprite
                    lb.x += lb.vx * Main.elapsedTime / 1000;
                    lb.y += lb.vy * Main.elapsedTime / 1000;

                    // kill it at the bottom
                    if (lb.y > Game.killAtBottom)
                    {
                        this.list.splice(i, 1);
                        lb.destroy();
                    }

                    break;
            }
        }
    }
};


LooseBubbles.prototype.count = function()
{
    if ( !this.list ) return 0;
    return this.list.length;
};


LooseBubbles.prototype.countFairies = function()
{
    var count = 0;
    if ( this.list )
    {
        for(var i = this.list.length - 1; i >= 0; --i)
        {
            var lb = this.list[i];
            if ( lb.lbType == "fairy" ) count++;
        }
    }
    return count;
};


// callback for dragon flame puff, destroys it when return is false
// LooseBubbles.prototype.fireBallLogic = function( _sprite )
// {
//     _sprite.x += _sprite.vx * Main.elapsedTime / 1000;
//     _sprite.y += _sprite.vy * Main.elapsedTime / 1000;
//     if ( Main.nowTime >= _sprite.lifeEnd )
//         return false;
//     return true;
// };
