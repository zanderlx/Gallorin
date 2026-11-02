// Focused, muted renderer checks. All saves and screenshots use isolated temporary data.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('mute-audio');
app.on('window-all-closed', () => {});
const deadline = setTimeout(() => app.exit(1), 60000);
(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-folders-'));
  app.setPath('userData', join(directory, 'browser'));
  process.env.HORSE_DATA_DIR = join(directory, 'data');
  process.env.PORT = '0';
  await app.whenReady();
  const backend = await import(pathToFileURL(resolve(__dirname, '../server.js')).href);
  const origin = await backend.serverReady;
  const action = async (type, payload) => {
    const response = await fetch(origin + '/api/action', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    });
    if (!response.ok) throw Error(await response.text());
    return response.json();
  };
  await action('save-profile', { name: 'Folder Tester', about: '', avatarSeed: 1 });
  const result = await action('visit', { locationId: 'aetherion' });
  const ids = result.state.encounters.aetherion.slice(0, 3).map(h => h.id);
  for (const [index, id] of ids.entries()) await action('catch', { id, name: ['Willow', 'Ash', 'Moss'][index] });
  await action('favorite', { id: ids[1] });
  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 1100,
    webPreferences: { backgroundThrottling: false }
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
  await win.loadURL(origin + '/#stable/all');
  await wait(() => !!document.querySelector('#horse-sort'));
  await run(() => {
    const select = document.querySelector('#horse-sort');
    select.value = 'custom';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-horse-folder-new]').click();
    const form = document.querySelector('.horse-folder-dialog form');
    form.elements.name.value = 'Trail Friends';
    form.querySelector('[name=horseIds]').checked = true;
    form.requestSubmit();
  });
  await wait(() => !!document.querySelector('[data-horse-folder-edit]') && !document.querySelector('dialog[open]'));
  for (const motion of ['no-preference', 'reduce']) {
    await win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: motion }]
    });
    await win.webContents.debugger.detach();
    await run(() => document.querySelector('[data-music-toggle-all]').click());
    await wait(() =>
      [...document.querySelectorAll('[data-music-group]')].every(el => !el.open && !el.dataset.expanding)
    );
    await run(() => document.querySelector('[data-music-toggle-all]').click());
    await wait(() =>
      [...document.querySelectorAll('[data-music-group]')].every(el => el.open && !el.dataset.expanding)
    );
  }
  await run(() => {
    const slider = document.querySelector('#horse-grid-size');
    slider.value = '4';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    const grid = document.querySelector('.horse-folder-body .horse-grid');
    if (getComputedStyle(grid).gridTemplateColumns.split(' ').length !== 4) throw Error('Folder grid ignores slider');
    document.querySelector('[data-horse-folder-edit]').click();
    const form = document.querySelector('.horse-folder-dialog form');
    form.elements.name.value = 'Trail Companions';
    form.querySelectorAll('[name=horseIds]')[1].checked = true;
    form.requestSubmit();
  });
  await wait(
    () =>
      document.querySelector('.horse-folders')?.textContent.includes('Trail Companions') &&
      !document.querySelector('dialog[open]')
  );
  await run(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const folder = document.querySelector('[data-horse-folder-edit]').closest('details');
    if (folder.querySelectorAll('.horse-card').length !== 2) throw Error('Edited membership did not render');
    if (folder.querySelector('.horse-folder-body').getBoundingClientRect().height < 100)
      throw Error('Open folder body is not visible');
  });
  await run(async () => {
    // Hidden Chromium windows can hold CSS entry animations at time zero.
    for (const card of document.querySelectorAll('.horse-card'))
      card.getAnimations().forEach(animation => animation.finish());
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const card = document.querySelector('.horse-folder-body .horse-card');
    if (getComputedStyle(card).opacity !== '1' || card.getBoundingClientRect().height < 100)
      throw Error('Horse card is not visible');
  });
  await writeFile(join(directory, 'folders.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => {
    const search = document.querySelector('#horse-search');
    search.value = 'Willow';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    if (document.querySelectorAll('#collection-grid .horse-card').length !== 1) throw Error('Folder search failed');
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-horse-folder-edit]').click();
    const form = document.querySelector('.horse-folder-dialog form');
    form.querySelectorAll('[name=horseIds]').forEach(input => (input.checked = false));
    form.requestSubmit();
  });
  await wait(() => !document.querySelector('dialog[open]'));
  await run(() => {
    const folder = document.querySelector('[data-horse-folder-edit]').closest('details');
    if (folder.querySelector('.horse-card')) throw Error('Removing folder membership failed');
    document.querySelector('[data-horse-folder-delete]').click();
    document.querySelector('[data-delete-folder]').click();
  });
  await wait(() => !document.querySelector('[data-horse-folder-edit]'));
  const saved = await (await fetch(origin + '/api/state')).json();
  if (saved.state.horses.length !== 3 || saved.state.horseFolders.length !== 0)
    throw Error('Folder deletion changed horses');
  win.destroy();
  await backend.closeGameServer();
  clearTimeout(deadline);
  console.log(
    'Custom horse folder renderer checks passed (muted, normal and reduced motion). Diagnostics: ' + directory
  );
  app.exit(0);
})().catch(error => {
  console.error(error);
  app.exit(1);
});
