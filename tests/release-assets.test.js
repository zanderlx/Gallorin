import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyReleaseAssets } from '../scripts/verify-release-assets.js';
async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'gallorin-assets-'));
  const bytes = Buffer.from('test installer'),
    hash = createHash('sha512').update(bytes).digest('base64');
  const manifest =
    'version: 1.2.3\nfiles:\n  - url: Gallorin-Setup-1.2.3.exe\n    sha512: ' +
    hash +
    '\n    size: ' +
    bytes.length +
    '\npath: Gallorin-Setup-1.2.3.exe\nsha512: ' +
    hash +
    '\n';
  await writeFile(join(directory, 'Gallorin-Setup-1.2.3.exe'), bytes);
  await writeFile(join(directory, 'Gallorin-Setup-1.2.3.exe.blockmap'), 'map');
  try {
    await run(directory, manifest);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test('release assets agree with manifest and version', () =>
  fixture(async (directory, manifest) => {
    await writeFile(join(directory, 'latest.yml'), manifest);
    await verifyReleaseAssets(directory, '1.2.3');
  }));
for (const [name, edit] of [
  ['version', s => s.replace('version: 1.2.3', 'version: 1.2.4')],
  ['filename', s => s.replace('url: Gallorin-Setup-1.2.3.exe', 'url: other.exe')],
  ['checksum', s => s.replace(/sha512: .+/g, 'sha512: incorrect')],
  ['size', s => s.replace(/size: \d+/, 'size: 0')]
])
  test('reject incorrect release ' + name, () =>
    fixture(async (directory, manifest) => {
      await writeFile(join(directory, 'latest.yml'), edit(manifest));
      await assert.rejects(verifyReleaseAssets(directory, '1.2.3'));
    })
  );
test('reject missing blockmap', () =>
  fixture(async (directory, manifest) => {
    await writeFile(join(directory, 'latest.yml'), manifest);
    await rm(join(directory, 'Gallorin-Setup-1.2.3.exe.blockmap'));
    await assert.rejects(verifyReleaseAssets(directory, '1.2.3'));
  }));
