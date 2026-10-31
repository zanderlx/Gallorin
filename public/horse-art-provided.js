import { originalHorseArtLayers } from './horse-art-original-layers.js';
import { selectedArtTraits } from './horse-trait-art.js';
import { html, raw } from './ui.js';

// Preserve supplied geometry; render keratin before the mane for natural occlusion.
const providedLayers = originalHorseArtLayers.filter(layer => layer.name !== 'keratin' && layer.name !== 'ear');
providedLayers.splice(
  providedLayers.findIndex(layer => layer.name === 'mane'),
  0,
  originalHorseArtLayers.find(layer => layer.name === 'keratin')
);
providedLayers.splice(
  2,
  0,
  originalHorseArtLayers.find(layer => layer.name === 'ear')
);
export function providedHorseModel(horse, eye, prefix) {
  return html`<g data-horse-model="provided-svg" transform="translate(-7 0) scale(.43 .43)">${providedLayers.filter(layer => layer.channel !== 'Keratin' || selectedArtTraits(horse, 'Keratin').length > 0).map(layer => html`<g data-layer="${layer.name}" fill="none">${raw(layer.markup.replaceAll('__PREFIX__', `${prefix}-provided-`).replaceAll('__COLOR__', layer.channel === 'Eye' ? eye : horse.palette.colors[layer.channel] || layer.defaultColor))}</g>`)}</g>`;
}
