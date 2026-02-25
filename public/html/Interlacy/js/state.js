// ========== GAME STATE ==========
// Module-scoped state with controlled mutation functions

const state = {
  dictionary: [],
  sourceWords: [],        // The original words for the chain
  currentStage: 0,        // 0 to CHAIN_LENGTH-2
  topWord: '',            // Current top word (source or previous answer)
  bottomWordIndex: 1,     // Index into sourceWords for bottom word
  selectedTop: new Set(),    // Indices of selected (kept) letters in top word
  selectedBottom: new Set(), // Indices of selected (kept) letters in bottom word
  completedPairs: [],     // Array of {top, bottom, answer}
  totalScore: 0,
  gamesPlayed: 0,
  gameOver: false,
  queueExpanded: false    // Whether the "up next" queue is expanded
};

// Read access
export function getState() {
  return state;
}

export function getDictionary() {
  return state.dictionary;
}

export function setDictionary(words) {
  state.dictionary = words;
}

export function getSourceWords() {
  return state.sourceWords;
}

// Reset state for a new puzzle
export function resetForNewPuzzle(sourceWords) {
  state.sourceWords = sourceWords;
  state.currentStage = 0;
  state.topWord = sourceWords[0];
  state.bottomWordIndex = 1;
  state.selectedTop = new Set();
  state.selectedBottom = new Set();
  state.completedPairs = [];
  state.totalScore = 0;
  state.gameOver = false;
}

// Advance to next stage after successful submission
// If endChain is true, end the game early (for dead-end words)
export function advanceStage(answer, endChain = false) {
  const bottomWord = state.sourceWords[state.bottomWordIndex];

  // Store full words and which indices were kept (selected)
  const topKept = new Set(state.selectedTop);
  const bottomKept = new Set(state.selectedBottom);

  state.completedPairs.push({
    topWord: state.topWord,
    bottomWord: bottomWord,
    topKept: topKept,
    bottomKept: bottomKept,
    answer: answer
  });
  state.totalScore += answer.length;

  if (endChain || state.bottomWordIndex >= state.sourceWords.length - 1) {
    state.gameOver = true;
    state.gamesPlayed++;
    return;
  }

  state.currentStage++;
  state.topWord = answer;
  state.bottomWordIndex++;
  state.selectedTop = new Set();
  state.selectedBottom = new Set();
}

// Toggle a letter's selection state
export function toggleLetter(which, index) {
  const set = which === 'top' ? state.selectedTop : state.selectedBottom;
  if (set.has(index)) {
    set.delete(index);
  } else {
    set.add(index);
  }
}

// Reset current stage selections
export function resetStage() {
  state.selectedTop = new Set();
  state.selectedBottom = new Set();
}

// Toggle queue expanded state
export function toggleQueueExpanded() {
  state.queueExpanded = !state.queueExpanded;
}

// Get selected letters from top word
export function getRemainingTop() {
  let remaining = '';
  for (let i = 0; i < state.topWord.length; i++) {
    if (state.selectedTop.has(i)) remaining += state.topWord[i];
  }
  return remaining;
}

// Get selected letters from bottom word
export function getRemainingBottom() {
  const word = state.sourceWords[state.bottomWordIndex];
  let remaining = '';
  for (let i = 0; i < word.length; i++) {
    if (state.selectedBottom.has(i)) remaining += word[i];
  }
  return remaining;
}
