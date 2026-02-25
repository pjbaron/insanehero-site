//
// Main.js
//
// Pete Baron 2017
//
//
// Top level wrapper for Mahjongg Dark Dimensions
// provides RAF timer loop
//


//
// Overall program structure notes:
// 
// There is a heirarchy of objects from Main down to individual Sprite or Text items
// Each level controls the level below, through lists when they are multiple
// 
// The format of each object is usually:
// 
// constructor - initialises the object to an empty state with all properties at zero/null
// create - initialises the object to it's initial useable state according to parameters
// update - called once per game refresh, makes the object do whatever it should be doing
// destroy - destroys the object, releases all external references (aide to the GC)
// 
// 
// Object Hierarchy (abbreviated for clarity):
// 
// Main          - Top level wrapper for Mahjongg Dark Dimensions with RAF timer loop
//  GameControl  - game state machine controls whole game sequencing
//   Preloader   - handle initial loading of images and other game data
//   Titles      - game title screen code and data
//   Game        - central controller for all in-game updates and displays, handles in-game flow (end of level -> advance to next)
//    World      - game environment management, background, ui, puzzle, etc
//     Puzzle    - create the graphics and hold the current state of the puzzle
//      Tile     - functions and data for a single game Tile (representation of a Mahjongg cube)
//       Sprite  - wrapper for PIXI.Sprite with additional functionality (e.g. percentage based positioning)
// 


//
// static functions
//

function Main()
{
    // debug information and settings
    Main.VERSION = "v1.08";     // TODO: update this for every release
    Main.testKeys = true;		// TODO: ensure this is false for final release
    Main.debug = false;			// TODO: ensure this is false for final release
    Main.showFPS = false;		// TODO: ensure this is false for final release


    // game option flags and constants

    // pauseOnFocusLoss : boolean
    // If true then the game will fade out the game tiles and display a 'click to continue'
    // panel when focus is changed to a different window or browser tab.
    // If false the the game will continue to play regardless of these events.
    // NOTE: over-ridden on 'mobile' devices, it will always pause on focus loss there
    Main.pauseOnFocusLoss = false;

    // playAgainCount : integer
    // At the end of each game the player will be offered a choice of "submit score"
    // AND "play again" for Main.playAgainCount times before they are only offered "submit score".
    // If playAgainCount is zero, "play again" will not be offered at all.
    Main.playAgainCount = 0;

    // playMidRollAd : boolean
    // If true then game will play a mid-roll advert (video usually) during the game.
    // "mid-roll adverts between levels after level 2 if 0 replays left"
    Main.playMidRollAd = false;

    // playMidRollAdAfterPause : boolean
    // If true then game will play a mid-roll advert (video usually) when pause mode is exited.
    Main.playMidRollAdAfterPause = false;

    // If true then an 'event_change' ad event will be sent when puzzle pieces are matched
    Main.eventChangeAdOnMatch = false;

    // ad event_change on title start and titles end
    Main.eventChangeAdOnTitlesShow = false;
    Main.eventChangeAdOnTitlesClose = false;

    // ad event_change on game events
    Main.eventChangeAdOnRotate = false;

    // ad event_change on BigMessage popups
    Main.eventChangeAdOnPopup = true;

    // ad event_change on Options
    Main.eventChangeAdOnOptions = true;

    // ad event_change on game idle (idle duration in milliseconds)
    // zero in this value means there is no ad on idle
    Main.eventChangeAdOnIdle = 20000;
    Main.idleTimer = Number.MAX_VALUE;  // no timer until first click

    // game constants
    Main.timerStart = (2 * 60 + 0) * 1000 + 999;		// milliseconds
    Main.gameWide = 1200;
    Main.gameHigh = 900;
    Main.volumeControl = 0.5;                           // global volume control multiplier

    // input control variables (global for easy access from anywhere)
    Main.click = null;
    Main.hover = null;
    Main.mouseDown = null;
    Main.mouseUp = null;
    Main.swipe = 0;
    Main.swipeEnabled = false;

    // globally accessible
    Main.showHelp = true;
    Main.forceResize = false;
    Main.resized = false;
    Main.resizeConsumed = false;
    Main.time = 0;
    Main.elapsedTime = 0;
    Main.muteUntil = -1;
    Main.isPortrait = true;
    Main.aspectRatio = 1.0;
    Main.countryCode = "en-US"; // overridden by Locale
    Main.nowTime = 0;
    Main.repeatedGamesLeft = 0;
    Main.lowResolutionAssets = undefined;   // undefined is used as 'first time' flag in EventHandlers, thereafter it is a bool
    Main.tileAssetScale = 1.0;
    Main.suppressBigAnimations = false;
    Main.pieceScale = 0.85;
    Main.puzzleOffsetY = 0;

    // static
    Main._lastTime = 0;

    // system
    this.gameControl = null;
}


// static, record time when the game started
Main.timeStarted = Date.now();


Main.HTMLElement = null;
Main.prototype.createGame = function (width, height, elementId)
{
    // create game event handlers
    new EventHandlers();

    // used for no-build-required local testing only
    if ( !Main.arenaHelper )
        Main.arenaHelper = new ArenaHelper();

    // create game renderer (PIXI)
    Main.app = new PIXI.Application(width || Main.gameWide, height || Main.gameHigh, {
        autoResize: true/*,
        transparent: true*/
    });
    Main.renderer = Main.app.renderer;

    // critical information debug (i.e. why is it slow on this device?!)
    if (Main.renderer instanceof PIXI.CanvasRenderer)
    {
        console.log("PIXI using Canvas Renderer");
        if ( PIXI.utils.isMobile.any ) console.log( "Mobile device" );
    }
    else
    {
        console.log("PIXI using WebGl Renderer");
        if ( PIXI.utils.isMobile.any ) console.log( "Mobile device" );
    }

    var element = null;
    if (elementId !== null)
    {
        element = document.getElementById(elementId);
    }
    Main.HTMLElement = element;

    if (element)
    {
        element.appendChild(Main.app.view);
    }
    else
    {
        document.body.appendChild(Main.app.view);
    }

    // make sure we're getting keyboard input into the game
    Main.getFocus();

    // if we're using a canvas renderer, disable large animations which will run poorly
    if (Main.renderer instanceof PIXI.CanvasRenderer)
        Main.suppressBigAnimations = true;
    else
        Main.suppressBigAnimations = false;
    if (Main.debug) console.log("Main.suppressBigAnimations =", Main.suppressBigAnimations);


    //
    // mobile and browser detection
    //

    Main.isAndroid = PIXI.utils.isMobile.android.phone || PIXI.utils.isMobile.android.seven_inch || PIXI.utils.isMobile.android.tablet;
    if (Main.debug) console.log("Main.android device =", Main.isAndroid);

    Main.isChromeMobile = PIXI.utils.isMobile.other.chrome;
    if (Main.debug) console.log("Main.isChromeMobile =", Main.isChromeMobile);

    // stage is the root which holds the other containers
    Main.stage = Main.app.stage;
    Main.stage.x = Main.gameWide / 2;
    Main.stage.y = Main.gameHigh / 2;

    // background image (rescale the background image to fill the browser window without any gaps maintaining aspect ratio)
    Main.background = new PIXI.Sprite();
    Main.background.anchor.set(0.5);
    Main.stage.addChild(Main.background);

    // puzzle container (centred horizontally, fixed to bottom)
    Main.puzzle = new PIXI.Sprite();
    Main.puzzle.anchor.set(0.5, 0.5);
    Main.stage.addChild(Main.puzzle);

    // bottom UI container (centred horizontally, fixed to bottom)
    Main.bottomUI = new PIXI.Sprite();
    Main.bottomUI.anchor.set(0.5, 1.0);
    Main.stage.addChild(Main.bottomUI);

    // right UI container (centred)
    Main.rightUI = new PIXI.Sprite();
    Main.rightUI.anchor.set(0.5);
    Main.stage.addChild(Main.rightUI);

    // top UI container (centred horizontally, fixed to top)
    Main.topUI = new PIXI.Sprite();
    Main.topUI.anchor.set(0.5, 0.0);
    Main.stage.addChild(Main.topUI);

    // full-screen UI container (centred)
    Main.fullUI = new PIXI.Sprite();
    Main.fullUI.anchor.set(0.5, 0.5);
    Main.fullUIScale = 1.0;
    Main.stage.addChild(Main.fullUI);

    // ensure that renderer fits the initial window
    EventHandlers.resizeCanvas();

    // create input events via Pixi
    EventHandlers.pixiListeners(Main.renderer);

    // google analytics
    _gameGATracker("create", "UA-68188765-24", "auto");
    //_gameGATracker("send", "pageview", {"page": "/LoadingScene"});

    // start time system
    Main.nowTime = Date.now();
    Main.time = 0;

    // game can be replayed X times then it must exit to the connector game-over
    Main.repeatedGamesLeft = Main.playAgainCount;

    // create the game controller
    this.gameControl = new GameControl();
    this.gameControl.create();

    // load the fonts then callback to start the game when they're ready
    new FontLoaded(["mjd_font1", "mjd_font2", "mjd_font3"], this.playGame, this);
};


Main.prototype.playGame = function ()
{
    if (Main.debug)
        console.log("starting game loop");

    // add FPS display to identify slow systems
    var stats = null;
    if (Main.showFPS)
    {
        stats = new Stats();
        stats.showPanel(0);	// 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild(stats.dom);
    }

    var _this = this;

    // resize again in case an event was lost during the font loading delay
    EventHandlers.resizeCanvas();

    // handle the timed loop
    // this never exits
    var onLoop = function ()
    {
        // keep a real time clock, but only update it while this loop is running (debugger will pause somewhere inside the loop)
        Main._lastTime = Main.nowTime;
        Main.nowTime = Date.now();
        // cap the maximum time step at 50ms to reduce effect of spikes
        Main.elapsedTime = Math.min(Main.nowTime - Main._lastTime, 50);
        Main.time += Main.elapsedTime;

        // schedule the next timer
        requestAnimationFrame(onLoop);

        if (stats) stats.begin();

        // update the game
        _this.gameControl.update();

        // latch
        if (Main.resizeConsumed)
        {
            Main.resized = false;
            Main.resizeConsumed = false;
        }

        // resize polling
        EventHandlers.resizeCanvas();

// show the centre of the Main.puzzle layer for reference when adjusting the puzzle
// if (Main.centreSprite === undefined && _this.gameControl && !_this.gameControl.preloader.textureManager.pending)
// {
//     centreSprite = new Sprite();
//     centreSprite.create( Main.puzzle, "s24", _this.gameControl.preloader.textureManager );
//     centreSprite.anchor.set(0.5);
//     centreSprite.scale.set(0.2);
// }

        if (stats) stats.end();
    };

    // start the timer
    requestAnimationFrame(onLoop);
};


// loaded from configuration file "text_styles.json"
Main.createTextStyles = function (_dataManager)
{
    var ts = _dataManager.get("text_styles");

    Main.textStyleBold = Main.wrapTextStyle(ts.textStyleBold);
    Main.textStyleBoldHugeCentered = Main.wrapTextStyle(ts.textStyleBoldHugeCentered);
    Main.textStyleBoldButtons = Main.wrapTextStyle(ts.textStyleBoldButtons);
    Main.textStyleBoldButtonsLarge = Main.wrapTextStyle(ts.textStyleBoldButtonsLarge);
    Main.textStyleBoldButtonTitles = Main.wrapTextStyle(ts.textStyleBoldButtonTitles);
    Main.textStyleBoldLargeCentered = Main.wrapTextStyle(ts.textStyleBoldLargeCentered);
    Main.textStyleMedium = Main.wrapTextStyle(ts.textStyleMedium);
    Main.textStyleMedium2 = Main.wrapTextStyle(ts.textStyleMedium2);
    Main.textStyleMediumTiny = Main.wrapTextStyle(ts.textStyleMediumTiny);
    Main.textStyleVersionTiny = Main.wrapTextStyle(ts.textStyleVersionTiny);
    Main.textStyleLarge = Main.wrapTextStyle(ts.textStyleLarge);
    Main.textStyleSemiBold = Main.wrapTextStyle(ts.textStyleSemiBold);
};


Main.wrapTextStyle = function (_style)
{
    var ts = new PIXI.TextStyle();
    Utils.setValuesFromObject(ts, _style);
    return ts;
};


//
// Globally accessible helper functions
//

Main.render = function ()
{
    // draw everything in the stage with PIXI

    Main.renderer.render(Main.stage);

    if(Main.HTMLElement && (Main.HTMLElement.clientWidth!= Main.width || Main.HTMLElement.clientHeight!= Main.height) )
    {
        EventHandlers.resizeCanvas();
    }
};


Main.resetInput = function ()
{
    EventHandlers.resetInput();
    Main.click = null;
    Main.hover = null;
    Main.mouseDown = null;
    Main.mouseUp = null;
    Main.swipe = 0;
};


Main.getFocus = function ()
{
    if (Main.app && Main.app.view)
    {
        if (Main.debug)
            console.log("Main.getFocus - grab keyboard focus");

        // grab the focus so that keys will work in the Ark Connector environment
        Main.app.view.setAttribute("tabindex", "-1");
        Main.app.view.focus();
        // David Or suggests this might be better on new browsers...
        window.focus();
    }
    Keys.create();
};


// start the game (protect it against early start if using test-best with document.body check)

/*
 if ( document.body )
 new Main().createGame();
 */


