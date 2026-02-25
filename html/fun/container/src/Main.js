"use strict";


// namespace to isolate code from HTML window
var RR = {};

RR.GameStates = {};
RR.GameStates.STATE_NONE = -1;
RR.GameStates.STATE_PRELOAD = 0;
RR.GameStates.STATE_INITGRAPHICS = 1;
RR.GameStates.STATE_SHOWTITLES = 2;
RR.GameStates.STATE_WAITTITLES = 3;
RR.GameStates.STATE_PLAY = 4;



function Main()
{
	this.state = RR.GameStates.STATE_NONE;
	this.lastState = RR.GameStates.STATE_NONE;
	this.titles = null;
	this.game = null;
    this.graphics = null;
}


Main.tick = 0;


Main.prototype.create = function()
{
	Keys.create();
    Preloader.create();

	this.titles = null;
	this.game = null;
    this.graphics = null;

	this.lastState = RR.GameStates.STATE_NONE;
	this.state = RR.GameStates.STATE_PRELOAD;
};


Main.prototype.destroy = function()
{
	Keys.destroy();
    Preloader.destroy();

	this.state = RR.GameStates.STATE_NONE;
	this.lastState = RR.GameStates.STATE_NONE;

	if (this.titles)
	{
		this.titles.destroy();
		this.titles = null;
	}

	if (this.game)
	{
		this.game.destroy();
		this.game = null;
	}
};


Main.prototype.update = function()
{
	var newState = (this.lastState != this.state);
	this.lastState = this.state;
    //if (newState) console.log("state = " + this.state);

	switch(this.state)
	{
        case RR.GameStates.STATE_PRELOAD:
            if (newState)
            {
                Preloader.preloadImages(preImages, "images", () => {
                    this.state = RR.GameStates.STATE_INITGRAPHICS;
                });
            }
        break;

        case RR.GameStates.STATE_INITGRAPHICS:
            this.graphics = new RR.Graphics();
            try
            {
                this.graphics.create();
                this.graphics.clearColour({ r:0.1, g:0.1, b:0.2 });
            }
            catch(e)
            {
                console.error(e.message);
                this.state = RR.GameStates.STATE_NONE;
                break;
            }
            this.state = RR.GameStates.STATE_SHOWTITLES;
        break;

		case RR.GameStates.STATE_SHOWTITLES:
			if (newState)
			{
                this.titles = new Titles();
                this.titles.create(this.graphics);

                Preloader.preloadImages(images, "images", () => {
                    this.state = RR.GameStates.STATE_WAITTITLES;
                });
			}
            this.titles.update();
            this.graphics.update();
        break;

        case RR.GameStates.STATE_WAITTITLES:
			if (!this.titles.update())
			{
				this.titles.destroy();
				this.titles = null;
				this.state = RR.GameStates.STATE_PLAY;
			}
            this.graphics.update();
		break;

		case RR.GameStates.STATE_PLAY:
			if (newState)
			{
				this.game = new Game();
				this.game.create(this.graphics);
                this.testLeaks = true;
			}
			if (!this.game.update())
			{
				this.game.destroy();
				this.game = null;
				this.state = RR.GameStates.STATE_TITLES;
			}
            this.graphics.update();

            // TODO: debugging only - dump a list of properties leaking into 'window'
            if (this.testLeaks)
            {
                // check window properties added since page loaded... we're leaking!
                for(var p in window)
                {
                    if (props[p] != p)
                        console.warn("leaking into window: " + p);
                }
                props = null;
                this.testLeaks = false;
            }
		break;
	}

    Main.tick++;
    return true;
};
