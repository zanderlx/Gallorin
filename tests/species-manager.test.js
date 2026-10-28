import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  speciesManagerPage,
  speciesSpawnRows,
  sortSpeciesEntries,
  updateSpeciesSort,
  speciesDeleteConfirmation
} from '../public/species-manager.js';
import { draftDefinition } from '../public/definitions.js';
import { defaultRaritySettings } from '../public/rarity-settings.js';

const species = { ...draftDefinition('species'), id: 'horse', name: 'Horse', traits: { Mane: ['Braided'] } };
test('species delete confirmation uses the concise prompt and shared aligned dialog structure', () => {
  const confirmation = String(speciesDeleteConfirmation('Ghoulsteed'));
  assert.match(confirmation, /<div class="dialog-top"><h2 id="confirm-title">Delete Ghoulsteed<\/h2><\/div>/);
  assert.ok(String(speciesDeleteConfirmation('<custom>')).includes('Delete &lt;custom&gt;'));
  assert.match(confirmation, /<p class="delete-warning">Are you sure you want to delete this species\?<\/p>/);
  assert.doesNotMatch(confirmation, /saved immediately|backup folder/);
  assert.match(confirmation, /data-action="cancel-delete"/);
  assert.match(confirmation, /data-action="confirm-delete"/);
});
const catalog = {
  species: [species, { ...species, id: 'pony', name: 'Pony' }],
  locations: [
    {
      id: 'valley',
      name: 'Valley',
      speciesPool: ['Horse', 'Pony'],
      creatures: [
        { speciesId: 'horse', weight: -10 },
        { speciesId: 'pony', weight: 30 }
      ]
    },
    { id: 'closed', name: 'Closed', enabled: false, creatures: [{ speciesId: 'horse', weight: 5 }] },
    { id: 'disabled', name: 'Disabled', creatures: [{ speciesId: 'horse', weight: 0 }] },
    { id: 'empty', name: 'Empty', speciesPool: ['Horse'], creatures: [] }
  ]
};

test('Species provides overview, traits and read-only spawning under one selected species', () => {
  const overview = speciesManagerPage(catalog, {});
  assert.match(overview, /id="definition-form"/);
  assert.match(overview, /value="rarity" selected/);
  assert.doesNotMatch(overview, /name="speciesZones"|id="traits-species"/);
  assert.match(overview, /data-tab="traits"/);
  assert.match(overview, /data-tab="zones"[^>]*>Zones</);
  assert.ok(overview.indexOf('Create Species</button>') < overview.indexOf('Find A Species'));
  assert.match(overview, /species-identity-fields[\s\S]*name="name"[\s\S]*name="rarityTier"[\s\S]*<\/div>/);
  const rarity = overview.match(/<select name="rarityTier">([\s\S]*?)<\/select>/)[1];
  assert.deepEqual(
    [...rarity.matchAll(/<option value="(\d)"[^>]*>([^<]+)<\/option>/g)].map(([, value, label]) => [
      Number(value),
      label
    ]),
    [
      [4, 'Common'],
      [3, 'Uncommon'],
      [2, 'Rare'],
      [1, 'Ultra Rare'],
      [0, 'Cosmic']
    ]
  );
  assert.doesNotMatch(overview, />Rarity Tier</);
  const traits = speciesManagerPage(catalog, {}, species, 'traits');
  assert.match(traits, /id="traits-form"/);
  assert.match(traits, /Braided/);
  assert.doesNotMatch(traits, /id="definition-form"|id="traits-species"/);
  const spawning = speciesManagerPage(catalog, {}, species, 'zones');
  assert.match(spawning, /Weight: -10 · 25%/);
  assert.doesNotMatch(spawning, /of regular tickets/);
  assert.doesNotMatch(
    spawning,
    /This overview reads|special spawn rules|Event zone|Active|Zone closed|Disabled \(zero weight\)|Manage Zones/
  );
  assert.match(spawning, /data-action="species-open-zone" data-id="valley"/);
  assert.doesNotMatch(spawning, /name="speciesZones"|name="weight:/);
});

test('spawn overview uses authoritative creature records and absolute ticket weights', () => {
  const rows = speciesSpawnRows(species, catalog, {});
  assert.equal(rows.length, 3);
  assert.equal(rows[0].chance, 25);
  assert.equal(rows[0].weight, -10);
  assert.equal(rows[1].status, 'Zone closed');
  assert.equal(rows[2].status, 'Disabled (zero weight)');
  assert.ok(!rows.some(r => r.zone.id === 'empty'));
});

test('spawn overview follows overrides and deleted zones without storing another assignment list', () => {
  const state = {
    customLocations: [{ ...catalog.locations[0], creatures: [{ speciesId: 'pony', weight: 5 }] }],
    deletedLocationIds: ['closed']
  };
  const before = structuredClone({ catalog, state });
  const rows = speciesSpawnRows(species, catalog, state);
  assert.deepEqual(
    rows.map(r => r.zone.id),
    ['disabled']
  );
  assert.deepEqual({ catalog, state }, before);
  const empty = speciesManagerPage({ ...catalog, locations: [] }, {}, species, 'zones');
  assert.match(empty, /not assigned to any zone/);
  assert.match(empty, /class="species-zones-empty"/);
  assert.match(empty, /href="#dev\/locations">Manage Zones<\/a>/);
});

test('new species must be saved before managing traits and all species text is escaped', () => {
  const page = speciesManagerPage(catalog, {}, { ...species, id: '', name: '<script>' }, 'traits');
  assert.match(page, /&lt;script&gt;/);
  assert.doesNotMatch(page, /<script>|id="traits-form"/);
  assert.match(page, /Save this species/);
  assert.match(page, /data-tab="traits" disabled/);
});

test('species list shows rarity with trait counts and sorts by rarity then name without changing the source', () => {
  const entries = [
    { ...species, id: 'cosmic', name: 'Cosmic horse', rarityTier: 0 },
    { ...species, id: 'common', name: 'Common horse', rarityTier: 4 },
    { ...species, id: 'rare', name: 'Rare horse', rarityTier: 2 },
    { ...species, id: 'ultra', name: 'Ultra horse', rarityTier: 1 },
    { ...species, id: 'zebra', name: 'Zebra', rarityTier: 3 },
    { ...species, id: 'akhal', name: 'Akhal', rarityTier: 3 }
  ];
  const before = structuredClone(entries);
  assert.deepEqual(
    sortSpeciesEntries(entries, 'rarity').map(s => s.id),
    ['common', 'akhal', 'zebra', 'rare', 'ultra', 'cosmic']
  );
  assert.deepEqual(
    sortSpeciesEntries(entries).map(s => s.id),
    ['akhal', 'common', 'cosmic', 'rare', 'ultra', 'zebra']
  );
  assert.deepEqual(entries, before);
  assert.deepEqual(
    sortSpeciesEntries(entries, 'rarity', 'desc').map(s => s.id),
    ['cosmic', 'ultra', 'rare', 'zebra', 'akhal', 'common']
  );
  assert.deepEqual(
    sortSpeciesEntries(entries, 'name', 'desc').map(s => s.id),
    ['zebra', 'ultra', 'rare', 'cosmic', 'common', 'akhal']
  );
  const page = speciesManagerPage({ ...catalog, species: entries }, {}, entries[0], 'overview', 'rarity');
  assert.match(page, /<span class="species-rarity"[^>]*>Cosmic<\/span> · 1 traits<\/small>/);
  assert.match(page, /value="rarity" selected/);
  assert.ok(page.indexOf('data-id="akhal"') < page.indexOf('data-id="cosmic"'));
});

test('species rarity labels follow configured colors and list controls sit outside the panel', () => {
  const page = speciesManagerPage(
    {
      ...catalog,
      rarities: { ...defaultRaritySettings, colors: { ...defaultRaritySettings.colors, common: '#123456' } }
    },
    {}
  );
  assert.match(page, /style="color:#123456">Common<\/span>/);
  assert.ok(page.indexOf('id="definition-search"') < page.indexOf('<section class="panel library-list-panel">'));
  assert.ok(page.indexOf('id="species-sort"') < page.indexOf('<section class="panel library-list-panel">'));
  assert.ok(page.indexOf('id="definition-search"') < page.indexOf('id="species-sort"'));
});

test('Group follows Name and Rarity with all built-in groups and existing custom values', () => {
  const draft = { ...species, event: 'Custom Group', restriction: 'Preserved metadata' };
  const page = speciesManagerPage(catalog, {}, draft);
  const groups = page.match(/<select name="event">([\s\S]*?)<\/select>/)[1];
  for (const group of ['Alien', 'Carnival', 'Christmas', 'Easter', 'Halloween', 'Medieval', 'Royal', 'Valentine'])
    assert.ok(groups.includes(`value="${group}"`));
  assert.match(groups, /value="Custom Group" selected/);
  assert.ok(page.indexOf('name="rarityTier"') < page.indexOf('name="event"'));
  assert.ok(page.indexOf('name="event"') < page.indexOf('name="description"'));
  assert.doesNotMatch(
    page,
    /Acquisition or rarity notes|Event or group \(optional\)|duplicate-definition|Manage appearance in Traits/
  );
  assert.match(page, /type="hidden" name="restriction" value="Preserved metadata"/);
});

test('sorting reorders existing rows while preserving filtered rows and selection', () => {
  const rows = [
    { dataset: { name: 'Zulu', rarityTier: '0' }, hidden: true },
    { dataset: { name: 'Alpha', rarityTier: '3' }, selected: true }
  ];
  const appended = [];
  const list = { children: rows, append: element => appended.push(element) };
  updateSpeciesSort({
    querySelector: key =>
      key === '#species-sort' ? { value: 'rarity' } : key.includes('species-sort-direction') ? null : list
  });
  assert.deepEqual(appended, [rows[1], rows[0]]);
  assert.equal(appended[0].selected, true);
  assert.equal(appended[1].hidden, true);
});
