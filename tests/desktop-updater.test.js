import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { configureUpdates } from '../desktop/updater.js';

function fixture({
  available = true,
  responses = [0, 0],
  failure = false,
  packaged = true,
  tag = 'gallorin-v1.1.0'
} = {}) {
  const calls = [];
  const autoUpdater = new EventEmitter();
  autoUpdater.checkForUpdates = async () => {
    calls.push('check');
    if (failure) throw Error('offline');
    return { isUpdateAvailable: available, updateInfo: { version: '1.1.0', tag } };
  };
  autoUpdater.downloadUpdate = async () => {
    calls.push('download');
  };
  autoUpdater.quitAndInstall = () => calls.push('install');
  const check = configureUpdates({
    autoUpdater,
    packaged,
    show: async options => {
      calls.push(options.message);
      return { response: responses.shift() };
    },
    shutdown: async () => {
      calls.push('save-and-close');
    },
    log: () => {}
  });
  return { calls, check, autoUpdater };
}
test('desktop updates require download and restart consent and drain saves before installation', async () => {
  const f = fixture();
  await f.check();
  assert.ok(f.calls.indexOf('download') > f.calls.indexOf('A new version of Gallorin is available.'));
  assert.ok(f.calls.indexOf('install') > f.calls.indexOf('save-and-close'));
  assert.equal(f.autoUpdater.autoInstallOnAppQuit, false);
});
test('update deferral, offline startup, no update, and development mode do not install', async () => {
  for (const options of [
    { responses: [1] },
    { responses: [0, 1] },
    { failure: true },
    { available: false },
    { packaged: false }
  ]) {
    const f = fixture(options);
    await f.check();
    assert.ok(!f.calls.includes('install'));
    if (options.failure) assert.deepEqual(f.calls, ['check']);
    if (options.packaged === false) assert.deepEqual(f.calls, []);
  }
});
test('manual offline update check gives a recoverable message', async () => {
  const f = fixture({ failure: true });
  await f.check(true);
  assert.ok(f.calls.includes('Could not check for updates.'));
});

test('Gallorin ignores legacy Aetherion updates despite their higher version numbers', async () => {
  const f = fixture({ tag: 'v2.0.0' });
  await f.check(true);
  assert.ok(!f.calls.includes('download'));
  assert.ok(!f.calls.includes('install'));
  assert.ok(f.calls.includes('No Gallorin update is available.'));
});
