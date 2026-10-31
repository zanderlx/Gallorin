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
