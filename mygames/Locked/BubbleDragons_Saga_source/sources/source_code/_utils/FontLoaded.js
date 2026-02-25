// FontLoaded.js
//
// Pete Baron 2017
//
// wait for a list of fonts to be loaded
// from http://stackoverflow.com/questions/5680013/how-to-be-notified-once-a-web-font-has-loaded?lq=1
//
// new FontLoaded( ["font1", "font2"], fontsLoaded, this );
//



function FontLoaded( fonts, callback, callbackContext )
{
	if ( Main.debug )
		console.log( "FontLoaded loading: " + fonts );

	this.fontList = fonts;
	this.loadedCallback = callback;
	this.loadedCallbackContext = callbackContext;
	this.loadedFonts = 0;

	// find width of weird text string without the fonts applied
	// large font size makes even subtle changes obvious
	this.width = FontLoaded.getTextExtent('giItT1WQy@!-/#%', 'font_that_doesnt_exist', 300);

	if ( !this.checkFonts() )
	{
		this.interval = setInterval( this.checkFonts.bind(this), 50 );
	}
}


FontLoaded.prototype.checkFonts = function()
{
	if ( this.fontList )
	{
		for ( var i = this.fontList.length - 1; i >= 0; --i )
		{
			var font = this.fontList[i];

			if ( FontLoaded.getTextExtent('giItT1WQy@!-/#%', font, 300) != this.width )
			{
				if ( Main.debug )
					console.log("Font loaded:", this.fontList[i]);
				// remove the loaded font from the fontList
				this.fontList.splice(i, 1);
			}
		}
	}
	else
	{
		if ( Main.debug )
			console.log( "FontLoaded.checkFonts() list is empty", this.fontList );
	}

	// If all fonts have been loaded or there are no fonts in the list
	if ( !this.fontList || this.fontList.length === 0 )
	{

		if ( this.interval )
		{
			clearInterval( this.interval );
		}

		this.interval = null;
		this.fontList = null;
		if ( this.loadedCallback )
		{
			this.loadedCallback.call( this.loadedCallbackContext );
			this.loadedCallback = null;
			this.loadedCallbackContext = null;
		}

		if ( Main.debug )
			console.log("All fonts loaded or failed.");
		return true;
	}

	if ( Main.debug )
		console.log("Waiting for fonts:", this.fontList);
	
	return false;
};


FontLoaded.getTextExtent = function( _string, _fontFamily, _fontSize )
{
	var node = document.createElement( 'span' );
	node.innerHTML = _string;
	// Visible - so we can measure it - but not on the screen
	node.style.position = 'absolute';
	node.style.left = '-10000px';
	node.style.top = '-10000px';
	node.style.fontSize = _fontSize.toString() + 'px';
	// Reset any font properties
	node.style.fontFamily = _fontFamily;
	node.style.fontVariant = 'normal';
	node.style.fontStyle = 'normal';
	node.style.fontWeight = 'normal';
	node.style.letterSpacing = '0';
	document.body.appendChild( node );

	var width = node.offsetWidth;
	node.parentNode.removeChild( node );

	//console.log( _fontFamily, width );
	return width;
};
