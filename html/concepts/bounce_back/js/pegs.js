/**
 * Pegs - Layout generation for pegs, bumpers, spinners, and landing zones
 * All in virtual coordinates (400x700)
 */

var Pegs = {
    PEG_RADIUS: 10,
    BUMPER_RADIUS: 18,

    /**
     * Generate a peg layout for a given round
     * Returns { pegs, bumpers, spinners, zones }
     */
    generate(round) {
        var pegs = [];
        var bumpers = [];
        var spinners = [];

        // Peg grid parameters - more pegs as rounds progress
        var rows = Math.min(7 + Math.floor(round / 3), 12);
        var cols = 8;
        var startY = 130;
        var endY = 520;
        var rowSpacing = (endY - startY) / (rows - 1);
        var margin = 35;
        var fieldWidth = 400 - margin * 2;

        // Generate peg grid with offset rows
        for (var r = 0; r < rows; r++) {
            var offset = (r % 2 === 0) ? 0 : (fieldWidth / cols / 2);
            var pegCount = (r % 2 === 0) ? cols : cols - 1;
            var spacing = fieldWidth / cols;

            for (var c = 0; c < pegCount; c++) {
                var x = margin + offset + spacing * c + spacing / 2;
                var y = startY + r * rowSpacing;

                // Randomly skip some pegs to create variety
                if (Math.random() < 0.12) continue;

                var type = 'normal';

                // Power-up pegs (increase frequency slightly with rounds)
                var powerChance = 0.02 + round * 0.005;
                if (Math.random() < powerChance && round >= 2) {
                    type = Math.random() < 0.5 ? 'explosive' : 'magnet';
                }

                pegs.push({
                    x: x,
                    y: y,
                    r: this.PEG_RADIUS,
                    type: type,
                    hit: false,
                    alpha: 1,
                    glow: 0
                });
            }
        }

        // Add bumpers (round 2+)
        if (round >= 2) {
            var bumperCount = Math.min(1 + Math.floor(round / 2), 4);
            for (var b = 0; b < bumperCount; b++) {
                var bx = 60 + Math.random() * 280;
                var by = 200 + Math.random() * 250;
                // Ensure not overlapping with pegs
                var overlap = false;
                for (var p = 0; p < pegs.length; p++) {
                    var dx = bx - pegs[p].x;
                    var dy = by - pegs[p].y;
                    if (Math.sqrt(dx * dx + dy * dy) < this.BUMPER_RADIUS + this.PEG_RADIUS + 10) {
                        overlap = true;
                        break;
                    }
                }
                if (!overlap) {
                    bumpers.push({
                        x: bx,
                        y: by,
                        r: this.BUMPER_RADIUS,
                        flash: 0
                    });
                }
            }
        }

        // Add spinning obstacles (round 4+)
        if (round >= 4) {
            var spinnerCount = Math.min(Math.floor((round - 3) / 2), 3);
            for (var s = 0; s < spinnerCount; s++) {
                spinners.push({
                    x: 80 + Math.random() * 240,
                    y: 250 + Math.random() * 200,
                    length: 35 + Math.random() * 25,
                    angle: Math.random() * Math.PI,
                    speed: (0.8 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1)
                });
            }
        }

        // Landing zones at bottom
        var zones = this.generateZones(round);

        return {
            pegs: pegs,
            bumpers: bumpers,
            spinners: spinners,
            zones: zones
        };
    },

    /**
     * Generate landing zones with multipliers
     * Zones slide slightly each frame to create tension
     */
    generateZones(round) {
        var zones = [];
        var zoneCount = 7;
        var zoneWidth = 400 / zoneCount;
        var multipliers = [1, 2, 3, 5, 3, 2, 1];

        // Every 3 rounds, upgrade the center multiplier
        if (round >= 3) multipliers[3] = 7;
        if (round >= 6) multipliers[3] = 10;

        for (var i = 0; i < zoneCount; i++) {
            zones.push({
                x: i * zoneWidth,
                width: zoneWidth,
                multiplier: multipliers[i],
                y: 640,
                height: 60
            });
        }
        return zones;
    },

    /**
     * Count remaining (unhit) pegs
     */
    countRemaining(pegs) {
        var count = 0;
        for (var i = 0; i < pegs.length; i++) {
            if (!pegs[i].hit) count++;
        }
        return count;
    }
};
