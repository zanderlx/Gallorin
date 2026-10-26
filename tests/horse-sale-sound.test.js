import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MusicLibrary } from '../src/music-library.js';
import { soundEffectGroups, effectForEvent } from '../public/music-effects.js';
import { createMusicEngine } from '../public/music-engine.js';
import { durationOfFile } from '../src/music-duration.js';
const defaults = JSON.parse(await readFile(new URL('../data/defaults/music.json', import.meta.url), 'utf8'));
const saleId = defaults.assignments['effect/horse-sold'][0];
const seed = defaults.tracks.find(track => track.id === saleId);
const source = fileURLToPath(new URL('../desktop/assets/music/' + seed.file, import.meta.url));
const bytes = Buffer.from('ID3test custom audio');

test('Horse Sold is configurable and defaults to a playable Loot Coin Small effect', async () => {
  assert.ok(soundEffectGroups.some(g => g.items.some(e => e.id === 'effect/horse-sold' && e.name === 'Horse Sold')));
  assert.equal(seed.kind, 'effect');
  assert.equal(seed.name, 'Loot Coin Small');
  assert.ok((await durationOfFile(source)) > 0);
  const library = {
    tracks: [seed, { id: 'music', kind: 'music' }],
    assignments: { 'effect/horse-sold': ['missing', 'music', saleId] }
  };
  assert.equal(effectForEvent(library, 'effect/horse-sold', () => 0).id, saleId);
  assert.equal(effectForEvent(library, 'effect/unassigned'), null);
});

for (const choice of ['missing', 'empty', 'custom'])
  test('new sale event preserves existing preferences and ' + choice + ' assignment', async t => {
    const directory = await mkdtemp(join(tmpdir(), 'gallorin-sale-sound-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const old = new MusicLibrary(directory),
      music = (await old.import('custom.mp3', bytes)).tracks[0];
    const cue = (await old.import('custom-effect.mp3', bytes, 'effect')).tracks.find(t => t.kind === 'effect');
    const assignments = {
      default: [music.id],
      ...(choice === 'missing' ? {} : { 'effect/horse-sold': choice === 'empty' ? [] : [cue.id] })
    };
    await old.settings({ assignments, fadeSeconds: 7 }, ['default']);
    const eventDefaults = { assignments: { 'effect/horse-sold': [saleId] } };
    const updated = new MusicLibrary(directory, undefined, [{ ...seed, source }], eventDefaults);
    const saved = await updated.read();
    assert.deepEqual(saved.assignments.default, [music.id]);
    assert.equal(saved.fadeSeconds, 7);
    assert.deepEqual(
      saved.assignments['effect/horse-sold'],
      choice === 'missing' ? [saleId] : choice === 'empty' ? [] : [cue.id]
    );
    assert.equal(saved.tracks.filter(t => t.id === saleId).length, 1);
    // Clearing an event after its initial migration must survive subsequent starts.
    await updated.assign(saleId, [], ['default']);
    const restarted = await new MusicLibrary(directory, undefined, [{ ...seed, source }], eventDefaults).read();
    assert.ok(!restarted.assignments['effect/horse-sold'].includes(saleId));
    assert.equal(restarted.tracks.filter(t => t.id === saleId).length, 1);
    assert.deepEqual(await readFile(join(directory, 'music', saleId + '.mp3')), await readFile(source));
  });

test('sale cue overlays muted background music at the independent effect volume', async () => {
  const players = [],
    fake = () => ({
      paused: true,
      muted: false,
      currentTime: 0,
      duration: 120,
      async play() {
        this.paused = false;
      },
      pause() {
        this.paused = true;
      },
      removeAttribute() {},
      load() {}
    });
  const engine = createMusicEngine({
    audio: fake(),
    makeAudio: () => {
      const a = fake();
      players.push(a);
      return a;
    },
    frame: () => {},
    clock: () => 0
  });
  await engine.command({ type: 'playlist', key: 'stable', tracks: [{ id: 'music', url: 'music' }], fadeSeconds: 0 });
  await engine.command({ type: 'play' });
  await engine.command({ type: 'seek', value: 25 });
  await engine.command({ type: 'mute', value: true });
  await engine.command({ type: 'sfx-volume', value: 0.2 });
  const cue = effectForEvent({ tracks: [seed], assignments: defaults.assignments }, 'effect/horse-sold');
  await engine.command({ type: 'effect', track: { ...cue, url: 'sale' } });
  assert.equal(engine.snapshot().track.id, 'music');
  assert.equal(engine.snapshot().currentTime, 25);
  assert.equal(engine.snapshot().playing, true);
  assert.deepEqual(engine.snapshot().activeEffectIds, [saleId]);
  assert.equal(players.at(-1).volume, 0.2);
  assert.equal(players.at(-1).muted, false);
  players.at(-1).onended();
  assert.deepEqual(engine.snapshot().activeEffectIds, []);
});
