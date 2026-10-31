import { speciesTraitData } from '../public/species-trait-data.js';
import { validateDefinition } from '../public/definitions.js';

export const traitDefaultsVersion = 1;

// Stable bundled IDs also cover species that a keeper has renamed.
export function withTraitDefaults(base, species) {
  const reference = new Map(base.species.map(s => [s.id, speciesTraitData[s.name]]));
  return species.map(entry => {
    const defaults = reference.get(entry.id);
    if (!defaults) return entry;
    const traits = structuredClone(entry.traits || {});
    for (const [category, values] of Object.entries(defaults))
      traits[category] = [...new Set([...(traits[category] || []), ...values])];
    const validated = validateDefinition('species', { ...entry, traits });
    return { ...entry, traits: validated.traits, traitsComplete: validated.traitsComplete };
  });
}
