// Run with: node_modules/.bin/electron scripts/check-traits.cjs
// All saves and Chromium storage live in a fresh temporary directory.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, mkdir, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

app.disableHardwareAcceleration();
const deadline = setTimeout(() => {
  console.error('Traits smoke timed out');
  app.exit(1);
}, 60000);
(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-traits-smoke-'));
  app.setPath('userData', directory);
  process.env.HORSE_DATA_DIR = join(directory, 'data');
  process.env.PORT = '0';
  await app.whenReady();
  const backend = await import(pathToFileURL(resolve(__dirname, '../server.js')).href);
  const origin = await backend.serverReady;
  const result = await fetch(origin + '/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      type: 'save-profile',
      payload: { name: 'Trait tester', about: 'i<3horses', avatarSeed: 11 }
    })
  });
  if (!result.ok) throw new Error(await result.text());
  const window = new BrowserWindow({
    show: false,
    width: 1440,
    height: 1100,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  const errors = [];
  window.webContents.on('console-message', details => {
    if (details.level === 'error') errors.push(details.message);
  });
  await window.loadURL(origin + '/#dev/traits');
  const run = fn => window.webContents.executeJavaScript('(' + fn.toString() + ')()');
  const wait = async fn => {
    for (let i = 0; i < 100; i++) {
      if (await run(fn)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out: ' + fn.toString());
  };
  await wait(() => !!document.querySelector('#traits-form'));
  await run(() => {
    const search = document.querySelector('#trait-search');
    search.value = 'elven';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    if (!document.querySelector('.trait-category-card[hidden]')) throw new Error('Search did not filter');
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-action="add-trait-category"]').click();
    const row = document.querySelector('#trait-rows').lastElementChild;
    row.querySelector('input').value = 'Smoke category';
    const values = row.querySelector('textarea');
    values.value = 'Smoke trait\nSecond trait';
    values.dispatchEvent(new Event('input', { bubbles: true }));
    if (!document.querySelector('#traits-species').disabled) throw new Error('Species switch could lose edits');
    document.querySelector('#traits-form').requestSubmit();
  });
  await wait(() => !!document.querySelector('#traits-species') && !document.querySelector('#traits-species').disabled);
  await run(async () => {
    const data = await (await fetch('/api/state')).json();
    const species = data.catalog.species.find(s => s.id === document.querySelector('#traits-form').dataset.id);
    if (species.traits['Smoke category']?.length !== 2) throw new Error('Create did not persist');
    const row = [...document.querySelectorAll('.trait-category-card')].find(
      r => r.querySelector('input').value === 'Smoke category'
    );
    const values = row.querySelector('textarea');
    values.value = 'Renamed trait';
    values.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#traits-form').requestSubmit();
  });
  await wait(() => !document.querySelector('#traits-species').disabled);
  await run(() => {
    const row = [...document.querySelectorAll('.trait-category-card')].find(
      r => r.querySelector('input').value === 'Smoke category'
    );
    if (row.querySelector('textarea').value !== 'Renamed trait') throw new Error('Rename did not persist');
    row.querySelector('button').click();
    document.querySelector('#traits-form').requestSubmit();
  });
  await wait(() => !document.querySelector('#traits-species').disabled);
  await run(() => {
    document.querySelector('[data-action="load-supplied-traits"]').click();
    document.querySelector('[data-action="add-trait-category"]').click();
    document.querySelector('#traits-form button[type="reset"]').click();
    if (document.querySelector('#traits-species').disabled) throw new Error('Cancel did not restore species switching');
    if ([...document.querySelectorAll('.trait-category-card')].some(r => !r.querySelector('input').value))
      throw new Error('Cancel kept draft category');
  });
  const output = resolve(__dirname, '../test-results');
  await mkdir(output, { recursive: true });
  await run(() => {
    document.activeElement.blur();
    scrollTo(0, 0);
  });
  await writeFile(join(output, 'traits-desktop.png'), (await window.webContents.capturePage()).toPNG());
  window.setSize(700, 1000);
  await wait(() => document.querySelector('#sidebar').getBoundingClientRect().right <= 1);
  if (await run(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Narrow viewport overflows');
  await writeFile(join(output, 'traits-narrow.png'), (await window.webContents.capturePage()).toPNG());
  if (errors.length) throw new Error(errors.join('\n'));
  window.destroy();
  await backend.closeGameServer();
  clearTimeout(deadline);
  console.log('Traits UI smoke passed. Isolated data: ' + directory);
  app.exit(0);
})().catch(error => {
  console.error(error);
  app.exit(1);
});
