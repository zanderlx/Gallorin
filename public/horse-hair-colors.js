export const isHairColorField = key => ['maneColor', 'tailColor'].includes(key);

// Each region has room for one color mutation, regardless of duplicate settings.
export function mutationHairPart(mutation) {
  const name = String(typeof mutation === 'string' ? mutation : mutation?.name).trim();
  return /^(chimera|harlequin) (mane|tail)$/i.exec(name)?.[2].toLowerCase() || null;
}

export function conflictsWithHairMutation(mutation, mutations) {
  const part = mutationHairPart(mutation);
  return !!part && mutations.some(other => mutationHairPart(other) === part);
}

export function mutationHairColor(horse, key) {
  if (!isHairColorField(key)) return null;
  const part = key === 'maneColor' ? 'mane' : 'tail';
  const names = (horse.mutations || []).map(m =>
    String(typeof m === 'string' ? m : m?.name)
      .trim()
      .toLowerCase()
  );
  // Keep legacy conflicting saves readable with a stable Paint precedence.
  const region = names.includes(`harlequin ${part}`) ? 'Paint' : names.includes(`chimera ${part}`) ? 'Pattern' : null;
  return region ? horse.palette?.colors?.[region] || null : null;
}

export const originalHairColor = horse => horse.palette?.colors?.Hair || '';
export const hairColorOverride = (horse, key) => mutationHairColor(horse, key) || horse[key] || null;
export const horseHairColor = (horse, key) => hairColorOverride(horse, key) || originalHairColor(horse);
