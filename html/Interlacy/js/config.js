// ========== CONFIG ==========
export const DICTIONARY_PATH = './dictionary/word_list.json';
export const MIN_WORD_LENGTH = 4;
export const MAX_WORD_LENGTH = 12;
export const CHAIN_LENGTH = 6;

// Word length ranges per position in chain (longer = easier, more to eliminate)
export const WORD_LENGTH_RANGES = [
  [8, 10],  // Word 1: long (easy)
  [7, 9],   // Word 2
  [6, 8],   // Word 3
  [5, 7],   // Word 4
  [5, 6],   // Word 5
  [4, 5],   // Word 6: short (hard)
];

export const MIN_LETTERS_PER_WORD = 2;
