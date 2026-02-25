/**
 *
 * Creature Assist - help Phaser 3 users find ideal values for the various parameters to run a Creature animation
 *
 */



// created while the data is loading (preloader)
function pbCreatureAssist( docId )
{
	console.log( "pbCreatureAssist c'tor entry" );

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( 'webgl', this.create, this.update, this );
	// font for User Interface
	pbPhaserRender.loader.loadImage( "font", "../img/fonts/arcadeFonts/8x8/Battle Bakraid (Eighting).png", 8, 8, 95, 5 );

	// TODO: change these values for your Creature

	// the shader we'll use to draw the Creature (usually "stripShaderSources.json")
	this.creatureShaderJSON = pbPhaserRender.loader.loadFile( "../json/stripShaderSources.json" );
	// the creature animation data in a .zip file (just zip the .json data output by the Creature editor)
//	this.creatureDataZip = pbPhaserRender.loader.loadFile( "../img/creatures/utah.CreaExport/character_data.zip", "arraybuffer" );
	this.creatureDataZip = pbPhaserRender.loader.loadFile( "../img/creatures/coel.CreaExport/character_data.zip", "arraybuffer" );
	// the creature source image (usually a 32 bit .png file)
//	pbPhaserRender.loader.loadImage( "creature", "../img/creatures/utah.CreaExport/character_img.png" );
	pbPhaserRender.loader.loadImage( "creature", "../img/creatures/coel.CreaExport/character_img.png" );

	// size of the destination texture
//    this.dstWidth = 256;
    this.dstWidth = 512;
//    this.dstHeight = 128;
    this.dstHeight = 256;
}


pbCreatureAssist.prototype.create = function()
{
	console.log("pbCreatureAssist.create");

	// get the shader program into the shaders system
	var jsonString = pbPhaserRender.loader.getFile( this.creatureShaderJSON ).responseText;
	this.creatureShaderProgram = pbPhaserRender.renderer.graphics.shaders.addJSON( jsonString );

    // get the source texture using 'key'
    this.dinoTexture = textures.getFirst("creature");

	// unzip the compressed data file and create the animation JSON data structures
	var zip = new JSZip( pbPhaserRender.loader.getFile( this.creatureDataZip ).response );
	var creatureJSON = zip.file("character_data.json").asText();
	var creatureData = JSON.parse(creatureJSON);

	// make a creature handler
	this.creatures = new pbCreatureHandler(this.phaserRender, this.creatureShaderProgram);

	// initial values for the creature transform
	this.scale = 0.25;
	this.scaleChange = 0.0;
	this.xpos = 0.0;
	this.xposChange = 0.0;
	this.ypos = 0.0;
	this.yposChange = 0.0;
	this.rot = 0.0;
	this.rotChange = 0.0;

	// create a transform to be applied when drawing a creature to the render-to-texture on the GPU
	// this controls the offset, rotation and size of the creature's raw sprite source
	// it starts off with no offset, rotation and a scale of 1.0
    this.typeTransform = pbMatrix3.makeTransform(this.xpos, this.ypos, this.rot, this.scale, this.scale);

    // add the creature type to the creature handler, using it's name for future reference
	this.creatures.create("creatureType", creatureData, this.dinoTexture, 1, 3, this.dstWidth, this.dstHeight, this.typeTransform, 1.0 );

	// add an instance of the creature to the creature handler
	this.creatures.add(
			"creatureType",				// the type name used in Create
			pbPhaserRender.width * 0.5, 	// x
			pbPhaserRender.height * 0.5,	// y
			0, 							// rotation
			1.0,						// scale
			0.0							// speed
		);


	// 
	// graphics system stuff...
	// 

	// set up the renderer postUpdate callback to draw the camera sprite using the render-to-texture surface on the GPU
    pbPhaserRender.renderer.postUpdate = this.postUpdate;

	// add a top layer for ui text messages
	this.uiLayer = new layerClass();
	// _parent, _renderer, _x, _y, _z, _angleInRadians, _scaleX, _scaleY
	this.uiLayer.create(rootLayer, this.phaserRender, 0, 0, 0, 0, 1, 1);
	rootLayer.addChild(this.uiLayer);

	// prepare the text strings
	this.text = new pbText();
	this.text.create("font", this.uiLayer, " ".charCodeAt(0), 95 * 1);

	// data display
	this.x_text = this.text.addLine("x position: 0.0", 10, 10, 8);
	this.y_text = this.text.addLine("y position: 0.0", 10, 20, 8);
	this.r_text = this.text.addLine("rotation: 0.0", 10, 30, 8);
	this.s_text = this.text.addLine("scale: 1.0", 10, 40, 8);
	this.w_text = this.text.addLine("width: 0.0", 10, 60, 8);
	this.h_text = this.text.addLine("height: 0.0", 10, 70, 8);

	// controls
	this.buttons = new pbButtons();
	this.buttons.create(document.body);

	this.help1 = this.text.addLine("< x pos >", 400, 10, 8);
	this.buttons.add("x_less", new pbRectangle(395, 5, 10, 10), this.pressButton, this);
	this.buttons.add("x_more", new pbRectangle(455, 5, 10, 10), this.pressButton, this);

	this.help2 = this.text.addLine("< y pos >", 400, 20, 8);
	this.buttons.add("y_less", new pbRectangle(395, 15, 10, 10), this.pressButton, this);
	this.buttons.add("y_more", new pbRectangle(455, 15, 10, 10), this.pressButton, this);

	this.help3 = this.text.addLine("<  rot  >", 400, 30, 8);
	this.buttons.add("rot_less", new pbRectangle(395, 25, 10, 10), this.pressButton, this);
	this.buttons.add("rot_more", new pbRectangle(455, 25, 10, 10), this.pressButton, this);

	this.help4 = this.text.addLine("< scale >", 400, 40, 8);
	this.buttons.add("scale_less", new pbRectangle(395, 35, 10, 10), this.pressButton, this);
	this.buttons.add("scale_more", new pbRectangle(455, 35, 10, 10), this.pressButton, this);
};


pbCreatureAssist.prototype.pressButton = function(_down, _key)
{
	console.log("pressButton", _key, (_down ? "down":"up"));
	if (_down)
	{
		if (_key == "x_less") this.xposChange = -0.01;
		if (_key == "x_more") this.xposChange = 0.01;
		if (_key == "y_less") this.yposChange = -0.01;
		if (_key == "y_more") this.yposChange = 0.01;
		if (_key == "rot_less") this.rotChange = -0.01;
		if (_key == "rot_more") this.rotChange = 0.01;
		if (_key == "scale_less") this.scaleChange = -0.001;
		if (_key == "scale_more") this.scaleChange = 0.001;
	}
	else
	{
		if (_key == "x_less") this.xposChange = 0.0;
		if (_key == "x_more") this.xposChange = 0.0;
		if (_key == "y_less") this.yposChange = 0.0;
		if (_key == "y_more") this.yposChange = 0.0;
		if (_key == "rot_less") this.rotChange = 0.0;
		if (_key == "rot_more") this.rotChange = 0.0;
		if (_key == "scale_less") this.scaleChange = 0.0;
		if (_key == "scale_more") this.scaleChange = 0.0;
	}
};


pbCreatureAssist.prototype.destroy = function()
{
	console.log("pbCreatureAssist.destroy");

	if (this.creatures)
		this.creatures.destroy();
	this.creatures = null;

	this.dinoTexture = null;
	this.creatureShaderProgram = null;
	if (this.text)
		this.text.destroy();
	this.text = null;
	if (this.uiLayer)
		this.uiLayer.destroy();
	uiLayer = null;

	if (this.buttons)
		this.buttons.destroy();
	this.buttons = null;

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;
	this.rttTexture = null;
	this.rttRenderbuffer = null;
	this.rttFramebuffer = null;
};


pbCreatureAssist.prototype.restart = function()
{
	console.log("pbCreatureAssist.restart");
	
	this.destroy();
	this.create();
};


pbCreatureAssist.prototype.update = function()
{
	// user input adjusts the drawing transform
	if (this.xposChange || this.yposChange || this.rotChange || this.scaleChange)
	{
		// apply the changes
		this.xpos += this.xposChange;
		this.ypos += this.yposChange;
		this.rot += this.rotChange;
		if (this.scaleChange > 0 || this.scale > 0.001)
			this.scale += this.scaleChange;

		// create the new transform
	    this.typeTransform = pbMatrix3.makeTransform(this.xpos, this.ypos, this.rot, this.scale, this.scale);
	    this.creatures.adjust("creatureType", this.typeTransform);

	    // update the UI display
		this.text.changeLine(this.x_text, "x position: " + this.xpos.toFixed(3));
		this.text.changeLine(this.y_text, "y position: " + this.ypos.toFixed(3));
		this.text.changeLine(this.r_text, "rotation: " + this.rot.toFixed(3));
		this.text.changeLine(this.s_text, "scale: " + this.scale.toFixed(3));
		this.text.changeLine(this.w_text, "width: " + this.dstWidth);
		this.text.changeLine(this.h_text, "height: " + this.dstHeight);
	}

	// update the creatures and render them to GPU textures
	var e = this.phaserRender.rootTimer.elapsedTime;
	this.creatures.update(e / 1000 * 2.0);

	// render to the display from now on (pbRenderer.update: rootLayer.update)
	// without this all other sprites in the scene will render to the last bound texture
	// TODO: this should be parameterised in pbRenderer and set before the rootLayer.update call
	pbWebGlTextures.cancelFramebuffer();
};


/**
 * postUpdate - called after pbRenderer does rootLayer.update
 * display all of the creature sprite images by rendering to the display from their render-to-textures on the GPU
 *
 * @return {[type]} [description]
 */
pbCreatureAssist.prototype.postUpdate = function()
{
	// get all the creature instances
	var list = this.creatures.getAll();

	// we're only showing one...
	var o = list[0];

	// draw the creature sprite
	var transform = pbMatrix3.makeTransform(o.x, o.y, o.r, o.scale, o.scale);
	pbPhaserRender.renderer.graphics.drawTextureWithTransform( o.type.dstTexture, transform, 1.0 );

   	// debug box
//   	var wide = o.type.renderer.width * this.dstWidth * this.scale;
//   	var high = o.type.renderer.height * this.dstHeight * this.scale;
//		pbPhaserRender.renderer.graphics.drawRect(o.x + o.type.renderer.left, o.y + o.type.renderer.bottom - high, wide, high, {r:0xff, g:0xff, b:0xff, a:0xff});

	// outline of texture box
	pbPhaserRender.renderer.graphics.drawRect(pbPhaserRender.width * 0.5 - this.dstWidth * 0.5, pbPhaserRender.height * 0.5 - this.dstHeight * 0.5, this.dstWidth, this.dstHeight, {r:0xff, g:0xff, b:0xff, a:0xff});
};

