// Real renderer/API integration test. All writes go to a new temporary directory.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { tmpdir } = require('node:os');
app.disableHardwareAcceleration();
let backend;
app
  .whenReady()
  .then(async () => {
    const directory = await mkdtemp(join(tmpdir(), 'aetherion-updates-ui-'));
    app.setPath('userData', join(directory, 'browser'));
    process.env.HORSE_DATA_DIR = join(directory, 'data');
    process.env.PORT = '0';
    backend = await import(pathToFileURL(resolve(__dirname, '../server.js')).href);
    const origin = await backend.serverReady;
    async function action(type, payload) {
      const response = await fetch(origin + '/api/action', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      return result;
    }
    let result = await action('visit', { locationId: 'aetherion' });
    const id = result.state.encounters.aetherion[0].id;
    await action('catch', { id, name: 'Renderer Test' });
    await action('horse-updates-enabled', { enabled: true });
    const win = new BrowserWindow({
      width: 1440,
      height: 1000,
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    await win.loadURL(origin + '/#dev/horse-updates');
    async function waitFor(selector) {
      for (let i = 0; i < 100; i++) {
        if (
          await win.webContents.executeJavaScript('Boolean(document.querySelector(' + JSON.stringify(selector) + '))')
        )
          return;
        await new Promise(r => setTimeout(r, 100));
      }
      const error = await win.webContents.executeJavaScript("document.querySelector('#toast')?.textContent");
      throw Error('Missing ' + selector + ': ' + error);
    }
    await waitFor('#horse-update-form');
    await win.webContents.executeJavaScript(`(()=>{
    const form=document.querySelector('#horse-update-form');
    const horse=form.querySelector('[name=horse]');horse.checked=true;horse.dispatchEvent(new Event('change',{bubbles:true}));
    const row=form.querySelector('[data-key=notes]');
    row.closest('details').open=true;
    const mode=row.querySelector('[data-mode]');mode.value='set';mode.dispatchEvent(new Event('change',{bubbles:true}));
    row.querySelector('[data-value]').value='Previewed in the real renderer';
    form.requestSubmit();
  })()`);
    await waitFor('[data-apply-horse-updates]');
    const before = (await (await fetch(origin + '/api/state')).json()).state.horses[0];
    if (before.notes === 'Previewed in the real renderer') throw Error('Preview mutated the horse');
    await writeFile(join(directory, 'preview.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript("document.querySelector('[data-apply-horse-updates]').click()");
    for (let i = 0; i < 100; i++) {
      const state = (await (await fetch(origin + '/api/state')).json()).state;
      if (state.horses[0].notes === 'Previewed in the real renderer') break;
      await new Promise(r => setTimeout(r, 100));
    }
    const saved = JSON.parse(await readFile(join(directory, 'data/player/save.json'), 'utf8'));
    if (saved.horses[0].notes !== 'Previewed in the real renderer' || !saved.horses[0].lastRegeneratedAt)
      throw Error('Reviewed changes did not persist');
    await waitFor('#horse-update-form');
    await writeFile(join(directory, 'page.png'), (await win.webContents.capturePage()).toPNG());
    console.log('Horse Updates UI passed: ' + directory);
    win.destroy();
    await backend.closeGameServer();
    app.quit();
  })
  .catch(async error => {
    console.error(error);
    try {
      await backend?.closeGameServer();
    } catch {}
    app.exit(1);
  });
