// ========== TUTORIAL OVERLAY ==========

const TUTORIAL_SEEN_KEY = 'interlacy_tutorial_seen';

/**
 * Show the tutorial overlay with fly-in animation
 */
export function showTutorial() {
  const overlay = document.getElementById('tutorial-overlay');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  // Trigger reflow to ensure animation plays
  overlay.offsetHeight;
  overlay.classList.add('visible');
}

/**
 * Hide the tutorial overlay with fly-out animation
 */
export function hideTutorial() {
  const overlay = document.getElementById('tutorial-overlay');
  if (!overlay) return;

  overlay.classList.remove('visible');
  // Wait for animation to complete before hiding
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 300);
}

/**
 * Mark tutorial as seen in localStorage
 */
function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  } catch (e) {
    // localStorage may be unavailable
  }
}

/**
 * Check if this is the user's first visit
 */
function isFirstVisit() {
  try {
    return !localStorage.getItem(TUTORIAL_SEEN_KEY);
  } catch (e) {
    return false;
  }
}

/**
 * Initialize tutorial - show on first visit, bind close handlers
 */
export function initTutorial() {
  const overlay = document.getElementById('tutorial-overlay');
  const closeBtn = document.getElementById('tutorial-close');

  if (!overlay) return;

  // Close button handler
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideTutorial();
      markTutorialSeen();
    });
  }

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideTutorial();
      markTutorialSeen();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('visible')) {
      hideTutorial();
      markTutorialSeen();
    }
  });

  // Auto-show on first visit
  if (isFirstVisit()) {
    showTutorial();
  }
}
