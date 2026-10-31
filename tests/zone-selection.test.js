import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setZoneSelection,
  zoneSelectionButton,
  zoneAllSelected,
  syncZoneSelectionButtons
} from '../public/zone-selection.js';
import { formSignature } from '../public/form-state.js';

test('bulk selection includes filtered options, preserves other pools and weights, and changes saved form state', () => {
  const species = [false, true].map(checked => ({ tagName: 'INPUT', name: 'speciesPool', type: 'checkbox', checked }));
  const palettes = [false, true].map(checked => ({ tagName: 'INPUT', name: 'palettePool', type: 'checkbox', checked }));
  const visible = [{ checked: false }];
  const weight = { tagName: 'INPUT', name: 'weight:horse', type: 'number', value: '0' };
  const form = {
    id: 'zone-form',
    elements: [...species, ...palettes, weight],
    querySelectorAll: selector =>
      selector === '[name="speciesPool"]' ? species : selector === '[name="palettePool"]' ? palettes : visible
  };
  const before = formSignature(form);
  setZoneSelection(form, 'speciesPool', true);
  assert.ok(species.every(input => input.checked));
  assert.notEqual(formSignature(form), before);
  assert.deepEqual(
    palettes.map(input => input.checked),
    [false, true]
  );
  assert.equal(weight.value, '0');
  setZoneSelection(form, 'speciesPool', false);
  assert.ok(species.every(input => !input.checked));
  setZoneSelection(form, 'palettePool', true);
  assert.ok([...palettes, ...visible].every(input => input.checked));
  setZoneSelection(form, 'palettePool', false);
  assert.ok([...palettes, ...visible].every(input => !input.checked));
});

test('bulk controls have distinct accessible labels and never submit the zone form', () => {
  for (const [pool, label] of [
    ['speciesPool', 'species'],
    ['palettePool', 'palettes']
  ]) {
    const markup = String(zoneSelectionButton(pool, label));
    assert.match(markup, new RegExp(`aria-label="Select All ${label}"`));
    assert.match(String(zoneSelectionButton(pool, label, true)), new RegExp(`aria-label="Unselect All ${label}"`));
    assert.equal((markup.match(/type="button"/g) || []).length, 1);
    assert.equal((markup.match(new RegExp(`data-pool="${pool}"`, 'g')) || []).length, 1);
  }
});

test('toggle follows all, partial, none and empty selections, including manual checkbox changes', () => {
  const inputs = [{ checked: true }, { checked: false }];
  const button = {
    dataset: { pool: 'speciesPool', label: 'species' },
    setAttribute(name, value) {
      this[name] = value;
    }
  };
  const form = { querySelectorAll: selector => (selector.includes('data-action') ? [button] : inputs) };
  assert.equal(zoneAllSelected(form, 'speciesPool'), false);
  syncZoneSelectionButtons(form);
  assert.equal(button.textContent, 'Select All');
  setZoneSelection(form, 'speciesPool', !zoneAllSelected(form, 'speciesPool'));
  syncZoneSelectionButtons(form);
  assert.equal(button.textContent, 'Unselect All');
  assert.equal(button['aria-label'], 'Unselect All species');
  inputs[0].checked = false;
  syncZoneSelectionButtons(form);
  assert.equal(button.textContent, 'Select All');
  inputs[0].checked = true;
  setZoneSelection(form, 'speciesPool', !zoneAllSelected(form, 'speciesPool'));
  assert.ok(inputs.every(input => !input.checked));
  inputs.length = 0;
  syncZoneSelectionButtons(form);
  assert.equal(button.textContent, 'Select All');
  assert.equal(button.disabled, true);
});
