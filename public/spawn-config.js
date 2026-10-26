// Shared configuration rules. Probability constants live in JSON after first startup.
export const registryKinds = ['species', 'palettes', 'eyes', 'mutations', 'personalities'];
export const tierWeights = { 0: 10, 1: 40, 2: 100, 3: 250, 4: 500 };
export const standardTokens = {
  'Springy Tendons': 2333,
  'Powerful Lungs': 1675,
  'Strong Muscles': 1116,
  'Nimble Hooves': 837,
  'Limber Tendons': 558,
  'Chimera Mane': 558,
  'Chimera Tail': 558,
  'Harlequin Mane': 558,
  'Harlequin Tail': 558,
  Dwarfism: 335,
  Gigantism: 335,
  Intelligence: 279,
  'Double Stamina': 112,
  'Close Bond': 112,
  'Double Jump': 84,
  'Very Fertile': 56,
  Twins: 28,
  'Perfect Twins': 6,
  Mutated: 3
};
export const defaultSpawnSettings = {
  version: 1,
  ALLOW_DUPLICATE_MUTATIONS: false,
  tierWeights,
  cosmic: [
    { name: 'Solar', chance: 0.1 },
    { name: 'Lunar', chance: 0.1 },
    { name: 'Heavenly', chance: 0.05 },
    { name: 'Void', chance: 0.05 },
    { name: 'Astral', chance: 0.025 }
  ],
  cosmicSlots: [100, 80, 40, 15],
  wildSlots: [80, 40, 15, 5],
  sizes: [
    { name: 'Teacup', percent: 75, weight: 5 },
    { name: 'Teeny', percent: 80, weight: 15 },
    { name: 'Tiny', percent: 85, weight: 45 },
    { name: 'Small', percent: 90, weight: 120 },
    { name: 'Little', percent: 95, weight: 220 },
    { name: 'Normal', percent: 100, weight: 250 },
    { name: 'Big', percent: 105, weight: 220 },
    { name: 'Huge', percent: 110, weight: 120 },
    { name: 'Giant', percent: 115, weight: 45 },
    { name: 'Draft', percent: 120, weight: 15 },
    { name: 'Mammoth', percent: 125, weight: 5 }
  ],
  maleChance: 50,
  paletteVariationPercent: 25
};
export const systemID = name =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'custom';
export const defaultSpeciesTiers = Object.fromEntries(
  [
    [4, ['Bisorse', 'Caprine', 'Equus', 'Friesian', 'Horse', 'Peryton', 'Pony']],
    [3, ['Akhal Teke', 'Clydesdale', 'Donkey', 'Fjord', 'Flora', 'Gargoyle', 'Lusitano', 'Marwari']],
    [2, ['Anticorn', 'Cactaline', 'Fae', 'Felorse', 'Hippocampus', 'Kelpie', 'Unicorn']],
    [1, ['Caniquine', 'Nephyrian', 'Serpentine']]
  ].flatMap(([tier, names]) => names.map(name => [name.toLowerCase(), tier]))
);
export function rarityTier(species) {
  if (species.rarityTier !== undefined) return species.rarityTier;
  const assigned = defaultSpeciesTiers[species.name?.toLowerCase()];
  if (assigned) return assigned;
  const note = species.restriction || '';
  return /ultra/i.test(note) ? 1 : /rare/i.test(note) ? 2 : /uncommon/i.test(note) ? 3 : 4;
}
export function validateThresholds(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 30)
    throw new Error('Thresholds must be an object with up to 30 attributes.');
  for (const [key, bounds] of Object.entries(value)) {
    if (
      !/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/.test(key) ||
      !bounds ||
      typeof bounds !== 'object' ||
      Array.isArray(bounds) ||
      Object.keys(bounds).some(k => !['min', 'max'].includes(k))
    )
      throw new Error('Each threshold needs an attribute and min/max bounds.');
    for (const bound of Object.values(bounds))
      if (!Number.isFinite(bound)) throw new Error('Threshold bounds must be finite numbers.');
    if (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max)
      throw new Error('Threshold minimum cannot exceed maximum.');
  }
  return structuredClone(value);
}
export function validateSpawnSettings(input) {
  const s = structuredClone(input);
  if (!s || s.version !== 1 || typeof s.ALLOW_DUPLICATE_MUTATIONS !== 'boolean')
    throw new Error('Spawn settings need version 1 and a duplicate-mutation boolean.');
  // Older local configuration files predate the Cosmic species tier.
  if (s.tierWeights && s.tierWeights[0] === undefined) s.tierWeights[0] = tierWeights[0];
  const numeric = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
  if (![0, 1, 2, 3, 4].every(t => numeric(s.tierWeights?.[t], 1, 1000000)))
    throw new Error('Each rarity tier needs a positive weight.');
  for (const key of ['cosmicSlots', 'wildSlots'])
    if (!Array.isArray(s[key]) || s[key].length !== 4 || !s[key].every(n => numeric(n, 0, 100)))
      throw new Error('Each mutation path needs four percentages.');
  if (s.cosmicSlots[0] !== 100) throw new Error('Cosmic slot 1 must remain guaranteed.');
  if (
    !Array.isArray(s.cosmic) ||
    s.cosmic.length !== 5 ||
    new Set(s.cosmic.map(c => c.name)).size !== 5 ||
    s.cosmic.some(c => !defaultSpawnSettings.cosmic.some(base => base.name === c.name) || !numeric(c.chance, 0, 100)) ||
    s.cosmic.reduce((n, c) => n + c.chance, 0) > 100
  )
    throw new Error('Provide five unique Cosmic chances totaling at most 100%.');
  if (
    !Array.isArray(s.sizes) ||
    s.sizes.length !== 11 ||
    s.sizes.some(
      (v, i) =>
        v.name !== defaultSpawnSettings.sizes[i].name || v.percent !== 75 + i * 5 || !numeric(v.weight, 0, 1000000)
    ) ||
    !s.sizes.some(v => v.weight > 0)
  )
    throw new Error('Provide weights for the eleven ordered sizes.');
  if (!numeric(s.maleChance, 0, 100)) throw new Error('Male chance must be between 0 and 100.');
  if (s.paletteVariationPercent === undefined) s.paletteVariationPercent = defaultSpawnSettings.paletteVariationPercent;
  if (!numeric(s.paletteVariationPercent, 0, 100)) throw new Error('Color variation must be a number from 0 to 100%.');
  return s;
}
export function zoneCreatures(zone, catalog, settings = defaultSpawnSettings) {
  if (zone.creatures !== undefined) return zone.creatures;
  return (zone.speciesPool || [])
    .map(name => catalog.species.find(s => s.name === name))
    .filter(Boolean)
    .map(s => ({ speciesId: s.id, weight: settings.tierWeights[rarityTier(s)] }));
}
export function validateCreatures(creatures, catalog) {
  if (
    !Array.isArray(creatures) ||
    creatures.length > catalog.species.length ||
    new Set(creatures.map(c => c.speciesId)).size !== creatures.length ||
    creatures.some(
      c =>
        !catalog.species.some(s => s.id === c.speciesId) || !Number.isFinite(c.weight) || Math.abs(c.weight) > 1000000
    )
  )
    throw new Error('Zone creatures need unique, registered species IDs and finite weights.');
  return creatures.map(c => ({ speciesId: c.speciesId, weight: c.weight }));
}
