//
// handle initial loading of images and other game data
// creates managers to do the actual loading
//

function Preloader( baseUrl)
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

	this.baseUrl = baseUrl;
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
	for ( var i = 0; i <= 67; i++ )
	{
		this.textureManager.addImage( "loading_" + i.toString(), this.baseUrl +"images/_reduced/high/preloader/frame_" + i.toString() + "_delay-0.03s.png" );
	}
    this.textureManager.addImage( "preloader_bg", this.baseUrl +"images/_reduced/high/preloader/title_bg.jpg" );

	// after those are loaded, display them and start loading everything else
	this.textureManager.startLoading( this.preloaderReady, this );
};


Preloader.prototype.preloaderReady = function()
{
	var _this = this;

	// the preloader background image has loaded, display it now
	this.bg = new Sprite();
	this.bg.create( Main.background, "preloader_bg", this.textureManager );
	this.bg.anchor.set( 0.5, 1.0 );
	this.bg.y = Main.height / 2 / this.bg.parent.scale.y;

	this.effects = new Effects();
	this.effects.create( this.textureManager );
	this.effects.add( Effects.PRELOADER, Main.fullUI, 0, 0 );

	// var t = new Text( "Mahjongg Dark Dimensions\nLoading...", Main.textStyleBoldLargeCentered, false );
	// t.create( Main.fullUI, 0, 0, true );
	// t.anchor.set( 0.5 );
	// this.messageText = t;

	//
	// queue everything else for preloading
	//

	var imageAssetPath = this.baseUrl + (this.lowResolution ? "images/_reduced/low/" : "images/_reduced/high/");

	// game titles
	this.textureManager.addImage( "game_title", imageAssetPath + "UI/bg.jpg" );
	this.textureManager.addImage( "letter_m", imageAssetPath + "intro/m.png" );
	this.textureManager.addImage( "letter_a", imageAssetPath + "intro/a.png" );
	this.textureManager.addImage( "letter_h", imageAssetPath + "intro/h.png" );
	this.textureManager.addImage( "letter_j", imageAssetPath + "intro/j.png" );
	this.textureManager.addImage( "letter_o", imageAssetPath + "intro/logo_tiles.png" );
	this.textureManager.addImage( "letter_n", imageAssetPath + "intro/n.png" );
	this.textureManager.addImage( "letter_g", imageAssetPath + "intro/g.png" );
	this.textureManager.addImage( "title_dimensions", imageAssetPath + "intro/logo_dimensions.png" );
	this.textureManager.addImage( "title_panel", imageAssetPath + "intro/logo_panel.png" );

	// menu components
	this.textureManager.addImage( "blanker", imageAssetPath + "menus/blanker.png" );
	this.textureManager.addImage( "menu_bg", imageAssetPath + "menus/backboard.png" );
	this.textureManager.addImage( "menu_popup_bg", imageAssetPath + "menus/popup.png" );
	this.textureManager.addImage( "menu_check", imageAssetPath + "menus/check.png" );
	this.textureManager.addImage( "menu_check_box", imageAssetPath + "menus/check-box.png" );
	this.textureManager.addImage( "menu_check_box_over", imageAssetPath + "menus/check-box-rollover.png" );
	this.textureManager.addImage( "menu_close_button", imageAssetPath + "menus/close.png" );
	this.textureManager.addImage( "menu_close_button_over", imageAssetPath + "menus/close_rollover.png" );
	this.textureManager.addImage( "menu_close_button_down", imageAssetPath + "menus/close-down.png" );
	this.textureManager.addImage( "menu_tab1_off", imageAssetPath + "menus/basic-gameplay-off.png" );
	this.textureManager.addImage( "menu_tab1_off_over", imageAssetPath + "menus/basic-gameplay-off-rollover.png" );
	this.textureManager.addImage( "menu_tab1_on", imageAssetPath + "menus/basic-gameplay-on.png" );
	this.textureManager.addImage( "menu_tab2_off", imageAssetPath + "menus/max-your-score-button-off.png" );
	this.textureManager.addImage( "menu_tab2_off_over", imageAssetPath + "menus/max-your-score-button-off-rollover.png" );
	this.textureManager.addImage( "menu_tab2_on", imageAssetPath + "menus/max-your-score-button-on.png" );
	this.textureManager.addImage( "menu_help_button", imageAssetPath + "menus/help.png" );
	this.textureManager.addImage( "menu_help_button_over", imageAssetPath + "menus/help_rollover.png" );
	this.textureManager.addImage( "menu_help_button_down", imageAssetPath + "menus/help-down.png" );

	this.textureManager.addImage( "menu_music_button", imageAssetPath + "menus/music.png" );
	this.textureManager.addImage( "menu_music_button_over", imageAssetPath + "menus/music_rollover.png" );
	this.textureManager.addImage( "menu_music_button_down", imageAssetPath + "menus/music-down.png" );
	this.textureManager.addImage( "menu_music_button_mute", imageAssetPath + "menus/music-no.png" );
	this.textureManager.addImage( "menu_music_button_mute_over", imageAssetPath + "menus/music-no_rollover.png" );
	this.textureManager.addImage( "menu_music_button_mute_down", imageAssetPath + "menus/music-no-down.png" );
	this.textureManager.addImage( "menu_sound_button", imageAssetPath + "menus/sound.png" );
	this.textureManager.addImage( "menu_sound_button_over", imageAssetPath + "menus/sound_rollover.png" );
	this.textureManager.addImage( "menu_sound_button_down", imageAssetPath + "menus/sound-down.png" );
	this.textureManager.addImage( "menu_sound_button_mute", imageAssetPath + "menus/sound-no.png" );
	this.textureManager.addImage( "menu_sound_button_mute_over", imageAssetPath + "menus/sound-no_rollover.png" );
	this.textureManager.addImage( "menu_sound_button_mute_down", imageAssetPath + "menus/sound-no-down.png" );
	this.textureManager.addImage( "menu_quit_button", imageAssetPath + "menus/quit.png" );
	this.textureManager.addImage( "menu_quit_button_over", imageAssetPath + "menus/quit_rollover.png" );
	this.textureManager.addImage( "menu_quit_button_down", imageAssetPath + "menus/quit-down.png" );
	this.textureManager.addImage( "menu_slider_tab", imageAssetPath + "menus/slider.png" );
	this.textureManager.addImage( "menu_slider_bar", imageAssetPath + "menus/slider-bar.png" );
	this.textureManager.addImage( "menu_play_button", imageAssetPath + "menus/play-button.png" );
	this.textureManager.addImage( "menu_play_button_over", imageAssetPath + "menus/play-button-rollover.png" );
	this.textureManager.addImage( "menu_play_button_down", imageAssetPath + "menus/play-button-down.png" );
	this.textureManager.addImage( "menu_matching_rules", imageAssetPath + "menus/matching_rules.png" );
    this.textureManager.addImage( "menu_timebonus", imageAssetPath + "menus/time-bonus.png" );
    this.textureManager.addImage( "menu_speedmatch", imageAssetPath + "menus/x2_speedmatch.png" );
	this.textureManager.addImage( "menu_multimatch", imageAssetPath + "menus/x5_multimatch.png" );


	// in-game images
	this.textureManager.addImage( "game_bg", imageAssetPath + "UI/bg.jpg" );
	this.textureManager.addImage( "rotate_lft_button", imageAssetPath + "UI/arrow_lft.png" );
	this.textureManager.addImage( "rotate_lft_button_over", imageAssetPath + "UI/arrow_lft-rollover.png" );
	this.textureManager.addImage( "rotate_rgt_button", imageAssetPath + "UI/arrow_rgt.png" );
	this.textureManager.addImage( "rotate_rgt_button_over", imageAssetPath + "UI/arrow_rgt-rollover.png" );
	this.textureManager.addImage( "reshuffle_button", imageAssetPath + "UI/reshuffle_button.png" );
	this.textureManager.addImage( "reshuffle_button_over", imageAssetPath + "UI/reshuffle_button-rollover.png" );
	this.textureManager.addImage( "reshuffle_button_down", imageAssetPath + "UI/reshuffle_button-down.png" );
	this.textureManager.addImage( "pause_button", imageAssetPath + "UI/pause_button.png" );
	this.textureManager.addImage( "pause_button_over", imageAssetPath + "UI/pause_button-rollover.png" );
	this.textureManager.addImage( "pause_button_down", imageAssetPath + "UI/pause_button-down.png" );
	this.textureManager.addImage( "score_icon", imageAssetPath + "UI/score icon.png" );
	this.textureManager.addImage( "time_icon", imageAssetPath + "UI/time icon.png" );
	this.textureManager.addImage( "preview_container", imageAssetPath + "UI/preview-tile-icon.png" );
	this.textureManager.addImage( "speedmatch", imageAssetPath + "effects/noglowtext/speedmatch.png" );
    this.textureManager.addImage( "multimatch", imageAssetPath + "effects/noglowtext/multimatch.png" );
    this.textureManager.addImage( "timematch", imageAssetPath + "effects/noglowtext/time-bonus.png" );
    this.textureManager.addImage( "colon", imageAssetPath + "effects/noglowtext/timecolon.png" );
	this.textureManager.addImage( "speed0", imageAssetPath + "effects/noglowtext/SM0.png" );
	this.textureManager.addImage( "speed1", imageAssetPath + "effects/noglowtext/SM1.png" );
	this.textureManager.addImage( "speed2", imageAssetPath + "effects/noglowtext/SM2.png" );
	this.textureManager.addImage( "speed3", imageAssetPath + "effects/noglowtext/SM3.png" );
	this.textureManager.addImage( "speed4", imageAssetPath + "effects/noglowtext/SM4.png" );
	this.textureManager.addImage( "speed5", imageAssetPath + "effects/noglowtext/SM5.png" );
	this.textureManager.addImage( "speed6", imageAssetPath + "effects/noglowtext/SM6.png" );
	this.textureManager.addImage( "speed7", imageAssetPath + "effects/noglowtext/SM7.png" );
	this.textureManager.addImage( "speed8", imageAssetPath + "effects/noglowtext/SM8.png" );
	this.textureManager.addImage( "speed9", imageAssetPath + "effects/noglowtext/SM9.png" );
	this.textureManager.addImage( "multi0", imageAssetPath + "effects/noglowtext/MM0.png" );
	this.textureManager.addImage( "multi1", imageAssetPath + "effects/noglowtext/MM1.png" );
	this.textureManager.addImage( "multi2", imageAssetPath + "effects/noglowtext/MM2.png" );
	this.textureManager.addImage( "multi3", imageAssetPath + "effects/noglowtext/MM3.png" );
	this.textureManager.addImage( "multi4", imageAssetPath + "effects/noglowtext/MM4.png" );
	this.textureManager.addImage( "multi5", imageAssetPath + "effects/noglowtext/MM5.png" );
	this.textureManager.addImage( "multi6", imageAssetPath + "effects/noglowtext/MM6.png" );
	this.textureManager.addImage( "multi7", imageAssetPath + "effects/noglowtext/MM7.png" );
	this.textureManager.addImage( "multi8", imageAssetPath + "effects/noglowtext/MM8.png" );
	this.textureManager.addImage( "multi9", imageAssetPath + "effects/noglowtext/MM9.png" );


	var i;

	// load the blank tile images
	for ( i = 1; i <= 9; i++ )
	{
        this.textureManager.addImage( "tile_" + i.toString(), imageAssetPath + "cube/tile_0000" + i.toString() + ".png" );
        this.textureManager.addImage( "time_tile_" + i.toString(), imageAssetPath + "cube/time_tile_0000" + i.toString() + ".png" );
		// this.textureManager.addImage( "mask_" + i.toString(), imageAssetPath + "cube/tile_0000" + i.toString() + ".png" );
	}

	// load the symbols to apply to the tiles
	for ( i = 1; i <= 44; i++ )
	{
        this.textureManager.addImage( "s" + i.toString(), imageAssetPath + "icons/" + i.toString() + ".png" );
	}
    this.textureManager.addImage( "timeText_icon", imageAssetPath + "icons/time_icon.png" );

	// load the effects animations
	for ( i = 1; i <= 30; i++ )
	{
		var fname = "matchEffect00" + Utils.padToLength(i.toString(), 2, "0", false);
		this.textureManager.addImage( "fx_m" + i.toString(), imageAssetPath + "effects/match/" + fname + ".png" );
	}

	// start the preloading
	this.textureManager.startLoading();

	//
	// all audio assets
	//
    this.loadAudioAssets();

	//
	// all data assets
	// 
	this.dataManager.loadData("levels",this.baseUrl + "data/mahjongg_dimensions_levelData.json");
	this.dataManager.loadData("symbol_offsets",this.baseUrl + "data/symbol_offsets.json");
	this.dataManager.loadData("text_styles",this.baseUrl + "data/text_styles.json", function() {
		// text_styles.json has loaded, we can initialise the text styles system now...
		Main.createTextStyles( _this.dataManager );
	} );
	this.dataManager.loadData("localizations",this.baseUrl + "data/locale/localization.json", function() {
			// localizations.json has loaded, we can initialise the Locale system
			// which will trigger a load of the appropriate strings file...
			_this.localeManager.create( _this.dataManager );
		} );
	this.levels = 3;
};


Preloader.prototype.loadAudioAssets = function()
{
    this.audioManager.loadAudio( "game_tune",this.baseUrl + "sounds/music_loop", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_clickPlay",this.baseUrl + "sounds/play_button_press", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_rollOver",this.baseUrl + "sounds/menu_rollover_generic", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_clickTile",this.baseUrl + "sounds/click_tile", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_correct1",this.baseUrl + "sounds/correct_sound_1", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_correct2",this.baseUrl + "sounds/correct_sound_2", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match1",this.baseUrl + "sounds/tilematch1", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match2",this.baseUrl + "sounds/tilematch2", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match3",this.baseUrl + "sounds/tilematch3", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match4",this.baseUrl + "sounds/tilematch4", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match5",this.baseUrl + "sounds/tilematch5", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match6",this.baseUrl + "sounds/tilematch6", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match7",this.baseUrl + "sounds/tilematch7", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match8",this.baseUrl + "sounds/tilematch8", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match9",this.baseUrl + "sounds/tilematch9", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match10",this.baseUrl + "sounds/tilematch10", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match11",this.baseUrl + "sounds/tilematch11", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match12",this.baseUrl + "sounds/tilematch12", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match13",this.baseUrl + "sounds/tilematch13", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match14",this.baseUrl + "sounds/tilematch14", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match15",this.baseUrl + "sounds/tilematch15", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_match16",this.baseUrl + "sounds/tilematch16", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_error1",this.baseUrl + "sounds/error_sound_1", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_error2",this.baseUrl + "sounds/error_sound_2", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_error3",this.baseUrl + "sounds/error_sound_3", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_rotate",this.baseUrl + "sounds/rotate", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_startSting",this.baseUrl + "sounds/game_opening_sting", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_endSting",this.baseUrl + "sounds/level_end", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_reshuffle1",this.baseUrl + "sounds/reshuffle_1", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_reshuffle2",this.baseUrl + "sounds/reshuffle_2", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_timerWarning",this.baseUrl + "sounds/timer_warning", ["mp3","mp4","ogg"] );
    this.audioManager.loadAudio( "snd_timeUp",this.baseUrl + "sounds/out_of_time_sting", ["mp3","mp4","ogg"] );
};


Preloader.prototype.cleanUp = function()
{
	this.root = null;

	if ( this.effects )
	{
		this.effects.destroy();
		this.effects = null;
	}

	if ( this.bg )
	{
		this.bg.destroy();
		this.bg = null;
	}
};


Preloader.prototype.update = function()
{
	// update special effects (e.g. loading animation)
	if ( this.effects )
		this.effects.update();
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
