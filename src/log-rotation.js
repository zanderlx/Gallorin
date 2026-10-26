// @ts-check
import { renameSync, statSync } from 'node:fs';

export const maxLogBytes = 1024 * 1024;

/**
 * Moves a log over `maxBytes` to `<name>.1` (replacing the older copy) so logs stay small.
 * @param {string} path
 * @param {number} [maxBytes]
 */
export function rotateLog(path, maxBytes = maxLogBytes) {
  try {
    if (statSync(path).size > maxBytes) renameSync(path, path + '.1');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
