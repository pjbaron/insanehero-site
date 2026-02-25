//
// EventHandlers.js
//
// Pete Baron 2017
//
//
// static object to handle system events
//
// accesses the Main global variables to report input locations
//




function EventHandlers()
{
	EventHandlers.swipeDistance = 160;
	EventHandlers.swipeMaxtime = 800;
	EventHandlers.clickTime = 200;

	EventHandlers._mouseDownWhen = 0;
	EventHandlers._mouseSwipeStart = null;

	EventHandlers.callbackList = null;

	EventHandlers._showDebugWindowData = 0;
    EventHandlers._debugText = null;

	// listen for resize events on the window
	window.addEventListener( 'resize', EventHandlers.resizeCanvas, false );
    window.addEventListener( 'orientationchange', EventHandlers.resizeCanvas, false );
}



EventHandlers.resetInput = function()
{
	EventHandlers._mouseDownWhen = 0;
	EventHandlers._mouseSwipeStart = null;
};


// PIXI handles a great many input events, we leverage that to simplify game code
EventHandlers.pixiListeners = function( _pixi )
{
	_pixi.plugins.interaction.on("mousedown", EventHandlers.mouseDownHandler);
	_pixi.plugins.interaction.on("mouseup", EventHandlers.mouseUpHandler);
	_pixi.plugins.interaction.on("mousemove", EventHandlers.mouseMoveHandler);
	_pixi.plugins.interaction.on("mouseout", EventHandlers.mouseOutHandler);
	_pixi.plugins.interaction.on("touchstart", EventHandlers.mouseDownHandler);
	_pixi.plugins.interaction.on("touchmove", EventHandlers.mouseMoveHandler);
	_pixi.plugins.interaction.on("touchclick", EventHandlers.inputClickHandler);
	_pixi.plugins.interaction.on("touchend", EventHandlers.mouseUpHandler);
};


// convert input coordinates into stage coordinates, if required
EventHandlers.mouseToStage = function( _x, _y )
{
	// no conversion required, create new object for safer reference handling of the coordinates
	return { x: _x, y: _y };
};


EventHandlers.inputClickHandler = function( _evt )
{
	Main.click = EventHandlers.mouseToStage( _evt.data.global.x, _evt.data.global.y );
};


EventHandlers.inputSwipeHandler = function( _evt )
{
	// ignore swipes that are more vertical than horizontal
	if ( Math.abs(_evt.deltaX) > Math.abs(_evt.deltaY) )
		Main.swipe = _evt.deltaX < -20 ? -1 : _evt.deltaX > 20 ? 1 : 0;
};


EventHandlers.mouseOutHandler = function()
{
	// mouse pointer has left the game window
	Main.mouseOut = true;
};


EventHandlers.mouseMoveHandler = function( _evt )
{
	// mouse pointer must be in the game window to trigger a mouse move event
	if ( Main.mouseOut )
		Main.mouseOut = false;

	Main.hover = EventHandlers.mouseToStage( _evt.data.global.x, _evt.data.global.y );

	// moved far enough from mouseDown to call it a swipe?
	if ( EventHandlers._mouseSwipeStart && Main.swipeEnabled )
	{
		if ( Utils.distanceBetween( EventHandlers._mouseSwipeStart, Main.hover ) >= EventHandlers.swipeDistance )
		{
			if ( Main.nowTime - EventHandlers._mouseDownWhen < EventHandlers.swipeMaxtime )
			{
				EventHandlers.inputSwipeHandler( { deltaX: Main.hover.x - EventHandlers._mouseSwipeStart.x, deltaY: Main.hover.y - EventHandlers._mouseSwipeStart.y } );
				EventHandlers._mouseDownWhen = 0;
				Main.mouseDown = null;
			}
		}
	}
};


EventHandlers.mouseDownHandler = function( _evt )
{
    // remove the debug text if it has expired
    if ( EventHandlers._showDebugWindowData )
    {
        if ( EventHandlers._showDebugWindowData < Main.nowTime )
        {
            EventHandlers._debugText.destroy();
            EventHandlers._debugText = null;
            EventHandlers._showDebugWindowData = 0;
        }
    }

	EventHandlers._mouseDownWhen = Main.nowTime;
	Main.mouseDown = EventHandlers.mouseToStage( _evt.data.global.x, _evt.data.global.y );

//console.log("mouseDown at", Main.mouseDown.x, Main.mouseDown.y);

	// swipe detection
	if (!EventHandlers._mouseSwipeStart && Main.swipeEnabled)
	{
		EventHandlers._mouseSwipeStart = EventHandlers.mouseToStage( _evt.data.global.x, _evt.data.global.y );
	}

	EventHandlers.triggerCallback( "mousedown", Main.mouseDown.x, Main.mouseDown.y );
};


EventHandlers.mouseUpHandler = function( _evt )
{
	var dragDistance = 0;
	if ( Main.mouseUp && Main.mouseDown )
	{
		dragDistance = Utils.distanceBetween( Main.mouseUp, Main.mouseDown );
	}

 	if ( Main.mouseDown )	// ignore mouseUp if the mouseDown was off-screen or cancelled (i.e. button processed on prior menu)
 	{
		// click detection (quick down/up) if not dragged
		if ( !Main.swipeEnabled || ( dragDistance < EventHandlers.swipeDistance && (!EventHandlers._mouseDownWhen || ( Main.nowTime - EventHandlers._mouseDownWhen < EventHandlers.clickTime ) ) ) )
		{
			EventHandlers.inputClickHandler( _evt );
		}
		else
		{
			Main.mouseUp = EventHandlers.mouseToStage( _evt.data.global.x, _evt.data.global.y );

			// swipe detection (down/up with substantial movement)
			if ( Main.mouseUp && Main.mouseDown )
			{
				if ( dragDistance >= EventHandlers.swipeDistance )
					EventHandlers.inputSwipeHandler( { deltaX: Main.mouseUp.x - Main.mouseDown.x, deltaY: Main.mouseUp.y - Main.mouseDown.y } );
			}
		}
	}
	
	EventHandlers._mouseDownWhen = 0;
	Main.mouseDown = EventHandlers._mouseSwipeStart = null;
};


//
// window has been resized, scale game to fit
//
EventHandlers.resizeCanvas = function()
{
	if (Main.HTMLElement === null)
    {
        EventHandlers._internalResize(window.innerWidth, window.innerHeight);
    }
    else
    {
        EventHandlers._internalResize(Main.HTMLElement.clientWidth, Main.HTMLElement.clientHeight);
    }
};

EventHandlers._internalResize = function(toWidth,toHeight)
{
    // fix for devicePixelRatio != 1.0
	//Removed this fix because it causes resizeproblem on Arena Phoenix,
	//Do not touch the parent meta tags on mobile, it's causing the whole page to be zoomed out

	/*
    var w = toWidth * window.devicePixelRatio;
    var h = toHeight * window.devicePixelRatio;
    var lScale = Math.floor(100 / window.devicePixelRatio) / 100;
    if (isNaN(w) || isNaN(h) || isNaN(lScale) )
    {
        lScale = 1;
    }

    var viewport = document.querySelector("meta[name=viewport]");
    viewport.setAttribute('content', "width=device-width, initial-scale=" + lScale + ", user-scalable=no, minimal-ui=1");
*/

    //Main.aspectRatio = ( window.innerWidth/ window.innerHeight);

    // to circumvent iPad event handling problems, this is now being polled constantly
    // early exit if it is not required yet
    if (Main.width == toWidth && Main.height == toHeight && !Main.forceResize)
        return;

    Main.width = toWidth;
    Main.height = toHeight;

    Main.aspectRatio = (Main.width / Main.height);
    Main.isPortrait = (Main.aspectRatio < 1.0);

    if (Main.lowResolutionAssets === undefined)
    {
        // we set this once only on the first time through... changing it later would require us to reload all assets
        Main.lowResolutionAssets = (Main.width * Main.app.renderer.resolution < 900 || Main.height * Main.app.renderer.resolution < 900);
    }
    Main.tileAssetScale = Main.lowResolutionAssets ? 0.5 : 1.0;

    var scale = 1.0;    //Main.lowResolutionAssets ? (1.0 / 0.75) : 1.0;

    // keep the renderer the same size as the browser window (no undrawn areas at the edges if it gets bigger)
    //Main.renderer.gl.canvas.parentNode
    Main.renderer.resize(Main.width, Main.height);
    Main.stage.x = Math.round(Main.width / 2);
    Main.stage.y = Math.round(Main.height / 2);

    // background image (rescale the background image to fill the browser window without any gaps maintaining aspect ratio)
    var sx = Main.width / Main.gameWide;		// use size of "game_title"
    var sy = Main.height / Main.gameHigh;
    Main.background.scale.set( scale * Math.max( sx, sy ) );

    // puzzle scales to fit the largest starting position into the window
    var puzzleWide = Tile.pieceSizePixels * Main.tileAssetScale * Tile.scale * Puzzle.maxHalfTilesWide * 0.5;
    var puzzleHigh = Tile.pieceSizePixels * Main.tileAssetScale * Tile.scale * Puzzle.maxTilesHigh;

    // global puzzle scale factors have been adjusted to avoid the puzzle overlapping the turn buttons
    var sw = Main.width / puzzleWide;
    var sh = Main.height / puzzleHigh;
    Main.puzzle.scale.set( scale * Math.min( Main.pieceScale * sw, Main.pieceScale * sh ) );
    //var scaler = (Main.pieceScale > 1.0) ? 3.0 : (Main.pieceScale == 1.0) ? 1.0 : 0.0;
    //Main.puzzle.y = -(Main.height * scaler / 30) + Main.puzzleOffsetY * Main.puzzle.scale.y;

    // top UI
    Main.topUI.y = -Main.height / 2;
    Main.topUI.scale.set( scale * Math.min( sx, sy ) );

    // full-screen UI
    Main.fullUI.scale.set( scale * Math.min( sx * Main.fullUIScale, sy * Main.fullUIScale ) );

    // right UI
    Main.rightUI.scale.set( scale * Math.min( sx, sy ) );
    Main.rightUI.x = Main.width * 0.45;
    Main.rightUI.y = -Main.height / 2;

    // bottom UI
    Main.bottomUI.scale.set( scale * 1.5 * Math.min( sx, sy ) );


    // after the dimensions change, update everything that uses a percentage offset instead of absolute pixels
    Main.resized = true;
    Main.resizeConsumed = false;

    Main.forceResize = false;

    console.log( "\nMahjonggDarkDimensions " + Main.width.toString() + " x " + Main.height.toString() +  " res = " + (Main.lowResolutionAssets ? "low" : "high") );
    if ( Main.debug )
    {
        console.log( "aspectRatio:", Main.aspectRatio, Main.aspectRatio >= 1.0 ? "landscape" : "portrait" );
        console.log( "devicePixelRatio", window.devicePixelRatio );
        console.log( "doc window.inner:   ", window.innerWidth, "x", window.innerHeight );
        console.log( "Resolution: ", Main.lowResolutionAssets ? "low" : "high" );
        console.log( "View ratio: ", sx, ":", sy );
        console.log( "stage offset: ", Main.stage.x, ",", Main.stage.y, "\n" );
    }
};


// Object _arg must contain context, it may also contain an args Object
EventHandlers.registerCallback = function( _event, _callback, _arg )
{
	if ( Main.debug )
		console.log("registerCallback for", _event);

	if ( !EventHandlers.callbackList )
		EventHandlers.callbackList = [];

	EventHandlers.callbackList.push( {
		event: _event,
		callback: _callback,
		arg: _arg
	});
};


EventHandlers.triggerCallback = function( _event, _x, _y )
{
	if ( !EventHandlers.callbackList )
		return;

	for( var i = EventHandlers.callbackList.length - 1; i >= 0; --i )
	{
		var e = EventHandlers.callbackList[i];
		if ( e.event == _event )
		{
			if ( Main.debug )
				console.log("triggerCallback for", _event);

			e.callback.call( e.arg.context, _x, _y, e.arg.args );
		}
	}
};


EventHandlers.clearCallback = function( _event, _callback )
{
	if ( !EventHandlers.callbackList )
		return;

	for( var i = EventHandlers.callbackList.length - 1; i >= 0; --i )
	{
		var e = EventHandlers.callbackList[i];
		if ( e.event == _event && e.callback == _callback )
		{
			EventHandlers.callbackList.splice( i, 1 );

			if ( Main.debug )
				console.log("clearCallback for", _event);
			break;
		}
	}

	if ( EventHandlers.callbackList.length === 0 )
		EventHandlers.callbackList = null;
};


EventHandlers.clearCallbacks = function()
{
	EventHandlers.callbackList = null;
};


/**
 * Shows all of the vital information about the game window size
 * on-screen.  Used for debugging resolution problems on mobile
 * devices.
 */
EventHandlers.debugWindowData = function()
{
    if ( !EventHandlers._showDebugWindowData )
    {
        var sx = Main.width / Main.gameWide;
        var sy = Main.height / Main.gameHigh;

        var s = "aspectRatio: " + Main.aspectRatio + " " + (Main.aspectRatio >= 1.0 ? "landscape" : "portrait") + "\n";
        s += "devicePixelRatio: " + window.devicePixelRatio + "\n";
        s += "window.inner: " + window.innerWidth + " x " + window.innerHeight + "\n";
        s += "resolution: " + (Main.lowResolutionAssets ? "low" : "high") + "\n";
        s += "view ratio: " + sx + " : " + sy;

        var t = new Text( s, Main.textStyleMediumTiny );
        t.create( Main.topUI, -0.5 + 0.05, 0.25, true );
        t.anchor.y = 1;

        EventHandlers._debugText = t;
        EventHandlers._showDebugWindowData = Main.nowTime + 5000;
    }
};
