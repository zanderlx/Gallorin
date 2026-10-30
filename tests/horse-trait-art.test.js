import test from 'node:test';
import assert from 'node:assert/strict';
import { speciesTraitData } from '../public/species-trait-data.js';
import { traitArtwork, traitArtDefinition, selectedArtTraits } from '../public/horse-trait-art.js';
import { horseArt, horseHeadArt } from '../public/art.js';

const colors = {
  'Coat Top': '#B38E67',
  'Coat Bottom': '#705538',
  Hair: '#3F2A27',
  Hoof: '#241C18',
  Nose: '#BFA389',
  Sock: '#F3DEC0',
  Paint: '#F7E8CA',
  Pattern: '#472C23',
  Keratin: '#DDBB75'
};
const horse = { id: 'trait-test', species: 'Horse', palette: { colors }, eye: { colors: ['#66BBCC'] }, traits: {} };

test('every bundled trait has deterministic vector artwork and a semantic recipe', () => {
  let count = 0;
  for (const [species, groups] of Object.entries(speciesTraitData))
    for (const [category, names] of Object.entries(groups))
      for (const name of names) {
        const art = String(traitArtwork(category, name, { colors }));
        assert.equal(art, String(traitArtwork(category, name, { colors })), `${species}: ${name}`);
        assert.match(art, /data-trait-family=/);
        assert.doesNotMatch(art, /undefined|NaN|__COLOR__|<script/);
        if (!/^bald$/i.test(name)) assert.match(art, /<path|<ellipse|<circle/, `${species}: ${name}`);
        count++;
      }
  assert.ok(count > 3300);
  assert.equal(traitArtDefinition('Keratin', 'Reindeer Antlers').family, 'antlers');
  assert.equal(traitArtDefinition('Mane', 'Braided Mane').family, 'braid');
  assert.equal(traitArtDefinition('Pattern', 'Deer Spots').family, 'spots');
  assert.equal(traitArtDefinition('Paint', 'Custom', 'a pattern of stars').family, 'stars');
});

test('saved traits replace placeholder markings and hair, combine, clip to the coat, and appear in both views', () => {
  const record = {
    ...horse,
    traits: {
      Mane: ['Braided Mane'],
      Tail: ['Flame Tail'],
      Pattern: ['Deer Spots', 'Star Dapple'],
      Paint: ['Blaze Paint'],
      Keratin: ['Ram Horns'],
      Ears: ['Jackrabbit Ears'],
      Cosmetic: ['Chin Beard'],
      Whiskers: ['Radiant Halo Head']
    }
  };
  const before = structuredClone(record);
  for (const render of [horseArt, horseHeadArt]) {
    const art = render(record);
    for (const names of Object.values(record.traits))
      for (const name of names) assert.ok(art.includes(`data-trait="${name}"`));
    assert.doesNotMatch(art, /data-layer="(?:mane|tail|paint|pattern|keratin)"/);
    assert.match(art, /clip-path="url\(#htrait-test-trait-coat\)"/);
    const ids = [...art.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const ref of art.matchAll(/(?:href="#|url\(#)([^")]+)/g)) assert.ok(ids.includes(ref[1]), ref[1]);
  }
  assert.deepEqual(record, before);
  const bare = horseArt({ ...horse, traits: { Mane: ['None'], Tail: ['None'], Paint: [], Pattern: [], Keratin: [] } });
  assert.doesNotMatch(bare, /data-layer="(?:mane|tail|paint|pattern|keratin)"|data-trait="/);
  assert.deepEqual(
    selectedArtTraits({ ...horse, traits: { Patterns: ['None', 'Deer Spots', 'Deer Spots'] } }, 'Pattern'),
    ['Deer Spots']
  );
  const custom = String(traitArtwork('Cosmetic', '<script>alert(1)</script>', { colors }));
  assert.doesNotMatch(custom, /<script>/);
  assert.match(custom, /&lt;script&gt;/);
});
