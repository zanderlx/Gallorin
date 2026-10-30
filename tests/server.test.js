import { createHorseDocument } from '../public/horse-transfer.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

test(
  'HTTP application serves all assets, persists actions, exports data and rejects cross-origin writes',
  { timeout: 15000 },
  async t => {
    const directory = await mkdtemp(join(tmpdir(), 'aetherion-http-test-'));
    const child = spawn(process.execPath, ['server.js'], {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: { ...process.env, PORT: '0', HORSE_DATA_DIR: directory },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    t.after(async () => {
      if (child.exitCode === null) {
        const exited = once(child, 'exit');
        child.kill();
        await exited;
      }
      assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
      assert.ok(basename(directory).startsWith('aetherion-http-test-'));
      await rm(directory, { recursive: true, force: true });
    });
    const url = await new Promise((res, rej) => {
      let output = '';
      child.stdout.on('data', data => {
        output += data;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) res(match[0]);
      });
      child.once('error', rej);
      child.once('exit', code => rej(new Error(`Server exited early (${code}).`)));
    });
    for (const asset of [
      '/',
      '/styles.css',
      '/zones.css',
      '/zones.js',
      '/zone-editor.js',
      '/library.css',
      '/themes.css',
      '/definitions.js',
      '/spawn-config.js',
      '/library-editor.js',
      '/dates.js',
      '/roadmap.js',
      '/mutated-palettes.js',
      '/keeper.js',
      '/form-state.js',
      '/site-search.js',
      '/theme-modes.js',
      '/typography.css',
      '/app.js',
      '/ui.js',
      '/pages.js',
      '/economy.js',
      '/game-settings.js',
      '/profile.js',
      '/profile-layout.js',
      '/horse-art-viewer.js',
      '/profile-layout.css',
      '/gender-icon.js',
      '/horse-dialogs.js',
      '/horse-transfer.js',
      '/horse-transfer-ui.js',
      '/horse-inline-name.js',
      '/horse-fields.js',
      '/horse-editor.css',
      '/art.js',
      '/assets/crest.svg',
      '/assets/wilds.svg'
    ]) {
      const response = await fetch(url + asset);
      assert.equal(response.status, 200, asset);
      assert.ok((await response.text()).length > 0);
    }
    assert.equal((await fetch(url + '/data/player/save.json')).status, 404);
    const post = (type, payload, origin = url) =>
      fetch(url + '/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: origin },
        body: JSON.stringify({ type, payload })
      });
    assert.equal((await post('visit', { locationId: 'aetherion' }, 'https://example.com')).status, 403);
    const initial = await (await post('visit', { locationId: 'aetherion' })).json();
    const startup = await (await fetch(url + '/api/state')).json();
    const packageInfo = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(startup.appVersion, packageInfo.version);
    assert.equal(initial.state.encounters.aetherion.length, 3);
    const horse = initial.state.encounters.aetherion[0];
    assert.equal((await post('catch', { id: horse.id })).status, 200);
    const save = JSON.parse(await readFile(join(directory, 'player', 'save.json'), 'utf8'));
    assert.equal(save.horses[0].id, horse.id);
    const exported = await (await fetch(url + '/api/export')).json();
    assert.equal(exported.state.horses[0].id, horse.id);
    assert.equal(exported.catalog.species.length, 46);
    const horseFile = createHorseDocument(horse);
    const importedResponse = await post('import-horse', horseFile);
    assert.equal(importedResponse.status, 200);
    const importedState = (await importedResponse.json()).state;
    assert.equal(importedState.horses.length, 2);
    assert.notEqual(importedState.horses[1].id, horse.id);
    assert.deepEqual(importedState.horses[1].palette.colors, horse.palette.colors);
    assert.equal((await post('import-horse', { ...horseFile, version: 99 })).status, 400);
    assert.equal((await post('search', { locationId: 'missing' })).status, 400);
    const zoneResponse = await post('save-zone', {
      name: 'HTTP test grove',
      subtitle: 'A new trail',
      description: 'A peaceful place.',
      enabled: true,
      atmosphere: 'forest',
      speciesPool: ['Unicorn'],
      palettePool: ['Natural Gold']
    });
    assert.equal(zoneResponse.status, 200);
    const zone = (await zoneResponse.json()).state.customLocations[0];
    const visit = await (await post('visit', { locationId: zone.id })).json();
    assert.ok(visit.state.encounters[zone.id].every(h => h.spawnPath === 'Cosmic' || h.species === 'Unicorn'));
    const bundle = await (await fetch(url + '/api/export')).json();
    assert.equal(bundle.state.customLocations[0].id, zone.id);
    const definitionResponse = await post('save-definition', {
      kind: 'personalities',
      values: { name: 'Daydreamer', description: 'Always watching the clouds.' }
    });
    assert.equal(definitionResponse.status, 200);
    assert.equal((await definitionResponse.json()).catalog.personalities.at(-1).name, 'Daydreamer');
    assert.equal((await post('website-theme', { id: 'pastel-mint' })).status, 200);
    assert.equal((await post('developer-edit-mode', { enabled: true })).status, 400);
    assert.equal((await post('save-copy', { scope: 'stable/all', entries: { 'page.title': 'Ignored' } })).status, 400);
    assert.equal((await post('current-gold', { gold: 4321 })).status, 200);
    assert.equal((await post('save-profile', { name: 'HTTP Keeper', about: 'Hello', avatarSeed: 42 })).status, 200);
    const finalExport = await (await fetch(url + '/api/export')).json();
    assert.equal(finalExport.state.gold, 4321);
    assert.equal(finalExport.state.keeper.name, 'HTTP Keeper');
    assert.equal(finalExport.state.settings.websiteTheme, 'pastel-mint');
    assert.equal(finalExport.state.settings.websiteThemeMode, 'dark');
    assert.equal(finalExport.catalog.personalities.at(-1).description, 'Always watching the clouds.');
  }
);
