// ========== DICTIONARY LOADING ==========

import { DICTIONARY_PATH, MIN_WORD_LENGTH, MAX_WORD_LENGTH } from './config.js';

/**
 * Load and filter the dictionary from JSON file
 * @returns {Promise<string[]>} Array of valid words
 */
export async function loadDictionary() {
  const res = await fetch(DICTIONARY_PATH);
  const data = await res.json();

  const words = data.english_words
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length >= MIN_WORD_LENGTH && w.length <= MAX_WORD_LENGTH && /^[a-z]+$/.test(w));

  console.log(`Loaded ${words.length} words`);
  return words;
}
