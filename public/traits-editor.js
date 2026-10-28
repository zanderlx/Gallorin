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
    ${category ? html`<input type="hidden" data-trait-category value="${category}">` : html`<label class="zone-field">Category name<input data-trait-category maxlength="60" required></label>`}
    <label class="zone-field">Trait names · one per line<textarea data-trait-values rows="8" placeholder="Add a line to create a trait; edit to rename; remove a line to delete.">${values.join('\n')}</textarea></label>
    <button class="text-button" type="button" data-action="remove-trait-category">Remove category and its traits</button>
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
    <label class="zone-field">Find a category or trait<input id="trait-search" type="search" placeholder="Search this species…"></label>
    <form id="traits-form" class="panel" data-id="${species.id}"><h2>${species.name} Traits</h2>
    <p><span data-traits-total>${count}</span> traits · <span data-categories-total>${Object.keys(traits).length}</span> categories. Each entry belongs only to ${species.name}.</p>
    <p>Add, rename, or delete traits by editing the lines in a category. Save or cancel before switching species. Up to 100 traits per category.</p>
    <div class="trait-toolbar"><button class="button secondary" type="button" data-action="add-trait-category">Add Trait Category</button></div>
    <div id="trait-rows" class="trait-category-grid">${Object.entries(traits).map(([key, values]) => raw(traitRow(key, values)))}</div>
    <p id="trait-no-results" hidden>No matching categories or traits. Try another search.</p>
    <div class="form-actions"><button class="button primary" type="submit">Save Traits</button><button class="button secondary" type="reset">Cancel Changes</button></div></form>`);
}

export function filterTraitRows(root) {
  const query = root.querySelector('#trait-search')?.value.trim().toLowerCase() || '';
  let visible = 0;
  let total = 0;
  let categories = 0;
  for (const row of root.querySelectorAll('#trait-rows .trait-editor-row')) {
    const category = row.querySelector('[data-trait-category]').value;
    const values = traitNames(row.querySelector('[data-trait-values]').value);
    total += values.length;
    categories++;
    row.querySelector('[data-category-title]').textContent = category || 'New category';
    row.querySelector('[data-trait-count]').textContent = `${values.length} traits`;
    row.hidden = !`${category}\n${values.join('\n')}`.toLowerCase().includes(query);
    if (!row.hidden) visible++;
    if (query && !row.hidden) row.open = true;
  }
  const empty = root.querySelector('#trait-no-results');
  if (empty) empty.hidden = visible > 0;
  const totalLabel = root.querySelector('[data-traits-total]');
  const categoryLabel = root.querySelector('[data-categories-total]');
  if (totalLabel) totalLabel.textContent = String(total);
  if (categoryLabel) categoryLabel.textContent = String(categories);
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
