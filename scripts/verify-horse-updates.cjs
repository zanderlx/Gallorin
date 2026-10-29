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
    const id = (
      result.state.encounters.aetherion.find(horse => !horse.specialSpawn && horse.rarityTier !== 0) ||
      result.state.encounters.aetherion[0]
    ).id;
    const caught = await action('catch', { id, name: 'Renderer Test' });
    const target = caught.catalog.species.find(
      species => species.id !== caught.state.horses[0].speciesId && !['Unicorn', 'Anticorn'].includes(species.name)
    );
    const targetTraits = {
      Mane: ['Replacement Mane'],
      Tail: ['Replacement Tail'],
      Pattern: ['Replacement P1', 'Replacement P2', 'Replacement P3', 'Replacement P4'],
      Paint: ['Replacement Paint1', 'Replacement Paint2'],
      Cosmetic: ['Replacement C1', 'Replacement C2', 'Replacement C3', 'Replacement C4'],
      Keratin: ['Replacement Horn'],
      Ears: ['Replacement Ears'],
      Whiskers: ['Replacement Whiskers']
    };
    await action('save-traits', { id: target.id, traits: targetTraits });
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
    const rolled = await win.webContents.executeJavaScript(`(async()=>{
      const wait=async(test)=>{for(let i=0;i<100;i++){if(test())return;await new Promise(resolve=>setTimeout(resolve,50))}throw Error('Horse editor did not settle')};
      document.querySelector('#collection-grid [data-action=inspect]').click();
      document.querySelector('[data-profile-tab=overrides]').click();
      let form=document.querySelector('#horse-update-form');
      if(form.querySelector('[data-key=notes],[data-key=description]'))throw Error('Notes or description still editable');
      const eye=form.querySelector('[data-key=eye]');
      eye.closest('details').open=true;
      eye.querySelector('[data-edit-override]').click();
      const dialog=form.querySelector('.horse-override-dialog');
      if(!dialog.open||eye.querySelector('[data-mode]').value!=='set')throw Error('Pencil did not open Set popup');
      if(getComputedStyle(eye.querySelector('[data-mode]')).display!=='none')throw Error('Operation selector is visible');
      const choices=eye.querySelectorAll('[data-appearance-choice]');
      if(!choices.length||!eye.querySelector('.horse-appearance-swatches'))throw Error('Eye choices missing visual colors');
      const choice=[...choices].find(input=>input.value!==eye.querySelector('[data-value]').value)||choices[0];
      const chosen=choice.value;choice.click();
      form.querySelector('[data-save-override]').click();
      eye.closest('details').querySelector('[data-save-section]').click();
      await wait(()=>document.querySelector('[data-key=eye] [data-mode]')?.value==='keep');
      window.testChosenEye=chosen;
      form=document.querySelector('#horse-update-form');
      const gender=form.querySelector('[data-key=gender]');
      gender.closest('details').open=true;
      let previews=0;const realFetch=window.fetch;
      window.fetch=(url,options)=>{if(url==='/api/action'&&JSON.parse(options?.body||'{}').type==='preview-horse-updates')previews++;return realFetch(url,options)};
      try {
        gender.querySelector('[data-roll-override]').click();
        await wait(()=>gender.dataset.resolvedValue&&gender.closest('details').querySelector('[data-save-section]').disabled===false);
        const value=gender.querySelector('[data-override-value]').textContent;
        if(!['Male','Female'].includes(value))throw Error('Reroll did not display an actual value');
        if(previews!==1)throw Error('Reroll generated more than once');
        gender.closest('details').querySelector('[data-save-section]').click();
        await wait(()=>document.querySelector('[data-key=gender] [data-mode]')?.value==='keep');
        if(previews!==1)throw Error('Save rerolled instead of using the shown value');
        return value;
      } finally {window.fetch=realFetch}
    })()`);
    const chosenEye = await win.webContents.executeJavaScript('window.testChosenEye');
    const saved = JSON.parse(await readFile(join(directory, 'data/player/save.json'), 'utf8')).horses[0];
    if (saved.eye.id !== chosenEye) throw Error('Chosen eye did not persist');
    if (saved.gender !== rolled) throw Error('Saved values differ from the displayed choices');
    await win.webContents.executeJavaScript(`(async()=>{
      const wait=async(test)=>{for(let i=0;i<100;i++){if(test())return;await new Promise(resolve=>setTimeout(resolve,50))}throw Error('Species override did not settle')};
      const form=document.querySelector('#horse-update-form'), row=form.querySelector('[data-key=species]');
      row.closest('details').open=true;
      row.querySelector('[data-edit-override]').click();
      row.querySelector('[data-value]').value=${JSON.stringify(target.id)};
      form.querySelector('[data-save-override]').click();
      await wait(()=>form.dataset.resolvedSpeciesId===${JSON.stringify(target.id)}&&!row.closest('details').querySelector('[data-save-section]').disabled);
      const pattern=form.querySelector('[data-key="trait:Pattern"]');
      if(!pattern.dataset.speciesGenerated)throw Error('Traits did not update dynamically');
      if(document.querySelector('[data-horse-notification]').textContent.includes('Traits regenerated'))throw Error('Large change message shown before Save');
      row.closest('details').querySelector('[data-save-section]').click();
      await wait(()=>form.querySelector('.horse-species-confirm-dialog').open);
      const confirm=form.querySelector('.horse-species-confirm-dialog');
      if(!confirm.textContent.includes('Mane')||!confirm.textContent.includes('Replacement Mane'))throw Error('Dependent trait changes missing from confirmation');
      confirm.querySelector('[data-cancel-species-save]').click();
      await wait(()=>!row.closest('details').querySelector('[data-save-section]').disabled);
      if(row.querySelector('[data-mode]').value!=='set')throw Error('Confirmation cancel lost species draft');
    })()`);
    const beforeConfirmation = JSON.parse(await readFile(join(directory, 'data/player/save.json'), 'utf8')).horses[0];
    if (beforeConfirmation.speciesId !== saved.speciesId) throw Error('Species was saved before confirmation');
    await win.webContents.executeJavaScript(`(async()=>{
      const wait=async(test)=>{for(let i=0;i<100;i++){if(test())return;await new Promise(resolve=>setTimeout(resolve,50))}throw Error('Species confirmation did not settle')};
      const form=document.querySelector('#horse-update-form'), row=form.querySelector('[data-key=species]');
      row.closest('details').querySelector('[data-save-section]').click();
      await wait(()=>form.querySelector('.horse-species-confirm-dialog').open);
      form.querySelector('[data-confirm-species-save]').click();
      await wait(()=>document.querySelector('[data-key=species] [data-mode]')?.value==='keep');
      const notice=document.querySelector('[data-horse-notification]');
      if(notice.hidden||!notice.textContent.includes('saved'))throw Error('Save notification missing inside modal');
    })()`);
    const speciesSaved = JSON.parse(await readFile(join(directory, 'data/player/save.json'), 'utf8')).horses[0];
    for (const [category, values] of Object.entries(caught.state.horses[0].traits)) {
      if (!Object.hasOwn(targetTraits, category)) continue;
      const old = values.filter(value => value !== 'None' && value !== 'Awaiting species data').length;
      const actual = speciesSaved.traits[category];
      if (actual.length !== old) throw Error('Species override changed ' + category + ' count unexpectedly');
      if (!actual.every(value => targetTraits[category].includes(value)))
        throw Error('Species override kept old traits');
    }
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
