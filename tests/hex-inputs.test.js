import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHexText, sanitizeHexInput } from '../public/hex-inputs.js';

test('hex entry accepts only six uppercase hexadecimal digits with one leading hash', () => {
  assert.equal(normalizeHexText('#a0b1cf'), '#A0B1CF');
  assert.equal(normalizeHexText('123abc'), '#123ABC');
  assert.equal(normalizeHexText('##G!1z2?3h4i5j6'), '#123456');
  assert.equal(normalizeHexText('#123456789'), '#123456');
  assert.equal(normalizeHexText(''), '#');
});

test('hex fields filter typing and paste, keep the caret, and block incomplete values', () => {
  const field = {
    value: '#aG12',
    selectionStart: 5,
    setSelectionRange(start) {
      this.caret = start;
    }
  };
  assert.equal(sanitizeHexInput(field), false);
  assert.equal(field.value, '#A12');
  assert.equal(field.caret, 4);
  field.value = '#abcdef';
  field.selectionStart = 7;
  assert.equal(sanitizeHexInput(field), true);
  assert.equal(field.value, '#ABCDEF');
});
