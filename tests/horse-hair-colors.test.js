import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horseHairColor, hairColorOverride, originalHairColor } from '../public/horse-hair-colors.js';
import { horseTraitCategoryArt } from '../public/horse-trait-art.js';
import { horseOverrideControls } from '../public/horse-updates.js';

const horse = {
  id: 'hair-test',
  palette: { colors: { Hair: '#112233', Pattern: '#445566', Paint: '#778899' } },
  mutations: [],
  traits: { Mane: ['Long Mane'], Tail: ['Long Tail'] }
};

test('original hair colors remain generated, with no automatic override until a matching mutation exists', () => {
  assert.equal(originalHairColor(horse), '#112233');
  assert.equal(hairColorOverride(horse, 'maneColor'), null);
  assert.equal(hairColorOverride(horse, 'tailColor'), null);
  for (const [name, field, expected] of [
    ['Chimera Mane', 'maneColor', '#445566'],
    ['Chimera Tail', 'tailColor', '#445566'],
    ['Harlequin Mane', 'maneColor', '#778899'],
    ['Harlequin Tail', 'tailColor', '#778899']
  ]) {
    const changed = { ...horse, mutations: [{ name }] };
    assert.equal(hairColorOverride(changed, field), expected);
    assert.equal(originalHairColor(changed), '#112233');
    assert.equal(horseHairColor(changed, field === 'maneColor' ? 'tailColor' : 'maneColor'), '#112233');
    assert.equal(hairColorOverride({ ...changed, mutations: [] }, field), null);
    assert.ok(
      String(horseTraitCategoryArt(changed, field === 'maneColor' ? 'Mane' : 'Tail', 'test')).includes(expected)
    );
  }
});

test('mutation color follows palette colors, takes precedence over manual colors, and resolves conflicts consistently', () => {
  const changed = { ...horse, maneColor: '#ABCDEF', mutations: ['Chimera Mane', 'Harlequin Mane'] };
  assert.equal(horseHairColor(changed, 'maneColor'), '#778899');
  assert.equal(horseHairColor({ ...changed, mutations: [...changed.mutations].reverse() }, 'maneColor'), '#778899');
  assert.equal(
    horseHairColor({ ...changed, palette: { colors: { ...horse.palette.colors, Paint: '#FEDCBA' } } }, 'maneColor'),
    '#FEDCBA'
  );
  assert.equal(horseHairColor({ ...changed, mutations: [] }, 'maneColor'), '#ABCDEF');
});

test('Appearance includes separate mane and tail color controls with original and override columns', () => {
  const page = horseOverrideControls(
    horse,
    { settings: { horseUpdatesEnabled: true }, horses: [horse] },
    { species: [], palettes: [], eyes: [], personalities: [], mutations: [], spawning: { sizes: [] } }
  );
  for (const key of ['maneColor', 'tailColor']) {
    assert.ok(page.includes(`data-key="${key}"`));
    assert.ok(page.includes(`data-edit-override="${key}"`));
  }
  assert.match(page, /Mane Color/);
  assert.match(page, /Tail Color/);
});
