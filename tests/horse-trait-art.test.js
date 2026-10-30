import test from 'node:test';
import assert from 'node:assert/strict';
import { speciesTraitData } from '../public/species-trait-data.js';
import { traitArtwork, traitArtDefinition, selectedArtTraits, markingPlacements } from '../public/horse-trait-art.js';
import { horseArt, horseHeadArt } from '../public/art.js';
import { hairDesign, sourceHairPaths, tailAttachmentWeight } from '../public/horse-hair-art.js';

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
  const designs = new Map();
  const namesSeen = new Set();
  for (const [species, groups] of Object.entries(speciesTraitData))
    for (const [category, names] of Object.entries(groups))
      for (const name of names) {
        const art = String(traitArtwork(category, name, { colors }));
        if (category === 'Cosmetic') {
          assert.equal(art, '');
          continue;
        }
        assert.equal(art, String(traitArtwork(category, name, { colors })), `${species}: ${name}`);
        assert.match(art, /data-trait-family=/);
        assert.doesNotMatch(art, /undefined|NaN|__COLOR__|<script/);
        if (!/^bald$/i.test(name)) assert.match(art, /<path|<ellipse|<circle/, `${species}: ${name}`);
        const key = `${category}:${name}`;
        if (!namesSeen.has(key) && !/^bald$/i.test(name)) {
          // Compare drawing geometry only: labels, colors and transforms cannot
          // make identical designs pass this check.
          const geometry = [...art.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]).join('|');
          assert.ok(geometry, key);
          assert.ok(!designs.has(geometry), `${key} duplicates ${designs.get(geometry)}`);
          designs.set(geometry, key);
          namesSeen.add(key);
        }
        count++;
      }
  assert.ok(count > 2300);
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
    for (const names of Object.entries(record.traits)
      .filter(([category]) => category !== 'Cosmetic')
      .map(([, names]) => names))
      for (const name of names) assert.ok(art.includes(`data-trait="${name}"`));
    assert.doesNotMatch(art, /data-trait-category="Cosmetic"|data-trait="Chin Beard"/);
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
  const custom = String(traitArtwork('Paint', '<script>alert(1)</script>', { colors }));
  assert.doesNotMatch(custom, /<script>/);
  assert.match(custom, /&lt;script&gt;/);
});

test('hair names control length and texture independently, without braid-like fur', () => {
  for (const name of ['Short Fur Tail', 'Short Curly Tail', 'Short Tail', 'Short Tuft Tail']) {
    const recipe = traitArtDefinition('Tail', name);
    const design = hairDesign(recipe);
    assert.ok(design.short, name);
    assert.ok(design.length < 70, name);
    assert.notEqual(design.texture, 'braid');
    const art = String(traitArtwork('Tail', name, { colors }));
    assert.match(art, /data-tail-attachment="fixed"/);
    assert.match(art, /data-hair-length="short"/);
  }
  assert.equal(hairDesign(traitArtDefinition('Tail', 'Short Fur Tail')).texture, 'fur');
  assert.equal(hairDesign(traitArtDefinition('Tail', 'Short Curly Tail')).texture, 'curly');
  assert.equal(hairDesign(traitArtDefinition('Tail', 'Braided Tail')).texture, 'braid');
  assert.equal(String(traitArtwork('Cosmetic', 'Side Wings', { colors })), '');
});

test('standard hair retains original SVG coordinates and Keratin is behind both ear layers', () => {
  const coordinates = d => [...d.matchAll(/-?\d*\.?\d+/g)].map(match => Number(match[0]));
  for (const category of ['Mane', 'Tail']) {
    const art = String(traitArtwork(category, `Standard ${category}`, { colors }));
    assert.match(art, /data-hair-source="original-svg"/);
    const paths = [...art.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(
      paths.slice(0, sourceHairPaths[category].length).map(coordinates),
      sourceHairPaths[category].map(coordinates)
    );
  }
  for (const render of [horseArt, horseHeadArt]) {
    const art = render({ ...horse, traits: { Keratin: ['Ram Horns'], Ears: ['Jackrabbit Ears'] } });
    assert.ok(art.indexOf('data-trait-category="Keratin"') < art.indexOf('data-layer="base-ears"'));
    assert.ok(art.indexOf('data-layer="base-ears"') < art.indexOf('data-trait-category="Ears"'));
  }
});

test('tail redesigns preserve all source root control points', () => {
  const coords = d => [...d.matchAll(/-?\d*\.?\d+/g)].map(m => Number(m[0]));
  const original = coords(sourceHairPaths.Tail[0]);
  for (const name of ['Short Fur Tail', 'Upturned Tail', 'Sparse Tail', 'Long Wavy Tail', 'Braided Tail']) {
    const art = String(traitArtwork('Tail', name, { colors }));
    const actual = coords(art.match(/<path d="([^"]+)"/)[1]);
    for (let i = 0; i < original.length; i += 2)
      if (tailAttachmentWeight(original[i], original[i + 1]) === 0) {
        assert.equal(actual[i], original[i], name);
        assert.equal(actual[i + 1], original[i + 1], name);
      }
  }
});

test('markings share placement reservations and facial designs stay small and faint', () => {
  for (const traits of [
    { Paint: ['Piebald', 'Tobiano'], Pattern: ['Deer Spots', 'Star Dapple', 'Side Swirls', 'Leopard Appaloosa'] },
    {
      Paint: ['Face Paint', 'Nose Heart'],
      Pattern: ['Face Freckles', 'Head Spots', 'Eye Filigree', 'Light Face Paint']
    }
  ]) {
    const plan = [...markingPlacements({ ...horse, traits }).values()];
    assert.equal(new Set(plan.map(p => `${p.x},${p.y}`)).size, 6);
    for (const p of plan) {
      assert.ok(p.opacity <= 0.62);
      if (p.y < 280) {
        assert.ok(p.width <= 14);
        assert.ok(p.opacity <= 0.36);
      }
    }
  }
});

test('Keratin stays behind mane and fixed ears; Paint/Pattern colors cannot alter hair', () => {
  const record = {
    ...horse,
    traits: { Keratin: ['Reversed Horn'], Mane: ['Braided Mane'], Ears: ['Jackrabbit Ears'] }
  };
  for (const render of [horseArt, horseHeadArt]) {
    const art = render(record);
    assert.ok(art.indexOf('data-trait-category="Keratin"') < art.indexOf('data-trait-category="Mane"'));
    assert.ok(art.indexOf('data-trait-category="Mane"') < art.indexOf('data-layer="base-ears"'));
    assert.match(art, /data-ear-anchor="284,166"/);
  }
  for (const category of ['Mane', 'Tail']) {
    const name = `Braided ${category}`;
    assert.equal(
      String(traitArtwork(category, name, { colors })),
      String(traitArtwork(category, name, { colors: { ...colors, Paint: '#FF00FF', Pattern: '#00FF00' } }))
    );
  }
  assert.match(String(traitArtwork('Keratin', 'Forward Horns', { colors })), /data-keratin-direction="-1"/);
  assert.match(String(traitArtwork('Keratin', 'Reversed Horn', { colors })), /data-keratin-direction="1"/);
});
