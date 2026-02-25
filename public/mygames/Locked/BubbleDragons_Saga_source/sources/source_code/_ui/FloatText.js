//
// FloatText.js
//
// Pete Baron 2017
//
// text that appears over the game area then floats off
//



function FloatText()
{
	this.parent = null;
	this.managers = null;
	this.text = null;
}


FloatText.prototype.create = function( _x, _y, _style, _parent, _managers, _message, _distance, _delay )
{
	this.parent = _parent;
	this.managers = _managers;

	// localise _message if possible, otherwise the _message is the message
	// var style = _style.clone();    //Main.textStyleBoldHugeCentered.clone();
	// style.wordWrapWidth = 800;
	//var t = this.managers.locale.get( _message ) || _message;

	this.text = new Text( _message, _style );
	this.text.create( this.parent, _x, _y, false );
	this.text.anchor.set( 0.5, 0.5 );

	FloatText.tweenOut.step = Utils.makeFunctionForSprite( this.text );
    FloatText.tweenOut.from.y = _y;
    FloatText.tweenOut.to.y = _y + (_distance || -100);
    FloatText.tweenOut.duration = _delay || (Math.random() * 300 + 700);
	this.text.tweener = new Tweenable();
	this.text.tweener.tween( FloatText.tweenOut );
	this.text.tweener.context = this;
};


FloatText.prototype.destroy = function()
{
	if ( this.text && this.text.tweener )
	{
		this.text.tweener.stop();
		this.text.tweener.context = null;
	}

	if ( this.text )
		this.text.destroy();
	this.text = null;

	this.managers = null;
	this.parent = null;
	this.callback = null;
	this.context = null;
	this.removeContext = null;
	this.removeArgument = null;

	this.removing = false;
};


FloatText.prototype.active = function()
{
    return (this.text !== null);
};


FloatText.tweenOut =
{
	from:
	{
		y: 0
		//scaleFactor: 1.0
	},
	to:
	{
		y: 0
		//scaleFactor: 0.10
	},
	duration: 0,
	easing: 'easeFrom',
	step: null,
	finish: function() {
		// 'this' is the tweener, context is the FloatText object
        this.context.destroy();
	}
};

