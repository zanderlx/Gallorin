import { gameSettingsPage } from './game-settings.js';
import { horseCardRank } from './horse-rank.js';
import { escapeHTML as e, number, icon, card, emptyState, heading, groups } from './ui.js';
import { zoneAtmosphere, atmosphereStyle, zoneTags } from './zones.js';

export function wildPage(location, state, locations = [location], catalog) {
  const horses = state.encounters[location.id] || [];
  const atmosphere = location.atmosphere || (location.id === 'hallowhoof' ? 'autumn' : 'forest');
  const atmosphereDefinition = zoneAtmosphere({ ...location, atmosphere }, catalog);
  return `<section class="hero ${['forest', 'autumn', 'moonlit', 'frost'].includes(atmosphere) ? atmosphere : 'atmosphere-custom'}" style="${atmosphereStyle(atmosphereDefinition)}" aria-labelledby="location-title"><div class="hero-content">
  <h1 id="location-title" data-copy-key="hero.title">${e(location.name)}</h1><p data-copy-key="hero.description">${e(location.description)}</p>
  <div class="hero-bottom">${zoneTags(location, catalog)
    .map(tag => `<span>${e(tag)}</span>`)
    .join('<span class="hero-divider" aria-hidden="true"></span>')}</div>
  </div><span class="hero-mark" aria-hidden="true">✧</span></section>
  <section class="encounters" aria-label="Wild horses">
  <div class="horse-grid">${horses.map(h => card(h, state, 'wild', catalog)).join('')}</div>
  ${horses.length === 0 ? emptyState('No current horses in the area', '', null, null, 'leaf') : ''}
  <div class="wilds-search-row"><span class="wilds-search-ornament" aria-hidden="true">${icon('leaf')}<span>✧</span></span><button class="button primary search-button" data-action="search">${icon('refresh')} Search the Wilds</button><span class="wilds-search-ornament mirror" aria-hidden="true">${icon('leaf')}<span>✧</span></span></div>
  </section>`;
}
export function stablePage(kind, state, catalog) {
  const sold = kind === 'sold';
  return `${sold ? heading('', 'Horse management', 'A complete record of the companions you have sold.') : `<div class="page-heading stable-heading"><h1 data-copy-key="page.title">My Horses</h1><button type="button" class="button secondary stable-import" data-action="import-horse" title="Import Horse" aria-label="Import Horse">${icon('download')}</button></div>`}

  <div class="collection-toolbar"><label class="search-field">${icon('search')}<input id="horse-search" type="search" placeholder="Search name, species, or personality…" aria-label="Search horses"></label><label class="sort-field stable-grid-control">Grid Size<span class="stable-grid-slider"><input id="horse-grid-size" type="range" min="3" max="6" step="1" value="5" aria-label="Horses per row" aria-valuetext="5 horses per row"><span class="stable-grid-nodes"><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><output id="horse-grid-value" for="horse-grid-size">5</output></span></span></label><div class="stable-sort-controls"><label class="sort-field">Sort By <select id="horse-sort"><option value="recent">Newest first</option><option value="name">Name</option><option value="species">Species</option><option value="rarity">Rarity</option><option value="favorites">Favorites</option></select></label><button type="button" class="icon-button sort-direction" data-action="sort-direction" data-direction="desc" aria-label="Descending order. Switch to ascending" title="Descending order. Switch to ascending">${icon('arrow')}</button></div></div>
  <div id="collection-grid" class="horse-grid">${collectionCards(kind, state, '', 'recent', catalog)}</div>
  `;
}
export function collectionCards(
  kind,
  state,
  query = '',
  sort = 'recent',
  catalog,
  direction = ['recent', 'rarity', 'favorites'].includes(sort) ? 'desc' : 'asc'
) {
  const favorites = kind === 'favorites' || sort === 'favorites';
  const horses = (kind === 'sold' ? state.sold : state.horses).filter(
    h =>
      (!favorites || h.favorite) &&
      `${h.name} ${h.species} ${h.personality.name}`.toLowerCase().includes(query.toLowerCase())
  );
  const rarityOrder = { cosmic: 0, 'ultra-rare': 1, rare: 2, uncommon: 3, common: 4, none: 5 };
  horses.sort((a, b) =>
    sort === 'rarity'
      ? rarityOrder[horseCardRank(a, catalog).key] - rarityOrder[horseCardRank(b, catalog).key] ||
        String(a.name || a.species).localeCompare(String(b.name || b.species))
      : sort === 'favorites'
        ? Number(!!b.favorite) - Number(!!a.favorite) || (b.caughtAt || '').localeCompare(a.caughtAt || '')
        : sort === 'recent'
          ? (b.soldAt || b.caughtAt).localeCompare(a.soldAt || a.caughtAt)
          : String(sort === 'name' ? a.name || a.species : a[sort]).localeCompare(
              String(sort === 'name' ? b.name || b.species : b[sort])
            )
  );
  const defaultDirection = ['recent', 'rarity', 'favorites'].includes(sort) ? 'desc' : 'asc';
  if (direction !== defaultDirection) horses.reverse();
  if (favorites && !horses.length)
    return `<div class="grid-empty" role="status"><p>${query ? 'No favorite horses match your search.' : 'No favorite horses yet. Use the heart on a horse card to add one.'}</p></div>`;
  return horses.length
    ? horses.map(h => card(h, state, kind === 'sold' ? 'sold' : 'stable', catalog)).join('')
    : `<div class="grid-empty">${emptyState(query ? 'No hoofprints here' : kind === 'sold' ? 'No goodbyes just yet' : kind === 'favorites' ? 'Keep your favorites close' : 'Catch a horse in the wilds to welcome your first companion.', query ? 'Try a different name, species, or personality.' : kind === 'sold' ? 'Sold horses will remain here with their complete profiles.' : kind === 'favorites' ? 'Use the heart on a collected horse to find it here.' : '', 'wilds/aetherion', 'Visit the wilds')}</div>`;
}
export const settingsPage = gameSettingsPage;
export function libraryPage(kind, catalog) {
  const options = {
    species: ['Species & traits', 'Species-specific appearance lists are managed in the Traits section.'],
    colors: [
      'Colors & palettes',
      'Complete palettes are shown below. Incomplete palettes are preserved but excluded from preview encounters.'
    ],
    mutations: [
      'The mutation codex',
      'Definitions are imported from your references. Mutation rolls and effects are not active in Phase 1.'
    ],
    items: [
      'Inventory & items',
      'The supplied example items and themes are preserved for the next development phases.'
    ],
    locations: [
      'Events & locations',
      'Two explorable preview locations. Event scheduling and custom locations follow in later phases.'
    ]
  };
  const [title, description] = options[kind];
  let content = '';
  if (kind === 'species')
    content = `<div class="library-grid">${catalog.species
      .map(
        s =>
          `<article class="panel definition-card"><div class="definition-icon">${icon('spark')}</div><h3>${e(s.name)}</h3><p>${e(s.event ? s.event + ' event' : s.restriction || 'Non-event species')}</p><span class="badge ${s.traitsComplete ? 'green' : ''}">${s.traitsComplete ? 'Trait list available' : 'Traits awaiting data'}</span>${
            s.traitsComplete
              ? `<details><summary>View traits</summary>${Object.entries(s.traits || catalog.traits[s.name] || {})
                  .map(([type, traits]) => `<h4>${e(type)}</h4><p>${traits.map(e).join(' · ')}</p>`)
                  .join('')}</details>`
              : ''
          }</article>`
      )
      .join('')}</div>`;
  if (kind === 'colors')
    content = `<div class="library-grid">${catalog.palettes
      .filter(p => p.name !== 'Template')
      .map(
        p =>
          `<article class="panel definition-card"><span class="eyebrow">${e(p.group)}</span><h3>${e(p.name)}</h3>${
            p.complete
              ? `<div class="palette-preview">${Object.entries(p.colors)
                  .map(
                    ([name, color]) =>
                      `<div><span style="background:${color}"></span><small>${e(name)}</small><code>${color}</code></div>`
                  )
                  .join('')}</div>`
              : '<p>Color definitions needed.</p><span class="badge">Incomplete · excluded</span>'
          }</article>`
      )
      .join('')}</div>`;
  if (kind === 'mutations')
    content = `<div class="library-grid">${catalog.mutations.map(m => `<article class="panel definition-card"><span class="eyebrow">${e(m.type)} ${m.weight === null ? '' : '· ' + m.weight + '%'}</span><h3>${e(m.name)}</h3><p>${e(m.description)}</p></article>`).join('')}</div>`;
  if (kind === 'items')
    content = `<div class="panel"><h2>Reference items</h2><ul class="reference-list">${catalog.items.map(i => `<li>${e(i)} <span class="badge">Example only</span></li>`).join('')}</ul><h2>Theme collection</h2><div class="tag-list">${catalog.themes.map(t => `<span class="badge">${e(t)}</span>`).join('')}</div></div>`;
  if (kind === 'locations')
    content = `<div class="library-grid">${catalog.locations.map(l => `<article class="panel definition-card"><span class="eyebrow">${e(l.event || 'EVERGREEN')}</span><h2>${e(l.name)}</h2><p>${e(l.description)}</p><a href="#wilds/${l.id}" class="button secondary">Explore ${icon('arrow')}</a></article>`).join('')}</div>`;
  return `${heading('REFERENCE LIBRARY', title, description)}<div class="inline-note">${icon('book')} Read-only reference library · Visual editing is scheduled for Phase 4.</div>${content}`;
}
export function savesPage(state) {
  return `${heading('', 'Save management', 'Your horses, gold, encounters, and settings live in readable files on this computer.')}
  <section class="panel"><div class="panel-heading">${icon('book')}<div><h2>A horsekeeper’s chronicle</h2><p>Saved automatically after every successful action.</p></div></div><dl class="save-details"><div><dt>Last saved</dt><dd>${e(new Date(state.savedAt).toLocaleString())}</dd></div><div><dt>Companions / sold</dt><dd>${state.horses.length} / ${state.sold.length}</dd></div><div><dt>Gold balance</dt><dd>${number(state.gold)}</dd></div><div><dt>Player save</dt><dd><code>data/player/save.json</code></dd></div><div><dt>Backups</dt><dd><code>data/backups/</code></dd></div></dl><div class="form-actions">${globalThis.window?.desktopMenu?.openLocalSave ? '<button class="button secondary" data-action="open-local-save">Open Local Save</button>' : ''}<a class="button primary" href="/api/export" download>${icon('download')} Export all data</a><button class="button secondary" data-action="backup">${icon('book')} Create backup</button></div></section>
`;
}
const planned = {
  'town/gacha': [
    'A little luck, a little magic',
    'The gacha machine',
    'The machine is being prepared for Phase 5. Each spin will cost 50 gold and award tack (95%) or a potion (5%).',
    'Your reference rules also specify 60% unthemed tack and 40% themed tack; themed rewards split into 30% event and 70% non-event themes.',
    'town'
  ],
  'town/spirit': [
    'AT THE EDGE OF THE SEEN',
    'Spirit tame',
    'A place for companions with a little more mystery.',
    'This activity needs its taming and reward rules before it can be implemented.',
    'spark'
  ],
  'town/plush': [
    'A SOFTER SORT OF MAGIC',
    'The plush machine',
    'A future home for the Plush species.',
    'Acquisition costs, rewards, and probabilities have not been provided yet.',
    'heart'
  ],
  'town/cave': [
    'BENEATH THE ANCIENT STONE',
    'The ancient cave',
    'The source notes reserve Kirin for the egg cave.',
    'Exploration, egg acquisition, and hatching rules are still needed.',
    'compass'
  ],
  'town/digsite': [
    'STORIES BURIED IN THE EARTH',
    'The digsite',
    'Someday, a Saurequine might emerge from these ancient grounds.',
    'Digging costs, rewards, and discovery rules are still needed.',
    'compass'
  ],
  'stable/breeding': [
    'A NEW CHAPTER',
    'The breeding stable',
    'A space for the next generation of companions.',
    'Cross-species breeding and a 50/50 species inheritance are confirmed. Color mixing, trait inheritance, mutation inheritance, eligibility, and costs need your rules in Phase 6.',
    'heart'
  ]
};
export function plannedPage(route, state) {
  if (route.startsWith('inventory/'))
    return `${heading('YOUR TRAVELING SATCHEL', route.endsWith('potions') ? 'Potions & possibilities' : 'The finishing touches', 'A place for all the little things that make a companion your own.')}${emptyState('Your satchel is waiting', 'Inventory and item use arrive in Phase 5, along with the gacha machine. No items have been awarded yet.', 'dev/items', 'Browse item definitions', 'bag')}`;
  const p = planned[route];
  if (!p)
    return `${heading('A PATH LESS TRAVELED', 'This trail is not on the map', 'Choose a destination from your navigation.')}<a href="#wilds/aetherion" class="button primary">Return to the wilds</a>`;
  const [kicker, title, description, detail, symbol] = p;
  return `${heading(kicker.toUpperCase(), title, description)}<section class="coming-soon"><div class="coming-illustration">${icon(symbol)}<span>✧</span></div><span class="badge">A FUTURE CHAPTER</span><h2>Good things take a little growing.</h2><p>${detail}</p><a class="button secondary" href="#wilds/aetherion">Back to the wilds ${icon('arrow')}</a></section>`;
}
export const routeTitle = (route, locations = []) =>
  locations.find(l => route === `wilds/${l.id}`)?.name ||
  groups.flatMap(g => g.items).find(([path]) => path === route)?.[1] ||
  'Gallorin';

export function editModePage(state) {
  return `${heading('', 'Edit Mode', 'Manage website wording from one dedicated place.')}
  <section class="panel" data-copy-ui><h2>Page Text Editing</h2><p>Current status: <strong>${state.settings.developerEditMode ? 'Enabled' : 'Disabled'}</strong>. Enable editing, then visit any page and use its pencils to change headings, section text, sidebar labels, or footer wording.</p><p>Save one section immediately, or preview several edits and use Save Page. Restore defaults and discard controls are available in the editing toolbar. All saved wording is included in backups and exports.</p><button class="button primary" data-action="toggle-copy-mode" aria-pressed="${Boolean(state.settings.developerEditMode)}">${state.settings.developerEditMode ? 'Disable' : 'Enable'} Edit Mode</button></section>`;
}
