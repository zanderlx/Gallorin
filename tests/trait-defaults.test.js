import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { GameStore } from '../src/store.js';
import { traitDefaultsVersion, withTraitDefaults } from '../src/trait-defaults.js';
import { speciesTraitData } from '../public/species-trait-data.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const write = (path, data) => writeFile(path, JSON.stringify(data, null, 2));

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-trait-defaults-'));
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('gallorin-trait-defaults-'));
    await rm(directory, { recursive: true, force: true });
  });
  const store = await new GameStore(directory, catalog, defaults).init();
  return {
    directory,
    store,
    save: join(directory, 'player/save.json'),
    species: join(directory, 'config/species.json')
  };
}

test('fresh installs receive default traits and later removals remain removed after restart', async t => {
  const f = await fixture(t);
  assert.equal(f.store.state.traitDefaultsVersion, traitDefaultsVersion);
  assert.deepEqual(f.store.getCatalog().species.find(s => s.id === 'ghoulsteed').traits.Ears, [
    'Lupine Ears',
    'Bat Ears'
  ]);
  const species = f.store.getCatalog().species.find(s => s.id === 'horse');
  assert.deepEqual(species.traits, speciesTraitData.Horse);
  await f.store.action('save-traits', { id: species.id, traits: {} });
  const loaded = await new GameStore(f.directory, catalog, defaults).init();
  assert.deepEqual(loaded.getCatalog().species.find(s => s.id === species.id).traits, {});
  assert.ok(!(await readdir(join(f.directory, 'backups'))).some(n => n.startsWith('pre-trait-defaults-')));
});

test('legacy installations automatically receive every supplied list with backups and unchanged horse snapshots', async t => {
  const f = await fixture(t);
  await f.store.action('visit', { locationId: 'aetherion' });
  await f.store.action('catch', { id: f.store.state.encounters.aetherion[0].id });
  const save = await json(f.save);
  const horses = structuredClone(save.horses);
  delete save.traitDefaultsVersion;
  await write(f.save, save);
  const species = await json(f.species);
  for (const entry of species) {
    entry.traits = {};
    entry.traitsComplete = false;
  }
  species[0].name = 'Renamed Akhal';
  species[0].traits = { Mane: ['Custom braid'], Custom: ['My trait'] };
  await write(f.species, species);
  const zones = await readFile(join(f.directory, 'config/zones/aetherion.json'), 'utf8');
  const loaded = await new GameStore(f.directory, catalog, defaults).init();
  for (const original of catalog.species) {
    const updated = loaded.getCatalog().species.find(s => s.id === original.id);
    for (const [category, names] of Object.entries(speciesTraitData[original.name]))
      for (const name of names) assert.ok(updated.traits[category].includes(name));
  }
  const renamed = loaded.getCatalog().species.find(s => s.id === species[0].id);
  assert.equal(renamed.name, 'Renamed Akhal');
  assert.ok(renamed.traits.Mane.includes('Custom braid'));
  assert.deepEqual(renamed.traits.Custom, ['My trait']);
  assert.deepEqual(loaded.state.horses, horses);
  assert.equal(await readFile(join(f.directory, 'config/zones/aetherion.json'), 'utf8'), zones);
  const backupFiles = (await readdir(join(f.directory, 'backups'))).filter(n => n.startsWith('pre-trait-defaults-'));
  assert.equal(backupFiles.length, 2);
  assert.deepEqual(
    await json(
      join(
        f.directory,
        'backups',
        backupFiles.find(n => n.endsWith('-species.json'))
      )
    ),
    species
  );
  const before = await readFile(f.species, 'utf8');
  await new GameStore(f.directory, catalog, defaults).init();
  assert.equal(await readFile(f.species, 'utf8'), before);
});

test('default merging preserves custom species and validates merged category limits', () => {
  const custom = { id: 'custom-horse', name: 'Custom horse', traits: { Mane: ['Own mane'] } };
  assert.deepEqual(withTraitDefaults(catalog, [custom]), [custom]);
  const horse = { id: 'horse', name: 'Horse', traits: { Mane: Array.from({ length: 100 }, (_, i) => 'Custom ' + i) } };
  const before = structuredClone(horse);
  assert.throws(() => withTraitDefaults(catalog, [horse]), /100/);
  assert.deepEqual(horse, before);
});

test('a failed default upgrade rolls back the registry and leaves its marker unset for retry', async t => {
  const f = await fixture(t);
  delete f.store.state.traitDefaultsVersion;
  await write(f.save, f.store.snapshot());
  const species = await json(f.species);
  species[0].traits = {};
  await write(f.species, species);
  const beforeSave = await readFile(f.save, 'utf8');
  const beforeSpecies = await readFile(f.species, 'utf8');
  const persist = f.store.persist.bind(f.store);
  f.store.persist = async () => {
    throw new Error('Simulated save failure');
  };
  await assert.rejects(f.store.addDefaultTraits(), /Simulated save failure/);
  assert.deepEqual(await json(f.species), JSON.parse(beforeSpecies));
  assert.equal(await readFile(f.save, 'utf8'), beforeSave);
  assert.equal(f.store.state.traitDefaultsVersion, undefined);
  f.store.persist = persist;
  await f.store.addDefaultTraits();
  assert.equal(f.store.state.traitDefaultsVersion, traitDefaultsVersion);
  assert.ok((await json(f.species))[0].traits.Mane.length > 0);
});
