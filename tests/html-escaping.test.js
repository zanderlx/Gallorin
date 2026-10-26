// Renders every view with hostile text in player-editable and importable fields and checks
// that none of it reaches the page as markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../src/store.js';
import { wildPage, stablePage, collectionCards, settingsPage, savesPage, editModePage } from '../public/pages.js';
import { profileContent } from '../public/profile.js';
import { sidebar, card } from '../public/ui.js';
import { libraryEditorPage } from '../public/library-editor.js';
import { definitionKinds } from '../public/definitions.js';
import { keeperPage } from '../public/keeper.js';
import { saleHistoryTable } from '../public/economy.js';
import { eyesManagerPage } from '../public/eyes-manager.js';
import { gameSettingsPage } from '../public/game-settings.js';
import { horseUpdatesPage } from '../public/horse-updates.js';
import { musicManagerPage } from '../public/music-manager.js';
import { mutationsManagerPage } from '../public/mutations-manager.js';
import { palettesManagerPage } from '../public/palettes-manager.js';
import { personalitiesManagerPage } from '../public/personalities-manager.js';
import { raritiesManagerPage } from '../public/rarities-manager.js';
import { traitsEditorPage } from '../public/traits-editor.js';
import { zoneEditorPage } from '../public/zone-editor.js';

const payload = '"><img src=x onerror=alert(1)>';
const leaked = /<img src=x onerror/;
const textKeys = new Set(['name', 'description', 'notes', 'personalityDescription', 'emoji', 'title', 'artist']);

// Replaces display text (never ids, colors, or numbers) with the payload, recursively.
function poison(value, depth = 0) {
  if (Array.isArray(value)) return value.map(item => (typeof item === 'string' ? payload : poison(item, depth + 1)));
  if (!value || typeof value !== 'object' || depth > 4) return value;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' && textKeys.has(key)) value[key] = payload + item;
    else if (key === 'traits' && item && typeof item === 'object') value[key] = poison(item, depth + 1);
    else if (item && typeof item === 'object' && !['colors', 'colorsByRegion'].includes(key))
      value[key] = poison(item, depth + 1);
  }
  return value;
}

const catalogFile = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
const directory = await mkdtemp(join(tmpdir(), 'gallorin-escaping-'));
const store = await new GameStore(directory, catalogFile, defaults, { rng: () => 0.5 }).init();
await store.action('visit', { locationId: 'aetherion' });
const [first, second] = store.state.encounters.aetherion;
await store.action('catch', { id: first.id });
await store.action('catch', { id: second.id });
await store.action('sell', { id: second.id });
const state = store.snapshot();
const catalog = store.getCatalog();
await rm(directory, { recursive: true, force: true });

state.settings.developerEditMode = true;
for (const list of [state.horses, state.sold, ...Object.values(state.encounters)]) poison(list);
state.keeper = { name: payload, title: payload, bio: payload };
for (const transaction of state.transactions) transaction.horseName = payload;
const hostileCatalog = structuredClone(catalog);
for (const kind of Object.keys(definitionKinds)) poison(hostileCatalog[kind] || []);
poison(hostileCatalog.locations);
const location = catalog.locations[0];
const horse = state.horses[0];
const music = {
  version: 2,
  tracks: [
    { id: '11111111-1111-1111-1111-111111111111', name: payload, artist: payload, kind: 'music', durationSeconds: 60 }
  ],
  assignments: {},
  fadeSeconds: 2
};

const views = {
  sidebar: () => sidebar('stable/all', state, new Set(['Wilds']), hostileCatalog, '1.0.0'),
  'horse card': () => card(horse, state, 'stable', catalog),
  profile: () => profileContent(horse, state, { catalog }),
  'wild page': () => wildPage(location, state, catalog.locations, catalog),
  'stable page': () => stablePage('all', state, catalog),
  'collection cards': () => collectionCards('all', state, '', 'name', catalog, 'asc'),
  'settings page': () => settingsPage(state),
  'saves page': () => savesPage(state),
  'edit mode page': () => editModePage(state),
  'keeper page': () => keeperPage(state),
  'sale history': () => saleHistoryTable(state),
  'game settings': () => gameSettingsPage(state, hostileCatalog),
  'horse updates': () =>
    horseUpdatesPage({ ...state, settings: { ...state.settings, horseUpdatesEnabled: true } }, hostileCatalog),
  'music manager': () => musicManagerPage(music, catalog.locations),
  'eyes manager': () => eyesManagerPage(hostileCatalog),
  'mutations manager': () => mutationsManagerPage(hostileCatalog),
  'palettes manager': () => palettesManagerPage(hostileCatalog),
  'personalities manager': () => personalitiesManagerPage(hostileCatalog),
  'rarities manager': () => raritiesManagerPage(hostileCatalog),
  'traits editor': () => traitsEditorPage(hostileCatalog, hostileCatalog.species[0].id),
  'zone editor': () => zoneEditorPage(hostileCatalog, state),
  ...Object.fromEntries(
    Object.keys(definitionKinds).map(kind => [
      `library editor (${kind})`,
      () => libraryEditorPage(kind, hostileCatalog, state, hostileCatalog[kind]?.[0])
    ])
  )
};

for (const [name, render] of Object.entries(views)) {
  test(`${name} escapes hostile text`, () => {
    const html = String(render());
    assert.ok(html.length > 0);
    const match = html.match(leaked);
    assert.equal(
      match,
      null,
      `unescaped markup near: ${html.slice(Math.max(0, match?.index - 120), match?.index + 40)}`
    );
  });
}

test('html escapes values, keeps nested html and raw markup, and joins arrays', async () => {
  const { html, raw } = await import('../public/ui.js');
  const name = '<b>"Star" & Co</b>';
  assert.equal(
    String(html`<p title="${name}">${name}</p>`),
    '<p title="&lt;b&gt;&quot;Star&quot; &amp; Co&lt;/b&gt;">&lt;b&gt;&quot;Star&quot; &amp; Co&lt;/b&gt;</p>'
  );
  assert.equal(
    String(html`<ul>${['a<', 'b'].map(item => html`<li>${item}</li>`)}</ul>`),
    '<ul><li>a&lt;</li><li>b</li></ul>'
  );
  assert.equal(String(html`<i>${raw('<svg></svg>')}</i>`), '<i><svg></svg></i>');
  assert.equal(String(html`${null}${undefined}|${false}|${0}`), '|false|0');
});
