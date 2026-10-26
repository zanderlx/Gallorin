import { definitionTransferControls } from './definition-transfer-controls.js';
import { escapeHTML as e, icon } from './ui.js';
import { regions } from './definitions.js';
import { formSignature, formBaseline } from './form-state.js';

export const paletteGroups = entries =>
  [...new Set(entries.map(p => p.group || 'Custom'))].sort((a, b) => a.localeCompare(b));
export function filterPalettes(entries, query = '', group = '', sort = 'group', direction = 'asc', scope = '') {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter(
      p =>
        (!group || (p.group || 'Custom') === group) &&
        (!scope || (scope === 'global' ? p.global !== false : p.global === false)) &&
        words.every(word =>
          [p.name, p.group, p.description, ...Object.values(p.colors || {}), ...(p.assetSkins || [])]
            .join(' ')
            .toLowerCase()
            .includes(word)
        )
    )
    .sort(
      (a, b) =>
        (direction === 'desc' ? -1 : 1) *
        ((sort === 'group' ? (a.group || 'Custom').localeCompare(b.group || 'Custom') : 0) ||
          a.name.localeCompare(b.name))
    );
}
export function paletteCards(entries, showType = true) {
  return entries
    .map(
      p =>
        `<button type="button" class="panel eye-definition-card mutation-definition-card palette-definition-card" data-action="edit-definition" data-kind="palettes" data-id="${e(p.id)}" aria-label="Edit ${e(p.name)}"><span class="eye-card-name">${e(p.name)}</span><span class="palette-card-swatches" aria-hidden="true">${regions.map(region => `<span data-tooltip="${e(region)} - ${e(/^#[0-9a-f]{6}$/i.test(p.colors?.[region]) ? p.colors[region].toUpperCase() : 'Not set')}" style="background:${/^#[0-9a-f]{6}$/i.test(p.colors?.[region]) ? p.colors[region] : 'transparent'}"></span>`).join('')}</span><span class="mutation-card-meta">${showType ? `<span>${e(p.group || 'Custom')}</span>` : ''}<span>${p.global !== false ? 'Global' : 'Species Linked'}</span></span></button>`
    )
    .join('');
}
export function paletteResults(entries, sort = 'group', direction = 'asc') {
  if (sort !== 'group') return paletteCards(entries);
  const groups = paletteGroups(entries);
  if (direction === 'desc') groups.reverse();
  return groups
    .map(
      group =>
        `<section class="eye-rarity-section"><h2>${e(group)}</h2><div class="eye-definition-grid mutation-definition-grid">${paletteCards(
          entries.filter(p => (p.group || 'Custom') === group),
          false
        )}</div></section>`
    )
    .join('');
}
export function palettesManagerPage(catalog) {
  return `<div class="definitions-header eye-manager-header"><h1 class="manager-heading">Palettes Manager</h1><button type="button" class="button secondary stable-import palette-import definition-import" data-action="import-palette" aria-label="Import Palette" title="Import Palette">${icon('download')}</button><button class="button primary" data-action="new-definition" data-kind="palettes">${icon('spark')} Create Palette</button></div>
  <div class="eye-grid-controls"><label class="zone-field"><input id="palette-search" type="search" placeholder="Search..." aria-label="Search palettes"></label><label class="zone-field palette-variation-control"><input id="palette-variation" name="paletteVariationPercent" type="number" min="0" max="100" step="1" required value="${catalog.spawning?.paletteVariationPercent ?? 25}" aria-describedby="palette-variation-note"><span class="palette-variation-label">Color Variation (%)<small id="palette-variation-note">0=disabled, max 100</small></span></label><label class="zone-field">Type<select id="palette-group"><option value="">All Types</option>${paletteGroups(
    catalog.palettes
  )
    .map(group => `<option value="${e(group)}">${e(group)}</option>`)
    .join(
      ''
    )}</select></label><label class="zone-field">Scope<select id="palette-scope"><option value="">All Scopes</option><option value="global">Global</option><option value="linked">Species Linked</option></select></label><div class="definition-sort-controls"><label class="zone-field">Sort By<select id="palette-sort"><option value="group">Type</option><option value="name">Name</option></select></label><button type="button" class="icon-button sort-direction" data-action="palette-sort-direction" data-direction="asc" aria-label="Ascending order. Switch to descending" title="Ascending order. Switch to descending">${icon('arrow')}</button></div></div>
  <div id="palette-grid">${paletteResults(filterPalettes(catalog.palettes))}</div><p id="palette-empty" role="status" ${catalog.palettes.length ? 'hidden' : ''}>No palettes match your filters.</p>`;
}
export function updatePaletteGrid(root, catalog) {
  const toggle = root.querySelector('[data-action="palette-sort-direction"]');
  const direction = toggle.dataset.direction;
  const label = direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  const sort = root.querySelector('#palette-sort').value;
  const entries = filterPalettes(
    catalog.palettes,
    root.querySelector('#palette-search').value,
    root.querySelector('#palette-group').value,
    sort,
    direction,
    root.querySelector('#palette-scope').value
  );
  const grid = root.querySelector('#palette-grid');
  grid.classList.toggle('eye-definition-grid', sort !== 'group');
  grid.classList.toggle('mutation-definition-grid', sort !== 'group');
  grid.innerHTML = paletteResults(entries, sort, direction);
  root.querySelector('#palette-empty').hidden = entries.length > 0;
}

export function createPaletteEditor(renderEditor) {
  const dialog = document.createElement('dialog');
  dialog.className = 'eye-definition-dialog palette-definition-dialog';
  dialog.setAttribute('aria-labelledby', 'palette-editor-title');
  const prompt = document.createElement('dialog');
  prompt.className = 'eye-save-confirm';
  prompt.setAttribute('aria-labelledby', 'palette-save-title');
  prompt.innerHTML = `<div class="dialog-top"><h2 id="palette-save-title">Save Changes?</h2></div><p>You have unsaved palette changes. Save them before closing?</p><div class="form-actions"><button type="button" class="button secondary" data-palette-decision="keep" autofocus>Keep Editing</button><button type="button" class="button secondary" data-palette-decision="discard">Discard Changes</button><button type="button" class="button primary" data-palette-decision="save">Save</button></div>`;
  document.body.append(dialog, prompt);
  function requestClose() {
    const form = dialog.querySelector('form');
    if (!form || formSignature(form) === formBaseline(form)) dialog.close();
    else if (!prompt.open) prompt.showModal();
  }
  prompt.addEventListener('click', event => {
    const decision = event.target.closest('[data-palette-decision]')?.dataset.paletteDecision;
    if (!decision) return;
    prompt.close();
    if (decision === 'discard') dialog.close();
    if (decision === 'save') dialog.querySelector('form')?.requestSubmit();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener('close', () => {
    if (!dialog.open) dialog.replaceChildren();
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-palette-close]')) return requestClose();
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      requestClose();
  });
  return {
    dialog,
    open(draft) {
      const template = document.createElement('template');
      template.innerHTML = renderEditor(draft);
      const form = template.content.querySelector('#definition-form');
      form.querySelector('.panel-heading')?.remove();
      dialog.innerHTML = `<div class="dialog-top"><h2 id="palette-editor-title">${draft?.id ? `Edit ${e(draft.name)}` : draft?.imported ? 'Import Palette' : 'Create Palette'}</h2><button type="button" class="icon-button" data-palette-close aria-label="Close palette editor">${icon('close')}</button></div>`;
      definitionTransferControls(form, dialog, draft, 'palettes', 'Palette');
      const fields = form.querySelector('.definition-fields');
      const row = document.createElement('div');
      row.className = 'eye-name-rarity';
      row.append(
        fields.querySelector('[name="name"]').closest('label'),
        fields.querySelector('[name="group"]').closest('label'),
        fields.querySelector('[name="variationPercent"]').closest('label')
      );
      fields.prepend(row);
      // Keep notes last, after all nine color controls and palette options.
      fields.append(fields.querySelector('[name="description"]').closest('label'));
      dialog.append(form);
      dialog.scrollTop = 0;
      if (!dialog.open) dialog.showModal();
      form.elements.name.focus();
    }
  };
}
