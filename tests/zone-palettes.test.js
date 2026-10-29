import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  zonePaletteOptions,
  zonePaletteResults,
  zonePalettePicker,
  syncZonePaletteChoice,
  updateZonePalettes
} from '../public/zone-palettes.js';
import { formSignature } from '../public/form-state.js';
import { filterPalettes } from '../public/palettes-manager.js';

const palettes = [
  { id: 'gold', name: 'Gold', group: 'Christmas', complete: true, global: true, colors: { Hair: '#ABC123' } },
  { id: 'blue', name: 'Blue', group: 'Carnival', complete: true, global: false, colors: { Hair: '#112233' } },
  { id: 'incomplete', name: 'Draft', group: 'Custom', complete: false },
  { id: 'solar', name: 'Solar', group: 'Cosmic', complete: true, cosmicType: 'Solar' }
];
const catalog = { palettes };

test('zone palette browser uses eligible palettes and read-only grouped color cards', () => {
  const options = zonePaletteOptions(catalog);
  assert.deepEqual(
    options.map(p => p.id),
    ['gold', 'blue']
  );
  const grouped = String(zonePaletteResults(filterPalettes(options), ['Gold']));
  assert.ok(grouped.indexOf('<h3>Carnival</h3>') < grouped.indexOf('<h3>Christmas</h3>'));
  assert.match(grouped, /data-tooltip="Hair - #ABC123"/);
  assert.match(grouped, /aria-label="Include Gold" checked/);
  assert.match(grouped, /Species Linked/);
  assert.doesNotMatch(grouped, /data-action=|edit-definition|type="color"/);
  const named = String(zonePaletteResults(filterPalettes(options, '', '', 'name', 'desc'), [], 'name', 'desc'));
  assert.doesNotMatch(named, /<h3>/);
  assert.ok(named.indexOf('Include Gold') < named.indexOf('Include Blue'));
  const hostile = String(zonePaletteResults([{ ...palettes[0], name: '<script>bad</script>', group: '<img>' }]));
  assert.doesNotMatch(hostile, /<script>|<img>/);
});

test('palette browsing preserves named zone selections and does not mark the form dirty', () => {
  const inputs = palettes.slice(0, 2).map(p => ({
    tagName: 'INPUT',
    type: 'checkbox',
    name: 'palettePool',
    value: p.name,
    checked: p.id === 'gold',
    dataset: { zonePaletteId: p.id }
  }));
  const controls = Object.fromEntries(
    ['search', 'type', 'sort', 'direction', 'scope'].map(key => [
      `#zone-palette-${key}`,
      {
        tagName: key === 'search' ? 'INPUT' : 'SELECT',
        type: key === 'search' ? 'search' : 'select-one',
        name: '',
        value: key === 'sort' ? 'group' : key === 'direction' ? 'asc' : ''
      }
    ])
  );
  const results = {};
  const count = {};
  const form = {
    id: 'zone-form',
    elements: [...inputs, ...Object.values(controls)],
    querySelectorAll: selector => (selector.includes(':checked') ? inputs.filter(i => i.checked) : inputs),
    querySelector: selector =>
      selector === '#zone-palette-results'
        ? results
        : selector === '[data-zone-palette-result-count]'
          ? count
          : controls[selector]
  };
  const baseline = formSignature(form);
  controls['#zone-palette-type'].value = 'Carnival';
  updateZonePalettes(form, catalog);
  assert.match(results.innerHTML, /Include Blue/);
  assert.doesNotMatch(results.innerHTML, /Include Gold/);
  assert.equal(inputs[0].checked, true);
  assert.equal(formSignature(form), baseline);
  syncZonePaletteChoice(form, { dataset: { zonePaletteChoice: 'blue' }, checked: true });
  assert.ok(inputs.every(input => input.checked));
  assert.notEqual(formSignature(form), baseline);
  controls['#zone-palette-type'].value = '';
  controls['#zone-palette-sort'].value = 'name';
  controls['#zone-palette-search'].value = 'abc123';
  updateZonePalettes(form, catalog);
  assert.match(results.innerHTML, /Include Gold" checked/);
  assert.equal(count.textContent, '1 palette');
  controls['#zone-palette-search'].value = 'missing';
  updateZonePalettes(form, catalog);
  assert.match(results.innerHTML, /No palettes match/);
  assert.ok(inputs.every(input => input.checked));
});

test('zone palette picker keeps saved inputs separate from search and layout controls', () => {
  const picker = String(zonePalettePicker(catalog, ['Gold']));
  assert.match(picker, /<div hidden data-zone-palette-pool>/);
  assert.equal((picker.match(/name="palettePool"/g) || []).length, 2);
  assert.match(picker, /id="zone-palette-scope"/);
  assert.doesNotMatch(picker, /new-definition|import-palette|paletteVariationPercent/);
});
