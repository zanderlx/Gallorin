const { app, BrowserWindow } = require('electron');
const { mkdtempSync, mkdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve, join } = require('node:path');

// Render only the standalone artwork; never open the game or its save directory.
const directory = mkdtempSync(join(tmpdir(), 'gallorin-horse-art-'));
mkdirSync(join(directory, 'browser'));
app.setPath('userData', join(directory, 'browser'));
app.commandLine.appendSwitch('mute-audio');
app.disableHardwareAcceleration();
app
  .whenReady()
  .then(async () => {
    const win = new BrowserWindow({
      show: false,
      width: 1500,
      height: 740,
      useContentSize: true,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    win.webContents.setAudioMuted(true);
    await win.loadFile(resolve(__dirname, '../test-results/horse-art/preview.svg'));
    // Wait for a painted frame, including text, before capturing.
    await win.webContents.executeJavaScript(
      'document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))'
    );
    const screenshot = await win.webContents.capturePage();
    writeFileSync(resolve(__dirname, '../test-results/horse-art/preview.png'), screenshot.toPNG());
    console.log('Horse preview captured.');
    win.destroy();
    app.exit(0);
  })
  .catch(error => {
    console.error(error);
    app.exit(1);
  });
