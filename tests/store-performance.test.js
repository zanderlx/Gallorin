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

test('music uploads stream to disk, reject oversized or invalid files, and leave no temporary files', async t => {
  const { MusicLibrary } = await import('../src/music-library.js');
  const { Readable } = await import('node:stream');
  const { readdir } = await import('node:fs/promises');
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-upload-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const music = new MusicLibrary(directory);
  const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(2048)]);
  const library = await music.upload('song.mp3', Readable.from([mp3.subarray(0, 1000), mp3.subarray(1000)]));
  assert.equal(library.tracks.length, 1);
  await assert.rejects(music.upload('big.mp3', Readable.from([mp3, mp3]), 'music', 3000), { code: 'TOO_LARGE' });
  await assert.rejects(music.upload('fake.mp3', Readable.from([Buffer.from('not audio')])), /valid MP3/);
  const files = await readdir(join(directory, 'music'));
  assert.deepEqual(
    files.filter(name => name.endsWith('.tmp')),
    []
  );
  assert.equal(files.filter(name => name.endsWith('.mp3')).length, 1);
  assert.equal((await music.read()).tracks.length, 1);
});
