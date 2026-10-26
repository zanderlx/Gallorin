import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { withLocalDefaults } from '../public/local-defaults.js';
import { GameStore } from '../src/store.js';
import { MusicLibrary } from '../src/music-library.js';
import { selectedPlaylist } from '../public/music-context.js';
const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
const musicDefaults = JSON.parse(await readFile(new URL('../data/defaults/music.json', import.meta.url), 'utf8'));
const seeds = musicDefaults.tracks.map(track => ({
  ...track,
  source: fileURLToPath(new URL('../desktop/assets/music/' + track.file, import.meta.url))
}));
const builtin = seeds[0].source;
async function directory(t) {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-override-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('local values override defaults including false, zero, null and empty arrays', () => {
  const base = { enabled: true, value: 90, optional: 'base', list: ['default'], nested: { a: 1, b: 2 } };
  const local = { enabled: false, value: 0, optional: null, list: [], nested: { a: 0 }, extra: 'kept' };
  const result = withLocalDefaults(base, local);
  assert.deepEqual(result, {
    enabled: false,
    value: 0,
    optional: null,
    list: [],
    nested: { a: 0, b: 2 },
    extra: 'kept'
  });
  result.nested.b = 99;
  assert.equal(base.nested.b, 2);
  assert.deepEqual(local.nested, { a: 0 });
});

test('new games use enabled 90-second cooldown; saved values override future defaults', async t => {
  const dir = await directory(t),
    store = await new GameStore(dir, catalog, defaults).init();
  assert.equal(store.state.settings.searchCooldownEnabled, true);
  assert.equal(store.state.settings.searchCooldownSeconds, 90);
  store.state.settings.searchCooldownEnabled = false;
  store.state.settings.searchCooldownSeconds = 12;
  store.state.settings.saleModifiers.traitBonus = 0;
  delete store.state.settings.saleModifiers.mutationBonus;
  await store.persist(store.state);
  let loaded = await new GameStore(dir, catalog, { ...defaults, futureOption: { enabled: true, seconds: 45 } }).init();
  assert.equal(loaded.state.settings.searchCooldownEnabled, false);
  assert.equal(loaded.state.settings.searchCooldownSeconds, 12);
  assert.equal(loaded.state.settings.saleModifiers.traitBonus, 0);
  assert.equal(loaded.state.settings.saleModifiers.mutationBonus, 75);
  assert.deepEqual(loaded.state.settings.futureOption, { enabled: true, seconds: 45 });
  const progress = structuredClone(loaded.state);
  delete loaded.state.settings.searchCooldownEnabled;
  delete loaded.state.settings.searchCooldownSeconds;
  await loaded.persist(loaded.state);
  loaded = await new GameStore(dir, catalog, defaults).init();
  assert.equal(loaded.state.settings.searchCooldownEnabled, true);
  assert.equal(loaded.state.settings.searchCooldownSeconds, 90);
  assert.equal(loaded.state.gold, progress.gold);
  assert.deepEqual(loaded.state.horses, progress.horses);
});

test('missing spawn fields inherit defaults while configured values remain local', async t => {
  const store = await new GameStore(await directory(t), catalog, defaults).init();
  const saved = await store.files.json('spawn-settings.json');
  delete saved.paletteVariationPercent;
  delete saved.maleChance;
  saved.ALLOW_DUPLICATE_MUTATIONS = true;
  saved.tierWeights[4] = 777;
  await store.files.atomic('spawn-settings.json', saved);
  await store.readConfiguration();
  const effective = store.getCatalog().spawning;
  assert.equal(effective.paletteVariationPercent, 25);
  assert.equal(effective.maleChance, 50);
  assert.equal(effective.ALLOW_DUPLICATE_MUTATIONS, true);
  assert.equal(effective.tierWeights[4], 777);
});

test('missing playlists inherit defaults; explicit empty Stables stays empty', async t => {
  const dir = await directory(t),
    store = new MusicLibrary(dir, builtin, seeds, musicDefaults);
  await store.ready;
  const local = await store.read();
  local.assignments.stable = [];
  delete local.assignments['main-menu'];
  delete local.fadeSeconds;
  await store.write(local);
  const updated = {
    ...musicDefaults,
    fadeSeconds: 4,
    assignments: {
      ...musicDefaults.assignments,
      stable: musicDefaults.assignments.town,
      'main-menu': musicDefaults.assignments.town
    }
  };
  const restored = await new MusicLibrary(dir, builtin, seeds, updated).read();
  assert.deepEqual(restored.assignments.stable, []);
  assert.deepEqual(restored.assignments['main-menu'], updated.assignments['main-menu']);
  assert.equal(restored.fadeSeconds, 4);
  assert.deepEqual(selectedPlaylist(restored, 'stable/all'), ['menu']);
});

test('reimported Town retains local track ID without resurrecting the deleted seed', async t => {
  const dir = await directory(t),
    store = new MusicLibrary(dir, builtin, seeds, musicDefaults);
  await store.ready;
  const original = musicDefaults.assignments.town[0];
  await store.remove(original);
  const imported = await store.import('town.mp3', await readFile(seeds.find(t => t.id === original).source));
  const localId = imported.tracks.at(-1).id;
  await store.assign(localId, ['town'], ['town']);
  const restored = await new MusicLibrary(dir, builtin, seeds, musicDefaults).read();
  assert.notEqual(localId, original);
  assert.deepEqual(restored.assignments.town, [localId]);
  assert.equal(
    restored.tracks.some(t => t.id === original),
    false
  );
  assert.deepEqual(selectedPlaylist(restored, 'town/cave'), [localId]);
});
