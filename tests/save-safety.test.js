import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../src/store.js';
import { pruneBackups, replaceDurable } from '../src/durable-file.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
const fixtures = new URL('./fixtures/saves/', import.meta.url);

async function tempDir(t) {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-save-safety-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
const open = (directory, options = {}) =>
  new GameStore(directory, catalog, defaults, { rng: () => 0.5, ...options }).init();
const backups = async directory => (await readdir(join(directory, 'backups'))).sort();

test('replaceDurable replaces a file atomically and leaves no temporary files', async t => {
  const directory = await tempDir(t);
  const file = join(directory, 'value.json');
  await replaceDurable(file, 'first');
  await replaceDurable(file, 'second');
  assert.equal(await readFile(file, 'utf8'), 'second');
  assert.deepEqual(await readdir(directory), ['value.json']);
});

test('a session snapshots before its first change, at most hourly, and again next session', async t => {
  const directory = await tempDir(t);
  const store = await open(directory);
  await store.action('visit', { locationId: 'aetherion' });
  await store.action('favorite', { id: 'missing' }).catch(() => {});
  await store.action('backup');
  const first = (await backups(directory)).filter(name => name.startsWith('snapshot-'));
  assert.equal(first.length, 1);
  assert.ok((await backups(directory)).includes('previous-save.json'));

  const next = await open(directory);
  await new Promise(resolve => setTimeout(resolve, 5));
  await next.action('visit', { locationId: 'aetherion' });
  assert.equal((await backups(directory)).filter(name => name.startsWith('snapshot-')).length, 2);
});

test('pruning keeps the newest sets per prefix and removes companion files together', async t => {
  const directory = await tempDir(t);
  for (let i = 1; i <= 23; i++) {
    await writeFile(join(directory, `pre-palette-additions-${1000 + i}-id${i}.json`), '{}');
    await writeFile(join(directory, `pre-palette-additions-${1000 + i}-id${i}-palettes.json`), '[]');
  }
  await writeFile(join(directory, 'save-1-keep.json'), '{}');
  await pruneBackups(directory, 'pre-palette-additions-', 20);
  const left = await readdir(directory);
  assert.equal(left.filter(name => name.startsWith('pre-palette-additions-')).length, 40);
  assert.ok(!left.some(name => name.includes('-1001-') || name.includes('-1003-')));
  assert.ok(left.includes('pre-palette-additions-1023-id23-palettes.json'));
  assert.ok(left.includes('save-1-keep.json'));
});

test('startup prunes old upgrade backups but never manual save backups', async t => {
  const directory = await tempDir(t);
  await mkdir(join(directory, 'backups'), { recursive: true });
  for (let i = 1; i <= 25; i++) {
    await writeFile(join(directory, 'backups', `pre-horse-skills-${1000 + i}-x.json`), '{}');
    await writeFile(join(directory, 'backups', `save-${1000 + i}-x.json`), '{}');
  }
  await open(directory);
  const names = await backups(directory);
  assert.equal(names.filter(name => name.startsWith('pre-horse-skills-')).length, 20);
  assert.equal(names.filter(name => name.startsWith('save-')).length, 25);
});

for (const name of ['current-with-history.json', 'before-palette-additions.json', 'missing-newer-settings.json']) {
  test(`golden save ${name} loads and upgrades without losing horses or gold`, async t => {
    const directory = await tempDir(t);
    await mkdir(join(directory, 'player'), { recursive: true });
    await copyFile(new URL(name, fixtures), join(directory, 'player', 'save.json'));
    const original = JSON.parse(await readFile(new URL(name, fixtures), 'utf8'));
    const store = await open(directory);
    const ids = save => [...save.horses, ...save.sold].map(horse => horse.id).sort();
    assert.deepEqual(ids(store.state), ids(original));
    assert.equal(store.state.gold, original.gold);
    assert.equal(store.state.transactions.length, original.transactions.length);
    assert.deepEqual(
      store.state.horses.map(horse => horse.name),
      original.horses.map(horse => horse.name)
    );
    for (const key of Object.keys(defaults)) assert.ok(key in store.state.settings, `settings.${key} filled in`);
    assert.ok(store.state.paletteAdditionsVersion >= 1);
    const saved = JSON.parse(await readFile(join(directory, 'player', 'save.json'), 'utf8'));
    assert.deepEqual(ids(saved), ids(original));
  });
}

test('logs over the size cap move to a single .1 copy', async t => {
  const { rotateLog } = await import('../src/log-rotation.js');
  const directory = await tempDir(t);
  const file = join(directory, 'desktop.log');
  rotateLog(file, 10);
  await writeFile(file, 'small');
  rotateLog(file, 10);
  assert.deepEqual(await readdir(directory), ['desktop.log']);
  await writeFile(file, 'more than ten bytes');
  rotateLog(file, 10);
  assert.deepEqual((await readdir(directory)).sort(), ['desktop.log.1']);
  await writeFile(file, 'another long entry');
  rotateLog(file, 10);
  assert.equal(await readFile(file + '.1', 'utf8'), 'another long entry');
});
