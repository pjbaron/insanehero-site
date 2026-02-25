/**
 *
 * pbRenderer - initialise the rendering system, callback when ready, and provide the main update tick callback
 * 
 */


var canvas = null;
var webGl = null;
var rootLayer = null;

// static global
pbRenderer.width = 0;
pbRenderer.height = 0;
pbRenderer.frameCount = 0;


// TODO: split RAF timer out of here and into it's own object, including updateCallback etc???

// Turns out it's impossible to change the 'primary context' of a canvas... http://stackoverflow.com/questions/7293778/switch-canvas-context

function pbRenderer(_renderMode, _docId, _bootCallback, _updateCallback, _gameContext)
{
	console.log("pbRenderer c'tor entry");

	// parameters
	this.docId = _docId;
	this.bootCallback = _bootCallback;
	this.updateCallback = _updateCallback;
	this.gameContext = _gameContext;
	this.useFramebuffer = null;
	this.useRenderbuffer = null;
	this.postUpdate = null;

	// globals
 	webGl = null;
 	rootLayer = null;

	// members
	this.isBooted = false;
	this.rootTimer = null;
	pbRenderer.frameCount = 0;

	// drawing system
	this.graphics = null;

	// create a canvas surface
    canvas = document.createElement('canvas');
    canvas.setAttribute('id', this.docId);
    canvas.setAttribute('width', 800);
    canvas.setAttribute('height', 600);
    canvas.setAttribute('style', 'border: none');
    // NOTE: canvas performance seems heavily dependent on the Node order of it's parent, it needs to be first!
	var guiContainer = document.getElementById('gui');    
    document.body.insertBefore(canvas, guiContainer);

	// boot callback
	var _this = this;
    this._onBoot = function () {
        	return _this.boot(_renderMode);
    	};
    if (document.readyState === 'complete' || document.readyState === 'interactive')
    {
        window.setTimeout(this._onBoot, 0);
    }
    else
    {
        document.addEventListener('DOMContentLoaded', this._onBoot, false);
        window.addEventListener('load', this._onBoot, false);
    }

	console.log("pbRenderer c'tor exit");
}


pbRenderer.prototype.destroy = function()
{
	console.log("pbRenderer.destroy");

	if (this.rootTimer)
		this.rootTimer.destroy();
	this.rootTimer = null;

	if (this.graphics)
		this.graphics.destroy();
	this.graphics = null;

	if (rootLayer)
		rootLayer.destroy();
	rootLayer = null;

	this.updateCallback = null;
	this.gameContext = null;
	this.bootCallback = null;

	webGl = null;

	canvas.parentNode.removeChild(canvas);
	canvas = null;
};


pbRenderer.prototype.boot = function(_renderMode)
{
    if (this.isBooted)
    {
    	// only boot once
        return;
    }

    if (!document.body)
    {
    	// wait until the document.body is available, keep trying every 20 ms
        window.setTimeout(this._onBoot, 20);
        return;
    }

   	console.log("pbRenderer boot");

    document.removeEventListener('DOMContentLoaded', this._onBoot);
    window.removeEventListener('load', this._onBoot);

    // only boot once
    this.isBooted = true;

	// create the drawing system interface
	this.createGraphics(_renderMode);

	// create the rootLayer container for all graphics
	rootLayer = new layerClass();
	rootLayer.create(null, this, 0, 0, 0, 0, 1, 1);

    // call the boot callback now the renderer is ready
    this.bootCallback.call(this.gameContext);

    // start the update looping
	this.rootTimer = new pbRootTimer();
	this.rootTimer.start(this.update, this);
};


/**
 * createGraphics - set the graphics mode (any extension of pbBaseGraphics)
 *
 * @param  {String} _preferredRenderer - 'webgl', 'canvas' or undefined.  undefined will try webGl and fall-back to canvas if it fails.
 *
 * TODO: expand for other graphics mode, ie. DOM sprites: http://buildnewgames.com/dom-sprites/
 */
pbRenderer.prototype.createGraphics = function(_preferredRenderer)
{
	console.log("pbRenderer.createGraphics");

	// reset the canvas (erase its contents and set all properties to defaults)
	canvas.width = canvas.width;

	// useful stuff held local to renderer
	pbRenderer.width = canvas.width;
	pbRenderer.height = canvas.height;
	this.graphics = null;
	
	//
	// try to get the renderer set up
	// TODO: all drawing modes should be tried in a predetermined order with optional preference respected
	// currently: 'webgl', 'canvas'
	//

	useRenderer = 'none';
	if (_preferredRenderer === undefined || _preferredRenderer == 'webgl')
	{
		// try to get a webGL context
		this.graphics = new pbWebGl();
		if (this.graphics.create(canvas))
		{
			// got one, now set up the support
			useRenderer = 'webgl';
			layerClass = pbWebGlLayer;
			imageClass = pbWebGlImage;
			pbMatrix3.rotationDirection = 1;
			return;
		}
		this.graphics.destroy();
		this.graphics = null;
	}

	if (!this.graphics)
	{
		// final case fallback, try canvas '2d'
		this.graphics = new pbCanvas();
		if (this.graphics.create(canvas))
		{
			// got one, now set up the support
			useRenderer = 'canvas';
			layerClass = pbCanvasLayer;
			imageClass = pbCanvasImage;
			pbMatrix3.rotationDirection = -1;
			return;
		}
		this.graphics.destroy();
		this.graphics = null;
	}
};


pbRenderer.prototype.update = function()
{
	stats.begin();

	pbRenderer.frameCount++;

	// prepare to draw (erase screen)
	this.graphics.preRender(pbRenderer.width, pbRenderer.height, this.useFramebuffer, this.useRenderbuffer);

	// update game logic
	this.updateCallback.call(this.gameContext);

	// update all object transforms then draw everything
	if (rootLayer)
	{
		// the rootLayer update will iterate the entire display list
		rootLayer.update();
	}

	// postUpdate if required
	if (this.postUpdate !== null)
	{
		this.postUpdate.call(this.gameContext);
	}

	stats.end();
};


