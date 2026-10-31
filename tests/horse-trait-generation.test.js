import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollHorseTrait } from '../src/horse-trait-generation.js';

const species = { name: 'Pony' };
const values = ['A', 'B', 'C', 'D', 'E'];
const roll = (category, cosmic, rng, horse = species, list = values) =>
  rollHorseTrait(category, list, horse, cosmic, rng);

test('mane and tail always select one real species trait', () => {
  for (const category of ['Mane', 'Tail'])
    for (const cosmic of [false, true]) {
      assert.deepEqual(
        roll(category, cosmic, () => 0, species, ['None', 'A', 'A']),
        ['A']
      );
      assert.equal(roll(category, cosmic, () => 0.999).length, 1);
    }
});

test('wild counts cover every permitted count and selections have no duplicates', () => {
  for (const [category, max] of Object.entries({ Pattern: 4, Paint: 2, Cosmetic: 4, Keratin: 1, Ears: 1, Whiskers: 1 }))
    for (let count = 0; count <= max; count++) {
      const result = roll(category, false, () => (count + 0.1) / (max + 1));
      assert.equal(result.length, count);
      assert.equal(new Set(result).size, count);
      assert.ok(result.every(value => values.includes(value)));
    }
});

test('Cosmics maximize pattern, paint and cosmetic without guaranteeing optional categories', () => {
  for (const [category, max] of Object.entries({ Pattern: 4, Paint: 2, Cosmetic: 4 })) {
    assert.equal(roll(category, true, () => 0).length, max);
    assert.deepEqual(
      roll(category, true, () => 0, species, ['A', 'A', 'None']),
      ['A']
    );
  }
  for (const category of ['Keratin', 'Ears', 'Whiskers']) {
    assert.deepEqual(
      roll(category, true, () => 0),
      []
    );
    assert.equal(roll(category, true, () => 0.999).length, 1);
  }
});

test('Unicorn and Anticorn keratin is guaranteed for wild and Cosmic horses', () => {
  for (const name of ['Unicorn', 'Anticorn'])
    for (const cosmic of [false, true]) assert.equal(roll('Keratin', cosmic, () => 0, { name }).length, 1);
});

test('empty lists are safe and explicit counts respect mandatory traits', () => {
  for (const category of ['Mane', 'Tail', 'Pattern', 'Paint', 'Cosmetic', 'Keratin', 'Ears', 'Whiskers'])
    assert.deepEqual(
      roll(category, true, () => 0, species, []),
      []
    );
  assert.throws(() => rollHorseTrait('Pattern', values, species, true, () => 0, 1), /Invalid.*count/);
  assert.throws(() => rollHorseTrait('Keratin', values, { name: 'Unicorn' }, false, () => 0, 0), /Invalid.*count/);
});
