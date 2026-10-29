import { zonePalettePicker } from './zone-palettes.js';
import { zoneCreatures, defaultSpawnSettings, rarityTier } from './spawn-config.js';
import { html, raw, icon, setHTML } from './ui.js';
import { formBaseline, formSignature } from './form-state.js';
import { raritySettings } from './rarity-settings.js';
import {
  availableAtmospheres,
  atmosphereFor,
  atmosphereStyle,
  locationsFor,
  zoneAtmosphere,
  zoneTags
} from './zones.js';

const rarityNames = { 4: 'Common', 3: 'Uncommon', 2: 'Rare', 1: 'Ultra Rare', 0: 'Cosmic' };
const disclosureArrow = html`<span class="chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>`;

export function zonePreview(draft, catalog, saved = false) {
  const atmosphere = zoneAtmosphere(draft, catalog);
  return String(
    html`<section class="hero zone-preview ${['forest', 'autumn', 'moonlit', 'frost'].includes(atmosphere.id) ? atmosphere.id : 'atmosphere-custom'}" style="${atmosphereStyle(atmosphere)}" aria-label="${saved ? draft.name : 'Zone preview'}"><div class="hero-content"><h2>${draft.name || 'Zone preview'}</h2><p>${draft.description || ''}</p><div class="hero-bottom">${zoneTags(draft, catalog).map(tag => html`<span>${tag}</span>`)}</div></div></section>`
  );
}

export function filterZoneSpecies(
  species,
  query = '',
  tier = '',
  sort = 'rarity',
  direction = 'asc',
  weights = new Map()
) {
  const search = query.trim().toLowerCase();
  return species
    .filter(s => s.name.toLowerCase().includes(search) && (tier === '' || rarityTier(s) === Number(tier)))
    .sort(
      (a, b) =>
        ((sort === 'rarity'
          ? rarityTier(b) - rarityTier(a)
          : sort === 'weight'
            ? (weights.get(a.id) || 0) - (weights.get(b.id) || 0)
            : 0) || a.name.localeCompare(b.name)) * (direction === 'desc' ? -1 : 1)
    );
}

export function updateZoneSpecies(form, catalog) {
  const toggle = form.querySelector('[data-action="zone-species-sort-direction"]');
  const direction = toggle.dataset.direction;
  const label = direction === 'asc' ? 'Ascending order. Switch to descending' : 'Descending order. Switch to ascending';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  const entries = filterZoneSpecies(
    catalog.species,
    form.querySelector('#zone-species-search').value,
    form.querySelector('#zone-species-rarity').value,
    form.querySelector('#zone-species-sort').value,
    direction,
    new Map(
      [...form.querySelectorAll('input[name^="weight:"]')].map(input => [input.name.slice(7), Number(input.value) || 0])
    )
  );
  const order = new Map(entries.map((entry, i) => [entry.id, i]));
  for (const row of form.querySelectorAll('[data-zone-species]')) {
    row.hidden = !order.has(row.dataset.zoneSpecies);
    row.style.order = String(order.get(row.dataset.zoneSpecies) ?? entries.length);
  }
  form.querySelector('#zone-species-empty').hidden = entries.length > 0;
}

export function syncZoneEditor(form, catalog, draft) {
  setHTML(form.querySelector('#zone-preview'), raw(zonePreview(draft, catalog)));
  form.querySelector('[data-zone-palette-count]').textContent = `${draft.palettePool.length} selected`;
  form.querySelector('[data-zone-species-count]').textContent = `${draft.speciesPool.length} selected`;
}

export function applyZonePreset(form, catalog) {
  const atmosphere = atmosphereFor(catalog, form.elements.atmosphere.value);
  form.elements['color:zone-tint'].value = atmosphere.tint;
  form.querySelector('[data-color-picker="zone-tint"]').value = atmosphere.tint;
  form.elements.encounterTitle.value = atmosphere.encounterTitle;
}

export function zoneEditorPage(catalog, state) {
  const locations = locationsFor(catalog, state);
  const settings = catalog.spawning || defaultSpawnSettings;
  return String(html`<div class="zones-manager definitions-main"><div class="definitions-header"><h1 class="manager-heading" data-copy-key="page.title">Zone Manager</h1><button type="button" class="button primary" data-action="new-zone">${raw(icon('spark'))} Create zone</button></div>
  <section class="zone-collection" aria-label="Saved zones"><div class="zone-manager-grid">${locations.map(l => html`<article class="panel zone-card">${raw(zonePreview(l, catalog, true))}<div class="zone-card-actions"><div><p>${zoneCreatures(l, catalog, settings).filter(c => Math.abs(c.weight) > 0).length} species · ${l.palettePool.length} palettes</p></div></div><button type="button" class="zone-card-open" data-action="edit-zone" data-id="${l.id}" aria-label="Edit ${l.name}"></button></article>`)}</div>${!locations.length ? html`<div class="empty-state">${raw(icon('compass'))}<h2>No zones yet</h2><p>Create a zone to choose its species and appearance.</p></div>` : ''}</section></div>`);
}

export function zoneEditorForm(catalog, draft) {
  const settings = catalog.spawning || defaultSpawnSettings;
  const rarityColors = raritySettings(catalog).colors;
  const speciesColor = species =>
    rarityColors[rarityNames[rarityTier(species)].toLowerCase().replaceAll(' ', '-')] || 'var(--text)';
  const weights = new Map(zoneCreatures(draft, catalog, settings).map(c => [c.speciesId, c.weight]));

  const appearance = zoneAtmosphere(draft, catalog);
  return html`<div class="dialog-top"><h2 id="zone-editor-title">${draft.id ? `Edit ${draft.name}` : 'Create zone'}</h2><button type="button" class="icon-button" data-zone-close aria-label="Close zone editor">${raw(icon('close'))}</button></div>
  <form id="zone-form" data-id="${draft.id || ''}"><div class="zone-editor-identity"><label class="zone-field">Zone Name<input name="name" maxlength="60" required value="${draft.name}"></label><label class="setting-row"><input type="checkbox" class="toggle" name="enabled" ${raw(draft.enabled ? 'checked' : '')}><span>Show this zone in the Wilds navigation.</span></label></div>

  <details class="zone-editor-section"><summary>${raw(icon('spark'))} Appearance${disclosureArrow}</summary><div class="zone-disclosure-body"><div id="zone-preview">${raw(zonePreview(draft, catalog))}</div><div class="zone-artwork-controls"><label class="zone-field">Artwork<select name="atmosphere">${availableAtmospheres(catalog).map(a => html`<option value="${a.id}" ${raw(draft.atmosphere === a.id ? 'selected' : '')}>${a.name.replace(/\b[a-z]/g, letter => letter.toUpperCase())}</option>`)}</select></label><div class="color-control"><span>Tint</span><span class="color-inputs"><input type="color" data-color-picker="zone-tint" value="${appearance.tint}" aria-label="Zone tint picker"><input name="color:zone-tint" data-color-hex="zone-tint" value="${appearance.tint}" pattern="#[0-9a-fA-F]{6}" maxlength="7" required aria-label="Zone tint hex value"></span></div></div><label class="zone-field">Encounter heading<input name="encounterTitle" maxlength="100" required value="${appearance.encounterTitle}"></label><label class="zone-field">Description<textarea name="description" maxlength="600" rows="5">${draft.description}</textarea></label><label class="zone-field">Tags<textarea name="tags" data-zone-tags spellcheck="false" wrap="off" rows="6" maxlength="2020">${zoneTags(draft, catalog).join('\n')}</textarea><small>One per line. Up to 20 tags.</small></label></div></details>
  <details class="zone-editor-section"><summary>${raw(icon('wing'))} Species <span class="badge" data-zone-species-count>${catalog.species.filter(sp => draft.speciesPool.includes(sp.name)).length} selected</span>${disclosureArrow}</summary><div class="zone-disclosure-body"><p class="preview-note">Weights determine spawn chances. Zero disables a species.</p><div class="zone-species-controls"><label class="zone-field">Find Species<input type="search" id="zone-species-search" placeholder="Search species…"></label><label class="zone-field">Rarity<select id="zone-species-rarity"><option value="">All rarities</option>${[4, 3, 2, 1].map(t => html`<option value="${t}">${rarityNames[t]}</option>`)}</select></label><div class="definition-sort-controls"><label class="zone-field">Sort By<select id="zone-species-sort"><option value="rarity">Rarity</option><option value="name">Name</option><option value="weight">Weight</option></select></label><button type="button" class="icon-button sort-direction" data-action="zone-species-sort-direction" data-direction="asc" aria-label="Ascending order. Switch to descending" title="Ascending order. Switch to descending">${raw(icon('arrow'))}</button></div></div>
  <div class="zone-spawn-list">${filterZoneSpecies(catalog.species).map(sp => html`<div class="zone-creature-row" data-zone-species="${sp.id}"><label class="zone-choice"><input type="checkbox" name="speciesPool" value="${sp.name}" ${raw(draft.speciesPool.includes(sp.name) ? 'checked' : '')}><span class="zone-species-name">${sp.name}<small style="color:${speciesColor(sp)}">${rarityNames[rarityTier(sp)]}</small></span></label><label>Weight<input type="number" name="weight:${sp.id}" min="-1000000" max="1000000" step="any" required value="${weights.get(sp.id) ?? settings.tierWeights[rarityTier(sp)]}" aria-label="${sp.name} spawn weight"></label></div>`)}</div><p id="zone-species-empty" role="status" hidden>No species match your filters.</p></div></details>

  <details class="zone-editor-section"><summary>${raw(icon('palette'))} Palettes <span class="badge" data-zone-palette-count>${draft.palettePool.length} selected</span>${disclosureArrow}</summary><div class="zone-disclosure-body">${zonePalettePicker(catalog, draft.palettePool)}</div></details>
  <p id="zone-status" class="form-status" role="status"></p><div class="form-actions zone-editor-actions"><button class="button primary" type="submit">${raw(icon('check'))} ${draft.id ? 'Save zone changes' : 'Create zone'}</button><button class="button secondary" type="reset">Reset changes</button>${draft.id ? html`<button type="button" class="text-button zone-delete" data-action="delete-zone" data-id="${draft.id}" aria-label="Delete ${draft.name}">${raw(icon('trash'))} Delete zone</button>` : ''}${!draft.id ? html`<button type="button" class="text-button" data-action="random-zone">Generate random zone</button>` : ''}</div></form>`;
}

export function createZoneEditor(renderEditor) {
  const dialog = document.createElement('dialog');
  dialog.className = 'zone-editor-dialog';
  dialog.setAttribute('aria-labelledby', 'zone-editor-title');
  document.body.append(dialog);
  const prompt = document.createElement('dialog');
  prompt.className = 'zone-save-confirm';
  prompt.setAttribute('aria-labelledby', 'zone-save-title');
  setHTML(
    prompt,
    html`<div class="dialog-top"><h2 id="zone-save-title">Save changes?</h2></div><p>You have unsaved zone changes.</p><div class="form-actions"><button type="button" class="button secondary" data-zone-decision="keep" autofocus>Keep editing</button><button type="button" class="button secondary" data-zone-decision="discard">Discard changes</button><button type="button" class="button primary" data-zone-decision="save">Save</button></div>`
  );
  document.body.append(prompt);
  function requestClose() {
    const form = dialog.querySelector('form');
    if (!form || formSignature(form) === formBaseline(form)) dialog.close();
    else if (!prompt.open) prompt.showModal();
  }
  prompt.addEventListener('click', event => {
    const decision = event.target.closest('[data-zone-decision]')?.dataset.zoneDecision;
    if (!decision) return;
    prompt.close();
    if (decision === 'discard') dialog.close();
    if (decision === 'save') dialog.querySelector('form')?.requestSubmit();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    requestClose();
  });
  dialog.addEventListener(
    'invalid',
    event => {
      const section = event.target.closest('details');
      if (section) section.open = true;
    },
    true
  );
  dialog.addEventListener('close', () => {
    if (!dialog.open) dialog.replaceChildren();
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-zone-close]')) requestClose();
    else if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        requestClose();
    }
  });
  return {
    dialog,
    close() {
      prompt.close();
      dialog.close();
    },
    open(draft) {
      setHTML(dialog, renderEditor(draft));
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
      dialog.querySelector('[name="name"]').focus({ preventScroll: true });
    }
  };
}
