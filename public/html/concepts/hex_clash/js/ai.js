/**
 * AI - Opponent logic with difficulty levels and playstyles
 * Evaluates board positions and selects moves
 */

var HexAI = (function() {

    // Difficulty levels: 1-5
    // 1 = random, 2 = prefer center, 3 = basic captures, 4 = look-ahead, 5 = full eval
    // Playstyles: 'aggressive', 'defensive', 'sneaky'

    function chooseMove(cells, activeRadius, offer, difficulty, playstyle) {
        var bestScore = -Infinity;
        var bestMove = null;

        for (var pi = 0; pi < offer.length; pi++) {
            var piece = offer[pi];
            // Try all rotations
            for (var rot = 0; rot < 6; rot++) {
                var offsets = HexPieces.rotatePiece(piece.offsets, rot);
                var placements = HexPieces.getValidPlacements(offsets, cells, activeRadius);

                for (var j = 0; j < placements.length; j++) {
                    var score = evaluateMove(cells, activeRadius, offsets, placements[j].q, placements[j].r, difficulty, playstyle);

                    // Add randomness based on difficulty
                    var noise = (5 - difficulty) * 3;
                    score += (Math.random() - 0.5) * noise;

                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = {
                            pieceIndex: pi,
                            rotation: rot,
                            offsets: offsets,
                            q: placements[j].q,
                            r: placements[j].r
                        };
                    }
                }
            }
        }

        // Fallback: random valid move if no best found
        if (!bestMove) {
            bestMove = findRandomMove(cells, activeRadius, offer);
        }

        return bestMove;
    }

    function evaluateMove(cells, activeRadius, offsets, anchorQ, anchorR, difficulty, playstyle) {
        var score = 0;

        // Base: piece size (placing more tiles is better)
        score += offsets.length * 2;

        if (difficulty <= 1) return score; // Level 1: just random + piece size

        // Level 2+: prefer center positions
        for (var i = 0; i < offsets.length; i++) {
            var q = anchorQ + offsets[i].q;
            var r = anchorR + offsets[i].r;
            var dist = HexGrid.distFromCenter(q, r);
            score += (activeRadius - dist) * 0.5;
        }

        if (difficulty <= 2) return score;

        // Level 3+: simulate placement and check captures
        var simCells = cloneCells(cells);
        HexPieces.placePiece(offsets, anchorQ, anchorR, simCells, 2); // AI is player 2
        var captures = HexGrid.findCaptures(simCells, activeRadius, 2);
        var totalCaptured = 0;
        for (var c = 0; c < captures.length; c++) {
            totalCaptured += captures[c].size;
        }
        score += totalCaptured * 10;

        // Playstyle bonuses
        if (playstyle === 'aggressive') {
            // Prefer placing next to enemy pieces
            score += countAdjacentEnemy(cells, offsets, anchorQ, anchorR, 1) * 3;
            score += totalCaptured * 5; // Extra bonus for captures
        } else if (playstyle === 'defensive') {
            // Prefer placing next to own pieces
            score += countAdjacentOwn(cells, offsets, anchorQ, anchorR, 2) * 3;
            // Avoid positions where player could capture next turn
            if (difficulty >= 4) {
                score -= evaluateVulnerability(simCells, activeRadius, offsets, anchorQ, anchorR) * 4;
            }
        } else if (playstyle === 'sneaky') {
            // Prefer edges and positions that set up future captures
            score += countAdjacentEmpty(cells, activeRadius, offsets, anchorQ, anchorR) * 1;
            // Bonus for nearly surrounding enemy groups
            score += evaluateNearSurround(simCells, activeRadius) * 6;
        }

        if (difficulty <= 3) return score;

        // Level 4+: look-ahead - check if captures chain
        if (captures.length > 0) {
            HexGrid.executeCaptures(simCells, captures, 2);
            var chainCaptures = HexGrid.findCaptures(simCells, activeRadius, 2);
            for (var cc = 0; cc < chainCaptures.length; cc++) {
                score += chainCaptures[cc].size * 15;
            }
        }

        if (difficulty <= 4) return score;

        // Level 5: consider opponent's best response
        // Light version: check if opponent could capture our placed tiles
        score -= evaluateVulnerability(simCells, activeRadius, offsets, anchorQ, anchorR) * 5;

        return score;
    }

    function countAdjacentEnemy(cells, offsets, aq, ar, enemyOwner) {
        var count = 0;
        var placed = {};
        for (var i = 0; i < offsets.length; i++) {
            placed[HexGrid.key(aq + offsets[i].q, ar + offsets[i].r)] = true;
        }
        for (var i = 0; i < offsets.length; i++) {
            var nbrs = HexGrid.neighbors(aq + offsets[i].q, ar + offsets[i].r);
            for (var j = 0; j < nbrs.length; j++) {
                var k = HexGrid.key(nbrs[j].q, nbrs[j].r);
                if (placed[k]) continue;
                var cell = cells[k];
                if (cell && cell.owner === enemyOwner) count++;
            }
        }
        return count;
    }

    function countAdjacentOwn(cells, offsets, aq, ar, ownOwner) {
        var count = 0;
        var placed = {};
        for (var i = 0; i < offsets.length; i++) {
            placed[HexGrid.key(aq + offsets[i].q, ar + offsets[i].r)] = true;
        }
        for (var i = 0; i < offsets.length; i++) {
            var nbrs = HexGrid.neighbors(aq + offsets[i].q, ar + offsets[i].r);
            for (var j = 0; j < nbrs.length; j++) {
                var k = HexGrid.key(nbrs[j].q, nbrs[j].r);
                if (placed[k]) continue;
                var cell = cells[k];
                if (cell && cell.owner === ownOwner) count++;
            }
        }
        return count;
    }

    function countAdjacentEmpty(cells, activeRadius, offsets, aq, ar) {
        var count = 0;
        var placed = {};
        for (var i = 0; i < offsets.length; i++) {
            placed[HexGrid.key(aq + offsets[i].q, ar + offsets[i].r)] = true;
        }
        for (var i = 0; i < offsets.length; i++) {
            var nbrs = HexGrid.neighbors(aq + offsets[i].q, ar + offsets[i].r);
            for (var j = 0; j < nbrs.length; j++) {
                var k = HexGrid.key(nbrs[j].q, nbrs[j].r);
                if (placed[k]) continue;
                var cell = cells[k];
                if (cell && cell.owner === 0 && HexGrid.distFromCenter(nbrs[j].q, nbrs[j].r) <= activeRadius) count++;
            }
        }
        return count;
    }

    function evaluateVulnerability(cells, activeRadius, offsets, aq, ar) {
        // Check how many of our placed cells could be captured by opponent
        var vuln = 0;
        for (var i = 0; i < offsets.length; i++) {
            var q = aq + offsets[i].q;
            var r = ar + offsets[i].r;
            var nbrs = HexGrid.neighbors(q, r);
            var emptyNbrs = 0;
            for (var j = 0; j < nbrs.length; j++) {
                var k = HexGrid.key(nbrs[j].q, nbrs[j].r);
                var cell = cells[k];
                if (cell && cell.owner === 0 && HexGrid.distFromCenter(nbrs[j].q, nbrs[j].r) <= activeRadius) {
                    emptyNbrs++;
                }
            }
            if (emptyNbrs <= 1) vuln++; // Almost surrounded = vulnerable
        }
        return vuln;
    }

    function evaluateNearSurround(cells, activeRadius) {
        // Find enemy groups that are nearly surrounded (only 1-2 empty neighbors)
        var checked = {};
        var nearSurrounded = 0;

        var allKeys = Object.keys(cells);
        for (var i = 0; i < allKeys.length; i++) {
            var cell = cells[allKeys[i]];
            if (cell.owner !== 1) continue; // Only check player groups
            if (checked[allKeys[i]]) continue;

            var group = HexGrid.floodFill(cells, cell.q, cell.r, 1);
            var groupKeys = Object.keys(group);
            for (var j = 0; j < groupKeys.length; j++) checked[groupKeys[j]] = true;

            // Count empty neighbors of group
            var emptyNeighbors = 0;
            for (var j = 0; j < groupKeys.length; j++) {
                var pos = HexGrid.parseKey(groupKeys[j]);
                var nbrs = HexGrid.neighbors(pos.q, pos.r);
                for (var n = 0; n < nbrs.length; n++) {
                    var nk = HexGrid.key(nbrs[n].q, nbrs[n].r);
                    if (group[nk]) continue;
                    var nc = cells[nk];
                    if (nc && nc.owner === 0 && HexGrid.distFromCenter(nbrs[n].q, nbrs[n].r) <= activeRadius) {
                        emptyNeighbors++;
                    }
                }
            }

            if (emptyNeighbors <= 2 && emptyNeighbors > 0) {
                nearSurrounded += groupKeys.length;
            }
        }
        return nearSurrounded;
    }

    function cloneCells(cells) {
        var clone = {};
        var keys = Object.keys(cells);
        for (var i = 0; i < keys.length; i++) {
            var c = cells[keys[i]];
            clone[keys[i]] = { q: c.q, r: c.r, owner: c.owner };
        }
        return clone;
    }

    function findRandomMove(cells, activeRadius, offer) {
        // Try each piece with each rotation until we find a valid placement
        var tries = [];
        for (var pi = 0; pi < offer.length; pi++) {
            for (var rot = 0; rot < 6; rot++) {
                var offsets = HexPieces.rotatePiece(offer[pi].offsets, rot);
                var placements = HexPieces.getValidPlacements(offsets, cells, activeRadius);
                for (var j = 0; j < placements.length; j++) {
                    tries.push({
                        pieceIndex: pi,
                        rotation: rot,
                        offsets: offsets,
                        q: placements[j].q,
                        r: placements[j].r
                    });
                }
            }
        }
        if (tries.length === 0) return null;
        return tries[Math.floor(Math.random() * tries.length)];
    }

    return {
        chooseMove: chooseMove,
        cloneCells: cloneCells
    };
})();
