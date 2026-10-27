export const defaultMusicTrack = {
  id: 'menu',
  name: 'Glades of Gallorin',
  artist: 'Gallorin Studios',
  filename: 'main-menu.mp3',
  durationSeconds: 178.104
};
export function formatMusicName(filename) {
  return String(filename || 'Untitled')
    .replace(/\.mp3$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, c => c.toUpperCase());
}
const sectionDefinitions = [
  [
    'Stables',
    'stable',
    [
      ['stable/all', 'My Horses'],
      ['stable/breeding', 'Breeding']
    ]
  ],
  [
    'Town',
    'town',
    [
      ['town/cave', 'Ancient Cave'],
      ['town/digsite', 'Digsite'],
      ['town/gacha', 'Gacha Machine'],
      ['town/plush', 'Plush Machine'],
      ['town/spirit', 'Spirit Tame']
    ]
  ],
  [
    'Inventory',
    'inventory',
    [
      ['inventory/accessories', 'Accessories'],
      ['inventory/potions', 'Potions']
    ]
  ],
  [
    'Compendium',
    'compendium',
    [
      ['dev/species', 'Species'],
      ['dev/traits', 'Traits'],
      ['dev/colors', 'Palettes'],
      ['dev/eyes', 'Eye Colors'],
      ['dev/personalities', 'Personalities'],
      ['dev/mutations', 'Mutations'],
      ['dev/rarities', 'Rarities'],
      ['dev/locations', 'Zones'],
      ['dev/atmospheres', 'Zone Atmospheres'],
      ['dev/items', 'Items & Potions'],
      ['dev/themes', 'Item Themes']
    ]
  ],
  [
    'User Interface',
    'user-interface',
    [
      ['dev/appearance', 'Appearance & Themes'],
      ['dev/music', 'Music'],
      ['dev/saves', 'Save Management']
    ]
  ],
  [
    'Developer Settings',
    'developer',
    [
      ['dev/edit-mode', 'Edit Mode'],
      ['dev/settings', 'Game Settings'],
      ['dev/horse-updates', 'Horse Updates'],
      ['dev/roadmap', 'Remaining Features']
    ]
  ]
];
export function musicGroups(locations = [], { includeSettings = false } = {}) {
  const groups = sectionDefinitions
    .filter(([, id]) => includeSettings || !['user-interface', 'developer'].includes(id))
    .map(([name, id, items]) => ({
      name,
      id,
      items: [{ id, name: 'All ' + name }, ...items.map(([id, name]) => ({ id, name }))]
    }));
  groups.splice(3, 0, {
    name: 'Wilds',
    id: 'wilds',
    items: [{ id: 'wilds', name: 'All Wilds' }, ...locations.map(z => ({ id: 'wilds/' + z.id, name: z.name }))]
  });
  return [
    {
      name: 'General',
      id: 'general',
      items: [
        { id: 'default', name: 'Default' },
        { id: 'main-menu', name: 'Main Menu' }
      ]
    },
    ...groups
  ];
}
// Accept legacy settings assignments when saving other playlists, without
// exposing those destinations in the music page or assignment picker.
export const musicContexts = locations => musicGroups(locations, { includeSettings: true }).flatMap(g => g.items);
export function musicParent(context) {
  if (context.startsWith('wilds/')) return 'wilds';
  for (const [, id, items] of sectionDefinitions) if (items.some(([route]) => route === context)) return id;
  return null;
}
export function assignmentTracks(value) {
  return Array.isArray(value) ? value : typeof value === 'string' && value ? [value] : [];
}
// Display only assignments; fallback playback does not insert rows into playlists.
export function playlistSongs(library, context) {
  const ids = assignmentTracks(library.assignments?.[context]);
  if (context === 'default') return Object.hasOwn(library.assignments || {}, context) ? ids : ['menu'];
  return ids;
}
export function playlistSource(library, context) {
  if (playlistSongs(library, context).length) return context;
  const parent = musicParent(context);
  return parent && playlistSongs(library, parent).length ? parent : 'default';
}
export function normalizePlaylistSelections(ids, contexts = []) {
  const selected = new Set(ids),
    sections = new Map();
  for (const context of contexts) {
    const parent = musicParent(context);
    if (!parent || !contexts.includes(parent)) continue;
    if (!sections.has(parent)) sections.set(parent, []);
    sections.get(parent).push(context);
  }
  for (const [parent, children] of sections)
    if (children.length && children.every(id => selected.has(id))) selected.add(parent);
  return [...selected].filter(id => !selected.has(musicParent(id)));
}
export function selectedPlaylist(library, context) {
  const parent = musicParent(context),
    own = [...new Set([...(parent ? playlistSongs(library, parent) : []), ...playlistSongs(library, context)])];
  if (own.length) return own;
  const fallback = playlistSongs(library, 'default');
  return fallback.length ? fallback : ['menu'];
}
export function selectedMusic(library, context) {
  return selectedPlaylist(library, context)[0];
}
export function musicContext(route, library = { assignments: {} }) {
  if (/^(wilds|stable|town|inventory)\//.test(route)) return route;
  if (route.startsWith('dev/')) {
    const parent = musicParent(route);
    if (['user-interface', 'developer'].includes(parent)) return null;
    return Object.hasOwn(library.assignments || {}, route) || Object.hasOwn(library.assignments || {}, parent)
      ? route
      : null;
  }
  return null;
}

export function formatMusicDuration(value) {
  if (!Number.isFinite(value) || value < 0) return '—';
  const seconds = Math.floor(value);
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

export function musicTracks(library) {
  const metadata = library.builtinMetadata || {};
  return [
    {
      ...defaultMusicTrack,
      name: metadata.name ?? defaultMusicTrack.name,
      artist: metadata.artist ?? defaultMusicTrack.artist
    },
    ...library.tracks.map(track => ({ ...track, artist: track.artist ?? 'Gallorin Studios' }))
  ];
}
