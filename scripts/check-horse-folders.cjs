// Focused, muted renderer checks. All saves and screenshots use isolated temporary data.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
function verifyFolderArrows(open) {
  for (const folder of document.querySelectorAll('[data-music-group]')) {
    const arrow = folder.querySelector('summary > .music-chevron');
    if (!arrow.querySelector('svg path')) throw Error('Folder arrow must use the audio library SVG chevron');
    // Finish only the arrow transition to inspect its target during the disclosure animation.
    getComputedStyle(arrow).transform;
    arrow.getAnimations().forEach(animation => animation.finish());
    const transform = getComputedStyle(arrow).transform;
    const rotation = transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
    if (Math.abs(rotation - (open ? -1 : 1)) > 0.01) throw Error('Folder arrow points in the wrong direction');
  }
}
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
    if (document.querySelector('#horse-sort').value !== 'custom' || !document.querySelector('.horse-folders'))
      throw Error('My Horses must open with the Custom folder layout');
    if (document.querySelector('[data-action=sort-direction]').dataset.direction !== 'asc')
      throw Error('Custom must start in ascending order');
    const direction = document.querySelector('[data-action=sort-direction]');
    if (!direction.disabled || !direction.hidden || getComputedStyle(direction).display !== 'none')
      throw Error('Custom must hide the automatic sort direction control');
    if (
      !document.querySelector('[data-music-group=favorites]').open ||
      document.querySelector('[data-music-group=unfiled]').open
    )
      throw Error('Only Favorites should start expanded');
  });
  if (process.argv.includes('--drag-only')) {
    const { checkHorseDragging } = require('./check-horse-folder-drag.cjs');
    await checkHorseDragging(win, action, ids, directory);
    win.destroy();
    await backend.closeGameServer();
    clearTimeout(deadline);
    console.log(
      'Horse drag ordering, cross-folder moves, filtered drops and reload checks passed (muted). Diagnostics: ' +
        directory
    );
    app.exit(0);
    return;
  }
  if (process.argv.includes('--favorites-only')) {
    win.webContents.debugger.attach('1.3');
    for (const motion of ['no-preference', 'reduce']) {
      await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: motion }]
      });
      for (const sort of ['recent', 'custom']) {
        await win.webContents.executeJavaScript(
          `document.querySelector('#horse-sort').value = ${JSON.stringify(sort)}`
        );
        await run(() => {
          const select = document.querySelector('#horse-sort');
          select.dispatchEvent(new Event('change', { bubbles: true }));
          const favorites = document.querySelector('[data-music-group=favorites]');
          if (favorites) favorites.open = false;
          document.querySelectorAll('.horse-card').forEach(card => card.getAnimations().forEach(a => a.finish()));
          const button = document.querySelector('[data-action=favorite][aria-pressed=false]');
          window.favoriteCheck = {
            id: button.dataset.id,
            toolbar: document.querySelector('.collection-toolbar'),
            grid: document.querySelector('#collection-grid'),
            music: document.querySelector('.music-player')
          };
          button.click();
        });
        await wait(() => {
          const selector = `[data-action=favorite][data-id="${window.favoriteCheck.id}"]`;
          return document.querySelector(selector)?.getAttribute('aria-pressed') === 'true';
        });
        await run(() => {
          const before = window.favoriteCheck;
          if (
            document.querySelector('.collection-toolbar') !== before.toolbar ||
            document.querySelector('#collection-grid') !== before.grid ||
            document.querySelector('.music-player') !== before.music
          )
            throw Error('Favoriting rebuilt the page');
          if (
            [...before.grid.querySelectorAll('.horse-card')].some(
              card => getComputedStyle(card).animationName !== 'none'
            )
          )
            throw Error('Favoriting replayed an entrance animation');
          const favorites = document.querySelector('[data-music-group=favorites]');
          if (favorites) {
            if (favorites.open) throw Error('Favoriting reset the collapsed folder');
            if (document.querySelector(`[data-music-group=unfiled] [data-action=favorite][data-id="${before.id}"]`))
              throw Error('Favorited horse remained in Unfiled');
          }
          document.querySelector(`[data-action=favorite][data-id="${before.id}"]`).click();
        });
        await wait(
          () =>
            document
              .querySelector(`[data-action=favorite][data-id="${window.favoriteCheck.id}"]`)
              ?.getAttribute('aria-pressed') === 'false'
        );
        await run(() => {
          if (
            [...document.querySelectorAll('#collection-grid .horse-card')].some(
              card => getComputedStyle(card).animationName !== 'none'
            )
          )
            throw Error('Unfavoriting replayed an entrance animation');
          if (
            document.querySelector('#horse-sort').value === 'custom' &&
            !document.querySelector(
              `[data-music-group=unfiled] [data-action=favorite][data-id="${window.favoriteCheck.id}"]`
            )
          )
            throw Error('Unfavorited horse did not return to Unfiled');
        });
      }
    }
    win.webContents.debugger.detach();
    win.destroy();
    await backend.closeGameServer();
    clearTimeout(deadline);
    console.log(
      'Favorite updates passed without page rebuilds or entrance animations (muted, normal and reduced motion). Diagnostics: ' +
        directory
    );
    app.exit(0);
    return;
  }
  await run(() => {
    document.querySelector('[data-horse-folder-new]').click();
    const form = document.querySelector('.horse-folder-dialog form');
    if (form.querySelector('[name=horseIds],fieldset')) throw Error('New Folder must only request a name');
    form.elements.name.value = 'Trail Friends';
  });
  for (const width of [1440, 480]) {
    win.setSize(width, 1100);
    await run(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const dialog = document.querySelector('.horse-folder-dialog');
      const title = dialog.querySelector('h2').getBoundingClientRect();
      const input = dialog.querySelector('[name=name]').getBoundingClientRect();
      const submit = dialog.querySelector('[type=submit]').getBoundingClientRect();
      if (Math.abs(title.left - input.left) > 1 || Math.abs(input.right - submit.right) > 1)
        throw Error('New Folder heading, field and actions are misaligned');
      if (dialog.scrollWidth > dialog.clientWidth) throw Error('New Folder overflows horizontally');
    });
    await writeFile(join(directory, `new-folder-${width}.png`), (await win.webContents.capturePage()).toPNG());
  }
  win.setSize(1440, 1100);
  await run(() => {
    const form = document.querySelector('.horse-folder-dialog form');
    form.requestSubmit();
  });
  await wait(() => !!document.querySelector('[data-horse-folder-edit]') && !document.querySelector('dialog[open]'));
  await run(() => {
    const folder = document.querySelector('[data-horse-folder-edit]').closest('details');
    if (folder.querySelector('.horse-card')) throw Error('New folders must start empty');
    if (folder.open) throw Error('New folders should start collapsed');
  });
  const current = await (await fetch(origin + '/api/state')).json();
  const folderId = current.state.horseFolders[0].id;
  const seeded = await action('save-horse-folder', { id: folderId, name: 'Trail Friends', horseIds: [ids[2], ids[0]] });
  const horsesBefore = seeded.state.horses;
  await win.loadURL(origin + '/?folder-check=seeded#stable/all');
  await wait(() => !!document.querySelector('[data-horse-folder-edit]'));
  await run(() => document.querySelector('[data-music-toggle-all]').click());
  await wait(() => [...document.querySelectorAll('[data-music-group]')].every(el => el.open && !el.dataset.expanding));
  for (const motion of ['no-preference', 'reduce']) {
    await win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: motion }]
    });
    await win.webContents.debugger.detach();
    await run(() => document.querySelector('[data-music-toggle-all]').click());
    await win.webContents.executeJavaScript('(' + verifyFolderArrows.toString() + ')(false)');
    await wait(() =>
      [...document.querySelectorAll('[data-music-group]')].every(el => !el.open && !el.dataset.expanding)
    );
    await writeFile(
      join(directory, `folder-arrows-closed-${motion}.png`),
      (await win.webContents.capturePage()).toPNG()
    );
    await run(() => document.querySelector('[data-music-toggle-all]').click());
    await win.webContents.executeJavaScript('(' + verifyFolderArrows.toString() + ')(true)');
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
    if (form.querySelector('[name=horseIds],fieldset')) throw Error('Rename must only request a folder name');
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
    if (folder.querySelectorAll('.horse-card').length !== 2) throw Error('Renaming changed horse membership');
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
  });
  const renamed = await (await fetch(origin + '/api/state')).json();
  if (JSON.stringify(renamed.state.horseFolders[0].horseIds) !== JSON.stringify([ids[2], ids[0]]))
    throw Error('Rename changed saved horse order');
  const hoverPoint = await run(() => {
    document.activeElement?.blur();
    const summary = document.querySelector('[data-horse-folder-edit]').closest('summary');
    const rect = summary.getBoundingClientRect();
    return { x: Math.round(rect.right - 50), y: Math.round(rect.top + rect.height / 2) };
  });
  win.webContents.sendInputEvent({ type: 'mouseMove', x: 1, y: 1 });
  await run(async () => {
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (getComputedStyle(document.querySelector('.horse-folder-actions')).opacity !== '0')
      throw Error('Folder actions should be hidden without hover or focus');
  });
  win.webContents.sendInputEvent({ type: 'mouseMove', ...hoverPoint });
  await run(async () => {
    await new Promise(resolve => requestAnimationFrame(resolve));
    const actions = document.querySelector('.horse-folder-actions');
    if (getComputedStyle(actions).opacity !== '1') throw Error('Hovering the folder bar did not reveal actions');
    const folder = actions.closest('details');
    const wasOpen = folder.open;
    actions.querySelector('[data-horse-folder-edit]').click();
    if (folder.open !== wasOpen || folder.hasAttribute('data-expanding')) throw Error('Rename toggled the folder');
  });
  await writeFile(join(directory, 'rename-folder.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => document.querySelector('[data-folder-cancel]').click());
  await wait(() => !document.querySelector('dialog[open]'));
  await writeFile(join(directory, 'folder-hover.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => {
    const folder = document.querySelector('[data-horse-folder-delete]').closest('details');
    const wasOpen = folder.open;
    document.querySelector('[data-horse-folder-delete]').click();
    if (folder.open !== wasOpen || folder.hasAttribute('data-expanding')) throw Error('Delete toggled the folder');
    if (!document.querySelector('dialog[open] [data-delete-folder]')) throw Error('Delete needs confirmation');
    document.querySelector('[data-keep-folder]').click();
  });
  await wait(() => !document.querySelector('dialog[open]'));
  await run(() => {
    if (!document.querySelector('[data-horse-folder-edit]')) throw Error('Cancelling deletion removed the folder');
    document.querySelector('[data-horse-folder-delete]').focus();
    if (getComputedStyle(document.querySelector('.horse-folder-actions')).opacity !== '1')
      throw Error('Keyboard focus should reveal folder actions');
    document.querySelector('[data-horse-folder-delete]').click();
  });
  await writeFile(join(directory, 'delete-folder.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => document.querySelector('[data-delete-folder]').click());
  await wait(() => !document.querySelector('[data-horse-folder-edit]'));
  const saved = await (await fetch(origin + '/api/state')).json();
  if (saved.state.horses.length !== 3 || saved.state.horseFolders.length !== 0)
    throw Error('Folder deletion changed horses');
  if (JSON.stringify(saved.state.horses) !== JSON.stringify(horsesBefore))
    throw Error('Folder actions changed horse records');
  await run(() => {
    const returned = [...document.querySelectorAll('[data-music-group=unfiled] .horse-card-open')]
      .map(button => button.textContent)
      .sort();
    if (returned.join(',') !== 'Moss,Willow') throw Error('Deleted folder horses did not return to All Horses');
  });
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
