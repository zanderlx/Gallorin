import { traitsEditorPage } from '../public/traits-editor.js';
import { raritiesManagerPage } from '../public/rarities-manager.js';
import { defaultRaritySettings } from '../public/rarity-settings.js';

import { horseTraits } from '../public/horse-traits.js';

test('Horse traits separate essentials from all thirteen optional traits', () => {
  const horse = {
    eye: { name: 'Amber', colors: ['#112233'] },
    traits: {
      Mane: ['Long'],
      Tail: ['Flowing'],
      Pattern: ['A', 'B', 'C', 'D'],
      Paint: ['E', 'F'],
      Cosmetic: ['G', 'H', 'I', 'J'],
      Keratin: ['K'],
      Ears: ['L'],
      Whiskers: ['M']
    }
  };
  const html = horseTraits(horse);
  assert.match(html, /horse-trait-essentials/);
  assert.equal((html.match(/class="horse-trait-group"/g) || []).length, 6);
  assert.match(html, />4\/4</);
  assert.match(html, />2\/2</);
  assert.equal((html.match(/class="horse-trait-tag"/g) || []).length, 15);
  assert.match(html, /horse-eye-swatch/);
});
import {
  eyesManagerPage,
  filterEyes,
  eyeResults,
  eyeIndividualChance,
  randomEyeDraft
} from '../public/eyes-manager.js';

test('individual eye percentages use all colors in the rarity', () => {
  const eyes = [{ rarity: 'Common' }, { rarity: 'Common' }, { rarity: 'Rare' }];
  assert.equal(eyeIndividualChance(eyes[0], eyes), ' · 30%');
  assert.equal(eyeIndividualChance(eyes[2], eyes), ' · 5%');
  assert.equal(eyeIndividualChance({ rarity: 'Custom' }, eyes), '');
});
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEncounters } from '../src/encounters.js';
import {
  wildPage,
  stablePage,
  collectionCards,
  settingsPage,
  editModePage,
  savesPage,
  plannedPage
} from '../public/pages.js';
import { profileContent } from '../public/profile.js';
import { groups, sidebar, navigationSection } from '../public/ui.js';
import { locationsFor, newZoneDraft, randomZone, validateZone } from '../public/zones.js';
import { zoneEditorPage } from '../public/zone-editor.js';
import { normalizeCatalog, definitionKinds } from '../public/definitions.js';
import { libraryEditorPage, editorRoutes } from '../public/library-editor.js';
import { keeperPage, avatarSVG } from '../public/keeper.js';
import { roadmapPage } from '../public/roadmap.js';
import { card } from '../public/ui.js';
import { saleHistory } from '../public/economy.js';

const catalog = normalizeCatalog(
  JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
);
const settings = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
const horses = createEncounters(catalog, 'aetherion', 3, 0, undefined, () => 0.5);
const state = {
  settings,
  horses: [],
  sold: [],
  gold: 0,
  encounters: { aetherion: horses },
  transactions: [],
  savedAt: new Date().toISOString()
};
test('zone tags render as safe text without icons and can be removed', () => {
  const location = {
    ...catalog.locations[0],
    tags: ['The evergreen realm', 'Free exploration', '<script>Quiet</script>']
  };
  const html = wildPage(location, state);
  const tags = html.match(/<div class="hero-bottom">(.*?)<\/div>/s)[1];
  assert.match(tags, /The evergreen realm/);
  assert.match(tags, /Free exploration/);
  assert.match(tags, /&lt;script&gt;Quiet&lt;\/script&gt;/);
  assert.doesNotMatch(tags, /<svg|<script/);
  assert.match(wildPage({ ...location, tags: [] }, state), /<div class="hero-bottom"><\/div>/);
  const editor = zoneEditorPage(catalog, state);
  assert.match(editor, /name="tags"/);
  assert.doesNotMatch(editor, /ORIGINAL REALM|YOUR CREATION|YOUR NEXT ADVENTURE|Randomize fills in a draft/);
  assert.doesNotMatch(editor, /name="subtitle"|Short tagline|Open for exploration/);
  assert.doesNotMatch(editor, /name="event"/);
  assert.match(editor, /<span>Show this zone in the Wilds navigation\.<\/span>/);
  assert.match(editor, /class="icon-button zone-delete" data-action="delete-zone"[^>]*aria-label="Delete /);
  assert.match(editor, />My Zones<\/h1>/);
  assert.ok(editor.indexOf('zone-collection') < editor.indexOf('id="zone-form"'));
  assert.doesNotMatch(
    editor,
    /THE KEEPER’S WORLDBUILDER|Make room for a little wonder|Places to get a little lost|Let curiosity lead/
  );
  assert.equal((editor.match(/class="panel zone-card"/g) || []).length, locationsFor(catalog, state).length);
  assert.match(editor, /The evergreen realm\nFree exploration/);
});
test('Wilds pages begin with the zone banner without duplicate zone tabs', () => {
  const zone = { ...newZoneDraft(), id: 'dreamwhisper', name: 'Dreamwhisper Haven', custom: true, event: 'Event' };
  const populated = { ...state, customLocations: [zone] };
  const locations = locationsFor(catalog, populated);
  const page = wildPage(locations[0], populated, locations, catalog);
  assert.match(page, /^<section class="hero /);
  assert.doesNotMatch(page, /location-tabs|href="#wilds\/dreamwhisper"/);
  assert.doesNotMatch(page, /zone-event-label/);
});
test('wild horses have no export control; owned profiles export without release', () => {
  assert.doesNotMatch(profileContent(horses[0], state), /data-action="delete-horse"/);
  const owned = profileContent(horses[0], { ...state, horses: [horses[0]] });
  assert.match(owned, /data-action="export-horse"/);
  assert.doesNotMatch(owned, /Release Horse|data-action="delete-horse"/);
  assert.doesNotMatch(owned, /Delete Horse/);
  assert.match(owned, /data-action="rename-horse"/);
  assert.match(owned, /horse-notes-form/);
  assert.doesNotMatch(owned, /horse-description-form/);
  assert.match(owned, /class="horse-text-display"[^>]*data-form="horse-notes-form"/);
  assert.match(owned, /<form hidden id="horse-notes-form"/);
  const notesForm = owned.match(/<form hidden id="horse-notes-form"[\s\S]*?<\/form>/)[0];
  assert.doesNotMatch(notesForm, /<button|Save Notes|Cancel Changes/);
  assert.doesNotMatch(owned, />Description<\/h3>/);
  assert.match(profileContent(horses[0], state), /horse-wild-description/);
  assert.doesNotMatch(owned, />Personality Description<\/h3>/);
  assert.ok(owned.indexOf('horse-notes-form') < owned.indexOf('profile-lower'));
  assert.ok(owned.indexOf('trait.eye-color') < owned.indexOf('trait.' + 'text-'));
  assert.doesNotMatch(owned, /personality-note|Horse notes|Horse ID/);
  assert.doesNotMatch(profileContent(horses[0], state), /horse-notes-form|data-action="sell"/);
  assert.match(owned, /data-action="sell"/);
  assert.doesNotMatch(owned, /rename-form|Give your companion a name/);
  assert.doesNotMatch(profileContent(horses[0], state), /data-action="rename-horse"/);
});
test('horse fields have individual edit controls only in edit mode and notes are escaped', () => {
  const horse = { ...horses[0], caughtAt: new Date().toISOString(), notes: '</textarea><script>bad</script>' };
  const html = profileContent(horse, { ...state, horses: [horse], settings: { ...settings, developerEditMode: true } });
  for (const field of ['origin', 'size', 'birthday', 'personality', 'eye', 'gender'])
    assert.ok(html.includes(`data-field="${field}"`));
  assert.doesNotMatch(profileContent(horse, state), /data-action="edit-horse-field"/);
  assert.doesNotMatch(html, /data-copy-key="horse.subtitle"|data-field="species"|data-field="age"/);
  assert.match(html, /&lt;\/textarea&gt;&lt;script&gt;/);
});
test('horse previews and details expose edit targets and the simplified nine-color layout', () => {
  const horse = {
    ...horses[0],
    birthday: '2010-01-01',
    caughtAt: new Date(2020, 1, 29, 12).toISOString(),
    palette: { ...horses[0].palette, name: 'HiddenPaletteName' }
  };
  const html = profileContent(horse, state);
  assert.match(html, /id="profile-title"/);
  assert.match(html, /02-29-2020/);
  assert.doesNotMatch(html, /HiddenPaletteName|>Return |IN YOUR CARE|A WILD ACQUAINTANCE/);
  assert.ok(html.indexOf('Eye Color') > html.indexOf('<h3>Traits</h3>'));
  assert.doesNotMatch(html, /profile-id-footer|Horse ID/);
  const preview = card(horse, state, 'stable');
  assert.equal((preview.match(/--swatch:/g) || []).length, 0);
  assert.doesNotMatch(preview, /horse-meta|palette-line|card-actions|View horse|data-action="catch"/);
  assert.doesNotMatch(preview, /HiddenPaletteName|A NEW ACQUAINTANCE|In your care/);
  const wild = wildPage(catalog.locations[0], state);
  assert.doesNotMatch(wild, /encounters.count|A CHANCE ENCOUNTER|wandered into the clearing/);
  assert.doesNotMatch(
    wild,
    /field-note|stable-shortcut|encounter-title|encounters.title|Foundation preview|Curated sample encounters/
  );
  assert.ok(wild.indexOf('wilds-search-row') > wild.indexOf('horse-grid'));
  assert.match(wild, /Search the Wilds/);
  assert.equal((wild.match(/class="wilds-search-ornament[^"]*" aria-hidden="true"/g) || []).length, 2);
});
test('every navigation destination renders content without undefined values', () => {
  for (const [route] of groups.flatMap(group => group.items)) {
    const [section, page] = route.split('/');
    const html =
      section === 'wilds'
        ? wildPage(
            catalog.locations.find(l => l.id === page),
            state
          )
        : route === 'stable/breeding'
          ? plannedPage(route, state)
          : section === 'stable'
            ? stablePage(page, state)
            : ['dev/settings', 'dev/economy'].includes(route)
              ? settingsPage(state)
              : route === 'dev/saves'
                ? savesPage(state)
                : route === 'dev/edit-mode'
                  ? editModePage(state)
                  : route === 'dev/profile'
                    ? keeperPage(state)
                    : route === 'dev/roadmap'
                      ? roadmapPage()
                      : route === 'dev/locations'
                        ? zoneEditorPage(catalog, state)
                        : section === 'dev' && Object.hasOwn(editorRoutes, page)
                          ? libraryEditorPage(editorRoutes[page], catalog, state)
                          : plannedPage(route, state);
    assert.match(html, /<h1/, route);
    assert.doesNotMatch(html, /undefined|NaN/, route);
  }
});
test('navigation groups have alphabetized links and profile content safely renders user text', () => {
  assert.deepEqual(
    groups.find(g => g.title === 'Stables').items.map(item => item[1]),
    ['My Horses', 'Breeding']
  );
  assert.equal(
    groups.some(g => g.title === 'Breeding'),
    false
  );
  for (const group of groups.filter(g => g.title !== 'Stables'))
    assert.deepEqual(
      group.items.map(item => item[1]),
      group.items.map(item => item[1]).sort((a, b) => a.localeCompare(b))
    );
  const html = keeperPage({
    ...state,
    keeper: { name: '<Keeper>', about: '</textarea><script>bad</script>', avatarSeed: 27 }
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;Keeper&gt;/);
  assert.doesNotMatch(html, /generate-avatar|Generate Avatar/);
  assert.match(html, /Rose avatar/);
  assert.notEqual(avatarSVG(11), avatarSVG(27));
  assert.equal(avatarSVG(11), avatarSVG(11));
});
test('editor guidance is page-specific and the logo inherits theme colors', () => {
  const appearance = libraryEditorPage('siteThemes', catalog, state);
  assert.doesNotMatch(appearance, /Existing horses keep|Horse coat colors/);
  assert.match(appearance, /apply it throughout the website/);
  const atmosphere = libraryEditorPage('atmospheres', catalog, state);
  assert.match(atmosphere, /zone editor to apply/);
  const nav = sidebar('dev/appearance', state, new Set(), catalog);
  assert.match(nav, /class="brand-logo"/);
  assert.match(nav, /fill="var\(--gold,#D2B477\)"/);
  assert.match(nav, /fill="var\(--panel-deep,#211D1A\)"/);
});
test('Game Settings contains gameplay and a separate Economy section without guide cards', () => {
  const game = settingsPage(state);
  for (const field of ['gold', 'sellingPrice', 'horsesPerSearch', 'stableCapacity', 'ignoreStableLimit'])
    assert.ok(game.includes(`name="${field}"`));
  assert.match(game, />Encounter &amp; Stable Settings<\/h1>|>Encounter & Stable Settings<\/h1>/);
  assert.doesNotMatch(game, /Gold & Selling Price|class="panel-heading"/);
  assert.match(game, /Sale History<\/h2><div class="panel">/);
  assert.match(game, /id="economy-heading"/);
  assert.match(game, /id="economy-form"/);
  assert.doesNotMatch(game, /name="startingGold"|id="gold-form"|Starting Gold applies/);
  const economyForm = game.match(/<form id="economy-form"[\s\S]*?<\/form>/)[0];
  assert.match(economyForm, /name="gold"/);
  assert.match(economyForm, /name="sellingPrice"/);
  assert.match(game, /Sale History/);
  assert.match(game, /No horses sold yet/);
  assert.ok(game.indexOf('economy-settings') > game.indexOf('id="settings-form"'));
  assert.doesNotMatch(
    game,
    /THE KEEPER’S WORKBENCH|Website appearance & pastel themes|Manage Your Economy|Make Room For Companions/
  );
  assert.ok(!groups.flatMap(g => g.items).some(([path]) => path === 'dev/economy'));
  const saves = savesPage(state);
  assert.doesNotMatch(saves, /Transaction history|Keep the whole story|KEEP YOUR WORLD SAFE/);
  assert.match(saves, /Create backup/);
  assert.match(saves, /Export all data/);
});
test('edit mode has one dedicated page and economy exposes the actual gold balance', () => {
  assert.doesNotMatch(settingsPage(state), /toggle-copy-mode/);
  assert.doesNotMatch(settingsPage(state, true), /toggle-copy-mode/);
  assert.match(editModePage(state), /data-action="toggle-copy-mode"/);
  assert.match(settingsPage({ ...state, gold: 12345 }, true), /name="gold"[^>]+value="12345"/);
});
test('wild view has three inspectable illustrations without preview captions', () => {
  const html = wildPage(catalog.locations[0], state);
  assert.equal((html.match(/class="horse-card"/g) || []).length, 3);
  assert.doesNotMatch(html, /not final spawn odds/);
  assert.doesNotMatch(html, /ILLUSTRATIVE PLACEHOLDER/);
  assert.equal((html.match(/class="horse-card-open"/g) || []).length, 3);
});

test('simplified horse previews place gender before name and keep taming in the profile', () => {
  for (const gender of ['Male', 'Female']) {
    const horse = { ...horses[0], name: 'Willow', gender };
    const preview = card(horse, state, 'wild');
    assert.match(preview, new RegExp(`gender-${gender.toLowerCase()}`));
    assert.ok(preview.indexOf('class="gender ') < preview.indexOf('<h3>'));
    assert.doesNotMatch(preview, /horse-meta|palette-line|card-actions|art-caption|eyebrow/);
    assert.match(profileContent(horse, state), /data-action="catch"[^>]*>.* Tame<\/button>/);
  }
});
test('horse profile escapes names and preserves source traits and all nine color regions', () => {
  const horse = { ...horses[0], name: '<img src=x onerror=alert(1)>', caughtAt: new Date().toISOString() };
  const html = profileContent(horse, { ...state, horses: [horse] });
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /Mane/);
  assert.match(html, /Tail/);
  assert.match(html, /Eye Color/);
  for (const values of Object.values(horse.traits)) for (const value of values) assert.ok(html.includes(value));
  for (const region of Object.keys(horse.palette.colors)) assert.ok(html.includes(region));
});
test('collection search, sorting and favorites work with complete saved records', () => {
  const collected = horses.map((h, i) => ({
    ...h,
    name: ['Willow', 'Ash', 'Moss'][i],
    favorite: i === 1,
    caughtAt: new Date().toISOString()
  }));
  const populated = { ...state, horses: collected };
  const filtered = collectionCards('all', populated, 'willow');
  assert.match(filtered, /Willow/);
  assert.doesNotMatch(filtered, /<h3><button[^>]*>Ash</);
  const favorites = collectionCards('favorites', populated);
  assert.equal((favorites.match(/class="horse-card"/g) || []).length, 1);
  const favoriteSorted = collectionCards('all', populated, '', 'favorites');
  assert.equal((favoriteSorted.match(/class="horse-card"/g) || []).length, 1);
  assert.match(favoriteSorted, />Ash</);
  assert.doesNotMatch(favoriteSorted, />Willow<|>Moss</);
  const none = collectionCards(
    'all',
    { ...populated, horses: collected.map(h => ({ ...h, favorite: false })) },
    '',
    'favorites'
  );
  assert.doesNotMatch(none, /class="horse-card"/);
  assert.match(none, /No favorite horses yet/);
  assert.match(collectionCards('all', populated, 'Willow', 'favorites'), /No favorite horses match your search/);
  assert.match(card(collected[1], populated, 'stable'), /aria-pressed="true"/);
  assert.doesNotMatch(profileContent(collected[1], populated), /data-action="favorite"/);
  const page = stablePage('all', populated);
  assert.match(page, />My Horses<\/h1>/);
  assert.match(page, /data-action="import-horse"/);
  assert.ok(page.indexOf('data-action="import-horse"') < page.indexOf('collection-toolbar'));
  assert.match(page, /id="horse-grid-size"/);
  assert.match(page, /type="range" min="3" max="6" step="1" value="5"/);
  assert.match(page, /title="Import Horse" aria-label="Import Horse">\s*<svg/);
  assert.match(page, /<option value="favorites">Favorites<\/option>/);
  assert.doesNotMatch(
    page,
    /A place to call home|A growing collection|Explore the wilds|YOUR SANCTUARY|value="birthday"/
  );
  assert.doesNotMatch(card(collected[0], populated), /picture-badge|Preview encounter/);
  const sorted = collectionCards('all', populated, '', 'name');
  assert.ok(sorted.indexOf('>Ash<') < sorted.indexOf('>Willow<'));
  const descending = collectionCards('all', populated, '', 'name', undefined, 'desc');
  assert.ok(descending.indexOf('>Willow<') < descending.indexOf('>Ash<'));
  assert.match(page, /Sort By/);
  assert.match(page, /data-action="sort-direction" data-direction="desc"/);
});
test('breadcrumb sections match sidebar group names and icons for every route', () => {
  for (const group of groups)
    for (const [route] of group.items) {
      assert.equal(navigationSection(route).title, group.title);
      assert.equal(navigationSection(route).icon, group.icon);
    }
  assert.equal(navigationSection('wilds/my-custom-zone').title, 'Wilds');
  assert.equal(navigationSection('wilds/my-custom-zone').icon, 'compass');
});

test('sale history merges old archives with transactions without double-counting or balance edits', () => {
  const populated = {
    ...state,
    sold: [
      { id: 'one', name: '<img src=x>', species: 'Unicorn', soldFor: 100, soldAt: '2026-01-01T00:00:00Z' },
      { id: 'legacy', name: 'Legacy', species: 'Ghoulsteed', soldFor: 50, soldAt: '2025-01-01T00:00:00Z' }
    ],
    transactions: [
      { type: 'Horse sold', horseId: 'one', amount: 100, at: '2026-01-01T00:00:00Z' },
      {
        type: 'Horse sold',
        horseId: 'removed',
        horseName: 'Remembered',
        species: 'Fae',
        amount: 250,
        at: '2026-02-01T00:00:00Z'
      },
      { type: 'Gold adjustment', amount: 999999, at: '2026-03-01T00:00:00Z' }
    ]
  };
  const rows = saleHistory(populated);
  assert.deepEqual(
    rows.map(r => r.name),
    ['Remembered', '<img src=x>', 'Legacy']
  );
  assert.deepEqual(
    rows.map(r => r.amount),
    [250, 100, 50]
  );
  const page = settingsPage(populated, true);
  assert.match(page, /&lt;img src=x&gt;/);
  assert.doesNotMatch(page, /<img src=x>/);
});
test('active sidebar destination is exposed to assistive technology', () => {
  const html = sidebar('wilds/aetherion', state, new Set(['Wilds']));
  assert.match(html, /href="#wilds\/aetherion" aria-current="page"/);
  assert.match(html, /<details data-group="Wilds" open>/);
  assert.doesNotMatch(html, /nav-section-link|event-dot/);
});
test('custom zones appear in navigation and wild pages with safe text; disabled zones stay hidden', () => {
  const zone = {
    ...newZoneDraft(),
    id: 'zone-test',
    name: '<script>magic</script>',
    description: 'Moon & stars',
    custom: true,
    atmosphere: 'moonlit'
  };
  const populated = {
    ...state,
    customLocations: [zone, { ...zone, id: 'zone-hidden', name: 'Hidden', enabled: false }]
  };
  const locations = locationsFor(catalog, populated);
  const nav = sidebar('wilds/zone-test', populated, new Set(['Wilds']), catalog);
  assert.match(nav, /<details data-group="Wilds" open>/);
  assert.match(nav, /href="#wilds\/zone-test" aria-current="page"/);
  assert.doesNotMatch(nav, /#wilds\/zone-hidden|<script>/);
  const html = wildPage(zone, populated, locations);
  assert.match(html, /hero moonlit/);
  assert.match(html, /&lt;script&gt;magic&lt;\/script&gt;/);
  assert.doesNotMatch(html, /#wilds\/zone-hidden/);
  const editor = zoneEditorPage(catalog, populated, zone);
  assert.match(editor, /Generate random zone/);
  assert.match(editor, /name="speciesPool"/);
  assert.doesNotMatch(editor, /<script>/);
});
test('random zone drafts are valid, varied, editable data and avoid duplicate names', () => {
  const existing = locationsFor(catalog);
  const names = new Set();
  for (let i = 0; i < 100; i++) {
    const zone = randomZone(catalog, existing);
    assert.doesNotThrow(() => validateZone(zone, catalog));
    assert.equal(new Set(zone.speciesPool).size, zone.speciesPool.length);
    assert.equal(new Set(zone.palettePool).size, zone.palettePool.length);
    names.add(zone.name);
    existing.push(zone);
  }
  assert.equal(names.size, 100);
  const same = randomZone(catalog, [], () => 0);
  assert.notEqual(randomZone(catalog, [same], () => 0).name, same.name);
});
test('Horse Definitions dashboard exposes five managers and the spawning configuration fields', () => {
  for (const kind of ['species', 'palettes', 'eyes', 'mutations', 'personalities']) {
    const html = libraryEditorPage(kind, catalog, state);
    assert.doesNotMatch(html, />Horse Definitions<\/h1>/);
    assert.doesNotMatch(html, /definitions-sidebar|definitions-dashboard/);
    if (!['personalities', 'mutations'].includes(kind)) assert.match(html, /name="systemId"/);
  }
  const species = libraryEditorPage('species', catalog, state);
  assert.match(species, /name="rarityTier"/);
  assert.match(species, />Ultra Rare<\/option>/);
  assert.match(species, /<option value="0"[^>]*>Cosmic<\/option>/);
  assert.match(species, />Description<textarea/);
  assert.doesNotMatch(species, /Base Attributes|>System ID|Description & notes|1: Ultra Rare/);
  assert.doesNotMatch(species, /name="speciesZones"/);
  assert.match(species, /data-action="species-tab"/);
  const palettes = libraryEditorPage('palettes', catalog, state);
  assert.match(palettes, /name="assetSkins"/);
  assert.match(palettes, /name="speciesIds"/);
  const eyes = libraryEditorPage('eyes', catalog, state);
  assert.match(eyes, /name="textureId"/);
  assert.match(eyes, /name="layers"/);
  const mutations = libraryEditorPage('mutations', catalog, state);
  assert.doesNotMatch(mutations, /name="ALLOW_DUPLICATE_MUTATIONS"/);
  assert.match(settingsPage(state, catalog), /name="ALLOW_DUPLICATE_MUTATIONS"/);
  assert.match(mutations, /name="thresholds"/);

  assert.match(libraryEditorPage('personalities', catalog, state, catalog.personalities[0]), /name="behaviorTags"/);
});
test('all existing definitions and blank editor forms render without missing values', () => {
  for (const kind of Object.keys(definitionKinds)) {
    for (const draft of [undefined, ...catalog[kind]]) {
      const html = libraryEditorPage(kind, catalog, state, draft);
      if (kind === 'personalities' && !draft) assert.doesNotMatch(html, /id="definition-form"/);
      else assert.match(html, /id="definition-form"/);
      assert.doesNotMatch(html, /undefined|NaN/, `${kind}: ${draft?.name || 'new'}`);
    }
  }
});

test('Eye Color Manager lists cards with colors and modal edit actions', () => {
  const html = eyesManagerPage(catalog);
  assert.match(html, /Create Eye Color/);
  assert.equal(
    (html.match(/<button type="button" class="panel eye-definition-card"/g) || []).length,
    catalog.eyes.length
  );
  for (const eye of catalog.eyes) {
    assert.ok(html.includes(eye.name));
    assert.ok(html.includes(eye.rarity));
    assert.ok(html.includes(`data-id="${eye.id}"`));
    for (const color of eye.colors) assert.ok(html.includes(color));
  }
  assert.doesNotMatch(html, /library-workbench/);
});

test('Traits editor embeds within the Species manager', () => {
  const html = traitsEditorPage(catalog);
  assert.match(html, /<h1>Traits<\/h1>/);
  assert.match(html, /id="traits-species"/);
  assert.match(html, /id="traits-form"/);
  const manager = libraryEditorPage('species', catalog, state);
  assert.match(manager, /data-tab="traits"/);
  assert.match(manager, /data-tab="zones"/);
  assert.doesNotMatch(sidebar('dev/species', state, new Set(), catalog), /href="#dev\/traits"/);
});

test('Eye card search combines name hex and rarity with alphabetical sorting', () => {
  const eyes = [
    { name: 'Zinc', rarity: 'Rare', colors: ['#AABBCC'] },
    { name: 'Amber', rarity: 'Common', colors: ['#112233'] }
  ];
  assert.equal(filterEyes(eyes)[0].name, 'Amber');
  assert.equal(filterEyes(eyes, '', '', 'za')[0].name, 'Zinc');
  assert.equal(filterEyes(eyes, '', '', 'name', 'desc')[0].name, 'Zinc');
  assert.equal(filterEyes(eyes, 'zinc aabb', 'Rare').length, 1);
  assert.equal(filterEyes(eyes, 'zinc', 'Common').length, 0);
  assert.equal(filterEyes(eyes, 'missing').length, 0);
});

test('sidebar footer shows the supplied release version without old preview wording', () => {
  const html = sidebar('stable/all', state, new Set(), catalog, '1.5.0');
  assert.match(html, /Gallorin v1\.5\.0/);
  assert.match(html, /id="sidebar-changelog"/);
  assert.doesNotMatch(html, /A sanctuary of your own|Local files · Phase 1 preview/);
});

test('Eye rarity sorting groups Common then Uncommon then Rare', () => {
  const eyes = ['Rare', 'Common', 'Uncommon'].map(rarity => ({
    id: rarity,
    name: rarity,
    rarity,
    colors: ['#112233']
  }));
  assert.deepEqual(
    filterEyes(eyes, '', '', 'rarity').map(e => e.rarity),
    ['Common', 'Uncommon', 'Rare']
  );
  const html = eyeResults(eyes, 'rarity');
  assert.ok(html.indexOf('<h2>Common ') < html.indexOf('<h2>Uncommon '));
  assert.ok(html.indexOf('<h2>Uncommon ') < html.indexOf('<h2>Rare '));
  assert.equal((html.match(/eye-rarity-section/g) || []).length, 3);
  assert.match(html, /\(60%\)/);
  assert.match(html, /\(35%\)/);
  assert.match(html, /\(5%\)/);
  const descending = eyeResults(eyes, 'rarity', eyes, false, 'desc');
  assert.ok(descending.indexOf('<h2>Rare ') < descending.indexOf('<h2>Common '));
  const page = eyesManagerPage({ eyes });
  assert.match(page, /class="definition-sort-controls"/);
  assert.match(page, /data-action="eye-sort-direction"/);
  assert.doesNotMatch(page, /Name A–Z|Name Z–A/);
});

test('Horse mutations keep four slots without a mutation counter', () => {
  const empty = profileContent({ ...horses[0], mutations: [] }, state);
  assert.doesNotMatch(empty, /horse-mutation-count/);
  assert.equal((empty.match(/aria-label="Locked mutation slot"/g) || []).length, 4);
  const html = profileContent(
    { ...horses[0], mutations: ['Springy Tendons', { name: 'Double Jump', description: 'Jump higher.' }, 'Twins'] },
    state
  );
  assert.doesNotMatch(html, /horse-mutation-count/);
  assert.match(html, /<ol class="horse-mutations mutation-slots"/);
  assert.equal((html.match(/<li class="mutation-slot /g) || []).length, 4);
  assert.equal((html.match(/aria-label="Locked mutation slot"/g) || []).length, 1);
  assert.match(html, /<strong>Double Jump<\/strong><span class="mutation-description">: Jump higher\.<\/span>/);
});

test('Horse import preview offers only confirmation and cancellation actions', () => {
  const horse = { ...horses[0], notes: 'Imported notes' };
  const html = profileContent(
    horse,
    { ...state, horses: [], sold: [], settings: { ...state.settings, developerEditMode: false } },
    { importPreview: true }
  );
  assert.match(html, /data-action="confirm-import"/);
  assert.match(html, /data-action="cancel-import"/);
  assert.doesNotMatch(html, /data-action="(?:sell|export-horse|catch|rename-horse|edit-horse-field)"/);
  assert.match(html, /Imported notes/);
});

test('Random eye drafts generate colors without reusing internal IDs', () => {
  const eyes = [
    { id: 'eye-a', systemId: 'a', textureId: 't', name: 'Amber', rarity: 'Rare', colors: ['#ABCDEF'], layers: [] }
  ];
  const draft = randomEyeDraft(eyes, () => 0);
  assert.deepEqual(draft.colors, ['#000000']);
  assert.equal(draft.rarity, 'Common');
  const three = randomEyeDraft(eyes, () => 0.99);
  assert.equal(three.colors.length, 3);
  assert.ok(three.colors.every(color => /^#[A-F0-9]{6}$/.test(color)));
  assert.equal(draft.id, undefined);
  assert.equal(draft.systemId, '');
  assert.equal(draft.textureId, '');
  assert.notEqual(draft.name, 'Amber');
  assert.equal(eyes[0].name, 'Amber');
});

test('Personalities uses a compact search and header add button', () => {
  const initial = libraryEditorPage('personalities', catalog, state);
  assert.doesNotMatch(initial, /<form id="definition-form"/);
  assert.match(initial, /personality-card-description/);
  assert.doesNotMatch(initial, /personality-description-heading/);
  const html = libraryEditorPage('personalities', catalog, state, catalog.personalities[0]);
  assert.match(html, /data-action="close-personality-editor"/);
  assert.match(html, /Delete Entry/);
  assert.match(html, /<form id="definition-form"/);
  assert.doesNotMatch(
    html,
    /Your collection of options|Find an entry|Behavior Tags|System ID|data-action="duplicate-definition"/
  );
  assert.match(html, /placeholder="Search\.\.\."/);
  assert.doesNotMatch(html, />Search<input/);
  assert.match(html, /personality-manager-header/);
  assert.match(html, /type="hidden" name="systemId"/);
});

test('Horse cards truncate names after thirteen characters while profiles retain full names', () => {
  const horse = { ...horses[0], name: 'ABCDEFGHIJKLMNO' };
  const html = card(horse, state);
  assert.match(html, />ABCDEFGHIJKLM…<\/button>/);
  assert.match(html, /title="ABCDEFGHIJKLMNO"/);
  const profile = profileContent(horse, state);
  assert.match(profile, /id="profile-title" tabindex="0">[\s\S]*?ABCDEFGHIJKLMNO<\/h2>/);
});

test('Rarity settings show five editable ranks and apply colors to horse cards', () => {
  const html = raritiesManagerPage(catalog);
  for (const label of ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Cosmic']) assert.ok(html.includes(label));
  assert.match(html, /id="rarity-settings-form"/);
  const custom = { ...catalog, rarities: { version: 1, colors: { ...defaultRaritySettings.colors, rare: '#123456' } } };
  const horse = {
    ...horses[0],
    rarityTier: 2,
    speciesId: 'unregistered',
    species: 'Unregistered',
    speciesEvent: null,
    mutations: [],
    specialSpawn: null
  };
  assert.match(card(horse, state, 'stable', custom), /--horse-rank-color:#123456/);
  assert.match(card(horse, state, 'stable', custom), /data-rarity-glow/);
  const borderOnly = {
    ...custom,
    rarities: { ...custom.rarities, glow: { ...defaultRaritySettings.glow, rare: false } }
  };
  assert.match(card(horse, state, 'stable', borderOnly), /--horse-rank-color:#123456/);
  assert.doesNotMatch(card(horse, state, 'stable', borderOnly), /data-rarity-glow/);
  assert.match(html, />Rarity Manager<\/h1>/);
  assert.ok(!html.includes('Border Color') && !html.includes('rarity-settings-note'));

  assert.match(card({ ...horse, specialSpawn: 'Solar' }, state, 'stable', custom), /data-card-rank="cosmic"/);
  assert.match(card({ ...horse, rarityTier: 4 }, state, 'stable', custom), /data-card-rank="none"/);
});

test('navigation stays collapsed even on its active route and includes User Interface', () => {
  const html = sidebar('wilds/aetherion', state, new Set(), catalog);
  assert.doesNotMatch(html, /<details[^>]*\sopen[\s>]/);
  assert.match(html, /data-group="User Interface"/);
  assert.doesNotMatch(html, /Website & Profile/);
});

import { emptyState } from '../public/ui.js';
test('empty clearings show only the requested message without a stray changelog', () => {
  const html = emptyState('No current horses in the area', '', null, null, 'leaf');
  assert.match(html, /No current horses in the area/);
  assert.doesNotMatch(html, /<p>|Changelog|sidebar-changelog|<\/span>/);
});
