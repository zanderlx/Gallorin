import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterMutations,
  mutationCards,
  mutationResults,
  mutationsManagerPage,
  toggleMutations,
  mutationEmoji
} from '../public/mutations-manager.js';
import { libraryEditorPage } from '../public/library-editor.js';
import { catalogFor } from '../public/definitions.js';
import { readFile } from 'node:fs/promises';
const mutations = [
  { id: 'solar', name: 'Solar', type: 'Cosmic', description: 'Sunlit coat', weight: 0 },
  { id: 'springy', name: 'Springy Tendons', type: 'Standard', description: 'Jump higher', weight: 2333 },
  { id: 'lungs', name: 'Powerful Lungs', type: 'Standard', description: 'More stamina', weight: 1675 }
];
test('mutation types form a dropdown and sort into separate named sections', async () => {
  const entries = [
    ...mutations,
    { id: 'special', name: 'Zeta', type: 'Special' },
    { id: 'mutated', name: 'Alpha', type: 'Mutated' }
  ];
  const html = mutationResults(filterMutations(entries, '', '', 'type'));
  assert.ok(html.indexOf('<h2>Standard</h2>') < html.indexOf('<h2>Special</h2>'));
  assert.ok(html.indexOf('<h2>Special</h2>') < html.indexOf('<h2>Mutated</h2>'));
  assert.doesNotMatch(mutationResults(entries, 'az'), /<section/);
  const catalog = catalogFor(
    JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8')),
    {}
  );
  const form = libraryEditorPage('mutations', catalog, { settings: {} }, catalog.mutations[0]);
  assert.match(form, /<select name="type">/);
  for (const type of ['Standard', 'Special', 'Mutated']) assert.match(form, new RegExp(`value="${type}"`));
  assert.doesNotMatch(form, /<input name="type"/);
  assert.doesNotMatch(form, /name="systemId"|System ID/);
  assert.match(form, /Selection Weight \(0 = disabled, higher = more common, lower = less common\)/);
});
test('mutation grid searches descriptions and combines type and sort filters', () => {
  assert.deepEqual(
    filterMutations(mutations, 'stamina', 'Standard').map(m => m.id),
    ['lungs']
  );
  assert.deepEqual(
    filterMutations(mutations, '', 'Standard', 'weight').map(m => m.id),
    ['springy', 'lungs']
  );
  assert.deepEqual(
    filterMutations(mutations, '', '', 'name', 'desc').map(m => m.id),
    ['springy', 'solar', 'lungs']
  );
  assert.deepEqual(filterMutations(mutations, 'sunlit', 'Standard'), []);
  assert.equal(mutations[0].id, 'solar');
});
test('mutation cards expose modal edit actions and safely render names and descriptions', () => {
  const html = mutationCards([{ ...mutations[0], name: '<script>Solar</script>', description: '<img src=x>' }]);
  assert.match(html, /data-action="edit-definition" data-kind="mutations"/);
  assert.match(html, /&lt;script&gt;Solar&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|<img/);
  assert.match(html, /Cosmic/);
});
test('mutation manager shows its card grid without gameplay settings or inline editor', () => {
  const html = mutationsManagerPage({ mutations });
  assert.match(html, /Create Mutation/);
  assert.doesNotMatch(html, /name="ALLOW_DUPLICATE_MUTATIONS"/);

  assert.match(html, /id="mutation-search"/);
  assert.match(html, /id="mutation-type"/);
  assert.match(html, /id="mutation-sort"/);
  assert.match(html, /id="mutation-weights" type="checkbox"/);
  assert.match(html, /data-action="mutation-sort-direction"/);
  assert.doesNotMatch(html, /value="az"|value="za"|Tokens|Weight: /);
  assert.match(mutationCards(mutations, true), /Weight: 2,333/);
  assert.deepEqual(
    filterMutations(mutations, '', '', 'weight', 'asc').map(m => m.id),
    ['solar', 'lungs', 'springy']
  );
  assert.equal((html.match(/data-mutation-card data-id=/g) || []).length, 3);
  assert.doesNotMatch(html, /id="definition-form"|Your collection of options/);
});

test('mutation card, section, and global toggles synchronize independently', () => {
  const controls = [];
  const makeCard = () => {
    const attributes = { 'aria-expanded': 'false' };
    const body = { hidden: true };
    const toggle = {
      dataset: { action: 'toggle-mutation', name: 'Mutation' },
      getAttribute: key => attributes[key],
      setAttribute: (key, value) => (attributes[key] = value)
    };
    const card = { querySelector: selector => (selector === '.personality-toggle' ? toggle : body) };
    toggle.closest = () => card;
    return { card, toggle, body };
  };
  const first = [makeCard(), makeCard()],
    second = [makeCard()];
  const cards = [...first, ...second];
  const makeSection = entries => {
    const section = { querySelectorAll: () => entries.map(entry => entry.card) };
    const button = { dataset: { action: 'toggle-mutation-section' }, closest: () => section, setAttribute() {} };
    controls.push(button);
    return button;
  };
  const section = makeSection(first);
  makeSection(second);
  const global = { dataset: { action: 'toggle-all-mutations' }, setAttribute() {} };
  controls.push(global);
  const root = {
    querySelectorAll: selector => (selector === '[data-mutation-card]' ? cards.map(entry => entry.card) : controls)
  };
  toggleMutations(root, first[0].toggle);
  assert.equal(first[0].body.hidden, false);
  assert.equal(first[1].body.hidden, true);
  assert.equal(section.textContent, 'Hide');
  toggleMutations(root, section);
  assert.ok(first.every(entry => entry.body.hidden));
  assert.equal(section.textContent, 'Show');
  toggleMutations(root, section);
  assert.ok(first.every(entry => !entry.body.hidden));
  assert.equal(second[0].body.hidden, true);
  assert.equal(section.textContent, 'Hide');
  assert.equal(global.textContent, 'Show All');
  toggleMutations(root, global);
  assert.ok(cards.every(entry => !entry.body.hidden));
  assert.equal(global.textContent, 'Hide All');
  toggleMutations(root, global);
  assert.ok(cards.every(entry => entry.body.hidden));
  assert.equal(section.textContent, 'Show');
});
test('all supplied Special mutations use a specific thematic emoji', async () => {
  const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
  for (const mutation of catalog.mutations.filter(m => m.type === 'Special'))
    assert.notEqual(mutationEmoji(mutation), '✨', mutation.name);
  assert.equal(mutationEmoji({ name: 'Alien', type: 'Special' }), '👽');
  assert.equal(mutationEmoji({ name: 'Flowering Sakura', type: 'Special' }), '🌸');
  assert.match(mutationCards(mutations), /mutation-card-name/);
});

test('mutation type is close beneath the name only outside grouped type sorting', () => {
  const expanded = new Set(['springy']);
  const byName = mutationResults(mutations, 'name', false, 'asc', expanded);
  assert.match(byName, /mutation-preview-type/);
  assert.match(byName, /aria-expanded="true"/);
  assert.match(mutationResults(mutations, 'type', false, 'asc', expanded), /mutation-type-expanded-only/);
});
