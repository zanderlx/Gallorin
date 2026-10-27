// @ts-check
import { limits } from './public/limits.js';
import { musicContexts } from './public/music-context.js';
import { MusicLibrary } from './src/music-library.js';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameStore } from './src/store.js';
import { listenLocal } from './src/local-server.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const { version: appVersion } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const catalog = JSON.parse(await readFile(resolve(root, 'data/definitions/catalog.json'), 'utf8'));
const defaults = JSON.parse(await readFile(resolve(root, 'data/defaults/settings.json'), 'utf8'));
const store = await new GameStore(process.env.HORSE_DATA_DIR || resolve(root, 'data'), catalog, defaults).init();
const musicDefaults = JSON.parse(await readFile(resolve(root, 'data/defaults/music.json'), 'utf8'));
const music = new MusicLibrary(
  process.env.HORSE_DATA_DIR || resolve(root, 'data'),
  resolve(root, 'desktop/assets/music/main-menu.mp3'),
  musicDefaults.tracks.map(track => ({ ...track, source: resolve(root, 'desktop/assets/music', track.file) })),
  musicDefaults
);
await music.ready;
const port = Number(process.env.PORT || 4173);
const publicRoot = resolve(root, 'public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};
const send = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'"
  );
  const boundPort = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
  const allowedHosts = new Set([`localhost:${boundPort}`, `127.0.0.1:${boundPort}`]);
  if (!allowedHosts.has(req.headers.host)) return send(res, 403, { error: 'Local connections only.' });
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/music')) {
      if ((req.method === 'GET' || req.method === 'HEAD') && /^\/api\/music\/media\/[^/]+$/.test(url.pathname))
        return await music.media(req, res, url.pathname.split('/').at(-1));
      if (req.method === 'GET' && url.pathname === '/api/music') return send(res, 200, await music.read());
      if (req.method === 'POST') {
        if (req.headers.origin !== 'http://' + req.headers.host)
          return send(res, 403, { error: 'Same-origin requests required.' });
        const upload = url.pathname === '/api/music/import';
        if (!(req.headers['content-type'] || '').startsWith(upload ? 'audio/mpeg' : 'application/json'))
          return send(res, 415, { error: 'Unsupported file type.' });
        if (upload) {
          try {
            const name = decodeURIComponent(String(req.headers['x-file-name'] || ''));
            return send(res, 200, await music.upload(name, req, url.searchParams.get('kind') || 'music'));
          } catch (error) {
            if (error.code !== 'TOO_LARGE') throw error;
            send(res, 413, { error: error.message });
            return req.destroy();
          }
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > limits.musicJsonBytes) return send(res, 413, { error: 'Request too large.' });
          chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks);
        const input = JSON.parse(bytes.toString());
        if (url.pathname === '/api/music/settings') {
          const contexts = musicContexts([
            ...store.getCatalog().locations,
            ...(store.snapshot().customLocations || [])
          ]).map(item => item.id);
          return send(res, 200, await music.settings(input, contexts));
        }
        if (url.pathname === '/api/music/event-volume')
          return send(res, 200, await music.eventVolume(input.event, input.volumePercent));
        if (url.pathname === '/api/music/update') return send(res, 200, await music.update(input.id, input.values));
        if (url.pathname === '/api/music/assign') {
          const contexts = musicContexts([
            ...store.getCatalog().locations,
            ...(store.snapshot().customLocations || [])
          ]).map(item => item.id);
          return send(res, 200, await music.assign(input.id, input.playlistIds, contexts));
        }
        if (url.pathname === '/api/music/fade') return send(res, 200, await music.fade(input.fadeSeconds));
        if (url.pathname === '/api/music/delete') return send(res, 200, await music.remove(input.id));
      }
      return send(res, 404, { error: 'Music endpoint not found.' });
    }
    if (req.method === 'GET' && url.pathname === '/api/health')
      return send(res, 200, {
        application: 'gallorin',
        projectId: createHash('sha256').update(resolve(root).toLowerCase()).digest('hex'),
        pid: process.pid
      });
    if (req.method === 'GET' && url.pathname === '/api/state') {
      await store.refreshConfiguration();
      return send(res, 200, { state: store.snapshot(), catalog: store.getCatalog(), defaults, appVersion });
    }
    if (req.method === 'GET' && url.pathname === '/api/changelog')
      return send(res, 200, { changelog: await readFile(resolve(root, 'CHANGELOG.md'), 'utf8') });
    if (req.method === 'GET' && url.pathname === '/api/export') {
      await store.refreshConfiguration();
      res.setHeader('Content-Disposition', 'attachment; filename="gallorin-backup.json"');
      return send(res, 200, { state: store.snapshot(), catalog: store.getCatalog(), defaults });
    }
    if (req.method === 'POST' && url.pathname === '/api/action') {
      if (
        req.headers.origin !== `http://${req.headers.host}` ||
        !req.headers['content-type']?.startsWith('application/json')
      )
        return send(res, 403, { error: 'Same-origin JSON requests required.' });
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > limits.actionBodyBytes) {
          send(res, 413, { error: 'Request too large.' });
          return req.destroy();
        }
      }
      const { type, payload } = JSON.parse(body);
      if (type === 'preview-horse-updates') return send(res, 200, await store.previewHorseUpdates(payload));
      return send(res, 200, { state: await store.action(type, payload), catalog: store.getCatalog() });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not supported.' });
    const path = resolve(publicRoot, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(publicRoot + sep)) return send(res, 403, { error: 'Access denied.' });
    const content = await readFile(path);
    res.writeHead(200, {
      'Content-Type': mime[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    // A reply already under way (such as a streamed song) cannot be replaced by an error message.
    if (res.headersSent) return res.destroy();
    send(res, error.code === 'ENOENT' ? 404 : 400, { error: error.code === 'ENOENT' ? 'Not found.' : error.message });
  }
});
export const serverReady = listenLocal(server, port).then(origin => {
  console.log(`Gallorin is ready at ${origin}`);
  return origin;
});
serverReady.catch(() => {}); // CLI errors are reported by the existing error handler.
export async function closeGameServer() {
  await /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())))
  );
  await music.queue;
  await store.queue; // Let every accepted write finish before desktop shutdown or updates.
}
server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
