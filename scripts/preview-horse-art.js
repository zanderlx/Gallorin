import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { html, raw } from '../public/ui.js';
import { assembleHorse, horseLayers, readHorseLayers } from './lib/horse-svg.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(resolve(root, 'data/definitions/catalog.json'), 'utf8'));
const channels = [...new Set(horseLayers.map(([, channel]) => channel))].filter(channel => channel !== 'Eye');
const palettes = catalog.palettes.filter(p => channels.every(channel => /^#[0-9a-f]{6}$/i.test(p.colors?.[channel])));
const requested = process.argv[2];
const palette = requested
  ? palettes.find(p => p.name.toLowerCase() === requested.toLowerCase())
  : palettes[randomInt(palettes.length)];
if (!palette) throw new Error('Choose a complete palette from the bundled catalog.');
const layers = await readHorseLayers();
// Eye is a separate horse trait, not a palette channel. Keep the supplied blue eye.
const eye = '#58BFFF';
const original = assembleHorse(layers, { prefix: 'original' });
const recolored = assembleHorse(layers, { colors: palette.colors, eye, prefix: 'recolored' });
const swatches = channels.map((channel, index) => {
  const x = 60 + index * 154;
  return html`<g transform="translate(${x} 602)"><rect width="32" height="32" rx="8" fill="${palette.colors[channel]}" stroke="#FFFFFF" stroke-opacity=".25"/><text x="0" y="54" font-size="14" fill="#D8DFD6">${channel}</text><text x="0" y="74" font-size="13" fill="#8F9E94">${palette.colors[channel]}</text></g>`;
});
const board =
  String(html`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1500" height="740" viewBox="0 0 1500 740">
  <rect width="1500" height="740" fill="#151E1B"/>
  <g font-family="Segoe UI, sans-serif">
  <text x="60" y="49" font-size="14" letter-spacing="3" fill="#A6BC97">GALLORIN / HORSE ART STUDY</text>
  <text x="60" y="99" font-size="34" fill="#F1EEDB">${palette.name}</text>
  <text x="60" y="129" font-size="16" fill="#A8B5AC">11 aligned SVG layers · Existing palette colors · Original outlines preserved</text>
  <rect x="44" y="158" width="694" height="408" rx="20" fill="#23312B"/>
  <rect x="762" y="158" width="694" height="408" rx="20" fill="#23312B"/>
  <text x="68" y="192" font-size="14" fill="#BCC9BE">ORIGINAL COLORS</text>
  <text x="786" y="192" font-size="14" fill="#BCC9BE">${palette.name.toUpperCase()}</text>
  <g transform="translate(52 172) scale(.58)">${raw(original)}</g>
  <g transform="translate(770 172) scale(.58)">${raw(recolored)}</g>
  ${swatches}
  <text x="60" y="717" font-size="14" fill="#A8B5AC">Mane + tail use Hair. Eye stays artwork blue (#58BFFF), independently of the palette. All supplied markings shown.</text>
  </g>
</svg>`);
const output = resolve(root, 'test-results/horse-art');
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'original.svg'), original);
await writeFile(resolve(output, 'recolored.svg'), recolored);
await writeFile(resolve(output, 'preview.svg'), board);
await writeFile(resolve(output, 'palette.json'), JSON.stringify({ palette, eye }, null, 2) + '\n');
console.log(`Palette: ${palette.name}\nPreview: ${resolve(output, 'preview.svg')}`);
