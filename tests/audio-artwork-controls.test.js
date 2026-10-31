import { cosmicEyeSection, eyesManagerPage } from '../public/eyes-manager.js';
import { cosmicEyeColors } from '../public/cosmic-types.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MusicLibrary } from '../src/music-library.js';
import { createMusicEngine } from '../public/music-engine.js';
import { horseArt, horseHeadArt } from '../public/art.js';
import { catalogFor } from '../public/definitions.js';
import { spawnHorse } from '../src/spawning.js';
import { musicManagerPage } from '../public/music-manager.js';

test('effect volumes persist independently and reject invalid values without writes', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-effect-volume-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new MusicLibrary(dir);
  const imported = await store.import('effect.mp3', Buffer.from('ID3test effect'), 'effect');
  const id = imported.tracks[0].id;
  await store.update(id, { name: 'Effect', artist: 'Artist', volumePercent: 35 });
  assert.equal((await new MusicLibrary(dir).read()).tracks[0].volumePercent, 35);
  const before = await readFile(join(dir, 'music/library.json'), 'utf8');
  for (const volumePercent of [-1, 101, '50', null, Infinity]) {
    await assert.rejects(store.update(id, { name: 'Effect', artist: 'Artist', volumePercent }), /volume/);
    assert.equal(await readFile(join(dir, 'music/library.json'), 'utf8'), before);
  }
  await store.update(id, { name: 'Effect', artist: 'Artist', volumePercent: 0 });
  assert.equal((await store.read()).tracks[0].volumePercent, 0);
});

test('master and individual effect volumes multiply, including live changes, independently of music', async () => {
  const players = [];
  const fake = () => ({
    volume: 1,
    muted: false,
    paused: true,
    currentTime: 0,
    duration: 10,
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
  await engine.command({ type: 'sfx-volume', value: 0.5 });
  await engine.command({ type: 'effect', track: { id: 'quiet', url: 'quiet', volumePercent: 40 } });
  await engine.command({ type: 'effect', track: { id: 'legacy', url: 'legacy' } });
  assert.equal(players[0].volume, 0.2);
  assert.equal(players[1].volume, 0.5);
  await engine.command({ type: 'volume', value: 0 });
  await engine.command({ type: 'mute', value: true });
  assert.equal(players[0].volume, 0.2);
  assert.equal(players[0].muted, false);
  await engine.command({ type: 'sfx-volume', value: 0.25 });
  assert.equal(players[0].volume, 0.1);
  assert.equal(players[1].volume, 0.25);
  await engine.command({ type: 'effect-level', id: 'quiet', value: 0 });
  assert.equal(players[0].volume, 0);
  assert.equal(players[1].volume, 0.25);
  assert.deepEqual(engine.snapshot().activeEffectIds, ['quiet', 'legacy']);
});

test('cosmic eye artwork uses all five overrides without changing the generated trait', async () => {
  const catalog = catalogFor(
    JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8')),
    {}
  );
  const horse = spawnHorse(
    catalog,
    catalog.locations.find(z => z.id === 'aetherion'),
    () => 0.5
  );
  horse.eye = { id: 'candy', name: 'Candy', colors: ['#ABCDEF'] };
  for (const [specialSpawn, color] of Object.entries({
    Solar: '#FFDD00',
    Lunar: '#44BAFF',
    Heavenly: '#000000',
    Void: '#FFFFFF',
    Astral: '#FFFFFF'
  })) {
    const copy = { ...horse, specialSpawn };
    const before = structuredClone(copy);
    for (const render of [horseArt, horseHeadArt])
      assert.match(render(copy), new RegExp('data-layer="eye"[^>]*>[\\s\\S]*?fill="' + color + '"'));
    assert.deepEqual(copy, before);
    assert.equal(copy.eye.name, 'Candy');
    assert.match(
      horseArt({ ...horse, specialSpawn: null, mutations: [{ name: specialSpawn }] }),
      new RegExp('fill="' + color + '"')
    );
  }
  assert.match(
    horseArt({ ...horse, specialSpawn: null, mutations: [] }),
    /data-layer="eye"[^>]*>[\s\S]*?fill="#ABCDEF"/
  );
});

test('event sliders occupy the fourth column and libraries do not show volume sliders', () => {
  const page = musicManagerPage(
    {
      tracks: [
        { id: 'quiet', kind: 'effect', name: 'Quiet', volumePercent: 0 },
        { id: 'song', name: 'Song' }
      ],
      assignments: { 'effect/horse-sold': ['quiet'] }
    },
    []
  );
  assert.match(page, /value="0" data-effect-volume="quiet"/);
  assert.ok(!page.includes('data-effect-volume="song"'));
  const library = page.slice(page.indexOf('data-library-kind="effect"'));
  assert.ok(!library.includes('data-effect-volume'));
  assert.match(
    page,
    /class="music-event">Event<\/th><th scope="col" class="music-sound-effect">Sound Effect<\/th><th scope="col" class="music-effect-volume">Volume/
  );
});

test('bundled sell default points at the new valid MP3', async () => {
  const defaults = JSON.parse(await readFile(new URL('../data/defaults/music.json', import.meta.url), 'utf8'));
  const id = defaults.assignments['effect/horse-sold'][0];
  const track = defaults.tracks.find(t => t.id === id);
  assert.equal(track.kind, 'effect');
  assert.equal(track.file, 'alexzavesa-clinking-coins-9-468428.mp3');
  assert.ok(track.durationSeconds > 0);
  assert.ok((await readFile(new URL('../desktop/assets/music/' + track.file, import.meta.url))).length > 100);
});

test('Cosmic eye section names all artwork overrides without registering spawnable eye traits', () => {
  const catalog = { eyes: [{ id: 'candy', name: 'Candy', rarity: 'Common', colors: ['#ABCDEF'] }] };
  const before = structuredClone(catalog);
  const section = cosmicEyeSection();
  assert.equal((section.match(/data-action="edit-definition"/g) || []).length, 5);
  for (const [name, color] of Object.entries(cosmicEyeColors)) {
    assert.ok(section.includes(name));
    assert.ok(section.includes(color));
  }
  assert.ok(section.includes('data-id="cosmic-eye-solar"'));
  assert.ok(eyesManagerPage(catalog).includes('id="cosmic-eye-grid"'));
  assert.deepEqual(catalog, before);
  assert.match(cosmicEyeSection('lunar'), /Lunar/);
  assert.ok(!cosmicEyeSection('lunar').includes('Solar'));
  assert.match(cosmicEyeSection('#FFDD00'), /Solar/);
  assert.equal(cosmicEyeSection('', 'Common'), '');
  assert.equal(cosmicEyeSection('not an eye'), '');
});
