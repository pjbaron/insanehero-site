/**
 * MocapAnimation - Animation playback with frame interpolation
 */

class MocapAnimation {
    /**
     * Create a mocap animation from loaded JSON data
     * Supports both verbose format and compact format from animation editor
     * @param {object} data - Parsed JSON animation data
     * @param {object} config - Animation config from ANIMATIONS
     */
    constructor(data, config = {}) {
        this.name = data.name;
        this.fps = data.fps;
        this.joints = data.joints;

        // Detect compact format: frames[0] is an array, not an object
        const isCompact = Array.isArray(data.frames[0]);

        if (isCompact) {
            // Convert compact format to verbose format
            this.frames = this._expandCompactFrames(data.frames, data.joints);
            this.bones = this._expandCompactBones(data.bones, data.joints);
            this.frameCount = data.frames.length;
            this.fullDuration = this.frameCount / this.fps;
        } else {
            // Already in verbose format
            this.frames = data.frames;
            this.bones = data.bones;
            this.frameCount = data.frameCount;
            this.fullDuration = data.duration;
        }

        // Config options
        this.loop = config.loop || false;
        this.speed = config.speed || 1.0;
        this.startTime = config.startTime || 0;
        this.endTime = config.endTime || this.fullDuration;
        this.groundFeet = config.groundFeet || false;

        // Skip frame 0 (T-pose) by starting at frame 1 minimum
        const skipFrames = 1;
        const minStartTime = skipFrames / this.fps;
        this.startTime = Math.max(this.startTime, minStartTime);

        // Calculate effective duration based on start/end times
        this.duration = this.endTime - this.startTime;

        // Pre-calculate frame range for faster sampling
        this.startFrame = Math.floor(this.startTime * this.fps);
        this.endFrame = Math.min(
            Math.ceil(this.endTime * this.fps),
            this.frameCount - 1
        );

        // Create joint index map for faster lookups
        this.jointIndex = {};
        for (let i = 0; i < this.joints.length; i++) {
            this.jointIndex[this.joints[i]] = i;
        }
    }

    /**
     * Sample the animation at a given time, with interpolation
     * @param {number} t - Time in seconds (0 to duration)
     * @returns {object} - Pose object with joint positions
     */
    sample(t) {
        // Clamp or loop time
        if (this.loop) {
            t = t % this.duration;
            if (t < 0) t += this.duration;
        } else {
            t = Math.max(0, Math.min(t, this.duration));
        }

        // For looping animations, crossfade near the loop point
        const CROSSFADE_DURATION = 0.3; // seconds
        if (this.loop && t > this.duration - CROSSFADE_DURATION) {
            // Blend between end of animation and start
            const fadeProgress = (t - (this.duration - CROSSFADE_DURATION)) / CROSSFADE_DURATION;
            const endPose = this._sampleAtTime(t);
            const startPose = this._sampleAtTime(0);
            return this.lerpFrames(endPose, startPose, fadeProgress);
        }

        return this._sampleAtTime(t);
    }

    /**
     * Internal: Sample at a specific time without loop crossfade
     * @private
     */
    _sampleAtTime(t) {
        // Convert to frame position within the animation segment
        const effectiveTime = this.startTime + t;
        const frameFloat = effectiveTime * this.fps;

        // Get frame indices
        let frameA = Math.floor(frameFloat);
        let frameB = frameA + 1;

        // Clamp to valid range
        frameA = Math.max(this.startFrame, Math.min(frameA, this.endFrame));
        frameB = Math.max(this.startFrame, Math.min(frameB, this.endFrame));

        // Calculate blend factor
        const blend = frameFloat - Math.floor(frameFloat);

        // Interpolate frames
        return this.lerpFrames(this.frames[frameA], this.frames[frameB], blend);
    }

    /**
     * Sample using normalized time (0 to 1)
     * @param {number} t - Normalized time (0 = start, 1 = end)
     * @returns {object} - Pose object with joint positions
     */
    sampleNormalized(t) {
        return this.sample(t * this.duration);
    }

    /**
     * Linear interpolate between two frames
     * @param {object} frameA - First frame
     * @param {object} frameB - Second frame
     * @param {number} blend - Blend factor (0 = A, 1 = B)
     * @returns {object} - Interpolated pose
     */
    lerpFrames(frameA, frameB, blend) {
        const pose = {};

        // Handle missing frames (e.g., single-frame animations)
        if (!frameA && !frameB) {
            // Return first frame as fallback
            return this.frames[0] || {};
        }
        if (!frameA) frameA = frameB;
        if (!frameB) frameB = frameA;

        for (const joint of this.joints) {
            const posA = frameA[joint];
            const posB = frameB[joint];

            if (posA && posB) {
                pose[joint] = [
                    posA[0] + (posB[0] - posA[0]) * blend,
                    posA[1] + (posB[1] - posA[1]) * blend,
                    posA[2] + (posB[2] - posA[2]) * blend
                ];
            } else if (posA) {
                pose[joint] = [...posA];
            } else if (posB) {
                pose[joint] = [...posB];
            }
        }

        return pose;
    }

    /**
     * Get the effective playback duration (accounting for speed)
     * @param {number} speedMultiplier - Additional speed multiplier
     * @returns {number} - Duration in seconds
     */
    getPlaybackDuration(speedMultiplier = 1.0) {
        return this.duration / (this.speed * speedMultiplier);
    }

    /**
     * Convert compact frame format to verbose format
     * @private
     * @param {Array} compactFrames - Array of frames, each frame is array of [x,y,z] positions
     * @param {Array} joints - Joint names in order
     * @returns {Array} - Verbose frames with joint name keys
     */
    _expandCompactFrames(compactFrames, joints) {
        return compactFrames.map(frame => {
            const pose = {};
            for (let i = 0; i < joints.length; i++) {
                pose[joints[i]] = frame[i];
            }
            return pose;
        });
    }

    /**
     * Convert compact bone indices to joint name pairs
     * @private
     * @param {Array} compactBones - Array of [indexA, indexB] pairs
     * @param {Array} joints - Joint names in order
     * @returns {Array} - Verbose bones with joint name pairs
     */
    _expandCompactBones(compactBones, joints) {
        return compactBones.map(([indexA, indexB]) => [
            joints[indexA],
            joints[indexB]
        ]);
    }

}
