import { appState } from './app.js';
import { UIManager } from './ui-manager.js';

function triggerAutoSave() {
    if (appState.autoSave) appState.autoSave();
}

export class BoardManager {
    // Create a new board
    static createBoard() {
        const name = prompt("Board name:");
        if (name) {
            appState.boards.push({
                name: name,
                background: "",
                lists: []
            });
            UIManager.renderBoardTabs();
            UIManager.renderBoardsGrid();
        }
    }

    // Switch to a different board
    static switchBoard(index) {
        appState.currentBoardIndex = index;
        UIManager.renderBoard();
        UIManager.renderBoardTabs();
        
        // Hide workspace view, show board
        const workspaceView = document.getElementById('workspaceView');
        const boardContainer = document.getElementById('boardContainer');
        
        if (workspaceView) workspaceView.classList.add('hidden');
        if (boardContainer) boardContainer.style.display = 'block';
    }

    // Delete a board with confirmation
    static deleteBoard(boardIndex) {
        if (appState.boards.length <= 1) {
            alert("Cannot delete the last board. You must have at least one board.");
            return;
        }

        const board = appState.boards[boardIndex];
        const listCount = board.lists.length;
        const cardCount = board.lists.reduce((total, list) => total + list.cards.length, 0);
        
        let confirmMessage = `Are you sure you want to delete the board "${board.name}"?`;
        
        if (listCount > 0) {
            confirmMessage += `\n\nThis will permanently delete ${listCount} list${listCount === 1 ? '' : 's'}`;
            if (cardCount > 0) {
                confirmMessage += ` and ${cardCount} card${cardCount === 1 ? '' : 's'}`;
            }
            confirmMessage += `.`;
        }
        
        if (confirm(confirmMessage)) {
            // Remove the board
            appState.boards.splice(boardIndex, 1);
            
            // Adjust current board index if needed
            if (appState.currentBoardIndex >= appState.boards.length) {
                appState.currentBoardIndex = appState.boards.length - 1;
            }
            if (appState.currentBoardIndex < 0) {
                appState.currentBoardIndex = 0;
            }
            
            // Re-render everything
            if (appState.boards.length > 0) {
                UIManager.renderBoard();
                UIManager.renderBoardTabs();
                UIManager.renderBoardsGrid();
            } else {
                // If no boards left, show workspace view
                UIManager.showWorkspaceView();
                UIManager.renderBoardTabs();
            }
            
            return true; // Successfully deleted
        }
        
        return false; // User cancelled
    }

    // Rename a board
    static renameBoard(boardIndex) {
        const board = appState.boards[boardIndex];
        const newName = prompt("Enter new board name:", board.name);
        
        if (newName && newName.trim() && newName !== board.name) {
            board.name = newName.trim();
            UIManager.renderBoardTabs();
            UIManager.renderBoardsGrid();
            return true;
        }
        
        return false;
    }

    // Duplicate a board
    static duplicateBoard(boardIndex) {
        const originalBoard = appState.boards[boardIndex];
        const newName = prompt("Enter name for the duplicated board:", `${originalBoard.name} (Copy)`);
        
        if (newName && newName.trim()) {
            // Deep clone the board
            const duplicatedBoard = JSON.parse(JSON.stringify(originalBoard));
            duplicatedBoard.name = newName.trim();
            
            // Insert the duplicated board after the original
            appState.boards.splice(boardIndex + 1, 0, duplicatedBoard);
            
            UIManager.renderBoardTabs();
            UIManager.renderBoardsGrid();
            return true;
        }
        
        return false;
    }

    // Duplicate a list on the same board
    static duplicateList(listIndex) {
        const board = appState.boards[appState.currentBoardIndex];
        const originalList = board.lists[listIndex];
        const duplicatedList = JSON.parse(JSON.stringify(originalList));
        duplicatedList.name = originalList.name + ' (Copy)';
        board.lists.splice(listIndex + 1, 0, duplicatedList);
        UIManager.renderBoard();
        return true;
    }

    // Copy a list to a different board
    static copyListToBoard(listIndex) {
        const currentBoard = appState.boards[appState.currentBoardIndex];
        const list = currentBoard.lists[listIndex];

        // Build list of other boards
        const otherBoards = [];
        appState.boards.forEach((board, i) => {
            if (i !== appState.currentBoardIndex) {
                otherBoards.push({ index: i, name: board.name });
            }
        });

        if (otherBoards.length === 0) {
            alert('No other boards available. Create another board first.');
            return false;
        }

        // Build a numbered prompt
        const options = otherBoards.map((b, i) => `${i + 1}. ${b.name}`).join('\n');
        const choice = prompt(`Copy "${list.name}" to which board?\n\n${options}\n\nEnter number:`);

        if (choice === null) return false;

        const choiceNum = parseInt(choice);
        if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > otherBoards.length) {
            alert('Invalid selection.');
            return false;
        }

        const targetBoardIndex = otherBoards[choiceNum - 1].index;
        const copiedList = JSON.parse(JSON.stringify(list));
        appState.boards[targetBoardIndex].lists.push(copiedList);
        return true;
    }

    // Create a new list
    static createList() {
        const name = prompt("List name:");
        if (name) {
            appState.boards[appState.currentBoardIndex].lists.push({
                name: name,
                backgroundColor: null,
                cards: []
            });
            UIManager.renderBoard();
        }
    }

    // Update list name
    static updateListName(listIndex, newName) {
        appState.boards[appState.currentBoardIndex].lists[listIndex].name = newName;
    }

    // Delete a list with confirmation
    static deleteList(listIndex) {
        const list = appState.boards[appState.currentBoardIndex].lists[listIndex];
        const cardCount = list.cards.length;
        
        let confirmMessage = `Are you sure you want to delete the list "${list.name}"?`;
        if (cardCount > 0) {
            confirmMessage += `\n\nThis will permanently delete ${cardCount} card${cardCount === 1 ? '' : 's'}.`;
        }
        
        if (confirm(confirmMessage)) {
            appState.boards[appState.currentBoardIndex].lists.splice(listIndex, 1);
            UIManager.renderBoard();
        }
    }

    // Toggle list settings menu
    static toggleListSettings(listIndex) {
        UIManager.toggleListSettings(listIndex);
    }

    // Set list background color
    static setListBackgroundColor(listIndex, color) {
        appState.boards[appState.currentBoardIndex].lists[listIndex].backgroundColor = color;
        UIManager.renderBoard();
    }

    // Upload background image
    static uploadBackground() {
        const backgroundUpload = document.getElementById('backgroundUpload');
        if (backgroundUpload) {
            backgroundUpload.click();
        }
    }

    // Handle background upload
    static handleBackgroundUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Store base64 for localStorage persistence
                appState.boards[appState.currentBoardIndex].background = e.target.result;
                // Also store blob URL for current session (more efficient)
                appState.boards[appState.currentBoardIndex].backgroundPath = URL.createObjectURL(file);
                UIManager.renderBoard();
            };
            reader.readAsDataURL(file);
        }
    }

    // --- Folder Management ---

    // Create a new folder
    static createFolder() {
        const name = prompt("Folder name:");
        if (!name || !name.trim()) return;
        const trimmed = name.trim();

        if (!appState.settings.folderOrder) {
            appState.settings.folderOrder = [];
        }
        if (appState.settings.folderOrder.includes(trimmed)) {
            alert(`A folder named "${trimmed}" already exists.`);
            return;
        }
        appState.settings.folderOrder.push(trimmed);
        if (!appState.settings.expandedFolders) {
            appState.settings.expandedFolders = {};
        }
        appState.settings.expandedFolders[trimmed] = true;
        UIManager.renderBoardTabs();
        UIManager.renderBoardsGrid();
        triggerAutoSave();
    }

    // Rename a folder
    static renameFolder(oldName) {
        const newName = prompt("New folder name:", oldName);
        if (!newName || !newName.trim() || newName.trim() === oldName) return;
        const trimmed = newName.trim();

        if (appState.settings.folderOrder.includes(trimmed)) {
            alert(`A folder named "${trimmed}" already exists.`);
            return;
        }

        // Update folderOrder
        const idx = appState.settings.folderOrder.indexOf(oldName);
        if (idx !== -1) appState.settings.folderOrder[idx] = trimmed;

        // Update expandedFolders
        if (appState.settings.expandedFolders) {
            if (oldName in appState.settings.expandedFolders) {
                appState.settings.expandedFolders[trimmed] = appState.settings.expandedFolders[oldName];
                delete appState.settings.expandedFolders[oldName];
            }
        }

        // Update all boards in this folder
        appState.boards.forEach(board => {
            if (board.folder === oldName) {
                board.folder = trimmed;
            }
        });

        UIManager.renderBoardTabs();
        UIManager.renderBoardsGrid();
        triggerAutoSave();
    }

    // Delete a folder (boards become ungrouped)
    static deleteFolder(folderName) {
        if (!confirm(`Delete folder "${folderName}"? Boards inside will become ungrouped.`)) return;

        // Remove from folderOrder
        const idx = appState.settings.folderOrder.indexOf(folderName);
        if (idx !== -1) appState.settings.folderOrder.splice(idx, 1);

        // Remove from expandedFolders
        if (appState.settings.expandedFolders) {
            delete appState.settings.expandedFolders[folderName];
        }

        // Ungroup boards
        appState.boards.forEach(board => {
            if (board.folder === folderName) {
                board.folder = null;
            }
        });

        UIManager.renderBoardTabs();
        UIManager.renderBoardsGrid();
        triggerAutoSave();
    }

    // Move a board into a folder (or null to ungroup)
    static moveBoardToFolder(boardIndex, folderName) {
        appState.boards[boardIndex].folder = folderName || null;
        UIManager.renderBoardTabs();
        UIManager.renderBoardsGrid();
        triggerAutoSave();
    }

    // Prompt user to pick a folder for a board
    static promptMoveBoardToFolder(boardIndex) {
        const folders = appState.settings.folderOrder || [];
        const board = appState.boards[boardIndex];

        let options = folders.map((f, i) => `${i + 1}. ${f}`);
        options.push(`${folders.length + 1}. + New folder...`);
        options.push(`${folders.length + 2}. None (ungrouped)`);

        const currentFolder = board.folder ? ` (currently in "${board.folder}")` : ' (currently ungrouped)';
        const choice = prompt(
            `Move "${board.name}" to folder${currentFolder}:\n\n${options.join('\n')}\n\nEnter number:`
        );

        if (choice === null) return;
        const num = parseInt(choice);
        if (isNaN(num) || num < 1 || num > folders.length + 2) {
            alert('Invalid selection.');
            return;
        }

        if (num <= folders.length) {
            // Existing folder
            BoardManager.moveBoardToFolder(boardIndex, folders[num - 1]);
        } else if (num === folders.length + 1) {
            // New folder
            const name = prompt("New folder name:");
            if (!name || !name.trim()) return;
            const trimmed = name.trim();
            if (!appState.settings.folderOrder) appState.settings.folderOrder = [];
            if (!appState.settings.folderOrder.includes(trimmed)) {
                appState.settings.folderOrder.push(trimmed);
                if (!appState.settings.expandedFolders) appState.settings.expandedFolders = {};
                appState.settings.expandedFolders[trimmed] = true;
            }
            BoardManager.moveBoardToFolder(boardIndex, trimmed);
        } else {
            // None
            BoardManager.moveBoardToFolder(boardIndex, null);
        }
    }
}
