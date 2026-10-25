import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {GameStore} from '../src/store.js';
import {normalizeCatalog} from '../public/definitions.js';
import {bundledPaletteAdditionIds,missingBundledPalettes,paletteAdditionsVersion} from '../src/palette-additions.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json',import.meta.url),'utf8'));
const defaults = JSON.parse(await readFile(new URL('../data/defaults/settings.json',import.meta.url),'utf8'));
const bundled = normalizeCatalog(catalog).palettes;
const additions = new Set(bundledPaletteAdditionIds);
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(),'gallorin-palette-test-'));
  t.after(async () => {assert.equal(dirname(resolve(directory)),resolve(tmpdir())); assert.ok(basename(directory).startsWith('gallorin-palette-test-')); await rm(directory,{recursive:true,force:true});});
  await new GameStore(directory,catalog,defaults).init();
  const paths = {save:join(directory,'player','save.json'),palettes:join(directory,'config','palettes.json')};
  const json = async path => JSON.parse(await readFile(path,'utf8'));
  return {directory,paths,json,write:(path,value) => writeFile(path,JSON.stringify(value,null,2)),load:() => new GameStore(directory,catalog,defaults).init()};
}
// Recreates an installation seeded before the bundled additions: 33 palettes and no upgrade marker.
async function legacy(f,edit = palettes => palettes) {
  const save = await f.json(f.paths.save);
  delete save.paletteAdditionsVersion;
  await f.write(f.paths.save,save);
  const palettes = edit((await f.json(f.paths.palettes)).filter(p => !additions.has(p.id)));
  await f.write(f.paths.palettes,palettes);
  return {save,palettes};
}

test('the known additions are exactly the forty complete bundled palettes and exclude Template',() => {
  assert.equal(bundledPaletteAdditionIds.length,40);
  assert.equal(new Set(bundledPaletteAdditionIds).size,40);
  for (const id of bundledPaletteAdditionIds) assert.equal(bundled.find(p => p.id === id)?.complete,true,id);
  assert.equal(bundled.filter(p => p.complete).length,73);
  assert.ok(!bundledPaletteAdditionIds.includes(bundled.find(p => p.name === 'Template').id));
});
test('fresh installs seed every complete palette, record the upgrade, and later launches leave files untouched',async t => {
  const f = await fixture(t);
  const palettes = await f.json(f.paths.palettes);
  assert.equal(palettes.length,73);
  assert.ok(!palettes.some(p => p.name === 'Template'));
  assert.equal((await f.json(f.paths.save)).paletteAdditionsVersion,paletteAdditionsVersion);
  const [save,registry] = await Promise.all([readFile(f.paths.save,'utf8'),readFile(f.paths.palettes,'utf8')]);
  await f.load();
  await f.load();
  assert.equal(await readFile(f.paths.save,'utf8'),save);
  assert.equal(await readFile(f.paths.palettes,'utf8'),registry);
  assert.ok(!(await readdir(join(f.directory,'backups'))).some(n => n.startsWith('pre-palette-additions-')));
});
test('a 33-palette registry receives the missing additions while every local customization is preserved',async t => {
  const f = await fixture(t);
  const {save,palettes} = await legacy(f,list => {
    const [first] = list, second = list.find(p => p.name === 'Oreo');
    first.colors = {...first.colors,'Coat Top':'#123456'};
    first.variationPercent = 37;
    second.name = 'Renamed Keepsake';
    second.group = 'My Favorites';
    return [...list,{...first,id:'palettes-custom-moss',name:'Custom Moss',systemId:'custom-moss',group:'Custom',variationPercent:5}];
  });
  assert.equal(palettes.length,34);
  const others = async () => Promise.all(['species','eyes','mutations','personalities','spawn-settings','index','zones/aetherion'].map(name => readFile(join(f.directory,'config',`${name}.json`),'utf8')));
  const unchanged = await others();
  const store = await f.load();
  assert.deepEqual(await others(),unchanged);
  const upgraded = await f.json(f.paths.palettes);
  assert.equal(upgraded.length,74);
  assert.deepEqual(upgraded.slice(0,34),palettes);
  for (const id of bundledPaletteAdditionIds) assert.deepEqual(upgraded.find(p => p.id === id),bundled.find(p => p.id === id));
  assert.equal(store.getCatalog().palettes.length,74);
  assert.equal(store.state.paletteAdditionsVersion,paletteAdditionsVersion);
  assert.equal(store.state.gold,save.gold);
  const backups = (await readdir(join(f.directory,'backups'))).filter(n => n.startsWith('pre-palette-additions-'));
  assert.equal(backups.length,2);
  assert.deepEqual(await f.json(join(f.directory,'backups',backups.find(n => n.endsWith('-palettes.json')))),palettes);
  assert.deepEqual(await f.json(join(f.directory,'backups',backups.find(n => !n.endsWith('-palettes.json')))),save);
  await assert.rejects(access(join(f.directory,'config','transaction.json')));
});
test('zone palette pools and existing horses are unchanged by the upgrade',async t => {
  const f = await fixture(t);
  const store = await f.load();
  await store.action('visit',{locationId:'aetherion'});
  await store.action('catch',{id:store.state.encounters.aetherion[0].id});
  const horses = structuredClone(store.state.horses);
  const pools = store.getCatalog().locations.map(z => [z.id,z.palettePool]);
  await legacy(f);
  const upgraded = await f.load();
  assert.deepEqual(upgraded.state.horses,horses);
  assert.deepEqual(upgraded.getCatalog().locations.map(z => [z.id,z.palettePool]),pools);
});
test('palettes deleted after the upgrade stay deleted on later launches',async t => {
  const f = await fixture(t);
  await legacy(f);
  const store = await f.load();
  const lemon = store.getCatalog().palettes.find(p => p.id === 'palette-lemon');
  await store.action('delete-definition',{kind:'palettes',id:lemon.id});
  await f.load();
  const reloaded = await f.load();
  assert.ok(!reloaded.getCatalog().palettes.some(p => p.id === lemon.id || p.name === 'Lemon'));
  assert.equal((await f.json(f.paths.palettes)).length,72);
});
test('recorded deletions and ID, name, system ID or species collisions keep local entries and skip the bundled copy',async t => {
  const f = await fixture(t);
  const save = await f.json(f.paths.save);
  save.deletedBuiltinPalettes = ['palette-orange'];
  await f.write(f.paths.save,save);
  const fae = {...bundled.find(p => p.id === 'palettes-fae-1'),name:'My Fae',systemId:'my-fae',colors:{...bundled.find(p => p.id === 'palettes-fae-1').colors,Hair:'#ABCDEF'}};
  const lemon = {...bundled.find(p => p.id === 'palette-lemon'),id:'palettes-my-lemon',systemId:'my-lemon',group:'Custom'};
  const citrus = {...bundled.find(p => p.id === 'palette-vegetable'),id:'palettes-citrus',name:'Citrus',group:'Custom'};
  const {palettes} = await legacy(f,list => [...list,fae,lemon,citrus]);
  const store = await f.load();
  const upgraded = await f.json(f.paths.palettes);
  assert.deepEqual(upgraded.slice(0,palettes.length),palettes);
  assert.equal(upgraded.length,palettes.length+36);
  assert.equal(upgraded.filter(p => p.id === 'palettes-fae-1').length,1);
  assert.equal(upgraded.filter(p => p.name.toLowerCase() === 'lemon').length,1);
  for (const id of ['palette-orange','palette-lemon','palette-vegetable']) assert.ok(!upgraded.some(p => p.id === id),id);
  assert.equal(store.getCatalog().palettes.length,upgraded.length);
  const catalogWithoutBisorse = {palettes:[],species:store.getCatalog().species.filter(s => s.id !== 'bisorse')};
  assert.ok(!missingBundledPalettes(catalog,catalogWithoutBisorse,{}).some(p => p.id === 'palettes-bisorse-1'));
  assert.ok(missingBundledPalettes(catalog,{palettes:[],species:store.getCatalog().species},{}).some(p => p.id === 'palettes-bisorse-1'));
});
test('a failed upgrade write restores the registry, leaves the save unmarked, and retries on the next launch',async t => {
  const f = await fixture(t);
  const {save} = await legacy(f);
  const registry = await f.json(f.paths.palettes);
  t.mock.method(console,'warn',() => {});
  const failing = new GameStore(f.directory,catalog,defaults);
  const original = failing.files.atomic.bind(failing.files);
  let fail = true;
  failing.files.atomic = async (path,value) => {if (path === 'palettes.json' && fail) {fail = false; throw new Error('Simulated write failure');} return original(path,value);};
  await failing.init();
  assert.equal(console.warn.mock.callCount(),1);
  assert.deepEqual(await f.json(f.paths.palettes),registry);
  assert.equal((await f.json(f.paths.save)).paletteAdditionsVersion,undefined);
  assert.equal((await f.json(f.paths.save)).configurationRevision,save.configurationRevision);
  assert.equal(failing.getCatalog().palettes.length,33);
  await assert.rejects(access(join(f.directory,'config','transaction.json')));
  const retried = await f.load();
  assert.equal(retried.getCatalog().palettes.length,73);
  assert.equal(retried.state.paletteAdditionsVersion,paletteAdditionsVersion);
});
