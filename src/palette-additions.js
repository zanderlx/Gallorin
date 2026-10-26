import { normalizeCatalog, validateDefinition } from '../public/definitions.js';

// Bundled palettes added after earlier installs had already written config/palettes.json.
// Version 1 is applied once; later deletions are never restored.
export const paletteAdditionsVersion = 1;
export const bundledPaletteAdditionIds = [
  'palettes-fae-1',
  'palettes-fae-2',
  'palettes-fae-3',
  'palettes-fae-4',
  'palettes-flora-1',
  'palettes-flora-2',
  'palettes-gargoyle-1',
  'palettes-ginger',
  'palettes-kelpie-1',
  'palettes-umber',
  'palettes-ash',
  'palettes-beaver',
  'palettes-bisorse-1',
  'palettes-sovremeign-1',
  'palettes-strawberry',
  'palettes-tawny',
  'palettes-vaporwave',
  'palettes-vibrant-pastel',
  'palettes-blueberry',
  'palettes-calaverita-1',
  'palettes-girafetti-1',
  'palettes-girafetti-2',
  'palettes-jester',
  'palette-fae-5',
  'palette-flora-3',
  'palette-hauntmare-1',
  'palette-hauntmare-2',
  'palette-hauntmare-3',
  'palette-hauntmare-4',
  'palette-hauntmare-5',
  'palette-hauntmare-6',
  'palette-nephyrian-1',
  'palette-pink-lemonade',
  'palette-serpentine-1',
  'palette-serpentine-2',
  'palette-serpentine-3',
  'palette-serpentine-4',
  'palette-vegetable',
  'palette-orange',
  'palette-lemon'
];

// Returns bundled additions missing from the local registry. Local entries always win:
// an ID, name or system ID already in use, a recorded deletion, or a link to a missing species skips that palette.
export function missingBundledPalettes(bundled, catalog, state) {
  const source = normalizeCatalog(bundled).palettes;
  const deleted = new Set(state.deletedBuiltinPalettes || []);
  const ids = new Set(catalog.palettes.map(p => p.id));
  const names = new Set(catalog.palettes.map(p => p.name?.toLowerCase()));
  const systemIds = new Set(catalog.palettes.map(p => p.systemId).filter(Boolean));
  const additions = [];
  for (const id of bundledPaletteAdditionIds) {
    const palette = source.find(p => p.id === id && p.complete === true);
    if (!palette || ids.has(id) || deleted.has(id) || names.has(palette.name.toLowerCase())) continue;
    const { systemId } = validateDefinition('palettes', palette);
    if (systemIds.has(systemId) || palette.speciesIds.some(sid => !catalog.species.some(s => s.id === sid))) continue;
    additions.push(structuredClone(palette));
    ids.add(id);
    names.add(palette.name.toLowerCase());
    systemIds.add(systemId);
  }
  return additions;
}
