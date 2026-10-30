import { horseArtLayers } from './horse-art-layers.js';
import { html, raw } from './ui.js';

export function horseModel(horse, eye, prefix) {
  const layers = horseArtLayers
    .filter(layer => layer.channel !== 'Keratin' || horse.species === 'Unicorn')
    .map(layer => {
      const value = layer.channel === 'Eye' ? eye : horse.palette.colors[layer.channel];
      const color = /^#[0-9a-f]{6}$/i.test(value || '') ? value : layer.defaultColor;
      const markup = layer.markup.replaceAll('__PREFIX__', `${prefix}-`).replaceAll('__COLOR__', color);
      return html`<g data-layer="${layer.name}" data-channel="${layer.channel}" fill="none">${raw(markup)}</g>`;
    });
  // Mirror the entire model (including masks and markings) to face right. Feet sit at y=274.
  return html`<g data-horse-model="layered" transform="translate(467 0) scale(-.43 .43)">${layers}</g>`;
}
