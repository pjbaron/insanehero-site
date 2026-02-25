//
// Effects.js
//
// Pete Baron 2017
//
// very simple animation player for effects
//



Effects.REMOVE_TILE = 1;
Effects.PRELOADER = 2;

Effects.definitions = [
	// 0 = none
	{},
	// 1 = REMOVE_TILE
	{
		first: 1,
		last: 30,
		baseKey: "fx_m",
		scale: 2.2
	},
	// 2 = PRELOADER
	{
		first: 0,
		last: 67,
		baseKey: "loading_",
		scale: 1.0,
		repeat: true
	}
];


function Effects()
{
	this.list = null;
}


Effects.prototype.create = function( _textureManager )
{
	this.textureManager = _textureManager;
	this.list = [];
};


Effects.prototype.destroy = function()
{
	for( var i = this.list.length - 1; i >= 0; --i )
		this.list[i].destroy();
	this.list = null;
};


Effects.prototype.add = function( _type, _attached, _xoff, _yoff )
{
	var effect = new Sprite();
	var def = Effects.definitions[ _type ];
	effect.create( _attached.parent, this.getKeyName( _type, def.first ), this.textureManager, _attached.x + _xoff, _attached.y + _yoff, false );
	_attached.parent.setChildIndex( effect, _attached.parent.getChildIndex( _attached ) );
	effect.anchor.set( _attached.anchor.x, _attached.anchor.y );
	effect.scale.set( def.scale, def.scale );
	effect.fxType = _type;
	effect.fxFrameNumber = def.first;
	effect.repeat = ( def.repeat === true ) ? true : false;
    effect.tz = _attached.tz;       // if it is a Tile then we want to preserve its z ordering position for this effect
	this.list.push(effect);
};


Effects.prototype.update = function()
{
	for( var i = this.list.length - 1; i >= 0; --i )
	{
		var e = this.list[i];

		if ( e.fxFrameNumber > Effects.definitions[ e.fxType ].last )
		{
			if ( e.repeat )
			{
				e.fxFrameNumber = 0;
			}
			else
			{
				e.destroy();
				this.list.splice(i, 1);
				continue;
			}
		}

		var key = this.getKeyName( e.fxType, Math.floor(e.fxFrameNumber) );
		e.setFrame( key );
		e.update();

		e.fxFrameNumber += Main.elapsedTime * 0.06;
	}

	return this.list.length;
};


Effects.prototype.getKeyName = function( _type, _frame )
{
	return Effects.definitions[ _type ].baseKey + _frame.toString();
};
