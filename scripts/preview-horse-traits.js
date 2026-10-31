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
      'Wispy Tail',
      'Short Tuft Tail',
      'Long Blunt Tail',
      'Sparse Tail',
      'Upturned Tail'
    ].map(name => [name, { Mane: ['Standard Mane'], Tail: [name] }])
  : studies;
const keratinsOnly = process.argv.includes('--keratins');
const selected = keratinsOnly
  ? [
      'Small Horn',
      'Tall Horn',
      'Broken Horn',
      'Scythe Horn',
      'Rhino Horn',
      'Ram Horns',
      'Kudu Horns',
      'Reindeer Antlers',
      'Moose Antlers',
      'Saber Fangs',
      'Gemstone Crown',
      'Corinthian Helm'
    ].map(name => [name, { Keratin: [name], Mane: ['Standard Mane'], Tail: ['Standard Tail'] }])
  : examples;
const markingsOnly = process.argv.includes('--markings');
const displayed = markingsOnly
  ? [
      ['Deer Spots', { Pattern: ['Deer Spots'] }],
      ['Light Dapple', { Pattern: ['Light Dapple'] }],
      ['Side Swirls', { Pattern: ['Side Swirls'] }],
      ['Blaze Paint', { Paint: ['Blaze Paint'] }],
      ['Nose Heart', { Paint: ['Nose Heart'] }],
      ['Face Freckles', { Pattern: ['Face Freckles'] }],
      ['Paint + Pattern', { Paint: ['Piebald'], Pattern: ['Deer Spots'] }],
      [
        'Multiple body traits',
        { Paint: ['Tobiano', 'Piebald'], Pattern: ['Deer Spots', 'Star Dapple', 'Side Swirls', 'Leopard Appaloosa'] }
      ],
      [
        'Multiple face traits',
        {
          Paint: ['Face Paint', 'Nose Heart'],
          Pattern: ['Face Freckles', 'Head Spots', 'Eye Filigree', 'Light Face Paint']
        }
      ],
      ['Short Fur Tail', { Tail: ['Short Fur Tail'] }],
      ['Upturned Tail', { Tail: ['Upturned Tail'] }],
      ['Sparse Tail', { Tail: ['Sparse Tail'] }]
    ]
  : selected;
const tiles = displayed.map(([name, traits], index) => {
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
  new URL(
    markingsOnly
      ? 'marking-studies.svg'
      : keratinsOnly
        ? 'keratin-studies.svg'
        : tailsOnly
          ? 'tail-studies.svg'
          : 'trait-studies.svg',
    output
  ),
  String(
    html`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1360" viewBox="0 0 1500 1360"><rect width="1500" height="1360" fill="#121C16"/>${tiles}</svg>`
  )
);
console.log(`Wrote test-results/horse-art/${tailsOnly ? 'tail' : 'trait'}-studies.svg`);
