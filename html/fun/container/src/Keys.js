"use strict";


var Keys = {};
Keys.isPressed = null;
Keys.edgeDown = null;
Keys.edgeUp = null;



Keys.create = function()
{
	Keys.reset();
	window.addEventListener( "keydown", Keys.keyDown, true );
	window.addEventListener( "keyup", Keys.keyUp, true );
};


Keys.destroy = function()
{
	Keys.isPressed = null;
	Keys.edgeDown = null;
	Keys.edgeUp = null;
};


Keys.update = function()
{

	return true;
};


Keys.reset = function()
{
	Keys.isPressed = [];
	Keys.edgeDown = [];
	Keys.edgeUp = [];
};


Keys.keyDown = function( evt )
{
	evt.preventDefault();
	if (!Keys.isPressed[ evt.keyCode ])
	{
		Keys.edgeDown[ evt.keyCode ] = true;
		//console.log("keyDown ", evt.keyCode);
	}
	Keys.isPressed[ evt.keyCode ] = true;
};


Keys.keyUp = function( evt )
{
	evt.preventDefault();
	if (Keys.isPressed[ evt.keyCode ])
	{
		Keys.edgeUp[ evt.keyCode ] = true;
	}
	Keys.isPressed[ evt.keyCode ] = false;
};

