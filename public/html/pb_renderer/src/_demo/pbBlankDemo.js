/**
 *
 * Empty demo file, loads a texture and sets up the renderer...
 *
 */



// created while the data is loading (preloader)
function pbBlankDemo( docId )
{
	console.log( "pbBlankDemo c'tor entry" );

	var _this = this;

	this.docId = docId;

	// create loader with callback when all items have finished loading
	this.loader = new pbLoader( this.allLoaded, this );
	pbPhaserRender.loader.loadImage( "ball", "../img/sphere3.png" );

	console.log( "pbBlankDemo c'tor exit" );
}


pbBlankDemo.prototype.allLoaded = function()
{
	console.log( "pbBlankDemo.allLoaded" );

	this.phaserRender = new pbRenderer( useRenderer, this.docId, this.create, this.update, this );
};


pbBlankDemo.prototype.create = function()
{
	console.log("pbBlankDemo.create");

	this.addSprites();
};


pbBlankDemo.prototype.destroy = function()
{
	console.log("pbBlankDemo.destroy");

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;
};


pbBlankDemo.prototype.restart = function()
{
	console.log("pbBlankDemo.restart");
	
	this.destroy();
	this.create();
};


pbBlankDemo.prototype.addSprites = function()
{
	console.log("pbBlankDemo.addSprites");

	// add a single 'ball' sprite to the rootLayer
	this.spr = new pbSprite();
	this.spr.createWithKey(200, 200, "ball", rootLayer);
};


pbBlankDemo.prototype.update = function()
{
};

