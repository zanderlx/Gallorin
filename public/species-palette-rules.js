import { isCosmicPalette } from './cosmic-types.js';

export function speciesPaletteNames(species, catalog) {
  return species.palettePool ?? catalog.palettes.filter(p => p.speciesIds?.includes(species.id)).map(p => p.name);
}

export function eligibleSpeciesPalettes(catalog, species, location, cosmic = false) {
  const names = new Set([...speciesPaletteNames(species, catalog), ...location.palettePool]);
  return catalog.palettes.filter(
    p =>
      p.complete &&
      !isCosmicPalette(p) &&
      (cosmic ? p.global !== false || p.speciesIds?.includes(species.id) : names.has(p.name))
  );
}
