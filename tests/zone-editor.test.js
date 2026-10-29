import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  zoneSpawnChances,
  filterZoneSpecies,
  zoneEditorForm,
  zoneEditorPage,
  zonePreview
} from '../public/zone-editor.js';
import { normalizeCatalog } from '../public/definitions.js';
import { newZoneDraft, validateZone, zoneAtmosphere } from '../public/zones.js';
import { readFile } from 'node:fs/promises';

const catalog = normalizeCatalog(
  JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
);

test('zone percentages match encounter tickets including signed, zero and empty weights', () => {
  const chances = zoneSpawnChances([
    { speciesId: 'one', weight: -10 },
    { speciesId: 'two', weight: 30 },
    { speciesId: 'disabled', weight: 0 }
  ]);
  assert.equal(chances.get('one'), 25);
  assert.equal(chances.get('two'), 75);
  assert.equal(chances.get('disabled'), 0);
  assert.equal(zoneSpawnChances([{ speciesId: 'zero', weight: 0 }]).get('zero'), 0);
  assert.equal(zoneSpawnChances([]).size, 0);
});

test('zone species filters combine names and all rarity tiers without changing the catalog', () => {
  const species = [
    { id: 'z', name: 'Zebra', rarityTier: 4 },
    { id: 'a', name: 'Astral', rarityTier: 0 },
    { id: 'b', name: 'Breeze', rarityTier: 2 },
    { id: 'c', name: 'Amber', rarityTier: 4 }
  ];
  const ids = entries => entries.map(s => s.id);
  assert.deepEqual(ids(filterZoneSpecies(species)), ['c', 'z', 'b', 'a']);
  assert.deepEqual(ids(filterZoneSpecies(species, '', '', 'name')), ['c', 'a', 'b', 'z']);
  assert.deepEqual(ids(filterZoneSpecies(species, '  A ', '4')), ['c', 'z']);
  assert.deepEqual(ids(filterZoneSpecies(species, '', '0')), ['a']);
  assert.deepEqual(ids(filterZoneSpecies(species, '', '', 'rarity')), ['c', 'z', 'b', 'a']);
  assert.deepEqual(ids(filterZoneSpecies(species, '', '', 'rarity', 'desc')), ['a', 'b', 'z', 'c']);
  assert.deepEqual(ids(filterZoneSpecies(species, 'missing')), []);
  assert.deepEqual(ids(species), ['z', 'a', 'b', 'c']);
});

test('landing page contains artwork cards while editing keeps atmosphere inside one zone form', () => {
  const landing = zoneEditorPage(catalog, {});
  assert.match(landing, /hero zone-preview/);
  assert.doesNotMatch(landing, /<form|zone-atmospheres/);
  const editor = String(zoneEditorForm(catalog, newZoneDraft()));
  assert.equal((editor.match(/<form/g) || []).length, 1);
  assert.match(editor, /name="color:zone-tint"/);
  assert.match(editor, /name="encounterTitle"/);
  assert.doesNotMatch(editor, /<details[^>]*\bopen\b/);
  assert.match(editor, /id="zone-species-rarity"/);
  assert.doesNotMatch(editor, /id="definition-form"|name="event"/);
});

test('zone appearance overrides are validated and affect previews without editing a shared preset', () => {
  const draft = {
    ...newZoneDraft(),
    name: 'Custom zone',
    appearance: { tint: '#123456', encounterTitle: 'A quiet clearing' }
  };
  const before = structuredClone(catalog.atmospheres);
  const saved = validateZone(draft, catalog);
  assert.deepEqual(saved.appearance, draft.appearance);
  assert.equal(zoneAtmosphere(saved, catalog).tint, '#123456');
  assert.match(zonePreview(saved, catalog), /--zone-tint:#123456/);
  assert.deepEqual(catalog.atmospheres, before);
  for (const appearance of [
    null,
    { tint: 'red', encounterTitle: 'Heading' },
    { tint: '#123456', encounterTitle: '' },
    { tint: '#123456', encounterTitle: 'a'.repeat(101) }
  ]) {
    assert.throws(() => validateZone({ ...draft, appearance }, catalog), /Zone appearance/);
  }
});
