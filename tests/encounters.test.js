import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosmicForRoll, pickWeighted, rollMutations, rollSize, spawnHorse } from '../src/spawning.js';
import { defaultSpawnSettings as defaults, standardTokens } from '../public/spawn-config.js';
const settings = structuredClone(defaults);
const species = { id: 'pony', name: 'Pony', attributes: { stamina: 10 }, traits: { Mane: ['Soft'], Tail: ['Long'] } };
const mutations = Object.entries(standardTokens).map(([name, weight], i) => ({
  id: `mutation-${i}`,
  name,
  type: 'Standard',
  weight,
  thresholds: {}
}));
const catalog = {
  species: [species, { ...species, id: 'cosmic-only', name: 'Sky Pony' }],
  mutations,
  spawning: settings,
  palettes: [{ id: 'gold', name: 'Gold', complete: true, colors: { Hair: '#123456' }, assetSkins: ['skin-gold'] }],
  eyes: [{ id: 'brown', name: 'Brown', colors: ['#123456'], textureId: 'eye-brown', layers: [] }],
  personalities: [
    { id: 'curious', systemId: 'curious', name: 'Curious', description: 'Explores', behaviorTags: ['explorer'] }
  ]
};
const location = {
  id: 'meadow',
  name: 'Meadow',
  creatures: [{ speciesId: 'pony', weight: 500 }],
  palettePool: ['Gold']
};
const sequence = (values, fallback = 0.5) => {
  let i = 0;
  return () => (i < values.length ? values[i++] : fallback);
};

test('spawning uses species trait rules for wild and Cosmic horses', () => {
  const c = structuredClone(catalog);
  for (const s of c.species)
    s.traits = {
      Mane: ['Mane'],
      Tail: ['Tail'],
      Pattern: ['A', 'B', 'C', 'D', 'E'],
      Paint: ['A', 'B', 'C'],
      Cosmetic: ['A', 'B', 'C', 'D', 'E'],
      Keratin: ['Horn'],
      Ears: [],
      Whiskers: ['Whiskers']
    };
  const cosmic = spawnHorse(c, location, sequence([0.0005], 0));
  assert.equal(cosmic.spawnPath, 'Cosmic');
  assert.equal(cosmic.traits.Pattern.length, 4);
  assert.equal(cosmic.traits.Paint.length, 2);
  assert.equal(cosmic.traits.Cosmetic.length, 4);
  assert.deepEqual(cosmic.traits.Keratin, []);
  assert.deepEqual(cosmic.traits.Whiskers, []);
  const wild = spawnHorse(c, location, sequence([0.5], 0));
  assert.equal(wild.traits.Pattern.length, 0);
  assert.deepEqual(wild.traits.Mane, ['Mane']);
  assert.deepEqual(wild.traits.Tail, ['Tail']);
});
test('Cosmic split honors every cumulative boundary and the 0.325% total', () => {
  for (const [roll, name] of [
    [0, 'Solar'],
    [0.1, 'Solar'],
    [0.100001, 'Lunar'],
    [0.2, 'Lunar'],
    [0.200001, 'Heavenly'],
    [0.25, 'Heavenly'],
    [0.250001, 'Void'],
    [0.3, 'Void'],
    [0.300001, 'Astral'],
    [0.325, 'Astral'],
    [0.325001, null],
    [99, null]
  ])
    assert.equal(cosmicForRoll(roll)?.name ?? null, name);
  assert.equal(
    Object.values(standardTokens).reduce((a, b) => a + b, 0),
    10101
  );
});
test('absolute ticket selection excludes zero weights and respects exact ticket boundaries', () => {
  const pool = [
    { id: 'zero', weight: 0 },
    { id: 'one', weight: -10 },
    { id: 'two', weight: 30 }
  ];
  assert.equal(pickWeighted(pool, undefined, () => 0).id, 'one');
  assert.equal(pickWeighted(pool, undefined, () => 0.25).id, 'two');
  assert.equal(pickWeighted(pool, undefined, () => 1).id, 'two');
  assert.throws(() => pickWeighted([{ weight: 0 }]));
});
test('Wild mutation chain uses <= probabilities and terminates on the first failure', () => {
  const all = rollMutations(catalog, species, null, settings, sequence([0.8, 0, 0.4, 0, 0.15, 0, 0.05, 0]));
  assert.equal(all.length, 4);
  assert.equal(new Set(all.map(m => m.id)).size, 4);
  let calls = 0;
  assert.deepEqual(
    rollMutations(catalog, species, null, settings, () => {
      calls++;
      return 0.800001;
    }),
    []
  );
  assert.equal(calls, 1);
  assert.equal(rollMutations(catalog, species, null, settings, sequence([0.8, 0, 0.400001])).length, 1);
});
test('Cosmic slot 1 is Cosmic and later slots use 80/40/15 chained chances', () => {
  const rolled = rollMutations(catalog, species, { name: 'Solar' }, settings, sequence([1, 0.8, 0, 0.4, 0, 0.15, 0]));
  assert.equal(rolled.length, 4);
  assert.equal(rolled[0].name, 'Solar');
  assert.ok(rolled.slice(1).every(m => m.type === 'Standard'));
});
test('duplicate lockout exhausts safely and the toggle allows repeated mutations', () => {
  const one = { ...catalog, mutations: [mutations[0]] };
  assert.equal(rollMutations(one, species, null, settings, () => 0).length, 1);
  const duplicates = rollMutations(one, species, null, { ...settings, ALLOW_DUPLICATE_MUTATIONS: true }, () => 0);
  assert.equal(duplicates.length, 4);
  assert.equal(new Set(duplicates.map(m => m.id)).size, 1);
  assert.equal(rollMutations({ ...catalog, mutations: [] }, species, null, settings, () => 0).length, 0);
});
test('mutation thresholds require present attributes within their bounds', () => {
  const pool = {
    ...catalog,
    mutations: [
      { ...mutations[0], thresholds: { stamina: { min: 11 } } },
      { ...mutations[1], thresholds: { stamina: { min: 5, max: 10 } } }
    ]
  };
  const rolled = rollMutations(pool, species, null, settings, () => 0);
  assert.deepEqual(
    rolled.map(m => m.id),
    [mutations[1].id]
  );
});
test('eleven-size ladder shifts and clamps, without repeating duplicate effects', () => {
  const dwarf = { id: 'd', name: 'Dwarfism' },
    giant = { id: 'g', name: 'Gigantism' };
  assert.equal(rollSize([], settings, () => 0.5).name, 'Normal');
  assert.equal(rollSize([dwarf, dwarf], settings, () => 0.5).name, 'Little');
  assert.equal(rollSize([giant], settings, () => 0.5).name, 'Big');
  assert.equal(rollSize([giant, dwarf], settings, () => 0.5).name, 'Normal');
  assert.equal(rollSize([dwarf], settings, () => 0).name, 'Teacup');
  assert.equal(rollSize([giant], settings, () => 1).name, 'Mammoth');
});
test('Cosmic ignores the zone species pool; Wild retains it and assigns profile IDs', () => {
  const cosmic = spawnHorse(catalog, location, sequence([0.003, 0.99, 0, 0.99]));
  assert.equal(cosmic.spawnPath, 'Cosmic');
  assert.equal(cosmic.speciesId, 'cosmic-only');
  assert.equal(cosmic.specialSpawn, 'Void');
  for (const [roll, gender] of [
    [0.49, 'Male'],
    [0.5, 'Female']
  ]) {
    const h = spawnHorse(catalog, location, sequence([0.5, 0, 0.99, roll]));
    assert.equal(h.spawnPath, 'Wild');
    assert.equal(h.speciesId, 'pony');
    assert.equal(h.gender, gender);
    assert.equal(h.paletteId, 'gold');
    assert.equal(h.skinId, 'skin-gold');
    assert.equal(h.eyeTextureId, 'eye-brown');
    assert.equal(h.personalityId, 'curious');
  }
});

test('Gallorin Cosmic encounters ignore its whitelist while Wild encounters retain it', () => {
  const aetherion = { ...location, id: 'aetherion' };
  const cosmic = spawnHorse(catalog, aetherion, sequence([0.003, 0.99, 0, 0.99]));
  assert.equal(cosmic.spawnPath, 'Cosmic');
  assert.equal(cosmic.speciesId, 'cosmic-only');
  const wild = spawnHorse(catalog, aetherion, sequence([0.5, 0.99, 0.99]));
  assert.equal(wild.speciesId, 'pony');
});

test('every zone gives every registered species an equal Cosmic interval, including event species', () => {
  const entries = [
    { ...species, id: 'pony', rarityTier: 4 },
    { ...species, id: 'event', name: 'Event Horse', event: 'Halloween', rarityTier: 1 },
    { ...species, id: 'custom', name: 'Custom Horse', rarityTier: 0 }
  ];
  const registry = { ...catalog, species: entries };
  for (const id of ['aetherion', 'hallowhoof', 'custom-zone']) {
    const zone = { ...location, id, creatures: [{ speciesId: 'pony', weight: 1 }] };
    for (let index = 0; index < entries.length; index++) {
      for (const offset of [0.01, 0.5, 0.99]) {
        const horse = spawnHorse(registry, zone, sequence([0.001, (index + offset) / entries.length]));
        assert.equal(horse.spawnPath, 'Cosmic');
        assert.equal(horse.speciesId, entries[index].id);
        assert.equal(horse.speciesEvent, entries[index].event || null);
      }
    }
    for (const roll of [0, 0.5, 0.999]) {
      const wild = spawnHorse(registry, zone, sequence([0.5, roll]));
      assert.equal(wild.spawnPath, 'Wild');
      assert.equal(wild.speciesId, 'pony');
    }
  }
});
