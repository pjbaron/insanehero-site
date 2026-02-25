"use strict";


function Game()
{
    this.everything = null;
	this.world = null;
	this.population = null;
    this.player = null;
    this.graphics = null;
}


Game.prototype.create = function( _graphics )
{
    this.graphics = _graphics;

    this.everything = new Container("everything");
    this.everything.create("everything", null);

	this.world = new World();
	this.world.create(this.everything, 4096);

    this.population = new Population();
    this.population.create( this.everything );
    this.player = Population.get("player");

    //this.graphics.clearColour({ r:0.1, g:0.1, b:0.1 });

    var room = Container.find(this.player.properties.location);
    if (room)
        this.graphics.build(room, 4);
    else
        console.warn("ERROR: cannot find the room '" + roomName + "'");

};


Game.prototype.destroy = function()
{
    this.graphics = null;

	if (this.population)
	{
		this.population.destroy();
		this.population = null;
	}

	if (this.world)
	{
		this.world.destroy();
		this.world = null;
	}
};


Game.prototype.update = function()
{
	if (!this.world.update())
		return false;
	if (!this.population.update())
		return false;

    // rebuild/extend the 'visible' world as the player moves through it
    var room = Container.find(this.player.properties.location);
    if (room)
        this.graphics.build(room, 4);
    else
        console.warn("ERROR: cannot find the room '" + roomName + "'");

    // TODO: draw player temporary hack, use an Entity system to handle appearance, possessions, etc
    this.graphics.drawPlayer(this.player);

	return true;
};

