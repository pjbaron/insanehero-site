/**
 * Audio System
 * Web Audio API for SFX, HTML5 Audio for streaming music
 * Global object (non-module), loaded before game modules
 */

const GameAudio = {
    ctx: null,
    buffers: {},
    loaded: false,
    enabled: true,
    masterVolume: 0.7,
    musicVolume: 0.4,
    sfxVolume: 0.6,
    musicMuted: false,
    musicElement: null,
    musicPlaying: false,
    sfxGain: null,

    // Game fills this before calling loadSFX()
    // e.g. { jump: 'assets/audio/jump.mp3', hit: 'assets/audio/hit.mp3' }
    sfxFiles: {},

    /**
     * Create AudioContext (call on first user interaction)
     */
    initContext() {
        if (this.ctx) return;

        // Load saved mute state
        try { var saved = localStorage.getItem('musicMuted'); if (saved !== null) this.musicMuted = saved === '1'; } catch (e) {}

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume * this.masterVolume;
            this.sfxGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    },

    /**
     * Resume suspended AudioContext (required after user gesture)
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    /**
     * Fetch and decode all SFX mp3s into buffers
     */
    async loadSFX() {
        if (!this.ctx || !this.enabled) return;

        var promises = Object.entries(this.sfxFiles).map(async ([name, path]) => {
            try {
                var response = await fetch(path);
                var arrayBuffer = await response.arrayBuffer();
                this.buffers[name] = await this.ctx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.warn('Audio: Failed to load ' + name + ':', e);
            }
        });

        await Promise.all(promises);
        this.loaded = true;
    },

    /**
     * Play a named SFX from decoded buffer
     * @param {string} name - Key from sfxFiles
     * @param {object} options - { volume, pitch }
     */
    play(name, options) {
        if (!this.enabled || !this.ctx || !this.sfxGain) return;

        var buffer = this.buffers[name];
        if (!buffer) return;

        var opts = options || {};
        var volume = opts.volume !== undefined ? opts.volume : 1.0;
        var pitch = opts.pitch !== undefined ? opts.pitch : 1.0;

        var source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;

        var gainNode = this.ctx.createGain();
        gainNode.gain.value = volume * this.sfxVolume * this.masterVolume;

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        source.start(0);
    },

    /**
     * Start streaming music (HTML5 Audio, preload='none' for instant game load)
     * @param {string} src - Path to music file, e.g. 'assets/audio/music.mp3'
     */
    playMusic(src) {
        if (this.musicMuted || this.musicPlaying) return;

        var audio = new Audio();
        audio.preload = 'none';
        audio.loop = true;
        audio.volume = this.musicVolume * this.masterVolume;

        this.musicElement = audio;
        this.musicPlaying = true;

        var started = false;
        var self = this;

        var startPlay = function() {
            if (started) return;
            started = true;
            audio.play().catch(function() {
                self.musicPlaying = false;
                self.musicElement = null;
            });
        };

        audio.addEventListener('canplaythrough', startPlay, { once: true });

        // Timeout fallback - don't wait forever
        setTimeout(startPlay, 3000);

        audio.src = src;
    },

    /**
     * Fade out and stop music over 1 second
     */
    stopMusic() {
        var audio = this.musicElement;
        if (!audio) return;

        this.musicPlaying = false;
        this.musicElement = null;

        var startVol = audio.volume;
        var fadeStart = performance.now();
        var fadeDuration = 1000;

        var fade = function() {
            var elapsed = performance.now() - fadeStart;
            var t = Math.min(elapsed / fadeDuration, 1);
            audio.volume = startVol * (1 - t);
            if (t < 1) {
                requestAnimationFrame(fade);
            } else {
                audio.pause();
                audio.src = '';
            }
        };
        requestAnimationFrame(fade);
    },

    /**
     * Mute everything (for Poki ads)
     */
    muteAll() {
        if (this.sfxGain) this.sfxGain.gain.value = 0;
        if (this.musicElement) this.musicElement.volume = 0;
    },

    /**
     * Unmute everything (after Poki ads)
     */
    unmuteAll() {
        if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume * this.masterVolume;
        if (this.musicElement && !this.musicMuted) {
            this.musicElement.volume = this.musicVolume * this.masterVolume;
        }
    },

    /**
     * Toggle music on/off (user control)
     */
    toggleMusic() {
        this.musicMuted = !this.musicMuted;
        try { localStorage.setItem('musicMuted', this.musicMuted ? '1' : '0'); } catch (e) {}

        if (this.musicMuted) {
            if (this.musicElement) this.musicElement.volume = 0;
        } else {
            if (this.musicElement) {
                this.musicElement.volume = this.musicVolume * this.masterVolume;
            }
        }
    },
};
