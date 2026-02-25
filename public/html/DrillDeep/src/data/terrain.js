// terrain.js - Tile type definitions

export const TILE_SIZE = 16;

export const TerrainTypes = {
  soil: {
    name: 'Soil',
    hardness: 1,
    digTime: 100, // milliseconds
    color: '#8B7355',
    minDepth: 0,
    maxDepth: 50
  },
  clay: {
    name: 'Clay',
    hardness: 2,
    digTime: 200,
    color: '#CD853F',
    minDepth: 10,
    maxDepth: 150
  },
  rock: {
    name: 'Rock',
    hardness: 5,
    digTime: 400,
    color: '#696969',
    minDepth: 30,
    maxDepth: 300
  },
  granite: {
    name: 'Granite',
    hardness: 12,
    digTime: 700,
    color: '#2F4F4F',
    minDepth: 100,
    maxDepth: 400
  },
  obsidian: {
    name: 'Obsidian',
    hardness: 25,
    digTime: 1000,
    color: '#1C1C1C',
    minDepth: 200,
    maxDepth: 500
  },
  bedrock: {
    name: 'Bedrock',
    hardness: 99,
    digTime: Infinity,
    color: '#0A0A0A',
    minDepth: 450,
    maxDepth: 500,
    impassable: true
  }
};

export const Valuables = {
  coal: {
    name: 'Coal',
    value: 10,
    rarity: 0.50,
    minDepth: 5,
    maxDepth: 100,
    color: '#2D2D2D'
  },
  copper: {
    name: 'Copper',
    value: 25,
    rarity: 0.40,
    minDepth: 20,
    maxDepth: 200,
    color: '#B87333'
  },
  silver: {
    name: 'Silver',
    value: 75,
    rarity: 0.25,
    minDepth: 50,
    maxDepth: 300,
    color: '#C0C0C0'
  },
  gold: {
    name: 'Gold',
    value: 200,
    rarity: 0.15,
    minDepth: 100,
    maxDepth: 400,
    color: '#FFD700'
  },
  ruby: {
    name: 'Ruby',
    value: 500,
    rarity: 0.08,
    minDepth: 150,
    maxDepth: 450,
    color: '#E0115F'
  },
  artifact: {
    name: 'Artifact',
    value: 1500,
    rarity: 0.03,
    minDepth: 200,
    maxDepth: 500,
    color: '#9400D3'
  }
};

export const Hazards = {
  gas: {
    name: 'Gas Vent',
    damage: 5,
    minDepth: 30,
    maxDepth: 500,
    rarity: 0.05,
    color: '#90EE90'
  },
  lava: {
    name: 'Lava Vein',
    damage: 15,
    minDepth: 100,
    maxDepth: 500,
    rarity: 0.04,
    color: '#FF4500'
  },
  cavein: {
    name: 'Cave-in',
    damage: 10,
    minDepth: 50,
    maxDepth: 400,
    rarity: 0.03,
    color: '#8B4513'
  },
  creature: {
    name: 'Creature',
    damage: 20,
    minDepth: 150,
    maxDepth: 500,
    rarity: 0.02,
    color: '#4B0082'
  }
};

// Get terrain type for a given depth
export function getTerrainForDepth(depth, random) {
  const candidates = Object.entries(TerrainTypes)
    .filter(([key, t]) => depth >= t.minDepth && depth <= t.maxDepth)
    .sort((a, b) => b[1].minDepth - a[1].minDepth); // Prefer deeper terrain

  if (candidates.length === 0) return 'soil';

  // Weighted selection favoring harder terrain at depth
  const weights = candidates.map(([key, t], i) => 1 / (i + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = random * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i][0];
  }

  return candidates[0][0];
}
