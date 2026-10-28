import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speciesManagerPage, speciesSpawnRows } from '../public/species-manager.js';
import { draftDefinition } from '../public/definitions.js';

const species = { ...draftDefinition('species'), id: 'horse', name: 'Horse', traits: { Mane: ['Braided'] } };
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
  assert.doesNotMatch(overview, /name="speciesZones"|id="traits-species"/);
  assert.match(overview, /data-tab="traits"/);
  assert.match(overview, /data-tab="zones"[^>]*>Zones</);
  assert.ok(overview.indexOf('>Add species</button>') < overview.indexOf('Find a species'));
  assert.match(overview, /species-identity-fields[\s\S]*name="name"[\s\S]*name="rarityTier"[\s\S]*<\/div>/);
  const traits = speciesManagerPage(catalog, {}, species, 'traits');
  assert.match(traits, /id="traits-form"/);
  assert.match(traits, /Braided/);
  assert.doesNotMatch(traits, /id="definition-form"|id="traits-species"/);
  const spawning = speciesManagerPage(catalog, {}, species, 'zones');
  assert.match(spawning, /25% of regular tickets/);
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
});

test('new species must be saved before managing traits and all species text is escaped', () => {
  const page = speciesManagerPage(catalog, {}, { ...species, id: '', name: '<script>' }, 'traits');
  assert.match(page, /&lt;script&gt;/);
  assert.doesNotMatch(page, /<script>|id="traits-form"/);
  assert.match(page, /Save this species/);
  assert.match(page, /data-tab="traits" disabled/);
});
