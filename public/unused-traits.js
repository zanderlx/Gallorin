export const isUnusedTraitCategory = category => category.trim().toLowerCase() === 'wings';

export function removeUnusedTraits(record) {
  if (!record.traits || typeof record.traits !== 'object' || Array.isArray(record.traits)) return false;
  const unused = Object.keys(record.traits).filter(isUnusedTraitCategory);
  for (const category of unused) delete record.traits[category];
  return unused.length > 0;
}
