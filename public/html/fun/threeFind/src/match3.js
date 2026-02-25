
class Piece
{
    constructor( obj )
    {
        this.value = obj.value;        // list of values, one for each side of the piece
        this.topSide = obj.topSide;    // index to the current top side of the piece in the value list
        this.isEmpty = obj.isEmpty;
        this.row = obj.row;
        this.column = obj.column;
        this.sprite = obj.sprite;
    }
}


class Match3
{
    constructor( obj )
    {
        this.rows = obj.rows;
        this.columns = obj.columns;
        this.types = obj.types;
        this.emptyContainer = obj.empty;
    }


    createBoard()
    {
        this.gameArray = [];
        for ( let i = 0; i < this.rows; i++ )
        {
            this.gameArray[ i ] = [];
            for ( let j = 0; j < this.columns; j++ )
            {
                let piece = new Piece(
                    {
                        value: null,
                        topSide: 0,
                        isEmpty: true,
                        row: i,
                        column: j,
                        sprite: null
                    });
                this.gameArray[ i ][ j ] = piece;
                // keep picking random colours until it's not part of a match and the sides are different from each other
                do {
                    this.randomPiece( piece );
                } while ( this.isPartOfMatch( i, j ) || piece.value[0] == piece.value[1] );
            }
        }
    }


    randomPiece( piece )
    {
        let side0Value = Math.floor( Math.random() * this.types );
        let side1Value = Math.floor( Math.random() * this.types );
        piece.value = [ side0Value, side1Value ];
        piece.topSide = Math.floor( Math.random() * 2 );
        piece.isEmpty = false;
    }


    // returns true if there is a match in the board
    matchInBoard()
    {
        for ( let i = 0; i < this.rows; i++ )
        {
            for ( let j = 0; j < this.columns; j++ )
            {
                if ( this.isPartOfMatch( i, j ) )
                {
                    return true;
                }
            }
        }
        return false;
    }

    // returns true if the Piece at (row, column) is part of a match
    isPartOfMatch( row, column )
    {
        var i = this.valueAt( row, column );

        // invalid locations and empty containers don't match anything
        if (i == -1 || i == this.emptyContainer)
            return false;

        var n = this.matchNeighbours( row, column );
        return (n >= 2) ||
            (i == this.valueAt( row - 1, column ) && this.matchNeighbours( row - 1, column ) >= 2) ||
            (i == this.valueAt( row + 1, column ) && this.matchNeighbours( row + 1, column ) >= 2) ||
            (i == this.valueAt( row, column - 1 ) && this.matchNeighbours( row, column - 1 ) >= 2) ||
            (i == this.valueAt( row, column + 1 ) && this.matchNeighbours( row, column + 1 ) >= 2);
    }

    // returns count of neighbours that match this one
    matchNeighbours( row, column )
    {
        var n = 0;
        var i = this.valueAt( row, column );
        if (i == -1) return 0;
        if (i == this.valueAt( row - 1, column )) n++;
        if (i == this.valueAt( row + 1, column )) n++;
        if (i == this.valueAt( row, column - 1 )) n++;
        if (i == this.valueAt( row, column + 1 )) n++;
        return n;
    }

    // returns the value of the Piece at (row, column), or -1 if it's not a valid pick
    valueAt( row, column )
    {
        if ( !this.validPick( row, column ) )
        {
            return -1;
        }
        var piece = this.gameArray[ row ][ column ];
        return piece.value[ piece.topSide ];
    }

    // returns true if the Piece at (row, column) is a valid pick
    validPick( row, column )
    {
        return  (row >= 0) && 
                (row < this.rows) &&
                (column >= 0) && 
                (column < this.columns) && 
                (this.gameArray[ row ] != undefined) && 
                (this.gameArray[ row ][ column ] != undefined) &&
                (this.gameArray[ row ][ column ].value[this.gameArray[ row ][ column ].topSide] != this.emptyContainer);
    }


    // returns the number of board rows
    getRows()
    {
        return this.rows;
    }


    // returns the number of board columns
    getColumns()
    {
        return this.columns;
    }


    // returns the entire board Piece at (row, column)
    get( first, column )
    {
        if ( column === undefined )
        {
            return this.gameArray[ first.row ][ first.column ];
        }
        return this.gameArray[ first ][ column ];
    }


    // sets a custom data on the Piece at (row, column)
    setSprite( row, column, sprite )
    {
        this.gameArray[ row ][ column ].sprite = sprite;
    }


    // returns the custom data of the Piece at (row, column)
    getSprite( first, column )
    {
        if ( column === undefined )
        {
            return this.gameArray[ first.row ][ first.column ].sprite;
        }
        return this.gameArray[ first ][ column ].sprite;
    }


    // checks if the Piece at (row, column) is the same as the Piece at (row2, column2)
    areTheSame( row, column, row2, column2 )
    {
        return row == row2 && column == column2;
    }


    // returns true if two Piece at (row, column) and (row2, column2) are next to each other horizontally or vertically
    areNext( row, column, row2, column2 )
    {
        return Math.abs( row - row2 ) + Math.abs( column - column2 ) == 1;
    }


    // swap the Piece between swapFrom and swapTo and returns an object with movement information
    swapPieces( swapFrom, swapTo )
    {
        let fromClone = Object.assign( {}, this.gameArray[ swapFrom.row ][ swapFrom.column ] );
        fromClone.row = swapTo.row;
        fromClone.column = swapTo.column;
        let toClone = Object.assign( {}, this.gameArray[ swapTo.row ][ swapTo.column ] );
        toClone.row = swapFrom.row;
        toClone.column = swapFrom.column;

        this.gameArray[ swapFrom.row ][ swapFrom.column ] = toClone;
        this.gameArray[ swapTo.row ][ swapTo.column ] = fromClone;

        return [
            {
                row: swapFrom.row,
                column: swapFrom.column,
                deltaRow: swapFrom.row - swapTo.row,
                deltaColumn: swapFrom.column - swapTo.column
            },
            {
                row: swapTo.row,
                column: swapTo.column,
                deltaRow: swapTo.row - swapFrom.row,
                deltaColumn: swapTo.column - swapFrom.column
            } ];
    }


    // return the Piece part of a match in the board as an array of {row, column} object
    getMatchList()
    {
        let matches = [];
        for ( let i = 0; i < this.rows; i++ )
        {
            for ( let j = 0; j < this.columns; j++ )
            {
                if ( this.isPartOfMatch( i, j ) )
                {
                    matches.push(
                    {
                        row: i,
                        column: j
                    } );
                }
            }
        }
        return matches;
    }


    // removes all Pieces forming a match
    removeMatches()
    {
        let matches = this.getMatchList();
        matches.forEach( function( piece )
        {
            this.setEmpty( piece.row, piece.column )
        }.bind( this ) )
    }


    // set the Piece at (row, column) as empty
    setEmpty( row, column )
    {
        this.gameArray[ row ][ column ].isEmpty = true;
    }


    // returns true if the Piece at (row, column) is empty
    isEmpty( row, column )
    {
        return this.gameArray[ row ][ column ].isEmpty;
    }


/*
    // returns the amount of empty spaces below the Piece at (row, column)
    emptySpacesBelow( row, column )
    {
        let result = 0;
        if ( row != this.getRows() )
        {
            for ( let i = row + 1; i < this.getRows(); i++ )
            {
                if ( this.isEmpty( i, column ) )
                {
                    result++;
                }
            }
        }
        return result;
    }


    // arranges the board after a match, making Pieces fall down. Returns an object with movement information
    arrangeBoardAfterMatch()
    {
        let result = []
        for ( let i = this.getRows() - 2; i >= 0; i-- )
        {
            for ( let j = 0; j < this.getColumns(); j++ )
            {
                let emptySpaces = this.emptySpacesBelow( i, j );
                if ( !this.isEmpty( i, j ) && emptySpaces > 0 )
                {
                    this.swapPieces( { row: i, column: j }, { row: i + emptySpaces, column: j } );
                    result.push(
                    {
                        row: i + emptySpaces,
                        column: j,
                        deltaRow: emptySpaces,
                        deltaColumn: 0
                    } );
                }
            }
        }
        return result;
    }
*/


    // replenish the board and return an object with new piece location information
    replenishBoard()
    {
        let result = [];
        for ( let row = 0; row < this.rows; row++ )
        {
            for ( let col = 0; col < this.columns; col++ )
            {
                if ( this.isEmpty( row, col ) )
                {
                    let piece = this.get( row, col );
                    do {
                        this.randomPiece( piece );
                    } while ( piece.value[0] == piece.value[1] );
                    result.push( { row: row, column: col } );
                }
            }
        }
        return result;
    }


    setLocation( row, column, value0, value1, sprite )
    {
        let piece = this.gameArray[ row ][ column ];
        piece.value = [ value0, value1 ];
        piece.isEmpty = false;
        this.setSprite( row, column, sprite );
    }


    flipPiece( row, column )
    {
        let piece = this.gameArray[ row ][ column ];
        piece.topSide = piece.topSide ^ 1;
    }

}
