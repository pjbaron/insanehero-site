//
// LevelSelect.js
//
// Pete Baron 2018
//
// Paged LevelSelect menu for Bubble Dragons
//




function LevelSelect( )
{
    this.sprites = null;
    this.buttons = null;
    this.texts = null;
    this.swipeMem = false;
    this.highlight = null;

    this.levelsData = null;

    this.page = 0;
    this.switchPage = 0;
    this.levelsPerPage = 18;
    this.scrollAppear = 0;
    this.scrollRemove = 0;
    this.lastUnlockedLevel = 0;
}


LevelSelect.prototype.create = function( _game, _managers, _lastLevel )
{
    var i;

    this.swipeMem = Main.swipeEnabled;
    Main.swipeEnabled = false;

    this.game = _game;
    this.managers = _managers;

    this.levelsData = this.managers.data.get("levels").levels;

    this.page = 0;
    this.switchPage = 0;

    this.highlight = null;
    this.scrollAppear = 0;
    this.scrollRemove = 0;

    // ensure that the local storage lists are initialised correctly on first play
    if ( Main.lockedLevels === null || Main.lockedLevels.length === 0 )
    {
        for( i = 0; i < this.levelsData.length; i++ )
        {
            Main.levelStars[i] = 0;
            Main.levelScores[i] = 0;
            // only the first level is unlocked initially
            Main.lockedLevels[i] = (i !== 0);
        }
        // save all the game data immediately after creating it once to avoid needing to do this again
        this.managers.loadSave.saveGameStatus();
    }
    else if ( Main.lockedLevels.length != this.levelsData.length )
    {
        // additional levels have been added to an existing set of levelDataSaga.json
        // extend the saved data buffers to provide room for the new data
        for( i = Main.lockedLevels.length; i < this.levelsData.length; i++ )
        {
            Main.levelStars[i] = 0;
            Main.levelScores[i] = 0;
            Main.lockedLevels[i] = 0;
        }
        // save the game data buffers immediately after extending them
        this.managers.loadSave.saveGameStatus();
    }

    // find the highest unlocked level number
    for( i = Main.lockedLevels.length - 1; i >= 0; --i )
    {
        if ( !Main.lockedLevels[i] )
        {
            this.lastUnlockedLevel = i;
            break;
        }
    }

    // https://trello.com/c/PtDdJZMv/513-when-starting-the-game-should-always-default-to-the-page-where-your-most-recent-unlocked-level-is-when-returning-to-the-level-se
    if ( Game.requestQuit )
        this.page = Math.floor(_lastLevel / this.levelsPerPage);
    else
        this.page = Math.floor(this.lastUnlockedLevel / this.levelsPerPage);

    this.showPage( Main.width );
    this.scrollAppear = -16;

    // whoosh appearance sound
    this.managers.audio.play( "snd_popup_flying" );

    // fade in
    Main.bgImage.alpha = 0;
};


LevelSelect.prototype.remove = function()
{
    Main.bgImage.alpha -= 0.1;
    if ( Main.bgImage.alpha <= 0 )
    {
        this.destroy();
        return false;
    }
    return true;
};


LevelSelect.prototype.destroy = function()
{
    this.destroyPage();

    this.game = null;
    this.managers = null;
    this.highlight = null;
    this.levelsData = null;

    // force responsive layout in case user changed format behind the help screen
    Main.resized = true;
    Main.resizeConsumed = false;
    Main.swipeEnabled = this.swipeMem;
};


LevelSelect.prototype.destroyPage = function()
{
    if ( this.texts )
    {
        for ( i = 0; i < this.texts.length; i++ )
            this.texts[ i ].destroy();
        this.texts = null;
    }

    if ( this.buttons )
    {
        for ( i = 0; i < this.buttons.length; i++ )
            this.buttons[ i ].destroy();
        this.buttons = null;
    }

    if ( this.sprites )
    {
        for ( i = 0; i < this.sprites.length; i++ )
            this.sprites[ i ].destroy();
        this.sprites = null;
    }
};


// returns the 1 based level number selected, or 0 if none picked yet
LevelSelect.prototype.update = function()
{
    var i, event;

    if ( Main.resized )
    {
        this.destroyPage();
        this.showPage(0);
    }

    if ( Main.bgImage.alpha < 1.0 )
    {
        Main.bgImage.alpha += 0.1;
    }

    if ( this.sprites )
    {
        for ( i = 0; i < this.sprites.length; i++ )
        {
            var s = this.sprites[ i ];
            s.update();
        }
    }

    var btn = null;
    if ( this.buttons )
    {
        for ( i = 0; i < this.buttons.length; i++ )
        {
            // skip locked level buttons
            if ( i >= this.levelsPerPage || (Main.accessLocked || !Main.lockedLevels[this.page * this.levelsPerPage + i]) )
            {
                var b = this.buttons[ i ];
                event = b.update();
                // stop processing buttons when one of them returns an event
                if ( event !== null )
                {
                    btn = b;
                    break;
                }
            }
        }
    }

    var spd;
    if ( this.scrollAppear !== 0 )
    {
        spd = LevelSelect.easeSpeed( this.scrollAppear, this.pageOffset );
        if ( Math.abs(spd) < 1.0 ) spd = Utils.sign0( this.scrollAppear );
        // reached or crossed zero for the pageOffset?
        if ( Utils.sign0(this.pageOffset) != Utils.sign0( this.pageOffset + spd ) )
        {
            this.scrollButtons( -spd );
            this.scrollAppear = 0;
        }
        else
        {
            this.scrollButtons( spd );
            this.scrollAppear *= 1.1;
        }

        // don't process button events while the page is switching
        return 0;
    }

    if ( this.scrollRemove !== 0 )
    {
        spd = LevelSelect.easeSpeed( this.scrollRemove, this.pageOffset );
        if ( Math.abs(spd) < 1.0 ) spd = Utils.sign0( this.scrollRemove );
        if ( this.scrollButtons( spd ) )
        {
            this.destroyPage();
            this.page = this.switchPage;
            this.showPage(-Utils.sign0(this.scrollRemove) * Main.width);
            this.scrollAppear = 16 * Utils.sign0(this.scrollRemove);
            this.scrollRemove = 0;
        }
        else
        {
            this.scrollRemove *= 1.1;
        }
        
        // don't process button events while the page is switching
        return 0;
    }

    // detect which level button has been selected...
    if ( event && event.length > 12 )
    {
        // make button scale up when clicked
        if ( event.substr(0, 6) == "click_" )
        {
            if ( btn )
                btn.scale.set(btn.scale.x * 1.1, btn.scale.y * 1.1);
        }

        // levels which are locked will not generate click events unless Main.accessLocked is true
        if ( event.substr(0, 12) == "click_event_" )
        {
            Main.click = null;

            // buttons have zero based numbering on their click event strings
            var level = Number.parseInt( event.substr(12) );

            if ( Main.debug )
                console.log("Player selected level " + level );

            return level + 1;
        }
    }

    // handle other button events...
    switch( event )
    {
        case "click_prev_event":
        {
            this.managers.audio.play( "snd_popup_flying" );
            this.switchPage = this.page - 1;
            this.scrollRemove = 8;
            break;
        }

        case "click_next_event":
        {
            this.managers.audio.play( "snd_popup_flying" );
            this.switchPage = this.page + 1;
            this.scrollRemove = -8;
            break;
        }

        case "click_home_event":
        {
            this.switchPage = Math.floor(this.lastUnlockedLevel / this.levelsPerPage);
            if ( this.switchPage > this.page )
                this.scrollRemove = -8;
            else if ( this.switchPage < this.page )
                this.scrollRemove = 8;
            else
                this.showPage();
            break;
        }
    }

    return 0;
};


LevelSelect.prototype.showPage = function( _xoff )
{
    var b, s, t;

    if ( _xoff === undefined ) _xoff = 0;
    this.pageOffset = _xoff / Main.bgImage.scale.x;

    // convert a level type string into the correct icon
    var typePics = [];
    typePics["level_protect_barrier"] = "lvl/lvl_typeBarr.png";
    typePics["level_collect_fish"] = "lvl/lvl_typeGoal.png";
    typePics["level_hatch_egg"] = "lvl/lvl_typeEgg.png";

    this.sprites = [];
    this.buttons = [];
    this.texts = [];

    // menu background image
    this.bg = new Sprite();
    this.bg.create( Main.bgImage, "game_bg3", this.managers.textures );
    this.bg.anchor.set( 0.5 );
    this.sprites.push( this.bg );


    // landscape settings default
    var scale = 0.70;
    var rows = 3;
    var cols = 6;
    var xtab = [-0.30, -0.18, -0.06, 0.06, 0.18, 0.30];
    var ytab = 0.24;

    if ( Main.isPortrait )
    {
        scale = 0.66;
        rows = 5;
        cols = 4;
        xtab = [-0.30, -0.10, 0.10, 0.30];
        ytab = 0.15;
    }

    // NOTE: always add level buttons first, their indices in the buttons list are used to reference the lockedLevels list
    var level = this.page * this.levelsPerPage;
    for(var y = 0; y < rows; y++)
    {
        for(var x = 0; x < cols; x++)
        {
            // portrait mode = 4x4 + 2 in the middle for the fifth row
            if ( !Main.isPortrait || ( y !== 4 || (x !== 0 && x !== 3) ) )
            {
                // get the level data for this level
                var levelData = this.levelsData[level % this.levelsData.length];

                if ( level == this.lastUnlockedLevel )
                {
                    // add button backing highlight
                    s = new Sprite();
                    s.create( Main.bgImage, "lvl/lvl_current.png", this.managers.textures, xtab[x], (-0.42 + (y + 0.5) * ytab), true );
                    s.anchor.set( 0.5 );
                    s.scale.set( scale );
                    s.x += this.pageOffset;
                    this.highlight = s;
                    this.sprites.push(s);
                }

                // add button
                b = new Button( Button.TYPE_BUTTON );
                b.create( Main.bgImage, "lvl/lvl_backing.png", this.managers, xtab[x], (-0.42 + (y + 0.5) * ytab), true,
                    "lvl/lvl_backing.png", "lvl/lvl_backing.png", "lvl/lvl_backing.png", "click_event_" + level.toString() );
                b.anchor.set( 0.5 );
                b.scale.set( scale );
                b.x += this.pageOffset;
                b.sfx = "snd_click";
                b.sfxHover = "snd_rollOver";
                b.lockIcon = null;
                this.buttons.push( b );

                if ( Main.lockedLevels[level] )
                {
                    var l = new Sprite();
                    l.create( b, "lvl/lvl_locked.png", this.managers.textures );
                    l.anchor.set(0.5);
                    b.lockIcon = l;
                    if ( !Main.accessLocked )
                        b.enabled = false;
                }
                else
                {
                    // level type icon selection
                    s = new Sprite();
                    s.create( b, typePics[levelData._id], this.managers.textures, 0, 0, true);
                    s.anchor.set( 0.5 );

                    // number of stars earned in this level previously
                    var stars = Main.levelStars[level];
                    if (stars > 0)
                    {
                        s = new Sprite();
                        s.create( b, "lvl/lvl_star01.png", this.managers.textures, 0, 0, true);
                        s.anchor.set( 0.5 );
                    }
                    if (stars > 1)
                    {
                        s = new Sprite();
                        s.create( b, "lvl/lvl_star02.png", this.managers.textures, 0, 0, true);
                        s.anchor.set( 0.5 );
                    }
                    if (stars > 2)
                    {
                        s = new Sprite();
                        s.create( b, "lvl/lvl_star03.png", this.managers.textures, 0, 0, true);
                        s.anchor.set( 0.5 );
                    }
                }

                t = new Text( (level + 1).toString(), Main.textStyleSelectLevelNumber );
                t.create( b, 0.36, 0.39, true );
                t.anchor.set( 1.0 );
                this.texts.push( t );

                level++;

                // stop adding buttons when we've shown the last level button
                if ( level >= Main.lockedLevels.length )
                    break;
            }
        }

        // *really* stop adding buttons when we've shown the last level button
        if ( level >= Main.lockedLevels.length )
            break;
    }

    // previous page button
    if ( this.page > 0 )
    {
        b = new Button( Button.TYPE_BUTTON );
        b.create( Main.bgImage, "lvlSlct_arrwLft.png", this.managers, -0.425, 0.4, true,
            "lvlSlct_arrwLft.png", "lvlSlct_arrwLft.png", "lvlSlct_arrwLft.png", "click_prev_event" );
        b.anchor.set( 0.5 );
        b.scale.set( 1.0 );
        b.sfx = "snd_click";
        b.sfxHover = "snd_rollOver";
        this.buttons.push( b );
    }

    // next page button
    if ( this.page <= Math.floor(Main.lockedLevels.length / this.levelsPerPage) - 1 )
    {
        b = new Button( Button.TYPE_BUTTON );
        b.create( Main.bgImage, "lvlSlct_arrwRgt.png", this.managers, 0.425, 0.4, true,
            "lvlSlct_arrwRgt.png", "lvlSlct_arrwRgt.png", "lvlSlct_arrwRgt.png", "click_next_event" );
        b.anchor.set( 0.5 );
        b.scale.set( 1.0 );
        b.sfx = "snd_click";
        b.sfxHover = "snd_rollOver";
        this.buttons.push( b );
    }

    // level number display and button
    b = new Button( Button.TYPE_BUTTON );
    b.create( Main.bgImage, "lvlSlct_btnCurrent.png", this.managers, 0, 0.4, true,
        "lvlSlct_btnCurrent.png", "lvlSlct_btnCurrent.png", "lvlSlct_btnCurrent.png", "click_home_event" );
    b.anchor.set( 0.5 );
    b.sfx = "snd_click";
    b.sfxHover = "snd_rollOver";
    this.buttons.push( b );

    t = new Text( (this.lastUnlockedLevel + 1).toString(), Main.textStyleShowLevelNumber );
    t.create( b, 0.0, 0.0, true );
    t.anchor.set( 0.5 );
    this.texts.push( t );

};


// create the speed for the page flip based on the current page offset
// this will accelerate out and decelerate in
LevelSelect.easeSpeed = function(_speed, _offset)
{
    var s = _speed * (Math.abs(_offset) / Main.width * 8.0);
    return s;
};


// return true when the page has been scrolled off the edge
LevelSelect.prototype.scrollButtons = function(_speed)
{
    var i, c = 0;
    for(i = 0; i < this.buttons.length; i++)
    {
        var button = this.buttons[i];

        // scroll only the level select type buttons
        if ( button.lockIcon !== undefined )
        {
            button.x += _speed;
            if ( Math.abs(button.x) < Main.width )
                c++;
        }
    }

    // also scroll the maximum level highlight sprite if it is on the old screen
    if ( this.highlight && this.highlight.parent )
        this.highlight.x += _speed;

    this.pageOffset += _speed;

    return (c <= 0);
};
