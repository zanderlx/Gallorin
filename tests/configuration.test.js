import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { GameStore } from '../src/store.js';
import { draftDefinition } from '../public/definitions.js';
import { newZoneDraft } from '../public/zones.js';
import { defaultRaritySettings, validateRaritySettings } from '../public/rarity-settings.js';
const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'aetherion-config-test-'));
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('aetherion-config-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  const store = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  return { directory, store, read: path => store.files.json(path) };
}
async function add(store, kind, values) {
  await store.action('save-definition', { kind, values: { ...draftDefinition(kind), ...values } });
  return store.getCatalog()[kind].find(d => d.name === values.name);
}

test('separate trait edits persist without changing species settings or existing horses', async t => {
  const { store, read } = await fixture(t);
  const species = store.getCatalog().species[0];
  const original = structuredClone(species);
  await store.action('save-traits', {
    id: species.id,
    traits: { Mane: ['Flowing'], Tail: ['Long'], Markings: ['Stars'] }
  });
  const saved = (await read('species.json')).find(s => s.id === species.id);
  assert.deepEqual(saved.traits, { Mane: ['Flowing'], Tail: ['Long'], Markings: ['Stars'] });
  assert.equal(saved.name, original.name);
  assert.equal(saved.rarityTier, original.rarityTier);
  assert.deepEqual(saved.attributes, original.attributes);
  const before = store.snapshot();
  await assert.rejects(store.action('save-traits', { id: species.id, traits: { Mane: 'invalid' } }));
  assert.deepEqual(store.snapshot(), before);
  await store.action('save-traits', { id: species.id, traits: {} });
  assert.deepEqual((await read('species.json')).find(s => s.id === species.id).traits, {});
});
test('first startup seeds nineteen integer mutation weights and all local configuration files', async t => {
  const { store, read } = await fixture(t);
  const standards = (await read('mutations.json')).filter(m => m.type === 'Standard');
  assert.equal(standards.length, 19);
  assert.equal(
    standards.reduce((n, m) => n + m.weight, 0),
    10101
  );
  const settings = await read('spawn-settings.json');
  assert.equal(settings.ALLOW_DUPLICATE_MUTATIONS, false);
  assert.deepEqual(settings.tierWeights, { 0: 10, 1: 40, 2: 100, 3: 250, 4: 500 });
  assert.equal((await read('personalities.json')).length, catalog.personalities.length);
  for (const id of (await read('index.json')).zoneIds) {
    const zone = await read(`zones/${id}.json`);
    assert.ok(zone.creatures.every(c => store.getCatalog().species.some(s => s.id === c.speciesId)));
  }
  const solar = (await read('mutations.json')).find(m => m.name === 'Solar' && m.type === 'Mutated');
  await store.action('delete-definition', { kind: 'mutations', id: solar.id });
  assert.equal((await read('spawn-settings.json')).cosmic.find(c => c.name === 'Solar').chance, 0);
  assert.ok(!(await read('mutations.json')).some(m => m.id === solar.id));
});

test('Gallorin defaults use the exact twenty-five species whitelist and supplied tiers', async t => {
  const { read } = await fixture(t);
  const species = await read('species.json');
  const zone = await read('zones/aetherion.json');
  assert.equal(zone.creatures.length, 25);
  assert.deepEqual(
    species
      .filter(s => s.rarityTier === 3)
      .map(s => s.name)
      .sort(),
    ['Akhal Teke', 'Clydesdale', 'Donkey', 'Fjord', 'Flora', 'Gargoyle', 'Lusitano', 'Marwari']
  );
  assert.deepEqual(
    species
      .filter(s => s.rarityTier === 2)
      .map(s => s.name)
      .sort(),
    ['Anticorn', 'Cactaline', 'Fae', 'Felorse', 'Hippocampus', 'Kelpie', 'Unicorn']
  );
  for (const creature of zone.creatures) {
    const entry = species.find(s => s.id === creature.speciesId);
    assert.equal(creature.weight, { 1: 40, 2: 100, 3: 250, 4: 500 }[entry.rarityTier]);
  }
  assert.deepEqual(
    species
      .filter(s => s.rarityTier === 1)
      .map(s => s.name)
      .sort(),
    ['Caniquine', 'Nephyrian', 'Serpentine']
  );
  assert.equal(
    zone.creatures.reduce((n, c) => n + c.weight, 0),
    6320
  );
});

test('rarity display colors migrate, save locally, and never change spawn configuration', async t => {
  const { directory, store, read } = await fixture(t);
  assert.deepEqual(await read('rarities.json'), defaultRaritySettings);
  await unlink(store.files.path('rarities.json'));
  await store.refreshConfiguration();
  assert.deepEqual(store.getCatalog().rarities, defaultRaritySettings);
  const spawning = await read('spawn-settings.json');
  const species = store.getCatalog().species;
  const zones = await read('zones/aetherion.json');
  const custom = validateRaritySettings({
    version: 1,
    colors: { ...defaultRaritySettings.colors, common: '#AABBCC', rare: '#123456', cosmic: null },
    glow: { ...defaultRaritySettings.glow, rare: false }
  });
  await store.action('rarity-settings', custom);
  assert.deepEqual(await read('rarities.json'), custom);
  const restored = await new GameStore(directory, catalog, defaults).init();
  assert.deepEqual(restored.getCatalog().rarities, custom);
  assert.deepEqual(await read('spawn-settings.json'), spawning);
  assert.deepEqual(await read('species.json'), species);
  assert.deepEqual(await read('zones/aetherion.json'), zones);
  const before = restored.snapshot();
  await assert.rejects(
    restored.action('rarity-settings', { ...custom, colors: { ...custom.colors, rare: 'red;url(bad)' } })
  );
  assert.deepEqual(restored.snapshot(), before);
  assert.deepEqual(await read('rarities.json'), custom);
});
test('species CRUD synchronizes selected zone IDs and tier weights without altering existing horses', async t => {
  const { store, read } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const horse = structuredClone(store.state.encounters.aetherion[0]);
  const species = await add(store, 'species', {
    name: 'Starlight Pony',
    rarityTier: 2,
    zoneIds: ['aetherion'],
    attributes: { stamina: 12 },
    traits: { Mane: ['Soft'], Tail: ['Long'] }
  });
  assert.equal((await read('zones/aetherion.json')).creatures.find(c => c.speciesId === species.id).weight, 100);
  await store.action('save-definition', {
    kind: 'species',
    id: species.id,
    values: { ...species, name: 'Moon Pony', rarityTier: 1, zoneIds: ['hallowhoof'] }
  });
  assert.ok(!(await read('zones/aetherion.json')).creatures.some(c => c.speciesId === species.id));
  assert.equal((await read('zones/hallowhoof.json')).creatures.find(c => c.speciesId === species.id).weight, 40);
  assert.ok((await read('zones/hallowhoof.json')).speciesPool.includes('Moon Pony'));
  assert.deepEqual(store.state.encounters.aetherion[0], horse);
  await store.action('delete-definition', { kind: 'species', id: species.id });
  assert.ok(!(await read('species.json')).some(s => s.id === species.id));
  assert.ok(!(await read('zones/hallowhoof.json')).creatures.some(c => c.speciesId === species.id));
});
test('asset metadata, species links, mutation thresholds and personality tags persist in master files', async t => {
  const { directory, store, read } = await fixture(t);
  const sp = store.getCatalog().species[0];
  const palette = await add(store, 'palettes', {
    name: 'Layered Gold',
    global: false,
    speciesIds: [sp.id],
    assetSkins: ['skin-gold']
  });
  const eye = await add(store, 'eyes', {
    name: 'Layered Eye',
    textureId: 'eye-texture',
    layers: [{ textureId: 'eye-overlay', color: '#123456', opacity: 0.4 }]
  });
  const mutation = await add(store, 'mutations', {
    name: 'Steady Heart',
    type: 'Standard',
    weight: 45,
    thresholds: { stamina: { min: 10, max: 20 } }
  });
  const personality = await add(store, 'personalities', {
    name: 'Explorer',
    emoji: '🧭',
    systemId: 'explorer-system',
    behaviorTags: ['curious', 'social']
  });
  assert.deepEqual((await read('palettes.json')).find(p => p.id === palette.id).assetSkins, ['skin-gold']);
  assert.equal((await read('eyes.json')).find(e => e.id === eye.id).layers[0].opacity, 0.4);
  assert.deepEqual((await read('mutations.json')).find(m => m.id === mutation.id).thresholds, {
    stamina: { min: 10, max: 20 }
  });
  assert.deepEqual((await read('personalities.json')).find(p => p.id === personality.id).behaviorTags, [
    'curious',
    'social'
  ]);
  assert.equal((await read('personalities.json')).find(p => p.id === personality.id).emoji, '🧭');
  await store.action('spawn-settings', { ALLOW_DUPLICATE_MUTATIONS: true });
  assert.equal((await read('spawn-settings.json')).ALLOW_DUPLICATE_MUTATIONS, true);
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(loaded.getCatalog().spawning.ALLOW_DUPLICATE_MUTATIONS, true);
  for (const [kind, entry] of [
    ['palettes', palette],
    ['eyes', eye],
    ['mutations', mutation],
    ['personalities', personality]
  ]) {
    await loaded.action('save-definition', {
      kind,
      id: entry.id,
      values: { ...entry, description: 'Updated locally' }
    });
    assert.equal((await loaded.files.json(`${kind}.json`)).find(d => d.id === entry.id).description, 'Updated locally');
    await loaded.action('delete-definition', { kind, id: entry.id });
    assert.ok(!(await loaded.files.json(`${kind}.json`)).some(d => d.id === entry.id));
  }
});
test('spawn trigger reads current file contents, preserves snapshots, and rejects malformed config', async t => {
  const { store, read } = await fixture(t);
  await store.action('visit', { locationId: 'aetherion' });
  const old = structuredClone(store.state.encounters.aetherion);
  const personality = {
    ...(await read('personalities.json'))[0],
    name: 'File Explorer',
    systemId: 'file-explorer',
    behaviorTags: ['file-backed']
  };
  await store.files.atomic('personalities.json', [personality]);
  await store.action('search', { locationId: 'aetherion' });
  assert.ok(
    store.state.encounters.aetherion.every(
      h => h.personalityId === personality.id && h.personality.name === personality.name
    )
  );
  assert.notEqual(old[0].personality.name, personality.name);
  const before = store.snapshot();
  const eyes = await read('eyes.json');
  await store.files.atomic('eyes.json', [{ ...eyes[0], colors: ['invalid'] }]);
  await assert.rejects(store.action('search', { locationId: 'aetherion' }));
  assert.deepEqual(store.snapshot(), before);
  await store.files.atomic('eyes.json', eyes);
  const zone = await read('zones/aetherion.json');
  await store.files.atomic('zones/aetherion.json', { ...zone, tags: 'invalid' });
  await assert.rejects(store.action('search', { locationId: 'aetherion' }));
  assert.deepEqual(store.snapshot(), before);
  await store.files.atomic('zones/aetherion.json', zone);
});
test('new profile uses file-backed palette skins, eye layers, personality IDs and mutation thresholds', async t => {
  const { store } = await fixture(t);
  const species = await add(store, 'species', {
    name: 'Cloud Pony',
    rarityTier: 3,
    attributes: { stamina: 12 },
    traits: { Mane: ['Cloud'], Tail: ['Silk'] }
  });
  const palette = await add(store, 'palettes', {
    name: 'Cloud Colors',
    global: false,
    speciesIds: [species.id],
    assetSkins: ['cloud-skin']
  });
  const eye = await add(store, 'eyes', {
    name: 'Cloud Eye',
    textureId: 'cloud-eye',
    layers: [{ textureId: 'cloud-overlay', opacity: 0.7 }]
  });
  const personality = await add(store, 'personalities', {
    name: 'Cloud Watcher',
    systemId: 'cloud-watcher',
    behaviorTags: ['patient']
  });
  const mutation = await add(store, 'mutations', {
    name: 'Cloud Growth',
    type: 'Standard',
    weight: 1000000,
    thresholds: { stamina: { min: 10 } },
    sizeShift: 1
  });
  await store.files.atomic('eyes.json', [eye]);
  await store.files.atomic('personalities.json', [personality]);
  await store.action('save-zone', {
    ...newZoneDraft(),
    name: 'Cloud Zone',
    description: 'Soft clouds.',
    speciesPool: [species.name],
    palettePool: [palette.name]
  });
  const zone = store.state.customLocations.at(-1);
  await store.action('visit', { locationId: zone.id });
  for (const horse of store.state.encounters[zone.id]) {
    assert.equal(horse.speciesId, species.id);
    assert.equal(horse.paletteId, palette.id);
    assert.equal(horse.skinId, 'cloud-skin');
    assert.equal(horse.eyeId, eye.id);
    assert.equal(horse.eyeLayers[0].textureId, 'cloud-overlay');
    assert.equal(horse.personalityId, personality.id);
    assert.equal(horse.personalitySystemId, 'cloud-watcher');
    assert.equal(horse.mutations[0].id, mutation.id);
    assert.equal(horse.size, 'Big');
    assert.deepEqual(horse.traits.Mane, ['Cloud']);
  }
});
test('failed configuration writes roll back files and leave the player save untouched', async t => {
  const { store, read } = await fixture(t);
  const before = store.snapshot(),
    speciesBefore = await read('species.json');
  const original = store.files.atomic.bind(store.files);
  let fail = true;
  store.files.atomic = async (path, value) => {
    if (path === 'species.json' && fail) {
      fail = false;
      throw new Error('Simulated write failure');
    }
    return original(path, value);
  };
  await assert.rejects(add(store, 'species', { name: 'Must Not Save' }), /Simulated write failure/);
  assert.deepEqual(store.snapshot(), before);
  assert.deepEqual(await read('species.json'), speciesBefore);
});
test('startup recovers interrupted file transactions using the player commit marker', async t => {
  const { directory, store, read } = await fixture(t);
  const before = await read('personalities.json');
  const after = [{ ...before[0], name: 'Recovered Personality' }];
  const revision = 'recovery-test';
  const journal = { revision, before: { 'personalities.json': before }, after: { 'personalities.json': after } };
  await store.files.atomic('transaction.json', journal);
  await store.files.atomic('personalities.json', after);
  const rollback = await new GameStore(directory, catalog, defaults).init();
  assert.equal(rollback.getCatalog().personalities.length, before.length);
  await rollback.files.atomic('transaction.json', journal);
  const saved = JSON.parse(await readFile(join(directory, 'player', 'save.json'), 'utf8'));
  saved.configurationRevision = revision;
  await writeFile(join(directory, 'player', 'save.json'), JSON.stringify(saved));
  const committed = await new GameStore(directory, catalog, defaults).init();
  assert.equal(committed.getCatalog().personalities[0].name, 'Recovered Personality');
  assert.equal(committed.getCatalog().personalities.length, 1);
});
test('missing configuration index never silently replaces existing master files', async t => {
  const { directory, store, read } = await fixture(t);
  const species = await read('species.json');
  await unlink(store.files.path('index.json'));
  await assert.rejects(new GameStore(directory, catalog, defaults).init(), /index.json is missing/);
  assert.deepEqual(await read('species.json'), species);
});

test('Cosmic species persist with lower zone weight while hidden metadata survives edits', async t => {
  const { directory, store, read } = await fixture(t);
  const species = await add(store, 'species', {
    name: 'Cosmic Pony',
    rarityTier: 0,
    zoneIds: ['hallowhoof'],
    attributes: { stamina: 12 },
    traits: { Mane: ['Soft'], Tail: ['Long'] }
  });
  assert.equal((await read('zones/hallowhoof.json')).creatures.find(c => c.speciesId === species.id).weight, 10);
  const { attributes, systemId, ...editable } = species;
  await store.action('save-definition', {
    kind: 'species',
    id: species.id,
    values: { ...editable, name: 'Renamed Cosmic Pony', zoneIds: ['hallowhoof'] }
  });
  const saved = (await read('species.json')).find(s => s.id === species.id);
  assert.deepEqual(saved.attributes, attributes);
  assert.equal(saved.systemId, systemId);
  const settings = await read('spawn-settings.json');
  delete settings.tierWeights[0];
  await store.files.atomic('spawn-settings.json', settings);
  const restored = await new GameStore(directory, catalog, defaults).init();
  assert.equal(restored.getCatalog().spawning.tierWeights[0], 10);
  assert.equal(restored.getCatalog().species.find(s => s.id === species.id).rarityTier, 0);
});

test('mutation emojis persist and duplicate emoji selections are allowed', async t => {
  const { directory, store } = await fixture(t);
  const first = await add(store, 'mutations', { name: 'Emoji One', type: 'Standard', weight: 1, emoji: '🐴' });
  const second = await add(store, 'mutations', { name: 'Emoji Two', type: 'Standard', weight: 1, emoji: '🐴' });
  const restored = await new GameStore(directory, catalog, defaults).init();
  for (const entry of [first, second])
    assert.equal(restored.getCatalog().mutations.find(m => m.id === entry.id).emoji, '🐴');
});
test('palette variation updates live from JSON settings, preserves saved colors, and validates bounds', async t => {
  const { store, read, directory } = await fixture(t);
  // This test intentionally performs back-to-back palette searches.
  await store.action('settings', { ...store.state.settings, searchCooldownEnabled: false });
  assert.equal(store.getCatalog().spawning.paletteVariationPercent, 25);
  await store.action('spawn-settings', { paletteVariationPercent: 0 });
  store.rng = () => 0.25;
  await store.action('search', { locationId: 'aetherion' });
  const original = store.state.encounters.aetherion[0];
  assert.deepEqual(original.palette.colors, store.getCatalog().palettes.find(p => p.id === original.paletteId).colors);
  await store.action('catch', { id: original.id });
  const saved = structuredClone(store.state.horses[0].palette.colors);
  await store.action('spawn-settings', { paletteVariationPercent: 25 });
  assert.equal((await read('spawn-settings.json')).paletteVariationPercent, 25);
  await store.action('search', { locationId: 'aetherion' });
  const varied = store.state.encounters.aetherion[0];
  assert.notDeepEqual(varied.palette.colors, store.getCatalog().palettes.find(p => p.id === varied.paletteId).colors);
  assert.deepEqual(store.state.horses[0].palette.colors, saved);
  for (const value of [-1, 101, NaN, '25', null])
    await assert.rejects(store.action('spawn-settings', { paletteVariationPercent: value }));
  const reloaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(reloaded.getCatalog().spawning.paletteVariationPercent, 25);
});

test('per-palette variance persists, supports global fallback, and rejects invalid values', async t => {
  const { store, read } = await fixture(t);
  const palette = structuredClone(store.getCatalog().palettes.find(p => p.complete));
  await store.action('save-definition', {
    kind: 'palettes',
    id: palette.id,
    values: { ...palette, variationPercent: 12 }
  });
  assert.equal((await read('palettes.json')).find(p => p.id === palette.id).variationPercent, 12);
  for (const value of [-1, 101, '25'])
    await assert.rejects(
      store.action('save-definition', {
        kind: 'palettes',
        id: palette.id,
        values: { ...palette, variationPercent: value }
      })
    );
  await store.action('save-definition', {
    kind: 'palettes',
    id: palette.id,
    values: { ...palette, variationPercent: null }
  });
  assert.equal((await read('palettes.json')).find(p => p.id === palette.id).variationPercent, null);
});

test('Friesian spelling migrates existing registry and horses while preserving species links', async t => {
  const { store, read } = await fixture(t);
  const species = await read('species.json');
  const entry = species.find(s => s.name === 'Friesian');
  assert.ok(entry);
  const id = entry.id;
  entry.name = 'Friesan';
  await store.files.atomic('species.json', species);
  await store.action('visit', { locationId: 'aetherion' });
  const horse = store.state.encounters.aetherion[0];
  horse.species = 'Friesan';
  horse.speciesId = id;
  await store.persist(store.state);
  const restarted = await new GameStore(store.directory, catalog, defaults).init();
  assert.equal((await restarted.files.json('species.json')).find(s => s.id === id).name, 'Friesian');
  assert.equal(restarted.snapshot().encounters.aetherion[0].species, 'Friesian');
  assert.equal(restarted.snapshot().encounters.aetherion[0].speciesId, id);
  assert.ok(
    restarted
      .getCatalog()
      .locations.find(z => z.id === 'aetherion')
      .creatures.some(c => c.speciesId === id)
  );
});
