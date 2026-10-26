import { escapeHTML as e } from './ui.js';
import { traitRow } from './library-editor.js';

export function traitsEditorPage(catalog, selectedId) {
  const species =
    catalog.species.find(s => s.id === selectedId) ||
    [...catalog.species].sort((a, b) => a.name.localeCompare(b.name))[0];
  return `<h1>Traits</h1><label class="zone-field">Species<select id="traits-species">${[...catalog.species]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(s => `<option value="${e(s.id)}" ${s.id === species.id ? 'selected' : ''}>${e(s.name)}</option>`)
    .join('')}</select></label>
    <form id="traits-form" class="panel" data-id="${e(species.id)}"><h2>${e(species.name)} Traits</h2><div id="trait-rows">${Object.entries(
      species.traits || {}
    )
      .map(([key, values]) => traitRow(key, values))
      .join(
        ''
      )}</div><button class="button secondary" type="button" data-action="add-trait-category">Add Trait Category</button><div class="form-actions"><button class="button primary" type="submit">Save Settings</button><button class="button secondary" type="reset">Cancel Changes</button></div></form>`;
}

export function readTraitsForm(form) {
  const entries = [...form.querySelectorAll('.trait-editor-row')].map(row => [
    row.querySelector('[data-trait-category]').value.trim(),
    row
      .querySelector('[data-trait-values]')
      .value.split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean)
  ]);
  if (new Set(entries.map(([key]) => key)).size !== entries.length)
    throw new Error('Each trait category needs a different name.');
  return { id: form.dataset.id, traits: Object.fromEntries(entries) };
}
