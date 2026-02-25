import { appState } from './app.js';

// Derive folder structure from the flat boards array
export function getFolderStructure() {
    const folderOrder = appState.settings.folderOrder || [];
    const folders = {};  // folderName -> [{board, index}, ...]
    const ungrouped = [];

    appState.boards.forEach((board, index) => {
        if (board.folder && folderOrder.includes(board.folder)) {
            if (!folders[board.folder]) folders[board.folder] = [];
            folders[board.folder].push({ board, index });
        } else {
            ungrouped.push({ board, index });
        }
    });

    // Include empty folders that are in folderOrder
    folderOrder.forEach(name => {
        if (!folders[name]) folders[name] = [];
    });

    return { folders, orderedFolderNames: folderOrder, ungrouped };
}

export class NavigationRenderer {
    // Render board tabs with folder support
    static renderBoardTabs() {
        const tabsElement = document.getElementById('boardTabs');
        if (!tabsElement) return;

        tabsElement.innerHTML = '';

        const { folders, orderedFolderNames, ungrouped } = getFolderStructure();
        const expandedFolders = appState.settings.expandedFolders || {};

        // Find which folder the active board is in
        const activeBoard = appState.boards[appState.currentBoardIndex];
        const activeBoardFolder = activeBoard ? activeBoard.folder : null;

        // Render each folder
        orderedFolderNames.forEach(folderName => {
            const children = folders[folderName] || [];
            const isActiveFolder = activeBoardFolder === folderName;
            const isExpanded = expandedFolders[folderName] !== false;

            // Folder tab
            const folderTab = document.createElement('div');
            folderTab.className = `folder-tab ${isExpanded ? 'expanded' : ''} ${isActiveFolder ? 'active-folder' : ''}`;

            const folderLabel = document.createElement('button');
            folderLabel.className = 'folder-tab-label';
            folderLabel.innerHTML = `<span class="folder-chevron">${isExpanded ? 'v' : '>'}</span> ${escapeHtml(folderName)} <span class="folder-count">(${children.length})</span>`;
            folderLabel.onclick = () => {
                if (!appState.settings.expandedFolders) appState.settings.expandedFolders = {};
                const currentlyExpanded = appState.settings.expandedFolders[folderName] !== false;
                appState.settings.expandedFolders[folderName] = !currentlyExpanded;
                NavigationRenderer.renderBoardTabs();
            };

            const menuBtn = document.createElement('button');
            menuBtn.className = 'folder-tab-menu-btn';
            menuBtn.textContent = '...';
            menuBtn.title = 'Folder options';
            menuBtn.onclick = (e) => {
                e.stopPropagation();
                showFolderTabMenu(folderName, menuBtn);
            };

            folderTab.appendChild(folderLabel);
            folderTab.appendChild(menuBtn);
            tabsElement.appendChild(folderTab);

            // Render child tabs if expanded
            if (isExpanded) {
                children.forEach(({ board, index }) => {
                    const tab = document.createElement('button');
                    tab.className = `board-tab folder-child-tab ${index === appState.currentBoardIndex ? 'active' : ''}`;
                    tab.textContent = board.name;
                    tab.onclick = () => window.switchBoard(index);
                    tabsElement.appendChild(tab);
                });
            }
        });

        // Render ungrouped board tabs
        ungrouped.forEach(({ board, index }) => {
            const tab = document.createElement('button');
            tab.className = `board-tab ${index === appState.currentBoardIndex ? 'active' : ''}`;
            tab.textContent = board.name;
            tab.onclick = () => window.switchBoard(index);
            tabsElement.appendChild(tab);
        });

        // Add board button
        const addButton = document.createElement('button');
        addButton.className = 'add-board-btn';
        addButton.textContent = '+ Add a board';
        addButton.onclick = () => window.createBoard();
        tabsElement.appendChild(addButton);
    }
}

// Show a folder's tab menu positioned relative to the button
function showFolderTabMenu(folderName, anchorBtn) {
    // Remove any existing folder tab menu
    const existing = document.getElementById('activeFolderTabMenu');
    if (existing) {
        existing.remove();
        // If clicking the same menu, just close it
        if (existing.dataset.folder === folderName) return;
    }

    const rect = anchorBtn.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'folder-tab-menu-dropdown';
    menu.id = 'activeFolderTabMenu';
    menu.dataset.folder = folderName;
    menu.style.top = rect.bottom + 4 + 'px';
    menu.style.left = rect.left + 'px';
    menu.innerHTML = `
        <button class="board-menu-option" onclick="event.stopPropagation(); renameFolder('${escapeJs(folderName)}')">Rename Folder</button>
        <button class="board-menu-option delete-option" onclick="event.stopPropagation(); deleteFolder('${escapeJs(folderName)}')">Delete Folder</button>
    `;
    document.body.appendChild(menu);
}

// Make folder name safe for use as CSS id
function cssId(str) {
    return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

window.showFolderTabMenu = showFolderTabMenu;
