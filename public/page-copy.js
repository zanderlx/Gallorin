export const copyTokens = [
  'sellingPrice',
  'gold',
  'horseCount',
  'soldCount',
  'encounterCount',
  'horseName',
  'species',
  'gender',
  'birthday',
  'personality',
  'personalityDescription',
  'specialSpawn'
];
export function renderCopy(text, values = {}) {
  return text.replace(
    /\{(sellingPrice|gold|horseCount|soldCount|encounterCount|horseName|species|gender|birthday|personality|personalityDescription|specialSpawn)\}/g,
    (match, key) => (values[key] == null ? match : String(values[key]))
  );
}
export function copyKey(text) {
  // Stable across layout changes, independent of player-created wording.
  let hash = 14695981039346656037n;
  for (const character of text) hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0))) * 1099511628211n);
  return `text-${hash.toString(16)}`;
}
export function validateCopyPatch(payload) {
  if (
    !payload ||
    typeof payload.scope !== 'string' ||
    !/^(site|(wilds|stable|dev|town|breeding|inventory|horse)\/[a-zA-Z0-9-]+)$/.test(payload.scope)
  )
    throw new Error('Choose a valid page to edit.');
  if (
    !payload.entries ||
    typeof payload.entries !== 'object' ||
    Array.isArray(payload.entries) ||
    Object.keys(payload.entries).length > 200
  )
    throw new Error('Save up to 200 text blocks at a time.');
  return Object.fromEntries(
    Object.entries(payload.entries).map(([key, text]) => {
      if (!/^[a-zA-Z][a-zA-Z0-9._-]{0,119}$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('Invalid text block identifier.');
      if (text !== null && (typeof text !== 'string' || text.length > 4000))
        throw new Error('Each text block must be plain text, up to 4,000 characters.');
      return [key, text];
    })
  );
}
