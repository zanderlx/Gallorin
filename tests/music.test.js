import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MusicLibrary } from '../src/music-library.js';
import {
  musicContext,
  selectedMusic,
  selectedPlaylist,
  playlistSongs,
  formatMusicName
} from '../public/music-context.js';
import { createMusicEngine } from '../public/music-engine.js';
const mp3 = Buffer.from('ID3test audio');
test('music imports persist, validate, assign independently, and delete without leaving assignments', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-music-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new MusicLibrary(directory);
  await assert.rejects(store.import('bad.mp3', Buffer.from('invalid')), /valid MP3/);
  await assert.rejects(store.import('bad.exe', mp3), /MP3/);
  const first = await store.import('Song A.mp3', mp3),
    id = first.tracks[0].id;
  const second = await store.import('Song B.mp3', mp3),
    id2 = second.tracks[1].id;
  assert.equal(second.tracks[0].name, 'Song A');
  assert.deepEqual(await readFile(join(directory, 'music', id + '.mp3')), mp3);
  const assignments = { 'wilds/aetherion': id, 'wilds/hallowhoof': id2, stable: id2, default: 'menu' };
  await store.settings({ assignments, fadeSeconds: 2 }, Object.keys(assignments));
  assert.deepEqual(
    (await new MusicLibrary(directory).read()).assignments,
    Object.fromEntries(Object.entries(assignments).map(([key, value]) => [key, [value]]))
  );
  await assert.rejects(store.settings({ assignments: { unknown: id }, fadeSeconds: 2 }, ['default']), /existing song/);
  await assert.rejects(
    store.settings({ assignments: { default: 'missing' }, fadeSeconds: 2 }, ['default']),
    /existing song/
  );
  await assert.rejects(store.settings({ assignments: {}, fadeSeconds: 11 }, []), /fade/);
  const final = await store.remove(id);
  assert.equal(final.tracks.length, 1);
  assert.deepEqual(final.assignments['wilds/aetherion'], []);
  assert.deepEqual(final.assignments['wilds/hallowhoof'], [id2]);
  await assert.rejects(store.remove('../save'), /not found/);
  assert.deepEqual(selectedPlaylist(final, 'wilds/aetherion'), ['menu']);
});
test('location music uses zone-specific choices and keeps music through configuration pages', () => {
  assert.equal(musicContext('wilds/hallowhoof'), 'wilds/hallowhoof');
  assert.equal(musicContext('stable/all'), 'stable/all');
  assert.equal(musicContext('town/gacha'), 'town/gacha');
  assert.equal(musicContext('dev/music'), null);
  assert.equal(selectedMusic({ assignments: { default: 'a', stable: 'b' } }, 'stable'), 'b');
  assert.equal(selectedMusic({ assignments: { default: 'a' } }, 'town'), 'a');
});
function fakeAudio() {
  return {
    volume: 1,
    muted: false,
    paused: true,
    currentTime: 0,
    duration: 120,
    async play() {
      this.paused = false;
    },
    pause() {
      this.paused = true;
    },
    load() {},
    removeAttribute() {}
  };
}
test('audio crossfades smoothly, preserves pause intent, seeks and stops', async () => {
  let now = 0,
    frames = [],
    players = [];
  const original = fakeAudio();
  players.push(original);
  const engine = createMusicEngine({
    audio: original,
    makeAudio: () => {
      const a = fakeAudio();
      players.push(a);
      return a;
    },
    clock: () => now,
    frame: fn => frames.push(fn)
  });
  const tick = value => {
    now = value;
    const callbacks = frames;
    frames = [];
    callbacks.forEach(fn => fn());
  };
  await engine.command({ type: 'select', track: { id: 'a', url: 'a' }, fadeSeconds: 0 });
  await engine.command({ type: 'play' });
  await engine.command({ type: 'volume', value: 0.8 });
  const a = players[1];
  assert.equal(a.volume, 0.8);
  await engine.command({ type: 'select', track: { id: 'b', url: 'b' }, fadeSeconds: 2 });
  tick(1000);
  assert.equal(a.volume, 0.4);
  assert.equal(players[2].volume, 0.4);
  tick(2000);
  assert.equal(a.paused, true);
  assert.equal(players[2].volume, 0.8);
  await engine.command({ type: 'seek', value: 62 });
  assert.equal(engine.snapshot().currentTime, 62);
  await engine.command({ type: 'pause' });
  assert.equal(engine.snapshot().playing, false);
  await engine.command({ type: 'select', track: { id: 'c', url: 'c' }, fadeSeconds: 0 });
  assert.equal(engine.snapshot().playing, false);
  await engine.command({ type: 'play' });
  await engine.command({ type: 'mute', value: true });
  assert.equal(engine.snapshot().muted, true);
  await engine.command({ type: 'stop' });
  assert.equal(engine.snapshot().currentTime, 0);
  assert.equal(engine.snapshot().playing, false);
});

test('bundled songs seed once and deleted songs stay deleted after restarting', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-music-seed-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = join(directory, 'source.mp3');
  await import('node:fs/promises').then(fs => fs.writeFile(source, mp3));
  const id = '8bdd69a1-74ec-4b95-8b1e-98e535408e2b',
    seeds = [{ id, name: 'Bundled song', source }];
  const first = new MusicLibrary(directory, undefined, seeds);
  assert.equal((await first.read()).tracks.length, 1);
  const second = new MusicLibrary(directory, undefined, seeds);
  assert.equal((await second.read()).tracks.length, 1);
  await second.settings({ assignments: { default: id, 'main-menu': 'menu' }, fadeSeconds: 2 }, [
    'default',
    'main-menu'
  ]);
  assert.equal(selectedMusic(await second.read(), 'main-menu'), 'menu');
  assert.equal(selectedMusic(await second.read(), 'stable'), id);
  await second.remove(id);
  const third = new MusicLibrary(directory, undefined, seeds);
  assert.equal((await third.read()).tracks.length, 0);
});

test('section-wide songs apply alongside direct assignments with Default as fallback', () => {
  const library = { assignments: { default: ['menu'], stable: ['a', 'b'], 'stable/all': ['c', 'd'] } };
  assert.deepEqual(selectedPlaylist(library, 'stable/all'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(selectedPlaylist(library, 'stable/breeding'), ['a', 'b']);
  assert.deepEqual(selectedPlaylist(library, 'wilds/aetherion'), ['menu']);
  assert.equal(formatMusicName('aetherion-wilds.mp3'), 'Aetherion Wilds');
  assert.equal(formatMusicName('cyberspace2.mp3'), 'Cyberspace 2');
  assert.equal(formatMusicName('myTrack_name.mp3'), 'My Track Name');
  assert.equal(formatMusicName('main-menu.mp3'), 'Main Menu');
});
test('ordered playlists persist and deleting a song preserves the rest of each list', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-playlists-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new MusicLibrary(directory),
    one = await store.import('one.mp3', mp3),
    a = one.tracks[0].id;
  const two = await store.import('two.mp3', mp3),
    b = two.tracks[1].id;
  await store.settings({ assignments: { 'stable/all': [b, a, b], 'main-menu': [a, b] }, fadeSeconds: 2 }, [
    'stable/all',
    'main-menu'
  ]);
  assert.deepEqual((await store.read()).assignments['stable/all'], [b, a]);
  assert.deepEqual((await new MusicLibrary(directory).read()).assignments['main-menu'], [a, b]);
  await store.remove(a);
  assert.deepEqual((await store.read()).assignments['main-menu'], [b]);
  await assert.rejects(
    store.settings({ assignments: { default: [b, 'missing'] }, fadeSeconds: 2 }, ['default']),
    /existing song/
  );
});
test('next, previous, automatic advance and repeated page renders retain queue position', async () => {
  let players = [];
  const engine = createMusicEngine({
    audio: fakeAudio(),
    makeAudio: () => {
      const a = fakeAudio();
      players.push(a);
      return a;
    },
    clock: () => 0,
    frame: () => {}
  });
  const tracks = [
    { id: 'a', url: 'a' },
    { id: 'b', url: 'b' },
    { id: 'c', url: 'c' }
  ];
  await engine.command({ type: 'playlist', key: 'test', tracks, fadeSeconds: 0 });
  await engine.command({ type: 'play' });
  await engine.command({ type: 'next' });
  assert.equal(engine.snapshot().track.id, 'b');
  await engine.command({ type: 'playlist', key: 'test', tracks, fadeSeconds: 0 });
  assert.equal(engine.snapshot().track.id, 'b');
  await engine.command({ type: 'previous' });
  assert.equal(engine.snapshot().track.id, 'a');
  await engine.command({ type: 'previous' });
  assert.equal(engine.snapshot().track.id, 'c');
  players.at(-1).onended();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(engine.snapshot().track.id, 'a');
  await engine.command({ type: 'pause' });
  await engine.command({ type: 'next' });
  assert.equal(engine.snapshot().track.id, 'b');
  assert.equal(engine.snapshot().playing, false);
});

test('clicking a playlist row selects that song while retaining next/previous ordering', async () => {
  const engine = createMusicEngine({ audio: fakeAudio(), makeAudio: fakeAudio, frame: () => {}, clock: () => 0 });
  const tracks = [
    { id: 'a', url: 'a' },
    { id: 'b', url: 'b' },
    { id: 'c', url: 'c' }
  ];
  await engine.command({ type: 'playlist', key: 'test', tracks, fadeSeconds: 0 });
  await engine.command({ type: 'playlist', key: 'test', tracks, startId: 'b', fadeSeconds: 0 });
  assert.equal(engine.snapshot().track.id, 'b');
  await engine.command({ type: 'next' });
  assert.equal(engine.snapshot().track.id, 'c');
});

test('default fallback stays separate from displayed assignments', () => {
  const library = { assignments: { default: ['custom'], 'wilds/aetherion': [], 'wilds/hallowhoof': ['menu'] } };
  assert.deepEqual(playlistSongs(library, 'wilds/aetherion'), []);
  assert.deepEqual(selectedPlaylist(library, 'wilds/aetherion'), ['custom']);
  assert.deepEqual(playlistSongs(library, 'wilds/hallowhoof'), ['menu']);
  assert.deepEqual(selectedPlaylist(library, 'wilds/hallowhoof'), ['menu']);
  assert.deepEqual(selectedPlaylist({ assignments: {} }, 'town/gacha'), ['menu']);
});

test('explicit default-song playlist assignments persist', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-default-cleanup-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'music'), { recursive: true });
  await writeFile(
    join(dir, 'music/library.json'),
    JSON.stringify({
      version: 2,
      tracks: [],
      assignments: { default: ['menu'], 'wilds/aetherion': ['menu'] },
      fadeSeconds: 2
    })
  );
  const library = await new MusicLibrary(dir).read();
  assert.deepEqual(library.assignments.default, ['menu']);
  assert.deepEqual(library.assignments['wilds/aetherion'], ['menu']);
  assert.deepEqual(playlistSongs(library, 'wilds/aetherion'), ['menu']);
  assert.deepEqual(selectedPlaylist(library, 'wilds/aetherion'), ['menu']);
});

test('song metadata and batch memberships persist without altering audio or duration', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-song-edit-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new MusicLibrary(directory),
    first = await store.import('one.mp3', mp3),
    id = first.tracks[0].id;
  const second = await store.import('two.mp3', mp3),
    other = second.tracks[1].id;
  const contexts = ['default', 'stable/all', 'wilds/aetherion', 'wilds/hallowhoof'];
  await store.settings({ assignments: { 'stable/all': [other] }, fadeSeconds: 2 }, contexts);
  const duration = (await store.read()).tracks[0].durationSeconds;
  await store.update(id, { name: 'My edited title', artist: 'My artist' });
  const reloaded = await new MusicLibrary(directory).read();
  assert.equal(reloaded.tracks[0].name, 'My edited title');
  assert.equal(reloaded.tracks[0].artist, 'My artist');
  assert.equal(reloaded.tracks[0].durationSeconds, duration);
  assert.deepEqual(await readFile(join(directory, 'music', id + '.mp3')), mp3);
  await assert.rejects(store.update(id, { name: 'x', artist: 'y', durationSeconds: 99 }), /Only the name/);
  await assert.rejects(store.update(id, { name: ' ', artist: 'y' }), /valid name/);
  await store.assign(id, ['stable/all', 'wilds/aetherion'], contexts);
  assert.deepEqual((await store.read()).assignments['stable/all'], [other, id]);
  await store.assign(id, ['wilds/hallowhoof'], contexts);
  const assigned = await store.read();
  assert.deepEqual(assigned.assignments['stable/all'], [other]);
  assert.deepEqual(assigned.assignments['wilds/aetherion'], []);
  assert.deepEqual(assigned.assignments['wilds/hallowhoof'], [id]);
  const before = await readFile(join(directory, 'music/library.json'), 'utf8');
  await assert.rejects(store.assign(id, ['unknown'], contexts), /existing playlists/);
  assert.equal(await readFile(join(directory, 'music/library.json'), 'utf8'), before);
  await store.update('menu', { name: 'Custom Default', artist: 'Composer' });
  assert.deepEqual((await store.read()).builtinMetadata, { name: 'Custom Default', artist: 'Composer' });
  await assert.rejects(store.remove('menu'), /not found/);
  await store.remove(id);
  assert.deepEqual((await store.read()).assignments['wilds/hallowhoof'], []);
  assert.equal((await store.read()).tracks.length, 1);
});

test('live metadata updates preserve playback progress', async () => {
  const engine = createMusicEngine({ audio: fakeAudio(), makeAudio: fakeAudio, frame: () => {}, clock: () => 0 });
  await engine.command({
    type: 'playlist',
    key: 'library',
    tracks: [{ id: 'a', url: 'a', name: 'Original', artist: 'Old artist' }],
    fadeSeconds: 0
  });
  await engine.command({ type: 'play' });
  await engine.command({ type: 'seek', value: 42 });
  await engine.command({ type: 'metadata', id: 'a', name: 'New title', artist: 'New artist' });
  const state = engine.snapshot();
  assert.equal(state.track.name, 'New title');
  assert.equal(state.track.artist, 'New artist');
  assert.equal(state.currentTime, 42);
  assert.equal(state.playing, true);
  assert.equal(state.playlistKey, 'library');
});

test('All assignments are deduplicated and apply to every child playlist', async t => {
  const { normalizePlaylistSelections, playlistSource } = await import('../public/music-context.js');
  assert.deepEqual(normalizePlaylistSelections(['wilds', 'wilds/aetherion', 'stable/all']), ['wilds', 'stable/all']);
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-all-playlists-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new MusicLibrary(directory),
    library = await store.import('all.mp3', mp3),
    id = library.tracks[0].id;
  await store.assign(id, ['wilds', 'wilds/aetherion'], ['wilds', 'wilds/aetherion', 'wilds/hallowhoof']);
  const saved = await store.read();
  assert.deepEqual(saved.assignments.wilds, [id]);
  assert.deepEqual(saved.assignments['wilds/aetherion'] || [], []);
  assert.deepEqual(selectedPlaylist(saved, 'wilds/hallowhoof'), [id]);
  assert.deepEqual(selectedPlaylist(saved, 'wilds/new-zone'), [id]);
  assert.equal(playlistSource(saved, 'wilds/hallowhoof'), 'wilds');
  assert.deepEqual(
    selectedPlaylist({ assignments: { wilds: ['a'], 'wilds/aetherion': ['a', 'b'] } }, 'wilds/aetherion'),
    ['a', 'b']
  );
});

test('saving every child selection consolidates into All without affecting partial sections or effects', async t => {
  const { normalizePlaylistSelections } = await import('../public/music-context.js');
  const contexts = [
    'wilds',
    'wilds/aetherion',
    'wilds/hallowhoof',
    'stable',
    'stable/all',
    'stable/breeding',
    'default',
    'main-menu'
  ];
  assert.deepEqual(normalizePlaylistSelections(['wilds/aetherion', 'wilds/hallowhoof', 'stable/all'], contexts), [
    'stable/all',
    'wilds'
  ]);
  assert.deepEqual(normalizePlaylistSelections(['wilds/aetherion'], contexts), ['wilds/aetherion']);
  assert.deepEqual(normalizePlaylistSelections(['default', 'main-menu'], contexts), ['default', 'main-menu']);
  assert.deepEqual(normalizePlaylistSelections(['effect/cosmic-spawn'], ['effect/cosmic-spawn']), [
    'effect/cosmic-spawn'
  ]);
  assert.deepEqual(normalizePlaylistSelections([], ['wilds']), []);
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-auto-all-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new MusicLibrary(directory),
    first = await store.import('complete.mp3', mp3),
    id = first.tracks[0].id;
  await store.assign(id, ['wilds/aetherion', 'wilds/hallowhoof', 'stable/all'], contexts);
  let saved = await store.read();
  assert.deepEqual(saved.assignments.wilds, [id]);
  assert.deepEqual(saved.assignments['stable/all'], [id]);
  assert.deepEqual(saved.assignments['wilds/aetherion'] || [], []);
  assert.deepEqual(saved.assignments['wilds/hallowhoof'] || [], []);
  assert.deepEqual(selectedPlaylist(saved, 'wilds/new-zone'), [id]);
  await store.assign(id, ['wilds/aetherion'], contexts);
  saved = await store.read();
  assert.deepEqual(saved.assignments.wilds, []);
  assert.deepEqual(saved.assignments['wilds/aetherion'], [id]);
});

test('settings pages retain playback even with legacy page or section assignments', async () => {
  const { musicGroups, musicContexts } = await import('../public/music-context.js');
  const library = {
    assignments: {
      'user-interface': ['old-ui'],
      developer: ['old-dev'],
      'dev/music': ['old-page'],
      'dev/settings': ['old-page'],
      compendium: ['reference']
    }
  };
  for (const route of [
    'dev/appearance',
    'dev/music',
    'dev/profile',
    'dev/settings',
    'dev/horse-updates',
    'dev/saves'
  ]) {
    assert.equal(musicContext(route, library), null, route);
  }
  assert.equal(musicContext('dev/species', library), 'dev/species');
  assert.equal(musicContext('stable/all', library), 'stable/all');
  assert.equal(musicContext('town/cave', library), 'town/cave');
  const visible = musicGroups().flatMap(group => group.items.map(item => item.id));
  assert.ok(!visible.includes('developer'));
  assert.ok(!visible.includes('dev/music'));
  // Keep old keys valid so unrelated playlist saves cannot fail on hidden entries.
  const valid = musicContexts().map(item => item.id);
  assert.ok(valid.includes('dev/settings'));
  assert.ok(valid.includes('user-interface'));
});
