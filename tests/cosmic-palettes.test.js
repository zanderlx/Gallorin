import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosmicPalette, synchronizeCosmicPalettes } from '../src/cosmic-palettes.js';
import { catalogFor } from '../public/definitions.js';
import { spawnHorse } from '../src/spawning.js';
import { readFile } from 'node:fs/promises';
const catalog = catalogFor(
  JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8')),
  {}
);

test('all five Cosmic spawns use their matching palette irrespective of zone palette pool', () => {
  for (const [roll, name] of [
    [0, 'Solar'],
    [0.0015, 'Lunar'],
    [0.0022, 'Heavenly'],
    [0.0027, 'Void'],
    [0.0031, 'Astral']
  ]) {
    let first = true;
    const horse = spawnHorse(
      catalog,
      catalog.locations.find(z => z.id === 'aetherion'),
      () => {
        if (first) {
          first = false;
          return roll;
        }
        return 0.5;
      }
    );
    assert.equal(horse.specialSpawn, name);
    assert.equal(horse.palette.name, name);
    assert.equal(horse.paletteId, horse.palette.id);
    assert.deepEqual(horse.palette.colors, catalog.palettes.find(p => p.name === name).colors);
  }
});

test('legacy mutation names map case-insensitively and migration is idempotent', () => {
  const horses = ['Solar', 'Lunar', 'Heavenly', 'Void', 'Astral'].map((name, i) => ({
    id: String(i),
    mutations: [i % 2 ? name.toLowerCase() : { name }],
    palette: { name: 'Old' },
    paletteId: 'old',
    skinId: 'old',
    notes: 'Keep me',
    soldFor: 123
  }));
  const normal = { mutations: ['Mutated'], palette: { name: 'Lunar' } };
  horses.push(normal);
  assert.equal(synchronizeCosmicPalettes(horses, catalog), 5);
  for (const horse of horses.slice(0, 5)) {
    assert.equal(horse.paletteId, cosmicPalette(horse, catalog).id);
    assert.equal(horse.notes, 'Keep me');
    assert.equal(horse.soldFor, 123);
  }
  assert.deepEqual(normal, { mutations: ['Mutated'], palette: { name: 'Lunar' } });
  assert.equal(synchronizeCosmicPalettes(horses, catalog), 0);
});
