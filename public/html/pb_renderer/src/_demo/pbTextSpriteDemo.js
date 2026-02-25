/**
 *
 * Simple demo using the sprite system to display text.
 *
 */



// created while the data is loading (preloader)
function pbTextSpriteDemo( docId )
{
	console.log( "pbTextSpriteDemo c'tor entry" );

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	this.spriteImg = pbPhaserRender.loader.loadImage( "font", "../img/fonts/arcadeFonts/16x16/Bubble Memories (Taito).png" );

	console.log( "pbTextSpriteDemo c'tor exit" );
}


pbTextSpriteDemo.prototype.create = function()
{
	console.log("pbTextSpriteDemo.create");

	this.addSprites();
};


pbTextSpriteDemo.prototype.destroy = function()
{
	console.log("pbTextSpriteDemo.destroy");

	this.surface.destroy();
	this.surface = null;

	this.phaserRender.destroy();
	this.phaserRender = null;
};


pbTextSpriteDemo.prototype.restart = function()
{
	console.log("pbTextSpriteDemo.restart");
	
	this.destroy();
	this.create();
};


// order of characters in the source bitmap
var chars = " !\"  &       . 0123456789       ABCDEFGHIJKLMNOPQRSTUVWXYZ      ABCDEFGHIJKLMNOPQRSTUVWXYZ    ";


pbTextSpriteDemo.prototype.addSprites = function()
{
	console.log("pbTextSpriteDemo.addSprites");

	// get the source image, it's NPOT so duplicate it into a larger canvas which is power of two in both dimensions (webgl requirement)
	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	imageData = imageToPowerOfTwo(imageData);
	this.surface = new pbSurface();
	this.surface.create(16, 16, 95, 7, imageData);		// there are 7 rows of 95 characters which are 16x16 pixels each

	this.greenLayer = new layerClass();
	this.greenLayer.create(rootLayer, this.phaserRender, 0, 0, 0, 0, 1, 1);
	rootLayer.addChild(this.greenLayer);

	this.redLayer = new layerClass();
	this.redLayer.create(this.greenLayer, this.phaserRender, 0, 0, 0, 0, 1, 1);
	this.greenLayer.addChild(this.redLayer);

	this.yellowLayer = new layerClass();
	this.yellowLayer.create(this.redLayer, this.phaserRender, 0, 0, 0, 0, 1, 1);
	this.redLayer.addChild(this.yellowLayer);

	var fillScreen = Math.floor(pbPhaserRender.width / 16) * Math.floor(pbPhaserRender.height / 16);

	var i, r, img, spr, x, y;

	// create the green layer
	this.greenLetters = [];
	for(i = 0; i < fillScreen; i++)
	{
		r = Math.floor(Math.random() * chars.length);
		img = new imageClass();
		img.create(this.surface, r, 0.5, 0.5);

		spr = new pbTransformObject();
		x = 8 + (i * 16) % pbPhaserRender.width;
		y = 8 + Math.floor(((i * 16) / pbPhaserRender.width)) * 16;
		spr.create(img, x, y, 1.0, 0, 1.0, 1.0);

		this.greenLayer.addChild(spr);
		this.greenLetters.push(spr);
	}

	// create the red layer
	this.redLetters = [];
	for(i = 0; i < fillScreen; i++)
	{
		r = Math.floor(Math.random() * chars.length);
		img = new imageClass();
		img.create(this.surface, r + 95, 0.5, 0.5);

		spr = new pbTransformObject();
		x = 8 + (i * 16) % pbPhaserRender.width;
		y = 8 + Math.floor(((i * 16) / pbPhaserRender.width)) * 16;
		spr.create(img, x, y, 1.0, 0, 1.0, 1.0);

		this.redLayer.addChild(spr);
		this.redLetters.push(spr);
	}

	// create the yellow layer
	this.yellowLetters = [];
	for(i = 0; i < fillScreen; i++)
	{
		r = Math.floor(Math.random() * chars.length);
		img = new imageClass();
		img.create(this.surface, r + 95 * 2, 0.5, 0.5);

		spr = new pbTransformObject();
		x = 8 + (i * 16) % pbPhaserRender.width;
		y = 8 + Math.floor(((i * 16) / pbPhaserRender.width)) * 16;
		spr.create(img, x, y, 1.0, 0, 1.0, 1.0);

		this.yellowLayer.addChild(spr);
		this.yellowLetters.push(spr);
	}

};


pbTextSpriteDemo.prototype.update = function()
{
	var i, l, spr;
	for(i = 0, l = this.greenLetters.length; i < l; i++)
	{
		spr = this.greenLetters[i];
		spr.y += (spr.x + 100) * 0.01;
		if (spr.y > pbPhaserRender.height + 8)
			spr.y = -8;
	}
	for(i = 0, l = this.redLetters.length; i < l; i++)
	{
		spr = this.redLetters[i];
		spr.y -= (spr.x + 100) * 0.01;
		if (spr.y < -8)
			spr.y = pbPhaserRender.height + 8;
	}
	for(i = 0, l = this.yellowLetters.length; i < l; i++)
	{
		spr = this.yellowLetters[i];
		spr.x -= (spr.y + 100) * 0.01;
		if (spr.x < -8)
			spr.x = pbPhaserRender.width + 8;
	}
};


function imageToPowerOfTwo( _image )
{
	var newImage = new Image(powerOfTwo(_image.width), powerOfTwo(_image.height));
	newImage.drawImage(_image, 0, 0);
	return newImage;
}


function imageToPowerOfTwo(imageData)
{
    if (!isPowerOfTwo(imageData.width) || !isPowerOfTwo(imageData.height))
    {
        // Scale up the texture to the next highest power of two dimensions.
        var canvas = document.createElement("canvas");
        canvas.width = nextHighestPowerOfTwo(imageData.width);
        canvas.height = nextHighestPowerOfTwo(imageData.height);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(imageData, 0, 0, imageData.width, imageData.height);
        imageData = canvas;
    }
    return imageData;
}
