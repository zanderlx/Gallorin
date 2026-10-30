import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { horseArt } from '../public/art.js';
import { html, raw } from '../public/ui.js';
const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const palette = catalog.palettes.find(p => p.name === 'Natural Gold');
const studies = [
  ['Braids & spots', { Mane: ['Braided Mane'], Tail: ['Braided Tail'], Pattern: ['Deer Spots'] }],
  [
    'Antlers & winter fur',
    { Keratin: ['Reindeer Antlers'], Cosmetic: ['Long Beard Fur', 'Fuzzy Socks'], Mane: ['Winter Mane'] }
  ],
  [
    'Flames & dragon horns',
    { Mane: ['Flame Mane'], Tail: ['Flame Tail'], Keratin: ['Dragon Horns'], Pattern: ['Torn Flames'] }
  ],
  [
    'Flowers & vines',
    { Mane: ['Flowering Mane'], Tail: ['Flower Tail'], Pattern: ['Blooming Marigolds'], Cosmetic: ['Flower Vine Legs'] }
  ],
  [
    'Crystals & plates',
    {
      Mane: ['Glacier Mane'],
      Tail: ['Glacier Tail'],
      Cosmetic: ['Draconic Body Plates'],
      Keratin: ['Sharp Crystal Horn']
    }
  ],
  [
    'Curled hair & ram horns',
    { Mane: ['Short Curly Mane'], Tail: ['Short Curly Tail'], Keratin: ['Ram Horns'], Paint: ['Blaze Paint'] }
  ],
  [
    'Feathers & wings',
    { Mane: ['Long Feather Mane'], Tail: ['Feathered Tail'], Cosmetic: ['Side Wings'], Ears: ['Wing Ears'] }
  ],
  [
    'Bare mane & short tail',
    { Mane: ['Bald'], Tail: ['Short Tail'], Pattern: ['Zebra Stripes'], Paint: ['Tall Socks'] }
  ],
  [
    'Halos & eyes',
    {
      Mane: ['Flowing Mane'],
      Whiskers: ['Divine Body Halo', 'Radiant Halo Head'],
      Cosmetic: ['Extra Eyes'],
      Pattern: ['Star Dapple']
    }
  ],
  [
    'Webs & bones',
    { Mane: ['Bone Mane'], Tail: ['Skeleton Tail'], Pattern: ['Spider Web Cage'], Paint: ['Leg Bones'] }
  ],
  [
    'Crown & ribbons',
    {
      Keratin: ['Gemstone Crown'],
      Cosmetic: ['Dainty Ribbons', 'Pearl Ankles'],
      Mane: ['Elegant Braided Mane'],
      Pattern: ['Side Filigree']
    }
  ],
  [
    'Rabbit ears & whiskers',
    {
      Ears: ['Jackrabbit Ears'],
      Whiskers: ['Curly Whiskers'],
      Mane: ['Sparse Mane'],
      Tail: ['Short Tail'],
      Paint: ['Forehead Heart']
    }
  ]
];
const tiles = studies.map(([name, traits], index) => {
  const horse = {
    id: `study-${index}`,
    species: 'Horse',
    palette,
    eye: { colors: ['#73B9C7'] },
    traits: { Mane: ['Standard Mane'], Tail: ['Standard Tail'], ...traits }
  };
  return html`<g transform="translate(${(index % 3) * 500} ${Math.floor(index / 3) * 340})"><rect x="8" y="8" width="484" height="324" rx="12" fill="#202B23"/><text x="24" y="36" fill="#F5E7C4" font-size="20" font-family="Segoe UI">${name}</text><g transform="translate(20 43) scale(.92)">${raw(horseArt(horse).replace('<svg ', '<svg width="460" height="310" '))}</g></g>`;
});
const output = new URL('../test-results/horse-art/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(
  new URL('trait-studies.svg', output),
  String(
    html`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1360" viewBox="0 0 1500 1360"><rect width="1500" height="1360" fill="#121C16"/>${tiles}</svg>`
  )
);
console.log('Wrote test-results/horse-art/trait-studies.svg');
