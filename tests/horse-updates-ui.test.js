import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horseUpdatesPage } from '../public/horse-updates.js';
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
        specialSpawn: 'Solar'
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
  for (const key of ['trait:Mane', 'mutation:0', 'skill:bond', 'color:Coat Top', 'daysOwned'])
    assert.ok(page.includes('data-key="' + key + '"'));
  assert.match(page, /🔒 Solar/);
  assert.equal(lockedCosmicLabel({ mutations: [{ name: 'Void' }] }), 'Void');
  state.settings.horseUpdatesEnabled = false;
  assert.match(horseUpdatesPage(state, catalog), /Enable Horse Updates/);
  assert.ok(!horseUpdatesPage(state, catalog).includes('id="horse-update-form"'));
});
