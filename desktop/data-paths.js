import { join } from 'node:path';

// Keep Gallorin saves isolated from legacy Aetherion installations.
export function desktopDataPath(appData, packaged) {
  return join(appData, packaged ? 'Gallorin' : 'Gallorin Development');
}
