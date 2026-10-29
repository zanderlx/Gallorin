import { traitChoices, traitCountRange } from '../public/horse-update-fields.js';
export { traitChoices, traitCountRange } from '../public/horse-update-fields.js';

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
