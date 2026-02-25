// worldConfig.js - World generation presets

export const WorldPresets = {
  standard: {
    name: 'Standard',
    seed: 'default',
    columns: 100,
    maxDepth: 500,
    wealthDensity: 0.15,
    hazardDensity: 0.08,
    hardnessProgression: 1.0
  },

  rich: {
    name: 'Rich Veins',
    seed: 'rich',
    columns: 100,
    maxDepth: 500,
    wealthDensity: 0.25,
    hazardDensity: 0.12,
    hardnessProgression: 1.0
  },

  hellscape: {
    name: 'Hellscape',
    seed: 'hell',
    columns: 100,
    maxDepth: 500,
    wealthDensity: 0.20,
    hazardDensity: 0.20,
    hardnessProgression: 1.5
  },

  easy: {
    name: 'Easy Mode',
    seed: 'easy',
    columns: 100,
    maxDepth: 300,
    wealthDensity: 0.30,
    hazardDensity: 0.03,
    hardnessProgression: 0.7
  }
};

export const defaultPreset = WorldPresets.standard;
