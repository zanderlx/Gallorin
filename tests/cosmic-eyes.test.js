import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../src/store.js';
import { spawnHorse } from '../src/spawning.js';
import { regenerateHorse } from '../src/horse-regeneration.js';
import { horseArt, legacyHorseArt, setProvidedHorseArtwork } from '../public/art.js';
import { regularEyes, isCosmicEye, cosmicEyeColors, cosmicArtworkEye, withCosmicEyes } from '../public/cosmic-types.js';
import { horseFieldOptions } from '../public/horse-fields.js';
import { createDefinitionDocument, readDefinitionDocument } from '../public/definition-transfer.js';
const base = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-cosmic-eyes-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, store: await new GameStore(dir, base, defaults).init() };
}
test('Cosmic eye edits and imports retain fixed colors without changing horse traits', async t => {
  const { dir, store } = await fixture(t);
  const initial = store.getCatalog();
  const solar = initial.eyes.find(e => e.cosmicType === 'Solar');
  const horse = spawnHorse(
    initial,
    initial.locations.find(z => z.id === 'aetherion'),
    () => 0.5
  );
  horse.specialSpawn = 'Solar';
  const before = structuredClone(horse);
  await store.action('save-definition', {
    kind: 'eyes',
    id: solar.id,
    values: { ...solar, colors: ['#123456'], description: 'Updated artwork' }
  });
  const diskEyes = JSON.parse(await readFile(join(dir, 'config/eyes.json'), 'utf8'));
  assert.ok(diskEyes.every(eye => !isCosmicEye(eye)));
  const saved = store.getCatalog().eyes.find(e => e.id === solar.id);
  assert.equal(saved.cosmicType, 'Solar');
  assert.deepEqual(saved.colors, [cosmicEyeColors.Solar]);
  const restarted = await new GameStore(dir, base, defaults).init();
  assert.deepEqual(restarted.getCatalog().eyes.find(e => e.id === solar.id).colors, [cosmicEyeColors.Solar]);
  assert.match(horseArt(horse), /data-layer="eye"[^>]*>[\s\S]*?fill="#FFDD00"/);
  assert.deepEqual(horse, before);
  const document = createDefinitionDocument('eyes', saved);
  assert.equal(readDefinitionDocument('eyes', document, restarted.getCatalog()).id, solar.id);
  document.definition.colors = ['#000000'];
  assert.deepEqual(readDefinitionDocument('eyes', document, restarted.getCatalog()).colors, [cosmicEyeColors.Solar]);
});

test('old local overrides cannot change any Cosmic type after restart or in artwork', async t => {
  const { dir, store } = await fixture(t);
  const eyes = store.getCatalog().eyes.map(eye => (isCosmicEye(eye) ? { ...eye, colors: ['#123456'] } : eye));
  await writeFile(join(dir, 'config/eyes.json'), JSON.stringify(eyes));
  const restarted = await new GameStore(dir, base, defaults).init();
  const cleaned = JSON.parse(await readFile(join(dir, 'config/eyes.json'), 'utf8'));
  assert.deepEqual(cleaned, regularEyes(eyes));
  for (const [type, color] of Object.entries(cosmicEyeColors)) {
    assert.deepEqual(restarted.getCatalog().eyes.find(eye => eye.cosmicType === type).colors, [color]);
    assert.deepEqual(withCosmicEyes(eyes).find(eye => eye.cosmicType === type).colors, [color]);
    assert.equal(cosmicArtworkEye({ specialSpawn: type, eye: { colors: ['#123456'] } }), color);
    assert.equal(cosmicArtworkEye({ mutations: [{ name: type }], eye: { colors: ['#123456'] } }), color);
  }
  assert.equal(cosmicArtworkEye({ mutations: [] }), null);
});

test('existing saved Cosmic horses use fixed colors in all artwork modes', async t => {
  const { dir, store } = await fixture(t);
  const catalog = store.getCatalog();
  const oldHorse = spawnHorse(
    catalog,
    catalog.locations.find(zone => zone.id === 'aetherion'),
    () => 0.5
  );
  const oldHorses = Object.keys(cosmicEyeColors).map(type => ({
    ...structuredClone(oldHorse),
    id: `old-${type}`,
    specialSpawn: type,
    eye: { ...oldHorse.eye, colors: ['#123456'] }
  }));
  const player = JSON.parse(await readFile(store.file, 'utf8'));
  player.horses = oldHorses;
  await writeFile(store.file, JSON.stringify(player));
  const restarted = await new GameStore(dir, base, defaults).init();
  assert.equal(restarted.snapshot().horses.length, oldHorses.length);
  for (const horse of restarted.snapshot().horses) {
    const color = cosmicEyeColors[horse.specialSpawn];
    assert.ok(color);
    assert.ok(legacyHorseArt(horse).includes(`fill="${color}"`));
    for (const provided of [false, true]) {
      setProvidedHorseArtwork(provided);
      try {
        assert.match(horseArt(horse), new RegExp(`data-layer="eye"[^>]*>[\\s\\S]*?(?:fill|stop-color)="${color}"`));
      } finally {
        setProvidedHorseArtwork(false);
      }
    }
  }
});
test('normal spawn and regeneration eye pools exclude all Cosmic artwork entries', async t => {
  const { store } = await fixture(t);
  const catalog = store.getCatalog();
  assert.equal(catalog.eyes.filter(isCosmicEye).length, 5);
  assert.equal(horseFieldOptions('eye', catalog, store.snapshot()).length, regularEyes(catalog.eyes).length);
  for (const roll of [0, 0.0015, 0.5, 0.999999]) {
    const horse = spawnHorse(
      catalog,
      catalog.locations.find(z => z.id === 'aetherion'),
      () => roll
    );
    assert.ok(!isCosmicEye(horse.eye));
    const regenerated = regenerateHorse(horse, { eye: { mode: 'reroll' } }, catalog, store.snapshot(), {
      rng: () => 0.999999
    });
    assert.ok(!isCosmicEye(regenerated.horse.eye));
  }
});
test('older eye files gain fixed Cosmic defaults without replacing normal entries or colors', async t => {
  const { dir, store } = await fixture(t);
  const normal = regularEyes(store.getCatalog().eyes);
  await writeFile(join(dir, 'config/eyes.json'), JSON.stringify(normal));
  const updated = await new GameStore(dir, base, defaults).init();
  assert.deepEqual(regularEyes(updated.getCatalog().eyes), normal);
  for (const [name, color] of Object.entries(cosmicEyeColors))
    assert.deepEqual(updated.getCatalog().eyes.find(e => e.cosmicType === name).colors, [color]);
});
test('Cosmic deletion is blocked and malformed edits do not overwrite files', async t => {
  const { dir, store } = await fixture(t);
  const solar = store.getCatalog().eyes.find(e => e.cosmicType === 'Solar');
  const path = join(dir, 'config/eyes.json');
  const before = await readFile(path, 'utf8');
  await assert.rejects(
    store.action('save-definition', { kind: 'eyes', id: solar.id, values: { ...solar, colors: ['invalid'] } })
  );
  assert.equal(await readFile(path, 'utf8'), before);
  await store.action('save-definition', { kind: 'eyes', id: solar.id, values: { ...solar, colors: ['#123456'] } });
  await assert.rejects(store.action('delete-definition', { kind: 'eyes', id: solar.id }), /cannot be deleted/);
  assert.deepEqual(store.getCatalog().eyes.find(e => e.cosmicType === 'Solar').colors, [cosmicEyeColors.Solar]);
});

test('Cosmic names and rarity stay fixed even when modified in a direct save request', async t => {
  const { dir, store } = await fixture(t);
  const solar = store.getCatalog().eyes.find(eye => eye.cosmicType === 'Solar');
  await store.action('save-definition', {
    kind: 'eyes',
    id: solar.id,
    values: { ...solar, name: 'Golden Sun', rarity: 'Rare', colors: ['#FEDCBA'] }
  });
  const updated = await new GameStore(dir, base, defaults).init();
  const entry = updated.getCatalog().eyes.find(eye => eye.id === solar.id);
  assert.equal(entry.name, 'Solar');
  assert.equal(entry.rarity, 'Cosmic');
  assert.equal(entry.cosmicType, 'Solar');
  assert.ok(!regularEyes(updated.getCatalog().eyes).some(eye => eye.id === solar.id));
});
