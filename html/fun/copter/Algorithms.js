/**
 * Created by Pete on 21/05/2014.
 */



function overlapRange(x, rangeList, halfWide)
{
    if (rangeList.length === 0)
        return false;

    for (var i = 0; i < rangeList.length; i++)
    {
        if (x + halfWide > rangeList[i].left)
        {
            if (x - halfWide <= rangeList[i].right)
            {
                return true;
            }
        }
    }
    return false;
}


/// @return: list of left/right edge pairs for each object.sprite in 'list'
function getRoofRanges(list)
{
    var ranges = [];
    for(var i = 0; i < list.length; i++)
    {
        var s = list[i].sprite;
        var r = s.getBounds();
        ranges.push({left:r.left + s.x, right:r.right + s.x, height: s.height});
    }
    return ranges;
}


function shrinkRanges(list, percent)
{
    for(var i = 0; i < list.length; i++)
    {
        var l = list[i].left;
        var r = list[i].right;
        var w = ((r - l) * (1 - percent)) * 0.5;
        list[i].left += w;
        list[i].right -= w;
    }
}


function destroyList(list)
{
    for(var i = list.length - 1; i >= 0; --i)
    {
        list[i].destroy();
        list.splice(i, 1);
    }
}


function pickRandomFromList(list)
{
    if (!list) return null;

    var r = Math.floor(Math.random() * list.length);
    return list[r];
}


function rndSpread(range)
{
    return Math.random() * range - range * 0.5;
}

