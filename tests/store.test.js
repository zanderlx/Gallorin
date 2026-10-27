import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { GameStore } from '../src/store.js';
import { newZoneDraft } from '../public/zones.js';
import { locationsFor } from '../public/zones.js';
import { horseFieldOptions } from '../public/horse-fields.js';
import { createHorseDocument, readHorseDocument } from '../public/horse-transfer.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'aetherion-test-'));
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('aetherion-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  return { directory, store: await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init() };
}
test('owned personality descriptions default on catch, persist, and reject invalid edits', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const [first, second] = store.state.encounters.aetherion;
  await assert.rejects(store.action('horse-description', { id: first.id, description: 'Wild edit' }));
  await store.action('catch', { id: first.id });
  assert.equal(store.state.horses[0].personalityDescription, first.personality.description);
  const description = 'Loves quiet trails.\n<script>plain text</script>';
  await store.action('horse-description', { id: first.id, description });
  await assert.rejects(store.action('horse-description', { id: first.id, description: 'a'.repeat(4001) }));
  assert.ok(store.state.encounters.aetherion.every(h => h.personalityDescription === h.personality.description));
  assert.ok(store.state.encounters.aetherion.some(h => h.id === second.id));
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(restored.state.horses[0].personalityDescription, description);
  assert.equal(restored.state.horses[0].personality.description, first.personality.description);
  await store.action('horse-description', { id: first.id, description: '' });
  assert.equal(store.state.horses[0].personalityDescription, '');
});
test('zone tags preserve legacy defaults and save additions, removals and empty lists', async t => {
  const { directory, store } = await fixture(t);
  const original = locationsFor(store.getCatalog(), store.state)[0];
  assert.deepEqual(original.tags, ['The evergreen realm', 'Free exploration']);
  const draft = { ...newZoneDraft(), name: 'Tagged Grove', description: 'A quiet grove.' };
  await store.action('save-zone', { ...draft, tags: [' Moonlit ', '<b>Quiet</b>', 'Moonlit'] });
  const zone = store.state.customLocations.at(-1);
  assert.deepEqual(zone.tags, ['Moonlit', '<b>Quiet</b>']);
  for (const tags of [null, 'text', [''], ['a'.repeat(101)], Array(21).fill('Tag')]) {
    await assert.rejects(store.action('save-zone', { ...zone, tags }));
  }
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.deepEqual(restored.state.customLocations.at(-1).tags, zone.tags);
  await restored.action('save-zone', { ...zone, tags: [] });
  assert.deepEqual(locationsFor(restored.getCatalog(), restored.state).find(l => l.id === zone.id).tags, []);
});
test('event classification can be enabled and disabled for custom and original zones', async t => {
  const { directory, store } = await fixture(t);
  const draft = { ...newZoneDraft(), name: 'Event Grove', description: 'A seasonal gathering.', event: true };
  delete draft.subtitle;
  await store.action('save-zone', draft);
  const zone = store.state.customLocations.at(-1);
  assert.equal(zone.event, 'Event');
  await assert.rejects(store.action('save-zone', { ...zone, event: 123 }));
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(restored.state.customLocations.at(-1).event, 'Event');
  await restored.action('save-zone', { ...zone, event: false });
  assert.equal(restored.state.customLocations.at(-1).event, null);
  const halloween = locationsFor(restored.getCatalog(), restored.state).find(l => l.id === 'hallowhoof');
  await restored.action('save-zone', { ...halloween, event: true });
  assert.equal(
    locationsFor(restored.getCatalog(), restored.state).find(l => l.id === halloween.id).event,
    halloween.event
  );
  await restored.action('save-zone', { ...halloween, event: false });
  assert.equal(locationsFor(restored.getCatalog(), restored.state).find(l => l.id === halloween.id).event, null);
});
test('horse JSON export imports copies with fresh IDs, capacity checks and atomic validation', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  await store.action('catch', { id: store.state.encounters.aetherion[0].id, name: 'Moonbeam' });
  const original = store.state.horses[0];
  await store.action('horse-notes', { id: original.id, notes: 'Favorite trail.\n<script>plain text</script>' });
  await store.action('horse-description', { id: original.id, description: 'Quiet and patient.' });
  const before = store.snapshot();
  const document = JSON.parse(JSON.stringify(createHorseDocument(before.horses[0])));
  assert.equal(document.format, 'aetherion-horse');
  assert.equal(document.version, 1);
  assert.deepEqual(store.snapshot(), before);
  await store.action('import-horse', document);
  const imported = store.state.horses.at(-1);
  assert.notEqual(imported.id, original.id);
  assert.equal(imported.rarityTier, original.rarityTier);
  assert.equal(imported.speciesEvent, original.speciesEvent);
  assert.deepEqual(readHorseDocument(createHorseDocument(imported)), readHorseDocument(document));
  assert.deepEqual(store.state.horses[0], before.horses[0]);
  assert.equal(store.state.gold, before.gold);
  await store.action('import-horse', document);
  assert.equal(new Set(store.state.horses.map(h => h.id)).size, 3);
  const invalid = [
    d => (d.horse.rarityTier = 8),
    d => (d.version = 99),
    d => (d.horse.birthday = '2025-02-30'),
    d => (d.horse.palette.colors.Hair = '#fff" onload="alert(1)'),
    d => delete d.horse.palette.colors.Nose,
    d => (d.horse.eye.colors = []),
    d => (d.horse.sizePercent = 999),
    d => (d.horse.traits.Mane = 'Invalid'),
    d => (d.horse.notes = 'a'.repeat(4001))
  ];
  const validState = store.snapshot();
  for (const mutate of invalid) {
    const bad = structuredClone(document);
    mutate(bad);
    await assert.rejects(store.action('import-horse', bad));
    assert.deepEqual(store.snapshot(), validState);
  }
  await store.action('settings', { ...store.state.settings, stableCapacity: 3, ignoreStableLimit: false });
  await assert.rejects(store.action('import-horse', document), /stable is full/);
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.deepEqual(restored.state.horses, store.state.horses);
});
test('combined Economy settings save gold and price atomically without changing Starting Gold', async t => {
  const { directory, store } = await fixture(t);
  const original = store.snapshot();
  await assert.rejects(store.action('economy-settings', { gold: 999, sellingPrice: -1 }));
  assert.deepEqual(store.snapshot(), original);
  await assert.rejects(store.action('economy-settings', { gold: -1, sellingPrice: 500 }));
  assert.deepEqual(store.snapshot(), original);
  await store.action('economy-settings', { gold: 999, sellingPrice: 500 });
  assert.equal(store.state.gold, 999);
  assert.equal(store.state.settings.sellingPrice, 500);
  assert.equal(store.state.settings.startingGold, original.settings.startingGold);
  const count = store.state.transactions.length;
  await store.action('economy-settings', { gold: 999, sellingPrice: 600 });
  assert.equal(store.state.transactions.length, count);
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(restored.state.gold, 999);
  assert.equal(restored.state.settings.sellingPrice, 600);
});
test('catch validates names atomically and saves the chosen name', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const id = store.state.encounters.aetherion[0].id;
  await assert.rejects(store.action('catch', { id, name: 'x'.repeat(61) }));
  assert.equal(store.state.horses.length, 0);
  assert.equal(store.state.encounters.aetherion[0].id, id);
  await store.action('catch', { id, name: '  Moonbeam  ' });
  assert.equal(store.state.horses[0].name, 'Moonbeam');
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(restored.state.horses[0].name, 'Moonbeam');
});
test('horse notes survive catching and reload; invalid notes leave the save unchanged', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const id = store.state.encounters.aetherion[0].id;
  const notes = 'Likes apples.\n<script>plain text</script>';
  await store.action('horse-notes', { id, notes });
  await assert.rejects(store.action('horse-notes', { id, notes: 'a'.repeat(4001) }));
  await store.action('catch', { id });
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(restored.state.horses[0].notes, notes);
  await store.action('horse-notes', { id, notes: '' });
  assert.equal(store.state.horses[0].notes, '');
});
test('edit mode updates only the selected horse with validated choices and dates', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const id = store.state.encounters.aetherion[0].id;
  const other = structuredClone(store.state.encounters.aetherion[1]);
  await assert.rejects(store.action('horse-field', { id, field: 'age', value: 'Elder' }));
  await store.action('developer-edit-mode', { enabled: true });
  const options = horseFieldOptions('personality', store.getCatalog(), store.state);
  assert.deepEqual(
    options.map(o => o.label),
    options.map(o => o.label).sort((a, b) => a.localeCompare(b))
  );
  for (const [field, value] of Object.entries({
    age: 'Elder',
    origin: 'Wild',
    size: 'Teacup',
    birthday: '2024-02-29',
    personality: options[0].value
  })) {
    await store.action('horse-field', { id, field, value });
  }
  const saved = structuredClone(store.state.encounters.aetherion[0]);
  for (const [field, value] of [
    ['birthday', '2023-02-29'],
    ['birthday', '9999-01-01'],
    ['age', 'Unknown'],
    ['origin', 'Unknown'],
    ['size', 'Unknown'],
    ['personality', 'Unknown'],
    ['gold', '100']
  ]) {
    await assert.rejects(store.action('horse-field', { id, field, value }));
  }
  assert.deepEqual(store.state.encounters.aetherion[0], saved);
  assert.deepEqual(store.state.encounters.aetherion[1], other);
  assert.equal(saved.sizePercent, 75);
  assert.equal(saved.personality.name, options[0].label);
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.deepEqual(restored.state.encounters.aetherion[0], saved);
});
test('zone and horse deletion persist without awarding gold or removing unrelated records', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const first = store.state.encounters.aetherion[0].id;
  await store.action('catch', { id: first });
  const second = store.state.encounters.aetherion[1].id;
  await store.action('sell', { id: second });
  const gold = store.state.gold;
  await store.action('save-zone', {
    ...newZoneDraft(),
    name: 'Delete Me',
    description: 'Temporary.',
    speciesPool: ['Unicorn'],
    palettePool: ['Natural Gold']
  });
  const zone = store.state.customLocations.at(-1);
  await store.action('visit', { locationId: zone.id });
  await store.action('delete-zone', { id: zone.id });
  assert.equal(store.state.encounters[zone.id], undefined);
  await store.action('delete-zone', { id: 'aetherion' });
  assert.equal(store.state.horses[0].id, first);
  assert.equal(store.state.sold[0].id, second);
  await store.action('delete-horse', { id: first });
  assert.equal(store.state.sold[0].id, second);
  await store.action('delete-horse', { id: second });
  assert.equal(store.state.gold, gold);
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(loaded.state.horses.length, 0);
  assert.equal(loaded.state.sold.length, 0);
  assert.equal(
    locationsFor(loaded.getCatalog(), loaded.state).some(z => z.id === 'aetherion' || z.id === zone.id),
    false
  );
  await assert.rejects(loaded.action('delete-horse', { id: first }));
});
test('keeper profile validates, persists and resets without affecting the game', async t => {
  const { directory, store } = await fixture(t);
  const profile = { name: 'Moon Keeper', about: 'I love unicorns. <script>plain text</script>', avatarSeed: 9876 };
  await store.action('save-profile', profile);
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.deepEqual(loaded.state.keeper, profile);
  for (const patch of [{ name: '' }, { about: 'a'.repeat(2001) }, { avatarSeed: -1 }, { avatarSeed: 'red' }]) {
    await assert.rejects(loaded.action('save-profile', { ...profile, ...patch }));
    assert.deepEqual(loaded.state.keeper, profile);
  }
  const gold = loaded.state.gold;
  await loaded.action('delete-profile');
  assert.equal(loaded.state.keeper, undefined);
  assert.equal(loaded.state.gold, gold);
});
test('current gold updates the live balance, records the difference and survives reload', async t => {
  const { directory, store } = await fixture(t);
  const before = store.state.gold;
  await store.action('current-gold', { gold: 9876 });
  assert.equal(store.state.gold, 9876);
  assert.equal(store.state.transactions.at(-1).amount, 9876 - before);
  assert.equal(store.state.settings.startingGold, defaults.startingGold);
  await store.action('current-gold', { gold: 0 });
  assert.equal(store.state.transactions.at(-1).amount, -9876);
  const reloaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(reloaded.state.gold, 0);
  for (const gold of [-1, 1.2, 1000000001, '500', null]) {
    const snapshot = store.snapshot();
    await assert.rejects(store.action('current-gold', { gold }));
    assert.deepEqual(store.snapshot(), snapshot);
  }
});
test('visit is stable; catching, naming and favoriting survive reload', async t => {
  const { directory, store } = await fixture(t);
  const initial = await store.action('visit', { locationId: 'aetherion' });
  const id = initial.encounters.aetherion[0].id;
  const again = await store.action('visit', { locationId: 'aetherion' });
  assert.deepEqual(again.encounters, initial.encounters);
  await store.action('catch', { id });
  await store.action('rename', { id, name: 'Moon & Marigold' });
  await store.action('favorite', { id });
  const restarted = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(restarted.state.horses[0].name, 'Moon & Marigold');
  assert.equal(restarted.state.horses[0].favorite, true);
  assert.deepEqual(restarted.state.horses[0].palette, initial.encounters.aetherion[0].palette);
  assert.equal(restarted.state.encounters.aetherion.length, defaults.horsesPerSearch);
  assert.notEqual(restarted.state.encounters.aetherion[0].id, id);
  assert.deepEqual(restarted.state.encounters.aetherion.slice(1), initial.encounters.aetherion.slice(1));
});
test('selling retains complete horse history and concurrent duplicate sales cannot award gold twice', async t => {
  const { store } = await fixture(t);
  await store.action('visit', { locationId: 'hallowhoof' });
  const horse = store.state.encounters.hallowhoof[0];
  const initialGold = store.state.gold;
  const optionalTraits = Object.entries(horse.traits)
    .filter(([key]) => !['Mane', 'Tail', 'Eye Color'].includes(key))
    .flatMap(([, values]) => values)
    .filter(value => !['None', 'Awaiting species data'].includes(value)).length;
  const expectedPrice = store.state.settings.sellingPrice + optionalTraits * 8 + horse.mutations.length * 75;
  await store.action('catch', { id: horse.id });
  const results = await Promise.allSettled([
    store.action('sell', { id: horse.id }),
    store.action('sell', { id: horse.id })
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(store.state.gold, initialGold + expectedPrice);
  assert.equal(store.state.horses.length, 0);
  assert.equal(store.state.sold.length, 1);
  assert.deepEqual(store.state.sold[0].traits, horse.traits);
  assert.equal(store.state.transactions.length, 1);
});

test('sale modifiers persist, quote imported features, and retain the sale-time breakdown', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const source = {
    ...store.state.encounters.aetherion[0],
    traits: { Mane: ['Long'], Tail: ['Long'], Pattern: ['Spots', 'Stripes'], Paint: ['Socks'] },
    mutations: ['Solar', 'Double Jump'],
    specialSpawn: 'Solar'
  };
  await store.action('import-horse', createHorseDocument(source));
  const id = store.state.horses.at(-1).id;
  const before = store.snapshot();
  await assert.rejects(
    store.action('economy-settings', { gold: 100, sellingPrice: 300, saleModifiers: { traitBonus: -1 } })
  );
  assert.deepEqual(store.snapshot(), before);
  await store.action('economy-settings', {
    gold: 0,
    sellingPrice: 300,
    saleModifiers: { traitBonus: 20, mutationBonus: 60, solarMultiplier: 12 }
  });
  const restored = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(restored.state.settings.saleModifiers.solarMultiplier, 12);
  await restored.action('sell', { id });
  // (300 + 3*20 + 2*60) * 12 = 5,760.
  assert.equal(restored.state.gold, 5760);
  assert.equal(restored.state.sold[0].soldFor, 5760);
  assert.equal(restored.state.sold[0].salePricing.traitCount, 3);
  assert.equal(restored.state.sold[0].salePricing.mutationCount, 2);
  assert.equal(restored.state.transactions.at(-1).amount, 5760);
  await restored.action('economy-settings', { gold: 5760, sellingPrice: 1, saleModifiers: { solarMultiplier: 1 } });
  assert.equal(restored.state.sold[0].salePricing.multiplier, 12);
  assert.equal(restored.state.sold[0].soldFor, 5760);
});
test('settings persist and affect new searches and sales, never existing horses', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const horse = store.state.encounters.aetherion[0];
  await store.action('catch', { id: horse.id });
  const original = structuredClone(store.state.horses[0]);
  await store.action('settings', { ...defaults, horsesPerSearch: 5, sellingPrice: 420 });
  await store.action('search', { locationId: 'aetherion' });
  assert.equal(store.state.encounters.aetherion.length, 5);
  assert.deepEqual(store.state.horses[0], original);
  await store.action('sell', { id: horse.id });
  assert.equal(store.state.gold, 495);
  const restarted = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(restarted.state.settings.horsesPerSearch, 5);
});
test('invalid settings and full stable fail without mutating the save', async t => {
  const { store } = await fixture(t);
  await assert.rejects(store.action('settings', { ...defaults, horsesPerSearch: 0 }));
  await assert.rejects(store.action('settings', { ...defaults, sellingPrice: -1 }));
  await store.action('settings', { ...defaults, stableCapacity: 1, ignoreStableLimit: false });
  await store.action('visit', { locationId: 'aetherion' });
  const [a] = store.state.encounters.aetherion;
  await store.action('catch', { id: a.id });
  const before = store.snapshot();
  await assert.rejects(store.action('catch', { id: store.state.encounters.aetherion[0].id }), /full/);
  assert.deepEqual(store.state, before);
});
test('backups retain preceding save and malformed save is not replaced', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  await store.action('backup');
  assert.ok((await readdir(join(directory, 'backups'))).some(file => file.startsWith('save-')));
  const previous = JSON.parse(await readFile(join(directory, 'backups', 'previous-save.json'), 'utf8'));
  assert.equal(previous.encounters.aetherion.length, 3);
  const filename = join(directory, 'player', 'save.json');
  await writeFile(filename, '{broken');
  await assert.rejects(new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init(), /preserved/);
  assert.equal(await readFile(filename, 'utf8'), '{broken');
});
test('reference imports preserve incomplete palettes but preview uses complete palettes', async t => {
  const { store } = await fixture(t);
  assert.equal(catalog.species.length, 46);
  assert.ok(catalog.palettes.some(p => !p.complete));
  for (const location of catalog.locations) {
    await store.action('visit', { locationId: location.id });
    for (const horse of store.state.encounters[location.id]) {
      assert.equal(Object.keys(horse.palette.colors).length, 9);
      assert.equal(horse.preview, false);
      assert.equal(horse.traits.Mane.length, 1);
      assert.equal(horse.traits.Tail.length, 1);
      assert.ok(horse.eye.colors.length);
    }
  }
});
test('custom zones persist, use selected pools, and edits preserve old encounters and collected horses', async t => {
  const { directory, store } = await fixture(t);
  await store.action('save-zone', {
    ...newZoneDraft(),
    name: 'Silver Vale',
    description: 'A frosted woodland.',
    atmosphere: 'frost',
    speciesPool: ['Ghoulsteed'],
    palettePool: ['Pumpkin']
  });
  const zone = store.state.customLocations[0];
  await store.action('visit', { locationId: zone.id });
  const horse = store.state.encounters[zone.id][0];
  assert.equal(horse.species, 'Ghoulsteed');
  assert.equal(horse.palette.name, 'Pumpkin');
  assert.equal(horse.locationId, zone.id);
  await store.action('catch', { id: horse.id });
  const oldEncounters = structuredClone(store.state.encounters[zone.id]);
  await store.action('save-zone', {
    ...zone,
    speciesPool: ['Unicorn'],
    palettePool: ['Emerald'],
    name: 'Silver Haven'
  });
  assert.deepEqual(store.state.encounters[zone.id], oldEncounters);
  await store.action('search', { locationId: zone.id });
  assert.ok(store.state.encounters[zone.id].every(h => h.species === 'Unicorn' && h.palette.name === 'Emerald'));
  assert.equal(store.state.horses[0].palette.name, 'Pumpkin');
  const reloaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(reloaded.state.customLocations[0].name, 'Silver Haven');
  assert.equal(reloaded.state.horses[0].id, horse.id);
  await reloaded.action('save-zone', { ...reloaded.state.customLocations[0], enabled: false });
  await assert.rejects(reloaded.action('visit', { locationId: zone.id }), /Unknown location/);
  assert.equal(reloaded.state.horses[0].id, horse.id);
});
test('invalid, empty, duplicate and unknown zone edits are rejected without saving', async t => {
  const { store } = await fixture(t);
  const valid = { ...newZoneDraft(), name: 'A new zone', description: 'A lovely place.' };
  for (const patch of [
    { name: '' },
    { name: 'x'.repeat(61) },
    { description: '' },
    { atmosphere: 'unknown' },
    { speciesPool: [] },
    { speciesPool: ['Unknown horse'] },
    { palettePool: [] },
    { palettePool: ['Unknown palette'] },
    { id: 'missing-zone' },
    { name: 'aetherion wilds' }
  ]) {
    const before = store.snapshot();
    await assert.rejects(store.action('save-zone', { ...valid, ...patch }));
    assert.deepEqual(store.state, before);
  }
  await store.action('save-zone', valid);
  await assert.rejects(store.action('save-zone', { ...valid, name: 'A NEW ZONE' }), /already exists/);
  assert.equal(store.state.customLocations.length, 1);
});
test('old saves without custom zones load without changing existing data', async t => {
  const { directory, store } = await fixture(t);
  const legacy = store.snapshot();
  delete legacy.customLocations;
  await writeFile(join(directory, 'player', 'save.json'), JSON.stringify(legacy));
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.deepEqual(loaded.state, { ...legacy, customLocations: [] });
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'player', 'save.json'), 'utf8')), legacy);
});

test('Cosmic palette migration backs up stable sold and encounter records and persists once', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const original = store.snapshot();
  const horse = original.encounters.aetherion[0];
  original.horses = [{ ...horse, id: 'owned-cosmic', specialSpawn: 'Lunar', notes: 'Preserve notes' }];
  original.sold = [{ ...horse, id: 'sold-cosmic', specialSpawn: 'Solar', soldFor: 789 }];
  original.encounters.aetherion[0].mutations = [{ name: 'Astral' }];
  await writeFile(join(directory, 'player', 'save.json'), JSON.stringify(original));
  const migrated = await new GameStore(directory, catalog, defaults).init();
  assert.equal(migrated.state.horses[0].palette.name, 'Lunar');
  assert.equal(migrated.state.horses[0].notes, 'Preserve notes');
  assert.equal(migrated.state.sold[0].palette.name, 'Solar');
  assert.equal(migrated.state.sold[0].soldFor, 789);
  assert.equal(migrated.state.encounters.aetherion[0].palette.name, 'Astral');
  const backups = (await readdir(join(directory, 'backups'))).filter(n => n.startsWith('pre-cosmic-palettes-'));
  assert.equal(backups.length, 1);
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'backups', backups[0]), 'utf8')), original);
  const saved = await readFile(join(directory, 'player', 'save.json'), 'utf8');
  await migrated.refreshConfiguration();
  assert.equal(await readFile(join(directory, 'player', 'save.json'), 'utf8'), saved);
});

test('legacy zone Cosmic palettes are removed from local files on load', async t => {
  const { directory } = await fixture(t);
  const path = join(directory, 'config', 'zones', 'aetherion.json');
  const zone = JSON.parse(await readFile(path, 'utf8'));
  zone.palettePool.push('Solar', 'Lunar', 'Astral', 'Heavenly', 'Void');
  await writeFile(path, JSON.stringify(zone));
  const loaded = await new GameStore(directory, catalog, defaults).init();
  const saved = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(saved.palettePool, zone.palettePool.slice(0, -5));
  assert.deepEqual(loaded.getCatalog().locations.find(z => z.id === 'aetherion').palettePool, saved.palettePool);
  assert.ok((await readdir(join(directory, 'backups'))).some(n => n.startsWith('pre-cosmic-zone-cleanup-')));
});

test('Game Settings saves duplicate mutation preference to spawn configuration atomically', async t => {
  const { directory, store } = await fixture(t);
  const payload = { ...store.state.settings, ALLOW_DUPLICATE_MUTATIONS: true };
  await store.action('settings', payload);
  const spawn = JSON.parse(await readFile(join(directory, 'config', 'spawn-settings.json'), 'utf8'));
  assert.equal(spawn.ALLOW_DUPLICATE_MUTATIONS, true);
  const loaded = await new GameStore(directory, catalog, defaults).init();
  assert.equal(loaded.getCatalog().spawning.ALLOW_DUPLICATE_MUTATIONS, true);
  await assert.rejects(loaded.action('settings', { ...payload, ALLOW_DUPLICATE_MUTATIONS: 'yes' }));
  assert.equal(loaded.getCatalog().spawning.ALLOW_DUPLICATE_MUTATIONS, true);
});

test('mutation system identifiers are random on creation and preserved on rename', async t => {
  const { directory, store } = await fixture(t);
  const values = {
    name: 'New Mutation',
    description: 'Example',
    type: 'Standard',
    weight: 10,
    thresholds: {},
    sizeShift: 0
  };
  await store.action('save-definition', { kind: 'mutations', values });
  const mutation = store.getCatalog().mutations.find(m => m.name === values.name);
  assert.match(mutation.systemId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  await store.action('save-definition', {
    kind: 'mutations',
    id: mutation.id,
    values: { ...values, name: 'Renamed Mutation' }
  });
  assert.equal(store.getCatalog().mutations.find(m => m.id === mutation.id).systemId, mutation.systemId);
  const loaded = await new GameStore(directory, catalog, defaults).init();
  assert.equal(loaded.getCatalog().mutations.find(m => m.id === mutation.id).systemId, mutation.systemId);
});

test('legacy horses receive separate persisted skills without overwriting existing progress', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const original = store.snapshot();
  const [first, second] = original.encounters.aetherion;
  original.horses = [
    { ...first, id: 'skill-a', skills: { agility: { level: 5, xp: 90 } } },
    { ...second, id: 'skill-b' }
  ];
  delete original.horses[1].skills;
  await writeFile(join(directory, 'player', 'save.json'), JSON.stringify(original));
  const migrated = await new GameStore(directory, catalog, defaults).init();
  assert.deepEqual(migrated.state.horses[0].skills.agility, { level: 5, xp: 90 });
  assert.deepEqual(migrated.state.horses[1].skills.agility, { level: 0, xp: 0 });
  const loaded = await new GameStore(directory, catalog, defaults).init();
  assert.deepEqual(loaded.state.horses[0].skills.agility, { level: 5, xp: 90 });
  assert.deepEqual(loaded.state.horses[1].skills.agility, { level: 0, xp: 0 });
  assert.ok((await readdir(join(directory, 'backups'))).some(n => n.startsWith('pre-horse-skills-')));
});

test('skill XP awards are validated, isolated per horse and persisted', async t => {
  const { directory, store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const first = store.state.encounters.aetherion[0];
  await store.action('catch', { id: first.id });
  const second = store.state.encounters.aetherion[0];
  await store.action('catch', { id: second.id });
  await assert.rejects(store.action('horse-skill-xp', { id: first.id, skill: 'agility', xp: 600 }));
  await store.action('developer-edit-mode', { enabled: true });
  await store.action('horse-skill-xp', { id: first.id, skill: 'agility', xp: 600 });
  assert.deepEqual(store.state.horses.find(h => h.id === first.id).skills.agility, { level: 2, xp: 75 });
  assert.deepEqual(store.state.horses.find(h => h.id === second.id).skills.agility, { level: 0, xp: 0 });
  for (const xp of [-1, 1.5, '10'])
    await assert.rejects(store.action('horse-skill-xp', { id: first.id, skill: 'wing', xp }));
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.deepEqual(loaded.state.horses.find(h => h.id === first.id).skills.agility, { level: 2, xp: 75 });
});

test('selling directly from a wild encounter credits its quote without adding it to the stable', async t => {
  const { store } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const horse = store.state.encounters.aetherion[0];
  const before = store.state.gold;
  await store.action('sell', { id: horse.id });
  assert.equal(store.state.horses.length, 0);
  const sold = store.state.sold.find(h => h.id === horse.id);
  assert.ok(sold);
  assert.equal(store.state.gold, before + sold.salePricing.total);
  assert.ok(!store.state.encounters.aetherion.some(h => h.id === horse.id));
  await assert.rejects(store.action('sell', { id: horse.id }));
  assert.equal(store.state.gold, before + sold.salePricing.total);
});

test('taming and selling refill only their slot; reload and visit preserve all other encounters', async t => {
  const { store, directory } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const original = structuredClone(store.state.encounters.aetherion);
  const searches = store.state.searches.aetherion;
  await store.action('catch', { id: original[1].id });
  const caught = structuredClone(store.state.encounters.aetherion);
  assert.equal(caught.length, original.length);
  assert.deepEqual(caught[0], original[0]);
  assert.deepEqual(caught[2], original[2]);
  assert.notEqual(caught[1].id, original[1].id);
  assert.equal(store.state.searches.aetherion, searches);
  await store.action('sell', { id: caught[0].id });
  const sold = structuredClone(store.state.encounters.aetherion);
  assert.notEqual(sold[0].id, caught[0].id);
  assert.deepEqual(sold[1], caught[1]);
  assert.deepEqual(sold[2], caught[2]);
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  await loaded.action('visit', { locationId: 'aetherion' });
  assert.deepEqual(loaded.state.encounters.aetherion, sold);
  await loaded.action('search', { locationId: 'aetherion' });
  assert.ok(loaded.state.encounters.aetherion.every(h => !sold.some(old => old.id === h.id)));
});

test('search cooldown persists and blocks zone bypasses while capture/sale replacements keep zones filled', async t => {
  const { directory, store } = await fixture(t);
  await store.action('settings', { ...store.state.settings, searchCooldownEnabled: true, searchCooldownSeconds: 90 });
  await store.action('search', { locationId: 'aetherion' });
  const ids = store.state.encounters.aetherion.map(h => h.id);
  await assert.rejects(store.action('search', { locationId: 'aetherion' }), /cooldown/);
  await assert.rejects(store.action('search', { locationId: 'hallowhoof' }), /cooldown/);
  await store.action('visit', { locationId: 'hallowhoof' });
  assert.equal(store.state.encounters.hallowhoof.length, 3);
  await store.action('catch', { id: ids[0] });
  assert.equal(store.state.encounters.aetherion.length, 3);
  assert.deepEqual(
    store.state.encounters.aetherion.slice(1).map(h => h.id),
    ids.slice(1)
  );
  assert.ok(!ids.includes(store.state.encounters.aetherion[0].id));
  for (const id of ids.slice(1)) await store.action('sell', { id });
  assert.equal(store.state.encounters.aetherion.length, 3);
  assert.ok(store.state.encounters.aetherion.every(h => !ids.includes(h.id)));
  assert.ok(store.state.searchAvailableAt > Date.now());
  const saved = JSON.parse(await readFile(join(directory, 'player', 'save.json'), 'utf8'));
  saved.encounters.hallowhoof = [];
  await writeFile(join(directory, 'player', 'save.json'), JSON.stringify(saved));
  const refilled = await new GameStore(directory, catalog, defaults).init();
  await refilled.action('visit', { locationId: 'hallowhoof' });
  assert.equal(refilled.state.encounters.hallowhoof.length, 3);
  await assert.rejects(refilled.action('search', { locationId: 'hallowhoof' }), /cooldown/);
  const restored = await new GameStore(directory, catalog, defaults).init();
  assert.equal(restored.state.searchAvailableAt, store.state.searchAvailableAt);
  await assert.rejects(restored.action('search', { locationId: 'aetherion' }), /cooldown/);
  restored.state.searchAvailableAt = Date.now() - 1;
  await restored.action('search', { locationId: 'aetherion' });
  assert.equal(restored.state.encounters.aetherion.length, 3);
  await restored.action('settings', { ...restored.state.settings, searchCooldownEnabled: false });
  assert.equal(restored.state.searchAvailableAt, 0);
  await restored.action('settings', { ...restored.state.settings, searchCooldownEnabled: true });
  assert.equal(restored.state.searchAvailableAt, 0);
  await restored.action('search', { locationId: 'aetherion' });
  await restored.action('settings', { ...restored.state.settings, searchCooldownEnabled: false });
  await restored.action('search', { locationId: 'aetherion' });
  const id = restored.state.encounters.aetherion[0].id;
  await restored.action('catch', { id });
  assert.equal(restored.state.encounters.aetherion.length, 3);
  await assert.rejects(
    restored.action('settings', { ...restored.state.settings, searchCooldownSeconds: 0 }),
    /cooldown/
  );
});

test('developer settings detect the secret within About Me, persist, and preserve profile text when disabled', async t => {
  const { directory, store } = await fixture(t);
  const profile = { name: 'Keeper', about: '', avatarSeed: 11 };
  assert.notEqual(store.state.settings.developerSettingsVisible, true);
  for (const about of ['I<3horses', 'I love horses', 'i<3horse']) {
    await store.action('save-profile', { ...profile, about });
    assert.notEqual(store.state.settings.developerSettingsVisible, true);
  }
  const about = 'My favorite horses live here. i<3horses More about me.';
  await store.action('save-profile', { ...profile, about });
  assert.equal(store.state.settings.developerSettingsVisible, true);
  const reopened = await new GameStore(directory, catalog, defaults).init();
  assert.equal(reopened.state.settings.developerSettingsVisible, true);
  await reopened.action('disable-developer-settings');
  assert.equal(reopened.state.settings.developerSettingsVisible, false);
  assert.equal(reopened.state.settings.developerEditMode, false);
  assert.equal(reopened.state.keeper.about, about);
  await reopened.action('save-profile', { ...profile, about });
  assert.equal(reopened.state.settings.developerSettingsVisible, false);
  await reopened.action('save-profile', profile);
  assert.equal(reopened.state.settings.developerSettingsVisible, false);
  await reopened.action('save-profile', { ...profile, about: 'i<3horses' });
  assert.equal(reopened.state.settings.developerSettingsVisible, true);
});
