// @ts-check
import { createHash } from 'node:crypto';
import { removeUnusedTraits } from '../public/unused-traits.js';
import { pickUniform, pickWeighted, randomFloat, rollSize, meetsThresholds } from './spawning.js';
import { cosmicPalette } from './cosmic-palettes.js';
import { varyPalette } from '../public/palette-variation.js';
import { regularEyes } from '../public/cosmic-types.js';
import { isCosmicPalette } from '../public/cosmic-types.js';
import { horseUpdateFields, horseTraitLimits } from '../public/horse-update-fields.js';
import { rollHorseTrait, traitChoices, traitCountRange } from './horse-trait-generation.js';
import { horseGenerationVersion } from '../public/horse-version.js';
import { readHorseSkills } from '../public/skill-progress.js';
import { updateHorseField, validateHorseName } from '../public/horse-fields.js';
import { localCalendarDate } from '../public/dates.js';

const cosmicNames = ['Solar', 'Lunar', 'Heavenly', 'Void', 'Astral'];
const nameOf = m => (typeof m === 'string' ? m : m?.name);
const cosmicName = value => cosmicNames.find(name => name.toLowerCase() === String(value || '').toLowerCase());
export const horseFingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function lockedCosmicMutations(horse, catalog) {
  const locked = (horse.mutations || [])
    .filter(m => cosmicName(nameOf(m)))
    .map(m => (typeof m === 'string' ? { name: m, type: 'Cosmic', description: '' } : structuredClone(m)));
  const identity = cosmicName(horse.specialSpawn);
  if (identity && !locked.some(m => cosmicName(m.name) === identity)) {
    locked.unshift(
      structuredClone(
        catalog.mutations.find(m => cosmicName(m.name) === identity) || {
          name: identity,
          type: 'Cosmic',
          description: ''
        }
      )
    );
  }
  return locked;
}
export function validateHorseRules(rules) {
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) throw new Error('Choose fields to update.');
  const fields = new Map(horseUpdateFields.map(field => [field.key, field]));
  if (Object.keys(rules).length > horseUpdateFields.length) throw new Error('Too many update fields.');
  for (const [key, rule] of Object.entries(rules)) {
    if (!fields.has(key) || !rule || typeof rule !== 'object' || !fields.get(key).modes.includes(rule.mode))
      throw new Error('Invalid horse update field or operation.');
  }
  if (rules.birthday?.mode === 'set' && rules.daysOwned?.mode === 'set')
    throw new Error('Choose either acquisition date or age in days.');
  if (
    rules.mutations?.mode === 'reroll' &&
    Object.entries(rules).some(([key, r]) => key.startsWith('mutation:') && r.mode !== 'keep')
  )
    throw new Error('Choose all-mutation reroll or individual slots, not both.');
}
export function regenerateHorse(original, rules, catalog, state, { rng = randomFloat, allowDuplicates = false } = {}) {
  validateHorseRules(rules);
  const horse = structuredClone(original),
    warnings = [];
  removeUnusedTraits(horse);
  const active = key => rules[key] && rules[key].mode !== 'keep';
  const rule = key => rules[key] || { mode: 'keep' };
  const find = (values, id, label) => {
    const value = values.find(v => v.id === id);
    if (!value) throw new Error('Choose an available ' + label + '.');
    return value;
  };
  let species =
    catalog.species.find(s => s.id === horse.speciesId) || catalog.species.find(s => s.name === horse.species);
  if (active('species')) {
    species =
      rule('species').mode === 'reroll'
        ? pickUniform(catalog.species, rng)
        : find(catalog.species, rule('species').value, 'species');
    Object.assign(horse, {
      species: species.name,
      speciesId: species.id,
      rarityTier: species.rarityTier,
      speciesEvent: species.event || null
    });
  }
  if (!species)
    throw new Error((horse.name || horse.species) + ': species no longer exists. Select a registered species first.');
  const settings = catalog.spawning;
  const locked = lockedCosmicMutations(original, catalog);
  const identity = cosmicName(original.specialSpawn) || cosmicName(locked[0]?.name);
  const mutationChange = active('mutations') || [0, 1, 2, 3].some(i => active('mutation:' + i));
  if (mutationChange) {
    if ((original.mutations || []).length > 4 || locked.length > 4)
      throw new Error(
        'This legacy horse has more than four mutations. Preserve them until its extra slots are reviewed.'
      );
    const eligible = catalog.mutations.filter(m => !cosmicName(m.name) && meetsThresholds(m, species.attributes || {}));
    let slots = structuredClone(horse.mutations || []);
    const standard = () => eligible.filter(m => m.type === 'Standard' && Math.abs(m.weight || 0) > 0);
    const draw = used => {
      const pool = standard().filter(
        m => allowDuplicates || !used.some(v => (v?.id && v.id === m.id) || nameOf(v) === m.name)
      );
      return pool.length ? structuredClone(pickWeighted(pool, m => m.weight, rng)) : null;
    };
    if (rule('mutations').mode === 'reroll') {
      slots = structuredClone(locked);
      const rates = identity ? settings.cosmicSlots : settings.wildSlots;
      for (let index = slots.length; index < 4; index++) {
        if (rng() * 100 > rates[index]) break;
        const mutation = draw(slots);
        if (!mutation) break;
        slots.push(mutation);
      }
    } else {
      slots = Array.from({ length: 4 }, (_, index) => slots[index] || null);
      // Explicit locks always survive, including old saves where the Cosmic mutation is missing.
      for (const mutation of locked)
        if (!slots.some(m => nameOf(m) === mutation.name)) {
          const empty = slots.findIndex(m => !m);
          if (empty < 0) throw new Error('No free slot for the protected Cosmic mutation.');
          slots[empty] = mutation;
        }
      for (let index = 0; index < 4; index++) {
        const key = 'mutation:' + index;
        if (!active(key)) continue;
        if (cosmicName(nameOf(slots[index]))) {
          warnings.push('Mutation slot ' + (index + 1) + ' is Cosmic and was kept.');
          continue;
        }
        if (rule(key).mode === 'clear') slots[index] = null;
        else if (rule(key).mode === 'reroll') slots[index] = draw(slots.filter((_, i) => i !== index));
        else {
          const mutation = find(eligible, rule(key).value, 'non-Cosmic mutation that meets this species threshold');
          if (!allowDuplicates && slots.some((m, i) => i !== index && nameOf(m) === mutation.name))
            throw new Error('Duplicate mutations are disabled for this update.');
          slots[index] = structuredClone(mutation);
        }
      }
    }
    horse.mutations = slots.filter(Boolean);
    if (horse.mutations.length > 4) throw new Error('A horse can have at most four mutations.');
  }
  if (identity && mutationChange) {
    horse.specialSpawn = identity;
    horse.spawnPath = 'Cosmic';
  }
  // A species change must not silently retain traits that belong to another species.
  for (const [category, max] of Object.entries(horseTraitLimits)) {
    const key = 'trait:' + category,
      values = traitChoices(species.traits?.[category]);
    const range = traitCountRange(category, species, !!identity, values.length);
    const existing = horse.traits?.[category] || [];
    if (active('species') && !active(key) && existing.some(v => v !== 'Awaiting species data' && !values.includes(v)))
      throw new Error('Changing species requires updating incompatible ' + category + ' traits.');
    if (!active(key)) continue;
    horse.traits ??= {};
    if (rule(key).mode === 'set') {
      const chosen = Array.isArray(rule(key).value) ? rule(key).value : [rule(key).value];
      if (chosen.length > max || new Set(chosen).size !== chosen.length || chosen.some(v => !values.includes(v)))
        throw new Error('Choose valid ' + category + ' traits for ' + species.name + '.');
      if (chosen.length < range.min) throw new Error(category + ' requires ' + range.min + ' trait(s).');
      horse.traits[category] = chosen;
    } else if (rule(key).mode === 'clear') {
      if (range.min) throw new Error(category + ' requires ' + range.min + ' trait(s); choose reroll or a value.');
      horse.traits[category] = ['Mane', 'Tail'].includes(category) ? ['Awaiting species data'] : [];
    } else {
      if (!values.length) {
        if (active('species') && species.id !== original.speciesId) {
          horse.traits[category] = ['Mane', 'Tail'].includes(category) ? ['Awaiting species data'] : [];
          warnings.push(species.name + ' has no ' + category + ' definitions; incompatible traits were cleared.');
        } else warnings.push(species.name + ' has no ' + category + ' definitions; saved traits were kept.');
        continue;
      }
      horse.traits[category] = rollHorseTrait(category, values, species, !!identity, rng, rule(key).count);
    }
  }
  if (active('species') || Object.keys(horseTraitLimits).some(c => active('trait:' + c)))
    horse.traitsComplete =
      !!(species.traits?.Mane?.length && species.traits?.Tail?.length) &&
      ['Mane', 'Tail'].every(c => horse.traits?.[c]?.length && !horse.traits[c].includes('Awaiting species data'));
  if (active('palette')) {
    const fixed = cosmicPalette(horse, catalog);
    const eligible = catalog.palettes.filter(
      p => p.complete && !isCosmicPalette(p) && (p.global !== false || p.speciesIds?.includes(species.id))
    );
    const palette =
      rule('palette').mode === 'set'
        ? find(fixed ? [fixed] : eligible, rule('palette').value, 'species-compatible palette')
        : fixed || pickUniform(eligible, rng);
    horse.palette = varyPalette(palette, rng, palette.variationPercent ?? settings.paletteVariationPercent ?? 25);
    horse.paletteId = palette.id;
    horse.skinId = palette.assetSkins?.length ? pickUniform(palette.assetSkins, rng) : null;
    if (fixed) warnings.push('Cosmic palette remains ' + fixed.name + '.');
  } else if (
    active('species') &&
    horse.palette?.global === false &&
    !horse.palette.speciesIds?.includes(species.id) &&
    !cosmicPalette(horse, catalog)
  ) {
    throw new Error('Changing species requires a compatible palette. Choose palette reroll or a matching palette.');
  }
  for (const field of horseUpdateFields.filter(f => f.key.startsWith('color:'))) {
    if (!active(field.key)) continue;
    const color = rule(field.key).value;
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Enter a valid hex color.');
    horse.palette.colors[field.label] = color.toUpperCase();
    // Match Cosmic synchronization's saved-variation contract so explicit colors remain stable.
    horse.palette.colorVariation ??= {
      baseColors: structuredClone(cosmicPalette(horse, catalog)?.colors || original.palette.colors)
    };
  }
  if (active('eye')) {
    const eye = structuredClone(
      rule('eye').mode === 'reroll'
        ? pickUniform(regularEyes(catalog.eyes), rng)
        : find(regularEyes(catalog.eyes), rule('eye').value, 'eye color')
    );
    Object.assign(horse, {
      eye,
      eyeId: eye.id,
      eyeTextureId: eye.textureId || null,
      eyeLayers: structuredClone(eye.layers || [])
    });
  }
  if (active('personality')) {
    const personality = structuredClone(
      rule('personality').mode === 'reroll'
        ? pickUniform(catalog.personalities, rng)
        : find(catalog.personalities, rule('personality').value, 'personality')
    );
    Object.assign(horse, {
      personality,
      personalityId: personality.id,
      personalitySystemId: personality.systemId || personality.id
    });
  }
  for (const field of ['gender', 'age', 'origin', 'birthday', 'size']) {
    if (!active(field)) continue;
    if (field === 'gender' && rule(field).mode === 'reroll')
      horse.gender = rng() * 100 < settings.maleChance ? 'Male' : 'Female';
    else if (field === 'size' && rule(field).mode === 'reroll') {
      const size = rollSize(horse.mutations, settings, rng);
      horse.size = size.name;
      horse.sizePercent = size.percent;
    } else if (field === 'origin') {
      if (typeof rule(field).value !== 'string' || !rule(field).value.trim() || rule(field).value.length > 100)
        throw new Error('Origin must be 1–100 characters.');
      horse.origin = rule(field).value.trim();
    } else updateHorseField(horse, field, rule(field).value, catalog, state);
  }
  if (active('daysOwned')) {
    const days = rule('daysOwned').value;
    if (!Number.isInteger(days) || days < 0 || days > 365000)
      throw new Error('Age must be a whole number of days from 0 to 365000.');
    const date = new Date();
    date.setDate(date.getDate() - days);
    updateHorseField(horse, 'birthday', localCalendarDate(date), catalog, state);
  }
  if (active('name')) horse.name = validateHorseName(rule('name').value);
  if (active('favorite')) {
    if (typeof rule('favorite').value !== 'boolean') throw new Error('Favorite must be true or false.');
    horse.favorite = rule('favorite').value;
  }
  for (const [key, target] of [
    ['description', 'personalityDescription'],
    ['notes', 'notes']
  ]) {
    if (!active(key)) continue;
    const text =
      rule(key).mode === 'clear'
        ? ''
        : rule(key).mode === 'refresh'
          ? horse.personality.description || ''
          : rule(key).value;
    if (typeof text !== 'string' || text.length > 4000) throw new Error('Text must be 4,000 characters or fewer.');
    horse[target] = text;
  }
  for (const skill of ['agility', 'strength', 'jump', 'bond', 'wing']) {
    if (!active('skill:' + skill)) continue;
    const value = rule('skill:' + skill).mode === 'reset' ? { level: 0, xp: 0 } : rule('skill:' + skill).value;
    if (!value || !Number.isInteger(value.level) || value.level < 0 || value.level > 10)
      throw new Error('Choose a skill level from 0 to 10.');
    horse.skills = { ...readHorseSkills(horse.skills), [skill]: readHorseSkills({ [skill]: value })[skill] };
  }
  // Keep IDs, acquisition history, favorites, and personal notes unless explicitly selected.
  const changes = Object.keys(horse)
    .filter(key => !equal(original[key], horse[key]))
    .map(key => ({ field: key, before: original[key] ?? null, after: horse[key] ?? null }));
  if (changes.length) {
    horse.generationVersion = horseGenerationVersion;
    horse.lastRegeneratedAt = new Date().toISOString();
  }
  return { horse, changes, warnings };
}
