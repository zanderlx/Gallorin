import { html } from './ui.js';

export function zoneSelectionButton(pool, label, allSelected = false) {
  const text = allSelected ? 'Unselect All' : 'Select All';
  return html`<button type="button" class="button secondary zone-selection-toggle" data-action="zone-toggle-all" data-pool="${pool}" data-label="${label}" aria-label="${text} ${label}">${text}</button>`;
}

export function zoneAllSelected(form, pool) {
  const inputs = [...form.querySelectorAll(`[name="${pool}"]`)];
  return inputs.length > 0 && inputs.every(input => input.checked);
}

export function syncZoneSelectionButtons(form) {
  for (const button of form.querySelectorAll('[data-action="zone-toggle-all"]')) {
    const text = zoneAllSelected(form, button.dataset.pool) ? 'Unselect All' : 'Select All';
    button.textContent = text;
    button.setAttribute('aria-label', `${text} ${button.dataset.label}`);
    button.disabled = !form.querySelectorAll(`[name="${button.dataset.pool}"]`).length;
  }
}

export function setZoneSelection(form, pool, checked) {
  if (!['speciesPool', 'palettePool'].includes(pool)) return;
  for (const input of form.querySelectorAll(`[name="${pool}"]`)) input.checked = checked;
  if (pool === 'palettePool') {
    for (const choice of form.querySelectorAll('[data-zone-palette-choice]')) choice.checked = checked;
  }
}
