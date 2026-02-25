/**
 *
 * "Creature" animation system demo showing a flock of dinosaurs.
 * 
 * This example shows how to use the pbCreatureHandler class to simplify the creation and management
 * of multiple types and instances of each Creature.
 * Each "type" is rendered to a texture once per frame.
 * Each "instance" is a separate sprite object that uses the render-to-texture of a "type".
 * This allows us to have dozens of instances of two dino types with very low CPU/GPU requirements.
 * 
 *
 * Utah Raptor original image
 * from: https://commons.wikimedia.org/wiki/Category:Utahraptor#/media/File:Utahraptor_updated.png
 * by: https://commons.wikimedia.org/wiki/User:Ferahgo_the_Assassin  e.deinonychus@gmail.com
 * license: http://creativecommons.org/licenses/by-sa/3.0/  via Wikimedia Commons
 * The original image has been sliced and is warped by the Creature software for animation display.
 *
 * Field background
 * By Fritz Geller-Grimm and Felix Grimm (Own work)
 * [CC BY-SA 2.5 (http://creativecommons.org/licenses/by-sa/2.5) or CC BY-SA 2.5 (http://creativecommons.org/licenses/by-sa/2.5)]
 * via Wikimedia Commons
 *
 * Coel Raptor
 * by: Aline Ghilardi
 * from: www.colecionadoresdeossos.com
 * 
 */



// created while the data is loading (preloader)
function pbCreatureFlockDemo( docId )
{
	console.log( "pbCreatureFlockDemo c'tor entry" );

	this.jsonData = null;
	this.creatures = null;

	this.rttTexture = null;
	this.rttFramebuffer = null;
	this.rttRenderbuffer = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	this.stripShaderJSON = pbPhaserRender.loader.loadFile( "../json/stripShaderSources.json" );
	this.dinoZip = pbPhaserRender.loader.loadFile( "../img/creatures/utah.CreaExport/character_data.zip", "arraybuffer" );
	pbPhaserRender.loader.loadImage( "dino", "../img/creatures/utah.CreaExport/character_img.png" );
	this.dino2Zip = pbPhaserRender.loader.loadFile( "../img/creatures/coel.CreaExport/character_data.zip", "arraybuffer" );
	pbPhaserRender.loader.loadImage( "dino2", "../img/creatures/coel.CreaExport/character_img.png" );

	pbPhaserRender.loader.loadImage( "field", "../img/Le_Caylar_fg08.png" );
	pbPhaserRender.loader.loadImage( "font", "../img/fonts/arcadeFonts/8x8/ArkArea (UPL).png", 8, 8, 95, 5 );

	console.log( "pbCreatureFlockDemo c'tor exit" );
}


pbCreatureFlockDemo.prototype.create = function()
{
	console.log("pbCreatureFlockDemo.create");

	// get the shader program
	var jsonString = pbPhaserRender.loader.getFile( this.stripShaderJSON ).responseText;
	this.stripShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

	// background
	if (textures.exists("field"))
	{
		this.bg = new pbSprite();
		this.bg.createWithKey(0, 0, "field", rootLayer);
		this.bg.fullScreen = true;
		this.bg.tiling = false;
	}

    // get the source textures from the textures dictionary using 'key'
    this.dinoTexture = textures.getFirst("dino");
    this.dino2Texture = textures.getFirst("dino2");

	// unzip the compressed data files and create the animation JSON data structures

	// utah raptor
	var zip = new JSZip( pbPhaserRender.loader.getFile( this.dinoZip ).response );
	var dinoJSON = zip.file("character_data.json").asText();
	var dinoData = JSON.parse(dinoJSON);

	// coel
	zip = new JSZip( pbPhaserRender.loader.getFile( this.dino2Zip ).response );
	var dino2JSON = zip.file("character_data.json").asText();
	var dino2Data = JSON.parse(dino2JSON);

	this.creatures = new pbCreatureHandler(this.phaserRender, this.stripShaderProgram);

    // add the big dino type (numbers obtained from creatureAssist utility)
	// create a transform to be applied when drawing each creature to it's render-to-texture on the GPU
	// this controls the offset, rotation and size of the creature's raw sprite source
    var transform = pbMatrix3.makeTransform(-0.34, 0.63, 0.0, -0.048, 0.048);
	this.creatures.create("big_dino", dino2Data, this.dino2Texture, 1, 2, 512, 256, transform, 1.0 );

	// add the small dino type (numbers obtained from creatureAssist utility)
    transform = pbMatrix3.makeTransform(-0.73, 0.85, 0.0, 0.013, 0.013);
	this.creatures.create("little_dino", dinoData, this.dinoTexture, 3, 4, 256, 128, transform, 2.0 );

	// make the flock
	this.makeFlock(30);

	// set up the renderer postUpdate callback to draw the camera sprite using the render-to-texture surface on the GPU
    pbPhaserRender.renderer.postUpdate = this.postUpdate;

	// add a top layer for ui text messages
	this.uiLayer = new layerClass();
	// _parent, _renderer, _x, _y, _z, _angleInRadians, _scaleX, _scaleY
	this.uiLayer.create(rootLayer, this.phaserRender, 0, 0, 0, 0, 1, 1);
	rootLayer.addChild(this.uiLayer);

	// prepare the CC notices for raptors and background images
	this.text = new pbText();
	this.text.create("font", this.uiLayer, " ".charCodeAt(0), 95 * 1);
	this.coel = this.text.addLine("Coel: by Aline Ghilardi www.colecionadoresdeossos.com", 10, 10, 8);
	this.utahRaptor = this.text.addLine("Utah Raptor: by Ferahgo_the_Assassin CC BY-SA 3.0 www.wikimedia.org", 10, 22, 8);
	this.fieldBackground = this.text.addLine("Background: by Fritz Geller-Grimm and Felix Grimm CC BY-SA 2.5 www.wikimedia.org", 10, 34, 8);
};


pbCreatureFlockDemo.prototype.destroy = function()
{
	console.log("pbCreatureFlockDemo.destroy");

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


pbCreatureFlockDemo.prototype.makeFlock = function(_flockSize)
{
	var name, speed;
	for(var i = 0; i < _flockSize; i++)
	{
		// make more small ones than big ones
		if (Math.random() < 0.8)
		{
			name = "little_dino";
			speed = 7.0;
			size = 1.0;
		}
		else
		{
			name = "big_dino";
			speed = 4.0;
			size = 1.0;
		}

		// handy scaling factor to create a fake depth illusion with perspective
		var pcent = i / (_flockSize - 1);
		this.creatures.add(
				name,
				pbPhaserRender.width + 350 + Math.random() * 800, // x
				pbPhaserRender.height * 0.30 + pbPhaserRender.height * 0.40 * pcent,  // y
				0, // rotation
				(Math.random() * 0.15 + 0.20 + 0.65 * pcent) * size, // scale
				Math.random() * 4.0 + 4.0 * pcent + speed  // speed
			);
	}
};


pbCreatureFlockDemo.prototype.update = function()
{
	// update the creatures and render them to GPU textures
	var e = this.phaserRender.rootTimer.elapsedTime;
	this.creatures.update(e / 1000 * 2.0);
};


/**
 * postUpdate - called after pbRenderer does rootLayer.update
 * display all of the creature sprite images by rendering to the display from their render-to-textures on the GPU
 *
 * @return {[type]} [description]
 */
pbCreatureFlockDemo.prototype.postUpdate = function()
{
	// get all the creature instances
	var list = this.creatures.getAll();

	// sort them into descending y coordinates to preserve depth illusion
	list.sort(function(first, second) {
					return ((first.y + first.type.dstTexture.height * first.scale) - (second.y + second.type.dstTexture.height * second.scale));
				});

	// draw them from their GPU texture sources to the display
	for(var i = 0, l = list.length; i < l; i++)
	{
		var o = list[i];
		// draw the creature sprite
		var transform = pbMatrix3.makeTransform(o.x, o.y, o.r, o.scale, o.scale);
		pbPhaserRender.renderer.graphics.drawTextureWithTransform( o.type.dstTexture, transform, 1.0, { x:0.5, y:1.0 } );

	   	// debug texture area boxes
	   	// var wide = o.type.dstTexture.width * o.scale;
	   	// var high = o.type.dstTexture.height * o.scale;
    	// pbPhaserRender.renderer.graphics.drawRect(o.x - wide * 0.5, o.y + high * 1.0, wide, -high, {r:0xff, g:0xff, b:0xff, a:0xff});

		o.x -= o.speed;
		if (o.x < -300) o.x = pbPhaserRender.width + 350 + Math.random() * 100;
	}
};

