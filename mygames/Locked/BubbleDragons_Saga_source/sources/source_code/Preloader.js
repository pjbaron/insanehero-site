//
// handle initial loading of images and other game data
// creates managers to do the actual loading
//

function Preloader( _baseUrl )
{
	this.root = null;
	this.textureManager = null;
	this.dataManager = null;
	this.audioManager = null;
	this.localeManager = null;
	this.loadManager = null;
	this.lowResolution = false;
	// this.messageText = null;
	this.levels = 0;

	this.baseUrl = _baseUrl;
}


Preloader.prototype.preload = function( _root, _lowResolution )
{
	this.root = _root;
	this.lowResolution = _lowResolution;

	this.textureManager = new Textures( );
	this.textureManager.create();

	this.dataManager = new DataManager( );
	this.dataManager.create();

	this.localeManager = new Locale();

	this.audioManager = new AudioManager( );
	this.loadManager = new LoadSave( );

	// managers which need references to other managers...
	this.audioManager.create( this.getManagers() );
	this.loadManager.create( this.getManagers() );

	// first load the preloader images
    var res = (this.lowResolution ? "low" : "high")    
    this.textureManager.addImage( "load_spinner", this.baseUrl +"images/_reduced/" + res + "/preloader/loading.png" );
    this.textureManager.addImage( "preloader_bg", this.baseUrl +"images/_reduced/high/preloader/splash_screen.jpg" );
    this.textureManager.addImage( "square_red", this.baseUrl +"images/_reduced/high/preloader/redSquare.png" );
    this.textureManager.addImage( "square_green", this.baseUrl +"images/_reduced/high/preloader/greenSquare.png" );
    this.textureManager.addImage( "square_cyan", this.baseUrl +"images/_reduced/high/preloader/cyanSquare.png" );
    this.textureManager.addImage( "square_empty", this.baseUrl +"images/_reduced/high/preloader/emptySquare.png" );

	// after those are loaded, display them and start loading everything else
	this.textureManager.startLoading( this.preloaderReady, this );
};


Preloader.prototype.preloaderReady = function()
{
	var _this = this;

    Main.bottomUI.texture = this.textureManager.get("square_empty");
    Main.bottomUI.width = Main.bottomUI.rectWidth;
    Main.bottomUI.height = Main.height;
    Main.bottomUI.y = Main.bottomUI.parent.y;    // locked to the bottom of it's parent

    Main.topUI.texture = this.textureManager.get("square_empty");
    Main.topUI.width = Main.topUI.rectWidth;
    Main.topUI.height = Main.height;
    Main.topUI.y = -Main.topUI.parent.y;

	// the preloader background image has loaded, display it now
	this.bg = new Sprite();
	this.bg.create( Main.bgImage, "preloader_bg", this.textureManager );
	this.bg.anchor.set( 0.5 );

	this.loadWidget = new Sprite();
    this.loadWidget.create( Main.fullUI, "load_spinner", this.textureManager );
    this.loadWidget.anchor.set( 0.5 );
    this.loadWidget.scale.set( (this.lowResolution ? 4.0: 2.0) );

	//
	// queue everything else for preloading
	//

	var imageAssetPath = this.baseUrl + (this.lowResolution ? "images/_reduced/low/" : "images/_reduced/high/");

	// game titles
    this.textureManager.addImage( "game_title", imageAssetPath + "UI/TitlePage/title_bg.jpg" );
    this.textureManager.addImage( "title_text", imageAssetPath + "UI/TitlePage/title_bubdrag.png" );
    this.textureManager.addImage( "menu_play_button", imageAssetPath + "UI/TitlePage/button_start.png" );

	// menu components
	this.textureManager.addImage( "blanker", imageAssetPath + "menus/blanker.png" );
    this.textureManager.addAtlas( "panelsAtlas", imageAssetPath + "panelsAtlas.json", imageAssetPath + "panelsAtlas.png" );

	// in-game images
    this.textureManager.addAtlas( "gameAtlas", imageAssetPath + "gameAtlas.json", imageAssetPath + "gameAtlas.png" );
    //this.textureManager.addImage( "bubble_cursor", imageAssetPath + "bubbles/cursor.png" );
    
    // level backgrounds
    this.textureManager.addImage( "game_bg1", imageAssetPath + "backgrounds/forest-stage-bg.jpg" );
    this.textureManager.addImage( "game_bg2", imageAssetPath + "backgrounds/river-stage-bg.jpg" );
    this.textureManager.addImage( "game_bg3", imageAssetPath + "backgrounds/cave-stage-bg.jpg" );
    this.textureManager.addImage( "game_bg4", imageAssetPath + "backgrounds/desert-stage-bg.jpg" );
    this.textureManager.addImage( "game_bg5", imageAssetPath + "backgrounds/lake-stage-bg.jpg" );
    this.textureManager.addImage( "game_bg6", imageAssetPath + "backgrounds/cave-stage-bg2.jpg" );

	// start the preloading
	this.textureManager.startLoading();

	//
	// all audio assets
	//
    this.loadAudioAssets();

	//
	// all data assets
	// 
    var dataFile = this.baseUrl + "data/levelData.json";
    if ( !Main.challengeMode ) dataFile = this.baseUrl + "data/levelDataSaga.json";
    
	this.dataManager.loadData("levels", dataFile, function() {
        // set the actual number of game levels from loaded data
        _this.levels = _this.dataManager.get("levels").levels.length;
    });
	this.dataManager.loadData("text_styles",this.baseUrl + "data/text_styles.json", function() {
		// text_styles.json has loaded, we can initialise the text styles system now...
		Main.createTextStyles( _this.dataManager );
	} );
	this.dataManager.loadData("localizations",this.baseUrl + "data/locale/localization.json", function() {
			// localizations.json has loaded, we can initialise the Locale system
			// which will trigger a load of the appropriate strings file...
			_this.localeManager.create( _this.dataManager );
		} );
};


Preloader.prototype.loadAudioAssets = function()
{
    this.audioManager.loadAudio( "game_over_tune",this.baseUrl + "sounds/bgm_game_over", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "game_win_tune",this.baseUrl + "sounds/bgm_game_win", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "game_tune",this.baseUrl + "sounds/bgm_gameplay", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "game_title_tune",this.baseUrl + "sounds/bgm_opening", ["mp3","m4a","ogg"] );

    this.audioManager.loadAudio( "snd_bomb",this.baseUrl + "sounds/sfx_bomb_explosion", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_bubbleBounce",this.baseUrl + "sounds/sfx_bubble_bounce", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_fireball",this.baseUrl + "sounds/sfx_bubble_fireball", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_mine",this.baseUrl + "sounds/sfx_booster_mine", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_pop",this.baseUrl + "sounds/sfx_bubble_pop", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_shoot",this.baseUrl + "sounds/sfx_bubble_shoot", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_stick",this.baseUrl + "sounds/sfx_bubble_stick", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_dragon_zap",this.baseUrl + "sounds/sfx_booster_dragon_zap", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_click",this.baseUrl + "sounds/sfx_button_click", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_crack",this.baseUrl + "sounds/sfx_crack_open", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_firework_launch",this.baseUrl + "sounds/sfx_firework_launch", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_moves_up",this.baseUrl + "sounds/sfx_booster_extra_moves", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_popup_flying",this.baseUrl + "sounds/sfx_popup_movement", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_warning",this.baseUrl + "sounds/sfx_warning_sound", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_wing",this.baseUrl + "sounds/sfx_dragon_fly", ["mp3","m4a","ogg"] );

    this.audioManager.loadAudio( "snd_booster_award",this.baseUrl + "sounds/sfx_booster_gained", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_stick_top",this.baseUrl + "sounds/sfx_bubble_stick_top", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_collect_fish",this.baseUrl + "sounds/sfx_collect_fish", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_ice_crack",this.baseUrl + "sounds/sfx_ice_break", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_dragon_fire",this.baseUrl + "sounds/sfx_special_dragon_fire", ["mp3","m4a","ogg"] );
    this.audioManager.loadAudio( "snd_rainbow",this.baseUrl + "sounds/sfx_special_wild", ["mp3","m4a","ogg"] );

};


Preloader.prototype.cleanUp = function()
{
	this.root = null;

	if ( this.loadWidget )
	{
		this.loadWidget.destroy();
		this.loadWidget = null;
	}

	if ( this.bg )
	{
		this.bg.destroy();
		this.bg = null;
	}
};


Preloader.prototype.update = function()
{
    // update loading animation
    if ( this.loadWidget )
    {
        this.loadWidget.rotation += Math.PI / 180;
        this.loadWidget.update();
    }
};


Preloader.prototype.allLoaded = function()
{
	var done = (this.textureManager.pending === 0 && this.dataManager.pending === 0 && this.audioManager.pending === 0 );

	// if we've just finished loading everything
	if ( done && this.bg )
	{
		this.cleanUp();
		return true;
	}

	return false;
};


Preloader.prototype.getManagers = function()
{
	return { preloader: this, textures: this.textureManager, data: this.dataManager, audio: this.audioManager, locale: this.localeManager, loadSave: this.loadManager };
};
