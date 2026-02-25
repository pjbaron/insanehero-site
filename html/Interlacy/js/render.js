// ========== RENDERING ==========

import { CHAIN_LENGTH, MIN_LETTERS_PER_WORD } from './config.js';
import { findValidInterleaves, canAnswerChainForward, getInterleaveMapping } from './interleave.js';
import { getState, getDictionary, getSourceWords, getRemainingTop, getRemainingBottom } from './state.js';

/**
 * Render an answer word with letters colored by their source (cyan for top, magenta for bottom)
 */
function renderAnswerWithColors(word, seq1, seq2) {
  const mapping = getInterleaveMapping(word, seq1, seq2);
  if (!mapping) return word.toUpperCase();
  return mapping.map((source, i) => {
    const color = source === 'top' ? 'var(--accent-cyan)' : 'var(--accent-magenta)';
    return `<span style="color: ${color}">${word[i].toUpperCase()}</span>`;
  }).join('');
}

/**
 * Render a word with kept letters highlighted and eliminated letters greyed
 */
function renderWordWithHighlights(word, keptIndices, colorVar) {
  return word.split('').map((letter, i) => {
    const isKept = keptIndices.has(i);
    return `<span class="pair-letter ${isKept ? 'kept' : 'eliminated'}" style="${isKept ? `color: ${colorVar}` : ''}">${letter.toUpperCase()}</span>`;
  }).join('');
}

/**
 * Render a completed pair showing full words with highlights
 */
function renderCompletedPair(p) {
  const topKeptLetters = [...p.topKept].sort((a,b) => a-b).map(i => p.topWord[i]).join('');
  const bottomKeptLetters = [...p.bottomKept].sort((a,b) => a-b).map(i => p.bottomWord[i]).join('');
  return `
    <div class="completed-pair">
      <span class="pair-word">${renderWordWithHighlights(p.topWord, p.topKept, 'var(--accent-cyan)')}</span>
      <span class="pair-op">+</span>
      <span class="pair-word">${renderWordWithHighlights(p.bottomWord, p.bottomKept, 'var(--accent-magenta)')}</span>
      <span class="pair-op">=</span>
      <span class="pair-result">${renderAnswerWithColors(p.answer, topKeptLetters, bottomKeptLetters)}</span>
      <span class="pair-score">+${p.answer.length}</span>
    </div>
  `;
}

/**
 * Render victory screen HTML
 */
export function renderVictory() {
  const state = getState();

  return `
    <div class="victory">
      <h2>Weave Complete!</h2>
      <div class="final-score">${state.totalScore}</div>
      <div class="final-score-label">points</div>
    </div>

    <div class="completed-section">
      ${state.completedPairs.map(p => renderCompletedPair(p)).join('')}
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${state.completedPairs.length}</div>
        <div class="stat-label">Links</div>
      </div>
    </div>

    <div class="controls">
      <button class="btn-primary" id="new-btn">New Weave</button>
    </div>
  `;
}

/**
 * Render the main game HTML
 */
export function renderGame() {
  const state = getState();
  const dictionary = getDictionary();
  const sourceWords = getSourceWords();

  if (sourceWords.length === 0) {
    return '<p class="loading">No puzzle available</p>';
  }

  const remainingTop = getRemainingTop();
  const remainingBottom = getRemainingBottom();
  const { valid: validWords, blocked: blockedWords } = findValidInterleaves(
    remainingTop, remainingBottom, dictionary, sourceWords
  );
  const bestWord = validWords.reduce((a, b) => b.length > a.length ? b : a, '');
  const hasValidWord = validWords.length > 0;
  const hasBlockedWord = blockedWords.length > 0;
  const pendingWords = sourceWords.slice(state.bottomWordIndex + 1);
  const bottomWord = sourceWords[state.bottomWordIndex];

  // Check if current valid words lead to dead ends
  let isDeadEnd = false;
  let viableWords = [];
  if (hasValidWord && pendingWords.length > 0) {
    const nextWord = pendingWords[0];
    for (const answer of validWords) {
      if (canAnswerChainForward(answer, nextWord, dictionary, sourceWords)) {
        viableWords.push(answer);
      }
    }
    isDeadEnd = viableWords.length === 0;
  }

  // Check if game is complete
  if (state.gameOver) {
    return renderVictory();
  }

  return `
    <div class="score-display">
      <span class="score-value">${state.totalScore}</span>
      <span class="score-label">pts</span>
    </div>

    ${state.completedPairs.length > 0 ? `
      <div class="completed-section">
        ${state.completedPairs.map(p => renderCompletedPair(p)).join('')}
      </div>
    ` : ''}

    <p class="instructions">
      Tap letters to select them.<br>
      Pick letters from both words to<br>
      weave a new word!
      <button class="help-btn" id="help-btn" title="How to play">?</button>
    </p>

    <div class="active-pair">
      <button class="reset-icon" id="reset-btn" title="Reset Stage">&#x21bb;</button>
      <div class="word-block">
        <div class="word-label" style="color: var(--accent-cyan)">${state.currentStage === 0 ? '' : 'Previous Answer'}</div>
        <div class="word-row">
          ${state.topWord.split('').map((letter, i) => {
            const isSelected = state.selectedTop.has(i);
            return `<div class="letter ${isSelected ? 'selected' : ''}"
                         style="color: var(--accent-cyan)"
                         data-word="top" data-index="${i}">${letter}</div>`;
          }).join('')}
        </div>
      </div>

      <div class="word-block">
        <!--div class="word-label" style="color: var(--accent-magenta)">Word ${state.bottomWordIndex + 1}</div-->
        <div class="word-row">
          ${bottomWord.split('').map((letter, i) => {
            const isSelected = state.selectedBottom.has(i);
            return `<div class="letter ${isSelected ? 'selected' : ''}"
                         style="color: var(--accent-magenta)"
                         data-word="bottom" data-index="${i}">${letter}</div>`;
          }).join('')}
        </div>
      </div>

      <div class="answer-area">
        <div class="answer-slot ${hasValidWord ? (isDeadEnd ? 'dead-end' : 'valid') : hasBlockedWord ? 'blocked' : ''}">
          ${hasValidWord ? `
            <div class="answer-word ${isDeadEnd ? 'dead-end' : ''}">${renderAnswerWithColors(bestWord, remainingTop, remainingBottom)}</div>
            <div class="answer-points">+${bestWord.length} pts</div>
            <div class="answer-hint">${
              isDeadEnd ? `Dead end - won't connect to Word ${state.bottomWordIndex + 2}` :
              viableWords.length > 0 && viableWords.length < validWords.length ?
                `${viableWords.length} of ${validWords.length} options connect forward` :
              validWords.length > 1 ? `${validWords.length} options` : ''
            }</div>
          ` : hasBlockedWord ? `
            <div class="answer-word blocked">${blockedWords[0].toUpperCase()}</div>
            <div class="answer-hint">Source word - not allowed</div>
          ` : `
            <div class="answer-hint">
              ${remainingTop.length < MIN_LETTERS_PER_WORD ? `Need ${MIN_LETTERS_PER_WORD}+ from top` :
                remainingBottom.length < MIN_LETTERS_PER_WORD ? `Need ${MIN_LETTERS_PER_WORD}+ from bottom` :
                'No valid new word yet!'}
            </div>
          `}
        </div>
        ${hasValidWord ? `
          <button class="submit-tick ${isDeadEnd ? 'warning' : ''}" id="submit-btn" title="${isDeadEnd ? 'End Weave' : 'Accept'}">&#x2713;</button>
        ` : ''}
      </div>
    </div>

    ${pendingWords.length > 0 ? `
      <div class="queue-section ${state.queueExpanded ? 'expanded' : ''}">
        <div class="queue-label" id="queue-toggle">
          <span class="queue-arrow">${state.queueExpanded ? '▼' : '▶'}</span>
          Up next (${pendingWords.length} remaining)
        </div>
        ${state.queueExpanded ? `
          <div class="queue-words">
            ${pendingWords.map((word, i) => `
              <div class="queue-word">
                ${word.split('').map(letter => `<div class="letter">${letter}</div>`).join('')}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${state.currentStage + 1}/${CHAIN_LENGTH - 1}</div>
        <div class="stat-label">Stage</div>
      </div>
    </div>

      `;
}

/**
 * Render loading state
 */
export function renderLoading() {
  return '<p class="loading">Loading dictionary...</p>';
}

/**
 * Render error state
 */
export function renderError(message) {
  return `
    <p class="loading" style="color: var(--danger)">
      ${message}
    </p>
  `;
}

/**
 * Apply rendered HTML to the game container
 */
export function updateDOM() {
  const container = document.getElementById('game-content');
  container.innerHTML = renderGame();
}
