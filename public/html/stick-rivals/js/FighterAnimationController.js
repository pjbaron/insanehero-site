/**
 * FighterAnimationController - State machine managing animation playback
 */

class FighterAnimationController {
    constructor() {
        this.currentAnim = null;      // MocapAnimation instance
        this.currentAnimName = null;  // Animation name (for debugging)
        this.currentTime = 0;
        this.state = 'idle';          // idle, attacking, hit, dying
        this.options = {
            loop: false,
            speed: 1,
            onComplete: null
        };
        this.previousPose = null;     // For velocity calculation
        this.velocities = null;       // Joint velocities for motion blur
    }

    /**
     * Play an animation
     * @param {string} animName - Animation name from ANIMATIONS config
     * @param {object} options - Playback options
     */
    play(animName, options = {}) {
        const animation = AnimationLoader.get(animName);

        if (!animation) {
            // Animation not loaded - set name now so async load can apply it
            this.currentAnimName = animName;
            this.currentAnim = null;
            this.options = { loop: options.loop || false, speed: options.speed || 1.0, onComplete: options.onComplete || null };

            // Try to load it async
            AnimationLoader.load(animName).then(anim => {
                if (anim && this.currentAnimName === animName) {
                    this.currentAnim = anim;
                    this.currentTime = 0;
                }
            });
            console.warn(`FighterAnimationController: Animation "${animName}" not loaded yet`);
            return false;
        }

        this.currentAnim = animation;
        this.currentAnimName = animName;
        this.currentTime = 0;
        this.previousPose = null;
        this.velocities = null;

        // Merge options with animation defaults
        this.options = {
            loop: animation.loop,
            speed: animation.speed,
            onComplete: null,
            ...options
        };

        return true;
    }

    /**
     * Update animation playback
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.currentAnim) return;

        // Store previous pose for velocity calculation
        if (this.currentTime > 0) {
            this.previousPose = this.currentAnim.sample(this.currentTime);
        }

        // Advance time - use animation's configured speed multiplied by attackSpeed option
        // This keeps animations synced with combat attack intervals
        const animSpeed = this.currentAnim.speed || 1.0;
        const attackSpeedMult = this.options.attackSpeed || 1.0;
        this.currentTime += dt * animSpeed * attackSpeedMult;

        // Check for animation end
        const duration = this.currentAnim.duration;

        if (this.currentTime >= duration) {
            if (this.options.loop) {
                this.currentTime = this.currentTime % duration;
            } else {
                this.currentTime = duration;

                // Fire completion callback (once)
                if (this.options.onComplete) {
                    const callback = this.options.onComplete;
                    this.options.onComplete = null;  // Prevent re-firing
                    callback();
                }
            }
        }

        // Calculate velocities for motion blur
        this._updateVelocities(dt);
    }

    /**
     * Calculate joint velocities for motion blur
     * @private
     */
    _updateVelocities(dt) {
        if (!this.previousPose || dt === 0) {
            this.velocities = null;
            return;
        }

        const currentPose = this.getCurrentPose();
        if (!currentPose) {
            this.velocities = null;
            return;
        }

        this.velocities = {};
        for (const joint in currentPose) {
            if (this.previousPose[joint]) {
                const curr = currentPose[joint];
                const prev = this.previousPose[joint];
                this.velocities[joint] = [
                    (curr[0] - prev[0]) / dt,
                    (curr[1] - prev[1]) / dt,
                    (curr[2] - prev[2]) / dt
                ];
            }
        }
    }

    /**
     * Get the current interpolated pose
     * @returns {object|null} - Pose object or null if no animation
     */
    getCurrentPose() {
        if (!this.currentAnim) return null;
        return this.currentAnim.sample(this.currentTime);
    }

    /**
     * Get the current animation data (for bone definitions)
     * @returns {MocapAnimation|null}
     */
    getCurrentAnimation() {
        return this.currentAnim;
    }

    /**
     * Get joint velocities for motion blur effects
     * @returns {object|null}
     */
    getVelocities() {
        return this.velocities;
    }

    /**
     * Check if an animation is currently playing (not at end)
     * @returns {boolean}
     */
    isPlaying() {
        if (!this.currentAnim) return false;
        if (this.options.loop) return true;
        return this.currentTime < this.currentAnim.duration;
    }

    /**
     * Get the remaining time of the current animation
     * @returns {number} - Remaining time in seconds, or 0 if looping/no animation
     */
    getRemainingTime() {
        if (!this.currentAnim || this.options.loop) return 0;
        return Math.max(0, this.currentAnim.duration - this.currentTime);
    }

    /**
     * Transition to a new state with appropriate animation
     * @param {string} state - 'idle', 'attack', 'hit', 'death'
     * @param {object} options - Additional options
     */
    setState(state, options = {}) {
        const prevState = this.state;
        this.state = state;

        // Map state to animation name
        let animName;
        let animOptions = {};

        switch (state) {
            case 'idle':
                animName = 'idle';
                animOptions = { loop: true };
                break;

            case 'taunt':
                animName = 'taunt';
                animOptions = { loop: true };
                break;

            case 'flexing':
                // Randomly pick between flexing animations
                animName = Math.random() < 0.5 ? 'flexing' : 'flexing2';
                animOptions = { loop: true };
                break;

            case 'attack':
                // Don't interrupt an attack animation that's already playing
                // Let it complete naturally and return to idle via onComplete
                if (prevState === 'attack' && this.isPlaying()) {
                    return false;  // No new animation started
                }
                // Select random attack animation for variety
                const attacks = ATTACK_ANIMATIONS || ['punch_jab'];
                animName = attacks[Math.floor(Math.random() * attacks.length)];
                animOptions = {
                    loop: false,
                    onComplete: () => this.setState('idle')
                };
                break;

            case 'hit':
                animName = 'hit_react';
                animOptions = {
                    loop: false,
                    onComplete: () => this.setState('idle')
                };
                break;

            case 'death':
                animName = 'death';
                animOptions = {
                    loop: false
                    // No onComplete - stay on last frame
                };
                break;

            default:
                animName = 'idle';
                animOptions = { loop: true };
        }

        return this.play(animName, { ...animOptions, ...options });
    }
}
