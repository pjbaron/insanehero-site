//
// LoadSave.js
//
// Pete Baron 2017
//
// load or save game variables to local storage
//



function LoadSave( )
{
	this.managers = null;

    // erase all of the game's local storage when requested
    // or when new level data is generated which invalidates the saved game data
    if ( Main.resetLocalStorage || Main.generateLevelData )
        localStorage.clear();
}


LoadSave.prototype.create = function( _managers )
{
	this.managers = _managers;
};


LoadSave.prototype.destroy = function()
{
	this.managers = null;
};


LoadSave.prototype.loadGameStatus = function()
{
	if ( Main.debug )
		console.log("loadGameStatus");

	/*jshint -W069 */ // jsLint doesn't like the ["string"] notation required by localStorage
	var status = localStorage["BubbleBoo2_status"];
	if ( status )
	{
		var block = JSON.parse( status );

		if ( Main.debug )
			console.log("sfx = ", block.sfxVolume, block.sfxMute, "music = ", block.musicVolume, block.musicMute);

		this.managers.audio.setMute( block.sfxMute, true );
		this.managers.audio.muteTunes( block.musicMute, true );
		AudioManager.sfxVolume = block.sfxVolume;
		this.managers.audio.setMusicVolume( block.musicVolume );
        Main.lockedLevels = block.lockedLevels || [];
        Main.levelScores = block.levelScores || [];
        Main.levelStars = block.levelStars || [];
        Main.levelLosses = block.levelLosses || [];
		return true;
	}

    Main.lockedLevels = [];
    Main.levelScores = [];
    Main.levelStars = [];
    Main.levelLosses = [];

	if ( Main.debug )
		console.log("Game data is not available in localStorage.");
	return false;
};


LoadSave.prototype.saveGameStatus = function()
{
	if ( Main.debug )
		console.log("saveGameStatus");

	var block = {
		sfxVolume: AudioManager.sfxVolume,
		musicVolume: AudioManager.musicVolume,
		sfxMute: this.managers.audio.mute,
		musicMute: this.managers.audio.tunesMuted,
        lockedLevels: Main.lockedLevels,
        levelScores: Main.levelScores,
        levelStars: Main.levelStars,
        levelLosses: Main.levelLosses
	};
	var jsonString = JSON.stringify( block );

	/*jshint -W069 */ // jsLint doesn't like the ["string"] notation required by localStorage
	localStorage["BubbleBoo2_status"] = jsonString;

	return true;
};
