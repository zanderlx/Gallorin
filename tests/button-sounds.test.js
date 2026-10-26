import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { soundEffectGroups, effectForEvent } from '../public/music-effects.js';
import { MusicLibrary } from '../src/music-library.js';
import { musicManagerPage } from '../public/music-manager.js';

test('Button Click event is configurable and defaults to the supplied click sound', async t => {
  const defaults = JSON.parse(await readFile(new URL('../data/defaults/music.json', import.meta.url), 'utf8'));
  const bundled = effectForEvent({ ...defaults, tracks: defaults.tracks }, 'effect/button-click');
  assert.equal(bundled.file, 'justsomesounds-click-sound-432501.mp3');
  assert.ok(bundled.durationSeconds > 0);
  const bytes = await readFile(new URL('../desktop/assets/music/' + bundled.file, import.meta.url));
  assert.ok(bytes.length > 100);
  assert.ok(
    soundEffectGroups
      .flatMap(group => group.items)
      .some(event => event.id === 'effect/button-click' && event.name === 'Button Click')
  );
  assert.match(musicManagerPage({ tracks: [], assignments: {} }, []), /Button Click/);
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-button-sound-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const library = new MusicLibrary(dir);
  const imported = await library.import('click.mp3', Buffer.from('ID3test click'), 'effect');
  const track = imported.tracks[0];
  await library.assign(track.id, ['effect/button-click', 'effect/horse-sold'], ['default']);
  const saved = await new MusicLibrary(dir).read();
  assert.equal(effectForEvent(saved, 'effect/button-click').id, track.id);
  assert.equal(effectForEvent(saved, 'effect/horse-sold').id, track.id);
});

test('new click default is seeded once and an explicitly cleared click event stays cleared', async t => {
  const defaults = JSON.parse(await readFile(new URL('../data/defaults/music.json', import.meta.url), 'utf8'));
  const seed = defaults.tracks.find(track => track.id === defaults.assignments['effect/button-click'][0]);
  const { fileURLToPath } = await import('node:url');
  const seeds = [{ ...seed, source: fileURLToPath(new URL('../desktop/assets/music/' + seed.file, import.meta.url)) }];
  const eventDefaults = { assignments: { 'effect/button-click': [seed.id] } };
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-click-default-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new MusicLibrary(dir, undefined, seeds, eventDefaults);
  assert.equal(effectForEvent(await store.read(), 'effect/button-click').id, seed.id);
  await store.assign(seed.id, [], ['default']);
  const restarted = await new MusicLibrary(dir, undefined, seeds, eventDefaults).read();
  assert.deepEqual(restarted.assignments['effect/button-click'], []);
  assert.equal(restarted.tracks.filter(track => track.id === seed.id).length, 1);
});
