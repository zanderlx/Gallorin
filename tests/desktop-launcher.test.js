import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
const execute = promisify(execFile);
const script = new URL('../scripts/desktop-launcher.js', import.meta.url);
test('desktop launcher starts hidden-compatible server, reuses it, and stops only that project', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'aetherion-launcher-test-'));
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const env = { ...process.env, PORT: String(port), HORSE_DATA_DIR: directory, AETHERION_NO_BROWSER: '1' };
  const run = mode =>
    execute(process.execPath, [fileURLToPath(script), mode], { env, timeout: 35000, windowsHide: true });
  let pid;
  t.after(async () => {
    if (pid) {
      try {
        process.kill(pid);
      } catch {}
    }
    await rm(directory, { recursive: true, force: true });
  });
  await run('start');
  const url = 'http://127.0.0.1:' + port;
  const first = await (await fetch(url + '/api/health')).json();
  pid = first.pid;
  assert.equal(first.application, 'gallorin');
  await run('start');
  assert.equal((await (await fetch(url + '/api/health')).json()).pid, pid);
  const saved = await readFile(join(directory, 'player', 'save.json'), 'utf8');
  await run('stop');
  pid = null;
  await assert.rejects(fetch(url + '/api/health'));
  assert.equal(await readFile(join(directory, 'player', 'save.json'), 'utf8'), saved);
  await run('stop');
});
