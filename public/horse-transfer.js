import { readHorseVersion } from './horse-version.js';
import { limits, formatLimit } from './limits.js';
import { horseAcquisitionDate } from './dates.js';
import { readHorseSkills } from './skill-progress.js';
import { ages, sizes } from './horse-fields.js';

export const horseFormat = 'aetherion-horse';
export const horseFormatVersion = 1;
const regions = ['Coat Top', 'Coat Bottom', 'Hair', 'Hoof', 'Nose', 'Sock', 'Keratin', 'Paint', 'Pattern'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function text(value, label, max = 100, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
    throw new Error(`${label} must be ${empty ? 'at most' : '1–'}${max} characters.`);
  return value;
}
function choice(value, values, label) {
  if (!values.includes(value)) throw new Error(`Invalid ${label}.`);
  return value;
}
function color(value) {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value))
    throw new Error('Colors must use six-digit hex values, such as #AABBCC.');
  return value.toUpperCase();
}
function timestamp(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new Error(`Invalid ${label}.`);
  return new Date(value).toISOString();
}
const optionalID = value => (value === undefined ? {} : { id: text(value, 'Definition ID', 100) });
export function readHorseDocument(document) {
  if (
    !object(document) ||
    document.format !== horseFormat ||
    document.version !== horseFormatVersion ||
    !object(document.horse)
  )
    throw new Error('Choose a Gallorin horse JSON file with version 1.');
  const h = document.horse;
  if (!object(h.palette) || !object(h.palette.colors) || !object(h.eye) || !object(h.personality) || !object(h.traits))
    throw new Error('Horse colors, eyes, personality, and traits are required.');
  const birthday = text(h.birthday, 'Birthday', 10);
  const date = new Date(`${birthday}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(birthday) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== birthday ||
    birthday < '0001-01-01' ||
    birthday > new Date().toISOString().slice(0, 10)
  )
    throw new Error('Birthday must be a real YYYY-MM-DD date, no later than today.');
  if (!Array.isArray(h.eye.colors) || !h.eye.colors.length || h.eye.colors.length > 6)
    throw new Error('Provide 1–6 eye colors.');
  const traits = Object.entries(h.traits);
  if (traits.length > 40) throw new Error('Use at most 40 trait categories.');
  const safeTraits = Object.fromEntries(
    traits.map(([key, values]) => {
      text(key, 'Trait category', 60);
      if (['__proto__', 'constructor', 'prototype'].includes(key) || !Array.isArray(values) || values.length > 30)
        throw new Error('Invalid trait category or values.');
      return [key, values.map(v => text(v, 'Trait', 120))];
    })
  );
  if (!Array.isArray(h.mutations) || h.mutations.length > 30)
    throw new Error('Provide a mutations array with at most 30 entries.');
  const mutations = h.mutations.map(m => {
    if (typeof m === 'string') return text(m, 'Mutation', 120);
    if (!object(m)) throw new Error('Invalid mutation.');
    return {
      ...optionalID(m.id),
      name: text(m.name, 'Mutation name', 120),
      description: text(m.description ?? '', 'Mutation description', 4000, true),
      ...(m.type === undefined ? {} : { type: text(m.type, 'Mutation type', 100) })
    };
  });
  const strings = (values, label, max = 100) => {
    if (!Array.isArray(values) || values.length > 10000) throw new Error(`${label} must be a list.`);
    return values.map(v => text(v, label, max));
  };
  const layers = h.eye.layers ?? h.eyeLayers ?? [];
  if (!Array.isArray(layers) || layers.length > 20) throw new Error('Provide up to 20 eye layers.');
  const eyeLayers = layers.map((layer, i) => {
    if (
      !object(layer) ||
      (layer.opacity !== undefined && (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1))
    )
      throw new Error('Invalid eye layer.');
    return {
      id: text(layer.id || `layer-${i + 1}`, 'Layer ID'),
      textureId: text(layer.textureId ?? '', 'Layer texture', 200, true),
      opacity: layer.opacity ?? 1,
      ...(layer.color ? { color: color(layer.color) } : {})
    };
  });
  const identifiers = {};
  for (const key of [
    'speciesId',
    'paletteId',
    'eyeId',
    'personalityId',
    'personalitySystemId',
    'skinId',
    'eyeTextureId',
    'spawnPath'
  ])
    if (h[key] != null) identifiers[key] = text(h[key], key, 200);
  const size = choice(h.size, Object.keys(sizes), 'size');
  if (h.sizePercent !== undefined && h.sizePercent !== sizes[size])
    throw new Error('Size percentage must match the selected size.');
  for (const key of ['favorite', 'preview', 'traitsComplete'])
    if (h[key] !== undefined && typeof h[key] !== 'boolean') throw new Error(`${key} must be true or false.`);
  if (h.rarityTier !== undefined && (!Number.isInteger(h.rarityTier) || h.rarityTier < 0 || h.rarityTier > 4))
    throw new Error('Choose a valid rarity from Common through Cosmic.');
  return {
    ...readHorseVersion(h),
    skills: readHorseSkills(h.skills),
    ...identifiers,
    ...(h.rarityTier === undefined ? {} : { rarityTier: h.rarityTier }),
    ...(h.speciesEvent === undefined
      ? {}
      : { speciesEvent: h.speciesEvent === null ? null : text(h.speciesEvent, 'Species event', 100, true) }),
    name: text(h.name ?? '', 'Name', 60, true),
    species: text(h.species, 'Species'),
    age: choice(h.age, ages, 'age'),
    gender: choice(h.gender, ['Female', 'Male'], 'gender'),
    origin: text(h.origin, 'Origin'),
    size,
    sizePercent: sizes[size],
    birthday,
    personality: {
      ...optionalID(h.personality.id),
      ...(h.personality.emoji ? { emoji: text(h.personality.emoji, 'Personality emoji', 32) } : {}),
      ...(h.personality.systemId ? { systemId: text(h.personality.systemId, 'Personality system ID') } : {}),
      behaviorTags: strings(h.personality.behaviorTags || [], 'Behavior tag'),
      name: text(h.personality.name, 'Personality'),
      description: text(h.personality.description ?? '', 'Default description', 4000, true)
    },
    personalityDescription: text(
      h.personalityDescription ?? h.personality.description ?? '',
      'Description',
      4000,
      true
    ),
    notes: text(h.notes ?? '', 'Notes', 4000, true),
    palette: {
      ...optionalID(h.palette.id),
      global: h.palette.global !== false,
      speciesIds: strings(h.palette.speciesIds || [], 'Species ID'),
      assetSkins: strings(h.palette.assetSkins || [], 'Asset skin', 200),
      name: text(h.palette.name, 'Palette name'),
      group: text(h.palette.group ?? 'Imported', 'Palette group'),
      complete: true,
      colors: Object.fromEntries(regions.map(region => [region, color(h.palette.colors[region])])),
      ...(h.palette.colorVariation
        ? {
            colorVariation: {
              baseColors: Object.fromEntries(
                regions.map(region => [region, color(h.palette.colorVariation.baseColors?.[region])])
              )
            }
          }
        : {})
    },
    eyeLayers,
    eye: {
      ...optionalID(h.eye.id),
      textureId: text(h.eye.textureId ?? h.eyeTextureId ?? '', 'Eye texture', 200, true),
      layers: eyeLayers,
      name: text(h.eye.name, 'Eye name'),
      ...(h.eye.rarity === undefined ? {} : { rarity: text(h.eye.rarity, 'Eye rarity') }),
      colors: h.eye.colors.map(color)
    },
    traits: safeTraits,
    mutations,
    specialSpawn: h.specialSpawn == null ? null : text(h.specialSpawn, 'Special spawn'),
    favorite: h.favorite ?? false,
    preview: h.preview ?? true,
    traitsComplete: h.traitsComplete ?? false,
    locationId: text(h.locationId ?? 'imported', 'Location ID', 100),
    createdAt: timestamp(h.createdAt, 'creation timestamp')
  };
}
export function createHorseDocument(horse) {
  const data = { ...horse, birthday: horseAcquisitionDate(horse) || horse.birthday?.slice(0, 10) };
  const snapshot = readHorseDocument({ format: horseFormat, version: horseFormatVersion, horse: data });
  const document = {
    format: horseFormat,
    version: horseFormatVersion,
    exportedAt: new Date().toISOString(),
    horse: { id: horse.id, ...snapshot }
  };
  if (JSON.stringify(document).length > limits.horseFileBytes)
    throw new Error(`This horse exceeds the ${formatLimit(limits.horseFileBytes)} transfer limit.`);
  return document;
}
