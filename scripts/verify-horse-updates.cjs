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
      if([...form.querySelectorAll('.horse-section-actions')].some(node=>!node.hidden))throw Error('Save/Cancel shown without changes');
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
      if(gender.closest('details').querySelector('.horse-section-actions').hidden)throw Error('Save/Cancel hidden for draft');
      if(gender.querySelector('[data-remove-override]').hidden)throw Error('Pending reroll needs trash action');
      gender.querySelector('[data-remove-override]').click();
      if(gender.querySelector('[data-mode]').value!=='keep'||!gender.querySelector('[data-remove-override]').hidden)throw Error('Trash must cancel unsaved override');
      const columns=[...gender.closest('details').querySelector('.horse-edit-columns').children];
      const cells=[gender.querySelector('strong'),gender.querySelector('[data-current-value]'),gender.querySelector('[data-override-value]'),gender.querySelector('.horse-override-actions')];
      cells.forEach((cell,index)=>{if(Math.abs(cell.getBoundingClientRect().x-columns[index].getBoundingClientRect().x)>1)throw Error('Column alignment mismatch')});
      gender.querySelector('[data-roll-override]').click();
      edit('notes','set').querySelector('[data-value]').value='Saved in its own section';
      form.querySelector('[data-save-override]').click();
      form.querySelector('[data-key=notes]').closest('details').querySelector('[data-save-section]').click();
    })()`);
    await waitFor('.horse-edit-section .horse-section-status');
    for (let i = 0; i < 100; i++) {
      const done = await win.webContents.executeJavaScript(
        "document.querySelector('[data-key=notes] [data-override-value]')?.textContent==='Saved in its own section' && document.querySelector('[data-key=notes] [data-mode]')?.value==='keep'"
      );
      if (done) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const saved = JSON.parse(await readFile(join(directory, 'data/player/save.json'), 'utf8')).horses[0];
    if (saved.notes !== 'Saved in its own section') throw Error('Section save did not persist');
    await win.webContents.executeJavaScript(`(()=>{
      const form=document.querySelector('#horse-update-form');
      const gender=form.querySelector('[data-key=gender]');
      if(gender.querySelector('[data-mode]').value!=='reroll')throw Error('Saving Notes lost the Identity draft');
      if(document.querySelector('[data-apply-horse-updates],#horse-update-preview,[data-reset-overrides]'))throw Error('Global review remains');
      gender.closest('details').querySelector('[data-cancel-section]').click();
      if(gender.querySelector('[data-mode]').value!=='keep')throw Error('Section cancel did not reset its draft');
      if(!gender.closest('details').querySelector('.horse-section-actions').hidden)throw Error('Cancel did not hide Save/Cancel');
      const notes=form.querySelector('[data-key=notes]');
      notes.querySelector('[data-remove-override]').click();
      notes.closest('details').querySelector('[data-save-section]').click();
    })()`);
    for (let i = 0; i < 100; i++) {
      const done = await win.webContents.executeJavaScript(
        "document.querySelector('[data-key=notes] [data-mode]')?.value==='keep' && document.querySelector('[data-key=notes] [data-override-value]')?.textContent==='—'"
      );
      if (done) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const restored = JSON.parse(await readFile(join(directory, 'data/player/save.json'), 'utf8')).horses[0];
    if (restored.overriddenFields.includes('notes')) throw Error('Section save did not restore original notes');
    await win.webContents.executeJavaScript(`(async()=>{
      const form=document.querySelector('#horse-update-form'), row=form.querySelector('[data-key=notes]');
      row.closest('details').open=true;
      row.querySelector('[data-edit-override]').click();
      form.querySelector('[data-save-override]').click();
      if(!row.closest('details').querySelector('.horse-section-actions').hidden)throw Error('Same value counts as a change');
      row.querySelector('[data-edit-override]').click();
      row.querySelector('[data-value]').value='Retained after timeout';
      form.querySelector('[data-save-override]').click();
      const realFetch=window.fetch, realTimeout=window.setTimeout;
      window.setTimeout=(fn,delay,...args)=>realTimeout(fn,delay===15000?40:delay,...args);
      window.fetch=(url,options)=>{
        if(url==='/api/action'&&JSON.parse(options?.body||'{}').type==='preview-horse-updates')return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
        return realFetch(url,options);
      };
      try {
        row.closest('details').querySelector('[data-save-section]').click();
        await new Promise(resolve=>realTimeout(resolve,120));
        const section=row.closest('details');
        if(!section.querySelector('[role=status]').textContent.includes('timed out'))throw Error('Stalled save did not leave loading state');
        if(section.querySelector('[data-save-section]').disabled)throw Error('Timeout left Save disabled');
        if(row.querySelector('[data-value]').value!=='Retained after timeout')throw Error('Timeout lost edits');
        section.querySelector('[data-cancel-section]').click();
        if(!section.querySelector('.horse-section-actions').hidden)throw Error('Timeout draft could not be canceled');
      } finally { window.fetch=realFetch; window.setTimeout=realTimeout; }
    })()`);
    await win.webContents.executeJavaScript(
      'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    );
    await writeFile(join(directory, 'edit.png'), (await win.webContents.capturePage()).toPNG());
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
