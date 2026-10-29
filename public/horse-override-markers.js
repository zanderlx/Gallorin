import { horseAcquisitionDate, horseDaysOwned } from './dates.js';
import { html } from './ui.js';

export function horseOverrideValue(horse, key) {
  const [kind, name] = key.split(':');
  if (kind === 'trait') return horse.traits?.[name] || horse.traits?.[name + 's'] || [];
  if (kind === 'mutation') return horse.mutations?.[Number(name)] || null;
  if (kind === 'color') return horse.palette?.colors?.[name] || '';
  if (kind === 'skill') return horse.skills?.[name] || { level: 0, xp: 0 };
  if (key === 'description') return horse.personalityDescription ?? horse.personality?.description ?? '';
  if (key === 'birthday') return horseAcquisitionDate(horse) || horse.birthday || '';
  if (key === 'daysOwned') return horseDaysOwned(horse);
  if (key === 'mutations') return horse.mutations || [];
  return horse[key];
}
export function horseOverrideBadge(horse, key, visible) {
  return visible && Array.isArray(horse.overriddenFields) && horse.overriddenFields.includes(key)
    ? String(html`<span class="horse-override-badge">OVERRIDE</span>`)
    : '';
}

const storedFields = {
  species: ['species', 'speciesId', 'rarityTier', 'speciesEvent'],
  palette: ['palette', 'paletteId', 'skinId'],
  eye: ['eye', 'eyeId', 'eyeTextureId', 'eyeLayers'],
  personality: ['personality', 'personalityId', 'personalitySystemId'],
  birthday: ['birthday', 'caughtAt'],
  daysOwned: ['birthday', 'caughtAt'],
  size: ['size', 'sizePercent'],
  description: ['personalityDescription']
};
export function captureHorseOverride(horse, key) {
  const fields = key.includes(':') ? [] : storedFields[key] || [key];
  return structuredClone({
    value: horseOverrideValue(horse, key),
    fields: Object.fromEntries(fields.filter(field => Object.hasOwn(horse, field)).map(field => [field, horse[field]])),
    missing: fields.filter(field => !Object.hasOwn(horse, field))
  });
}
export function restoreHorseOverride(horse, key) {
  const saved = horse.overrideOriginals?.[key];
  if (!saved) throw new Error('The original value was not recorded for this older override.');
  applyHorseFieldSnapshot(horse, key, saved);
  delete horse.overrideOriginals[key];
  horse.overriddenFields = (horse.overriddenFields || []).filter(field => field !== key);
}
export function copyHorseOverrideField(source, target, key) {
  applyHorseFieldSnapshot(target, key, captureHorseOverride(source, key));
  if (source.overrideOriginals?.[key]) {
    target.overrideOriginals ??= {};
    target.overrideOriginals[key] = structuredClone(source.overrideOriginals[key]);
  } else if (target.overrideOriginals) delete target.overrideOriginals[key];
  target.overriddenFields = (target.overriddenFields || []).filter(field => field !== key);
  if (source.overriddenFields?.includes(key)) target.overriddenFields.push(key);
}
function applyHorseFieldSnapshot(horse, key, saved) {
  const [kind, name] = key.split(':');
  if (kind === 'trait') {
    horse.traits ??= {};
    horse.traits[name] = structuredClone(saved.value);
  } else if (kind === 'skill') {
    horse.skills ??= {};
    horse.skills[name] = structuredClone(saved.value);
  } else if (kind === 'color') horse.palette.colors[name] = saved.value;
  else if (kind === 'mutation') {
    horse.mutations ??= [];
    horse.mutations[Number(name)] = structuredClone(saved.value);
    horse.mutations = horse.mutations.filter(Boolean);
  } else {
    Object.assign(horse, structuredClone(saved.fields));
    for (const field of saved.missing) delete horse[field];
  }
}
