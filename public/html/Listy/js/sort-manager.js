import { appState, triggerAutoSave } from './app.js';
import { UIManager } from './ui-manager.js';

// Case-insensitive, numeric-aware comparison so "Item 2" sorts before "Item 10"
// and "apple" sits next to "Apple".
function byNameAsc(a, b) {
    return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
}

export class SortManager {
    // Sort a list's cards alphabetically by title
    static sortListCards(listIndex) {
        const board = appState.boards[appState.currentBoardIndex];
        const list = board && board.lists[listIndex];
        if (!list) throw new Error(`sortListCards: no list at index ${listIndex} on board ${appState.currentBoardIndex}`);

        list.cards.sort((a, b) => byNameAsc(a.title, b.title));
        UIManager.renderBoard();
        triggerAutoSave();
    }

    // Sort a board's lists alphabetically by name (defaults to the current board)
    static sortBoardLists(boardIndex = appState.currentBoardIndex) {
        const board = appState.boards[boardIndex];
        if (!board) throw new Error(`sortBoardLists: no board at index ${boardIndex}`);

        board.lists.sort((a, b) => byNameAsc(a.name, b.name));
        // Only the currently open board is on screen; re-render just that one
        if (boardIndex === appState.currentBoardIndex) UIManager.renderBoard();
        triggerAutoSave();
    }

    // Sort the boards inside a folder alphabetically by name. Boards live in the
    // flat appState.boards array, so we sort only the slots those boards occupy
    // and leave every other board in place (mirrors commitBoardOrder's approach).
    static sortFolderBoards(folderName) {
        const slots = [];
        appState.boards.forEach((board, index) => {
            if (board.folder === folderName) slots.push(index);
        });
        if (slots.length < 2) return; // nothing to reorder

        // Keep the active board selected across the reshuffle by tracking its object
        const activeRef = appState.boards[appState.currentBoardIndex];

        const sorted = slots
            .map(i => appState.boards[i])
            .sort((a, b) => byNameAsc(a.name, b.name));
        slots.forEach((slot, k) => { appState.boards[slot] = sorted[k]; });

        appState.currentBoardIndex = appState.boards.indexOf(activeRef);
        appState.settings.lastOpenBoard = appState.currentBoardIndex;

        UIManager.renderBoardTabs();
        UIManager.renderBoardsGrid();
        triggerAutoSave();
    }
}
