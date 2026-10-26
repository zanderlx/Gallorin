import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../src/store.js';
import { spawnHorse } from '../src/spawning.js';
import { regenerateHorse } from '../src/horse-regeneration.js';
import { horseArt } from '../public/art.js';
import { regularEyes, isCosmicEye, setCosmicEyeDefinitions, cosmicEyeColors } from '../public/cosmic-types.js';
import { horseFieldOptions } from '../public/horse-fields.js';
import { createDefinitionDocument, readDefinitionDocument } from '../public/definition-transfer.js';
const base = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'gallorin-cosmic-eyes-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, store: await new GameStore(dir, base, defaults).init() };
}
test('Cosmic eye edits persist locally and update existing artwork without changing horse traits', async t => {
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
  const saved = JSON.parse(await readFile(join(dir, 'config/eyes.json'), 'utf8')).find(e => e.id === solar.id);
  assert.equal(saved.cosmicType, 'Solar');
  assert.deepEqual(saved.colors, ['#123456']);
  const restarted = await new GameStore(dir, base, defaults).init();
  assert.deepEqual(restarted.getCatalog().eyes.find(e => e.id === solar.id).colors, ['#123456']);
  setCosmicEyeDefinitions(restarted.getCatalog().eyes);
  try {
    assert.match(horseArt(horse), /rx="3" ry="2.5" fill="#123456"/);
    assert.deepEqual(horse, before);
  } finally {
    setCosmicEyeDefinitions([]);
  }
  const document = createDefinitionDocument('eyes', saved);
  assert.equal(readDefinitionDocument('eyes', document, restarted.getCatalog()).id, solar.id);
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
test('older eye files gain editable Cosmic defaults without replacing normal entries or colors', async t => {
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
  assert.deepEqual(store.getCatalog().eyes.find(e => e.cosmicType === 'Solar').colors, ['#123456']);
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
