// Focused layout inspection with muted audio and isolated saves.
const { app, BrowserWindow } = require('electron');
const { mkdtemp, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
app.commandLine.appendSwitch('mute-audio');
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});
const deadline = setTimeout(() => app.exit(1), 60000);
(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-alignment-'));
  console.log('Diagnostics: ' + directory);
  app.setPath('userData', join(directory, 'browser'));
  process.env.HORSE_DATA_DIR = join(directory, 'data');
  process.env.PORT = '0';
  await app.whenReady();
  const backend = await import(pathToFileURL(resolve(__dirname, '../server.js')).href);
  const origin = await backend.serverReady;
  const win = new BrowserWindow({
    show: false,
    width: 1440,
    height: 1000,
    webPreferences: { offscreen: true, backgroundThrottling: false }
  });
  win.webContents.setAudioMuted(true);
  const run = fn => win.webContents.executeJavaScript('(' + fn.toString() + ')()');
  await win.loadURL(origin + '/#inventory/all');
  for (let i = 0; i < 100; i++) {
    if (await run(() => !!document.querySelector('.inventory-tabs'))) break;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  for (const width of [1920, 1440, 1100, 900, 420]) {
    win.setSize(width, 1000);
    for (const route of [
      'inventory/all',
      'stable/all',
      'stable/breeding',
      'dev/profile',
      'dev/music',
      'dev/saves',
      'wilds/aetherion'
    ]) {
      await run(() => document.querySelector('.foraging-dialog')?.close());
      await win.webContents.executeJavaScript('location.hash = ' + JSON.stringify(route));
      await new Promise(resolve => setTimeout(resolve, 180));
      const metrics = await run(() => {
        const rect = document.querySelector('#main').getBoundingClientRect();
        return {
          center: rect.x + rect.width / 2,
          target: innerWidth / 2,
          overflow: document.documentElement.scrollWidth > innerWidth
        };
      });
      assert.ok(Math.abs(metrics.center - metrics.target) < 1, `${width} ${route}: ${JSON.stringify(metrics)}`);
      assert.equal(metrics.overflow, false, `${width} ${route} overflows`);
      if (width === 1440 || width === 420)
        await writeFile(
          join(directory, `${width}-${route.replace('/', '-')}.png`),
          (await win.webContents.capturePage()).toPNG()
        );
    }
  }
  win.destroy();
  await backend.closeGameServer();
  clearTimeout(deadline);
  console.log('Page centers and responsive overflow checks passed at five viewport widths.');
  app.exit(0);
})().catch(error => {
  console.error(error);
  app.exit(1);
});
