import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterPalettes, paletteResults, paletteCards, palettesManagerPage } from '../public/palettes-manager.js';
import { libraryEditorPage } from '../public/library-editor.js';
import { normalizeCatalog, regions } from '../public/definitions.js';
const entries = [
  {
    id: 'a',
    name: 'Amber',
    group: 'Natural',
    global: true,
    natural: true,
    description: 'Warm gold',
    colors: { coatTop: '#ABC123' },
    assetSkins: ['gold-skin']
  },
  {
    id: 'b',
    name: 'Blue',
    group: 'Unnatural',
    global: false,
    natural: false,
    description: 'Cool',
    colors: { coatTop: '#112233' }
  },
  { id: 'c', name: 'Apricot', group: 'Natural', global: true, natural: true, description: '' }
];
test('palette search combines text, hex, type, skins, scope and sort direction', () => {
  assert.deepEqual(
    filterPalettes(entries, 'gold abc123', 'Natural', 'name', 'asc', 'global').map(p => p.id),
    ['a']
  );
  assert.deepEqual(
    filterPalettes(entries, 'gold-skin').map(p => p.id),
    ['a']
  );
  assert.deepEqual(
    filterPalettes(entries, '', '', 'name', 'desc').map(p => p.name),
    ['Blue', 'Apricot', 'Amber']
  );
  assert.deepEqual(
    filterPalettes(entries, '', '', 'group', 'asc', 'linked').map(p => p.id),
    ['b']
  );
  assert.equal(filterPalettes(entries, 'missing').length, 0);
  assert.deepEqual(
    entries.map(p => p.id),
    ['a', 'b', 'c']
  );
});
test('palette cards group by type with shared mutation grid and safe nine-region swatches', () => {
  const html = paletteResults(filterPalettes(entries));
  assert.ok(html.indexOf('<h2>Natural') < html.indexOf('<h2>Unnatural'));
  assert.equal((html.match(/palette-card-swatches/g) || []).length, 3);
  assert.match(html, /mutation-definition-grid/);
  assert.match(html, /data-kind="palettes"/);
  const descending = paletteResults(entries, 'group', 'desc');
  assert.ok(descending.indexOf('<h2>Unnatural') < descending.indexOf('<h2>Natural'));
  const safe = paletteCards([{ ...entries[0], name: '<script>', colors: { coatTop: 'red;bad' } }]);
  assert.doesNotMatch(safe, /<script>|red;bad/);
  assert.match(safe, /&lt;script&gt;/);
});
test('palette page matches manager controls and retains every palette editing field', async () => {
  const catalog = normalizeCatalog(
    JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
  );
  const page = palettesManagerPage(catalog);
  for (const id of [
    'palette-search',
    'palette-group',
    'palette-scope',
    'palette-sort',
    'palette-grid',
    'palette-empty'
  ])
    assert.ok(page.includes(`id="${id}"`));
  assert.match(page, /definitions-header eye-manager-header/);
  assert.match(page, /class="eye-grid-controls"/);
  assert.match(page, /data-action="palette-sort-direction"/);
  const form = libraryEditorPage(
    'palettes',
    catalog,
    { settings: {}, customLocations: [] },
    catalog.palettes.find(p => p.complete)
  );
  for (const name of [
    'name',
    'description',
    'systemId',
    'global',
    'speciesIds',
    'assetSkins',
    'group',
    ...regions.map(r => `color:${r}`)
  ])
    assert.ok(form.includes(`name="${name}"`), name);
  assert.doesNotMatch(form, /data-action="duplicate-definition"/);
  assert.match(form, /data-action="delete-definition"/);
});
test('each palette segment has an instant tooltip with its region and uppercase hex', () => {
  const colors = Object.fromEntries(regions.map(region => [region, '#ffffff']));
  const html = paletteCards([{ ...entries[0], colors }]);
  for (const region of regions) assert.ok(html.includes(`data-tooltip="${region} - #FFFFFF"`));
  assert.equal((html.match(/data-tooltip=/g) || []).length, 9);
  assert.doesNotMatch(html, /<span title=/);
});

test('palette notes stay editable but are hidden on preview cards', async () => {
  const html = paletteCards([{ ...entries[0], description: 'Private keeper notes' }]);
  assert.doesNotMatch(html, /Private keeper notes|mutation-card-description/);
  const catalog = normalizeCatalog(
    JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
  );
  const form = libraryEditorPage(
    'palettes',
    catalog,
    { settings: {}, customLocations: [] },
    catalog.palettes.find(p => p.complete)
  );
  assert.match(form, />Notes<textarea name="description"/);
  assert.doesNotMatch(form, /Description & notes/);
});

test('themed placeholder palettes have all nine valid colors and previews omit natural status', async () => {
  const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
  for (const name of [
    'Mushroom',
    'Raven',
    'Peppermint',
    'Gingerbread',
    'Frozen',
    'Carrot',
    'Lettuce',
    'Tomato',
    'Clown',
    'Ruby',
    'Sapphire',
    'Topaz'
  ]) {
    const palette = catalog.palettes.find(p => p.name === name);
    assert.equal(palette.complete, true, name);
    for (const region of regions) assert.match(palette.colors[region], /^#[0-9A-F]{6}$/i, `${name} ${region}`);
  }
  assert.doesNotMatch(paletteCards([{ ...entries[0], group: 'Test', natural: true }]), /· Natural|· Unnatural/);
});
test('palette forms preserve unused internal identifiers without exposing editor fields', async () => {
  const catalog = normalizeCatalog(
    JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
  );
  const draft = {
    ...catalog.palettes.find(p => p.complete),
    systemId: 'keep-palette-id',
    assetSkins: ['skin-one', 'skin-two']
  };
  const form = libraryEditorPage('palettes', catalog, { settings: {}, customLocations: [] }, draft);
  assert.match(form, /type="hidden" name="systemId" value="keep-palette-id"/);
  assert.match(form, /type="hidden" name="assetSkins"/);
  assert.match(form, /skin-one/);
  assert.match(form, /skin-two/);
  assert.doesNotMatch(form, />System ID|Asset Skin IDs/);
});

test('palette forms use a Type dropdown and place scope after colors without Natural logic', async () => {
  const catalog = normalizeCatalog(
    JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
  );
  const form = libraryEditorPage(
    'palettes',
    catalog,
    { settings: {}, customLocations: [] },
    catalog.palettes.find(p => p.complete)
  );
  assert.match(form, />Type<select name="group" required>/);
  assert.doesNotMatch(form, /name="natural"|Natural palette|Palette type or event/);
  assert.ok(form.indexOf('color-editor-grid') < form.indexOf('name="global"'));
  assert.ok(form.indexOf('name="global"') < form.indexOf('palette-species-links'));
});

test('type grouping shows the group heading without repeating the type on each card', () => {
  const grouped = paletteResults([entries[0]], 'group');
  assert.match(grouped, /<h2>Natural<\/h2>/);
  assert.doesNotMatch(grouped, /<span>Natural<\/span>/);
  assert.match(paletteResults([entries[0]], 'name'), /<span>Natural<\/span>/);
});

test('palette variance displays the global default unless a custom override exists', async () => {
  const catalog = normalizeCatalog(
    JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'))
  );
  catalog.spawning = { paletteVariationPercent: 35 };
  const palette = catalog.palettes.find(p => p.complete);
  const render = variance =>
    libraryEditorPage(
      'palettes',
      catalog,
      { settings: {}, customLocations: [] },
      { ...palette, variationPercent: variance }
    );
  assert.match(render(null), /required value="35" data-default-variance="35"/);
  assert.match(render(12), /required value="12" data-default-variance="35"/);
  assert.match(render(0), /required value="0" data-default-variance="35"/);
});
