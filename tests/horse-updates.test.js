import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../src/store.js';
import { regenerateHorse, lockedCosmicMutations } from '../src/horse-regeneration.js';
import { createHorseDocument, readHorseDocument } from '../public/horse-transfer.js';
import { migrateHorseVersion } from '../public/horse-version.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
async function fixture(t, rng = () => 0.5) {
  const directory = await mkdtemp(join(tmpdir(), 'aetherion-horse-updates-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await new GameStore(directory, catalog, defaults, { rng }).init();
  await store.action('visit', { locationId: 'aetherion' });
  await store.action('catch', { id: store.snapshot().encounters.aetherion[0].id, name: 'My Companion' });
  return { directory, store, horse: store.snapshot().horses[0] };
}
const preview = (store, ids, rules, allowDuplicates = false) =>
  store.previewHorseUpdates({ ids, rules, allowDuplicates });

test('legacy horse metadata upgrades once with a backup and survives JSON transfer', async t => {
  const { directory, store, horse } = await fixture(t);
  assert.equal(horse.schemaVersion, 1);
  const state = store.snapshot();
  for (const h of [...state.horses, ...Object.values(state.encounters).flat()]) {
    delete h.schemaVersion;
    delete h.revision;
    delete h.generationVersion;
  }
  await store.persist(state);
  const reopened = await new GameStore(directory, catalog, defaults).init();
  assert.equal(reopened.snapshot().horses[0].schemaVersion, 1);
  assert.ok((await readdir(join(directory, 'backups'))).some(name => name.startsWith('pre-horse-version-')));
  const exported = createHorseDocument(reopened.snapshot().horses[0]);
  assert.equal(readHorseDocument(exported).revision, reopened.snapshot().horses[0].revision);
  const legacy = structuredClone(exported);
  delete legacy.horse.schemaVersion;
  delete legacy.horse.generationVersion;
  delete legacy.horse.revision;
  assert.equal(readHorseDocument(legacy).schemaVersion, 1);
  assert.throws(() => migrateHorseVersion({ schemaVersion: 999 }), /newer version/);
  const before = reopened.snapshot().horses[0].revision;
  await reopened.action('rename', { id: horse.id, name: 'Updated' });
  assert.equal(reopened.snapshot().horses[0].revision, before + 1);
  await reopened.action('rename', { id: horse.id, name: 'Updated' });
  assert.equal(reopened.snapshot().horses[0].revision, before + 1);
});

test('preview is read-only; apply uses exact reviewed values and a dated backup', async t => {
  const { store, horse, directory } = await fixture(t);
  await assert.rejects(preview(store, [horse.id], { gender: { mode: 'reroll' } }), /Enable Horse Updates/);
  await store.action('horse-updates-enabled', { enabled: true });
  const before = await readFile(join(directory, 'player/save.json'), 'utf8');
  const result = await preview(store, [horse.id], {
    gender: { mode: 'set', value: horse.gender === 'Male' ? 'Female' : 'Male' },
    'skill:bond': { mode: 'set', value: { level: 2, xp: 40 } }
  });
  assert.equal(await readFile(join(directory, 'player/save.json'), 'utf8'), before);
  const gender = result.preview.items[0].changes.find(c => c.field === 'gender').after;
  const state = await store.action('apply-horse-updates', { token: result.preview.token });
  const updated = state.horses[0];
  assert.equal(updated.gender, gender);
  assert.deepEqual(updated.skills.bond, { level: 2, xp: 40 });
  assert.equal(updated.id, horse.id);
  assert.equal(updated.name, horse.name);
  assert.equal(updated.caughtAt, horse.caughtAt);
  assert.deepEqual(updated.palette, horse.palette);
  assert.ok(updated.lastRegeneratedAt);
  assert.ok(updated.revision > horse.revision);
  const backup = (await readdir(join(directory, 'backups'))).find(name => name.startsWith('pre-horse-updates-'));
  assert.ok(backup);
  assert.equal(JSON.parse(await readFile(join(directory, 'backups', backup), 'utf8')).horses[0].gender, horse.gender);
  await assert.rejects(store.action('apply-horse-updates', { token: result.preview.token }), /expired/);
});

test('stale horses, changed configuration, invalid targets, and disabled mode reject application', async t => {
  const { store, horse } = await fixture(t);
  await store.action('horse-updates-enabled', { enabled: true });
  await assert.rejects(preview(store, [horse.id, horse.id], { gender: { mode: 'reroll' } }), /different/);
  await assert.rejects(preview(store, [store.snapshot().encounters.aetherion[0].id], {}), /stable/);
  let p = await preview(store, [horse.id], { notes: { mode: 'set', value: 'Generated notes' } });
  await store.action('horse-notes', { id: horse.id, notes: 'New owner notes' });
  await assert.rejects(store.action('apply-horse-updates', { token: p.preview.token }), /horse changed/);
  p = await preview(store, [horse.id], { notes: { mode: 'clear' } });
  const settings = await store.files.json('spawn-settings.json');
  settings.paletteVariationPercent = 13;
  await store.files.atomic('spawn-settings.json', settings);
  await assert.rejects(store.action('apply-horse-updates', { token: p.preview.token }), /Configuration changed/);
  p = await preview(store, [horse.id], { notes: { mode: 'clear' } });
  await store.action('horse-updates-enabled', { enabled: false });
  await assert.rejects(store.action('apply-horse-updates', { token: p.preview.token }), /Enable Horse Updates/);
});

test('Cosmic mutation and palette remain protected during full or individual regeneration', async t => {
  const { store, horse } = await fixture(t, () => 0);
  const c = store.getCatalog();
  assert.equal(horse.specialSpawn, 'Solar');
  const locked = lockedCosmicMutations(horse, c)[0];
  const result = regenerateHorse(
    horse,
    { mutations: { mode: 'reroll' }, palette: { mode: 'reroll' }, size: { mode: 'reroll' } },
    c,
    store.snapshot(),
    { rng: () => 0 }
  );
  assert.equal(result.horse.specialSpawn, 'Solar');
  assert.deepEqual(result.horse.mutations[0], locked);
  assert.equal(result.horse.mutations.length, 4);
  assert.equal(result.horse.palette.name, 'Solar');
  assert.equal(new Set(result.horse.mutations.map(m => m.id)).size, 4);
  const individual = regenerateHorse(horse, { 'mutation:0': { mode: 'clear' } }, c, store.snapshot());
  assert.equal(individual.horse.mutations[0].name, 'Solar');
  assert.match(individual.warnings.join(' '), /Cosmic/);
  const normal = c.palettes.find(p => p.complete && p.name !== 'Solar');
  assert.throws(
    () => regenerateHorse(horse, { palette: { mode: 'set', value: normal.id } }, c, store.snapshot()),
    /available/
  );
});

test('trait rerolls use species lists, respect counts, and preserve missing data', async t => {
  const { store, horse } = await fixture(t);
  const c = store.getCatalog(),
    s = c.species.find(s => s.id === horse.speciesId);
  s.traits = { Mane: ['Species Mane'], Tail: ['Species Tail'], Pattern: ['One', 'Two', 'Three', 'Four', 'Five'] };
  const result = regenerateHorse(
    horse,
    {
      'trait:Mane': { mode: 'reroll' },
      'trait:Tail': { mode: 'reroll' },
      'trait:Pattern': { mode: 'reroll', count: 4 }
    },
    c,
    store.snapshot(),
    { rng: () => 0.9 }
  );
  assert.deepEqual(result.horse.traits.Mane, ['Species Mane']);
  assert.equal(result.horse.traits.Pattern.length, 4);
  assert.equal(new Set(result.horse.traits.Pattern).size, 4);
  assert.ok(result.horse.traitsComplete);
  assert.throws(
    () => regenerateHorse(horse, { 'trait:Mane': { mode: 'set', value: ['Other Species Mane'] } }, c, store.snapshot()),
    /valid/
  );
  s.traits = {};
  const missing = regenerateHorse(horse, { 'trait:Mane': { mode: 'reroll' } }, c, store.snapshot());
  assert.deepEqual(missing.horse.traits.Mane, horse.traits.Mane);
  assert.ok(missing.warnings.length);
});

test('keeping everything is a no-op and explicit text/date/skill changes are validated', async t => {
  const { store, horse } = await fixture(t);
  const c = store.getCatalog(),
    state = store.snapshot();
  const kept = regenerateHorse(horse, {}, c, state);
  assert.deepEqual(kept.horse, horse);
  assert.deepEqual(kept.changes, []);
  assert.throws(() => regenerateHorse(horse, { id: { mode: 'set', value: 'changed' } }, c, state), /Invalid/);
  assert.throws(
    () =>
      regenerateHorse(
        horse,
        { birthday: { mode: 'set', value: '2020-01-01' }, daysOwned: { mode: 'set', value: 1 } },
        c,
        state
      ),
    /either/
  );
  assert.throws(
    () => regenerateHorse(horse, { 'skill:jump': { mode: 'set', value: { level: -1, xp: 0 } } }, c, state),
    /level/
  );
  const changed = regenerateHorse(
    horse,
    {
      daysOwned: { mode: 'set', value: 2 },
      personality: { mode: 'reroll' },
      description: { mode: 'refresh' },
      notes: { mode: 'clear' }
    },
    c,
    state,
    { rng: () => 0 }
  );
  assert.equal(changed.horse.personalityDescription, changed.horse.personality.description);
  assert.equal(changed.horse.notes, '');
  assert.notEqual(changed.horse.caughtAt, horse.caughtAt);
});

test('species changes clear incompatible rerolled traits and reject invalid kept traits', async t => {
  const { store, horse } = await fixture(t);
  const c = store.getCatalog();
  const target = c.species.find(s => s.id !== horse.speciesId);
  target.traits = {};
  const original = { ...horse, traits: { Mane: ['Old Mane'], Tail: ['Old Tail'], Pattern: ['Old Pattern'] } };
  assert.throws(
    () => regenerateHorse(original, { species: { mode: 'set', value: target.id } }, c, store.snapshot()),
    /incompatible/
  );
  const rules = {
    species: { mode: 'set', value: target.id },
    'trait:Mane': { mode: 'reroll' },
    'trait:Tail': { mode: 'reroll' },
    'trait:Pattern': { mode: 'reroll' }
  };
  const result = regenerateHorse(original, rules, c, store.snapshot());
  assert.deepEqual(result.horse.traits.Mane, ['Awaiting species data']);
  assert.deepEqual(result.horse.traits.Pattern, []);
  assert.equal(result.horse.speciesId, target.id);
});

test('all five Cosmic identities and legacy missing mutations are protected', async t => {
  const { store, horse } = await fixture(t);
  const c = store.getCatalog();
  for (const name of ['Solar', 'Lunar', 'Heavenly', 'Void', 'Astral']) {
    const original = { ...horse, specialSpawn: name, mutations: [] };
    const result = regenerateHorse(original, { mutations: { mode: 'reroll' } }, c, store.snapshot(), {
      rng: () => 0.99
    });
    assert.equal(result.horse.specialSpawn, name);
    assert.equal(result.horse.mutations[0].name, name);
    assert.ok(result.horse.mutations.length <= 4);
    assert.equal(result.horse.speciesId, horse.speciesId);
  }
});

test('mutation selection respects thresholds and duplicate controls', async t => {
  const { store, horse } = await fixture(t);
  const c = store.getCatalog();
  const species = c.species.find(s => s.id === horse.speciesId);
  species.attributes = { power: 5 };
  const disallowed = {
    id: 'too-strong',
    name: 'Too Strong',
    type: 'Standard',
    weight: 1000,
    thresholds: { power: { min: 10 } }
  };
  const allowed = { id: 'allowed', name: 'Allowed', type: 'Standard', weight: 100, thresholds: {} };
  c.mutations = [disallowed, allowed];
  const original = { ...horse, specialSpawn: null, mutations: [] };
  const rolled = regenerateHorse(original, { mutations: { mode: 'reroll' } }, c, store.snapshot(), { rng: () => 0 });
  assert.deepEqual(
    rolled.horse.mutations.map(m => m.name),
    ['Allowed']
  );
  const duplicate = regenerateHorse(original, { mutations: { mode: 'reroll' } }, c, store.snapshot(), {
    rng: () => 0,
    allowDuplicates: true
  });
  assert.equal(duplicate.horse.mutations.length, 4);
  assert.ok(duplicate.horse.mutations.every(m => m.name === 'Allowed'));
  assert.throws(
    () => regenerateHorse(original, { 'mutation:0': { mode: 'set', value: 'too-strong' } }, c, store.snapshot()),
    /threshold/
  );
});

test('batch updates are all-or-nothing if any horse becomes stale', async t => {
  const { store, horse } = await fixture(t);
  await store.action('catch', { id: store.snapshot().encounters.aetherion[0].id });
  await store.action('horse-updates-enabled', { enabled: true });
  const ids = store.snapshot().horses.map(h => h.id);
  const p = await preview(store, ids, { notes: { mode: 'set', value: 'Batch notes' } });
  await store.action('horse-notes', { id: ids[1], notes: 'Keep this newer note' });
  await assert.rejects(store.action('apply-horse-updates', { token: p.preview.token }), /horse changed/);
  assert.equal(store.snapshot().horses.find(h => h.id === horse.id).notes, horse.notes);
  assert.equal(store.snapshot().horses[1].notes, 'Keep this newer note');
});

test('expired previews and no-op applications cannot write a save', async t => {
  const { store, horse, directory } = await fixture(t);
  await store.action('horse-updates-enabled', { enabled: true });
  const p = await preview(store, [horse.id], { notes: { mode: 'set', value: 'Never applied' } });
  store.horseUpdatePreviews.get(p.preview.token).expires = 0;
  const before = await readFile(join(directory, 'player/save.json'), 'utf8');
  await assert.rejects(store.action('apply-horse-updates', { token: p.preview.token }), /expired/);
  const none = await preview(store, [horse.id], {});
  await assert.rejects(store.action('apply-horse-updates', { token: none.preview.token }), /no changes/);
  assert.equal(await readFile(join(directory, 'player/save.json'), 'utf8'), before);
});
