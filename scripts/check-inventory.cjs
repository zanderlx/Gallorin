// Focused inventory UI checks; saves and screenshots stay in an isolated temporary directory.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

app.commandLine.appendSwitch('mute-audio');
app.disableHardwareAcceleration();
const deadline = setTimeout(() => app.exit(1), 45000);
(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-inventory-ui-'));
  app.setPath('userData', join(directory, 'browser'));
  process.env.HORSE_DATA_DIR = join(directory, 'data');
  process.env.PORT = '0';
  const load = file => import(pathToFileURL(resolve(__dirname, '..', file)).href);
  const { GameStore } = await load('src/store.js');
  const { withInventorySamples } = await load('src/inventory-samples.js');
  const catalog = JSON.parse(await readFile(resolve(__dirname, '../data/definitions/catalog.json'), 'utf8'));
  const defaults = JSON.parse(await readFile(resolve(__dirname, '../data/defaults/settings.json'), 'utf8'));
  const store = await new GameStore(process.env.HORSE_DATA_DIR, catalog, defaults).init();
  let roll = 0;
  await store.persist(withInventorySamples(store.snapshot(), () => (roll += 0.15)));
  await app.whenReady();
  const backend = await load('server.js');
  const origin = await backend.serverReady;
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: { backgroundThrottling: false, offscreen: true }
  });
  win.webContents.setAudioMuted(true);
  const run = fn => win.webContents.executeJavaScript('(' + fn.toString() + ')()');
  const wait = async fn => {
    for (let i = 0; i < 150; i++) {
      if (await run(fn)) return;
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    throw Error('Timed out: ' + fn.toString());
  };
  await win.loadURL(origin + '/#inventory/all');
  await wait(() => document.querySelectorAll('.inventory-card').length === 6);
  const names = () => [...document.querySelectorAll('.inventory-card h2')].map(el => el.textContent);
  assert.deepEqual(await run(names), ['Apples', 'Berries', 'Carrots', 'Flowers', 'Lassos', 'Peaches']);
  await run(() => {
    const sort = document.querySelector('#inventory-sort');
    sort.value = 'count';
    sort.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const counts = () =>
    [...document.querySelectorAll('.inventory-item-count')].map(el =>
      Number(el.getAttribute('aria-label').split(': ')[1])
    );
  const ascending = await run(counts);
  assert.deepEqual(
    ascending,
    [...ascending].sort((a, b) => a - b)
  );
  await run(() => document.querySelector('[data-inventory-direction]').click());
  assert.deepEqual(await run(counts), [...ascending].reverse());
  await run(() => document.querySelector('#inventory-sort').focus());
  await new Promise(resolve => setTimeout(resolve, 350));
  await writeFile(join(directory, 'all-desktop.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => document.querySelector('.inventory-tabs a[href="#inventory/gear"]').click());
  await wait(
    () => document.querySelector('.inventory-tabs a[aria-current=page]')?.getAttribute('href') === '#inventory/gear'
  );
  assert.deepEqual(await run(names), ['Lassos']);
  assert.deepEqual(await run(counts), [5]);
  await run(() => document.querySelector('.inventory-tabs a[href="#inventory/food"]').click());
  await wait(() => document.querySelectorAll('.inventory-card').length === 5);
  assert.ok(!(await run(names)).includes('Lassos'));
  assert.equal(await run(() => document.querySelector('#inventory-sort').value), 'type');
  assert.equal(await run(() => document.querySelector('[data-inventory-direction]').dataset.inventoryDirection), 'asc');
  win.setSize(640, 900);
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.ok(await run(() => document.documentElement.scrollWidth <= innerWidth));
  await writeFile(join(directory, 'food-narrow.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => {
    const select = document.querySelector('#inventory-sort');
    select.value = 'rarity';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.ok(await run(() => !!document.querySelector('.inventory-section > h2')));
  assert.equal(await run(() => document.querySelectorAll('.inventory-item-type').length), 0);
  await run(() => {
    const select = document.querySelector('#inventory-sort');
    select.value = 'type';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const search = document.querySelector('#inventory-search');
    search.value = 'Apples';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.deepEqual(await run(names), ['Apples']);
  await run(() => {
    const search = document.querySelector('#inventory-search');
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await run(() => document.querySelector('.inventory-tabs a[href="#inventory/pets"]').click());
  await wait(() => !!document.querySelector('.inventory-empty'));
  assert.equal(await run(() => document.querySelector('.inventory-empty').textContent), 'Inventory is empty');
  win.destroy();
  await backend.closeGameServer();
  clearTimeout(deadline);
  console.log('Inventory rendering, filters, sorting, and narrow layout passed. Diagnostics: ' + directory);
  app.exit(0);
})().catch(error => {
  console.error(error);
  app.exit(1);
});
