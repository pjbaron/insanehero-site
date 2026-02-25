// ========== MAIN ENTRY POINT ==========

import { DICTIONARY_PATH } from './config.js';
import { loadDictionary } from './dictionary.js';
import { setDictionary, resetForNewPuzzle } from './state.js';
import { generatePuzzle } from './puzzle.js';
import { updateDOM, renderError } from './render.js';
import { bindEvents } from './events.js';
import { initTutorial } from './tutorial.js';

/**
 * Initialize the game
 */
async function init() {
  try {
    // Load dictionary
    const words = await loadDictionary();
    setDictionary(words);

    // Generate first puzzle
    const sourceWords = generatePuzzle(words);
    resetForNewPuzzle(sourceWords);

    // Initial render
    updateDOM();
    bindEvents();

    // Initialize tutorial (shows on first visit)
    initTutorial();

  } catch (err) {
    document.getElementById('game-content').innerHTML = renderError(
      `Failed to load dictionary.<br><br>Make sure <code>${DICTIONARY_PATH}</code> exists.`
    );
    console.error(err);
  }
}

// Start the game
init();
