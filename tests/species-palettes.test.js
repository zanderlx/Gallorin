import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speciesPaletteNames, eligibleSpeciesPalettes } from '../public/species-palette-rules.js';
import { speciesPalettesPanel } from '../public/species-palettes.js';
import { validateDefinition, draftDefinition } from '../public/definitions.js';
import { formSignature } from '../public/form-state.js';

const species = { id: 'pony', name: 'Pony', palettePool: ['Gold', 'Shared'] };
const catalog = {
  palettes: [
    { id: 'gold', name: 'Gold', complete: true, global: false, speciesIds: ['pony'] },
    { id: 'shared', name: 'Shared', complete: true },
    { id: 'blue', name: 'Blue', complete: true, global: false, speciesIds: ['other'] },
    { id: 'draft', name: 'Draft', complete: false },
    { id: 'solar', name: 'Solar', complete: true, cosmicType: 'Solar' }
  ]
};
const names = palettes => palettes.map(p => p.name);

test('species palettes combine with only the current zone, deduplicate, and exclude drafts and Cosmic palettes', () => {
  assert.deepEqual(
    names(eligibleSpeciesPalettes(catalog, species, { palettePool: ['Shared', 'Blue', 'Draft', 'Solar'] })),
    ['Gold', 'Shared', 'Blue']
  );
  assert.deepEqual(names(eligibleSpeciesPalettes(catalog, species, { palettePool: [] })), ['Gold', 'Shared']);
  assert.deepEqual(
    names(eligibleSpeciesPalettes(catalog, { ...species, palettePool: [] }, { palettePool: ['Blue'] })),
    ['Blue']
  );
  assert.deepEqual(speciesPaletteNames({ id: 'pony' }, catalog), ['Gold']);
  assert.deepEqual(names(eligibleSpeciesPalettes(catalog, species, { palettePool: ['Blue'] }, true)), [
    'Gold',
    'Shared'
  ]);
});

test('species palette tab shares the zone picker controls without a disclosure', () => {
  const page = String(speciesPalettesPanel(species, catalog));
  assert.match(page, /id="species-palettes-form"/);
  assert.match(page, /Pony Palettes/);
  assert.doesNotMatch(page, /<details|<summary/);
  for (const control of [
    'zone-palette-search',
    'zone-palette-type',
    'zone-palette-sort',
    'zone-palette-sort-direction',
    'zone-toggle-all'
  ])
    assert.ok(page.includes(control));
  assert.match(page, /value="Gold" checked/);
});

test('species palette values validate and browsing controls do not count as edits', () => {
  const input = { ...draftDefinition('species'), name: 'Pony', palettePool: ['Gold', 'Gold'] };
  assert.deepEqual(validateDefinition('species', input).palettePool, ['Gold']);
  assert.throws(() => validateDefinition('species', { ...input, palettePool: [3] }), /valid text/);
  const selection = { tagName: 'INPUT', type: 'checkbox', name: 'palettePool', checked: true };
  const search = { tagName: 'INPUT', type: 'search', name: '', value: '' };
  const form = { id: 'species-palettes-form', elements: [selection, search] };
  const baseline = formSignature(form);
  search.value = 'Gold';
  assert.equal(formSignature(form), baseline);
  selection.checked = false;
  assert.notEqual(formSignature(form), baseline);
});
