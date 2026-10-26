import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../src/store.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
async function open(t) {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-performance-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, store: await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init() };
}

test('unchanged configuration is not re-read on each request', async t => {
  const { store } = await open(t);
  let reads = 0;
  const read = store.files.read.bind(store.files);
  store.files.read = base => {
    reads++;
    return read(base);
  };
  await store.refreshConfiguration();
  await store.action('visit', { locationId: 'aetherion' });
  await store.refreshConfiguration();
  assert.equal(reads, 0);
});

test('hand edits to configuration files are picked up while running', async t => {
  const { directory, store } = await open(t);
  const file = join(directory, 'config', 'zones', 'aetherion.json');
  const zone = JSON.parse(await readFile(file, 'utf8'));
  await writeFile(file, JSON.stringify({ ...zone, name: 'Hand Edited Woods' }, null, 2));
  await store.refreshConfiguration();
  assert.equal(store.getCatalog().locations.find(location => location.id === 'aetherion').name, 'Hand Edited Woods');
});

test('the game picks up its own configuration edits', async t => {
  const { store } = await open(t);
  const species = store.getCatalog().species[0];
  await store.action('save-definition', {
    kind: 'species',
    id: species.id,
    values: { ...species, name: 'Renamed Species' }
  });
  await store.refreshConfiguration();
  assert.ok(store.getCatalog().species.some(entry => entry.name === 'Renamed Species'));
});
