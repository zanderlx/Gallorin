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
    const caught = await action('catch', { id, name: 'Renderer Test' });
    const species = caught.catalog.species.find(s => s.id === caught.state.horses[0].speciesId);
    await action('save-traits', {
      id: species.id,
      traits: {
        ...species.traits,
        Pattern: ['Pattern A', 'Pattern B', 'Pattern C', 'Pattern D', 'Pattern E', 'Pattern F']
      }
    });
    await action('horse-updates-enabled', { enabled: true });
    await action('save-profile', { name: 'Renderer Keeper', about: 'i<3horses', avatarSeed: 11 });
    const win = new BrowserWindow({
      width: 1440,
      height: 1000,
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    win.webContents.on('console-message', event => console.log(event.message));
    await win.loadURL(origin + '/#dev/horse-updates');
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
    await waitFor('#horse-update-form');
    await win.webContents.executeJavaScript(`(()=>{
    const assert=(condition,message)=>{if(!condition)throw Error(message)};
    const form=document.querySelector('#horse-update-form');
    assert(document.querySelector('h1').textContent==='Horse Overrides','Page heading');
    assert(form.querySelector('.horse-update-rules').hidden,'Details should wait for selection');
    form.querySelector('[data-open-override]').click();
    assert(!form.querySelector('.horse-update-rules').hidden,'Horse selection should show details');
    const dialog=form.querySelector('dialog');
    const edit=(key,mode)=>{
      form.querySelector('[data-edit-override="'+key+'"]').click();
      assert(dialog.open,'Field dialog should open');
      const row=form.querySelector('[data-key="'+key+'"]');
      const operation=row.querySelector('[data-mode]');operation.value=mode;operation.dispatchEvent(new Event('change',{bubbles:true}));
      return row;
    };
    const pattern=edit('trait:Pattern','set');
    for(const choice of pattern.querySelectorAll('[data-trait-choice]')) if(choice.checked)choice.click();
    for(let i=0;i<4;i++)pattern.querySelector('[data-trait-choice]:not(:checked):not(:disabled)').click();
    assert(pattern.querySelectorAll('[data-trait-choice]:checked').length===4,'Four patterns selected');
    assert(pattern.querySelectorAll('[data-trait-choice]:disabled').length===2,'Fifth and sixth choices blocked');
    pattern.querySelector('[data-trait-choice]:disabled').click();
    assert(pattern.querySelectorAll('[data-trait-choice]:checked').length===4,'Cannot exceed pattern maximum');
    pattern.querySelector('[data-trait-choice]:checked').click();
    assert(pattern.querySelectorAll('[data-trait-choice]:disabled').length===0,'Removing a pattern frees a slot');
    form.querySelector('[data-cancel-override]').click();
    assert(!dialog.open && pattern.querySelector('[data-mode]').value==='keep','Cancel discards field edits');
    edit('name','set').querySelector('[data-value]').value='Canceled name';
    dialog.dispatchEvent(new Event('cancel',{cancelable:true}));
    assert(form.querySelector('[data-key=name] [data-mode]').value==='keep','Escape cancels');
    edit('notes','set').querySelector('[data-value]').value='Discarded note';
    form.querySelector('[data-save-override]').click();
    assert(form.querySelector('[data-key=notes] [data-rule-summary]').textContent.includes('Set'),'Draft operation shown');
    form.querySelector('[data-reset-overrides]').click();
    assert(form.querySelector('[data-key=notes] [data-mode]').value==='keep','Reset clears draft');
    edit('notes','set').querySelector('[data-value]').value='Previewed in the real renderer';
    form.querySelector('[data-save-override]').click();
    const row=form.querySelector('[data-key=notes]');
    assert(row.querySelector('[data-current-value]').textContent!=='Previewed in the real renderer','Saved value remains unchanged');
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
    await waitFor('#horse-update-form .horse-update-rules[hidden]');
    await win.webContents.executeJavaScript("document.querySelector('[data-open-override]').click()");
    await writeFile(join(directory, 'page.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(
      "document.querySelector('[data-edit-override=\"trait:Pattern\"]').click();document.querySelector('dialog [data-mode]').value='set';document.querySelector('dialog [data-mode]').dispatchEvent(new Event('change',{bubbles:true}))"
    );
    await win.webContents.executeJavaScript(
      'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    );
    await writeFile(join(directory, 'field.png'), (await win.webContents.capturePage()).toPNG());
    await win.setContentSize(600, 850);
    await win.webContents.executeJavaScript(
      'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'
    );
    await writeFile(join(directory, 'field-narrow.png'), (await win.webContents.capturePage()).toPNG());
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
