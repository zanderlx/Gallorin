import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assembleHorse, horseLayers, readHorseLayers } from '../scripts/lib/horse-svg.js';

test('supplied SVG layers assemble with resolved, isolated references and preserved outlines', async () => {
  const layers = await readHorseLayers();
  const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
  for (const palette of catalog.palettes.filter(p => p.complete && Object.keys(p.colors).length === 9)) {
    const svg = assembleHorse(layers, { colors: palette.colors, prefix: 'sample' });
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, palette.name);
    for (const reference of svg.matchAll(/(?:href="#|url\(#)([^")]+)/g)) {
      assert.ok(ids.includes(reference[1]), `${palette.name}: unresolved ${reference[1]}`);
    }
    for (const [name, channel] of horseLayers) {
      assert.ok(svg.includes(`data-layer="${name}" data-channel="${channel}" fill="none"`));
      const group = svg.match(new RegExp(`<g data-layer="${name}"[^>]*>([\\s\\S]*?)</g>`))[1];
      assert.ok(group.includes(`fill="${channel === 'Eye' ? '#58BFFF' : palette.colors[channel]}"`));
      assert.ok(group.includes('fill="white"'), `${name}: mask preserved`);
      const source = layers.find(layer => layer.name === name).svg;
      for (const attribute of ['fill="black"', 'stroke="black"', 'fill-opacity="0.25"', 'stroke-opacity="0.25"']) {
        assert.equal(group.split(attribute).length, source.split(attribute).length, `${name}: ${attribute} preserved`);
      }
    }
  }
  const original = assembleHorse(layers, { prefix: 'original' });
  assert.ok(original.includes('fill="#A7C957"'));
  assert.ok(!original.includes('id="sample-'));
  assert.throws(() => assembleHorse(layers, { colors: {} }), /Missing or invalid/);
  assert.throws(() => assembleHorse(layers, { prefix: 'bad"prefix' }), /Invalid SVG ID prefix/);
});
