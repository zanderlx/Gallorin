import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importLegacyData } from '../desktop/data-migration.js';

test('desktop migration copies saves/config/backups and never overwrites source or target', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'aetherion-migration-'));
  try {
    const source = join(temp, 'source'),
      target = join(temp, 'desktop');
    for (const folder of ['player', 'config', 'backups']) await mkdir(join(source, folder), { recursive: true });
    const save = JSON.stringify({ version: 1, horses: [{ id: 'kept' }], settings: {} });
    await writeFile(join(source, 'player/save.json'), save);
    await writeFile(join(source, 'config/example.json'), '{"value":35}');
    await writeFile(join(source, 'backups/original.json'), save);
    await importLegacyData(source, target, async stage => {
      assert.equal(await readFile(join(stage, 'config/example.json'), 'utf8'), '{"value":35}');
    });
    assert.equal(await readFile(join(source, 'player/save.json'), 'utf8'), save);
    assert.equal(await readFile(join(target, 'player/save.json'), 'utf8'), save);
    assert.equal(await readFile(join(target, 'backups/original.json'), 'utf8'), save);
    await assert.rejects(
      importLegacyData(source, target, async () => {}),
      /already exists/
    );
    await assert.rejects(
      importLegacyData(source, join(temp, 'invalid'), async () => {
        throw Error('Invalid config');
      }),
      /Invalid config/
    );
    assert.deepEqual((await readdir(temp)).sort(), ['desktop', 'source']);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
