import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GameStore } from '../src/store.js';
import { normalizeCatalog } from '../public/definitions.js';
import { createEncounters } from '../src/encounters.js';
import { regenerateHorse } from '../src/horse-regeneration.js';
import { profileContent } from '../public/profile.js';
import { keeperPage } from '../public/keeper.js';
import { horseOwner } from '../public/horse-owner.js';
import { editableHorseFields } from '../public/horse-updates.js';
import { createHorseDocument, readHorseDocument } from '../public/horse-transfer.js';

const catalog = normalizeCatalog(
  JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
);
const settings = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
const horse = createEncounters(catalog, 'aetherion', 1, 0, undefined, () => 0.5)[0];
horse.originalOwner = { id: 'local-keeper', name: 'My Keeper' };
const state = {
  horses: [horse],
  sold: [],
  settings,
  keeper: { name: 'My Keeper', about: '', avatarSeed: 11 },
  gold: 0
};

test('My Profile capitalizes Display Name and horse identity uses the current keeper', () => {
  assert.match(keeperPage(state), />Display Name<input/);
  const content = profileContent(horse, state, { catalog });
  assert.match(content, /<dt>Owner<\/dt><dd><span>My Keeper<\/span>/);
  assert.doesNotMatch(content, /<dt>Age<\/dt>/);
  assert.equal(horseOwner(horse), 'My Keeper');
  assert.equal(horseOwner({}), 'Unknown');
  assert.match(
    profileContent({ ...horse, originalOwner: undefined }, { ...state, horses: [] }, { catalog }),
    /<dt>Owner<\/dt><dd><span>None<\/span>/
  );
});

test('Owner has an Identity override that validates, transfers, and restores the profile default', () => {
  assert.equal(editableHorseFields.find(field => field.key === 'owner').group, 'Identity');
  const result = regenerateHorse(horse, { owner: { mode: 'set', value: '  Other <Keeper>  ' } }, catalog, state).horse;
  assert.equal(result.owner, 'Other <Keeper>');
  assert.ok(result.overriddenFields.includes('owner'));
  assert.equal(horseOwner(result, state), 'Other <Keeper>');
  assert.match(profileContent(result, state, { catalog }), /Other &lt;Keeper&gt;/);
  const imported = readHorseDocument(createHorseDocument(result));
  assert.equal(imported.owner, result.owner);
  assert.deepEqual(imported.originalOwner, horse.originalOwner);
  const restored = regenerateHorse(imported, { owner: { mode: 'restore' } }, catalog, state).horse;
  assert.equal(Object.hasOwn(restored, 'owner'), false);
  assert.equal(horseOwner(restored, state), 'My Keeper');
  for (const value of ['', ' ', 'A'.repeat(101), 123])
    assert.throws(() => regenerateHorse(horse, { owner: { mode: 'set', value } }, catalog, state), /Owner/);
  const invalid = createHorseDocument(horse);
  invalid.horse.owner = 123;
  assert.throws(() => readHorseDocument(invalid), /Owner/);
});

async function storeFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-owners-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await new GameStore(directory, catalog, settings, { rng: () => 0.5 }).init();
  await store.action('visit', { locationId: 'aetherion' });
  const id = store.snapshot().encounters.aetherion[0].id;
  await store.action('catch', { id });
  return { store, directory, id };
}

test('same-name traders have distinct identities; profile renames only update local original owners', async t => {
  const local = await storeFixture(t);
  const trader = await storeFixture(t);
  const localHorse = local.store.snapshot().horses[0];
  const tradedHorse = trader.store.snapshot().horses[0];
  assert.equal(localHorse.originalOwner.name, 'Horsekeeper');
  assert.equal(tradedHorse.originalOwner.name, 'Horsekeeper');
  assert.notEqual(localHorse.originalOwner.id, tradedHorse.originalOwner.id);
  await local.store.action('import-horse', createHorseDocument(tradedHorse));
  await local.store.action('horse-updates-enabled', { enabled: true });
  const preview = await local.store.previewHorseUpdates({
    allowDuplicates: false,
    ids: [local.id],
    rules: { owner: { mode: 'set', value: 'Override' } }
  });
  await local.store.action('apply-horse-updates', { token: preview.preview.token });
  await local.store.action('save-profile', { name: 'NotHorseKeeper', about: '', avatarSeed: 11 });
  let state = local.store.snapshot();
  const owned = state.horses.find(h => h.id === local.id);
  const imported = state.horses.find(h => h.id !== local.id);
  assert.equal(owned.originalOwner.name, 'NotHorseKeeper');
  assert.equal(horseOwner(owned), 'Override');
  assert.equal(imported.originalOwner.name, 'Horsekeeper');
  const restore = await local.store.previewHorseUpdates({
    allowDuplicates: false,
    ids: [local.id],
    rules: { owner: { mode: 'restore' } }
  });
  await local.store.action('apply-horse-updates', { token: restore.preview.token });
  state = local.store.snapshot();
  assert.equal(horseOwner(state.horses.find(h => h.id === local.id)), 'NotHorseKeeper');
  const reopened = await new GameStore(local.directory, catalog, settings).init();
  assert.equal(reopened.snapshot().keeperId, state.keeperId);
  assert.equal(reopened.snapshot().horses.find(h => h.id === imported.id).originalOwner.name, 'Horsekeeper');
  assert.equal(readHorseDocument(createHorseDocument(state.horses[0])).originalOwner.name, 'NotHorseKeeper');
});

test('approved legacy migration is backed up once; ownerless imports remain unknown after reopening', async t => {
  const { store, directory } = await storeFixture(t);
  const legacy = store.snapshot();
  delete legacy.keeperId;
  delete legacy.horses[0].originalOwner;
  await store.persist(legacy);
  const reopened = await new GameStore(directory, catalog, settings).init();
  const upgraded = reopened.snapshot();
  assert.equal(upgraded.horses[0].originalOwner.id, upgraded.keeperId);
  assert.equal(upgraded.horses[0].originalOwner.name, 'Horsekeeper');
  assert.equal(
    (await readdir(join(directory, 'backups'))).filter(name => name.startsWith('pre-owner-identity-')).length,
    1
  );
  const document = createHorseDocument(horse);
  delete document.horse.originalOwner;
  await reopened.action('import-horse', document);
  const again = await new GameStore(directory, catalog, settings).init();
  assert.equal(again.snapshot().horses[1].originalOwner.name, 'Unknown');
  assert.notEqual(again.snapshot().horses[1].originalOwner.id, again.snapshot().keeperId);
});
