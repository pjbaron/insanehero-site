//
// PuzzleInput.js
//
// Pete Baron 2017
//
// handle input events on the puzzle itself
//



function PuzzleInput()
{
	this.managers = null;
	this.puzzle = null;

	this.hoveredPiece = null;
	this.dropPiece = null;
	this.selectedPiece = null;
	this.chain = 0;
	this.multiMatch = 0;
	this.spriteList = null;
	this.lastHovered = null;
    this.thinkingTimer = 0;
}


PuzzleInput.prototype.create = function( _managers, _puzzle )
{
	this.managers = _managers;
	this.puzzle = _puzzle;

	this.hoveredPiece = null;
	this.dropPiece = null;
	this.selectedPiece = null;
	this.lastHovered = null;
	this.chain = 1;
	this.multiMatch = 0;
	this.selectedPiece = null;
	this.spriteList = [];
    this.thinkingTimer = 0;
};


PuzzleInput.prototype.destroy = function()
{
	this.removeHoverPiece();
	this._removeSelectedPiece();

	this.managers = null;
	this.puzzle = null;

	this.hoveredPiece = null;
	this.dropPiece = null;
	this.selectedPiece = null;
	this.lastHovered = null;

	if ( this.spriteList )
	{
		for( var i = 0, l = this.spriteList.length; i < l; i++ )
		{
			this.spriteList[i].alpha = 0;
			this.spriteList[i].destroy();
		}
		this.spriteList = null;
	}
};


PuzzleInput.prototype.update = function()
{
    // track how long the player is thinking about this move
    this.thinkingTimer += Main.elapsedTime;

	// update any sprites in the spriteList
	if ( this.spriteList && this.spriteList.length > 0 )
	{
		for( var i = this.spriteList.length - 1; i >= 0; --i )
		{
			var s = this.spriteList[i];
			s.y -= 4;
			s.alpha -= 0.02;
			if ( s.alpha <= 0 )
			{
				s.destroy();
				this.spriteList.splice(i, 1);
			}
			else
			{
				s.update();
			}
		}
		return (this.spriteList.length > 0);
	}

	return false;
};


PuzzleInput.prototype.clickedPiece = function( _piece )
{
	// disable piece clicking while the tornado is playing
	if ( this.puzzle.tornadoRemove )
		return false;

	if ( this.puzzle.tileOpen( _piece ) )
	{
		// the piece is removable

		if ( !this.selectedPiece )
		{
			// no piece is currently selected, select the new pick
			this.managers.audio.play( "snd_clickTile" );
			this._selectPiece( _piece );
		}
		else
		{
			if ( _piece != this.selectedPiece )
			{
				// didn't pick the same piece again
				this.managers.audio.play( "snd_clickTile" );
				if ( (_piece.symbol == this.selectedPiece.symbol) ||
                    (_piece.isOverridden() && this.selectedPiece.isOverridden()) )
				{
					// picked a matching piece, remove them both
					this._matchedPieces( _piece );

                    // award time bonuses for timer tile matching
                    var timeBonus = _piece.timeBonus();
                    if ( timeBonus >= 0 )
                    {
                        this._timeBonusScoring( _piece, timeBonus );
                        Game.timeLeft += timeBonus;
                    }

					// track bonus multipliers and display them
					var isChain = this._chainBonusScoring( _piece );
					this._multiBonusScoring( _piece );

					// add to score
					var bonus = 0;
					if ( isChain )
						bonus += this.puzzle.speedMatchValue * this.chain;
					Game.score += (_piece.value | 0) + bonus + this.puzzle.multiMatchValue * this.multiMatch;

					if ( Main.debug )
						console.log("chain =", this.chain, "value =", _piece.value, "speedMatchValue =", this.puzzle.speedMatchValue, "score =", Game.score);

					// increase snd_matchX value from 1 to 16 with successive chain matches
					var iNUMBER_SOUNDS = 16;
					if ( this.chain <= iNUMBER_SOUNDS )
						this.managers.audio.play( ["snd_match" + Math.min(this.chain, iNUMBER_SOUNDS).toString()] );
					else
						this.managers.audio.play( ["snd_correct1", "snd_correct2"] );

					this.lastMatchTime = Main.time;
					this.lastMatchType = _piece.symbol;
				}
				else
				{
					// picked a different piece, replace the selection
					this._deselectPiece( this.selectedPiece );
					this._selectPiece( _piece );
				}
			}
		}
		return true;
	}

	if ( _piece )
		_piece.wobble();

	this.managers.audio.playDelayed( ["snd_error1", "snd_error2", "snd_error3"], 0.1, this.cancelIfSwipe, this );
	return false;
};


// c'tor only, not used during game-play
PuzzleInput.prototype.createHoveredPiece = function( _sprite )
{
	this.hoveredPiece = {
        piece: null,
		sprite: _sprite,
		fallSpeed: 0
	};
};


// c'tor only, not used during game-play
PuzzleInput.prototype.createDroppedPiece = function( _sprite )
{
	this.dropPiece = {
        piece: null,
		sprite: _sprite,
		fallSpeed: 0
	};
};


PuzzleInput.prototype.showDropAndHoverPieces = function()
{
	// show the piece selected by clicking (draw before the hoveredPiece to fix drawing priority)
	if ( this.dropPiece )
	{
        this.dropPiece.sprite.setFrame( this.dropPiece.sprite.key, true );

		// convert percentage positions into bottom location for piece to drop to
		var my = this.dropPiece.sprite.y;
		this.dropPiece.sprite.pcnty = World.SelectionPreviewY;
		World.SelectionPreviewBotY = this.dropPiece.sprite.y + this.dropPiece.sprite.height;
		this.dropPiece.sprite.y = my;

		if ( Main.isPortrait )
		{
			// in portrait mode, don't drop the piece in, just make it appear when clicked
			this.dropPiece.sprite.y = World.SelectionPreviewBotY;
			this.dropPiece.fallSpeed = 0;
		}
		else
		{
			// make it drop into place from the hover location
			this.dropPiece.sprite.y += this.dropPiece.fallSpeed;
			this.dropPiece.fallSpeed++;
			if ( this.dropPiece.sprite.y > World.SelectionPreviewBotY )
			{
				this.dropPiece.sprite.y = World.SelectionPreviewBotY;
				this.dropPiece.fallSpeed = 0;
			}
		}
		this.dropPiece.sprite.update();
	}

	// show the piece being hovered by the mouse pointer
	if ( this.hoveredPiece )
	{
        this.hoveredPiece.sprite.setFrame( this.hoveredPiece.sprite.key, true );

		this.hoveredPiece.sprite.pcnty = World.SelectionPreviewY;
		this.hoveredPiece.sprite.update();
	}
};


PuzzleInput.prototype.resetSidePieces = function()
{
    if ( this.dropPiece )
    {
        if ( this.dropPiece.sprite && this.dropPiece.piece )
        {
            if ( this.dropPiece.piece.isOverridden() )
                this.dropPiece.sprite.setFrame( "cube_" + this.dropPiece.piece.parent.overrideTileKey + "_1" );
            else
                this.dropPiece.sprite.setFrame( "cube_" + this.dropPiece.piece.symbol + "_1" );
        }
    }
    if ( this.hoveredPiece )
    {
        if ( this.hoveredPiece.sprite && this.hoveredPiece.piece )
        {
            if ( this.hoveredPiece.piece.isOverridden() )
                this.hoveredPiece.sprite.setFrame( "cube_" + this.hoveredPiece.piece.parent.overrideTileKey + "_1" );
            else
                this.hoveredPiece.sprite.setFrame( "cube_" + this.hoveredPiece.piece.symbol + "_1" );
        }
    }
};


// callback function, invoked if a 'swipe' gesture is detected
// decide if we want to cancel the pending 'error' sound effect
PuzzleInput.prototype.cancelIfSwipe = function( _finalTest )
{
	if ( _finalTest && Main.mouseDown !== null )
		return true;
	if ( Main.swipeEnabled && Main.swipe !== 0 )
		return true;
	return false;
};


PuzzleInput.prototype._selectPiece = function( _piece )
{
	this.selectedPiece = _piece;

	// highlight selected piece
	this.selectedPiece.addFilter( World.brighter );

	if ( this.dropPiece )
	{
        this.dropPiece.piece = null;
		this.dropPiece.sprite.destroy();
		this.dropPiece = null;
	}

	// show selected piece in drop-down
	var sprite = new Sprite();
    var symbol = _piece.symbol;
    if ( symbol == "s0" )
    {
        symbol = "s0b";
    }
	sprite.create( Main.rightUI, "cube_" + _piece.symbol + "_1", this.managers.textures, -0.02, World.SelectionPreviewY, true );
    if ( _piece.isOverridden() )
        sprite.setFrame( "cube_" + _piece.parent.overrideTileKey + "_1" );
	sprite.anchor.x = sprite.anchor.y = 0.5;
	sprite.scale.x = sprite.scale.y = Tile.scale / Main.tileAssetScale;
	this.dropPiece = {
        piece: _piece,
		sprite: sprite,
		fallSpeed: 0
	};
    // register the dropPiece sprite as the owner of the texture, which will automatically switch textures
    // if this is a timer cube and the texture is replaced by another system (e.g. Puzzle.timeTile)
    // this.managers.textures.claimOwnership( sprite.key, sprite );

	// remove the hovered piece selection, it's being dropped in
	this.removeHoverPiece();
};


PuzzleInput.prototype._deselectPiece = function( _piece )
{
	if ( _piece )
	{
		_piece.removeFilter( World.brighter );
	}
	this._removeSelectedPiece();
};


PuzzleInput.prototype._removeSelectedPiece = function()
{
	// remove dropped piece
	if ( this.dropPiece )
	{
        this.dropPiece.piece = null;
		if ( this.dropPiece.sprite )
			this.dropPiece.sprite.destroy();
		this.dropPiece = null;
	}
};


PuzzleInput.prototype._matchedPieces = function( _piece )
{
	if ( Main.debug )
		console.log("Matched symbol", _piece.symbol);

	// fade both pieces, make sure the second one is highlighted
	this.puzzle.fadeTile( this.selectedPiece, this.puzzle.removeTile );
	this._selectPiece( _piece );
	this.puzzle.fadeTile( _piece, this.puzzle.removeTile );

	// remove both pieces from drop-down
	this._removeSelectedPiece();
	this.removeHoverPiece();

	this.selectedPiece = null;

    // count the number of matches made in this level so far
    Game.levelMatches++;

    // time since last match long enough for event?
    if ( this.thinkingTimer > 10 * 1000 )
    {
        _gameGATracker("send", "event", Main.VERSION, "hard_thinking", "MJDD_HTML5", Math.round(this.thinkingTimer / 1000));
    }
    this.thinkingTimer = 0;
};


PuzzleInput.prototype.showHoveredPiece = function( _piece )
{
	if ( !_piece ) return;

	// don't show the hovered piece if it is already selected
	if ( !this.selectedPiece || this.selectedPiece != _piece )
	{
		if ( this.lastHovered && this.lastHovered !== _piece )
		{
			this.lastHovered.removeFilter( World.brighter2 );
			this.lastHovered = null;
		}

		_piece.addFilter( World.brighter2 );
		this.lastHovered = _piece;

		// don't change the hovered piece if it is already shown
		if ( !this.hoveredPiece || !this.hoveredPiece.piece || this.hoveredPiece.piece.symbol != _piece.symbol)
		{
			if ( this.hoveredPiece )
				this.removeHoverPiece();

			var sprite = new Sprite();
            sprite.create( Main.rightUI, "cube_" + _piece.symbol + "_1", this.managers.textures, -0.02, World.SelectionPreviewY, true );
            if ( _piece.isOverridden() )
                sprite.setFrame( "cube_" + _piece.parent.overrideTileKey + "_1" );
			sprite.anchor.x = sprite.anchor.y = 0.5;
			sprite.scale.x = sprite.scale.y = Tile.scale / Main.tileAssetScale;
			this.hoveredPiece = {
				piece: _piece,
				sprite: sprite,
				fallSpeed: 0
			};
		}
		return;
	}

	if ( this.lastHovered )
	{
		this.lastHovered.removeFilter( World.brighter2 );
		this.lastHovered = null;
	}
};


PuzzleInput.prototype.removeHoverPiece = function()
{
	if ( this.lastHovered )
	{
		this.lastHovered.removeFilter( World.brighter2 );
		this.lastHovered = null;
	}

	if ( this.hoveredPiece )
	{
        this.hoveredPiece.piece = null;
		if ( this.sprites )
		{
			var s = this.hoveredPiece.sprite;
			this.sprites.push( s );
			this.hoveredPiece.sprite.addFader( -0.1, 1, this.destroySprite, this, s, 0 );
		}
		else
		{
			// if this.sprites has gone, we must destroy the sprite instantly instead of fading it
			this.hoveredPiece.sprite.destroy();
		}
		this.hoveredPiece = null;
	}
};


PuzzleInput.prototype._chainBonusScoring = function( _piece )
{
	// handle chain bonus scoring
	var isChain = false;
	if ( this.lastMatchTime !== -1 && Main.time <= this.lastMatchTime + this.puzzle.speedMatchTime * 1000 )
	{
		this.chain++;
		isChain = true;

		// convert multiplier value into two digits
		var str = this.chain.toString();
		var digit1 = "speed" + str[0];
		var digit2;
		if ( str.length > 1 )
			digit2 = "speed" + str[1];

		// create the three sprites (multiplier, and up to two digits)
		var s = new Sprite();
		// _parent, _key, _textureManager, _x, _y, _pcnt
		s.create( _piece.parent, "speedmatch", this.managers.textures, _piece.x, _piece.y, false );
		s.anchor.set( 0.5 );
        s.tz = -1000;
		if ( this.spriteList )
			this.spriteList.push(s);
		s = new Sprite();
		// 156 = offset of tl corner from tl corner of parent, 308 = width parent, 55 = width child
		s.create( _piece.parent, digit1, this.managers.textures, _piece.x + 156 - 308/2 + 55/2, _piece.y + 39 - 157/2 + 48/2, false );
		s.anchor.set( 0.5 );
        s.tz = -1000;
		if ( this.spriteList )
			this.spriteList.push(s);
		if ( digit2 )
		{
			s = new Sprite();
			// 156 = offset of tl corner from tl corner of parent, 308 = width parent, 55 = width child
			s.create( _piece.parent, digit2, this.managers.textures, _piece.x + 156 - 308/2 + 55/2 + 48, _piece.y + 39 - 157/2 + 48/2, false );
			s.anchor.set( 0.5 );
            s.tz = -1000;
			if ( this.spriteList )
				this.spriteList.push(s);
		}

        // ensure effect is at the correct z depth
        _piece.parent.reSort();
	}
	else
	{
		this.chain = 1;
	}

	return isChain;
};


PuzzleInput.prototype._multiBonusScoring = function( _piece )
{
	// handle multimatch bonus scoring
	if ( _piece.symbol == this.lastMatchType )
	{
		this.multiMatch += (this.multiMatch === 0) ? 2 : 1;

		// convert multiplier value into two digits in the tween list (0=background, 1 & 2 = the digits)
		var str = this.multiMatch.toString();
		var digit1 = "multi" + str[0];
		var digit2;
		if ( str.length > 1 )
			digit2 = "multi" + str[1];

		// create the three sprites (multiplier, and up to two digits)
		var s = new Sprite();
		// _parent, _key, _textureManager, _x, _y, _pcnt
		s.create( _piece.parent, "multimatch", this.managers.textures, _piece.x, _piece.y + 150, false );
		s.anchor.set( 0.5 );
        s.tz = -1000;
		if ( this.spriteList )
			this.spriteList.push(s);
		s = new Sprite();
		// 146 = offset of tl corner from tl corner of parent, 286 = width parent, 55 = width child
		s.create( _piece.parent, digit1, this.managers.textures, _piece.x + 146 - 286/2 + 55/2, _piece.y + 150 + 47 - 161/2 + 48/2, false );
		s.anchor.set( 0.5 );
        s.tz = -1000;
		if ( this.spriteList )
			this.spriteList.push(s);
		if ( digit2 )
		{
			s = new Sprite();
			// 146 = offset of tl corner from tl corner of parent, 286 = width parent, 55 = width child
			s.create( _piece.parent, digit2, this.managers.textures, _piece.x + 146 - 286/2 + 55/2 + 48, _piece.y + 150 + 47 - 161/2 + 48/2, false );
			s.anchor.set( 0.5 );
            s.tz = -1000;
			if ( this.spriteList )
				this.spriteList.push(s);
		}

        // ensure effect is at the correct z depth
        _piece.parent.reSort();
	}
	else
	{
		this.multiMatch = 0;
	}
};


PuzzleInput.prototype._timeBonusScoring = function( _piece, _timeBonus )
{
    if ( isNaN(_timeBonus) && Main.debug )
    {
        alert("ERROR: _timeBonus NaN!");
    }
    
    // convert _timeBonus value into three digits in the tween list (0=background, 1 & 2 = the digits)
    // time format is X:YZ
    var str = Utils.timeToString( _timeBonus );
    var digit1, digit2, digit3;
    digit1 = "multi" + str[0];
    digit2 = "multi" + str[2];
    digit3 = "multi" + str[3];

    // create the sprites
    var s = new Sprite();
    // _parent, _key, _textureManager, _x, _y, _pcnt
    s.create( _piece.parent, "timematch", this.managers.textures, _piece.x, _piece.y + 150, false );
    s.anchor.set( 0.5 );
    s.tz = -1000;
    s.alpha = 1.2;              // start with alpha > 1 so there is a short period of no-fade before the update function fades them away
    if ( this.spriteList )
        this.spriteList.push(s);

    s = new Sprite();
    // 75 = offset of tl corner from tl corner of parent, 286 = width parent, 55 = width child
    s.create( _piece.parent, digit1, this.managers.textures, _piece.x + 75 - 286/2 + 55/2, _piece.y + 140 + 47 - 161/2 + 48/2, false );
    s.anchor.set( 0.5 );
    s.tz = -1000;
    s.alpha = 1.2;
    if ( this.spriteList )
        this.spriteList.push(s);

    s = new Sprite();
    s.create( _piece.parent, "colon", this.managers.textures, _piece.x + 75 - 286/2 + 55/2 + 40, _piece.y + 140 + 47 - 161/2 + 48/2, false );
    s.anchor.set( 0.5 );
    s.tz = -1000;
    s.alpha = 1.2;
    if ( this.spriteList )
        this.spriteList.push(s);

    s = new Sprite();
    s.create( _piece.parent, digit2, this.managers.textures, _piece.x + 75 - 286/2 + 55/2 + 40 + 40, _piece.y + 140 + 47 - 161/2 + 48/2, false );
    s.anchor.set( 0.5 );
    s.tz = -1000;
    s.alpha = 1.2;
    if ( this.spriteList )
        this.spriteList.push(s);

    s = new Sprite();
    s.create( _piece.parent, digit3, this.managers.textures, _piece.x + 75 - 286/2 + 55/2 + 40 + 40 + 52, _piece.y + 140 + 47 - 161/2 + 48/2, false );
    s.anchor.set( 0.5 );
    s.tz = -1000;
    s.alpha = 1.2;
    if ( this.spriteList )
        this.spriteList.push(s);

    // ensure effect is at the correct z depth
    _piece.parent.reSort();
};
