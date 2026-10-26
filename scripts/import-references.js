import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { mutatedPalettes } from '../public/mutated-palettes.js';

const root = new URL('../', import.meta.url);
const read = name => readFile(new URL(`docs/references/${name}.md`, root), 'utf8');
const slug = value =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-$/, '');
const species = (await read('Species'))
  .split(/\r?\n/)
  .filter(line => line.startsWith('- '))
  .map(line => {
    const name = line.slice(2).split(/ \[| \(/)[0];
    const event = line.match(/\[([^]+?) Event\]/)?.[1] ?? null;
    const restriction = line.match(/\(([^)]+)\)/)?.[1] ?? null;
    return { id: slug(name), name, event, restriction, traitsComplete: name === 'Ghoulsteed' };
  });
const personalities = [...(await read('Personalities')).matchAll(/^## (.+)\r?\n([^]+?)(?=\r?\n## |$)/gm)].map(
  ([, name, description]) => ({ name, description: description.trim() })
);
const palettes = [];
for (const file of ['Natural Palettes', 'Unnatural Palettes']) {
  let group = 'Other';
  let current;
  for (const line of (await read(file)).split(/\r?\n/)) {
    if (line.startsWith('# ')) group = line.slice(2);
    if (line.startsWith('## ')) {
      current = { name: line.slice(3), group, natural: file.startsWith('Natural'), colors: {} };
      palettes.push(current);
    }
    const color = line.match(/^\s+([^:]+):\s*(#[0-9a-fA-F]{6})\s*$/);
    if (current && color) current.colors[color[1]] = color[2];
  }
}
const traits = {};
let category;
for (const line of (await read('Ghoulsteed Traits')).split(/\r?\n/)) {
  if (line.startsWith('## ')) {
    category = line.slice(3);
    traits[category] = [];
  } else if (category && line.trim()) traits[category].push(line.trim());
}
const eyes = [];
let rarity;
for (const line of (await read('Eye Colors')).split(/\r?\n/)) {
  if (line.startsWith('# ')) rarity = line.slice(2).split(' ')[0];
  const color = line.match(/^\s+([^:]+):\s*(.+?)\s*$/);
  if (color) eyes.push({ name: color[1], rarity, colors: color[2].match(/#[0-9a-fA-F]{6}/g) });
}
const mutations = [];
let mutationType;
for (const line of (await read('Mutations')).split(/\r?\n/)) {
  if (line.startsWith('# ')) mutationType = line.slice(2).split(' ')[0];
  const mutation = line.match(/^\s+(?:\(([\d.]+)%\)\s*-\s*|-\s*|)([^:]+):\s*(.+)$/);
  if (mutation)
    mutations.push({
      name: mutation[2].trim(),
      type: mutationType,
      weight: mutation[1] ? Number(mutation[1]) : null,
      description: mutation[3].trim()
    });
}
const list = async name =>
  (await read(name))
    .split(/\r?\n/)
    .filter(line => line.startsWith('- '))
    .map(line => line.slice(2));
const catalog = {
  version: 1,
  source: 'Supplied Markdown references; original spelling preserved.',
  species,
  personalities,
  palettes: [
    ...palettes.filter(p => p.name !== 'Template').map(p => ({ ...p, complete: Object.keys(p.colors).length === 9 })),
    ...mutatedPalettes
  ],
  eyes,
  traits: { Ghoulsteed: traits },
  mutations,
  themes: await list('Themes'),
  items: await list('Horse Items'),
  locations: [
    {
      id: 'aetherion',
      name: 'Aetherion Wilds',
      subtitle: 'Where the ordinary becomes extraordinary.',
      description:
        'Follow the winding paths beneath ancient boughs. Somewhere in the quiet, a new companion is waiting.',
      event: null
    },
    {
      id: 'hallowhoof',
      name: 'Hallowhoof',
      subtitle: 'Some spirits leave hoofprints.',
      description:
        'Lanterns flicker between twisted trees. Beyond the autumn mist, the wilds have a little more magic to share.',
      event: 'Halloween'
    }
  ]
};
const output = new URL('data/definitions/catalog.json', root);
await writeFile(output, JSON.stringify(catalog, null, 2) + '\n');
console.log(
  `Imported ${species.length} species, ${catalog.palettes.filter(p => p.complete).length} complete palettes, ${mutations.length} mutations into ${fileURLToPath(output)}`
);
