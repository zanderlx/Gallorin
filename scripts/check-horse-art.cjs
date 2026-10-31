const { app, BrowserWindow } = require('electron');
const { createServer } = require('node:http');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve, extname } = require('node:path');
const { pathToFileURL } = require('node:url');

const root = resolve(__dirname, '..');
const directory = mkdtempSync(join(tmpdir(), 'gallorin-art-check-'));
app.setPath('userData', directory);
app.commandLine.appendSwitch('mute-audio');
app.disableHardwareAcceleration();
let server;
app
  .whenReady()
  .then(async () => {
    const load = file => import(pathToFileURL(join(root, file)).href);
    const { html, raw, card } = await load('public/ui.js');
    const { profileContent } = await load('public/profile.js');
    const { normalizeCatalog } = await load('public/definitions.js');
    const { createEncounters } = await load('src/encounters.js');
    const catalog = normalizeCatalog(JSON.parse(await readFile(join(root, 'data/definitions/catalog.json'), 'utf8')));
    const settings = JSON.parse(await readFile(join(root, 'data/defaults/settings.json'), 'utf8'));
    const horse = createEncounters(catalog, 'aetherion', 1, 0, undefined, () => 0.5)[0];
    Object.assign(horse, {
      name: 'Topaz Artwork Preview',
      species: 'Unicorn',
      palette: catalog.palettes.find(p => p.name === 'Topaz')
    });
    const state = { horses: [horse], sold: [], settings };
    const markup =
      String(html`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/library.css"><link rel="stylesheet" href="/profile-layout.css"><style>
    body {margin:0;padding:24px;background:#111a16;} h1 {font-size:24px;} h2.preview-label {font-size:16px;margin:8px 0;}
    .art-check {display:grid;grid-template-columns:320px 880px;gap:24px;align-items:start;}
    #profile {width:880px;transform:none;} .profile-scroll-frame {max-height:840px;}
    .cards {display:grid;gap:12px;} .cards .card {width:320px;}
  </style></head><body><h1>Gallorin · New artwork with original backgrounds</h1><div class="art-check"><section class="cards"><h2 class="preview-label">Wilds · Full body</h2>${raw(card({ ...horse, id: 'wild-preview' }, state, 'wild', catalog))}<h2 class="preview-label">Stables · Headshot</h2>${raw(card({ ...horse, id: 'stable-preview' }, state, 'stable', catalog))}</section><section><h2 class="preview-label">Horse profile · Headshot</h2><div id="profile">${raw(profileContent(horse, state, { catalog }))}</div></section></div><script type="module">import {bindHorseArtViewer} from '/horse-art-viewer.js'; bindHorseArtViewer(); window.artReady = true;</script></body></html>`);
    const publicRoot = join(root, 'public');
    server = createServer(async (req, res) => {
      try {
        if (req.url === '/') {
          res.setHeader('Content-Type', 'text/html');
          return res.end(markup);
        }
        const file = resolve(publicRoot, '.' + new URL(req.url, 'http://localhost').pathname);
        if (!file.startsWith(publicRoot + require('node:path').sep)) {
          res.writeHead(403);
          return res.end();
        }
        res.setHeader(
          'Content-Type',
          { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(file)] ||
            'application/octet-stream'
        );
        res.end(await readFile(file));
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const win = new BrowserWindow({
      show: false,
      width: 1280,
      height: 1040,
      useContentSize: true,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    win.webContents.setAudioMuted(true);
    const errors = [];
    win.webContents.on('console-message', details => {
      if (details.level === 'error') errors.push(details.message);
    });
    await win.loadURL(`http://127.0.0.1:${server.address().port}`);
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
    const check = async verify => {
      const result = await win.webContents.executeJavaScript(
        `(() => {try { (${verify.toString()})(); return null; } catch(error) {return error.message;}})()`
      );
      if (result) throw Error(result);
    };
    await check(verifyArtwork);
    const output = join(root, 'test-results/horse-art');
    await mkdir(output, { recursive: true });
    const paint = () =>
      win.webContents.executeJavaScript(
        'new Promise(resolve => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))), 450))'
      );
    await paint();
    await writeFile(join(output, 'in-game-preview.png'), (await win.webContents.capturePage()).toPNG());
    await check(verifyViewer);
    await paint();
    await writeFile(join(output, 'full-art-viewer.png'), (await win.webContents.capturePage()).toPNG());
    if (errors.length) throw Error(errors.join('\n'));
    console.log(
      'PASS: Wilds, stable, both profile portraits and cloned full-art viewer use the new model with independent SVG references.'
    );
    win.destroy();
    server.close();
    app.exit(0);
  })
  .catch(error => {
    console.error(error);
    server?.close();
    app.exit(1);
  });

function verifyArtwork() {
  if (!window.artReady) throw Error('Artwork viewer did not load');
  const expected = ['0 0 460 310', '45 10 145 170', '45 10 145 170', '45 10 145 170'];
  const art = [...document.querySelectorAll('.horse-art')];
  if (art.length !== expected.length) throw Error('Missing card/profile portraits');
  for (const [index, svg] of art.entries()) {
    if (svg.getAttribute('viewBox') !== expected[index]) throw Error('Wrong full-body/headshot crop');
    if (!svg.querySelector('[data-horse-model=layered]')) throw Error('Legacy artwork still active');
    if (!svg.querySelector('[data-layer=keratin], [data-trait-category=Keratin]')) throw Error('Unicorn horn missing');
    for (const node of svg.querySelectorAll('[href]')) {
      if (!svg.querySelector('[id="' + node.getAttribute('href').slice(1) + '"]')) throw Error('Missing source shape');
    }
    const bounds = svg.getBoundingClientRect();
    if (bounds.width < 100 || bounds.height < 100) throw Error('Artwork is collapsed');
  }
}

function verifyViewer() {
  document.querySelector('[data-full-horse]').click();
  const dialog = document.querySelector('#horse-art-viewer');
  if (!dialog?.open) throw Error('Full-art viewer did not open');
  const art = dialog.querySelector('.horse-art');
  if (art.getAttribute('viewBox') !== '0 0 460 310') throw Error('Full-art viewer did not restore body crop');
  const originals = new Set([...document.querySelectorAll('#profile [id]')].map(node => node.id));
  for (const node of art.querySelectorAll('[id]'))
    if (originals.has(node.id)) throw Error('Cloned ID collides with source');
  for (const node of art.querySelectorAll('*'))
    for (const attr of node.attributes) {
      const references = [...attr.value.matchAll(/url\(#([^)]+)\)/g)].map(match => match[1]);
      if (attr.localName === 'href') references.push(attr.value.slice(1));
      for (const id of references)
        if (!art.querySelector('[id="' + id + '"]')) throw Error('Viewer references original artwork: ' + id);
    }
  const source = document.querySelector('#profile .horse-art');
  source.querySelectorAll('defs,mask').forEach(node => node.remove());
  for (const node of art.querySelectorAll('[href]'))
    if (!art.querySelector('[id="' + node.getAttribute('href').slice(1) + '"]'))
      throw Error('Viewer lost source geometry');
}
