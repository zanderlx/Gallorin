import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { speciesTraitData } from '../public/species-trait-data.js';
import { traitsEditorPage, readTraitsForm, traitNames, traitRow, filterTraitRows } from '../public/traits-editor.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const row = (category, values) => ({
  querySelector: selector => ({ value: selector === '[data-trait-category]' ? category : values })
});
const form = rows => ({ dataset: { id: 'horse' }, querySelectorAll: () => rows });

test('supplied reference preserves every CSV row and canonicalizes runtime categories', async () => {
  const csv = await readFile(new URL('../docs/references/species-traits.csv', import.meta.url), 'utf8');
  const aliases = { Cosmetics: 'Cosmetic', Manes: 'Mane', Paints: 'Paint', Patterns: 'Pattern', Tails: 'Tail' };
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map(line => line.split(','));
  assert.equal(rows.length, 3402);
  for (const [species, name, category] of rows)
    assert.ok(speciesTraitData[species][aliases[category] || category].includes(name));
  assert.equal(Object.values(speciesTraitData).flatMap(Object.values).flat().length, rows.length);
  assert.equal(catalog.species.length, 46);
  assert.ok(!catalog.species.some(s => s.name === 'LEGO® Horse'));
  for (const species of catalog.species) {
    assert.deepEqual(catalog.traits[species.name], speciesTraitData[species.name]);
    assert.ok(species.traitsComplete);
  }
});

test('line editor creates, renames and removes entries without losing hidden category values', () => {
  assert.deepEqual(traitNames(' Long\r\nLong\n\nShort '), ['Long', 'Short']);
  assert.deepEqual(readTraitsForm(form([row('Mane', 'Long\nShort'), row('Paint', '')])), {
    id: 'horse',
    traits: { Mane: ['Long', 'Short'], Paint: [] }
  });
  assert.deepEqual(readTraitsForm(form([row('Mane', 'Braided')])), { id: 'horse', traits: { Mane: ['Braided'] } });
  assert.throws(() => readTraitsForm(form([row('Paint', 'A'), row('paint', 'B')])), /different name/);
  assert.throws(() => readTraitsForm(form([row('', 'A')])), /category name/);
  assert.throws(() => readTraitsForm(form([row('Mane', 'x'.repeat(101))])), /100/);
});

test('manager handles empty catalogs, escapes content and has no manual default loading', () => {
  assert.match(traitsEditorPage({ species: [] }), /Add a species/);
  assert.doesNotMatch(traitRow('<script>', ['</textarea><script>']), /<script>/);
  const species = { id: 'horse', name: 'Horse', traits: { Mane: ['My custom mane'] } };
  const local = { species: [species] };
  assert.match(traitsEditorPage(local), /My custom mane/);
  assert.doesNotMatch(traitsEditorPage(local, 'horse', true), /load-supplied-traits|Load supplied list/);
  assert.deepEqual(species.traits, { Mane: ['My custom mane'] });
  const saved = traitRow('Mane', ['Braided']);
  assert.match(saved, /type="hidden" data-trait-category value="Mane"/);
  assert.doesNotMatch(saved, /remove-trait-category|Remove category and its traits/);
  assert.match(traitsEditorPage(local), /<p><span data-traits-total>1<\/span> traits<\/p>/);
  assert.doesNotMatch(saved, />Category(?: name)?</);
  assert.match(traitRow(), />Category name<input data-trait-category/);
});

test('search filters by category or trait, updates counts and restores all categories when cleared', () => {
  const search = { value: 'braid' },
    empty = {};
  const cards = [
    ['Mane', 'Braided\nLong'],
    ['Paint', 'Spots']
  ].map(([category, values]) => {
    const fields = {
      '[data-trait-category]': { value: category },
      '[data-trait-values]': { value: values },
      '[data-category-title]': {},
      '[data-trait-count]': {}
    };
    return { querySelector: key => fields[key] };
  });
  const root = {
    querySelectorAll: () => cards,
    querySelector: key => ({ '#trait-search': search, '#trait-no-results': empty })[key]
  };
  filterTraitRows(root);
  assert.equal(cards[0].hidden, false);
  assert.equal(cards[1].hidden, true);
  assert.equal(cards[0].querySelector('[data-trait-count]').textContent, '2 traits');
  search.value = 'missing';
  filterTraitRows(root);
  assert.equal(empty.hidden, false);
  search.value = '';
  filterTraitRows(root);
  assert.ok(cards.every(c => !c.hidden));
});
