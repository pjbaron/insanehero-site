import { appState, triggerAutoSave } from './app.js';
import { UIManager } from './ui-manager.js';

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

// Which kind of tab is currently being dragged ('folder' | 'board' | null)
let dragKind = null;
// Global index of the board being dragged (for dropping onto a folder)
let draggedBoardIndex = null;
// Set when a board drag ended on a folder, so dragend skips the reorder commit
let handledByFolderDrop = false;

export class NavigationRenderer {
    // Render board tabs: folders on the top row, boards on the bottom row.
    // The bottom row shows the open folder's boards, or the ungrouped boards
    // when no folder is open.
    static renderBoardTabs() {
        const tabsElement = document.getElementById('boardTabs');
        if (!tabsElement) return;

        tabsElement.innerHTML = '';

        const { folders, orderedFolderNames, ungrouped } = getFolderStructure();

        // Find which folder the active board is in
        const activeBoard = appState.boards[appState.currentBoardIndex];
        const activeBoardFolder = activeBoard ? activeBoard.folder : null;

        // The open folder drives what the bottom row shows. Drop a stale value
        // (e.g. after the folder was deleted or renamed) back to "unassigned".
        let openFolder = appState.settings.openFolder || null;
        if (openFolder && !orderedFolderNames.includes(openFolder)) openFolder = null;
        appState.settings.openFolder = openFolder;

        // ----- Top row: folders, plus an Unassigned drop target and Add-folder -----
        const hasFolders = orderedFolderNames.length > 0;
        {
            const folderRow = document.createElement('div');
            folderRow.className = 'folder-row';

            // Unassigned pseudo-tab: shows the ungrouped boards and accepts a
            // board dragged out of a folder (drop -> board.folder = null).
            // Only meaningful once at least one folder exists.
            if (hasFolders) {
                const isOpen = openFolder === null;
                const isActiveFolder = activeBoardFolder == null;

                const unTab = document.createElement('div');
                unTab.className = `folder-tab unassigned-tab ${isOpen ? 'expanded' : ''} ${isActiveFolder ? 'active-folder' : ''}`;

                const unLabel = document.createElement('button');
                unLabel.className = 'folder-tab-label';
                unLabel.innerHTML = `Unassigned <span class="folder-count">(${ungrouped.length})</span>`;
                unLabel.onclick = () => {
                    appState.settings.openFolder = null;
                    NavigationRenderer.renderBoardTabs();
                    triggerAutoSave();
                };
                unTab.appendChild(unLabel);

                unTab.addEventListener('dragover', (e) => {
                    if (dragKind !== 'board') return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    unTab.classList.add('folder-drop-target');
                });
                unTab.addEventListener('dragleave', () => {
                    unTab.classList.remove('folder-drop-target');
                });
                unTab.addEventListener('drop', (e) => {
                    if (dragKind !== 'board' || draggedBoardIndex == null) return;
                    e.preventDefault();
                    e.stopPropagation();
                    unTab.classList.remove('folder-drop-target');
                    handledByFolderDrop = true;
                    moveBoardToFolderByDrag(draggedBoardIndex, null);
                });

                folderRow.appendChild(unTab);
            }

            orderedFolderNames.forEach(folderName => {
                const children = folders[folderName] || [];
                const isOpen = openFolder === folderName;
                const isActiveFolder = activeBoardFolder === folderName;

                const folderTab = document.createElement('div');
                folderTab.className = `folder-tab ${isOpen ? 'expanded' : ''} ${isActiveFolder ? 'active-folder' : ''}`;
                folderTab.draggable = true;
                folderTab.dataset.folder = folderName;

                const folderLabel = document.createElement('button');
                folderLabel.className = 'folder-tab-label';
                folderLabel.innerHTML = `<span class="folder-chevron">${isOpen ? 'v' : '>'}</span> ${escapeHtml(folderName)} <span class="folder-count">(${children.length})</span>`;
                folderLabel.onclick = () => {
                    appState.settings.openFolder = isOpen ? null : folderName;
                    NavigationRenderer.renderBoardTabs();
                    triggerAutoSave();
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

                folderTab.addEventListener('dragstart', (e) => {
                    dragKind = 'folder';
                    folderTab.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', folderName);
                });
                folderTab.addEventListener('dragend', () => {
                    folderTab.classList.remove('dragging');
                    dragKind = null;
                    commitFolderOrder(folderRow);
                });

                // Accept a board dropped from the bottom row: file it into this folder
                folderTab.addEventListener('dragover', (e) => {
                    if (dragKind !== 'board') return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    folderTab.classList.add('folder-drop-target');
                });
                folderTab.addEventListener('dragleave', () => {
                    folderTab.classList.remove('folder-drop-target');
                });
                folderTab.addEventListener('drop', (e) => {
                    if (dragKind !== 'board' || draggedBoardIndex == null) return;
                    e.preventDefault();
                    e.stopPropagation();
                    folderTab.classList.remove('folder-drop-target');
                    handledByFolderDrop = true;
                    moveBoardToFolderByDrag(draggedBoardIndex, folderName);
                });

                folderRow.appendChild(folderTab);
            });

            // + Add a folder pseudo-tab (previously only in the Boards menu)
            const addFolderBtn = document.createElement('button');
            addFolderBtn.className = 'add-folder-btn';
            addFolderBtn.textContent = '+ Add a folder';
            addFolderBtn.onclick = () => window.createFolder();
            folderRow.appendChild(addFolderBtn);

            // Reorder real folders only; the Unassigned pseudo-tab (no data-folder)
            // and the Add-folder button are excluded as drop candidates.
            folderRow.addEventListener('dragover', (e) => {
                if (dragKind !== 'folder') return;
                e.preventDefault();
                const dragging = folderRow.querySelector('.folder-tab.dragging');
                if (!dragging) return;
                const after = getDragAfterElement(folderRow, e.clientX, '.folder-tab[data-folder]:not(.dragging)');
                if (after == null) folderRow.insertBefore(dragging, addFolderBtn);
                else folderRow.insertBefore(dragging, after);
            });

            tabsElement.appendChild(folderRow);
        }

        // ----- Bottom row: board tabs -----
        const boardRow = document.createElement('div');
        boardRow.className = 'board-row';

        const visible = openFolder ? (folders[openFolder] || []) : ungrouped;

        visible.forEach(({ board, index }) => {
            const tab = document.createElement('button');
            tab.className = `board-tab ${index === appState.currentBoardIndex ? 'active' : ''}`;
            tab.textContent = board.name;
            tab.draggable = true;
            tab.dataset.index = index;
            tab.onclick = () => window.switchBoard(index);

            tab.addEventListener('dragstart', (e) => {
                dragKind = 'board';
                draggedBoardIndex = index;
                handledByFolderDrop = false;
                tab.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(index));
            });
            tab.addEventListener('dragend', () => {
                tab.classList.remove('dragging');
                dragKind = null;
                draggedBoardIndex = null;
                document.querySelectorAll('.folder-drop-target').forEach(el => el.classList.remove('folder-drop-target'));
                if (handledByFolderDrop) {
                    handledByFolderDrop = false;
                    return; // board was filed into a folder; don't also reorder
                }
                commitBoardOrder(boardRow);
            });

            boardRow.appendChild(tab);
        });

        if (openFolder && visible.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'empty-folder-msg';
            empty.textContent = 'No boards in this folder yet';
            boardRow.appendChild(empty);
        }

        // Add board button (stays pinned at the end of the board row)
        const addButton = document.createElement('button');
        addButton.className = 'add-board-btn';
        addButton.textContent = '+ Add a board';
        addButton.onclick = () => window.createBoard();
        boardRow.appendChild(addButton);

        boardRow.addEventListener('dragover', (e) => {
            if (dragKind !== 'board') return;
            e.preventDefault();
            const dragging = boardRow.querySelector('.board-tab.dragging');
            if (!dragging) return;
            const after = getDragAfterElement(boardRow, e.clientX, '.board-tab:not(.dragging)');
            if (after == null) boardRow.insertBefore(dragging, addButton);
            else boardRow.insertBefore(dragging, after);
        });

        tabsElement.appendChild(boardRow);
    }
}

// Find the tab the cursor should insert before, based on horizontal midpoints
function getDragAfterElement(container, x, selector) {
    const els = [...container.querySelectorAll(selector)];
    let closest = { offset: -Infinity, element: null };
    for (const el of els) {
        const box = el.getBoundingClientRect();
        const offset = x - (box.left + box.width / 2);
        if (offset < 0 && offset > closest.offset) {
            closest = { offset, element: el };
        }
    }
    return closest.element;
}

// Persist the new folder order after a drag, reading it from the DOM
function commitFolderOrder(folderRow) {
    const newOrder = [...folderRow.querySelectorAll('.folder-tab[data-folder]')].map(t => t.dataset.folder);
    const current = appState.settings.folderOrder || [];
    if (newOrder.length !== current.length || newOrder.some((n, i) => n !== current[i])) {
        appState.settings.folderOrder = newOrder;
        UIManager.renderBoardTabs();
        UIManager.renderBoardsGrid();
        triggerAutoSave();
    }
}

// File a board into a folder by dropping its tab onto that folder. Works
// whether the board was ungrouped or already in a different folder. The
// destination folder is opened so the board is visible where it landed.
function moveBoardToFolderByDrag(boardIndex, folderName) {
    const board = appState.boards[boardIndex];
    if (!board || board.folder === folderName) return;
    board.folder = folderName;
    appState.settings.openFolder = folderName;
    UIManager.renderBoardTabs();
    UIManager.renderBoardsGrid();
    triggerAutoSave();
}

// Persist the new board order after a drag, reading it from the DOM.
// Only the boards visible in the bottom row moved, so we shuffle them within
// the array slots they already occupied and leave every other board in place.
function commitBoardOrder(boardRow) {
    const newOrder = [...boardRow.querySelectorAll('.board-tab')].map(t => parseInt(t.dataset.index, 10));
    const slots = [...newOrder].sort((a, b) => a - b);
    if (slots.every((slot, k) => slot === newOrder[k])) return; // nothing moved

    const picked = newOrder.map(i => appState.boards[i]);
    const activeRef = appState.boards[appState.currentBoardIndex];
    slots.forEach((slot, k) => { appState.boards[slot] = picked[k]; });

    appState.currentBoardIndex = appState.boards.indexOf(activeRef);
    appState.settings.lastOpenBoard = appState.currentBoardIndex;

    UIManager.renderBoardTabs();
    UIManager.renderBoardsGrid();
    triggerAutoSave();
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
