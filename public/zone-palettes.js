import { html, setHTML } from './ui.js';
import { regions } from './definitions.js';
import { isCosmicPalette } from './cosmic-types.js';
import { filterPalettes, paletteGroups } from './palettes-manager.js';

export const zonePaletteOptions = catalog => catalog.palettes.filter(p => p.complete && !isCosmicPalette(p));

const cards = (entries, selected, showType) =>
  entries.map(
    p =>
      html`<label class="zone-palette-card"><span class="zone-palette-card-title"><input type="checkbox" data-zone-palette-choice="${p.id}" aria-label="Include ${p.name}" ${selected.includes(p.name) ? html`checked` : ''}><strong>${p.name}</strong></span><span class="palette-card-swatches" aria-label="${p.name} colors">${regions.map(
        region => {
          const color = /^#[0-9a-f]{6}$/i.test(p.colors?.[region]) ? p.colors[region].toUpperCase() : null;
          return html`<span data-tooltip="${region} - ${color || 'Not set'}" title="${region} - ${color || 'Not set'}" style="background:${color || 'transparent'}"></span>`;
        }
      )}</span><span class="zone-palette-meta">${showType ? html`<span>${p.group || 'Custom'}</span>` : ''}<span>${p.global !== false ? 'Global' : 'Species Linked'}</span></span></label>`
  );

export function zonePaletteResults(entries, selected = [], sort = 'group', direction = 'asc') {
  if (!entries.length) return html`<p class="zone-palette-empty" role="status">No palettes match your filters.</p>`;
  if (sort !== 'group') return html`<div class="zone-palette-grid">${cards(entries, selected, true)}</div>`;
  const groups = paletteGroups(entries);
  if (direction === 'desc') groups.reverse();
  return html`${groups.map(
    group =>
      html`<section class="zone-palette-group"><h3>${group}</h3><div class="zone-palette-grid">${cards(
        entries.filter(p => (p.group || 'Custom') === group),
        selected,
        false
      )}</div></section>`
  )}`;
}

export function zonePalettePicker(catalog, selected) {
  const entries = zonePaletteOptions(catalog);
  return html`<div hidden data-zone-palette-pool>${entries.map(p => html`<input type="checkbox" name="palettePool" data-zone-palette-id="${p.id}" value="${p.name}" ${selected.includes(p.name) ? html`checked` : ''}>`)}</div>
  <div class="zone-palette-controls"><label class="zone-field zone-palette-search">Search palettes<input id="zone-palette-search" type="search" placeholder="Search name, color, or type…"></label><label class="zone-field">Type<select id="zone-palette-type"><option value="">All Types</option>${paletteGroups(entries).map(group => html`<option value="${group}">${group}</option>`)}</select></label><label class="zone-field">Scope<select id="zone-palette-scope"><option value="">All Scopes</option><option value="global">Global</option><option value="linked">Species Linked</option></select></label><label class="zone-field">Sort By<select id="zone-palette-sort"><option value="group">Type</option><option value="name">Name</option></select></label><label class="zone-field">Order<select id="zone-palette-direction"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label></div>
  <p class="preview-note" data-zone-palette-result-count role="status">${entries.length} ${entries.length === 1 ? 'palette' : 'palettes'}</p><div id="zone-palette-results" class="zone-palette-results">${zonePaletteResults(filterPalettes(entries), selected)}</div>`;
}

export function syncZonePaletteChoice(form, choice) {
  const input = [...form.querySelectorAll('[data-zone-palette-id]')].find(
    p => p.dataset.zonePaletteId === choice.dataset.zonePaletteChoice
  );
  if (input) input.checked = choice.checked;
}

export function updateZonePalettes(form, catalog) {
  const selected = [...form.querySelectorAll('[name="palettePool"]:checked')].map(input => input.value);
  const sort = form.querySelector('#zone-palette-sort').value;
  const direction = form.querySelector('#zone-palette-direction').value;
  const entries = filterPalettes(
    zonePaletteOptions(catalog),
    form.querySelector('#zone-palette-search').value,
    form.querySelector('#zone-palette-type').value,
    sort,
    direction,
    form.querySelector('#zone-palette-scope').value
  );
  // Named selection inputs stay outside the filtered view so browsing never drops selections.
  setHTML(form.querySelector('#zone-palette-results'), zonePaletteResults(entries, selected, sort, direction));
  form.querySelector('[data-zone-palette-result-count]').textContent =
    `${entries.length} ${entries.length === 1 ? 'palette' : 'palettes'}`;
}
