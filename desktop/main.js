import { smokePlaylistRemoval } from './music-playlist-removal-smoke.js';
import { smokePlaylistSelection } from './music-playlist-selection-smoke.js';
import { smokePlayerLayout } from './music-player-layout-smoke.js';
import { smokeSoundEffects } from './music-effects-smoke.js';
import { audioPreferences as normalizeAudio } from '../public/audio-preferences.js';
import { selectedPlaylist, defaultMusicTrack, musicTracks } from '../public/music-context.js';
import { parseChangelog } from '../public/changelog.js';
import { brandLogo } from '../public/brand-logo.js';
import { desktopDataPath } from './data-paths.js';
import updater from 'electron-updater';
import { app, BrowserWindow, Menu, dialog, shell, session, ipcMain } from 'electron';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { importLegacyData } from './data-migration.js';
import { configureUpdates } from './updater.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const smoke = process.argv.includes('--smoke-test');
// Keep the cinematic splash for players; automated tests opt in only when testing it.
const showSplash = !smoke || process.argv.includes('--test-splash');
if (smoke && !process.env.AETHERION_TEST_DATA)
  throw new Error('Smoke testing requires an isolated AETHERION_TEST_DATA directory.');
if (process.env.AETHERION_SOFTWARE_RENDERING === '1') app.disableHardwareAcceleration();
app.setName('Gallorin');
const userDirectory = smoke
  ? join(process.env.AETHERION_TEST_DATA, 'browser')
  : desktopDataPath(app.getPath('appData'), app.isPackaged);
// Select Chromium storage before ready; development must not lock the installed game's cache or saves.
mkdirSync(join(userDirectory, 'chromium'), { recursive: true });
app.setPath('userData', userDirectory);
app.setPath('sessionData', join(userDirectory, 'chromium'));
const data = smoke ? join(process.env.AETHERION_TEST_DATA, 'data') : join(app.getPath('userData'), 'data');
let main,
  splash,
  backend,
  stopping = false,
  stopped = false;
const log = message => {
  try {
    appendFileSync(
      join(app.getPath('userData'), 'desktop.log'),
      new Date().toISOString() + ' ' + String(message) + '\n'
    );
  } catch {}
};
async function shutdown() {
  if (stopped) return;
  await backend?.closeGameServer();
  stopped = true;
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (main) {
      if (main.isMinimized()) main.restore();
      main.show();
      main.focus();
    }
  });
  app.on('before-quit', event => {
    if (stopped) return;
    event.preventDefault();
    if (stopping) return;
    stopping = true;
    shutdown()
      .then(() => app.quit())
      .catch(error => {
        log(error);
        stopping = false;
        dialog.showErrorBox('Unable to close safely', error.message);
      });
  });
  app.on('window-all-closed', () => app.quit());
  app
    .whenReady()
    .then(start)
    .catch(error => {
      log(error.stack);
      if (smoke) {
        console.error(error);
        app.exit(1);
      } else {
        dialog.showErrorBox('Gallorin could not start', error.message + '\nYour existing files have been preserved.');
        app.quit();
      }
    });
}

async function start() {
  await mkdir(app.getPath('userData'), { recursive: true });
  const options = { nodeIntegration: false, contextIsolation: true, sandbox: true };
  if (showSplash) {
    splash = new BrowserWindow({
      width: 640,
      height: 430,
      resizable: false,
      frame: false,
      backgroundColor: '#1d1b18',
      show: false,
      icon: join(root, 'desktop/assets/icon.png'),
      webPreferences: options
    });
    splash.setMenu(null);
    await splash.loadFile(join(root, 'desktop/splash.html'));
    splash.show();
    if (smoke) {
      await new Promise(resolve => setTimeout(resolve, 200));
      await writeFile(
        join(process.env.AETHERION_TEST_DATA, 'splash-smoke.png'),
        (await splash.webContents.capturePage()).toPNG()
      );
    }
  }
  const started = Date.now();
  if (!smoke && !existsSync(data)) await offerImport();
  process.env.HORSE_DATA_DIR = data;
  process.env.PORT = '0'; // An independent, OS-assigned port cannot collide with the browser server.
  backend = await import('../server.js');
  const origin = await backend.serverReady;
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  main = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 800,
    minHeight: 640,
    show: false,
    backgroundColor: '#1d1b18',
    title: 'Gallorin',
    icon: join(root, 'desktop/assets/icon.png'),
    webPreferences: {
      ...options,
      paintWhenInitiallyHidden: false,
      preload: join(root, 'desktop/menu-preload.cjs'),
      autoplayPolicy: 'no-user-gesture-required'
    }
  });
  if (smoke)
    main.webContents.on('console-message', (...args) =>
      console.error(
        args
          .slice(1)
          .map(value => (typeof value === 'object' ? value?.message : value))
          .join(' ')
      )
    );
  main.on('closed', () => app.quit());
  main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  main.webContents.on('will-navigate', (event, url) => {
    if (url !== menuURL && new URL(url).origin !== origin) event.preventDefault();
  });
  main.webContents.on('will-attach-webview', event => event.preventDefault());
  const checkUpdates = configureUpdates({
    autoUpdater: updater.autoUpdater,
    packaged: app.isPackaged,
    show: options => dialog.showMessageBox(main, options),
    shutdown,
    log
  });
  const openFolder = async folder => {
    await mkdir(folder, { recursive: true });
    const error = await shell.openPath(folder);
    if (error) log(error);
  };
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Gallorin',
        submenu: [
          { label: 'Open Save Folder', click: () => openFolder(join(data, 'player')) },
          { label: 'Open Configuration Folder', click: () => openFolder(join(data, 'config')) },
          { label: 'Open Backups Folder', click: () => openFolder(join(data, 'backups')) },
          { type: 'separator' },
          { label: 'Check for Updates', click: () => checkUpdates(true) },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { role: 'togglefullscreen' }
        ]
      }
    ])
  );
  let audioPreferences = normalizeAudio();
  const audioFile = join(app.getPath('userData'), 'audio-settings.json');
  try {
    const saved = JSON.parse(await readFile(audioFile, 'utf8'));
    audioPreferences = normalizeAudio(saved);
  } catch {}
  const audioWindow = new BrowserWindow({
    show: false,
    webPreferences: { ...options, autoplayPolicy: 'no-user-gesture-required', backgroundThrottling: false }
  });
  await audioWindow.loadFile(join(root, 'desktop/audio.html'));
  const audioCommand = value =>
    audioWindow.webContents.executeJavaScript('window.musicTransport.command(' + JSON.stringify(value) + ')');
  const updateAudio = async (changed = audioPreferences) => {
    if ('volume' in changed) await audioCommand({ type: 'volume', value: audioPreferences.volume / 100 });
    if ('muted' in changed) await audioCommand({ type: 'mute', value: audioPreferences.muted });
    if ('soundEffectsVolume' in changed)
      await audioCommand({ type: 'sfx-volume', value: audioPreferences.soundEffectsVolume / 100 });
  };
  ipcMain.handle('music-state', event =>
    event.sender === main.webContents
      ? audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')
      : null
  );
  ipcMain.handle('music-command', async (event, value) => {
    if (
      event.sender !== main.webContents ||
      !value ||
      ![
        'select',
        'effect',
        'metadata',
        'playlist',
        'next',
        'previous',
        'play',
        'pause',
        'stop',
        'seek',
        'volume',
        'sfx-volume',
        'fade',
        'mute'
      ].includes(value.type)
    )
      return null;
    if (value.type === 'metadata') {
      if (
        typeof value.id !== 'string' ||
        typeof value.name !== 'string' ||
        typeof value.artist !== 'string' ||
        value.name.length > 200 ||
        value.artist.length > 120
      )
        return null;
      value = { type: 'metadata', id: value.id, name: value.name, artist: value.artist };
    }
    if (value.type === 'playlist') {
      if (
        !Array.isArray(value.tracks) ||
        value.tracks.length > 500 ||
        value.tracks.some(
          track =>
            !track ||
            typeof track.url !== 'string' ||
            !track.url.startsWith(origin + '/api/music/media/') ||
            !/^http:\/\/127\.0\.0\.1:\d+\/api\/music\/media\/(menu|[a-f0-9-]{36})$/.test(track.url)
        )
      )
        return null;
      value = {
        type: 'playlist',
        key: String(value.key).slice(0, 150),
        startId: value.tracks.some(t => t.id === value.startId) ? value.startId : undefined,
        tracks: value.tracks.map(track => ({
          id: String(track.id),
          name: String(track.name),
          artist: String(track.artist ?? 'Gallorin Studios'),
          url: track.url
        })),
        fadeSeconds: Math.max(0, Math.min(10, Number(value.fadeSeconds) || 0))
      };
    }
    if (value.type === 'select' || value.type === 'effect') {
      if (
        !value.track ||
        typeof value.track.url !== 'string' ||
        !value.track.url.startsWith(origin + '/api/music/media/') ||
        !/^http:\/\/127\.0\.0\.1:\d+\/api\/music\/media\/(menu|[a-f0-9-]{36})$/.test(value.track.url)
      )
        return null;
      value = {
        type: value.type,
        track: {
          id: String(value.track.id),
          name: String(value.track.name),
          artist: String(value.track.artist ?? 'Gallorin Studios'),
          url: value.track.url
        },
        fadeSeconds: Math.max(0, Math.min(10, Number(value.fadeSeconds) || 0))
      };
    }
    return audioCommand(value);
  });
  await updateAudio();
  ipcMain.handle('audio-state', event => (event.sender === main.webContents ? audioPreferences : null));
  let audioWrite = Promise.resolve();
  ipcMain.handle('audio-set', async (event, value) => {
    if (event.sender !== main.webContents || !value || typeof value !== 'object') return;
    audioPreferences = normalizeAudio(value, audioPreferences);
    await updateAudio(value);
    audioWrite = audioWrite.then(() => writeFile(audioFile, JSON.stringify(audioPreferences))).catch(log);
    await audioWrite;
    return audioPreferences;
  });
  ipcMain.handle('music-settings', async event =>
    event.sender === main.webContents ? await (await fetch(origin + '/api/music')).json() : null
  );
  ipcMain.handle('music-fade', async (event, fadeSeconds) => {
    if (event.sender !== main.webContents) return null;
    const response = await fetch(origin + '/api/music/fade', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fadeSeconds })
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error);
    await audioCommand({ type: 'fade', value: result.fadeSeconds });
    return result;
  });
  const menuURL = pathToFileURL(join(root, 'desktop/menu.html')).href + '?game=' + encodeURIComponent(origin);
  ipcMain.handle('desktop-logo', event =>
    event.sender === main.webContents ? brandLogo('pause', 72, 'pause-logo') : ''
  );
  ipcMain.handle('desktop-changelog', event =>
    event.sender === main.webContents ? readFile(join(root, 'CHANGELOG.md'), 'utf8') : ''
  );
  ipcMain.handle('desktop-version', event => (event.sender === main.webContents ? app.getVersion() : null));
  ipcMain.on('menu-exit', event => {
    if (event.sender === main.webContents && event.senderFrame.url === menuURL) app.quit();
  });
  const fromGame = event => event.sender === main.webContents && event.senderFrame.url.startsWith(origin + '/');
  const playMenuMusic = async () => {
    const library = await (await fetch(origin + '/api/music')).json();
    const tracks = selectedPlaylist(library, 'main-menu').map(id => {
      const track = musicTracks(library).find(t => t.id === id) || defaultMusicTrack;
      return { ...track, url: origin + '/api/music/media/' + track.id };
    });
    await audioCommand({ type: 'playlist', key: 'main-menu', tracks, fadeSeconds: library.fadeSeconds });
  };
  ipcMain.on('pause-main-menu', event => {
    if (fromGame(event)) {
      void playMenuMusic().catch(log);
      void main.loadURL(menuURL);
    }
  });
  ipcMain.on('pause-exit', event => {
    if (fromGame(event)) app.quit();
  });
  main.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.key !== 'Escape' || input.isAutoRepeat) return;
    if (main.webContents.getURL().startsWith(origin + '/')) {
      event.preventDefault();
      main.webContents.send('desktop-pause');
    }
  });
  await main.loadURL(menuURL);
  // Explicitly exercise accessibility modes independently of the runner's OS settings.
  if (smoke && process.env.GALLORIN_SMOKE_MOTION) {
    const motion = process.env.GALLORIN_SMOKE_MOTION;
    if (!['normal', 'reduced'].includes(motion)) throw new Error('Invalid smoke motion mode.');
    main.webContents.debugger.attach('1.3');
    await main.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: motion === 'reduced' ? 'reduce' : 'no-preference' }]
    });
    // Check the loaded frame directly: a navigation listener can race the next
    // smoke-test navigation and report an expected disposed frame as a failure.
    const reduced = await main.webContents.executeJavaScript("matchMedia('(prefers-reduced-motion: reduce)').matches");
    if (reduced !== (motion === 'reduced')) throw new Error('Smoke motion override failed');
  }
  // A short aesthetic reveal, not a fabricated progress percentage.
  if (showSplash) await new Promise(resolve => setTimeout(resolve, Math.max(0, 4500 - (Date.now() - started))));
  main.show();
  splash?.destroy();
  splash = null;
  await playMenuMusic();
  await audioCommand({ type: 'play' });
  if (smoke) {
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
        (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id ===
        secondSong.id
      )
        break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (
      (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id !== secondSong.id
    )
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
        (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id ===
        secondSong.id
      )
        break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (
      (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id !== secondSong.id
    )
      throw Error('Play-button edge click failed');
    main.webContents.sendInputEvent({ type: 'mouseMove', x: 2, y: 2 });
    await new Promise(resolve => setTimeout(resolve, 100));
    await main.webContents.executeJavaScript(
      "(async()=>{\n const table=document.querySelector('[data-playlist=\"wilds/aetherion\"] table');\n if(table.querySelector('th[aria-sort=\"ascending\"],th[aria-sort=\"descending\"]'))throw Error('A column was sorted before a header click');\n if(table.querySelectorAll('.music-sort-indicator:not([hidden])').length!==0)throw Error('Sorting arrows were visible before a header click');\n const title=table.querySelector('[data-music-sort=\"title\"] button');title.click();\n const label=title.children[0].getBoundingClientRect(),arrow=title.children[1].getBoundingClientRect();\n if(arrow.left-label.right>10)throw Error('Sort arrow is not next to the label');\n title.click();title.click();\n if(table.querySelectorAll('.music-sort-indicator:not([hidden])').length!==0)throw Error('No-sort state did not hide arrows');\n const numbers=[...table.querySelectorAll('.music-row-number')].map(n=>Number(n.textContent));\n if(numbers.some((n,i)=>i&&n<numbers[i-1]))throw Error('No-sort did not restore row-number order');\n const delay=()=>new Promise(r=>setTimeout(r,340)),global=document.querySelector('[data-music-toggle-all]');\n const folder=document.querySelector('[data-music-group=\"stable\"]'),playlists=[...folder.querySelectorAll('[data-playlist]')];\n playlists[0].open=false;\n global.click();await delay();\n if([...document.querySelectorAll('[data-music-group]')].some(d=>!d.open)||global.textContent!=='Hide All')throw Error('Global Show All failed');\n if(playlists[0].open)throw Error('Global Show All unexpectedly changed playlist state');\n const other=document.querySelector('[data-music-group=\"town\"]'),otherState=[...other.querySelectorAll('[data-playlist]')].map(d=>d.open).join();\n const local=folder.querySelector('[data-music-toggle-folder]');local.click();await delay();\n if(playlists.some(d=>!d.open)||local.textContent!=='Hide All')throw Error('Folder Show All failed');\n if([...other.querySelectorAll('[data-playlist]')].map(d=>d.open).join()!==otherState)throw Error('Scoped button changed another folder');\n local.click();await delay();if(playlists.some(d=>d.open)||!folder.open)throw Error('Folder Hide All changed the folder itself or missed playlists');\n global.click();await delay();\n if([...document.querySelectorAll('[data-music-group]')].some(d=>d.open)||global.textContent!=='Show All')throw Error('Global Hide All failed');\n global.click();await delay();return true;\n})()"
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
    if (!result.brand || result.node !== 'undefined')
      throw new Error('Desktop renderer failed to initialize securely.');
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
      throw Error('Player song link did not reveal its All Songs row');
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
      if (
        (await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id === menuSong.id
      )
        break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if ((await audioWindow.webContents.executeJavaScript('window.musicTransport.snapshot()')).track?.id !== menuSong.id)
      throw Error('Custom main menu song did not play');
    await shutdown();
    app.quit();
  } else {
    setTimeout(() => checkUpdates(false), 3000);
  }
}

async function offerImport() {
  const choice = await dialog.showMessageBox(splash, {
    type: 'question',
    message: 'Welcome to Gallorin',
    detail:
      'Start a new sanctuary, or copy your existing browser save and configuration. Close the browser server before copying its data folder. The original files will remain untouched.',
    buttons: ['Start New', 'Copy Existing Data'],
    defaultId: 0,
    cancelId: 0
  });
  if (choice.response !== 1) return;
  const selection = await dialog.showOpenDialog(splash, {
    title: 'Choose your original Gallorin data folder',
    properties: ['openDirectory']
  });
  if (selection.canceled) throw new Error('Import cancelled. Restart to choose a save or start a new sanctuary.');
  const { GameStore } = await import('../src/store.js');
  const catalog = JSON.parse(await readFile(join(root, 'data/definitions/catalog.json'), 'utf8'));
  const defaults = JSON.parse(await readFile(join(root, 'data/defaults/settings.json'), 'utf8'));
  await importLegacyData(selection.filePaths[0], data, async staging => {
    await new GameStore(staging, catalog, defaults).init();
  });
}
