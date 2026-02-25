// ========== EVENT HANDLERS ==========

import { toggleLetter, resetStage, advanceStage, resetForNewPuzzle, getDictionary, getSourceWords, getRemainingTop, getRemainingBottom, getState, toggleQueueExpanded } from './state.js';
import { updateDOM } from './render.js';
import { generatePuzzle } from './puzzle.js';
import { findValidInterleaves, canAnswerChainForward } from './interleave.js';
import { showTutorial } from './tutorial.js';

/**
 * Handle letter click - toggle selection
 */
function handleLetterClick(event) {
  const el = event.currentTarget;
  const word = el.dataset.word;
  const index = parseInt(el.dataset.index);

  if (word === 'top' || word === 'bottom') {
    toggleLetter(word, index);
    updateDOM();
    bindEvents(); // Rebind after DOM update
  }
}

/**
 * Handle reset stage button
 */
function handleReset() {
  resetStage();
  updateDOM();
  bindEvents();
}

/**
 * Handle submit stage button - animate unselected letters then advance
 */
function handleSubmit() {
  const state = getState();
  const dictionary = getDictionary();
  const sourceWords = getSourceWords();
  const remainingTop = getRemainingTop();
  const remainingBottom = getRemainingBottom();
  const { valid: validWords } = findValidInterleaves(remainingTop, remainingBottom, dictionary, sourceWords);
  const bestWord = validWords.reduce((a, b) => b.length > a.length ? b : a, '');

  if (!bestWord) return;

  // Check if this is a dead end (can't chain forward)
  const pendingWords = sourceWords.slice(state.bottomWordIndex + 1);
  const isDeadEnd = pendingWords.length > 0 &&
    !canAnswerChainForward(bestWord, pendingWords[0], dictionary, sourceWords);

  // Get all unselected letters and animate them
  const unselectedLetters = document.querySelectorAll('.letter:not(.selected)[data-word]');
  const letterArray = Array.from(unselectedLetters);

  if (letterArray.length === 0) {
    // No letters to animate, just advance
    advanceStage(bestWord, isDeadEnd);
    updateDOM();
    bindEvents();
    return;
  }

  // Disable interactions during animation
  document.querySelectorAll('.letter, .submit-tick, .reset-icon').forEach(el => {
    el.style.pointerEvents = 'none';
  });

  // Animate letters one by one with staggered delay
  const delay = 40; // ms between each letter pop
  letterArray.forEach((letter, i) => {
    setTimeout(() => {
      letter.classList.add('popping');
    }, i * delay);
  });

  // After all animations complete, advance the stage
  const totalAnimationTime = letterArray.length * delay + 300; // extra time for last animation
  setTimeout(() => {
    advanceStage(bestWord, isDeadEnd);
    updateDOM();
    bindEvents();
  }, totalAnimationTime);
}

/**
 * Handle new puzzle button
 */
function handleNewPuzzle() {
  const dictionary = getDictionary();
  const newWords = generatePuzzle(dictionary);
  resetForNewPuzzle(newWords);
  updateDOM();
  bindEvents();
}

/**
 * Bind all event listeners to the current DOM
 * Must be called after each render since DOM is replaced
 */
export function bindEvents() {
  // Letter click handlers - all letters with data-word can be clicked
  document.querySelectorAll('.letter[data-word]').forEach(el => {
    el.addEventListener('click', handleLetterClick);
  });

  // Button handlers
  const resetBtn = document.getElementById('reset-btn');
  const submitBtn = document.getElementById('submit-btn');
  const newBtn = document.getElementById('new-btn');
  const queueToggle = document.getElementById('queue-toggle');
  const helpBtn = document.getElementById('help-btn');

  if (resetBtn) resetBtn.addEventListener('click', handleReset);
  if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
  if (newBtn) newBtn.addEventListener('click', handleNewPuzzle);
  if (helpBtn) helpBtn.addEventListener('click', showTutorial);
  if (queueToggle) queueToggle.addEventListener('click', () => {
    toggleQueueExpanded();
    updateDOM();
    bindEvents();
  });
}
