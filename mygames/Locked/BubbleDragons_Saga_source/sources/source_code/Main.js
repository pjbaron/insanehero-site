//
// Main.js
//
// Pete Baron 2017
//
//
// Top level wrapper for Bubble Shooter
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
// Main          - Top level wrapper for Bubble Shooter with RAF timer loop
//  GameControl  - game state machine controls whole game sequencing
//   Preloader   - handle initial loading of images and other game data
//   Titles      - game title screen code and data
//   Game        - central controller for all in-game updates and displays, handles in-game flow (end of level -> advance to next)
//    World      - game environment management, background, ui, etc
//
//       Sprite  - wrapper for PIXI.Sprite with additional functionality (e.g. percentage based positioning)
// 


function Main()
{
    Main.self = this;

    // debug information and settings
    Main.VERSION = "v2.22";     // TODO: update this for every release

    Main.testKeys = true;		// TODO: ensure this is false for final release, cheat keys are enabled
    Main.debug = true;			// TODO: ensure this is false for final release, many code actions are spammed to console
    Main.debugSpam = false;     // TODO: false for release, particularly minor details are spammed to console
    Main.showFPS = false;		// TODO: ensure this is false for final release, shows the Frames Per Second widget
    Main.showLockedCursor = false;  // TODO: ensure this is false for final release, enables a cursor where the bubble will stop
    Main.fastLevelSwitch = false;  // TODO: ensure this is false for final release, permits faster paging through levels
    Main.generateLevels = false; // TODO: false for release, generates a random set of levels using CreateLevelData
    Main.accessLocked = true;   // TODO: false for release, allows the player to start 'locked' levels without unlocking them first
    Main.resetLocalStorage = false;  // TODO: false for release, resets all localStorage as if the game has never been played on this machine
    // game option flags and constants

    // 'saga' mode has level select screens and theoretically infinite levels... if this
    // is true then we are building for 'challenge' mode instead
    Main.challengeMode = false;

    // combine this with Main.challengeMode both true to generate the level data
    // the game will play as usual, the level data will be output into the console.log
    // disable Main.debug and Main.debugSpam or the output will be mixed with other console logging
    // specify the first and last level number you want to create (1 based so the lowest level is one, not zero)
    Main.generateLevelData = false;
    Main.generateFirstLevel = 1;
    Main.generateLastLevel = 100;

    // for 'saga' mode how many levels will we actually offer before the player has 'won'
    Main.numSagaLevels = 100;

    // pauseOnFocusLoss : boolean
    // If true then the game will fade out the game tiles and display a 'click to continue'
    // panel when focus is changed to a different window or browser tab.
    // If false the the game will continue to play regardless of these events.
    Main.pauseOnFocusLoss = false;

    // playAgainCount : integer
    // At the end of each game the player will be offered a choice of "submit score"
    // AND "play again" for Main.playAgainCount times before they are only offered "submit score".
    // If playAgainCount is zero, "play again" will not be offered at all.
    Main.playAgainCount = 0;

    // totalShots : integer
    // How many shots does the player start with in each new game.
    Main.totalShots = 0;

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
    Main.eventChangeAdOnIdle = 0;
    Main.idleTimer = Number.MAX_VALUE;  // no timer until first click

    // game constants
    Main.timerStart = (2 * 60 + 0) * 1000 + 999;		// milliseconds
    Main.gameWide = 1520;
    Main.gameHigh = 1310;
    Main.volumeControl = 0.5;                           // global volume control multiplier
    Main.shortTapDurationMS = 400;

    // input control variables (global for easy access from anywhere)
    Main.click = null;
    Main.hover = null;
    Main.mouseDown = null;
    Main.mouseUp = null;
    Main.swipe = 0;
    Main.swipeEnabled = false;

    // globally accessible
    Main.forceResize = false;
    Main.resized = false;
    Main.resizeConsumed = false;
    Main.time = 0;
    Main.elapsedTime = 0;
    Main.muteUntil = -1;
    Main.countryCode = "en-US";
    Main.nowTime = 0;
    Main.repeatedGamesLeft = 0;
    Main.aspectRatio = 1.0;
    Main.isPortrait = false;
    Main.lowResolutionAssets = false;
    Main.suppressBigAnimations = false;
    Main.pieceScale = 1.0;
    Main.marginWidth = 0;
    
    // static
    Main._lastTime = 0;

    // system
    this.gameControl = null;

    // make sure this value is not null/undefined/0 (it will crash LevelSelect)
    if ( !window.devicePixelRatio )
        window.devicePixelRatio = 1;
}


// static, record time when the game started
Main.timeStarted = Date.now();
Main.width = null;
Main.height = null;
Main.HTMLElement = null;
Main.shiftPlayfield = 0.37083333;   // scaling factor for height to calculate size of side panel
Main.self = null;
Main.lockedLevels = null;
Main.levelScores = null;
Main.levelStars = null;
Main.levelLosses = null;


Main.prototype.createGame = function (width, height, elementId)
{
    // create game event handlers
    new EventHandlers();
    EventHandlers.resizeCanvas();

    // used for no-build-required local testing only
    if ( !Main.arenaHelper )
        Main.arenaHelper = new ArenaHelper();

    // create game renderer (PIXI)
    var pixelRatio = (window) ? (window.devicePixelRatio) : 1;
    Main.app = new PIXI.Application(width || Main.gameWide, height || Main.gameHigh, {
        autoResize: true,
        resolution:pixelRatio
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
    Main.bgImage = new PIXI.Sprite();
    Main.bgImage.anchor.set(0.5, 0.5);
    Main.stage.addChild(Main.bgImage);

    // background layer (for scenery between background and bubbles, e.g. game edges)
    // NOTE: matches size and offset of gameUILayer - this is required so that bubbleToGameUi matches for barrier breaking detection
    Main.backgroundLayer = new PIXI.Sprite();
    Main.backgroundLayer.anchor.set(0.5, 0.5);
    Main.stage.addChild(Main.backgroundLayer);

    // bubble container (centred horizontally, fixed to bottom)
    Main.bubbleLayer = new PIXI.Sprite();
    Main.bubbleLayer.anchor.set(0.5, 1.0);
    Main.stage.addChild(Main.bubbleLayer);

    // game UI layer (for bubble to shoot, trajectory, etc)
    // NOTE: matches size and offset of backgroundLayer - this is required so that bubbleToGameUi matches for barrier breaking detection
    Main.gameUILayer = new PIXI.Sprite();
    Main.gameUILayer.anchor.set(0.5, 0.5);
    Main.stage.addChild(Main.gameUILayer);

    // bottom UI container (centred horizontally, fixed to bottom)
    Main.bottomUI = new PIXI.Sprite();
    Main.bottomUI.anchor.set(0.5, 1.0);
    Main.stage.addChild(Main.bottomUI);

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
    _gameGATracker("create", "UA-68188765-28", "auto");                 // TODO: get new GA code
    _gameGATracker("send", "pageview", {"page": "/LoadingScene"});

    // start time system
    Main.nowTime = Date.now();
    Main.time = 0;

    // game can be replayed X times then it must exit to the connector game-over
    Main.repeatedGamesLeft = Main.playAgainCount;

    // create the game controller
    this.gameControl = new GameControl();
    this.gameControl.create();

    // create level data for all game levels... debug feature should not be enabled for releases
    // (the level data should already be in data/levelDataSaga.json)
    if ( Main.generateLevelData )
    {
        CreateLevelData.createAllData();
        return;
    }

    // load the fonts then callback to start the game when they're ready
    new FontLoaded(["bub_font1", "bub_font2"], this.playGame, this);
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

    // make sure PIXI is not running a RAF loop also
    var ticker = PIXI.ticker.shared;
    ticker.autoStart = false;
    ticker.stop();
    ticker = PIXI.ticker;
    ticker.autoStart = false;

    // handle the timed loop
    // this never exits
    var inLoop = false;
    var onLoop = function ()
    {
        // in case the framerate is higher than the CPU can manage
        if ( !inLoop )
        {
            inLoop = true;
            // keep a real time clock, but only update it while this loop is running (debugger will pause somewhere inside the loop)
            Main._lastTime = Main.nowTime;
            Main.nowTime = Date.now();
            // cap the maximum time step at 33ms (30fps) to limit the effect of huge spikes
            Main.elapsedTime = Math.min(Main.nowTime - Main._lastTime, 33);
            Main.time += Main.elapsedTime;

            // schedule the next timer
            requestAnimationFrame(onLoop);

            if (stats) stats.begin();

            // after the screen is resized (or the game sets this flag to refresh all)...
            if ( Main.resized )
            {
                // enforced delay after a resize before game updates
                // prevents display flicker from rapid dragging of the frame
                if ( Main.nowTime - Main.resizeTime > 100 )
                {
                    EventHandlers.resizeContent();
                    // then update the game (Sprite/Text set the resizedConsumed latch used below)
                    _this.gameControl.update();
                }
            }
            else
            {
                // update the game
                _this.gameControl.update();
            }

            // latch
            if (Main.resizeConsumed)
            {
                Main.resized = false;
                Main.resizeConsumed = false;
            }

            // force resize event handler
            if (Main.forceResize)
            {
                EventHandlers.resizeCanvas();
            }

            if (stats) stats.end();
            inLoop = false;
        }
        else
        {
            // schedule the next timer
            requestAnimationFrame(onLoop);
        }
    };

    // start the timer
    requestAnimationFrame(onLoop);
};


// loaded from configuration file "text_styles.json"
Main.createTextStyles = function (_dataManager)
{
    var ts = _dataManager.get("text_styles");

    Main.textStyleVersionTiny = Main.wrapTextStyle(ts.textStyleVersionTiny);
    Main.textStyleBigMessageTitle = Main.wrapTextStyle(ts.textStyleBigMessageTitle);
    Main.textStyleBigMessage = Main.wrapTextStyle(ts.textStyleBigMessage);
    Main.textStyleMediumMessage = Main.wrapTextStyle(ts.textStyleMediumMessage);
    Main.textStyleBigMessageSubText = Main.wrapTextStyle(ts.textStyleBigMessageSubText);
    Main.textStyleBigMessageObjective = Main.wrapTextStyle(ts.textStyleBigMessageObjective);
    Main.textStyleBigMessageObjTitle = Main.wrapTextStyle(ts.textStyleBigMessageObjTitle);
    Main.textStyleHelpBannerTitle = Main.wrapTextStyle(ts.textStyleHelpBannerTitle);
    Main.textStyleHelpBoostTitle = Main.wrapTextStyle(ts.textStyleHelpBoostTitle);
    Main.textStyleHelpBoostDescription = Main.wrapTextStyle(ts.textStyleHelpBoostDescription);
    Main.textStyleUIScoreAndShots = Main.wrapTextStyle(ts.textStyleUIScoreAndShots);
    Main.textStyleUILevelNumber = Main.wrapTextStyle(ts.textStyleUILevelNumber);
    Main.textStyleSelectLevelNumber = Main.wrapTextStyle(ts.textStyleSelectLevelNumber);
    Main.textStyleShowLevelNumber = Main.wrapTextStyle(ts.textStyleShowLevelNumber);
    
    Main.textStyleBold = Main.wrapTextStyle(ts.textStyleBold);
    Main.textStyleBoldSmall = Main.wrapTextStyle(ts.textStyleBoldSmall);
    Main.textStyleBoldButtons = Main.wrapTextStyle(ts.textStyleBoldButtons);
    Main.textStyleBoldButtonsLarge = Main.wrapTextStyle(ts.textStyleBoldButtonsLarge);
    Main.textStyleBoldButtonTitles = Main.wrapTextStyle(ts.textStyleBoldButtonTitles);
    Main.textStyleBoldLargeCentered = Main.wrapTextStyle(ts.textStyleBoldLargeCentered);
    Main.textStyleMedium = Main.wrapTextStyle(ts.textStyleMedium);
    Main.textStyleMedium2 = Main.wrapTextStyle(ts.textStyleMedium2);
    Main.textStyleMediumTiny = Main.wrapTextStyle(ts.textStyleMediumTiny);
    Main.textStyleLarge = Main.wrapTextStyle(ts.textStyleLarge);
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

    // resize if canvas has changed (device orientation shift)
    EventHandlers.resizeCanvas();
};


Main.unlockLevel = function( _level )
{
    if (Main.debug)
        console.log("unlocked level " + _level);
    
    if ( !Main.lockedLevels )
        Main.lockedLevels = [];
    Main.lockedLevels[_level] = false;
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
        // if (Main.debug)
        //     console.log("Main.getFocus - grab keyboard focus");

        // grab the focus so that keys will work in the Ark Connector environment
        Main.app.view.setAttribute("tabindex", "-1");
        Main.app.view.focus();
    }
    Keys.create();
};


// start the game (protect it against early start if using test-best with document.body check)

/*
 if ( document.body )
 new Main().createGame();
 */


