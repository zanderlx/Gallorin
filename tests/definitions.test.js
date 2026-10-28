import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { GameStore } from '../src/store.js';
import { draftDefinition, defaultThemes, validateDefinition } from '../public/definitions.js';
import { locationsFor, newZoneDraft } from '../public/zones.js';
import { colorsForMode } from '../public/theme-modes.js';
import { validateCopyPatch, renderCopy, copyKey } from '../public/page-copy.js';
import { mutatedPalettes } from '../public/mutated-palettes.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json', import.meta.url), 'utf8'));
test('profile wording and deleted text survive restart, restore cleanly, and support live tokens', async t => {
  const { directory, store } = await fixture(t);
  await store.action('save-copy', {
    scope: 'horse/profile',
    entries: { 'horse.title': 'Meet {horseName}', 'personality.note': '' }
  });
  await store.action('save-copy', {
    scope: 'wilds/aetherion',
    entries: { 'encounters.count': '{encounterCount} visitors' }
  });
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(loaded.state.pageCopy['horse/profile']['personality.note'], '');
  assert.equal(
    renderCopy(loaded.state.pageCopy['horse/profile']['horse.title'], { horseName: 'Moonbeam' }),
    'Meet Moonbeam'
  );
  assert.equal(
    renderCopy(loaded.state.pageCopy['wilds/aetherion']['encounters.count'], { encounterCount: 2 }),
    '2 visitors'
  );
  await loaded.action('save-copy', { scope: 'horse/profile', entries: { 'personality.note': null } });
  assert.equal(loaded.state.pageCopy['horse/profile']['personality.note'], undefined);
});
test('page wording merges, resets, stays isolated and survives restart and backup', async t => {
  const { directory, store } = await fixture(t);
  await store.action('developer-edit-mode', { enabled: true });
  await store.action('save-copy', {
    scope: 'stable/all',
    entries: { 'page.title': 'My sanctuary', intro: '<script>plain text</script> {horseCount}' }
  });
  await store.action('save-copy', { scope: 'stable/all', entries: { 'page.title': 'Our sanctuary' } });
  await store.action('save-copy', { scope: 'site', entries: { 'brand-subtitle': 'A quiet place' } });
  await store.action('save-copy', { scope: 'wilds/aetherion', entries: { 'page.title': 'The woods' } });
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(loaded.state.settings.developerEditMode, true);
  assert.equal(loaded.state.pageCopy['stable/all']['page.title'], 'Our sanctuary');
  assert.equal(loaded.state.pageCopy['stable/all'].intro, '<script>plain text</script> {horseCount}');
  assert.equal(loaded.state.pageCopy.site['brand-subtitle'], 'A quiet place');
  await loaded.action('save-copy', { scope: 'stable/all', entries: { 'page.title': null } });
  assert.equal(loaded.state.pageCopy['stable/all']['page.title'], undefined);
  assert.equal(loaded.state.pageCopy['wilds/aetherion']['page.title'], 'The woods');
  const backup = JSON.parse(await readFile(join(directory, 'backups', 'previous-save.json'), 'utf8'));
  assert.equal(backup.pageCopy['stable/all']['page.title'], 'Our sanctuary');
});
test('invalid copy patches leave saves unchanged and live tokens are allowlisted', async t => {
  const { store } = await fixture(t);
  for (const payload of [
    { scope: '../player', entries: { title: 'bad' } },
    { scope: 'site', entries: JSON.parse('{"__proto__":"bad"}') },
    { scope: 'site', entries: { title: 'x'.repeat(4001) } },
    { scope: 'site', entries: { title: 42 } }
  ]) {
    const before = store.snapshot();
    assert.throws(() => validateCopyPatch(payload));
    await assert.rejects(store.action('save-copy', payload));
    assert.deepEqual(store.snapshot(), before);
  }
  assert.equal(
    renderCopy('{horseCount} horses, {gold} gold, {unknown}', { horseCount: 3, gold: 500 }),
    '3 horses, 500 gold, {unknown}'
  );
  assert.equal(copyKey('Heading'), copyKey('Heading'));
  assert.notEqual(copyKey('Heading'), copyKey('Other heading'));
});
test('dark themes are the default and custom variants persist independently', async t => {
  const { directory, store } = await fixture(t);
  await store.action('website-theme', { id: 'pastel-rose' });
  assert.equal(store.state.settings.websiteThemeMode, 'dark');
  const base = store.getCatalog().siteThemes.find(t => t.id === 'pastel-rose');
  const darkColors = colorsForMode(base),
    lightColors = colorsForMode(base, 'light');
  assert.notEqual(darkColors.bg, lightColors.bg);
  const custom = await add(store, 'siteThemes', {
    name: 'Two skies',
    scheme: 'dark',
    colors: darkColors,
    darkColors,
    lightColors
  });
  await store.action('website-theme', { id: custom.id, mode: 'light' });
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(loaded.state.settings.websiteThemeMode, 'light');
  assert.deepEqual(
    colorsForMode(loaded.getCatalog().siteThemes.at(-1), 'light'),
    Object.fromEntries(Object.entries(lightColors).map(([key, value]) => [key, value.toUpperCase()]))
  );
  await assert.rejects(store.action('website-theme', { id: custom.id, mode: 'bad' }));
  assert.throws(() => validateDefinition('siteThemes', { ...custom, darkColors: { ...darkColors, bg: 'invalid' } }));
});
test('dark pastel text and buttons have readable contrast', () => {
  const lum = hex =>
    hex
      .slice(1)
      .match(/../g)
      .map(v => parseInt(v, 16) / 255)
      .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  for (const theme of defaultThemes.slice(1)) {
    const c = colorsForMode(theme);
    for (const foreground of ['text', 'muted', 'gold'])
      for (const background of ['bg', 'panel', 'panel-deep', 'sidebar'])
        assert.ok(contrast(c[foreground], c[background]) >= 4.5, `${theme.name} ${foreground}/${background}`);
    assert.ok(contrast('#ffffff', c.burgundy) >= 4.5, theme.name);
  }
});
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'aetherion-definitions-'));
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('aetherion-definitions-'));
    await rm(directory, { recursive: true, force: true });
  });
  return { directory, store: await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init() };
}
async function add(store, kind, values) {
  await store.action('save-definition', { kind, values: { ...draftDefinition(kind), ...values } });
  return store.getCatalog()[kind].at(-1);
}

test('trait CRUD stays species-scoped, preserves horse snapshots and persists deletions', async t => {
  const { directory, store } = await fixture(t);
  const first = store.getCatalog().species[0];
  const second = store.getCatalog().species[1];
  const secondBefore = structuredClone(second.traits);
  await store.action('visit', { locationId: 'aetherion' });
  const horse = store.state.encounters.aetherion[0];
  await store.action('catch', { id: horse.id });
  const horsesBefore = structuredClone(store.state.horses);
  await store.action('save-traits', { id: first.id, traits: { Mane: ['Braided'], Tail: ['Long'], Paint: ['Spots'] } });
  await store.action('save-traits', { id: first.id, traits: { Mane: ['Short'], Tail: ['Long'], Paint: [] } });
  assert.deepEqual(store.getCatalog().species.find(s => s.id === second.id).traits, secondBefore);
  assert.deepEqual(store.state.horses, horsesBefore);
  await assert.rejects(store.action('save-traits', { id: 'missing', traits: {} }), /Species not found/);
  await assert.rejects(
    store.action('save-traits', { id: first.id, traits: { Paint: [], 'paint ': [] } }),
    /different name/
  );
  const loaded = await new GameStore(directory, catalog, defaults).init();
  assert.deepEqual(loaded.getCatalog().species.find(s => s.id === first.id).traits, {
    Mane: ['Short'],
    Tail: ['Long'],
    Paint: []
  });
  assert.deepEqual(loaded.state.horses, horsesBefore);
});
test('all five Mutated palettes preserve the supplied nine-region colors', () => {
  const expected = {
    Solar: ['#FFDF44', '#FECC32', '#B72908', '#FFFFFF', '#FEECA0', '#FFFAC5', '#FFFFFF', '#FF9E30', '#FF4800'],
    Lunar: ['#9AC6E1', '#CCE0FF', '#E2F7FF', '#0B0E28', '#7693B4', '#303C61', '#FFFFFF', '#5860A3', '#7693B4'],
    Astral: ['#E0AAFE', '#E0AAFE', '#E0AAFE', '#C67DFF', '#EBC8FE', '#EBC8FE', '#CFB8FC', '#C67DFF', '#C67DFF'],
    Heavenly: Array(9).fill('#FFFFFF'),
    Void: Array(9).fill('#000000')
  };
  for (const entry of mutatedPalettes) {
    assert.equal(entry.group, 'Mutated');
    assert.deepEqual(Object.values(entry.colors), expected[entry.name]);
    assert.doesNotThrow(() => validateDefinition('palettes', entry));
    assert.deepEqual(catalog.palettes.find(p => p.id === entry.id).colors, entry.colors);
  }
});
test('Cosmic palettes remain editable but cannot be selected as zone palettes', async t => {
  const { directory, store } = await fixture(t);
  await add(store, 'personalities', { name: 'Migration Test' });
  store.state.library.palettes = store.state.library.palettes.filter(p => !p.id.startsWith('mutated-palette-'));
  assert.equal(store.getCatalog().palettes.filter(p => p.group === 'Mutated').length, 5);
  const solar = store.getCatalog().palettes.find(p => p.name === 'Solar');
  await assert.rejects(
    store.action('save-zone', {
      ...newZoneDraft(),
      name: 'Solar Test',
      description: 'Sunlit.',
      speciesPool: ['Unicorn'],
      palettePool: ['Solar']
    }),
    /palette/
  );
  await store.action('save-definition', {
    kind: 'palettes',
    id: solar.id,
    values: { ...solar, colors: { ...solar.colors, Hair: '#123456' } }
  });
  assert.equal(store.getCatalog().palettes.find(p => p.id === solar.id).colors.Hair, '#123456');
  await store.action('delete-definition', { kind: 'palettes', id: solar.id });
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(
    loaded.getCatalog().palettes.some(p => p.id === solar.id),
    false
  );
});
test('definition deletion updates pools, closes empty zones and preserves existing horse snapshots', async t => {
  const { directory, store } = await fixture(t);
  const species = await add(store, 'species', { name: 'Temporary Pony' });
  await store.action('save-zone', {
    ...newZoneDraft(),
    name: 'Temporary Habitat',
    description: 'A test habitat.',
    speciesPool: [species.name],
    palettePool: ['Natural Gold']
  });
  const zone = store.state.customLocations.at(-1);
  await store.action('visit', { locationId: zone.id });
  await store.action('catch', { id: store.state.encounters[zone.id][0].id });
  const horse = structuredClone(store.state.horses[0]);
  await store.action('delete-definition', { kind: 'species', id: species.id });
  assert.equal(
    store.getCatalog().species.some(s => s.id === species.id),
    false
  );
  assert.equal(locationsFor(store.getCatalog(), store.state).find(z => z.id === zone.id).enabled, false);
  assert.deepEqual(store.state.horses[0], horse);
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(
    loaded.getCatalog().species.some(s => s.id === species.id),
    false
  );
});
test('every creatable definition type can be deleted and active website themes fall back', async t => {
  const { directory, store } = await fixture(t);
  for (const kind of [
    'species',
    'palettes',
    'eyes',
    'personalities',
    'mutations',
    'items',
    'themes',
    'atmospheres',
    'siteThemes'
  ]) {
    const entry = await add(store, kind, { name: `Disposable ${kind}` });
    if (kind === 'siteThemes') await store.action('website-theme', { id: entry.id });
    await store.action('delete-definition', { kind, id: entry.id });
    assert.equal(
      store.getCatalog()[kind].some(d => d.id === entry.id),
      false,
      kind
    );
  }
  assert.equal(store.state.settings.websiteTheme, 'default');
  await store.action('delete-definition', { kind: 'siteThemes', id: 'pastel-peach' });
  const loaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(
    loaded.getCatalog().siteThemes.some(t => t.id === 'pastel-peach'),
    false
  );
  await assert.rejects(store.action('delete-definition', { kind: 'siteThemes', id: 'default' }), /fallback/);
  await assert.rejects(store.action('delete-definition', { kind: '__proto__', id: 'bad' }));
});
test('new website presets are available in older editable catalog snapshots', async t => {
  const { store } = await fixture(t);
  await add(store, 'personalities', { name: 'Testing Migration' });
  store.state.library.siteThemes = store.state.library.siteThemes.filter(theme =>
    ['default', 'pastel-rose', 'pastel-lavender', 'pastel-mint', 'pastel-sky'].includes(theme.id)
  );
  assert.equal(store.getCatalog().siteThemes.length, 9);
  assert.equal(store.getCatalog().personalities.at(-1).name, 'Testing Migration');
});
test('new species, traits, palettes and atmospheres drive encounters and survive restart', async t => {
  const { directory, store } = await fixture(t);
  const species = await add(store, 'species', {
    name: 'Cloudpony',
    traits: { Mane: ['Cloud mane'], Tail: ['Cloud tail'], Halo: ['Rainbow'] }
  });
  const palette = await add(store, 'palettes', { name: 'Cloud pink' });
  const atmosphere = await add(store, 'atmospheres', { name: 'Cloudlands' });
  await store.action('save-zone', {
    ...newZoneDraft(),
    name: 'Cloud sanctuary',
    description: 'Soft clouds.',
    speciesPool: [species.name],
    palettePool: [palette.name],
    atmosphere: atmosphere.id
  });
  const zone = store.state.customLocations[0];
  await store.action('visit', { locationId: zone.id });
  const horse = store.state.encounters[zone.id][0];
  assert.equal(horse.species, species.name);
  assert.equal(horse.palette.name, palette.name);
  assert.deepEqual(horse.traits.Mane, ['Cloud mane']);
  assert.deepEqual(horse.traits.Halo, ['Rainbow']);
  assert.equal(horse.traitsComplete, true);
  await store.action('catch', { id: horse.id });
  const before = structuredClone(store.state.horses);
  await store.action('save-definition', {
    kind: 'species',
    id: species.id,
    values: { ...species, name: 'Skypony', traits: { Mane: ['Sky mane'], Tail: ['Sky tail'] } }
  });
  await store.action('save-definition', {
    kind: 'palettes',
    id: palette.id,
    values: { ...palette, name: 'Sky pink', colors: { ...palette.colors, Hair: '#123456' } }
  });
  assert.deepEqual(store.state.horses, before);
  assert.equal(store.state.encounters[zone.id][0].species, 'Cloudpony');
  await store.action('search', { locationId: zone.id });
  assert.equal(store.state.encounters[zone.id][0].species, 'Skypony');
  assert.equal(store.state.encounters[zone.id][0].palette.colors.Hair, '#123456');
  const reloaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(reloaded.getCatalog().species.at(-1).name, 'Skypony');
  assert.deepEqual(reloaded.state.horses, before);
});
test('built-in zone edits and renamed built-in species and palettes keep pool references valid', async t => {
  const { store } = await fixture(t);
  const original = locationsFor(store.getCatalog(), store.state)[0];
  await store.action('save-zone', { ...original, name: 'My Wilds' });
  assert.equal(locationsFor(store.getCatalog(), store.state).length, 2);
  for (const [kind, name, replacement] of [
    ['species', 'Unicorn', 'Mooncorn'],
    ['palettes', 'Natural Gold', 'Sunlight']
  ]) {
    const entry = store.getCatalog()[kind].find(d => d.name === name);
    await store.action('save-definition', { kind, id: entry.id, values: { ...entry, name: replacement } });
  }
  const location = locationsFor(store.getCatalog(), store.state)[0];
  assert.ok(location.speciesPool.includes('Mooncorn'));
  assert.ok(location.palettePool.includes('Sunlight'));
  await store.action('search', { locationId: original.id });
  assert.ok(store.state.encounters[original.id].every(h => location.speciesPool.includes(h.species)));
  assert.ok(store.state.encounters[original.id].every(h => h.species !== 'Unicorn'));
});
test('all definition categories support additions and updates', async t => {
  const { store } = await fixture(t);
  for (const kind of ['eyes', 'personalities', 'mutations', 'items', 'themes', 'siteThemes']) {
    const definition = await add(store, kind, { name: `Custom ${kind}`, description: 'First notes.' });
    await store.action('save-definition', {
      kind,
      id: definition.id,
      values: { ...definition, description: 'Expanded notes.' }
    });
    assert.equal(store.getCatalog()[kind].at(-1).description, 'Expanded notes.');
  }
  const theme = store.getCatalog().themes.at(-1);
  const item = store.getCatalog().items.at(-1);
  await store.action('save-definition', { kind: 'items', id: item.id, values: { ...item, theme: theme.name } });
  await store.action('save-definition', {
    kind: 'themes',
    id: theme.id,
    values: { ...theme, name: 'Renamed item theme' }
  });
  assert.equal(store.getCatalog().items.at(-1).theme, 'Renamed item theme');
});
test('website theme selection persists and the original theme cannot be overwritten', async t => {
  const { directory, store } = await fixture(t);
  const original = store.getCatalog().siteThemes[0];
  await assert.rejects(
    store.action('save-definition', { kind: 'siteThemes', id: 'default', values: { ...original, name: 'Changed' } }),
    /preserved/
  );
  await store.action('website-theme', { id: 'pastel-rose' });
  const reloaded = await new GameStore(directory, catalog, defaults, { rng: () => 0.5 }).init();
  assert.equal(reloaded.state.settings.websiteTheme, 'pastel-rose');
  const custom = await add(reloaded, 'siteThemes', { name: 'My pastel theme' });
  await reloaded.action('website-theme', { id: custom.id });
  assert.equal(reloaded.state.settings.websiteTheme, custom.id);
  await reloaded.action('website-theme', { id: 'default' });
  assert.deepEqual(reloaded.getCatalog().siteThemes[0].colors, original.colors);
});
test('invalid colors, unsafe traits, duplicate names and unknown IDs fail without changing data', async t => {
  const { store } = await fixture(t);
  for (const request of [
    { kind: 'species', values: { ...draftDefinition('species'), name: 'Unicorn' } },
    { kind: 'palettes', values: { ...draftDefinition('palettes'), name: 'Bad colors', colors: {} } },
    { kind: 'eyes', values: { ...draftDefinition('eyes'), name: 'Bad eyes', colors: ['red; color:white'] } },
    { kind: 'species', id: 'missing', values: { ...draftDefinition('species'), name: 'Missing' } },
    {
      kind: 'species',
      values: { ...draftDefinition('species'), name: 'Bad traits', traits: JSON.parse('{"__proto__":["bad"]}') }
    }
  ]) {
    const before = store.snapshot();
    await assert.rejects(store.action('save-definition', request));
    assert.deepEqual(store.state, before);
  }
});
test('pastel preset text and primary buttons meet AA normal-text contrast', () => {
  const lum = hex => {
    const values = hex
      .slice(1)
      .match(/../g)
      .map(v => parseInt(v, 16) / 255)
      .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  for (const theme of defaultThemes.slice(1)) {
    for (const foreground of ['text', 'muted', 'gold']) {
      for (const background of ['bg', 'panel', 'panel-deep', 'sidebar'])
        assert.ok(
          contrast(theme.colors[foreground], theme.colors[background]) >= 4.5,
          `${theme.name}: ${foreground} / ${background}`
        );
    }
    assert.ok(contrast('#FFFFFF', theme.colors.burgundy) >= 4.5, theme.name);
    assert.doesNotThrow(() => validateDefinition('siteThemes', theme));
  }
});
