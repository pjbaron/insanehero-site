import { appState } from './app.js';
import { triggerAutoSave } from './app.js';

export class BoardRenderer {
    // Render the current board
    static renderBoard() {
        const board = appState.boards[appState.currentBoardIndex];
        const boardElement = document.getElementById('board');
        
        if (!boardElement) return;
        
        // Clear existing lists (except add button)
        const addButton = boardElement.querySelector('.add-list-btn');
        boardElement.innerHTML = '';
        
        // Add board-level drag handlers
        BoardRenderer.setupBoardDragHandlers(boardElement);
        
        // Render lists with drop zones
        board.lists.forEach((list, listIndex) => {
            // Add drop zone before each list
            const dropZone = BoardRenderer.createDropZone(listIndex);
            boardElement.appendChild(dropZone);
            
            const listElement = BoardRenderer.createListElement(list, listIndex);
            boardElement.appendChild(listElement);
        });
        
        // Add final drop zone after all lists
        const finalDropZone = BoardRenderer.createDropZone(board.lists.length);
        boardElement.appendChild(finalDropZone);
        
        // Re-add the add button
        if (addButton) {
            boardElement.appendChild(addButton);
        } else {
            // Create new add button if it doesn't exist
            const newAddButton = document.createElement('button');
            newAddButton.className = 'add-list-btn';
            newAddButton.textContent = '+ Add a list';
            newAddButton.onclick = () => window.createList();
            boardElement.appendChild(newAddButton);
        }
        
        // Set background image on board container via CSS
        const boardContainer = document.getElementById('boardContainer');
        if (boardContainer) {
            if (board.background && board.backgroundPath) {
                boardContainer.style.backgroundImage = `url('${board.backgroundPath}')`;
            } else if (board.background && board.background.startsWith('data:')) {
                boardContainer.style.backgroundImage = `url('${board.background}')`;
            } else {
                boardContainer.style.backgroundImage = '';
            }
        }
    }

    // Create a list element with drag-and-drop functionality
    static createListElement(list, listIndex) {
        const listDiv = document.createElement('div');
        listDiv.className = 'list';
        listDiv.dataset.listIndex = listIndex;
        
        // Set background color if specified
        if (list.backgroundColor) {
            listDiv.style.backgroundColor = list.backgroundColor;
        }
        
        listDiv.innerHTML = `
            <div class="list-header draggable-header" ${list.backgroundColor ? `style="background-color: ${list.backgroundColor};"` : ''}>
                <input type="text" value="${list.name}" onchange="updateListName(${listIndex}, this.value)" onblur="this.blur()">
                <div class="list-settings">
                    <button class="list-settings-btn" onclick="toggleListSettings(${listIndex})" title="List settings">⋯</button>
                    <div class="list-settings-menu hidden" id="listSettings-${listIndex}">
                        <div class="settings-section">
                            <div class="settings-section-title">Background Color</div>
                            <div class="color-palette">
                                <div class="color-option ${!list.backgroundColor ? 'selected' : ''}" 
                                     style="background: #ebecf0;" 
                                     onclick="setListBackgroundColor(${listIndex}, null)" 
                                     title="Default"></div>
                                <div class="color-option ${list.backgroundColor === '#fce4e4' ? 'selected' : ''}" 
                                     style="background: #fce4e4;" 
                                     onclick="setListBackgroundColor(${listIndex}, '#fce4e4')" 
                                     title="Pastel Pink"></div>
                                <div class="color-option ${list.backgroundColor === '#e0f2fe' ? 'selected' : ''}" 
                                     style="background: #e0f2fe;" 
                                     onclick="setListBackgroundColor(${listIndex}, '#e0f2fe')" 
                                     title="Pastel Blue"></div>
                                <div class="color-option ${list.backgroundColor === '#e8f5e8' ? 'selected' : ''}" 
                                     style="background: #e8f5e8;" 
                                     onclick="setListBackgroundColor(${listIndex}, '#e8f5e8')" 
                                     title="Pastel Green"></div>
                                <div class="color-option ${list.backgroundColor === '#fff4e6' ? 'selected' : ''}" 
                                     style="background: #fff4e6;" 
                                     onclick="setListBackgroundColor(${listIndex}, '#fff4e6')" 
                                     title="Pastel Yellow"></div>
                                <div class="color-option ${list.backgroundColor === '#f0e6ff' ? 'selected' : ''}" 
                                     style="background: #f0e6ff;" 
                                     onclick="setListBackgroundColor(${listIndex}, '#f0e6ff')" 
                                     title="Pastel Purple"></div>
                                <div class="color-option ${list.backgroundColor === '#ffe6f0' ? 'selected' : ''}" 
                                     style="background: #ffe6f0;" 
                                     onclick="setListBackgroundColor(${listIndex}, '#ffe6f0')" 
                                     title="Pastel Lavender"></div>
                            </div>
                        </div>
                        <div class="settings-divider"></div>
                        <button class="settings-option" onclick="duplicateList(${listIndex})">
                            <span class="settings-icon">📋</span>
                            Duplicate List
                        </button>
                        <button class="settings-option" onclick="copyListToBoard(${listIndex})">
                            <span class="settings-icon">📤</span>
                            Copy List to Board
                        </button>
                        <div class="settings-divider"></div>
                        <button class="settings-option delete-option" onclick="deleteList(${listIndex})">
                            <span class="settings-icon">🗑️</span>
                            Delete List
                        </button>
                    </div>
                </div>
            </div>
            <div class="cards-container" id="cards-${listIndex}">
                ${list.cards.map((card, cardIndex) => BoardRenderer.createCardHTML(card, listIndex, cardIndex)).join('')}
            </div>
            <button class="add-card-btn" onclick="createCard(${listIndex})">+ Add a card</button>
        `;

        // Add list drag handlers only to the header
        const listHeader = listDiv.querySelector('.list-header');
        listHeader.draggable = true;
        listHeader.addEventListener('dragstart', (e) => BoardRenderer.handleListDragStart(e, listDiv));
        listHeader.addEventListener('dragend', BoardRenderer.handleListDragEnd);

        // Setup card drag and drop for the cards container
        BoardRenderer.setupCardDragAndDrop(listDiv, listIndex);
        
        return listDiv;
    }
    
    // Create a drop zone element for lists
    static createDropZone(position) {
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.dataset.position = position;
        
        dropZone.addEventListener('dragover', BoardRenderer.handleDropZoneDragOver);
        dropZone.addEventListener('dragenter', BoardRenderer.handleDropZoneDragEnter);
        dropZone.addEventListener('dragleave', BoardRenderer.handleDropZoneDragLeave);
        dropZone.addEventListener('drop', BoardRenderer.handleDropZoneDrop);
        
        return dropZone;
    }

    // Setup board-level drag handlers
    static setupBoardDragHandlers(boardElement) {
        boardElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        // Close any open settings menus when clicking elsewhere
        boardElement.addEventListener('click', (e) => {
            if (!e.target.closest('.list-settings')) {
                document.querySelectorAll('.list-settings-menu').forEach(menu => {
                    menu.classList.add('hidden');
                });
            }
        });
    }

    static getDropPosition(cardsContainer, clientY) {
        const allCards = Array.from(cardsContainer.querySelectorAll('.card:not(.dragging)'));
        
        // If no cards, insert at position 0
        if (allCards.length === 0) {
            return 0;
        }
        
        // Check each card to find the insertion point
        for (let i = 0; i < allCards.length; i++) {
            const cardRect = allCards[i].getBoundingClientRect();
            const cardMiddle = cardRect.top + cardRect.height / 2;
            
            // If mouse is above the middle of this card, insert before it
            if (clientY < cardMiddle) {
                return i;
            }
        }
        
        // If we get here, insert after all cards
        return allCards.length;
    }

    // Setup card drag and drop functionality
    static setupCardDragAndDrop(listElement, listIndex) {
        const cardsContainer = listElement.querySelector('.cards-container');
        
        // Add dragover and drop handlers to the cards container
        cardsContainer.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('application/card')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const draggingCard = document.querySelector('.card.dragging');
                if (!draggingCard) return;
                
                // Get the position where the card should be inserted
                const insertPosition = BoardRenderer.getDropPosition(cardsContainer, e.clientY);
                const allCards = Array.from(cardsContainer.querySelectorAll('.card:not(.dragging)'));
                
                // Insert the dragging card at the correct visual position
                if (insertPosition >= allCards.length) {
                    // Insert at the end
                    cardsContainer.appendChild(draggingCard);
                } else {
                    // Insert before the card at insertPosition
                    cardsContainer.insertBefore(draggingCard, allCards[insertPosition]);
                }
            }
        });
        
        // Improved drop event handler to replace in setupCardDragAndDrop
        // Replace the existing drop event handler with this:
        cardsContainer.addEventListener('drop', (e) => {
            if (e.dataTransfer.types.includes('application/card')) {
                e.preventDefault();
                
                const cardData = JSON.parse(e.dataTransfer.getData('application/card'));
                const sourceListIndex = cardData.listIndex;
                const sourceCardIndex = cardData.cardIndex;
                
                // Get the drop position based on mouse Y coordinate
                const newCardIndex = BoardRenderer.getDropPosition(cardsContainer, e.clientY);
                
                // Only move if the position actually changed
                if (sourceListIndex !== listIndex || sourceCardIndex !== newCardIndex) {
                    BoardRenderer.moveCard(sourceListIndex, sourceCardIndex, listIndex, newCardIndex);
                }
            }
        });

        // Make cards draggable and add event listeners
        cardsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.card')) {
                const card = e.target.closest('.card');
                const cardIndex = Array.from(cardsContainer.children).indexOf(card);
                
                // Don't open card if clicking on a link
                if (!e.target.closest('a')) {
                    window.openCard(listIndex, cardIndex);
                }
            }
        });
    }

    // Get the element after which the dragged card should be inserted
    static getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Toggle list settings menu
    static toggleListSettings(listIndex) {
        const menu = document.getElementById(`listSettings-${listIndex}`);
        if (!menu) return;
        
        // Close other open menus
        document.querySelectorAll('.list-settings-menu').forEach(otherMenu => {
            if (otherMenu !== menu) {
                otherMenu.classList.add('hidden');
            }
        });
        
        // Toggle current menu
        menu.classList.toggle('hidden');
    }

    // Convert URLs in text to clickable links
    static linkifyText(text) {
        if (!text) return '';
        
        // Regular expression to match URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        
        return text.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${url}</a>`;
        });
    }

    // Create card HTML with drag functionality
    static createCardHTML(card, listIndex, cardIndex) {
        let progressHTML = '';
        if (card.checklists && card.checklists.length > 0) {
            const totalItems = card.checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
            const completedItems = card.checklists.reduce((sum, checklist) => 
                sum + checklist.items.filter(item => item.completed).length, 0);
            
            if (totalItems > 0) {
                const isComplete = completedItems === totalItems;
                progressHTML = `
                    <div class="card-progress">
                        <span class="progress-badge ${isComplete ? 'complete' : ''}">${completedItems}/${totalItems}</span>
                    </div>
                `;
            }
        }

        // Add description with clickable URLs if description exists
        let descriptionHTML = '';
        if (card.description && card.description.trim()) {
            const linkedDescription = BoardRenderer.linkifyText(card.description);
            descriptionHTML = `<div class="card-description">${linkedDescription}</div>`;
        }
        
        // Apply background color if set
        const backgroundStyle = card.backgroundColor ? `style="background-color: ${card.backgroundColor};"` : '';
        
        return `
            <div class="card ${card.completed ? 'card-completed' : ''}" draggable="true" data-list-index="${listIndex}" data-card-index="${cardIndex}"
                ondragstart="handleCardDragStart(event)" ondragend="handleCardDragEnd(event)" ${backgroundStyle}>
                <div class="card-completion-checkbox ${card.completed ? 'checked' : ''}" 
                     onclick="event.stopPropagation(); toggleCardCompletion(${listIndex}, ${cardIndex})">
                    ${card.completed ? '✓' : ''}
                </div>
                <div class="card-title">${card.title}</div>
                ${descriptionHTML}
                ${progressHTML}
            </div>
        `;
    }

    static moveCard(sourceListIndex, sourceCardIndex, targetListIndex, targetCardIndex) {
        const board = appState.boards[appState.currentBoardIndex];
        
        // 1. Remove the card from the source list and store it.
        const [movedCard] = board.lists[sourceListIndex].cards.splice(sourceCardIndex, 1);
        
        // 2. Insert the stored card into the target list at the target position.
        // This single block of logic correctly handles both same-list and cross-list moves.
        board.lists[targetListIndex].cards.splice(targetCardIndex, 0, movedCard);
        
        // Re-render the board to reflect the changes.
        BoardRenderer.renderBoard();
        
        // Trigger auto-save.
        triggerAutoSave();
    }

    // Move list from one position to another
    static moveList(fromIndex, toIndex) {
        const board = appState.boards[appState.currentBoardIndex];
        const movedList = board.lists.splice(fromIndex, 1)[0];
        board.lists.splice(toIndex, 0, movedList);
        
        // Re-render the board
        BoardRenderer.renderBoard();
        
        // Trigger auto-save after moving lists
        triggerAutoSave();
    }

    // List drag handlers
    static handleListDragStart(e, listElement) {
        listElement.classList.add('dragging');
        
        // Store the index of the dragged list
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', listElement.outerHTML);
        e.dataTransfer.setData('text/plain', listElement.dataset.listIndex);
        e.dataTransfer.setData('application/list', listElement.dataset.listIndex);
        
        // Add dragging class to board for styling
        const board = document.getElementById('board');
        if (board) board.classList.add('drag-active');
        
        // Close any open settings menus
        document.querySelectorAll('.list-settings-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
    }

    static handleListDragEnd(e) {
        const listElement = e.currentTarget.closest('.list');
        if (listElement) {
            listElement.classList.remove('dragging');
        }
        
        // Remove dragging class from board
        const board = document.getElementById('board');
        if (board) board.classList.remove('drag-active');
        
        // Remove all drag indicators
        document.querySelectorAll('.list').forEach(list => {
            list.classList.remove('drag-over-left', 'drag-over-right');
        });
        
        // Remove drop zone indicators
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }

    // Drop zone event handlers for lists
    static handleDropZoneDragOver(e) {
        if (e.dataTransfer.types.includes('application/list')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    }

    static handleDropZoneDragEnter(e) {
        if (e.dataTransfer.types.includes('application/list')) {
            e.preventDefault();
            const dropZone = e.currentTarget;
            dropZone.classList.add('drag-over');
        }
    }

    static handleDropZoneDragLeave(e) {
        const dropZone = e.currentTarget;
        if (!dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    }

    static handleDropZoneDrop(e) {
        if (e.dataTransfer.types.includes('application/list')) {
            e.preventDefault();
            
            const draggedListIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const dropZone = e.currentTarget;
            const newPosition = parseInt(dropZone.dataset.position);
            
            // Calculate adjusted position based on original index
            let adjustedPosition = newPosition;
            if (draggedListIndex < newPosition) {
                adjustedPosition = newPosition - 1;
            }
            
            // Move the list
            BoardRenderer.moveList(draggedListIndex, adjustedPosition);
            
            // Clean up
            dropZone.classList.remove('drag-over');
        }
    }
}

// Global functions for card drag and drop
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
