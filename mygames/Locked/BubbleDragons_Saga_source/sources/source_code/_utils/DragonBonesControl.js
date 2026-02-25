/**
 * DragonBonesControl.js
 *
 * Pete Baron 2017
 *
 * Class to provide easy access to DragonBones animations inside my JS game shells.
 * 
 * 
 *
 * DragonBones instructions:
 * 
 * How to use
 * 1. Load data.
 *
 * 2. Parse data.
 *    factory.parseDragonBonesData();
 *    factory.parseTextureAtlasData();
 *
 * 3. Build armature.
 *    armatureDisplay = factory.buildArmatureDisplay("armatureName");
 *
 * 4. Play animation.
 *    armatureDisplay.animation.play("animationName");
 *
 * 5. Add armature to stage.
 *    addChild(armatureDisplay);
 */


DragonBonesControl = function( _game )
{
    this.game = _game;
    this.armatures = null;
};


DragonBonesControl.prototype.create = function( _world, _managers )
{
    this.world = _world;
    this.managers = _managers;
    this.factory = dragonBones.PixiFactory.factory;
    this.armatures = [];
};


DragonBonesControl.prototype.destroy = function()
{
    if (this.armatures)
    {
        for(var i = 0, l = this.armatures.length; i < l; i++)
        {
            this.armatures[i].destroy();
            this.armatures[i] = null;
        }
        this.armatures = null;
    }

    this.factory = null;
    this.managers = null;
    this.world = null;
};


DragonBonesControl.prototype.addFactory = function( _imageKey, _dataKey, _skeletonKey )
{
    this.factory.parseDragonBonesData(this.managers.data.get(_skeletonKey));
    this.factory.parseTextureAtlasData(this.managers.data.get(_dataKey), this.managers.textures.get(_imageKey));
};


DragonBonesControl.prototype.add = function( _x, _y, _animationKey, _characterKey )
{
    var armatureDisplay = this.factory.buildArmatureDisplay(_characterKey);
    armatureDisplay.animation.play(_animationKey);
    Main.app.stage.addChild(armatureDisplay);

    armatureDisplay.x = _x;
    armatureDisplay.y = _y;

    this.armatures.push(armatureDisplay);
};


DragonBonesControl.prototype.update = function()
{
    dragonBones.WorldClock.clock.advanceTime(Main.elapsedTime / 1000);
};

