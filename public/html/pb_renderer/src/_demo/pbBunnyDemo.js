/**
 *
 * Bunny Mark - takes direct control of the rendering process for maximum speed
 *
 * TODO: optimise the pbTransformObject, pbImage and pbWebGlLayer code to close the distance between this and pbBunnyDemoNPOT
 * 
 */



// created while the data is loading (preloader)
function pbBunnyDemo( docId )
{
	console.log( "pbBunnyDemo c'tor entry" );

	var _this = this;

	this.fps60 = 0;
	this.numSprites = 0;

	// dat.GUI controlled variables and callbacks
	this.numCtrl = gui.add(this, "numSprites").min(0).max(MAX_SPRITES).step(250).listen();
	this.numCtrl.onFinishChange(function(value) { if (!value) _this.numSprites = 0; _this.restart(); });

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	this.spriteImg = pbPhaserRender.loader.loadImage( "bunny", "../img/bunny_pot.png" );

	console.log( "pbBunnyDemo c'tor exit" );
}


pbBunnyDemo.prototype.create = function()
{
	console.log("pbBunnyDemo.create");

	this.list = [];
	this.addSprites(100);
};


pbBunnyDemo.prototype.destroy = function()
{
	console.log("pbBunnyDemo.destroy");

	gui.remove(this.numCtrl);
	
	this.list = null;

	this.surface.destroy();
	this.surface = null;

	this.phaserRender.destroy();
	this.phaserRender = null;

};


pbBunnyDemo.prototype.restart = function()
{
	console.log("pbBunnyDemo.restart");
	
	this.destroy();
	this.create();
};


pbBunnyDemo.prototype.addSprites = function(num)
{
	// create animation data and set destination for movement
	if (!this.surface)
	{
		var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
		this.surface = new pbSurface();
		this.surface.create(0, 0, 1, 1, imageData);
		// set the texture register number where the surface will be kept on the GPU
		this.textureNumber = 0;
	}

	for(var i = 0; i < num; i++)
	{
		this.list.push( { x:13, y:37, vx:Math.random() * 10, vy:(Math.random() * 10) - 5 });
	}

	this.numSprites = this.list.length;
};


pbBunnyDemo.prototype.removeSprites = function(num)
{
	for( var i = 0; i < num; i++ )
	{
		this.list.pop();
	}
	this.numSprites = this.list.length;
};


pbBunnyDemo.prototype.update = function()
{
	for(var i = 0, l = this.list.length; i < l; i++)
	{
		var obj = this.list[i];
		obj.x += obj.vx;
		obj.y += obj.vy;
		obj.vy += 0.75;
		if (obj.x < 13)
		{
			obj.x = 13;
			obj.vx = -obj.vx;
		}
		else if (obj.x > pbPhaserRender.width - 13)
		{
			obj.x = pbPhaserRender.width - 13;
			obj.vx = -obj.vx;
		}
		if (obj.y >= pbPhaserRender.height)
		{
			obj.y = pbPhaserRender.height;
			obj.vy *= - 0.85;
			if (Math.random() > 0.5)
			{
				obj.vy -= Math.random() * 6;
			}			
		}
		if (obj.y < 0)
		{
			obj.y = 0;
			obj.vy = 0;
		}
	}

	if (this.list.length > 0)
		pbPhaserRender.renderer.graphics.blitListDirect( this.list, this.list.length, this.surface, this.textureNumber );

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
	}

	// don't remove bunnies, we need to see if the GC is hitting
	// if (fps > 0 && fps <= 57 && (pbPhaserRender.frameCount & 15) === 0)
	// {
	// 	// fps is too low, remove sprites... go faster if the fps is lower
	//  	this.removeSprites((58 - fps) * 16);
	// }
};

