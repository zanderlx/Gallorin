import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackForms, updateFormState, formBaseline, restoreBaseline, formSignature } from '../public/form-state.js';
test('save and cancel controls follow real changes, reverting values and transferred baselines', () => {
  const fields = [
    { tagName: 'INPUT', name: 'gold', type: 'number', value: '300' },
    { tagName: 'INPUT', name: 'enabled', type: 'checkbox', checked: false },
    { tagName: 'TEXTAREA', name: 'about', value: 'Hello' }
  ];
  const buttons = [{ hidden: false }, { hidden: false }];
  const form = { elements: fields, querySelectorAll: () => buttons };
  trackForms({ querySelectorAll: () => [form] });
  assert.ok(buttons.every(b => b.hidden));
  fields[0].value = '400';
  updateFormState(form);
  assert.ok(buttons.every(b => !b.hidden));
  fields[0].value = '300';
  updateFormState(form);
  assert.ok(buttons.every(b => b.hidden));
  fields[1].checked = true;
  updateFormState(form);
  assert.ok(buttons.every(b => !b.hidden));
  const freshForm = { ...form, elements: structuredClone(fields) };
  trackForms({ querySelectorAll: () => [freshForm] });
  restoreBaseline(freshForm, formBaseline(form));
  assert.ok(buttons.every(b => !b.hidden));
});

test('equal palette variance numbers do not count as unsaved edits', () => {
  const variance = { tagName: 'INPUT', name: 'variationPercent', type: 'number', value: '35' };
  const name = { tagName: 'INPUT', name: 'name', type: 'text', value: 'Gold' };
  const form = { elements: [variance, name] };
  const baseline = formSignature(form);
  for (const value of ['35', '35.0', '035']) {
    variance.value = value;
    assert.equal(formSignature(form), baseline);
  }
  variance.value = '36';
  assert.notEqual(formSignature(form), baseline);
  variance.value = '35';
  name.value = 'New Gold';
  assert.notEqual(formSignature(form), baseline);
});

test('zone browsing filters do not count as edits to a zone', () => {
  const name = { tagName: 'INPUT', name: 'name', type: 'text', value: 'Quiet woods' };
  const search = { tagName: 'INPUT', name: '', type: 'search', value: '' };
  const rarity = { tagName: 'SELECT', name: '', value: '' };
  const weight = { tagName: 'INPUT', name: 'weight:unicorn', type: 'number', value: '100' };
  const form = { id: 'zone-form', elements: [name, search, rarity, weight] };
  const baseline = formSignature(form);
  search.value = 'Unicorn';
  rarity.value = '2';
  assert.equal(formSignature(form), baseline);
  weight.value = '200';
  assert.notEqual(formSignature(form), baseline);
});
