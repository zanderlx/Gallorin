import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { horseArt, horseHeadArt, legacyHorseArt } from '../public/art.js';

const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
test('four-leg depth is layered behind the coat with palette-safe lighting in both views', () => {
  for (const palette of catalog.palettes.filter(p => p.complete && Object.keys(p.colors).length === 9)) {
    const horse = {
      id: 'depth-test',
      species: 'Horse',
      palette,
      eye: { colors: ['#123456'] },
      traits: { Mane: ['Standard Mane'], Tail: ['Long Wavy Tail'], Pattern: ['Deer Spots'] }
    };
    const before = structuredClone(horse);
    for (const render of [horseArt, horseHeadArt]) {
      const svg = render(horse);
      assert.equal([...svg.matchAll(/data-far-leg=/g)].length, 2);
      assert.ok(svg.indexOf('data-depth="far-legs"') < svg.indexOf('data-layer="coat bottom"'));
      assert.match(svg, /data-depth="coat-volume"/);
      assert.equal([...svg.matchAll(/data-depth="hair-volume"/g)].length, 2);
      const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
      assert.equal(ids.length, new Set(ids).size);
      for (const ref of svg.matchAll(/(?:href="#|url\(#)([^")]+)/g)) assert.ok(ids.includes(ref[1]), ref[1]);
      assert.doesNotMatch(svg, /NaN|undefined|<filter|<animate/);
    }
    assert.deepEqual(horse, before);
    assert.doesNotMatch(legacyHorseArt(horse), /data-depth=/);
  }
});
