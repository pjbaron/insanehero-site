/**
 * Animation Definitions - Maps logical animation names to mocap files
 * Mocap data is recorded at 30fps - speed 1.0 plays at real-time
 */

const ANIMATIONS = {
    // Idle/Stance - compact clips (no startTime/endTime needed, already trimmed)
    idle: { file: 'boxing_7_clip_idle.json', loop: true, speed: 0.5 },
    karate_idle: { file: 'karate_bassai_clip_idle.json', loop: true, speed: 0.5, startTime: 0.5 },

    // Taunts - use idle stances
    taunt: { file: 'karate_bassai_clip_idle.json', loop: true, speed: 0.6, startTime: 0.5 },

    // Basic Attacks - compact clips
    // contactJoint/contactFrame: pre-analyzed from compact_data (frame of max forward extension)
    // Speeds adjusted so all attacks complete in ~0.95s (just under 1.0s base attack interval)
    punch_jab: { file: 'boxing_1_clip_punch.json', loop: false, speed: 1.51, contactJoint: 'hand_r', contactFrame: 0.556 },
    boxing_hook: { file: 'boxing_1_clip_hook.json', loop: false, speed: 1.19, contactJoint: 'hand_r', contactFrame: 0.412 },
    boxing_shuffle: { file: 'boxing_1_clip_shuffle.json', loop: false, speed: 1.0 },
    punch_combo: { file: 'kick_punch_knee_clip.json', loop: false, speed: 2.18, contactJoint: 'hand_r', contactFrame: 0.5 },

    // Kicks - compact clips (foot_r is the kicking foot)
    front_kick: { file: 'front_kick_1_clip.json', loop: false, speed: 2.25, contactJoint: 'foot_r', contactFrame: 0.55 },
    front_kick_high: { file: 'front_kick_1_clip_high.json', loop: false, speed: 2.18, contactJoint: 'foot_r', contactFrame: 0.45 },
    front_kick_2: { file: 'front_kick_2_clip.json', loop: false, speed: 1.89, contactJoint: 'foot_r', contactFrame: 0.45 },

    // Get-up reactions - compact clips
    getup_back: { file: 'getup_back_1_clip.json', loop: false, speed: 1.0 },
    getup_side: { file: 'getup_side_1_clip.json', loop: false, speed: 1.0 },

    // Hit reactions - TODO: create proper clips (using shuffle as stagger placeholder)
    hit_react: { file: 'boxing_1_clip_shuffle.json', loop: false, speed: 2.0 },

    // Death/Fall animation - plays when a fighter is defeated
    death: { file: 'slip_fall_2_clip.json', loop: false, speed: 1.5, groundFeet: true },

    // Victory/Celebration animations
    flexing: { file: '79_94_flexing_clip.json', loop: true, speed: 1.0, startTime: 5 },
    flexing2: { file: '79_94_flexing_clip.json', loop: true, speed: 1.0, startTime: 1.8 }
};

// Animations to preload on game start for instant playback
const PRELOAD_ANIMATIONS = [
    'idle', 'taunt', 'hit_react', 'death', 'flexing', 'flexing2',
    'punch_jab', 'boxing_hook', 'boxing_shuffle', 'punch_combo',
    'front_kick', 'front_kick_high', 'front_kick_2',
    'getup_back', 'getup_side'
];

// Attack animation pool - randomly selected during combat
const ATTACK_ANIMATIONS = ['punch_jab', 'boxing_hook', 'punch_combo', 'front_kick_high', 'front_kick', 'front_kick_2'];

// Debug: test one animation type at a time
//const ATTACK_ANIMATIONS = ['punch_combo'];
