import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { desktopDataPath } from '../desktop/data-paths.js';
import { normalizeCatalog } from '../public/definitions.js';
test('Gallorin ignores legacy storage and separates development data', () => {
  const root = join('example', 'AppData');
  assert.equal(
    desktopDataPath(root, true, () => false),
    join(root, 'Gallorin')
  );
  assert.equal(
    desktopDataPath(root, false, () => false),
    join(root, 'Gallorin Development')
  );
  assert.equal(
    desktopDataPath(root, true, path => path === join(root, 'Aetherion')),
    join(root, 'Gallorin')
  );
  assert.equal(
    desktopDataPath(root, false, path => path === join(root, 'Aetherion Development')),
    join(root, 'Gallorin Development')
  );
  assert.equal(
    desktopDataPath(root, true, () => true),
    join(root, 'Gallorin')
  );
});
test('legacy built-in theme name is rebranded without touching custom theme names', () => {
  const source = {
    species: [],
    personalities: [],
    locations: [],
    siteThemes: [
      { id: 'default', name: 'Aetherion Original' },
      { id: 'custom', name: 'Aetherion Original' }
    ]
  };
  const result = normalizeCatalog(source);
  assert.equal(result.siteThemes[0].name, 'Gallorin Original');
  assert.equal(result.siteThemes[1].name, 'Aetherion Original');
  assert.equal(source.siteThemes[0].name, 'Aetherion Original');
});
