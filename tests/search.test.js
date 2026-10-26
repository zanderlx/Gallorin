import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareSearch, searchEntries } from '../public/site-search.js';
test('site search matches multiple keywords, accents and partial words and ranks names first', () => {
  const index = prepareSearch([
    { title: 'Palettes', text: 'Includes natural gold', route: 'dev/colors' },
    { title: 'Natural Gold', text: 'Natural horse palette', route: 'dev/colors', id: 'gold' },
    { title: 'Étoile', text: 'Unicorn with a silver mane', route: 'stable/all', id: 'horse' }
  ]);
  assert.equal(searchEntries(index, 'NATURAL gol')[0].id, 'gold');
  assert.equal(searchEntries(index, 'etoile silver')[0].id, 'horse');
  assert.equal(searchEntries(index, 'natural silver').length, 0);
  assert.equal(searchEntries(index, '   ').length, 0);
  assert.equal(searchEntries(index, 'gold', 1).length, 1);
});
