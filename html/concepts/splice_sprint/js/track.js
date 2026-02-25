/**
 * Splice Sprint - Track Generation
 * Procedural forking track with segment types
 */

var Track = {
    segments: [],     // all active segments [{z, x, width, type, curveX, coins, branchId}]
    forks: [],        // [{z, branches: [{id, dir, type, segCount}], chosen: -1}]
    activeBranch: 0,  // current branch ID player is on
    nextBranchId: 1,
    nextForkZ: 0,     // Z position of next fork
    playerZ: 0,
    forksDone: 0,     // total forks passed (for difficulty)
    forkHistory: [],  // [{forkIndex, chosen, optimal}] for ghost overlay
    totalCoins: 0,

    reset: function() {
        this.segments = [];
        this.forks = [];
        this.activeBranch = 0;
        this.nextBranchId = 1;
        this.nextForkZ = 150;
        this.playerZ = 0;
        this.forksDone = 0;
        this.forkHistory = [];
        this.totalCoins = 0;

        // Generate initial straight segment
        this._generateStraight(0, 0, C.ROAD_WIDTH, 'normal', 0, 8);
    },

    // Get difficulty 0..1
    _difficulty: function() {
        return Math.min(this.forksDone / C.DIFFICULTY_RAMP_FORKS, 1);
    },

    // Weighted random pick from {type: weight} object
    _weightedPick: function(weights) {
        var total = 0;
        for (var k in weights) total += weights[k];
        var r = Math.random() * total;
        var cum = 0;
        for (var k in weights) {
            cum += weights[k];
            if (r <= cum) return k;
        }
        return 'normal';
    },

    // Get blended branch weights based on difficulty
    _getBranchWeights: function() {
        var d = this._difficulty();
        var easy = C.BRANCH_WEIGHTS_EASY;
        var hard = C.BRANCH_WEIGHTS_HARD;
        var result = {};
        for (var k in easy) {
            result[k] = easy[k] * (1 - d) + (hard[k] || 0) * d;
        }
        return result;
    },

    // Score a branch type (higher = better for player)
    _branchScore: function(type) {
        var scores = {
            boost: 3,
            coins: 2.5,
            ramp: 2,
            normal: 1,
            mud: -1,
            bridge: -2,
            deadEnd: -3
        };
        return scores[type] || 0;
    },

    // Generate straight segments
    _generateStraight: function(startZ, xOffset, width, type, branchId, count) {
        for (var i = 0; i < count; i++) {
            var seg = {
                z: startZ + i * C.SEGMENT_LENGTH,
                x: xOffset,
                width: width,
                type: type,
                branchId: branchId,
                coins: [],
                curveX: 0
            };

            // Add coins for coin-type branches
            if (type === 'coins' || type === 'boost') {
                if (i > 0 && i < count - 1 && Math.random() < 0.7) {
                    seg.coins.push({
                        x: xOffset + (Math.random() - 0.5) * width * 0.4,
                        z: seg.z + C.SEGMENT_LENGTH * 0.5,
                        collected: false
                    });
                }
            }

            // Bridge narrowing
            if (type === 'bridge') {
                seg.width = width * C.BRIDGE_NARROW;
            }

            this.segments.push(seg);
        }
    },

    // Create a fork at Z position
    _createFork: function(z) {
        var isEasy = this.forksDone < C.EASY_FORKS;
        var branchCount = isEasy ? 2 : (Math.random() < 0.3 ? 3 : 2);

        var weights = this._getBranchWeights();
        var branches = [];
        var hasGood = false;
        var hasBad = false;

        for (var i = 0; i < branchCount; i++) {
            var type;
            if (isEasy) {
                // Easy forks: one clearly good, one clearly bad
                if (i === 0) {
                    type = Math.random() < 0.5 ? 'boost' : 'coins';
                    hasGood = true;
                } else {
                    type = 'mud';
                    hasBad = true;
                }
            } else {
                type = this._weightedPick(weights);
                // Ensure at least one non-deadly option
                if (i === branchCount - 1 && !hasGood) {
                    type = Math.random() < 0.5 ? 'boost' : 'normal';
                }
            }

            var score = this._branchScore(type);
            if (score > 0) hasGood = true;
            if (score < 0) hasBad = true;

            var segCount = C.BRANCH_SEG_MIN + Math.floor(Math.random() * (C.BRANCH_SEG_MAX - C.BRANCH_SEG_MIN));
            var dir;
            if (branchCount === 2) {
                dir = i === 0 ? -1 : 1;
            } else {
                dir = i - 1; // -1, 0, 1
            }

            branches.push({
                id: this.nextBranchId++,
                dir: dir,
                type: type,
                segCount: segCount,
                score: score
            });
        }

        // Figure out optimal branch
        var bestScore = -999;
        var optimalIdx = 0;
        for (var i = 0; i < branches.length; i++) {
            if (branches[i].score > bestScore) {
                bestScore = branches[i].score;
                optimalIdx = i;
            }
        }

        var fork = {
            z: z,
            branches: branches,
            chosen: -1,
            optimal: optimalIdx,
            announced: false
        };

        this.forks.push(fork);

        // Generate segments for each branch
        var angleStep = C.BRANCH_ANGLE;
        for (var i = 0; i < branches.length; i++) {
            var b = branches[i];
            var xOff = b.dir * C.ROAD_WIDTH * 0.8;

            // Each segment gradually shifts to the branch offset
            for (var s = 0; s < b.segCount; s++) {
                var t = s / b.segCount;
                var segX = xOff * t;
                var segWidth = b.type === 'bridge' ? C.ROAD_WIDTH * C.BRIDGE_NARROW : C.ROAD_WIDTH;

                var seg = {
                    z: z + s * C.SEGMENT_LENGTH,
                    x: segX,
                    width: segWidth,
                    type: b.type,
                    branchId: b.id,
                    coins: [],
                    curveX: xOff * (1 - t) * 0.05
                };

                // Add coins
                if ((b.type === 'coins' || b.type === 'boost') && s > 0 && s < b.segCount - 1) {
                    if (Math.random() < 0.6) {
                        seg.coins.push({
                            x: segX + (Math.random() - 0.5) * segWidth * 0.3,
                            z: seg.z + C.SEGMENT_LENGTH * 0.5,
                            collected: false
                        });
                    }
                }

                // Dead end gets crumble markers on last segments
                if (b.type === 'deadEnd' && s >= b.segCount - 3) {
                    seg.crumbling = true;
                }

                this.segments.push(seg);
            }

            // After branch, all converge back to center
            var endZ = z + b.segCount * C.SEGMENT_LENGTH;
            for (var s = 0; s < 4; s++) {
                var t = s / 4;
                this.segments.push({
                    z: endZ + s * C.SEGMENT_LENGTH,
                    x: xOff * (1 - t),
                    width: C.ROAD_WIDTH,
                    type: 'normal',
                    branchId: b.id,
                    coins: [],
                    curveX: 0
                });
            }
        }

        return fork;
    },

    // Get the next upcoming fork for the player
    getNextFork: function() {
        for (var i = 0; i < this.forks.length; i++) {
            if (this.forks[i].z > this.playerZ && this.forks[i].chosen === -1) {
                return this.forks[i];
            }
        }
        return null;
    },

    // Choose a branch at a fork
    chooseBranch: function(fork, branchIndex) {
        if (fork.chosen !== -1) return;
        fork.chosen = branchIndex;
        this.activeBranch = fork.branches[branchIndex].id;
        this.forkHistory.push({
            forkIndex: this.forksDone,
            chosen: branchIndex,
            optimal: fork.optimal,
            type: fork.branches[branchIndex].type
        });
        this.forksDone++;
    },

    // Get segments visible to the player, filtered by active branch
    getVisibleSegments: function(playerZ, drawDist) {
        var minZ = playerZ - C.CULL_BEHIND;
        var maxZ = playerZ + drawDist;
        var result = [];

        for (var i = 0; i < this.segments.length; i++) {
            var seg = this.segments[i];
            if (seg.z < minZ || seg.z > maxZ) continue;

            // Show segment if:
            // - It's on the active branch (branchId == 0 or activeBranch)
            // - It's on a branch that hasn't been decided yet (fork not yet chosen)
            // - It's the convergence after a chosen branch
            var show = false;
            if (seg.branchId === 0 || seg.branchId === this.activeBranch) {
                show = true;
            } else {
                // Check if this segment belongs to a fork that hasn't been chosen yet
                for (var f = 0; f < this.forks.length; f++) {
                    var fork = this.forks[f];
                    if (fork.chosen === -1) {
                        for (var b = 0; b < fork.branches.length; b++) {
                            if (fork.branches[b].id === seg.branchId) {
                                show = true;
                                break;
                            }
                        }
                    }
                    if (show) break;
                }
            }

            if (show) result.push(seg);
        }

        return result;
    },

    // Get the road X offset at a given Z for the active branch
    getRoadXAtZ: function(z) {
        var best = null;
        var bestDist = 9999;
        for (var i = 0; i < this.segments.length; i++) {
            var seg = this.segments[i];
            if (seg.branchId !== 0 && seg.branchId !== this.activeBranch) continue;
            var d = Math.abs(seg.z - z);
            if (d < bestDist) {
                bestDist = d;
                best = seg;
            }
        }
        return best ? best.x : 0;
    },

    // Get the segment type at player's position
    getSegmentAtZ: function(z) {
        var best = null;
        var bestDist = 9999;
        for (var i = 0; i < this.segments.length; i++) {
            var seg = this.segments[i];
            if (seg.branchId !== 0 && seg.branchId !== this.activeBranch) continue;
            var d = Math.abs(seg.z - z);
            if (d < bestDist && d < C.SEGMENT_LENGTH) {
                bestDist = d;
                best = seg;
            }
        }
        return best;
    },

    // Check and collect coins near player
    collectCoins: function(playerZ, playerX, radius) {
        var collected = 0;
        for (var i = 0; i < this.segments.length; i++) {
            var seg = this.segments[i];
            if (seg.branchId !== 0 && seg.branchId !== this.activeBranch) continue;
            for (var c = 0; c < seg.coins.length; c++) {
                var coin = seg.coins[c];
                if (coin.collected) continue;
                var dz = Math.abs(coin.z - playerZ);
                var dx = Math.abs(coin.x - playerX);
                if (dz < radius && dx < radius) {
                    coin.collected = true;
                    collected++;
                    this.totalCoins++;
                }
            }
        }
        return collected;
    },

    // Generate track ahead and cull behind
    update: function(playerZ) {
        this.playerZ = playerZ;

        // Generate forks ahead
        while (this.nextForkZ < playerZ + C.GENERATE_AHEAD) {
            this._createFork(this.nextForkZ);
            var dist = C.FORK_MIN_DIST + Math.random() * (C.FORK_MAX_DIST - C.FORK_MIN_DIST);
            // Shrink fork distance with difficulty
            var shrink = Math.pow(C.FORK_DIST_SHRINK, this.forksDone);
            dist = Math.max(dist * shrink, C.FORK_MIN_FLOOR);
            this.nextForkZ += dist;
        }

        // Cull old segments
        var cullZ = playerZ - C.CULL_BEHIND;
        var i = 0;
        while (i < this.segments.length) {
            if (this.segments[i].z < cullZ) {
                this.segments.splice(i, 1);
            } else {
                i++;
            }
        }

        // Cull old forks
        i = 0;
        while (i < this.forks.length) {
            if (this.forks[i].z < cullZ) {
                this.forks.splice(i, 1);
            } else {
                i++;
            }
        }

        // Auto-choose for unchosen forks that player has passed
        for (i = 0; i < this.forks.length; i++) {
            var fork = this.forks[i];
            if (fork.chosen === -1 && fork.z < playerZ) {
                // Default to optimal on first fork, random otherwise
                if (this.forksDone === 0) {
                    this.chooseBranch(fork, fork.optimal);
                } else {
                    // Pick the first non-deadEnd branch
                    var pick = 0;
                    for (var b = 0; b < fork.branches.length; b++) {
                        if (fork.branches[b].type !== 'deadEnd') {
                            pick = b;
                            break;
                        }
                    }
                    this.chooseBranch(fork, pick);
                }
            }
        }
    },

    // Get decision accuracy percentage
    getAccuracy: function() {
        if (this.forkHistory.length === 0) return 100;
        var correct = 0;
        for (var i = 0; i < this.forkHistory.length; i++) {
            if (this.forkHistory[i].chosen === this.forkHistory[i].optimal) correct++;
        }
        return Math.round(correct / this.forkHistory.length * 100);
    }
};
