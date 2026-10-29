import { html } from './ui.js';

export function zoneSelectionButtons(pool, label) {
  return html`<div class="form-actions"><button type="button" class="button secondary" data-action="zone-select-all" data-pool="${pool}" aria-label="Select all ${label}">Select All</button><button type="button" class="button secondary" data-action="zone-unselect-all" data-pool="${pool}" aria-label="Unselect all ${label}">Unselect All</button></div>`;
}

export function setZoneSelection(form, pool, checked) {
  if (!['speciesPool', 'palettePool'].includes(pool)) return;
  for (const input of form.querySelectorAll(`[name="${pool}"]`)) input.checked = checked;
  if (pool === 'palettePool') {
    for (const choice of form.querySelectorAll('[data-zone-palette-choice]')) choice.checked = checked;
  }
}
