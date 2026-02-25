import { BoardManager } from './board-manager.js';
import { CardManager } from './card-manager.js';
import { UIManager } from './ui-manager.js';
import { StorageManager } from './storage-manager.js';
import { BoardRenderer } from './board-renderer.js';

// Application state
export const appState = {
    boards: [],
    currentBoardIndex: 0,
    currentCardData: null,
    currentListIndex: null,
    currentCardIndex: null,
    settings: {},
    autoSave: null // Will hold the auto-save function
};

// The help content in markdown format
const HELP_CONTENT = `
A browser-based task management application.

Organize your projects with boards, lists, and cards with full drag-and-drop functionality.


## Keyboard Shortcuts

- **Ctrl/Cmd + S**: Manual save (though auto-save is always active)
- **Ctrl/Cmd + E**: Save boards to file

## Board Management

### Creating Boards
- Click the "+ Add a board" button in the board tabs or "Create new board" in workspace view
- Enter a name for your new board
- Your new board will be created and opened automatically

### Switching Between Boards
- Click on any board tab at the top to switch to that board
- Click "Boards" button to see all boards in workspace view

### Board Options
In workspace view, hover over any board card to see the options menu (⋯):
- **Rename Board**: Change the board name
- **Duplicate Board**: Create a copy of the entire board with all lists and cards
- **Delete Board**: Permanently remove the board (requires confirmation)

### Board Backgrounds
- Click the "Background" button in the header
- Select an image file from your computer
- The image will be applied as the board background

## Board Folders

Group boards into collapsible folders in both the tab bar and workspace grid view.

### Creating Folders
- In workspace view, click the "+ Create folder" card
- Enter a name for your folder

### Moving Boards to Folders
- In workspace view, click the menu (⋯) on any board card
- Select "Move to Folder" and pick a folder, create a new one, or choose "None" to ungroup

### Folder Tabs
- Folders appear in the tab bar with a chevron indicator
- Click a folder tab to expand/collapse it and show/hide its boards
- The folder containing the active board is always expanded
- Click the "..." button on a folder tab for Rename and Delete options

### Folder Sections in Workspace
- Each folder shows as a section header with its boards grouped below
- Ungrouped boards appear under "Other Boards" when folders exist
- Click "..." on a folder section header to rename or delete the folder

### Deleting Folders
- Deleting a folder does not delete its boards -- they become ungrouped

## List Management

### Creating Lists
- Click the "+ Add a list" button on any board
- Enter a name for your list
- The list will be added to the right side of your board

### List Options
Click the three dots (⋯) in any list header to access:

#### Background Colors
- Choose a color.

#### List Actions
- **Duplicate List**: Create a copy of the list on the same board
- **Copy List to Board**: Copy the list to a different board
- **Delete List**: Remove the list and all its cards (requires confirmation)

### Editing List Names
- Click on any list name to edit it inline
- Press Enter or click outside to save changes

### Reordering Lists
- Drag lists by their headers to reorder them
- Drop zones will appear between lists during dragging
- Lists will automatically save their new positions

## Card Management

### Creating Cards
- Click "+ Add a card" at the bottom of any list
- Enter a title for your card
- The card will be added to the bottom of the list

### Editing Cards
Click on any card to open the card editor with these options:

#### Basic Information
- **Title**: Edit the card title
- **Description**: Add detailed description, URLs will be clickable

#### Labels
- Choose from 6 different colored category markers
- Multiple markers can be applied to each card
- Markers appear as a list of colored bars at the top of cards

#### Background Colors
- Choose from 12 background colors for each card
- Background colors help categorize and prioritize cards visually

#### Checklists
- **Add Checklist**: Create new checklists within cards
- **Add Items**: Add individual checklist items with text descriptions
- **Check/Uncheck**: Click checkboxes to mark items as complete
- **Progress Tracking**: Visual progress bar shows completion percentage
- **Delete Items**: Remove individual checklist items or entire checklists
- **Multiple Checklists**: Add multiple checklists per card for complex tasks
- **Numbered Checklist**: Auto-generate a checklist with numbered items (e.g., Episode 1-12)

#### Buttons
- **Save**: Save all changes and close the card editor
- **Delete Card**: Permanently remove the card from the list (verification required)

### Moving Cards
- **Drag & Drop**: Drag cards between lists or reorder within the same list
- **Visual Feedback**: Cards show dragging state and drop zones highlight during moves
- **Auto-Save**: Card positions are automatically saved after moving

## Data Management

### Automatic Saving
- All changes are automatically saved to your browser's local storage
- No manual save required - your data persists between sessions

### Save Boards
- Click "Save Boards" in the header
- Saves a JSON file with timestamp (e.g., \`listy-backup-2025-01-27_14-30.json\`)
- On Chrome/Edge, shows a Save As dialog to choose location
- Contains all boards, lists, cards, and settings
- Use for backup or transferring data between devices

### Import Backup
- Click "Import Backup" in the header
- Select a previously exported JSON backup file
- Confirms before replacing current data
- Restores all boards and settings from backup

### Storage Information
- Click "Storage Info" to view current usage
- Shows number of boards and storage size
- Displays last save timestamp

## Workspace View

### Accessing Workspace
- Click "Boards" button in the header to see all boards
- Shows a grid view of all your boards

### Board Grid Features
- **Visual Preview**: Each board shows as a card with background image
- **Quick Access**: Click any board to open it
- **Board Menu**: Hover over boards to access management options
- **Create New**: Click "Create new board" card to add boards

### Browser Compatibility
- Works in all modern browsers
- Requires JavaScript to be enabled
- Local storage must be available for data persistence`;

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
    let html = markdown;
    
    // Headers
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Code (backticks)
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Lists - handle nested structure
    const lines = html.split('\n');
    let inList = false;
    let processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isListItem = line.match(/^- (.*)$/);
        
        if (isListItem) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(`<li>${isListItem[1]}</li>`);
        } else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            processedLines.push(line);
        }
    }
    
    if (inList) {
        processedLines.push('</ul>');
    }
    
    html = processedLines.join('\n');
    
    // Paragraphs - convert double line breaks to paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs and fix structure
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    
    return html;
}

// Show help modal
function showHelpModal() {
    const helpModal = document.getElementById('helpModal');
    const helpContent = document.getElementById('helpContent');
    
    if (helpModal && helpContent) {
        helpContent.innerHTML = markdownToHtml(HELP_CONTENT);
        helpModal.classList.add('show');
    }
}

// Close help modal
function closeHelpModal() {
    const helpModal = document.getElementById('helpModal');
    if (helpModal) {
        helpModal.classList.remove('show');
    }
}

// Add help button to header (call this in your init function)
function addHelpButton() {
    const boardActions = document.querySelector('.board-actions');
    if (!boardActions) return;
    
    // Create help button
    const helpBtn = document.createElement('button');
    helpBtn.className = 'btn';
    helpBtn.textContent = 'Help';
    helpBtn.title = 'View user guide';
    helpBtn.style.marginLeft = '20px';    
    helpBtn.onclick = showHelpModal;
    
    boardActions.appendChild(helpBtn);
}

// Export global functions
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.addHelpButton = addHelpButton;

// Initialize the application
function init() {
    // Load saved data
    appState.settings = StorageManager.loadSettings();
    appState.boards = StorageManager.loadBoards();
    
    // Reconcile folder data
    reconcileFolders();

    // Set current board index from settings
    if (appState.boards.length > 0) {
        appState.currentBoardIndex = Math.min(
            appState.settings.lastOpenBoard || 0, 
            appState.boards.length - 1
        );
    }
    
    // Setup auto-save
    appState.autoSave = StorageManager.setupAutoSave(appState);
    
    // Only render if there are boards
    if (appState.boards.length > 0) {
        UIManager.renderBoard();
        UIManager.renderBoardTabs();
    } else {
        // Show workspace view by default when no boards exist
        UIManager.showWorkspaceView();
    }
    UIManager.renderBoardsGrid();
    
    // Add event listeners
    setupEventListeners();
    
    console.log('Listy initialized with', appState.boards.length, 'boards');
}

// Setup all event listeners
function setupEventListeners() {
    const boardsBtn = document.getElementById('boardsBtn');
    const backgroundBtn = document.getElementById('backgroundBtn');
    // Background color selector event listener
    const backgroundSelector = document.getElementById('cardBackgroundSelector');

    if (backgroundSelector) {
        backgroundSelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('background-color')) {
                // Use the new auto-save method
                CardManager.selectBackgroundColor(e.target.dataset.color);
            }
        });
    }

    if (boardsBtn) {
        boardsBtn.addEventListener('click', UIManager.showWorkspaceView);
    }
    
    if (backgroundBtn) {
        backgroundBtn.addEventListener('click', BoardManager.uploadBackground);
    }
    
    // Close settings menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.list-settings')) {
            document.querySelectorAll('.list-settings-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
        
        // Close board menus when clicking outside
        if (!e.target.closest('.board-menu-btn') && !e.target.closest('#activeBoardMenu')) {
            const bm = document.getElementById('activeBoardMenu');
            if (bm) bm.remove();
        }

        // Close folder section menus when clicking outside
        if (!e.target.closest('.folder-section-menu')) {
            document.querySelectorAll('.board-menu-dropdown:not(#activeBoardMenu)').forEach(menu => {
                menu.classList.add('hidden');
            });
        }

        // Close folder tab menus when clicking outside
        if (!e.target.closest('.folder-tab-menu-btn') && !e.target.closest('.folder-tab-menu-dropdown')) {
            const ftm = document.getElementById('activeFolderTabMenu');
            if (ftm) ftm.remove();
        }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Add data management buttons to header
    addDataManagementButtons();
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + S to save (though it auto-saves anyway)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveData();
        showNotification('Data saved!');
    }
    
    // Ctrl/Cmd + E to export
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportData();
    }
}

// Add data management buttons to the header
function addDataManagementButtons() {
    const boardActions = document.querySelector('.board-actions');
    if (!boardActions) return;
    
    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn';
    exportBtn.textContent = 'Save Boards';
    exportBtn.title = 'Save boards to file';
    exportBtn.onclick = exportData;
    
    // Import button
    const importBtn = document.createElement('button');
    importBtn.className = 'btn';
    importBtn.textContent = 'Import Backup';
    importBtn.title = 'Restore from backup file';
    importBtn.onclick = importData;
    
    // Storage info button
    const storageBtn = document.createElement('button');
    storageBtn.className = 'btn';
    storageBtn.textContent = 'Storage Info';
    storageBtn.title = 'View storage usage';
    storageBtn.onclick = showStorageInfo;

    boardActions.appendChild(exportBtn);
    boardActions.appendChild(importBtn);
    boardActions.appendChild(storageBtn);

    // Help button
    addHelpButton();
}

// Save data manually
function saveData() {
    const success = StorageManager.saveBoards(appState.boards);
    StorageManager.saveSettings(appState.settings);
    return success;
}

// Trigger auto-save
export function triggerAutoSave() {
    if (appState.autoSave) {
        appState.autoSave();
    }
}

// Export data to file
async function exportData() {
    const success = await StorageManager.exportData(appState.boards);
    if (success) {
        showNotification('Boards saved successfully!');
    } else {
        // Don't show error if user just cancelled the picker
        // (exportData returns false for cancel, which is not an error)
    }
}

// Reconcile folderOrder with actual board.folder values
function reconcileFolders() {
    if (!appState.settings.folderOrder) appState.settings.folderOrder = [];
    // Add any folder names found on boards but missing from folderOrder
    appState.boards.forEach(board => {
        if (board.folder && !appState.settings.folderOrder.includes(board.folder)) {
            appState.settings.folderOrder.push(board.folder);
        }
    });
    // Remove folder names that have no boards and were not explicitly created
    // (We keep them -- user may want empty folders. Only remove on explicit delete.)
}

// Import data from file
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const importedBoards = await StorageManager.importData(file);
            
            // Confirm before replacing current data
            const confirmMessage = `This will replace your current ${appState.boards.length} board(s) with ${importedBoards.length} board(s) from the backup. Continue?`;
            
            if (confirm(confirmMessage)) {
                appState.boards = importedBoards;
                appState.currentBoardIndex = 0;

                // Reconcile folder settings from imported boards
                reconcileFolders();

                // Save imported data
                saveData();
                
                // Re-render everything
                if (appState.boards.length > 0) {
                    UIManager.renderBoard();
                    UIManager.renderBoardTabs();
                    
                    // Hide workspace view, show board
                    const workspaceView = document.getElementById('workspaceView');
                    const boardContainer = document.getElementById('boardContainer');
                    
                    if (workspaceView) workspaceView.classList.add('hidden');
                    if (boardContainer) boardContainer.style.display = 'block';
                } else {
                    UIManager.showWorkspaceView();
                }
                UIManager.renderBoardsGrid();
                
                showNotification('Backup imported successfully!');
            }
        } catch (error) {
            showNotification(`Import failed: ${error.message}`, 'error');
        }
        
        // Clean up
        document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
}

// Show storage information
function showStorageInfo() {
    const info = StorageManager.getStorageInfo();
    const sizeInKB = (info.totalSize / 1024).toFixed(2);
    
    const message = `
Storage Usage:
• ${info.boardCount} boards
• ${sizeInKB} KB total storage
• Last saved: ${new Date().toLocaleString()}

Data is automatically saved to your browser's local storage.
Use "Save Boards" to save a backup file.
    `.trim();
    
    alert(message);
}

// Show notification to user
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#eb5a46' : '#61bd4f'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 500;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateX(100%);
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Update settings and save
export function updateSettings(newSettings) {
    Object.assign(appState.settings, newSettings);
    StorageManager.saveSettings(appState.settings);
}

// Show board menu in workspace view, positioned relative to the button
function showBoardMenu(boardIndex, anchorBtn) {
    // Remove any existing board menu
    const existing = document.getElementById('activeBoardMenu');
    if (existing) {
        const wasForSame = existing.dataset.boardIndex === String(boardIndex);
        existing.remove();
        if (wasForSame) return; // toggle off
    }

    const rect = anchorBtn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'board-menu-dropdown';
    menu.id = 'activeBoardMenu';
    menu.dataset.boardIndex = boardIndex;
    menu.style.position = 'fixed';
    menu.style.top = rect.bottom + 4 + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.zIndex = '10000';
    menu.innerHTML = `
        <button class="board-menu-option" onclick="event.stopPropagation(); renameBoardFromGrid(${boardIndex})">
            <span class="menu-icon">&#x270F;&#xFE0F;</span>
            Rename Board
        </button>
        <button class="board-menu-option" onclick="event.stopPropagation(); duplicateBoardFromGrid(${boardIndex})">
            <span class="menu-icon">&#x1F4CB;</span>
            Duplicate Board
        </button>
        <button class="board-menu-option" onclick="event.stopPropagation(); promptMoveBoardToFolder(${boardIndex})">
            <span class="menu-icon">&#x1F4C1;</span>
            Move to Folder
        </button>
        <div class="menu-divider"></div>
        <button class="board-menu-option delete-option" onclick="event.stopPropagation(); deleteBoardFromGrid(${boardIndex})">
            <span class="menu-icon">&#x1F5D1;&#xFE0F;</span>
            Delete Board
        </button>
    `;
    document.body.appendChild(menu);
}

// Close any body-level menus
function closeBodyMenus() {
    const bm = document.getElementById('activeBoardMenu');
    if (bm) bm.remove();
    const ftm = document.getElementById('activeFolderTabMenu');
    if (ftm) ftm.remove();
}

// Board management functions for workspace grid
function deleteBoardFromGrid(boardIndex) {
    closeBodyMenus();
    const success = BoardManager.deleteBoard(boardIndex);
    if (success) {
        triggerAutoSave();
    }
}

function renameBoardFromGrid(boardIndex) {
    closeBodyMenus();
    const success = BoardManager.renameBoard(boardIndex);
    if (success) {
        triggerAutoSave();
    }
}

function duplicateBoardFromGrid(boardIndex) {
    closeBodyMenus();
    const success = BoardManager.duplicateBoard(boardIndex);
    if (success) {
        triggerAutoSave();
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    init();
});

// Export global functions for HTML onclick handlers
window.createList = (...args) => {
    BoardManager.createList(...args);
    triggerAutoSave();
};

window.createBoard = (...args) => {
    BoardManager.createBoard(...args);
    triggerAutoSave();
};

window.switchBoard = (index) => {
    BoardManager.switchBoard(index);
    updateSettings({ lastOpenBoard: index });
};

window.updateListName = (...args) => {
    BoardManager.updateListName(...args);
    triggerAutoSave();
};

window.deleteList = (...args) => {
    BoardManager.deleteList(...args);
    triggerAutoSave();
};

window.duplicateList = (...args) => {
    BoardManager.duplicateList(...args);
    triggerAutoSave();
};

window.copyListToBoard = (...args) => {
    const success = BoardManager.copyListToBoard(...args);
    if (success) {
        triggerAutoSave();
    }
};

window.toggleListSettings = BoardManager.toggleListSettings;

window.setListBackgroundColor = (...args) => {
    BoardManager.setListBackgroundColor(...args);
    triggerAutoSave();
};

// Board management functions
window.deleteBoard = (...args) => {
    const success = BoardManager.deleteBoard(...args);
    if (success) {
        triggerAutoSave();
    }
};

window.renameBoard = (...args) => {
    const success = BoardManager.renameBoard(...args);
    if (success) {
        triggerAutoSave();
    }
};

window.duplicateBoard = (...args) => {
    const success = BoardManager.duplicateBoard(...args);
    if (success) {
        triggerAutoSave();
    }
};

// Board menu functions for workspace
window.showBoardMenu = showBoardMenu;
window.deleteBoardFromGrid = deleteBoardFromGrid;
window.renameBoardFromGrid = renameBoardFromGrid;
window.duplicateBoardFromGrid = duplicateBoardFromGrid;

// Folder management functions
window.createFolder = () => BoardManager.createFolder();
window.renameFolder = (name) => BoardManager.renameFolder(name);
window.deleteFolder = (name) => BoardManager.deleteFolder(name);
window.moveBoardToFolder = (boardIndex, folderName) => BoardManager.moveBoardToFolder(boardIndex, folderName);
window.promptMoveBoardToFolder = (boardIndex) => {
    closeBodyMenus();
    BoardManager.promptMoveBoardToFolder(boardIndex);
};

window.createCard = (...args) => {
    CardManager.createCard(...args);
    triggerAutoSave();
};

window.openCard = CardManager.openCard;

window.closeCardModal = CardManager.closeCardModal;

window.handleCardDragStart = function(e) {
    const card = e.currentTarget;
    const listIndex = parseInt(card.dataset.listIndex);
    const cardIndex = parseInt(card.dataset.cardIndex);
    
    card.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/card', JSON.stringify({
        listIndex: listIndex,
        cardIndex: cardIndex
    }));
    
    // Prevent the card click event from firing
    e.stopPropagation();
};

window.handleCardDragEnd = function(e) {
    const card = e.currentTarget;
    card.classList.remove('dragging');
};

// Move cards programmatically (useful for other integrations)
window.moveCard = function(sourceListIndex, sourceCardIndex, targetListIndex, targetCardIndex) {
    BoardRenderer.moveCard(sourceListIndex, sourceCardIndex, targetListIndex, targetCardIndex);
};

window.deleteCard = (...args) => {
    CardManager.deleteCard(...args);
    triggerAutoSave();
};

window.addChecklist = (...args) => {
    CardManager.addChecklist(...args);
};

window.addNumberedChecklist = (...args) => {
    CardManager.addNumberedChecklist(...args);
};

window.editChecklistTitle = (...args) => {
    CardManager.editChecklistTitle(...args);
};

window.deleteChecklist = (...args) => {
    CardManager.deleteChecklist(...args);
};

window.addChecklistItem = (...args) => {
    CardManager.addChecklistItem(...args);
};

window.editChecklistItem = (...args) => {
    CardManager.editChecklistItem(...args);
};

window.deleteChecklistItem = (...args) => {
    CardManager.deleteChecklistItem(...args);
};

window.toggleChecklistItem = (...args) => {
    CardManager.toggleChecklistItem(...args);
};

window.toggleCardCompletion = (...args) => {
    CardManager.toggleCardCompletion(...args);
};

window.handleBackgroundUpload = (...args) => {
    BoardManager.handleBackgroundUpload(...args);
    triggerAutoSave();
};
