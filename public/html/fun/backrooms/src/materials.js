export function createMaterials() {
  function mat(params) {
    return new THREE.MeshStandardMaterial(params);
  }

  const m = {
    floor: mat({ color: 0xb8a86a, roughness: 0.92, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    floor2: mat({ color: 0xa89858, roughness: 0.95, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    carpet: mat({ color: 0x9a8a52, roughness: 0.98, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    wall: mat({ color: 0xd4c88a, roughness: 0.85, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }),
    wall2: mat({ color: 0xc8bc7c, roughness: 0.88, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }),
    ceiling: mat({ color: 0xe8e0c0, roughness: 0.75, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    lightPanel: mat({ color: 0xfff8e8, roughness: 0.5, metalness: 0.0, emissive: new THREE.Color(0xfff0d0), emissiveIntensity: 1.8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    skirting: mat({ color: 0x8a7a50, roughness: 0.9, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
  };

  return Object.freeze(m);
}

export function disposeMaterials(mats) {
  for (const mat of Object.values(mats)) {
    mat.dispose();
  }
}
