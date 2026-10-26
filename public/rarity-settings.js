export const rarityNames = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  'ultra-rare': 'Ultra Rare',
  cosmic: 'Cosmic'
};
export const defaultRaritySettings = {
  version: 1,
  colors: { common: null, uncommon: '#58B878', rare: '#609DEA', 'ultra-rare': '#B378EA', cosmic: '#E6BC57' },
  glow: { common: false, uncommon: true, rare: true, 'ultra-rare': true, cosmic: true }
};

export function validateRaritySettings(input) {
  if (
    !input ||
    input.version !== 1 ||
    !input.colors ||
    typeof input.colors !== 'object' ||
    Array.isArray(input.colors) ||
    Object.keys(input.colors).length !== 5 ||
    Object.keys(input.colors).some(key => !Object.hasOwn(rarityNames, key))
  )
    throw new Error('Provide colors for the five display rarities.');
  if (
    input.glow !== undefined &&
    (!input.glow ||
      typeof input.glow !== 'object' ||
      Array.isArray(input.glow) ||
      Object.keys(input.glow).length !== 5 ||
      Object.keys(input.glow).some(key => !Object.hasOwn(rarityNames, key) || typeof input.glow[key] !== 'boolean'))
  )
    throw new Error('Provide glow choices for the five display rarities.');
  const colors = {},
    glow = {};
  for (const key of Object.keys(rarityNames)) {
    const color = input.colors[key];
    if (color !== null && (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)))
      throw new Error('Rarity colors must be six-digit hex values or no border.');
    colors[key] = color === null ? null : color.toUpperCase();
    // Legacy files had coupled borders/glow. Preserve that appearance until edited.
    glow[key] = color !== null && (input.glow?.[key] ?? true);
  }
  return { version: 1, colors, glow };
}

export const raritySettings = catalog => validateRaritySettings(catalog?.rarities || defaultRaritySettings);
