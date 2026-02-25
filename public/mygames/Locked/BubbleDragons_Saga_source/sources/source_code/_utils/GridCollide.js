//
// GridCollide.js
//
// Pete Baron 2017
//
// Functions and data to permit a free-moving object to collide against a list
// of objects in fixed grid positions efficiently.
//




GridCollide = function()
{

};


GridCollide.prototype.create = function( _grid, _spacingx, _spacingy )
{
    // the grid to collide with
    this.grid = _grid;
    // vertical offset in Main.stage pixels (both gameUILayer and bubbleLayer are added to that)
    this.offsetY = 0;
    // size of grid 'squares'
    this.spacingx = _spacingx;
    this.spacingy = _spacingy;
};


GridCollide.prototype.destroy = function()
{
    if ( Main.debug )
        console.log("GridCollide.destroy");
    this.grid = null;
};


GridCollide.prototype.gameUiToGrid = function( _gameUI )
{
    var x = (_gameUI.x + Game.gridOffsetX) / this.spacingx;
    var y = (_gameUI.y + Game.gridOffsetY - this.offsetY) / this.spacingy;
    var rx = Math.round(x);
    var ry = Math.round(y);

    // prevent outside the grid errors
    if ( ry < 0 ) { console.log("gameUiToGrid outside y " + ry); ry = 0; }
    if ( ry >= this.grid.length )  { console.log("gameUiToGrid outside y " + ry); ry = this.grid.length - 1; }
    if ( rx < 0 )  { console.log("gameUiToGrid outside x " + rx); rx = 0; }
    if ( rx >= this.grid[ry].length )  { console.log("gameUiToGrid outside x " + rx); rx = this.grid[ry].length - 1; }

    if ( this.grid[ry][rx] == -1 )
    {
        if ( rx >= this.grid[ry].length - 1 || ( rx > 0 && x - Math.floor(x) >= 0.5 ) )
            return { x: rx - 1, y: ry };
        return { x: rx + 1, y: ry };
    }

    return { x: rx, y: ry };
};


GridCollide.prototype.bubbleToGrid = function( _sprite )
{
    var x = (_sprite.x + Game.gridOffsetX) / this.spacingx;
    var y = (_sprite.y + Game.gridOffsetY) / this.spacingy;

    var rx = Math.round(x);
    var ry = Math.round(y);
    if ( ry >= 0 && ry < this.grid.length )
    {
        if ( rx >= 0 && rx < this.grid[ry].length )
        {
            // landed in a no-go slot
            if ( this.grid[ry][rx] == -1 )
            {
                // edges
                if ( rx >= this.grid[ry].length - 1 )
                    return { x: rx - 1, y: ry };
                if ( rx <= 0 )
                    return { x: rx + 1, y: ry };
                // nearest direction
                if ( x - Math.floor(x) < 0.5 )
                    return { x: rx - 1, y: ry };
                return { x: rx + 1, y: ry };
            }
            return { x: rx, y: ry };
        }
    }

    // return 'grid' location even if we're outside the grid region
    if ( Main.debug )
        console.log("WARNING: bubbleToGrid outside of grid. rx=" + rx + " ry=" + ry);
    return { x: rx, y: ry };
};


GridCollide.prototype.bubbleToFractionalGrid = function( _sprite )
{
    var x = (_sprite.x + Game.gridOffsetX) / this.spacingx;
    var y = (_sprite.y + Game.gridOffsetY) / this.spacingy;
    return { x: x, y: y };
};


// GridCollide.prototype.findNearestAvailable = function( _gx, _gy )
// {
//     var nearest = { x: _gx, y: _gy };
//     var far = Number.POSITIVE_INFINITY;
//     for(var y = _gy-1; y <= _gy+1; y++)
//         if (y >= 0 && y < this.grid.length )
//         {
//             var fy = Math.floor(y);
//             var dy = _gy - y;
//             for(var x = _gx-2; x <= _gx+2; x++)
//                 if (x >= 0 && x < this.grid[fy].length)
//                 {
//                     var fx = Math.floor(x);
//                     if (!this.grid[fy][fx])
//                     {
//                         var dx = _gx - x;
//                         var d2 = dx * dx + dy * dy;
//                         if (d2 < far)
//                         {
//                             far = d2;
//                             nearest.x = fx;
//                             nearest.y = fy;
//                         }
//                     }
//                 }
//         }
//     return nearest;
// };


GridCollide.prototype.gridToGameUi = function( _loc )
{
    var x = _loc.x * this.spacingx - Game.gridOffsetX;
    var y = _loc.y * this.spacingy - Game.gridOffsetY + this.offsetY;
    return { x: x, y: y };
};


GridCollide.prototype.gridToBubble = function( _loc )
{
    var x = _loc.x * this.spacingx - Game.gridOffsetX;
    var y = _loc.y * this.spacingy - Game.gridOffsetY;
    return { x: x, y: y };
};


GridCollide.prototype.gameUiToBubble = function( _gameUI )
{
    return { x: _gameUI.x, y: _gameUI.y - this.offsetY };
};


GridCollide.prototype.bubbleToGameUi = function( _bubbleSprite )
{
    return { x: _bubbleSprite.x, y: _bubbleSprite.y + this.offsetY };
};


GridCollide.prototype.empty = function( _grid )
{
    if ( _grid.y < 0 || _grid.y >= this.grid.length ) return false;
    if ( _grid.x < 0 || _grid.x >= this.grid[_grid.y].length ) return false;

    var g = this.grid[_grid.y][_grid.x];
    return ( !g );
};


GridCollide.prototype.get = function( _grid )
{
    var fy = Math.floor(_grid.y);
    if ( fy < 0 || fy >= this.grid.length ) return null;
    var fx = Math.floor(_grid.x);
    if ( fx < 0 || fx >= this.grid[fy].length ) return null;

    return this.grid[fy][fx];
};


GridCollide.prototype.collide = function( _gameUI, _radius )
{
    var possibleHits = [];

    var loc = this.gameUiToGrid(_gameUI);
    for(var y = loc.y - _radius; y <= loc.y + _radius; y++)
    {
        if ( y >= 0 && y < this.grid.length )
            for(var x = loc.x - _radius * 2; x <= loc.x + _radius * 2; x++)
            {
                if (x >= 0 && x < this.grid[y].length )
                {
                    var o = this.grid[y][x];
                    if ( o && o !== -1 )
                        possibleHits.push( this.grid[y][x] );
                }
            }
    }

    return possibleHits;
};


GridCollide.prototype.outsideGrid = function( _bubbleLoc )
{
    var ox = _bubbleLoc.x;
    if ( ox < -Game.gridOffsetX ) return true;
    if ( ox > Game.gridOffsetX) return true;
    var oy = _bubbleLoc.y + Game.gridOffsetY; // + this.offsetY;
    if ( oy < Game.mapTop[Game.levelType] ) return true;
    return false;
};


GridCollide.prototype.randomLocation = function( _grid, _occupied, _rndFnc )
{
    if ( _rndFnc === undefined )
        _rndFnc = Math.random;

    var rx, ry;
    do
    {
        ry = Math.floor(_rndFnc() * _grid.length);
        rx = Math.floor(_rndFnc() * _grid[ry].length);
    } while( _grid[ry][rx] == -1 || (_occupied && !_grid[ry][rx]) );

    return { x: rx, y: ry };
};


GridCollide.prototype.removeBubble = function( _bubble )
{
    if ( !this.grid ) return;   // can happen if bubble is destroyed after GridCollide is destroyed
    var loc = this.bubbleToGrid( _bubble.sprite );
    var b = this.get( loc );
    if ( b == _bubble )
    {
        if ( Main.debugSpam )
            console.log("GridCollide.removeBubble " + _bubble.key + " at " + loc.x + "," + loc.y);
        this.grid[loc.y][loc.x] = 0;
    }
};
