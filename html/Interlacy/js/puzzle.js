// ========== PUZZLE GENERATION ==========

import { CHAIN_LENGTH, WORD_LENGTH_RANGES, MIN_LETTERS_PER_WORD } from './config.js';
import { canFormFromSubsequences } from './interleave.js';

/**
 * Find all dictionary words that can be formed from subsequences of word1 and word2
 * @param {string} word1 - First source word
 * @param {string} word2 - Second source word
 * @param {string[]} dictionary - The word dictionary
 * @param {string[]} excludeWords - Words to exclude (e.g., source words)
 * @returns {string[]} Array of valid answer words
 */
function findSubsequenceWords(word1, word2, dictionary, excludeWords) {
  const minLen = MIN_LETTERS_PER_WORD * 2;
  const maxLen = word1.length + word2.length;
  const valid = [];

  for (const dictWord of dictionary) {
    if (dictWord.length < minLen || dictWord.length > maxLen) continue;
    if (excludeWords.includes(dictWord)) continue;
    if (canFormFromSubsequences(dictWord, word1, word2, MIN_LETTERS_PER_WORD)) {
      valid.push(dictWord);
    }
  }

  return valid;
}

/**
 * Generate a new puzzle (array of source words)
 * First pair is guaranteed to have at least 2 solutions, one being 8+ letters
 * @param {string[]} dictionary - The word dictionary
 * @returns {string[]} Array of source words for the chain
 */
export function generatePuzzle(dictionary) {
  // Pre-filter words by length range for each position
  const wordPools = WORD_LENGTH_RANGES.map(([min, max]) =>
    dictionary.filter(w => w.length >= min && w.length <= max)
  );

  // Try to find words where first pair has 2+ solutions with one being 8+ letters
  for (let attempt = 0; attempt < 500; attempt++) {
    const candidates = [];
    for (let i = 0; i < CHAIN_LENGTH; i++) {
      const pool = wordPools[i];
      candidates.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    // Find all valid answers for first pair
    const validAnswers = findSubsequenceWords(
      candidates[0], candidates[1], dictionary, candidates
    );

    // Check: at least 2 solutions, at least one is 8+ letters
    if (validAnswers.length >= 2) {
      const hasLongWord = validAnswers.some(w => w.length >= 8);
      if (hasLongWord) {
        return candidates;
      }
    }
  }

  // Fallback - just find any pair that works
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidates = [];
    for (let i = 0; i < CHAIN_LENGTH; i++) {
      const pool = wordPools[i];
      candidates.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    const validAnswers = findSubsequenceWords(
      candidates[0], candidates[1], dictionary, candidates
    );

    if (validAnswers.length > 0) {
      return candidates;
    }
  }

  // Last resort fallback
  const fallback = [];
  for (let i = 0; i < CHAIN_LENGTH; i++) {
    const pool = wordPools[i];
    fallback.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return fallback;
}
