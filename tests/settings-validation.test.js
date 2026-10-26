import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSettingsNumbers } from '../public/game-settings.js';

function form(value, valid = true) {
  const input = {
    value,
    valueAsNumber: value.trim() ? Number(value) : NaN,
    validity: { valid },
    validationMessage: '',
    focus() {
      this.focused = true;
    },
    closest() {
      return null;
    }
  };
  return { input, querySelectorAll: () => [input] };
}

test('settings accept valid numeric values, including fractional multipliers', () => {
  for (const value of ['0', '150', '1.5']) assert.doesNotThrow(() => validateSettingsNumbers(form(value)));
});

test('settings reject empty, nonnumeric, infinite and constraint-invalid values before saving', () => {
  for (const [value, valid] of [
    ['', true],
    ['abc', true],
    ['Infinity', true],
    ['-1', false],
    ['1000000001', false],
    ['1.5', false]
  ]) {
    const fields = form(value, valid);
    assert.throws(() => validateSettingsNumbers(fields), /Enter a valid number/);
    assert.equal(fields.input.focused, true);
  }
});
