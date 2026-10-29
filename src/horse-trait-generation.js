import { horseTraitLimits } from '../public/horse-update-fields.js';

export const traitChoices = values =>
  [...new Set(values || [])].filter(value => value && value !== 'None' && value !== 'Awaiting species data');

export function traitCountRange(category, species, cosmic, available) {
  const max = horseTraitLimits[category] ?? 1;
  const required =
    ['Mane', 'Tail'].includes(category) ||
    (category === 'Keratin' && ['unicorn', 'anticorn'].includes(species.name.toLowerCase())) ||
    (cosmic && ['Pattern', 'Paint', 'Cosmetic'].includes(category));
  return { min: required ? Math.min(max, available) : 0, max: Math.min(max, available), rollMax: max };
}

export function rollHorseTrait(category, values, species, cosmic, rng, count) {
  const pool = traitChoices(values);
  const range = traitCountRange(category, species, cosmic, pool.length);
  count ??= range.min || Math.min(range.max, Math.floor(rng() * (range.rollMax + 1)));
  if (!Number.isInteger(count) || count < range.min || count > range.max)
    throw new Error('Invalid ' + category + ' trait count.');
  const selected = [];
  while (selected.length < count) {
    const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    selected.push(...pool.splice(index, 1));
  }
  return selected;
}
