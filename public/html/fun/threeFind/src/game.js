let game;

let gameOptions =
{
    gemSize: 100,
    swapSpeed: 200,
    destroySpeed: 200,
    boardOffset:
    {
        x: 100,
        y: 50
    }
}


let inputOptions =
{
    dragThreshold: 4,                    // how many pixels movement constitutes a drag
    dragSwap: gameOptions.gemSize / 2,   // how far must a piece be dragged before it auto-completes a swap
    notMovedThreshold: 2,                // how many pixels movement constitutes a 'move' (allows long taps)
    tapMaxDuration: 500,                 // maximum time a 'tap' can be held before it's not a tap (unless no movement)
}


Math.sign0 = function(a)
{
    if (a < 0) return -1;
    if (a > 0) return 1;
    return 0;
}


window.onload = function()
{
    let gameConfig =
    {
        width: 900,
        height: 900,            // native size
        scene: playGame,
        backgroundColor: 0x2f2f5f
    }
    game = new Phaser.Game( gameConfig );
    window.focus()
    resize();
    window.addEventListener( "resize", resize, false );
}


GameState =
{
    NONE: -1,
    INPUT: 0,
    SWAPPING: 1,
    UNDOSWAP: 2,
    CHECKING: 3,
    MATCHING: 4,
    REFILLING: 5,
    WAITING: 6
};


class playGame extends Phaser.Scene
{
    constructor()
    {
        super( "ThreeFind" );
    }


    preload()
    {
        this.load.spritesheet( "gems", "./grfx/gems.png",
        {
            frameWidth: gameOptions.gemSize,
            frameHeight: gameOptions.gemSize
        } );
    }


    create()
    {
        this.match3 = new Match3(
        {
            rows: 7,
            columns: 5,
            types: 6,
            empty: 6
        } );

        this.state = GameState.INPUT;
        this.lastState = GameState.NONE;

        this.swapCount = 0;
        this.swapFromTo = {};

        this.matchCount = 0;
        this.whereDown = null;

        this.poolArray = [];
        this.match3.createBoard();
        this.drawField();

        this.isHolding = null;
        this.isDragging = null;
    }


    // game control state machine
    update()
    {
        let newState = (this.state != this.lastState);
        this.lastState = this.state;

        switch(this.state)
        {
            case GameState.INPUT:
                this.userInput();
                break;
            case GameState.SWAPPING:
                if ( newState )
                    this.swapGems( this.swapFromTo );
                this.swapping();
                break;
            case GameState.UNDOSWAP:
                if ( newState )
                    this.swapGems( this.swapFromTo );
                this.swapUndo();
                break;
            case GameState.CHECKING:
                this.checking()
                break;
            case GameState.MATCHING:
                if ( newState )
                    this.handleMatches();
                this.matching();
                break;
            case GameState.REFILLING:
                if ( newState )
                    this.refillGems();
                this.refilling();
                break;
            case GameState.WAITING:
                if (this.time.now > this.waitTime)
                    this.state = this.nextState;
                break;
        }
    }


    userInput()
    {
        let pointer = this.input.activePointer;
        let dx = pointer.position.x - pointer.downX;
        let dy = pointer.position.y - pointer.downY;
        let d = Math.sqrt( dx * dx + dy * dy );

        if ( this.isHolding )
        {
            let spr = this.isHolding.sprite;
            // holding a piece without much movement
            if ( pointer.isDown )
            {
                if ( d >= inputOptions.dragThreshold )
                {
                    console.log("dragging");
                    // convert from hold into drag
                    this.isDragging = this.isHolding;
                    this.isHolding = null;
                }
                else if ( this.time.now - pointer.downTime > inputOptions.tapMaxDuration )
                {
                    // hold timed-out, it will no longer become a tap
                    spr.setScale( 1.0 );
                }
            }
            else
            {
                // released it
                let t = pointer.upTime - pointer.downTime;
                console.log("held for " + t + " moved " + d);
                if ( t <= inputOptions.tapMaxDuration )
                {
                    // tapped a piece, flip it over
                    this.match3.flipPiece( this.isHolding.row, this.isHolding.column );
                    // update the sprite picture
                    this.isHolding.sprite.setFrame( this.isHolding.value[ this.isHolding.topSide ] );
                    this.state = GameState.CHECKING;
                }
                // return to normal size
                spr.setScale( 1.0 );
                spr.setDepth( 0 );
                this.isHolding = null;
            }
        }
        else if ( this.isDragging )
        {
            let spr = this.isDragging.sprite;
            // dragging a piece
            if ( pointer.isDown )
            {
                // primary drag direction
                if (Math.abs(dx) > Math.abs(dy))
                {
                    // prevent movement if there's no swap gem in that direction (edges)
                    if (( dx < 0 && this.isDragging.column > 0 ) ||
                        ( dx > 0 && this.isDragging.column < this.match3.columns - 1 ))
                    {
                        // TODO: mirror movement for the swap gem
                        // limit distance to one gem
                        if ( Math.abs(dx) <= gameOptions.gemSize )
                        {
                            spr.x = pointer.position.x;
                            spr.y = gameOptions.boardOffset.y + gameOptions.gemSize * this.isDragging.row + gameOptions.gemSize / 2 ;
                        }
                    }
                }
                else
                {
                    // limit distance to one gem
                    if (( dy < 0 && this.isDragging.row > 0 ) ||
                        ( dy > 0 && this.isDragging.row < this.match3.rows - 1 ))
                    {
                        if ( Math.abs(dy) <= gameOptions.gemSize )
                        {
                            spr.x = gameOptions.boardOffset.x + gameOptions.gemSize * this.isDragging.column + gameOptions.gemSize / 2;
                            spr.y = pointer.position.y;
                        }
                    }
                }
            }
            else
            {
                if ( d >= inputOptions.dragSwap )
                {
                    // dragged far enough to cause a swap
                    if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
                    let dragFrom = { row: this.isDragging.row, column: this.isDragging.column };
                    let dragTo = { row: dragFrom.row + Math.sign0(dy), column: dragFrom.column + Math.sign0(dx) };
                    console.log("dragged " + dragFrom.column+","+dragFrom.row + " to " + dragTo.column+","+dragTo.row);
                    this.swapFromTo = { from: dragFrom, to: dragTo };
                    this.state = GameState.SWAPPING;
                }
                else
                {
                    // snap back to original location
                    // TODO: also snap back the swap gem
                    this.spriteToGrid( spr, this.isDragging );
                }
                // return to normal size
                spr.setScale( 1.0 );
                spr.setDepth( 0 );
                this.isDragging = null;
            }
        }
        else
        {
            if ( pointer.justDown )
            {
                console.log("justDown");

                // selecting a piece?
                let py = Math.floor( ( pointer.y - gameOptions.boardOffset.y ) / gameOptions.gemSize );
                let px = Math.floor( ( pointer.x - gameOptions.boardOffset.x ) / gameOptions.gemSize );
                if ( this.match3.validPick( py, px ) )
                {
                    let selectedGem = this.match3.get( py, px );
                    if ( selectedGem && !selectedGem.isEmpty )
                    {
                        console.log("selected " + selectedGem.column + "," + selectedGem.row);
                        this.isHolding = selectedGem;
                        let spr = selectedGem.sprite;
                        // make selected piece a bit bigger than usual and in front of all others
                        spr.setScale( 1.2 );
                        spr.setDepth( 1 );
                    }
                }
            }
        }
    }


    checking()
    {
        if ( this.match3.matchInBoard() )
        {
            this.nextState = GameState.MATCHING;
            this.state = GameState.WAITING;
            this.waitTime = this.time.now + 50;
        }
        else
        {
            this.state = GameState.INPUT;
        }
    }


    swapping()
    {
        if ( this.swapCount == 0 )
        {
            // finished swapping
            if ( !this.match3.matchInBoard() )
            {
                // the swap failed, undo it
                let tmp = Object.assign(this.swapFromTo.from);
                this.swapFromTo.from = Object.assign(this.swapFromTo.to);
                this.swapFromTo.to = Object.assign(tmp);
                this.state = GameState.UNDOSWAP;
            }
            else
            {
                // the swap was successful, find and handle matches
                this.state = GameState.CHECKING;
            }
        }
    }


    swapUndo()
    {
        if ( this.swapCount == 0 )
        {
            // finished undoing a swap, wait for user input
            this.state = GameState.INPUT;
        }
    }


    swapGems( swapFromTo )
    {
        // swap the board pieces leaving the sprites where they are
        let movements = this.match3.swapPieces( swapFromTo.from, swapFromTo.to );

        // set up sprite movements to move to their new destinations
        this.swapCount = movements.length;
        for( var i = 0; i < this.swapCount; i++ )
        {
            let movement = movements[i];

            // move the swapping sprites
            let spr = this.match3.getSprite( movement.row, movement.column );
            let dest = { x: spr.x, y: spr.y };
            this.spriteToGrid( dest, movement );

            this.tweens.add(
                {
                    targets: spr,
                    x: dest.x,
                    y: dest.y,
                    duration: gameOptions.swapSpeed,
                    callbackScope: this,
                    onComplete: function()
                    {
                        this.swapCount--;
                    }
                } );
        }
    }


    matching()
    {
        if ( this.matchCount == 0 )
        {
            // finished matching, find and handle matches
            this.match3.removeMatches();
            this.state = GameState.REFILLING;
        }
    }


    handleMatches()
    {
        let gemsToRemove = this.match3.getMatchList();
        this.matchCount = gemsToRemove.length;

        for(let i = 0; i < this.matchCount; i++)
        {
            let gem = this.match3.get( gemsToRemove[i] );

            // fade out the matched sprites
            this.tweens.add(
                {
                    targets: gem.sprite,
                    alpha: 0,
                    duration: gameOptions.destroySpeed,
                    callbackScope: this,
                    onComplete: function( context, targets )
                    {
                        // put the faded sprite back into the pool
                        this.poolArray.push( targets[0] );
                        this.matchCount--;
                    }
                } );
        }
    }


    refilling()
    {
    }


    // create a new piece for every empty location in the board and slide it into place
    refillGems()
    {
        let added = 0;
        let newPieces = this.match3.replenishBoard();
        for( let i = 0, l = newPieces.length; i < l; i++ )
        {
            let dest = newPieces[i];
            let piece = this.match3.get( dest );

            added++;

            let sprite = this.poolArray.pop();
            sprite.alpha = 0;
            this.spriteToGrid( sprite, dest );
            sprite.setFrame( piece.value[ piece.topSide ] );
            piece.sprite = sprite;

            this.tweens.add(
            {
                targets: sprite,
                alpha: 1.0,
                duration: 0.5,
                callbackScope: this,
                onComplete: function()
                {
                    added--;
                    if ( added == 0 )
                    {
                        this.state = GameState.CHECKING;
                    }
                }
            } );
        }
    }


    drawField()
    {
        for ( let i = 0; i < this.match3.getRows(); i++ )
        {
            for ( let j = 0; j < this.match3.getColumns(); j++ )
            {
                let gemX = gameOptions.boardOffset.x + gameOptions.gemSize * j + gameOptions.gemSize / 2;
                let gemY = gameOptions.boardOffset.y + gameOptions.gemSize * i + gameOptions.gemSize / 2
                let gem = this.add.sprite( gemX, gemY, "gems", this.match3.valueAt( i, j ) );
                this.match3.setSprite( i, j, gem );
            }
        }
    }

    spriteToGrid( _obj, _loc )
    {
        _obj.x = gameOptions.boardOffset.x + gameOptions.gemSize * _loc.column + gameOptions.gemSize / 2;
        _obj.y = gameOptions.boardOffset.y + gameOptions.gemSize * _loc.row + gameOptions.gemSize / 2 ;
    }


    // handlePops()
    // {
    //     let gemsToEmpty = this.match3.getMatchList();
    //     let destroy = gemsToEmpty.length;
    //     gemsToEmpty.forEach( function( gem )
    //     {
    //         this.poolArray.push( this.match3.customDataOf( gem.row, gem.column ) );
    //         this.tweens.add(
    //         {
    //             targets: this.match3.customDataOf( gem.row, gem.column ),
    //             alpha: 0,
    //             duration: gameOptions.destroySpeed,
    //             callbackScope: this,
    //             onComplete: function( event, sprite )
    //             {
    //                 destroy--;
    //                 if ( destroy == 0 )
    //                 {
    //                     this.makeGemsFall();
    //                 }
    //             }
    //         } );
    //     }.bind( this ) );
    // }

}


function resize()
{
    var canvas = document.querySelector( "canvas" );
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    var windowRatio = windowWidth / windowHeight;
    var gameRatio = game.config.width / game.config.height;
    if ( windowRatio < gameRatio )
    {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = ( windowWidth / gameRatio ) + "px";
    }
    else
    {
        canvas.style.width = ( windowHeight * gameRatio ) + "px";
        canvas.style.height = windowHeight + "px";
    }
}