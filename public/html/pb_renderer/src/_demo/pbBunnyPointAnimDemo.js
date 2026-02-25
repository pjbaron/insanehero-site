/**
 *
 * Bunny Mark - using Point based sprite rendering with animation
 *
 */



// created while the data is loading (preloader)
function pbBunnyPointAnimDemo( docId )
{
	console.log( "pbBunnyPointAnimDemo c'tor entry" );

	var _this = this;

	this.fps60 = 0;
	this.numSprites = 0;

	// dat.GUI controlled variables and callbacks
	this.numCtrl = gui.add(this, "numSprites").min(0).max(MAX_SPRITES).step(250).listen();
	this.numCtrl.onFinishChange(function(value) { if (!value) _this.numSprites = 0; _this.restart(); });

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	this.spriteImg = pbPhaserRender.loader.loadImage( "bunny", "../img/bunny_8x32x32.png", 32, 32, 8, 1 );

	console.log( "pbBunnyPointAnimDemo c'tor exit" );
}


pbBunnyPointAnimDemo.prototype.create = function()
{
	console.log("pbBunnyPointAnimDemo.create");

	this.list = [];

	// create a pbSimpleLayer to display the bunnies rapidly with minimum overhead
	this.layer = new pbSimpleLayer();
	this.layer.create(null, this.phaserRender, 0, 0, null);

	// set the pbSimpleLayer to call the GL_POINT style sprite drawing function with animation, and a data preparation function for XY and UV coordinates
	this.layer.setDrawingFunctions( this.layer.prepareXYUV, this.layer.drawPointAnim );

	rootLayer.addChild(this.layer);
};


pbBunnyPointAnimDemo.prototype.destroy = function()
{
	console.log("pbBunnyPointAnimDemo.destroy");

	gui.remove(this.numCtrl);
	this.list = null;

	this.layer.destroy();
	this.layer = null;

	if (this.surface)
		this.surface.destroy();
	this.surface = null;

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;
};


pbBunnyPointAnimDemo.prototype.restart = function()
{
	console.log("pbBunnyPointAnimDemo.restart");
	
	this.destroy();
	this.create();
};


pbBunnyPointAnimDemo.prototype.addSprites = function(num)
{
	// create animation data and set destination for movement
	if (!this.surface)
	{
		var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
		this.surface = new pbSurface();
		this.surface.create(32, 32, 4, 2, imageData);
		this.surface.isNPOT = true;
		
		// tell the layer what surface it will draw from
		this.layer.surface = this.surface;
	}

	for(var i = 0; i < num; i++)
	{
		var img = new imageClass();
		img.create(this.surface, 0, 0.5, 1.0);
		img.isParticle = true;							// use fast batch drawing, object doesn't rotate
		img.cellFrame = Math.floor(Math.random() * 8);	// pick a random picture for this bunny to start on

		var spr = new pbTransformObject();
		spr.create(img, 13, 37, 1.0, 0, 1.0, 1.0);
		this.layer.addChild(spr);

		this.list.push( { sprite:spr, vx:Math.random() * 10, vy:(Math.random() * 10) - 5 });
	}

	this.numSprites = this.list.length;
};


pbBunnyPointAnimDemo.prototype.removeSprites = function(num)
{
	for( var i = 0; i < num; i++ )
	{
		if (this.list.length > 0)
		{
			var obj = this.list[this.list.length - 1];
			obj.sprite.destroy();
		}

		this.list.pop();
	}
	this.numSprites = this.list.length;
};


pbBunnyPointAnimDemo.prototype.update = function()
{
	var i = this.list.length;
	while(i--)
	{
		var obj = this.list[i];
		var spr = obj.sprite;
		spr.x += obj.vx;
		spr.y += obj.vy;
		obj.vy += 0.75;
		if (spr.x < 13)
		{
			spr.x = 13;
			obj.vx = -obj.vx;
		}
		else if (spr.x > pbPhaserRender.width - 13)
		{
			spr.x = pbPhaserRender.width - 13;
			obj.vx = -obj.vx;
		}
		if (spr.y >= pbPhaserRender.height)
		{
			spr.y = pbPhaserRender.height;
			obj.vy *= - 0.85;
			if (Math.random() > 0.5)
			{
				obj.vy -= Math.random() * 6;
			}			
		}
		if (spr.y < 0)
		{
			spr.y = 0;
			obj.vy = 0;
		}
	}

	// rough fps balancing by adjusting the number of sprites, attempts to find the maximum possible at > 57 fps
	if (fps >= 60)
	{
		// don't add more until the fps has been at 60 for one second
		if (this.fps60++ > 60)
			// add more with a gradually increasing amount as the fps stays at 60
	 		this.addSprites(Math.min(this.fps60, 200));
	}
	else
	{
		// fps dropped a little, reset counter
		this.fps60 = 0;

		// if (fps > 0 && fps <= 57 && (pbPhaserRender.frameCount & 15) === 0)
		// {
		//  	// fps is too low, remove sprites... more when the fps is lower
		//   	this.removeSprites((58 - fps) * 16);
		// }
	}
};

