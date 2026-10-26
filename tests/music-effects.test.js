import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MusicLibrary } from '../src/music-library.js';
import { newCosmicEncounters } from '../public/music-effects.js';
import { musicManagerPage } from '../public/music-manager.js';
import { createMusicEngine } from '../public/music-engine.js';
const bytes = Buffer.from('ID3test effect');
test('legacy twinkle moves to effects once with backup and unchanged media', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-sfx-migrate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const id = 'b3f0c272-1922-47e7-9ef3-d30dd0399e96';
  await mkdir(join(dir, 'music'), { recursive: true });
  await writeFile(join(dir, 'music', id + '.mp3'), bytes);
  await writeFile(
    join(dir, 'music/library.json'),
    JSON.stringify({
      tracks: [
        {
          id,
          name: 'Twinkle',
          customName: 'My Twinkle',
          artist: 'Composer',
          filename: 'universfield-magic-twinkle-244951.mp3'
        }
      ],
      assignments: { default: ['menu'], 'wilds/aetherion': ['menu', id] },
      fadeSeconds: 2
    })
  );
  const store = new MusicLibrary(dir),
    library = await store.read();
  assert.equal(library.tracks[0].kind, 'effect');
  assert.equal(library.tracks[0].name, 'My Twinkle');
  assert.equal(library.tracks[0].artist, 'Composer');
  assert.deepEqual(library.assignments['wilds/aetherion'], ['menu']);
  assert.deepEqual(library.assignments['effect/cosmic-spawn'], [id]);
  assert.deepEqual(await readFile(join(dir, 'music', id + '.mp3')), bytes);
  assert.ok((await readdir(join(dir, 'backups'))).some(name => name.startsWith('pre-sound-effects-')));
  await store.assign(id, [], ['default', 'wilds/aetherion']);
  assert.deepEqual((await new MusicLibrary(dir).read()).assignments['effect/cosmic-spawn'], []);
});
test('effects import edit assign and delete separately from music', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-sfx-crud-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new MusicLibrary(dir),
    music = await store.import('song.mp3', bytes),
    song = music.tracks[0].id;
  const imported = await store.import('effect.mp3', bytes, 'effect'),
    effect = imported.tracks[1].id,
    contexts = ['default', 'wilds/aetherion'];
  await store.assign(song, ['wilds/aetherion'], contexts);
  await store.assign(effect, ['effect/cosmic-spawn'], contexts);
  await assert.rejects(store.assign(effect, ['wilds/aetherion'], contexts), /matching/);
  await assert.rejects(store.assign(song, ['effect/cosmic-spawn'], contexts), /matching/);
  await assert.rejects(
    store.settings({ fadeSeconds: 2, assignments: { default: [effect] } }, contexts),
    /sound effects/
  );
  await assert.rejects(
    store.settings({ fadeSeconds: 2, assignments: { 'effect/cosmic-spawn': [song] } }, contexts),
    /sound effects/
  );
  await store.update(effect, { name: 'Cosmic Cue', artist: 'Composer' });
  assert.equal((await store.read()).tracks[1].kind, 'effect');
  await store.remove(effect);
  const final = await store.read();
  assert.deepEqual(final.assignments['effect/cosmic-spawn'], []);
  assert.deepEqual(final.assignments['wilds/aetherion'], [song]);
  await assert.rejects(store.import('bad.mp3', bytes, 'other'), /music or sound effect/);
});
test('cosmic effects only trigger for new encounters in the current zone', () => {
  const old = { id: 'old', spawnPath: 'Cosmic' },
    fresh = { id: 'new', spawnPath: 'Cosmic' };
  const previous = { encounters: { a: [old] } },
    next = {
      encounters: { a: [old, fresh, { id: 'wild', spawnPath: 'Wild' }], b: [{ id: 'other', specialSpawn: 'Solar' }] }
    };
  assert.deepEqual(newCosmicEncounters(previous, next, 'a'), [fresh]);
  assert.deepEqual(newCosmicEncounters(next, next, 'a'), []);
  assert.equal(newCosmicEncounters(previous, next, 'b').length, 1);
  assert.deepEqual(newCosmicEncounters(previous, next, 'missing'), []);
});
test('music and effect tables share controls without mixing categories', () => {
  const html = musicManagerPage(
    {
      tracks: [
        { id: 'song', name: 'Song' },
        { id: 'sfx', name: 'Twinkle', kind: 'effect' }
      ],
      assignments: { 'effect/cosmic-spawn': ['sfx'] }
    },
    []
  );
  const music = html.slice(html.indexOf('data-library-kind="music"'), html.indexOf('data-library-kind="events"')),
    effect = html.slice(html.indexOf('data-library-kind="effect"'));
  assert.ok(!music.includes('Twinkle'));
  assert.ok(effect.includes('All Sound Effects'));
  assert.ok(effect.includes('Twinkle'));
  assert.ok(effect.includes('data-music-import="effect"'));
  assert.ok(effect.includes('data-song-options="sfx"'));
});
test('effects overlay music and release active markers when finished', async () => {
  const players = [],
    fake = () => ({
      volume: 1,
      paused: true,
      currentTime: 0,
      duration: 100,
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
  await engine.command({ type: 'playlist', key: 'music', tracks: [{ id: 'song', url: 'song' }], fadeSeconds: 0 });
  await engine.command({ type: 'play' });
  await engine.command({ type: 'seek', value: 30 });
  await engine.command({ type: 'sfx-volume', value: 0.3 });
  await engine.command({ type: 'effect', track: { id: 'effect', url: 'effect' } });
  assert.equal(engine.snapshot().track.id, 'song');
  assert.equal(engine.snapshot().currentTime, 30);
  assert.equal(engine.snapshot().playing, true);
  assert.deepEqual(engine.snapshot().activeEffectIds, ['effect']);
  assert.equal(players.at(-1).volume, 0.3);
  players.at(-1).onended();
  assert.deepEqual(engine.snapshot().activeEffectIds, []);
});

test('music volume and mute leave playing and newly triggered effects audible', async () => {
  const players = [],
    fake = () => ({
      volume: 1,
      muted: false,
      paused: true,
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
  await engine.command({ type: 'select', track: { id: 'song', url: 'song' }, fadeSeconds: 0 });
  await engine.command({ type: 'sfx-volume', value: 0.7 });
  await engine.command({ type: 'effect', track: { id: 'first', url: 'first' } });
  const first = players.at(-1);
  await engine.command({ type: 'volume', value: 0 });
  await engine.command({ type: 'mute', value: true });
  await engine.command({ type: 'effect', track: { id: 'second', url: 'second' } });
  for (const effect of [first, players.at(-1)]) {
    assert.equal(effect.volume, 0.7);
    assert.equal(effect.muted, false);
    assert.equal(effect.paused, false);
  }
  assert.equal(players[0].volume, 0);
  assert.equal(players[0].muted, true);
});

test('sound event assignments replace one cue and report both track IDs', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-single-event-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new MusicLibrary(dir);
  const first = (await store.import('first.mp3', bytes, 'effect')).tracks[0].id;
  const second = (await store.import('second.mp3', bytes, 'effect')).tracks[1].id;
  await store.assign(first, ['effect/cosmic-spawn'], []);
  const result = await store.assign(second, ['effect/cosmic-spawn'], []);
  assert.deepEqual(result.assignments['effect/cosmic-spawn'], [second]);
  assert.deepEqual(result.assignmentReplacements, [{ event: 'effect/cosmic-spawn', from: first, to: second }]);
  assert.equal(result.tracks.length, 2);
  assert.deepEqual((await store.assign(second, ['effect/cosmic-spawn'], [])).assignmentReplacements, []);
  await assert.rejects(
    store.settings({ fadeSeconds: 2, assignments: { 'effect/cosmic-spawn': [first, second] } }, []),
    /only one/
  );
  const html = musicManagerPage(result, []);
  assert.match(html, /class="music-event">Event/);
  assert.match(html, /class="music-event">Cosmic Horse Spawn/);
});

test('inline effect edits save metadata and event replacement together without changing duration', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-event-edit-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new MusicLibrary(dir);
  const first = (await store.import('first.mp3', bytes, 'effect')).tracks[0].id;
  const second = (await store.import('second.mp3', bytes, 'effect')).tracks[1].id;
  await store.assign(first, ['effect/cosmic-spawn'], []);
  const before = (await store.read()).tracks[1].durationSeconds;
  const saved = await store.update(second, { name: 'New Cue', artist: 'Composer', eventIds: ['effect/cosmic-spawn'] });
  assert.deepEqual(saved.assignments['effect/cosmic-spawn'], [second]);
  assert.deepEqual(saved.assignmentReplacements, [{ event: 'effect/cosmic-spawn', from: first, to: second }]);
  assert.equal(saved.tracks[1].name, 'New Cue');
  assert.equal(saved.tracks[1].artist, 'Composer');
  assert.equal(saved.tracks[1].durationSeconds, before);
  await assert.rejects(
    store.update(second, { name: 'Invalid', artist: 'Composer', eventIds: ['missing'] }),
    /valid sound events/
  );
  assert.equal((await store.read()).tracks[1].name, 'New Cue');
  await store.update(second, { name: 'New Cue', artist: 'Composer', eventIds: [] });
  assert.deepEqual((await store.read()).assignments['effect/cosmic-spawn'], []);
});

test('sound effects table lists fixed events and hides unassigned sounds and metadata columns', () => {
  const html = musicManagerPage(
    {
      tracks: [
        { id: 'assigned', name: 'Shine', kind: 'effect' },
        { id: 'unused', name: 'Unused Twinkle', kind: 'effect' }
      ],
      assignments: { 'effect/cosmic-spawn': ['assigned'] }
    },
    []
  );
  const effect = html.slice(html.indexOf('data-library-kind="events"'), html.indexOf('data-library-kind="effect"'));
  assert.match(effect, /Cosmic Horse Spawn/);
  assert.match(effect, /Horse Sold/);
  assert.match(effect, /Shine/);
  assert.doesNotMatch(effect, /Unused Twinkle|>Artist<|>Duration<|>Title</);
  assert.match(effect, />Sound Effect</);
});

test('all sound effects has its own import and includes unassigned library tracks', () => {
  const html = musicManagerPage(
    { tracks: [{ id: 'unused', name: 'Unused Cue', kind: 'effect' }], assignments: {} },
    []
  );
  const events = html.slice(html.indexOf('data-library-kind="events"'), html.indexOf('data-library-kind="effect"'));
  const library = html.slice(html.indexOf('data-library-kind="effect"'));
  assert.doesNotMatch(events, /data-music-import|Unused Cue/);
  assert.match(library, /All Sound Effects/);
  assert.match(library, /Unused Cue/);
  assert.match(library, /data-music-import="effect"/);
  assert.match(library, />Artist</);
  assert.match(library, />Duration</);
});
