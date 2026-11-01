export const isHairColorField = key => ['maneColor', 'tailColor'].includes(key);

export function mutationHairColor(horse, key) {
  if (!isHairColorField(key)) return null;
  const part = key === 'maneColor' ? 'mane' : 'tail';
  const names = (horse.mutations || []).map(m =>
    String(typeof m === 'string' ? m : m?.name)
      .trim()
      .toLowerCase()
  );
  // Paint takes precedence if both color mutations affect the same part.
  const region = names.includes(`harlequin ${part}`) ? 'Paint' : names.includes(`chimera ${part}`) ? 'Pattern' : null;
  return region ? horse.palette?.colors?.[region] || null : null;
}

export const originalHairColor = horse => horse.palette?.colors?.Hair || '';
export const hairColorOverride = (horse, key) => mutationHairColor(horse, key) || horse[key] || null;
export const horseHairColor = (horse, key) => hairColorOverride(horse, key) || originalHairColor(horse);
