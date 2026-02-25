/**
 * Hex Grid - Axial coordinate system for flat-top hexagons
 * Provides coordinate math, neighbor finding, distance, and board generation
 */

var HexGrid = (function() {
    // Flat-top hex directions (axial coordinates)
    // Order: E, NE, NW, W, SW, SE
    var DIRECTIONS = [
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 0, r: -1 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: 0, r: 1 }
    ];

    function key(q, r) {
        return q + ',' + r;
    }

    function parseKey(k) {
        var parts = k.split(',');
        return { q: parseInt(parts[0]), r: parseInt(parts[1]) };
    }

    // Distance from center (0,0) in axial coords
    function hexDistance(q1, r1, q2, r2) {
        return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
    }

    function distFromCenter(q, r) {
        return hexDistance(q, r, 0, 0);
    }

    // Get all 6 neighbor coordinates
    function neighbors(q, r) {
        var result = [];
        for (var i = 0; i < 6; i++) {
            result.push({ q: q + DIRECTIONS[i].q, r: r + DIRECTIONS[i].r });
        }
        return result;
    }

    // Generate all hex positions within given radius
    function generateBoard(radius) {
        var cells = {};
        for (var q = -radius; q <= radius; q++) {
            for (var r = -radius; r <= radius; r++) {
                if (distFromCenter(q, r) <= radius) {
                    cells[key(q, r)] = { q: q, r: r, owner: 0 }; // owner: 0=empty, 1=player, 2=AI
                }
            }
        }
        return cells;
    }

    // Convert axial to pixel (flat-top)
    function axialToPixel(q, r, size) {
        var x = size * (3 / 2 * q);
        var y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
        return { x: x, y: y };
    }

    // Convert pixel to axial (flat-top)
    function pixelToAxial(px, py, size) {
        var q = (2 / 3 * px) / size;
        var r = (-1 / 3 * px + Math.sqrt(3) / 3 * py) / size;
        return hexRound(q, r);
    }

    // Round fractional axial to nearest hex
    function hexRound(q, r) {
        var s = -q - r;
        var rq = Math.round(q);
        var rr = Math.round(r);
        var rs = Math.round(s);

        var dq = Math.abs(rq - q);
        var dr = Math.abs(rr - r);
        var ds = Math.abs(rs - s);

        if (dq > dr && dq > ds) {
            rq = -rr - rs;
        } else if (dr > ds) {
            rr = -rq - rs;
        }

        return { q: rq, r: rr };
    }

    // Get flat-top hex corner points
    function hexCorners(cx, cy, size) {
        var corners = [];
        for (var i = 0; i < 6; i++) {
            var angle = Math.PI / 180 * (60 * i);
            corners.push({
                x: cx + size * Math.cos(angle),
                y: cy + size * Math.sin(angle)
            });
        }
        return corners;
    }

    // Find connected group of same-owner cells starting from (q, r)
    function floodFill(cells, q, r, owner) {
        var group = {};
        var stack = [key(q, r)];
        while (stack.length > 0) {
            var k = stack.pop();
            if (group[k]) continue;
            var cell = cells[k];
            if (!cell || cell.owner !== owner) continue;
            group[k] = true;
            var pos = parseKey(k);
            var nbrs = neighbors(pos.q, pos.r);
            for (var i = 0; i < nbrs.length; i++) {
                var nk = key(nbrs[i].q, nbrs[i].r);
                if (!group[nk]) stack.push(nk);
            }
        }
        return group;
    }

    // Check if a group is fully surrounded
    // A group is captured if every neighbor of every cell in the group that is NOT
    // part of the group is either: occupied by the opponent, or off the active board.
    // Empty cells or same-owner cells not in the group break the surround.
    function isGroupSurrounded(cells, group, activeRadius) {
        var keys = Object.keys(group);
        var groupOwner = cells[keys[0]].owner;
        for (var i = 0; i < keys.length; i++) {
            var pos = parseKey(keys[i]);
            var nbrs = neighbors(pos.q, pos.r);
            for (var j = 0; j < nbrs.length; j++) {
                var nk = key(nbrs[j].q, nbrs[j].r);
                if (group[nk]) continue; // same group cell, skip

                // If neighbor is within active board
                if (distFromCenter(nbrs[j].q, nbrs[j].r) <= activeRadius) {
                    var cell = cells[nk];
                    if (!cell || cell.owner === 0) return false; // empty = not surrounded
                    if (cell.owner === groupOwner) return false; // same-owner neighbor not in group = escape route
                }
                // Off-board neighbors count as "wall" = surrounded
            }
        }
        return true;
    }

    // Find all captures after a placement by 'placer'
    // Returns array of { group: {keys}, owner: originalOwner }
    function findCaptures(cells, activeRadius, placer) {
        var checked = {};
        var captures = [];
        var opponent = placer === 1 ? 2 : 1;

        var allKeys = Object.keys(cells);
        for (var i = 0; i < allKeys.length; i++) {
            var cell = cells[allKeys[i]];
            if (cell.owner !== opponent) continue;
            if (checked[allKeys[i]]) continue;

            var group = floodFill(cells, cell.q, cell.r, opponent);
            var groupKeys = Object.keys(group);
            for (var j = 0; j < groupKeys.length; j++) {
                checked[groupKeys[j]] = true;
            }

            if (isGroupSurrounded(cells, group, activeRadius)) {
                captures.push({ group: group, owner: opponent, size: groupKeys.length });
            }
        }

        return captures;
    }

    // Execute captures - flip all captured cells to placer's color
    function executeCaptures(cells, captures, placer) {
        var flipped = 0;
        for (var i = 0; i < captures.length; i++) {
            var keys = Object.keys(captures[i].group);
            for (var j = 0; j < keys.length; j++) {
                cells[keys[j]].owner = placer;
                flipped++;
            }
        }
        return flipped;
    }

    // Count cells by owner
    function countCells(cells, activeRadius) {
        var counts = { 0: 0, 1: 0, 2: 0 };
        var allKeys = Object.keys(cells);
        for (var i = 0; i < allKeys.length; i++) {
            var cell = cells[allKeys[i]];
            if (distFromCenter(cell.q, cell.r) <= activeRadius) {
                counts[cell.owner]++;
            }
        }
        return counts;
    }

    // Get all empty cells within active radius
    function getEmptyCells(cells, activeRadius) {
        var empty = [];
        var allKeys = Object.keys(cells);
        for (var i = 0; i < allKeys.length; i++) {
            var cell = cells[allKeys[i]];
            if (cell.owner === 0 && distFromCenter(cell.q, cell.r) <= activeRadius) {
                empty.push({ q: cell.q, r: cell.r });
            }
        }
        return empty;
    }

    return {
        DIRECTIONS: DIRECTIONS,
        key: key,
        parseKey: parseKey,
        hexDistance: hexDistance,
        distFromCenter: distFromCenter,
        neighbors: neighbors,
        generateBoard: generateBoard,
        axialToPixel: axialToPixel,
        pixelToAxial: pixelToAxial,
        hexRound: hexRound,
        hexCorners: hexCorners,
        floodFill: floodFill,
        isGroupSurrounded: isGroupSurrounded,
        findCaptures: findCaptures,
        executeCaptures: executeCaptures,
        countCells: countCells,
        getEmptyCells: getEmptyCells
    };
})();
