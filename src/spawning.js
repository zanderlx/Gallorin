// @ts-check
import { regularEyes } from '../public/cosmic-types.js';
import { horseSchemaVersion, horseGenerationVersion } from '../public/horse-version.js';
import { varyPalette } from '../public/palette-variation.js';
import { isCosmicPalette } from '../public/cosmic-types.js';
import { randomInt, randomUUID } from 'node:crypto';
import { cosmicPalette } from './cosmic-palettes.js';
import { readHorseSkills } from '../public/skill-progress.js';
import { defaultSpawnSettings, zoneCreatures } from '../public/spawn-config.js';

export const randomFloat = () => randomInt(0, 4294967296) / 4294967296;
export function pickUniform(values, rng = randomFloat) {
  if (!values.length) throw new Error('A spawning registry is empty.');
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
}
export function pickWeighted(values, weight = v => v.weight, rng = randomFloat) {
  const active = values.filter(v => Math.abs(weight(v)) > 0);
  const total = active.reduce((n, v) => n + Math.abs(weight(v)), 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error('The spawning pool has no positive ticket total.');
  const ticket = Math.min(rng() * total, total - Number.EPSILON * total);
  let sum = 0;
  for (const value of active) {
    sum += Math.abs(weight(value));
    if (ticket < sum) return value;
  }
  return active.at(-1);
}
export function cosmicForRoll(roll, settings = defaultSpawnSettings) {
  const total = Number(settings.cosmic.reduce((n, c) => n + c.chance, 0).toFixed(12));
  if (roll > total || total === 0) return null;
  let boundary = 0;
  for (const cosmic of settings.cosmic.filter(c => c.chance > 0)) {
    boundary = Number((boundary + cosmic.chance).toFixed(12));
    if (roll <= boundary) return cosmic;
  }
  return settings.cosmic.at(-1);
}
export function meetsThresholds(mutation, attributes) {
  return Object.entries(mutation.thresholds || {}).every(
    ([key, { min, max }]) =>
      Number.isFinite(attributes[key]) &&
      (min === undefined || attributes[key] >= min) &&
      (max === undefined || attributes[key] <= max)
  );
}
export function rollMutations(catalog, species, cosmic, settings, rng = randomFloat) {
  let active = catalog.mutations.filter(
    m => m.type === 'Standard' && Math.abs(m.weight || 0) > 0 && meetsThresholds(m, species.attributes || {})
  );
  const result = [],
    chances = cosmic ? settings.cosmicSlots : settings.wildSlots;
  for (let slot = 0; slot < chances.length; slot++) {
    // Failure ends the chain; later slots are never rolled.
    if (rng() * 100 > chances[slot]) break;
    let mutation;
    if (cosmic && slot === 0) {
      mutation = catalog.mutations.find(m =>
        cosmic.mutationId
          ? m.id === cosmic.mutationId
          : m.name === cosmic.name && ['Mutated', 'Cosmic'].includes(m.type)
      ) || { id: `cosmic-${cosmic.name.toLowerCase()}`, name: cosmic.name, type: 'Cosmic', description: '' };
    } else {
      if (!active.length) break;
      mutation = pickWeighted(active, m => m.weight, rng);
      if (!settings.ALLOW_DUPLICATE_MUTATIONS) active = active.filter(m => m.id !== mutation.id);
    }
    result.push(structuredClone(mutation));
  }
  return result;
}
export function rollSize(mutations, settings, rng = randomFloat) {
  const base = pickWeighted(settings.sizes, s => s.weight, rng);
  let index = settings.sizes.indexOf(base);
  // Duplicate copies do not repeatedly apply a mutation's size effect.
  for (const mutation of new Map(mutations.map(m => [m.id || m.name, m])).values())
    index += mutation.sizeShift ?? (mutation.name === 'Dwarfism' ? -1 : mutation.name === 'Gigantism' ? 1 : 0);
  return settings.sizes[Math.max(0, Math.min(10, index))];
}
export function spawnHorse(catalog, location, rng = randomFloat) {
  const settings = catalog.spawning || defaultSpawnSettings;
  const cosmic = cosmicForRoll(rng() * 100, settings);
  const creature = cosmic ? null : pickWeighted(zoneCreatures(location, catalog, settings), c => c.weight, rng);
  // Cosmic species ignore every zone whitelist and rarity weight.
  // Wild species continue to use only the current zone's weighted creature pool.
  const species = cosmic ? pickUniform(catalog.species, rng) : catalog.species.find(s => s.id === creature.speciesId);
  if (!species) throw new Error('The zone references an unknown species.');
  const mutations = rollMutations(catalog, species, cosmic, settings, rng);
  const gender = rng() * 100 < settings.maleChance ? 'Male' : 'Female';
  const size = rollSize(mutations, settings, rng);
  const palettes = catalog.palettes.filter(
    p =>
      p.complete &&
      !isCosmicPalette(p) &&
      (p.global !== false || p.speciesIds?.includes(species.id)) &&
      (cosmic || location.palettePool.includes(p.name))
  );
  const matchedPalette = cosmicPalette({ specialSpawn: cosmic?.name, mutations }, catalog);
  if (!matchedPalette && !palettes.length)
    throw new Error(`No eligible palette for ${species.name} in ${location.name || location.id}.`);
  const palette = structuredClone(matchedPalette || pickUniform(palettes, rng));
  const eye = structuredClone(pickUniform(regularEyes(catalog.eyes), rng));
  const personality = structuredClone(pickUniform(catalog.personalities, rng));
  const availableTraits = species.traits || catalog.traits?.[species.name] || {};
  const traits = Object.fromEntries(
    Object.entries(availableTraits).map(([category, values]) => {
      const selected = values.length ? pickUniform(values, rng) : null;
      return [category, selected && selected !== 'None' ? [selected] : []];
    })
  );
  for (const category of ['Mane', 'Tail']) if (!traits[category]?.length) traits[category] = ['Awaiting species data'];
  const variedPalette = varyPalette(palette, rng, palette.variationPercent ?? settings.paletteVariationPercent ?? 25);
  return {
    schemaVersion: horseSchemaVersion,
    generationVersion: horseGenerationVersion,
    revision: 1,
    id: randomUUID(),
    name: '',
    species: species.name,
    speciesId: species.id,
    rarityTier: species.rarityTier,
    speciesEvent: species.event || null,
    age: 'Adult',
    origin: 'Wild',
    gender,
    size: size.name,
    sizePercent: size.percent,
    birthday: new Date().toISOString().slice(0, 10),
    palette: variedPalette,
    paletteId: palette.id,
    skinId: palette.assetSkins?.length ? pickUniform(palette.assetSkins, rng) : null,
    eye,
    eyeId: eye.id,
    eyeTextureId: eye.textureId || null,
    eyeLayers: structuredClone(eye.layers || []),
    personality,
    personalityId: personality.id,
    personalitySystemId: personality.systemId || personality.id,
    personalityDescription: personality.description,
    traits,
    mutations,
    skills: readHorseSkills(),
    specialSpawn: cosmic?.name || null,
    spawnPath: cosmic ? 'Cosmic' : 'Wild',
    locationId: location.id,
    favorite: false,
    preview: false,
    traitsComplete: !!(availableTraits.Mane?.length && availableTraits.Tail?.length),
    createdAt: new Date().toISOString()
  };
}
