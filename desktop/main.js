import { audioPreferences as normalizeAudio } from '../public/audio-preferences.js';
import { selectedPlaylist, defaultMusicTrack, musicTracks } from '../public/music-context.js';
import { brandLogo } from '../public/brand-logo.js';
import { desktopDataPath } from './data-paths.js';
import updater from 'electron-updater';
import { app, BrowserWindow, Menu, dialog, shell, session, ipcMain } from 'electron';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { rotateLog } from '../src/log-rotation.js';
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
let logRotated = false;
const log = message => {
  try {
    const file = join(app.getPath('userData'), 'desktop.log');
    if (!logRotated) {
      rotateLog(file);
      logRotated = true;
    }
    appendFileSync(file, new Date().toISOString() + ' ' + String(message) + '\n');
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
  process.env.PORT = '0'; // The server selects an available, browser-safe private port.
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
  Menu.setApplicationMenu(null);
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
        'effect-level',
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
    if (value.type === 'effect-level') {
      if (typeof value.id !== 'string' || !Number.isFinite(value.value) || value.value < 0 || value.value > 1)
        return null;
      value = {
        type: 'effect-level',
        id: value.id,
        eventId: typeof value.eventId === 'string' ? value.eventId.slice(0, 100) : undefined,
        value: value.value
      };
    }
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
        eventId: typeof value.eventId === 'string' ? value.eventId.slice(0, 100) : undefined,
        track: {
          id: String(value.track.id),
          name: String(value.track.name),
          artist: String(value.track.artist ?? 'Gallorin Studios'),
          url: value.track.url,
          volumePercent: Number.isFinite(value.track.volumePercent)
            ? Math.max(0, Math.min(100, value.track.volumePercent))
            : 100
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
  ipcMain.handle('check-for-updates', async event => {
    if (!fromGame(event) || event.senderFrame !== main.webContents.mainFrame)
      throw new Error('Update checks are only available in the game.');
    await checkUpdates(true);
  });
  ipcMain.handle('open-local-save', async event => {
    if (!fromGame(event) || event.senderFrame !== main.webContents.mainFrame)
      throw new Error('Open Local Save is only available in the game.');
    const error = await shell.openPath(data);
    if (error) throw new Error('Unable to open the local save folder: ' + error);
  });
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
    if (
      !app.isPackaged &&
      input.type === 'keyDown' &&
      input.control &&
      !input.alt &&
      !input.meta &&
      !input.shift &&
      input.key.toLowerCase() === 'r'
    ) {
      event.preventDefault();
      if (!input.isAutoRepeat) main.webContents.reload();
      return;
    }
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
    const { runSmokeTest } = await import('./smoke-test.js');
    await runSmokeTest({ app, main, audioWindow, origin, data, root, audioCommand, shutdown });
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
