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
    EventHandlers.touchEvent = false;

	EventHandlers._mouseDownWhen = 0;
	EventHandlers._mouseSwipeStart = null;
	EventHandlers.callbackList = null;

	EventHandlers._showDebugWindowData = 0;
    EventHandlers._debugText = null;

	// listen for resize events on the window
	window.addEventListener( 'resize', EventHandlers.resizeCanvas, false );
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
	_pixi.plugins.interaction.on("touchstart", EventHandlers.touchDownHandler);
	_pixi.plugins.interaction.on("touchmove", EventHandlers.touchMoveHandler);
	_pixi.plugins.interaction.on("touchclick", EventHandlers.inputClickHandler);
	_pixi.plugins.interaction.on("touchend", EventHandlers.touchUpHandler);
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
    Main.mouseMoveLocal = _evt.data.getLocalPosition(Main.gameUILayer);
    Main.mouseUpLocal = _evt.data.getLocalPosition(Main.gameUILayer);

    if ( Main.debug )
        console.log("EventHandlers.inputClickHandler");
};


EventHandlers.inputSwipeHandler = function( _evt )
{
	// ignore swipes that are more vertical than horizontal
	if ( Math.abs(_evt.deltaX) > Math.abs(_evt.deltaY) )
    {
        if ( Math.abs(_evt.deltaX) >= 20 )
        {
            Main.swipe = _evt.deltaX;
            if ( Main.debug )
                console.log("swipe detected = " + Main.swipe);
        }
        else
        {
            Main.swipe = 0;
        }
    }
};


EventHandlers.mouseOutHandler = function()
{
	// mouse pointer has left the game window
	Main.mouseOut = true;
};


EventHandlers.mouseMoveHandler = function( _evt )
{
    EventHandlers.touchEvent = false;
    return EventHandlers.touchMoveHandler( _evt );
};


EventHandlers.touchMoveHandler = function( _evt )
{
	// mouse pointer must be in the game window to trigger a mouse move event
	if ( Main.mouseOut )
		Main.mouseOut = false;

	Main.hover = EventHandlers.mouseToStage( _evt.data.global.x, _evt.data.global.y );
    Main.mouseMoveLocal = _evt.data.getLocalPosition(Main.gameUILayer);

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


EventHandlers.touchDownHandler = function( _evt )
{
    EventHandlers.touchEvent = true;
    EventHandlers.mouseDownHandler( _evt );
    Main.mouseMoveLocal = Main.mouseDownLocal;
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
    Main.mouseDownLocal = _evt.data.getLocalPosition(Main.gameUILayer);
//console.log("mouseDown at", Main.mouseDown.x, Main.mouseDown.y);
//console.log("mouseDownLocal at", Main.mouseDownLocal.x, Main.mouseDownLocal.y);

	// swipe detection
	if (!EventHandlers._mouseSwipeStart && Main.swipeEnabled)
	{
		EventHandlers._mouseSwipeStart = EventHandlers.mouseToStage( _evt.data.global.x, _evt.data.global.y );
	}

	EventHandlers.triggerCallback( "mousedown", Main.mouseDown.x, Main.mouseDown.y );
};


EventHandlers.touchUpHandler = function( _evt )
{
    EventHandlers.touchEvent = true;
    EventHandlers.mouseUpHandler( _evt );
    Main.mouseMoveLocal = Main.mouseUpLocal;
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
            Main.mouseUpLocal = _evt.data.getLocalPosition(Main.gameUILayer);

			// swipe detection (down/up with substantial movement)
			if ( Main.mouseUp && Main.mouseDown )
			{
				if ( dragDistance >= EventHandlers.swipeDistance )
					EventHandlers.inputSwipeHandler( { deltaX: Main.mouseUp.x - Main.mouseDown.x, deltaY: Main.mouseUp.y - Main.mouseDown.y } );
			}
		}
	}
	
	EventHandlers._mouseDownWhen = 0;
	Main.mouseDown = null;
    Main.mouseDownLocal = null;
    EventHandlers._mouseSwipeStart = null;
};


//
// window has been resized, scale game to fit
//
EventHandlers.resizeCanvas = function()
{
	if (!Main.HTMLElement)
    {
        if ( Main.width != window.innerWidth || Main.height != window.innerHeight )
            EventHandlers._internalResize(window.innerWidth, window.innerHeight);
    }
    else
    {
        if ( Main.width != Main.HTMLElement.clientWidth || Main.height != Main.HTMLElement.clientHeight )
            EventHandlers._internalResize(Main.HTMLElement.clientWidth, Main.HTMLElement.clientHeight);
    }
};


EventHandlers._internalResize = function(toWidth,toHeight)
{
    // NOTE: gameUILayer must match size and offset of backgroundLayer - required so that bubbleToGameUi matches for barrier breaking detection
    // (barrier is offset from launcher, bubbles are converted into gameUILayer coordinates for lowestY)
    Main.resizeTime = Main.nowTime;

    Main.width = toWidth;
    Main.height = toHeight;

    // after the dimensions change, update everything that uses a percentage offset instead of absolute pixels
    Main.resized = true;
    Main.resizeConsumed = false;
    Main.forceResize = false;

    Main.aspectRatio = ( Main.width / Main.height );
    Main.isPortrait = ( Main.aspectRatio + 0.00001 < 1.33 );   // largest size for 640 x 480
    Main.lowResolutionAssets = (Math.max(Main.width, Main.height) < 640) || (Math.min(Main.width, Main.height) < 480);
};


EventHandlers.resizeContent = function()
{
    Main.aspectRatio = ( Main.width / Main.height );
    Main.isPortrait = ( Main.aspectRatio + 0.00001 < 4 / 3 );   // largest size for 640 x 480
    Main.lowResolutionAssets = (Math.max(Main.width, Main.height) < 640) || (Math.min(Main.width, Main.height) < 480);

    // keep the renderer the same size as the browser window (no undrawn areas at the edges if it gets bigger)
    Main.renderer.resize(Main.width, Main.height);
    Main.stage.x = Math.round(Main.width / 2);
    Main.stage.y = Math.round(Main.height / 2);

    var sx = Main.width / Main.gameWide;        // use raw size of "game_title" as the basis for all pixel sizes
    var sy = Main.height / Main.gameHigh;

    // bg image must fill the screen with no borders, allow cropping at edges
    var bgScale = Math.max( sx, sy );
    Main.bgImage.scale.set( bgScale );

    //
    // calculate dimensions for portrait AND landscape mode on this screen
    //

    var orientation = "landscape";
    if ( Main.isPortrait ) orientation = "portrait";

    // landscape pre-calc

    // playableWidth is the size of the game area and the ui area (pixels)
    var playableWidth = Math.round(Main.height * 4 / 3);    // largest size for 640x480
    // width of ui area is a percentage of the playable width (pixels)
    var uiAreaWidth = Math.round(playableWidth * Main.shiftPlayfield);
    // width of the bubble area (pixels)
    var bubbleAreaWidth = playableWidth - uiAreaWidth;
    // calculate width of bubbles to fit the bubble area
    var bubblesWidth = bubbleAreaWidth / Game.width;
    // calculate scale required to make bubbles that wide
    var bubbleScale = bubblesWidth / Game.bubbleDiameter;

    var scaleWidth = {
        portrait: Main.width / (Game.sideBarOffset * 2),
        landscape: bubbleScale
    };
    var marginWidth = {
        portrait: 0,
        landscape: (Main.width - playableWidth) / 2.0
    };
    var offsetX = {
        portrait: 0,
        landscape: marginWidth.landscape + uiAreaWidth + bubbleAreaWidth / 2 - Main.width / 2
    };
    var bubbleAreaWidths = {
        portrait: Main.width,
        landscape: bubbleAreaWidth
    };
    var rectWidths = {
        portrait: Main.width,
        landscape: playableWidth
    };

    // apply the appropriate ones
    Main.bubbleLayer.scale.set( scaleWidth[orientation] );
    Main.gameUILayer.scale.set( scaleWidth[orientation] );
    Main.backgroundLayer.scale.set( scaleWidth[orientation] );
    Main.bubbleLayer.x = 
        Main.gameUILayer.x = 
        Main.backgroundLayer.x = offsetX[orientation];
    Main.marginWidth = marginWidth[orientation];
    Main.backgroundLayer.bubbleAreaWidth = bubbleAreaWidths[orientation];
    Main.bottomUI.rectWidth = Main.topUI.rectWidth = rectWidths[orientation];
    Main.topUI.x = 0;
    Main.bottomUI.x = 0;

    // if the preloader has loaded and assigned the texture to the top & bottom ui yet...    
    if ( Main.bottomUI.texture && !Main.bottomUI.texture.noFrame &&
            Main.topUI.texture && !Main.topUI.texture.noFrame )
    {
        Main.bottomUI.width = Main.bottomUI.rectWidth;
        Main.bottomUI.height = Main.height;
        Main.bottomUI.y = Main.bottomUI.parent.y;    // locked to the bottom of it's parent

        Main.topUI.width = Main.topUI.rectWidth;
        Main.topUI.height = Main.height;
        Main.topUI.y = -Main.topUI.parent.y;
    }

    // full-screen UI
    Main.fullUI.scale.set( Math.min( sx * Main.fullUIScale, sy * Main.fullUIScale ) );

    if ( Main.debug )
    {
        console.log( "\nBubble Dragons", Main.width, "x", Main.height );
        console.log( "aspectRatio:", Main.aspectRatio, Main.isPortrait ? "portrait" : "landscape" );
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
	if ( Main.debugSpam )
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
			if ( Main.debugSpam )
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

			if ( Main.debugSpam )
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

        var s = "aspectRatio: " + Main.aspectRatio + " " + (Main.isPortrait >= 1.0 ? "portrait" : "landscape") + "\n";
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
