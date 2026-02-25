# Listy

A browser-based task management application with boards, lists, and cards.

**Live Demo**: https://www.insanehero.com/html/Listy/

Features drag-and-drop functionality, checklists, card completion tracking, and local storage with JSON backup/restore.


## Keyboard Shortcuts

- **Ctrl/Cmd + S**: Manual save (though auto-save is always active)
- **Ctrl/Cmd + E**: Export backup

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
- Click "Background" button to upload an image
- Backgrounds persist in current session and localStorage
- Not included in exports to keep file sizes small

## Board Folders

Group boards into collapsible folders in the tab bar and workspace grid.

### Creating Folders
- Click "+ Create folder" in workspace view
- Enter a name for the folder

### Moving Boards to Folders
- In workspace view, click the menu (⋯) on a board card and select "Move to Folder"
- Pick an existing folder, create a new one, or choose "None" to ungroup

### Folder Controls
- Click a folder name in the tab bar or workspace to expand/collapse its boards
- Click "..." on a folder for rename and delete options
- Deleting a folder ungroups its boards (does not delete them)
- Folder state and expand/collapse preferences persist across sessions

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

### Card Features
- **Completion Checkbox**: Click the circle in top-left corner to mark cards complete
- **Title & Description**: Editable with automatic URL linking
- **Background Colors**: 12 color options for visual categorization
- **Checklists**: Multiple checklists per card with progress tracking
- **Edit Options**: Rename checklist titles and items with pencil icons
- **Delete**: Remove button in card modal top-right corner

### Moving Cards
- **Drag & Drop**: Drag cards between lists or reorder within the same list
- **Visual Feedback**: Cards show dragging state and drop zones highlight during moves
- **Auto-Save**: Card positions are automatically saved after moving

## Data Management

- **Auto-save**: All changes saved to browser localStorage automatically
- **Export/Import**: JSON backup files with timestamps (backgrounds not included)
- **Storage Info**: View usage statistics and last save time

## Requirements

- Modern web browser with JavaScript enabled
- Local storage support for data persistence




