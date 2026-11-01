export const isCosmicPalette = palette =>
  ['solar', 'lunar', 'heavenly', 'void', 'astral'].includes(
    String(palette?.name || '')
      .trim()
      .toLowerCase()
  );

// Fixed Cosmic artwork colors; generated eye traits still come from the normal eye registry.
export const cosmicEyeColors = Object.freeze({
  Solar: '#FFDD00',
  Lunar: '#44BAFF',
  Heavenly: '#000000',
  Void: '#FFFFFF',
  Astral: '#FFFFFF'
});

export const cosmicEyeDescription =
  'Cosmic eye colors are fixed for each Cosmic type and cannot be changed by local settings or imports.';

export const isCosmicEye = eye => Object.hasOwn(cosmicEyeColors, eye?.cosmicType || '');
export const regularEyes = eyes => eyes.filter(eye => !isCosmicEye(eye));
export function withCosmicEyes(eyes) {
  return [
    ...eyes.map(eye =>
      isCosmicEye(eye)
        ? {
            ...eye,
            name: eye.cosmicType,
            rarity: 'Cosmic',
            colors: [cosmicEyeColors[eye.cosmicType]],
            description: cosmicEyeDescription
          }
        : eye
    ),
    ...Object.entries(cosmicEyeColors)
      .filter(([name]) => !eyes.some(eye => eye.cosmicType === name))
      .map(([name, color]) => ({
        id: `cosmic-eye-${name.toLowerCase()}`,
        systemId: `cosmic-eye-${name.toLowerCase()}`,
        name,
        cosmicType: name,
        rarity: 'Cosmic',
        colors: [color],
        description: cosmicEyeDescription,
        layers: [],
        textureId: ''
      }))
  ];
}
export function cosmicArtworkEye(horse) {
  const names = [horse.specialSpawn, ...(horse.mutations || []).map(m => (typeof m === 'string' ? m : m?.name))];
  for (const name of names) {
    const type = Object.keys(cosmicEyeColors).find(
      type =>
        type.toLowerCase() ===
        String(name || '')
          .trim()
          .toLowerCase()
    );
    if (type) return cosmicEyeColors[type];
  }
  return null;
}
