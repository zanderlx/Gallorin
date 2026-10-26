export const isCosmicPalette = palette =>
  ['solar', 'lunar', 'heavenly', 'void', 'astral'].includes(
    String(palette?.name || '')
      .trim()
      .toLowerCase()
  );
