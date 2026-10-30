import { horseArtLayers } from './horse-art-layers.js';
import { traitChoices } from './horse-update-fields.js';
import { html, raw } from './ui.js';
import { horseTraitCategoryArt } from './horse-trait-art.js';
import { horseDepthDefinitions, farLegArt, coatDepthArt } from './horse-art-depth.js';

export function horseModel(horse, eye, prefix) {
  const hasKeratin = horse.species === 'Unicorn' || traitChoices(horse.traits?.Keratin).length > 0;
  const hasCategory = category =>
    Object.hasOwn(horse.traits || {}, category) || Object.hasOwn(horse.traits || {}, `${category}s`);
  const render = layer => {
    const value = layer.channel === 'Eye' ? eye : horse.palette.colors[layer.channel];
    const color = /^#[0-9a-f]{6}$/i.test(value || '') ? value : layer.defaultColor;
    const markup = layer.markup.replaceAll('__PREFIX__', `${prefix}-`).replaceAll('__COLOR__', color);
    const shading =
      layer.channel === 'Hair'
        ? raw(
            layer.markup
              .split('<mask')[0]
              .replaceAll('__PREFIX__', `${prefix}-`)
              .replaceAll('__COLOR__', `url(#${prefix}-hair-volume)`)
          )
        : '';
    return html`<g data-layer="${layer.name}" data-channel="${layer.channel}" fill="none">${raw(markup)}${shading}</g>`;
  };
  // Reuse the actual coat silhouettes for markings, including legs and face.
  const clip = horseArtLayers
    .filter(layer => ['coat top', 'coat bottom'].includes(layer.name))
    .map(layer =>
      raw(layer.markup.split('<mask')[0].replaceAll('__PREFIX__', `${prefix}-`).replaceAll('__COLOR__', '#FFFFFF'))
    );
  const orderedLayers = horseArtLayers.filter(layer => layer.name !== 'keratin');
  orderedLayers.splice(
    orderedLayers.findIndex(layer => layer.name === 'mane'),
    0,
    horseArtLayers.find(layer => layer.name === 'keratin')
  );
  const layers = orderedLayers
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
      if (layer.name === 'hoof') return html`${render(layer)}${coatDepthArt(prefix)}`;
      if (layer.name === 'eye')
        return html`<g data-layer="base-ears"><path d="M278 170C275.5 163.5 277.234 151.188 280 147.5C283 143.5 283 136.5 283.5 135.5C284 134.5 286 136 288.5 142C288.753 142.607 288.965 143.251 289.138 143.925C290.133 147.255 291.325 152.803 291 158C291.783 159.567 293.165 162.571 294.496 166C295.427 168.4 296.344 171 297 173.5C299 181 294.5 184 295 189C295.5 194 295 198 293 196.5C287.5 185.5 280.5 178.5 278 170Z" fill="${horse.palette.colors['Coat Top']}"/></g>${['Ears', 'Whiskers'].map(category => horseTraitCategoryArt(horse, category, prefix))}${render(layer)}`;
      return render(layer);
    });
  // Mirror the entire model (including masks and markings) to face right. Feet sit at y=274.
  return html`<g data-horse-model="layered" transform="translate(467 0) scale(-.43 .43)"><defs>${horseDepthDefinitions(prefix)}<clipPath id="${prefix}-trait-coat">${clip}</clipPath></defs>${farLegArt(horse.palette.colors, prefix)}${layers}</g>`;
}
