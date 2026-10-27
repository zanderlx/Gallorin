import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import { listenLocal } from '../src/local-server.js';

test('automatic ports skip blocked/invalid candidates and retry occupied ports without leaking listeners', async () => {
  const server = new EventEmitter();
  const attempts = [];
  const candidates = [10080, 65536, 50000, 50001];
  server.listen = port => {
    attempts.push(port);
    queueMicrotask(() => {
      if (port === 50000) server.emit('error', Object.assign(new Error('Busy'), { code: 'EADDRINUSE' }));
      else server.emit('listening');
    });
  };
  server.address = () => ({ port: attempts.at(-1) });
  assert.equal(await listenLocal(server, 0, () => candidates.shift()), 'http://127.0.0.1:50001');
  assert.deepEqual(attempts, [50000, 50001]);
  assert.equal(server.listenerCount('error'), 0);
  assert.equal(server.listenerCount('listening'), 0);
});

test('a real automatic server is reachable through fetch on a private port', async t => {
  const server = createServer((_req, res) => res.end('ready'));
  const origin = await listenLocal(server, 0);
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = Number(new URL(origin).port);
  assert(port >= 49152 && port <= 65535);
  assert.equal(await (await fetch(origin)).text(), 'ready');
});

test('explicit port errors are reported and automatic retries are bounded', async () => {
  const server = new EventEmitter();
  let attempts = 0;
  server.listen = () => {
    attempts++;
    queueMicrotask(() => server.emit('error', Object.assign(new Error('Busy'), { code: 'EADDRINUSE' })));
  };
  await assert.rejects(listenLocal(server, 4173), { code: 'EADDRINUSE' });
  assert.equal(attempts, 1);
  attempts = 0;
  await assert.rejects(
    listenLocal(server, 0, () => 50000),
    /available local app port/
  );
  assert.equal(attempts, 32);
});
