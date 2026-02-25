// DataManager.js
//
// Pete Baron 2016
//
// Loads and accesses data files (text)
//




function DataManager( )
{
	this.list = null;
	this.pending = 0;
}


DataManager.prototype.create = function()
{
	this.list = [];
};


DataManager.prototype.destroy = function()
{
	this.list = null;
};


DataManager.prototype.loadData = function( _key, _path, _onComplete )
{
	//console.log("DataManager.loadData ", _key);

	var data;

	if (this.list[_key])
	{
		data = this.list[_key];
		return data;
	}

	if ( Main.debug )
		console.log( "DataManager.loadData ", _key, _path );

	data = {};
	data.isReady = false;
	this.list[_key] = data;

	var _this = this;

	// http://codepen.io/KryptoniteDove/post/load-json-file-locally-using-pure-javascript
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open('GET', _path, true);
	xobj.onreadystatechange = function ()
	{
		if (xobj.readyState == 4 && xobj.status == "200")
		{
			data.isReady = true;
			data.data = JSON.parse( xobj.responseText );
			if ( _onComplete ) _onComplete();
			_this.pending--;
		}
	};
	xobj.send(null);

	this.pending++;
	data.src = _path;

	return data;
};


DataManager.prototype.get = function( _key )
{
	if ( this.list && this.list[ _key ] && this.list[ _key ].isReady !== false)
	{
		// .data is present for loaded text data
		return this.list[ _key ].data || this.list[ _key ];
	}

	if ( Main.debug )
		console.log( "DataManager.get(): data not in cache", _key );
	return null;
};


DataManager.prototype.set = function( _key, _data )
{
	if ( this.list[ _key ] )
	{
		if ( Main.debug )
			console.log( "WARNING: attempt to overwrite existing cache item", _key );
		return;
	}

	for ( var k in this.list )
	{
		if ( this.list[ k ] == _data )
		{
			if ( Main.debug )
				console.log( "WARNING: adding additional key to existing cache item", k, "==", _key );
			this.list[ _key ] = this.list[ k ];
			return;
		}
	}

	this.list[ _key ] = _data;

	if ( Main.debug )
		console.log( "DataManager.set(): data added to cache", _key );
};
