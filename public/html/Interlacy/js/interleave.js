// ========== INTERLEAVE LOGIC ==========
// Pure functions for interleave validation

import { MIN_LETTERS_PER_WORD } from './config.js';

/**
 * Check if word can be formed by ANY valid interleaving of seq1 and seq2
 * Uses dynamic programming to check all possibilities
 */
export function canFormFromInterleave(word, seq1, seq2) {
  if (word.length !== seq1.length + seq2.length) return false;

  // dp[i][j] = can we form word[0..i+j-1] from seq1[0..i-1] and seq2[0..j-1]?
  const dp = Array(seq1.length + 1).fill(null).map(() => Array(seq2.length + 1).fill(false));
  dp[0][0] = true;

  // Fill first column (using only seq1)
  for (let i = 1; i <= seq1.length; i++) {
    dp[i][0] = dp[i-1][0] && seq1[i-1] === word[i-1];
  }

  // Fill first row (using only seq2)
  for (let j = 1; j <= seq2.length; j++) {
    dp[0][j] = dp[0][j-1] && seq2[j-1] === word[j-1];
  }

  // Fill rest of table
  for (let i = 1; i <= seq1.length; i++) {
    for (let j = 1; j <= seq2.length; j++) {
      const wordIdx = i + j - 1;
      const fromSeq1 = dp[i-1][j] && seq1[i-1] === word[wordIdx];
      const fromSeq2 = dp[i][j-1] && seq2[j-1] === word[wordIdx];
      dp[i][j] = fromSeq1 || fromSeq2;
    }
  }

  return dp[seq1.length][seq2.length];
}

/**
 * Check if target can be formed by interleaving SUBSEQUENCES of word1 and word2.
 * Uses backtracking: for each target letter, find a matching letter from either
 * word that doesn't violate ordering (can only move forward in each source word).
 *
 * @param {string} target - The word to form
 * @param {string} word1 - First source word (can skip letters)
 * @param {string} word2 - Second source word (can skip letters)
 * @param {number} minFromEach - Minimum letters required from each source
 * @returns {boolean} True if target can be formed
 */
export function canFormFromSubsequences(target, word1, word2, minFromEach = MIN_LETTERS_PER_WORD) {
  function search(t, i1, i2, used1, used2) {
    // t = current position in target
    // i1 = next position to consider in word1
    // i2 = next position to consider in word2
    // used1, used2 = count of letters used from each word

    if (t === target.length) {
      // Completed target - check minimum constraint
      return used1 >= minFromEach && used2 >= minFromEach;
    }

    const needed = target[t];

    // Try to match from word1 (from position i1 onwards, preserving order)
    for (let j = i1; j < word1.length; j++) {
      if (word1[j] === needed) {
        if (search(t + 1, j + 1, i2, used1 + 1, used2)) return true;
      }
    }

    // Try to match from word2 (from position i2 onwards, preserving order)
    for (let j = i2; j < word2.length; j++) {
      if (word2[j] === needed) {
        if (search(t + 1, i1, j + 1, used1, used2 + 1)) return true;
      }
    }

    // No match found - backtrack
    return false;
  }

  return search(0, 0, 0, 0, 0);
}

/**
 * Check if a potential answer can chain forward with the next source word.
 * In the next stage, players can eliminate letters from BOTH the answer
 * (which becomes top word) and the next source word (bottom word).
 *
 * @param {string} answer - The answer word to check
 * @param {string} nextWord - The next source word in the queue
 * @param {string[]} dictionary - The word dictionary
 * @param {string[]} sourceWords - Source words to exclude from valid results
 * @param {number} minFromEach - Minimum letters required from each source
 * @returns {boolean} True if at least one dictionary word can be formed
 */
export function canAnswerChainForward(answer, nextWord, dictionary, sourceWords, minFromEach = MIN_LETTERS_PER_WORD) {
  const minLen = minFromEach * 2;
  const maxLen = answer.length + nextWord.length;

  for (const dictWord of dictionary) {
    if (dictWord.length < minLen || dictWord.length > maxLen) continue;
    if (sourceWords.includes(dictWord)) continue;
    if (canFormFromSubsequences(dictWord, answer, nextWord, minFromEach)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the source mapping for each letter in a word formed by interleaving seq1 and seq2.
 * Returns an array of 'top' or 'bottom' indicating where each letter came from,
 * or null if the word cannot be formed.
 */
export function getInterleaveMapping(word, seq1, seq2) {
  if (word.length !== seq1.length + seq2.length) return null;

  const dp = Array(seq1.length + 1).fill(null).map(() => Array(seq2.length + 1).fill(false));
  dp[0][0] = true;

  for (let i = 1; i <= seq1.length; i++) {
    dp[i][0] = dp[i-1][0] && seq1[i-1] === word[i-1];
  }
  for (let j = 1; j <= seq2.length; j++) {
    dp[0][j] = dp[0][j-1] && seq2[j-1] === word[j-1];
  }
  for (let i = 1; i <= seq1.length; i++) {
    for (let j = 1; j <= seq2.length; j++) {
      const wordIdx = i + j - 1;
      const fromSeq1 = dp[i-1][j] && seq1[i-1] === word[wordIdx];
      const fromSeq2 = dp[i][j-1] && seq2[j-1] === word[wordIdx];
      dp[i][j] = fromSeq1 || fromSeq2;
    }
  }

  if (!dp[seq1.length][seq2.length]) return null;

  // Backtrack to find one valid mapping
  const mapping = [];
  let i = seq1.length, j = seq2.length;
  while (i > 0 || j > 0) {
    const wordIdx = i + j - 1;
    if (i > 0 && dp[i-1][j] && seq1[i-1] === word[wordIdx]) {
      mapping.unshift('top');
      i--;
    } else {
      mapping.unshift('bottom');
      j--;
    }
  }
  return mapping;
}

/**
 * Find all valid dictionary words that can be formed by interleaving seq1 and seq2
 * Returns { valid: [], blocked: [] } where blocked words are source words
 */
export function findValidInterleaves(seq1, seq2, dictionary, sourceWords, minLetters = MIN_LETTERS_PER_WORD) {
  if (seq1.length < minLetters || seq2.length < minLetters) {
    return { valid: [], blocked: [] };
  }
  const totalLen = seq1.length + seq2.length;
  const valid = [];
  const blocked = [];

  for (const word of dictionary) {
    if (word.length !== totalLen) continue;
    if (canFormFromInterleave(word, seq1, seq2)) {
      if (sourceWords.includes(word)) {
        blocked.push(word);
      } else {
        valid.push(word);
      }
    }
  }

  return { valid, blocked };
}
