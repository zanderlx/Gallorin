const { app, BrowserWindow } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { syncLogo } = require('./sync-logo.cjs');
app.disableHardwareAcceleration();
app
  .whenReady()
  .then(async () => {
    const svg = syncLogo();
    const directory = join(__dirname, '../desktop/assets');
    const win = new BrowserWindow({
      show: false,
      width: 512,
      height: 512,
      frame: false,
      transparent: true,
      webPreferences: { sandbox: true }
    });
    await win.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          '<style>html,body{margin:0;background:transparent}svg{width:512px;height:512px;display:block}</style>' + svg
        )
    );
    await new Promise(resolve => setTimeout(resolve, 500));
    const rendered = await win.webContents.capturePage();
    writeFileSync(join(directory, 'icon.png'), rendered.resize({ width: 512, height: 512 }).toPNG());
    // ICO embeds PNG frames so Windows can choose a crisp icon for each display scale.
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const images = sizes.map(size => rendered.resize({ width: size, height: size, quality: 'best' }).toPNG());
    const header = Buffer.alloc(6 + 16 * sizes.length);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((size, index) => {
      const entry = 6 + 16 * index;
      header[entry] = size === 256 ? 0 : size;
      header[entry + 1] = size === 256 ? 0 : size;
      header.writeUInt16LE(1, entry + 4);
      header.writeUInt16LE(32, entry + 6);
      header.writeUInt32LE(images[index].length, entry + 8);
      header.writeUInt32LE(offset, entry + 12);
      offset += images[index].length;
    });
    writeFileSync(join(directory, 'icon.ico'), Buffer.concat([header, ...images]));
    app.quit();
  })
  .catch(error => {
    console.error(error);
    app.exit(1);
  });
