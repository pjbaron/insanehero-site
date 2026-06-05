export function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

export function tilePRNG(globalSeed, tx, ty) {
  const seed = (globalSeed ^ (tx * 73856093) ^ (ty * 19349663)) >>> 0;
  return mulberry32(seed);
}

export function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

export function seedToTimeString(seed) {
  const s = seed % 86400;
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor(s / 60) % 60;
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
