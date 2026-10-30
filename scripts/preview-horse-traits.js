import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { horseArt } from '../public/art.js';
import { html, raw } from '../public/ui.js';
const catalog = JSON.parse(await readFile(new URL('../data/definitions/catalog.json', import.meta.url), 'utf8'));
const palette = catalog.palettes.find(p => p.name === 'Natural Gold');
const studies = [
  ['Braids & spots', { Mane: ['Braided Mane'], Tail: ['Braided Tail'], Pattern: ['Deer Spots'] }],
  ['Antlers & winter mane', { Keratin: ['Reindeer Antlers'], Mane: ['Winter Mane'] }],
  [
    'Flames & dragon horns',
    { Mane: ['Flame Mane'], Tail: ['Flame Tail'], Keratin: ['Dragon Horns'], Pattern: ['Torn Flames'] }
  ],
  ['Flower mane & tail', { Mane: ['Flowering Mane'], Tail: ['Flower Tail'], Pattern: ['Blooming Marigolds'] }],
  [
    'Crystal hair & horn',
    {
      Mane: ['Glacier Mane'],
      Tail: ['Glacier Tail'],
      Keratin: ['Sharp Crystal Horn']
    }
  ],
  [
    'Curled hair & ram horns',
    { Mane: ['Short Curly Mane'], Tail: ['Short Curly Tail'], Keratin: ['Ram Horns'], Paint: ['Blaze Paint'] }
  ],
  ['Feathers & wing ears', { Mane: ['Long Feather Mane'], Tail: ['Feathered Tail'], Ears: ['Wing Ears'] }],
  [
    'Bare mane & short tail',
    { Mane: ['Bald'], Tail: ['Short Tail'], Pattern: ['Zebra Stripes'], Paint: ['Tall Socks'] }
  ],
  [
    'Halos & stars',
    {
      Mane: ['Flowing Mane'],
      Whiskers: ['Divine Body Halo', 'Radiant Halo Head'],
      Pattern: ['Star Dapple']
    }
  ],
  [
    'Webs & bones',
    { Mane: ['Bone Mane'], Tail: ['Skeleton Tail'], Pattern: ['Spider Web Cage'], Paint: ['Leg Bones'] }
  ],
  [
    'Crown & filigree',
    {
      Keratin: ['Gemstone Crown'],
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
const tailsOnly = process.argv.includes('--tails');
const examples = tailsOnly
  ? [
      'Short Fur Tail',
      'Short Tail Fur',
      'Long Fur Tail',
      'Short Curly Tail',
      'Wavy Short Tail',
      'Long Wavy Tail',
      'Braided Tail',
      'Elegant Braided Tail',
      'Short Tuft Tail',
      'Long Blunt Tail',
      'Sparse Tail',
      'Upturned Tail'
    ].map(name => [name, { Mane: ['Standard Mane'], Tail: [name] }])
  : studies;
const tiles = examples.map(([name, traits], index) => {
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
  new URL(tailsOnly ? 'tail-studies.svg' : 'trait-studies.svg', output),
  String(
    html`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1360" viewBox="0 0 1500 1360"><rect width="1500" height="1360" fill="#121C16"/>${tiles}</svg>`
  )
);
console.log(`Wrote test-results/horse-art/${tailsOnly ? 'tail' : 'trait'}-studies.svg`);
