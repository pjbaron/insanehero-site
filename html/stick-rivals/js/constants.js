/**
 * Global constants for Stick Rivals
 * All layout and timing values should be defined here
 */

const CONST = {
    // Canvas dimensions
    WIDTH: 400,
    HEIGHT: 600,

    // Fighter positions
    PLAYER_X_RATIO: 0.25,
    PLAYER_Y_RATIO: 0.55,
    ENEMY_X_RATIO: 0.75,
    ENEMY_Y_RATIO: 0.55,

    // Combat positions (closer together)
    COMBAT_PLAYER_X_RATIO: 0.35,
    COMBAT_ENEMY_X_RATIO: 0.65,
    COMBAT_SCALE: 1.5,

    // Upgrade screen layout
    UPGRADE_CARDS_Y: 280,
    DECK_X: 20,  // Moved slightly from edge
    DECK_PILE_BOTTOM_Y: 220,  // Y position of bottom of deck pile

    // Card dimensions
    CARD_WIDTH: 110,
    CARD_HEIGHT: 160,
    CARD_SPACING: 10,
    DECK_CARD_WIDTH: 30,
    DECK_CARD_HEIGHT: 42,
    DECK_SCALE: 0.27,  // 30/110 approximately

    // Card animation timing
    DEAL_TIME: 0.4,
    RETURN_TIME: 0.4,
    SELECTION_HOLD_TIME: 1.0,
    RETURN_WAIT_TIME: 0.4,

    // Rival intro screen
    RIVAL_INTRO_BTN_Y_OFFSET: -130,  // From HEIGHT
    RIVAL_INTRO_BTN_W: 160,
    RIVAL_INTRO_BTN_H: 50,
    RIVAL_INTRO_RESET_W: 70,
    RIVAL_INTRO_RESET_H: 24,
    RIVAL_INTRO_RESET_GAP: 30,  // Gap between BEGIN and reset button
    RIVAL_INTRO_CONFIRM_W: 60,
    RIVAL_INTRO_CONFIRM_H: 24,

    // Combat timing
    COMBAT_END_TIMER: 1.8,

    // Game rules
    ROUNDS_TO_WIN: 10
};
