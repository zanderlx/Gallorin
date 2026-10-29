import { groups } from '../public/ui.js';
import { profileContent } from '../public/profile.js';
import { horseOverrideBadge } from '../public/horse-override-markers.js';
import { gameSettingsPage } from '../public/game-settings.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  horseOverrideControls,
  horseOverrideValue,
  speciesConfirmationContent,
  horseAppearanceChoices,
  editableHorseFields
} from '../public/horse-updates.js';
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
        mutations: [{ name: 'Solar' }],
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
  assert.equal((controls.match(/data-save-section/g) || []).length, 5);
  assert.equal((controls.match(/class="form-actions horse-section-actions" hidden/g) || []).length, 5);
  assert.equal((controls.match(/data-cancel-section/g) || []).length, 5);
  assert.match(controls, /title="Reroll Species"/);
  assert.ok(!controls.includes('title="Roll '));
  assert.ok(!controls.includes('<label>Operation'));
  assert.match(controls, /<select data-mode hidden aria-hidden="true" tabindex="-1">/);
  assert.ok(!controls.includes('Count (blank = random)'));
  assert.match(controls, /<h2>Horse Overrides<\/h2>/);
  assert.ok(!controls.includes('data-horse-notification'));
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
  assert.ok(!controls.includes('All Unlocked Mutations'));
  assert.ok(!controls.includes('data-key="mutations"'));
  assert.match(controls, /This mutation cannot be updated because this is a Cosmic horse/);
  assert.ok(!controls.includes('Personality &amp; Notes'));
  assert.equal(editableHorseFields.find(field => field.key === 'personality').group, 'Identity');
  for (const key of ['name', 'age', 'daysOwned', 'favorite', 'color:Coat Top', 'description', 'notes'])
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

test('species confirmation lists changes with the requested introduction and no bottom message', () => {
  const markup = String(
    speciesConfirmationContent({
      items: [
        {
          changes: [
            { field: 'species', before: 'Old Species', after: '<script>new</script>' },
            { field: 'speciesId', before: 'old-id', after: 'new-id' },
            {
              field: 'traits',
              before: { Mane: ['Old Mane'], Pattern: ['Old Pattern', 'Old Pattern 2'] },
              after: { Mane: ['New Mane'], Pattern: ['New Pattern', 'New Pattern 2'] }
            },
            { field: 'rarityTier', before: 3, after: 2 },
            { field: 'traitsComplete', before: false, after: true }
          ],
          warnings: ['Pattern count adjusted']
        }
      ]
    })
  );
  for (const value of [
    'Confirm Species Changes',
    'Old Mane',
    'New Mane',
    'Old Pattern',
    'New Pattern',
    'Rarity',
    'Uncommon',
    'Rare',
    'Updating a species also updates species-specific traits. The amount of traits stay the same. Update the amount of traits in the Traits override section. Cosmic horses get the max amount of traits per category'
  ])
    assert.ok(markup.includes(value));
  assert.ok(!markup.includes('<script>'));
  assert.ok(!markup.includes('new-id'));
  assert.ok(!markup.includes('Pattern count adjusted'));
  assert.ok(!markup.includes('horse-species-warning'));
  assert.match(
    markup,
    /<span class="horse-confirm-trait">New Pattern<\/span><span class="horse-confirm-trait">New Pattern 2<\/span>/
  );
  assert.ok(!markup.includes('New Pattern, New Pattern 2'));
  assert.ok(!markup.includes('Rarity Tier'));
  assert.ok(!markup.includes('Trait Definitions Complete'));
  assert.match(markup, /color:#58B878/);
  assert.match(markup, /color:#609DEA/);
});

test('legacy empty traits display as a dash in the horse profile and species confirmation', () => {
  const markup = String(
    speciesConfirmationContent({
      items: [
        {
          changes: [{ field: 'traits', before: { Mane: ['Awaiting species data'] }, after: { Mane: ['New Mane'] } }],
          warnings: []
        }
      ]
    })
  );
  assert.ok(!markup.includes('Awaiting species data'));
  assert.match(markup, />—</);
});

test('appearance choice cards show colors and omit incompatible or Cosmic palettes', () => {
  const horse = { speciesId: 'species-one' };
  const catalog = {
    palettes: [
      { id: 'global', name: 'Global Palette', complete: true, colors: { Coat: '#123456' } },
      {
        id: 'linked',
        name: 'Linked Palette',
        complete: true,
        global: false,
        speciesIds: ['species-one'],
        colors: { Coat: '#654321' }
      },
      { id: 'other', name: 'Wrong Species', complete: true, global: false, speciesIds: ['species-two'], colors: {} },
      { id: 'solar', name: 'Solar', complete: true, colors: {} }
    ],
    eyes: [{ id: 'green', name: 'Emerald Eyes', colors: ['#00FF00', '#009900'] }]
  };
  const palettes = String(horseAppearanceChoices('palette', catalog, horse));
  assert.match(palettes, /Global Palette/);
  assert.match(palettes, /Linked Palette/);
  assert.ok(!palettes.includes('Wrong Species'));
  assert.ok(!palettes.includes('Solar'));
  assert.match(palettes, /background:#123456/);
  const eyes = String(horseAppearanceChoices('eye', catalog, horse));
  assert.match(eyes, /Emerald Eyes/);
  assert.match(eyes, /background:#00FF00/);
  assert.match(eyes, /background:#009900/);
  assert.ok(!eyes.includes('>#00FF00<'));
});

test('species confirmation uses colored rarity tiers rather than Event labels', () => {
  const catalog = {
    species: [
      { id: 'old', name: 'Old', rarityTier: 3, event: 'Autumn' },
      { id: 'new', name: 'New', rarityTier: 2, event: 'Autumn' }
    ]
  };
  const horse = { speciesId: 'old', species: 'Old', rarityTier: 3 };
  const markup = String(
    speciesConfirmationContent(
      {
        items: [
          {
            changes: [
              { field: 'speciesId', before: 'old', after: 'new' },
              { field: 'species', before: 'Old', after: 'New' },
              { field: 'rarityTier', before: 3, after: 2 }
            ],
            warnings: []
          }
        ]
      },
      catalog,
      horse
    )
  );
  assert.match(markup, />Uncommon</);
  assert.match(markup, />Rare</);
  assert.match(markup, /color:#58B878/);
  assert.match(markup, /color:#609DEA/);
  assert.ok(!markup.includes('>Event<'));
});
