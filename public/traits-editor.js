import { html, raw } from './ui.js';
import { formBaseline, formSignature } from './form-state.js';

export const traitNames = value => [
  ...new Set(
    value
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean)
  )
];

export function traitRow(category = '', values = []) {
  return String(html`<details class="trait-editor-row trait-category-card" open>
    <summary><strong data-category-title>${category || 'New category'}</strong> <span data-trait-count>${values.length} traits</span><span class="icon-button personality-toggle trait-category-toggle" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></span></summary>
    ${category ? html`<input type="hidden" data-trait-category value="${category}">` : html`<label class="zone-field">Category name<input data-trait-category maxlength="60" spellcheck="false" required></label>`}
    <label class="zone-field"><textarea data-trait-values spellcheck="false" aria-label="${category || 'New category'} traits" rows="8" placeholder="Add a line to create a trait; edit to rename; remove a line to delete.">${values.join('\n')}</textarea></label>
  </details>`);
}

export function traitsEditorPage(catalog, selectedId, embedded = false) {
  const species =
    catalog.species.find(s => s.id === selectedId) ||
    [...catalog.species].sort((a, b) => a.name.localeCompare(b.name))[0];
  if (!species) return String(html`<h1>Traits</h1><p>Add a species before creating traits.</p>`);
  const traits = species.traits || {};
  const count = Object.values(traits).reduce((sum, values) => sum + values.length, 0);
  return String(html`${
    embedded
      ? ''
      : html`<h1>Traits</h1>
    <p>Manage each species' appearance library. Saved horses keep their traits; new horses use your saved lists.</p>
    <div class="trait-toolbar"><label class="zone-field">Species<select id="traits-species">${[...catalog.species].sort((a, b) => a.name.localeCompare(b.name)).map(s => html`<option value="${s.id}" ${s.id === species.id ? html`selected` : ''}>${s.name}</option>`)}</select></label>
    </div>`
  }
    <form id="traits-form" class="panel" data-id="${species.id}"><div class="panel-heading trait-section-heading"><div class="trait-title-row"><h2>${species.name} Traits</h2>
    <p><span data-traits-total>${count}</span> traits</p></div><button class="button secondary" type="button" data-action="add-trait-category">Add Category</button></div>
    <div id="trait-rows" class="trait-category-grid">${Object.entries(traits).map(([key, values]) => raw(traitRow(key, values)))}</div>
    <div class="form-actions"><button class="button primary" type="submit">Save Traits</button><button class="button secondary" type="reset">Cancel Changes</button></div></form>`);
}

export function syncTraitRows(root) {
  let total = 0;
  for (const row of root.querySelectorAll('#trait-rows .trait-editor-row')) {
    const category = row.querySelector('[data-trait-category]').value;
    const values = traitNames(row.querySelector('[data-trait-values]').value);
    total += values.length;
    row.querySelector('[data-category-title]').textContent = category || 'New category';
    row.querySelector('[data-trait-count]').textContent = `${values.length} traits`;
  }
  const totalLabel = root.querySelector('[data-traits-total]');
  if (totalLabel) totalLabel.textContent = String(total);
  const form = root.querySelector('#traits-form');
  const species = root.querySelector('#traits-species');
  if (form && species && formBaseline(form) !== undefined)
    species.disabled = formSignature(form) !== formBaseline(form);
}

export function readTraitsForm(form) {
  const entries = [...form.querySelectorAll('.trait-editor-row')].map(row => [
    row.querySelector('[data-trait-category]').value.trim(),
    traitNames(row.querySelector('[data-trait-values]').value)
  ]);
  if (new Set(entries.map(([key]) => key.toLowerCase())).size !== entries.length)
    throw new Error('Each trait category needs a different name.');
  if (
    entries.some(([key, values]) => !key || key.length > 60 || values.length > 100 || values.some(v => v.length > 100))
  )
    throw new Error('Use a category name and up to 100 trait names of 100 characters or fewer.');
  return { id: form.dataset.id, traits: Object.fromEntries(entries) };
}
