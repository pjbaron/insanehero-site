//
// Tweener.js
//
// Pete Baron 2017
//
// static helpers to set up Tween animations from data
//


function Tweener()
{

}


Tweener.createTweens = function( _list, _parent, _managers, _offx, _offy, _textStyle )
{
	if ( isNaN(_offx) ) _offx = 0;
	if ( isNaN(_offy) ) _offy = 0;
	
	var sprites = [];
	var buttons = [];
	for ( var i = 0; i < _list.length; i++ )
	{
		var data = _list[ i ];

		if ( data.button )
		{
			var b = new Button( Button.TYPE_BUTTON );
			b.create( _parent, data.key, _managers, data.x + _offx, data.y + _offy, false,
				data.key, data.button.over, data.button.down, data.button.clickEvent );
			b.anchor.x = b.anchor.y = 0.5;
			if ( data.visible !== undefined ) b.visible = data.visible;
			b.sfx = data.button.sfx;
			b.sfxHover = data.button.sfxHover;

			if ( data.button.text !== undefined )
			{
				var t = new Text( _managers.locale.get( data.button.text ), _textStyle || Main.textStyleBoldButtons );
				t.create( b, 0.0, 0.0, true );
				t.anchor.set( 0.5, 0.5 );
				b.text = t;				
			}

			if ( data.fade !== undefined )
			{
				b.addFader( data.fade, data.alpha );
			}

			if ( data.tween !== undefined )
			{
				data.tween.step = Utils.makeFunctionForSprite( b );
				b.tweener = new Tweenable();
				b.tweener.tween( data.tween );
				b.tweener.owner = b;
			}

			buttons.push( b );
		}
		else
		{
			var s = new Sprite();
			s.create( _parent, data.key, _managers.textures, data.x + _offx, data.y + _offy, false );
			s.anchor.x = s.anchor.y = 0.5;
			if ( data.visible !== undefined ) s.visible = data.visible;

			if ( data.fade !== undefined )
			{
				s.addFader( data.fade, data.alpha );
			}

			if ( data.tween !== undefined )
			{
				data.tween.step = Utils.makeFunctionForSprite( s );
				s.tweener = new Tweenable();
				s.tweener.tween( data.tween );
				s.tweener.owner = s;
			}

			sprites.push( s );
		}
	}

	return { sprites: sprites, buttons: buttons };
};


