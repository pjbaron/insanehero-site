/**
 * AnimationLoader - Async loader with caching for mocap PNG files
 *
 * PNG encoding: 16-bit fixed point, range [-1.5, 2.5], RGB only (alpha=255)
 * Every 2 pixels store 3 values:
 *   Pixel 0: R=v0_high, G=v0_low, B=v1_high
 *   Pixel 1: R=v1_low, G=v2_high, B=v2_low
 * Row 0 is header (pixel 0: R=fps, G=joint_count)
 * Rows 1+ are frame data (32 pixels = 48 values = 16 joints x 3 coords)
 */

const AnimationLoader = {
    cache: {},
    basePath: 'compact_data/',
    loading: {},

    // Fixed joint/bone definitions (same order in all animation files)
    JOINTS: ['head', 'neck', 'spine', 'hips', 'shoulder_l', 'elbow_l', 'hand_l',
             'shoulder_r', 'elbow_r', 'hand_r', 'hip_l', 'knee_l', 'foot_l',
             'hip_r', 'knee_r', 'foot_r'],
    BONES: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [1, 7], [7, 8], [8, 9],
            [3, 10], [10, 11], [11, 12], [3, 13], [13, 14], [14, 15]],

    // Encoding constants (must match encoder)
    MIN_VAL: -1.5,
    RANGE: 4.0,  // 2.5 - (-1.5)

    /**
     * Load a single animation by logical name
     * @param {string} name - Animation name from ANIMATIONS config
     * @returns {Promise<MocapAnimation|null>}
     */
    async load(name) {
        if (this.cache[name]) {
            return this.cache[name];
        }

        if (this.loading[name]) {
            return this.loading[name];
        }

        const config = ANIMATIONS[name];
        if (!config) {
            console.warn(`AnimationLoader: Unknown animation "${name}"`);
            return null;
        }

        this.loading[name] = this._loadPNG(name, config);

        try {
            const animation = await this.loading[name];
            this.cache[name] = animation;
            delete this.loading[name];
            return animation;
        } catch (error) {
            console.error(`AnimationLoader: Failed to load "${name}":`, error);
            delete this.loading[name];
            return null;
        }
    },

    /**
     * Decode a 16-bit encoded value back to float
     * @private
     */
    _decodeValue(encoded) {
        return (encoded / 65535) * this.RANGE + this.MIN_VAL;
    },

    /**
     * Internal: Load PNG and decode to animation data
     * @private
     */
    async _loadPNG(name, config) {
        // Convert .json filename to .png
        const pngFile = config.file.replace(/\.json$/, '.png');
        const url = this.basePath + pngFile;

        // Load image as blob to use createImageBitmap with premultiplyAlpha: none
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }
        const blob = await response.blob();

        // Create bitmap WITHOUT premultiplied alpha (critical for data integrity)
        const bitmap = await createImageBitmap(blob, { premultiplyAlpha: 'none' });

        // Draw to canvas to get pixel data
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        const data = imageData.data;

        // Read header (row 0, pixel 0)
        const fps = data[0];

        // Decode frames (skip header row)
        // Format: 2 pixels per 3 values (one joint), RGB only
        // Pixel 0: R=v0_high, G=v0_low, B=v1_high
        // Pixel 1: R=v1_low, G=v2_high, B=v2_low
        const frames = [];
        for (let row = 1; row < bitmap.height; row++) {
            const joints = [];
            const rowOffset = row * bitmap.width * 4;

            for (let j = 0; j < 16; j++) {
                // Each joint = 3 values stored in 2 pixels
                const pxBase = j * 2;
                const i0 = rowOffset + pxBase * 4;       // First pixel offset
                const i1 = rowOffset + (pxBase + 1) * 4; // Second pixel offset

                // Decode 3 values from RGB channels of 2 pixels
                const v0 = (data[i0] << 8) | data[i0 + 1];     // R0, G0
                const v1 = (data[i0 + 2] << 8) | data[i1];     // B0, R1
                const v2 = (data[i1 + 1] << 8) | data[i1 + 2]; // G1, B1

                joints.push([
                    this._decodeValue(v0),
                    this._decodeValue(v1),
                    this._decodeValue(v2)
                ]);
            }
            frames.push(joints);
        }

        // Build data object matching JSON structure
        const animData = {
            name: config.file.replace(/\.json$/, '').replace(/_clip$/, ''),
            fps: fps,
            joints: this.JOINTS,
            bones: this.BONES,
            frames: frames
        };

        const animation = new MocapAnimation(animData, config);
        //console.log(`AnimationLoader: Loaded "${name}" (${animation.frameCount} frames, ${animation.duration.toFixed(2)}s)`);
        return animation;
    },

    /**
     * Preload multiple animations
     * @param {string[]} names - Array of animation names to preload
     * @returns {Promise<void>}
     */
    async preload(names) {
        const promises = names.map(name => this.load(name));
        await Promise.all(promises);
        console.log(`AnimationLoader: Preloaded ${names.length} animations`);
    },

    /**
     * Get a cached animation synchronously (returns null if not loaded)
     * @param {string} name - Animation name
     * @returns {MocapAnimation|null}
     */
    get(name) {
        return this.cache[name] || null;
    },

    /**
     * Check if an animation is loaded
     * @param {string} name - Animation name
     * @returns {boolean}
     */
    isLoaded(name) {
        return name in this.cache;
    }
};
