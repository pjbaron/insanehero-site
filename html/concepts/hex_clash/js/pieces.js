/**
 * Pieces - Hex tile shapes, rotation, and placement validation
 * Pieces are defined as arrays of axial offset coordinates from an anchor cell
 */

var HexPieces = (function() {

    // Piece definitions: each is an array of {q, r} offsets from anchor
    var SHAPES = {
        single: [
            { q: 0, r: 0 }
        ],
        doubleE: [
            { q: 0, r: 0 },
            { q: 1, r: 0 }
        ],
        doubleNE: [
            { q: 0, r: 0 },
            { q: 1, r: -1 }
        ],
        doubleSE: [
            { q: 0, r: 0 },
            { q: 0, r: 1 }
        ],
        triLine: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 }
        ],
        triAngle: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: 1 }
        ],
        triAngle2: [
            { q: 0, r: 0 },
            { q: 1, r: -1 },
            { q: 1, r: 0 }
        ]
    };

    var SHAPE_NAMES = Object.keys(SHAPES);

    // Rotate a hex offset 60 degrees clockwise around origin
    function rotateCW(q, r) {
        return { q: -r, r: q + r };
    }

    // Rotate entire piece by n * 60 degrees
    function rotatePiece(offsets, rotations) {
        var result = [];
        for (var i = 0; i < offsets.length; i++) {
            var q = offsets[i].q;
            var r = offsets[i].r;
            for (var j = 0; j < rotations; j++) {
                var rotated = rotateCW(q, r);
                q = rotated.q;
                r = rotated.r;
            }
            result.push({ q: q, r: r });
        }
        return result;
    }

    // Check if a piece can be placed at (anchorQ, anchorR)
    function canPlace(offsets, anchorQ, anchorR, cells, activeRadius) {
        for (var i = 0; i < offsets.length; i++) {
            var q = anchorQ + offsets[i].q;
            var r = anchorR + offsets[i].r;
            var k = HexGrid.key(q, r);
            var cell = cells[k];
            if (!cell) return false;
            if (cell.owner !== 0) return false;
            if (HexGrid.distFromCenter(q, r) > activeRadius) return false;
        }
        return true;
    }

    // Place a piece on the board
    function placePiece(offsets, anchorQ, anchorR, cells, owner) {
        var placed = [];
        for (var i = 0; i < offsets.length; i++) {
            var q = anchorQ + offsets[i].q;
            var r = anchorR + offsets[i].r;
            var k = HexGrid.key(q, r);
            cells[k].owner = owner;
            placed.push({ q: q, r: r });
        }
        return placed;
    }

    // Generate a random piece offer (2-3 pieces)
    function generateOffer(turnNumber) {
        var count = turnNumber < 3 ? 2 : (Math.random() < 0.4 ? 3 : 2);
        var offer = [];

        for (var i = 0; i < count; i++) {
            var shapeName;
            if (turnNumber < 2) {
                // Early turns: give single or double pieces only
                var easyShapes = ['single', 'single', 'doubleE', 'doubleNE', 'doubleSE'];
                shapeName = easyShapes[Math.floor(Math.random() * easyShapes.length)];
            } else {
                shapeName = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
            }
            var offsets = SHAPES[shapeName].slice();
            // Copy offsets
            var copied = [];
            for (var j = 0; j < offsets.length; j++) {
                copied.push({ q: offsets[j].q, r: offsets[j].r });
            }
            offer.push({
                name: shapeName,
                offsets: copied,
                rotation: 0
            });
        }
        return offer;
    }

    // Get all valid placement positions for a piece
    function getValidPlacements(offsets, cells, activeRadius) {
        var valid = [];
        var allKeys = Object.keys(cells);
        for (var i = 0; i < allKeys.length; i++) {
            var cell = cells[allKeys[i]];
            if (canPlace(offsets, cell.q, cell.r, cells, activeRadius)) {
                valid.push({ q: cell.q, r: cell.r });
            }
        }
        return valid;
    }

    return {
        SHAPES: SHAPES,
        SHAPE_NAMES: SHAPE_NAMES,
        rotateCW: rotateCW,
        rotatePiece: rotatePiece,
        canPlace: canPlace,
        placePiece: placePiece,
        generateOffer: generateOffer,
        getValidPlacements: getValidPlacements
    };
})();
