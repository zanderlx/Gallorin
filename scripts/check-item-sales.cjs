const { app, BrowserWindow } = require('electron');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
app.commandLine.appendSwitch('mute-audio');
app.disableHardwareAcceleration();
const deadline = setTimeout(() => app.exit(1), 60000);
(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-economy-ui-'));
  app.setPath('userData', join(directory, 'browser'));
  process.env.HORSE_DATA_DIR = join(directory, 'data');
  process.env.PORT = '0';
  const load = path => import(pathToFileURL(resolve(__dirname, '..', path)).href);
  const { GameStore } = await load('src/store.js');
  const catalog = JSON.parse(await readFile(resolve(__dirname, '../data/definitions/catalog.json')));
  const defaults = JSON.parse(await readFile(resolve(__dirname, '../data/defaults/settings.json')));
  const store = await new GameStore(process.env.HORSE_DATA_DIR, catalog, defaults).init();
  store.state.settings.developerSettingsVisible = true;
  store.state.inventory = [
    { id: 'apple', name: 'Red Apples', type: 'food', rarity: 'common', count: 10 },
    { id: 'green-apple', name: 'Green Apples', type: 'food', rarity: 'rare', count: 8 },
    { id: 'pink-apple', name: 'Pink Apples', type: 'food', rarity: 'epic', count: 4 }
  ];
  store.state.transactions = Array.from({ length: 23 }, (_, i) => ({
    id: String(i),
    type: 'Food sold',
    itemName: 'Red Apples',
    count: 1,
    amount: 1,
    at: new Date(2026, 0, i + 1).toISOString()
  }));
  await store.persist(store.state);
  await app.whenReady();
  const backend = await load('server.js'),
    origin = await backend.serverReady;
  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 1050,
    webPreferences: { offscreen: true, backgroundThrottling: false }
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
  const state = async () => (await (await fetch(origin + '/api/state')).json()).state;
  await win.loadURL(origin + '/#inventory/food');
  await wait(() => !!document.querySelector('#inventory-sort'));
  assert.equal(await run(() => document.querySelector('#inventory-sort').value), 'type');
  await run(() => {
    const filter = document.querySelector('#inventory-type');
    filter.value = 'apple';
    filter.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(await run(() => document.querySelectorAll('[data-food-sell]').length), 0);
  await run(() => {
    location.hash = 'dev/economy';
  });
  await wait(() => !!document.querySelector('#item-sale-form'));
  assert.equal(await run(() => document.querySelectorAll('.economy-sections details[open]').length), 0);
  await new Promise(resolve => setTimeout(resolve, 250));
  await writeFile(join(directory, 'economy-collapsed.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => document.querySelector('[data-economy-show-all]').click());
  assert.ok(await run(() => [...document.querySelectorAll('.economy-sections details')].every(el => el.open)));
  assert.equal(await run(() => document.querySelectorAll('#economy-history tbody tr').length), 10);
  await run(() => document.querySelector('#economy-history [data-history-page="2"]').click());
  assert.match(await run(() => document.querySelector('#economy-history [role=status]').textContent), /Page 2 of 3/);
  await run(() => {
    const input = document.querySelector('#item-sale-form [name=rare]');
    input.value = '9';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#item-sale-form').requestSubmit();
  });
  await wait(
    () =>
      document.querySelector('#item-sale-form [name=rare]')?.value === '9' &&
      !document.querySelector('#item-sale-form [type=submit]').disabled
  );
  assert.equal((await state()).settings.itemSalePrices.rare, 9);
  await run(() => document.querySelector('[data-economy-show-all]').click());
  await run(() => {
    const input = document.querySelector('#economy-form [name=sellingPrice]');
    input.value = '60';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#economy-form').requestSubmit();
  });
  await wait(
    () =>
      document.querySelector('#economy-form [name=sellingPrice]')?.value === '60' &&
      document.querySelectorAll('.economy-sections details[open]').length === 0
  );
  assert.equal((await state()).gold, 0);
  await run(() => document.querySelector('[data-economy-show-all]').click());
  await run(() => document.querySelector('[data-economy-show-all]').click());
  assert.ok(await run(() => [...document.querySelectorAll('.economy-sections details')].every(el => !el.open)));
  await run(() => document.querySelectorAll('[data-music-toggle-folder]')[1].click());
  await wait(() => [...document.querySelectorAll('#item-sale-form details')].every(el => el.open));
  assert.equal(await run(() => document.querySelectorAll('#item-sale-form details').length), 6);
  assert.ok(
    await run(() =>
      [...document.querySelectorAll('#economy-form [data-playlist] > summary')].every(el =>
        el.querySelector('.music-chevron svg')
      )
    )
  );
  assert.ok(
    await run(() =>
      [...document.querySelectorAll('#economy-form [data-playlist] > summary')].some(
        el => el.textContent === 'Cosmic Multipliers'
      )
    )
  );
  assert.equal(
    await run(
      () =>
        getComputedStyle(document.querySelector('#economy-form [name=sellingPrice]').closest('.setting-row'))
          .borderBottomWidth
    ),
    '0px'
  );
  assert.equal(
    await run(
      () =>
        getComputedStyle(document.querySelector('#item-sale-form [name=epic]').closest('.setting-row'))
          .borderBottomWidth
    ),
    '0px'
  );
  assert.ok(
    await run(() =>
      document.querySelector('#economy-form [name=sellingPrice]').closest('details').matches('[data-music-group]')
    )
  );
  await new Promise(resolve => setTimeout(resolve, 400));
  await writeFile(join(directory, 'item-settings.png'), (await win.webContents.capturePage()).toPNG());
  win.setSize(640, 1000);
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.ok(await run(() => document.documentElement.scrollWidth <= innerWidth));
  await writeFile(join(directory, 'economy-narrow.png'), (await win.webContents.capturePage()).toPNG());
  win.destroy();
  await backend.closeGameServer();
  clearTimeout(deadline);
  console.log(
    'Inventory cards, default sorting, economy settings, bulk disclosure controls and pagination passed. Diagnostics: ' +
      directory
  );
  app.exit(0);
})().catch(error => {
  console.error(error);
  app.exit(1);
});
