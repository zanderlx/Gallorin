// @ts-check
import { open, rename, readdir, unlink, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Writes a file and flushes it to disk before returning, so a power cut cannot leave it empty.
 * @param {string} path
 * @param {string | Uint8Array} data
 * @param {{ exclusive?: boolean }} [options] exclusive: fail if the file already exists.
 */
export async function writeDurable(path, data, { exclusive = false } = {}) {
  const handle = await open(path, exclusive ? 'wx' : 'w');
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/**
 * Atomically replaces a file: a flushed temporary file is renamed over the target.
 * @param {string} path
 * @param {string | Uint8Array} data
 */
export async function replaceDurable(path, data) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeDurable(temporary, data, { exclusive: true });
  await rename(temporary, path);
  await syncDirectory(dirname(path));
}

/**
 * Copies a file and flushes the copy to disk.
 * @param {string} source
 * @param {string} target
 */
export async function copyDurable(source, target) {
  await copyFile(source, target);
  const handle = await open(target, 'r+');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

// Records renames on POSIX filesystems. Windows cannot open directories, and NTFS journals renames.
async function syncDirectory(directory) {
  if (process.platform === 'win32') return;
  const handle = await open(directory, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/**
 * Deletes the oldest backups for one prefix, keeping the newest `keep` sets. Companion files
 * such as `<name>-palettes.json` share a set with `<name>.json` and are kept or removed together.
 * Names must embed a sortable timestamp right after the prefix.
 * @param {string} directory
 * @param {string} prefix
 * @param {number} keep
 */
export async function pruneBackups(directory, prefix, keep) {
  const files = (await readdir(directory)).filter(name => name.startsWith(prefix) && name.endsWith('.json'));
  const sets = new Map();
  for (const name of files) {
    const key = name.replace(/-palettes\.json$|\.json$/, '');
    sets.set(key, [...(sets.get(key) || []), name]);
  }
  const stamp = key => Number(key.slice(prefix.length).split('-')[0]) || 0;
  const expired = [...sets.keys()].sort((a, b) => stamp(b) - stamp(a) || (a < b ? 1 : -1)).slice(keep);
  for (const key of expired) for (const name of sets.get(key)) await unlink(join(directory, name)).catch(() => {});
}
