//
// AudioManager.js
//
// Pete Baron 2017
//
// Loads and accesses audio files, relies on Howler library
//

// http://goldfirestudios.com/blog/104/howler.js-Modern-Web-Audio-Javascript-Library




function AudioManager( )
{
	this.list = null;
	this.mute = false;
	this.gameTune = null;
	this.tunesMuted = false;
	this.rememberMute = undefined;
	this.rememberTunesMuted = undefined;
	this.delayed = null;
	this.pending = 0;
	this.managers = null;
    this.playedThisFrame = null;
}


AudioManager.sfxVolume = 0.75;
AudioManager.musicVolume = 1.0;


AudioManager.prototype.create = function( _managers )
{
	this.managers = _managers;

	this.list = [];
	this.delayed = [];
	this.pending = 0;
    this.playedThisFrame = [];

	this.mute = false;
	this.tunesMuted = false;
	
	AudioManager.sfxVolume = 0.75;
	AudioManager.musicVolume = 0.5;
};


AudioManager.prototype.destroy = function()
{
	this.managers = null;

	if ( this.list )
	{
		for(var i in this.list)
		{
			if ( this.list.hasOwnProperty(i) )
			{
				var sound = this.list[i];
				sound.unload();
				this.list[i] = null;
			}
		}
		this.list = null;
	}

	this.delayed = null;
	this.gameTune = null;
	this.delayed = null;
    this.playedThisFrame = null;
};


AudioManager.prototype.update = function()
{
    if (Main.isAndroid && Main.isChromeMobile) return;

    var now = Main.time;
    for( var i = this.delayed.length - 1; i >= 0; --i )
    {
        var p = this.delayed[i];

        // check if the delayed sound has been cancelled
        if ( p.cancelCallback && p.cancelCallback.call( p.context, now > p.time ) )
        {
            this.delayed.splice(i, 1);
            continue;
        }

        // check if it's time to play the delayed sound yet
        if ( now > p.time )
        {
            if ( p.playCallback )
                p.playCallback.call( this );
            var sfx = this.list[ p.key ];
            sfx.play();
            this.delayed.splice(i, 1);
        }
    }

    // reset the list of sounds we have played during this frame
    this.playedThisFrame = [];
};


AudioManager.prototype.loadAudio = function( _key, _path, _subScripts )
{
	var urls = [];
	for(var i = 0, l = _subScripts.length; i < l; i++)
	{
		urls.push( _path + "." + _subScripts[i] );
	}
	this.pending++;

    if ( Main.debugSpam )
		console.log( "AudioManager.loadAudio " + _key + " " + _path );

	var _this = this;
	this.list[ _key ] = new Howl({
		src: urls,
		onload: function() {
			_this.pending--;
		} });
};


// if provided with an array of keys, will pick one randomly to play
AudioManager.prototype.play = function( _key )
{
	if ( this.mute || (Main.isAndroid && Main.isChromeMobile) )
		return null;

	if ( Array.isArray( _key ) )
	{
		var key = Utils.pickRandomFromList( _key );
		return this._playOne( key );
	}
	return this._playOne( _key );
};


AudioManager.prototype._playOne = function( _key )
{
    // restriction on Android+Chrome audio which didn't work for MJD
	if (Main.isAndroid && Main.isChromeMobile) return null;

	if ( _key && this.list && this.list[ _key ] )
	{
		// don't play sound effects when browser has been tabbed away and is only just showing again
		if ( Main.muteUntil <= Main.time )
		{
			var sfx = this.list[ _key ];
            if ( sfx._state != "loaded" )
            {
                if ( Main.debug )
                    console.log("AudioManager.playOne " + _key + " SFX not loaded!");
                return null;
            }

            // don't play multiple versions of the same sound effect in a single frame
            // https://trello.com/c/I3l7NwB4/492-music-can-stop-playing-when-too-many-sounds-are-playing
            if ( this.playedThisFrame.indexOf(_key) != -1 )
                return null;
            this.playedThisFrame.push( _key );

			sfx.volume( AudioManager.sfxVolume );
            var res = sfx.play();

            if ( Main.debug )
            {
                //console.log("AudioManager.playOne", _key, "=", res);
                if ( !res )
                    console.log("SFX not playable!");
            }
			return sfx;
		}

	}
	return null;
};


// _delay in seconds
AudioManager.prototype.playDelayed = function( _key, _delay, _playCallback, _cancelCallback, _context )
{
	if (Main.isAndroid && Main.isChromeMobile) return null;

	if ( Array.isArray( _key ) )
	{
		_key = Utils.pickRandomFromList( _key );
	}

	if ( _key && this.list && this.list[ _key ] && !this.mute )
	{
		//console.log("AudioManager.playDelayed", _key);
		this.delayed.push( { key:_key, time: Main.time + _delay * 1000, playCallback: _playCallback, cancelCallback: _cancelCallback, context: _context } );
	}
};


AudioManager.prototype.visibilityMute = function( _hidden )
{
	if (Main.isAndroid && Main.isChromeMobile) return;

	if ( Main.debug )
		console.log("AudioManager.visibilityMute", _hidden);

	if ( _hidden )
	{
		if ( this.rememberMute === undefined )
		{
			this.rememberMute = this.mute;
			this.rememberTunesMuted = this.tunesMuted;
			this.setMute( true, true );
			this.muteTunes( true, true );
		}
	}
	else
	{
		if ( this.rememberMute !== undefined )
		{
			this.setMute( this.rememberMute, true );
			this.muteTunes( this.rememberTunesMuted, true );
			this.rememberMute = undefined;
			this.rememberTunesMuted = undefined;
		}
	}
};


AudioManager.prototype.setMute = function( _muted, _noSave )
{
	if (Main.isAndroid && Main.isChromeMobile) return;

	if ( Main.debug )
		console.log( "AudioManager.setMute", _muted );

	this.mute = _muted;

	for(var i in this.list)
	{
		if ( this.list.hasOwnProperty(i) )
		{
			var sfx = this.list[i];
			if ( sfx !== this.gameTune )
				sfx.mute( _muted );
		}
	}
	
	// save the new muted status
	if ( !_noSave )
	{
		this.managers.loadSave.saveGameStatus();
	}
};


AudioManager.prototype.muteTunes = function( _muted, _noSave )
{
	if (Main.isAndroid && Main.isChromeMobile) return;

	if ( Main.debug )
		console.log( "AudioManager.muteTunes", _muted );

	this.tunesMuted = _muted;
	if ( this.gameTune )
	{
		this.gameTune.mute( this.tunesMuted );
	}

	// save the new muted status
	if ( !_noSave )
	{
		this.managers.loadSave.saveGameStatus();
	}
};


AudioManager.prototype.startTune = function( _key, _noLoop, _muted )
{
    if ( Main.debug )
        console.log("AudioManager.startTune " + _key);

	if (Main.isAndroid && Main.isChromeMobile) return;

	if ( this.gameTune ) this.stopTune();
	this.list[ _key ].loop( _noLoop ? false : true );
	this.gameTune = this._playOne( _key );
    if ( this.gameTune )
    {
    	this.gameTune.volume( AudioManager.musicVolume * Main.volumeControl );
    }
	if ( _muted !== undefined )
		this.muteTunes( _muted, true );
	else
		this.muteTunes( this.tunesMuted, true );
};


AudioManager.prototype.stopTune = function()
{
	if (Main.isAndroid && Main.isChromeMobile) return;

	if ( this.gameTune )
	{
		this.gameTune.stop();
		this.gameTune = null;
	}
};


AudioManager.prototype.setMusicVolume = function( _vol )
{
	if (Main.isAndroid && Main.isChromeMobile) return;

	AudioManager.musicVolume = _vol;
	if ( this.gameTune )
		this.gameTune.volume( AudioManager.musicVolume * Main.volumeControl );
};


AudioManager.prototype.sfxLoaded = function()
{
    for ( var _key in this.list )
    {
        var sfx = this.list[ _key ];
        if ( sfx._state != "loaded" )
            return false;
    }

    return true;
};

