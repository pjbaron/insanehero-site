/**
 *
 * Empty demo file, loads a texture and sets up the renderer...
 *
 */



// created while the data is loading (preloader)
function pbGraphicsDemo( docId )
{
	console.log( "pbGraphicsDemo c'tor entry" );

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );

	console.log( "pbGraphicsDemo c'tor exit" );
}


pbGraphicsDemo.prototype.create = function()
{
	console.log("pbGraphicsDemo.create");

};


pbGraphicsDemo.prototype.destroy = function()
{
	console.log("pbGraphicsDemo.destroy");

	if (this.phaserRender)
		this.phaserRender.destroy();
	this.phaserRender = null;
};


pbGraphicsDemo.prototype.restart = function()
{
	console.log("pbGraphicsDemo.restart");
	
	this.destroy();
	this.create();
};


pbGraphicsDemo.prototype.update = function()
{
   	// debug box
   	pbPhaserRender.renderer.graphics.drawRect(pbPhaserRender.width / 2, pbPhaserRender.height / 4, 100, 75, {r:0xff, g:0xff, b:0xff, a:0xff});
   	pbPhaserRender.renderer.graphics.fillRect(pbPhaserRender.width / 2, pbPhaserRender.height / 4 * 3, 100, 75, {r:0xff, g:0xff, b:0xff, a:0xff});
};

