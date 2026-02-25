/**
 * Levels - Hand-authored puzzle definitions for Fold Over
 * Each level: { grid, target, par, tier }
 * grid: 2D array of color indices (0=red, 1=blue, 2=yellow, 3=green, 4=purple, 5=orange, null=empty)
 * target: 2D array of what the visible surface should look like after folding
 * par: target number of folds for 3 stars
 * tier: 'tutorial' | 'easy' | 'medium' | 'hard'
 */

const COLORS = [
    '#E74C3C', // 0 red
    '#3498DB', // 1 blue
    '#F1C40F', // 2 yellow
    '#2ECC71', // 3 green
    '#9B59B6', // 4 purple
    '#E67E22', // 5 orange
    '#1ABC9C', // 6 teal
    '#E91E63', // 7 pink
];

const COLOR_NAMES = ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange', 'Teal', 'Pink'];

const LEVELS = [
    // ===== TUTORIAL (3x3, 1-2 folds) =====
    // Level 1: Single horizontal fold - fold top onto bottom
    {
        grid: [
            [0, 0, 0],
            [null, null, null],
            [1, 1, 1],
        ],
        target: [
            [null, null, null],
            [null, null, null],
            [0, 0, 0],
        ],
        par: 1, tier: 'tutorial'
    },
    // Level 2: Single vertical fold - fold left onto right
    {
        grid: [
            [1, null, 0],
            [1, null, 0],
            [1, null, 0],
        ],
        target: [
            [null, null, 1],
            [null, null, 1],
            [null, null, 1],
        ],
        par: 1, tier: 'tutorial'
    },
    // Level 3: Fold right side over to cover left
    {
        grid: [
            [0, 1, 2],
            [0, 1, 2],
            [0, 1, 2],
        ],
        target: [
            [null, 1, 0],
            [null, 1, 0],
            [null, 1, 0],
        ],
        par: 1, tier: 'tutorial'
    },
    // Level 4: Two folds - fold top down then fold left over
    {
        grid: [
            [1, 0, 0],
            [null, null, null],
            [0, 0, 1],
        ],
        target: [
            [null, null, null],
            [null, null, null],
            [null, 0, 1],
        ],
        par: 2, tier: 'tutorial'
    },
    // Level 5: Two folds - vertical then horizontal
    {
        grid: [
            [2, null, 1],
            [2, null, 1],
            [0, null, 0],
        ],
        target: [
            [null, null, null],
            [null, null, null],
            [null, null, 2],
        ],
        par: 2, tier: 'tutorial'
    },

    // ===== EASY (3x3-4x4, 2-3 folds) =====
    // Level 6
    {
        grid: [
            [0, 1, 0],
            [1, 2, 1],
            [0, 1, 0],
        ],
        target: [
            [null, null, null],
            [null, null, null],
            [null, 1, 0],
        ],
        par: 2, tier: 'easy'
    },
    // Level 7
    {
        grid: [
            [3, 3, 1, 1],
            [3, 3, 1, 1],
            [0, 0, 2, 2],
            [0, 0, 2, 2],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, 3, 1],
            [null, null, 0, 2],
        ],
        par: 2, tier: 'easy'
    },
    // Level 8
    {
        grid: [
            [1, 1, 1],
            [0, 0, 0],
            [2, 2, 2],
        ],
        target: [
            [null, null, null],
            [null, null, null],
            [1, 1, 1],
        ],
        par: 2, tier: 'easy'
    },
    // Level 9: 4x4 single fold
    {
        grid: [
            [0, 0, 1, 1],
            [0, 0, 1, 1],
            [2, 2, 3, 3],
            [2, 2, 3, 3],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [0, 0, null, null],
            [2, 2, null, null],
        ],
        par: 1, tier: 'easy'
    },
    // Level 10
    {
        grid: [
            [1, 2, 1],
            [2, 3, 2],
            [1, 2, 1],
        ],
        target: [
            [null, null, null],
            [null, 2, 1],
            [null, 3, 2],
        ],
        par: 2, tier: 'easy'
    },
    // Level 11
    {
        grid: [
            [0, 1, 0, 1],
            [1, 0, 1, 0],
            [0, 1, 0, 1],
            [1, 0, 1, 0],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, 0, 1],
            [null, null, 1, 0],
        ],
        par: 2, tier: 'easy'
    },
    // Level 12
    {
        grid: [
            [3, 3, 3],
            [1, 1, 1],
            [0, 0, 0],
        ],
        target: [
            [null, null, null],
            [null, null, null],
            [3, 3, 3],
        ],
        par: 2, tier: 'easy'
    },

    // ===== MEDIUM (4x4, 3-4 folds) =====
    // Level 13
    {
        grid: [
            [0, 0, 1, 1],
            [0, 2, 2, 1],
            [3, 2, 2, 4],
            [3, 3, 4, 4],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, 0],
        ],
        par: 3, tier: 'medium'
    },
    // Level 14
    {
        grid: [
            [1, 0, 0, 1],
            [0, 2, 2, 0],
            [0, 2, 2, 0],
            [1, 0, 0, 1],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, 1, 0],
            [null, null, 0, 2],
        ],
        par: 3, tier: 'medium'
    },
    // Level 15
    {
        grid: [
            [5, 5, 5, 5],
            [3, 3, 3, 3],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [5, 5, 5, 5],
        ],
        par: 3, tier: 'medium'
    },
    // Level 16
    {
        grid: [
            [0, 1, 2, 3],
            [3, 0, 1, 2],
            [2, 3, 0, 1],
            [1, 2, 3, 0],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, 0, 1],
            [null, null, 3, 0],
        ],
        par: 3, tier: 'medium'
    },
    // Level 17
    {
        grid: [
            [2, 2, 2, 2],
            [2, 0, 0, 2],
            [2, 0, 0, 2],
            [2, 2, 2, 2],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, 2, 2],
            [null, null, 2, 0],
        ],
        par: 3, tier: 'medium'
    },
    // Level 18
    {
        grid: [
            [0, 1, 1, 0],
            [1, 3, 3, 1],
            [1, 3, 3, 1],
            [0, 1, 1, 0],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, 0],
        ],
        par: 3, tier: 'medium'
    },
    // Level 19
    {
        grid: [
            [4, 4, 1, 1],
            [4, 0, 0, 1],
            [2, 0, 0, 3],
            [2, 2, 3, 3],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, 4, 4],
            [null, null, 4, 0],
        ],
        par: 3, tier: 'medium'
    },
    // Level 20
    {
        grid: [
            [1, 2, 3, 4],
            [4, 1, 2, 3],
            [3, 4, 1, 2],
            [2, 3, 4, 1],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, 1],
        ],
        par: 4, tier: 'medium'
    },

    // ===== HARD (4x4-5x5, 4-6 folds) =====
    // Level 21
    {
        grid: [
            [0, 1, 2, 3, 4],
            [4, 0, 1, 2, 3],
            [3, 4, 0, 1, 2],
            [2, 3, 4, 0, 1],
            [1, 2, 3, 4, 0],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, 0],
        ],
        par: 4, tier: 'hard'
    },
    // Level 22
    {
        grid: [
            [0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 1, 2, 1, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 0, 0],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, 0, 0],
            [null, null, null, 0, 1],
        ],
        par: 4, tier: 'hard'
    },
    // Level 23
    {
        grid: [
            [1, 1, 1, 1, 1],
            [1, 3, 3, 3, 1],
            [1, 3, 0, 3, 1],
            [1, 3, 3, 3, 1],
            [1, 1, 1, 1, 1],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, 1],
        ],
        par: 4, tier: 'hard'
    },
    // Level 24
    {
        grid: [
            [5, 5, 5, 5],
            [5, 0, 0, 5],
            [5, 0, 0, 5],
            [5, 5, 5, 5],
        ],
        target: [
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, null],
            [null, null, null, 5],
        ],
        par: 4, tier: 'hard'
    },
    // Level 25
    {
        grid: [
            [0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1],
            [0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1],
            [0, 1, 0, 1, 0],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, 0],
        ],
        par: 5, tier: 'hard'
    },
    // Level 26
    {
        grid: [
            [2, 3, 2, 3, 2],
            [3, 2, 3, 2, 3],
            [2, 3, 4, 3, 2],
            [3, 2, 3, 2, 3],
            [2, 3, 2, 3, 2],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, 2, 3],
            [null, null, null, 3, 2],
        ],
        par: 4, tier: 'hard'
    },
    // Level 27
    {
        grid: [
            [0, 0, 1, 1, 2],
            [0, 0, 1, 1, 2],
            [3, 3, 4, 4, 5],
            [3, 3, 4, 4, 5],
            [6, 6, 6, 6, 6],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, 0],
        ],
        par: 5, tier: 'hard'
    },
    // Level 28
    {
        grid: [
            [1, 2, 3, 2, 1],
            [2, 3, 4, 3, 2],
            [3, 4, 5, 4, 3],
            [2, 3, 4, 3, 2],
            [1, 2, 3, 2, 1],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, 1],
        ],
        par: 5, tier: 'hard'
    },
    // Level 29
    {
        grid: [
            [0, 0, 0, 0, 0],
            [0, 1, 2, 1, 0],
            [0, 2, 3, 2, 0],
            [0, 1, 2, 1, 0],
            [0, 0, 0, 0, 0],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, 0],
        ],
        par: 5, tier: 'hard'
    },
    // Level 30
    {
        grid: [
            [4, 3, 2, 1, 0],
            [3, 4, 3, 2, 1],
            [2, 3, 4, 3, 2],
            [1, 2, 3, 4, 3],
            [0, 1, 2, 3, 4],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, 4],
        ],
        par: 6, tier: 'hard'
    },
    // Level 31 - Bonus
    {
        grid: [
            [0, 1, 2, 1, 0],
            [1, 3, 4, 3, 1],
            [2, 4, 5, 4, 2],
            [1, 3, 4, 3, 1],
            [0, 1, 2, 1, 0],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, 0, 1],
            [null, null, null, 1, 3],
        ],
        par: 4, tier: 'hard'
    },
    // Level 32 - Bonus
    {
        grid: [
            [2, 2, 2, 2, 2],
            [2, 1, 1, 1, 2],
            [2, 1, 0, 1, 2],
            [2, 1, 1, 1, 2],
            [2, 2, 2, 2, 2],
        ],
        target: [
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, null],
            [null, null, null, null, 2],
        ],
        par: 5, tier: 'hard'
    },
];
