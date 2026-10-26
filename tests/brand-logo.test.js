import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { brandLogo } from '../public/brand-logo.js';
test('new logo is theme-aware and namespaces every mask/filter/clip/use reference', () => {
  const logo = brandLogo('sidebar', 43);
  assert.match(logo, /viewBox="0 0 200 200"/);
  assert.match(logo, /width="43" height="43"/);
  assert.match(logo, /var\(--gold,#D2B477\)/);
  const ids = new Set([...logo.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
  const refs = [...logo.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(match => match[1] || match[2]);
  assert.ok(ids.size > 0);
  assert.ok(refs.length > 0);
  for (const ref of refs) assert.ok(ids.has(ref), 'Missing SVG definition: ' + ref);
  const second = brandLogo('pause', 72, 'pause-logo');
  for (const id of ids) assert.ok(!second.includes('id="' + id + '"'));
  assert.throws(() => brandLogo('"><script>'), /Invalid/);
});
test('desktop copy uses the master SVG and Windows ICO has multiple correct resolutions', async () => {
  const master = await readFile(new URL('../public/assets/crest.svg', import.meta.url), 'utf8');
  const desktop = await readFile(new URL('../desktop/assets/logo.svg', import.meta.url), 'utf8');
  assert.equal(master.trim(), desktop.trim());
  const ico = await readFile(new URL('../desktop/assets/icon.ico', import.meta.url));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 7);
  for (let i = 0; i < 7; i++) {
    const offset = ico.readUInt32LE(6 + 16 * i + 12),
      length = ico.readUInt32LE(6 + 16 * i + 8);
    assert.ok(offset + length <= ico.length);
    assert.equal(ico.subarray(offset + 1, offset + 4).toString(), 'PNG');
  }
});
