export const isCosmicPalette = palette =>
  ['solar', 'lunar', 'heavenly', 'void', 'astral'].includes(
    String(palette?.name || '')
      .trim()
      .toLowerCase()
  );

// Artwork-only overrides; generated eye traits still come from the eye registry.
export const cosmicEyeColors = Object.freeze({
  Solar: '#FFDD00',
  Lunar: '#44BAFF',
  Heavenly: '#000000',
  Void: '#FFFFFF',
  Astral: '#FFFFFF'
});

export const cosmicEyeDescription =
  'Name and Rarity cannot be changed because these special eye colors are reserved for the Cosmic rarity. Changing these rules requires updating species logic. The eye color itself remains editable.';

export const isCosmicEye = eye => Object.hasOwn(cosmicEyeColors, eye?.cosmicType || '');
export const regularEyes = eyes => eyes.filter(eye => !isCosmicEye(eye));
export function withCosmicEyes(eyes) {
  return [
    ...eyes.map(eye => (isCosmicEye(eye) && !eye.description ? { ...eye, description: cosmicEyeDescription } : eye)),
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
let artworkEyes = withCosmicEyes([]);
export function setCosmicEyeDefinitions(eyes) {
  artworkEyes = withCosmicEyes(eyes).filter(isCosmicEye);
}
export function cosmicArtworkEye(horse) {
  const names = [horse.specialSpawn, ...(horse.mutations || []).map(m => (typeof m === 'string' ? m : m?.name))];
  for (const name of names) {
    const eye = artworkEyes.find(
      eye =>
        eye.cosmicType.toLowerCase() ===
        String(name || '')
          .trim()
          .toLowerCase()
    );
    if (eye) return eye.colors[0];
  }
  return null;
}
