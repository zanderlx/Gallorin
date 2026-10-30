import { horseArtLayers } from './horse-art-layers.js';
import { traitChoices } from './horse-update-fields.js';
import { html, raw } from './ui.js';
import { horseTraitCategoryArt } from './horse-trait-art.js';

export function horseModel(horse, eye, prefix) {
  const hasKeratin = horse.species === 'Unicorn' || traitChoices(horse.traits?.Keratin).length > 0;
  const hasCategory = category =>
    Object.hasOwn(horse.traits || {}, category) || Object.hasOwn(horse.traits || {}, `${category}s`);
  const render = layer => {
    const value = layer.channel === 'Eye' ? eye : horse.palette.colors[layer.channel];
    const color = /^#[0-9a-f]{6}$/i.test(value || '') ? value : layer.defaultColor;
    const markup = layer.markup.replaceAll('__PREFIX__', `${prefix}-`).replaceAll('__COLOR__', color);
    return html`<g data-layer="${layer.name}" data-channel="${layer.channel}" fill="none">${raw(markup)}</g>`;
  };
  // Reuse the actual coat silhouettes for markings, including legs and face.
  const clip = horseArtLayers
    .filter(layer => ['coat top', 'coat bottom'].includes(layer.name))
    .map(layer =>
      raw(layer.markup.split('<mask')[0].replaceAll('__PREFIX__', `${prefix}-`).replaceAll('__COLOR__', '#FFFFFF'))
    );
  const layers = horseArtLayers
    .filter(layer => layer.channel !== 'Keratin' || hasKeratin)
    .map(layer => {
      if (['Paint', 'Pattern'].includes(layer.channel) && horse.traits) return html``;
      if (
        ['mane', 'tail', 'keratin'].includes(layer.name) &&
        hasCategory(layer.channel === 'Hair' ? (layer.name === 'mane' ? 'Mane' : 'Tail') : 'Keratin')
      ) {
        const category = layer.name === 'mane' ? 'Mane' : layer.name === 'tail' ? 'Tail' : 'Keratin';
        return horseTraitCategoryArt(horse, category, prefix);
      }
      if (layer.name === 'sock' && horse.traits)
        return html`${render(layer)}${horseTraitCategoryArt(horse, 'Paint', prefix)}${horseTraitCategoryArt(horse, 'Pattern', prefix)}`;
      if (layer.name === 'eye')
        return html`${['Cosmetic', 'Ears', 'Whiskers'].map(category => horseTraitCategoryArt(horse, category, prefix))}${render(layer)}`;
      return render(layer);
    });
  // Mirror the entire model (including masks and markings) to face right. Feet sit at y=274.
  return html`<g data-horse-model="layered" transform="translate(467 0) scale(-.43 .43)"><defs><clipPath id="${prefix}-trait-coat">${clip}</clipPath></defs>${layers}</g>`;
}
