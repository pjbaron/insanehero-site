//
// static functions which are generally useful
//

var Utils = {};


Utils.limit = function( _value, _limit, _negLimit )
{
    if ( _value >= 0 )
        return Math.min( _value, _limit );
    return Math.max( _value, -_negLimit );
};


Utils.countInList = function( _list, _item )
{
    var c = 0;
    for( var i = 0, l = _list.length; i < l; i++ )
        if ( _list[i] == _item )
            c++;
    return c;
};


Utils.formatBigNumber = function( _value )
{
    var s = _value.toString();
    if ( s.length <= 3 ) return s;
    for( var i = s.length - 3; i > 0; i -= 3)
        s = s.slice(0, i) + "," + s.slice(i);
    return s;
};

Utils.sign0 = function( _value )
{
    if ( _value > 0 ) return 1;
    if ( _value < 0 ) return -1;
    return 0;
};


Utils.near = function( _location, _range )
{
    return { x: _location.x + (Math.random() * 2 * _range) - _range, y: _location.y + (Math.random() * 2 * _range) - _range };
};


// uses _getAtIndex callback to access _list[i] which lets the function work on deeper structures
Utils.removeFromIndexedList = function( _list, _getAtIndex, _param, _value, _all )
{
    if ( _list )
    {
        for( var i = 0, l = _list.length; i < l; i++ )
        {
            var listValue = _getAtIndex(_list, i);
            if ( ( _param && listValue[_param] == _value ) || ( !_param && listValue == _value ) )
            {
                _list.splice(i, 1);
                if ( !_all )
                    return _list;
            }
        }
    }
    return _list;
};


Utils.findPointInList = function( _pnt, _list, _param )
{
    if ( _list )
    {
        var pl;
        for( var i = 0, l = _list.length; i < l; i++ )
        {
            if ( _param === undefined )
                pl = _list[i];
            else
                pl = _list[i][param];

            if ( pl && pl.x == _pnt.x && pl.y == _pnt.y )
                return i;
        }
    }
    return -1;
};


Utils.findNearestPointInList = function( _pnt, _list, _param )
{
    var min2 = Number.POSITIVE_INFINITY;
    var best = -1;
    if ( _list )
    {
        var pl;
        for( var i = 0, l = _list.length; i < l; i++ )
        {
            pl = ( _param === undefined ) ? _list[i] : _list[i][param];

            if ( pl )
            {
                var dx = pl.x - _pnt.x;
                var dy = pl.y - _pnt.y;
                var d2 = dx * dx + dy * dy;
                if ( d2 < min2 )
                {
                    min2 = d2;
                    best = i;
                }
            }
        }
    }
    return best;
};


Utils.weightedPickRandomFromList = function( _list, _weights, _rndFnc )
{
    if ( !_rndFnc ) _rndFnc = Math.random;

    // find the circumference of the roulette wheel
    var total = 0, i, l;
    for( i = 0, l = _weights.length; i < l; i++ )
        total += _weights[i];

    // pick a position around the roulette wheel
    var r = _rndFnc() * total;

    // find out which slot we picked
    // (slots are different sizes = weights... larger slots = bigger chance)
    var accumulate = 0;
    for( i = 0; i < l; i++ )
    {
        accumulate += _weights[i];
        if ( accumulate >= r )
            return _list[i];
    }

    // should never happen but the function needs a return...
    return _list[l - 1];
};


Utils.pickRandomFromList = function( _list, _rndFnc )
{
    if (!_rndFnc) _rndFnc = Math.random;
    if ( !_list || _list.length === 0 ) return null;
    var r = Math.floor( _rndFnc() * _list.length );
    return _list[r];
};


Utils.normaliseAngle = function( _angle, _fullCircle )
{
	if ( !_fullCircle ) _fullCircle = Math.PI * 2;
	var halfCircle = _fullCircle / 2;

	while ( _angle < -halfCircle ) _angle += _fullCircle;
	while ( _angle >= halfCircle ) _angle -= _fullCircle;
	return _angle;
};


Utils.normaliseAnglePositive = function( _angle, _fullCircle )
{
	if ( !_fullCircle ) _fullCircle = Math.PI * 2;

	while ( _angle < 0 ) _angle += _fullCircle;
	while ( _angle >= _fullCircle ) _angle -= _fullCircle;
	return _angle;
};


Utils.distance = function( _x1, _y1, _x2, _y2 )
{
	var dx = _x2 - _x1;
	var dy = _y2 - _y1;
	return Math.sqrt( dx * dx + dy * dy );
};


Utils.distanceBetween = function( _p1, _p2 )
{
    var dx = _p2.x - _p1.x;
    var dy = _p2.y - _p1.y;
    return Math.sqrt( dx * dx + dy * dy );
};


Utils.distanceBetweenScaled = function( _p1, _p2, _sx, _sy )
{
    var dx = (_p2.x - _p1.x) * _sx;
    var dy = (_p2.y - _p1.y) * _sy;
    return Math.sqrt( dx * dx + dy * dy );
};


// turn via shortest direction to face at the desired angle
// but don't overshoot it
Utils.rotateTo = function( _current, _desired, _speed, _fullCircle )
{
	if ( !_fullCircle ) _fullCircle = Math.PI * 2;
	var halfCircle = _fullCircle / 2;

	var r;
	var rotFar = Utils.normaliseAnglePositive( _current - _desired + _fullCircle, _fullCircle );
	if ( rotFar > halfCircle )
	{
		r = _current + Math.min( _fullCircle - rotFar, _speed );
	}
	else if ( rotFar !== 0 )
	{
		r = _current - Math.min( rotFar, _speed );
	}
	else
	{
		// with very tiny differences it is possible for rotFar to round to zero
		r = _desired;
	}

	return Utils.normaliseAngle( r, _fullCircle );
};


Utils.replaceAt = function( string, index, character )
{
	return string.substr( 0, index ) + character + string.substr( index + character.length );
};


Utils.setValuesFromObject = function( _self, _object )
{
	if ( _object )
	{
		for ( var key in _object )
		{
			if ( _object.hasOwnProperty( key ) )
			{
				_self[ key ] = _object[ key ];
			}
		}
	}
};


Utils.indexOfParameter = function( _list, _parameter, _value )
{
	if ( !_list ) return -1;
	for ( var i = 0, l = _list.length; i < l; i++ )
	{
		if ( _list[ i ][ _parameter ] == _value )
			return i;
	}
	return -1;
};


// case insensitive search for a string in a list of strings
Utils.indexOfStringNoCase = function( _list, _string )
{
	if ( !_list ) return -1;
	for ( var i = 0, l = _list.length; i < l; i++ )
	{
		if ( _list[ i ].toLowerCase() == _string.toLowerCase() )
			return i;
	}
	return -1;
};


Utils.timeToString = function( ms )
{
    if ( ms === undefined || ms === null || isNaN(ms) ) ms = 0;
    
	var s = ms / 1000;
	var m = s / 60;

	// minutes as a string
	var mstr = Math.floor( m ).toString();

	// seconds should always show two digits
	var sstr = ( Math.floor( s ) % 60 ).toString();
	if ( sstr.length < 2 ) sstr = "0" + sstr;

	return mstr + ":" + sstr;
};


Utils.clamp = function( _value, _min, _max )
{
	return Math.min( Math.max( _value, _min ), _max );
};


Utils.padToLength = function( _string, _length, _pad, _tail )
{
	while ( _string.length < _length )
		if ( _tail )
			_string += _pad;
		else
			_string = _pad + _string;
	return _string;
};


Utils.makeFunctionForSprite = function( _sprite )
{
	return ( function( _state )
	{
		Utils.setValuesFromObject( _sprite, _state );
	} );
};



//
// visibility status change detection
//

Utils.focusChangeCallback = null;
Utils.focusChangeContext = null;
Utils._visListener = false;
Utils._hidden = false;

Utils._focusIn = function()
{
	Utils._hidden = false;
	if ( Main.debug )
		console.log( "Utils._focusIn hidden =", Utils._hidden );
	if ( Utils.focusChangeContext && Utils.focusChangeCallback )
		Utils.focusChangeCallback.call( Utils.focusChangeContext, Utils._hidden );
};


Utils._focusOut = function()
{
	Utils._hidden = true;
	if ( Main.debug )
		console.log( "Utils._focusOut hidden =", Utils._hidden );
	if ( Utils.focusChangeContext && Utils.focusChangeCallback )
		Utils.focusChangeCallback.call( Utils.focusChangeContext, Utils._hidden );
};


Utils.detectHidden = function()
{
    if ( !Utils._visListener )
    {
        // https://code.tutsplus.com/articles/html5-page-visibility-api--cms-22021
        // this code detects changing the browser tab with focus
        var prefix = getBrowserPrefix();
        var hidden = hiddenProperty(prefix);
        //var visState = visibilityState(prefix);
        var visEvent = visibilityEvent(prefix);
        document.addEventListener( visEvent, function()
            {
                if ( !document[ hidden ] )
                {
                    // The page is visible.
                    Utils._focusIn();
                }
                else
                {
                    // The page is hidden. 
                    Utils._focusOut();
                }
            } );

        // these events detect changing the focus to a different window
        window.addEventListener( "focus", Utils._focusIn, false );
        window.addEventListener( "blur", Utils._focusOut, false );

        Utils._visListener = true;
    }
};


Utils.isHidden = function()
{
    /*jshint -W069 */
	return document[ 'hidden' ];
};


// Get Browser-Specific Prefix
function getBrowserPrefix()
{
	// Check for the unprefixed property.
	if ( 'hidden' in document )
	{
		return null;
	}

	// All the possible prefixes.
	var browserPrefixes = [ 'moz', 'ms', 'o', 'webkit' ];

	for ( var i = 0; i < browserPrefixes.length; i++ )
	{
		var prefix = browserPrefixes[ i ] + 'Hidden';
		if ( prefix in document )
		{
			return browserPrefixes[ i ];
		}
	}

	// The API is not supported in browser.
	return null;
}

// Get Browser Specific Hidden Property
function hiddenProperty( prefix )
{
	if ( prefix )
	{
		return prefix + 'Hidden';
	}
	else
	{
		return 'hidden';
	}
}


// Get Browser Specific Visibility State
function visibilityState( prefix )
{
	if ( prefix )
	{
		return prefix + 'VisibilityState';
	}
	else
	{
		return 'visibilityState';
	}
}


// Get Browser Specific Event
function visibilityEvent( prefix )
{
	if ( prefix )
	{
		return prefix + 'visibilitychange';
	}
	else
	{
		return 'visibilitychange';
	}
}



//
// screen blanker - makes the background dimmer when popups are displayed
//

Utils.blanker = null;

Utils.addBlanker = function( _textures )
{
	if ( Utils.blanker !== null )
	{
		Utils.blanker.instances++;
		return;
	}

	// add full-screen darkening sprite behind the background
	Utils.blanker = new Sprite();
	Utils.blanker.create( Main.fullUI, "blanker", _textures, 0, 0 );
	Utils.blanker.anchor.set( 0.5 );
	Utils.blanker.scale.set( 40.0 );
	Utils.blanker.instances = 1;
};

Utils.removeBlanker = function()
{
	if ( Utils.blanker )
	{
		Utils.blanker.instances--;
		if ( Utils.blanker.instances <= 0 )
		{
			Utils.blanker.destroy();
			Utils.blanker = null;
		}
	}

};


//
// Math replacment functions
//

Math.rnd = function(s)
{
    return function()
    {
        s = Math.sin(s) * 10000;
        var r = s - Math.floor(s);
        return r;
    };
};

Math.mySeed = function(s)
{
    // never seed with 0, the random numbers will be stuck
    if ( s === 0 ) s = 1;
    Math.myRandom = Math.rnd(s);
};

