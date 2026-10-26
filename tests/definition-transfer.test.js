import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDefinitionDocument, readDefinitionDocument } from '../public/definition-transfer.js';
const catalog = { eyes: [], mutations: [] };
const entries = {
  eyes: {
    name: 'Rose Eye',
    description: 'Notes',
    rarity: 'Rare',
    colors: ['#AA3355', '#FFDDEE'],
    textureId: 'eye-texture',
    layers: [{ id: 'layer-1', textureId: 'layer', color: '#FFFFFF', opacity: 0.5 }]
  },
  mutations: {
    name: 'Light Step',
    description: 'Description',
    type: 'Standard',
    weight: 12,
    thresholds: { stamina: { min: 5 } },
    sizeShift: 1
  }
};
for (const kind of Object.keys(entries)) {
  test(`${kind} definition files round-trip all editable values without local identifiers`, () => {
    const original = { ...entries[kind], id: 'local-id', systemId: 'local-system' };
    const document = createDefinitionDocument(kind, original);
    assert.equal(document.version, 1);
    assert.equal(document.definition.id, undefined);
    assert.equal(document.definition.systemId, undefined);
    const imported = readDefinitionDocument(kind, JSON.parse(JSON.stringify(document)), catalog);
    for (const [key, value] of Object.entries(entries[kind])) assert.deepEqual(imported[key], value, key);
    assert.deepEqual(catalog[kind], []);
  });
  test(`${kind} imports reject malformed files and avoid duplicate names`, () => {
    const document = createDefinitionDocument(kind, entries[kind]);
    for (const invalid of [
      null,
      {},
      { ...document, version: 2 },
      { ...document, format: 'wrong' },
      { ...document, definition: { name: 'Incomplete' } }
    ])
      assert.throws(() => readDefinitionDocument(kind, invalid, catalog));
    const result = readDefinitionDocument(kind, document, { ...catalog, [kind]: [entries[kind]] });
    assert.equal(result.name, `${entries[kind].name} imported`);
    assert.equal(result.systemId, undefined);
  });
}
test('eye colors and mutations cannot import each others files', () => {
  assert.throws(() =>
    readDefinitionDocument('eyes', createDefinitionDocument('mutations', entries.mutations), catalog)
  );
  assert.throws(() => readDefinitionDocument('mutations', createDefinitionDocument('eyes', entries.eyes), catalog));
});
test('import review uses Import and Cancel Import without reset behavior', async () => {
  const { definitionTransferControls } = await import('../public/definition-transfer-controls.js');
  for (const kind of ['eyes', 'mutations', 'palettes']) {
    const submit = { textContent: 'Save entry' };
    const cancel = { type: 'reset', textContent: 'Cancel changes', dataset: {} };
    const actions = { classList: { add() {} } };
    const form = {
      querySelector: selector =>
        selector === '.form-actions'
          ? actions
          : selector === '[type="submit"]'
            ? submit
            : selector === '[type="reset"]'
              ? cancel
              : null
    };
    definitionTransferControls(form, {}, { imported: true }, kind, 'Definition');
    assert.equal(submit.textContent, 'Import');
    assert.equal(cancel.textContent, 'Cancel Import');
    assert.equal(cancel.type, 'button');
    assert.equal(cancel.dataset.action, 'cancel-definition-import');
  }
});
