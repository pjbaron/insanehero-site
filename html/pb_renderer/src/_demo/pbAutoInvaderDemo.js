/**
 *
 * The auto-invaders demo for the new Phaser 3 renderer.
 *
 * Also illustrates layer clipping.
 * 
 *
 */


/* jshint laxbreak: true */	// tell jshint to just shut-up already about my choice of line format



// created while the data is loading (preloader)
function pbAutoInvaderDemo( docId )
{
	console.log( "pbAutoInvaderDemo c'tor entry" );

	this.layer = null;
	this.game = null;

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	pbPhaserRender.loader.loadImage( "player", "../img/invader/player.png" );
	pbPhaserRender.loader.loadImage( "invader", "../img/invader/invader32x32x4.png", 32, 32, 4, 1);
	pbPhaserRender.loader.loadImage( "stars", "../img/invader/starfield.png" );
	pbPhaserRender.loader.loadImage( "bullet", "../img/invader/bullet.png" );
	pbPhaserRender.loader.loadImage( "bomb", "../img/invader/enemy-bullet.png" );
	pbPhaserRender.loader.loadImage( "rocket", "../img/invader/rockets32x32x8.png", 32, 32, 8, 1 );
	pbPhaserRender.loader.loadImage( "smoke", "../img/invader/smoke64x64x8.png", 64, 64, 8, 1 );
	pbPhaserRender.loader.loadImage( "explosion", "../img/invader/explode.png", 128, 128, 16, 1 );
	pbPhaserRender.loader.loadImage( "font", "../img/fonts/arcadeFonts/16x16/Bubble Memories (Taito).png", 16, 16, 95, 7 );

	console.log( "pbAutoInvaderDemo c'tor exit" );
}


pbAutoInvaderDemo.prototype.create = function()
{
	console.log("pbAutoInvaderDemo.create");

	this.layer = new layerClass();
	// _parent, _renderer, _x, _y, _z, _angleInRadians, _scaleX, _scaleY
	this.layer.create(rootLayer, this.phaserRender, 0, 0, 1, 0, 1, 1);
	// illustrate layer clipping by chopping 20 pixels off each edge
	this.layer.setClipping( 20, 20, pbPhaserRender.width - 40, pbPhaserRender.height - 40 );
	rootLayer.addChild(this.layer);
	this.game = new pbInvaderDemoCore();
	this.game.create(this, this.layer);
};


pbAutoInvaderDemo.prototype.destroy = function()
{
	console.log("pbAutoInvaderDemo.destroy");

	this.layer.destroy();
	this.layer = null;

	this.phaserRender.destroy();
	this.phaserRender = null;

	this.game.destroy();
	this.game = null;
};


pbAutoInvaderDemo.prototype.update = function()
{
	this.game.update();
};
