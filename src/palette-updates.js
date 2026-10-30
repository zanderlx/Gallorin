import { isDeepStrictEqual } from 'node:util';
import { normalizeCatalog, validateDefinition } from '../public/definitions.js';

// Previous bundled defaults: only untouched copies receive revised colors.
export const previousPaletteDefaults = [
  {
    name: 'Lettuce',
    group: 'Easter',
    natural: false,
    colors: {
      'Coat Top': '#F0E1C1',
      'Coat Bottom': '#C7DEA0',
      Hair: '#4B9B63',
      Hoof: '#A8FFC2',
      Nose: '#A1E34A',
      Sock: '#A4BF84',
      Keratin: '#A4BF84',
      Paint: '#A1E34A',
      Pattern: '#4C9B22'
    },
    complete: true,
    description: '',
    variationPercent: null,
    speciesIds: [],
    assetSkins: [],
    global: true,
    systemId: 'lettuce',
    id: 'palettes-20'
  },
  {
    name: 'Vegetable',
    description: '',
    variationPercent: null,
    speciesIds: [],
    assetSkins: [],
    global: true,
    colors: {
      'Coat Top': '#749867',
      'Coat Bottom': '#B5D5AA',
      Hair: '#E2D17E',
      Hoof: '#749867',
      Nose: '#E2D17E',
      Sock: '#C2AB38',
      Keratin: '#B5D5AA',
      Paint: '#DD3308',
      Pattern: '#DD3308'
    },
    group: 'Easter',
    complete: true,
    systemId: 'vegetable',
    id: 'palette-vegetable'
  }
];

export function updatedBundledPalettes(bundled, palettes, state) {
  if ((state.paletteAdditionsVersion || 0) >= 3) return palettes;
  const source = normalizeCatalog(bundled).palettes;
  return palettes.map(palette => {
    const previous = previousPaletteDefaults.find(p => p.id === palette.id);
    if (!previous || state.deletedBuiltinPalettes?.includes(palette.id)) return palette;
    const normalized = p => ({ ...p, ...validateDefinition('palettes', p) });
    if (!isDeepStrictEqual(normalized(palette), normalized(previous))) return palette;
    const replacement = source.find(p => p.id === palette.id);
    return replacement ? { ...palette, ...structuredClone(replacement) } : palette;
  });
}
