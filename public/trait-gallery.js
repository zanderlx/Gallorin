import { html, raw, setHTML, icon } from './ui.js';
import { originalHorseArtLayers } from './horse-art-original-layers.js';
import { horseColorRegions, horseTraitLimits, traitChoices } from './horse-update-fields.js';
import { ghoulsteedLayers } from './trait-gallery-art.js';

const categories = Object.keys(horseTraitLimits);
const defaultColors = [
  '#827294',
  '#c6b3c9',
  '#e4d9df',
  '#4e4356',
  '#9b7d8e',
  '#eee0df',
  '#d9cfad',
  '#faf0e7',
  '#544968'
];
const ghoulsteedColors = [
  '#c3c3c3',
  '#c3c3c3',
  '#ffffff',
  '#c3c3c3',
  '#c3c3c3',
  '#c3c3c3',
  '#c3c3c3',
  '#ffffff',
  '#d9d9d9'
];
function colorsFor(species) {
  return Object.fromEntries(
    horseColorRegions.map((region, index) => [region, (supplied(species) ? ghoulsteedColors : defaultColors)[index]])
  );
}
// Multiply the source shading by the selected tint. White retains the original SVG colors.
function tint(value, color) {
  const source = value.toLowerCase() === 'white' ? '#ffffff' : value;
  const hex = source.length === 4 ? '#' + [...source.slice(1)].map(c => c + c).join('') : source;
  return (
    '#' +
    [1, 3, 5]
      .map(i =>
        Math.round((parseInt(hex.slice(i, i + 2), 16) * parseInt(color.slice(i, i + 2), 16)) / 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}
const supplied = species => species.name.toLowerCase() === 'ghoulsteed';
function choices(species, category) {
  return [
    'None',
    ...[
      ...new Set([
        ...traitChoices(species.traits?.[category]),
        ...(supplied(species) ? ghoulsteedLayers.filter(l => l.category === category).map(l => l.name) : [])
      ])
    ].sort((a, b) => a.localeCompare(b))
  ];
}
function preview(species, traits, colors, prefix) {
  if (!supplied(species)) {
    const baseLayers = originalHorseArtLayers.filter(layer =>
      ['coat bottom', 'coat top', 'sock', 'nose', 'hoof', 'eye'].includes(layer.name)
    );
    return html`<svg class="horse-art" viewBox="15 -30 780 680" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${species.name} base artwork"><g transform="translate(-92 4)">${baseLayers.map(layer => html`<g data-layer="${layer.name}" fill="none">${raw(layer.markup.replaceAll('__PREFIX__', prefix + '-base-').replaceAll('__COLOR__', layer.channel === 'Eye' ? '#302537' : colors[layer.channel] || layer.defaultColor))}</g>`)}</g></svg>`;
  }
  const layers = ghoulsteedLayers.filter(l => l.category === 'Base' || traits[l.category]?.includes(l.name));
  const order = ['coat bottom', 'coat top', 'sock', 'hoof', 'bone', 'eye'];
  layers.sort(
    (a, b) =>
      (a.category === 'Base' ? order.indexOf(a.name) : 10 + categories.indexOf(a.category)) -
      (b.category === 'Base' ? order.indexOf(b.name) : 10 + categories.indexOf(b.category))
  );
  return html`<svg class="horse-art" viewBox="15 -30 780 680" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Ghoulsteed supplied artwork">${layers.map(
    (layer, index) => {
      const defaults = colorsFor(species);
      const color = colors[layer.channel];
      const changed = color && color.toLowerCase() !== defaults[layer.channel]?.toLowerCase();
      const svg = layer.svg
        .replace(/^<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '')
        .replace(/(?:id="|url\(#)([^")]+)/g, (match, id) => match.replace(id, prefix + index + id))
        .replace(/(stop-color|fill)="(#[\da-f]{3,8}|white)"/gi, (match, attr, value) =>
          changed ? attr + '="' + tint(value, color) + '"' : match
        );
      return raw(svg);
    }
  )}</svg>`;
}
function hasArtwork(species, category, name) {
  return (
    name === 'None' ||
    (supplied(species) && ghoulsteedLayers.some(layer => layer.category === category && layer.name === name))
  );
}
function initial() {
  return Object.fromEntries(categories.map(category => [category, []]));
}
export function traitGalleryPage() {
  return html`<div class="page-heading stable-heading"><h1>Trait Gallery</h1></div><div class="collection-toolbar trait-gallery-toolbar"><label class="search-field">${raw(icon('search'))}<input type="search" data-gallery-search placeholder="Search species" aria-label="Search species"></label><button class="icon-button sort-direction" type="button" data-gallery-order data-direction="asc" aria-label="Ascending order. Switch to descending" title="Ascending order. Switch to descending">${raw(icon('arrow'))}</button></div><div class="horse-grid trait-gallery-grid" data-gallery-grid></div>`;
}
export function bindTraitGallery(root, catalog) {
  const grid = root.querySelector('[data-gallery-grid]');
  const search = root.querySelector('[data-gallery-search]');
  const order = root.querySelector('[data-gallery-order]');
  let descending = false;
  const draw = () => {
    const species = catalog.species
      .filter(s => s.name.toLowerCase().includes(search.value.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name) * (descending ? -1 : 1));
    setHTML(
      grid,
      html`${species.map(s => html`<button class="horse-card trait-gallery-card" type="button" data-gallery-species="${s.id}"><h2>${s.name}</h2>${preview(s, initial(s), colorsFor(s), 'gallery-' + s.id)}</button>`)}${species.length ? '' : html`<p>No matching species.</p>`}`
    );
  };
  search.oninput = draw;
  order.onclick = () => {
    descending = !descending;
    order.dataset.direction = descending ? 'desc' : 'asc';
    const label = descending ? 'Descending order. Switch to ascending' : 'Ascending order. Switch to descending';
    order.setAttribute('aria-label', label);
    order.title = label;
    draw();
  };
  grid.onclick = event => {
    const card = event.target.closest('[data-gallery-species]');
    if (!card) return;
    const species = catalog.species.find(s => s.id === card.dataset.gallerySpecies);
    const traits = initial(species);
    const palette = colorsFor(species);
    const dialog = document.createElement('dialog');
    dialog.className = 'trait-gallery-dialog';
    dialog.setAttribute('aria-labelledby', 'trait-gallery-title');
    setHTML(
      dialog,
      html`<div class="dialog-top"><h2 id="trait-gallery-title">${species.name}</h2><button class="icon-button" type="button" data-gallery-close aria-label="Close trait preview">×</button></div><div class="trait-gallery-layout"><div class="trait-gallery-controls">${categories.map(category => html`<div class="trait-gallery-trait"><span>${category}</span><span><button type="button" class="icon-button" data-gallery-cycle="${category}" data-step="-1" aria-label="Previous ${category}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 5-8 7 8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><select data-gallery-trait="${category}" aria-label="${category}">${choices(species, category).map(name => html`<option value="${name}"${raw(hasArtwork(species, category, name) ? '' : ' disabled')}${raw((traits[category][0] || 'None') === name ? ' selected' : '')}>${name}</option>`)}</select><button type="button" class="icon-button" data-gallery-cycle="${category}" data-step="1" aria-label="Next ${category}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 8 7-8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></span></div>`)}</div><div class="trait-gallery-preview"><div data-gallery-art></div></div><div class="trait-gallery-colors">${horseColorRegions.map(region => html`<label><span>${region}</span><input type="color" value="${palette[region]}" data-gallery-color="${region}" aria-label="${region} color"><input type="text" value="${palette[region].toUpperCase()}" data-gallery-hex="${region}" aria-label="${region} hex" maxlength="7" spellcheck="false"></label>`)}</div></div>`
    );
    const update = () => {
      setHTML(dialog.querySelector('[data-gallery-art]'), preview(species, traits, palette, 'gallery-modal-'));
    };
    dialog.onclick = event => {
      if (event.target.closest('[data-gallery-close]')) dialog.close();
      const button = event.target.closest('[data-gallery-cycle]');
      if (!button) return;
      const category = button.dataset.galleryCycle;
      const select = [...dialog.querySelectorAll('[data-gallery-trait]')].find(
        el => el.dataset.galleryTrait === category
      );
      const enabled = [...select.options].filter(option => !option.disabled);
      const index = enabled.indexOf(select.selectedOptions[0]);
      const next = (index + Number(button.dataset.step) + enabled.length) % enabled.length;
      select.value = enabled[next].value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };
    dialog.onchange = event => {
      const category = event.target.dataset.galleryTrait;
      if (!category) return;
      traits[category] = event.target.value === 'None' ? [] : [event.target.value];
      update();
    };
    dialog.oninput = event => {
      const input = event.target;
      const region = input.dataset.galleryColor || input.dataset.galleryHex;
      if (!region) return;
      if (input.dataset.galleryHex) input.value = input.value.toUpperCase();
      const value = input.value.startsWith('#') ? input.value : '#' + input.value;
      const valid = /^#[\da-f]{6}$/i.test(value);
      input.setCustomValidity(valid ? '' : 'Enter a six-digit hex color.');
      input.setAttribute('aria-invalid', String(!valid));
      if (!valid) return;
      palette[region] = value;
      for (const peer of dialog.querySelectorAll('[data-gallery-color],[data-gallery-hex]')) {
        if (peer !== input && (peer.dataset.galleryColor || peer.dataset.galleryHex) === region)
          peer.value = peer.dataset.galleryHex ? value.toUpperCase() : value.toLowerCase();
      }
      update();
    };
    dialog.addEventListener(
      'close',
      () => {
        dialog.remove();
        card.focus();
      },
      { once: true }
    );
    document.body.append(dialog);
    update();
    dialog.showModal();
  };
  draw();
}
