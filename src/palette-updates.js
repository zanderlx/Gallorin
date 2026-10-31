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
  },
  {
    name: 'Frozen',
    group: 'Christmas',
    natural: false,
    colors: {
      'Coat Top': '#A6D8EB',
      'Coat Bottom': '#D8EFF5',
      Hair: '#EAFBFF',
      Hoof: '#648DAF',
      Nose: '#C2D5E5',
      Sock: '#F7FCFF',
      Keratin: '#B7C5ED',
      Paint: '#81B8DC',
      Pattern: '#E3E7FC'
    },
    complete: true,
    id: 'palettes-13',
    description: '',
    global: true,
    speciesIds: [],
    assetSkins: []
  },
  {
    name: 'MissingNo',
    description: '',
    variationPercent: null,
    speciesIds: [],
    assetSkins: [],
    global: true,
    colors: {
      'Coat Top': '#000000',
      'Coat Bottom': '#C800FF',
      Hair: '#C800FF',
      Hoof: '#C800FF',
      Nose: '#C800FF',
      Sock: '#000000',
      Keratin: '#000000',
      Paint: '#C800FF',
      Pattern: '#C800FF'
    },
    group: 'Developer',
    complete: true,
    systemId: 'missingno',
    id: 'palette-missingno'
  }
];

export function updatedBundledPalettes(bundled, palettes, state) {
  if ((state.paletteAdditionsVersion || 0) >= 4) return palettes;
  const source = normalizeCatalog(bundled).palettes;
  return palettes.map(palette => {
    const previous = previousPaletteDefaults.find(p => p.id === palette.id);
    if (!previous || state.deletedBuiltinPalettes?.includes(palette.id)) return palette;
    const version = ['Frozen', 'MissingNo'].includes(previous.name) ? 4 : 3;
    if ((state.paletteAdditionsVersion || 0) >= version) return palette;
    const normalized = p => ({ ...p, ...validateDefinition('palettes', p) });
    if (!isDeepStrictEqual(normalized(palette), normalized(previous))) return palette;
    const replacement = source.find(p => p.id === palette.id);
    return replacement ? { ...palette, ...structuredClone(replacement) } : palette;
  });
}
