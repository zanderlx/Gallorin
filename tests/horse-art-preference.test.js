import { originalHorseArtLayers } from '../public/horse-art-original-layers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { horseArt, horseHeadArt, setProvidedHorseArtwork } from '../public/art.js';

test('artwork preference switches both views without changing the horse', () => {
  const horse = {
    id: 'toggle',
    species: 'Horse',
    palette: {
      colors: {
        'Coat Top': '#112233',
        'Coat Bottom': '#223344',
        Hair: '#334455',
        Eye: '#445566',
        Sock: '#556677',
        Hoof: '#667788',
        Paint: '#778899',
        Pattern: '#889900',
        Keratin: '#990011'
      }
    },
    eye: { colors: ['#445566'] },
    traits: { Tail: ['Short Tail'], Mane: ['Standard Mane'] }
  };
  const before = structuredClone(horse);
  try {
    setProvidedHorseArtwork(true);
    for (const render of [horseArt, horseHeadArt]) {
      const svg = render(horse);
      assert.match(svg, /data-horse-model="provided-svg"/);
      assert.doesNotMatch(svg, /data-depth=|data-trait-category=/);
      assert.match(svg, /#112233/);
    }
    setProvidedHorseArtwork(false);
    assert.match(horseArt(horse), /data-horse-model="layered"/);
    assert.deepEqual(horse, before);
  } finally {
    setProvidedHorseArtwork(false);
  }
});

test('provided SVG keratin follows active traits rather than species', () => {
  const horse = {
    id: 'keratin-toggle',
    species: 'Unicorn',
    palette: { colors: {} },
    eye: { colors: ['#123456'] },
    traits: {}
  };
  try {
    setProvidedHorseArtwork(true);
    for (const traits of [{}, { Keratin: [] }, { Keratin: ['None'] }, { Keratin: ['Awaiting species data'] }]) {
      horse.traits = traits;
      assert.doesNotMatch(horseArt(horse), /data-layer="keratin"/);
    }
    horse.traits = { Keratin: ['Tall Horn'] };
    assert.match(horseArt(horse), /data-layer="keratin"/);
    assert.match(horseHeadArt(horse), /data-layer="keratin"/);
    horse.traits = { Keratin: [] };
    assert.doesNotMatch(horseHeadArt(horse), /data-layer="keratin"/);
  } finally {
    setProvidedHorseArtwork(false);
  }
});

test('provided mode preserves every supplied layer including the full eye sock', () => {
  const horse = {
    id: 'source-only',
    species: 'Horse',
    palette: { colors: {} },
    eye: { colors: ['#123456'] },
    traits: { Keratin: ['Horn'] }
  };
  try {
    setProvidedHorseArtwork(true);
    const svg = horseArt(horse);
    for (const layer of originalHorseArtLayers) {
      const expected = layer.markup
        .replaceAll('__PREFIX__', 'hsource-only-original-')
        .replaceAll('__COLOR__', layer.channel === 'Eye' ? '#123456' : layer.defaultColor);
      assert.ok(svg.includes(expected), layer.name);
    }
    assert.doesNotMatch(svg, /data-depth=|data-trait-category=|data-leg-source=|data-hair-source=/);
  } finally {
    setProvidedHorseArtwork(false);
  }
});
