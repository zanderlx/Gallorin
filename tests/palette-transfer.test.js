import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaletteDocument, readPaletteDocument } from '../public/palette-transfer.js';
import { regions } from '../public/definitions.js';
const palette = {
  id: 'original',
  systemId: 'original-system',
  name: 'Sunset',
  description: 'Keeper notes',
  group: 'Custom',
  global: false,
  speciesIds: ['horse'],
  assetSkins: ['skin'],
  colors: Object.fromEntries(regions.map(region => [region, '#FF8844']))
};
const catalog = { species: [{ id: 'horse' }], palettes: [] };
test('palette documents round-trip all colors, notes, type, scope and metadata without local IDs', () => {
  const document = createPaletteDocument(palette);
  assert.equal(document.format, 'aetherion-palette');
  assert.equal(document.version, 1);
  assert.equal(document.palette.id, undefined);
  assert.equal(document.palette.systemId, undefined);
  const imported = readPaletteDocument(JSON.parse(JSON.stringify(document)), catalog);
  assert.deepEqual(imported.colors, palette.colors);
  assert.equal(imported.description, palette.description);
  assert.deepEqual(imported.speciesIds, palette.speciesIds);
  assert.deepEqual(imported.assetSkins, palette.assetSkins);
  assert.equal(imported.global, false);
  assert.equal(imported.group, 'Custom');
  assert.deepEqual(catalog.palettes, []);
});
test('palette imports reject malformed documents, invalid colors and unavailable species', () => {
  const valid = createPaletteDocument(palette);
  for (const input of [
    null,
    {},
    { ...valid, version: 2 },
    { ...valid, format: 'aetherion-horse' },
    { ...valid, palette: { ...valid.palette, colors: {} } },
    { ...valid, palette: { ...valid.palette, speciesIds: ['missing'] } }
  ])
    assert.throws(() => readPaletteDocument(input, catalog));
});
test('palette imports avoid duplicate names and regenerate internal identifiers', () => {
  const original = createPaletteDocument(palette);
  original.palette.systemId = 'untrusted-id';
  const imported = readPaletteDocument(original, { ...catalog, palettes: [palette, { name: 'Sunset imported' }] });
  assert.equal(imported.name, 'Sunset imported 2');
  assert.equal(imported.systemId, undefined);
  assert.equal(original.palette.name, 'Sunset');
});
