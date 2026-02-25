// storage-manager.js - Handle data persistence with localStorage

export class StorageManager {
    static STORAGE_KEY = 'listy-boards-data';
    static SETTINGS_KEY = 'listy-settings';

    // Load boards from localStorage
    static loadBoards() {
        try {
            const stored = localStorage.getItem(StorageManager.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                return Array.isArray(data) ? data : [];
            }
        } catch (error) {
            console.warn('Error loading boards from localStorage:', error);
        }
        return [];
    }

    // Save boards to localStorage
    static saveBoards(boards) {
        try {
            // Create a clean copy without blob URLs for storage (keep base64 backgrounds)
            const storageBoards = boards.map(board => {
                const { backgroundPath, ...cleanBoard } = board;
                return cleanBoard;
            });
            localStorage.setItem(StorageManager.STORAGE_KEY, JSON.stringify(storageBoards));
            return true;
        } catch (error) {
            console.error('Error saving boards to localStorage:', error);
            return false;
        }
    }

    // Load user settings
    static loadSettings() {
        try {
            const stored = localStorage.getItem(StorageManager.SETTINGS_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Error loading settings from localStorage:', error);
        }
        return {
            autoSave: true,
            lastOpenBoard: 0
        };
    }

    // Save user settings
    static saveSettings(settings) {
        try {
            localStorage.setItem(StorageManager.SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings to localStorage:', error);
            return false;
        }
    }

    // Auto-save functionality with debouncing
    static setupAutoSave(appState, delay = 1000) {
        let saveTimeout;
        
        const debouncedSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                StorageManager.saveBoards(appState.boards);
                console.log('Auto-saved boards');
            }, delay);
        };

        // Return the debounced save function for manual calls
        return debouncedSave;
    }

    // Export data as JSON file for backup
    static async exportData(boards) {
        try {
            // Create a clean copy without backgrounds and blob URLs for export
            const exportBoards = boards.map(board => {
                const { background, backgroundPath, ...cleanBoard } = board;
                return cleanBoard;
            });
            const dataStr = JSON.stringify(exportBoards, null, 2);

            // Create timestamp with date, hour, and minutes
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
            const filename = `listy-backup-${timestamp}.json`;

            // Try File System Access API (Chrome/Edge) for Save As dialog
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'JSON Files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(dataStr);
                    await writable.close();
                    return true;
                } catch (pickerError) {
                    // User cancelled the picker - not an error
                    if (pickerError.name === 'AbortError') return false;
                    // Fall through to legacy download on other errors
                    console.warn('File picker failed, falling back to download:', pickerError);
                }
            }

            // Fallback: standard download approach
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            return true;
        } catch (error) {
            console.error('Error exporting data:', error);
            return false;
        }
    }

    // Import data from JSON file
    static importData(file) {
        return new Promise((resolve, reject) => {
            if (!file || file.type !== 'application/json') {
                reject(new Error('Please select a valid JSON file'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // Validate the imported data structure
                    if (Array.isArray(importedData)) {
                        resolve(importedData);
                    } else {
                        reject(new Error('Invalid data format'));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse JSON file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Clear all stored data
    static clearAllData() {
        try {
            localStorage.removeItem(StorageManager.STORAGE_KEY);
            localStorage.removeItem(StorageManager.SETTINGS_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    // Get storage usage information
    static getStorageInfo() {
        try {
            const boardsData = localStorage.getItem(StorageManager.STORAGE_KEY) || '';
            const settingsData = localStorage.getItem(StorageManager.SETTINGS_KEY) || '';
            
            return {
                boardsSize: new Blob([boardsData]).size,
                settingsSize: new Blob([settingsData]).size,
                totalSize: new Blob([boardsData + settingsData]).size,
                boardCount: JSON.parse(boardsData || '[]').length
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return {
                boardsSize: 0,
                settingsSize: 0,
                totalSize: 0,
                boardCount: 0
            };
        }
    }
}
