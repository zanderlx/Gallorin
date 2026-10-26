import { spawn } from 'node:child_process';
import { mkdir, open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const projectId = createHash('sha256').update(resolve(root).toLowerCase()).digest('hex');
const port = Number(process.env.PORT || 4173);
const url = 'http://127.0.0.1:' + port;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function health() {
  try {
    const response = await fetch(url + '/api/health', { signal: AbortSignal.timeout(1000) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
const matches = value => value?.application === 'aetherion' && value.projectId === projectId;
async function message(text, error = false) {
  if (process.env.AETHERION_NO_BROWSER === '1') {
    console[error ? 'error' : 'log'](text);
    return;
  }
  // Read message text through the environment; never interpolate it into shell code.
  await new Promise(resolve => {
    const child = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-Command',
        "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show($env:AETHERION_MESSAGE, 'Gallorin') | Out-Null"
      ],
      { windowsHide: true, env: { ...process.env, AETHERION_MESSAGE: text }, stdio: 'ignore' }
    );
    child.on('error', resolve);
    child.on('exit', resolve);
  });
}
async function run() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a number from 1 to 65535.');
  const mode = process.argv[2];
  if (!['start', 'stop'].includes(mode)) throw new Error('Choose start or stop.');
  let current = await health();
  if (mode === 'stop') {
    if (!current) {
      await message('Gallorin is already stopped.');
      return;
    }
    if (!matches(current) || !Number.isSafeInteger(current.pid))
      throw new Error('This port belongs to another application or Gallorin folder. Nothing was stopped.');
    process.kill(current.pid, 'SIGTERM');
    for (let i = 0; i < 30; i++) {
      if (!matches(await health())) {
        await message('Gallorin stopped. Your saves are retained.');
        return;
      }
      await pause(100);
    }
    throw new Error('The server has not finished stopping. Try again shortly.');
  }
  if (current && !matches(current))
    throw new Error(
      'Port ' + port + ' is used by another application or Gallorin folder. Close it or choose another PORT.'
    );
  if (!current) {
    const directory = resolve(process.env.HORSE_DATA_DIR || resolve(root, 'data'));
    await mkdir(directory, { recursive: true });
    const log = await open(resolve(directory, 'desktop-launcher.log'), 'a');
    const child = spawn(process.execPath, [resolve(root, 'server.js')], {
      cwd: root,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', log.fd, log.fd],
      env: process.env
    });
    let failure;
    child.on('error', error => (failure = error));
    child.unref();
    await log.close();
    for (let i = 0; i < 100; i++) {
      if (failure) throw failure;
      current = await health();
      if (matches(current)) break;
      await pause(200);
    }
    if (!matches(current))
      throw new Error(
        'Gallorin could not start. Check data/desktop-launcher.log. Another application may be using port ' + port + '.'
      );
  }
  if (process.env.AETHERION_NO_BROWSER === '1') {
    console.log('Gallorin ready at ' + url);
    return;
  }
  // Separate arguments preserve spaces in paths and avoid shell command construction.
  const browser = spawn('explorer.exe', [url], { detached: true, windowsHide: true, stdio: 'ignore' });
  browser.on('error', error => {
    void message('Server started, but the browser could not open: ' + error.message, true);
  });
  browser.unref();
}
run().catch(async error => {
  await message(error.message, true);
  process.exitCode = 1;
});
