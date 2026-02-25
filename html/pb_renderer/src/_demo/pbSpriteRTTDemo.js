/**
 *
 * Demo showing sprites which use render-to-texture as their sources, for the new Phaser 3 renderer.
 *
 * This demo illustrates how to render to a texture then attach that texture to a pbSurface.
 * From there on the rest of creating a pbImage and displaying pbTransformObject transformations of
 * it is exactly the same as the pbTransforms demo... proving that the render-to-texture now fits
 * seamlessly into the rendering engine.
 * 
 * It differs from pbCameraRTTDemo in that it creates the texture from a surface once at the start,
 * rather than continually updating it every frame.
 * 
 */


function pbSpriteRTTDemo( docId )
{
	console.log( "pbSpriteRTTDemo c'tor entry" );

	this.phaserRender = new pbPhaserRender( docId );
	this.phaserRender.create( useRenderer, this.create, this.update, this );
	this.spriteImg = pbPhaserRender.loader.loadImage( "ball", "../img/sphere3.png" );

	console.log( "pbSpriteRTTDemo c'tor exit" );
}


pbSpriteRTTDemo.prototype.create = function()
{
	console.log("pbSpriteRTTDemo.create");

	// render the loaded image to a texture and create a pbSurface to hold it
	this.renderToTexture();

	// add some sprites that use the rendered texture for their source
	this.addSprites();
};


pbSpriteRTTDemo.prototype.destroy = function()
{
	console.log("pbSpriteRTTDemo.destroy");

	this.rttSurface.destroy();
	this.rttSurface = null;

	this.phaserRender.destroy();
	this.phaserRender = null;
};


pbSpriteRTTDemo.prototype.restart = function()
{
	console.log("pbSpriteRTTDemo.restart");
	
	this.destroy();
	this.create();
};


pbSpriteRTTDemo.prototype.renderToTexture = function()
{
	console.log("pbSpriteRTTDemo.renderToTexture");

	// get the loaded image into a surface
	var imageData = pbPhaserRender.loader.getFile( this.spriteImg );
	var surface = new pbSurface();
	surface.create(0, 0, 1, 1, imageData);

	// draw the surface to a render-to-texture on the GPU
	// _surface, _textureWide, _textureHigh, _dstTextureRegister
	this.rttTextureRegister = 1;
	this.rttTexture = pbPhaserRender.renderer.graphics.textures.drawSurfaceToTexture(surface, 64, 64, this.rttTextureRegister);

	// create a new surface using the render-to-texture texture as the source
	this.rttSurface = new pbSurface();
	// _wide, _high, _numWide, _numHigh, _imageData, _rttTexture, _rttTextureRegister
	this.rttSurface.create(0, 0, 1, 1, null, this.rttTexture, this.rttTextureRegister);
};


pbSpriteRTTDemo.prototype.addSprites = function()
{
	console.log("pbSpriteRTTDemo.addSprites");

	var img = new imageClass();
	img.create(this.rttSurface, 0, 0.5, 1.0);		// anchorY = 1.0 - make movement appear more complex

	this.dirx = 2;
	this.spr = new pbTransformObject();
	this.spr.create(img, 200, 200, 1.0, 0, 1.0, 1.0);
	rootLayer.addChild(this.spr);

	this.child = new pbTransformObject();
	this.child.create(img, 0, -75, 1.0, 0, 0.75, 0.75);
	this.spr.addChild(this.child);

	this.childchild = new pbTransformObject();
	this.childchild.create(img, 0, -75, 1.0, 0, 0.75, 0.75);
	this.child.addChild(this.childchild);

	var childchildchild = new pbTransformObject();
	childchildchild.create(img, 0, -50, 1.0, 0, 0.5, 0.5);
	this.childchild.addChild(childchildchild);

	childchildchild = new pbTransformObject();
	childchildchild.create(img, 0, 50, 1.0, 0, 0.5, 0.5);
	this.childchild.addChild(childchildchild);

	childchildchild = new pbTransformObject();
	childchildchild.create(img, -50, 0, 1.0, 0, 0.5, 0.5);
	this.childchild.addChild(childchildchild);

	childchildchild = new pbTransformObject();
	childchildchild.create(img, 50, 0, 1.0, 0, 0.5, 0.5);
	this.childchild.addChild(childchildchild);
};


pbSpriteRTTDemo.prototype.update = function()
{
	// make the first three depths rotate at different speeds
	this.childchild.angleInRadians += 0.04;
	this.child.angleInRadians += 0.02;
	this.spr.angleInRadians += 0.01;

	// bounce the top sprite across the renderer view
	this.spr.x += this.dirx;
	if (this.spr.x < 150) this.dirx = -this.dirx;
	if (this.spr.x > pbPhaserRender.width - 150) this.dirx = -this.dirx;
};

