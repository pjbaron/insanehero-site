import { appState } from './app.js';
import { getFolderStructure } from './navigation-renderer.js';

export class WorkspaceRenderer {
    // Render boards grid in workspace view with folder sections
    static renderBoardsGrid() {
        const gridElement = document.getElementById('boardsGrid');
        if (!gridElement) return;

        gridElement.innerHTML = '';

        const { folders, orderedFolderNames, ungrouped } = getFolderStructure();
        const hasFolders = orderedFolderNames.length > 0;
        const expandedFolders = appState.settings.expandedFolders || {};

        // Render each folder section
        orderedFolderNames.forEach(folderName => {
            const children = folders[folderName] || [];
            const isExpanded = expandedFolders[folderName] !== false; // default expanded

            // Section header
            const header = document.createElement('div');
            header.className = 'folder-section-header';

            const toggle = document.createElement('span');
            toggle.className = 'folder-section-toggle';
            toggle.textContent = isExpanded ? 'v' : '>';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'folder-section-name';
            nameSpan.textContent = folderName;

            const countSpan = document.createElement('span');
            countSpan.className = 'folder-section-count';
            countSpan.textContent = `(${children.length} board${children.length === 1 ? '' : 's'})`;

            // Click on header text to toggle expand/collapse
            const clickArea = document.createElement('div');
            clickArea.className = 'folder-section-click-area';
            clickArea.appendChild(toggle);
            clickArea.appendChild(nameSpan);
            clickArea.appendChild(countSpan);
            clickArea.style.cursor = 'pointer';
            clickArea.onclick = () => {
                if (!appState.settings.expandedFolders) appState.settings.expandedFolders = {};
                appState.settings.expandedFolders[folderName] = !isExpanded;
                WorkspaceRenderer.renderBoardsGrid();
            };

            header.appendChild(clickArea);

            // Menu button
            const menuDiv = document.createElement('div');
            menuDiv.className = 'folder-section-menu';
            menuDiv.innerHTML = `
                <button class="folder-section-menu-btn" onclick="event.stopPropagation(); toggleFolderSectionMenu('${escapeJs(folderName)}')" title="Folder options">...</button>
                <div class="board-menu-dropdown hidden" id="folderSectionMenu-${cssId(folderName)}">
                    <button class="board-menu-option" onclick="event.stopPropagation(); renameFolder('${escapeJs(folderName)}')">Rename Folder</button>
                    <button class="board-menu-option delete-option" onclick="event.stopPropagation(); deleteFolder('${escapeJs(folderName)}')">Delete Folder</button>
                </div>
            `;
            header.appendChild(menuDiv);

            gridElement.appendChild(header);

            // Grid of boards in this folder (only if expanded)
            if (isExpanded) {
                const sectionGrid = document.createElement('div');
                sectionGrid.className = 'boards-grid folder-boards-grid';
                children.forEach(({ board, index }) => {
                    sectionGrid.appendChild(createBoardCard(board, index));
                });
                if (children.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'folder-empty-msg';
                    empty.textContent = 'No boards in this folder. Use "Move to Folder" on a board to add one.';
                    sectionGrid.appendChild(empty);
                }
                gridElement.appendChild(sectionGrid);
            }
        });

        // Ungrouped section
        if (hasFolders && ungrouped.length > 0) {
            const header = document.createElement('div');
            header.className = 'folder-section-header';
            header.innerHTML = `
                <div class="folder-section-click-area">
                    <span class="folder-section-name">Other Boards</span>
                    <span class="folder-section-count">(${ungrouped.length})</span>
                </div>`;
            gridElement.appendChild(header);
        }

        const mainGrid = document.createElement('div');
        mainGrid.className = 'boards-grid';
        ungrouped.forEach(({ board, index }) => {
            mainGrid.appendChild(createBoardCard(board, index));
        });

        gridElement.appendChild(mainGrid);

        // Create actions row on its own line
        const actionsRow = document.createElement('div');
        actionsRow.className = 'boards-grid workspace-actions-row';

        const newBoardCard = document.createElement('div');
        newBoardCard.className = 'board-card create-board-card';
        newBoardCard.innerHTML = `<div class="board-card-title">+ Create new board</div>`;
        newBoardCard.onclick = () => window.createBoard();
        actionsRow.appendChild(newBoardCard);

        const newFolderCard = document.createElement('div');
        newFolderCard.className = 'board-card create-board-card';
        newFolderCard.innerHTML = `<div class="board-card-title">+ Create folder</div>`;
        newFolderCard.onclick = () => window.createFolder();
        actionsRow.appendChild(newFolderCard);

        gridElement.appendChild(actionsRow);
    }

    // Show workspace view
    static showWorkspaceView() {
        const workspaceView = document.getElementById('workspaceView');
        const boardContainer = document.getElementById('boardContainer');

        if (workspaceView) workspaceView.classList.remove('hidden');
        if (boardContainer) boardContainer.style.display = 'none';
        WorkspaceRenderer.renderBoardsGrid();
    }
}

// Create a single board card element
function createBoardCard(board, index) {
    const boardCard = document.createElement('div');
    boardCard.className = 'board-card';
    if (board.background) {
        boardCard.style.backgroundImage = `url(${board.background})`;
        boardCard.style.backgroundSize = 'cover';
    }

    boardCard.innerHTML = `
        <div class="board-card-title">${escapeHtml(board.name)}</div>
        <div class="board-card-menu">
            <button class="board-menu-btn" onclick="event.stopPropagation(); showBoardMenu(${index}, this)" title="Board options">&#x22EF;</button>
        </div>
    `;

    boardCard.addEventListener('click', (e) => {
        if (!e.target.closest('.board-card-menu')) {
            window.switchBoard(index);
        }
    });

    return boardCard;
}

function toggleFolderSectionMenu(folderName) {
    const id = `folderSectionMenu-${cssId(folderName)}`;
    const menu = document.getElementById(id);
    if (!menu) return;

    // Close other menus
    document.querySelectorAll('.board-menu-dropdown').forEach(m => {
        if (m !== menu) m.classList.add('hidden');
    });
    menu.classList.toggle('hidden');
}

function cssId(str) {
    return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

window.toggleFolderSectionMenu = toggleFolderSectionMenu;
