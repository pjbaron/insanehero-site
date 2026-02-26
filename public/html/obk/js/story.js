export const STORY_BEATS = [
    null,
    { text: 'THE HEAD HAS RETURNED.', duration: 2000 },
    null,
    null,
    { text: 'A HOSTILE PRESENCE STIRS AT THE HORIZON.', duration: 2000 },
    null,
    null,
    { text: 'THE HEAD GROWS HUNGRY.', duration: 2000 },
    null,
    null,
    { text: 'WINTER WHISPERS. THE WORLD TURNS COLDER.', duration: 2000 },
    null,
    { text: 'THE RIVAL STIRS ITS FORCES.', duration: 2000 },
    null,
    { text: 'ANOTHER HEAD APPEARS ON THE HORIZON.', duration: 2000 },
    null,
    null,
    { text: 'THE KINGDOMS PREPARE FOR WAR.', duration: 2000 },
    { text: 'THE RIVAL IS WITHIN REACH. DESTROY IT.', duration: 2000 },
    null,
    { text: 'THE END DRAWS NEAR.', duration: 2000 },
    null,
    null,
    { text: 'ONE FINAL REVOLUTION.', duration: 2000 },
    { text: 'THE FINAL BATTLE.', duration: 2000 },
];

export function triggerBeat(day, state) {
    const beat = STORY_BEATS[day];
    if (beat) {
        state.activeBeat = { text: beat.text, duration: beat.duration, elapsed: 0 };
    }
}

export function updateBeat(dt, state) {
    if (state.activeBeat) {
        state.activeBeat.elapsed += dt * 1000;
        if (state.activeBeat.elapsed >= state.activeBeat.duration) {
            state.activeBeat = null;
        }
    }
}

// Branch choice days and their options
export const BRANCH_CHOICES = {
    4: {
        text: 'THE HEAD MUST CHOOSE ITS FOCUS.',
        options: [
            { label: 'STRENGTH', effect: 'combat_focus',  desc: 'Enemies spawn slower. Beam targets enemies first.' },
            { label: 'HARVEST',  effect: 'harvest_focus', desc: 'Resources yield more. Beam targets resources first.' },
        ],
    },
    12: {
        text: 'THE RIVAL GROWS BOLD.',
        options: [
            { label: 'FORTIFY', effect: 'fortify',  desc: 'Wall gains 3 HP. Castle approach alarm activates.' },
            { label: 'AGGRESS', effect: 'aggress',  desc: 'Rival castle spawns 2 days earlier. Bonus gold on kill.' },
        ],
    },
    20: {
        text: 'THE HEAD MAKES ITS FINAL DECREE.',
        options: [
            { label: 'ENDURE', effect: 'endure',  desc: 'Wall HP doubled for the final battle.' },
            { label: 'DEVOUR', effect: 'devour',  desc: 'Beam width doubled for the final battle.' },
        ],
    },
};

// Returns true if this day has a branch choice
export function hasBranchChoice(day) {
    return day in BRANCH_CHOICES;
}

// Trigger a branch choice (sets activeBranchChoice on state, pauses world)
export function triggerBranchChoice(day, state) {
    if (!hasBranchChoice(day)) return;
    state.activeBranchChoice = {
        day,
        ...BRANCH_CHOICES[day],
        elapsed:     0,
        autoTimeout: 4000,  // ms before default option applied
        resolved:    false,
    };
}

// Called when player selects an option (or timeout fires)
export function resolveBranchChoice(state, optionIndex) {
    const choice = state.activeBranchChoice;
    if (!choice || choice.resolved) return;
    choice.resolved = true;
    const effect = choice.options[optionIndex]?.effect ?? choice.options[0].effect;
    // Store effect on state for main.js to apply
    state.activeBranchEffect = effect;
    state.activeBranchChoice = null;
}

// Update branch choice timer
export function updateBranchChoice(dt, state) {
    const choice = state.activeBranchChoice;
    if (!choice) return;
    choice.elapsed += dt * 1000;
    if (choice.elapsed >= choice.autoTimeout) {
        resolveBranchChoice(state, 0);  // default: first option
    }
}
