"use strict";


RR.Graphics = function()
{
    // wrapper for BabylonJS graphics engine
    this.scene = null;
    this.engine = null;
    this.camera = null;
    this.advancedTexture = null;
    this.texts = null;
    this.lastBuiltRoom = null;
    this.modelCache = null;
}


RR.Graphics.prototype.create = function()
{
    this.texts = [];

    // generate the BABYLON 3D engine
    this.engine = new BABYLON.Engine(canvas, true);

    // create the scene space
    this.scene = new BABYLON.Scene(this.engine);

    // add a camera to the scene and attach it to the canvas
    this.camera = new BABYLON.ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, new BABYLON.Vector3(0,0,5), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.fov = 0.7;

    // add lights to the scene
    var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), this.scene);
    var light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 1, -1), this.scene);

    // create a model cache to speed up room display and revisiting
    this.modelCache = new RR.ModelCache();
    this.modelCache.create();

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        this.engine.resize();
    }.bind(this), );
}


RR.Graphics.prototype.destroy = function()
{
    if (this.advancedTexture) this.advancedTexture.dispose();
    this.advancedTexture = null;
    if (this.scene) this.scene.dispose();
    this.scene = null;
    if (this.engine) this.engine.dispose();
    this.engine = null;
    this.camera = null;
    if (this.texts)
    {
        for(var i = 0, l = this.texts.length; i < l; i++)
            this.texts[i].dispose();
    }
    this.texts = null;

    if (this.modelCache) this.modelCache.destroy();
    this.modelCache = null;
}


RR.Graphics.prototype.update = function()
{
    if (this.scene && this.engine)
    {
        this.scene.render();
    }
}


RR.Graphics.prototype.clearColour = function( _clearColour )
{
    this.scene.clearColor = new BABYLON.Color3( _clearColour.r, _clearColour.g, _clearColour.b );
}


RR.Graphics.prototype.addText = function( _message, _colour, _size )
{
    // GUI
    if (this.advancedTexture == null)
    {
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    }

    var text = new BABYLON.GUI.TextBlock();
    text.text = _message;
    text.color = _colour;
    text.fontSize = _size;
    this.advancedTexture.addControl(text);

    this.texts.push(text);
    return text;
}


RR.Graphics.prototype.removeText = function( _text )
{
    this.advancedTexture.removeControl(_text);
}



/// _container: the starting room
/// expand out from the starting room no further than _maxConnections away
/// build all the rooms we find
// TODO: clean up, this should not be in Graphics!
RR.Graphics.prototype.build = function( _container, _maxConnections )
{
    // don't bother if we're still in the same room
    if (this.lastBuiltRoom == _container)
    {
        return;
    }

    var linked = _container.expandLinks(_maxConnections);
    //console.log("Graphics.build from " + _container.key + " " + _maxConnections + " rooms deep");

    for(var name in linked)
    {
        var room = linked[name];
        var plan = room.properties;
        if (plan && plan.type == ContainerType.room)
        {
            var model = this.modelCache.checkBuffer(name);
            if (!model)
            {
                model = RR.BuildFromPlan.buildRoom(name, room);
                this.modelCache.addToBuffer(name, model);
            }

            // TODO: setLocation builds clip data for the new room and the one it connected to... which should be separate from setting the model location
            var position = RR.BuildFromPlan.setLocation(room);
            if (position)
            {
                model.position = position;
            }
        }

    }

    this.lastBuiltRoom = _container;
}


RR.Graphics.prototype.drawPlayer = function( _player )
{
    // find the location of the player's current room
    var playerRoom = this.modelCache.checkBuffer( _player.properties.location );
    var position = playerRoom.position;
    if (!_player.graphics)
    {
        _player.graphics = BABYLON.MeshBuilder.CreateSphere("player", {diameter: 1}, this.scene);
    }
    _player.graphics.position.x = position.x;
    _player.graphics.position.y = position.y;
    _player.graphics.position.z = position.z;
}
