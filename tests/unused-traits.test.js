import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { GameStore } from '../src/store.js';
import { horseRecords } from '../public/horse-fields.js';
import { removeUnusedTraits } from '../public/unused-traits.js';
import { createHorseDocument, readHorseDocument } from '../public/horse-transfer.js';
import { regenerateHorse } from '../src/horse-regeneration.js';
import { validateDefinition } from '../public/definitions.js';
import { horseUpdateFields } from '../public/horse-update-fields.js';
import { spawnHorse } from '../src/spawning.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-unused-traits-'));
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('gallorin-unused-traits-'));
    await rm(directory, { recursive: true, force: true });
  });
  return { directory, store: await new GameStore(directory, catalog, defaults).init() };
}

test('startup removes Wings from all species, owned/sold horses and encounters with backups and no other horse changes', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  await store.action('catch', { id: store.state.encounters.aetherion[0].id });
  await store.action('sell', { id: store.state.horses[0].id });
  await store.action('catch', { id: store.state.encounters.aetherion[0].id });
  const legacy = store.snapshot();
  for (const horse of horseRecords(legacy)) horse.traits.Wings = ['Feathered Head Wings'];
  const expected = structuredClone(horseRecords(legacy));
  expected.forEach(removeUnusedTraits);
  await writeFile(join(directory, 'player/save.json'), JSON.stringify(legacy));
  const speciesPath = join(directory, 'config/species.json');
  const species = JSON.parse(await readFile(speciesPath, 'utf8'));
  for (const entry of species) entry.traits.Wings = ['Feathered Head Wings'];
  await writeFile(speciesPath, JSON.stringify(species));
  const loaded = await new GameStore(directory, catalog, defaults).init();
  assert.deepEqual(horseRecords(loaded.state), expected);
  assert.ok(loaded.getCatalog().species.every(entry => !Object.hasOwn(entry.traits, 'Wings')));
  assert.ok(JSON.parse(await readFile(speciesPath, 'utf8')).every(entry => !Object.hasOwn(entry.traits, 'Wings')));
  const backups = (await readdir(join(directory, 'backups'))).filter(name => name.startsWith('pre-unused-traits-'));
  assert.ok(backups.some(name => name.endsWith('-species.json')));
  assert.ok(backups.length >= 3);
  const saved = await readFile(join(directory, 'player/save.json'), 'utf8');
  await new GameStore(directory, catalog, defaults).init();
  assert.equal(await readFile(join(directory, 'player/save.json'), 'utf8'), saved);
});

test('imports, regeneration and definition edits cannot restore Wings; cosmetic names and wing skills remain', async t => {
  const { store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const horse = structuredClone(store.state.encounters.aetherion[0]);
  assert.equal(Object.hasOwn(horse.traits, 'Wings'), false);
  horse.traits.Wings = ['Unused'];
  horse.traits.Cosmetic = ['Crystal Face Wings'];
  const imported = readHorseDocument(createHorseDocument(horse));
  assert.equal(Object.hasOwn(imported.traits, 'Wings'), false);
  assert.deepEqual(imported.traits.Cosmetic, ['Crystal Face Wings']);
  assert.deepEqual(imported.skills.wing, horse.skills.wing);
  const result = regenerateHorse(horse, {}, store.getCatalog(), store.snapshot());
  assert.equal(Object.hasOwn(result.horse.traits, 'Wings'), false);
  assert.deepEqual(result.horse.traits.Cosmetic, horse.traits.Cosmetic);
  assert.deepEqual(result.horse.skills.wing, horse.skills.wing);
  const species = store.getCatalog().species[0];
  const definition = validateDefinition('species', { ...species, traits: { ...species.traits, Wings: ['Unused'] } });
  assert.equal(Object.hasOwn(definition.traits, 'Wings'), false);
  const raw = store.getCatalog();
  for (const entry of raw.species) entry.traits.Wings = ['Unused'];
  const generated = spawnHorse(
    raw,
    raw.locations.find(zone => zone.id === 'aetherion'),
    () => 0.5
  );
  assert.equal(Object.hasOwn(generated.traits, 'Wings'), false);
  assert.equal(
    horseUpdateFields.some(field => field.key === 'trait:Wings'),
    false
  );
});

test('failed species cleanup rolls back the registry and preserves the player save', async t => {
  const { directory, store } = await fixture(t);
  const path = join(directory, 'config/species.json');
  const species = JSON.parse(await readFile(path, 'utf8'));
  species[0].traits.Wings = ['Unused'];
  await writeFile(path, JSON.stringify(species));
  const save = await readFile(join(directory, 'player/save.json'), 'utf8');
  store.persist = async () => {
    throw new Error('Simulated cleanup failure');
  };
  await assert.rejects(store.removeUnusedSpeciesTraits(), /Simulated cleanup failure/);
  assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), species);
  assert.equal(await readFile(join(directory, 'player/save.json'), 'utf8'), save);
});
