import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Import into a staging directory; never overwrite either an existing desktop save or the source.
export async function importLegacyData(source, target, validate) {
  source = resolve(source);
  target = resolve(target);
  if (source === target || existsSync(target))
    throw new Error('The desktop data folder already exists. Nothing was replaced.');
  const save = JSON.parse(await readFile(join(source, 'player', 'save.json'), 'utf8'));
  if (save.version !== 1 || !Array.isArray(save.horses) || !save.settings)
    throw new Error('Choose the original data folder containing player/save.json.');
  const staging = target + '.import-' + randomUUID();
  await mkdir(staging, { recursive: true });
  try {
    for (const folder of ['player', 'config', 'backups']) {
      if (existsSync(join(source, folder)))
        await cp(join(source, folder), join(staging, folder), { recursive: true, errorOnExist: true, force: false });
    }
    await validate(staging);
    await rename(staging, target);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}
