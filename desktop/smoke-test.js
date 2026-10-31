// Desktop smoke test: drives the real windows against isolated AETHERION_TEST_DATA saves.
// main.js loads this module only when started with --smoke-test.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseChangelog } from '../public/changelog.js';
import { smokePlaylistRemoval } from './music-playlist-removal-smoke.js';
import { smokePlaylistSelection } from './music-playlist-selection-smoke.js';
import { smokePlayerLayout } from './music-player-layout-smoke.js';
import { smokeSoundEffects } from './music-effects-smoke.js';

export async function runSmokeTest({ app, main, audioWindow, origin, data, root, audioCommand, shutdown }) {
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'menu-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  const footerCaption = 'Gallorin v' + app.getVersion() + '|Changelog';
  if (
    (await main.webContents.executeJavaScript(
      "document.querySelector('.menu-version-links').textContent.replace(/\\s/g,'')"
    )) !== footerCaption.replace(/\s/g, '')
  )
    throw new Error('Main menu version label differs from package version');
  const historyCount = parseChangelog(await readFile(join(root, 'CHANGELOG.md'), 'utf8')).length;
  await main.webContents.executeJavaScript("document.querySelector('#open-changelog').click()");
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      await main.webContents.executeJavaScript(
        "document.querySelectorAll('.changelog-release').length===" + historyCount
      )
    )
      break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (
    !(await main.webContents.executeJavaScript(
      "document.querySelector('#changelog-dialog').open && document.querySelectorAll('.changelog-release').length===" +
        historyCount
    ))
  )
    throw new Error('Changelog history failed to load');
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'changelog-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  main.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
  main.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  await new Promise(resolve => setTimeout(resolve, 100));
  if (await main.webContents.executeJavaScript("document.querySelector('#changelog-dialog').open"))
    throw new Error('Escape did not close changelog');
  const menuTest = await main.webContents.executeJavaScript(
    "(async()=>{\n document.querySelector('#settings').click();\n for(let i=0;i<80&&!document.querySelector('#audio-settings').open;i++)await new Promise(r=>setTimeout(r,25));\n const modal=document.querySelector('#audio-settings'),music=modal.querySelector('[data-audio-pref=\"volume\"]'),sfx=modal.querySelector('[data-audio-pref=\"soundEffectsVolume\"]');\n music.value=35;music.dispatchEvent(new Event('input',{bubbles:true}));sfx.value=63;sfx.dispatchEvent(new Event('input',{bubbles:true}));\n await new Promise(r=>setTimeout(r,150));\n const fade=modal.querySelector('[data-audio-fade]');fade.value=2.6;if(fade.value!=='3'||fade.step!=='1'||modal.querySelector('datalist')!==null)throw Error('Crossfade slider snapping failed');fade.dispatchEvent(new Event('input',{bubbles:true}));if(modal.querySelector('[data-fade-value]').textContent!=='3 seconds')throw Error('Crossfade live value failed');fade.dispatchEvent(new Event('change',{bubbles:true}));\n for(let i=0;i<80&&(await window.desktopMenu.musicSettings()).fadeSeconds!==3;i++)await new Promise(r=>setTimeout(r,25));\n if(modal.querySelector('datalist')||modal.querySelector('.audio-crossfade-endpoints'))throw Error('Crossfade ticks/endpoints were not removed');const values=[...modal.querySelectorAll('output')];if(values.some(o=>getComputedStyle(o).textAlign!=='left'||Math.abs(o.getBoundingClientRect().left-values[0].getBoundingClientRect().left)>1))throw Error('Audio readouts are not aligned left');const h=modal.querySelector('h2').getBoundingClientRect(),x=modal.querySelector('button').getBoundingClientRect();\n const valid=modal.open&&modal.querySelector('h2').textContent==='Audio Settings'&&!modal.querySelector('h3')&&!modal.querySelector('input[type=checkbox]')&&modal.querySelectorAll('button').length===1&&Math.abs((h.top+h.bottom-x.top-x.bottom)/2)<3&&(await window.desktopMenu.audio()).soundEffectsVolume===63;\n document.querySelector('#mute').click();modal.querySelector('button').click();return valid;\n})()"
  );
  if (!menuTest) throw new Error('Menu audio controls failed');
  await main.webContents.executeJavaScript("document.querySelector('#play').click()");
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await main.webContents.executeJavaScript("Boolean(document.querySelector('.brand'))")) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!(await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot().playing')))
    throw new Error('Music stopped during game navigation');
  await new Promise(resolve => setTimeout(resolve, 500));
  const initialMuted = (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).muted;
  const iconStable = await main.webContents.executeJavaScript(
    "(async()=>{const button=document.querySelector('[data-music=\"mute\"]'),svg=button.querySelector('svg');await new Promise(r=>setTimeout(r,450));return svg===button.querySelector('svg');})()"
  );
  if (!iconStable) throw Error('Mute icon was replaced during ordinary polling');
  const muteHit = await main.webContents.executeJavaScript(
    '(()=>{const r=document.querySelector(\'[data-music="mute"]\').getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()'
  );
  main.webContents.sendInputEvent({ type: 'mouseMove', ...muteHit });
  main.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...muteHit });
  await new Promise(resolve => setTimeout(resolve, 450));
  main.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...muteHit });
  await new Promise(resolve => setTimeout(resolve, 250));
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).muted === initialMuted)
    throw Error('Held mute click was lost across a playback refresh');
  await main.webContents.executeJavaScript(
    '(()=>{const b=document.querySelector(\'[data-music="mute"]\');b.click();b.click();b.click();})()'
  );
  await new Promise(resolve => setTimeout(resolve, 250));
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).muted !== initialMuted)
    throw Error('Rapid mute clicks lost their final state');
  // Music smoke tests use a copied built-in MP3 and only the isolated smoke library.
  const songResponse = await fetch(origin + '/api/music/import', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'audio/mpeg', 'X-File-Name': 'Smoke Song.mp3' },
    body: await readFile(join(root, 'desktop/assets/music/main-menu.mp3'))
  });
  if (!songResponse.ok) throw new Error('Music import failed');
  const songLibrary = await songResponse.json(),
    songId = songLibrary.tracks.find(track => track.name === 'Smoke Song').id;
  const range = await fetch(origin + '/api/music/media/' + songId, { headers: { Range: 'bytes=0-15' } });
  if (range.status !== 206 || (await range.arrayBuffer()).byteLength !== 16)
    throw new Error('Music seek streaming failed');
  const secondSong = songLibrary.tracks.find(track => track.name === 'Town');
  const setup = await fetch(origin + '/api/music/settings', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignments: {
        ...songLibrary.assignments,
        default: [secondSong.id],
        'wilds/hallowhoof': [songId],
        'wilds/aetherion': [songId, secondSong.id]
      },
      fadeSeconds: songLibrary.fadeSeconds
    })
  });
  if (!setup.ok) throw Error('Smoke playlist setup failed');
  await main.loadURL(origin + '/?music-smoke=1#wilds/aetherion');
  for (let attempt = 0; attempt < 80; attempt++) {
    if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id === songId)
      break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id !== songId)
    throw new Error('Location music assignment failed');
  await new Promise(resolve => setTimeout(resolve, 400));
  if (
    !(await main.webContents.executeJavaScript(
      "document.querySelector('[data-context]').textContent==='Gallorin Studios'"
    ))
  )
    throw Error('Player labels/settings link failed');
  await main.webContents.executeJavaScript('document.querySelector(\'[data-music="next"]\').click()');
  for (let attempt = 0; attempt < 80; attempt++) {
    if (
      (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id === secondSong.id
    )
      break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id !== secondSong.id)
    throw Error('Next song button failed');
  await main.webContents.executeJavaScript('document.querySelector(\'[data-music="previous"]\').click()');
  for (let attempt = 0; attempt < 80; attempt++) {
    if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id === songId)
      break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id !== songId)
    throw Error('Previous song button failed');
  await new Promise(resolve => setTimeout(resolve, 3200));
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).transitioning)
    throw new Error('Hidden audio crossfade did not finish');
  await audioCommand({ type: 'seek', value: 5 });
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).currentTime < 4)
    throw new Error('Music seek failed');
  await main.webContents.executeJavaScript('document.querySelector(\'[data-music="toggle"]\').click()');
  await new Promise(resolve => setTimeout(resolve, 150));
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).playing)
    throw new Error('Music pause failed');
  await main.webContents.executeJavaScript('document.querySelector(\'[data-music="toggle"]\').click()');
  await main.webContents.executeJavaScript("location.hash='dev/music'");
  await new Promise(resolve => setTimeout(resolve, 1500));
  await main.webContents.executeJavaScript(
    "document.querySelector('[data-music-group=\"wilds\"]').open=true;document.querySelector('[data-playlist=\"wilds/aetherion\"]').open=true;document.querySelector('[data-playlist=\"wilds/aetherion\"]').scrollIntoView({block:'center'});"
  );
  await new Promise(resolve => setTimeout(resolve, 180));
  const hit = await main.webContents.executeJavaScript(
    '(()=>{const r=document.querySelector(\'[data-playlist="wilds/aetherion"] [data-preview-song="' +
      secondSong.id +
      '"]\').getBoundingClientRect();return {x:Math.round(r.left+3),y:Math.round(r.top+3)};})()'
  );
  main.webContents.sendInputEvent({ type: 'mouseMove', ...hit });
  await new Promise(resolve => setTimeout(resolve, 80));
  main.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...hit });
  main.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...hit });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (
      (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id === secondSong.id
    )
      break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id !== secondSong.id)
    throw Error('Play-button edge click failed');
  main.webContents.sendInputEvent({ type: 'mouseMove', x: 2, y: 2 });
  await new Promise(resolve => setTimeout(resolve, 100));
  await main.webContents.executeJavaScript(
    "(async()=>{\n const table=document.querySelector('[data-playlist=\"wilds/aetherion\"] table');\n if(table.querySelector('th[aria-sort=\"ascending\"],th[aria-sort=\"descending\"]'))throw Error('A column was sorted before a header click');\n if(table.querySelectorAll('.music-sort-indicator:not([hidden])').length!==0)throw Error('Sorting arrows were visible before a header click');\n const title=table.querySelector('[data-music-sort=\"title\"] button');title.click();\n const label=title.children[0].getBoundingClientRect(),arrow=title.children[1].getBoundingClientRect();\n if(arrow.left-label.right>10)throw Error('Sort arrow is not next to the label');\n title.click();title.click();\n if(table.querySelectorAll('.music-sort-indicator:not([hidden])').length!==0)throw Error('No-sort state did not hide arrows');\n const numbers=[...table.querySelectorAll('.music-row-number')].map(n=>Number(n.textContent));\n if(numbers.some((n,i)=>i&&n<numbers[i-1]))throw Error('No-sort did not restore row-number order');\n const delay=async()=>{const deadline=performance.now()+4000;while(document.querySelector('[data-music-group][data-disclosure-animating], [data-playlist][data-disclosure-animating]')){if(performance.now()>deadline)throw Error('Music disclosure animation did not settle');await new Promise(r=>setTimeout(r,30));}},global=document.querySelector('[data-music-toggle-all]');\n const folder=document.querySelector('[data-music-group=\"stable\"]'),playlists=[...folder.querySelectorAll('[data-playlist]')];\n playlists[0].open=false;\n global.click();await delay();\n if([...document.querySelectorAll('[data-music-group]')].some(d=>!d.open)||global.textContent!=='Hide All')throw Error('Global Show All failed');\n if(playlists[0].open)throw Error('Global Show All unexpectedly changed playlist state');\n const other=document.querySelector('[data-music-group=\"town\"]'),otherState=[...other.querySelectorAll('[data-playlist]')].map(d=>d.open).join();\n const local=folder.querySelector('[data-music-toggle-folder]');local.click();await delay();\n if(playlists.some(d=>!d.open)||local.textContent!=='Hide All')throw Error('Folder Show All failed');\n if([...other.querySelectorAll('[data-playlist]')].map(d=>d.open).join()!==otherState)throw Error('Scoped button changed another folder');\n local.click();await delay();if(playlists.some(d=>d.open)||!folder.open)throw Error('Folder Hide All changed the folder itself or missed playlists');\n global.click();await delay();\n if([...document.querySelectorAll('[data-music-group]')].some(d=>d.open)||global.textContent!=='Show All')throw Error('Global Hide All failed');\n global.click();await delay();return true;\n})()"
  );
  await main.webContents.executeJavaScript(
    "(async()=>{\n const table=document.querySelector('[data-playlist=\"wilds/aetherion\"] table');\n const saved=JSON.stringify((await (await fetch('/api/music')).json()).assignments);\n const playing=JSON.stringify((await window.gallorinMusic.state()).playlist);\n table.querySelector('[data-music-sort=\"duration\"] button').click();\n if(table.querySelector('[aria-sort=\"ascending\"]')?.dataset.musicSort!=='duration')throw Error('Duration ascending indicator failed');\n const lengths=[...table.querySelectorAll('tbody tr .music-duration')].map(td=>{const p=td.textContent.split(':').map(Number);return p[0]*60+p[1];});\n if(lengths[0]>lengths[1])throw Error('Duration ascending order failed');\n if(table.querySelector('tbody [data-playlist-remove]').dataset.index!=='1')throw Error('Sorting changed deletion targets');\n table.querySelector('[data-music-sort=\"duration\"] button').click();\n if(table.querySelector('[aria-sort=\"descending\"]')?.dataset.musicSort!=='duration')throw Error('Duration descending indicator failed');\n table.querySelector('[data-music-sort=\"number\"] button').click();\n const library=document.querySelector('.music-library-table');library.querySelector('[data-music-sort=\"title\"] button').click();\n const names=[...library.querySelectorAll('tbody tr strong')].map(el=>el.textContent);\n if(names.some((name,i)=>i&&names[i-1].localeCompare(name,undefined,{numeric:true,sensitivity:'base'})>0))throw Error('All Songs title sort failed');\n if(saved!==JSON.stringify((await (await fetch('/api/music')).json()).assignments)||playing!==JSON.stringify((await window.gallorinMusic.state()).playlist))throw Error('Column sorting changed playlist playback or saved data');\n return true;\n})()"
  );
  await main.webContents.executeJavaScript(
    "(async()=>{\n const details=document.querySelector('[data-playlist=\"wilds/aetherion\"]'),summary=details.querySelector('summary');\n const delay=ms=>new Promise(r=>setTimeout(r,ms)),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;\n details.open=true;summary.click();await delay(55);\n if(!reduced&&(!details.hasAttribute('data-disclosure-animating')||details.dataset.expanding!=='false'))throw Error('Music close transition did not start');\n summary.click();await delay(340);\n if(!details.open||details.style.height||details.hasAttribute('data-disclosure-animating'))throw Error('Rapid music toggle did not settle open');\n summary.click();await delay(340);if(details.open)throw Error('Music collapse did not finish');\n summary.click();await delay(340);if(!details.open||details.style.height)throw Error('Music expansion did not finish');\n return true;\n})()"
  );
  await smokePlaylistRemoval(main);
  await main.webContents.executeJavaScript(
    "document.querySelectorAll('[data-music-group]').forEach(d=>d.open=d.dataset.musicGroup==='wilds');document.querySelector('[data-music-group=\"wilds\"]').scrollIntoView({block:'start'});"
  );
  await new Promise(resolve => setTimeout(resolve, 180));
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'music-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  main.setSize(800, 700);
  await new Promise(resolve => setTimeout(resolve, 400));
  if (
    !(await main.webContents.executeJavaScript(
      'document.querySelector(".music-player").getBoundingClientRect().right<=innerWidth && document.documentElement.scrollWidth<=innerWidth'
    ))
  )
    throw new Error('Music player overflow on narrow screen');
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'music-responsive-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  main.setSize(1440, 960);
  await main.webContents.executeJavaScript("location.hash='wilds/aetherion'");
  await new Promise(resolve => setTimeout(resolve, 300));
  // Exercise a real save through the renderer's same-origin API, using only isolated smoke data.
  const savedId = await main.webContents.executeJavaScript(`(async()=>{
      const snapshot=await (await fetch('/api/state')).json();
      const horse=Object.values(snapshot.state.encounters).flat()[0];
      if(!horse) throw new Error('No initial encounters');
      const response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'catch',payload:{id:horse.id}})});
      const saved=await response.json();
      if(!response.ok || !saved.state.horses.some(item=>item.id===horse.id)) throw new Error('Desktop save failed');
      const exported=await (await fetch('/api/export')).json();
      if(!exported.state.horses.some(item=>item.id===horse.id)) throw new Error('Desktop backup failed');
      return horse.id;
    })()`);
  await main.loadURL(origin);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await main.webContents.executeJavaScript("Boolean(document.querySelector('.brand'))")) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const stored = JSON.parse(await readFile(join(data, 'player/save.json'), 'utf8'));
  if (!stored.horses.some(horse => horse.id === savedId)) throw new Error('Desktop save did not persist.');
  await main.webContents.executeJavaScript(
    "(async()=>{\n const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));\n const details=document.querySelector('#sidebar details[data-group=\"Town\"]'),summary=details.querySelector('summary');\n const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;\n details.open=false;summary.click();await wait(40);\n if(reduced?!details.open:(details.dataset.navExpanded!=='true'||!details.getAnimations().length))throw Error(reduced?'Navbar reduced-motion open failed':'Navbar open animation missing');\n summary.click();await wait(330);\n if(details.open||details.style.height||details.dataset.navExpanded)throw Error('Navbar reverse/close cleanup failed');\n summary.click();await wait(330);\n if(!details.open||details.style.height||summary.getAttribute('aria-expanded')!=='true')throw Error('Navbar open completion failed');\n summary.click();await wait(330);\n const wilds=document.querySelector('#sidebar details[data-group=\"Wilds\"]');wilds.open=false;\n const route=location.hash;wilds.querySelector('.chevron').click();await wait(330);\n if(!wilds.open||location.hash!==route)throw Error('Wilds arrow navigation changed');\n wilds.querySelector('.chevron').click();await wait(330);\n})()"
  );
  if (
    (await main.webContents.executeJavaScript(
      "document.querySelector('.sidebar-foot').textContent.replace(/\\s/g,'')"
    )) !== footerCaption.replace(/\s/g, '')
  )
    throw new Error('Sidebar version label differs from package version');
  await main.webContents.executeJavaScript("document.querySelector('#sidebar-changelog').click()");
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      await main.webContents.executeJavaScript(
        "document.querySelectorAll('.changelog-release').length===" + historyCount
      )
    )
      break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (
    !(await main.webContents.executeJavaScript(
      "document.querySelector('#changelog-dialog').open && document.querySelectorAll('.changelog-release').length===" +
        historyCount
    ))
  )
    throw new Error('Sidebar changelog did not load');
  main.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
  main.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  await new Promise(resolve => setTimeout(resolve, 100));
  if (await main.webContents.executeJavaScript("document.querySelector('#changelog-dialog').open"))
    throw new Error('Escape did not close sidebar changelog');
  // Let the gameplay reveal finish before checking the rendered branding.
  await new Promise(resolve => setTimeout(resolve, 1800));
  if (
    !(await main.webContents.executeJavaScript(
      "document.querySelector('.brand-logo')?.getAttribute('viewBox')==='0 0 200 200'"
    ))
  )
    throw new Error('Sidebar logo failed');
  main.webContents.send('desktop-pause');
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await main.webContents.executeJavaScript("Boolean(document.querySelector('#desktop-pause .pause-logo'))"))
      break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (
    !(await main.webContents.executeJavaScript(
      "document.querySelector('#desktop-pause .pause-logo')?.getAttribute('viewBox')==='0 0 200 200'"
    ))
  )
    throw new Error('Pause logo failed');
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'pause-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  main.webContents.send('desktop-pause');
  main.webContents.send('desktop-pause');
  await new Promise(resolve => setTimeout(resolve, 100));
  await main.webContents.executeJavaScript(
    "(async()=>{\n [...document.querySelectorAll('#desktop-pause button')].find(b=>b.textContent==='Settings').click();\n for(let i=0;i<80&&!document.querySelector('#desktop-audio')?.open;i++)await new Promise(r=>setTimeout(r,25));\n const modal=document.querySelector('#desktop-audio');\n if(!modal?.open||modal.querySelector('h2').textContent!=='Audio Settings'||modal.querySelectorAll('input[type=range]').length!==3||modal.querySelector('input[type=checkbox]'))throw Error('Game audio dialog failed');\n const slider=modal.querySelector('[data-audio-pref=\"soundEffectsVolume\"]');slider.value=27;slider.dispatchEvent(new Event('input',{bubbles:true}));\n await new Promise(r=>setTimeout(r,150));\n if((await window.desktopMenu.audio()).soundEffectsVolume!==27||(await window.gallorinMusic.state()).soundEffectsVolume!==27)throw Error('Sound-effects volume did not persist/apply');\n if(modal.querySelector('datalist')||modal.querySelector('.audio-crossfade-endpoints'))throw Error('Crossfade ticks/endpoints were not removed');const values=[...modal.querySelectorAll('output')];if(values.some(o=>getComputedStyle(o).textAlign!=='left'||Math.abs(o.getBoundingClientRect().left-values[0].getBoundingClientRect().left)>1))throw Error('Audio readouts are not aligned left');const h=modal.querySelector('h2').getBoundingClientRect(),x=modal.querySelector('button').getBoundingClientRect();\n if(Math.abs((h.top+h.bottom-x.top-x.bottom)/2)>3)throw Error('Audio close button is misaligned');\n return true;\n})()"
  );
  await new Promise(resolve => setTimeout(resolve, 150));
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'audio-settings-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  await main.webContents.executeJavaScript("document.querySelector('#desktop-audio .audio-settings-close').click()");
  main.webContents.send('desktop-pause');
  const result = await main.webContents.executeJavaScript(
    "(async()=>({title:document.title, brand:!!document.querySelector('.brand'), state:(await (await fetch('/api/state')).json()).appVersion, node:typeof window.require}))()"
  );
  if (!result.brand || result.node !== 'undefined') throw new Error('Desktop renderer failed to initialize securely.');
  await writeFile(join(process.env.AETHERION_TEST_DATA, 'desktop-smoke.json'), JSON.stringify(result));
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'desktop-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  const revealId = (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track.id;
  await main.webContents.executeJavaScript("document.querySelector('[data-song]').click()");
  const waitForSong = async () => {
    for (let i = 0; i < 80; i++) {
      if (
        await main.webContents.executeJavaScript(
          "location.hash==='#dev/music' && document.activeElement?.dataset.musicTrack==='" +
            revealId +
            "' && Boolean(document.activeElement.closest('.music-library-table')) && document.activeElement.getBoundingClientRect().top>=document.querySelector('#topbar').getBoundingClientRect().bottom && document.activeElement.getBoundingClientRect().bottom<=document.querySelector('.music-player').getBoundingClientRect().top"
        )
      )
        return;
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    const details = await main.webContents.executeJavaScript(
      `JSON.stringify({hash:location.hash,activeTrack:document.activeElement?.dataset.musicTrack,expected:'${revealId}',row:document.activeElement?.getBoundingClientRect().toJSON(),topbar:document.querySelector('#topbar')?.getBoundingClientRect().bottom,player:document.querySelector('.music-player')?.getBoundingClientRect().top})`
    );
    throw Error('Player song link did not reveal its All Songs row: ' + details);
  };
  await waitForSong();
  if (
    !(await main.webContents.executeJavaScript(
      "document.querySelector('.music-manager h1').textContent==='Background Music' && [...document.querySelectorAll('[data-playlist]')].every(d=>!d.open)"
    ))
  )
    throw Error('Background Music title or closed playlist defaults failed');
  await main.webContents.executeJavaScript("location.hash='stable/all'");
  await new Promise(resolve => setTimeout(resolve, 200));
  await main.webContents.executeJavaScript("document.querySelector('[data-now-playing-link]').click()");
  await waitForSong();
  await main.webContents.executeJavaScript(
    "(async()=>{\n const openOptions=()=>document.querySelector('.music-library-table [data-song-options]:not([data-song-options=menu])').click();\n const wait=ms=>new Promise(r=>setTimeout(r,ms));\n openOptions();if(document.querySelector('.music-options-menu').getBoundingClientRect().width>140)throw Error('Song options menu too wide');const id=document.querySelector('[data-song-options][aria-expanded=true]').dataset.songOptions;\n document.querySelector('[data-song-option=add]').click();\n const picker=document.querySelector('.music-playlist-picker');\n const headers=[...picker.querySelectorAll('th')].map(th=>th.textContent);if(headers.join(',')!=='Section,Playlist')throw Error('Picker column order failed');\n const section=picker.querySelector('select');section.value='wilds';section.dispatchEvent(new Event('change'));if([...picker.querySelectorAll('tbody tr')].some(r=>!r.hidden&&r.dataset.playlistSection!=='wilds'))throw Error('Section filter failed');section.value='';section.dispatchEvent(new Event('change'));\n const search=picker.querySelector('input[type=search]');search.value='Hallowhoof';search.dispatchEvent(new Event('input'));\n if(![...picker.querySelectorAll('tbody tr')].some(r=>!r.hidden&&r.textContent.includes('Hallowhoof')))throw Error('Playlist search failed');\n search.value='';search.dispatchEvent(new Event('input'));\n picker.querySelector('[data-playlist-choice=\"wilds/aetherion\"]').checked=true;\n picker.querySelector('[data-playlist-choice=\"wilds/hallowhoof\"]').checked=true;\n picker.querySelector('[data-save-playlists]').click();\n for(let i=0;i<100&&picker.open;i++)await wait(30);\n let lib=await(await fetch('/api/music')).json();\n const effective=(await import('/music-context.js')).selectedPlaylist;if(!effective(lib,'wilds/aetherion').includes(id)||!effective(lib,'wilds/hallowhoof').includes(id))throw Error('Multi-playlist assignment failed');\n openOptions();document.querySelector('[data-song-option=edit]').click();\n const name=document.querySelector('[data-song-edit-name]'),artist=document.querySelector('[data-song-edit-artist]');\n const saveBox=document.querySelector('[data-save-song-row]').getBoundingClientRect(),inputBox=name.getBoundingClientRect(),mark=document.querySelector('[data-save-song-row] svg').getBoundingClientRect();if(Math.abs(saveBox.width-inputBox.height)>1||Math.abs(saveBox.height-inputBox.height)>1||Math.abs(mark.x+mark.width/2-saveBox.x-saveBox.width/2)>1||Math.abs(mark.y+mark.height/2-saveBox.y-saveBox.height/2)>1)throw Error('Song save checkmark dimensions or centering failed');const old=lib.tracks.find(t=>t.id===id);name.value='Edited Smoke Song';artist.value='Smoke Artist';\n document.querySelector('.music-manager h1').click();await wait(30);\n if(!document.querySelector('.music-edit-confirm')?.open)throw Error('Click-out save prompt failed');\n document.querySelector('.music-edit-confirm .music-dialog-close').click();await wait(30);document.querySelector('[data-save-song-row]').click();\n for(let i=0;i<100&&document.querySelector('[data-song-edit-name]');i++)await wait(30);\n lib=await(await fetch('/api/music')).json();const updated=lib.tracks.find(t=>t.id===id);\n if(updated.name!=='Edited Smoke Song'||updated.artist!=='Smoke Artist'||updated.durationSeconds!==old.durationSeconds)throw Error('Inline metadata save failed');\n const row=[...document.querySelectorAll('.music-library-table [data-music-track]')].find(r=>r.dataset.musicTrack===id);\n if(!row.textContent.includes('Smoke Artist')||row.querySelector('input'))throw Error('Saved row did not restore text');\n openOptions();document.querySelector('[data-song-option=edit]').click();document.querySelector('[data-song-edit-name]').value='Discard me';\n document.querySelector('.music-manager h1').click();await wait(30);document.querySelector('[data-discard-song]').click();for(let i=0;i<200&&document.querySelector('.music-edit-confirm');i++)await wait(10);if(document.querySelector('.music-edit-confirm'))throw Error('Discard did not close the save confirmation');\n if(document.querySelector('[data-song-edit-name]'))throw Error('Discard did not close edit');\n if((await(await fetch('/api/music')).json()).tracks.find(t=>t.id===id).name!=='Edited Smoke Song')throw Error('Discard saved changes');\n openOptions();document.querySelector('[data-song-option=edit]').click();\n document.querySelector('[data-song-edit-name]').value='Enter Saved Song';document.querySelector('[data-song-edit-artist]').value='Enter Artist';\n document.querySelector('[data-song-edit-artist]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));\n if(document.querySelector('.music-edit-confirm'))throw Error('Enter opened a save confirmation');\n for(let i=0;i<100&&document.querySelector('[data-song-edit-name]');i++)await wait(30);\n const enterSaved=(await(await fetch('/api/music')).json()).tracks.find(t=>t.id===id);\n if(enterSaved.name!=='Enter Saved Song'||enterSaved.artist!=='Enter Artist')throw Error('Enter did not save both song fields');\n const trash=document.querySelector('[data-playlist] .music-row-trash');\n let parent=trash.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}\n const icon=trash.querySelector('svg').getBoundingClientRect(),cell=trash.closest('td').getBoundingClientRect();\n if(Math.abs(icon.y+icon.height/2-cell.y-cell.height/2)>2)throw Error('Playlist trash icon is not centered in its row');\n})()"
  );
  await main.webContents.executeJavaScript(
    "document.querySelector('.music-library-table [data-song-options]:not([data-song-options=menu])').click();document.querySelector('[data-song-option=delete]').click()"
  );
  await main.webContents.executeJavaScript(
    "document.querySelector('.music-delete-dialog [data-no]').click();document.querySelector('.music-library-table [data-song-options]:not([data-song-options=menu])').click();document.querySelector('[data-song-option=add]').click()"
  );
  await new Promise(resolve => setTimeout(resolve, 180));
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'music-playlist-picker-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  await main.webContents.executeJavaScript(
    "document.querySelector('.music-playlist-picker [data-cancel-playlists]').click();document.querySelector('.music-library-table [data-song-options]:not([data-song-options=menu])').click();document.querySelector('[data-song-option=delete]').click()"
  );
  const deleteStyled = await main.webContents.executeJavaScript(
    "(()=>{const d=document.querySelector('.music-delete-dialog'),c=d.querySelector('[data-no]'),yes=d.querySelector('[data-yes]');return d.open&&d.querySelector('p').textContent.includes('library and all playlists')&&c.classList.contains('secondary')&&Math.abs(c.getBoundingClientRect().height-yes.getBoundingClientRect().height)<1&&getComputedStyle(c).backgroundColor!=='rgba(0, 0, 0, 0)'&&getComputedStyle(yes).backgroundColor!==getComputedStyle(c).backgroundColor;})()"
  );
  if (!deleteStyled) throw Error('Music delete/cancel button styling failed');
  await new Promise(resolve => setTimeout(resolve, 220));
  await writeFile(
    join(process.env.AETHERION_TEST_DATA, 'music-delete-smoke.png'),
    (await main.webContents.capturePage()).toPNG()
  );
  await main.webContents.executeJavaScript("document.querySelector('.music-delete-dialog [data-no]').click()");
  await smokePlaylistSelection(main);
  await smokePlayerLayout(main, process.env.AETHERION_TEST_DATA);
  await smokeSoundEffects(main, audioWindow, process.env.AETHERION_TEST_DATA);
  const menuLibrary = await (await fetch(origin + '/api/music')).json();
  const menuSong = menuLibrary.tracks.find(track => track.name === 'Town');
  const assignMenu = await fetch(origin + '/api/music/settings', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignments: { ...menuLibrary.assignments, 'main-menu': menuSong.id }, fadeSeconds: 0 })
  });
  if (!assignMenu.ok) throw Error('Main menu music settings failed');
  main.webContents.send('desktop-pause');
  await new Promise(resolve => setTimeout(resolve, 150));
  await main.webContents.executeJavaScript(
    "[...document.querySelectorAll('#desktop-pause button')].find(button=>button.textContent==='Main Menu').click()"
  );
  for (let attempt = 0; attempt < 80; attempt++) {
    if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id === menuSong.id)
      break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id !== menuSong.id)
    throw Error(
      'Custom main menu song did not play: expected ' +
        menuSong.id +
        ', actual ' +
        JSON.stringify(await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')) +
        ', page ' +
        main.webContents.getURL()
    );
  await shutdown();
  app.quit();
}
