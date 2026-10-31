import { readFile } from 'node:fs/promises';
import { html, raw } from '../../public/ui.js';

// Back to front. All supplied layers share the same 1160 × 651 canvas.
export const horseLayers = [
  ['coat bottom', 'Coat Bottom'],
  ['coat top', 'Coat Top'],
  ['sock', 'Sock'],
  ['nose', 'Nose'],
  ['hoof', 'Hoof'],
  ['tail', 'Hair'],
  ['mane', 'Hair'],
  ['keratin', 'Keratin'],
  ['paint', 'Paint'],
  ['pattern', 'Pattern'],
  ['eye', 'Eye']
];

export async function readHorseLayers() {
  return Promise.all(
    horseLayers.map(async ([name, channel]) => ({
      name,
      channel,
      svg: await readFile(new URL(`../../docs/art/horse/source/${name}.svg`, import.meta.url), 'utf8')
    }))
  );
}

export function assembleHorse(layers, { colors, eye = '#58BFFF', prefix = 'horse' } = {}) {
  if (!/^[a-z][a-z0-9-]*$/i.test(prefix)) throw new Error('Invalid SVG ID prefix.');
  const groups = layers.map(({ name, channel, svg }) => {
    if (!svg.includes('viewBox="0 0 1160 651"')) throw new Error(`Unexpected canvas in ${name}.`);
    let body = svg.replace(/^\s*<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    // Prefix definitions and every reference so multiple horses can share one document.
    body = body
      .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
      .replace(/(href="#|url\(#)([^")]+)/g, (_, start, id) => `${start}${prefix}-${id}`);
    if (colors) {
      const color = channel === 'Eye' ? eye : colors[channel];
      if (!/^#[0-9a-f]{6}$/i.test(color || '')) throw new Error(`Missing or invalid ${channel} color.`);
      // Replace pigment only; white masks and translucent black outlines stay intact.
      body = body.replace(/fill="#[0-9a-f]{6}"/gi, `fill="${color}"`);
    }
    return html`<g data-layer="${name}" data-channel="${channel}" fill="none">${raw(body)}</g>`;
  });
  return String(
    html`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1160" height="651" viewBox="0 0 1160 651" role="img" aria-label="Assembled horse artwork">${groups}</svg>`
  );
}
