import { defaultSpawnSettings } from '../public/spawn-config.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { varyPalette } from '../public/palette-variation.js';
import { synchronizeCosmicPalettes } from '../src/cosmic-palettes.js';
import { spawnHorse } from '../src/spawning.js';
import { catalogFor } from '../public/definitions.js';
import { createHorseDocument, readHorseDocument } from '../public/horse-transfer.js';
import { readFile } from 'node:fs/promises';
const catalog = catalogFor(
  JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8')),
  {}
);
const channels = hex =>
  hex
    .slice(1)
    .match(/../g)
    .map(x => parseInt(x, 16));
test('generated shades stay near base colors, preserve gray hues and leave definitions untouched', () => {
  const palette = { id: 'sample', colors: { Pink: '#F4A4C8', Gold: '#F5D66E', White: '#FFFFFF', Black: '#000000' } };
  const before = structuredClone(palette);
  for (const roll of [0, 0.1, 0.5, 0.9, 0.999999]) {
    const varied = varyPalette(palette, () => roll);
    for (const [region, hex] of Object.entries(varied.colors)) {
      assert.match(hex, /^#[0-9A-F]{6}$/);
      channels(hex).forEach((value, i) => assert.ok(Math.abs(value - channels(palette.colors[region])[i]) <= 64));
    }
    for (const region of ['White', 'Black']) assert.equal(new Set(channels(varied.colors[region])).size, 1);
  }
  assert.deepEqual(palette, before);
  assert.deepEqual(varyPalette(palette, () => 0.5).colors, palette.colors);
  assert.notDeepEqual(varyPalette(palette, () => 0).colors, varyPalette(palette, () => 1).colors);
});
test('spawned Cosmic shades survive synchronization and JSON export/import', () => {
  let first = true;
  const horse = spawnHorse(
    catalog,
    catalog.locations.find(z => z.id === 'aetherion'),
    () => {
      if (first) {
        first = false;
        return 0.0015;
      }
      return 0.25;
    }
  );
  const definition = catalog.palettes.find(p => p.id === horse.paletteId);
  assert.equal(horse.specialSpawn, 'Lunar');
  assert.notDeepEqual(horse.palette.colors, definition.colors);
  assert.deepEqual(horse.palette.colorVariation.baseColors, definition.colors);
  const original = structuredClone(horse.palette.colors);
  assert.equal(synchronizeCosmicPalettes([horse], catalog), 0);
  assert.deepEqual(horse.palette.colors, original);
  const imported = readHorseDocument(createHorseDocument(horse));
  synchronizeCosmicPalettes([imported], catalog);
  assert.deepEqual(imported.palette.colors, original);
  assert.deepEqual(definition.colors, horse.palette.colorVariation.baseColors);
});

test('variation strength supports zero and adjustable limits', () => {
  const palette = { colors: { Gold: '#F5D66E' } };
  assert.deepEqual(varyPalette(palette, () => 0, 0).colors, palette.colors);
  for (const percent of [5, 15, 25, 100]) {
    const hex = varyPalette(palette, () => 0, percent).colors.Gold;
    channels(hex).forEach((value, i) =>
      assert.ok(Math.abs(value - channels(palette.colors.Gold)[i]) <= Math.ceil((255 * percent) / 100))
    );
  }
  for (const value of [-1, 101, NaN, '25']) assert.throws(() => varyPalette(palette, () => 0, value));
});

test('a palette override wins over the global variation strength, including zero', () => {
  const registry = structuredClone(catalog);
  registry.spawning = { ...structuredClone(defaultSpawnSettings), paletteVariationPercent: 100 };
  registry.palettes.forEach(p => (p.variationPercent = 0));
  const horse = spawnHorse(
    registry,
    registry.locations.find(z => z.id === 'aetherion'),
    () => 0.25
  );
  assert.deepEqual(horse.palette.colors, registry.palettes.find(p => p.id === horse.paletteId).colors);
  registry.palettes.forEach(p => (p.variationPercent = 25));
  const varied = spawnHorse(
    registry,
    registry.locations.find(z => z.id === 'aetherion'),
    () => 0.25
  );
  assert.notDeepEqual(varied.palette.colors, registry.palettes.find(p => p.id === varied.paletteId).colors);
});
