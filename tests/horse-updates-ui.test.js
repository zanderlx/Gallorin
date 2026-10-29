import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horseUpdatesPage, horseOverrideValue } from '../public/horse-updates.js';
import { lockedCosmicLabel } from '../public/horse-update-labels.js';
test('horse admin UI escapes horse names, exposes granular fields, and gates editing independently', () => {
  const state = {
    settings: { horseUpdatesEnabled: true },
    horses: [
      {
        id: 'one',
        name: '<script>bad</script>',
        species: 'Horse',
        revision: 1,
        schemaVersion: 1,
        specialSpawn: 'Solar',
        palette: { colors: {} },
        eye: { colors: [] }
      }
    ]
  };
  const catalog = {
    species: [],
    palettes: [],
    personalities: [],
    eyes: [],
    mutations: [],
    spawning: { ALLOW_DUPLICATE_MUTATIONS: false }
  };
  const page = horseUpdatesPage(state, catalog);
  assert.ok(!page.includes('<script>bad'));
  assert.match(page, /Preview Changes/);
  assert.match(page, /<h1>Horse Overrides<\/h1>/);
  assert.match(page, /type="button" data-open-override/);
  assert.match(page, /horse-grid horse-override-grid/);
  assert.match(page, /data-edit-override="trait:Pattern"/);
  assert.match(page, /<dialog/);
  for (const key of ['trait:Mane', 'mutation:0', 'skill:bond', 'color:Coat Top', 'daysOwned'])
    assert.ok(page.includes('data-key="' + key + '"'));
  assert.match(page, /🔒 Solar/);
  assert.equal(lockedCosmicLabel({ mutations: [{ name: 'Void' }] }), 'Void');
  state.settings.horseUpdatesEnabled = false;
  assert.match(horseUpdatesPage(state, catalog), /Enable Horse Overrides/);
  assert.ok(!horseUpdatesPage(state, catalog).includes('id="horse-update-form"'));
});

test('override details read saved trait, color, mutation, skill and description values', () => {
  const horse = {
    name: 'Sable',
    traits: { Patterns: ['Brindle'], Mane: ['Long'] },
    palette: { colors: { 'Coat Top': '#123456' } },
    mutations: [{ name: 'Solar' }],
    personality: { name: 'Calm', description: 'Default description' },
    personalityDescription: '',
    skills: { bond: { level: 3, xp: 50 } }
  };
  assert.deepEqual(horseOverrideValue(horse, 'trait:Pattern'), ['Brindle']);
  assert.deepEqual(horseOverrideValue(horse, 'trait:Mane'), ['Long']);
  assert.deepEqual(horseOverrideValue(horse, 'trait:Paint'), []);
  assert.equal(horseOverrideValue(horse, 'color:Coat Top'), '#123456');
  assert.equal(horseOverrideValue(horse, 'mutation:0').name, 'Solar');
  assert.equal(horseOverrideValue(horse, 'mutation:3'), null);
  assert.deepEqual(horseOverrideValue(horse, 'skill:bond'), { level: 3, xp: 50 });
  assert.deepEqual(horseOverrideValue(horse, 'skill:wing'), { level: 0, xp: 0 });
  assert.equal(horseOverrideValue(horse, 'description'), '');
  assert.equal(horseOverrideValue(horse, 'name'), 'Sable');
});
