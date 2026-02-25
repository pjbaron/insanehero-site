//
// Locale.js
//
// Pete Baron 2017
//
//
// a simple system to change text referenced by 'id' strings into
// the desired text in the currently selected language
//
// uses the global string Main.countryCode as the folder name
//



function Locale()
{
	this.strings = null;
}


Locale.prototype.create = function( _dataManager )
{
	this.dataManager = _dataManager;
	this.onLocaleChanged();
};


Locale.prototype.get = function( _id )
{
	if ( !this.dataManager )
	{
		// if we see this, it is possible that something is trying to get a
		// localised string before the preloader has finished, triggering the
		// Locale.create call
		if ( Main.debug )
			console.log( "ERROR: Locale.get called before dataManager is set!" );
		return "error";
	}

	if ( !this.strings )
		this.strings = this.dataManager.get( "strings" );

	var i = Utils.indexOfParameter( this.strings.Strings.String, "_id", _id );
	if ( i !== -1 )
		return this.strings.Strings.String[ i ].__text;

	if ( Main.debug )
		console.log( "WARNING: Locale.get unknown string id = " + _id );
	return null;
};


// sets the language for the game if the option is supported (defaults to en-US)
//
// NOTE: if dynamic language switching is required in the future, call this function
// when the language change is detected.  Changing the countryCode will cause all
// new strings to use the new language option.
// For an ideal implementation a system should be implemented to recreate all
// currently displayed strings too.  This would involve destroying and recreating
// every string holding object in the display list.
Locale.prototype.onLocaleChanged = function()
{
    // desired language
    // Main.countryCode = ARK_game_arena_connector.getParam('locale', 'en-US');
    if ( Main.debug )
        Main.countryCode = "en-US";  //"de-DE";
    else
        Main.countryCode = Main.arenaHelper.getLocale();

    // If only the language is passed in without the country code
    // Then re-map it to a default country code
    var supportLanguages =[
        { "value": "en", "localization":"en-US", "name": "English" }
        ,{ "value": "de", "localization":"de-DE", "name": "Deutsch" }
        ,{ "value": "es", "localization":"es-ES", "name": "Español" }
        ,{ "value": "fr", "localization":"fr-FR", "name": "Français" }
        ,{ "value": "it", "localization":"it-IT", "name": "Italiano" }
    ];
    for (var i=0; i<supportLanguages.length; i++){
        if (supportLanguages[i].value === Main.countryCode){
            Main.countryCode = supportLanguages[i].localization;
            break;
        }
    }

    // verify it is available
    var available = this.dataManager.get( "localizations");    

	if ( Main.debug )
		console.log( "available languages: ", available );

	if ( available && available.availableLocales )
	{
		if ( Utils.indexOfStringNoCase( available.availableLocales, Main.countryCode ) == -1 )
		{
			if ( Main.debug )
				console.log( "language is not available: ", Main.countryCode );
			Main.countryCode = 'en-US';
		}
	}

	if ( Main.debug )
		console.log( "language code = ", Main.countryCode );

	// load the new language strings
	this.dataManager.loadData( "strings", Main.arenaHelper.getAbsoluteURL("")+"data/locale/" + Main.countryCode + "/strings.json" );
	// force reconstruction on next 'get' request
	this.strings = null;
};

