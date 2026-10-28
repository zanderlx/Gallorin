// Run with: node_modules/.bin/electron scripts/check-traits.cjs
// For a scroll-only regression check, append --scroll-only (no CRUD, zones, or screenshots).
// For control alignment only, append --layout-only.
// All saves and Chromium storage live in a fresh temporary directory.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, mkdir, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const scrollOnly = process.argv.includes('--scroll-only');
const started = performance.now();

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('mute-audio');
app.on('window-all-closed', () => {});
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
  window.webContents.setAudioMuted(true);
  if (!window.webContents.isAudioMuted()) throw new Error('UI checks must remain muted');
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
  const finish = async label => {
    if (errors.length) throw new Error(errors.join('\n'));
    window.destroy();
    await backend.closeGameServer();
    clearTimeout(deadline);
    console.log(
      `${label} passed in ${((performance.now() - started) / 1000).toFixed(2)}s (muted). Isolated data: ${directory}`
    );
    app.exit(0);
  };
  await wait(() => !!document.querySelector('.species-manager'));
  if (process.argv.includes('--layout-only')) {
    await run(() => {
      const search = document.querySelector('#definition-search').getBoundingClientRect();
      const sort = document.querySelector('#species-sort').getBoundingClientRect();
      const tab = document.querySelector('#species-tab-overview').getBoundingClientRect();
      const name = document.querySelector('.species-detail-heading h2').getBoundingClientRect();
      const list = document.querySelector('.species-manager .library-list-panel').getBoundingClientRect();
      const details = document.querySelector('.species-manager #species-tab-panel').getBoundingClientRect();
      if (sort.left < search.right) throw new Error('Sort By is not right of Find A Species');
      if (Math.abs(search.top - sort.top) > 1 || Math.abs(sort.top - tab.top) > 1)
        throw new Error('Search, sort and species tabs are not aligned');
      if (Math.abs(list.top - details.top) > 1) throw new Error('Species list and details panels are not aligned');
      if (name.right > tab.left || Math.abs(name.top + name.height / 2 - (tab.top + tab.height / 2)) > 1)
        throw new Error('Species name is not left of the tabs on the same row');
    });
    await finish('Species control layout check');
    return;
  }
  if (scrollOnly) {
    await run(() => {
      const list = document.querySelector('.species-manager .definition-list');
      const selected = document.querySelector('.species-manager').dataset.speciesId;
      list.scrollTop = 360;
      const scroll = list.scrollTop;
      if (scroll <= 0) throw new Error('Species list did not scroll');
      list.children[6].click();
      if (Math.abs(document.querySelector('.species-manager .definition-list').scrollTop - scroll) > 1)
        throw new Error('Species selection reset list scrolling');
      [...document.querySelectorAll('.species-manager .definition-list-item')]
        .find(row => row.dataset.id === selected)
        .click();
      if (Math.abs(document.querySelector('.species-manager .definition-list').scrollTop - scroll) > 1)
        throw new Error('Repeated species selection reset list scrolling');
    });
    await finish('Species scroll check');
    return;
  }
  await run(() => {
    if (location.hash !== '#dev/species') throw new Error('Legacy traits route did not redirect');
    if (document.querySelector('#sidebar a[href="#dev/traits"]'))
      throw new Error('Standalone traits navigation remains');
    const sort = document.querySelector('#species-sort');
    const selected = document.querySelector('.species-manager').dataset.speciesId;
    sort.value = 'rarity';
    sort.dispatchEvent(new Event('change', { bubbles: true }));
    const rank = [4, 3, 2, 1, 0];
    const ranks = [...document.querySelectorAll('.species-manager .definition-list-item')].map(row =>
      rank.indexOf(Number(row.dataset.rarityTier))
    );
    if (ranks.some((value, i) => i > 0 && value < ranks[i - 1])) throw new Error('Species rarity sorting failed');
    if (document.querySelector('.species-manager').dataset.speciesId !== selected)
      throw new Error('Sorting changed the selected species');
    sort.value = 'name';
    sort.dispatchEvent(new Event('change', { bubbles: true }));
    const list = document.querySelector('.species-manager .definition-list');
    list.scrollTop = 360;
    const scroll = list.scrollTop;
    if (scroll <= 0) throw new Error('Species list did not scroll');
    list.children[6].click();
    if (Math.abs(document.querySelector('.species-manager .definition-list').scrollTop - scroll) > 1)
      throw new Error('Species selection reset list scrolling');
    [...document.querySelectorAll('.species-manager .definition-list-item')]
      .find(row => row.dataset.id === selected)
      .click();
    if (Math.abs(document.querySelector('.species-manager .definition-list').scrollTop - scroll) > 1)
      throw new Error('Repeated species selection reset list scrolling');
    document.querySelector('.species-manager .definition-list').scrollTop = 0;
    document.querySelector('[data-action="species-tab"][data-tab="traits"]').click();
  });
  await wait(() => !!document.querySelector('#traits-form'));
  await run(() => {
    const search = document.querySelector('#trait-search');
    const card = document.querySelector('.trait-category-card');
    const originalWidth = card.getBoundingClientRect().width;
    search.value = 'cosmetic';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    if (!document.querySelector('.trait-category-card[hidden]')) throw new Error('Search did not filter');
    if (Math.abs(card.getBoundingClientRect().width - originalWidth) > 1)
      throw new Error('Filtering stretched a trait card');
    if (search.getBoundingClientRect().width > 241) throw new Error('Trait search exceeds shared manager search width');
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-action="add-trait-category"]').click();
    const row = document.querySelector('#trait-rows').lastElementChild;
    row.querySelector('input').value = 'Smoke category';
    const values = row.querySelector('textarea');
    values.value = 'Smoke trait\nSecond trait';
    values.dispatchEvent(new Event('input', { bubbles: true }));
    if (!document.querySelector('.species-tabs [data-tab=overview]').disabled)
      throw new Error('Species switch could lose edits');
    document.querySelector('#traits-form').requestSubmit();
  });
  await wait(
    () =>
      !!document.querySelector('.species-tabs [data-tab=overview]') &&
      !document.querySelector('.species-tabs [data-tab=overview]').disabled
  );
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
  await wait(() => !document.querySelector('.species-tabs [data-tab=overview]').disabled);
  await run(() => {
    const row = [...document.querySelectorAll('.trait-category-card')].find(
      r => r.querySelector('input').value === 'Smoke category'
    );
    if (row.querySelector('textarea').value !== 'Renamed trait') throw new Error('Rename did not persist');
    row.querySelector('textarea').value = '';
    row.querySelector('textarea').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#traits-form').requestSubmit();
  });
  await wait(() => !document.querySelector('.species-tabs [data-tab=overview]').disabled);
  await run(() => {
    if (document.querySelector('[data-action="load-supplied-traits"]')) throw new Error('Manual trait loading remains');
    document.querySelector('[data-action="add-trait-category"]').click();
    document.querySelector('#traits-form button[type="reset"]').click();
    if (document.querySelector('.species-tabs [data-tab=overview]').disabled)
      throw new Error('Cancel did not restore species switching');
    if ([...document.querySelectorAll('.trait-category-card')].some(r => !r.querySelector('input').value))
      throw new Error('Cancel kept draft category');
  });
  const output = resolve(__dirname, '../test-results');
  await mkdir(output, { recursive: true });
  const capture = async name => {
    await run(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await writeFile(join(output, name), (await window.webContents.capturePage()).toPNG());
  };
  await run(() => {
    document.activeElement.blur();
    scrollTo(0, 0);
  });
  await capture('traits-desktop.png');
  await run(() => document.querySelector('[data-action="species-tab"][data-tab="zones"]').click());
  await capture('species-spawning.png');
  await run(() => {
    const edit = document.querySelector('[data-action="species-open-zone"]');
    if (!edit) throw new Error('Species spawning overview is empty');
    globalThis.expectedZone = edit.dataset.id;
    edit.click();
  });
  await wait(() => !!document.querySelector('#zone-form'));
  await run(() => {
    if (document.querySelector('#zone-form').dataset.id !== globalThis.expectedZone)
      throw new Error('Opened wrong zone');
    location.hash = 'dev/species';
  });
  await wait(() => !!document.querySelector('.species-manager'));
  await run(() => document.querySelector('[data-action="species-tab"][data-tab="overview"]').click());
  await run(async () => {
    const data = await (await fetch('/api/state')).json();
    globalThis.zoneSnapshot = zones =>
      JSON.stringify(
        zones
          .map(zone => ({
            id: zone.id,
            enabled: zone.enabled,
            speciesPool: [...zone.speciesPool].sort(),
            creatures: [...(zone.creatures || [])].sort((a, b) => a.speciesId.localeCompare(b.speciesId))
          }))
          .sort((a, b) => a.id.localeCompare(b.id))
      );
    globalThis.zonesBefore = globalThis.zoneSnapshot(data.catalog.locations);
    const description = document.querySelector('.species-manager [name="description"]');
    description.value = 'Overview smoke edit';
    description.dispatchEvent(new Event('input', { bubbles: true }));
    if (!document.querySelector('[data-tab="traits"]').disabled)
      throw new Error('Tab switch could lose overview edits');
    document.querySelector('#definition-form').requestSubmit();
  });
  await wait(
    () => !!document.querySelector('[data-tab="traits"]') && !document.querySelector('[data-tab="traits"]').disabled
  );
  await run(async () => {
    const data = await (await fetch('/api/state')).json();
    if (globalThis.zoneSnapshot(data.catalog.locations) !== globalThis.zonesBefore)
      throw new Error('Overview save changed zone assignments');
    if (document.querySelector('.species-manager [name="description"]').value !== 'Overview smoke edit')
      throw new Error('Overview save failed');
    scrollTo(0, 0);
  });
  await capture('species-overview.png');
  await run(() => {
    document.querySelector('[data-action="species-tab"][data-tab="traits"]').click();
    scrollTo(0, 0);
  });
  window.setSize(700, 1000);
  await wait(() => document.querySelector('#sidebar').getBoundingClientRect().right <= 1);
  if (await run(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Narrow viewport overflows');
  await capture('traits-narrow.png');
  await finish('Traits UI smoke');
})().catch(error => {
  console.error(error);
  app.exit(1);
});
