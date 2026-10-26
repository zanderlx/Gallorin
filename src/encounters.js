import { spawnHorse } from './spawning.js';
import { normalizeCatalog } from '../public/definitions.js';
import { locationsFor } from '../public/zones.js';
// Each horse independently reads the current registries through the spawning pipeline.
export function createEncounters(catalog, locationId, count, searchNumber = 0, location, rng) {
  location ??= locationsFor(catalog).find(l => l.id === locationId);
  if (!location) throw new Error('Unknown location.');
  const registry = normalizeCatalog(catalog);
  return Array.from({ length: count }, () => spawnHorse(registry, location, rng));
}
