/**
 *
 * "Creature" animation system demo
 *
 * Based in part on PixiJs-Demo.html and CreaturePixiJSRenderer.js from the Creatures GitHub repository.
 * This example does not use the pbCreatureHandler and shows how to access all of the lower level
 * CreaturePhaser3JSRenderer functions directly.
 * 
 * Utah Raptor original image
 * from: https://commons.wikimedia.org/wiki/Category:Utahraptor#/media/File:Utahraptor_updated.png
 * by: https://commons.wikimedia.org/wiki/User:Ferahgo_the_Assassin  e.deinonychus@gmail.com
 * license: http://creativecommons.org/licenses/by-sa/3.0/
 * The original image has been sliced and is warped by the Creature software for animation display.
 * 
 */



// created while the data is loading (preloader)
function pbCreatureDemo( docId )
{
	console.log( "pbCreatureDemo c'tor entry" );

	this.jsonData = null;
	this.new_manager = null;
	this.new_creature_renderer = null;

	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	this.stripShaderJSON = pbPhaserRender.loader.loadFile( "../json/stripShaderSources.json" );
	this.dinoZip = pbPhaserRender.loader.loadFile( "../img/creatures/utah.CreaExport/character_data.zip", "arraybuffer" );
	pbPhaserRender.loader.loadImage( "dino", "../img/creatures/utah.CreaExport/character_img.png" );

	console.log( "pbCreatureDemo c'tor exit" );
}


pbCreatureDemo.prototype.create = function()
{
	console.log("pbCreatureDemo.create");

	// allocate the GPU texture registers
	this.creatureTextureNumber = 1;		// source texture for dino skin
	this.rttTextureNumber = 2;			// render-to-texture is source for the sprites

	// get the shader program
	var jsonString = pbPhaserRender.loader.getFile( this.stripShaderJSON ).responseText;
	this.stripShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

	// unzip the compressed data file and create the animation JSON data structure
	var zip = new JSZip( pbPhaserRender.loader.getFile( this.dinoZip ).response );
	var dinoJSON = zip.file("character_data.json").asText();
	var actual_JSON = JSON.parse(dinoJSON);

    // get the source texture from the textures dictionary using 'key'
    this.textureObject = textures.getFirst("dino");

	// make the creature from the json data and texture
	this.makeCreature(actual_JSON, this.textureObject);

	// create the render-to-texture, depth buffer, and a frame buffer to hold them
	this.rttTexture = pbWebGlTextures.initTexture(this.rttTextureNumber, pbPhaserRender.width, pbPhaserRender.height);
	this.rttFramebuffer = pbWebGlTextures.useFramebufferRenderbuffer(this.rttTexture);

	// set up the renderer postUpdate callback to draw the camera sprite using the render-to-texture surface on the GPU
    pbPhaserRender.renderer.postUpdate = this.postUpdate;
};


pbCreatureDemo.prototype.destroy = function()
{
	console.log("pbCreatureDemo.destroy");

	this.new_manager = null;
	this.new_creature_renderer = null;
	this.textureObject = null;

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;

	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;
};


pbCreatureDemo.prototype.makeCreature = function(json, texture)
{
	// create the creature
	var new_creature = new Creature(json, texture);

	// create an animation object for it
	var new_animation_1 = new CreatureAnimation(json, "default", new_creature);
	
	// create a creature manager for it
	this.new_manager = new CreatureManager(new_creature);

	// add the animation to the manager
	this.new_manager.AddAnimation(new_animation_1);
	//this.new_manager.AddAnimation(new_animation_2);

	// prepare the manager settings
	this.new_manager.SetActiveAnimationName("default", false);
	this.new_manager.SetShouldLoop(true);
	this.new_manager.SetIsPlaying(true);
	this.new_manager.RunAtTime(0);

	// prepare a cache of points to speed up the playback
	// WARNING: slow - 4 seconds for one animation of the Utah Raptor
	//this.new_manager.MakePointCache("default");

	// create the creature renderer using the manager and the texture
	this.new_creature_renderer = new CreatureRenderer(this.new_manager, texture.imageData);
};


pbCreatureDemo.prototype.update = function()
{
	// update the creature manager for a given time interval
	this.new_manager.Update(0.04);

	// recalculate this creature's point data
	this.new_creature_renderer.UpdateData();

	// draw the creature with webgl, the draw destination will be pbPhaserRender.renderer.useFramebuffer (rttTexture)
    var transform = pbMatrix3.makeTransform(-0.15, 0.0, 0.0, 0.04, 0.04);
	this.new_creature_renderer.DrawCreature(transform, pbPhaserRender.renderer.graphics, this.stripShaderProgram, this.creatureTextureNumber);
};


pbCreatureDemo.prototype.postUpdate = function()
{
	// don't render to texture any more, render to the display instead
	pbWebGlTextures.cancelFramebuffer();

	// draw the creature texture from rttTexture to the display
	this.transform = pbMatrix3.makeTransform(pbPhaserRender.width * 0.5, pbPhaserRender.height * 0.5, 0.0, 1.0, 1.0);
	pbPhaserRender.renderer.graphics.drawTextureWithTransform( this.rttTexture, this.transform, 1.0 );
};

