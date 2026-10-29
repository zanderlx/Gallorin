import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validHex, handleInvalidHex, eyeHexValue } from '../public/hex-inputs.js';

test('eye hex input preserves the prefix and limits typing and pasted values to six hex digits', () => {
  for (const [input, expected] of [
    ['', '#'],
    ['#', '#'],
    ['1234567', '#123456'],
    ['#aBcDeF', '#aBcDeF'],
    ['#12z!34', '#1234'],
    ['##AABBCCDD', '#AABBCC']
  ])
    assert.equal(eyeHexValue(input), expected);
});

test('hex validation accepts six digits and rejects arbitrary input without changing it', () => {
  assert.ok(validHex('#a0B1cF'));
  for (const value of ['', 'anything goes', '#123', '#1234567', '#GGGGGG', 'ABCDEF'])
    assert.equal(validHex(value), false);
});

test('invalid hex save shows one popup, opens its section, and selects the first invalid field', async () => {
  const section = { tagName: 'DETAILS', open: false, parentElement: null };
  let prevented = 0;
  const actions = [];
  const first = {
    value: 'anything goes',
    matches: () => true,
    willValidate: true,
    validity: { valid: false },
    isConnected: true,
    parentElement: section,
    getAttribute: () => 'Tint hex value',
    scrollIntoView: () => actions.push('scroll'),
    focus: () => actions.push('focus'),
    select: () => actions.push('select')
  };
  const second = { ...first, getAttribute: () => 'Other hex value' };
  const form = { querySelectorAll: () => [first, second] };
  first.form = form;
  second.form = form;
  const popups = [];
  for (const target of [first, second])
    handleInvalidHex({ target, preventDefault: () => prevented++ }, message => popups.push(message));
  await Promise.resolve();
  assert.equal(prevented, 2);
  assert.equal(popups.length, 1);
  assert.match(popups[0], /Tint hex value/);
  assert.equal(section.open, true);
  assert.deepEqual(actions, ['scroll', 'focus', 'select']);
  assert.equal(first.value, 'anything goes');
});
