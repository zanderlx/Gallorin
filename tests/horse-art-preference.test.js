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

test('provided artwork preserves source geometry and keeps all eye layers', () => {
  const horse = { id: 'exact', palette: { colors: {} }, eye: { colors: ['#123456'] }, traits: { Keratin: ['Horn'] } };
  try {
    setProvidedHorseArtwork(true);
    const art = horseArt(horse);
    assert.deepEqual(
      [...art.matchAll(/data-layer="([^"]+)"/g)].map(match => match[1]),
      ['coat bottom', 'coat top', 'ear', 'sock', 'nose', 'hoof', 'tail', 'keratin', 'mane', 'paint', 'pattern', 'eye']
    );
    for (const layer of originalHorseArtLayers) {
      const markup = layer.markup
        .replaceAll('__PREFIX__', 'hexact-provided-')
        .replaceAll('__COLOR__', layer.channel === 'Eye' ? '#123456' : layer.defaultColor);
      assert.ok(art.includes(markup), layer.name);
    }

    assert.ok(art.indexOf('opacity=".6"') < art.indexOf('data-horse-model='));
    assert.ok(art.indexOf('data-layer="keratin"') < art.indexOf('data-layer="mane"'));
    assert.doesNotMatch(art, /data-depth=|data-trait-category=|data-far-leg=/);
  } finally {
    setProvidedHorseArtwork(false);
  }
});
