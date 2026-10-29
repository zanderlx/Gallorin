import { stablePage } from '../public/pages.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horseUpdatesPage, horseOverrideValue, horseOverrideProfile } from '../public/horse-updates.js';
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
        eye: { colors: [] },
        personality: { name: 'Calm' },
        caughtAt: '2026-10-29T00:00:00Z'
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
  assert.ok(page.includes(stablePage('all', state, catalog).replace('>My Horses</h1>', '>Horse Overrides</h1>')));
  assert.match(page, /horse-overrides-profile/);
  assert.ok(!page.includes('horse-update-intro'));
  const profile = String(horseOverrideProfile(state.horses[0], { ...state, sold: [] }, catalog));
  assert.match(profile, /Preview Changes/);
  assert.match(profile, /data-profile-tab="overview"/);
  assert.match(profile, /data-profile-tab="appearance"/);
  assert.match(profile, /data-profile-tab="overrides"/);
  for (const key of ['trait:Mane', 'mutation:0', 'skill:bond', 'color:Coat Top', 'daysOwned'])
    assert.ok(profile.includes('data-key="' + key + '"'));
  assert.equal(lockedCosmicLabel({ mutations: [{ name: 'Void' }] }), 'Void');
  state.settings.horseUpdatesEnabled = false;
  assert.match(
    String(horseOverrideProfile(state.horses[0], { ...state, sold: [] }, catalog)),
    /Enable Horse Overrides/
  );
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
