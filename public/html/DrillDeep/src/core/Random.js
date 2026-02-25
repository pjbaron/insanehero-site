// Random.js - Seeded PRNG for deterministic generation

export class SeededRandom {
  constructor(seed) {
    this.seed = this.hashString(seed);
    this.current = this.seed;
  }

  // Hash a string to a number
  hashString(str) {
    if (typeof str === 'number') return str;

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) || 1;
  }

  // Mulberry32 PRNG - fast and good quality
  next() {
    let t = this.current += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  // Get a random float in range [min, max)
  float(min = 0, max = 1) {
    return min + this.next() * (max - min);
  }

  // Get a random integer in range [min, max]
  int(min, max) {
    return Math.floor(this.float(min, max + 1));
  }

  // Return true with given probability (0-1)
  chance(probability) {
    return this.next() < probability;
  }

  // Pick a random element from an array
  pick(array) {
    return array[this.int(0, array.length - 1)];
  }

  // Shuffle an array in place
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Create a new seeded random with a derived seed
  derive(suffix) {
    return new SeededRandom(this.seed + this.hashString(String(suffix)));
  }
}

// Utility function for one-off random with seed
export function seededRandom(seed) {
  return new SeededRandom(seed);
}
