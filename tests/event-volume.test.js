import { createMusicEngine } from '../public/music-engine.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MusicLibrary } from '../src/music-library.js';
import { effectForEvent } from '../public/music-effects.js';
const bytes = Buffer.from('ID3test effect');
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-event-volume-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new MusicLibrary(dir);
  const library = await store.import('quiet.mp3', bytes, 'effect');
  const track = library.tracks[0];
  await store.update(track.id, { name: 'Quiet', artist: 'Artist', volumePercent: 25 });
  return { dir, store, track };
}
test('assigning an empty event starts at 100 without changing shared sound or existing default events', async t => {
  const { dir, store, track } = await fixture(t);
  const legacy = await store.read();
  legacy.assignments['effect/horse-sold'] = [track.id];
  await store.write(legacy);
  const fresh = await store.assign(track.id, ['effect/horse-sold', 'effect/button-click'], ['default']);
  assert.equal(effectForEvent(fresh, 'effect/horse-sold').volumePercent, 25);
  assert.equal(effectForEvent(fresh, 'effect/button-click').volumePercent, 100);
  assert.equal(fresh.tracks[0].volumePercent, 25);
  const saved = await new MusicLibrary(dir).read();
  assert.equal(effectForEvent(saved, 'effect/button-click').volumePercent, 100);
  await store.eventVolume('effect/button-click', 0);
  assert.equal(effectForEvent(await store.read(), 'effect/button-click').volumePercent, 0);
  assert.equal(effectForEvent(await store.read(), 'effect/horse-sold').volumePercent, 25);
});
test('replacing preserves event volume; clearing and assigning again resets to 100', async t => {
  const { store, track } = await fixture(t);
  await store.assign(track.id, ['effect/button-click'], ['default']);
  await store.eventVolume('effect/button-click', 40);
  const other = (await store.import('other.mp3', bytes, 'effect')).tracks[1];
  await store.assign(other.id, ['effect/button-click'], ['default']);
  assert.equal(effectForEvent(await store.read(), 'effect/button-click').volumePercent, 40);
  await store.assign(other.id, [], ['default']);
  await store.assign(track.id, ['effect/button-click'], ['default']);
  assert.equal(effectForEvent(await store.read(), 'effect/button-click').volumePercent, 100);
});
test('settings and inline assignment paths start empty events at 100', async t => {
  const { store, track } = await fixture(t);
  await store.settings({ assignments: { 'effect/button-click': [track.id] }, fadeSeconds: 2 }, ['default']);
  assert.equal(effectForEvent(await store.read(), 'effect/button-click').volumePercent, 100);
  await store.assign(track.id, [], ['default']);
  await store.update(track.id, { name: 'Quiet', artist: 'Artist', eventIds: ['effect/button-click'] });
  assert.equal(effectForEvent(await store.read(), 'effect/button-click').volumePercent, 100);
});
test('invalid event volume leaves the library unchanged', async t => {
  const { dir, store, track } = await fixture(t);
  await store.assign(track.id, ['effect/button-click'], ['default']);
  const file = join(dir, 'music/library.json');
  const before = await readFile(file, 'utf8');
  for (const value of [-1, 101, '50', null, NaN]) await assert.rejects(store.eventVolume('effect/button-click', value));
  await assert.rejects(store.eventVolume('effect/horse-sold', 50));
  assert.equal(await readFile(file, 'utf8'), before);
});
test('seeding existing default event volumes preserves them, including zero', async t => {
  const { dir, track } = await fixture(t);
  const path = join(dir, 'music/library.json');
  const saved = JSON.parse(await readFile(path, 'utf8'));
  delete saved.assignments['effect/button-click'];
  await writeFile(path, JSON.stringify(saved));
  const store = new MusicLibrary(dir, undefined, [], {
    assignments: { 'effect/button-click': [track.id] },
    eventVolumes: { 'effect/button-click': 0 }
  });
  assert.equal(effectForEvent(await store.read(), 'effect/button-click').volumePercent, 0);
});

test('live event volume updates do not affect another event playing the same file', async () => {
  const effects = [];
  const audio = () => ({
    volume: 1,
    muted: false,
    currentTime: 0,
    duration: 5,
    async play() {},
    pause() {},
    removeAttribute() {},
    load() {}
  });
  const engine = createMusicEngine({
    audio: audio(),
    makeAudio: () => {
      const effect = audio();
      effects.push(effect);
      return effect;
    },
    frame: () => {},
    clock: () => 0
  });
  await engine.command({ type: 'sfx-volume', value: 0.5 });
  await engine.command({
    type: 'effect',
    eventId: 'effect/button-click',
    track: { id: 'shared', url: 'shared', volumePercent: 100 }
  });
  await engine.command({
    type: 'effect',
    eventId: 'effect/horse-sold',
    track: { id: 'shared', url: 'shared', volumePercent: 40 }
  });
  await engine.command({ type: 'effect-level', id: 'shared', eventId: 'effect/button-click', value: 0.6 });
  assert.equal(effects[0].volume, 0.3);
  assert.equal(effects[1].volume, 0.2);
});
