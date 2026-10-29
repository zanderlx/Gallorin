import { isCosmicPalette } from './cosmic-types.js';
import { defaultSpeciesTiers } from './spawn-config.js';
import { baseAtmospheres } from './definitions.js';
// Shared zone definitions and validation, used by both the editor and local server.
export const atmospheres = {
  forest: { name: 'Evergreen forest', encounterTitle: 'Among the whispering trees' },
  autumn: { name: 'Amber woodland', encounterTitle: 'Beyond the amber leaves' },
  moonlit: { name: 'Moonlit grove', encounterTitle: 'Under a sky full of wishes' },
  frost: { name: 'Frosted forest', encounterTitle: 'Where the silver branches shimmer' }
};
export function locationsFor(catalog, state = {}) {
  const defaults = catalog.locations.map(l => ({
    ...l,
    enabled: true,
    custom: false,
    atmosphere: l.id === 'hallowhoof' ? 'autumn' : 'forest',
    speciesPool:
      l.id === 'hallowhoof'
        ? ['Ghoulsteed', 'Hauntmare', 'Calaverita']
        : catalog.species
            .filter(s => l.id !== 'aetherion' || Object.hasOwn(defaultSpeciesTiers, s.name.toLowerCase()))
            .map(s => s.name),
    palettePool:
      l.id === 'hallowhoof' ? ['Pumpkin', 'Ghoulish', 'Monochrome'] : ['Natural Gold', 'Amethyst', 'Emerald'],
    ...l
  }));
  return [
    ...defaults.map(l => state.customLocations?.find(c => c.id === l.id) || l),
    ...(state.customLocations || []).filter(l => !defaults.some(d => d.id === l.id))
  ]
    .filter(l => !state.deletedLocationIds?.includes(l.id))
    .map(l => ({ ...l, tags: zoneTags(l, catalog) }));
}
export const availableAtmospheres = catalog => catalog?.atmospheres || baseAtmospheres;
export const atmosphereFor = (catalog, id) =>
  availableAtmospheres(catalog).find(a => a.id === id) || baseAtmospheres[0];
export const zoneArtwork = Object.freeze({
  forest: '/assets/wilds.svg',
  autumn: '/assets/zones/amber-woodland.svg',
  moonlit: '/assets/zones/moonlit-grove.svg',
  frost: '/assets/zones/frosted-forest.svg',
  meadow: '/assets/zones/sunlit-meadow.svg',
  coast: '/assets/zones/sapphire-coast.svg',
  desert: '/assets/zones/ember-dunes.svg'
});
export function atmosphereStyle(atmosphere) {
  const artwork = Object.hasOwn(zoneArtwork, atmosphere.id) ? zoneArtwork[atmosphere.id] : zoneArtwork.forest;
  const preset = baseAtmospheres.find(a => a.id === atmosphere.id);
  const tint = /^#[\da-f]{6}$/i.test(atmosphere.tint) ? `--zone-tint:${atmosphere.tint};` : '';
  return `${tint}--zone-art:url('${artwork}');--zone-blend:${preset?.tint.toLowerCase() === atmosphere.tint?.toLowerCase() ? 'normal' : 'luminosity'}`;
}
export const zoneAtmosphere = (zone, catalog) => ({
  ...atmosphereFor(catalog, zone.atmosphere),
  ...zone.appearance
});
export function zoneTags(zone, catalog) {
  return (
    zone.tags ?? [
      zone.custom
        ? zone.subtitle || atmosphereFor(catalog, zone.atmosphere).name
        : zone.id === 'hallowhoof'
          ? 'Halloween realm'
          : 'The evergreen realm',
      'Free exploration'
    ]
  );
}
export function validateZone(input, catalog) {
  if (!input || typeof input !== 'object') throw new Error('Enter your zone details.');
  const text = (key, max, required = true) => {
    if (typeof input[key] !== 'string' || input[key].trim().length > max || (required && !input[key].trim()))
      throw new Error(`${key} must ${required ? 'contain text and ' : ''}be ${max} characters or fewer.`);
    return input[key].trim();
  };
  const name = text('name', 60),
    subtitle = input.subtitle === undefined ? '' : text('subtitle', 100, false),
    description = text('description', 600, false);
  if (!availableAtmospheres(catalog).some(a => a.id === input.atmosphere))
    throw new Error('Choose an available atmosphere.');
  if (typeof input.enabled !== 'boolean') throw new Error('Choose whether the zone is enabled.');
  if (
    input.event !== undefined &&
    input.event !== null &&
    typeof input.event !== 'boolean' &&
    (typeof input.event !== 'string' || !input.event.trim() || input.event.length > 60)
  )
    throw new Error('Choose whether the zone is an Event.');
  const event = input.event === true ? 'Event' : input.event || null;
  let appearance;
  if (input.appearance !== undefined) {
    if (
      !input.appearance ||
      typeof input.appearance !== 'object' ||
      !/^#[\da-f]{6}$/i.test(input.appearance.tint) ||
      typeof input.appearance.encounterTitle !== 'string' ||
      !input.appearance.encounterTitle.trim() ||
      input.appearance.encounterTitle.trim().length > 100
    )
      throw new Error('Zone appearance needs a hex tint and an encounter heading of 1–100 characters.');
    appearance = { tint: input.appearance.tint, encounterTitle: input.appearance.encounterTitle.trim() };
  }
  const tags = input.tags === undefined ? zoneTags(input, catalog) : input.tags;
  if (
    !Array.isArray(tags) ||
    tags.length > 20 ||
    tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 100)
  )
    throw new Error('Use up to 20 tags, each containing 1–100 characters.');
  const pool = (key, available) => {
    if (
      !Array.isArray(input[key]) ||
      !input[key].length ||
      input[key].length > available.length ||
      input[key].some(value => !available.includes(value))
    )
      throw new Error(`Select at least one valid ${key === 'speciesPool' ? 'species' : 'complete palette'}.`);
    return [...new Set(input[key])];
  };
  return {
    name,
    subtitle,
    description,
    tags: [...new Set(tags.map(tag => tag.trim()))],
    atmosphere: input.atmosphere,
    ...(appearance ? { appearance } : {}),
    enabled: input.enabled,
    speciesPool: pool(
      'speciesPool',
      catalog.species.map(s => s.name)
    ),
    palettePool: pool(
      'palettePool',
      catalog.palettes.filter(p => p.complete && !isCosmicPalette(p)).map(p => p.name)
    ),
    custom: true,
    event
  };
}
export function newZoneDraft() {
  return {
    name: '',
    subtitle: '',
    description: '',
    tags: ['The evergreen realm', 'Free exploration'],
    event: false,
    atmosphere: 'forest',
    enabled: true,
    speciesPool: ['Unicorn', 'Peryton', 'Fae'],
    palettePool: ['Natural Gold']
  };
}
export function randomZone(catalog, existing = [], rng = Math.random) {
  const pick = list => list[Math.floor(rng() * list.length)];
  const atmosphere = pick(availableAtmospheres(catalog)).id;
  const settings = {
    forest: {
      prefixes: ['Willow', 'Moss', 'Fern', 'Briar'],
      places: ['Hollow', 'Meadow', 'Glen', 'Vale'],
      detail: 'Soft moss cushions the winding trails, and fireflies linger beneath the ancient canopy.'
    },
    autumn: {
      prefixes: ['Ember', 'Copper', 'Saffron', 'Maple'],
      places: ['Hollow', 'Thicket', 'Wood', 'Crossing'],
      detail: 'Copper leaves drift over forgotten paths while warm lantern light dances between the branches.'
    },
    moonlit: {
      prefixes: ['Moon', 'Star', 'Twilight', 'Dream'],
      places: ['Grove', 'Glade', 'Haven', 'Reach'],
      detail: 'Silver moonlight pools beneath the trees, and the air shimmers with a quiet, starlit magic.'
    },
    frost: {
      prefixes: ['Frost', 'Snow', 'Silver', 'Winter'],
      places: ['Vale', 'Hollow', 'Glen', 'Sanctuary'],
      detail: 'Frost traces every leaf in silver, and gentle hoofprints weave through the glittering snow.'
    }
  }[atmosphere] || {
    prefixes: ['Dream', 'Star', 'Fern', 'Willow'],
    places: ['Hollow', 'Vale', 'Grove'],
    detail: atmosphereFor(catalog, atmosphere).description || 'A quiet, magical place waits beyond the trees.'
  };
  const base = `${pick(settings.prefixes)}${pick(['whisper', 'song', 'bloom', 'veil'])} ${pick(settings.places)}`;
  let name = base,
    suffix = 2;
  while (existing.some(l => l.name.toLowerCase() === name.toLowerCase())) name = `${base} ${suffix++}`;
  const sample = (values, count) => {
    const remaining = [...values],
      chosen = [];
    while (chosen.length < count && remaining.length)
      chosen.push(remaining.splice(Math.floor(rng() * remaining.length), 1)[0]);
    return chosen;
  };
  return {
    name,
    subtitle: pick([
      'A new path. An unexpected companion.',
      'A quiet corner of a magical world.',
      'Follow the hoofprints into wonder.'
    ]),
    description: `${settings.detail} Follow the trail and meet the companions who call this place home.`,
    atmosphere,
    enabled: true,
    event: false,
    tags: [
      atmosphere === 'forest' ? 'The evergreen realm' : atmosphereFor(catalog, atmosphere).name,
      'Free exploration'
    ],
    speciesPool: sample(
      catalog.species.map(s => s.name),
      3 + Math.floor(rng() * 4)
    ),
    palettePool: sample(
      catalog.palettes.filter(p => p.complete && !isCosmicPalette(p)).map(p => p.name),
      2 + Math.floor(rng() * 3)
    )
  };
}
