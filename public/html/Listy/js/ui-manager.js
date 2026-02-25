import { BoardRenderer } from './board-renderer.js';
import { NavigationRenderer } from './navigation-renderer.js';
import { WorkspaceRenderer } from './workspace-renderer.js';

export class UIManager {
    // Delegate board rendering
    static renderBoard() {
        BoardRenderer.renderBoard();
    }

    // Delegate list settings toggle
    static toggleListSettings(listIndex) {
        BoardRenderer.toggleListSettings(listIndex);
    }

    // Delegate board tabs rendering
    static renderBoardTabs() {
        NavigationRenderer.renderBoardTabs();
    }

    // Delegate boards grid rendering
    static renderBoardsGrid() {
        WorkspaceRenderer.renderBoardsGrid();
    }

    // Delegate workspace view
    static showWorkspaceView() {
        WorkspaceRenderer.showWorkspaceView();
    }
}
