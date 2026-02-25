/**
 * Storage System - Persistent game data via localStorage
 * Extensible system for storing game progress and settings
 */

const Storage = {
    STORAGE_KEY: 'onepickfighter_save',

    // Default save data structure
    defaults: {
        currentRival: 'friendly',  // Current rival being fought
        version: 1                  // Save format version for future migrations
    },

    /**
     * Load all saved data (or defaults if none exists)
     * @returns {object} - Saved game data
     */
    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) {
                return { ...this.defaults };
            }
            const data = JSON.parse(raw);
            // Merge with defaults in case new fields were added
            return { ...this.defaults, ...data };
        } catch (e) {
            console.warn('Failed to load save data:', e);
            return { ...this.defaults };
        }
    },

    /**
     * Save all data
     * @param {object} data - Data to save
     */
    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save data:', e);
        }
    },

    /**
     * Get a specific value from storage
     * @param {string} key - Key to retrieve
     * @returns {*} - Value or default
     */
    get(key) {
        const data = this.load();
        return data[key] !== undefined ? data[key] : this.defaults[key];
    },

    /**
     * Set a specific value in storage
     * @param {string} key - Key to set
     * @param {*} value - Value to store
     */
    set(key, value) {
        const data = this.load();
        data[key] = value;
        this.save(data);
    },

    /**
     * Reset all progress to defaults
     */
    reset() {
        this.save({ ...this.defaults });
    },

    /**
     * Check if player has completed the game (beaten all rivals)
     * @returns {boolean}
     */
    hasCompletedGame() {
        return this.get('currentRival') === 'completed';
    }
};
