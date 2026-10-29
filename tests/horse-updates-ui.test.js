import { groups } from '../public/ui.js';
import { profileContent } from '../public/profile.js';
import { horseOverrideBadge } from '../public/horse-override-markers.js';
import { gameSettingsPage } from '../public/game-settings.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horseOverrideControls, horseOverrideValue } from '../public/horse-updates.js';
import { lockedCosmicLabel } from '../public/horse-update-labels.js';
test('horse admin UI escapes horse names, exposes granular fields, and gates editing independently', () => {
  const state = {
    settings: { horseUpdatesEnabled: true, sellingPrice: 100 },
    sold: [],
    transactions: [],
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
  assert.ok(!groups.some(group => group.items.some(([route]) => route === 'dev/horse-updates')));
  const controls = horseOverrideControls(state.horses[0], state, catalog);
  assert.ok(!controls.includes('Preview Changes'));
  assert.ok(!controls.includes('Reset Pending Changes'));
  assert.ok(!controls.includes('Review Changes'));
  assert.equal((controls.match(/data-save-section/g) || []).length, 6);
  assert.equal((controls.match(/class="form-actions horse-section-actions" hidden/g) || []).length, 6);
  assert.equal((controls.match(/data-cancel-section/g) || []).length, 6);
  assert.match(controls, /title="Reroll Species"/);
  assert.ok(!controls.includes('title="Roll '));
  assert.ok(!controls.includes('<label>Operation'));
  assert.match(controls, /<select data-mode hidden aria-hidden="true" tabindex="-1">/);
  assert.ok(!controls.includes('Count (blank = random)'));
  assert.match(controls, /<h2>Horse Overrides<\/h2>/);
  assert.match(controls, /data-horse-notification role="status" aria-live="polite" hidden/);
  assert.match(controls, /<span>Field<\/span><span>Original<\/span><span>Override<\/span><span>Change<\/span>/);
  assert.ok(!controls.includes('Current Value'));
  assert.ok(!controls.includes('Acquisition Date / Birthday'));
  assert.match(controls, /aria-label="Edit Birthday"/);
  assert.match(controls, /data-roll-override="species"/);
  assert.match(controls, /data-remove-override="species"[^>]*hidden/);
  const savedOverride = {
    ...state.horses[0],
    overriddenFields: ['species'],
    overrideOriginals: { species: { value: 'Original species', fields: { species: 'Original species' }, missing: [] } }
  };
  const markedControls = horseOverrideControls(savedOverride, state, catalog);
  assert.ok(!/data-remove-override="species"[^>]*hidden/.test(markedControls));
  assert.match(controls, /details class="zone-editor-section horse-edit-section"/);
  assert.ok(!controls.includes('Disable Horse Overrides'));
  for (const key of ['name', 'age', 'daysOwned', 'favorite', 'color:Coat Top'])
    assert.ok(!controls.includes('data-key="' + key + '"'));
  assert.ok(!controls.includes('name="allowDuplicates"'));
  for (const key of ['trait:Mane', 'mutation:0', 'skill:bond', 'birthday', 'palette'])
    assert.ok(controls.includes('data-key="' + key + '"'));
  const profile = profileContent(state.horses[0], state, { catalog, overrideContent: controls });
  assert.match(profile, /title="Edit Horse Data"/);
  assert.match(profile, /<span>Edit<\/span>/);
  assert.ok(!profile.includes('<script>bad'));
  assert.match(gameSettingsPage(state, catalog), /Override Horse Data/);
  assert.ok(!gameSettingsPage(state, catalog).includes('Allow Duplicate Mutations'));
  assert.equal(lockedCosmicLabel({ mutations: [{ name: 'Void' }] }), 'Void');
  state.settings.horseUpdatesEnabled = false;
  assert.equal(horseOverrideControls(state.horses[0], state, catalog), '');
  assert.ok(!profileContent(state.horses[0], state, { catalog }).includes('Edit Horse Data'));
  const marked = { ...state.horses[0], overriddenFields: ['species', 'trait:Mane'] };
  assert.equal(horseOverrideBadge(marked, 'species', false), '');
  assert.equal(horseOverrideBadge(marked, 'gender', true), '');
  assert.match(horseOverrideBadge(marked, 'species', true), /OVERRIDE/);
  state.settings.developerEditMode = true;
  assert.match(profileContent(marked, state, { catalog }), /OVERRIDE/);
  state.settings.developerEditMode = false;
  assert.ok(!profileContent(marked, state, { catalog }).includes('OVERRIDE'));
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
