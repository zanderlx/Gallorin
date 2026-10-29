// Real renderer/API integration test. All writes go to a new temporary directory.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { tmpdir } = require('node:os');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('mute-audio');
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
    await action('save-profile', { name: 'Renderer Keeper', about: 'i<3horses', avatarSeed: 11 });
    const win = new BrowserWindow({
      width: 1440,
      height: 1000,
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    win.webContents.setAudioMuted(true);
    win.webContents.on('console-message', event => console.log(event.message));
    await win.loadURL(origin + '/#stable/all');
    async function waitFor(selector) {
      for (let i = 0; i < 100; i++) {
        if (
          await win.webContents.executeJavaScript('Boolean(document.querySelector(' + JSON.stringify(selector) + '))')
        )
          return;
        await new Promise(r => setTimeout(r, 100));
      }
      const error = await win.webContents.executeJavaScript('document.body.textContent.slice(-2400)');
      throw Error('Missing ' + selector + ': ' + error);
    }
    await waitFor('#collection-grid .horse-card');
    await win.webContents.executeJavaScript(`(()=>{
      document.querySelector('#collection-grid [data-action=inspect]').click();
      const form=document.querySelector('#horse-update-form');
      if(!document.querySelector('#profile').open)throw Error('Stable profile did not open');
      const tab=document.querySelector('[data-profile-tab=overrides]');
      if(tab.textContent.trim()!=='Edit')throw Error('Expected Edit tab');
      tab.click();
      if(form.querySelector('[data-key=name],[data-key=age],[data-key=daysOwned],[data-key=favorite],[data-key^="color:"]'))throw Error('Hidden field still editable');
      if(form.querySelector('[name=allowDuplicates],[data-enable-horse-updates]'))throw Error('Obsolete control remains');
      const edit=(key,mode)=>{
        const row=form.querySelector('[data-key="'+key+'"]');
        row.closest('details').open=true;
        row.querySelector('[data-edit-override]').click();
        if(!form.querySelector('.horse-override-dialog').open)throw Error('Field dialog not open');
        const select=row.querySelector('[data-mode]');select.value=mode;select.dispatchEvent(new Event('change',{bubbles:true}));
        return row;
      };
      if(form.querySelector('h2').textContent!=='Horse Overrides')throw Error('Horse Overrides heading missing');
      const headers=[...form.querySelector('.horse-edit-columns').children].map(node=>node.textContent).join('|');
      if(headers!=='Field|Original|Override|Change')throw Error('Column headers incorrect');
      const gender=form.querySelector('[data-key=gender]');
      gender.closest('details').open=true;
      gender.querySelector('[data-roll-override]').click();
      if(gender.querySelector('[data-mode]').value!=='reroll')throw Error('Shuffle must stage reroll');
      if(gender.querySelector('[data-remove-override]').hidden)throw Error('Pending reroll needs trash action');
      gender.querySelector('[data-remove-override]').click();
      if(gender.querySelector('[data-mode]').value!=='keep'||!gender.querySelector('[data-remove-override]').hidden)throw Error('Trash must cancel unsaved override');
      const columns=[...gender.closest('details').querySelector('.horse-edit-columns').children];
      const cells=[gender.querySelector('strong'),gender.querySelector('[data-current-value]'),gender.querySelector('[data-override-value]'),gender.querySelector('.horse-override-actions')];
      cells.forEach((cell,index)=>{if(Math.abs(cell.getBoundingClientRect().x-columns[index].getBoundingClientRect().x)>1)throw Error('Column alignment mismatch')});
      edit('notes','set').querySelector('[data-value]').value='Previewed in the real renderer';
      form.querySelector('[data-save-override]').click();
      form.requestSubmit();
    })()`);
    await waitFor('[data-apply-horse-updates]');
    const before = (await (await fetch(origin + '/api/state')).json()).state.horses[0];
    if (before.notes === 'Previewed in the real renderer') throw Error('Preview mutated the horse');
    await win.webContents.executeJavaScript("document.querySelector('[data-apply-horse-updates]').click()");
    await waitFor('#horse-update-form:not(:has([data-apply-horse-updates]))');
    const saved = JSON.parse(await readFile(join(directory, 'data/player/save.json'), 'utf8'));
    if (
      saved.horses[0].notes !== 'Previewed in the real renderer' ||
      !saved.horses[0].overriddenFields.includes('notes')
    )
      throw Error('Override or marker did not persist');
    await win.webContents.executeJavaScript(`new Promise(resolve => setTimeout(resolve, 150))`);
    await win.webContents.executeJavaScript(`(()=>{
      const profile=document.querySelector('#profile');
      if(!profile.open)throw Error('Profile closed after apply');
      profile.querySelector('[data-profile-tab=overrides]').click();
      const sections=profile.querySelectorAll('.horse-edit-section');
      sections[0].open=true;sections[1].open=true;
    })()`);
    await win.webContents.executeJavaScript(
      'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    );
    await writeFile(join(directory, 'edit.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`(()=>{
      const form=document.querySelector('#horse-update-form'), row=form.querySelector('[data-key=notes]');
      if(row.querySelector('[data-current-value]').textContent==='Previewed in the real renderer')throw Error('Original column was overwritten');
      if(row.querySelector('[data-override-value]').textContent!=='Previewed in the real renderer')throw Error('Saved override not shown');
      row.querySelector('[data-remove-override]').click();
      if(row.querySelector('[data-mode]').value!=='restore')throw Error('Saved trash action must restore original');
      form.requestSubmit();
    })()`);
    await waitFor('[data-apply-horse-updates]');
    await win.webContents.executeJavaScript("document.querySelector('[data-apply-horse-updates]').click()");
    await waitFor('#horse-update-form:not(:has([data-apply-horse-updates]))');
    const restored = JSON.parse(await readFile(join(directory, 'data/player/save.json'), 'utf8')).horses[0];
    if ((restored.notes || '') !== (before.notes || '') || restored.overriddenFields.includes('notes'))
      throw Error('Trash did not restore original notes');
    console.log('Horse Overrides UI passed: ' + directory);
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
